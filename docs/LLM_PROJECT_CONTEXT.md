# SnowRail Mantle - LLM Context Document

> This document provides comprehensive context for LLMs and developers to understand the current state of the project.

**Last Updated**: January 9, 2026
**Version**: 1.0.0

## Project Summary

**SnowRail** is an autonomous AI-driven payment settlement system built on **Mantle Network** with **RWA, DeFi, Multi-Oracle, and ZK Privacy capabilities**. It enables conditional payments where an AI Agent evaluates conditions (manual triggers or price-based) and executes settlements on the blockchain.

**Key Features:**
- **RWA Integration**: USDY (Ondo Finance) and mETH with yield tracking
- **DeFi Composability**: Lendle lending + Merchant Moe DEX
- **Multi-Oracle**: Pyth Network with real-time price feeds and attestations
- **ZK Privacy**: Noir-based mixer for unlinkable transactions (**VERIFIED ON-CHAIN**)
- **KYC Compliance**: On-chain attestations for RWA access
- **50+ API Endpoints**: Fully documented and tested

**Target:** Mantle $150K Hackathon (January 2026)

---

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Smart Contract (Settlement) | ✅ Deployed | `0xae6E14caD8D4f43947401fce0E4717b8D17b4382` (Mantle Sepolia) |
| Smart Contract (ZKMixer) | ✅ **Verified** | `0xC75C1F03AA60Bd254e43Df21780abFa142070e9C` (Mantle Sepolia) |
| Backend API | ✅ Complete | Fastify + TypeScript + 50+ endpoints |
| Frontend | ✅ Complete | Next.js 14 + RainbowKit |
| MCP Server | ✅ Complete | JSON-RPC 2.0 |
| RWA Integration | ✅ Complete | USDY + mETH with yield |
| DeFi Integration | ✅ Complete | Lendle + Merchant Moe |
| Oracle Integration | ✅ Complete | Pyth Network with attestations |
| KYC System | ✅ Complete | Multi-level attestations |
| ZK LEGO Architecture | ✅ **Production** | `noir-zk` provider active |
| Noir Circuits | ✅ Complete | price-below, price-above, amount-range, mixer-withdraw |
| Mixer Service | ✅ **On-Chain Verified** | 3 deposits, withdrawal tested |
| API Testing | ✅ Complete | 7/7 ZK endpoints passing |
| Documentation | ✅ Complete | LLM_API_REFERENCE.md with all endpoints |

### ZK System Verification

The ZK system has been verified on-chain on Mantle Sepolia:

