/**
 * IdempotencyService — replaces IdempotencyService.java
 *
 * Original used a ConcurrentHashMap as a "JVM-local Redis SETNX".
 * Here we use a plain JS Map (single-process Node.js is naturally single-threaded).
 *
 * claimHash(hash) → true if this is the FIRST claim (safe to proceed)
 *                 → false if already claimed (duplicate, skip)
 *
 * The Map is also backed by the Transaction collection in MongoDB so that
 * duplicates are caught even across restarts (the unique index on packetHash
 * in the Transaction model provides the persistent guarantee).
 */

const claimed = new Map(); // hash → timestamp

function claimHash(hash) {
  if (claimed.has(hash)) return false;
  claimed.set(hash, Date.now());
  return true;
}

function isKnown(hash) {
  return claimed.has(hash);
}

/** Reload known hashes from DB on startup so in-memory map survives restarts */
async function seedFromDb() {
  const Transaction = require('../models/Transaction');
  const hashes = await Transaction.find({}, 'packetHash settledAt').lean();
  for (const tx of hashes) {
    claimed.set(tx.packetHash, tx.settledAt ? tx.settledAt.getTime() : Date.now());
  }
  console.log(`[IdempotencyService] Seeded ${hashes.length} known hashes from DB.`);
}

module.exports = { claimHash, isKnown, seedFromDb };
