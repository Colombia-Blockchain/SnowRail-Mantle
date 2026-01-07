import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);

  console.log("\n=== Mantle Sepolia Wallet ===");
  console.log(`Address: ${signer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} MNT`);

  if (balance === 0n) {
    console.log("\n⚠️  No balance! Get testnet MNT from:");
    console.log("   https://faucet.sepolia.mantle.xyz/");
  } else {
    console.log("\n✅ Ready to deploy!");
  }
}

main().catch(console.error);
