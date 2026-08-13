const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { detectMissingDividends, getCompanyDividendDetails, getSharesHeldOnDate } = require('../services/dividendDetector');
const { toFmpTicker } = require('../services/tickerMapping');
const currencyService = require('../services/currencyService');

// GET /api/dividends/missing — Scan portfolio and return missing detected dividends
router.get('/missing', async (req, res) => {
    try {
        const result = await detectMissingDividends();
        res.json(result);
    } catch (e) {
        console.error('Error detecting missing dividends:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/dividends/company/:ticker — Get company dividend breakdown & corporate events
router.get('/company/:ticker', async (req, res) => {
    try {
        const details = await getCompanyDividendDetails(req.params.ticker);
        res.json(details);
    } catch (e) {
        console.error(`Error getting dividend details for ${req.params.ticker}:`, e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/dividends/inject — Bulk inject approved missing dividends into transactions table
router.post('/inject', (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No items provided for injection' });
    }

    try {
        const insertStmt = db.prepare(`
            INSERT INTO transactions 
            (event_type, date, ticker, fmp_ticker, price, quantity, currency, fee_tax, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        const transaction = db.transaction((rows) => {
            for (const item of rows) {
                const eventType = item.event_type || 'DIVIDEND';
                const date = item.payment_date || item.ex_date;
                const ticker = item.ticker;
                const fmpTicker = item.fmp_ticker || toFmpTicker(ticker);
                const price = parseFloat(item.dividend_per_share) || 0;
                const quantity = parseFloat(item.shares_held) || 0;
                const currency = item.currency || 'EUR';
                const feeTax = parseFloat(item.estimated_tax) || 0;
                const notes = `Auto-injected ${eventType} corporate dividend`;

                insertStmt.run(eventType, date, ticker, fmpTicker, price, quantity, currency, feeTax, notes);
                count++;
            }
        });

        transaction(items);
        res.json({ status: 'success', importedCount: count });
    } catch (e) {
        console.error('Error injecting dividend transactions:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/dividends/breakdown — Monthly & Yearly dividend totals per stock and overall
router.get('/breakdown', async (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM transactions ORDER BY date ASC, id ASC');
        const transactions = stmt.all();

        if (transactions.length === 0) {
            return res.json({
                years: [],
                totalsByYear: {},
                byYearMonth: {},
                byYearTickerMonth: {},
                overallTotalEur: 0,
                yoyDividendGrowthPct: 0
            });
        }

        const rates = await currencyService.getCurrentRates();
        rates['EUR'] = 1;
        if (rates['GBP']) {
            rates['GBp'] = rates['GBP'] / 100;
            rates['GBX'] = rates['GBP'] / 100;
        }

        // Group transactions by ticker for holding checks
        const txByTicker = {};
        for (const tx of transactions) {
            if (!txByTicker[tx.ticker]) txByTicker[tx.ticker] = [];
            txByTicker[tx.ticker].push(tx);
        }

        // Cache stock names / profiles
        const cacheRows = db.prepare('SELECT ticker, fmp_ticker, name FROM stocks_cache').all();
        const stockNameMap = {};
        cacheRows.forEach(r => {
            const name = r.name;
            if (r.ticker) stockNameMap[r.ticker] = name;
            if (r.fmp_ticker) stockNameMap[r.fmp_ticker] = name;
        });

        const dividendTxs = transactions.filter(t => t.event_type === 'DIVIDEND' || t.event_type === 'STOCK_AS_DIVIDEND');

        const totalsByYear = {};
        const byYearMonth = {}; // { '2024': { 1: 0, 2: 15.5, ... } }
        const byYearTickerMonth = {}; // { '2024': { 'SAN.MC': { name, 1: 0, ..., total: 100 } } }
        let overallTotalEur = 0;

        for (const divTx of dividendTxs) {
            const ticker = divTx.ticker;
            const dt = new Date(divTx.date);
            if (isNaN(dt.getTime())) continue;

            const year = dt.getFullYear().toString();
            const month = dt.getMonth() + 1; // 1 to 12

            let amountEur = 0;
            if (divTx.event_type === 'DIVIDEND') {
                const grossVal = (divTx.quantity * divTx.price);
                const netVal = grossVal - (divTx.fee_tax || 0);
                const rate = rates[divTx.currency] || 1;
                amountEur = netVal * rate;
            } else if (divTx.event_type === 'STOCK_AS_DIVIDEND') {
                // Scrip dividend stock addition — if fee_tax > 0 count fee tax or market value
                const rate = rates[divTx.currency] || 1;
                amountEur = (divTx.fee_tax || 0) * rate;
            }

            amountEur = Math.round(amountEur * 100) / 100;
            if (amountEur <= 0 && divTx.event_type === 'DIVIDEND') {
                // If net value was calculated as <= 0, try gross if zero fee tax
                const gross = (divTx.quantity * divTx.price);
                const rate = rates[divTx.currency] || 1;
                amountEur = Math.round(gross * rate * 100) / 100;
            }

            if (!totalsByYear[year]) totalsByYear[year] = 0;
            totalsByYear[year] = Math.round((totalsByYear[year] + amountEur) * 100) / 100;
            overallTotalEur = Math.round((overallTotalEur + amountEur) * 100) / 100;

            if (!byYearMonth[year]) {
                byYearMonth[year] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 };
            }
            byYearMonth[year][month] = Math.round((byYearMonth[year][month] + amountEur) * 100) / 100;

            if (!byYearTickerMonth[year]) byYearTickerMonth[year] = {};
            if (!byYearTickerMonth[year][ticker]) {
                const companyName = stockNameMap[divTx.fmp_ticker] || stockNameMap[ticker] || divTx.notes || ticker;
                byYearTickerMonth[year][ticker] = {
                    ticker,
                    fmp_ticker: divTx.fmp_ticker || ticker,
                    name: companyName,
                    currency: divTx.currency || 'EUR',
                    total: 0,
                    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0
                };
            }
            byYearTickerMonth[year][ticker][month] = Math.round((byYearTickerMonth[year][ticker][month] + amountEur) * 100) / 100;
            byYearTickerMonth[year][ticker].total = Math.round((byYearTickerMonth[year][ticker].total + amountEur) * 100) / 100;
        }

        const years = Object.keys(totalsByYear).sort((a, b) => a.localeCompare(b));

        // Compute YoY growth rate for latest complete vs previous year
        let yoyDividendGrowthPct = 0;
        if (years.length >= 2) {
            const lastYear = years[years.length - 1];
            const prevYear = years[years.length - 2];
            const lastVal = totalsByYear[lastYear] || 0;
            const prevVal = totalsByYear[prevYear] || 0;
            if (prevVal > 0) {
                yoyDividendGrowthPct = Math.round(((lastVal - prevVal) / prevVal) * 1000) / 10;
            }
        }

        res.json({
            years,
            totalsByYear,
            byYearMonth,
            byYearTickerMonth,
            overallTotalEur,
            yoyDividendGrowthPct
        });
    } catch (e) {
        console.error('Error fetching dividend breakdown:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;

