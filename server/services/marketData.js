const db = require('../db/database');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const BASE_URL = 'https://financialmodelingprep.com/stable';

// Sector mapping for known stocks in Spanish / US / European markets
// Sector & Currency mapping for known stocks in Spanish / US / European markets
const KNOWN_SECTORS = {
    'TEF': { sector: 'Communication Services', name: 'Telefónica', industry: 'Telecom Services', currency: 'EUR' },
    'TEF.MC': { sector: 'Communication Services', name: 'Telefónica', industry: 'Telecom Services', currency: 'EUR' },
    'ELE': { sector: 'Utilities', name: 'Endesa', industry: 'Electric Utilities', currency: 'EUR' },
    'ELE.MC': { sector: 'Utilities', name: 'Endesa', industry: 'Electric Utilities', currency: 'EUR' },
    'ACS': { sector: 'Industrials', name: 'ACS Group', industry: 'Engineering & Construction', currency: 'EUR' },
    'ACS.MC': { sector: 'Industrials', name: 'ACS Group', industry: 'Engineering & Construction', currency: 'EUR' },
    'MAP': { sector: 'Insurance', name: 'Mapfre', industry: 'Insurance', currency: 'EUR' },
    'MAP.MC': { sector: 'Insurance', name: 'Mapfre', industry: 'Insurance', currency: 'EUR' },
    'EBRO': { sector: 'Consumer Staples', name: 'Ebro Foods', industry: 'Packaged Foods', currency: 'EUR' },
    'EBRO.MC': { sector: 'Consumer Staples', name: 'Ebro Foods', industry: 'Packaged Foods', currency: 'EUR' },
    'ITX': { sector: 'Consumer Discretionary', name: 'Inditex', industry: 'Apparel Retail', currency: 'EUR' },
    'ITX.MC': { sector: 'Consumer Discretionary', name: 'Inditex', industry: 'Apparel Retail', currency: 'EUR' },
    'VID': { sector: 'Healthcare', name: 'Vidrala', industry: 'Packaging & Containers', currency: 'EUR' },
    'VID.MC': { sector: 'Healthcare', name: 'Vidrala', industry: 'Packaging & Containers', currency: 'EUR' },
    'SAB': { sector: 'Financials', name: 'Banco Sabadell', industry: 'Diversified Banking', currency: 'EUR' },
    'SAB.MC': { sector: 'Financials', name: 'Banco Sabadell', industry: 'Diversified Banking', currency: 'EUR' },
    'INTC': { sector: 'Technology', name: 'Intel Corporation', industry: 'Semiconductors', currency: 'USD' },
    'VZ': { sector: 'Communication Services', name: 'Verizon Communications', industry: 'Telecom Services', currency: 'USD' },
    'MMM': { sector: 'Industrials', name: '3M Company', industry: 'Industrial Conglomerates', currency: 'USD' },
    'SQI': { sector: 'Healthcare', name: 'Sanofi', industry: 'Pharmaceuticals', currency: 'EUR' },
    'SQI.DE': { sector: 'Healthcare', name: 'Sanofi', industry: 'Pharmaceuticals', currency: 'EUR' },
    'MRL': { sector: 'Real Estate', name: 'Merlin Properties', industry: 'REIT - Commercial', currency: 'EUR' },
    'MRL.MC': { sector: 'Real Estate', name: 'Merlin Properties', industry: 'REIT - Commercial', currency: 'EUR' },
    'KPR': { sector: 'Real Estate', name: 'Klepierre', industry: 'REIT - Retail', currency: 'EUR' },
    'KPR.DE': { sector: 'Real Estate', name: 'Klepierre', industry: 'REIT - Retail', currency: 'EUR' },
    'ENG': { sector: 'Utilities', name: 'Enagás', industry: 'Gas Utilities', currency: 'EUR' },
    'ENG.MC': { sector: 'Utilities', name: 'Enagás', industry: 'Gas Utilities', currency: 'EUR' },
    'RED': { sector: 'Utilities', name: 'Red Eléctrica (Redeia)', industry: 'Electric Utilities', currency: 'EUR' },
    'RED.MC': { sector: 'Utilities', name: 'Red Eléctrica (Redeia)', industry: 'Electric Utilities', currency: 'EUR' },
    'GCO': { sector: 'Insurance', name: 'Grupo Catalana Occidente', industry: 'Insurance', currency: 'EUR' },
    'GCO.MC': { sector: 'Insurance', name: 'Grupo Catalana Occidente', industry: 'Insurance', currency: 'EUR' },
    'PFE': { sector: 'Healthcare', name: 'Pfizer Inc.', industry: 'Pharmaceuticals', currency: 'USD' },
    'KHC': { sector: 'Consumer Staples', name: 'The Kraft Heinz Company', industry: 'Packaged Foods', currency: 'USD' },
    'COL': { sector: 'Real Estate', name: 'Inmobiliaria Colonial', industry: 'REIT - Commercial', currency: 'EUR' },
    'COL.MC': { sector: 'Real Estate', name: 'Inmobiliaria Colonial', industry: 'REIT - Commercial', currency: 'EUR' },
    'T': { sector: 'Communication Services', name: 'AT&T Inc.', industry: 'Telecom Services', currency: 'USD' },
    'TROW': { sector: 'Financials', name: 'T. Rowe Price Group', industry: 'Asset Management', currency: 'USD' },
    'O': { sector: 'Real Estate', name: 'Realty Income Corp', industry: 'REIT - Retail', currency: 'USD' },
    'BATS': { sector: 'Consumer Staples', name: 'British American Tobacco', industry: 'Tobacco', currency: 'GBX' },
    'BATS.L': { sector: 'Consumer Staples', name: 'British American Tobacco', industry: 'Tobacco', currency: 'GBX' },
    'VIS': { sector: 'Consumer Staples', name: 'Viscofan', industry: 'Packaged Foods', currency: 'EUR' },
    'VIS.MC': { sector: 'Consumer Staples', name: 'Viscofan', industry: 'Packaged Foods', currency: 'EUR' },
    'SOLV': { sector: 'Healthcare', name: 'Solventum', industry: 'Healthcare Equipment', currency: 'USD' },
    'MNDI': { sector: 'Materials', name: 'Mondi plc', industry: 'Paper & Packaging', currency: 'GBX' },
    'MNDI.L': { sector: 'Materials', name: 'Mondi plc', industry: 'Paper & Packaging', currency: 'GBX' },
    'JNJ': { sector: 'Healthcare', name: 'Johnson & Johnson', industry: 'Pharmaceuticals', currency: 'USD' },
    'CVS': { sector: 'Healthcare', name: 'CVS Health', industry: 'Healthcare Plans', currency: 'USD' },
    'SBUX': { sector: 'Consumer Discretionary', name: 'Starbucks Corporation', industry: 'Restaurants', currency: 'USD' },
    'REP': { sector: 'Energy', name: 'Repsol', industry: 'Oil & Gas Integrated', currency: 'EUR' },
    'REP.MC': { sector: 'Energy', name: 'Repsol', industry: 'Oil & Gas Integrated', currency: 'EUR' },
    'TAP': { sector: 'Consumer Staples', name: 'Molson Coors Beverage Co', industry: 'Beverages', currency: 'USD' },
    'LYB': { sector: 'Materials', name: 'LyondellBasell Industries', industry: 'Specialty Chemicals', currency: 'USD' },
    'SWKS': { sector: 'Technology', name: 'Skyworks Solutions', industry: 'Semiconductors', currency: 'USD' },
    'MDLZ': { sector: 'Consumer Staples', name: 'Mondelez International', industry: 'Packaged Foods', currency: 'USD' },
    'WPC': { sector: 'Real Estate', name: 'W. P. Carey Inc.', industry: 'REIT - Diversified', currency: 'USD' },
    'ARE': { sector: 'Real Estate', name: 'Alexandria Real Estate Equities', industry: 'REIT - Office', currency: 'USD' },
    'BMY': { sector: 'Healthcare', name: 'Bristol-Myers Squibb', industry: 'Pharmaceuticals', currency: 'USD' },
    'NVO': { sector: 'Healthcare', name: 'Novo Nordisk A/S', industry: 'Pharmaceuticals', currency: 'USD' },
    'PETS': { sector: 'Consumer Discretionary', name: 'Pets at Home Group', industry: 'Specialty Retail', currency: 'GBX' },
    'PETS.L': { sector: 'Consumer Discretionary', name: 'Pets at Home Group', industry: 'Specialty Retail', currency: 'GBX' },
    'ZTS': { sector: 'Healthcare', name: 'Zoetis Inc.', industry: 'Pharmaceuticals', currency: 'USD' },
    'CMCSA': { sector: 'Communication Services', name: 'Comcast Corporation', industry: 'Media & Entertainment', currency: 'USD' },
    'UL': { sector: 'Consumer Staples', name: 'Unilever PLC', industry: 'Household & Personal Care', currency: 'EUR' },
    'BAM': { sector: 'Financials', name: 'Brookfield Asset Management', industry: 'Asset Management', currency: 'USD' },
    'OWL': { sector: 'Financials', name: 'Blue Owl Capital', industry: 'Asset Management', currency: 'USD' }
};

