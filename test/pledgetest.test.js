const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding Contract - Pledges", function () {
  async function deployCrowdfundingFixture() {
    const [owner, backer] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();
    return { crowdfunding, owner, backer };
  }

  it("Should successfully process a pledge, update state mapping, append to pledges array, and fire events", async function () {
    const { crowdfunding, owner, backer } = await loadFixture(deployCrowdfundingFixture);
    
    const goalAmount = ethers.parseEther("5");
    const duration = 86400; 
    const latestTime = await time.latest();
    const deadline = latestTime + duration;
    const metadataURI = "ipfs://QmTestPledgeMetadata";

    // 1. Create campaign
    await crowdfunding.createCampaign(goalAmount, deadline, metadataURI);

    const pledgeAmount = ethers.parseEther("5"); // Exactly hits the goal

    // 2. Transact and check multiple events
    await expect(crowdfunding.connect(backer).pledge(1, { value: pledgeAmount }))
      .to.emit(crowdfunding, "Pledged")
      .withArgs(1, backer.address, pledgeAmount, anyTimestamp => true)
      .to.emit(crowdfunding, "CampaignSuccessful")
      .withArgs(1, pledgeAmount);

    // 3. Verify struct state and mapping
    const campaign = await crowdfunding.campaigns(0);
    expect(campaign.totalPledged).to.equal(pledgeAmount);
    expect(campaign.isSuccessful).to.be.true;

    const userPledged = await crowdfunding.pledgedAmount(1, backer.address);
    expect(userPledged).to.equal(pledgeAmount);

    // 4. Verify the global pledges array entry (Closing the gap!)
    const pledgeRecord = await crowdfunding.pledges(0);
    expect(pledgeRecord.campaignId).to.equal(1);
    expect(pledgeRecord.backer).to.equal(backer.address);
    expect(pledgeRecord.amount).to.equal(pledgeAmount);
    expect(pledgeRecord.timestamp).to.be.a("bigint"); // Ensures block timestamp was recorded
  });
});