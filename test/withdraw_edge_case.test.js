const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding - Withdraw Edge Cases & Reverts", function () {
  async function deployCrowdfundingFixture() {
    const [owner, creator, nonCreator, pledger] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();
    return { crowdfunding, owner, creator, nonCreator, pledger };
  }

  it("Should revert when a non-creator tries to call withdraw()", async function () {
    const { crowdfunding, creator, nonCreator, pledger } = await loadFixture(deployCrowdfundingFixture);

    const goalAmount = ethers.parseEther("10");
    const duration = 86400;
    const deadline = (await time.latest()) + duration;
    
    // Creator creates campaign
    await crowdfunding.connect(creator).createCampaign(goalAmount, deadline, "ipfs://meta");

    // Pledger funds it
    await crowdfunding.connect(pledger).pledge(1, { value: goalAmount });

    // Fast-forward past deadline
    await time.increaseTo(deadline + 1);

    // Non-creator attempts to withdraw funds
    await expect(
      crowdfunding.connect(nonCreator).withdraw(1)
    ).to.be.revertedWith("Not campaign creator"); // Adjust string to match your contract if different
  });

  it("Should revert when trying to withdraw before the deadline has passed", async function () {
    const { crowdfunding, creator, pledger } = await loadFixture(deployCrowdfundingFixture);

    const goalAmount = ethers.parseEther("10");
    const duration = 86400;
    const deadline = (await time.latest()) + duration;
    
    await crowdfunding.connect(creator).createCampaign(goalAmount, deadline, "ipfs://meta");
    await crowdfunding.connect(pledger).pledge(1, { value: goalAmount });

    // Attempting to withdraw *before* deadline (without fast-forwarding time)
    await expect(
      crowdfunding.connect(creator).withdraw(1)
    ).to.be.revertedWith("Campaign is still active"); // Adjust string to match your contract
  });

  it("Should revert when trying to withdraw if the funding goal was not met", async function () {
    const { crowdfunding, creator, pledger } = await loadFixture(deployCrowdfundingFixture);

    const goalAmount = ethers.parseEther("10");
    const duration = 86400;
    const deadline = (await time.latest()) + duration;
    
    await crowdfunding.connect(creator).createCampaign(goalAmount, deadline, "ipfs://meta");

    // Pledger underfunds the campaign (pledges 5 ETH instead of 10 ETH)
    await crowdfunding.connect(pledger).pledge(1, { value: ethers.parseEther("5") });

    // Fast-forward past deadline
    await time.increaseTo(deadline + 1);

    // Creator attempts to withdraw failed campaign funds
    await expect(
      crowdfunding.connect(creator).withdraw(1)
    ).to.be.revertedWith("Campaign failed"); 
  });

  it("Should revert when trying to withdraw twice (double-withdraw)", async function () {
    const { crowdfunding, creator, pledger } = await loadFixture(deployCrowdfundingFixture);

    const goalAmount = ethers.parseEther("10");
    const duration = 86400;
    const deadline = (await time.latest()) + duration;
    
    await crowdfunding.connect(creator).createCampaign(goalAmount, deadline, "ipfs://meta");
    await crowdfunding.connect(pledger).pledge(1, { value: goalAmount });

    // Fast-forward past deadline
    await time.increaseTo(deadline + 1);

    // First withdrawal succeeds
    await crowdfunding.connect(creator).withdraw(1);

    // Second withdrawal should fail
    await expect(
      crowdfunding.connect(creator).withdraw(1)
    ).to.be.revertedWith("Already withdrawn"); // Adjust string to match your contract
  });
});