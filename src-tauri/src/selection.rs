//! 取选中文字。
//!
//! 主路径是系统辅助功能接口（`AXSelectedText`）：不碰剪贴板、不用合成按键，也就没有修饰键和
//! 焦点这些问题。应用没实现这个属性（VS Code 一类 Electron）时才回退到模拟复制。
//! 和 pot 一样，两条路都要求被划词的应用还是前台，所以必须在弹窗显示之前调用。
//!
//! 模拟复制那条容易踩的点：
//! - 合成 Cmd+C 之前要等快捷键的修饰键松开，否则按着 Option 时 Cmd+C 会变成 Cmd+Option+C。
//! - 取完要把剪贴板恢复原样。

use std::time::Duration;

/// 等修饰键松开的上限。用户可能一直按着不放，不能无限等
const MODIFIER_TIMEOUT: Duration = Duration::from_millis(1000);
/// 轮询的间隔
const POLL_INTERVAL: Duration = Duration::from_millis(15);
/// 合成复制之后，等剪贴板出现内容的上限（不同应用的复制速度不一样）
const COPY_TIMEOUT: Duration = Duration::from_millis(400);

/// 取当前选中的文字。没选中（或选中的不是文字）时返回空字符串。
///
/// 走兜底路径时会睡几百毫秒（等修饰键、等剪贴板），所以扔到阻塞线程池上跑：
/// 命令本身是 async 的，不会卡住主线程，spawn_blocking 也不会占着工作线程。
#[tauri::command]
pub async fn get_selected_text() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        platform::check_trusted()?;
        platform::selected_text()
    })
    .await
    .map_err(|error| format!("取词出错：{error}"))?
}

#[cfg(target_os = "macos")]
mod platform {
    use std::ptr;
    use std::thread;
    use std::time::{Duration, Instant};

