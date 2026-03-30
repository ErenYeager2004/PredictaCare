/**
 * deploy.cjs — Deploys PredictaCare.sol to Sepolia
 * 
 * Usage:
 *   cd backend
 *   node blockchain/deploy.cjs
 * 
 * Requires in .env:
 *   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
 *   ADMIN_PRIVATE_KEY=your_private_key
 */

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const solc = require('solc');

async function main() {
  console.log('🔧 Compiling PredictaCare.sol...');

  const source = fs.readFileSync(
    path.join(__dirname, 'PredictaCare.sol'), 'utf8'
  );

  const input = {
    language: 'Solidity',
    sources: { 'PredictaCare.sol': { content: source } },
    settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:', errors);
      process.exit(1);
    }
  }

  const contract = output.contracts['PredictaCare.sol']['PredictaCare'];
  const abi      = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  // Save ABI for backend use
  const abiPath = path.join(__dirname, 'PredictaCare.abi.json');
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log('✅ ABI saved to blockchain/PredictaCare.abi.json');

  // Connect to Sepolia
  console.log('\n🌐 Connecting to Sepolia...');
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet   = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Wallet: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error('❌ No Sepolia ETH! Get some at https://faucets.chain.link/sepolia');
    process.exit(1);
  }

  // Deploy
  console.log('\n🚀 Deploying contract...');
  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  const deployed = await factory.deploy();

  console.log('⏳ Waiting for confirmation...');
  await deployed.waitForDeployment();

  const address = await deployed.getAddress();
  console.log(`\n✅ Contract deployed at: ${address}`);
  console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${address}`);
  console.log(`\n📋 Add this to backend/.env:`);
  console.log(`CONTRACT_ADDRESS=${address}`);

  // Save address
  fs.writeFileSync(
    path.join(__dirname, 'contract_address.txt'),
    address
  );
}

main().catch(err => {
  console.error('❌ Deploy failed:', err.message);
  process.exit(1);
});
