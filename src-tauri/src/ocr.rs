//! 截图翻译：框选一块屏幕、用系统 OCR 认出里面的文字，以及 macOS 上的屏幕录制权限。
//!
//! 思路参考 pot 的 `system_ocr.rs`：macOS 上框选交给系统的 `screencapture -i`，识别用 Vision。
//! 不同的是 pot 另带一个 Swift 小程序做识别，这里直接用 objc 调 Vision，不多带二进制。
//!
//! Windows 没有系统框选可用：前端开一个透明的全屏窗口让用户拖框（src/windows/snip/），
//! 松手后藏起窗口、把选区的物理像素坐标交给 `recognize_screen_region`，这里用 GDI 只截那一块，
//! 交给 Windows.Media.Ocr。pot 是先截整屏铺在窗口里再裁，这里不用来回传整屏图。
//!
//! 这里只返回一行行的文字，拼成一段（连字符、中英文空格）在 src/utils/joinOcrLines.ts 里做。
//! 权限和取词一样不挡在截图前面：没授权时截到的其他窗口是空的、认不出字，前端这时才另查权限。

use tauri::Manager;

/// 框选一块屏幕并识别里面的文字（macOS：框选用系统的），返回识别出的各行（从上到下）。
/// 用户按 Esc 取消框选时返回 None；框了但没认出字返回空数组。
///
/// 框选期间会一直阻塞到用户松手，所以扔到阻塞线程池上跑。
#[tauri::command]
pub async fn recognize_screenshot(app: tauri::AppHandle) -> Result<Option<Vec<String>>, String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| format!("找不到缓存目录：{error}"))?;
    tauri::async_runtime::spawn_blocking(move || platform::recognize_screenshot(dir))
        .await
        .map_err(|error| format!("截图识别出错：{error}"))?
}

/// 屏幕上的一块区域，物理像素，坐标相对整个虚拟桌面（副屏可能是负数）
#[derive(serde::Deserialize)]
#[cfg_attr(target_os = "macos", allow(dead_code))]
pub struct ScreenRegion {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// 截下屏幕上的一块并识别里面的文字（Windows：选区由前端的框选窗口给出）。
/// 返回识别出的各行，没认出字返回空数组
#[tauri::command]
pub async fn recognize_screen_region(region: ScreenRegion) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || platform::recognize_screen_region(region))
        .await
        .map_err(|error| format!("截图识别出错：{error}"))?
}

/// 有没有截图要用的屏幕录制权限。Windows 上没有这一项，恒为 true
#[tauri::command]
pub fn is_screen_capture_trusted() -> bool {
    platform::is_trusted()
}

/// 请系统弹一次屏幕录制授权提示，并把本应用加进「隐私与安全性 → 屏幕录制」的名单。
/// 返回值是弹完之后的权限状态（授权后要重启应用才生效，所以这里通常还是 false）
#[tauri::command]
pub fn request_screen_capture_permission() -> bool {
    platform::request_trust()
}

/// 打开「系统设置 → 隐私与安全性 → 屏幕录制」
#[tauri::command]
pub fn open_screen_capture_settings() -> Result<(), String> {
    platform::open_settings()
}

#[cfg(target_os = "macos")]
mod platform {
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::process::Command;
    use std::ptr;

    use core_foundation::base::TCFType;
    use core_foundation::string::{CFString, CFStringRef};
    use objc::rc::autoreleasepool;
    use objc::runtime::{Class, Object, BOOL, NO, YES};
    use objc::{class, msg_send, sel, sel_impl};

    /// 截图的临时文件名，放在应用缓存目录下，识别完就删
    const SCREENSHOT_FILE: &str = "ocr.png";

    /// 识别语言。中文必须排第一：en-US 在前时中文整行丢掉，zh-Hans 在前英文照样认、空格也在
    const RECOGNITION_LANGUAGES: [&str; 2] = ["zh-Hans", "en-US"];

    /// VNRequestTextRecognitionLevelAccurate：慢一点但准，截图就一张，几百毫秒可以接受
    const RECOGNITION_LEVEL_ACCURATE: isize = 0;

    /// 「系统设置 → 隐私与安全性 → 屏幕录制」的深链。锚点在 macOS 26.4 的
    /// SecurityPrivacyExtension.appex 里查到过，和辅助功能那条是同一个扩展（见 selection.rs）
    const SCREEN_CAPTURE_SETTINGS_URL: &str =
        "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_ScreenCapture";

