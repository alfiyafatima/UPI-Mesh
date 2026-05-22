// All API calls to the Express backend

const BASE = '/api';

export async function fetchState() {
  const r = await fetch(`${BASE}/dashboard/state`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function sendPayment(senderUpiId, receiverUpiId, amountRupees) {
  const r = await fetch(`${BASE}/dashboard/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderUpiId, receiverUpiId, amountRupees }),
  });
  return r.json();
}

export async function runGossip() {
  const r = await fetch(`${BASE}/dashboard/gossip`, { method: 'POST' });
  return r.json();
}

export async function runBridgeUpload() {
  const r = await fetch(`${BASE}/dashboard/upload`, { method: 'POST' });
  return r.json();
}

export async function resetDemo() {
  const r = await fetch(`${BASE}/dashboard/reset`, { method: 'POST' });
  return r.json();
}
