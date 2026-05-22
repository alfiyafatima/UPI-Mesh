/**
 * Bridge routes — replaces BridgeController.java
 *
 * POST /api/bridge/ingest   — bridge node uploads a packet
 */

const express = require('express');
const router = express.Router();
const ingestion = require('../services/BridgeIngestionService');

/**
 * POST /api/bridge/ingest
 * Body: { ciphertext, ttl, hopCount, createdAt }
 */
router.post('/ingest', async (req, res) => {
  try {
    const { ciphertext, ttl, hopCount, createdAt } = req.body;
    if (!ciphertext) {
      return res.status(400).json({ error: 'ciphertext is required' });
    }

    const result = await ingestion.ingest({ ciphertext, ttl, hopCount, createdAt });
    const httpStatus = result.status === 'SETTLED' ? 200 : result.status === 'DUPLICATE' ? 200 : 422;
    return res.status(httpStatus).json(result);
  } catch (err) {
    console.error('[BridgeRoute] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

module.exports = router;
