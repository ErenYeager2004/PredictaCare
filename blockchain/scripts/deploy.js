const hre = require("hardhat");

async function main() {
  console.log("Deploying contract...");

  const HealthPrediction = await hre.ethers.getContractFactory(
    "HealthPrediction"
  ); // Ensure correct contract name
  const contract = await HealthPrediction.deploy(); // Deploy contract

  await contract.waitForDeployment(); // ✅ Correct method for deployment

  console.log("Contract deployed at:", contract.target); // Use `.target` to get the address
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