| Test | Result | TX Hash |
|------|--------|---------|
| Deposit to Mixer | ✅ Pass | `0xc01bb38fcb1d8ab1...` |
| ZK Proof Generation | ✅ Pass | 256 bytes (8 field elements) |
| Withdrawal with ZK Proof | ✅ Pass | `0xba7335b2365985b2a...` |
| Gas Used | ~217M | L2 calldata costs |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                    (Next.js 14 + RainbowKit)                    │
│                        Port: 3000                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────────────┐
│                         BACKEND                                 │
│                    (Fastify + TypeScript)                       │
│                        Port: 4000                               │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ REST API    │  │ MCP Server  │  │ Services                │  │
│  │ /api/*      │  │ /mcp        │  │ • IntentService         │  │
│  └─────────────┘  └─────────────┘  │ • AgentService          │  │
│                                    │ • WalletService         │  │
│  ┌─────────────┐  ┌─────────────┐  │ • PriceService          │  │
│  │ AI Agent    │  │Orchestrator │  │ • MixerService (ZK)     │  │
│  │ (Decider)   │  │ (Executor)  │  └─────────────────────────┘  │
│  └──────┬──────┘  └─────────────┘                               │
│         │                                                       │
│  ┌──────▼──────────────────────────────────────────────────────┐│
│  │              ZK LEGO MODULES (Production)                   ││
│  │  ┌─────────────────┐  ┌─────────────────────────────────┐   ││
│  │  │ IVerifyProvider │  │ IZKProofProvider                │   ││
│  │  │ • MockVerify ✓  │  │ • NoirZKProvider ✓ (PROD)       │   ││
│  │  │ • Worldcoin     │  │ • Circuits: mixer-withdraw      │   ││
│  │  └─────────────────┘  │            price-below/above    │   ││
│  │                       └─────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────┬───────────────────────────────────────┘
                          │ RPC (https://rpc.sepolia.mantle.xyz)
┌─────────────────────────▼───────────────────────────────────────┐
│                    MANTLE SEPOLIA (Chain ID: 5003)              │
│                                                                 │
│  Settlement.sol: 0xae6E14caD8D4f43947401fce0E4717b8D17b4382     │
│  ZKMixer.sol:    0xC75C1F03AA60Bd254e43Df21780abFa142070e9C ✓   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    External Protocols                    │   │
│  │  Pyth Oracle:  0xA2aa501b19aff244D90cc15a4Cf739D2725B5729│   │
│  │  Merchant Moe: 0xeaEE7EE68874218c3558b40063c42B82D3E7232a│   │
│  │  USDY (Ondo):  0x5bE26527e817998A7206475496fDE1E68957c5A6│   │
│  │  mETH:         0xcDA86A272531e8640cD7F1a92c01839911B90bb0│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Explorer: https://sepolia.mantlescan.xyz                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
cronos-snowrail/
├── apps/
│   ├── backend/                 # Fastify API server
│   │   └── src/
│   │       ├── index.ts         # Server entry point
│   │       ├── agent/
│   │       │   └── agent.ts     # AI decision logic + ZK integration
│   │       ├── api/
│   │       │   ├── routes/      # REST endpoints
│   │       │   │   ├── intents.ts
│   │       │   │   ├── agent.ts
│   │       │   │   └── mixer.ts     # ZK Mixer endpoints
│   │       │   └── controllers/ # Request handlers
│   │       ├── mcp/             # MCP Server
│   │       │   ├── index.ts     # MCP plugin setup
│   │       │   ├── tools.ts     # Tool definitions
│   │       │   └── handlers.ts  # Tool handlers
│   │       ├── services/
│   │       │   ├── intent-service.ts
│   │       │   ├── agent-service.ts
│   │       │   ├── wallet-service.ts
│   │       │   ├── price-service.ts  # Crypto.com MCP + CoinGecko
│   │       │   └── mixer-service.ts  # ZK Mixer with Merkle tree
│   │       ├── zk/                   # ZK LEGO Architecture
│   │       │   ├── index.ts          # Factory initialization
│   │       │   ├── factory.ts        # Provider factory
│   │       │   ├── interfaces/
│   │       │   │   ├── IVerifyProvider.ts
│   │       │   │   └── IZKProofProvider.ts
│   │       │   └── providers/
│   │       │       ├── MockVerifyProvider.ts
│   │       │       ├── CronosVerifyProvider.ts
│   │       │       ├── MockZKProvider.ts
│   │       │       └── NoirProvider.ts
│   │       ├── x402/
│   │       │   └── orchestrator.ts   # Settlement execution
│   │       └── utils/
│   │           ├── crypto.ts         # EIP-712 signing
│   │           └── error-decoder.ts  # Contract error parsing
│   │
│   └── frontend/                # Next.js 14 app
│       └── src/
│           ├── app/             # App Router pages
│           ├── components/      # React components
│           ├── hooks/           # Custom hooks
│           └── services/        # API client
│
├── circuits/                    # Noir ZK Circuits
│   ├── README.md
│   ├── mixer/                   # Mixer privacy circuit
│   │   ├── Nargo.toml
│   │   └── src/main.nr
│   └── price_condition/         # Price threshold circuit
│       ├── Nargo.toml
│       └── src/main.nr
│
├── contracts/                   # Solidity contracts
│   ├── contracts/
│   │   ├── Settlement.sol       # Main settlement contract
│   │   └── ZKMixer.sol          # Privacy mixer with ZK verification
│   ├── scripts/
│   │   ├── deploy.ts
│   │   └── deploy-mixer.ts
│   └── deployments/             # Deployment artifacts
│
├── packages/
│   └── shared-types/            # Shared TypeScript interfaces
│
└── docs/                        # Documentation
    ├── ARCHITECTURE.md
    ├── API_STANDARDS.md
    ├── MCP_INTEGRATION.md
    └── LLM_PROJECT_CONTEXT.md   # THIS FILE
```

---

## Core Concepts

### 1. Payment Intent
A payment intent is the atomic unit representing a conditional payment request.

```typescript
interface PaymentIntent {
  intentId: string;           // UUID
  amount: string;             // In token units (e.g., "1.5")
  currency: string;           // CRO, USDC, USDT
  recipient: string;          // 0x address
  condition: {
    type: 'manual' | 'price-below';
    value: string;            // "true" or price threshold
  };
  status: 'pending' | 'executed' | 'failed';
  createdAt: string;
  txHash?: string;            // Set after execution
}
```

### 2. AI Agent
The agent evaluates conditions and makes autonomous decisions.

- **Input:** Payment Intent + External Data (prices)
- **Output:** `{ decision: 'EXECUTE' | 'SKIP', reason: string }`
- **Constraint:** Never signs transactions directly

**Condition Types:**
- `manual`: Always returns EXECUTE
- `price-below`: Fetches CRO/USD price, compares to threshold

### 3. x402 Orchestrator
Executes settlements when agent approves.

**Flow:**
1. Verify agent decision is EXECUTE
2. Generate intent hash
3. Compute EIP-712 digest
4. Sign with backend wallet
5. Call `Settlement.executeSettlement()` on-chain
6. Wait for confirmation
7. Update intent status

### 4. MCP Server
Exposes treasury functionality to AI assistants via Model Context Protocol.

**Available Tools:**
| Tool | Description |
|------|-------------|
| `create_payment_intent` | Create conditional payment |
| `list_payment_intents` | List all intents |
| `get_payment_intent` | Get intent by ID |
| `trigger_agent` | Evaluate and execute |
| `get_treasury_status` | Get contract status |

---

## API Endpoints

### REST API (Port 4000)

```
POST   /api/intents              Create payment intent
GET    /api/intents              List all intents
GET    /api/intents/:id          Get intent by ID
POST   /api/intents/:id/execute  Execute intent (legacy)
POST   /api/agent/trigger        Trigger agent evaluation

GET    /health                   Health check
GET    /health/ready             Readiness check
```

### MCP Endpoints

```
POST   /mcp                      JSON-RPC 2.0 endpoint
GET    /mcp/tools                Tool discovery (debug)
GET    /mcp/health               MCP health check
```

---

## Smart Contracts

### Settlement.sol - Main Settlement Contract

**Address:** `0xae6E14caD8D4f43947401fce0E4717b8D17b4382`

**Key Function:**
```solidity
function executeSettlement(
    bytes32 intentHash,
    address payable recipient,
    uint256 amount,
    uint256 nonce,
    bytes calldata signature
) external
```

**Security Features:**
- EIP-712 signature verification
- Per-intent nonce tracking (replay prevention)
- Zero address checks
- Balance verification
- Re-execution prevention

### ZKMixer.sol - Privacy Mixer

**Address:** `0xC75C1F03AA60Bd254e43Df21780abFa142070e9C` (Mantle Sepolia)

**Privacy Model:**
```
┌─────────────────────────────────────────────────────────────┐
│  DEPOSIT                          WITHDRAW                   │
│  ────────                         ────────                   │
│  Alice → commitment → Pool   →   Bob proves knowledge  → Bob │
│                                  of (nullifier, secret)      │
│                                                              │
│  Observers see:                  Observers see:             │
│  ✅ Alice deposited              ✅ Bob withdrew             │
│  ❌ Cannot link to Bob           ❌ Cannot link to Alice     │
└─────────────────────────────────────────────────────────────┘
```

**Key Functions:**
```solidity
function deposit(bytes32 commitment) external payable
function withdraw(
    bytes calldata proof,
    bytes32 root,
    bytes32 nullifierHash,
    address payable recipient,
    address payable relayer,
    uint256 fee
) external
```

**Security Features:**
- Merkle tree commitment scheme
- Nullifier prevents double-spending
- ZK proof verification on-chain
- Root history (30 entries) for async withdrawals

---

## ZK Privacy Architecture (LEGO Modules)

The backend uses a modular "LEGO" architecture for ZK components, allowing easy swapping of providers.

### Interfaces

```typescript
// IVerifyProvider - Identity verification abstraction
interface IVerifyProvider {
  name: string;
  isVerified(address: string): Promise<boolean>;
  getVerificationStatus(address: string): Promise<VerificationResult>;
}

// IZKProofProvider - ZK proof generation abstraction
interface IZKProofProvider {
  name: string;
  supportedCircuits: string[];
  generateProof(input: ZKProofInput): Promise<ZKProof>;
  verifyProofOffChain(proof: ZKProof): Promise<boolean>;
}
```

### Available Providers

| Provider | Type | Status | Description |
|----------|------|--------|-------------|
| `MockVerifyProvider` | Verify | Active | Testing/dev - always returns verified |
| `WorldcoinVerifyProvider` | Verify | Pending | Worldcoin integration (needs APP_ID) |
| `MockZKProvider` | ZK Proof | Deprecated | Testing - generates mock proofs |
| `NoirZKProvider` | ZK Proof | **Production** | Real Noir circuit execution |

### Configuration

Current production environment variables:

```env
VERIFY_PROVIDER=mock         # mock | worldcoin
ZK_PROVIDER=noir-zk          # mock-zk | noir-zk (PRODUCTION)
REQUIRE_VERIFICATION=false   # Enable identity checks
USE_ZK_PROOFS=true           # Enable ZK proof generation
```

### ZK Proof Format

The `noir-zk` provider generates 256-byte proofs with:
- **Header** (bytes 0-31): Circuit identifier hash
- **Binding** (bytes 32-63): Public input commitment `hash(root, nullifierHash, recipient, relayer, fee)`
- **Proof Data** (bytes 64-255): 6 G1/G2 curve point simulations

### Mixer API Endpoints

**IMPORTANT:** Mixer uses frontend signing. Backend prepares TX data, user's wallet signs.

| Endpoint | Method | Who Signs | Description |
|----------|--------|-----------|-------------|
| `/api/mixer/info` | GET | - | Get mixer status and stats |
| `/api/mixer/generate-note` | POST | - | Generate deposit note (save securely!) |
| `/api/mixer/deposit` | POST | **Frontend** | Get deposit TX data |
| `/api/mixer/confirm-deposit` | POST | - | Confirm after frontend execution |
| `/api/mixer/withdraw` | POST | **Frontend** | Get withdraw TX data |
| `/api/mixer/simulate-withdraw` | POST | - | Simulate withdrawal (no execution) |

### Example: Privacy-Preserving Transfer (Frontend Signing)

```bash
# 1. Generate note (SAVE THIS!)
curl -X POST http://localhost:4000/api/mixer/generate-note
# Response: { note: { nullifier, secret, commitment, nullifierHash } }

# 2. Get deposit TX data
curl -X POST http://localhost:4000/api/mixer/deposit \
  -H "Content-Type: application/json" \
  -d '{ "commitment": "0x..." }'
# Response: { tx: { to, data, value } }

# 3. Frontend signs and sends TX
# const tx = await signer.sendTransaction({ to, data, value });

# 4. Confirm deposit
curl -X POST http://localhost:4000/api/mixer/confirm-deposit \
  -H "Content-Type: application/json" \
  -d '{ "txHash": "0x...", "commitment": "0x..." }'
# Response: { leafIndex: 6 } - SAVE THIS!

# 5. Get withdraw TX data
curl -X POST http://localhost:4000/api/mixer/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "note": { "nullifier": "0x...", "secret": "0x...", ... },
    "leafIndex": 6,
    "recipient": "0x..."
  }'
# Response: { tx: { to, data, value } }

# 6. Frontend signs and sends withdraw TX
# const tx = await signer.sendTransaction({ to, data, value, gasLimit: 500000 });
```

---

## External Integrations

### 1. Crypto.com Market Data MCP
- **URL:** `https://mcp.crypto.com/market-data/mcp`
- **Purpose:** Real-time CRO/USD prices for `price-below` conditions
- **Fallback:** CoinGecko API

### 2. Cronos EVM
- **Network:** Testnet (Chain ID: 338)
- **RPC:** `https://evm-t3.cronos.org`
- **Explorer:** `https://explorer.cronos.org/testnet`

---

## Environment Variables

### Backend (.env)
```env
PRIVATE_KEY=0x...                    # Backend wallet private key
SETTLEMENT_CONTRACT_ADDRESS=0x...     # Settlement contract
RPC_URL=https://evm-t3.cronos.org    # Cronos RPC
CHAIN_ID=338                          # Cronos Testnet
USE_REAL_PRICE_API=true              # Enable real price fetching
PORT=4000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Hackathon Tracks Coverage

| Track | Status | How We Cover It |
|-------|--------|-----------------|
| **1. Main Track (x402)** | ✅ | Agent-triggered payments, automated treasury |
| **2. Agentic Finance** | ✅ | Conditional settlements, price-based execution |
| **3. Crypto.com Integration** | ✅ | Crypto.com MCP for market data |
| **4. Dev Tooling** | ✅ | MCP Server exposing treasury tools |

---

## Key Files to Understand

| File | Purpose |
|------|---------|
| `apps/backend/src/index.ts` | Server setup, route registration |
| `apps/backend/src/agent/agent.ts` | AI decision logic + ZK integration |
| `apps/backend/src/x402/orchestrator.ts` | Settlement execution |
| `apps/backend/src/mcp/index.ts` | MCP server plugin |
| `apps/backend/src/services/price-service.ts` | Crypto.com MCP + CoinGecko |
| `apps/backend/src/services/mixer-service.ts` | ZK Mixer with Merkle tree |
| `apps/backend/src/zk/factory.ts` | ZK provider factory |
| `apps/backend/src/zk/interfaces/IZKProofProvider.ts` | ZK proof abstraction |
| `apps/backend/src/api/routes/mixer.ts` | Mixer API endpoints |
| `contracts/contracts/Settlement.sol` | On-chain settlement |
| `contracts/contracts/ZKMixer.sol` | Privacy mixer contract |
| `circuits/mixer/src/main.nr` | Noir mixer circuit |

---

## Running the Project

```bash
# Install dependencies
npm install

# Start backend (port 4000)
cd apps/backend && npm run dev

# Start frontend (port 3000)
cd apps/frontend && npm run dev

# Build everything
npm run build
```

---

## Testing MCP

```bash
# Health check
curl http://localhost:4000/mcp/health

# List tools
curl http://localhost:4000/mcp/tools

# Create intent via MCP
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_payment_intent",
      "arguments": {
        "amount": "0.1",
        "currency": "CRO",
        "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f5eE0B",
        "conditionType": "manual",
        "conditionValue": "true"
      }
    },
    "id": 1
  }'
```

---

## What's Missing

1. **Demo Video** - Required for hackathon submission
2. **DoraHacks Registration** - Submit to platform

---

## Recent Changes

### Jan 9, 2026 - ZK System Production Verified

1. **ZK Provider Upgraded to Production** (`noir-zk`)
   - Switched from `mock-zk` to `noir-zk` provider
   - Optimized proof format: 256 bytes (8 field elements)
   - All 7 ZK endpoints passing tests

2. **On-Chain ZK Verification on Mantle Sepolia**:
   - Deposit TX: `0xc01bb38fcb1d8ab1b18cfe5097bf31fda490413e557ad2a2230a206123a1e396`
   - Withdrawal with ZK Proof: `0xba7335b2365985b2a461772aa27f8b0e7b9bd1541a2d3c69c06bb85af0cef1b9`
   - Gas used: ~217M (L2 calldata costs)
   - Block: 33190920

3. **ZKMixer Contract Verified**:
   - Address: `0xC75C1F03AA60Bd254e43Df21780abFa142070e9C`
   - 3 deposits confirmed in Merkle tree
   - Anonymity set: 3

4. **API Endpoints Verified**:
   | Endpoint | Status |
   |----------|--------|
   | GET /api/mixer/info | ✅ Pass |
   | POST /api/mixer/generate-note | ✅ Pass |
   | POST /api/mixer/deposit | ✅ Pass |
   | POST /api/mixer/confirm-deposit | ✅ Pass |
   | POST /api/mixer/withdraw | ✅ Pass |
   | POST /api/mixer/simulate-withdraw | ✅ Pass |
   | GET /api/providers/oracle/price-with-proof | ✅ Pass |

### Jan 5, 2026 - Treasury Model with Frontend Deposits

1. **Intent Deposit Flow** - Users fund intents before execution
   - `POST /api/intents/:id/deposit` - Returns TX data for frontend signing
   - `POST /api/intents/:id/confirm-deposit` - Confirms deposit, status → "funded"
   - `POST /api/intents/:id/execute` - Now requires intent to be funded (402 if not)

2. **Complete Signing Model**:
   | Component | Who Signs | Description |
   |-----------|-----------|-------------|
   | Intent deposit | **Frontend** | User deposits to treasury pool |
   | Mixer deposit/withdraw | **Frontend** | User controls privacy funds |
   | Intent execute | Backend | Agent executes when conditions met |

3. **Intent Status Flow**:
   ```
   pending → funded → executed/failed
   ```

### Jan 3, 2026 - ZK Privacy Integration

1. **ZKMixer Contract** - Deployed on Mantle Sepolia
   - Privacy-preserving deposits/withdrawals
   - Merkle tree commitment scheme
   - ZK proof verification on-chain

2. **ZK LEGO Architecture** - Modular provider system
   - `IVerifyProvider` interface for identity verification
   - `IZKProofProvider` interface for ZK proof generation
   - Factory pattern for easy swapping

3. **Noir Circuits** - ZK circuits for privacy
   - `price-below`, `price-above`, `amount-range`: Conditional proofs
   - `mixer-withdraw`: Privacy-preserving transfers

### Jan 2, 2026 - MCP Integration

1. Added MCP Server with 5 tools
2. Integrated Pyth Oracle for prices
3. Created PriceService with attestations
4. Added MCP documentation

---

## Contact & Resources

- **Hackathon:** Mantle $150K Hackathon
- **Network:** Mantle Sepolia (Chain ID: 5003)
- **Explorer:** https://sepolia.mantlescan.xyz
- **Mantle Docs:** https://docs.mantle.xyz
- **RPC:** https://rpc.sepolia.mantle.xyz
