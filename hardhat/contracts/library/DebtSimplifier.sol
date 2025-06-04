pragma solidity ^0.8.28;

import "../struct/Expense.sol";
import "../struct/Group.sol";
import "../struct/Balance.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

using EnumerableSet for EnumerableSet.AddressSet;


library DebtSimplifier {

    event DebtSimplified(
        uint256 indexed groupId
    );

    function simplifyDebt(Group storage group) internal {
        // To work in memory and simplify future steps, both 'debitors' and 'creditors' arrays are preallocated with the full number of group members.
        // Only the first 'debtSize' and 'credSize' elements are actually used, since Solidity does not allow dynamic resizing (e.g. push) in memory arrays.
        (
            Balance[] memory debitors,
            uint debtSize,
            Balance[] memory creditors,
            uint credSize
        ) = extractSortedCreditorsAndDebitors(group);
        resetDebtGraph(group);
        while (credSize > 0 && debtSize > 0) {
            Balance memory largestCreditor = creditors[--credSize];
            Balance memory largestDebitor = debitors[--debtSize];
            uint256 largestCreditorAmount = abs(largestCreditor.amount);
            uint256 largestDebitorAmount = abs(largestDebitor.amount);
            uint256 minValue = min(largestCreditorAmount, largestDebitorAmount);
            group.debts[largestDebitor.member][
                largestCreditor.member
            ] = minValue;
            //positive amount means that previous largest creditor still needs to receive some money
            //instead negative amount means that previous largest debitor still needs to give some money
            int256 toAdjust = largestCreditor.amount + largestDebitor.amount;
            if (toAdjust < 0) {
                largestDebitor.amount = toAdjust;
                debitors[debtSize++] = largestDebitor;
                correctLastElementPosition(debitors, debtSize);
            } else if (largestDebitorAmount < largestCreditorAmount) {
                largestCreditor.amount = toAdjust;
                creditors[credSize++] = largestCreditor;
                correctLastElementPosition(creditors, credSize);
            }
        }
        emit DebtSimplified(group.id);
    }

    function extractSortedCreditorsAndDebitors(
        Group storage group
    ) private view returns (Balance[] memory, uint, Balance[] memory, uint) {
        uint memberCount = group.members.length();
        Balance[] memory creditors = new Balance[](memberCount);
        Balance[] memory debitors = new Balance[](memberCount);
        uint credSize = 0;
        uint debtSize = 0;

        for (uint i = 0; i < memberCount; i++) {
            address member = group.members.at(i);
            int256 balanceAmount = group.balances[member];
            if (balanceAmount > 0) {
                creditors[credSize++] = Balance(member, balanceAmount);
            } else if (balanceAmount < 0) {
                debitors[debtSize++] = Balance(member, balanceAmount);
            }
        }
        insertionSort(creditors, credSize);
        insertionSort(debitors, debtSize);
        return (debitors, debtSize, creditors, credSize);
    }

    function abs(int256 x) internal pure returns (uint256) {
        return uint256(x >= 0 ? x : -x);
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function resetDebtGraph(Group storage group) private {
        EnumerableSet.AddressSet storage members = group.members;
        uint memberCount = members.length();
        for (uint i = 0; i < memberCount; i++) {
            for (uint j = i + 1; j < memberCount; j++) {
                group.debts[members.at(i)][members.at(j)] = 0;
                group.debts[members.at(j)][members.at(i)] = 0;
            }
        }
    }

    function selectionSortOrder(Balance[] memory balances) private pure {}

    function insertionSort(
        Balance[] memory balances,
        uint256 realSize
    ) private pure {
        for (uint i = 1; i < realSize; i++) {
            Balance memory toInsert = balances[i];
            uint correctPos = i - 1;
            while (
                correctPos > 0 && balances[correctPos].amount > toInsert.amount
            ) {
                balances[correctPos + 1] = balances[correctPos];
                correctPos -= 1;
            }
            balances[correctPos + 1] = toInsert;
        }
    }

    function correctLastElementPosition(
        Balance[] memory balances,
        uint256 realSize
    ) private pure {
        if (realSize == 1) {
            return;
        }
        uint currentElemPos = realSize - 1;
        Balance memory toInsert = balances[currentElemPos];
        uint correctPos = currentElemPos - 1;
        while (
            correctPos > 0 && balances[correctPos].amount > toInsert.amount
        ) {
            balances[correctPos + 1] = balances[correctPos];
            correctPos -= 1;
        }
        balances[correctPos + 1] = toInsert;
    }
}
