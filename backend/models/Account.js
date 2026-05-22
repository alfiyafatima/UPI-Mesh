const mongoose = require('mongoose');

/**
 * Account model — replaces Account.java (JPA entity with @Version optimistic lock)
 * @Version optimistic locking is emulated via the `__v` field Mongoose provides
 * plus findOneAndUpdate with version checks in SettlementService.
 */
const accountSchema = new mongoose.Schema(
  {
    upiId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    balancePaise: {
      // Store in paise (integer) to avoid floating-point errors — same as original
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    // optimisticConcurrency mirrors Spring's @Version
    optimisticConcurrency: true,
  }
);

module.exports = mongoose.model('Account', accountSchema);
