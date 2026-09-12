const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding Contract - Withdrawals", function () {
  // Define the fixture so loadFixture has something to call
  async function deployCrowdfundingFixture() {
    const [owner, pledger] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();
    return { crowdfunding, owner, pledger };
  }

  it("Should allow the creator to successfully withdraw funds when a campaign succeeds", async function () {
    const { crowdfunding, owner, pledger } = await loadFixture(deployCrowdfundingFixture);

    const goalAmount = ethers.parseEther("10");
    const duration = 86400; // 1 day in seconds
    const latestTime = await time.latest();
    const deadline = latestTime + duration;
    const metadataURI = "ipfs://QmExampleMetadataHash";

    // 1. Create the campaign
    await crowdfunding.createCampaign(goalAmount, deadline, metadataURI);

    // 2. Pledger makes a pledge that meets or exceeds the goal
    const pledgeAmount = ethers.parseEther("10");
    await crowdfunding.connect(pledger).pledge(1, { value: pledgeAmount });

    // 3. Fast-forward past the deadline
    await time.increaseTo(deadline + 1);

    // 4. Creator calls withdraw() and we assert their balance increases by the pledged amount
    await expect(
      crowdfunding.connect(owner).withdraw(1)
    ).to.changeEtherBalance(owner, pledgeAmount);
  });
});