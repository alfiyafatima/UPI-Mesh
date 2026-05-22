<div align="center">

# 🔐 UPI Mesh — Offline Payment Network

### Encrypted payments over a Bluetooth-style mesh, settled when connectivity returns

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://upi-mesh-22hx.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-alfiyafatima-181717?style=for-the-badge&logo=github)](https://github.com/alfiyafatima/UPI-Mesh)

![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=flat-square&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)

**[🚀 View Live Demo](https://upi-mesh-22hx.onrender.com)**

> ⚠️ Hosted on Render free tier — may take 30–50 seconds to wake up on first visit.

</div>

---

## What This Does

You're in a area with zero internet connectivity. You need to send ₹500 to a friend.

Your phone **encrypts the payment** and broadcasts it to nearby phones. The packet **hops device-to-device** through a Bluetooth-style mesh until one phone gets connectivity and silently uploads it to the backend. The backend **decrypts, deduplicates, and settles** the transaction — atomically.

---

## Demo

🔗 **[https://upi-mesh-22hx.onrender.com](https://upi-mesh-22hx.onrender.com)**

Try the full flow in 4 steps:

| Step | Action | What Happens |
|---|---|---|
| 1 | **Create Payment** — select sender, receiver, amount | Payment encrypted and handed to `phone-alice` |
| 2 | **Run Gossip Round** (2–3 times) | Packet spreads across all virtual devices |
| 3 | **Bridge Upload** | `phone-bridge` (internet-connected) uploads to backend |
| 4 | **Check Ledger** | Transaction appears as `SETTLED` with updated balances |

---

## How It Works

### Encryption
Each payment is encrypted before it leaves the sender's device using **hybrid encryption**:
1. A random 32-byte AES key is generated
2. The payment payload is encrypted with **AES-256-GCM**
3. The AES key is wrapped with the server's **RSA-OAEP (2048-bit)** public key
4. The encrypted packet travels through the mesh — no relay can read it

### Mesh Gossip
Virtual devices simulate Bluetooth mesh behaviour:
- Every device broadcasts all its packets to every other device
- Each hop decrements the **TTL** — packets with TTL=0 are dropped
- The bridge node (internet-connected) uploads to the backend when it has connectivity

### Settlement Pipeline
When the backend receives a packet:
1. **Hash** the ciphertext (SHA-256) — deduplication key
2. **Claim** the hash in the idempotency map — first claim wins
3. **Decrypt** using the server's RSA private key → AES key → plaintext
4. **Freshness check** — reject packets older than 5 minutes
5. **Settle** — atomic MongoDB transaction: debit sender + credit receiver + write ledger

### Exactly-Once Guarantee
The same packet can arrive via multiple bridge nodes simultaneously. It settles exactly once via a two-layer guard:
- In-memory `Map` (fast path)
- Unique index on `packetHash` in MongoDB (persistent, race-condition-safe)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 22 + Express.js |
| Database | MongoDB Atlas + Mongoose |
| Frontend | React 18 |
| Crypto | Node.js built-in `crypto` module |
| Deployment | Render (backend + frontend) + MongoDB Atlas |

---

## Project Structure

```
upi-mesh-mern/
├── backend/
│   ├── server.js                     # Express app entry point
│   ├── models/
│   │   ├── Account.js                # User accounts with balances
│   │   └── Transaction.js            # Settlement ledger
│   ├── crypto/
│   │   └── HybridCryptoService.js    # RSA-OAEP + AES-256-GCM
│   ├── services/
│   │   ├── BridgeIngestionService.js # 7-step ingestion pipeline
│   │   ├── SettlementService.js      # Atomic MongoDB transaction
│   │   ├── IdempotencyService.js     # Exactly-once guarantee
│   │   ├── MeshSimulatorService.js   # Virtual devices + gossip
│   │   └── DemoService.js            # Demo account seeding
│   └── routes/
│       ├── bridge.js                 # POST /api/bridge/ingest
│       └── dashboard.js              # Dashboard control endpoints
└── frontend/
    └── src/
        ├── App.js
        └── components/
            ├── AccountsPanel.js
            ├── SendPaymentForm.js
            ├── MeshPanel.js
            └── TransactionLedger.js
```

---

## Local Setup

**Prerequisites:** Node.js 18+, MongoDB Atlas URI

```bash
# 1. Clone
git clone https://github.com/alfiyafatima/UPI-Mesh.git
cd UPI-Mesh

# 2. Install
cd backend && npm install
cd ../frontend && npm install --legacy-peer-deps

# 3. Configure
cp backend/.env.example backend/.env
# Add your MongoDB Atlas URI to .env

# 4. Run (two terminals)
cd backend && npm run dev     # → http://localhost:8080
cd frontend && npm start      # → http://localhost:3000
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/dashboard/state` | Accounts, mesh state, ledger |
| `POST` | `/api/dashboard/send` | Create encrypted payment packet |
| `POST` | `/api/dashboard/gossip` | Run one gossip round |
| `POST` | `/api/dashboard/upload` | Bridge upload to backend |
| `POST` | `/api/dashboard/reset` | Reset demo to initial state |
| `POST` | `/api/bridge/ingest` | Ingest a raw mesh packet |

---

## Known Limitations

- **No offline proof of funds** — the packet is an IOU until backend settlement. If the sender's balance is insufficient at settlement time, the transaction is `REJECTED`.
- **Double-spend possible offline** — if the same payment reaches two bridge nodes simultaneously, the first one settles and the second is `REJECTED`. This is why production offline UPI (UPI Lite) uses hardware-backed pre-funded wallets.

---

## Author

**Alfiya Fatima** — [github.com/alfiyafatima](https://github.com/alfiyafatima)

---

## License

MIT