    // 保证 Vision 被链接进来：下面的类都是运行时按名字查的
    #[link(name = "Vision", kind = "framework")]
    extern "C" {}

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        // 两个都是 macOS 10.15 起有。Preflight 只查不弹；Request 没授权时弹系统提示并加进名单
        fn CGPreflightScreenCaptureAccess() -> bool;
        fn CGRequestScreenCaptureAccess() -> bool;
    }

    pub(super) fn is_trusted() -> bool {
        unsafe { CGPreflightScreenCaptureAccess() }
    }

    pub(super) fn request_trust() -> bool {
        unsafe { CGRequestScreenCaptureAccess() }
    }

    pub(super) fn open_settings() -> Result<(), String> {
        crate::selection::open_system_settings(SCREEN_CAPTURE_SETTINGS_URL)
    }

    pub(super) fn recognize_screenshot(dir: PathBuf) -> Result<Option<Vec<String>>, String> {
        fs::create_dir_all(&dir).map_err(|error| format!("建不了缓存目录：{error}"))?;
        let path = dir.join(SCREENSHOT_FILE);
        // 上次异常退出可能留着旧图，不删的话取消框选会被当成截了旧图
        let _ = fs::remove_file(&path);

        // -i 交互框选，-s 只许拖框（不切到选窗口），-x 不出快门声
        Command::new("/usr/sbin/screencapture")
            .args(["-i", "-s", "-x"])
            .arg(&path)
            .status()
            .map_err(|error| format!("调不起系统截图：{error}"))?;
        // Esc 取消时不生成文件，退出码也不可靠，只看文件在不在
        if !path.exists() {
            return Ok(None);
        }

        let lines = recognize_text(&path);
        let _ = fs::remove_file(&path);
        lines.map(Some)
    }

    pub(super) fn recognize_screen_region(
        _region: super::ScreenRegion,
    ) -> Result<Vec<String>, String> {
        Err("macOS 上框选用系统截图，不走这条".to_string())
    }

    /// 用 Vision 认出图里的文字，一个观测结果是一行，取每行可信度最高的候选
    // objc 的宏里有 cfg(feature = "cargo-clippy")，会触发 unexpected_cfgs 警告
    #[allow(unexpected_cfgs)]
    fn recognize_text(path: &Path) -> Result<Vec<String>, String> {
        let path = path.to_str().ok_or("截图路径里有无法识别的字符")?;
        let handler_class = Class::get("VNImageRequestHandler").ok_or("系统里没有 Vision")?;
        let request_class = Class::get("VNRecognizeTextRequest").ok_or("系统里没有 Vision")?;

        autoreleasepool(|| unsafe {
            // CFString 和 NSString 是 toll-free bridged，直接当 NSString 用
            let path = CFString::new(path);
            let url: *mut Object = msg_send![
                class!(NSURL),
                fileURLWithPath: path.as_concrete_TypeRef() as *mut Object
            ];
            let options: *mut Object = msg_send![class!(NSDictionary), dictionary];
            let handler: *mut Object = msg_send![handler_class, alloc];
            let handler: *mut Object = msg_send![handler, initWithURL: url options: options];

            let request: *mut Object = msg_send![request_class, alloc];
            let request: *mut Object = msg_send![request, init];
            let _: () = msg_send![request, setRecognitionLevel: RECOGNITION_LEVEL_ACCURATE];
            let _: () = msg_send![request, setUsesLanguageCorrection: YES];
            let languages: Vec<CFString> = RECOGNITION_LANGUAGES
                .iter()
                .map(|language| CFString::new(language))
                .collect();
            let language_refs: Vec<*mut Object> = languages
                .iter()
                .map(|language| language.as_concrete_TypeRef() as *mut Object)
                .collect();
            let languages: *mut Object = msg_send![
                class!(NSArray),
                arrayWithObjects: language_refs.as_ptr()
                count: language_refs.len()
            ];
            let _: () = msg_send![request, setRecognitionLanguages: languages];

            let requests: *mut Object = msg_send![class!(NSArray), arrayWithObject: request];
            let mut error: *mut Object = ptr::null_mut();
            let ok: BOOL = msg_send![handler, performRequests: requests error: &mut error];
            let result = if ok == NO {
                Err(format!(
                    "识别失败：{}",
                    ns_string(msg_send![error, localizedDescription])
                ))
            } else {
                Ok(collect_lines(msg_send![request, results]))
            };

            let _: () = msg_send![handler, release];
            let _: () = msg_send![request, release];
            result
        })
    }

    #[allow(unexpected_cfgs)]
    unsafe fn collect_lines(observations: *mut Object) -> Vec<String> {
        if observations.is_null() {
            return Vec::new();
        }
        let count: usize = msg_send![observations, count];
        let mut lines = Vec::with_capacity(count);
        for index in 0..count {
            let observation: *mut Object = msg_send![observations, objectAtIndex: index];
            let candidates: *mut Object = msg_send![observation, topCandidates: 1usize];
            let best: *mut Object = msg_send![candidates, firstObject];
            if best.is_null() {
                continue;
            }
            let line = ns_string(msg_send![best, string]);
            let line = line.trim();
            if !line.is_empty() {
                lines.push(line.to_string());
            }
        }
        lines
    }

    /// NSString 转 String。空指针给空串（取错误描述时 error 可能是空的）
    unsafe fn ns_string(string: *mut Object) -> String {
        if string.is_null() {
            return String::new();
        }
        CFString::wrap_under_get_rule(string as CFStringRef).to_string()
    }
}

