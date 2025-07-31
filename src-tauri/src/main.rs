// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Transaction {
  pub id: String,
  pub importo: f64,
  pub categoria: String,
  pub data: String,
  pub descrizione: Option<String>,
}

#[tauri::command]
fn get_transactions() -> Vec<Transaction> {
  // TODO: leggi da DB o file
  vec![]
}

#[tauri::command]
fn add_transaction(nuova: Transaction) -> Transaction {
  nuova
}
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
          get_transactions,
          add_transaction
        ])
        .run(tauri::generate_context!())
        .expect("errore nell'esecuzione di Tauri");
}
