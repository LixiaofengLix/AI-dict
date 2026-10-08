mod selection;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WindowEvent,
};

/// 把窗口叫出来。窗口是隐藏而不是销毁的，所以先取消最小化再显示
fn show_window(app: &tauri::AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 单实例插件要第一个注册，所以放在快捷键插件前面
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 第二次启动时把主窗口叫出来
            show_window(app, "main");
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // macOS：只驻留托盘，不出现在 Dock 和 Cmd+Tab 里
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let input_item = MenuItem::with_id(app, "input", "输入翻译", true, None::<&str>)?;
            let vocabulary_item =
                MenuItem::with_id(app, "vocabulary", "生词本", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&input_item, &vocabulary_item, &settings_item, &quit_item],
            )?;

            TrayIconBuilder::with_id("tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "input" => {
                        show_window(app, "popup");
                        // 事件名和 payload 要和 src/services/window.ts 里的一致
                        let _ = app.emit_to(
                            "popup",
                            "popup-trigger",
                            serde_json::json!({ "action": "input" }),
                        );
                    }
                    "vocabulary" | "settings" => show_window(app, "main"),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![selection::get_selected_text])
        .on_window_event(|window, event| {
            // 关窗只隐藏，应用继续驻留托盘；退出走托盘菜单
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
