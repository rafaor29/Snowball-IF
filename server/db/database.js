const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'snowball.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Initialize database
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Run schema on first init
try {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    
    // Check if sector column exists in transactions table
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
    const hasSector = tableInfo.some(col => col.name === 'sector');
    if (!hasSector) {
        db.exec("ALTER TABLE transactions ADD COLUMN sector TEXT");
        console.log("Migration: Added sector column to transactions table.");
    }

    console.log("Database initialized successfully.");
} catch (err) {
    console.error("Error running schema:", err);
}

module.exports = db;
