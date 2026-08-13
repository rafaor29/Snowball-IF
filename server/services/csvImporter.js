const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { toFmpTicker, isinToTickerMap } = require('./tickerMapping');

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.trim().split(' ');
    const d = parts[0];
    if (d.includes('-')) {
        const p = d.split('-');
        if (p[0].length === 4) return d; // YYYY-MM-DD
        if (p[2].length === 4) return `${p[2]}-${p[1]}-${p[0]}`; // DD-MM-YYYY
    }
    return d;
}

function importCsv(filePath, db) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });

    if (records.length === 0) return 0;

    const firstRow = records[0];
    const isDegiroSpanish = ('Fecha' in firstRow) && ('ISIN' in firstRow || 'Producto' in firstRow);

    const parsedTransactions = [];
    const stmt = db.prepare(`
        INSERT INTO transactions 
        (event_type, date, ticker, fmp_ticker, price, quantity, currency, fee_tax, exchange, fee_currency, notes, sector)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const checkStmt = db.prepare(`
        SELECT id FROM transactions 
        WHERE event_type = ? AND date = ? AND ticker = ? AND price = ? AND quantity = ? AND fee_tax = ?
    `);

    let importedCount = 0;

    const transaction = db.transaction((rows) => {
        for (const row of rows) {
            if (isDegiroSpanish) {
                if (!row['Fecha']) continue;
                const date = parseDate(row['Fecha']);
                const rawQty = parseFloat((row['Número'] || '0').replace(',', '.'));
                let price = parseFloat((row['Precio'] || '0').replace(',', '.'));
                let currency = row[''] || 'EUR';
                
                if (currency === 'GBX') {
                    price = price / 100;
                    currency = 'GBP';
                }

                const isin = row['ISIN'];
                const product = row['Producto'] || '';
                const isinInfo = isinToTickerMap[isin];

                // Stock dividend entries (0 price tradeable stocks)
                if (price === 0 && (product === 'TELEFONICA SA' || product === 'ACS ACTIVIDADES DE CONSTRUCCION Y SERVICIOS SA')) {
                    if (isinInfo && rawQty > 0) {
                        const existing = checkStmt.get('STOCK_AS_DIVIDEND', date, isinInfo.ticker, 0, rawQty, 0);
                        if (!existing) {
                            stmt.run('STOCK_AS_DIVIDEND', date, isinInfo.ticker, isinInfo.fmp_ticker, 0, rawQty, 'EUR', 0, isinInfo.exchange, 'EUR', 'Scrip dividend', null);
                            parsedTransactions.push(row);
                            importedCount++;
                        }
                    }
                    continue;
                }

                // Skip non-tradeable rights, 0 price transfers, etc.
                if (price === 0 || product.includes('RIGHTS') || product.includes('RIGHT') || product.includes('NON TRADEABLE') || product.includes('RTS') || product.includes('DERECHOS')) {
                    continue;
                }

                if (!isinInfo) continue;

                const eventType = rawQty < 0 ? 'SELL' : 'BUY';
                const quantity = Math.abs(rawQty);

                const autofx = Math.abs(parseFloat((row['Comisión AutoFX'] || '0').replace(',', '.')));
                const transFee = Math.abs(parseFloat((row['Costes de transacción y/o externos EUR'] || '0').replace(',', '.')));
                const feeTax = Math.round((autofx + transFee) * 100) / 100;

                const existing = checkStmt.get(eventType, date, isinInfo.ticker, price, quantity, feeTax);
                if (!existing) {
                    stmt.run(eventType, date, isinInfo.ticker, isinInfo.fmp_ticker, price, quantity, currency, feeTax, isinInfo.exchange, 'EUR', product, null);
                    parsedTransactions.push(row);
                    importedCount++;
                }

            } else {
                // Generic / standard format
                const eventType = row['Event'];
                if (!['BUY', 'SELL', 'DIVIDEND', 'STOCK_AS_DIVIDEND'].includes(eventType)) continue;

                const date = parseDate(row['Date']);
                const ticker = row['Symbol'];
                const exchange = row['Exchange'];
                const fmpTicker = toFmpTicker(ticker, exchange);
                const price = parseFloat(row['Price']) || 0;
                const quantity = parseFloat(row['Quantity']) || 0;
                const currency = row['Currency'];
                const feeTax = parseFloat(row['FeeTax']) || 0;
                const feeCurrency = row['FeeCurrency'];
                const notes = row['Note'];
                const sector = row['Sector'] || row['sector'] || null;

                const existing = checkStmt.get(eventType, date, ticker, price, quantity, feeTax);
                if (!existing) {
                    stmt.run(eventType, date, ticker, fmpTicker, price, quantity, currency, feeTax, exchange, feeCurrency, notes, sector);
                    parsedTransactions.push(row);
                    importedCount++;
                }
            }
        }
    });

    transaction(records);
    return importedCount;
}

module.exports = {
    importCsv
};

