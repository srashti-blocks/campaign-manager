const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding - Refund edge case", function () {
  async function deployCrowdfundingFixture() {
    const [owner,creator, pledger] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();
    return { crowdfunding, owner,creator, pledger };
  }


describe("Refund Edge Cases & Reverts", function () {
    it("Should revert when trying to claim a refund on a successful campaign", async function () {
      const { crowdfunding, creator, pledger } = await loadFixture(deployCrowdfundingFixture);

      const goalAmount = ethers.parseEther("10");
      const duration = 86400;
      const deadline = (await time.latest()) + duration;

      // 1. Create campaign and fully fund it so it succeeds
      await crowdfunding.connect(creator).createCampaign(goalAmount, deadline, "ipfs://meta");
      await crowdfunding.connect(pledger).pledge(1, { value: goalAmount });

      // 2. Fast-forward past the deadline
      await time.increaseTo(deadline + 1);

      // 3. Pledger tries to claim a refund on a successful campaign -> should revert
      await expect(
        crowdfunding.connect(pledger).refund(1)
      ).to.be.revertedWith("Campaign succeeded"); // Adjust string to match your contract's exact revert message
    });

    it("Should revert when trying to claim a refund before the campaign deadline has passed", async function () {
      const { crowdfunding, creator, pledger } = await loadFixture(deployCrowdfundingFixture);

      const goalAmount = ethers.parseEther("10");
      const duration = 86400;
      const deadline = (await time.latest()) + duration;

      // 1. Create campaign and pledge an amount (underfunding it)
      await crowdfunding.connect(creator).createCampaign(goalAmount, deadline, "ipfs://meta");
      await crowdfunding.connect(pledger).pledge(1, { value: ethers.parseEther("2") });

      // 2. Attempt refund BEFORE fast-forwarding past the deadline -> should revert
      await expect(
        crowdfunding.connect(pledger).refund(1)
      ).to.be.revertedWith("Campaign is still active"); // Adjust string to match your contract's exact revert message
    });
  });
  });
