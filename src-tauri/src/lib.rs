//! dk-table Tauri app: registers dialog, fs, persisted-scope, updater and process plugins
//! (paths picked in dialogs stay readable across restarts, e.g. recent files; updater + process =
//! mises à jour signées depuis les releases GitHub, puis redémarrage).

/// Build and run the Tauri application.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
