const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding - Multi-Backer Accumulation", function () {
  async function deployCrowdfundingFixture() {
    const [owner, pledger] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();
    return { crowdfunding, owner, pledger };
  }

  it("Should accumulate multiple different backers' contributions correctly, isolate per-address balances, and trigger success on the threshold-crossing pledge", async function () {
    const { crowdfunding, owner, pledger: backer1 } = await loadFixture(deployCrowdfundingFixture);
    const [, , backer2] = await ethers.getSigners();

    const goalAmount = ethers.parseEther("5");
    const duration = 86400;
    const latestTime = await time.latest();
    const deadline = latestTime + duration;
    const metadataURI = "ipfs://QmExampleMetadataHash";

    // 1. Create the campaign with a 5 ETH goal
    await crowdfunding.createCampaign(goalAmount, deadline, metadataURI);

    // 2. Backer 1 pledges 3 ETH (Below goal — should NOT emit CampaignSuccessful)
    const pledge1Amount = ethers.parseEther("3");
    await expect(
      crowdfunding.connect(backer1).pledge(1, { value: pledge1Amount })
    )
      .to.emit(crowdfunding, "Pledged")
      .withArgs(1, backer1.address, pledge1Amount, anyValue);

    // Verify backer1's individual mapping balance directly
    expect(await crowdfunding.pledgedAmount(1, backer1.address)).to.equal(pledge1Amount);

    // 3. Backer 2 pledges 4 ETH (Pushes total to 7 ETH, crossing the 5 ETH goal — SHOULD emit CampaignSuccessful)
    const pledge2Amount = ethers.parseEther("4");
    await expect(
      crowdfunding.connect(backer2).pledge(1, { value: pledge2Amount })
    )
      .to.emit(crowdfunding, "Pledged")
      .withArgs(1, backer2.address, pledge2Amount, anyValue)
      .and.to.emit(crowdfunding, "CampaignSuccessful")
      .withArgs(1, ethers.parseEther("7"));

    // 4. Verify final isolated and accumulated states using individual mappings/getters
    expect(await crowdfunding.pledgedAmount(1, backer1.address)).to.equal(pledge1Amount);
    expect(await crowdfunding.pledgedAmount(1, backer2.address)).to.equal(pledge2Amount);
  });
});