import { expect } from "chai";
import { ethers } from "hardhat";
import { TrustGroupManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Gas Measurement Tests", function () {
  const gasPriceGwei = 5; // aggiornato al valore reale attuale circa 4.5–5 gwei
  const ethPriceEur = 3000;

  async function deploy() {
    const Token = await ethers.getContractFactory("TrustToken");
    const token = await Token.deploy();

    const GroupManager = await ethers.getContractFactory("TrustGroupManager");
    const manager = await GroupManager.deploy(await token.getAddress());

    const signers: HardhatEthersSigner[] = await ethers.getSigners();

    return { token, manager, signers };
  }

  function logGasReport(title: string, gasUsed: bigint, extra: Record<string, any>) {
    const gasPrice = ethers.parseUnits(gasPriceGwei.toString(), "gwei");
    const costInEth = gasUsed * gasPrice;
    const costInEur = parseFloat(ethers.formatEther(costInEth)) * ethPriceEur;

    console.log(`[Gas Report] ${title}`, {
      ...extra,
      gasUsed: gasUsed.toString(),
      gasPrice: `${gasPriceGwei} gwei`,
      costInEth: ethers.formatEther(costInEth),
      costInEur: `${costInEur.toFixed(2)} €`
    });
  }

  async function createGroup(manager: TrustGroupManager, creator: HardhatEthersSigner, members: HardhatEthersSigner[]) {
    const tx = await manager.connect(creator).createGroup("Test Group", members.map(m => m.address));
    const receipt = await tx.wait();
    logGasReport("Group creation", receipt?.gasUsed ?? 0n, {
      creator: creator.address,
      members: members.map(m => m.address)
    });
  }

  async function registerExpense(manager: TrustGroupManager, groupId: any, creator: HardhatEthersSigner, participants: HardhatEthersSigner[], amount: number, splitType: number, splits: bigint[] | number[]) {
    let parsedSplit = splits;
    if (splitType === 1) {
      parsedSplit = splits.map(x => ethers.parseUnits(x.toString(), 18));
    }

    const tx = await manager.connect(creator).registerExpenses(
      groupId,
      "Test Expense",
      ethers.parseUnits(amount.toString(), 18),
      participants.map(p => p.address),
      splitType,
      parsedSplit
    );
    const receipt = await tx.wait();
    logGasReport("Expense registration", receipt?.gasUsed ?? 0n, {
      creator: creator.address,
      groupId,
      amount,
      splitType,
      participants: participants.map(p => p.address),
      splits
    });
  }

  it("Gas for group creation with 2 members", async function () {
    const { manager, signers } = await deploy();
    await createGroup(manager, signers[0], [signers[1], signers[2]]);
  });

  it("Gas for group creation with 10 members", async function () {
    const { manager, signers } = await deploy();
    await createGroup(manager, signers[0], signers.slice(1, 11));
  });

  it("Gas for EQUAL split expense", async function () {
    const { manager, signers } = await deploy();
    await createGroup(manager, signers[0], [signers[1], signers[2]]);
    await registerExpense(manager, 1, signers[0], [signers[0], signers[1], signers[2]], 90, 0, []);
  });

  it("Gas for EXACT split with 5 members", async function () {
    const { manager, signers } = await deploy();
    await createGroup(manager, signers[0], signers.slice(1, 6));
    await registerExpense(manager, 1, signers[0], signers.slice(0, 5), 100, 1, [20, 20, 20, 20, 20]);
  });

  it("Gas for PERCENTAGE split with 8 members", async function () {
    const { manager, signers } = await deploy();
    await createGroup(manager, signers[0], signers.slice(1, 9));
    await registerExpense(manager, 1, signers[0], signers.slice(0, 9), 200, 2, [10, 10, 10, 10, 10, 10, 10, 10, 20]);
  });
});