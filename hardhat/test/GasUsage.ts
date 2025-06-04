import { expect } from "chai";
import { ethers } from "hardhat";
import { TrustGroupManager, TrustToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Gas Measurement Tests", function () {
  const parseAmount = (amount: any) => ethers.parseUnits(amount.toString(), 18);

  async function deploy() {
    const Token = await ethers.getContractFactory("TrustToken");
    const token = await Token.deploy();

    const GroupManager = await ethers.getContractFactory("TrustGroupManager");
    const manager = await GroupManager.deploy(await token.getAddress());

    const signers: HardhatEthersSigner[] = await ethers.getSigners();

    return { token, manager, signers };
  }

  function logGasReport(title: string, gasUsed: bigint, extra: Record<string, any>) {
    console.log(`[Gas Report] ${title}`, {
      ...extra,
      gasUsed: gasUsed.toString()
    });
  }

  async function createGroup(manager: TrustGroupManager, creator: HardhatEthersSigner, members: HardhatEthersSigner[], print = true) {
    const tx = await manager.connect(creator).createGroup("Test Group", members.map(m => m.address));
    const receipt = await tx.wait();
    if (print) {
      logGasReport("Group creation", receipt?.gasUsed ?? 0n, {
        creator: creator.address,
        members: members.map(m => m.address)
      });
    }
  }

  async function registerExpense(manager: TrustGroupManager, groupId: any, expenseRegistrator: HardhatEthersSigner, participants: HardhatEthersSigner[], amount: number | bigint, splitType: number, splits: bigint[] | number[], print = true) {
    let parsedSplit = splits;
    if (splitType === 1) {
      parsedSplit = splits.map(x => ethers.parseUnits(x.toString(), 18));
    }

    const tx = await manager.connect(expenseRegistrator).registerExpenses(
      groupId,
      "Test Expense",
      ethers.parseUnits(amount.toString(), 18),
      participants.map(p => p.address),
      splitType,
      parsedSplit
    );
    const receipt = await tx.wait();
    if (print) {
      logGasReport("Expense registration", receipt?.gasUsed ?? 0n, {
        creator: expenseRegistrator.address,
        groupId,
        amount,
        splitType,
        participants: participants.map(p => p.address),
        splits
      });
    }
  }

  describe("Group creation", function () {

    it("Gas for group creation with 2 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], [signers[1], signers[2]]);
    });

    it("Gas for group creation with 4 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 4));
    });

    it("Gas for group creation with 8 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 8));
    });


    it("Gas for group creation with 20 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 20));
    });

  })

  describe("Register expense", function () {

    it("Gas for EQUAL split expense with 2 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], [signers[1], signers[2]]);
      await registerExpense(manager, 1, signers[0], [signers[0], signers[1], signers[2]], 90, 0, []);
    });

    it("Gas for EQUAL split expense with 4 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 5));
      await registerExpense(manager, 1, signers[0], signers.slice(0, 5), 90, 0, []);
    });

    it("Gas for EQUAL split expense with 8 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 9));
      await registerExpense(manager, 1, signers[0], signers.slice(0, 9), 90, 0, []);
    });

    it("Gas for EXACT split with 2 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], [signers[1], signers[2]]);
      await registerExpense(manager, 1, signers[0], [signers[0], signers[1]], 100, 1, [50, 50]);
    });

    it("Gas for EXACT split with 4 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 4));
      await registerExpense(manager, 1, signers[0], signers.slice(0, 4), 100, 1, [25, 25, 25, 25]);
    });

    it("Gas for EXACT split with 8 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 8));
      await registerExpense(manager, 1, signers[0], signers.slice(0, 8), 120, 1, [10, 10, 30, 10, 10, 10, 10, 30]);
    });

    //PERCENTAGE split tests
    it("Gas for PERCENTAGE split with 2 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], [signers[1], signers[2]]);
      await registerExpense(manager, 1, signers[0], [signers[0], signers[1]], 100, 2, [50, 50]);
    });

    it("Gas for PERCENTAGE split with 4 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 4));
      await registerExpense(manager, 1, signers[0], signers.slice(0, 4), 100, 2, [25, 25, 25, 25]);
    });

    it("Gas for PERCENTAGE split with 8 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 8));
      await registerExpense(manager, 1, signers[0], signers.slice(0, 8), 120, 2, [10, 10, 30, 10, 10, 10, 10, 10]);
    });
  });

  describe("Request to join and approve", function () {
    //crea un metodo come register expense che prenda il manager, il creator, i membri e il gruppoId
    async function requestToJoin(manager: TrustGroupManager, groupId: any, joiner: HardhatEthersSigner) {
      const tx = await manager.connect(joiner).requestToJoin(groupId);
      const receipt = await tx.wait();
      logGasReport("Request to join", receipt?.gasUsed ?? 0n, {
        requester: joiner.address,
        groupId: groupId
      });
    }

    async function approveAddress(manager: TrustGroupManager, groupId: any, approver: HardhatEthersSigner, addressToApprove: HardhatEthersSigner) {
      const tx = await manager.connect(approver).approveAddress(groupId, addressToApprove.address);
      const receipt = await tx.wait();
      logGasReport("Approve address", receipt?.gasUsed ?? 0n, {
        approver: approver.address,
        groupId: groupId,
        approvedAddress: addressToApprove.address
      });
    }

    it("Gas for request to join with 2 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], [signers[1], signers[2]]);
      await requestToJoin(manager, 1, signers[3]);
      await approveAddress(manager, 1, signers[0], signers[3]);
    });

    it("Gas for request to join with 4 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 4));
      await requestToJoin(manager, 1, signers[4]);
      await approveAddress(manager, 1, signers[0], signers[4]);
    });

    it("Gas for request to join with 8 members", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 8));
      await requestToJoin(manager, 1, signers[8]);
      await approveAddress(manager, 1, signers[0], signers[8]);
    });
  });

  describe("Debt simplification", function () {
    async function createGroupOf4() {
      const Token = await ethers.getContractFactory("TrustToken");
      const token = await Token.deploy();
      const GroupManagerFactory = await ethers.getContractFactory("TrustGroupManager");
      const groupManager = await GroupManagerFactory.deploy(await token.getAddress());
      const [Dave, Bob, Charlie, Alice] = await ethers.getSigners();

      // Crea gruppo
      const tx = await groupManager.connect(Dave).createGroup("Spesa casa pisa", [Bob.address, Charlie.address, Alice.address]);
      await tx.wait();
      const groupId = 1; // Se il tuo contratto parte da 1

      return { groupManager, groupId, Dave, Bob, Charlie, Alice };
    }

    async function simplifyDebt(groupManager: any, groupId: any, simplifier: any) {
      const tx = await groupManager.connect(simplifier).simplifyDebt(groupId);
      const receipt = await tx.wait();
      logGasReport("Debt simplification", receipt?.gasUsed ?? 0n, {
        simplifier: simplifier.address,
        groupId
      });
    }

    it("Gas for single edge", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await createGroupOf4();
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 4, [Bob.address], 0, []);
      await simplifyDebt(groupManager, groupId, Dave);
    });

    it("Gas for multiple incoming edges to same node", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await createGroupOf4();
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 4, [Bob.address], 0, []);
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 4, [Alice.address], 0, []);
      await simplifyDebt(groupManager, groupId, Dave);
    });

    it("Gas for multiple outgoing edges of same node", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await createGroupOf4();
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 4, [Bob.address], 0, []);
      await groupManager.connect(Alice).registerExpenses(groupId, "Beer", 5, [Bob.address], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 2, [Bob.address], 0, []);
      await simplifyDebt(groupManager, groupId, Dave);
    });

    it("Gas for two outgoing edges into one", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await createGroupOf4();
      await groupManager.connect(Bob).registerExpenses(groupId, "Beer", 10, [Alice.address], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 10, [Alice.address], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 10, [Bob.address], 0, []);
      await simplifyDebt(groupManager, groupId, Dave);
    });

    it("Gas for cycle of three nodes with one zero balance", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await createGroupOf4();
      await groupManager.connect(Bob).registerExpenses(groupId, "Beer", 5, [Alice.address], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 5, [Bob.address], 0, []);
      await groupManager.connect(Alice).registerExpenses(groupId, "Beer", 10, [Charlie.address], 0, []);
      await simplifyDebt(groupManager, groupId, Dave);
    });

    it("Gas for cycle of four nodes all zero balance", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await createGroupOf4();
      await groupManager.connect(Bob).registerExpenses(groupId, "Beer", 5, [Alice.address], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 5, [Bob.address], 0, []);
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 5, [Charlie.address], 0, []);
      await groupManager.connect(Alice).registerExpenses(groupId, "Beer", 5, [Dave.address], 0, []);
      await simplifyDebt(groupManager, groupId, Dave);
    });

    it("Gas for PDF example", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await createGroupOf4();
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 4, [Bob.address], 0, []);
      await groupManager.connect(Alice).registerExpenses(groupId, "Beer", 12, [Dave.address], 0, []);
      await groupManager.connect(Alice).registerExpenses(groupId, "Beer", 5, [Charlie.address], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 7, [Bob.address], 0, []);
      await groupManager.connect(Bob).registerExpenses(groupId, "Beer", 10, [Alice.address], 0, []);
      await simplifyDebt(groupManager, groupId, Dave);
    });

    //case with a lot of member and 0 balance -> low cost
    it("Gas for complex case with 20 members and cyclic graph", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 20), false);
      for (let i = 0; i < 20; i++) {
        const expenseRegistrator = signers[i];
        const participant = signers[(i + 1) % 20];
        await registerExpense(manager, 1, expenseRegistrator, [participant], parseAmount(100), 0, [], false);
      }
      await simplifyDebt(manager, 1, signers[0]);
    })

    // Gruppo di 20 membri, tutti devono a tutti (caso estremo) -> high cost, lot of fragmentation
    it("Gas for 20 members, all-to-all debts", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 20), false);
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          if (i !== j) {
            await registerExpense(manager, 1, signers[i], [signers[j]], parseAmount(10 + j), 0, [], false);
          }
        }
      }
      await simplifyDebt(manager, 1, signers[0]);
    });

    // Gruppo di 8 membri, debiti distribuiti casualmente -> balanced cost: real use case
    it("Gas for 8 members, random debts", async function () {
      const { manager, signers } = await deploy();
      await createGroup(manager, signers[0], signers.slice(0, 8), false);
      for (let i = 0; i < 8; i++) {
        const payer = signers[i];
        const participant = signers[(i + 3) % 8];
        await registerExpense(manager, 1, payer, [participant], parseAmount(100), 0, [], false);
      }
      await simplifyDebt(manager, 1, signers[0]);
    });

  });

});