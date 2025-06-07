import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "hardhat-gas-reporter";
import "@nomicfoundation/hardhat-ignition";
import "@typechain/hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  gasReporter: {
    enabled: true,
    currency: 'EUR',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: 'ETH',
    gasPriceApi: `https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${process.env.ETHERSCAN_API_KEY}`,
    outputFile: 'gas-report.txt',
    noColors: true
  },
  typechain: {
    target: "ethers-v6"
  },
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [`0x${process.env.PRIVATE_KEY}`]
    }
  }
};

export default config;
