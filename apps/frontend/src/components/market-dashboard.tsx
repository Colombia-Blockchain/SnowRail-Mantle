'use client';

import { useMarketData } from '@/hooks/use-market-data';

const MarketCard = ({ title, value, subValue, trend }: { title: string; value: string; subValue: string; trend: 'up' | 'down' }) => (
  <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-xl hover:bg-white/5 transition-all duration-500 group relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
       <svg className="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
       </svg>
    </div>
    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">{title}</p>
    <div className="flex items-end gap-3">
        <h4 className="text-3xl font-black text-white tracking-tight">{value}</h4>
        <div className={`flex items-center text-xs font-bold mb-1 ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            <span>{trend === 'up' ? '↗' : '↘'}</span>
        </div>
    </div>
    <p className="text-xs text-gray-500 mt-2 font-medium">{subValue}</p>
  </div>
);

export function MarketDashboard() {
  const { usePrice, useYield } = useMarketData();
  
  const { data: ethPrice } = usePrice('ETH', 'USD');
  const { data: mntPrice } = usePrice('MNT', 'USD');
  const { data: methYield } = useYield('mETH');
  const { data: usdyYield } = useYield('USDY');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MarketCard 
            title="ETH / USD" 
            value={ethPrice?.price ? `$${ethPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '---'} 
            subValue="Real-time Pyth Feed"
            trend="up"
        />
        <MarketCard 
            title="MNT / USD" 
            value={mntPrice?.price ? `$${mntPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '---'} 
            subValue="Mantle Native Asset"
            trend="up"
        />
        <MarketCard 
            title="mETH Yield" 
            value={methYield?.apy ? `${methYield.apy}%` : '---'} 
            subValue="LSD APR"
            trend="up"
        />
        <MarketCard 
            title="USDY Yield" 
            value={usdyYield?.apy ? `${usdyYield.apy}%` : '---'} 
            subValue="Ondo Finance RWA"
            trend="up"
        />
    </div>
  );
}
