const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { importCsv } = require('../services/csvImporter');
const { toFmpTicker } = require('../services/tickerMapping');
const multer = require('multer');
const upload = multer({ dest: '/tmp/' });

// GET /api/transactions — List all transactions with optional filters
router.get('/', (req, res) => {
    try {
        let query = 'SELECT * FROM transactions';
        const params = [];
        const conditions = [];

        if (req.query.ticker) {
            conditions.push('ticker = ?');
            params.push(req.query.ticker);
        }
        if (req.query.type) {
            conditions.push('event_type = ?');
            params.push(req.query.type);
        }
        if (req.query.from) {
            conditions.push('date >= ?');
            params.push(req.query.from);
        }
        if (req.query.to) {
            conditions.push('date <= ?');
            params.push(req.query.to);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY date DESC';

        const stmt = db.prepare(query);
        const rows = stmt.all(...params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const { autoSyncDividendsForTicker } = require('../services/dividendDetector');

// POST /api/transactions — Create a new transaction
router.post('/', async (req, res) => {
    const { event_type, date, ticker, price, quantity, currency, fee_tax, fees, exchange, fee_currency, notes, sector } = req.body;

    if (!event_type || !date || !ticker || price === undefined || quantity === undefined || !currency) {
        return res.status(400).json({ error: 'Missing required fields: event_type, date, ticker, price, quantity, currency' });
    }

    const fmpTicker = toFmpTicker(ticker, exchange);

    try {
        const stmt = db.prepare(`
            INSERT INTO transactions (event_type, date, ticker, fmp_ticker, price, quantity, currency, fee_tax, exchange, fee_currency, notes, sector)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(event_type, date, ticker, fmpTicker, price, quantity, currency, fee_tax || fees || 0, exchange, fee_currency, notes, sector || null);

        // Auto sync corporate dividends for this ticker if BUY or SELL
        if (event_type === 'BUY' || event_type === 'SELL') {
            autoSyncDividendsForTicker(ticker).catch(e => console.warn(`Auto-sync div failed for ${ticker}:`, e.message));
        }

        res.status(201).json({ id: result.lastInsertRowid });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/transactions/:id — Update a transaction
router.put('/:id', async (req, res) => {
    const { event_type, date, ticker, price, quantity, currency, fee_tax, fees, exchange, fee_currency, notes, sector } = req.body;
    const fmpTicker = toFmpTicker(ticker, exchange);

    try {
        const stmt = db.prepare(`
            UPDATE transactions 
            SET event_type = ?, date = ?, ticker = ?, fmp_ticker = ?, price = ?, quantity = ?, 
                currency = ?, fee_tax = ?, exchange = ?, fee_currency = ?, notes = ?, sector = ?
            WHERE id = ?
        `);
        stmt.run(event_type, date, ticker, fmpTicker, price, quantity, currency, fee_tax || fees || 0, exchange, fee_currency, notes, sector || null, req.params.id);

        if (event_type === 'BUY' || event_type === 'SELL') {
            autoSyncDividendsForTicker(ticker).catch(e => console.warn(`Auto-sync div failed for ${ticker}:`, e.message));
        }

        res.json({ status: 'updated', id: req.params.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/transactions/:id — Delete a transaction
router.delete('/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ status: 'deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/transactions/import — Import CSV file
router.post('/import', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        const count = importCsv(req.file.path, db);
        console.log(`Imported ${count} transactions from CSV`);
        res.json({ imported: count });
    } catch (e) {
        console.error('CSV import error:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
