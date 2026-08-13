const express = require('express');
const router = express.Router();
const marketData = require('../services/marketData');

router.get('/quote/:ticker', async (req, res) => {
    try {
        const quote = await marketData.getQuote(req.params.ticker);
        res.json(quote || {});
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/search', async (req, res) => {
    try {
        const results = await marketData.searchTicker(req.query.q || '');
        res.json(results || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/dividends/:ticker', async (req, res) => {
    try {
        const dividends = await marketData.getDividendHistory(req.params.ticker);
        res.json(dividends || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
