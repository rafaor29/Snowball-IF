require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db/database'); // Initializes DB

const transactionsRouter = require('./routes/transactions');
const portfolioRouter = require('./routes/portfolio');
const marketRouter = require('./routes/market');
const settingsRouter = require('./routes/settings');
const dividendsRouter = require('./routes/dividends');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/market', marketRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/dividends', dividendsRouter);

// Serve static frontend files if built (dist directory exists)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something went wrong!' });
});

app.listen(port, () => {
    console.log(`Snowball-IF server listening on http://localhost:${port}`);
});
