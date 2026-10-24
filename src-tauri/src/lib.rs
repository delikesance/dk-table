//! dk-table Tauri app: registers dialog and fs plugins.

/// Build and run the Tauri application.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
