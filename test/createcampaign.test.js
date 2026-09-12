const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding Contract - Create Campaign", function () {
  async function deployCrowdfundingFixture() {
    const [owner, creator] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();
    return { crowdfunding, owner, creator };
  }

  it("Should successfully create a campaign, return correct ID, store struct data, and emit event", async function () {
    const { crowdfunding, creator } = await loadFixture(deployCrowdfundingFixture);

    const goalAmount = ethers.parseEther("10");
    const duration = 86400; // 1 day
    const latestTime = await time.latest();
    const deadline = latestTime + duration;
    const metadataURI = "ipfs://QmValidMetadataHash";

    // Expect transaction to emit CampaignCreated event
    await expect(crowdfunding.connect(creator).createCampaign(goalAmount, deadline, metadataURI))
      .to.emit(crowdfunding, "CampaignCreated")
      .withArgs(1, creator.address, goalAmount, deadline, anyTimestamp => true, metadataURI);

    // Verify campaign struct properties
    const campaign = await crowdfunding.campaigns(0);
    expect(campaign.campaignId).to.equal(1);
    expect(campaign.creator).to.equal(creator.address);
    expect(campaign.goalAmount).to.equal(goalAmount);
    expect(campaign.totalPledged).to.equal(0);
    expect(campaign.deadline).to.equal(deadline);
    expect(campaign.isSuccessful).to.be.false;
    expect(campaign.withdrawn).to.be.false;
    expect(campaign.metadataURI).to.equal(metadataURI);
  });

  it("Should revert if goal amount is zero", async function () {
    const { crowdfunding, creator } = await loadFixture(deployCrowdfundingFixture);
    const deadline = (await time.latest()) + 86400;

    await expect(
      crowdfunding.connect(creator).createCampaign(0, deadline, "ipfs://QmHash")
    ).to.be.revertedWith("Goal must be greater than zero");
  });

  it("Should revert if deadline is in the past", async function () {
    const { crowdfunding, creator } = await loadFixture(deployCrowdfundingFixture);
    const goalAmount = ethers.parseEther("5");
    const pastDeadline = (await time.latest()) - 100; // Already passed

    await expect(
      crowdfunding.connect(creator).createCampaign(goalAmount, pastDeadline, "ipfs://QmHash")
    ).to.be.revertedWith("Deadline must be in the future");
  });

  it("Should revert if metadata URI is empty", async function () {
    const { crowdfunding, creator } = await loadFixture(deployCrowdfundingFixture);
    const goalAmount = ethers.parseEther("5");
    const deadline = (await time.latest()) + 86400;

    await expect(
      crowdfunding.connect(creator).createCampaign(goalAmount, deadline, "")
    ).to.be.revertedWith("Metadata URI cannot be empty");
  });
});