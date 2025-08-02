// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use rusqlite::{Connection, params};
use std::sync::Mutex;


#[derive(Serialize, Deserialize, Clone)]
pub struct Transaction {
	pub id: String,
	pub amount: f64,
	pub category: String,
	pub date: String,
	pub description: Option<String>,
}

struct DbConn(Mutex<Connection>);

fn init_db() -> DbConn {
	let db_path = "../transactions.db";
	
	let conn = Connection::open(db_path).expect("impossibile aprire db");
    conn.execute(
        "CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            description TEXT
        )", params![]
    ).expect("Errore creazione tabella");
    DbConn(Mutex::new(conn))
}

#[tauri::command]
fn get_transactions(state: tauri::State<DbConn>) -> Vec<Transaction> {
	let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, amount, category, date, description FROM transactions").unwrap();
    let trans_iter = stmt.query_map([], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            amount: row.get(1)?,
            category: row.get(2)?,
            date: row.get(3)?,
            description: row.get(4)?,
        })
    }).unwrap();
    trans_iter.filter_map(Result::ok).collect()
}

#[tauri::command]
fn add_transaction(nuova: Transaction,state: tauri::State<DbConn>) -> Transaction {
	let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO transactions (id, amount, category, date, description) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![nuova.id, nuova.amount, nuova.category, nuova.date, nuova.description]
    ).unwrap();
    nuova
}
fn main() {
	let db = init_db();

	tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![
			get_transactions,
			add_transaction
		])
		.manage(db)
		.run(tauri::generate_context!())
		.expect("errore nell'esecuzione di Tauri");
}
