CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    date TEXT NOT NULL,
    ticker TEXT NOT NULL,
    fmp_ticker TEXT,
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    currency TEXT NOT NULL,
    fee_tax REAL DEFAULT 0,
    exchange TEXT,
    fee_currency TEXT,
    notes TEXT,
    sector TEXT
);

CREATE TABLE IF NOT EXISTS stocks_cache (
    ticker TEXT PRIMARY KEY,
    fmp_ticker TEXT,
    name TEXT,
    sector TEXT,
    industry TEXT,
    current_price REAL,
    currency TEXT,
    dividend_yield REAL,
    dividend_growth_5y REAL,
    week52_high REAL,
    sma_10 REAL,
    sma_50 REAL,
    sma_100 REAL,
    sma_200 REAL,
    last_updated TEXT
);

CREATE TABLE IF NOT EXISTS price_history (
    ticker TEXT,
    date TEXT,
    close_price REAL,
    PRIMARY KEY(ticker, date)
);

CREATE TABLE IF NOT EXISTS exchange_rates (
    date TEXT,
    from_currency TEXT,
    to_currency TEXT,
    rate REAL,
    PRIMARY KEY(date, from_currency, to_currency)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
