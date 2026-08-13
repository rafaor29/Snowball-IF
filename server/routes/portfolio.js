const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: '/tmp/' });
const db = require('../db/database');
const marketData = require('../services/marketData');
const currencyService = require('../services/currencyService');
const { calculateHoldings, calculateIRR } = require('../services/calculations');

/**
 * Helper: get all transactions and compute holdings
 */
async function getComputedHoldings() {
    const stmt = db.prepare('SELECT * FROM transactions ORDER BY date ASC, id ASC');
    const transactions = stmt.all();

    if (transactions.length === 0) {
        return { holdings: [], totals: { total_value: 0, total_cost: 0, total_dividends: 0 } };
    }

    // Get unique tickers for active positions (both fmp_ticker and ticker)
    const fmpTickers = [...new Set(transactions.filter(t => t.event_type !== 'DIVIDEND').map(t => t.fmp_ticker || t.ticker).filter(Boolean))];
    
    // Fetch quotes and profiles concurrently for performance
    const quotes = {};
    const profiles = {};
    await Promise.all(fmpTickers.map(async (t) => {
        try {
            const q = await marketData.getQuote(t);
            if (q) quotes[t] = { ...q, price: q.price ?? q.current_price ?? 0 };
        } catch (e) {}
        try {
            const p = await marketData.getProfile(t);
            if (p) profiles[t] = p;
        } catch (e) {}
    }));

    // Get current exchange rates
    const rates = await currencyService.getCurrentRates();
    rates['EUR'] = 1; // EUR is home currency

    // Calculate holdings
    const result = calculateHoldings(transactions, quotes, rates);

    // Import dividend Detector service for corporate distribution history
    const { getCompanyDividendDetails } = require('../services/dividendDetector');

    // Enrich holdings with profile data, accurate TTM dividend yield, and IRR
    for (const h of result.holdings) {
        const profile = profiles[h.fmp_ticker] || profiles[h.ticker] || {};
        const quote = quotes[h.fmp_ticker] || quotes[h.ticker] || {};
        const baseTicker = (h.fmp_ticker || h.ticker || '').split('.')[0];
        const known = marketData.KNOWN_SECTORS[h.fmp_ticker] || marketData.KNOWN_SECTORS[h.ticker] || marketData.KNOWN_SECTORS[baseTicker];

        h.name = (profile && profile.companyName && profile.companyName !== 'Unknown' && profile.companyName !== h.ticker) ? profile.companyName
            : (quote && quote.name && quote.name !== h.ticker ? quote.name
            : (known && known.name ? known.name : h.ticker));

        const holdingTransactions = transactions.filter(t => t.ticker === h.ticker);
        const userTxWithSector = [...holdingTransactions].reverse().find(t => t.sector && t.sector.trim() !== '');

        h.sector = userTxWithSector ? userTxWithSector.sector.trim() : (profile.sector || (known ? known.sector : 'Unknown'));
        h.currency = (h.currency || profile.currency || (known && known.currency) || 'USD');
        if (h.currency === 'GBp') h.currency = 'GBX';

        // Compute Trailing Twelve Months (TTM) Dividend Yield
        try {
            const details = await getCompanyDividendDetails(h.ticker);
            const corp = details.corporate || [];
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const cutoffStr = oneYearAgo.toISOString().split('T')[0];

            let ttmDivs = corp.filter(d => (d.paymentDate && d.paymentDate >= cutoffStr) || (d.exDate && d.exDate >= cutoffStr));
            let ttmSum = 0;

            if (ttmDivs.length > 0) {
                ttmSum = ttmDivs.reduce((sum, d) => {
                    let amt = d.amount || 0;
                    // Handle London GBp (pence) to GBP conversion if price is in pounds or EUR/USD (> 1.5)
                    if (d.currency === 'GBp' && (h.currency === 'GBP' || h.current_price > 1.5)) {
                        amt = amt / 100;
                    }
                    return sum + amt;
                }, 0);
            } else if (details.logged && details.logged.length > 0) {
                const loggedTTM = details.logged.filter(t => t.date >= cutoffStr && t.event_type === 'DIVIDEND');
                if (loggedTTM.length > 0) {
                    ttmSum = loggedTTM.reduce((sum, t) => sum + (t.price || 0), 0);
                }
            }

            if (h.current_price > 0 && ttmSum > 0) {
                let divYield = (ttmSum / h.current_price) * 100;
                // Cap at 30% if outlier (e.g., special one-time capital returns)
                if (divYield > 30) divYield = 30;
                h.dividend_yield = Math.round(divYield * 100) / 100;
            } else {
                h.dividend_yield = 0;
            }
        } catch (e) {
            h.dividend_yield = 0;
        }

        h.dividend_growth_5y = null;

        const cashFlows = holdingTransactions.map(t => {
            const r = rates[t.currency] || 1;
            if (t.event_type === 'BUY') {
                return { date: t.date, amount: -(t.quantity * t.price + (t.fee_tax || 0)) * r };
            } else if (t.event_type === 'SELL') {
                return { date: t.date, amount: (t.quantity * t.price - (t.fee_tax || 0)) * r };
            } else if (t.event_type === 'DIVIDEND') {
                return { date: t.date, amount: (t.quantity * t.price - (t.fee_tax || 0)) * r };
            }
            return null;
        }).filter(Boolean);
        
        // Add current value as final cash flow
        if (h.current_value_eur > 0) {
            cashFlows.push({ date: new Date().toISOString().split('T')[0], amount: h.current_value_eur });
        }

        try {
            h.irr = calculateIRR(cashFlows);
        } catch (e) {
            h.irr = 0;
        }
    }

    // Calculate totals
    const totals = {
        total_value: result.totals.total_value,
        total_cost: result.holdings.reduce((s, h) => s + h.cost_basis_eur, 0),
        total_dividends: result.holdings.reduce((s, h) => s + h.dividends_received_eur, 0),
        total_profit: 0,
        total_profit_pct: 0,
        num_holdings: result.holdings.length,
        num_sectors: [...new Set(result.holdings.map(h => h.sector))].length
    };
    totals.total_profit = (totals.total_value - totals.total_cost) + totals.total_dividends;
    totals.total_profit_pct = totals.total_cost > 0 ? (totals.total_profit / totals.total_cost) * 100 : 0;

    return { holdings: result.holdings, totals, transactions };
}

