import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("TrustGroupManager", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployManager() {
    const GroupManagerFactory = await hre.ethers.getContractFactory("TrustGroupManager");
    const taskGroupManager = await GroupManagerFactory.deploy();

    return { groupManager: taskGroupManager };
  }

  describe("Deployment", function () {

  });

  describe("Group creation", function () {
    async function createGroup() {
      const GroupManagerFactory = await hre.ethers.getContractFactory("TrustGroupManager");
      const taskGroupManager = await GroupManagerFactory.deploy();
      const [creator, member2, member3] = await hre.ethers.getSigners();

      // Simulazione: ottieni il groupId senza scrivere
      const groupId = await taskGroupManager.connect(creator).createGroup.staticCall(
        "Spesa casa pisa",
        [member2.address, member3.address]
      );

      // Esegui davvero la transazione
      await taskGroupManager.connect(creator).createGroup(
        "Spesa casa pisa",
        [member2.address, member3.address]
      );
      return { groupManager: taskGroupManager, groupId: groupId, creator: creator, otherMembers: [member2, member3] };
    }

    describe("Correct creation of group", function () {

      it("Should create correctly the group with correct id", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);

        expect(groupId).to.be.gt(0);
      });

      it("Every member can retrieve the group", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
        const group_by_first = await groupManager.connect(otherMembers[0]).retrieveGroup(groupId);
        const group_by_creator = await groupManager.connect(creator).retrieveGroup(groupId);
        const group_by_second = await groupManager.connect(otherMembers[1]).retrieveGroup(groupId);

        expect(group_by_first.name).to.equal("Spesa casa pisa");
        expect(group_by_creator.name).to.equal("Spesa casa pisa");
        expect(group_by_second.name).to.equal("Spesa casa pisa");
      });

    });

    describe("Validations", function () {
      it("Should not be able to retrieve group if you are not member", async function () {
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
        const externalMembers = (await hre.ethers.getSigners())[otherMembers.length + 1];

        await expect(groupManager.connect(externalMembers).retrieveGroup(groupId)).to.be.revertedWith(
          "You are not member of this group"
        );
      });

      it("Should not be able to retrieve group if it does not exsist", async function () {
        const { groupManager } = await loadFixture(deployManager);
        const user = (await hre.ethers.getSigners())[0];

        await expect(groupManager.connect(user).retrieveGroup(3)).to.be.revertedWith(
          "You are not member of this group"
        );
      });

    });

    describe("Events", function () {
      it("Should emit an event on group creation", async function () {

      });
    });


  });


  describe("Expenses handling", function () {
    async function createGroup() {
      const GroupManagerFactory = await hre.ethers.getContractFactory("TrustGroupManager");
      const taskGroupManager = await GroupManagerFactory.deploy();
      const [creator, member2, member3] = await hre.ethers.getSigners();

      // Simulazione: ottieni il groupId senza scrivere
      const groupId = await taskGroupManager.connect(creator).createGroup.staticCall(
        "Spesa casa pisa",
        [member2.address, member3.address]
      );

      // Esegui davvero la transazione
      await taskGroupManager.connect(creator).createGroup(
        "Spesa casa pisa",
        [member2.address, member3.address]
      );
      return { groupManager: taskGroupManager, groupId: groupId, creator: creator, otherMembers: [member2, member3] };
    }

    describe("Correct creation of expenses", function () {

      describe("Split EQUAL", function () {

        it("Should properly handle debs for one expenses splitted with one payer different than registrator", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 8, [firstMember], 0, []);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(8);
        });

        it("Should properly handle debs for one expenses splitted with number of payers not multiple of expense", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
          const expenseRegistator = otherMembers[0];
          const expenseDebitor = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor], 0, []);

          expect(await groupManager.connect(expenseDebitor)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(3);
          expect(await groupManager.connect(creator)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(0);
        });

        it("Should update balance of single debitor and registrator for one expense splitted beetween the two", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
          const expenseRegistator = otherMembers[0];
          const expenseDebitor = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor], 0, []);

          expect(await groupManager.connect(expenseDebitor)
            .getMyBalanceInGroup(groupId)).to.be.eq(-3);
          expect(await groupManager.connect(expenseRegistator)
            .getMyBalanceInGroup(groupId)).to.be.eq(+3);
        });

        it("Should create debts from the two debitors to the registrator for one expense splitted beetween the three", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
          const expenseRegistator = creator;
          const firstMember = otherMembers[0];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 8, [firstMember], 1, [8]);

          expect(await groupManager.connect(firstMember)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(8);
        });

        it("Should create debt from debitor to the registrator for one expense splitted beetween the two", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
          const expenseRegistator = otherMembers[0];
          const expenseDebitor = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor], 1, [5, 1]);

          expect(await groupManager.connect(expenseDebitor)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(1);
          expect(await groupManager.connect(creator)
            .groupDebtTo(groupId, expenseRegistator)).to.be.eq(0);
        });

        it("Should update balance of single debitor and registrator for one expense splitted beetween the two", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
          const expenseRegistator = otherMembers[0];
          const expenseDebitor = otherMembers[1];
          await groupManager.connect(expenseRegistator).registerExpenses(groupId, "Paper", 6, [expenseRegistator, expenseDebitor], 1, [2, 4]);

          expect(await groupManager.connect(expenseDebitor)
            .getMyBalanceInGroup(groupId)).to.be.eq(-4);
          expect(await groupManager.connect(expenseRegistator)
            .getMyBalanceInGroup(groupId)).to.be.eq(+4);
        });

        it("Should create debts from the two debitors to the registrator for one expense splitted beetween the three", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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
        const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
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

      describe("Validations", function () {
        it("Should not be able to retrieve group if you are not member", async function () {
          const { groupManager, groupId, creator, otherMembers } = await loadFixture(createGroup);
          const externalMembers = (await hre.ethers.getSigners())[otherMembers.length + 1];

          await expect(groupManager.connect(externalMembers).retrieveGroup(groupId)).to.be.revertedWith(
            "You are not member of this group"
          );
        });

        it("Should not be able to retrieve group if it does not exsist", async function () {
          const { groupManager } = await loadFixture(deployManager);
          const user = (await hre.ethers.getSigners())[0];

          await expect(groupManager.connect(user).retrieveGroup(3)).to.be.revertedWith(
            "You are not member of this group"
          );
        });

      });

      describe("Events", function () {
        it("Should emit an event on group creation", async function () {

        });
      });
    })
  });

  describe("Debt semplification", function () {
    async function createGroupOf4() {
      const GroupManagerFactory = await hre.ethers.getContractFactory("TrustGroupManager");
      const taskGroupManager = await GroupManagerFactory.deploy();
      const [Dave, Bob, Charlie, Alice] = await hre.ethers.getSigners();

      // Simulazione: ottieni il groupId senza scrivere
      const groupId = await taskGroupManager.connect(Dave).createGroup.staticCall(
        "Spesa casa pisa",
        [Bob, Charlie, Alice]
      );

      // Esegui davvero la transazione
      await taskGroupManager.connect(Dave).createGroup(
        "Spesa casa pisa",
        [Bob, Charlie, Alice]
      );
      return {
        groupManager: taskGroupManager, groupId: groupId,
        Dave: Dave, Bob: Bob, Charlie: Charlie, Alice: Alice
      };
    }

    it("Should not change anything in case of single edge", async function () {
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4);

      ///recreate the situation of the assignment
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
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4);

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
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4);

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
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4);

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
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4);

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
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4);

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
      const { groupManager, groupId, Dave, Bob, Charlie, Alice } = await loadFixture(createGroupOf4);

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


  })
});
