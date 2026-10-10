mod ocr;
mod selection;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WindowEvent,
};
use tauri_plugin_sql::{Migration, MigrationKind};

/// 把窗口叫出来。窗口是隐藏而不是销毁的，所以先取消最小化再显示
fn show_window(app: &tauri::AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 数据库连接串，要和 src/services/db.ts 里的 DB_URL 一致。
/// 不写路径，插件会把它放到应用配置目录（macOS：~/Library/Application Support/com.aidict.app/）
const DB_URL: &str = "sqlite:ai-dict.db";

/// 迁移：SQL 放在 src-tauri/migrations/ 下，按文件序号递增。
/// 前端第一次 `Database.load` 时按版本号依次执行，已执行过的不会重跑。
fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "初始化：生词本、AI 缓存、设置",
        sql: include_str!("../migrations/001_init.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        // 单实例插件要第一个注册，所以放在快捷键插件前面
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 第二次启动时把主窗口叫出来
            show_window(app, "main");
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // AI 请求走插件的 fetch（绕过 CORS、支持流式，见 src/services/ai/client.ts）
        .plugin(tauri_plugin_http::init())
        // 数据库：注册迁移，真正建库在前端 Database.load 时（见 src/services/db.ts）
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(DB_URL, migrations())
                .build(),
        )
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
                    "vocabulary" | "settings" => {
                        // 先告诉主窗口切到哪页再显示，免得先闪一下原来那页；
                        // 菜单项的 id 直接当页名（和 src/services/window.ts 的 MainPage 一致）
                        let _ = app.emit_to(
                            "main",
                            "main-page",
                            serde_json::json!({ "page": event.id.as_ref() }),
                        );
                        show_window(app, "main");
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            selection::get_selected_text,
            selection::is_accessibility_trusted,
            selection::request_accessibility_permission,
            selection::open_accessibility_settings,
            ocr::recognize_screenshot,
            ocr::is_screen_capture_trusted,
            ocr::request_screen_capture_permission,
            ocr::open_screen_capture_settings
        ])
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
