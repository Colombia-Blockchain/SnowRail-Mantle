# SnowRail Mantle - LLM API Reference

Complete API documentation for AI/LLM integration with the SnowRail Agentic Treasury system on Mantle.

**Last Updated**: January 9, 2026
**Version**: 1.0.0

## Overview

SnowRail is an autonomous treasury system on Mantle blockchain that enables:
- **Payment Intents**: Conditional payments with AI agent evaluation
- **Privacy Mixer**: ZK-SNARK based private transfers (deposit/withdraw) - **VERIFIED ON-CHAIN**
- **Oracle Integration**: Real-time Pyth Oracle price feeds with attestations
- **RWA Support**: USDY and mETH with yield tracking
- **DeFi Integration**: Merchant Moe swaps and Lendle lending
- **KYC Compliance**: On-chain KYC attestations for RWA access
- **MCP Protocol**: Model Context Protocol for AI assistant integration
- **ZK Proofs**: Noir-based ZK provider with 256-byte proofs

**Base URL**: `http://localhost:4000` (development)
**Network**: Mantle Sepolia (Chain ID: 5003)

## ZK Provider Status

| Component | Provider | Status |
|-----------|----------|--------|
| ZK Proofs | `noir-zk` | **Production** |
| Identity Verification | `mock-verify` | Development |
| Supported Circuits | `price-below`, `price-above`, `amount-range`, `mixer-withdraw` | Active |
| Proof Size | 256 bytes (8 field elements) | Optimized |

---

## Table of Contents

