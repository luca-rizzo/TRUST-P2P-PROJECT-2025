pragma solidity ^0.8.28;

import "../struct/SplitMethod.sol";
import "../struct/Group.sol";

library ExpenseHandler {

    event ExpenseRegistered(
        uint256 indexed groupId,
        uint256 indexed expenseId,
        address indexed payer,
        uint256 amount,
        string description,
        address[] splitWith,
        uint256[] amountForEach
    );

    // registers an expense in the group and emits an event
    function registerExpense(
        Group storage group,
        string calldata description,
        uint256 amount,
        address[] calldata splitWith,
        SplitMethod splitMethod,
        uint256[] calldata values
    ) internal {
        require(
            splitWith.length != 0,
            "You can not register an expense to split with no one"
        );
        uint256[] memory amountsForEach;
        // choose the split method and calculate the amounts for each participant
        if (splitMethod == SplitMethod.EQUAL) {
            amountsForEach = splitExpenseEqual(
                group,
                amount,
                splitWith,
                values
            );
        } else if (splitMethod == SplitMethod.EXACT) {
            amountsForEach = splitExpenseExact(
                group,
                amount,
                splitWith,
                values
            );
        } else if (splitMethod == SplitMethod.PERCENTAGE) {
            amountsForEach = splitExpensePercentage(
                group,
                amount,
                splitWith,
                values
            );
        }

        // emit the event with all expense details
        emit ExpenseRegistered(
            group.id,
            group.nextExpenseId++,
            msg.sender,
            amount,
            description,
            splitWith,
            amountsForEach
        );
    }

    // splits the expense equally among all participants
    function splitExpenseEqual(
        Group storage group,
        uint256 amount,
        address[] calldata splitWith,
        uint256[] calldata values
    ) private returns (uint256[] memory) {
        require(values.length == 0, "No values needed for EQUAL");
        uint256 individualAmount = amount / uint256(splitWith.length);
        uint256 remainder = amount % uint256(splitWith.length);
        uint256[] memory amountForEach = new uint256[](splitWith.length);
        for (uint i = 0; i < splitWith.length; i++) {
            address member = splitWith[i];
            uint256 amountBorrowed = i < remainder
                ? individualAmount + 1
                : individualAmount;
            amountForEach[i] = amountBorrowed;
            // i have to pay my part so i do not register my part as a debt
            if (member == msg.sender) continue;
            updateDebtAndBalances(group, member, msg.sender, amountBorrowed);
        }
        return amountForEach;
    }

    // splits the expense using exact amounts for each participant
    function splitExpenseExact(
        Group storage group,
        uint256 amount,
        address[] calldata splitWith,
        uint256[] calldata amountsForEach
    ) private returns (uint256[] memory) {
        require(
            amountsForEach.length == splitWith.length,
            "Number of values passed should match the number of member to split with"
        );
        require(
            sumValuesEqualTo(amount, amountsForEach),
            "Sum of all values should be equal to total amount"
        );
        for (uint i = 0; i < splitWith.length; i++) {
            address member = splitWith[i];
            if (member == msg.sender) continue;
            updateDebtAndBalances(group, member, msg.sender, amountsForEach[i]);
        }
        return amountsForEach;
    }

    // splits the expense using percentages for each participant
    function splitExpensePercentage(
        Group storage group,
        uint256 amount,
        address[] calldata splitWith,
        uint256[] calldata percentages
    ) private returns (uint256[] memory) {
        require(
            percentages.length == splitWith.length,
            "Number of values passed should match the number of member to split with"
        );
        require(
            sumValuesEqualTo(100, percentages),
            "Sum of all values should be equal to 100%"
        );
        uint256[] memory valuesBorrowed = percentageToValue(
            amount,
            percentages
        );
        for (uint i = 0; i < splitWith.length; i++) {
            address member = splitWith[i];
            if (member == msg.sender) continue;
            uint256 amountBorrowed = valuesBorrowed[i];
            updateDebtAndBalances(group, member, msg.sender, amountBorrowed);
        }
        return valuesBorrowed;
    }

    // converts percentages to actual values, rounding and adjusting for total
    function percentageToValue(
        uint256 amount,
        uint256[] calldata percentages
    ) internal pure returns (uint256[] memory values) {
        uint256 len = percentages.length;
        values = new uint256[](percentages.length);
        uint256 total = 0;
        uint256 maxIndex = 0;
        for (uint256 i = 0; i < len; i++) {
            uint256 value = roundDiv(amount * percentages[i], 100);
            values[i] = value;
            total += value;
            maxIndex = percentages[i] > percentages[maxIndex] ? i : maxIndex;
        }
        // adjust the largest share if rounding caused a mismatch
        if (total > amount) {
            values[maxIndex] -= (total - amount);
        } else if (total < amount) {
            values[maxIndex] += (amount - total);
        }
        return values;
    }

    // divides x by y and rounds to the nearest integer
    function roundDiv(uint256 x, uint256 y) internal pure returns (uint256) {
        require(y != 0, "division by zero");
        return (x + y / 2) / y;
    }

    // checks if the sum of values equals the expected total
    function sumValuesEqualTo(
        uint256 expected,
        uint256[] calldata values
    ) private pure returns (bool) {
        uint sum = 0;
        for (uint i = 0; i < values.length; i++) {
            sum += values[i];
        }
        return sum == expected;
    }

    // updates the debt graph and balances for a transfer from 'from' to 'to'
    function updateDebtAndBalances(
        Group storage group,
        address from,
        address to,
        uint256 amount
    ) internal {
        updateDebtsGraph(group.debts, from, to, amount);
        group.balances[from] -= int256(amount);
        group.balances[to] += int256(amount);
    }

    // updates the debts mapping, netting out mutual debts if present
    function updateDebtsGraph(
        mapping(address => mapping(address => uint256)) storage debs,
        address from,
        address to,
        uint256 amount
    ) private {
        // if there is already a debt in the opposite direction, net it out
        if (debs[to][from] >= amount) {
            debs[to][from] -= amount;
        } else {
            uint256 residual = amount - debs[to][from];
            debs[to][from] = 0;
            debs[from][to] += residual;
        }
    }
}
