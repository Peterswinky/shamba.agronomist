const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const soilRoutes = require('./routes/soil.routes');
const diseaseRoutes = require('./routes/disease.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const historyRoutes = require('./routes/history.routes');
const paymentsRoutes = require('./routes/payments.routes');
const ussdRoutes = require('./routes/ussd.routes');

const app = express();

// --- Security & core middleware ---
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Serve uploaded disease-check photos statically (swap for S3/CDN in production)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Health check for load balancers / uptime monitors ---
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- Feature routes ---
app.use('/api/auth', authRoutes);
app.use('/api/soil', soilRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/ussd', ussdRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Shamba API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

module.exports = app;
