import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment record structure for Mantle
 */
interface DeploymentRecord {
  network: string;
  chainId: number;
  blockExplorer: string;
  contracts: Record<string, ContractDeployment>;
  deployedAt: string;
}

interface ContractDeployment {
  address: string;
  deploymentTx: string;
  deploymentBlock: number;
  deployedAt: string;
  deployer: string;
  constructorArgs: unknown[];
}

// Mantle network configurations
const MANTLE_NETWORKS = {
  mantleSepolia: {
    chainId: 5003,
    name: "Mantle Sepolia",
    explorer: "https://sepolia.mantlescan.xyz",
    rpc: "https://rpc.sepolia.mantle.xyz",
  },
  mantleMainnet: {
    chainId: 5000,
    name: "Mantle Mainnet",
    explorer: "https://mantlescan.xyz",
    rpc: "https://rpc.mantle.xyz",
  },
};

/**
 * Get deployment record file path
 */
function getDeploymentRecordPath(): string {
  const networkName = network.name;
  const fileName = `mantle-${networkName === "mantleSepolia" ? "sepolia" : "mainnet"}.json`;
  return path.join(__dirname, "../deployments", fileName);
}

/**
 * Load existing deployment record or create new one
 */
function loadDeploymentRecord(): DeploymentRecord {
  const filePath = getDeploymentRecordPath();

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  }

  const networkConfig =
    network.name === "mantleSepolia"
      ? MANTLE_NETWORKS.mantleSepolia
      : MANTLE_NETWORKS.mantleMainnet;

  return {
    network: network.name,
    chainId: networkConfig.chainId,
    blockExplorer: networkConfig.explorer,
    contracts: {},
    deployedAt: new Date().toISOString(),
  };
}

/**
 * Save deployment record
 */
function saveDeploymentRecord(record: DeploymentRecord): void {
  const filePath = getDeploymentRecordPath();
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(`\nDeployment record saved to ${filePath}`);
}

/**
 * Validate executor address format
 */
function validateExecutorAddress(address: string): void {
  if (!address) {
    throw new Error(
      "EXECUTOR_ADDRESS environment variable not set. This should be the backend wallet address."
    );
  }

  if (!address.startsWith("0x") || address.length !== 42 || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(
      `Invalid EXECUTOR_ADDRESS format: ${address}. Must be a valid Ethereum address.`
    );
  }
}

/**
 * Deploy Settlement contract to Mantle
 */
async function deploySettlement(deployer: any, record: DeploymentRecord): Promise<string> {
  console.log("\n=== Deploying Settlement Contract ===\n");

  const executorAddress = process.env.EXECUTOR_ADDRESS;
  validateExecutorAddress(executorAddress || "");
  console.log(`Executor address (backend wallet): ${executorAddress}\n`);

  console.log("Deploying Settlement...");
  const Settlement = await ethers.getContractFactory("Settlement");
  const settlement = await Settlement.deploy(executorAddress);

  const deploymentTx = settlement.deploymentTransaction();
  if (!deploymentTx) {
    throw new Error("Deployment transaction not found");
  }

  console.log(`Deployment transaction: ${deploymentTx.hash}`);
  await settlement.waitForDeployment();

  const address = await settlement.getAddress();
  const deploymentBlock = await ethers.provider.getBlockNumber();

  console.log(`\nSettlement deployed successfully!`);
  console.log(`Address: ${address}`);
  console.log(`Block: ${deploymentBlock}`);

  record.contracts.Settlement = {
    address,
    deploymentTx: deploymentTx.hash,
    deploymentBlock,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    constructorArgs: [executorAddress],
  };

  return address;
}

/**
 * Deploy ZKMixer contract to Mantle
 */
async function deployZKMixer(deployer: any, record: DeploymentRecord): Promise<string> {
  console.log("\n=== Deploying ZKMixer Contract ===\n");

  console.log("Deploying ZKMixer...");
  const ZKMixer = await ethers.getContractFactory("ZKMixer");
  const mixer = await ZKMixer.deploy();

  const deploymentTx = mixer.deploymentTransaction();
  if (!deploymentTx) {
    throw new Error("Deployment transaction not found");
  }

  console.log(`Deployment transaction: ${deploymentTx.hash}`);
  await mixer.waitForDeployment();

  const address = await mixer.getAddress();
  const deploymentBlock = await ethers.provider.getBlockNumber();

  console.log(`\nZKMixer deployed successfully!`);
  console.log(`Address: ${address}`);
  console.log(`Block: ${deploymentBlock}`);

  record.contracts.ZKMixer = {
    address,
    deploymentTx: deploymentTx.hash,
    deploymentBlock,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    constructorArgs: [],
  };

  return address;
}

/**
 * Main deployment function
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ❄️  SNOWRAIL - MANTLE DEPLOYMENT                        ║
║                                                           ║
║   Deploying to: ${network.name.padEnd(40)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Validate network
  if (!["mantleSepolia", "mantleMainnet"].includes(network.name)) {
    throw new Error(
      `Invalid network: ${network.name}. Use --network mantleSepolia or mantleMainnet`
    );
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}`);
  console.log(`Network: ${network.name}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} MNT\n`);

  if (balance === 0n) {
    console.error("\n❌ Insufficient balance!");
    console.error("Please get testnet MNT from: https://faucet.sepolia.mantle.xyz/");
    process.exit(1);
  }

  // Load deployment record
  const record = loadDeploymentRecord();

  try {
    // Deploy Settlement
    const settlementAddress = await deploySettlement(deployer, record);

    // Deploy ZKMixer
    const mixerAddress = await deployZKMixer(deployer, record);

    // Save deployment record
    saveDeploymentRecord(record);

    // Get network config for explorer
    const networkConfig =
      network.name === "mantleSepolia"
        ? MANTLE_NETWORKS.mantleSepolia
        : MANTLE_NETWORKS.mantleMainnet;

    // Display summary
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ✅ DEPLOYMENT COMPLETE                                  ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   Settlement: ${settlementAddress}     ║
║   ZKMixer:    ${mixerAddress}     ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   Next Steps:                                             ║
║   1. View on explorer:                                    ║
║      ${networkConfig.explorer}/address/${settlementAddress}
║                                                           ║
║   2. Update backend .env:                                 ║
║      SETTLEMENT_CONTRACT_ADDRESS=${settlementAddress}
║      MIXER_CONTRACT_ADDRESS=${mixerAddress}
║                                                           ║
║   3. Update frontend config with new addresses            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);

  } catch (error) {
    console.error("\n❌ Deployment failed!");
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Execute
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
