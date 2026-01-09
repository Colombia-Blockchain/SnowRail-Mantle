# SnowRail - Mantle AI Treasury

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Network](https://img.shields.io/badge/network-Mantle%20Sepolia-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Node](https://img.shields.io/badge/Node.js-20-green)

**AI-powered Treasury on Mantle Network with RWA, DeFi, Multi-Oracle, and ZK Privacy.**

SnowRail is an **AI-Powered Treasury** that combines Real World Assets (RWA), DeFi composability, multi-oracle consensus, and ZK privacy on **Mantle Network**.

---

## Documentation

- [LLM API Reference](./docs/LLM_API_REFERENCE.md) - Complete endpoint documentation
- [LLM Project Context](./docs/LLM_PROJECT_CONTEXT.md) - Project context for AI assistants
- [Hackathon Implementation](./MANTLE_HACKATHON_IMPLEMENTATION.md) - Track-by-track breakdown

---

## Key Features

### RWA / RealFi
- **USDY Integration** - US Dollar Yield (Ondo Finance) with 5.25% APY
- **mETH Integration** - Mantle Staked ETH with 2.8% APY
- **Yield Distribution** - Automatic yield calculation and distribution
- **KYC Compliance** - Multi-level KYC with on-chain attestations

### DeFi & Composability
- **Lendle Integration** - Aave v3 fork lending on Mantle
- **Merchant Moe DEX** - Swaps and liquidity provision
- **5 Yield Strategies** - Composable strategies (5.5% - 15.5% APY)
- **Auto-Rebalancing** - Risk-adjusted portfolio optimization

### AI & Oracles
- **Multi-Oracle Consensus** - Pyth + Chainlink + DEX TWAPs
- **Weighted Median** - Outlier-resistant pricing
- **ZK-Compatible Proofs** - On-chain verifiable price data

### ZK & Privacy
- **Noir Circuits** - Production-ready ZK proofs
- **ZKMixer** - Privacy-preserving transactions
- **Merkle Commitments** - Unlinkable deposits/withdrawals

### Infrastructure
- **LEGO Architecture** - Swappable provider system
- **Type-Safe APIs** - Comprehensive TypeScript interfaces
- **50+ Endpoints** - RESTful API for all features

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js 20, Fastify, TypeScript |
| Frontend | Next.js 14, RainbowKit, Wagmi, TailwindCSS |
| Blockchain | Mantle Network, Solidity 0.8.24, Hardhat |
| Integrations | Lendle, Merchant Moe, Pyth, Ondo Finance, Noir |

---

## Quick Start

### 1. Installation
```bash
git clone <repo>
cd SnowRail-Mantle-
npm install
```

### 2. Environment Setup

Copy the example environment files:
```bash
cp apps/backend/.env.example apps/backend/.env
```

Configure the required variables in `apps/backend/.env`:
```env
CHAIN_ID=5003
RPC_URL=https://rpc.sepolia.mantle.xyz
PRIVATE_KEY=your_private_key
```

### 3. Run Development

```bash
# Terminal 1 - Backend (Port 3001)
cd apps/backend && npm run dev

# Terminal 2 - Frontend (Port 3000)
cd apps/frontend && npm run dev
```

### 4. Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/health/ready |

---

## Project Structure

```
SnowRail-Mantle-/
├── apps/
│   ├── backend/          # Fastify API server
│   ├── frontend/         # Next.js web app
│   └── facilitator/      # x402 payment facilitator
├── contracts/            # Solidity smart contracts
├── docs/                 # Documentation
└── packages/             # Shared packages
```

---

## API Overview

### RWA / RealFi
```
GET  /api/providers/rwa/yield/:asset
POST /api/providers/rwa/yield/distribute
GET  /api/providers/kyc/status/:address
```

### DeFi
```
GET  /api/providers/lending/markets
POST /api/providers/lending/supply
GET  /api/providers/swap/quote
POST /api/providers/swap/execute
```

### Oracles
```
GET /api/providers/oracle/price/:base/:quote
GET /api/providers/oracle/price-with-proof/:base/:quote
```

### ZK Privacy
```
GET  /api/mixer/info
POST /api/mixer/deposit
POST /api/mixer/withdraw
```

See [LLM API Reference](./docs/LLM_API_REFERENCE.md) for complete documentation.

---

## Deployed Contracts (Mantle Sepolia)

| Contract | Address |
|----------|---------|
| Settlement | `0xae6E14caD8D4f43947401fce0E4717b8D17b4382` |
| ZKMixer | `0x9C7dC7C8D6156441D5D5eCF43B33F960331c4600` |
| USDY | `0x5bE26527e817998A7206475496fDE1E68957c5A6` |
| mETH | `0xcDA86A272531e8640cD7F1a92c01839911B90bb0` |
| WMNT | `0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8` |
| Pyth Oracle | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |

---

## Testing

```bash
# Smart Contracts
cd contracts && npx hardhat test

# Backend
cd apps/backend && npm test
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (Next.js)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (Fastify)                      │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │   RWA    │  DeFi    │  Oracle  │    ZK    │          │
│  │ Provider │ Provider │ Provider │ Provider │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Mantle Network                          │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │  Lendle  │   Moe    │   Pyth   │   Noir   │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## License

MIT License - See [LICENSE](./LICENSE) for details
