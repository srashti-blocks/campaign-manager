it("Should revert when a pledger tries to refund a second time", async function () {
    const { crowdfunding, owner, pledger } = await loadFixture(deployCrowdfundingFixture);

    const goalAmount = ethers.parseEther("10");
    const duration = 86400; // 1 day in seconds
    const latestTime = await time.latest();
    const deadline = latestTime + duration;
    const metadataURI = "ipfs://QmExampleMetadataHash";

    // 1. Create the campaign
    await crowdfunding.createCampaign(goalAmount, deadline, metadataURI);

    // 2. Pledger makes a pledge (e.g., 2 ETH)
    const pledgeAmount = ethers.parseEther("2");
    await crowdfunding.connect(pledger).pledge(1, { value: pledgeAmount });

    // 3. Fast-forward past the deadline
    await time.increaseTo(deadline + 1);

    // 4. First refund call should succeed
    await expect(
      crowdfunding.connect(pledger).refund(1)
    ).to.changeEtherBalance(pledger, pledgeAmount);

    // 5. Second refund call should revert because pledgedAmount is now 0
    await expect(
      crowdfunding.connect(pledger).refund(1)
    ).to.be.reverted;
  });