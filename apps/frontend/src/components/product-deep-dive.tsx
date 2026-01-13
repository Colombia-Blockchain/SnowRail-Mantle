'use client';

export function ProductDeepDive() {
  return (
    <section className="py-24 bg-slate-950 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div>
          <h2 className="text-sm font-black text-blue-500 tracking-[0.4em] uppercase mb-6">The Protocol</h2>
          <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-8">
            Solving the <br />Liquidity Gap.
          </h3>
          <p className="text-lg text-gray-400 font-medium leading-relaxed mb-12">
            Modern on-chain treasury management is fragmented and complex. SnowRail bridges the gap between sophisticated intent and secure execution using autonomous agentic frameworks on Mantle.
          </p>

          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="flex-none w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-black uppercase text-xs tracking-widest mb-2">Intent-Centric UX</h4>
                <p className="text-gray-500 text-sm">Stop manually signing dozens of transactions. Define your goals in plain English; our agent handles the routing, bridging, and swapping.</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-none w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-7.618 3.04M12 10v9" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-black uppercase text-xs tracking-widest mb-2">Institutional Privacy</h4>
                <p className="text-gray-500 text-sm">Enterprise users require confidentiality. Noether-Noir ZK-SNARKs allow you to move funds privately while maintaining on-chain compliance.</p>
              </div>
            </div>

             <div className="flex gap-6">
              <div className="flex-none w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-black uppercase text-xs tracking-widest mb-2">RWA Yield Native</h4>
                <p className="text-gray-500 text-sm">SnowRail is integrated with Pyth oracles to provide real-time access to US Treasury yields and tokenized credit markets.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-8 md:p-12 backdrop-blur-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px]" />
            <h4 className="text-white font-black uppercase text-[10px] tracking-[0.3em] mb-10 opacity-50">System Architecture</h4>
            
            <div className="space-y-12">
                <div className="relative pl-8 border-l border-white/10">
                    <div className="absolute top-0 -left-1.5 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                    <span className="text-[10px] text-blue-400 font-black uppercase mb-2 block">Level 01</span>
                    <h5 className="text-white font-bold mb-2">Mantle Sepolia Network</h5>
                    <p className="text-gray-500 text-xs leading-relaxed">Hyperscale execution layer with modular security and ultra-low fees.</p>
                </div>

                <div className="relative pl-8 border-l border-white/10">
                    <div className="absolute top-0 -left-1.5 w-3 h-3 bg-cyan-500 rounded-full shadow-[0_0_10px_#06b6d4]" />
                    <span className="text-[10px] text-cyan-400 font-black uppercase mb-2 block">Level 02</span>
                    <h5 className="text-white font-bold mb-2">Noether ZK-SNARK Prover</h5>
                    <p className="text-gray-500 text-xs leading-relaxed">Recursive proof generation in Noir for high-performance privacy.</p>
                </div>

                <div className="relative pl-8 border-l border-white/10">
                    <div className="absolute top-0 -left-1.5 w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]" />
                    <span className="text-[10px] text-indigo-400 font-black uppercase mb-2 block">Level 03</span>
                    <h5 className="text-white font-bold mb-2">Agentic Decision Engine</h5>
                    <p className="text-gray-500 text-xs leading-relaxed">LLM-integrated controllers that map user intent to multi-hop payloads.</p>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
}
