/**
 * Maps exchange codes from CSV to FMP ticker suffixes
 */

const exchangeToFmpSuffix = {
    'MC': '.MC', // Madrid / IBEX35
    'LSE': '.L', // London
    'F': '.DE', // Frankfurt
    'NYSE': '',
    'NASDAQ': ''
};

const manualOverrides = {
    'PETS.LSE': 'PETS.L',
};

const isinToTickerMap = {
    "US60871R2094": { ticker: "TAP", fmp_ticker: "TAP", exchange: "NYSE" },
    "GB00BJ62K685": { ticker: "PETS", fmp_ticker: "PETS.L", exchange: "LSE" },
    "ES0144580Y14": { ticker: "IBE", fmp_ticker: "IBE.MC", exchange: "MC" },
    "ES0184262212": { ticker: "VIS", fmp_ticker: "VIS.MC", exchange: "MC" },
    "ES0173093024": { ticker: "RED", fmp_ticker: "RED.MC", exchange: "MC" },
    "US83088M1027": { ticker: "SWKS", fmp_ticker: "SWKS", exchange: "NASDAQ" },
    "ES0139140174": { ticker: "COL", fmp_ticker: "COL.MC", exchange: "MC" },
    "ES0105025003": { ticker: "MRL", fmp_ticker: "MRL.MC", exchange: "MC" },
    "US98978V1035": { ticker: "ZTS", fmp_ticker: "ZTS", exchange: "NYSE" },
    "US8552441094": { ticker: "SBUX", fmp_ticker: "SBUX", exchange: "NASDAQ" },
    "US5007541064": { ticker: "KHC", fmp_ticker: "KHC", exchange: "NASDAQ" },
    "US74144T1088": { ticker: "TROW", fmp_ticker: "TROW", exchange: "NASDAQ" },
    "US20030N1019": { ticker: "CMCSA", fmp_ticker: "CMCSA", exchange: "NASDAQ" },
    "GB00BVZK7T90": { ticker: "UL", fmp_ticker: "UL", exchange: "NYSE" },
    "US0152711091": { ticker: "ARE", fmp_ticker: "ARE", exchange: "NYSE" },
    "US6701002056": { ticker: "NVO", fmp_ticker: "NVO", exchange: "NYSE" },
    "US6092071058": { ticker: "MDLZ", fmp_ticker: "MDLZ", exchange: "NASDAQ" },
    "ES0116920333": { ticker: "GCO", fmp_ticker: "GCO.MC", exchange: "MC" },
    "ES0183746314": { ticker: "VID", fmp_ticker: "VID.MC", exchange: "MC" },
    "ES06837469D8": { ticker: "VID", fmp_ticker: "VID.MC", exchange: "MC" },
    "ES0178430E18": { ticker: "TEF", fmp_ticker: "TEF.MC", exchange: "MC" },
    "US7170811035": { ticker: "PFE", fmp_ticker: "PFE", exchange: "NYSE" },
    "US00206R1023": { ticker: "T", fmp_ticker: "T", exchange: "NYSE" },
    "ES0167050915": { ticker: "ACS", fmp_ticker: "ACS.MC", exchange: "MC" },
    "US1101221083": { ticker: "BMY", fmp_ticker: "BMY", exchange: "NYSE" },
    "ES0173516115": { ticker: "REP", fmp_ticker: "REP.MC", exchange: "MC" },
    "US92936U1097": { ticker: "WPC", fmp_ticker: "WPC", exchange: "NYSE" },
    "ES0105546008": { ticker: "LDA", fmp_ticker: "LDA.MC", exchange: "MC" },
    "US4781601046": { ticker: "JNJ", fmp_ticker: "JNJ", exchange: "NYSE" },
    "NL0009434992": { ticker: "LYB", fmp_ticker: "LYB", exchange: "NYSE" },
    "US4581401001": { ticker: "INTC", fmp_ticker: "INTC", exchange: "NASDAQ" },
    "US1266501006": { ticker: "CVS", fmp_ticker: "CVS", exchange: "NYSE" },
    "US83444M1018": { ticker: "SOLV", fmp_ticker: "SOLV", exchange: "NYSE" },
    "GB00BMWC6P49": { ticker: "MNDI", fmp_ticker: "MNDI.L", exchange: "LSE" },
    "GB0002875804": { ticker: "BATS", fmp_ticker: "BATS.L", exchange: "LSE" },
    "US7561091049": { ticker: "O", fmp_ticker: "O", exchange: "NYSE" },
    "FR0000121964": { ticker: "KPR", fmp_ticker: "KPR.DE", exchange: "F" },
    "US8288061091": { ticker: "SQI", fmp_ticker: "SQI.DE", exchange: "F" },
    "US88579Y1010": { ticker: "MMM", fmp_ticker: "MMM", exchange: "NYSE" },
    "ES0130960018": { ticker: "ENG", fmp_ticker: "ENG.MC", exchange: "MC" },
    "ES0113860A34": { ticker: "SAB", fmp_ticker: "SAB.MC", exchange: "MC" },
    "US92343V1044": { ticker: "VZ", fmp_ticker: "VZ", exchange: "NYSE" },
    "ES0148396007": { ticker: "ITX", fmp_ticker: "ITX.MC", exchange: "MC" },
    "ES0124244E34": { ticker: "MAP", fmp_ticker: "MAP.MC", exchange: "MC" },
    "ES0130670112": { ticker: "ELE", fmp_ticker: "ELE.MC", exchange: "MC" },
    "ES0112501012": { ticker: "EBRO", fmp_ticker: "EBRO.MC", exchange: "MC" }
};

function getExchangeSuffix(exchange) {
    if (!exchange) return '';
    const upperExchange = exchange.toUpperCase();
    return exchangeToFmpSuffix[upperExchange] !== undefined ? exchangeToFmpSuffix[upperExchange] : '';
}

function toFmpTicker(ticker, exchange) {
    if (!ticker) return '';
    const upperTicker = ticker.toUpperCase();
    const upperExchange = exchange ? exchange.toUpperCase() : '';
    
    const comboKey = `${upperTicker}.${upperExchange}`;
    if (manualOverrides[comboKey]) {
        return manualOverrides[comboKey];
    }
    
    const suffix = getExchangeSuffix(exchange);
    return `${upperTicker}${suffix}`;
}

function getTickerFromIsin(isin) {
    return isinToTickerMap[isin] || null;
}

module.exports = {
    toFmpTicker,
    getExchangeSuffix,
    getTickerFromIsin,
    isinToTickerMap
};
