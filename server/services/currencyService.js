const db = require('../db/database');

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const fallbackRates = { 'USDEUR': 0.92, 'GBPEUR': 1.17 };

async function fetchFmpLocal(endpoint) {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) return null;
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${sep}apikey=${apiKey}`;
    try {
        const response = await fetch(url);
        if (response.ok) return await response.json();
    } catch (e) {
        console.error('Error fetching currency:', e);
    }
    return null;
}

async function getExchangeRate(fromCurrency, toCurrency, date = null) {
    if (fromCurrency === toCurrency) return 1;
    if (toCurrency !== 'EUR') return 1; 
    
    const pair = `${fromCurrency}${toCurrency}`;
    let stmt, cached;
    try {
        if (date) {
            stmt = db.prepare('SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ? AND date = ?');
            cached = stmt.get(fromCurrency, toCurrency, date);
        } else {
            stmt = db.prepare('SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ? ORDER BY date DESC LIMIT 1');
            cached = stmt.get(fromCurrency, toCurrency);
        }
    } catch (e) {
        console.warn('DB might not be initialized yet for exchange_rates');
    }
    
    if (cached) return cached.rate;

    let rate = fallbackRates[pair] || 1;
    if (date) {
        const data = await fetchFmpLocal(`/historical-price-full/${pair}?from=${date}&to=${date}`);
        if (data && data.historical && data.historical.length > 0) rate = data.historical[0].close;
    } else {
        const data = await fetchFmpLocal(`/fx/${pair}`);
        if (data && data.length > 0) {
            rate = data[0].bid;
        } else {
            // Yahoo Finance v8 FX fallback
            try {
                const symbol = `${toCurrency}${fromCurrency}=X`;
                const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, {
                    signal: AbortSignal.timeout(3000),
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });
                if (res.ok) {
                    const yData = await res.json();
                    const price = yData?.chart?.result?.[0]?.meta?.regularMarketPrice;
                    if (price) rate = 1 / price;
                }
            } catch (e) {}
        }
    }

    const today = date || new Date().toISOString().split('T')[0];
    try {
        const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO exchange_rates (date, from_currency, to_currency, rate)
            VALUES (?, ?, ?, ?)
        `);
        insertStmt.run(today, fromCurrency, toCurrency, rate);
    } catch (e) {}

    return rate;
}

async function convertToEur(amount, fromCurrency, date = null) {
    if (fromCurrency === 'EUR') return amount;
    const rate = await getExchangeRate(fromCurrency, 'EUR', date);
    return amount * rate;
}

async function getCurrentRates() {
    const usdEur = await getExchangeRate('USD', 'EUR');
    const gbpEur = await getExchangeRate('GBP', 'EUR');
    return { USD: usdEur, GBP: gbpEur };
}

module.exports = {
    getExchangeRate,
    convertToEur,
    getCurrentRates
};
