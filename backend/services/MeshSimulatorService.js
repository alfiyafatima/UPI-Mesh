/**
 * MeshSimulatorService — replaces MeshSimulatorService.java + VirtualDevice.java
 *
 * Gossip protocol across virtual devices simulating Bluetooth mesh.
 *
 * Devices:
 *   phone-alice  (offline sender — has packets)
 *   phone-bob    (offline relay)
 *   phone-carol  (offline relay)
 *   phone-bridge (hasInternet=true — bridge node that uploads to backend)
 *
 * Each gossip round: every device broadcasts all its packets to all others.
 * TTL decrements per hop. Packets with TTL=0 are dropped.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('../crypto/HybridCryptoService');
const ingestion = require('./BridgeIngestionService');

const DEFAULT_TTL = 5;

// ── VirtualDevice ──────────────────────────────────────────────────────────
class VirtualDevice {
  constructor(id, hasInternet = false) {
    this.id = id;
    this.hasInternet = hasInternet;
    this.packets = new Map(); // hash → meshPacket
  }

  addPacket(meshPacket) {
    this.packets.set(meshPacket.hash, { ...meshPacket });
  }

  receivePacket(meshPacket) {
    if (meshPacket.ttl <= 0) return; // drop expired
    if (!this.packets.has(meshPacket.hash)) {
      this.packets.set(meshPacket.hash, { ...meshPacket, ttl: meshPacket.ttl - 1 });
    }
  }

  toJSON() {
    return {
      id: this.id,
      hasInternet: this.hasInternet,
      packetCount: this.packets.size,
      packets: Array.from(this.packets.values()).map((p) => ({
        hash: p.hash.slice(0, 12) + '...',
        ttl: p.ttl,
        createdAt: p.createdAt,
      })),
    };
  }
}

// ── MeshSimulatorService ───────────────────────────────────────────────────
const devices = {
  'phone-alice': new VirtualDevice('phone-alice', false),
  'phone-bob': new VirtualDevice('phone-bob', false),
  'phone-carol': new VirtualDevice('phone-carol', false),
  'phone-bridge': new VirtualDevice('phone-bridge', true),
};

let gossipResults = []; // rolling log of gossip/bridge events

function logEvent(msg) {
  const entry = { time: new Date().toISOString(), msg };
  gossipResults.unshift(entry);
  if (gossipResults.length > 50) gossipResults.pop();
  console.log(`[Mesh] ${msg}`);
}

/**
 * createPacket(senderUpiId, receiverUpiId, amountPaise)
 * Mirrors DemoService.simulateSender() in the original.
 * Creates an encrypted MeshPacket and hands it to phone-alice.
 */
async function createPacket(senderUpiId, receiverUpiId, amountPaise) {
  const instruction = {
    senderUpiId,
    receiverUpiId,
    amountPaise,
    nonce: uuidv4(),
    signedAt: new Date().toISOString(),
  };

  const ciphertext = crypto.encrypt(JSON.stringify(instruction));
  const hash = crypto.hashCiphertext(ciphertext);

  const meshPacket = {
    hash,
    ciphertext,
    ttl: DEFAULT_TTL,
    hopCount: 0,
    createdAt: instruction.signedAt,
  };

  devices['phone-alice'].addPacket(meshPacket);
  logEvent(`phone-alice created packet [${hash.slice(0, 8)}...] ₹${(amountPaise / 100).toFixed(2)} → ${receiverUpiId}`);
  return meshPacket;
}

/**
 * runGossipRound()
 * One gossip round: every device broadcasts to every other device.
 * TTL decrements on receive.
 */
function runGossipRound() {
  const deviceList = Object.values(devices);
  let shared = 0;

  for (const sender of deviceList) {
    for (const packet of sender.packets.values()) {
      for (const receiver of deviceList) {
        if (receiver.id === sender.id) continue;
        const before = receiver.packets.size;
        receiver.receivePacket({ ...packet });
        if (receiver.packets.size > before) shared++;
      }
    }
  }

  logEvent(`Gossip round complete — ${shared} new packet deliveries`);
  return { shared };
}

/**
 * runBridgeUpload()
 * phone-bridge uploads all its packets to the backend ingestion pipeline.
 */
async function runBridgeUpload() {
  const bridge = devices['phone-bridge'];
  if (bridge.packets.size === 0) {
    logEvent('Bridge has no packets to upload');
    return [];
  }

  const results = [];
  for (const [hash, packet] of bridge.packets.entries()) {
    const result = await ingestion.ingest(packet);
    results.push({ hash: hash.slice(0, 12) + '...', ...result });
    logEvent(`Bridge uploaded [${hash.slice(0, 8)}...] → ${result.status}${result.reason ? ': ' + result.reason : ''}`);
  }
  bridge.packets.clear();
  return results;
}

function getState() {
  return {
    devices: Object.values(devices).map((d) => d.toJSON()),
    eventLog: gossipResults,
  };
}

function resetMesh() {
  for (const d of Object.values(devices)) d.packets.clear();
  gossipResults = [];
  logEvent('Mesh reset');
}

module.exports = { createPacket, runGossipRound, runBridgeUpload, getState, resetMesh, devices };
