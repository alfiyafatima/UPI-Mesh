const mongoose = require('mongoose');

/**
 * Transaction model — replaces Transaction.java
 * Settled-tx ledger with unique index on packetHash (deduplication).
 * Mirrors: @Column(unique=true) on packetHash in the original.
 */
const transactionSchema = new mongoose.Schema(
  {
    packetHash: {
      // SHA-256 hex of ciphertext — the deduplication key
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    senderUpiId: {
      type: String,
      required: true,
    },
    receiverUpiId: {
      type: String,
      required: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    nonce: {
      // UUID from PaymentInstruction, used for freshness check
      type: String,
      required: true,
    },
    signedAt: {
      // Original timestamp from sender's phone
      type: Date,
      required: true,
    },
    settledAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['SETTLED', 'REJECTED', 'DUPLICATE'],
      default: 'SETTLED',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