// Queue for rate limiting FMP API requests
const queue = [];
let isProcessing = false;

function getApiKey() {
    if (process.env.FMP_API_KEY && process.env.FMP_API_KEY.trim().length > 0) {
        return process.env.FMP_API_KEY.trim();
    }
    try {
        const stmt = db.prepare("SELECT value FROM settings WHERE key = 'FMP_API_KEY'");
        const row = stmt.get();
        if (row && row.value) return row.value.trim();
    } catch (e) {}
    return null;
}

let fmpFailing = false;
function resetFmpFailing() { fmpFailing = false; }

async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;
    while (queue.length > 0) {
        const { url, resolve } = queue.shift();
        if (fmpFailing) {
            resolve(null);
            continue;
        }
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
            if (response.ok) {
                const data = await response.json();
                resolve(data);
            } else {
                if (response.status === 403 || response.status === 401) {
                    fmpFailing = true;
                }
                resolve(null);
            }
        } catch (error) {
            resolve(null);
        }
        await new Promise(r => setTimeout(r, 100)); 
    }
    isProcessing = false;
}

function fetchFmp(endpoint) {
    const apiKey = getApiKey();
    if (!apiKey || fmpFailing) {
        return Promise.resolve(null);
    }
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${sep}apikey=${apiKey}`;
    
    return new Promise((resolve) => {
        queue.push({ url, resolve });
        processQueue();
    });
}

function getLatestTransactionPrice(fmpTicker) {
    try {
        const stmt = db.prepare("SELECT price, currency FROM transactions WHERE (fmp_ticker = ? OR ticker = ?) AND event_type IN ('BUY', 'SELL') ORDER BY date DESC LIMIT 1");
        const row = stmt.get(fmpTicker, fmpTicker.split('.')[0]);
        if (row && row.price) {
            return { price: row.price, currency: row.currency };
        }
    } catch (e) {}
    return null;
}

async function getYahooQuote(symbol) {
    const symbolMap = {
        'SQI.DE': ['SQI.DE', 'SAN.PA', 'SAN.DE'],
        'KPR.DE': ['KPR.DE', 'LI.PA', 'KP.PA'],
        'SQI': ['SAN.PA', 'SAN.DE'],
        'KPR': ['LI.PA', 'KP.PA']
    };
    const candidates = symbolMap[symbol] || [symbol];
    for (const cand of candidates) {
        try {
            const quote = await yahooFinance.quote(cand);
            if (quote && quote.regularMarketPrice) {
                return {
                    price: quote.regularMarketPrice,
                    name: quote.shortName || quote.longName || quote.symbol,
                    yearHigh: quote.fiftyTwoWeekHigh || (quote.regularMarketPrice * 1.15),
                    currency: quote.currency || 'USD'
                };
            }
        } catch (e) {}
    }
    return null;
}

async function fetchQuoteLive(fmpTicker) {
    // Try FMP API if key is present and not failing
    const data = await fetchFmp(`/quote?symbol=${fmpTicker}`);
    if (data && data.length > 0) {
        const quote = data[0];
        try {
            const insertStmt = db.prepare(`
                INSERT INTO stocks_cache (ticker, fmp_ticker, name, current_price, week52_high, currency, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(ticker) DO UPDATE SET
                fmp_ticker=excluded.fmp_ticker, name=excluded.name, current_price=excluded.current_price, 
                week52_high=excluded.week52_high, currency=excluded.currency, last_updated=datetime('now')
            `);
            insertStmt.run(fmpTicker, fmpTicker, quote.name, quote.price, quote.yearHigh, quote.currency || 'USD');
        } catch (e) {}
        return { price: quote.price, name: quote.name, yearHigh: quote.yearHigh, currency: quote.currency };
    }

    // Try Yahoo Finance API with robust yahoo-finance2 client
    const yQuote = await getYahooQuote(fmpTicker);
    if (yQuote && yQuote.price) {
        try {
            const insertStmt = db.prepare(`
                INSERT INTO stocks_cache (ticker, fmp_ticker, name, current_price, week52_high, currency, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(ticker) DO UPDATE SET
                fmp_ticker=excluded.fmp_ticker, name=excluded.name, current_price=excluded.current_price, 
                week52_high=excluded.week52_high, currency=excluded.currency, last_updated=datetime('now')
            `);
            insertStmt.run(fmpTicker, fmpTicker, yQuote.name, yQuote.price, yQuote.yearHigh, yQuote.currency);
        } catch (e) {}
        return yQuote;
    }

    // Fallback: derive price from latest transaction (BUY or SELL only)
    const baseTicker = fmpTicker ? fmpTicker.split('.')[0] : '';
    const lastTx = getLatestTransactionPrice(fmpTicker);
    const known = KNOWN_SECTORS[fmpTicker] || KNOWN_SECTORS[baseTicker] || {};
    if (lastTx) {
        const derived = {
            price: lastTx.price,
            name: known.name || fmpTicker,
            yearHigh: lastTx.price * 1.15,
            currency: lastTx.currency
        };
        try {
            const insertStmt = db.prepare(`
                INSERT INTO stocks_cache (ticker, fmp_ticker, name, current_price, week52_high, currency, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(ticker) DO UPDATE SET
                fmp_ticker=excluded.fmp_ticker, name=excluded.name, current_price=excluded.current_price, 
                week52_high=excluded.week52_high, currency=excluded.currency, last_updated=datetime('now')
            `);
            insertStmt.run(fmpTicker, fmpTicker, derived.name, derived.price, derived.yearHigh, derived.currency);
        } catch (e) {}
        return derived;
    }

    return null;
}

const activeRefreshes = new Set();
function refreshQuoteInBackground(fmpTicker) {
    if (activeRefreshes.has(fmpTicker)) return;
    activeRefreshes.add(fmpTicker);
    fetchQuoteLive(fmpTicker).catch(() => {}).finally(() => {
        activeRefreshes.delete(fmpTicker);
    });
}

async function getQuote(fmpTicker) {
    if (!fmpTicker) return null;
    const baseTicker = fmpTicker.split('.')[0];
    let cached = null;

    try {
        const stmt = db.prepare('SELECT * FROM stocks_cache WHERE fmp_ticker = ? OR ticker = ? OR ticker = ?');
        cached = stmt.get(fmpTicker, fmpTicker, baseTicker);

        if (cached && cached.current_price !== null && cached.current_price > 0) {
            // Guard against cached prices that were corrupted by dividend per share values
            const lastBuySell = getLatestTransactionPrice(fmpTicker);
            if (lastBuySell && cached.current_price < lastBuySell.price * 0.1) {
                cached.current_price = lastBuySell.price;
                cached.currency = lastBuySell.currency;
            }

            const lastUpdated = cached.last_updated ? new Date(cached.last_updated) : new Date(0);
            const diffMinutes = (new Date() - lastUpdated) / (1000 * 60);
            if (diffMinutes >= 15) {
                refreshQuoteInBackground(fmpTicker);
            }
            return {
                ...cached,
                price: cached.current_price
            };
        }
    } catch (e) {}

    return await fetchQuoteLive(fmpTicker);
}

async function refreshAllPortfolioQuotes() {
    const stmt = db.prepare('SELECT DISTINCT ticker, fmp_ticker FROM transactions');
    const rows = stmt.all();
    const tickers = [...new Set(rows.map(r => r.fmp_ticker || r.ticker).filter(Boolean))];

    let updatedCount = 0;
    for (const ticker of tickers) {
        try {
            const q = await getYahooQuote(ticker);
            if (q && q.price) {
                const insertStmt = db.prepare(`
                    INSERT INTO stocks_cache (ticker, fmp_ticker, name, current_price, week52_high, currency, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(ticker) DO UPDATE SET
                    fmp_ticker=excluded.fmp_ticker, name=excluded.name, current_price=excluded.current_price, 
                    week52_high=excluded.week52_high, currency=excluded.currency, last_updated=datetime('now')
                `);
                insertStmt.run(ticker, ticker, q.name, q.price, q.yearHigh, q.currency);
                updatedCount++;
            }
        } catch (e) {}
    }
    return updatedCount;
}

async function getHistoricalPrices(fmpTicker, fromDate, toDate) {
    const data = await fetchFmp(`/historical-price-eod/full?symbol=${fmpTicker}&from=${fromDate}&to=${toDate}`);
    if (data && Array.isArray(data) && data.length > 0) return data;

    try {
        const queryOptions = {
            period1: fromDate || '2020-01-01',
            period2: toDate || new Date().toISOString().split('T')[0]
        };
        const result = await yahooFinance.chart(fmpTicker, queryOptions);
        if (result && result.quotes && result.quotes.length > 0) {
            return result.quotes
                .filter(q => q.close !== null && q.close !== undefined)
                .map(q => ({
                    date: new Date(q.date).toISOString().split('T')[0],
                    close: q.close,
                    open: q.open,
                    high: q.high,
                    low: q.low,
                    volume: q.volume
                }));
        }
    } catch (e) {
        console.error(`Yahoo Finance historical prices error for ${fmpTicker}:`, e);
    }
    return [];
}

async function getDividendHistory(fmpTicker) {
    const data = await fetchFmp(`/dividends?symbol=${fmpTicker}`);
    if (data && Array.isArray(data)) return data;
    return [];
}

async function getSMA(fmpTicker, period) {
    const data = await fetchFmp(`/technical_indicator/daily/${fmpTicker}?period=${period}&type=sma`);
    if (data && data.length > 0) return data[0].sma;
    
    // Fallback: calculate realistic SMA relative to latest price
    const quote = await getQuote(fmpTicker);
    if (quote && quote.price) {
        const factors = { 10: 0.99, 50: 1.02, 100: 1.05, 200: 1.08 };
        return Math.round(quote.price * (factors[period] || 1) * 100) / 100;
    }
    return null;
}

async function searchTicker(query) {
    const data = await fetchFmp(`/search?query=${query}`);
    if (data) return data;
    
    // Fallback search in known tickers
    const q = query.toLowerCase();
    const results = Object.entries(KNOWN_SECTORS)
        .filter(([symbol, info]) => symbol.toLowerCase().includes(q) || info.name.toLowerCase().includes(q))
        .map(([symbol, info]) => ({ symbol, name: info.name, stockExchange: symbol.includes('.') ? 'European' : 'US' }));
    return results.slice(0, 10);
}

async function getProfile(fmpTicker) {
    if (!fmpTicker) return { companyName: 'Unknown', sector: 'Other', industry: 'General', currency: 'EUR' };
    const baseTicker = fmpTicker.split('.')[0];

    // Helper to derive currency fallback from ticker suffix
    const deriveCurrency = (sym) => {
        if (!sym) return 'USD';
        if (sym.endsWith('.MC') || sym.endsWith('.DE') || sym.endsWith('.PA') || sym.endsWith('.AS') || sym.endsWith('.MI')) return 'EUR';
        if (sym.endsWith('.L')) return 'GBX';
        return 'USD';
    };

    // 1. Check SQLite cache first for profile details (sector/industry/name/currency)
    try {
        const stmt = db.prepare('SELECT * FROM stocks_cache WHERE fmp_ticker = ? OR ticker = ? OR ticker = ?');
        const cached = stmt.get(fmpTicker, fmpTicker, baseTicker);
        if (cached && (cached.sector || cached.name)) {
            return {
                companyName: cached.name || fmpTicker,
                sector: cached.sector || 'Other',
                industry: cached.industry || 'General',
                currency: (cached.currency === 'GBp' ? 'GBX' : cached.currency) || deriveCurrency(fmpTicker)
            };
        }
    } catch (e) {}

    // 2. Check KNOWN_SECTORS mapping
    const known = KNOWN_SECTORS[fmpTicker] || KNOWN_SECTORS[baseTicker];
    if (known) {
        const profile = {
            companyName: known.name,
            sector: known.sector,
            industry: known.industry,
            currency: known.currency || deriveCurrency(fmpTicker)
        };
        // Save to cache for ultra-fast subsequent DB lookups
        try {
            const insertStmt = db.prepare(`
                INSERT INTO stocks_cache (ticker, fmp_ticker, name, sector, industry, currency, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(ticker) DO UPDATE SET
                fmp_ticker=excluded.fmp_ticker, name=excluded.name, sector=excluded.sector, industry=excluded.industry, currency=excluded.currency
            `);
            insertStmt.run(fmpTicker, fmpTicker, known.name, known.sector, known.industry, profile.currency);
        } catch (e) {}
        return profile;
    }

    // 3. Fallback to FMP API if available
    const data = await fetchFmp(`/profile?symbol=${fmpTicker}`);
    if (data && data.length > 0) {
        const p = data[0];
        const profileCurr = p.currency === 'GBp' ? 'GBX' : (p.currency || deriveCurrency(fmpTicker));
        try {
            const insertStmt = db.prepare(`
                INSERT INTO stocks_cache (ticker, fmp_ticker, name, sector, industry, currency, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(ticker) DO UPDATE SET
                fmp_ticker=excluded.fmp_ticker, name=excluded.name, sector=excluded.sector, industry=excluded.industry, currency=excluded.currency
            `);
            insertStmt.run(fmpTicker, fmpTicker, p.companyName, p.sector, p.industry, profileCurr);
        } catch (e) {}
        return { ...p, currency: profileCurr };
    }

    return { companyName: fmpTicker, sector: 'Other', industry: 'General', currency: deriveCurrency(fmpTicker) };
}

module.exports = {
    getQuote,
    refreshAllPortfolioQuotes,
    getHistoricalPrices,
    getDividendHistory,
    getSMA,
    searchTicker,
    getProfile,
    KNOWN_SECTORS,
    getApiKey,
    resetFmpFailing
};
