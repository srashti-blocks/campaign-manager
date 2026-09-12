// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Crowdfunding {

    struct Campaign {
        uint256 campaignId;
        address creator;
        uint256 goalAmount;
        uint256 totalPledged;
        uint256 deadline;
        bool isSuccessful;
        uint256 createdAt;
        bool withdrawn;
        string metadataURI; 
    }

    struct Pledge {
        uint256 campaignId;
        address backer;
        uint256 amount;
        uint256 timestamp;
    }

    Campaign[] public campaigns;
    Pledge[] public pledges;

    mapping(uint256 => mapping(address => uint256)) public pledgedAmount;

    uint256 public nextCampaignId = 1;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 goalAmount,
        uint256 deadline,
        uint256 createdAt,
        string metadataURI // <--- Captured by the Flask event listener to sync off-chain database
    );

    event Pledged(
        uint256 indexed campaignId,
        address indexed backer,
        uint256 amount,
        uint256 timestamp
    );

    event CampaignSuccessful(
        uint256 indexed campaignId,
        uint256 totalPledged
    );

    event Withdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );

    event Refunded(
        uint256 indexed campaignId,
        address indexed backer,
        uint256 amount
    );

    function createCampaign(
        uint256 _goalAmount,
        uint256 _deadline,
        string memory _metadataURI // <--- Forced dependency: must provide IPFS hash to create
    ) public returns (uint256) {

        require(
            _goalAmount > 0,
            "Goal must be greater than zero"
        );

        require(
            _deadline > block.timestamp,
            "Deadline must be in the future"
        );

        require(
            bytes(_metadataURI).length > 0,
            "Metadata URI cannot be empty"
        );

        uint256 campaignId = nextCampaignId;
        nextCampaignId++;

        Campaign memory camp = Campaign({
            campaignId: campaignId,
            creator: msg.sender,
            goalAmount: _goalAmount,
            totalPledged: 0,
            deadline: _deadline,
            isSuccessful: false,
            createdAt: block.timestamp,
            withdrawn: false,
            metadataURI: _metadataURI
        });

        campaigns.push(camp);

        emit CampaignCreated(
            campaignId,
            msg.sender,
            _goalAmount,
            _deadline,
            block.timestamp,
            _metadataURI
        );

        return campaignId;
    }

    function pledge(uint256 _campaignId) public payable {
        require(
            _campaignId > 0 && _campaignId < nextCampaignId,
            "Campaign does not exist"
        );

        require(
            msg.value > 0,
            "Pledge must be greater than zero"
        );

        Campaign storage camp = campaigns[_campaignId - 1];

        require(
            block.timestamp < camp.deadline,
            "Campaign has ended"
        );

        camp.totalPledged += msg.value;
        pledgedAmount[_campaignId][msg.sender] += msg.value;

        pledges.push(
            Pledge({
                campaignId: _campaignId,
                backer: msg.sender,
                amount: msg.value,
                timestamp: block.timestamp
            })
        );

        emit Pledged(
            _campaignId,
            msg.sender,
            msg.value,
            block.timestamp
        );

        if (
            !camp.isSuccessful &&
            camp.totalPledged >= camp.goalAmount
        ) {
            camp.isSuccessful = true;

            emit CampaignSuccessful(
                _campaignId,
                camp.totalPledged
            );
        }
    }

    function withdraw(uint256 _campaignId) public {
        require(
            _campaignId > 0 && _campaignId < nextCampaignId,
            "Campaign does not exist"
        );

        Campaign storage camp = campaigns[_campaignId - 1];

        require(
            msg.sender == camp.creator,
            "Not campaign creator"
        );

        require(
            block.timestamp >= camp.deadline,
            "Campaign is still active"
        );

        require(
            camp.totalPledged >= camp.goalAmount,

            "Campaign failed"
        );

        require(
            !camp.withdrawn,
            "Already withdrawn"
        );

        camp.withdrawn = true;
        uint256 amount = camp.totalPledged;

        (bool sent, ) = payable(camp.creator).call{value: amount}("");
        require(sent, "ETH transfer failed");

        emit Withdrawn(
            _campaignId,
            camp.creator,
            amount
        );
    }

    function refund(uint256 _campaignId) public {
        require(
            _campaignId > 0 && _campaignId < nextCampaignId,
            "Campaign does not exist"
        );

        Campaign storage camp = campaigns[_campaignId - 1];

        require(
            block.timestamp >= camp.deadline,
            "Campaign is still active"
        );

        require(
            camp.totalPledged < camp.goalAmount,
            "Campaign succeeded"
        );

        uint256 amount = pledgedAmount[_campaignId][msg.sender];
        require(amount > 0, "No pledge to refund");

        pledgedAmount[_campaignId][msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Refund failed");

        emit Refunded(
            _campaignId,
            msg.sender,
            amount
        );
    }
}