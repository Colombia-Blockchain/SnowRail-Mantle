'use client';

import { useState, useEffect } from 'react';
import { useDepositIntent } from '@/hooks/use-deposit-intent';
import { useIntents } from '@/hooks/use-intents';
import { useCreateIntent } from '@/hooks/use-create-intent';
import { DashboardLayout } from './dashboard-layout';
import { MarketDashboard } from './market-dashboard';
import { MixerInterface } from './mixer-interface';
import { PaymentIntent, executeIntent } from '@/services/api';
import { usePublicClient } from 'wagmi';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// --- Chat Component ---

interface AgentMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

function ChatInterface() {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: '1',
      type: 'agent',
      content: 'System initialized. Treasury Agent online. How can I assist you with capital allocation today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  
  // Hooks
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();
  const createIntent = useCreateIntent();
  const { deposit, confirm, isConfirming: isDepositing } = useDepositIntent();
  const { data: intents } = useIntents();
  
  // Execute intent mutation
  const executeIntentMutation = useMutation({
    mutationFn: (intentId: string) => executeIntent(intentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intents'] });
    },
  });

  // Simple parser for demo (e.g. "Send 10 MNT to 0x...")
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. Add User Message
    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    
    // 2. Simulate Agent Processing / Intent Creation
    
    if (input.toLowerCase().startsWith('send')) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'agent',
            content: 'Analyzing request... Preparing payment intent.',
            timestamp: new Date()
        }]);

        try {
            // Mock parse: "Send [Amount] [Currency] to [Recipient]"
            const parts = input.split(' ');
            const amount = parts[1];
            const currency = parts[2];
            // Skip "to"
            const recipient = parts[4];

            if (!amount || !currency || !recipient) {
                throw new Error("I couldn't understand the details. Please use format: 'Send 0.01 MNT to 0x...'");
            }

            // 1. Create Intent
            const intent = await createIntent.mutateAsync({
                amount,
                currency,
                recipient,
                condition: { type: 'manual', value: 'true' }
            });

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                type: 'agent',
                content: `Intent created (ID: ${intent.intentId.slice(0,8)}...). Please sign the deposit transaction.`,
                timestamp: new Date()
            }]);

            // 2. Deposit
            const { txHash } = await deposit(intent.intentId);
            
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                type: 'agent',
                content: `Deposit sent (${txHash.slice(0,10)}...). Waiting for network confirmation...`,
                timestamp: new Date()
            }]);

            // 3. Wait for transaction to be mined
            // Note: Mantle Sepolia RPC is unreliable for waitForTransactionReceipt
            // So we just wait a fixed time and let the backend verify the transaction
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                type: 'agent',
                content: `Waiting for transaction to be mined (~20 seconds)...`,
                timestamp: new Date()
            }]);
            
            await new Promise(r => setTimeout(r, 20000)); // 20 second wait
            
            // 4. Confirm with backend (backend will verify transaction on-chain)
            await confirm({ intentId: intent.intentId, txHash });

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                type: 'agent',
                content: `Funds verified on Mantle. Executing transfer to recipient...`,
                timestamp: new Date()
            }]);

            // 5. Execute Intent (transfer from pool to recipient)
            await executeIntentMutation.mutateAsync(intent.intentId);

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                type: 'agent',
                content: `Transaction executed successfully! Funds transferred to ${intent.recipient.slice(0,6)}...${intent.recipient.slice(-4)}`,
                timestamp: new Date()
            }]);
            
        } catch (err: any) {
             setMessages(prev => [...prev, {
                id: Date.now().toString(),
                type: 'agent',
                content: `Error: ${err.message || 'Transaction rejected or failed.'}`,
                timestamp: new Date()
            }]);
        }
    } else {
        // Fallback Chat
        setTimeout(() => {
             setMessages(prev => [...prev, {
                id: Date.now().toString(),
                type: 'agent',
                content: "I understood your message. Currently I am optimized for 'Send' commands or monitoring the dashboard.",
                timestamp: new Date()
            }]);
        }, 1000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40 border border-white/10 rounded-3xl backdrop-blur-3xl overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
        <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-white tracking-tight">AI Allocator Pro</h3>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Autonomous Mode</p>
                </div>
            </div>
            <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] text-green-400 font-black tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></span>
                L2 Snyc
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 relative z-10 scrollbar-hide">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                    <div className={`max-w-[85%] rounded-3xl px-6 py-4 shadow-xl ${
                        msg.type === 'user' 
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none shadow-blue-900/20' 
                            : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none backdrop-blur-md'
                    }`}>
                        <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                        <div className={`text-[9px] font-bold uppercase tracking-tighter mt-3 opacity-40 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                            {msg.timestamp.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="p-6 border-t border-white/5 bg-slate-900/60 relative z-10">
            <form onSubmit={handleSendMessage} className="flex gap-3">
                <div className="flex-1 relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="ENTER COMMAND (e.g. 'Send 0.01 MNT to 0x...')"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-600 font-medium"
                    />
                    <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500" />
                </div>
                <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-10 py-4 font-black text-sm tracking-widest transition-all shadow-xl shadow-blue-900/40 active:scale-95 flex items-center gap-2 group"
                >
                    <span>SEND</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7" />
                    </svg>
                </button>
            </form>
        </div>
    </div>
  );
}

