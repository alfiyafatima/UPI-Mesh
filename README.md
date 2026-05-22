# UPI Without Internet — MERN Stack Conversion

> **Original:** [perryvegehan/UPI_Without_Internet](https://github.com/perryvegehan/UPI_Without_Internet) — Spring Boot 3.3 + Java 17 + H2 + Thymeleaf  
> **This repo:** Converted to **MongoDB + Express.js + React + Node.js (MERN)**

---

## Architecture

```
upi-mesh-mern/
├── backend/                        ← Express.js + Node.js server
│   ├── server.js                   ← Replaces UpiMeshApplication.java
│   ├── models/
│   │   ├── Account.js              ← Replaces Account.java (JPA → Mongoose)
│   │   └── Transaction.js          ← Replaces Transaction.java
│   ├── crypto/
│   │   └── HybridCryptoService.js  ← Replaces HybridCryptoService.java + ServerKeyHolder.java
│   ├── services/
│   │   ├── BridgeIngestionService.js ← Replaces BridgeIngestionService.java (THE pipeline)
│   │   ├── SettlementService.js    ← Replaces SettlementService.java (@Transactional)
│   │   ├── IdempotencyService.js   ← Replaces IdempotencyService.java (ConcurrentHashMap)
│   │   ├── MeshSimulatorService.js ← Replaces MeshSimulatorService.java + VirtualDevice.java
│   │   └── DemoService.java        ← Replaces DemoService.java (account seeding)
│   └── routes/
│       ├── bridge.js               ← Replaces BridgeController.java
│       └── dashboard.js            ← Replaces Thymeleaf dashboard controller
└── frontend/                       ← React dashboard
    └── src/
        ├── App.js                  ← Replaces templates/dashboard.html
        └── components/
            ├── AccountsPanel.js
            ├── SendPaymentForm.js
            ├── MeshPanel.js
            └── TransactionLedger.js
```

---

## Java → Node.js Mapping

| Original (Spring Boot) | MERN Equivalent |
|---|---|
| `UpiMeshApplication.java` | `backend/server.js` |
| `Account.java` (JPA `@Entity`, `@Version`) | `models/Account.js` (Mongoose, `optimisticConcurrency: true`) |
| `Transaction.java` (unique idx on `packetHash`) | `models/Transaction.js` (Mongoose unique index) |
| `H2 in-memory DB` | `MongoDB` (local or Atlas) |
| `Spring Data JPA Repositories` | `Mongoose models` |
| `ServerKeyHolder.java` (RSA-2048 on `@PostConstruct`) | `crypto/HybridCryptoService.js` (`generateServerKeyPair()`) |
| `HybridCryptoService.java` (RSA-OAEP + AES-256-GCM) | `crypto/HybridCryptoService.js` (Node `crypto` module) |
| `IdempotencyService.java` (`ConcurrentHashMap` SETNX) | `services/IdempotencyService.js` (JS `Map`) |
| `SettlementService.java` (`@Transactional`) | `services/SettlementService.js` (MongoDB session transaction) |
| `BridgeIngestionService.java` | `services/BridgeIngestionService.js` |
| `MeshSimulatorService.java` + `VirtualDevice.java` | `services/MeshSimulatorService.js` |
| `DemoService.java` (`@PostConstruct` seed) | `services/DemoService.js` |
| `application.properties` (H2, port, TTLs) | `.env` |
| `templates/dashboard.html` (Thymeleaf) | `frontend/` (React) |

---

## Crypto (identical to original)

```
Encrypt (sender phone):
  1. Random 32-byte AES key + 12-byte IV
  2. AES-256-GCM encrypt payload → ciphertext + auth tag
  3. RSA-OAEP (SHA-256) encrypt AES key with server public key
  4. Wire: base64(encKey)|base64(iv)|base64(tag)|base64(cipher)

Decrypt (backend):
  1. RSA-OAEP decrypt → AES key
  2. AES-256-GCM decrypt → JSON PaymentInstruction

Hash (dedup key): SHA-256 of raw ciphertext bytes → hex
```

---

## Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`) **or** a MongoDB Atlas URI

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Configure backend
```bash
cp backend/.env.example backend/.env
# Edit MONGODB_URI if needed (default: mongodb://localhost:27017/upi_mesh)
```

### 3. Start backend
```bash
npm run dev:backend
# Server starts on http://localhost:8080
```

### 4. Start frontend (dev)
```bash
npm run dev:frontend
# React dev server on http://localhost:3000 (proxies API to :8080)
```

### 5. Production build
```bash
npm run build:frontend
# Then: npm run start:backend (serves React build from /frontend/build)
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/bridge/ingest` | Bridge node uploads a mesh packet |
| `GET` | `/api/dashboard/state` | Full state: accounts, mesh, ledger |
| `POST` | `/api/dashboard/send` | Create encrypted payment packet |
| `POST` | `/api/dashboard/gossip` | Run one gossip round |
| `POST` | `/api/dashboard/upload` | Bridge uploads all packets |
| `POST` | `/api/dashboard/reset` | Full demo reset |
| `GET` | `/api/dashboard/public-key` | Server RSA public key (PEM) |
| `GET` | `/api/health` | Health check |

---

## Demo Flow (same as original README)

1. Open `http://localhost:3000`
2. **Create Payment Packet** — encrypts ₹500 from alice→bob, hands it to `phone-alice`
3. **Run Gossip Round** — each device broadcasts to all others (TTL decrements)
4. **Bridge Upload to Backend** — `phone-bridge` (has internet) uploads all packets → backend decrypts → settles
5. Watch balances update in real-time

---

## Known Limitations (same as original)

- **Receiver can't verify sender has funds offline** — settlement may REJECT after offline packet is accepted by receiver
- **Double-spend possible offline** — first packet to reach backend wins; others REJECTED
- This is why real offline UPI (UPI Lite) uses hardware-backed pre-funded wallets

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Express server port |
| `MONGODB_URI` | `mongodb://localhost:27017/upi_mesh` | MongoDB connection string |
| `PACKET_FRESHNESS_WINDOW_MS` | `300000` (5 min) | Max age of a packet |
