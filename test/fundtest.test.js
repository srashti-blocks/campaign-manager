const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Crowdfunding Contract", function () {
  let crowdfunding;
  let owner;
  let backer;
  let randomUser;

  beforeEach(async function () {
    // Get test accounts provided by Hardhat's local network
    [owner, backer, randomUser] = await ethers.getSigners();

    // Deploy a fresh contract instance before each test
    const CrowdfundingFactory = await ethers.getContractFactory("Crowdfunding");
    crowdfunding = await CrowdfundingFactory.deploy();
  });

  describe("Refunds", function () {
    it("Should revert if a user with no pledges tries to get a refund after the deadline", async function () {
      const goalAmount = ethers.parseEther("10"); // 10 ETH goal
      const duration = 86400; // 1 day in seconds
      const currentBlockTime = await time.latest();
      const deadline = currentBlockTime + duration;

      // 1. Owner creates a campaign (Campaign ID 1)
      await crowdfunding.createCampaign(
        goalAmount,
        deadline,
        "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
      );

      // 2. Fast forward time past the deadline so refund conditions open up
      // (Campaign failed because totalPledged 0 < goalAmount 10)
      await time.increaseTo(deadline + 1);

      // 3. randomUser (who never pledged a single wei) attempts to refund
      // We use .connect(randomUser) to simulate the call coming from them
      await expect(
        crowdfunding.connect(randomUser).refund(1)
      ).to.be.revertedWith("No pledge to refund");
    });
  });
});