drop table if exists transactions;
CREATE TABLE IF NOT EXISTS transactions (
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
)

drop table if exists transaction_details;
create table if not exists transaction_details (
    id INTEGER PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id),
    
    amount INTEGER NOT NULL,
    amount_decimal INTEGER NOT NULL DEFAULT 2,

    description TEXT,
    notes TEXT,
    tags TEXT,

    color TEXT NOT NULL DEFAULT '#000000',
    icon TEXT NOT NULL DEFAULT 'mdi:bank'
)

drop table if exists transactions_categories;
CREATE TABLE IF NOT EXISTS transactions_categories (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER REFERENCES transactions_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,

    color TEXT NOT NULL DEFAULT '#000000',
    icon TEXT NOT NULL DEFAULT 'mdi:bank'
);

drop table if exists accounts;
CREATE TABLE IF NOT EXISTS accounts (
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
    icon TEXT NOT NULL DEFAULT 'mdi:bank',
);

drop table if exists accounts_categories;
CREATE TABLE IF NOT EXISTS accounts_categories (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER REFERENCES accounts_categories(id),

    name TEXT NOT NULL,
    description TEXT,
    
    type TEXT NOT NULL,

    color TEXT NOT NULL DEFAULT '#000000',
    icon TEXT NOT NULL DEFAULT 'mdi:bank'
);


create table if not exists migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL
);

insert into migrations (id, name, date) values (1, 'initial_setup', datetime('now'));