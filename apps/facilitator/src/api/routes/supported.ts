import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { ApiResponse, SupportedData, PaymentScheme, NetworkInfo, TokenInfo } from '../../types';

// Supported payment schemes for Mantle network
const SUPPORTED_SCHEMES: PaymentScheme[] = [
  {
    scheme: 'exact',
    network: 'mantle-sepolia',
    chainId: 5003,
    token: 'MNT',
    tokenAddress: null, // Native token
    description: 'Exact amount payment with native MNT',
  },
  {
    scheme: 'exact',
    network: 'mantle-mainnet',
    chainId: 5000,
    token: 'MNT',
    tokenAddress: null,
    description: 'Exact amount payment with native MNT',
  },
  {
    scheme: 'eip-3009',
    network: 'mantle-sepolia',
    chainId: 5003,
    token: 'USDY',
    tokenAddress: '0x5bE26527e817998A7206475496fDE1E68957c5A6',
    description: 'EIP-3009 transferWithAuthorization for USDY (RWA)',
  },
  {
    scheme: 'exact',
    network: 'mantle-sepolia',
    chainId: 5003,
    token: 'mETH',
    tokenAddress: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
    description: 'Mantle Staked ETH payments',
  },
];

// Supported networks
const SUPPORTED_NETWORKS: NetworkInfo[] = [
  {
    name: 'Mantle Sepolia',
    chainId: 5003,
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorerUrl: 'https://sepolia.mantlescan.xyz',
  },
  {
    name: 'Mantle Mainnet',
    chainId: 5000,
    rpcUrl: 'https://rpc.mantle.xyz',
    explorerUrl: 'https://mantlescan.xyz',
  },
];

// Supported tokens
const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    symbol: 'MNT',
    name: 'Mantle',
    address: null,
    decimals: 18,
    network: 'mantle-sepolia',
  },
  {
    symbol: 'MNT',
    name: 'Mantle',
    address: null,
    decimals: 18,
    network: 'mantle-mainnet',
  },
  {
    symbol: 'WMNT',
    name: 'Wrapped Mantle',
    address: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
    decimals: 18,
    network: 'mantle-sepolia',
  },
  {
    symbol: 'USDY',
    name: 'US Dollar Yield (Ondo)',
    address: '0x5bE26527e817998A7206475496fDE1E68957c5A6',
    decimals: 18,
    network: 'mantle-sepolia',
  },
  {
    symbol: 'mETH',
    name: 'Mantle Staked ETH',
    address: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
    decimals: 18,
    network: 'mantle-sepolia',
  },
];

export const supportedRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // GET /supported - List supported payment schemes and networks
  server.get<{ Reply: ApiResponse<SupportedData> }>('/supported', async () => {
    const currentChainId = parseInt(process.env.CHAIN_ID || '5003', 10);

    // Filter schemes for current network
    const activeSchemes = SUPPORTED_SCHEMES.filter(
      scheme => scheme.chainId === currentChainId
    );

    const response: ApiResponse<SupportedData> = {
      status: 'success',
      code: 'SUPPORTED_SCHEMES',
      message: 'List of supported payment schemes and networks',
      data: {
        schemes: activeSchemes,
        networks: SUPPORTED_NETWORKS,
        tokens: SUPPORTED_TOKENS.filter(
          token => token.network === (currentChainId === 5003 ? 'mantle-sepolia' : 'mantle-mainnet')
        ),
      },
    };
    return response;
  });
};
