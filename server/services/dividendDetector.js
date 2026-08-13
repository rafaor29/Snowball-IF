const db = require('../db/database');
const marketData = require('./marketData');

/**
 * Fetch dividend history with FMP first, Yahoo Finance fallback
 */
async function fetchCorporateDividends(fmpTicker, baseTicker) {
    try {
        const fmpData = await marketData.getDividendHistory(fmpTicker);
        if (fmpData && Array.isArray(fmpData) && fmpData.length > 0) {
            return fmpData.map(d => ({
                exDate: d.date || d.recordDate || d.declarationDate,
                paymentDate: d.paymentDate || d.date,
                amount: d.dividend !== undefined ? d.dividend : (d.adjDividend || 0),
                currency: d.currency || null,
                source: 'FMP'
            })).filter(d => d.amount > 0 && d.paymentDate);
        }
    } catch (e) {
        console.warn(`FMP dividend fetch failed for ${fmpTicker}:`, e.message);
    }

    // Fallback: Yahoo Finance chart API with events=div
    const symbolsToTry = [fmpTicker, baseTicker];
    if (baseTicker && !baseTicker.includes('.')) {
        symbolsToTry.push(`${baseTicker}.MC`);
    }

    for (const sym of symbolsToTry) {
        if (!sym) continue;
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?events=div&range=10y&interval=1mo`;
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            const result = data?.chart?.result?.[0];
            const divEvents = result?.events?.dividends;
            const currency = result?.meta?.currency || 'EUR';

            if (divEvents && Object.keys(divEvents).length > 0) {
                const list = Object.values(divEvents).map(d => {
                    const dt = new Date(d.date * 1000).toISOString().split('T')[0];
                    return {
                        exDate: dt,
                        paymentDate: dt,
                        amount: d.amount,
                        currency,
                        source: 'Yahoo'
                    };
                });
                return list.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
            }
        } catch (e) {
            console.warn(`Yahoo dividend fetch failed for ${sym}:`, e.message);
        }
    }

    return [];
}

/**
 * Calculates exact shares held for a ticker on a given date string (YYYY-MM-DD)
 */
function getSharesHeldOnDate(allTx, targetDate) {
    let shares = 0;
    for (const tx of allTx) {
        if (tx.date <= targetDate) {
            if (tx.event_type === 'BUY' || tx.event_type === 'STOCK_AS_DIVIDEND') {
                shares += tx.quantity;
            } else if (tx.event_type === 'SELL') {
                shares -= tx.quantity;
            }
        }
    }
    return Math.max(0, shares);
}

/**
 * Detect missing dividend transactions across all portfolio holdings
 */
async function detectMissingDividends() {
    const allStmt = db.prepare('SELECT * FROM transactions ORDER BY date ASC');
    const transactions = allStmt.all();

    if (transactions.length === 0) {
        return { missingCount: 0, missingDividends: [], scannedTickers: [] };
    }

    // Group transactions by ticker
    const txByTicker = {};
    for (const tx of transactions) {
        if (!txByTicker[tx.ticker]) txByTicker[tx.ticker] = [];
        txByTicker[tx.ticker].push(tx);
    }

    const missingDividends = [];
    const scannedTickers = Object.keys(txByTicker);

    for (const ticker of scannedTickers) {
        const txList = txByTicker[ticker];
        const buyTxs = txList.filter(t => t.event_type === 'BUY' || t.event_type === 'STOCK_AS_DIVIDEND');
        if (buyTxs.length === 0) continue;

        const firstBuyDate = buyTxs[0].date;
        const fmpTicker = txList[0].fmp_ticker || ticker;
        const stockCurrency = txList[0].currency || 'EUR';

        // Existing logged dividends for matching
        const loggedDividends = txList.filter(t => t.event_type === 'DIVIDEND' || t.event_type === 'STOCK_AS_DIVIDEND');

        // Fetch corporate distribution history
        const corporateDivs = await fetchCorporateDividends(fmpTicker, ticker);

        for (const div of corporateDivs) {
            const divDate = div.paymentDate || div.exDate;
            if (!divDate || divDate < firstBuyDate) continue;

            // Don't consider future dates beyond today
            const todayStr = new Date().toISOString().split('T')[0];
            if (divDate > todayStr) continue;

            // Check how many shares user held on exDate or divDate
            const sharesOnExDate = getSharesHeldOnDate(txList, div.exDate || divDate);
            if (sharesOnExDate <= 0.0001) continue;

            // Match against existing logged transactions within 10 days tolerance
            const isLogged = loggedDividends.some(t => {
                const dayDiff = Math.abs(new Date(t.date) - new Date(divDate)) / (1000 * 60 * 60 * 24);
                return dayDiff <= 10;
            });

            if (!isLogged) {
                const currency = div.currency || stockCurrency;
                // Determine default tax percentage: 19% for ES (.MC or EUR), 15% for US (USD)
                const isSpanish = ticker.endsWith('.MC') || fmpTicker.endsWith('.MC') || currency === 'EUR';
                const defaultTaxPct = isSpanish ? 19 : (currency === 'USD' ? 15 : 0);

                const grossAmount = Math.round(sharesOnExDate * div.amount * 100) / 100;
                const estimatedTax = Math.round(grossAmount * (defaultTaxPct / 100) * 100) / 100;
                const estimatedNet = Math.round((grossAmount - estimatedTax) * 100) / 100;

                missingDividends.push({
                    id: `${ticker}-${divDate}-${div.amount}`,
                    ticker,
                    fmp_ticker: fmpTicker,
                    ex_date: div.exDate,
                    payment_date: divDate,
                    dividend_per_share: div.amount,
                    shares_held: sharesOnExDate,
                    currency,
                    gross_amount: grossAmount,
                    default_tax_pct: defaultTaxPct,
                    estimated_tax: estimatedTax,
                    estimated_net: estimatedNet,
                    event_type: 'DIVIDEND' // Default recommendation
                });
            }
        }
    }

    return {
        missingCount: missingDividends.length,
        missingDividends,
        scannedTickers
    };
}

/**
 * Get detailed company dividend log + corporate timeline
 */
async function getCompanyDividendDetails(ticker) {
    const stmt = db.prepare('SELECT * FROM transactions WHERE ticker = ? OR fmp_ticker = ? ORDER BY date DESC');
    const txList = stmt.all(ticker, ticker);

    if (txList.length === 0) {
        return { ticker, logged: [], corporate: [], totalCash: 0, totalScripShares: 0 };
    }

    const fmpTicker = txList[0].fmp_ticker || ticker;
    const logged = txList.filter(t => t.event_type === 'DIVIDEND' || t.event_type === 'STOCK_AS_DIVIDEND');

    const totalCash = logged
        .filter(t => t.event_type === 'DIVIDEND')
        .reduce((sum, t) => sum + (t.quantity * t.price - (t.fee_tax || 0)), 0);

    const totalScripShares = logged
        .filter(t => t.event_type === 'STOCK_AS_DIVIDEND')
        .reduce((sum, t) => sum + t.quantity, 0);

    const corporate = await fetchCorporateDividends(fmpTicker, ticker);

    return {
        ticker,
        fmp_ticker: fmpTicker,
        logged,
        corporate,
        totalCash: Math.round(totalCash * 100) / 100,
        totalScripShares
    };
}

/**
 * Auto-sync missing corporate dividends for a specific ticker
 */
async function autoSyncDividendsForTicker(ticker) {
    if (!ticker) return 0;
    const allStmt = db.prepare('SELECT * FROM transactions WHERE ticker = ? ORDER BY date ASC');
    const txList = allStmt.all(ticker);
    if (txList.length === 0) return 0;

    const buyTxs = txList.filter(t => t.event_type === 'BUY' || t.event_type === 'STOCK_AS_DIVIDEND');
    if (buyTxs.length === 0) return 0;

    const firstBuyDate = buyTxs[0].date;
    const fmpTicker = txList[0].fmp_ticker || ticker;
    const stockCurrency = txList[0].currency || 'EUR';
    const loggedDividends = txList.filter(t => t.event_type === 'DIVIDEND' || t.event_type === 'STOCK_AS_DIVIDEND');

    const corporateDivs = await fetchCorporateDividends(fmpTicker, ticker);
    const missingToInject = [];

    for (const div of corporateDivs) {
        const divDate = div.paymentDate || div.exDate;
        if (!divDate || divDate < firstBuyDate) continue;

        const todayStr = new Date().toISOString().split('T')[0];
        if (divDate > todayStr) continue;

        const sharesOnExDate = getSharesHeldOnDate(txList, div.exDate || divDate);
        if (sharesOnExDate <= 0.0001) continue;

        const isLogged = loggedDividends.some(t => {
            const dayDiff = Math.abs(new Date(t.date) - new Date(divDate)) / (1000 * 60 * 60 * 24);
            return dayDiff <= 10;
        });

        if (!isLogged) {
            const currency = div.currency || stockCurrency;
            const isSpanish = ticker.endsWith('.MC') || fmpTicker.endsWith('.MC') || currency === 'EUR';
            const defaultTaxPct = isSpanish ? 19 : (currency === 'USD' ? 15 : 0);
            const grossAmount = Math.round(sharesOnExDate * div.amount * 100) / 100;
            const estimatedTax = Math.round(grossAmount * (defaultTaxPct / 100) * 100) / 100;

            missingToInject.push({
                event_type: 'DIVIDEND',
                date: divDate,
                ticker,
                fmp_ticker: fmpTicker,
                price: div.amount,
                quantity: sharesOnExDate,
                currency,
                fee_tax: estimatedTax,
                notes: 'Auto-injected DIVIDEND corporate dividend'
            });
        }
    }

    if (missingToInject.length > 0) {
        const insertStmt = db.prepare(`
            INSERT INTO transactions 
            (event_type, date, ticker, fmp_ticker, price, quantity, currency, fee_tax, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const transaction = db.transaction((rows) => {
            for (const item of rows) {
                insertStmt.run(item.event_type, item.date, item.ticker, item.fmp_ticker, item.price, item.quantity, item.currency, item.fee_tax, item.notes);
            }
        });
        transaction(missingToInject);
    }
    return missingToInject.length;
}

module.exports = {
    detectMissingDividends,
    getCompanyDividendDetails,
    getSharesHeldOnDate,
    fetchCorporateDividends,
    autoSyncDividendsForTicker
};