1. [Health Check Endpoints](#health-check-endpoints)
2. [Payment Intent Endpoints](#payment-intent-endpoints)
3. [Agent Endpoints](#agent-endpoints)
4. [Mixer (Privacy) Endpoints](#mixer-privacy-endpoints)
5. [Oracle Endpoints (Pyth)](#oracle-endpoints-pyth)
6. [RWA Endpoints (USDY & mETH)](#rwa-endpoints-usdy--meth)
7. [Swap Endpoints (Merchant Moe)](#swap-endpoints-merchant-moe)
8. [Lending Endpoints (Lendle)](#lending-endpoints-lendle)
9. [KYC Endpoints](#kyc-endpoints)
10. [MCP Protocol Endpoints](#mcp-protocol-endpoints)
11. [Smart Contract: Settlement](#smart-contract-settlement)
12. [Data Types](#data-types)
13. [Error Codes](#error-codes)

---

## Health Check Endpoints

### GET /health

Basic health check to verify the server is running.

**Request**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "HEALTH_CHECK_OK",
  "message": "Backend server is running",
  "data": {
    "uptime": 78784.23,
    "timestamp": "2026-01-09T02:30:00.000Z",
    "version": "0.0.1",
    "environment": "production",
    "network": "Mantle Sepolia"
  }
}
```

### GET /health/ready

Readiness check including all service initialization status.

**Request**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "READINESS_CHECK_OK",
  "message": "System is ready for E2E testing",
  "data": {
    "timestamp": "2026-01-09T02:30:00.000Z",
    "services": {
      "wallet": { "initialized": true },
      "agent": { "initialized": true }
    },
    "environment": {
      "network": "Mantle Sepolia",
      "chainId": "5003"
    },
    "zk": {
      "initialized": true,
      "verifyProvider": { "name": "mock-verify", "healthy": true },
      "zkProvider": { "name": "noir-zk", "healthy": true, "circuits": ["price-below", "price-above", "amount-range", "mixer-withdraw"] }
    },
    "mixer": {
      "enabled": true,
      "contractAddress": "0xC75C1F03AA60Bd254e43Df21780abFa142070e9C"
    }
  }
}
```

---

## Payment Intent Endpoints

### POST /api/intents

Create a new payment intent for conditional execution.

**Request Body**:
```json
{
  "amount": "0.001",
  "currency": "MNT",
  "recipient": "0x0000000000000000000000000000000000000001",
  "condition": {
    "type": "manual",
    "value": "true"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | string | Yes | Payment amount in token units (e.g., "1.5") |
| `currency` | string | Yes | Token symbol: `MNT`, `USDC`, or `USDT` |
| `recipient` | string | Yes | Ethereum address (0x + 40 hex chars) |
| `condition.type` | string | Yes | `manual` or `price-below` |
| `condition.value` | string | Yes | `"true"` for manual, USD price for price-below |

**Condition Types**:
- `manual`: Always executes when triggered
- `price-below`: Executes only when CRO/USD price is below threshold

**Response** (201 Created):
```json
{
  "status": "success",
  "code": "INTENT_CREATED",
  "message": "Payment intent successfully created",
  "data": {
    "intentId": "74b62399-7c26-4c05-9df7-93bacd0bdd1f",
    "amount": "0.001",
    "currency": "MNT",
    "recipient": "0x0000000000000000000000000000000000000001",
    "condition": {
      "type": "manual",
      "value": "true"
    },
    "status": "pending",
    "createdAt": "2026-01-04T23:09:21.815Z",
    "agentDecision": {
      "decision": "EXECUTE",
      "reason": "Manual condition - always execute"
    }
  }
}
```

### GET /api/intents

List all payment intents.

**Request**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "INTENTS_RETRIEVED",
  "message": "Retrieved 3 payment intent(s)",
  "data": [
    {
      "intentId": "74b62399-7c26-4c05-9df7-93bacd0bdd1f",
      "amount": "0.001",
      "currency": "MNT",
      "recipient": "0x...",
      "condition": { "type": "manual", "value": "true" },
      "status": "pending",
      "createdAt": "2026-01-04T23:09:21.815Z"
    }
  ]
}
```

### GET /api/intents/:id

Retrieve a specific payment intent by ID.

**Path Parameters**:
- `id` (string): UUID of the payment intent

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "INTENT_RETRIEVED",
  "message": "Payment intent successfully retrieved",
  "data": {
    "intentId": "74b62399-7c26-4c05-9df7-93bacd0bdd1f",
    "amount": "0.001",
    "currency": "MNT",
    "recipient": "0x...",
    "condition": { "type": "manual", "value": "true" },
    "status": "pending",
    "createdAt": "2026-01-04T23:09:21.815Z"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "status": "error",
  "code": "INTENT_NOT_FOUND",
  "message": "Payment intent not found"
}
```

### POST /api/intents/:id/deposit

Prepare deposit TX data for frontend wallet to sign. **User must fund the intent before execution.**

**Path Parameters**:
- `id` (string): UUID of the payment intent

**Request Body**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "DEPOSIT_TX_PREPARED",
  "message": "Deposit transaction prepared. Sign and send from your wallet.",
  "data": {
    "tx": {
      "to": "0x96A4Dc9CC80A8aE2B5acD1bC52AC013C4f740C69",
      "value": "1000000000000000",
      "data": "0x"
    },
    "intentId": "74b62399-7c26-4c05-9df7-93bacd0bdd1f",
    "amount": "0.001 MNT",
    "instructions": [
      "1. Sign this transaction with your connected wallet",
      "2. After confirmation, call /intents/:id/confirm-deposit with txHash",
      "3. Once funded, the agent will execute when conditions are met"
    ]
  }
}
```

**Frontend Usage (ethers.js):**
```typescript
const { tx } = response.data;
const transaction = await signer.sendTransaction({
  to: tx.to,
  value: tx.value,
  data: tx.data
});
await transaction.wait();
// Then call /intents/:id/confirm-deposit with txHash
```

### POST /api/intents/:id/confirm-deposit

Confirm deposit after frontend executes TX. Updates intent status to "funded".

**Path Parameters**:
- `id` (string): UUID of the payment intent

**Request Body**:
```json
{
  "txHash": "0x123abc..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `txHash` | string | Yes | Transaction hash from frontend deposit |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "DEPOSIT_CONFIRMED",
  "message": "Deposit confirmed. Intent is now funded and ready for execution.",
  "data": {
    "intentId": "74b62399-7c26-4c05-9df7-93bacd0bdd1f",
    "txHash": "0x123abc...",
    "amount": "0.001 MNT",
    "status": "funded",
    "nextStep": "Agent will execute when condition is met, or call /intents/:id/execute"
  }
}
```

### POST /api/intents/:id/execute

Execute a payment intent. **Requires intent to be funded first (402 if not funded).**

**Path Parameters**:
- `id` (string): UUID of the payment intent

**Request Body**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "INTENT_EXECUTED",
  "message": "Payment intent executed successfully",
  "data": {
    "intentId": "16e19ffa-1b3f-44bc-a35b-0a394152024d",
    "amount": "0.001",
    "currency": "MNT",
    "recipient": "0x0000000000000000000000000000000000000001",
    "status": "executed",
    "txHash": "0x021b468b95ce36bb57f8bdcb4a09a66525f4a2edab8db56fe62976ee37906afe",
    "agentDecision": {
      "decision": "EXECUTE",
      "reason": "Manual condition - always execute"
    }
  }
}
```

**Error Response** (402 Payment Required):
```json
{
  "status": "error",
  "code": "INTENT_NOT_FUNDED",
  "message": "Intent must be funded before execution. Call /intents/:id/deposit first.",
  "details": {
    "nextStep": "POST /intents/:id/deposit to get deposit TX data"
  }
}
```

---

## Agent Endpoints

### POST /api/agent/trigger

Trigger the AI agent to evaluate and execute a payment intent.

**Request Body**:
```json
{
  "intentId": "80ec7223-cde4-440e-9efc-d914fe32392e"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `intentId` | string | Yes | UUID of the payment intent |

**Response** (200 OK - Executed):
```json
{
  "status": "success",
  "code": "AGENT_EXECUTED",
  "message": "Payment intent executed successfully by agent",
  "data": {
    "intentId": "80ec7223-cde4-440e-9efc-d914fe32392e",
    "amount": "0.001",
    "currency": "MNT",
    "recipient": "0x0000000000000000000000000000000000000002",
    "condition": {
      "type": "price-below",
      "value": "1.0"
    },
    "status": "executed",
    "txHash": "0x19ced3dd5db0c32d51834666bfb33e9f2cf195e8a2fd4bccd4a5b22fc06397af",
    "agentDecision": {
      "decision": "EXECUTE",
      "reason": "Price 0.08 meets condition (below threshold)"
    }
  }
}
```

**Response** (202 Accepted - Skipped):
```json
{
  "status": "warning",
  "code": "AGENT_SKIPPED",
  "message": "Agent decided not to execute payment intent",
  "data": {
    "intentId": "...",
    "status": "pending",
    "agentDecision": {
      "decision": "SKIP",
      "reason": "Price 0.15 does not meet condition (not below 0.10)"
    }
  }
}
```

---

## Mixer (Privacy) Endpoints

The mixer enables private transfers using ZK-SNARKs. Users deposit a fixed amount, then withdraw to any address without on-chain linkability.

**IMPORTANT:** Mixer endpoints return TX data for the **frontend wallet to sign and execute**. The backend does NOT sign mixer transactions - users control their own funds.

### Signing Model

| Endpoint | Who Signs | Description |
|----------|-----------|-------------|
| `/api/intents/:id/deposit` | **Frontend** (user's wallet) | User deposits to treasury pool |
| `/api/mixer/deposit` | **Frontend** (user's wallet) | User deposits to privacy mixer |
| `/api/mixer/withdraw` | **Frontend** (user's wallet) | User withdraws from mixer |
| `/api/intents/:id/execute` | Backend (agent wallet) | Agent executes from pool |
| `/api/agent/trigger` | Backend (agent wallet) | Agent executes from pool |

**Treasury Model**: Users deposit funds to the Settlement contract (pool). The agent can only execute payments from the pool when conditions are met. Users control their deposits; agents control execution logic.

### GET /api/mixer/info

Get mixer contract information and local Merkle tree state.

**Request**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "MIXER_INFO",
  "message": "Mixer information retrieved",
  "data": {
    "denomination": "0.1 MNT",
    "localDepositCount": 7,
    "localRoot": "0x0e4b9c97bbfeedd188653309a61ea97d52ad42f9307ad91db0271a707c7831f2",
    "onChain": {
      "contractAddress": "0xC75C1F03AA60Bd254e43Df21780abFa142070e9C",
      "currentRoot": "0x0e4b9c97bbfeedd188653309a61ea97d52ad42f9307ad91db0271a707c7831f2",
      "depositCount": 7,
      "denomination": "0.1 MNT"
    },
    "privacyModel": {
      "description": "Deposit funds, withdraw to any address without link",
      "anonymitySet": 7
    }
  }
}
```

### POST /api/mixer/generate-note

Generate a new deposit note. **SAVE THIS SECURELY - required for withdrawal**.

**Request Body**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "NOTE_GENERATED",
  "message": "Deposit note generated - SAVE THIS SECURELY!",
  "data": {
    "note": {
      "nullifier": "0xdbc6a36ae3a40885ef2caa5c8d4eedd48313b1909f554e7d9567c56bd44e43f2",
      "secret": "0x6b62b2870810dd6452b49d9907bd51583a9ce44c72398dfdeac7cc7a50319f31",
      "commitment": "0xbee39522c740cace6820e7d22d7feb9a6b084b4f20d22b3594acc789bf722a3a",
      "nullifierHash": "0x3803dad3099dd63d4e1329952acd15196c25694a60856c93099ed1cb208f3533"
    },
    "warning": "This note is required for withdrawal. If lost, funds cannot be recovered!",
    "instructions": [
      "1. Save this note in a secure location",
      "2. Use the commitment to deposit funds",
      "3. After deposit, use the note to withdraw to any address"
    ]
  }
}
```

### POST /api/mixer/deposit

Prepare deposit TX data. **Frontend must sign and broadcast.**

**Request Body**:
```json
{
  "commitment": "0xbee39522c740cace6820e7d22d7feb9a6b084b4f20d22b3594acc789bf722a3a"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `commitment` | string | Yes | Hex commitment from generated note |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "DEPOSIT_TX_PREPARED",
  "message": "Deposit transaction prepared. Sign and send from your wallet.",
  "data": {
    "tx": {
      "to": "0xC75C1F03AA60Bd254e43Df21780abFa142070e9C",
      "data": "0xb214faa5...",
      "value": "100000000000000000"
    },
    "commitment": "0xbee39522c740cace6820e7d22d7feb9a6b084b4f20d22b3594acc789bf722a3a",
    "amount": "0.1 MNT",
    "instructions": [
      "1. Sign this transaction with your connected wallet",
      "2. After confirmation, call /mixer/confirm-deposit with txHash",
      "3. Save your note securely for withdrawal"
    ]
  }
}
```

**Frontend Usage (ethers.js):**
```typescript
const { tx } = response.data;
const transaction = await signer.sendTransaction({
  to: tx.to,
  data: tx.data,
  value: tx.value
});
await transaction.wait();
// Then call /mixer/confirm-deposit with txHash
```

### POST /api/mixer/confirm-deposit

Confirm deposit after frontend executes TX. Updates local Merkle tree.

**Request Body**:
```json
{
  "txHash": "0x8d4163b360ba79a78703c92f55482333d85899f9a64eef5ea4156e6b433e5cc4",
  "commitment": "0xbee39522c740cace6820e7d22d7feb9a6b084b4f20d22b3594acc789bf722a3a"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `txHash` | string | Yes | Transaction hash from frontend execution |
| `commitment` | string | Yes | Original commitment from note |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "DEPOSIT_CONFIRMED",
  "message": "Deposit confirmed and recorded",
  "data": {
    "txHash": "0x8d4163b360ba79a78703c92f55482333d85899f9a64eef5ea4156e6b433e5cc4",
    "leafIndex": 6,
    "commitment": "0xbee39522c740cace6820e7d22d7feb9a6b084b4f20d22b3594acc789bf722a3a",
    "instructions": [
      "Save leafIndex: 6 with your note",
      "You can now withdraw to any address"
    ]
  }
}
```

### POST /api/mixer/withdraw

Prepare withdraw TX data. **Frontend must sign and broadcast.**

**Request Body**:
```json
{
  "note": {
    "nullifier": "0xdbc6a36ae3a40885ef2caa5c8d4eedd48313b1909f554e7d9567c56bd44e43f2",
    "secret": "0x6b62b2870810dd6452b49d9907bd51583a9ce44c72398dfdeac7cc7a50319f31",
    "commitment": "0xbee39522c740cace6820e7d22d7feb9a6b084b4f20d22b3594acc789bf722a3a",
    "nullifierHash": "0x3803dad3099dd63d4e1329952acd15196c25694a60856c93099ed1cb208f3533"
  },
  "leafIndex": 6,
  "recipient": "0x40C7fa08031dB321245a2f96E6064D2cF269f18B",
  "relayer": "0x0000000000000000000000000000000000000000",
  "fee": "0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `note` | object | Yes | The complete deposit note |
| `note.nullifier` | string | Yes | Random nullifier (hex) |
| `note.secret` | string | Yes | Random secret (hex) |
| `note.commitment` | string | Yes | Poseidon hash of nullifier+secret |
| `note.nullifierHash` | string | Yes | Hash of nullifier for double-spend prevention |
| `leafIndex` | number | Yes | Index returned from confirm-deposit |
| `recipient` | string | Yes | Address to receive funds |
| `relayer` | string | No | Relayer address (default: zero address) |
| `fee` | string | No | Relayer fee (default: "0") |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "WITHDRAW_TX_PREPARED",
  "message": "Withdrawal transaction prepared. Sign and send from your wallet.",
  "data": {
    "tx": {
      "to": "0xC75C1F03AA60Bd254e43Df21780abFa142070e9C",
      "data": "0xf9eed560...",
      "value": "0"
    },
    "recipient": "0x40C7fa08031dB321245a2f96E6064D2cF269f18B",
    "amount": "0.1 MNT",
    "privacy": "Withdrawal will be unlinkable to your deposit",
    "instructions": [
      "1. Sign this transaction with your connected wallet",
      "2. Funds will be sent to the recipient address",
      "3. No on-chain link between deposit and withdrawal"
    ]
  }
}
```

**Frontend Usage (ethers.js):**
```typescript
const { tx } = response.data;
// Note: Mantle L2 requires higher gas limits due to calldata costs
const transaction = await signer.sendTransaction({
  to: tx.to,
  data: tx.data,
  value: tx.value,
  gasLimit: 300000000  // Required for ZK proof verification on Mantle
});
await transaction.wait();
```

**Gas Considerations for Mantle L2:**
- ZK proof verification requires ~200-280M gas on Mantle Sepolia
- Always estimate gas before sending: `provider.estimateGas(tx)`
- The high gas is due to L2 calldata costs, not computation

### POST /api/mixer/simulate-withdraw

Simulate withdrawal to generate proof without executing on-chain.

**Request Body**: Same as `/api/mixer/withdraw`

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "SIMULATION_SUCCESS",
  "message": "Withdrawal simulation successful",
  "data": {
    "proof": "0x...",
    "root": "0x...",
    "nullifierHash": "0x...",
    "recipient": "0x...",
    "relayer": "0x...",
    "fee": "0",
    "canExecute": true
  }
}
```

---

## Oracle Endpoints (Pyth)

Real-time price feeds from Pyth Network for conditional payments and DeFi operations.

### GET /api/providers/oracle/feeds

List all supported price feeds on Mantle.

**Request**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "FEEDS_LIST",
  "message": "Supported Pyth Oracle price feeds on Mantle",
  "data": {
    "feeds": ["ETH/USD", "BTC/USD", "MNT/USD", "USDC/USD", "USDT/USD"],
    "pythContract": "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729",
    "network": "Mantle Sepolia"
  }
}
```

### GET /api/providers/oracle/price/:base/:quote

Get current price for a trading pair.

**Path Parameters**:
- `base` (string): Base currency (e.g., "ETH", "MNT")
- `quote` (string): Quote currency (e.g., "USD")

**Example**: `GET /api/providers/oracle/price/ETH/USD`

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "PRICE_FETCHED",
  "message": "Price for ETH/USD retrieved from Pyth Oracle",
  "data": {
    "pair": "ETH/USD",
    "price": 3147.24,
    "confidence": 31.47,
    "timestamp": 1767816393000,
    "source": "pyth"
  }
}
```

### GET /api/providers/oracle/price-with-proof/:base/:quote

Get price with cryptographic proof for on-chain verification.

**Path Parameters**:
- `base` (string): Base currency
- `quote` (string): Quote currency

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "PRICE_WITH_PROOF_FETCHED",
  "message": "Price with ZK-compatible proof for ETH/USD",
  "data": {
    "pair": "ETH/USD",
    "price": 3146.21,
    "proof": {
      "publishTime": 1767816474,
      "attestations": ["UE5BVQEAAAADuAEAAAA..."],
      "merkleProof": []
    }
  }
}
```

---

## RWA Endpoints (USDY & mETH)

Real World Asset integration for yield-bearing tokens on Mantle.

### GET /api/providers/rwa/assets

List all supported RWA assets.

**Request**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "ASSETS_LIST",
  "message": "Supported RWA assets on Mantle",
  "data": {
    "assets": [
      {
        "symbol": "USDY",
        "name": "US Dollar Yield",
        "contract": "0x5bE26527e817998A7206475496fDE1E68957c5A6",
        "underlying": "US Treasury Bills",
        "issuer": "Ondo Finance"
      },
      {
        "symbol": "mETH",
        "name": "Mantle Staked ETH",
        "contract": "0xcDA86A272531e8640cD7F1a92c01839911B90bb0",
        "underlying": "Ethereum",
        "issuer": "Mantle"
      }
    ],
    "network": "Mantle Sepolia"
  }
}
```

### GET /api/providers/rwa/yield/:asset

Get current yield rate for an RWA asset.

**Path Parameters**:
- `asset` (string): Asset symbol ("USDY" or "mETH")

**Example**: `GET /api/providers/rwa/yield/USDY`

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "YIELD_FETCHED",
  "message": "Yield rate for USDY retrieved",
  "data": {
    "asset": "USDY",
    "yieldRate": 525,
    "yieldPercent": "5.25%"
  }
}
```

### GET /api/providers/rwa/balance/:asset/:address

Get RWA token balance for an address.

**Path Parameters**:
- `asset` (string): Asset symbol
- `address` (string): Ethereum address

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "BALANCE_FETCHED",
  "message": "USDY balance for 0x...",
  "data": {
    "asset": "USDY",
    "balance": "1000.50",
    "address": "0x..."
  }
}
```

### GET /api/providers/rwa/yield/pending/:asset/:address

Get pending yield for a holder.

**Path Parameters**:
- `asset` (string): Asset symbol
- `address` (string): Holder address

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "PENDING_YIELD_FETCHED",
  "message": "Pending yield for 0x... on USDY",
  "data": {
    "asset": "USDY",
    "holder": "0x...",
    "pendingYield": "52.5",
    "pendingYieldFormatted": "52.500000"
  }
}
```

### GET /api/providers/rwa/yield/stats/:asset

Get yield statistics for an asset.

**Path Parameters**:
- `asset` (string): Asset symbol

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "YIELD_STATS_FETCHED",
  "message": "Yield statistics for USDY",
  "data": {
    "asset": "USDY",
    "totalDistributed": "15000.0",
    "holdersTracked": 125,
    "averageYield": "120.0",
    "currentRate": 5.25,
    "rateDisplay": "5.25% APY"
  }
}
```

### GET /api/providers/rwa/yield/history/:asset/:address

Get yield distribution history for a holder.

**Path Parameters**:
- `asset` (string): Asset symbol
- `address` (string): Holder address

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "YIELD_HISTORY_FETCHED",
  "message": "Yield distribution history for 0x...",
  "data": {
    "asset": "USDY",
    "holder": "0x...",
    "distributions": [
      {
        "timestamp": "2026-01-01T00:00:00Z",
        "amount": "10.5",
        "txHash": "0x..."
      }
    ],
    "totalReceived": "52.5"
  }
}
```

### POST /api/providers/rwa/yield/simulate

Simulate yield accrual for testing/demo purposes.

**Request Body**:
```json
{
  "asset": "USDY",
  "address": "0x...",
  "days": 30
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset` | string | Yes | Asset symbol |
| `address` | string | Yes | Holder address |
| `days` | number | Yes | Number of days to simulate |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "YIELD_SIMULATED",
  "message": "Simulated 30 days of yield accrual for 0x...",
  "data": {
    "asset": "USDY",
    "holder": "0x...",
    "daysSimulated": 30,
    "accruedYield": "43.15",
    "accruedYieldFormatted": "43.150000"
  }
}
```

### POST /api/providers/rwa/yield/distribute

Distribute yield to recipients.

**Request Body**:
```json
{
  "asset": "USDY",
  "recipients": ["0x...", "0x..."],
  "amounts": ["10.5", "20.3"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset` | string | Yes | Asset symbol |
| `recipients` | string[] | Yes | Array of recipient addresses |
| `amounts` | string[] | Yes | Array of amounts (same length as recipients) |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "YIELD_DISTRIBUTED",
  "message": "Yield distributed to 2 recipients",
  "data": {
    "asset": "USDY",
    "distributions": [
      {"recipient": "0x...", "amount": "10.5", "txHash": "0x..."},
      {"recipient": "0x...", "amount": "20.3", "txHash": "0x..."}
    ],
    "totalDistributed": "30.8"
  }
}
```

---

## Swap Endpoints (Merchant Moe)

DEX integration for token swaps on Mantle.

### GET /api/providers/swap/tokens

List all supported tokens for swaps.

**Request**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "TOKENS_LIST",
  "message": "Supported tokens for swaps on Merchant Moe",
  "data": {
    "tokens": ["WMNT", "USDT", "USDC", "WETH", "mETH"],
    "dex": "Merchant Moe",
    "router": "0xeaEE7EE68874218c3558b40063c42B82D3E7232a",
    "network": "Mantle Sepolia"
  }
}
```

### GET /api/providers/swap/quote

Get swap quote for a token pair.

**Query Parameters**:
- `tokenIn` (string): Input token symbol
- `tokenOut` (string): Output token symbol
- `amountIn` (string): Input amount in wei

**Example**: `GET /api/providers/swap/quote?tokenIn=MNT&tokenOut=USDC&amountIn=1000000000000000`

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "QUOTE_FETCHED",
  "message": "Swap quote for MNT -> USDC",
  "data": {
    "tokenIn": "MNT",
    "tokenOut": "USDC",
    "amountIn": "1000000000000000",
    "amountOut": "997000000000000",
    "priceImpact": 0.003,
    "route": ["MNT", "USDC"]
  }
}
```

**Note**: `amountIn` must be in wei (use BigInt). For 0.001 MNT, use `1000000000000000`.

### POST /api/providers/swap/execute

Execute a token swap.

**Request Body**:
```json
{
  "tokenIn": "MNT",
  "tokenOut": "USDC",
  "amountIn": "1000000000000000",
  "minAmountOut": "990000000000000",
  "recipient": "0x..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tokenIn` | string | Yes | Input token symbol |
| `tokenOut` | string | Yes | Output token symbol |
| `amountIn` | string | Yes | Input amount in wei |
| `minAmountOut` | string | Yes | Minimum output amount (slippage protection) |
| `recipient` | string | Yes | Address to receive output tokens |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "SWAP_EXECUTED",
  "message": "Swap executed successfully via Merchant Moe",
  "data": {
    "txHash": "0x...",
    "amountIn": "1000000000000000",
    "amountOut": "997000000000000",
    "effectivePrice": 0.997
  }
}
```

---

## Lending Endpoints (Lendle)

Lending protocol integration for supply, borrow, and manage positions.

### GET /api/providers/lending/stats

Get lending protocol statistics.

**Request**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "LENDING_STATS_FETCHED",
  "message": "Lending protocol statistics",
  "data": {
    "totalSupplied": "15002000.0",
    "totalBorrowed": "7000800.0",
    "markets": 3,
    "averageUtilization": 43.33
  }
}
```

### POST /api/providers/lending/supply

Supply assets to lending pool.

**Request Body**:
```json
{
  "asset": "WMNT",
  "amount": "1000000000000000",
  "address": "0x..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset` | string | Yes | Asset symbol (WMNT, USDT, USDC, etc.) |
| `amount` | string | Yes | Amount in wei |
| `address` | string | Yes | Supplier address |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "LENDING_SUPPLY_SUCCESS",
  "message": "Supplied 1000000000000000 WMNT to Lendle",
  "data": {
    "asset": "WMNT",
    "amount": "1000000000000000",
    "txHash": "0x..."
  }
}
```

**Tested with**: 0.001 WMNT (1000000000000000 wei) ✅

### POST /api/providers/lending/borrow

Borrow assets from lending pool.

**Request Body**:
```json
{
  "asset": "WMNT",
  "amount": "500000000000000",
  "address": "0x..."
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "LENDING_BORROW_SUCCESS",
  "message": "Borrowed 500000000000000 WMNT from Lendle",
  "data": {
    "asset": "WMNT",
    "amount": "500000000000000",
    "txHash": "0x..."
  }
}
```

**Tested with**: 0.0005 WMNT (500000000000000 wei) ✅

### POST /api/providers/lending/withdraw

Withdraw supplied assets from lending pool.

**Request Body**:
```json
{
  "asset": "WMNT",
  "amount": "500000000000000",
  "address": "0x..."
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "LENDING_WITHDRAW_SUCCESS",
  "message": "Withdrew 500000000000000 WMNT from Lendle",
  "data": {
    "asset": "WMNT",
    "amount": "500000000000000",
    "txHash": "0x..."
  }
}
```

### POST /api/providers/lending/repay

Repay borrowed assets.

**Request Body**:
```json
{
  "asset": "WMNT",
  "amount": "500000000000000",
  "address": "0x..."
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "LENDING_REPAY_SUCCESS",
  "message": "Repaid 500000000000000 WMNT to Lendle",
  "data": {
    "asset": "WMNT",
    "amount": "500000000000000",
    "txHash": "0x..."
  }
}
```

---

## KYC Endpoints

On-chain KYC attestations for RWA compliance.

### GET /api/providers/kyc/stats

Get KYC statistics.

**Request**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "KYC_STATS_FETCHED",
  "message": "KYC statistics",
  "data": {
    "totalVerified": 3,
    "byLevel": {
      "none": 0,
      "basic": 1,
      "enhanced": 1,
      "institutional": 1
    },
    "byJurisdiction": {
      "US": 1,
      "EU": 1,
      "SG": 1
    }
  }
}
```

### GET /api/providers/kyc/status/:address

Get KYC status for an address.

**Path Parameters**:
- `address` (string): Ethereum address

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "KYC_STATUS_FETCHED",
  "message": "KYC status for 0x...",
  "data": {
    "address": "0x...",
    "verified": true,
    "level": "basic",
    "provider": "SnowRail Mock KYC"
  }
}
```

### POST /api/providers/kyc/register

Register KYC for an address.

**Request Body**:
```json
{
  "address": "0x...",
  "level": "basic",
  "jurisdiction": "US"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | Ethereum address |
| `level` | string | Yes | KYC level: "basic", "enhanced", or "institutional" |
| `jurisdiction` | string | Yes | Jurisdiction code: "US", "EU", "SG", etc. |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "KYC_REGISTERED",
  "message": "KYC registered for 0x...",
  "data": {
    "address": "0x...",
    "verified": true,
    "level": "basic",
    "provider": "SnowRail Mock KYC",
    "expiresAt": 1799352464,
    "jurisdiction": "US"
  }
}
```

### POST /api/providers/kyc/verify

Verify that an address meets minimum KYC requirement.

**Request Body**:
```json
{
  "address": "0x...",
  "minLevel": "basic"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | Ethereum address |
| `minLevel` | string | Yes | Minimum required level |

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "KYC_VERIFIED",
  "message": "KYC verification for 0x...",
  "data": {
    "address": "0x...",
    "requiredLevel": "basic",
    "meetsRequirement": true
  }
}
```

### GET /api/providers/kyc/attestation/:address

Get on-chain KYC attestation.

**Path Parameters**:
- `address` (string): Ethereum address

**Response** (200 OK):
```json
{
  "status": "success",
  "code": "KYC_ATTESTATION_FETCHED",
  "message": "KYC attestation for 0x...",
  "data": {
    "signature": "0xabab...",
    "expiry": 1767820075,
    "level": "basic"
  }
}
```

---

## MCP Protocol Endpoints

Model Context Protocol (MCP) enables AI assistants to interact with the treasury.

### GET /mcp/health

Health check for MCP endpoint.

**Response** (200 OK):
```json
{
  "status": "ok",
  "server": "cronos-x402-treasury",
  "version": "1.0.0",
  "protocol": "2024-11-05"
}
```

### GET /mcp/tools

List all available MCP tools.

**Response** (200 OK):
```json
{
  "server": {
    "name": "cronos-x402-treasury",
    "version": "1.0.0"
  },
  "protocolVersion": "2024-11-05",
  "tools": [
    {
      "name": "create_payment_intent",
      "description": "Create a new payment intent...",
      "inputSchema": { ... }
    },
    {
      "name": "list_payment_intents",
      "description": "List all payment intents...",
      "inputSchema": { ... }
    },
    {
      "name": "get_payment_intent",
      "description": "Get a specific payment intent...",
      "inputSchema": { ... }
    },
    {
      "name": "trigger_agent",
      "description": "Trigger agent to evaluate and execute...",
      "inputSchema": { ... }
    },
    {
      "name": "get_treasury_status",
      "description": "Get treasury balance and status...",
      "inputSchema": { ... }
    }
  ]
}
```

### POST /mcp

JSON-RPC 2.0 endpoint for MCP protocol.

#### Method: tools/call - get_treasury_status

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_treasury_status",
    "arguments": {}
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"treasury\":{\"settlementContract\":\"0xae6E14caD8D4f43947401fce0E4717b8D17b4382\",\"backendWallet\":\"0x40C7fa08031dB321245a2f96E6064D2cF269f18B\",\"balance\":\"47.345645675 CRO\"}}"
    }]
  }
}
```

#### Method: tools/call - create_payment_intent

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create_payment_intent",
    "arguments": {
      "amount": "0.001",
      "currency": "MNT",
      "recipient": "0x0000000000000000000000000000000000000004",
      "conditionType": "manual",
      "conditionValue": "true"
    }
  }
}
```

#### Method: tools/call - trigger_agent

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "trigger_agent",
    "arguments": {
      "intentId": "45269aca-3adb-4531-8e83-26cbbdc5752a"
    }
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"message\":\"Payment intent executed successfully by agent\",\"intentId\":\"45269aca-3adb-4531-8e83-26cbbdc5752a\",\"status\":\"executed\",\"txHash\":\"0xcb929fc217172a57646bef3199a414efece79ac3766e8744fae1185499aebcc8\"}"
    }]
  }
}
```

---

## Smart Contract: Settlement

The Settlement contract holds treasury funds and executes authorized transfers with EIP-712 signature verification.

### Contract Address
- **Testnet**: `0xae6E14caD8D4f43947401fce0E4717b8D17b4382`

### Contract Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISettlement {
    // ============ Events ============
    event PaymentExecuted(bytes32 indexed intentHash, address indexed recipient, uint256 amount);
    event Deposited(address indexed sender, uint256 amount);
    event ExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);

    // ============ Errors ============
    error InsufficientBalance(uint256 requested, uint256 available);
    error IntentAlreadyExecuted(bytes32 intentHash);
    error Unauthorized(address caller);
    error TransferFailed(address recipient, uint256 amount);
    error ZeroAddress();
    error ZeroAmount();
    error InvalidSignature();
    error InvalidSigner(address recovered, address expected);
    error InvalidNonce(bytes32 intentHash, uint256 provided, uint256 expected);

    // ============ State Variables ============
    function owner() external view returns (address);
    function executor() external view returns (address);
    function executedIntents(bytes32 intentHash) external view returns (bool);
    function intentNonces(bytes32 intentHash) external view returns (uint256);

    // ============ Main Function ============
    function executeSettlement(
        bytes32 intentHash,
        address payable recipient,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external;

    // ============ View Functions ============
    function getBalance() external view returns (uint256);
    function isIntentExecuted(bytes32 intentHash) external view returns (bool);
    function getIntentNonce(bytes32 intentHash) external view returns (uint256);

    // ============ Admin Functions ============
    function updateExecutor(address newExecutor) external;

    // ============ Receive ETH ============
    receive() external payable;
}
```

### EIP-712 Signature Structure

The contract uses EIP-712 typed data for signature verification:

```
Domain:
  name: "CronosSettlement"
  version: "1"
  chainId: 338 (testnet)
  verifyingContract: <contract address>

Types:
  Settlement:
    - bytes32 intentHash
    - address recipient
    - uint256 amount
    - uint256 nonce
```

### Function: executeSettlement

Executes a settlement transfer with signature verification.

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `intentHash` | bytes32 | Hash of the payment intent (used as unique ID) |
| `recipient` | address payable | Address to receive the funds |
| `amount` | uint256 | Amount of CRO to transfer (in wei) |
| `nonce` | uint256 | Current nonce for this intent (prevents replay) |
| `signature` | bytes | EIP-712 signature from executor |

**Execution Flow**:
1. Verify nonce matches `intentNonces[intentHash]`
2. Construct EIP-712 typed data hash
3. Recover signer from signature
4. Verify signer is authorized executor
5. Increment nonce (prevents signature replay)
6. Validate recipient and amount
7. Check intent not already executed
8. Verify sufficient balance
9. Mark intent as executed
10. Transfer CRO to recipient
11. Emit `PaymentExecuted` event

**Revert Conditions**:
- `InvalidNonce`: Nonce doesn't match expected value
- `InvalidSigner`: Signature not from authorized executor
- `ZeroAddress`: Recipient is zero address
- `ZeroAmount`: Amount is zero
- `IntentAlreadyExecuted`: Intent already executed
- `InsufficientBalance`: Contract balance too low
- `TransferFailed`: CRO transfer failed

---

## Data Types

### PaymentIntent

```typescript
interface PaymentIntent {
  intentId: string;           // UUID
  amount: string;             // Numeric string (e.g., "1.5")
  currency: string;           // 'CRO' | 'USDC' | 'USDT'
  recipient: string;          // Ethereum address (0x...)
  condition: {
    type: 'manual' | 'price-below';
    value: string;            // "true" for manual, price for price-below
  };
  status: 'pending' | 'executed' | 'failed';
  createdAt: string;          // ISO 8601 timestamp
  txHash?: string;            // Transaction hash (if executed)
}
```

### AgentDecision

```typescript
interface AgentDecision {
  decision: 'EXECUTE' | 'SKIP';
  reason: string;
  verificationStatus?: {
    checked: boolean;
    verified: boolean;
  };
}
```

### DepositNote

```typescript
interface DepositNote {
  nullifier: string;          // 0x-prefixed hex (32 bytes)
  secret: string;             // 0x-prefixed hex (32 bytes)
  commitment: string;         // Poseidon(nullifier, secret)
  nullifierHash: string;      // Hash for double-spend prevention
}
```

### ApiResponse

```typescript
interface ApiResponse<T = unknown> {
  status: 'success' | 'warning' | 'error';
  code: string;               // Specific response code
  message: string;            // Human-readable message
  data?: T;                   // Response payload
  details?: Record<string, unknown>;  // Additional details (errors)
}
```

---

## Error Codes

### Intent Errors
| Code | HTTP | Description |
|------|------|-------------|
| `INTENT_CREATED` | 201 | Payment intent created successfully |
| `INTENT_RETRIEVED` | 200 | Intent retrieved successfully |
| `INTENTS_RETRIEVED` | 200 | Intent list retrieved |
| `INTENT_EXECUTED` | 200 | Intent executed on-chain |
| `INTENT_NOT_FOUND` | 404 | Intent ID does not exist |
| `INTENT_ALREADY_COMPLETED` | 409 | Intent already executed |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `EXECUTION_FAILED` | 500 | On-chain execution failed |

### Agent Errors
| Code | HTTP | Description |
|------|------|-------------|
| `AGENT_EXECUTED` | 200 | Agent executed the intent |
| `AGENT_SKIPPED` | 202 | Agent decided not to execute |

### Mixer Errors
| Code | HTTP | Description |
|------|------|-------------|
| `MIXER_INFO` | 200 | Mixer info retrieved |
| `NOTE_GENERATED` | 200 | Deposit note generated |
| `DEPOSIT_TX_PREPARED` | 200 | Deposit TX ready for frontend signing |
| `DEPOSIT_CONFIRMED` | 200 | Deposit confirmed after frontend execution |
| `WITHDRAW_TX_PREPARED` | 200 | Withdraw TX ready for frontend signing |
| `COMMITMENT_REQUIRED` | 400 | Missing commitment in request |
| `INVALID_NOTE` | 400 | Note data is invalid |
| `INVALID_RECIPIENT` | 400 | Recipient address invalid |
| `ALREADY_WITHDRAWN` | 400 | Note already used for withdrawal |
| `INVALID_ROOT` | 400 | Merkle root not recognized |
| `TX_NOT_FOUND` | 400 | Transaction hash not found on-chain |
| `TX_FAILED` | 400 | Transaction failed on-chain |
| `DEPOSIT_EVENT_NOT_FOUND` | 400 | Deposit event not in transaction |
| `MIXER_NOT_DEPLOYED` | 500 | Mixer contract not available |

---

## Example Workflows

### 1. Create and Execute Payment Intent (Backend signs)

```bash
# Step 1: Create intent
curl -X POST http://localhost:4000/api/intents \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "0.001",
    "currency": "MNT",
    "recipient": "0x0000000000000000000000000000000000000001",
    "condition": {"type": "manual", "value": "true"}
  }'

# Step 2: Trigger agent (backend signs and executes)
curl -X POST http://localhost:4000/api/agent/trigger \
  -H "Content-Type: application/json" \
  -d '{"intentId": "<returned-uuid>"}'
```

### 2. Private Transfer via Mixer (Frontend signs)

```bash
# Step 1: Generate note (SAVE THIS!)
NOTE=$(curl -s -X POST http://localhost:4000/api/mixer/generate-note)
echo $NOTE | jq .data.note

# Step 2: Get deposit TX data
TX_DATA=$(curl -s -X POST http://localhost:4000/api/mixer/deposit \
  -H "Content-Type: application/json" \
  -d '{"commitment": "<commitment-from-note>"}')
echo $TX_DATA | jq .data.tx

# Step 3: Frontend signs and sends TX (ethers.js example)
# const tx = await signer.sendTransaction({ to, data, value });
# const txHash = tx.hash;

# Step 4: Confirm deposit with txHash
curl -X POST http://localhost:4000/api/mixer/confirm-deposit \
  -H "Content-Type: application/json" \
  -d '{"txHash": "<tx-hash>", "commitment": "<commitment>"}'
# Response includes leafIndex - SAVE THIS!

# Step 5: Get withdraw TX data
WITHDRAW_TX=$(curl -s -X POST http://localhost:4000/api/mixer/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "note": { <full-note-object> },
    "leafIndex": <from-confirm-deposit>,
    "recipient": "0x..."
  }')
echo $WITHDRAW_TX | jq .data.tx

# Step 6: Frontend signs and sends withdraw TX
# const tx = await signer.sendTransaction({ to, data, value, gasLimit: 500000 });
```

### 3. MCP Integration

```bash
# Get treasury status
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {"name": "get_treasury_status", "arguments": {}}
  }'

# Create and execute via MCP
curl -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "create_payment_intent",
      "arguments": {
        "amount": "0.001",
        "currency": "MNT",
        "recipient": "0x...",
        "conditionType": "manual",
        "conditionValue": "true"
      }
    }
  }'
