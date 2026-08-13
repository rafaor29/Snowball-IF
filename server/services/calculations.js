function calculateHoldings(transactions, quotes, rates) {
    const holdings = {};
    let totalPortfolioValue = 0;

    // Helper rate table (EUR is home currency)
    const effectiveRates = { ...rates, EUR: 1 };
    if (effectiveRates['GBP']) {
        effectiveRates['GBp'] = effectiveRates['GBP'] / 100;
        effectiveRates['GBX'] = effectiveRates['GBP'] / 100;
    }

    transactions.forEach(t => {
        const ticker = t.ticker;
        if (!holdings[ticker]) {
            holdings[ticker] = {
                ticker,
                fmp_ticker: t.fmp_ticker,
                shares_held: 0,
                total_cost_native: 0,
                dividends_received_eur: 0,
                cost_basis_eur: 0,
                currencies: new Set()
            };
        }

        if (t.currency) {
            holdings[ticker].currencies.add(t.currency);
        }

        let rate = effectiveRates[t.currency] || 1;
        if (t.currency === 'GBp' || t.currency === 'GBX') {
            rate = (effectiveRates['GBP'] || 1.17) / 100;
        }

        if (t.event_type === 'BUY') {
            holdings[ticker].shares_held += t.quantity;
            const cost = (t.quantity * t.price) + (t.fee_tax || 0);
            holdings[ticker].total_cost_native += cost;
            holdings[ticker].cost_basis_eur += cost * rate;
        } else if (t.event_type === 'STOCK_AS_DIVIDEND') {
            holdings[ticker].shares_held += t.quantity;
            const fee = (t.fee_tax || 0);
            holdings[ticker].total_cost_native += fee;
            holdings[ticker].cost_basis_eur += fee * rate;
        } else if (t.event_type === 'SELL') {
            if (holdings[ticker].shares_held > 0) {
                const proportion = Math.min(1, t.quantity / holdings[ticker].shares_held);
                holdings[ticker].shares_held -= t.quantity;
                holdings[ticker].total_cost_native -= (holdings[ticker].total_cost_native * proportion);
                holdings[ticker].cost_basis_eur -= (holdings[ticker].cost_basis_eur * proportion);
            }
        } else if (t.event_type === 'DIVIDEND') {
            const val = (t.quantity * t.price) - (t.fee_tax || 0);
            holdings[ticker].dividends_received_eur += (val * rate);
        }
    });

    const activeHoldings = Object.values(holdings).filter(h => h.shares_held > 0.0001);

    activeHoldings.forEach(h => {
        const quote = quotes[h.fmp_ticker] || quotes[h.ticker] || {};
        const quoteCurr = quote.currency === 'GBp' ? 'GBX' : quote.currency;
        const fmp = h.fmp_ticker || h.ticker || '';

        // Determine base currency for holding
        if (fmp.endsWith('.MC') || fmp.endsWith('.DE') || fmp.endsWith('.PA') || fmp.endsWith('.AS') || fmp.endsWith('.MI') || fmp.endsWith('.MA')) {
            h.currency = 'EUR';
        } else if (fmp.endsWith('.L') || Array.from(h.currencies).some(c => c === 'GBX' || c === 'GBp' || c === 'GBP')) {
            h.currency = 'GBX';
        } else if (Array.from(h.currencies).includes('EUR')) {
            h.currency = 'EUR';
        } else if (Array.from(h.currencies).includes('USD')) {
            h.currency = 'USD';
        } else {
            h.currency = quoteCurr || 'USD';
        }

        let rawPrice = quote.price ?? quote.current_price ?? 0;

        if (h.currency === 'GBX') {
            // UK stocks on LSE in pence
            const hTx = transactions.filter(t => t.ticker === h.ticker && (t.event_type === 'BUY' || t.event_type === 'STOCK_AS_DIVIDEND'));
            const usesGbp = hTx.some(t => t.currency === 'GBP' || t.price < 50);
            if (usesGbp) {
                h.cost_basis_per_share = h.shares_held > 0 ? (h.total_cost_native / h.shares_held) * 100 : 0;
            } else {
                h.cost_basis_per_share = h.shares_held > 0 ? (h.total_cost_native / h.shares_held) : 0;
            }

            if (rawPrice > 0 && rawPrice < 50) {
                rawPrice = rawPrice * 100;
            }
            h.current_price = rawPrice;
            const rateGbxToEur = (effectiveRates['GBP'] || 1.17) / 100;
            h.current_value_eur = h.shares_held * rawPrice * rateGbxToEur;
        } else {
            h.cost_basis_per_share = h.shares_held > 0 ? (h.total_cost_native / h.shares_held) : 0;
            h.current_price = rawPrice;
            const rateToEur = effectiveRates[h.currency] || 1;
            h.current_value_eur = h.shares_held * rawPrice * rateToEur;
        }

        totalPortfolioValue += h.current_value_eur;
        h.total_profit_eur = (h.current_value_eur - h.cost_basis_eur) + h.dividends_received_eur;
        h.total_profit_pct = h.cost_basis_eur > 0 ? (h.total_profit_eur / h.cost_basis_eur) * 100 : 0;

        delete h.currencies;
        delete h.total_cost_native;
    });

    activeHoldings.forEach(h => {
        h.portfolio_share_pct = totalPortfolioValue > 0 ? (h.current_value_eur / totalPortfolioValue) * 100 : 0;
    });

    return { holdings: activeHoldings, totals: { total_value: totalPortfolioValue } };
}

function calculateIRR(cashFlows) {
    if (!cashFlows || cashFlows.length === 0) return 0;
    
    // Newton-Raphson approximation
    const maxIterations = 100;
    const tolerance = 1e-7;
    let rate = 0.1; // Initial guess 10%

    // Time normalized to years from first cash flow
    const sorted = [...cashFlows].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstDate = new Date(sorted[0].date).getTime();

    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let derivative = 0;

        sorted.forEach(cf => {
            const t = (new Date(cf.date).getTime() - firstDate) / (1000 * 60 * 60 * 24 * 365.25);
            npv += cf.amount / Math.pow(1 + rate, t);
            if (t > 0) {
                derivative -= (t * cf.amount) / Math.pow(1 + rate, t + 1);
            }
        });

        if (Math.abs(npv) < tolerance) break;
        if (derivative === 0) break;

        rate = rate - npv / derivative;
    }
    
    return rate * 100; // Return as percentage
}

function calculateBenchmarkComparison(transactions, benchmarkPrices, rates) {
    return []; // Placeholder for benchmark logic
}

function calculatePortfolioHistory(transactions, priceHistory, rates) {
    return []; // Placeholder for history logic
}

module.exports = {
    calculateHoldings,
    calculateIRR,
    calculateBenchmarkComparison,
    calculatePortfolioHistory
};
