'use client';

const steps = [
  {
    title: 'Initialize Intent',
    description: 'Provide natural language commands or set market conditions for your treasury.',
    icon: (
      <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    title: 'ZK Verification',
    description: 'Your identity and market conditions are verified privately using Noir ZK-SNARKs.',
    icon: (
      <svg className="w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-7.618 3.04M12 10v9" />
      </svg>
    ),
  },
  {
    title: 'Agent Execution',
    description: 'The AI Allocator executes the capital movement once all conditions are met on Mantle.',
    icon: (
      <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-sm font-black text-blue-500 tracking-[0.3em] uppercase mb-4">Workflow</h2>
          <h3 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">The Agentic Cycle</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <div key={index} className="relative group p-8 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all">
              <div className="absolute -top-6 -left-6 text-8xl font-black text-white/[0.02] group-hover:text-blue-500/[0.05] transition-colors pointer-events-none">
                0{index + 1}
              </div>
              <div className="mb-6 p-4 bg-white/5 rounded-2xl w-fit">
                {step.icon}
              </div>
              <h4 className="text-xl font-black text-white uppercase tracking-tight mb-4">{step.title}</h4>
              <p className="text-gray-400 font-medium leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
