# SnowRail Backend

Fastify-based API server for the SnowRail AI Treasury platform.

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Fastify 4.x
- **Language**: TypeScript 5.4
- **ZK Proofs**: Noir (Barretenberg)
- **Blockchain**: ethers.js 6.x

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Development mode
npm run dev

# Production build
npm run build && npm start
```

The server runs on `http://localhost:3001` by default.

## Project Structure

```
src/
├── index.ts              # Application entry point
├── api/
│   └── routes/           # API route handlers
├── config/               # Configuration & feature flags
├── core/                 # Core abstractions & registry
├── middleware/           # Fastify middleware
├── modules/              # Domain modules
│   ├── ap2/              # Agent Payments Protocol v2
│   ├── opa/              # Open Policy Agent integration
│   └── x402/             # HTTP 402 payment protocol
├── providers/            # LEGO provider system
│   ├── mocks/            # Mock implementations
│   ├── factory.ts        # Provider factory
│   ├── interfaces.ts     # Provider interfaces
│   ├── KYCProvider.ts    # KYC verification
│   ├── MerchantMoeProvider.ts  # DEX swaps
│   ├── MultiOracleProvider.ts  # Oracle aggregation
│   ├── PythOracleProvider.ts   # Pyth Network oracle
│   ├── USDYProvider.ts   # RWA yield provider
│   ├── YieldDistributor.ts     # Yield distribution
│   └── YieldOptimizer.ts       # Yield strategies
├── services/             # Business logic services
├── utils/                # Utility functions
├── x402/                 # x402 payment orchestration
└── zk/                   # Zero-knowledge proof providers
```

## Environment Variables

Key configuration options (see `.env.example` for full list):

```env
# Server
PORT=3001
NODE_ENV=development

# Network
CHAIN_ID=5003
RPC_URL=https://rpc.sepolia.mantle.xyz

# Wallet
PRIVATE_KEY=your_private_key

# Contracts
SETTLEMENT_CONTRACT_ADDRESS=0xae6E14caD8D4f43947401fce0E4717b8D17b4382
MIXER_CONTRACT_ADDRESS=0x9C7dC7C8D6156441D5D5eCF43B33F960331c4600

# Provider Selection (mock | real)
RWA_PROVIDER=mock
ORACLE_PROVIDER=mock
SWAP_PROVIDER=mock
ZK_PROVIDER=mock
```

## API Endpoints

### Health
```
GET /health/ready      # Readiness check
GET /health/live       # Liveness check
```

### Providers

#### RWA (Real World Assets)
```
GET  /api/providers/rwa/yield/:asset
GET  /api/providers/rwa/balance/:asset/:address
POST /api/providers/rwa/yield/distribute
GET  /api/providers/rwa/yield/stats/:asset
```

#### Oracle
```
GET /api/providers/oracle/price/:base/:quote
GET /api/providers/oracle/price-with-proof/:base/:quote
```

#### Swap (Merchant Moe DEX)
```
GET  /api/providers/swap/quote
POST /api/providers/swap/execute
```

#### Lending (Lendle)
```
GET  /api/providers/lending/markets
GET  /api/providers/lending/position/:asset/:address
POST /api/providers/lending/supply
POST /api/providers/lending/borrow
POST /api/providers/lending/withdraw
POST /api/providers/lending/repay
```

#### KYC
```
GET  /api/providers/kyc/status/:address
POST /api/providers/kyc/verify
GET  /api/providers/kyc/attestation/:address
```

### ZK Mixer
```
GET  /api/mixer/info
POST /api/mixer/deposit
POST /api/mixer/withdraw
```

### Intents
```
POST /api/intents
GET  /api/intents/:id
POST /api/intents/:id/sign
POST /api/intents/:id/execute
```

### Agent
```
POST /api/agent/process
GET  /api/agent/status
```

## LEGO Architecture

The backend uses a modular "LEGO" architecture where providers can be swapped:

```typescript
// Provider factory creates appropriate implementation
const oracleProvider = createOracleProvider(config);

// Interface remains consistent
const price = await oracleProvider.getPrice('ETH', 'USD');
```

Available provider types:
- **RWA**: USDY, mETH, Mock
- **Oracle**: Pyth, Mock
- **Swap**: Merchant Moe, Mock
- **ZK**: Noir, Mock

## Feature Flags

Protocol extensions can be enabled via environment variables:

```env
SNOWRAIL_PROTOCOL=x402    # Enable v2 features
AP2_ENABLED=true          # Agent Payments v2
X402_ENABLED=true         # HTTP 402 payments
OPA_ENABLED=true          # Policy enforcement
```

## Scripts

```bash
npm run dev      # Development with hot reload
npm run build    # TypeScript compilation
npm start        # Production server
npm test         # Run tests
```

## Dependencies

### Production
- `fastify` - Web framework
- `ethers` - Ethereum interactions
- `@noir-lang/noir_js` - ZK proof generation
- `@modelcontextprotocol/sdk` - MCP integration
- `dotenv` - Environment configuration

### Development
- `typescript` - Type checking
- `ts-node-dev` - Hot reload
- `pino-pretty` - Log formatting
