// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TrustModule = buildModule("TrustModule", (m) => {
  const trustToken = m.contract("TrustToken", []);
  const groupManager = m.contract("TrustGroupManager", [trustToken]);

  return { trustToken: trustToken, groupManager: groupManager };
});

export default TrustModule;
