const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding Contract - Refunds", function () {
  // Define the fixture to handle deployment cleanly across tests
  async function deployCrowdfundingFixture() {
    const [owner, pledger] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();
    return { crowdfunding, owner, pledger };
  }

  it("Should successfully refund the exact pledged amount when a campaign fails", async function () {
    const { crowdfunding, owner, pledger } = await loadFixture(deployCrowdfundingFixture);

    const goalAmount = ethers.parseEther("10");
    const duration = 86400; // 1 day in seconds
    
    // 1. Calculate a valid future timestamp for the deadline
    const latestTime = await time.latest();
    const deadline = latestTime + duration;
    const metadataURI = "ipfs://QmExampleMetadataHash";

    // 2. Create the campaign using all 3 required parameters
    await crowdfunding.createCampaign(goalAmount, deadline, metadataURI);

    // 3. Pledger makes a pledge (e.g., 2 ETH)
    const pledgeAmount = ethers.parseEther("2");
    await crowdfunding.connect(pledger).pledge(1, { value: pledgeAmount });

    // 4. Fast-forward time past the campaign deadline
    await time.increaseTo(deadline + 1);

    // 5. Assert that calling refund() successfully refunds the pledger using changeEtherBalance
    await expect(
      crowdfunding.connect(pledger).refund(1)
    ).to.changeEtherBalance(pledger, pledgeAmount);
  });
});