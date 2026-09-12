const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding - Pledge Edge Cases", function () {
  async function deployCrowdfundingFixture() {
    const [owner, pledger] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();
    return { crowdfunding, owner, pledger };
  }

  // Your test cases go inside here...




describe("Pledge Edge Cases & Reverts", function () {
    it("Should revert when trying to pledge to a campaign that does not exist", async function () {
      const { crowdfunding, pledger } = await loadFixture(deployCrowdfundingFixture);
      const pledgeAmount = ethers.parseEther("1");

      // Campaign ID 99 was never created
      await expect(
        crowdfunding.connect(pledger).pledge(99, { value: pledgeAmount })
      ).to.be.revertedWith("Campaign does not exist");
    });

    it("Should revert when trying to pledge zero ETH", async function () {
      const { crowdfunding, pledger } = await loadFixture(deployCrowdfundingFixture);

      const goalAmount = ethers.parseEther("10");
      const duration = 86400;
      const latestTime = await time.latest();
      const deadline = latestTime + duration;
      const metadataURI = "ipfs://QmExampleMetadataHash";

      await crowdfunding.createCampaign(goalAmount, deadline, metadataURI);

      // Attempting to pledge 0 ETH
      await expect(
        crowdfunding.connect(pledger).pledge(1, { value: 0 })
      ).to.be.revertedWith("Pledge must be greater than zero");
    });

    it("Should revert when trying to pledge after the campaign deadline has passed", async function () {
      const { crowdfunding, pledger } = await loadFixture(deployCrowdfundingFixture);

      const goalAmount = ethers.parseEther("10");
      const duration = 86400;
      const latestTime = await time.latest();
      const deadline = latestTime + duration;
      const metadataURI = "ipfs://QmExampleMetadataHash";

      await crowdfunding.createCampaign(goalAmount, deadline, metadataURI);

      // Fast-forward past the deadline
      await time.increaseTo(deadline + 1);

      const pledgeAmount = ethers.parseEther("1");

      // Attempting to pledge after deadline
      await expect(
        crowdfunding.connect(pledger).pledge(1, { value: pledgeAmount })
      ).to.be.revertedWith("Campaign has ended"); // Adjust string to match your exact contract revert message if different
    });
  });
});