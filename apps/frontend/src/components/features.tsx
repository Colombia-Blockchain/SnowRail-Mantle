'use client';

const features = [
  {
    title: 'Autonomous Allocators',
    desc: 'AI agents that manage treasury rebalacing, yield farming, and risk mitigation 24/7.',
    className: 'md:col-span-2 md:row-span-2',
    accent: 'bg-blue-500',
  },
  {
    title: 'Privacy Mixer',
    desc: 'Unlinkable asset movements using zero-knowledge recursive proofs.',
    className: 'md:col-span-1 md:row-span-1',
    accent: 'bg-cyan-500',
  },
  {
    title: 'RWA Yields',
    desc: 'Access institutional-grade yields from tokenized real-world assets.',
    className: 'md:col-span-1 md:row-span-1',
    accent: 'bg-indigo-500',
  },
  {
    title: 'Pyth Oracle Proofs',
    desc: 'Cryptographically verified market data for high-assurance execution.',
    className: 'md:col-span-1 md:row-span-1',
    accent: 'bg-emerald-500',
  },
  {
    title: 'Mantle Ecosystem',
    desc: 'Built on the hyperscale L2 for ultra-low costs and high throughput.',
    className: 'md:col-span-2 md:row-span-1',
    accent: 'bg-white',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-slate-950 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h2 className="text-sm font-black text-cyan-400 tracking-[0.3em] uppercase mb-4">Capabilities</h2>
        <h3 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">Intelligence Layer</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[200px]">
        {features.map((f, i) => (
          <div 
            key={i} 
            className={`group relative overflow-hidden rounded-[2.5rem] bg-white/[0.03] border border-white/5 p-10 hover:bg-white/[0.05] transition-all duration-500 ${f.className}`}
          >
            <div className={`absolute top-0 left-0 w-1 h-24 ${f.accent} opacity-20 group-hover:h-full transition-all duration-700`} />
            <div className="relative z-10">
              <h4 className="text-2xl font-black text-white tracking-tight uppercase mb-4">{f.title}</h4>
              <p className="text-gray-400 font-medium leading-relaxed max-w-md">{f.desc}</p>
            </div>
            
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
          </div>
        ))}
      </div>
    </section>
  );
}
