/**
 * SettlementService — replaces SettlementService.java
 *
 * Original: @Transactional debit sender + credit receiver + insert ledger row.
 * MongoDB 4+ supports multi-document transactions via sessions.
 *
 * settle(instruction, packetHash) → { status, transaction }
 *   instruction: { senderUpiId, receiverUpiId, amountPaise, nonce, signedAt }
 */

const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

async function settle(instruction, packetHash) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Load sender with session (for isolation)
    const sender = await Account.findOne({ upiId: instruction.senderUpiId }).session(session);
    if (!sender) {
      await session.abortTransaction();
      session.endSession();
      return _reject(packetHash, instruction, 'SENDER_NOT_FOUND', `Sender ${instruction.senderUpiId} not found`);
    }

    // 2. Load receiver
    const receiver = await Account.findOne({ upiId: instruction.receiverUpiId }).session(session);
    if (!receiver) {
      await session.abortTransaction();
      session.endSession();
      return _reject(packetHash, instruction, 'RECEIVER_NOT_FOUND', `Receiver ${instruction.receiverUpiId} not found`);
    }

    // 3. Check funds
    if (sender.balancePaise < instruction.amountPaise) {
      await session.abortTransaction();
      session.endSession();
      return _reject(packetHash, instruction, 'INSUFFICIENT_FUNDS',
        `Sender has ₹${(sender.balancePaise / 100).toFixed(2)} but tried to send ₹${(instruction.amountPaise / 100).toFixed(2)}`);
    }

    // 4. Debit sender (optimistic: fails if another process modified the doc concurrently)
    sender.balancePaise -= instruction.amountPaise;
    await sender.save({ session });

    // 5. Credit receiver
    receiver.balancePaise += instruction.amountPaise;
    await receiver.save({ session });

    // 6. Insert ledger row — unique index on packetHash catches any duplicate that slipped past IdempotencyService
    const tx = await Transaction.create(
      [
        {
          packetHash,
          senderUpiId: instruction.senderUpiId,
          receiverUpiId: instruction.receiverUpiId,
          amountPaise: instruction.amountPaise,
          nonce: instruction.nonce,
          signedAt: new Date(instruction.signedAt),
          status: 'SETTLED',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    console.log(
      `[Settlement] SETTLED ${instruction.senderUpiId} → ${instruction.receiverUpiId} ₹${(instruction.amountPaise / 100).toFixed(2)} [hash=${packetHash.slice(0, 8)}...]`
    );
    return { status: 'SETTLED', transaction: tx[0] };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    // Duplicate key error = the unique index caught a duplicate — treat as DUPLICATE not error
    if (err.code === 11000) {
      console.warn(`[Settlement] DUPLICATE (DB) hash=${packetHash.slice(0, 8)}...`);
      return { status: 'DUPLICATE', transaction: null, reason: 'Duplicate packet (DB unique index)' };
    }
    throw err;
  }
}

function _reject(packetHash, instruction, code, reason) {
  console.warn(`[Settlement] REJECTED [${code}] ${reason}`);
  return { status: 'REJECTED', transaction: null, reason };
}

module.exports = { settle };
