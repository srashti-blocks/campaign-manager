const hre = require("hardhat");

async function main() {
  console.log("Deploying Crowdfunding contract...");

  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  const crowdfunding = await Crowdfunding.deploy();

  await crowdfunding.waitForDeployment();

  console.log(`Crowdfunding contract deployed to: ${await crowdfunding.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