// GET /api/portfolio/holdings — Full holdings with all metrics
router.get('/holdings', async (req, res) => {
    try {
        const { holdings, totals } = await getComputedHoldings();
        res.json({ holdings, totals });
    } catch (e) {
        console.error('Error computing holdings:', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/portfolio/refresh-prices — Force refresh live market prices for all portfolio stocks
router.post('/refresh-prices', async (req, res) => {
    try {
        const count = await marketData.refreshAllPortfolioQuotes();
        const { holdings, totals } = await getComputedHoldings();
        res.json({ success: true, count, holdings, totals });
    } catch (e) {
        console.error('Error refreshing portfolio prices:', e);
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/portfolio/holdings/:ticker/sector — Update sector for a company
router.put('/holdings/:ticker/sector', async (req, res) => {
    try {
        const { ticker } = req.params;
        const { sector } = req.body;

        if (sector === undefined) {
            return res.status(400).json({ error: 'Sector is required' });
        }

        const trimmedSector = sector ? sector.trim() : null;
        const baseTicker = ticker.split('.')[0];

        // Update all matching transactions
        const stmt = db.prepare(`
            UPDATE transactions 
            SET sector = ? 
            WHERE ticker = ? OR fmp_ticker = ? OR ticker LIKE ? OR fmp_ticker LIKE ?
        `);
        stmt.run(trimmedSector, ticker, ticker, `${baseTicker}%`, `${baseTicker}%`);

        // Also update stocks_cache if present
        try {
            const cacheStmt = db.prepare(`
                UPDATE stocks_cache 
                SET sector = ? 
                WHERE ticker = ? OR fmp_ticker = ? OR ticker LIKE ? OR fmp_ticker LIKE ?
            `);
            cacheStmt.run(trimmedSector, ticker, ticker, `${baseTicker}%`, `${baseTicker}%`);
        } catch (e) {}

        res.json({ success: true, ticker, sector: trimmedSector });
    } catch (e) {
        console.error('Error updating sector:', e);
        res.status(500).json({ error: e.message });
    }
});


// GET /api/portfolio/sectors — Holdings grouped by sector
router.get('/sectors', async (req, res) => {
    try {
        const { holdings, totals } = await getComputedHoldings();
        
        const sectorMap = {};
        for (const h of holdings) {
            const sector = h.sector || 'Unknown';
            if (!sectorMap[sector]) {
                sectorMap[sector] = {
                    sector,
                    holdings: [],
                    total_value: 0,
                    total_cost: 0,
                    total_profit: 0,
                    weight: 0,
                    count: 0
                };
            }
            sectorMap[sector].holdings.push(h);
            sectorMap[sector].total_value += h.current_value_eur;
            sectorMap[sector].total_cost += h.cost_basis_eur;
            sectorMap[sector].total_profit += h.total_profit_eur;
            sectorMap[sector].count++;
        }

        const sectors = Object.values(sectorMap).map(s => {
            s.weight = totals.total_value > 0 ? (s.total_value / totals.total_value) * 100 : 0;
            s.performance = s.total_cost > 0 ? ((s.total_value - s.total_cost) / s.total_cost) * 100 : 0;
            return s;
        }).sort((a, b) => b.weight - a.weight);

        res.json({ sectors, totals });
    } catch (e) {
        console.error('Error computing sectors:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/portfolio/dips — SMA analysis
router.get('/dips', async (req, res) => {
    try {
        const { holdings } = await getComputedHoldings();
        
        const dips = [];
        for (const h of holdings) {
            if (!h.fmp_ticker) continue;
            
            const [sma10, sma50, sma100, sma200] = await Promise.all([
                marketData.getSMA(h.fmp_ticker, 10),
                marketData.getSMA(h.fmp_ticker, 50),
                marketData.getSMA(h.fmp_ticker, 100),
                marketData.getSMA(h.fmp_ticker, 200)
            ]);

            const price = h.current_price || 0;
            const calcDev = (sma) => sma ? ((price - sma) / sma) * 100 : null;

            const vs_10d = calcDev(sma10);
            const vs_50d = calcDev(sma50);
            const vs_100d = calcDev(sma100);
            const vs_200d = calcDev(sma200);

            // Count SMAs below
            let below_count = 0;
            if (vs_10d !== null && vs_10d < 0) below_count++;
            if (vs_50d !== null && vs_50d < 0) below_count++;
            if (vs_100d !== null && vs_100d < 0) below_count++;
            if (vs_200d !== null && vs_200d < 0) below_count++;

            dips.push({
                ticker: h.ticker,
                fmp_ticker: h.fmp_ticker,
                name: h.name,
                current_price: price,
                currency: h.currency,
                sma_10: sma10,
                sma_50: sma50,
                sma_100: sma100,
                sma_200: sma200,
                vs_10d,
                vs_50d,
                vs_100d,
                vs_200d,
                below_count,
                signal: below_count === 0 ? 'strong' : below_count <= 1 ? 'watch' : below_count <= 3 ? 'dip' : 'deep'
            });
        }

        // Sort by most below 200D SMA
        dips.sort((a, b) => (a.vs_200d || 0) - (b.vs_200d || 0));

        res.json(dips);
    } catch (e) {
        console.error('Error computing dips:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/portfolio/history — Portfolio value over time
router.get('/history', async (req, res) => {
    try {
        const { from, to, range } = req.query;
        const stmt = db.prepare('SELECT * FROM transactions ORDER BY date ASC');
        const transactions = stmt.all();

        if (transactions.length === 0) {
            return res.json([]);
        }

        const rates = await currencyService.getCurrentRates();
        rates['EUR'] = 1;
        if (rates['GBP']) {
            rates['GBp'] = rates['GBP'] / 100;
            rates['GBX'] = rates['GBP'] / 100;
        }

        // Cache stock prices from stocks_cache
        const cacheRows = db.prepare('SELECT ticker, fmp_ticker, current_price, currency FROM stocks_cache').all();
        const stockCacheMap = {};
        cacheRows.forEach(r => {
            if (r.ticker) stockCacheMap[r.ticker] = r;
            if (r.fmp_ticker) stockCacheMap[r.fmp_ticker] = r;
        });

        const endDate = to || new Date().toISOString().split('T')[0];
        let startDate;

        if (from) {
            startDate = from;
        } else if (range) {
            const endDt = new Date(endDate);
            if (range === '1M') {
                endDt.setMonth(endDt.getMonth() - 1);
            } else if (range === '3M') {
                endDt.setMonth(endDt.getMonth() - 3);
            } else if (range === '6M') {
                endDt.setMonth(endDt.getMonth() - 6);
            } else if (range === 'YTD') {
                endDt.setMonth(0, 1);
            } else if (range === '1Y') {
                endDt.setFullYear(endDt.getFullYear() - 1);
            } else {
                endDt.setTime(new Date(transactions[0].date).getTime());
            }
            startDate = endDt.toISOString().split('T')[0];
        } else {
            startDate = transactions[0].date;
        }

        if (startDate < transactions[0].date) {
            startDate = transactions[0].date;
        }

        const stepDays = (range === '1M' || range === '3M') ? 1 : 7;

        let holdingsMap = {};
        let txIndex = 0;
        const lastTxPriceMap = {};

        // 1. Process initial transactions up to startDate
        while (txIndex < transactions.length && transactions[txIndex].date < startDate) {
            const t = transactions[txIndex];
            if (t.event_type !== 'DIVIDEND') {
                if (!holdingsMap[t.ticker]) {
                    holdingsMap[t.ticker] = { shares: 0, fmp_ticker: t.fmp_ticker, currency: t.currency };
                }
                if (t.event_type === 'BUY' || t.event_type === 'STOCK_AS_DIVIDEND') {
                    holdingsMap[t.ticker].shares += t.quantity;
                } else if (t.event_type === 'SELL') {
                    holdingsMap[t.ticker].shares -= t.quantity;
                }
            }
            lastTxPriceMap[t.ticker] = t.price;
            if (t.fmp_ticker) lastTxPriceMap[t.fmp_ticker] = t.price;
            txIndex++;
        }

        const history = [];
        const current = new Date(startDate);
        const end = new Date(endDate);
        const priceHistStmt = db.prepare('SELECT close_price FROM price_history WHERE (ticker = ? OR ticker = ?) AND date <= ? ORDER BY date DESC LIMIT 1');

        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];

            while (txIndex < transactions.length && transactions[txIndex].date <= dateStr) {
                const t = transactions[txIndex];
                if (t.event_type !== 'DIVIDEND') {
                    if (!holdingsMap[t.ticker]) {
                        holdingsMap[t.ticker] = { shares: 0, fmp_ticker: t.fmp_ticker, currency: t.currency };
                    }
                    if (t.event_type === 'BUY' || t.event_type === 'STOCK_AS_DIVIDEND') {
                        holdingsMap[t.ticker].shares += t.quantity;
                    } else if (t.event_type === 'SELL') {
                        holdingsMap[t.ticker].shares -= t.quantity;
                    }
                }
                lastTxPriceMap[t.ticker] = t.price;
                if (t.fmp_ticker) lastTxPriceMap[t.fmp_ticker] = t.price;
                txIndex++;
            }

            let totalValue = 0;
            for (const [ticker, h] of Object.entries(holdingsMap)) {
                if (h.shares <= 0.0001) continue;

                const stockCacheEntry = stockCacheMap[h.fmp_ticker || ticker] || stockCacheMap[ticker] || {};

                // 1. price_history lookup
                const cached = priceHistStmt.get(h.fmp_ticker || ticker, ticker, dateStr);
                let price = cached ? cached.close_price : 0;
                let priceCurr = cached ? (cached.currency || stockCacheEntry.currency || h.currency) : (stockCacheEntry.currency || h.currency);

                // 2. stocks_cache fallback
                if (!price) {
                    if (stockCacheEntry && stockCacheEntry.current_price) {
                        price = stockCacheEntry.current_price;
                        priceCurr = stockCacheEntry.currency || h.currency;
                    }
                }

                // 3. last transaction price fallback
                if (!price) {
                    price = lastTxPriceMap[ticker] || lastTxPriceMap[h.fmp_ticker] || 0;
                    priceCurr = h.currency;
                }

                let rate = rates[priceCurr] || rates[h.currency] || 1;
                if (priceCurr === 'GBp' || priceCurr === 'GBX' || ((ticker.endsWith('.L') || (h.fmp_ticker && h.fmp_ticker.endsWith('.L'))) && price > 100)) {
                    rate = (rates['GBP'] || 1.17) / 100;
                }

                totalValue += h.shares * price * rate;
            }

            history.push({ date: dateStr, value: Math.round(totalValue * 100) / 100 });
            current.setDate(current.getDate() + stepDays);
        }

        res.json(history);
    } catch (e) {
        console.error('Error computing history:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/portfolio/benchmark — Benchmark comparison
router.get('/benchmark', async (req, res) => {
    try {
        const { symbol, range = '1Y' } = req.query;
        if (!symbol) return res.status(400).json({ error: 'symbol required (SPY or URTH)' });

        const stmt = db.prepare("SELECT * FROM transactions WHERE event_type IN ('BUY', 'SELL', 'STOCK_AS_DIVIDEND') ORDER BY date ASC");
        const transactions = stmt.all();

        if (transactions.length === 0) return res.json({ symbol, history: [], benchmarkReturn: 0, portfolioReturn: 0, alpha: 0 });

        const rates = await currencyService.getCurrentRates();
        rates['EUR'] = 1;
        const usdEur = rates['USD'] || 0.865;

        const earliestDate = transactions[0].date;
        const now = new Date();
        const toDateStr = now.toISOString().split('T')[0];

        // Fetch benchmark daily prices from origin (earliest transaction date) to today
        const benchmarkPrices = await marketData.getHistoricalPrices(symbol, earliestDate, toDateStr);
        if (!benchmarkPrices || benchmarkPrices.length === 0) {
            return res.json({ symbol, history: [], benchmarkReturn: 0, portfolioReturn: 0, alpha: 0 });
        }

        const sortedPrices = benchmarkPrices.sort((a, b) => new Date(a.date) - new Date(b.date));
        const priceMap = {};
        sortedPrices.forEach(p => { priceMap[p.date] = p.close; });

        // Track accumulated benchmark shares from origin (0)
        let accumulatedShares = 0;
        const buyTimeline = [];
        for (const t of transactions) {
            let rate = rates[t.currency] || 1;
            if (t.currency === 'GBp' || t.currency === 'GBX') rate = (rates['GBP'] || 1.17) / 100;
            
            let netEur = 0;
            if (t.event_type === 'BUY' || t.event_type === 'STOCK_AS_DIVIDEND') {
                netEur = (t.quantity * t.price + (t.fee_tax || 0)) * rate;
            } else if (t.event_type === 'SELL') {
                netEur = -(t.quantity * t.price - (t.fee_tax || 0)) * rate;
            }

            if (netEur !== 0) {
                const closestPriceUsd = priceMap[t.date] || sortedPrices.find(p => p.date >= t.date)?.close;
                if (closestPriceUsd) {
                    const closestPriceEur = closestPriceUsd * usdEur;
                    accumulatedShares += netEur / closestPriceEur;
                    buyTimeline.push({ date: t.date, shares: accumulatedShares });
                }
            }
        }

        // Determine range start date
        let startDate = new Date();
        if (range === '1M') startDate.setMonth(now.getMonth() - 1);
        else if (range === '3M') startDate.setMonth(now.getMonth() - 3);
        else if (range === '6M') startDate.setMonth(now.getMonth() - 6);
        else if (range === 'YTD') startDate = new Date(now.getFullYear(), 0, 1);
        else if (range === '1Y') startDate.setFullYear(now.getFullYear() - 1);
        else if (range === 'ALL') startDate = new Date(earliestDate);

        let startDateStr = startDate.toISOString().split('T')[0];
        if (startDateStr < earliestDate) startDateStr = earliestDate;

        const rangePrices = sortedPrices.filter(p => p.date >= startDateStr && p.date <= toDateStr);

        const benchmarkHistory = rangePrices.map(p => {
            let sharesAtDate = 0;
            for (const item of buyTimeline) {
                if (item.date <= p.date) {
                    sharesAtDate = item.shares;
                } else {
                    break;
                }
            }
            const valEur = sharesAtDate * p.close * usdEur;
            return {
                date: p.date,
                value: Math.round(valEur * 100) / 100
            };
        });

        // Calculate benchmark & portfolio return metrics for selected timeframe
        const stockCacheStmt = db.prepare('SELECT fmp_ticker, ticker, current_price, currency FROM stocks_cache');
        const stockCacheMap = {};
        stockCacheStmt.all().forEach(row => {
            stockCacheMap[row.ticker] = row;
            if (row.fmp_ticker) stockCacheMap[row.fmp_ticker] = row;
        });

        const priceHistStmt = db.prepare('SELECT close_price FROM price_history WHERE (ticker = ? OR ticker = ?) AND date <= ? ORDER BY date DESC LIMIT 1');

        const getPortfolioValuationOnDate = (targetDateStr) => {
            let hMap = {};
            for (const t of transactions) {
                if (t.date > targetDateStr) break;
                if (t.event_type !== 'DIVIDEND') {
                    if (!hMap[t.ticker]) hMap[t.ticker] = { shares: 0, fmp_ticker: t.fmp_ticker, currency: t.currency };
                    if (t.event_type === 'BUY' || t.event_type === 'STOCK_AS_DIVIDEND') hMap[t.ticker].shares += t.quantity;
                    else if (t.event_type === 'SELL') hMap[t.ticker].shares -= t.quantity;
                }
            }

            let total = 0;
            for (const [ticker, h] of Object.entries(hMap)) {
                if (h.shares <= 0.0001) continue;
                const scEntry = stockCacheMap[h.fmp_ticker || ticker] || stockCacheMap[ticker] || {};
                const cached = priceHistStmt.get(h.fmp_ticker || ticker, ticker, targetDateStr);

                let price = cached ? cached.close_price : (scEntry.current_price || 0);
                let priceCurr = cached ? (cached.currency || scEntry.currency || h.currency) : (scEntry.currency || h.currency);

                let rate = rates[priceCurr] || rates[h.currency] || 1;
                if (priceCurr === 'GBp' || priceCurr === 'GBX' || ((ticker.endsWith('.L') || (h.fmp_ticker && h.fmp_ticker.endsWith('.L'))) && price > 100)) {
                    rate = (rates['GBP'] || 1.17) / 100;
                }
                total += h.shares * price * rate;
            }
            return total;
        };

        const initialPortVal = getPortfolioValuationOnDate(startDateStr);
        const finalPortVal = getPortfolioValuationOnDate(toDateStr);

        let startBenchVal = benchmarkHistory.length > 0 ? benchmarkHistory[0].value : 0;
        let finalBenchVal = benchmarkHistory.length > 0 ? benchmarkHistory[benchmarkHistory.length - 1].value : 0;

        let netCashInRange = 0;
        for (const t of transactions) {
            if (t.date > startDateStr && t.date <= toDateStr) {
                let rate = rates[t.currency] || 1;
                if (t.currency === 'GBp' || t.currency === 'GBX') rate = (rates['GBP'] || 1.17) / 100;
                let netEur = 0;
                if (t.event_type === 'BUY' || t.event_type === 'STOCK_AS_DIVIDEND') netEur = (t.quantity * t.price + (t.fee_tax || 0)) * rate;
                else if (t.event_type === 'SELL') netEur = -(t.quantity * t.price - (t.fee_tax || 0)) * rate;
                netCashInRange += netEur;
            }
        }

        const baseCapitalPort = initialPortVal + netCashInRange;
        const portfolioReturn = baseCapitalPort > 0 ? ((finalPortVal - baseCapitalPort) / baseCapitalPort) * 100 : 0;

        const baseCapitalBench = startBenchVal + netCashInRange;
        const benchmarkReturn = baseCapitalBench > 0 ? ((finalBenchVal - baseCapitalBench) / baseCapitalBench) * 100 : 0;
        const alpha = portfolioReturn - benchmarkReturn;

        res.json({
            symbol,
            history: benchmarkHistory,
            benchmarkReturn: Math.round(benchmarkReturn * 100) / 100,
            portfolioReturn: Math.round(portfolioReturn * 100) / 100,
            alpha: Math.round(alpha * 100) / 100
        });
    } catch (e) {
        console.error('Error computing benchmark:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/portfolio/summary — Dashboard KPIs
router.get('/summary', async (req, res) => {
    try {
        const { holdings, totals } = await getComputedHoldings();

        // Get recent transactions for dashboard
        const recentStmt = db.prepare('SELECT * FROM transactions ORDER BY date DESC LIMIT 10');
        const recentTransactions = recentStmt.all();

        res.json({
            total_value: totals.total_value,
            total_cost: totals.total_cost,
            total_profit: totals.total_profit,
            total_profit_pct: totals.total_profit_pct,
            total_dividends: totals.total_dividends,
            daily_change: 0, // Would need previous day's data
            daily_change_pct: 0,
            num_holdings: totals.num_holdings,
            num_sectors: totals.num_sectors,
            recent_transactions: recentTransactions,
            sector_allocation: holdings.reduce((acc, h) => {
                const sector = h.sector || 'Unknown';
                if (!acc[sector]) acc[sector] = 0;
                acc[sector] += h.current_value_eur;
                return acc;
            }, {})
        });
    } catch (e) {
        console.error('Error computing summary:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/portfolio/yoy-performance — Year over year Capital Growth vs Dividend Yield
router.get('/yoy-performance', async (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM transactions ORDER BY date ASC');
        const transactions = stmt.all();

        if (transactions.length === 0) {
            return res.json({ yoyList: [] });
        }

        const rates = await currencyService.getCurrentRates();
        rates['EUR'] = 1;
        if (rates['GBP']) {
            rates['GBp'] = rates['GBP'] / 100;
            rates['GBX'] = rates['GBP'] / 100;
        }

        const cacheRows = db.prepare('SELECT ticker, fmp_ticker, current_price, currency FROM stocks_cache').all();
        const stockCacheMap = {};
        cacheRows.forEach(r => {
            if (r.ticker) stockCacheMap[r.ticker] = r;
            if (r.fmp_ticker) stockCacheMap[r.fmp_ticker] = r;
        });

        const startYear = parseInt(transactions[0].date.substring(0, 4));
        const currentYear = new Date().getFullYear();
        const priceHistStmt = db.prepare('SELECT close_price FROM price_history WHERE (ticker = ? OR ticker = ?) AND date <= ? ORDER BY date DESC LIMIT 1');

        // Helper function to calculate portfolio value on a given date
        const getPortfolioValueOnDate = (targetDateStr) => {
            let holdingsMap = {};
            let lastTxPriceMap = {};
            for (const t of transactions) {
                if (t.date > targetDateStr) break;
                if (t.event_type !== 'DIVIDEND') {
                    if (!holdingsMap[t.ticker]) {
                        holdingsMap[t.ticker] = { shares: 0, fmp_ticker: t.fmp_ticker, currency: t.currency };
                    }
                    if (t.event_type === 'BUY' || t.event_type === 'STOCK_AS_DIVIDEND') {
                        holdingsMap[t.ticker].shares += t.quantity;
                    } else if (t.event_type === 'SELL') {
                        holdingsMap[t.ticker].shares -= t.quantity;
                    }
                }
                lastTxPriceMap[t.ticker] = t.price;
                if (t.fmp_ticker) lastTxPriceMap[t.fmp_ticker] = t.price;
            }

            let totalValue = 0;
            for (const [ticker, h] of Object.entries(holdingsMap)) {
                if (h.shares <= 0.0001) continue;
                const stockCacheEntry = stockCacheMap[h.fmp_ticker || ticker] || stockCacheMap[ticker] || {};
                const cached = priceHistStmt.get(h.fmp_ticker || ticker, ticker, targetDateStr);
                let price = cached ? cached.close_price : (stockCacheEntry.current_price || lastTxPriceMap[ticker] || 0);
                let priceCurr = cached ? (cached.currency || stockCacheEntry.currency || h.currency) : (stockCacheEntry.currency || h.currency);
                let rate = rates[priceCurr] || rates[h.currency] || 1;
                if (priceCurr === 'GBp' || priceCurr === 'GBX' || ((ticker.endsWith('.L') || (h.fmp_ticker && h.fmp_ticker.endsWith('.L'))) && price > 100)) {
                    rate = (rates['GBP'] || 1.17) / 100;
                }
                totalValue += h.shares * price * rate;
            }
            return totalValue;
        };

        const yoyList = [];
        const { getSharesHeldOnDate } = require('../services/dividendDetector');

        for (let yr = startYear; yr <= currentYear; yr++) {
            const yrStr = yr.toString();
            const startJan1 = `${yrStr}-01-01`;
            const endDec31 = yr === currentYear ? new Date().toISOString().split('T')[0] : `${yrStr}-12-31`;

            const startValue = getPortfolioValueOnDate(startJan1);
            const endValue = getPortfolioValueOnDate(endDec31);

            let netContributions = 0;
            let dividendsEarned = 0;

            for (const t of transactions) {
                if (t.date >= startJan1 && t.date <= endDec31) {
                    const rate = rates[t.currency] || 1;
                    if (t.event_type === 'BUY') {
                        netContributions += (t.quantity * t.price + (t.fee_tax || 0)) * rate;
                    } else if (t.event_type === 'SELL') {
                        netContributions -= (t.quantity * t.price - (t.fee_tax || 0)) * rate;
                    } else if (t.event_type === 'DIVIDEND') {
                        const txListForTicker = transactions.filter(tr => tr.ticker === t.ticker);
                        const sharesHeld = getSharesHeldOnDate(txListForTicker, t.date);
                        if (sharesHeld > 0.0001) {
                            const val = (t.quantity * t.price) - (t.fee_tax || 0);
                            dividendsEarned += val * rate;
                        }
                    }
                }
            }

            const capitalGrowthEur = Math.round((endValue - startValue - netContributions) * 100) / 100;
            const denom = startValue + (netContributions / 2);
            const capitalGrowthPct = denom > 0 ? Math.round((capitalGrowthEur / denom) * 10000) / 100 : 0;
            const dividendYieldPct = denom > 0 ? Math.round((dividendsEarned / denom) * 10000) / 100 : 0;
            const totalReturnEur = Math.round((capitalGrowthEur + dividendsEarned) * 100) / 100;
            const totalReturnPct = Math.round((capitalGrowthPct + dividendYieldPct) * 100) / 100;

            yoyList.push({
                year: yrStr,
                startValue: Math.round(startValue * 100) / 100,
                endValue: Math.round(endValue * 100) / 100,
                netContributions: Math.round(netContributions * 100) / 100,
                dividendsEarned: Math.round(dividendsEarned * 100) / 100,
                capitalGrowthEur,
                capitalGrowthPct,
                dividendYieldPct,
                totalReturnEur,
                totalReturnPct
            });
        }

        res.json({ yoyList });
    } catch (e) {
        console.error('Error computing YoY performance:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/portfolio/export — Export portfolio backup (JSON or CSV)
router.get('/export', (req, res) => {
    try {
        const format = (req.query.format || 'json').toLowerCase();
        const transactions = db.prepare('SELECT * FROM transactions ORDER BY date ASC, id ASC').all();
        const settings = db.prepare('SELECT * FROM settings').all();

        const dateStr = new Date().toISOString().slice(0, 10);

        if (format === 'csv') {
            const headers = ['Event', 'Date', 'Symbol', 'FMP_Symbol', 'Price', 'Quantity', 'Currency', 'FeeTax', 'Exchange', 'FeeCurrency', 'Note', 'Sector'];
            const rows = transactions.map(t => [
                t.event_type || '',
                t.date || '',
                t.ticker || '',
                t.fmp_ticker || '',
                t.price ?? '',
                t.quantity ?? '',
                t.currency || '',
                t.fee_tax ?? 0,
                t.exchange || '',
                t.fee_currency || '',
                `"${(t.notes || '').replace(/"/g, '""')}"`,
                t.sector || ''
            ]);

            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="snowball-if-portfolio-${dateStr}.csv"`);
            return res.send(csvContent);
        }

        // Default: JSON Full Snapshot
        const settingsMap = {};
        for (const s of settings) {
            settingsMap[s.key] = s.value;
        }

        const exportData = {
            app: 'Snowball-IF',
            version: '1.0',
            exportedAt: new Date().toISOString(),
            recordCount: transactions.length,
            transactions: transactions.map(t => {
                const { id, ...cleanTx } = t;
                return cleanTx;
            }),
            settings: settingsMap
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="snowball-if-portfolio-backup-${dateStr}.json"`);
        return res.send(JSON.stringify(exportData, null, 2));
    } catch (e) {
        console.error('Error exporting portfolio:', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/portfolio/import-json — Import JSON backup file or payload
router.post('/import-json', upload.single('file'), (req, res) => {
    try {
        let payload = null;
        let mode = req.query.mode || req.body?.mode || 'merge';

        if (req.file) {
            const rawContent = fs.readFileSync(req.file.path, 'utf8');
            payload = JSON.parse(rawContent);
            fs.unlinkSync(req.file.path);
        } else if (req.body && req.body.transactions) {
            payload = req.body;
        } else if (req.body && req.body.data) {
            payload = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
        }

        if (!payload || !Array.isArray(payload.transactions)) {
            return res.status(400).json({ error: 'Invalid JSON portfolio backup payload. Missing transactions array.' });
        }

        const runImportTransaction = db.transaction(() => {
            if (mode === 'replace') {
                db.prepare('DELETE FROM transactions').run();
            }

            const insertStmt = db.prepare(`
                INSERT INTO transactions 
                (event_type, date, ticker, fmp_ticker, price, quantity, currency, fee_tax, exchange, fee_currency, notes, sector)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const checkStmt = db.prepare(`
                SELECT id FROM transactions 
                WHERE event_type = ? AND date = ? AND ticker = ? AND price = ? AND quantity = ? AND fee_tax = ?
            `);

            let importedCount = 0;
            let skippedCount = 0;

            for (const tx of payload.transactions) {
                const eventType = tx.event_type || tx.Event;
                const date = tx.date || tx.Date;
                const ticker = tx.ticker || tx.Symbol;
                const fmpTicker = tx.fmp_ticker || tx.FMP_Symbol || null;
                const price = parseFloat(tx.price ?? tx.Price) || 0;
                const quantity = parseFloat(tx.quantity ?? tx.Quantity) || 0;
                const currency = tx.currency || tx.Currency || 'EUR';
                const feeTax = parseFloat(tx.fee_tax ?? tx.FeeTax) || 0;
                const exchange = tx.exchange || tx.Exchange || null;
                const feeCurrency = tx.fee_currency || tx.FeeCurrency || null;
                const notes = tx.notes || tx.Note || null;
                const sector = tx.sector || tx.Sector || null;

                if (!eventType || !date || !ticker) continue;

                if (mode === 'merge') {
                    const existing = checkStmt.get(eventType, date, ticker, price, quantity, feeTax);
                    if (existing) {
                        skippedCount++;
                        continue;
                    }
                }

                insertStmt.run(eventType, date, ticker, fmpTicker, price, quantity, currency, feeTax, exchange, feeCurrency, notes, sector);
                importedCount++;
            }

            if (payload.settings && typeof payload.settings === 'object') {
                const setStmt = db.prepare(`
                    INSERT INTO settings (key, value) VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                `);
                for (const [k, v] of Object.entries(payload.settings)) {
                    if (v && typeof v === 'string') {
                        setStmt.run(k, v);
                    }
                }
            }

            return { importedCount, skippedCount };
        });

        const result = runImportTransaction();
        res.json({ success: true, ...result });

    } catch (e) {
        console.error('Error importing portfolio JSON:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;

