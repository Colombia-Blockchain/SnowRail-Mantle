# SnowRail - E2E System Architecture

## System Flow

```
USER (Wallet)
       │
       │ 1. Connect Wallet
       ↓
┌──────────────────────────────────────┐
│  FRONTEND (Next.js 14, Port 3000)   │
│  ├── Dashboard                       │
│  ├── CreateIntentForm                │
│  ├── IntentList                      │
│  └── TriggerAgentButton              │
└──────────────────────────────────────┘
       │
       │ 2. Create Intent / Trigger Agent
       ↓
┌──────────────────────────────────────────────────────────────┐
│  BACKEND (Fastify, Port 4000)                               │
│  ├── Intent Routes                                          │
│  │   ├── POST /api/intents           (Create)               │
│  │   ├── GET /api/intents            (List)                 │
│  │   ├── GET /api/intents/:id        (Get One)              │
│  │   ├── POST /api/intents/:id/deposit    (Prepare Deposit) │
│  │   ├── POST /api/intents/:id/confirm-deposit (Confirm)    │
│  │   └── POST /api/intents/:id/execute     (Execute)        │
│  ├── Agent Routes                                           │
│  │   └── POST /api/agent/trigger     (Trigger Agent)        │
│  ├── Mixer Routes (ZK Privacy)                              │
│  │   ├── GET /api/mixer/info                                │
│  │   ├── POST /api/mixer/generate-note                      │
│  │   ├── POST /api/mixer/deposit                            │
│  │   ├── POST /api/mixer/confirm-deposit                    │
│  │   ├── POST /api/mixer/withdraw                           │
│  │   └── POST /api/mixer/simulate-withdraw                  │
│  ├── Provider Routes (LEGO Architecture)                    │
│  │   ├── /api/providers/oracle/*     (Pyth Oracle)          │
│  │   ├── /api/providers/rwa/*        (USDY/mETH)            │
│  │   ├── /api/providers/swap/*       (Merchant Moe)         │
│  │   ├── /api/providers/lending/*    (Lendle)               │
│  │   └── /api/providers/kyc/*        (KYC Attestations)     │
│  ├── Services                                               │
│  │   ├── IntentService               (Store & Manage)       │
│  │   ├── AgentService                (AI Logic)             │
│  │   ├── WalletService               (Key Management)       │
│  │   ├── MixerService                (ZK Privacy)           │
│  │   ├── ProviderService             (LEGO Providers)       │
│  │   └── Orchestrator                (x402 Execution)       │
│  └── Health Endpoints                                       │
│      ├── GET /health                                        │
│      ├── GET /health/ready                                  │
│      └── GET /health/foundation                             │
└──────────────────────────────────────────────────────────────┘
       │
       │ 3. Agent Evaluates Intent
       │ 4. Sign Transaction
       │ 5. Execute on Blockchain
       ↓
┌──────────────────────────────────────┐
│  BLOCKCHAIN (Mantle Sepolia)         │
│  ├── Settlement Contract             │
│  │   └── executeSettlement()         │
│  ├── ZKMixer Contract                │
│  │   └── deposit() / withdraw()      │
│  └── Chain ID: 5003                  │
└──────────────────────────────────────┘
       │
       │ 6. Transaction Confirmed
       ↓
┌──────────────────────────────────────┐
│  FRONTEND (Display Results)          │
│  ├── Update Intent Status            │
│  ├── Show TX Hash                    │
│  └── Link to MantleScan              │
└──────────────────────────────────────┘
```

---

## API Integration

### Intent Flow (with Treasury Deposits)

```
1. Create Intent  →  POST /api/intents
2. Deposit Funds  →  POST /api/intents/:id/deposit (get TX data)
                  →  Frontend signs & sends TX
                  →  POST /api/intents/:id/confirm-deposit
3. Execute        →  POST /api/intents/:id/execute
                     (or POST /api/agent/trigger)
```

### Create Intent
```
POST /api/intents
{
  amount: string,
  currency: string,
  recipient: string,
  condition: {
    type: 'manual' | 'price-below',
    value: string
  }
}

Response:
{
  intentId: string,
  status: 'pending',
  createdAt: string
}
```

### Deposit to Intent (Frontend Signs)
```
POST /api/intents/:id/deposit

Response:
{
  tx: { to, value, data },  // Frontend signs this
  instructions: [...]
}
```

### Trigger Agent
```
POST /api/agent/trigger
{
  intentId: string
}

Response:
{
  status: 'success' | 'warning' | 'error',
  message: string,
  data: {
    intentId: string,
    status: 'executed' | 'pending',
    txHash?: string,
    agentDecision: {
      decision: 'EXECUTE' | 'SKIP',
      reason: string
    }
  }
}
```

### Provider Endpoints (50+ total)
```
Oracle:   GET /api/providers/oracle/price/:base/:quote
RWA:      GET /api/providers/rwa/yield/:asset
Swap:     GET /api/providers/swap/quote
Lending:  POST /api/providers/lending/supply
KYC:      GET /api/providers/kyc/status/:address
Mixer:    POST /api/mixer/deposit
```

See [LLM_API_REFERENCE.md](./docs/LLM_API_REFERENCE.md) for complete documentation.

---

## Security Flow

```
1. Frontend Connection
   └── Wallet provides user pubkey
   └── No private keys sent to backend

2. Intent Creation
   └── User-signed intent metadata
   └── Backend validates

3. Agent Execution
   └── Backend wallet (non-custodial)
   └── Signs transactions autonomously
   └── All on-chain records

4. Settlement
   └── Smart contract enforces rules
   └── Recipient specified in contract
   └── Immutable on blockchain
```

---

## Execution Timeline

```
T+0s:    User clicks "Create Intent"
         └── Frontend: Form submitted
         └── Backend: POST /api/intents

T+0.5s:  Backend processes
         └── Validates fields
         └── Returns intentId

T+1s:    User clicks "Trigger Agent"
         └── Frontend: POST /api/agent/trigger

T+1.5s:  Agent evaluates
         └── Checks conditions
         └── Makes decision

T+2s:    If EXECUTE decision:
         └── Sign transaction
         └── Send to blockchain

T+3-4s:  Transaction confirmed
         └── Update status to EXECUTED
         └── Return txHash

T+4.5s:  Frontend receives response
         └── Display txHash
         └── Link to MantleScan
```

---

## Validation Checkpoints

| Checkpoint | Expected Result |
|-----------|-----------------|
| Frontend Loads | No console errors |
| Wallet Connects | Address displayed |
| Intent Creates | Success message, intent in list |
| Agent Triggers | Response within 3 seconds |
| TX Executed | txHash returned |
| Status Updates | "EXECUTED" shown |
| MantleScan Shows | TX confirmed on-chain |

---

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 404 on API calls | Backend port wrong | Check `NEXT_PUBLIC_API_URL=http://localhost:4000` |
| Wallet won't connect | Chain mismatch | Switch to Mantle Sepolia (5003) |
| Agent always skips | Conditions not met | Use "Manual" trigger |
| TX fails | No gas | Ensure wallet has testnet MNT |
| CORS errors | Origin not allowed | Check backend CORS config |
| 402 on execute | Intent not funded | Call `/intents/:id/deposit` first |
| ZK proof fails | Gas too low | Use gasLimit: 300000000 for mixer withdraw |

---

## Reference Files

- [Backend README](./apps/backend/README.md)
- [LLM API Reference](./docs/LLM_API_REFERENCE.md)
- [LLM Project Context](./docs/LLM_PROJECT_CONTEXT.md)
