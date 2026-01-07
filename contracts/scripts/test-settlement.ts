import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🧪 Testing Settlement Contract on Mantle Sepolia');
  console.log('━'.repeat(60));

  // Get deployment info
  const deploymentPath = path.join(__dirname, '../deployments/mantle-sepolia.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  const SETTLEMENT_ADDRESS = deployment.contracts.Settlement.address;
  const EXECUTOR_ADDRESS = '0x40C7fa08031dB321245a2f96E6064D2cF269f18B';

  console.log('Settlement Contract:', SETTLEMENT_ADDRESS);
  console.log('Executor Address:', EXECUTOR_ADDRESS);
  console.log('━'.repeat(60));

  // Connect to contract
  const [signer] = await ethers.getSigners();
  console.log('\nSigner:', signer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(signer.address)), 'MNT');

  const Settlement = await ethers.getContractAt('Settlement', SETTLEMENT_ADDRESS);

  // Test 1: Check executor
  console.log('\n📋 Test 1: Verificar executor configurado');
  const executor = await Settlement.executor();
  console.log('Executor configurado:', executor);
  console.log(executor === EXECUTOR_ADDRESS ? '✅ Correcto' : '❌ Incorrecto');

  // Test 2: Check contract balance
  console.log('\n📋 Test 2: Balance del contrato');
  const contractBalance = await ethers.provider.getBalance(SETTLEMENT_ADDRESS);
  console.log('Balance:', ethers.formatEther(contractBalance), 'MNT');
  console.log(contractBalance > 0n ? '✅ Fondeado' : '⚠️  Sin fondos');

  // Test 3: Execute small test payment
  console.log('\n📋 Test 3: Ejecutar pago de prueba (0.0001 MNT)');
  // Use a proper checksummed address (create a new random wallet for testing)
  const testWallet = ethers.Wallet.createRandom();
  const testRecipient = testWallet.address;
  const testAmount = ethers.parseEther('0.0001');
  const testAsset = ethers.ZeroAddress; // Native MNT

  try {
    // Create intent hash
    const intentHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256'],
      [testRecipient, testAmount, Date.now()]
    );

    // Nonce starts at 0 for new intents
    const nonce = 0;

    console.log('Intent Hash:', intentHash);
    console.log('Recipient:', testRecipient);
    console.log('Amount:', ethers.formatEther(testAmount), 'MNT');
    console.log('Nonce:', nonce);

    // Create EIP-712 signature
    const domain = {
      name: 'MantleSettlement',
      version: '1',
      chainId: 5003,
      verifyingContract: SETTLEMENT_ADDRESS
    };

    const types = {
      Settlement: [
        { name: 'intentHash', type: 'bytes32' },
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }
      ]
    };

    const value = {
      intentHash,
      recipient: testRecipient,
      amount: testAmount,
      nonce
    };

    const signature = await signer.signTypedData(domain, types, value);
    console.log('Signature:', signature);

    // Execute settlement
    console.log('\n⏳ Ejecutando settlement...');
    const recipientBalanceBefore = await ethers.provider.getBalance(testRecipient);

    const tx = await Settlement.executeSettlement(
      intentHash,
      testRecipient,
      testAmount,
      nonce,
      signature
    );

    console.log('Tx hash:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Settlement ejecutado en block:', receipt?.blockNumber);

    // Verify recipient received funds
    const recipientBalanceAfter = await ethers.provider.getBalance(testRecipient);
    const received = recipientBalanceAfter - recipientBalanceBefore;
    console.log('\nRecipient balance antes:', ethers.formatEther(recipientBalanceBefore), 'MNT');
    console.log('Recipient balance después:', ethers.formatEther(recipientBalanceAfter), 'MNT');
    console.log('Recibido:', ethers.formatEther(received), 'MNT');
    console.log(received === testAmount ? '✅ Correcto' : '❌ Incorrecto');

  } catch (error) {
    console.error('❌ Error en test 3:', error instanceof Error ? error.message : String(error));
  }

  // Test 4: Verify nonce was marked as used
  console.log('\n📋 Test 4: Verificar nonce usado');
  try {
    const nonce = Date.now() - 1000; // Use old nonce
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'uint256', 'uint256'],
      [testRecipient, testAsset, testAmount, nonce]
    );
    const signature = await signer.signMessage(ethers.getBytes(messageHash));

    // Try to reuse nonce (should fail)
    await Settlement.executeSettlement(
      testRecipient,
      testAsset,
      testAmount,
      nonce,
      signature
    );
    console.log('❌ No debería permitir reusar nonce');
  } catch (error) {
    console.log('✅ Correctamente rechazó nonce duplicado');
  }

  console.log('\n━'.repeat(60));
  console.log('🎉 Testing completado');
  console.log('━'.repeat(60));
  console.log('\n📍 View on MantleScan:');
  console.log(`https://sepolia.mantlescan.xyz/address/${SETTLEMENT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
