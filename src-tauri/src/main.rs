// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use rusqlite::{Connection, params};
use std::sync::Mutex;


#[derive(Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: i32,
    pub category_id: i32,
    
    pub from_account_id: i32,
    pub to_account_id: i32,

    pub _type: String, 
    pub status: String,
    pub method: String,

    pub amount: i32,
    pub amount_decimal: i32,

    pub date: String, // ISO string
    pub transaction_date: String, // ISO string
    pub scheduled_date: String, // ISO string

    pub description: String,

    pub notes: String,
    pub tags: String, // comma-separated tags

    pub color: String, // hex color
    pub icon: String, // icon name (e.g., "mdi:bank")
}

struct DbConn(Mutex<Connection>);

fn init_db() -> DbConn {
	let db_path = "../smcont.db";
	
	let conn = Connection::open(db_path).expect("impossibile aprire db");
    conn.execute(
        "create table if not exists migrations (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            date TEXT NOT NULL
        )", params![]
    ).expect("Error creating migrations table");

    {
        // checking weather migrations contains a record for initial_setup
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM migrations WHERE name = 'initial_setup'").unwrap();
        let count: i32 = stmt.query_row([], |row| row.get(0)).unwrap();

        // if not, we create the initial setup tables
        if count == 0 {
            conn.execute(
                "CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGEr PRIMARY KEY,
                    category_id INTEGER NOT NULL REFERENCES transactions_categories(id) ,
                    from_account_id INTEGER REFERENCES accounts(id),
                    to_account_id INTEGER REFERENCES accounts(id),

                    type TEXT NOT NULL check(type IN ('income', 'expense', 'transfer', 'reimbursement', 'refund', 'other')),
                    status TEXT NOT NULL check(status IN ('pending', 'completed', 'cancelled', 'failed')) DEFAULT 'completed',
                    method TEXT NOT NULL check(method IN ('cash', 'card', 'bank_transfer', 'paypal', 'apple', 'other')) DEFAULT 'other',

                    amount INTEGER NOT NULL,
                    amount_decimal INTEGER NOT NULL DEFAULT 2,

                    currency TEXT NOT NULL DEFAULT 'EUR',
                    exchange_rate REAL NOT NULL DEFAULT 1.0,    
                    
                    date TEXT NOT NULL,
                    transaction_date TEXT NOT NULL,
                    scheduled_date TEXT,
                    
                    description TEXT,

                    notes TEXT,
                    tags TEXT,

                    color TEXT NOT NULL DEFAULT '#000000',
                    icon TEXT NOT NULL DEFAULT 'mdi:bank'
                )", params![]
            ).expect("Error creating transactions table");

            conn.execute(
                "CREATE TABLE IF NOT EXISTS transaction_details (
                    id INTEGER PRIMARY KEY,
                    transaction_id INTEGER NOT NULL REFERENCES transactions(id),
                    
                    amount INTEGER NOT NULL,
                    amount_decimal INTEGER NOT NULL DEFAULT 2,

                    description TEXT,
                    notes TEXT,
                    tags TEXT,

                    color TEXT NOT NULL DEFAULT '#000000',
                    icon TEXT NOT NULL DEFAULT 'mdi:bank'
                )", params![]
            ).expect("Error creating transaction_details table");

            conn.execute(
                "CREATE TABLE IF NOT EXISTS transactions_categories (
                    id INTEGER PRIMARY KEY,
                    parent_id INTEGER REFERENCES transactions_categories(id),
                    name TEXT NOT NULL,
                    description TEXT,
                    type TEXT NOT NULL,

                    color TEXT NOT NULL DEFAULT '#000000',
                    icon TEXT NOT NULL DEFAULT 'mdi:bank'
                )", params![]
            ).expect("Error creating transactions_categories table");

            conn.execute(
                "CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY,
                    category_id INTEGER NOT NULL REFERENCES accounts_categories(id),
                    parent_id INTEGER REFERENCES accounts(id),

                    name TEXT NOT NULL,
                    description TEXT,
                    type TEXT NOT NULL,

                    balance INTEGER NOT NULL DEFAULT 0,
                    balance_decimal INTEGER NOT NULL DEFAULT 2,

                    virtual boolean NOT NULL DEFAULT false,
                    budget boolean NOT NULL DEFAULT false,
                    currency TEXT NOT NULL DEFAULT 'EUR',

                    color TEXT NOT NULL DEFAULT '#000000',
                    icon TEXT NOT NULL DEFAULT 'mdi:bank'
                )", params![]
            ).expect("Error creating accounts table");

            conn.execute(
                "CREATE TABLE IF NOT EXISTS accounts_categories (
                    id INTEGER PRIMARY KEY,
                    parent_id INTEGER REFERENCES accounts_categories(id),

                    name TEXT NOT NULL,
                    description TEXT,
                    
                    type TEXT NOT NULL,

                    color TEXT NOT NULL DEFAULT '#000000',
                    icon TEXT NOT NULL DEFAULT 'mdi:bank'
                )", params![]
            ).expect("Error creating accounts_categories table");


            // Insert initial migration record
            conn.execute(
                "INSERT INTO migrations (name, date) VALUES (?1, ?2)",
                params!["initial_setup", chrono::Utc::now().to_rfc3339()]
            ).expect("Error inserting initial migration record");
        }
    }


    DbConn(Mutex::new(conn))
}

#[tauri::command]
fn get_transactions(state: tauri::State<DbConn>) -> Vec<Transaction> {
	let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare("
        SELECT  id, category_id, from_account_id, to_account_id, type, 
                status, method, amount, amount_decimal, date, transaction_date, 
                scheduled_date, description, notes, tags, color, icon 
        FROM transactions").unwrap();
    let trans_iter = stmt.query_map([], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            category_id: row.get(1)?,
            from_account_id: row.get(2)?,
            to_account_id: row.get(3)?,
            _type: row.get(4)?,
            status: row.get(5)?,
            method: row.get(6)?,
            amount: row.get(7)?,
            amount_decimal: row.get(8)?,
            date: row.get(9)?,
            transaction_date: row.get(10)?,
            scheduled_date: row.get(11)?,
            description: row.get(12)?,
            notes: row.get(13)?,
            tags: row.get(14)?,
            color: row.get(15)?,
            icon: row.get(16)?
        })
    }).unwrap();
    trans_iter.filter_map(Result::ok).collect()
}

#[tauri::command]
fn add_transaction(new_transaction: Transaction,state: tauri::State<DbConn>) -> Transaction {
	let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO transactions  (category_id, from_account_id, to_account_id, type, status, method, 
                                    amount, amount_decimal, date, transaction_date, scheduled_date, 
                                    description, notes, tags, color, icon) 
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
            new_transaction.category_id,
            new_transaction.from_account_id,
            new_transaction.to_account_id,
            new_transaction._type,
            new_transaction.status,
            new_transaction.method,
            new_transaction.amount,
            new_transaction.amount_decimal,
            new_transaction.date,
            new_transaction.transaction_date,
            new_transaction.scheduled_date,
            new_transaction.description,
            new_transaction.notes,
            new_transaction.tags,
            new_transaction.color,
            new_transaction.icon
        ]
    ).unwrap();
    new_transaction
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
		.expect("error while running tauri application");
}
