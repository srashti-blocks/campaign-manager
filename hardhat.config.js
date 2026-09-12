require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const SEPOLIA_RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/alch_S980xxBGbKMgx99d_gkWg";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey:  process.env.ETHERSCAN_API_KEY
  }
};

