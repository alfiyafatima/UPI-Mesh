/**
 * Dashboard routes — replaces the Thymeleaf dashboard controller endpoints
 *
 * GET  /api/dashboard/state      — full state: accounts, mesh, ledger
 * POST /api/dashboard/send       — create a payment packet (like "Send Payment" button)
 * POST /api/dashboard/gossip     — run one gossip round
 * POST /api/dashboard/upload     — bridge uploads all packets
 * POST /api/dashboard/reset      — full demo reset
 * GET  /api/dashboard/public-key — server RSA public key (PEM)
 */

const express = require('express');
const router = express.Router();

const demoService = require('../services/DemoService');
const mesh = require('../services/MeshSimulatorService');
const Transaction = require('../models/Transaction');
const crypto = require('../crypto/HybridCryptoService');

// ── GET /api/dashboard/state ──────────────────────────────────────────────
router.get('/state', async (req, res) => {
  try {
    const [accounts, transactions, meshState] = await Promise.all([
      demoService.getAllAccounts(),
      Transaction.find().sort({ settledAt: -1 }).limit(20).lean(),
      Promise.resolve(mesh.getState()),
    ]);

    return res.json({ accounts, transactions, mesh: meshState });
  } catch (err) {
    console.error('[Dashboard] state error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/dashboard/send ──────────────────────────────────────────────
router.post('/send', async (req, res) => {
  try {
    const { senderUpiId, receiverUpiId, amountRupees } = req.body;
    if (!senderUpiId || !receiverUpiId || !amountRupees) {
      return res.status(400).json({ error: 'senderUpiId, receiverUpiId, amountRupees required' });
    }
    const amountPaise = Math.round(parseFloat(amountRupees) * 100);
    if (amountPaise <= 0) return res.status(400).json({ error: 'amountRupees must be positive' });

    const packet = await mesh.createPacket(senderUpiId, receiverUpiId, amountPaise);
    return res.json({
      success: true,
      hash: packet.hash,
      message: `Packet created and handed to phone-alice`,
    });
  } catch (err) {
    console.error('[Dashboard] send error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/dashboard/gossip ────────────────────────────────────────────
router.post('/gossip', (req, res) => {
  try {
    const result = mesh.runGossipRound();
    return res.json({ success: true, ...result, state: mesh.getState() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/dashboard/upload ────────────────────────────────────────────
router.post('/upload', async (req, res) => {
  try {
    const results = await mesh.runBridgeUpload();
    return res.json({ success: true, results, state: mesh.getState() });
  } catch (err) {
    console.error('[Dashboard] upload error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/dashboard/reset ─────────────────────────────────────────────
router.post('/reset', async (req, res) => {
  try {
    await Promise.all([
      demoService.resetAccounts(),
      Transaction.deleteMany({}),
    ]);
    mesh.resetMesh();
    // Clear idempotency map
    const idempotency = require('../services/IdempotencyService');
    await idempotency.seedFromDb(); // re-seed (will be empty after deleteMany)
    return res.json({ success: true, message: 'Demo reset complete' });
  } catch (err) {
    console.error('[Dashboard] reset error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/dashboard/public-key ─────────────────────────────────────────
router.get('/public-key', (req, res) => {
  return res.json({ publicKeyPem: crypto.getPublicKeyPem() });
});

module.exports = router;
