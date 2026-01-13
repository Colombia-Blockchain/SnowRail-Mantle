'use client';

import { ReactNode } from 'react';
import { ConnectWalletButton } from './connect-wallet-button';

// Icons (using simple generic SVGs or Lucide if available, assuming generic for now or Lucide if project has it)
// I will use simple SVG icons for sidebar

const SidebarItem = ({ active, icon, label, onClick }: { active?: boolean; icon: ReactNode; label: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
      active 
        ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-500/30' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <div className={`${active ? 'text-blue-400' : 'text-gray-500'}`}>{icon}</div>
    <span className="font-medium">{label}</span>
  </div>
);

interface DashboardLayoutProps {
  children: ReactNode;
  activeView: 'agent' | 'mixer' | 'market' | 'history';
  onNavigate: (view: 'agent' | 'mixer' | 'market' | 'history') => void;
}

export function DashboardLayout({ children, activeView, onNavigate }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
        {/* Background Gradients */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10 flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 border-r border-white/10 bg-slate-900/40 backdrop-blur-3xl flex flex-col">
                <div className="p-8 border-b border-white/5">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                        SnowRail
                    </h1>
                    <p className="text-[10px] text-gray-500 mt-1 tracking-[0.2em] font-semibold uppercase opacity-70">Mantle Agentic Treasury</p>
                </div>

                <nav className="flex-1 px-6 py-8 space-y-2">
                    <SidebarItem 
                      active={activeView === 'agent'}
                      onClick={() => onNavigate('agent')}
                      icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      } 
                      label="AI Allocator" 
                    />
                    <SidebarItem 
                      active={activeView === 'mixer'}
                      onClick={() => onNavigate('mixer')}
                      icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      } 
                      label="Privacy Mixer" 
                    />
                    <SidebarItem 
                      active={activeView === 'market'}
                      onClick={() => onNavigate('market')}
                      icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      } 
                      label="Market Data" 
                    />
                    <SidebarItem 
                      active={activeView === 'history'}
                      onClick={() => onNavigate('history')}
                      icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      } 
                      label="Audit Trail" 
                    />
                    <div className="pt-8 border-t border-white/5">
                        <a 
                            href="/"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-300 group"
                        >
                            <div className="text-gray-500 group-hover:text-red-400 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <span className="font-medium uppercase text-[10px] tracking-widest">Back to Landing</span>
                        </a>
                    </div>
                </nav>

                <div className="p-6 mt-auto">
                    <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-5 shadow-xl shadow-blue-900/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                        <p className="text-xs text-blue-100 font-semibold mb-1 uppercase tracking-wider">Treasury Balance</p>
                        <h3 className="text-2xl font-bold text-white">$124,592.00</h3>
                        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-blue-100 bg-white/20 w-fit px-2.5 py-1 rounded-full font-bold">
                            <span>↗</span>
                            <span>+2.4% TODAY</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-950/20">
                <header className="flex-none flex items-center justify-between px-10 py-6 border-b border-white/5 backdrop-blur-xl bg-slate-950/60">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            {activeView === 'agent' && 'Operations Dashboard'}
                            {activeView === 'mixer' && 'Privacy Vault'}
                            {activeView === 'market' && 'Market Intelligence'}
                            {activeView === 'history' && 'Transaction Ledger'}
                        </h2>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-[0.1em] mt-1">Authorized Access: Agent Admin</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                             <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]" />
                             <span className="text-[10px] text-white font-bold tracking-widest uppercase">Nodes Online</span>
                        </div>
                        <ConnectWalletButton />
                    </div>
                </header>

                <div className="flex-1 overflow-hidden">
                    <div className="h-full max-w-7xl mx-auto p-10">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    </div>
  );
}
