'use client';

import { useQuery } from '@tanstack/react-query';
import { getOracleFeeds, getOraclePrice, getRwaAssets, getRwaYield } from '@/services/api';

export function useMarketData() {
    const feedsQuery = useQuery({
        queryKey: ['oracle-feeds'],
        queryFn: getOracleFeeds,
    });

    const rwaAssetsQuery = useQuery({
        queryKey: ['rwa-assets'],
        queryFn: getRwaAssets,
    });

    // Helper to fetch specific price
    const usePrice = (base: string, quote: string = 'USD') => {
        return useQuery({
            queryKey: ['oracle-price', base, quote],
            queryFn: () => getOraclePrice(base, quote),
            refetchInterval: 10000, // Real-time ish
        });
    };

    // Helper to fetch specific yield
    const useYield = (asset: string) => {
        return useQuery({
            queryKey: ['rwa-yield', asset],
            queryFn: () => getRwaYield(asset),
            refetchInterval: 30000,
        });
    };

    return {
        feeds: feedsQuery.data?.feeds || [],
        rwaAssets: rwaAssetsQuery.data?.assets || [],
        usePrice,
        useYield,
    };
}