#[cfg(target_os = "windows")]
mod platform {
    use std::path::PathBuf;

    use windows::Graphics::Imaging::{BitmapPixelFormat, SoftwareBitmap};
    use windows::Media::Ocr::OcrEngine;
    use windows::Storage::Streams::DataWriter;
    use windows::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
        GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        SRCCOPY,
    };

    use super::ScreenRegion;

    pub(super) fn is_trusted() -> bool {
        true
    }

    pub(super) fn request_trust() -> bool {
        true
    }

    pub(super) fn open_settings() -> Result<(), String> {
        Err("Windows 上没有屏幕录制权限这一项".to_string())
    }

    pub(super) fn recognize_screenshot(_dir: PathBuf) -> Result<Option<Vec<String>>, String> {
        Err("Windows 上框选由前端的框选窗口做，不走这条".to_string())
    }

    pub(super) fn recognize_screen_region(region: ScreenRegion) -> Result<Vec<String>, String> {
        // 超过这个边长 OcrEngine 直接报错，提前给句人话
        let max = OcrEngine::MaxImageDimension().map_err(|error| error.to_string())?;
        if region.width > max || region.height > max {
            return Err(format!("框选的区域太大（边长超过 {max} 像素）"));
        }
        // 认哪种语言跟着系统的语言设置走；一个能用的语言包都没有时这里会失败
        let engine = OcrEngine::TryCreateFromUserProfileLanguages().map_err(|_| {
            "系统里没有 OCR 语言包：设置 → 时间和语言 → 语言，给英语或中文装上「光学字符识别」"
                .to_string()
        })?;

        let pixels = capture(&region)?;
        let bitmap = to_software_bitmap(&pixels, &region).map_err(|error| error.to_string())?;
        recognize(&engine, &bitmap).map_err(|error| format!("识别失败：{error}"))
    }

    /// 用 GDI 从屏幕上拷出选区，返回自上而下的 BGRA 像素
    fn capture(region: &ScreenRegion) -> Result<Vec<u8>, String> {
        let width = region.width as i32;
        let height = region.height as i32;
        let mut pixels = vec![0u8; region.width as usize * region.height as usize * 4];

        unsafe {
            let screen = GetDC(None);
            let memory = CreateCompatibleDC(Some(screen));
            let bitmap = CreateCompatibleBitmap(screen, width, height);
            let previous = SelectObject(memory, bitmap.into());
            let copied = BitBlt(
                memory,
                0,
                0,
                width,
                height,
                Some(screen),
                region.x,
                region.y,
                SRCCOPY,
            );
            // GetDIBits 要求位图没有被选进任何 DC，先换回去
            SelectObject(memory, previous);

            let mut info = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: width,
                    // 负数表示自上而下，和 SoftwareBitmap 的行序一致
                    biHeight: -height,
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    ..Default::default()
                },
                ..Default::default()
            };
            let rows = GetDIBits(
                memory,
                bitmap,
                0,
                region.height,
                Some(pixels.as_mut_ptr().cast()),
                &mut info,
                DIB_RGB_COLORS,
            );

            let _ = DeleteObject(bitmap.into());
            let _ = DeleteDC(memory);
            ReleaseDC(None, screen);

            copied.map_err(|error| format!("截屏失败：{error}"))?;
            if rows == 0 {
                return Err("截屏失败：读不出像素".to_string());
            }
        }

        // GDI 拷出来的 alpha 是 0，按全透明交给 OCR 会被当成空白
        for pixel in pixels.as_chunks_mut::<4>().0 {
            pixel[3] = 255;
        }
        Ok(pixels)
    }

    fn to_software_bitmap(
        pixels: &[u8],
        region: &ScreenRegion,
    ) -> windows::core::Result<SoftwareBitmap> {
        let writer = DataWriter::new()?;
        writer.WriteBytes(pixels)?;
        let buffer = writer.DetachBuffer()?;
        SoftwareBitmap::CreateCopyFromBuffer(
            &buffer,
            BitmapPixelFormat::Bgra8,
            region.width as i32,
            region.height as i32,
        )
    }

    /// 一个 OcrLine 是一行。中文的行里每个字之间都带空格，交给 joinOcrLines 去掉
    fn recognize(
        engine: &OcrEngine,
        bitmap: &SoftwareBitmap,
    ) -> windows::core::Result<Vec<String>> {
        let result = engine.RecognizeAsync(bitmap)?.join()?;
        let lines = result.Lines()?;
        let mut texts = Vec::with_capacity(lines.Size()? as usize);
        for index in 0..lines.Size()? {
            let text = lines.GetAt(index)?.Text()?.to_string_lossy();
            let text = text.trim();
            if !text.is_empty() {
                texts.push(text.to_string());
            }
        }
        Ok(texts)
    }
}
