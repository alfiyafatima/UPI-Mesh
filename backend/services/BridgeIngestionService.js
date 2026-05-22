/**
 * BridgeIngestionService — replaces BridgeIngestionService.java
 *
 * THE pipeline: hash → claim → decrypt → freshness → settle
 *
 * ingest(meshPacket) → { status, transaction?, reason? }
 *
 * meshPacket shape (mirrors MeshPacket.java wire format):
 *   {
 *     ciphertext: string,   // wireFormat from HybridCryptoService.encrypt()
 *     ttl: number,          // decremented each hop; if 0 discard
 *     hopCount: number,     // informational
 *     createdAt: ISO string // when sender originally created the packet
 *   }
 */

const crypto = require('../crypto/HybridCryptoService');
const idempotency = require('./IdempotencyService');
const settlement = require('./SettlementService');

const FRESHNESS_WINDOW_MS = parseInt(process.env.PACKET_FRESHNESS_WINDOW_MS || '300000', 10); // 5 min default

async function ingest(meshPacket) {
  const { ciphertext, ttl } = meshPacket;

  // ── Step 1: TTL guard ──────────────────────────────────────────────────────
  if (typeof ttl === 'number' && ttl <= 0) {
    return { status: 'DISCARDED', reason: 'TTL expired' };
  }

  // ── Step 2: Hash ciphertext (SHA-256) ─────────────────────────────────────
  let packetHash;
  try {
    packetHash = crypto.hashCiphertext(ciphertext);
  } catch (e) {
    return { status: 'REJECTED', reason: `Malformed ciphertext: ${e.message}` };
  }

  // ── Step 3: Idempotency claim (SETNX equivalent) ──────────────────────────
  const claimed = idempotency.claimHash(packetHash);
  if (!claimed) {
    return { status: 'DUPLICATE', reason: `Hash ${packetHash.slice(0, 8)}... already processed` };
  }

  // ── Step 4: Decrypt ───────────────────────────────────────────────────────
  let instruction;
  try {
    const plaintext = crypto.decrypt(ciphertext);
    instruction = JSON.parse(plaintext);
  } catch (e) {
    idempotency.claimHash(packetHash); // already claimed; just log
    return { status: 'REJECTED', reason: `Decryption failed: ${e.message}` };
  }

  // ── Step 5: Validate instruction fields ───────────────────────────────────
  const required = ['senderUpiId', 'receiverUpiId', 'amountPaise', 'nonce', 'signedAt'];
  for (const field of required) {
    if (!instruction[field]) {
      return { status: 'REJECTED', reason: `Missing field: ${field}` };
    }
  }
  if (instruction.amountPaise <= 0) {
    return { status: 'REJECTED', reason: 'Amount must be positive' };
  }

  // ── Step 6: Freshness check ───────────────────────────────────────────────
  const signedAt = new Date(instruction.signedAt).getTime();
  const age = Date.now() - signedAt;
  if (age > FRESHNESS_WINDOW_MS) {
    return {
      status: 'REJECTED',
      reason: `Packet too old: ${Math.round(age / 1000)}s > ${FRESHNESS_WINDOW_MS / 1000}s window`,
    };
  }
  if (age < -60_000) {
    // clock skew guard: more than 1 min in the future
    return { status: 'REJECTED', reason: 'Packet timestamp is in the future (clock skew?)' };
  }

  // ── Step 7: Settle ────────────────────────────────────────────────────────
  return settlement.settle(instruction, packetHash);
}

module.exports = { ingest };
