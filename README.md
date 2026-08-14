# ❄️ Snowball-IF

**Snowball-IF** is a full-stack personal investment portfolio manager and dividend tracking application built with **React**, **Node.js/Express**, and **SQLite**. It allows investors to monitor active holdings, track dividend payouts, detect unrecorded dividends, analyze sector exposure, screen for buying opportunities ("Find The Dip"), and evaluate portfolio performance across multiple currencies.

---

## 📚 Architecture & AI Agent Reference

> [!IMPORTANT]
> If you are a developer or an **AI coding agent** (e.g. Gemini, Claude, GPT) editing code in this repository, please consult **[ARCHITECTURE.md](file:///Users/rafaolid/Desktop/Snowball-HQ/ARCHITECTURE.md)** first.
> 
> **[ARCHITECTURE.md](file:///Users/rafaolid/Desktop/Snowball-HQ/ARCHITECTURE.md)** contains the comprehensive technical specification, database schemas, service logic, currency handling rules, and engineering constraints required for making changes.

---

## ✨ Features

- 📊 **Dashboard Overview**: Instant breakdown of total portfolio valuation, total return (realized + unrealized P/L + dividends), dividend yield, and asset performance.
- 📈 **Holdings Management**: Comprehensive view of shares owned, average cost basis, total cost, current market price, and native vs. converted values.
- 🍕 **Sector Distribution**: Interactive visual breakdowns of asset allocation across market sectors and customizable categories.
- 💰 **Dividend Calendar & Matrix**:
  - Track historical dividend income by year, month, and ticker.
  - Interactive matrix view showing monthly cash flows.
  - 🔍 **Missing Dividend Detector**: Automated checks comparing held shares on ex-dividend dates against recorded dividend transactions to spot missing payouts.
- 📉 **Find The Dip**: Screening tool identifying portfolio assets trading near 52-week lows or below key Simple Moving Averages (10-day, 50-day, 100-day, 200-day SMA).
- ⚡ **Performance Analytics**: Historical portfolio valuation charts and cash flow return calculations.
- 🔄 **CSV Data Import & Export**: Bulk import transaction histories from external brokers or export portfolio records as CSV.
- 💱 **Multi-Currency Support**: Automatic FX conversion to home currency (e.g., EUR, USD, GBP) with automatic handling for London Stock Exchange GBX (pence) transactions.

---

## 🛠️ Tech Stack

| Layer | Technology / Library |
|---|---|
| **Frontend** | React 19, Vite, React Router v7, Recharts, Lucide React, Vanilla CSS |
| **Backend** | Node.js, Express 5, Better-SQLite3, Dotenv, Cors, Multer |
| **Data & APIs** | Yahoo Finance 2 (`yahoo-finance2`), Financial Modeling Prep (FMP API) |
| **Tooling** | Concurrently, Nodemon |

---

## 📁 Project Structure

```
Snowball-HQ/
├── README.md               # Project overview and quick start guide
├── ARCHITECTURE.md         # Technical architecture and AI agent reference guide
├── package.json            # Dependencies and npm scripts
├── vite.config.js          # Vite frontend configuration
├── .env.example            # Environment template file
├── data/                   # Data storage directory
├── dist/                   # Production frontend build target
├── server/                 # Express backend application
│   ├── index.js            # Express server entry point
│   ├── db/                 # SQLite database initialization & SQL schema
│   ├── routes/             # REST API routers (portfolio, dividends, transactions, market, settings)
│   └── services/           # Business logic (calculations, currency conversion, market data, dividend detection)
└── src/                    # React frontend application
    ├── App.jsx             # Root React component & router navigation
    ├── main.jsx            # Application mount point
    ├── index.css           # Modern dark design system & CSS tokens
    ├── components/         # Reusable UI components & modal dialogs
    ├── pages/              # Main view pages (Dashboard, Holdings, Sectors, Dividends, FindTheDip, Performance)
    ├── hooks/              # Custom React hooks
    └── utils/              # Frontend formatting helpers
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/rafaor29/Snowball-IF.git
cd Snowball-IF

# Install dependencies
npm install
```

### 3. Environment Setup

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Configure your environment variables in `.env`:

```env
# Financial Modeling Prep API key (Optional - free tier provides 250 requests/day)
# Sign up at https://site.financialmodelingprep.com/
FMP_API_KEY=your_api_key_here

# Server port (default: 3001)
PORT=3001

# Home currency for portfolio valuation (e.g. EUR, USD, GBP)
HOME_CURRENCY=EUR
```

### 4. Running the Development Server

Start both the backend Express server and frontend Vite development server concurrently:

```bash
npm run dev
```

- Frontend UI: `http://localhost:5173` (or next available port)
- Express API: `http://localhost:3001`

---

## 📜 NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs Express server and Vite frontend concurrently |
| `npm run dev:client` | Starts Vite frontend dev server |
| `npm run dev:server` | Starts Express backend server with nodemon |
| `npm run build` | Builds static frontend assets into `dist/` |
| `npm run preview` | Serves production build locally for verification |

---

## 📖 Further Documentation

For detailed technical explanations, API specifications, and architectural constraints, refer to:
- 📄 **[ARCHITECTURE.md](file:///Users/rafaolid/Desktop/Snowball-HQ/ARCHITECTURE.md)**

---

## 📄 License

This project is licensed under the MIT License.
