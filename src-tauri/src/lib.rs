// 行测小助手 - Tauri 后端入口
// L0：仅注册 tauri-plugin-sql 并加载初始 migration

use tauri_plugin_sql::{Migration, MigrationKind};

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "initial schema: sessions / records / custom_presets / settings / time_standards",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add basic_addsub x15 time standard seed",
            sql: include_str!("../migrations/0002_add_basic_addsub_15.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add data analysis 9 types time standard seeds",
            sql: include_str!("../migrations/0003_add_data_analysis_standards.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add compare 3 types + composite time standard seeds",
            sql: include_str!("../migrations/0004_add_compare_composite_standards.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:speedcalc.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
