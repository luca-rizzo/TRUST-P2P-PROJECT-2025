pragma solidity ^0.8.28;

import "../struct/Expense.sol";
import "../struct/Group.sol";
import "../struct/Balance.sol";

library DebtSimplifier {

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
    }

    function extractSortedCreditorsAndDebitors(
        Group storage group
    ) private view returns (Balance[] memory, uint, Balance[] memory, uint) {
        Balance[] memory creditors = new Balance[](group.members.length);
        Balance[] memory debitors = new Balance[](group.members.length);
        uint credSize = 0;
        uint debtSize = 0;

        for (uint i = 0; i < group.members.length; i++) {
            address member = group.members[i];
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
        address[] storage members = group.members;
        for (uint i = 0; i < members.length; i++) {
            for (uint j = i + 1; j < members.length; j++) {
                group.debts[members[i]][members[j]] = 0;
                group.debts[members[j]][members[i]] = 0;
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
