/**
 * server.js — replaces UpiMeshApplication.java (Spring Boot main class)
 *
 * Startup sequence:
 *   1. Connect to MongoDB
 *   2. Generate RSA key pair (HybridCryptoService)
 *   3. Seed demo accounts (DemoService)
 *   4. Seed idempotency map from existing transactions
 *   5. Start Express on PORT (default 8080)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const { generateServerKeyPair } = require('./crypto/HybridCryptoService');
const { seedAccounts } = require('./services/DemoService');
const { seedFromDb } = require('./services/IdempotencyService');

const bridgeRoutes = require('./routes/bridge');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/upi_mesh';

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/bridge', bridgeRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'UP', ts: new Date() }));

// ── Serve React frontend in production ────────────────────────────────────
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  }
});

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    console.log('[Boot] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(`[Boot] MongoDB connected: ${MONGODB_URI}`);

    console.log('[Boot] Generating RSA-2048 server key pair...');
    generateServerKeyPair(); // eager init

    console.log('[Boot] Seeding demo accounts...');
    await seedAccounts();

    console.log('[Boot] Seeding idempotency map from existing transactions...');
    await seedFromDb();

    app.listen(PORT, () => {
      console.log(`\n╔══════════════════════════════════════════════╗`);
      console.log(`║  UPI Mesh Backend (MERN)  →  http://localhost:${PORT}  ║`);
      console.log(`╠══════════════════════════════════════════════╣`);
      console.log(`║  API:        /api/dashboard/state            ║`);
      console.log(`║  Bridge:     POST /api/bridge/ingest         ║`);
      console.log(`║  Health:     /api/health                     ║`);
      console.log(`╚══════════════════════════════════════════════╝\n`);
    });
  } catch (err) {
    console.error('[Boot] FATAL:', err);
    process.exit(1);
  }
}

bootstrap();
