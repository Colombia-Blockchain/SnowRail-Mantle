/**
 * Provider API Routes
 *
 * Exposes the LEGO providers via REST API for the 4 hackathon tracks:
 * - /api/providers/status - Health check for all providers
 * - /api/providers/oracle/* - Pyth Oracle (AI & Oracles track)
 * - /api/providers/rwa/* - USDY/mETH (RWA track)
 * - /api/providers/swap/* - Merchant Moe DEX (DeFi track)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getProviderService } from '../../services/provider-service';

interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  code: string;
  message: string;
  data?: T;
  error?: string;
}

export async function providerRoutes(fastify: FastifyInstance): Promise<void> {
  // ============================================
  // PROVIDER STATUS
  // ============================================

  fastify.get('/providers/status', async (request, reply): Promise<ApiResponse> => {
    try {
      const providerService = getProviderService();
      const status = await providerService.getStatus();

      return {
        status: 'success',
        code: 'PROVIDERS_STATUS',
        message: 'Provider status retrieved',
        data: status,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'PROVIDER_ERROR',
        message: 'Failed to get provider status',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // ORACLE ROUTES (Track 2: AI & Oracles)
  // ============================================

  // GET /api/providers/oracle/price/:base/:quote
  fastify.get<{
    Params: { base: string; quote: string };
  }>('/providers/oracle/price/:base/:quote', async (request, reply): Promise<ApiResponse> => {
    try {
      const { base, quote } = request.params;
      const providerService = getProviderService();
      const priceData = await providerService.getPrice(base, quote);

      return {
        status: 'success',
        code: 'PRICE_FETCHED',
        message: `Price for ${base}/${quote} retrieved from Pyth Oracle`,
        data: priceData,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'ORACLE_ERROR',
        message: 'Failed to fetch price',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/oracle/price-with-proof/:base/:quote
  fastify.get<{
    Params: { base: string; quote: string };
  }>('/providers/oracle/price-with-proof/:base/:quote', async (request, reply): Promise<ApiResponse> => {
    try {
      const { base, quote } = request.params;
      const providerService = getProviderService();
      const priceData = await providerService.getPriceWithProof(base, quote);

      return {
        status: 'success',
        code: 'PRICE_WITH_PROOF_FETCHED',
        message: `Price with ZK-compatible proof for ${base}/${quote}`,
        data: priceData,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'ORACLE_ERROR',
        message: 'Failed to fetch price with proof',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/oracle/feeds
  fastify.get('/providers/oracle/feeds', async (request, reply): Promise<ApiResponse> => {
    return {
      status: 'success',
      code: 'FEEDS_LIST',
      message: 'Supported Pyth Oracle price feeds on Mantle',
      data: {
        feeds: ['ETH/USD', 'BTC/USD', 'MNT/USD', 'USDC/USD', 'USDT/USD'],
        pythContract: process.env.PYTH_ADDRESS || '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729',
        network: 'Mantle Sepolia',
      },
    };
  });

  // ============================================
  // RWA ROUTES (Track 1: RWA/RealFi)
  // ============================================

  // GET /api/providers/rwa/yield/:asset
  fastify.get<{
    Params: { asset: string };
  }>('/providers/rwa/yield/:asset', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset } = request.params;
      const providerService = getProviderService();
      const yieldData = await providerService.getRWAYield(asset);

      return {
        status: 'success',
        code: 'YIELD_FETCHED',
        message: `Yield rate for ${asset} retrieved`,
        data: yieldData,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'RWA_ERROR',
        message: 'Failed to fetch yield rate',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/rwa/balance/:asset/:address
  fastify.get<{
    Params: { asset: string; address: string };
  }>('/providers/rwa/balance/:asset/:address', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset, address } = request.params;
      const providerService = getProviderService();
      const balanceData = await providerService.getRWABalance(asset, address);

      return {
        status: 'success',
        code: 'BALANCE_FETCHED',
        message: `${asset} balance for ${address}`,
        data: balanceData,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'RWA_ERROR',
        message: 'Failed to fetch balance',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/rwa/assets
  fastify.get('/providers/rwa/assets', async (request, reply): Promise<ApiResponse> => {
    return {
      status: 'success',
      code: 'ASSETS_LIST',
      message: 'Supported RWA assets on Mantle',
      data: {
        assets: [
          {
            symbol: 'USDY',
            name: 'US Dollar Yield',
            contract: process.env.USDY_ADDRESS || '0x5bE26527e817998A7206475496fDE1E68957c5A6',
            underlying: 'US Treasury Bills',
            issuer: 'Ondo Finance',
          },
          {
            symbol: 'mETH',
            name: 'Mantle Staked ETH',
            contract: process.env.METH_ADDRESS || '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
            underlying: 'Ethereum',
            issuer: 'Mantle',
          },
        ],
        network: 'Mantle Sepolia',
      },
    };
  });

  // ============================================
  // YIELD DISTRIBUTION ROUTES (Track 1: RWA/RealFi Extension)
  // ============================================

  // GET /api/providers/rwa/yield/pending/:asset/:address - Get pending yield
  fastify.get<{
    Params: { asset: string; address: string };
  }>('/providers/rwa/yield/pending/:asset/:address', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset, address } = request.params;
      const providerService = getProviderService();
      const pendingYield = await providerService.getPendingYield(asset, address);

      return {
        status: 'success',
        code: 'PENDING_YIELD_FETCHED',
        message: `Pending yield for ${address} on ${asset}`,
        data: {
          asset,
          holder: address,
          pendingYield: pendingYield.toString(),
          pendingYieldFormatted: (Number(pendingYield) / 1e18).toFixed(6),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'YIELD_ERROR',
        message: 'Failed to fetch pending yield',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // POST /api/providers/rwa/yield/distribute - Distribute yield to holders
  fastify.post<{
    Body: { asset: string; recipients: string[] };
  }>('/providers/rwa/yield/distribute', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset, recipients } = request.body;

      if (!asset || !recipients || recipients.length === 0) {
        return {
          status: 'error',
          code: 'INVALID_PARAMS',
          message: 'Missing required parameters: asset, recipients',
        };
      }

      const providerService = getProviderService();
      const distributions = await providerService.distributeYield(asset, recipients);

      return {
        status: 'success',
        code: 'YIELD_DISTRIBUTED',
        message: `Yield distributed to ${distributions.length} recipients`,
        data: {
          asset,
          distributions: distributions.map((d) => ({
            recipient: d.recipient,
            amount: d.amount.toString(),
            amountFormatted: (Number(d.amount) / 1e18).toFixed(6),
            period: d.period,
            txHash: d.txHash,
          })),
          totalDistributed: distributions
            .reduce((sum, d) => sum + d.amount, BigInt(0))
            .toString(),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'YIELD_DISTRIBUTION_ERROR',
        message: 'Failed to distribute yield',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/rwa/yield/history/:asset/:address - Get yield distribution history
  fastify.get<{
    Params: { asset: string; address: string };
  }>('/providers/rwa/yield/history/:asset/:address', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset, address } = request.params;
      const providerService = getProviderService();
      const history = await providerService.getYieldHistory(asset, address);

      return {
        status: 'success',
        code: 'YIELD_HISTORY_FETCHED',
        message: `Yield distribution history for ${address}`,
        data: {
          asset,
          holder: address,
          distributions: history.map((d) => ({
            amount: d.amount.toString(),
            amountFormatted: (Number(d.amount) / 1e18).toFixed(6),
            period: d.period,
            txHash: d.txHash,
          })),
          totalReceived: history
            .reduce((sum, d) => sum + d.amount, BigInt(0))
            .toString(),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'YIELD_HISTORY_ERROR',
        message: 'Failed to fetch yield history',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/rwa/yield/stats/:asset - Get yield statistics
  fastify.get<{
    Params: { asset: string };
  }>('/providers/rwa/yield/stats/:asset', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset } = request.params;
      const providerService = getProviderService();
      const stats = await providerService.getYieldStats(asset);

      return {
        status: 'success',
        code: 'YIELD_STATS_FETCHED',
        message: `Yield statistics for ${asset}`,
        data: {
          asset,
          ...stats,
          rateDisplay: `${stats.currentRate.toFixed(2)}% APY`,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'YIELD_STATS_ERROR',
        message: 'Failed to fetch yield statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // POST /api/providers/rwa/yield/simulate - Simulate yield accrual (for demo)
  fastify.post<{
    Body: { asset: string; address: string; days: number };
  }>('/providers/rwa/yield/simulate', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset, address, days } = request.body;

      if (!asset || !address || !days) {
        return {
          status: 'error',
          code: 'INVALID_PARAMS',
          message: 'Missing required parameters: asset, address, days',
        };
      }

      const providerService = getProviderService();
      const simulatedYield = await providerService.simulateYieldAccrual(asset, address, days);

      return {
        status: 'success',
        code: 'YIELD_SIMULATED',
        message: `Simulated ${days} days of yield accrual for ${address}`,
        data: {
          asset,
          holder: address,
          daysSimulated: days,
          accruedYield: simulatedYield.toString(),
          accruedYieldFormatted: (Number(simulatedYield) / 1e18).toFixed(6),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'YIELD_SIMULATION_ERROR',
        message: 'Failed to simulate yield',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // KYC ROUTES (Track 1: RWA/RealFi Extension)
  // ============================================

  // GET /api/providers/kyc/status/:address - Get KYC status
  fastify.get<{
    Params: { address: string };
  }>('/providers/kyc/status/:address', async (request, reply): Promise<ApiResponse> => {
    try {
      const { address } = request.params;
      const providerService = getProviderService();
      const status = await providerService.getKYCStatus(address);

      return {
        status: 'success',
        code: 'KYC_STATUS_FETCHED',
        message: `KYC status for ${address}`,
        data: status,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'KYC_ERROR',
        message: 'Failed to fetch KYC status',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // POST /api/providers/kyc/verify - Verify KYC requirement
  fastify.post<{
    Body: { address: string; minLevel: 'none' | 'basic' | 'enhanced' | 'institutional' };
  }>('/providers/kyc/verify', async (request, reply): Promise<ApiResponse> => {
    try {
      const { address, minLevel } = request.body;

      if (!address || !minLevel) {
        return {
          status: 'error',
          code: 'INVALID_PARAMS',
          message: 'Missing required parameters: address, minLevel',
        };
      }

      const providerService = getProviderService();
      const meetsRequirement = await providerService.meetsKYCRequirement(address, minLevel);

      return {
        status: 'success',
        code: 'KYC_VERIFIED',
        message: `KYC verification for ${address}`,
        data: {
          address,
          requiredLevel: minLevel,
          meetsRequirement,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'KYC_VERIFICATION_ERROR',
        message: 'Failed to verify KYC',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/kyc/attestation/:address - Get KYC attestation for on-chain use
  fastify.get<{
    Params: { address: string };
  }>('/providers/kyc/attestation/:address', async (request, reply): Promise<ApiResponse> => {
    try {
      const { address } = request.params;
      const providerService = getProviderService();
      const attestation = await providerService.getKYCAttestation(address);

      return {
        status: 'success',
        code: 'KYC_ATTESTATION_FETCHED',
        message: `KYC attestation for ${address}`,
        data: attestation,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'KYC_ATTESTATION_ERROR',
        message: 'Failed to get KYC attestation',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // POST /api/providers/kyc/register - Register KYC (demo only)
  fastify.post<{
    Body: {
      address: string;
      level: 'none' | 'basic' | 'enhanced' | 'institutional';
      jurisdiction?: string;
    };
  }>('/providers/kyc/register', async (request, reply): Promise<ApiResponse> => {
    try {
      const { address, level, jurisdiction } = request.body;

      if (!address || !level) {
        return {
          status: 'error',
          code: 'INVALID_PARAMS',
          message: 'Missing required parameters: address, level',
        };
      }

      const providerService = getProviderService();
      const status = await providerService.registerKYC(address, level, jurisdiction);

      return {
        status: 'success',
        code: 'KYC_REGISTERED',
        message: `KYC registered for ${address}`,
        data: status,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'KYC_REGISTRATION_ERROR',
        message: 'Failed to register KYC',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/kyc/stats - Get KYC statistics
  fastify.get('/providers/kyc/stats', async (request, reply): Promise<ApiResponse> => {
    try {
      const providerService = getProviderService();
      const stats = await providerService.getKYCStats();

      return {
        status: 'success',
        code: 'KYC_STATS_FETCHED',
        message: 'KYC statistics',
        data: stats,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'KYC_STATS_ERROR',
        message: 'Failed to get KYC statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // SWAP ROUTES (Track 3: DeFi)
  // ============================================

  // GET /api/providers/swap/quote
  fastify.get<{
    Querystring: { tokenIn: string; tokenOut: string; amountIn: string };
  }>('/providers/swap/quote', async (request, reply): Promise<ApiResponse> => {
    try {
      const { tokenIn, tokenOut, amountIn } = request.query;

      if (!tokenIn || !tokenOut || !amountIn) {
        return {
          status: 'error',
          code: 'INVALID_PARAMS',
          message: 'Missing required parameters: tokenIn, tokenOut, amountIn',
        };
      }

      const providerService = getProviderService();
      const quote = await providerService.getSwapQuote(tokenIn, tokenOut, amountIn);

      return {
        status: 'success',
        code: 'QUOTE_FETCHED',
        message: `Swap quote for ${tokenIn} -> ${tokenOut}`,
        data: quote,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'SWAP_ERROR',
        message: 'Failed to get swap quote',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // POST /api/providers/swap/execute
  fastify.post<{
    Body: {
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      minAmountOut: string;
      recipient: string;
    };
  }>('/providers/swap/execute', async (request, reply): Promise<ApiResponse> => {
    try {
      const { tokenIn, tokenOut, amountIn, minAmountOut, recipient } = request.body;

      if (!tokenIn || !tokenOut || !amountIn || !minAmountOut || !recipient) {
        return {
          status: 'error',
          code: 'INVALID_PARAMS',
          message: 'Missing required parameters',
        };
      }

      const providerService = getProviderService();
      const result = await providerService.executeSwap({
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut,
        recipient,
      });

      return {
        status: 'success',
        code: 'SWAP_EXECUTED',
        message: 'Swap executed successfully via Merchant Moe',
        data: result,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'SWAP_ERROR',
        message: 'Failed to execute swap',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/swap/tokens
  fastify.get('/providers/swap/tokens', async (request, reply): Promise<ApiResponse> => {
    try {
      const providerService = getProviderService();
      const tokens = await providerService.swap.getSupportedTokens();

      return {
        status: 'success',
        code: 'TOKENS_LIST',
        message: 'Supported tokens for swaps on Merchant Moe',
        data: {
          tokens,
          dex: 'Merchant Moe',
          router: process.env.MERCHANT_MOE_ROUTER || '0xeaEE7EE68874218c3558b40063c42B82D3E7232a',
          network: 'Mantle Sepolia',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'SWAP_ERROR',
        message: 'Failed to get supported tokens',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // ============================================
  // LENDING ROUTES (Track 2: DeFi & Composability)
  // ============================================

  // GET /api/providers/lending/markets - Get all lending markets
  fastify.get('/providers/lending/markets', async (request, reply): Promise<ApiResponse> => {
    try {
      const providerService = getProviderService();
      const markets = await providerService.getLendingMarkets();

      return {
        status: 'success',
        code: 'LENDING_MARKETS_FETCHED',
        message: 'Lending markets on Mantle',
        data: {
          markets,
          protocol: 'Lendle',
          network: 'Mantle Sepolia',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'LENDING_ERROR',
        message: 'Failed to fetch lending markets',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/lending/market/:asset - Get specific lending market
  fastify.get<{
    Params: { asset: string };
  }>('/providers/lending/market/:asset', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset } = request.params;
      const providerService = getProviderService();
      const market = await providerService.getLendingMarket(asset);

      return {
        status: 'success',
        code: 'LENDING_MARKET_FETCHED',
        message: `Lending market for ${asset}`,
        data: {
          ...market,
          totalSupplyFormatted: (Number(market.totalSupply) / 1e18).toFixed(2),
          totalBorrowFormatted: (Number(market.totalBorrow) / 1e18).toFixed(2),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'LENDING_ERROR',
        message: 'Failed to fetch lending market',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/lending/position/:asset/:address - Get user's lending position
  fastify.get<{
    Params: { asset: string; address: string };
  }>('/providers/lending/position/:asset/:address', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset, address } = request.params;
      const providerService = getProviderService();
      const position = await providerService.getLendingPosition(asset, address);

      return {
        status: 'success',
        code: 'LENDING_POSITION_FETCHED',
        message: `Lending position for ${address} on ${asset}`,
        data: {
          ...position,
          suppliedFormatted: (Number(position.supplied) / 1e18).toFixed(6),
          borrowedFormatted: (Number(position.borrowed) / 1e18).toFixed(6),
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'LENDING_ERROR',
        message: 'Failed to fetch lending position',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // POST /api/providers/lending/supply - Supply asset to lending pool
  fastify.post<{
    Body: { asset: string; amount: string };
  }>('/providers/lending/supply', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset, amount } = request.body;

      if (!asset || !amount) {
        return {
          status: 'error',
          code: 'INVALID_PARAMS',
          message: 'Missing required parameters: asset, amount',
        };
      }

      const providerService = getProviderService();
      const txHash = await providerService.lendingSupply(asset, amount);

      return {
        status: 'success',
        code: 'LENDING_SUPPLY_SUCCESS',
        message: `Supplied ${amount} ${asset} to Lendle`,
        data: {
          asset,
          amount,
          txHash,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'LENDING_SUPPLY_ERROR',
        message: 'Failed to supply to lending pool',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // POST /api/providers/lending/withdraw - Withdraw from lending pool
  fastify.post<{
    Body: { asset: string; amount: string };
  }>('/providers/lending/withdraw', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset, amount } = request.body;

      if (!asset || !amount) {
        return {
          status: 'error',
          code: 'INVALID_PARAMS',
          message: 'Missing required parameters: asset, amount',
        };
      }

      const providerService = getProviderService();
      const txHash = await providerService.lendingWithdraw(asset, amount);

      return {
        status: 'success',
        code: 'LENDING_WITHDRAW_SUCCESS',
        message: `Withdrew ${amount} ${asset} from Lendle`,
        data: {
          asset,
          amount,
          txHash,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'LENDING_WITHDRAW_ERROR',
        message: 'Failed to withdraw from lending pool',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // POST /api/providers/lending/borrow - Borrow from lending pool
  fastify.post<{
    Body: { asset: string; amount: string };
  }>('/providers/lending/borrow', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset, amount } = request.body;

      if (!asset || !amount) {
        return {
          status: 'error',
          code: 'INVALID_PARAMS',
          message: 'Missing required parameters: asset, amount',
        };
      }

      const providerService = getProviderService();
      const txHash = await providerService.lendingBorrow(asset, amount);

      return {
        status: 'success',
        code: 'LENDING_BORROW_SUCCESS',
        message: `Borrowed ${amount} ${asset} from Lendle`,
        data: {
          asset,
          amount,
          txHash,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'LENDING_BORROW_ERROR',
        message: 'Failed to borrow from lending pool',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // POST /api/providers/lending/repay - Repay borrowed amount
  fastify.post<{
    Body: { asset: string; amount: string };
  }>('/providers/lending/repay', async (request, reply): Promise<ApiResponse> => {
    try {
      const { asset, amount } = request.body;

      if (!asset || !amount) {
        return {
          status: 'error',
          code: 'INVALID_PARAMS',
          message: 'Missing required parameters: asset, amount',
        };
      }

      const providerService = getProviderService();
      const txHash = await providerService.lendingRepay(asset, amount);

      return {
        status: 'success',
        code: 'LENDING_REPAY_SUCCESS',
        message: `Repaid ${amount} ${asset} to Lendle`,
        data: {
          asset,
          amount,
          txHash,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'LENDING_REPAY_ERROR',
        message: 'Failed to repay to lending pool',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // GET /api/providers/lending/stats - Get lending protocol statistics
  fastify.get('/providers/lending/stats', async (request, reply): Promise<ApiResponse> => {
    try {
      const providerService = getProviderService();
      const stats = await providerService.getLendingStats();

      return {
        status: 'success',
        code: 'LENDING_STATS_FETCHED',
        message: 'Lending protocol statistics',
        data: stats,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 'LENDING_STATS_ERROR',
        message: 'Failed to fetch lending statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
