/**
 * deploy.cjs — PredictaCare Smart Contract v2 Deployment
 * =========================================================
 * Run: node blockchain/deploy.cjs
 *
 * Deploys to Sepolia testnet and saves:
 *   - CONTRACT_ADDRESS to console (add to .env)
 *   - ABI to blockchain/PredictaCare.abi.json
 */

const { ethers } = require("ethers");
const solc       = require("solc");
const fs         = require("fs");
const path       = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const SOL_PATH = path.join(__dirname, "PredictaCare.sol");
const ABI_PATH = path.join(__dirname, "PredictaCare.abi.json");

async function main() {
  // ── 1. Compile ────────────────────────────────────────────────────────────
  console.log("📦 Compiling PredictaCare.sol...");
  const source = fs.readFileSync(SOL_PATH, "utf8");

  const input = {
    language: "Solidity",
    sources:  { "PredictaCare.sol": { content: source } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
  };

  const output    = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract  = output.contracts["PredictaCare.sol"]["PredictaCare"];

  if (!contract) {
    console.error("❌ Compilation failed:", JSON.stringify(output.errors, null, 2));
    process.exit(1);
  }

  const abi      = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  // Save ABI
  fs.writeFileSync(ABI_PATH, JSON.stringify(abi, null, 2));
  console.log("✅ ABI saved to blockchain/PredictaCare.abi.json");

  // ── 2. Connect to Sepolia ─────────────────────────────────────────────────
  const { SEPOLIA_RPC_URL, ADMIN_PRIVATE_KEY } = process.env;
  if (!SEPOLIA_RPC_URL || !ADMIN_PRIVATE_KEY) {
    console.error("❌ Missing SEPOLIA_RPC_URL or ADMIN_PRIVATE_KEY in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet   = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

  console.log(`🔑 Deploying from: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error("❌ Wallet has no ETH. Get Sepolia ETH from https://sepoliafaucet.com");
    process.exit(1);
  }

  // ── 3. Deploy ─────────────────────────────────────────────────────────────
  console.log("🚀 Deploying contract...");
  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  const deployed = await factory.deploy();

  console.log(`⏳ Waiting for confirmation... TX: ${deployed.deploymentTransaction().hash}`);
  await deployed.waitForDeployment();

  const address = await deployed.getAddress();
  console.log("\n✅ ═══════════════════════════════════════════════");
  console.log(`   CONTRACT_ADDRESS=${address}`);
  console.log("   ═══════════════════════════════════════════════");
  console.log(`\n🔗 Etherscan: https://sepolia.etherscan.io/address/${address}`);
  console.log("\n📝 Add to backend/.env:");
  console.log(`   CONTRACT_ADDRESS=${address}`);

  // ── 4. Verify deployment ──────────────────────────────────────────────────
  const deployed_contract = new ethers.Contract(address, abi, wallet);
  const owner = await deployed_contract.owner();
  const isAuthorized = await deployed_contract.authorizedWriters(wallet.address);
  console.log(`\n✅ Owner: ${owner}`);
  console.log(`✅ Backend wallet authorized: ${isAuthorized}`);
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
