#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 插件和 Rust 命令按 docs/DEV_PLAN.md 的阶段逐步加
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
