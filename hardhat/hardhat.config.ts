import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  gasReporter: {
    outputFile: 'gas-report.txt',
    enabled: true,
    currency: 'EUR',
    gasPrice: 5,
  }
};

export default config;
