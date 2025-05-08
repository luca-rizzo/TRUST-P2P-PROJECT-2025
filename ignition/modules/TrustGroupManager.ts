// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TrustGroupManagerModule = buildModule("LockModule", (m) => {

  const groupManager = m.contract("TrustGroupManager", []);

  return { groupManager: groupManager };
});

export default TrustGroupManagerModule;