    use arboard::{Clipboard, ImageData};
    use core_foundation::base::{CFType, CFTypeRef, TCFType};
    use core_foundation::string::CFString;
    use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
    use objc::rc::autoreleasepool;
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};

    use super::{COPY_TIMEOUT, MODIFIER_TIMEOUT, POLL_INTERVAL};

    /// C 键的虚拟键码（kVK_ANSI_C）
    const KEY_C: u16 = 8;
    /// 按下和松开之间的间隔，给应用留出处理按键的时间
    const KEY_HOLD: Duration = Duration::from_millis(15);
    /// 这些修饰键按着，Cmd+C 就不是 Cmd+C 了
    const MODIFIER_FLAGS: u64 = CGEventFlags::CGEventFlagShift.bits()
        | CGEventFlags::CGEventFlagControl.bits()
        | CGEventFlags::CGEventFlagAlternate.bits()
        | CGEventFlags::CGEventFlagCommand.bits();

    // 保证 AppKit 被加载：下面用运行时查找 NSWorkspace
    #[link(name = "AppKit", kind = "framework")]
    extern "C" {}

    // core-graphics 没绑定这个函数，自己声明：CGEventSourceStateID 是 i32，
    // 返回值 CGEventFlags 是 u64 位掩码。传 0（kCGEventSourceStateCombinedSessionState）
    // 读的是所有键盘合并后的状态
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGEventSourceFlagsState(state_id: i32) -> u64;
    }

    // 辅助功能接口。AXUIElementRef / CFStringRef 在原型里都是指针对，直接用 CFTypeRef 声明
    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        // 进程有没有辅助功能权限（Boolean 就是 u8）
        fn AXIsProcessTrusted() -> u8;
        fn AXUIElementCreateApplication(pid: i32) -> CFTypeRef;
        fn AXUIElementCopyAttributeValue(
            element: CFTypeRef,
            attribute: CFTypeRef,
            value: *mut CFTypeRef,
        ) -> i32;
    }

    pub(super) fn check_trusted() -> Result<(), String> {
        if unsafe { AXIsProcessTrusted() != 0 } {
            Ok(())
        } else {
            Err("没有辅助功能权限，去 系统设置 → 隐私与安全性 → 辅助功能 里勾上 AI-dict".to_string())
        }
    }

    pub(super) fn selected_text() -> Result<String, String> {
        match selected_text_by_ax() {
            Some(text) => Ok(text),
            None => selected_text_by_clipboard(),
        }
    }

    /// 问前台应用的辅助功能接口要选中文字。拿不到（应用不支持这个属性，或者确实没选中东西）返回 None
    fn selected_text_by_ax() -> Option<String> {
        let pid = frontmost_pid();
        if pid <= 0 {
            return None;
        }

        let application = unsafe { AXUIElementCreateApplication(pid) };
        if application.is_null() {
            return None;
        }
        let application = unsafe { CFType::wrap_under_create_rule(application) };

        let element = copy_ax_attribute(application.as_CFTypeRef(), "AXFocusedUIElement")?;
        let value = copy_ax_attribute(element.as_CFTypeRef(), "AXSelectedText")?;
        let text = value.downcast_into::<CFString>()?.to_string();

        let text = text.trim();
        if text.is_empty() {
            return None;
        }
        Some(text.to_string())
    }

    /// 读一个 AX 属性。拿到的引用是 +1 的，交给 Rust 释放；读不到返回 None
    fn copy_ax_attribute(element: CFTypeRef, name: &str) -> Option<CFType> {
        let name = CFString::new(name);
        let mut value: CFTypeRef = ptr::null();
        let error = unsafe {
            AXUIElementCopyAttributeValue(element, name.as_concrete_TypeRef() as CFTypeRef, &mut value)
        };
        if error != 0 || value.is_null() {
            return None;
        }
        Some(unsafe { CFType::wrap_under_create_rule(value) })
    }

    /// 当前前台应用的 pid。拿不到就返回 0。
    ///
    /// 用 NSWorkspace 而不是辅助功能接口：这台机器上系统级的 AXFocusedUIElement 一直返回
    /// -25204（CannotComplete），问具体应用才正常。
    // objc 的宏里有 cfg(feature = "cargo-clippy")，会触发 unexpected_cfgs 警告
    #[allow(unexpected_cfgs)]
    fn frontmost_pid() -> i32 {
        autoreleasepool(|| unsafe {
            let workspace: *mut Object = msg_send![class!(NSWorkspace), sharedWorkspace];
            if workspace.is_null() {
                return 0;
            }
            let application: *mut Object = msg_send![workspace, frontmostApplication];
            if application.is_null() {
                return 0;
            }
            let pid: i32 = msg_send![application, processIdentifier];
            pid
        })
    }

    // ---- 以下是兜底路径：模拟一次复制 ----

    fn selected_text_by_clipboard() -> Result<String, String> {
        // 按着 Option 合成 Cmd+C 会变成 Cmd+Option+C
        wait_modifiers_released();

        let mut clipboard = Clipboard::new().map_err(|error| format!("打不开剪贴板：{error}"))?;
        let backup = backup_clipboard(&mut clipboard);

        let copied = take_by_copy(&mut clipboard);

        // 不管取没取到，都恢复原来的剪贴板
        restore_clipboard(&mut clipboard, backup);
        copied
    }

    fn wait_modifiers_released() {
        let deadline = Instant::now() + MODIFIER_TIMEOUT;
        while Instant::now() < deadline {
            if unsafe { CGEventSourceFlagsState(0) } & MODIFIER_FLAGS == 0 {
                return;
            }
            thread::sleep(POLL_INTERVAL);
        }
    }

    /// 剪贴板的备份。只有文字和图片两种（arboard 支持的类型），
    /// 剪贴板里是别的类型（富文本、文件）时会丢
    enum Backup {
        Text(String),
        Image(ImageData<'static>),
        Empty,
    }

    fn backup_clipboard(clipboard: &mut Clipboard) -> Backup {
        if let Ok(text) = clipboard.get_text() {
            return Backup::Text(text);
        }
        match clipboard.get_image() {
            Ok(image) => Backup::Image(image),
            Err(_) => Backup::Empty,
        }
    }

    fn restore_clipboard(clipboard: &mut Clipboard, backup: Backup) {
        let result = match backup {
            Backup::Text(text) => clipboard.set_text(text),
            Backup::Image(image) => clipboard.set_image(image),
            Backup::Empty => clipboard.clear(),
        };
        if let Err(error) = result {
            eprintln!("恢复剪贴板失败：{error}");
        }
    }

    fn take_by_copy(clipboard: &mut Clipboard) -> Result<String, String> {
        // 先清空剪贴板：等一下里面又有内容，就说明复制成功了
        clipboard
            .clear()
            .map_err(|error| format!("清空剪贴板失败：{error}"))?;
        copy_by_cmd_c()?;
        read_copied_text(clipboard)
    }

    /// 合成一次 Cmd+C
    fn copy_by_cmd_c() -> Result<(), String> {
        let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)
            .map_err(|_| "创建键盘事件源失败".to_string())?;

        for keydown in [true, false] {
            let event = CGEvent::new_keyboard_event(source.clone(), KEY_C, keydown)
                .map_err(|_| "创建键盘事件失败".to_string())?;
            event.set_flags(CGEventFlags::CGEventFlagCommand);
            event.post(CGEventTapLocation::HID);
            if keydown {
                thread::sleep(KEY_HOLD);
            }
        }
        Ok(())
    }

    fn read_copied_text(clipboard: &mut Clipboard) -> Result<String, String> {
        let deadline = Instant::now() + COPY_TIMEOUT;
        loop {
            if let Ok(text) = clipboard.get_text() {
                if !text.is_empty() {
                    return Ok(text);
                }
            }
            if Instant::now() >= deadline {
                // 没选中文字，或者这个应用不支持 Cmd+C
                return Ok(String::new());
            }
            thread::sleep(POLL_INTERVAL);
        }
    }
}

#[cfg(target_os = "windows")]
mod platform {
    use std::thread;
    use std::time::Instant;

    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VIRTUAL_KEY, VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
    };

    use super::{MODIFIER_TIMEOUT, POLL_INTERVAL};

    /// 这些修饰键按着，Ctrl+C 就不是 Ctrl+C 了（Win 键也会把快捷键抢走）
    const MODIFIER_KEYS: [VIRTUAL_KEY; 5] = [VK_SHIFT, VK_CONTROL, VK_MENU, VK_LWIN, VK_RWIN];

    pub(super) fn check_trusted() -> Result<(), String> {
        Ok(())
    }

    pub(super) fn selected_text() -> Result<String, String> {
        // 复制发给前台窗口，所以要先等修饰键松开
        wait_modifiers_released();
        get_selected_text::get_selected_text().map_err(|error| error.to_string())
    }

    fn wait_modifiers_released() {
        let deadline = Instant::now() + MODIFIER_TIMEOUT;
        while Instant::now() < deadline {
            // 返回值最高位为 1 表示当前按下
            let pressed = MODIFIER_KEYS
                .iter()
                .any(|&key| unsafe { GetAsyncKeyState(key as i32) } < 0);
            if !pressed {
                return;
            }
            thread::sleep(POLL_INTERVAL);
        }
    }
}
