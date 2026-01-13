'use client';

import { useEffect, useState } from 'react';

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative overflow-hidden bg-slate-950 min-h-screen flex items-center justify-center font-sans tracking-tight">
      {/* Dynamic Futuristic Background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {/* Deep mesh gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(17,24,39,1)_0%,_rgba(2,6,23,1)_100%)]" />
        
        {/* Animated Orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse duration-[8s]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse duration-[12s] delay-1000" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      {/* Content */}
      <div className={`relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-12'}`}>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-blue-400 text-xs font-black tracking-[0.2em] mb-8 animate-in fade-in zoom-in duration-700">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" />
          MANTLE AGENTIC TREASURY PROTOCOL
        </div>

        <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black mb-8 tracking-tighter text-white">
          Snow
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-500">Rail</span>
        </h1>

        <p className="text-xl sm:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
          The first <span className="text-white">autonomous</span>, end-to-end treasury intelligence system. 
          Managed by AI, verified on Mantle.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <a 
                href="/dashboard"
                className="group relative px-10 py-5 bg-white text-black font-black text-sm tracking-widest rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300 uppercase">Launch Dashboard</span>
            </a>
            
            <button className="px-10 py-5 border-2 border-white/10 text-white font-black text-sm tracking-widest rounded-2xl hover:bg-white/5 hover:border-white/20 transition-all uppercase">
                Documentation
            </button>
        </div>

        {/* Floating Mini Stats */}
        <div className="mt-24 grid grid-cols-2 lg:grid-cols-4 gap-12 opacity-50 hover:opacity-100 transition-opacity duration-700">
          <div className="text-center">
            <p className="text-[10px] font-black tracking-widest text-gray-500 mb-2 uppercase">Total Value Managed</p>
            <div className="text-2xl font-bold font-mono text-white">$124.5M</div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black tracking-widest text-gray-500 mb-2 uppercase">Decisions / Hour</p>
            <div className="text-2xl font-bold font-mono text-white">1,402</div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black tracking-widest text-gray-500 mb-2 uppercase">Protocol Yield</p>
            <div className="text-2xl font-bold font-mono text-green-400">+14.2%</div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black tracking-widest text-gray-500 mb-2 uppercase">Network State</p>
            <div className="text-2xl font-bold font-mono text-blue-400">SYNCED</div>
          </div>
        </div>
      </div>
    </div>
  );
}