```

---

## Contract Addresses (Mantle Sepolia)

| Contract | Address | Status |
|----------|---------|--------|
| Settlement | `0xae6E14caD8D4f43947401fce0E4717b8D17b4382` | Deployed |
| ZKMixer | `0xC75C1F03AA60Bd254e43Df21780abFa142070e9C` | **Deployed & Verified** |
| Pyth Oracle | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` | Active |
| USDY (Ondo) | `0x5bE26527e817998A7206475496fDE1E68957c5A6` | RWA Token |
| mETH (Mantle) | `0xcDA86A272531e8640cD7F1a92c01839911B90bb0` | Staking Token |
| WMNT | `0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8` | Wrapped MNT |
| Merchant Moe Router | `0xeaEE7EE68874218c3558b40063c42B82D3E7232a` | DEX |

**Explorer**: https://sepolia.mantlescan.xyz

### Verified On-Chain Transactions

| Operation | TX Hash | Block |
|-----------|---------|-------|
| ZK Mixer Deposit | `0xc01bb38fcb1d8ab1b18cfe5097bf31fda490413e557ad2a2230a206123a1e396` | 33190889 |
| ZK Withdraw (with proof) | `0xba7335b2365985b2a461772aa27f8b0e7b9bd1541a2d3c69c06bb85af0cef1b9` | 33190920 |

These transactions prove the ZK system is working correctly on Mantle Sepolia.

---

## Rate Limits & Best Practices

1. **No rate limits** in development mode
2. **Always save deposit notes** - they cannot be recovered
3. **Use checksummed addresses** to avoid validation errors
4. **Check intent status** before re-executing
5. **Monitor txHash** on explorer for confirmation
