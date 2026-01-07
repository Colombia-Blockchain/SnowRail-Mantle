import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import type { Config } from 'wagmi';
import { defineChain } from 'viem';

// Define Mantle Sepolia Testnet
export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: {
    name: 'Mantle',
    symbol: 'MNT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Sepolia Explorer',
      url: 'https://sepolia.mantlescan.xyz',
    },
  },
  testnet: true,
});

// Define Mantle Mainnet
export const mantleMainnet = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: {
    name: 'Mantle',
    symbol: 'MNT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Explorer',
      url: 'https://mantlescan.xyz',
    },
  },
  testnet: false,
});

export const config: Config = getDefaultConfig({
  appName: 'SnowRail - AI Treasury on Mantle',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'DEFAULT_PROJECT_ID',
  chains: [mantleSepolia],
  ssr: true,
  transports: {
    [mantleSepolia.id]: http('https://rpc.sepolia.mantle.xyz'),
  },
});
