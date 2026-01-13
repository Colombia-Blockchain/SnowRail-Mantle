'use client';

const cases = [
  {
    category: 'DAOs & Treasuries',
    title: 'Automated Buybacks',
    description: 'Set conditional orders to buy back governance tokens when treasury yield exceeds 5% APY.',
    tags: ['Yield', 'Condition', 'Agent'],
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    category: 'Institutional',
    title: 'Private RWA Onboarding',
    description: 'Bridge capital to tokenized treasuries without leaking fund movements to competitors.',
    tags: ['Privacy', 'RWA', 'Mantle'],
    gradient: 'from-cyan-600 to-blue-600',
  },
  {
    category: 'Individual',
    title: 'Portfolio Rebalancing',
    description: 'Directly command the agent to rebalance into stables when oracle volatility spikes.',
    tags: ['Oracle', 'Direct', 'Intent'],
    gradient: 'from-indigo-600 to-purple-600',
  },
];

export function UseCases() {
  return (
    <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                <div className="max-w-xl">
                    <h2 className="text-sm font-black text-blue-500 tracking-[0.4em] uppercase mb-6">Applications</h2>
                    <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                        Engineered for <br />Every Workflow.
                    </h3>
                </div>
                <p className="text-gray-400 font-medium max-w-sm">From simple transfers to complex conditional logic, SnowRail adapts to your specific financial stack.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {cases.map((c, i) => (
                    <div key={i} className="group relative">
                        <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-all duration-500 rounded-[2.5rem]`} />
                        <div className="relative h-full bg-white/[0.02] border border-white/5 p-10 rounded-[2.5rem] hover:bg-white/[0.04] transition-all flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6">{c.category}</span>
                            <h4 className="text-2xl font-black text-white tracking-tight uppercase mb-4">{c.title}</h4>
                            <p className="text-gray-400 font-medium leading-relaxed mb-10 flex-1">{c.description}</p>
                            
                            <div className="flex flex-wrap gap-2">
                                {c.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
  );
}
