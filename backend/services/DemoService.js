/**
 * DemoService — replaces DemoService.java
 *
 * Seeds demo accounts on startup and provides helpers for the demo flow.
 * Original used @PostConstruct; here we export a seedAccounts() called from server.js.
 */

const Account = require('../models/Account');

const DEMO_ACCOUNTS = [
  { upiId: 'alice@upi', ownerName: 'Alice', balancePaise: 100_000 }, // ₹1000
  { upiId: 'bob@upi',   ownerName: 'Bob',   balancePaise:  50_000 }, // ₹500
  { upiId: 'carol@upi', ownerName: 'Carol', balancePaise:  75_000 }, // ₹750
];

async function seedAccounts() {
  for (const demo of DEMO_ACCOUNTS) {
    const existing = await Account.findOne({ upiId: demo.upiId });
    if (!existing) {
      await Account.create(demo);
      console.log(`[DemoService] Seeded account: ${demo.upiId} (₹${(demo.balancePaise / 100).toFixed(2)})`);
    }
  }
  console.log('[DemoService] Account seeding complete.');
}

async function getAllAccounts() {
  return Account.find({}).lean();
}

async function resetAccounts() {
  for (const demo of DEMO_ACCOUNTS) {
    await Account.findOneAndUpdate(
      { upiId: demo.upiId },
      { balancePaise: demo.balancePaise },
      { upsert: true, new: true }
    );
  }
  console.log('[DemoService] Accounts reset to initial balances.');
}

module.exports = { seedAccounts, getAllAccounts, resetAccounts, DEMO_ACCOUNTS };
