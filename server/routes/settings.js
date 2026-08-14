const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getApiKey, resetFmpFailing } = require('../services/marketData');

// GET /api/settings — Retrieve current settings
router.get('/', (req, res) => {
    try {
        const apiKey = getApiKey();
        // Mask API key for security
        const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : '';
        res.json({
            hasApiKey: !!apiKey,
            apiKeyMasked: maskedKey
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/settings — Save settings
router.post('/', (req, res) => {
    const { apiKey } = req.body;
    try {
        if (apiKey !== undefined) {
            const stmt = db.prepare(`
                INSERT INTO settings (key, value) VALUES ('FMP_API_KEY', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `);
            stmt.run(apiKey.trim());

            // Clear cache to force fresh fetches and reset failure flag
            resetFmpFailing();
            db.prepare('DELETE FROM stocks_cache').run();
        }
        res.json({ status: 'saved', hasApiKey: !!apiKey });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
