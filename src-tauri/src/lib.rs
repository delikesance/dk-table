//! dk-table Tauri app: registers dialog, fs and persisted-scope plugins
//! (paths picked in dialogs stay readable across restarts, e.g. recent files).

/// Build and run the Tauri application.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .run(tauri::generate_context!())
        .expect("error while running dk-table");
}

#[cfg(test)]
mod tests {
    /// Smoke test: the test harness runs.
    #[test]
    fn smoke() {
        assert_eq!(2 + 2, 4);
    }
}
