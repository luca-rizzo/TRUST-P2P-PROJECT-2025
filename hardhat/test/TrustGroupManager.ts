import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { TrustGroupManager } from "../typechain-types/contracts/TrustGroupManager";
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("TrustGroupManager", function () {

  // Centralized deploy fixture
  async function deployFixture() {
    const Token = await ethers.getContractFactory("TrustToken");
    const token = await Token.deploy();

    const GroupManager = await ethers.getContractFactory("TrustGroupManager");
    const manager = await GroupManager.deploy(await token.getAddress());

    const signers: HardhatEthersSigner[] = await ethers.getSigners();

    return { token, manager, signers };
  }

  // Centralized group creation fixture
  async function createGroupFixture(
    groupName = "Spesa casa pisa",
    memberIndexes = [1, 2],
    creatorIndex = 0
  ) {
    const { token, manager, signers } = await loadFixture(deployFixture);
    const creator = signers[creatorIndex];
    const members = memberIndexes.map(i => signers[i].address);

    // Ottieni il groupId senza scrivere
    const groupId = await manager.connect(creator).createGroup.staticCall(
      groupName,
      members
    );

    // Esegui davvero la transazione
    await manager.connect(creator).createGroup(
      groupName,
      members
    );

    return {
      token,
      groupManager: manager as TrustGroupManager,
      groupId,
      creator,
      otherMembers: memberIndexes.map(i => signers[i]),
      signers
    };
  }

  async function createGroupOf4Fixture() {
    const { token, groupManager, groupId, creator, otherMembers, signers } = await createGroupFixture(
      "Spesa casa pisa",
      [1, 2, 3], // Bob, Charlie, Alice
      0          // Dave (il creator)
    );
    return {
      token,
      groupManager,
      groupId,
      Dave: creator,
      Bob: otherMembers[0],
      Charlie: otherMembers[1],
      Alice: otherMembers[2],
      signers
    };
  }

  async function createGroupOf3Fixture() {
    return createGroupFixture("Spesa casa pisa", [1, 2], 0);
  }

  async function deployManagerFixture() {
    const { manager } = await loadFixture(deployFixture);
    return { groupManager: manager as TrustGroupManager };
  }

  const parseAmount = (amount: any) => hre.ethers.parseUnits(amount.toString(), 18);

  describe("Group creation", function () {

    describe("Correct creation of group", function () {

      it("Should create correctly the group with correct id", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);

        expect(groupId).to.be.gt(0);
      });

      it("Every member can retrieve the group", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const group_by_first = await groupManager.connect(otherMembers[0]).retrieveGroup(groupId);
        const group_by_creator = await groupManager.connect(creator).retrieveGroup(groupId);
        const group_by_second = await groupManager.connect(otherMembers[1]).retrieveGroup(groupId);

        expect(group_by_first.name).to.equal("Spesa casa pisa");
        expect(group_by_creator.name).to.equal("Spesa casa pisa");
        expect(group_by_second.name).to.equal("Spesa casa pisa");
      });

      it("Should contain a member only once even if i pass him twice in otherMembers", async function () {
        const { token, manager, signers } = await loadFixture(deployFixture);
        const [creator, member2, member3] = signers;
        await manager.connect(creator).createGroup(
          "Spesa casa pisa",
          [member2.address, member3.address, member2.address, member2.address, member3.address]
        );

        const group = await manager.connect(creator).retrieveGroup(1);

        expect(group.members.length).to.be.eq(3);
        expect(group.members.some(a => a === creator.address)).to.be.true;
        expect(group.members.some(a => a === member2.address)).to.be.true;
        expect(group.members.some(a => a === member3.address)).to.be.true;
      });

      it("Should contain creator only once even if i pass him in otherMembers", async function () {
        const { token, manager: taskGroupManager, signers } = await loadFixture(deployFixture);
        const [creator, member2, member3] = signers;
        await taskGroupManager.connect(creator).createGroup(
          "Spesa casa pisa",
          [member2.address, member3.address, creator]
        );

        const group = await taskGroupManager.connect(creator).retrieveGroup(1);

        expect(group.members.length).to.be.eq(3);
        expect(group.members.some(a => a === creator.address)).to.be.true;
        expect(group.members.some(a => a === member2.address)).to.be.true;
        expect(group.members.some(a => a === member3.address)).to.be.true;
      });

    });

    describe("Validations", function () {
      it("Should not be able to retrieve group if you are not member", async function () {
        const { groupManager, groupId, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const externalMembers = (await hre.ethers.getSigners())[otherMembers.length + 1];

        await expect(groupManager.connect(externalMembers).retrieveGroup(groupId)).to.be.revertedWith(
          "You are not member of this group"
        );
      });

      it("Should not be able to retrieve group if it does not exsist", async function () {
        const { groupManager } = await loadFixture(deployManagerFixture);
        const user = (await hre.ethers.getSigners())[0];

        await expect(groupManager.connect(user).retrieveGroup(3)).to.be.revertedWith(
          "You are not member of this group"
        );
      });

    });

    describe("Events", function () {
      it("Should emit an event on group creation", async function () {
        const { token, manager: taskGroupManager, signers } = await loadFixture(deployFixture);
        const [creator, member2, member3] = signers;

        await expect(taskGroupManager.connect(creator).createGroup(
          "Spesa casa pisa",
          [member2.address, member3.address]))
          .to.emit(taskGroupManager, "GroupCreated").withArgs(
            1, // Primo ID gruppo, se parte da 1
            "Spesa casa pisa",
            creator.address,
            [member2.address, member3.address, creator.address] // Ordine come salvato nello storage
          );
      });

      it("Should emit an event of UserApproved for each member on creation", async function () {
        const { token, manager: taskGroupManager, signers } = await loadFixture(deployFixture);
        const [creator, member2, member3] = signers;

        await expect(taskGroupManager.connect(creator).createGroup(
          "Spesa casa pisa",
          [member2.address, member3.address]))
          .to.emit(taskGroupManager, "UserApproved").withArgs(
            1, // Primo ID gruppo, se parte da 1
            creator.address
          )
          .to.emit(taskGroupManager, "UserApproved").withArgs(
            1,
            member2.address
          )
          .to.emit(taskGroupManager, "UserApproved").withArgs(
            1,
            member3.address
          );
      });
    });

  });


  describe("Expenses creation handling", function () {

    describe("Correct creation of expenses", function () {

      describe("Split EQUAL", function () {

        it("Should properly handle debs for one expenses splitted with one payer different than registrator", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 8, [firstMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(8);
          expect(await groupManager.connect(expenseRegistator)
            .getMyBalanceInGroup(groupId)).to.be.eq(8);
          expect(await groupManager.connect(firstMember)
            .getMyBalanceInGroup(groupId)).to.be.eq(-8);
        });

        it("Should properly handle debs for one expenses splitted with two payers different than registrator", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          const secondMember = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(4);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(4);
        });

        it("Should properly handle debs for one expenses splitted with one payers different than registrator", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 8, [firstMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(8);
        });

        it("Should properly handle debs for one expenses splitted with number of payers not multiple of expense", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          const secondMember = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 8, [creator, firstMember, secondMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(3);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(2);
        });

        it("Should create debt from debitor to the registrator for one expense splitted beetween the two", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = otherMembers[0];
          const expenseDebitor = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor], 0, []);

          expect(await groupManager.connect(expenseDebitor)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(3);
          expect(await groupManager.connect(creator)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(0);
        });

        it("Should update balance of single debitor and registrator for one expense splitted beetween the two", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = otherMembers[0];
          const expenseDebitor = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor], 0, []);

          expect(await groupManager.connect(expenseDebitor)
            .getMyBalanceInGroup(groupId)).to.be.eq(-3);
          expect(await groupManager.connect(expenseRegistator)
            .getMyBalanceInGroup(groupId)).to.be.eq(+3);
        });

        it("Should create debts from the two debitors to the registrator for one expense splitted beetween the three", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const expenseDebitor1 = otherMembers[0];
          const expenseDebitor2 = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor1, expenseDebitor2], 0, []);

          expect(await groupManager.connect(expenseDebitor1)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(2);
          expect(await groupManager.connect(expenseDebitor2)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(2);
        });

        it("Should update balance of two debitors and registrator for one expense splitted beetween the three", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const expenseDebitor1 = otherMembers[0];
          const expenseDebitor2 = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor1, expenseDebitor2], 0, []);

          expect(await groupManager.connect(expenseRegistator)
            .getMyBalanceInGroup(groupId)).to.be.eq(4);
          expect(await groupManager.connect(expenseDebitor1)
            .getMyBalanceInGroup(groupId)).to.be.eq(-2);
          expect(await groupManager.connect(expenseDebitor2)
            .getMyBalanceInGroup(groupId)).to.be.eq(-2);
        });

        it("Should properly handle balance for two expenses with payers one inverse of the other and equal amount", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 6, [firstMember, secondMember], 0, []);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 6, [secondMember, firstMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .getMyBalanceInGroup(groupId)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .getMyBalanceInGroup(groupId)).to.be.eq(0);
        });

        it("Should properly handle balance for two expenses with payers one inverse of the other and different amount", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 0, []);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 6, [firstMember, secondMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .getMyBalanceInGroup(groupId)).to.be.eq(1);
          expect(await groupManager.connect(secondMember)
            .getMyBalanceInGroup(groupId)).to.be.eq(-1);
        });

        it("Should properly handle debs for two expenses with payers one inverse of the other and equal amount", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 6, [firstMember, secondMember], 0, []);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 6, [firstMember, secondMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
        });

        it("Should properly handle debs for two expenses with payers one inverse of the other and different amount - first greater", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 0, []);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 6, [firstMember, secondMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, firstMember)).to.be.eq(1);
        });

        it("Should properly handle debs for two expenses with payers one inverse of the other and different amount - second greater", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 0, []);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 12, [firstMember, secondMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(2);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, firstMember)).to.be.eq(0);
        });

        it("Should properly accumulate debs for two expenses with same creator and debitor", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 0, []);
          await groupManager.connect(firstMember).registerExpenses(groupId, "Pomodoro", 6, [firstMember, secondMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, firstMember)).to.be.eq(7);
        });

      });

      describe("Split EXACT", function () {

        it("Should properly handle debs for one expenses splitted with two payers different than registrator", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          const secondMember = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 1, [3, 5]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(3);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(5);
        });


        it("Should properly handle debs for one expenses splitted with one payers different than registrator", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 8, [firstMember], 1, [8]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(8);
        });

        it("Should create debt from debitor to the registrator for one expense splitted beetween the two", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = otherMembers[0];
          const expenseDebitor = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor], 1, [5, 1]);

          expect(await groupManager.connect(expenseDebitor)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(1);
          expect(await groupManager.connect(creator)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(0);
        });

        it("Should update balance of single debitor and registrator for one expense splitted beetween the two", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = otherMembers[0];
          const expenseDebitor = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor], 1, [2, 4]);

          expect(await groupManager.connect(expenseDebitor)
            .getMyBalanceInGroup(groupId)).to.be.eq(-4);
          expect(await groupManager.connect(expenseRegistator)
            .getMyBalanceInGroup(groupId)).to.be.eq(+4);
        });

        it("Should create debts from the two debitors to the registrator for one expense splitted beetween the three", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const expenseDebitor1 = otherMembers[0];
          const expenseDebitor2 = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor1, expenseDebitor2], 1, [1, 2, 3]);

          expect(await groupManager.connect(expenseDebitor1)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(2);
          expect(await groupManager.connect(expenseDebitor2)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(3);
        });

        it("Should update balance of two debitors and registrator for one expense splitted beetween the three", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const expenseDebitor1 = otherMembers[0];
          const expenseDebitor2 = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor1, expenseDebitor2], 1, [3, 2, 1]);

          expect(await groupManager.connect(expenseRegistator)
            .getMyBalanceInGroup(groupId)).to.be.eq(3);
          expect(await groupManager.connect(expenseDebitor1)
            .getMyBalanceInGroup(groupId)).to.be.eq(-2);
          expect(await groupManager.connect(expenseDebitor2)
            .getMyBalanceInGroup(groupId)).to.be.eq(-1);
        });

        it("Should properly handle balance for two expenses with payers one inverse of the other and equal amount", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 6, [firstMember, secondMember], 1, [4, 2]);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 6, [secondMember, firstMember], 1, [4, 2]);

          expect(await groupManager.connect(firstMember)
            .getMyBalanceInGroup(groupId)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .getMyBalanceInGroup(groupId)).to.be.eq(0);
        });

        it("Should properly handle debs for two expenses with payers one inverse of the other and equal amount", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 1, [2, 6]);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 8, [firstMember, secondMember], 1, [6, 2]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
        });

        it("Should properly handle debs for two expenses with payers one inverse of the other and different amount - first greater", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 1, [2, 6]);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 6, [firstMember, secondMember], 1, [4, 2]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, firstMember)).to.be.eq(2);
        });

        it("Should properly handle debs for two expenses with payers one inverse of the other and different amount - second greater", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 6, [firstMember, secondMember], 1, [4, 2]);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 8, [firstMember, secondMember], 1, [1, 7]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, firstMember)).to.be.eq(1);
        });

        it("Should properly accumulate debs for two expenses with same creator and debitor", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 1, [6, 2]);
          await groupManager.connect(firstMember).registerExpenses(groupId, "Pomodoro", 6, [firstMember, secondMember], 1, [2, 4]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, firstMember)).to.be.eq(6);
        });

      });

      describe("Split PERCENTAGE", function () {

        it("Should properly handle debs for one expenses splitted with two payers different than registrator", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          const secondMember = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 60, [firstMember, secondMember], 2, [25, 75]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(15);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(45);
        });

        it("Should properly handle debs for one expenses splitted with two payers different than registrator with remainder (round)", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          const secondMember = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 2, [20, 80]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(2);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(6);
        });

        it("Should properly handle debs for one expenses splitted beetween 3 and with remainder", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          const secondMember = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 55, [expenseRegistator, firstMember, secondMember], 2, [17, 35, 48]);


          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(19);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(27);
        });

        it("Should properly handle debs for two expenses with payers one inverse of the other and equal amount", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 2, [20, 80]);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 8, [firstMember, secondMember], 2, [80, 20]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
        });

        it("Should properly handle debs for two expenses with payers one inverse of the other and different amount - first greater", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 8, [firstMember, secondMember], 2, [20, 80]);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 6, [firstMember, secondMember], 2, [80, 20]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, firstMember)).to.be.eq(1);
        });

        it("Should properly handle debs for two expenses with payers one inverse of the other and different amount - second greater", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 6, [firstMember, secondMember], 2, [20, 80]);
          await groupManager.connect(secondMember).registerExpenses(groupId, "Pomodoro", 8, [firstMember, secondMember], 2, [80, 20]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(1);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, firstMember)).to.be.eq(0);
        });

        it("Should properly accumulate debs for two expenses with same creator and debitor", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
          const firstMember = creator;
          const secondMember = otherMembers[0];
          await groupManager.connect(firstMember).registerExpenses(groupId, "Paper", 6, [firstMember, secondMember], 2, [20, 80]);
          await groupManager.connect(firstMember).registerExpenses(groupId, "Pomodoro", 8, [firstMember, secondMember], 2, [80, 20]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, secondMember)).to.be.eq(0);
          expect(await groupManager.connect(secondMember)
            .groupDebtTo(groupId, firstMember)).to.be.eq(7);
        });

      });

      it("Test with multiple expenses: Alice, Bob, Charlie", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
        const alice = creator;
        const bob = otherMembers[0];
        const charlie = otherMembers[1];
        // 1. Alice pays 90€ for all (EQUAL)
        await groupManager.connect(alice).registerExpenses(
          groupId,
          "Dinner",
          90,
          [alice.address, bob.address, charlie.address],
          0, // EQUAL
          []
        );

        // 2. Bob pays 40€: for Alice (10) and Charlie (30) - EXACT
        await groupManager.connect(bob).registerExpenses(
          groupId,
          "Taxi",
          40,
          [alice.address, charlie.address],
          1, // EXACT
          [10, 30]
        );

        // 3. Charlie pays 60€ split by percentage (25% Alice, 75% Bob)
        await groupManager.connect(charlie).registerExpenses(
          groupId,
          "Groceries",
          60,
          [alice.address, bob.address],
          2, // PERCENTAGE
          [25, 75]
        );

        // Check debs
        expect(await groupManager.connect(alice).groupDebtTo(groupId, charlie)).to.eq(-0);
        expect(await groupManager.connect(alice).groupDebtTo(groupId, bob)).to.eq(-0);
        expect(await groupManager.connect(bob).groupDebtTo(groupId, alice)).to.eq(20);
        expect(await groupManager.connect(bob).groupDebtTo(groupId, charlie)).to.eq(15);
        expect(await groupManager.connect(charlie).groupDebtTo(groupId, alice)).to.eq(15);
        expect(await groupManager.connect(charlie).groupDebtTo(groupId, bob)).to.eq(0);
        // Check balances
        expect(await groupManager.connect(alice).getMyBalanceInGroup(groupId)).to.eq(35);
        expect(await groupManager.connect(bob).getMyBalanceInGroup(groupId)).to.eq(-35);
        expect(await groupManager.connect(charlie).getMyBalanceInGroup(groupId)).to.eq(0);
      });

    });

    describe("Validations", function () {
      it("Should not be able to register an expense if you dont belong to group", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
        const externalUser = (await hre.ethers.getSigners())[10];

        await expect(groupManager.connect(externalUser).registerExpenses(
          groupId, "Dinner", 90,
          [creator.address, otherMembers[0].address, otherMembers[1].address], 0,
          []
        )).to.be.revertedWith("You can not register an expense on a group you do not belong to");
      });

      it("Should not be able to register an expense with split EXACT and sum different of amount", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
        const alice = creator;

        await expect(groupManager.connect(alice).registerExpenses(
          groupId, "Dinner", 90,
          [alice.address, otherMembers[0].address, otherMembers[1].address], 1,
          [30, 20, 10]
        )).to.be.revertedWith("Sum of all values should be equal to total amount");
      });

      it("Should not be able to register an expense with split PERCENTAGE and sum different of 100", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
        const alice = creator;

        await expect(groupManager.connect(alice).registerExpenses(
          groupId, "Dinner", 90,
          [alice.address, otherMembers[0].address, otherMembers[1].address], 2,
          [30, 20, 10]
        )).to.be.revertedWith("Sum of all values should be equal to 100%");
      });

      it("Should not be able to register an expense amount 0", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
        const alice = creator;

        await expect(groupManager.connect(alice).registerExpenses(
          groupId, "Dinner", 0,
          [alice.address, otherMembers[0].address, otherMembers[1].address], 0,
          []
        )).to.be.revertedWith("Amount must be greater than 0");
      });

      it("Should not be able to register an expense with split exact and length of values different of splitWith", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
        const alice = creator;

        await expect(groupManager.connect(alice).registerExpenses(
          groupId, "Dinner", 90,
          [alice.address, otherMembers[0].address, otherMembers[1].address], 1,
          [30, 20] // Only two values, but three participants
        )).to.be.revertedWith("Number of values passed should match the number of member to split with");
      });

      it("Should not be able to register an expense with split PERCENTAGE and length of values different of splitWith", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
        const alice = creator;

        await expect(groupManager.connect(alice).registerExpenses(
          groupId, "Dinner", 90,
          [alice.address, otherMembers[0].address, otherMembers[1].address], 1,
          [50, 50] // Only two values, but three participants
        )).to.be.revertedWith("Number of values passed should match the number of member to split with");
      });


    });

    describe("Events", function () {
      it("Should emit an event on expense registration EQUAL", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
        const alice = creator;
        const bob = otherMembers[0];
        const charlie = otherMembers[1];

        await expect(groupManager.connect(alice).registerExpenses(
          groupId, "Dinner", 90,
          [alice.address, bob.address, charlie.address], 0,
          []
        )).to.emit(groupManager, "ExpenseRegistered")
          .withArgs(
            groupId,
            anyValue,
            alice.address,
            90,
            "Dinner",
            [alice.address, bob.address, charlie.address],
            [30, 30, 30]
          );
      });

      it("Should emit an event on expense registration EXACT", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
        const alice = creator;
        const bob = otherMembers[0];
        const charlie = otherMembers[1];

        await expect(groupManager.connect(alice).registerExpenses(
          groupId, "Dinner", 90,
          [bob.address, charlie.address], 1,
          [20, 70]
        )).to.emit(groupManager, "ExpenseRegistered")
          .withArgs(
            groupId,
            anyValue,
            alice.address,
            90,
            "Dinner",
            [bob.address, charlie.address],
            [20, 70]
          );
      });

      it("Should emit an event on expense registration PERCENTAGE", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroupFixture);
        const alice = creator;
        const bob = otherMembers[0];
        const charlie = otherMembers[1];

        await expect(groupManager.connect(alice).registerExpenses(
          groupId, "Dinner", 60,
          [bob.address, charlie.address], 2,
          [30, 70]
        )).to.emit(groupManager, "ExpenseRegistered")
          .withArgs(
            groupId,
            anyValue,
            alice.address,
            60,
            "Dinner",
            [bob.address, charlie.address],
            [18, 42]
          );
      });
    });
  });

  describe("Debt semplification", function () {

    it("Should not change anything in case of single edge", async function () {

      const { token, groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4Fixture);

      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 4, [Bob], 0, []);

      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(4);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(-4);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);

      await groupManager.connect(Dave).simplifyDebt(groupId);

      //same balance
      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(4);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(-4);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);

      //different edges
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);

      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Dave)).to.be.eq(4);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
    });

    it("Should not change anything in the case of multiple incoming edges to the same node", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4Fixture);

      ///recreate the situation of the assignment
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 4, [Bob], 0, []);
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 4, [Alice], 0, []);

      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(-4);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(8);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(-4);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);

      await groupManager.connect(Dave).simplifyDebt(groupId);

      //same balance
      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(-4);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(8);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(-4);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);

      //different edges
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Dave)).to.be.eq(4);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);

      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Dave)).to.be.eq(4);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
    });

    it("Should not change anything in the case of multiple outgoing edges of the same node", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4Fixture);

      ///recreate the situation of the assignment
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 4, [Bob], 0, []);
      await groupManager.connect(Alice).registerExpenses(groupId, "Beer", 5, [Bob], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 2, [Bob], 0, []);

      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(5);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(4);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(-11);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(2);

      await groupManager.connect(Dave).simplifyDebt(groupId);

      //same balance
      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(5);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(4);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(-11);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(2);

      //different edges
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);

      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Alice)).to.be.eq(5);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Dave)).to.be.eq(4);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Charlie)).to.be.eq(2);
    });

    it("Should simplify two outgoing edges into one when the intermediate node owes the same amount to third node", async function () {
      //A -> 10 -> C
      //A -> 10 -> B
      //B -> 10 -> C
      //OUT
      //A -> 20 -> C
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4Fixture);

      ///recreate the situation of the assignment
      await groupManager.connect(Bob).registerExpenses(groupId, "Beer", 10, [Alice], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 10, [Alice], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 10, [Bob], 0, []);

      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(-20);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(20);

      await groupManager.connect(Dave).simplifyDebt(groupId);

      //same balance
      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(-20);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(20);

      //different edges
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Charlie)).to.be.eq(20);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);

      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
    });

    it("Should simplify a cicle of three node in a single edge if one node of the cicle has a balance of 0", async function () {
      //A -> 5 -> B
      //B -> 5 -> C
      //C -> 10 -> A
      //OUT
      //C -> 5 -> A
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4Fixture);

      ///recreate the situation of the assignment
      await groupManager.connect(Bob).registerExpenses(groupId, "Beer", 5, [Alice], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 5, [Bob], 0, []);
      await groupManager.connect(Alice).registerExpenses(groupId, "Beer", 10, [Charlie], 0, []);

      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(5);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(-5);

      await groupManager.connect(Dave).simplifyDebt(groupId);

      //same balance
      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(5);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(-5);

      //different edges
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);

      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Alice)).to.be.eq(5);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
    });

    it("Should simplify a cicle if all node in the cycle has a balance of 0", async function () {
      //A -> 5 -> B
      //B -> 5 -> C
      //C -> 5 -> D
      //D -> 5 -> A
      //OUT
      //
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4Fixture);

      ///recreate the situation of the assignment
      await groupManager.connect(Bob).registerExpenses(groupId, "Beer", 5, [Alice], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 5, [Bob], 0, []);
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 5, [Charlie], 0, []);
      await groupManager.connect(Alice).registerExpenses(groupId, "Beer", 5, [Dave], 0, []);

      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);

      //initial edges
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Bob)).to.be.eq(5);

      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Alice)).to.be.eq(5);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);

      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Dave)).to.be.eq(5);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Charlie)).to.be.eq(5);

      await groupManager.connect(Dave).simplifyDebt(groupId);

      //same balance
      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(0);

      //different edges
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);

      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
    });

    it("Should simplify debts as described in the example of PDF", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4Fixture);

      ///recreate the situation of the assignment
      await groupManager.connect(Dave).registerExpenses(groupId, "Beer", 4, [Bob], 0, []);
      await groupManager.connect(Alice).registerExpenses(groupId, "Beer", 12, [Dave], 0, []);
      await groupManager.connect(Alice).registerExpenses(groupId, "Beer", 5, [Charlie], 0, []);
      await groupManager.connect(Charlie).registerExpenses(groupId, "Beer", 7, [Bob], 0, []);
      await groupManager.connect(Bob).registerExpenses(groupId, "Beer", 10, [Alice], 0, []);

      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(7);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(-8);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(-1);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(2);

      await groupManager.connect(Dave).simplifyDebt(groupId);

      //same balance
      expect(await groupManager.connect(Alice)
        .getMyBalanceInGroup(groupId)).to.be.eq(7);
      expect(await groupManager.connect(Dave)
        .getMyBalanceInGroup(groupId)).to.be.eq(-8);
      expect(await groupManager.connect(Bob)
        .getMyBalanceInGroup(groupId)).to.be.eq(-1);
      expect(await groupManager.connect(Charlie)
        .getMyBalanceInGroup(groupId)).to.be.eq(2);

      //different edges
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Charlie)).to.be.eq(0);
      expect(await groupManager.connect(Alice)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Alice)).to.be.eq(7);
      expect(await groupManager.connect(Dave)
        .groupDebtTo(groupId, Charlie)).to.be.eq(1);

      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Charlie)
        .groupDebtTo(groupId, Bob)).to.be.eq(0);

      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Alice)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Dave)).to.be.eq(0);
      expect(await groupManager.connect(Bob)
        .groupDebtTo(groupId, Charlie)).to.be.eq(1);
    });


  });

  describe("Expenses settling", function () {

    describe("Correct settlement of an expense", function () {

      it("Should correctly settle a part of a debt when amount is less than debt", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];

        await token.connect(Alice).approve(groupManager, parseAmount(10));
        await token.connect(Alice).buyTokens({ value: parseAmount(10) });
        await groupManager.connect(Bob).registerExpenses(groupId, "Paper", parseAmount(8), [Bob, Alice], 0, []);
        await groupManager.connect(Alice)
          .settleDebt(groupId, parseAmount(2), Bob);

        expect(await groupManager.connect(Alice)
          .groupDebtTo(groupId, Bob)).to.be.eq(parseAmount(2));
        expect(await groupManager.connect(Alice)
          .getMyBalanceInGroup(groupId)).to.be.eq(parseAmount(-2));
      });

      it("Should correctly delete a debt when amount is equal to debt", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];

        await token.connect(Alice).approve(groupManager, parseAmount(10));
        await token.connect(Alice).buyTokens({ value: parseAmount(10) });
        await groupManager.connect(Bob).registerExpenses(groupId, "Paper", parseAmount(8), [Bob, Alice], 0, []);
        await groupManager.connect(Alice)
          .settleDebt(groupId, parseAmount(4), Bob);

        expect(await groupManager.connect(Alice)
          .groupDebtTo(groupId, Bob)).to.be.eq(0);
        expect(await groupManager.connect(Alice)
          .getMyBalanceInGroup(groupId)).to.be.eq(0);
      });

    });

    describe("Errors", function () {

      it("Should not be able to settle a debt if amount is 0", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];

        await groupManager.connect(Bob).registerExpenses(groupId, "Paper", parseAmount(8), [Bob, Alice], 0, []);
        await expect(groupManager.connect(Alice)
          .settleDebt(groupId, parseAmount(0), Bob)).to.be.revertedWith(
            "Amount must be greater than 0"
          );
      });

      it("Should not be able to settle a debt to yourself", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];

        await groupManager.connect(Bob).registerExpenses(groupId, "Paper", parseAmount(8), [Bob, Alice], 0, []);
        await expect(groupManager.connect(Alice)
          .settleDebt(groupId, parseAmount(1), Alice)).to.be.revertedWith(
            "You can not settle a debt to yourself"
          );
      });


      it("Should not be able to settle a debt if amount is grater than debt", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];

        await groupManager.connect(Bob).registerExpenses(groupId, "Paper", parseAmount(8), [Bob, Alice], 0, []);
        await expect(groupManager.connect(Alice)
          .settleDebt(groupId, parseAmount(10), Bob)).to.be.revertedWith(
            "Debts are smaller than amount!"
          );
      });

      it("Should not be able to settle a debt if sender has not enough token", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];
        await token.connect(Alice).approve(groupManager, parseAmount(10));
        //now she has 3TT
        await token.connect(Alice).buyTokens({ value: parseAmount(0.03) });
        await groupManager.connect(Bob).registerExpenses(groupId, "Paper", parseAmount(8), [Bob, Alice], 0, []);

        await expect(groupManager.connect(Alice)
          .settleDebt(groupId, parseAmount(4), Bob)).to.be.revertedWith(
            "Insufficient balance of token to settle the debs"
          );
      });

      it("Should not be able to settle a debt if allowance of sender to contract is less than amount", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];
        await token.connect(Alice).approve(groupManager, parseAmount(1));
        await token.connect(Alice).buyTokens({ value: parseAmount(4) });
        await groupManager.connect(Bob).registerExpenses(groupId, "Paper", parseAmount(8), [Bob, Alice], 0, []);

        await expect(groupManager.connect(Alice)
          .settleDebt(groupId, parseAmount(4), Bob)).to.be.revertedWith(
            "Not enough allowance given to this contract"
          );
      });

    });


  });

  describe("Group joiner", function () {

    describe("Correct joining of a group", function () {

      it("Should correctly join a group after a member approve the user", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];
        const Charlie = (await hre.ethers.getSigners())[4];
        await groupManager.connect(Charlie).requestToJoin(groupId);
        await groupManager.connect(Alice).approveAddress(groupId, Charlie);
        const group = await groupManager.connect(Charlie)
          .retrieveGroup(groupId);

        expect(group.members.some(a => a === Charlie.address)).to.be.true;
        expect(group.members.length).to.be.eq(4);
      });

      it("Should be able to create a debt after joining the group", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];

        const Charlie = (await hre.ethers.getSigners())[4];
        await groupManager.connect(Charlie).requestToJoin(groupId);
        await groupManager.connect(Alice).approveAddress(groupId, Charlie);
        await groupManager.connect(Charlie).registerExpenses(groupId, "Paper", 8, [Bob, Alice], 0, []);

        expect(await groupManager.connect(Alice)
          .groupDebtTo(groupId, Charlie)).to.be.eq(4);
        expect(await groupManager.connect(Bob)
          .groupDebtTo(groupId, Charlie)).to.be.eq(4);
      });

    });

    describe("Errors", function () {

      it("Should not be able to request to join if already member of group", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];

        await groupManager.connect(Bob).registerExpenses(groupId, "Paper", 8, [Bob, Alice], 0, []);
        await expect(groupManager.connect(Alice)
          .requestToJoin(groupId)).to.be.revertedWith(
            "You already belong to this group"
          );
      });

      it("Should not be able to request to join if he has already submitted a request", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];
        const Charlie = (await hre.ethers.getSigners())[4];
        await groupManager.connect(Charlie).requestToJoin(groupId);

        await expect(groupManager.connect(Charlie).requestToJoin(groupId)).to.be.revertedWith(
          "You already requested to enter in this group"
        );
      });

      it("Should not be able to request to join if he has been approved in the group", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Bob = otherMembers[0];
        const Alice = otherMembers[1];

        const Charlie = (await hre.ethers.getSigners())[4];
        await groupManager.connect(Charlie).requestToJoin(groupId);
        await groupManager.connect(Alice).approveAddress(groupId, Charlie);

        await expect(groupManager.connect(Charlie).requestToJoin(groupId)).to.be.revertedWith(
          "You already belong to this group"
        );
      });

      it("Should not be able to approve a request if he does not belong to group", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Charlie = (await hre.ethers.getSigners())[4];
        const Frank = (await hre.ethers.getSigners())[5];
        await groupManager.connect(Charlie).requestToJoin(groupId);

        await expect(groupManager.connect(Frank).approveAddress(groupId, Charlie)).to.be.revertedWith(
          "You can approve a request only if you belong to the group"
        );
      });

      it("Should not be able to approve a request if the address did not request to enter in the group", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Charlie = (await hre.ethers.getSigners())[4];

        await expect(groupManager.connect(creator).approveAddress(groupId, Charlie)).to.be.revertedWith(
          "The address has not requested to join the group"
        );
      });

    });

    describe("Events", function () {
      it("Should emit an event when a user requests to join a group", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Charlie = (await hre.ethers.getSigners())[4];

        await expect(groupManager.connect(Charlie).requestToJoin(groupId))
          .to.emit(groupManager, "RequestToJoin")
          .withArgs(groupId, Charlie.address);
      });

      it("Should emit an event when a user is approved to join a group", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Alice = otherMembers[1];
        const Charlie = (await hre.ethers.getSigners())[4];

        await groupManager.connect(Charlie).requestToJoin(groupId);
        await expect(groupManager.connect(Alice).approveAddress(groupId, Charlie))
          .to.emit(groupManager, "UserApproved")
          .withArgs(groupId, Charlie.address);
      });

      it("Should emit an event when a a request is rejected", async function () {
        const { groupManager, token, groupId, creator, otherMembers } = await loadFixture(createGroupOf3Fixture);
        const Alice = otherMembers[1];
        const Charlie = (await hre.ethers.getSigners())[4];

        await groupManager.connect(Charlie).requestToJoin(groupId);
        await expect(groupManager.connect(Alice).rejectAddress(groupId, Charlie.address))
          .to.emit(groupManager, "UserRejected")
          .withArgs(groupId, Charlie.address);
      });
    });
  });
});
