pragma solidity ^0.8.28;

import "../struct/Group.sol";
import "../struct/Balance.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./BalanceHeap.sol";

using EnumerableSet for EnumerableSet.AddressSet;

library DebtSimplifier {
    event DebtSimplified(uint256 indexed groupId);

    function simplifyDebt(Group storage group) internal {
        // To work in memory and simplify future steps, we use two heaps:
        // - A min-heap for debitors (negative balances)
        // - A max-heap for creditors (positive balances)
        // This allows efficient extraction of the largest creditor and debitor at each step.
        uint memberCount = group.members.length();
        BalanceHeap.Heap memory debitors = BalanceHeap.initMinHeap(memberCount);
        BalanceHeap.Heap memory creditors = BalanceHeap.initMaxHeap(
            memberCount
        );
        // Populate the heaps with balances
        // We iterate over all members and insert them into the appropriate heap
        for (uint i = 0; i < memberCount; i++) {
            address member = group.members.at(i);
            int256 balanceAmount = group.balances[member];
            if (balanceAmount > 0) {
                BalanceHeap.insert(creditors, Balance(member, balanceAmount));
            } else if (balanceAmount < 0) {
                BalanceHeap.insert(debitors, Balance(member, balanceAmount));
            }
        }

        resetDebtGraph(group);

        while (creditors.size > 0 && debitors.size > 0) {
            // extract the largest creditor and debitor
            Balance memory largestCreditor = BalanceHeap.extractTop(creditors);
            Balance memory largestDebitor = BalanceHeap.extractTop(debitors);

            uint256 largestCreditorAmount = abs(largestCreditor.amount);
            uint256 largestDebitorAmount = abs(largestDebitor.amount);
            uint256 minValue = min(largestCreditorAmount, largestDebitorAmount);
            // the largestDebitor should pay the largestCreditor the minimum between what they owe and what is owed
            group.debts[largestDebitor.member][
                largestCreditor.member
            ] = minValue;

            // positive amount means that previous largest creditor still needs to receive some money
            // instead negative amount means that previous largest debitor still needs to give some money
            int256 toAdjust = largestCreditor.amount + largestDebitor.amount;
            if (toAdjust < 0) {
                // Debitor still owes money, push back with updated amount
                BalanceHeap.insert(
                    debitors,
                    Balance(largestDebitor.member, toAdjust)
                );
            } else if (largestDebitorAmount < largestCreditorAmount) {
                // creditor still needs to receive money, push back with updated amount
                BalanceHeap.insert(
                    creditors,
                    Balance(largestCreditor.member, toAdjust)
                );
            }
        }
        //emit the event for off-chain processing
        emit DebtSimplified(group.id);
    }

    function abs(int256 x) internal pure returns (uint256) {
        return uint256(x >= 0 ? x : -x);
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    // resets the entire debt graph for the group by deleting all debts between every pair of members
    function resetDebtGraph(Group storage group) private {
        EnumerableSet.AddressSet storage members = group.members;
        uint memberCount = members.length();
        // iterate over all unique pairs (i, j) where i != j
        for (uint i = 0; i < memberCount; i++) {
            for (uint j = i + 1; j < memberCount; j++) {
                // remove debt in both directions between member i and member j
                delete group.debts[members.at(i)][members.at(j)];
                delete group.debts[members.at(j)][members.at(i)];
            }
        }
    }
}
