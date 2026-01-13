'use client';

export function SecuritySection() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
        {/* Background circuit lines effect */}
        <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
            <div className="absolute top-0 left-2/4 w-px h-full bg-gradient-to-b from-transparent via-cyan-500 to-transparent" />
            <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="bg-gradient-to-br from-slate-900 to-blue-950/20 border border-white/10 rounded-[3rem] p-12 md:p-20 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-12 opacity-5">
                    <svg className="w-64 h-64 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                    </svg>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-sm font-black text-blue-400 tracking-[0.4em] uppercase mb-6">Security Layer</h2>
                        <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-8">
                            Zero-Knowledge <br />By Design.
                        </h3>
                        <p className="text-lg text-gray-400 font-medium leading-relaxed mb-10">
                            Every treasury movement is verified through non-interactive succinct arguments. 
                            Our Noir-based prover ensures that transaction privacy is never compromised, even on a public ledger like Mantle.
                        </p>
                        <ul className="space-y-4">
                            {[
                                "On-chain ZK-SNARK Verification",
                                "Recursive Proof Composition",
                                "Formal Verification of Agent Logic",
                                "Mantle Sepolia Hardened Security"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-4 text-white font-bold uppercase text-xs tracking-widest">
                                    <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-500/20 blur-[100px] group-hover:bg-cyan-500/20 transition-all duration-1000" />
                        <div className="relative bg-black/40 border border-white/10 rounded-3xl p-8 font-mono text-[10px] text-blue-300 leading-relaxed shadow-2xl">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <span className="text-gray-500 uppercase font-black tracking-widest">NOIR_PROVER_V1.log</span>
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                                </div>
                            </div>
                            <div className="space-y-1 opacity-80">
                                <div>[SYS] Initializing witness generation...</div>
                                <div className="text-cyan-400">[ZK] Constraining merchant_id: 0x4f...</div>
                                <div className="text-cyan-400">[ZK] Constraining amount_limit: &lt; 5000</div>
                                <div>[SYS] Running PLONKish backend...</div>
                                <div className="text-green-400 bg-green-500/10 px-1 inline-block mt-2">PROOF_GENERATED SUCCESS [256 bytes]</div>
                                <div className="mt-4 break-all text-blue-500/50">
                                    0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}
