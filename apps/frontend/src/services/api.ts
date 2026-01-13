const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// --- Types ---

export interface Condition {
  type: 'manual' | 'price-below';
  value: string;
}

export interface AgentDecision {
  decision: 'EXECUTE' | 'SKIP';
  reason: string;
}

export interface PaymentIntent {
  intentId: string;
  amount: string;
  currency: string;
  recipient: string;
  condition: Condition;
  status: 'pending' | 'funded' | 'executed' | 'failed';
  createdAt: string;
  txHash?: string;
  agentDecision?: AgentDecision;
}

export interface CreateIntentRequest {
  amount: string;
  currency: string;
  recipient: string;
  condition: Condition;
}

export interface TxData {
  to: string;
  value: string;
  data: string;
  gasLimit?: string;
}

export interface MixerInfo {
  denomination: string;
  localDepositCount: number;
  localRoot: string;
  onChain: {
    contractAddress: string;
    currentRoot: string;
    depositCount: number;
    denomination: string;
  };
  privacyModel: {
    description: string;
    anonymitySet: number;
  };
}

export interface MixerNote {
  nullifier: string;
  secret: string;
  commitment: string; // Poseidon hash
  nullifierHash: string;
}

export interface GeneratedNoteResponse {
  note: MixerNote;
  warning: string;
  instructions: string[];
}

export interface OraclePrice {
  pair: string;
  price: number;
  confidence: number;
  timestamp: number;
  source: string;
}

export interface OraclePriceProof {
  pair: string;
  price: number;
  proof: {
    publishTime: number;
    attestations: string[];
    merkleProof: any[]; // Adjust if specific structure is known
  };
}

export interface RwaAsset {
  symbol: string;
  name: string;
  contract: string;
  underlying: string;
  issuer: string;
}

export interface RwaYield {
  asset: string;
  apy: number;
  timestamp: string;
}

// --- API Functions ---

// Helper for requests
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const result = await response.json();

  if (result.status === 'error' && !result.data) {
    throw new Error(result.message || 'API Error');
  }

  // Handle 402 or other status codes where data might still be present or needed
  if (!response.ok) {
    throw new Error(result.message || `Request failed with status ${response.status}`);
  }

  return result.data;
}

// --- Payment Intents ---

export async function createIntent(data: CreateIntentRequest): Promise<PaymentIntent> {
  return request<PaymentIntent>('/api/intents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function fetchIntents(): Promise<PaymentIntent[]> {
  // The API returns { data: [...] } so request<T> returns [...]
  return request<PaymentIntent[]>('/api/intents');
}

export async function getIntent(id: string): Promise<PaymentIntent> {
  return request<PaymentIntent>(`/api/intents/${id}`);
}

export async function getDepositTx(id: string): Promise<{ tx: TxData; intentId: string; instructions: string[] }> {
  return request(`/api/intents/${id}/deposit`, { method: 'POST' });
}

export async function confirmIntentDeposit(id: string, txHash: string): Promise<PaymentIntent> {
  return request<PaymentIntent>(`/api/intents/${id}/confirm-deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash }),
  });
}

export async function executeIntent(id: string): Promise<PaymentIntent> {
  return request<PaymentIntent>(`/api/intents/${id}/execute`, { method: 'POST' });
}

// --- Agent ---

export async function triggerAgent(intentId: string): Promise<PaymentIntent> {
  // API returns 200 (Executed) or 202 (Skipped). request() handles 200 OK.
  // 202 Accepted also fits response.ok. 
  return request<PaymentIntent>('/api/agent/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intentId }),
  });
}

// --- Mixer ---

export async function getMixerInfo(): Promise<MixerInfo> {
  return request<MixerInfo>('/api/mixer/info');
}

export async function generateMixerNote(): Promise<GeneratedNoteResponse> {
  return request<GeneratedNoteResponse>('/api/mixer/generate-note', { method: 'POST' });
}

export async function getMixerDepositTx(commitment: string): Promise<{ tx: TxData; commitment: string; instructions: string[] }> {
  return request('/api/mixer/deposit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commitment }),
  });
}

export async function confirmMixerDeposit(txHash: string, commitment: string): Promise<{ txHash: string; leafIndex: number }> {
  return request('/api/mixer/confirm-deposit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash, commitment }),
  });
}

export async function getMixerWithdrawTx(
  note: MixerNote,
  recipient: string,
  leafIndex: number,
  relayer: string = '0x0000000000000000000000000000000000000000',
  fee: string = '0'
): Promise<{ tx: TxData; recipient: string; instructions: string[] }> {
  return request('/api/mixer/withdraw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note, recipient, leafIndex, relayer, fee }),
  });
}

export async function simulateMixerWithdraw(
  note: MixerNote,
  recipient: string,
  leafIndex: number
): Promise<{ proof: string; root: string; canExecute: boolean }> {
  return request('/api/mixer/simulate-withdraw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      note,
      recipient,
      leafIndex,
      relayer: '0x0000000000000000000000000000000000000000',
      fee: '0'
    }),
  });
}

// --- Oracle ---

export async function getOracleFeeds(): Promise<{ feeds: string[]; pythContract: string }> {
  return request('/api/providers/oracle/feeds');
}

export async function getOraclePrice(base: string, quote: string): Promise<OraclePrice> {
  return request<OraclePrice>(`/api/providers/oracle/price/${base}/${quote}`);
}

export async function getOraclePriceWithProof(base: string, quote: string): Promise<OraclePriceProof> {
  return request<OraclePriceProof>(`/api/providers/oracle/price-with-proof/${base}/${quote}`);
}

// --- RWAs ---

export async function getRwaAssets(): Promise<{ assets: RwaAsset[] }> {
  return request('/api/providers/rwa/assets');
}

export async function getRwaYield(asset: string): Promise<RwaYield> {
  return request<RwaYield>(`/api/providers/rwa/yield/${asset}`);
}

