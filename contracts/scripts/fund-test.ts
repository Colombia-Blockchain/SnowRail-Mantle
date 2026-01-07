import { ethers } from 'ethers';

async function fund() {
  const SETTLEMENT_ADDRESS = '0xae6E14caD8D4f43947401fce0E4717b8D17b4382';
  const MIXER_ADDRESS = '0x9C7dC7C8D6156441D5D5eCF43B33F960331c4600';
  const PRIVATE_KEY = '0x164c0ae52ae57c5c35424b7a83ecb211623835e347ff3d45027d4078cee51167';
  const RPC_URL = 'https://rpc.sepolia.mantle.xyz';
  const AMOUNT = '0.001'; // MNT for testing

  console.log('🚀 Fondeando contratos en Mantle Sepolia para testing');
  console.log('━'.repeat(60));
  console.log('Settlement:', SETTLEMENT_ADDRESS);
  console.log('ZKMixer:', MIXER_ADDRESS);
  console.log('Amount:', AMOUNT, 'MNT cada uno');
  console.log('Network: Mantle Sepolia (chainId: 5003)');
  console.log('━'.repeat(60));

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('\n📤 Balance del signer:', ethers.formatEther(await provider.getBalance(signer.address)), 'MNT');

    // Fund Settlement Contract
    console.log('\n⏳ Fondeando Settlement Contract...');
    const settlementBalanceBefore = await provider.getBalance(SETTLEMENT_ADDRESS);
    console.log('Settlement balance antes:', ethers.formatEther(settlementBalanceBefore), 'MNT');

    const tx1 = await signer.sendTransaction({
      to: SETTLEMENT_ADDRESS,
      value: ethers.parseEther(AMOUNT)
    });

    console.log('Tx hash:', tx1.hash);
    console.log('⏳ Esperando confirmación...');
    await tx1.wait();
    console.log('✅ Settlement fondeado!');

    const settlementBalanceAfter = await provider.getBalance(SETTLEMENT_ADDRESS);
    console.log('Settlement balance después:', ethers.formatEther(settlementBalanceAfter), 'MNT');

    // Note: ZKMixer receives funds through deposits, not direct transfers
    console.log('\n📝 Nota: ZKMixer recibe fondos a través de deposits, no transferencias directas');
    const mixerBalance = await provider.getBalance(MIXER_ADDRESS);
    console.log('ZKMixer balance:', ethers.formatEther(mixerBalance), 'MNT');

    console.log('\n📍 Explorer:');
    console.log('Settlement:', `https://sepolia.mantlescan.xyz/address/${SETTLEMENT_ADDRESS}`);
    console.log('ZKMixer:', `https://sepolia.mantlescan.xyz/address/${MIXER_ADDRESS}`);
    console.log('\n🎉 ¡Fondeo de testing completado exitosamente!');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

fund();