// --- History View ---

function HistoryView() {
    const { data: intents, isLoading } = useIntents();
    const [localHistory, setLocalHistory] = useState<any[]>([]);

    useEffect(() => {
        const history = JSON.parse(localStorage.getItem('mixer_history') || '[]');
        setLocalHistory(history);
        
        const handleStorage = () => {
            const updated = JSON.parse(localStorage.getItem('mixer_history') || '[]');
            setLocalHistory(updated);
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    if (isLoading) return <div className="text-center p-8 text-gray-400">Loading history...</div>;

    // Merge and Sort
    const mergedHistory = [
        ...(intents || []).map(i => ({
            id: i.intentId,
            type: 'Payment Intent',
            details: `${i.amount} ${i.currency}`,
            recipient: i.recipient,
            condition: i.condition.type === 'manual' ? 'Manual' : `${i.condition.type} ${i.condition.value}`,
            status: i.status,
            time: new Date(i.createdAt)
        })),
        ...localHistory.map(h => ({
            ...h,
            time: new Date(h.time)
        }))
    ].sort((a, b) => b.time.getTime() - a.time.getTime());

    return (
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-3xl">
             <div className="flex items-center justify-between mb-8">
                 <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Audit Trail</h3>
                 <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Verified on Mantle Sepolia</div>
             </div>
             <div className="overflow-x-auto overflow-y-visible">
                 <table className="w-full text-left text-sm border-separate border-spacing-y-3">
                     <thead className="text-[10px] uppercase font-black tracking-widest text-gray-500">
                         <tr>
                             <th className="px-6 py-2">Transaction ID</th>
                             <th className="px-6 py-2">Type</th>
                             <th className="px-6 py-2">Details</th>
                             <th className="px-6 py-2">Status</th>
                             <th className="px-6 py-2">Timestamp</th>
                         </tr>
                     </thead>
                     <tbody className="space-y-4">
                         {mergedHistory.map((item: any) => (
                             <tr key={item.id} className="group transition-all">
                                 <td className="px-6 py-5 bg-white/5 first:rounded-l-2xl border-y border-l border-white/5 group-hover:border-blue-500/30 transition-colors">
                                     <div className="flex items-center gap-3">
                                         <div className={`w-2 h-2 rounded-full ${item.type.includes('Mixer') ? 'bg-indigo-500' : 'bg-blue-500'}`} />
                                         <span className="font-mono text-[11px] text-gray-300">{item.id.slice(0, 12)}...</span>
                                     </div>
                                 </td>
                                 <td className="px-6 py-5 bg-white/5 border-y border-white/5 group-hover:border-blue-500/30">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.type}</span>
                                 </td>
                                 <td className="px-6 py-5 bg-white/5 border-y border-white/5 group-hover:border-blue-500/30">
                                     <div className="text-white font-bold">{item.details}</div>
                                     <div className="text-[10px] text-gray-500 mt-1">{item.recipient ? `TO: ${item.recipient.slice(0, 10)}...` : item.condition}</div>
                                 </td>
                                 <td className="px-6 py-5 bg-white/5 border-y border-white/5 group-hover:border-blue-500/30">
                                     <span className={`px-3 py-1 rounded-full font-black uppercase text-[9px] tracking-widest border ${
                                         item.status === 'executed' || item.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                         item.status === 'funded' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                         'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                     }`}>
                                         {item.status}
                                     </span>
                                 </td>
                                 <td className="px-6 py-5 bg-white/5 last:rounded-r-2xl border-y border-r border-white/5 group-hover:border-blue-500/30">
                                     <div className="text-xs text-gray-400 font-medium">
                                         {item.time.toLocaleDateString()}
                                         <span className="block text-[10px] text-gray-600 mt-1 uppercase">{item.time.toLocaleTimeString()}</span>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                         {mergedHistory.length === 0 && (
                             <tr>
                                 <td colSpan={5} className="text-center py-20 text-gray-600 uppercase font-black tracking-widest opacity-20 text-4xl italic">
                                     No Data Synchronized
                                 </td>
                             </tr>
                         )}
                     </tbody>
                 </table>
             </div>
        </div>
    );
}

// --- Main Layout ---

export function AgentInterface() {
  const [view, setView] = useState<'agent' | 'mixer' | 'market' | 'history'>('agent');

  return (
    <DashboardLayout activeView={view} onNavigate={setView}>
      <div className="h-full animate-in fade-in duration-700">
          {view === 'agent' && (
              <div className="h-full max-w-4xl mx-auto flex flex-col">
                   <div className="mb-6 flex-none">
                       <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Allocator Terminal</h2>
                       <p className="text-gray-400 font-medium text-sm">Coordinate with the SnowRail Agent to manage your treasury intents.</p>
                   </div>
                   <div className="flex-1 min-h-0">
                       <ChatInterface />
                   </div>
              </div>
          )}

          {view === 'mixer' && (
               <div className="max-w-2xl mx-auto space-y-10">
                   <div>
                       <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Privacy Vault</h2>
                       <p className="text-gray-400 font-medium">Securely mixer your MNT using zero-knowledge proofs on Mantle.</p>
                   </div>
                   <MixerInterface />
                   <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
                       <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-4">Security Note</h4>
                       <p className="text-sm text-gray-400 leading-relaxed">
                           SnowRail uses Noether-Noir ZK-SNARKs. Each deposit is added to a local Merkle tree and verified on-chain. Ensure you have saved your note before closing this session.
                       </p>
                   </div>
               </div>
          )}

          {view === 'market' && (
               <div className="space-y-10">
                   <div>
                       <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Oracle Intelligence</h2>
                       <p className="text-gray-400 font-medium">Live market data feeds powered by Pyth Network and RWA Yields.</p>
                   </div>
                   <MarketDashboard />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl backdrop-blur-xl">
                           <h3 className="text-white font-bold mb-4">Mantle Ecosystem Stats</h3>
                           <div className="space-y-4">
                               <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                   <span className="text-gray-500">Network Status</span>
                                   <span className="text-green-400 font-bold uppercase tracking-widest text-[10px]">Active</span>
                               </div>
                               <div className="flex justify-between items-center text-sm">
                                   <span className="text-gray-500">Avg. Gas Price</span>
                                   <span className="text-white font-mono">0.05 Gwei</span>
                               </div>
                           </div>
                       </div>
                   </div>
               </div>
          )}

          {view === 'history' && (
              <div className="space-y-10">
                  <HistoryView />
              </div>
          )}
      </div>
    </DashboardLayout>
  );
}


