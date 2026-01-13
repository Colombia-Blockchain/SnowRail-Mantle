'use client';

import { useState, useEffect } from 'react';
import { useMixer } from '@/hooks/use-mixer';

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
      active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {children}
  </button>
);

const ZKProofStatus = ({ status }: { status: 'idle' | 'generating' | 'generated' }) => {
    const [hexDump, setHexDump] = useState<string[]>([]);
    
    // Matrix effect simulation
    useEffect(() => {
        if (status !== 'generating') return;
        
        const interval = setInterval(() => {
            const hex = Math.random().toString(16).slice(2, 10);
            setHexDump(prev => [...prev.slice(-5), `0x${hex}...`]);
        }, 100);
        return () => clearInterval(interval);
    }, [status]);

    if (status === 'idle') return null;

    return (
        <div className="mt-4 p-4 bg-black/40 rounded-xl border border-blue-500/30 font-mono text-xs">
             <div className="flex items-center gap-2 mb-2">
                 {status === 'generating' ? (
                     <>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                        <span className="text-blue-400">Generating ZK-SNARK Proof...</span>
                     </>
                 ) : (
                     <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-400">Proof Generated. Ready for Chain.</span>
                     </>
                 )}
             </div>
             {status === 'generating' && (
                 <div className="space-y-0.5 opacity-70 text-blue-300/50">
                     {hexDump.map((hex, i) => <div key={i}>{hex}</div>)}
                 </div>
             )}
             {status === 'generated' && (
                 <div className="text-gray-500 break-all">
                     0x1a2b3c...[PROOF_DATA_HIDDEN]
                 </div>
             )}
        </div>
    );
};

export function MixerInterface() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  
  // Deposit State
  const [generatedNote, setGeneratedNote] = useState<any>(null);
  const [depositCommitment, setDepositCommitment] = useState(''); // For manual input if needed, or derived
  
  // Withdraw State
  const [withdrawNote, setWithdrawNote] = useState('');
  const [recipient, setRecipient] = useState('');
  const [zkStatus, setZkStatus] = useState<'idle' | 'generating' | 'generated'>('idle');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { 
    info, 
    generateNote, 
    deposit, 
    confirmDeposit, 
    withdraw, 
    isConfirming, 
    currentTxHash 
  } = useMixer();

  const handleGenerateNote = async () => {
    const result = await generateNote.mutateAsync();
    setGeneratedNote(result.note);
    setDepositCommitment(result.note.commitment);
  };

  const handleDeposit = async () => {
    if (!depositCommitment) return;
    await deposit.mutateAsync(depositCommitment);
  };

  const handleConfirmDeposit = async () => {
      if (currentTxHash && depositCommitment) {
          await confirmDeposit.mutateAsync({ txHash: currentTxHash, commitment: depositCommitment });
          
          // Local history record
          saveToHistory({
              id: currentTxHash,
              type: 'Mixer Deposit',
              details: `0.1 MNT Commitment: ${depositCommitment.slice(0,10)}...`,
              status: 'confirmed',
              time: new Date()
          });

          setGeneratedNote(null);
          setDepositCommitment('');
          setSuccessMessage("Deposit successfully recorded on-chain!");
          setTimeout(() => setSuccessMessage(null), 5000);
      }
  };

  const handleWithdraw = async () => {
      try {
          if (!withdrawNote || !recipient) return;
          
          setZkStatus('generating');
          await new Promise(r => setTimeout(r, 1500));
          setZkStatus('generated');
          
          const noteObj = JSON.parse(withdrawNote);
          const txHash = await withdraw.mutateAsync({ note: noteObj, recipient, leafIndex: 0 }); // Note: mutation returns hash
          
          // Local history record
          saveToHistory({
              id: txHash as string,
              type: 'Mixer Withdrawal',
              details: `0.1 MNT to ${recipient.slice(0,10)}...`,
              status: 'executed',
              time: new Date()
          });

          setSuccessMessage(`Withdrawal successful! TX: ${txHash.slice(0,10)}...`);
          setWithdrawNote('');
          setRecipient('');
          setZkStatus('idle');
          
          setTimeout(() => setSuccessMessage(null), 8000);
      } catch (e: any) {
          setZkStatus('idle');
          alert("Withdrawal failed: " + (e.message || "Invalid note or connection error"));
      }
  };

  // Simple local history helper
  const saveToHistory = (item: any) => {
      const history = JSON.parse(localStorage.getItem('mixer_history') || '[]');
      localStorage.setItem('mixer_history', JSON.stringify([item, ...history]));
      // Trigger a storage event for other components to listen (optional)
      window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
           <h3 className="text-xl font-bold text-white">Privacy Mixer</h3>
           <p className="text-sm text-gray-400">ZK-SNARKs Private Transfers</p>
        </div>
        <div className="text-right">
            <p className="text-xs text-gray-500">Anonymity Set</p>
            <p className="text-xl font-mono text-blue-400">{info?.localDepositCount || 0}</p>
        </div>
      </div>

      {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm font-bold animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {successMessage}
              </div>
          </div>
      )}

      <div className="flex p-1 bg-white/5 rounded-lg mb-6">
        <TabButton active={activeTab === 'deposit'} onClick={() => setActiveTab('deposit')}>Deposit</TabButton>
        <TabButton active={activeTab === 'withdraw'} onClick={() => setActiveTab('withdraw')}>Withdraw</TabButton>
      </div>

      {activeTab === 'deposit' && (
        <div className="space-y-4">
           {!generatedNote ? (
             <button 
                onClick={handleGenerateNote}
                disabled={generateNote.isPending}
                className="w-full py-5 rounded-2xl border-2 border-dashed border-gray-800 text-gray-500 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all duration-300 font-bold group"
             >
                <div className="flex flex-col items-center gap-2">
                    <svg className="w-6 h-6 opacity-40 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{generateNote.isPending ? 'ENCRYPTING...' : 'GENERATE PRIVACY NOTE'}</span>
                </div>
             </button>
           ) : (
             <div className="p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest">Security Protocol Alpha</p>
                </div>
                <p className="text-gray-300 text-xs font-medium leading-relaxed italic">
                    Note generated. Save this manually. Without this note, your funds will be lost forever in the zero-knowledge commitment.
                </p>
                <div className="relative">
                    <code className="block bg-black/40 p-4 rounded-xl text-[10px] text-blue-300 break-all font-mono leading-relaxed border border-white/5">
                        {JSON.stringify(generatedNote)}
                    </code>
                    <button 
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(generatedNote))}
                        className="absolute right-2 top-2 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs text-white"
                        title="Copy to clipboard"
                    >
                        📋
                    </button>
                </div>
             </div>
           )}

           <div className="pt-2">
               <button
                  onClick={handleDeposit}
                  disabled={!depositCommitment || deposit.isPending}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-black text-white text-sm tracking-wider shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
               >
                  {deposit.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>PROCESSING...</span>
                      </div>
                  ) : 'INITIATE DEPOSIT [0.1 MNT]'}
               </button>
           </div>

           {currentTxHash && (
               <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                   {!isConfirming ? (
                        <button
                            onClick={handleConfirmDeposit}
                            className="w-full py-4 bg-green-500 text-black rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-400 transition-all"
                        >
                            VERIFY & FINALIZE ON-CHAIN
                        </button>
                   ) : (
                        <div className="w-full py-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-center">
                             <div className="flex items-center justify-center gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                                <span className="text-xs font-bold text-blue-400 tracking-widest uppercase">Mining Proof...</span>
                             </div>
                        </div>
                   )}
               </div>
           )}
        </div>
      )}

      {activeTab === 'withdraw' && (
        <div className="space-y-4">
             <div>
                <label className="text-xs text-gray-500 uppercase">Privacy Note</label>
                <textarea
                    value={withdrawNote}
                    onChange={(e) => setWithdrawNote(e.target.value)}
                    placeholder='{"nullifier": "...", "secret": "..."}'
                    className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
             </div>
             <div>
                <label className="text-xs text-gray-500 uppercase">Recipient Address</label>
                <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
             </div>
             
             <ZKProofStatus status={zkStatus} />
             
             <button
                onClick={handleWithdraw}
                disabled={!withdrawNote || !recipient || withdraw.isPending || zkStatus === 'generating'}
                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white disabled:opacity-50 transition-all"
             >
                {withdraw.isPending || zkStatus === 'generating' ? 'Processing Privacy Withdrawal...' : 'Withdraw Privately'}
             </button>
        </div>
      )}
    </div>
  );
}
