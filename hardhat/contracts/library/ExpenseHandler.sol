pragma solidity ^0.8.28;

import "../struct/Expense.sol";
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
        uint256 expenseId = saveExpense(
            group,
            description,
            amount,
            splitWith,
            amountsForEach
        );

        emit ExpenseRegistered(
            group.id,
            expenseId,
            msg.sender,
            amount,
            description,
            splitWith,
            amountsForEach
        );
    }

    function saveExpense(
        Group storage group,
        string calldata description,
        uint256 amount,
        address[] calldata splitWith,
        uint256[] memory amountsForEach
    ) internal returns (uint256) {
        uint256 expenseId = group.nextExpenseId++;
        Expense storage expense = group.expenses.push();
        expense.id = expenseId;
        expense.description = description;
        expense.amount = amount;
        expense.paidBy = msg.sender;
        expense.timestamp = block.timestamp;
        for (uint i = 0; i < splitWith.length; i++) {
            expense.shares.push(
                ExpenseShare({
                    participant: splitWith[i],
                    amount: amountsForEach[i]
                })
            );
        }
        return expenseId;
    }

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
        if (total > amount) {
            values[maxIndex] -= (total - amount);
        } else if (total < amount) {
            values[maxIndex] += (amount - total);
        }
        return values;
    }

    function roundDiv(uint256 x, uint256 y) internal pure returns (uint256) {
        require(y != 0, "division by zero");
        return (x + y / 2) / y;
    }

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

    function updateDebtsGraph(
        mapping(address => mapping(address => uint256)) storage debs,
        address from,
        address to,
        uint256 amount
    ) private {
        //exist the inverse arch? is already present an arch in the other direction
        if (debs[to][from] >= amount) {
            debs[to][from] -= amount;
        } else {
            uint256 residual = amount - debs[to][from];
            debs[to][from] = 0;
            debs[from][to] += residual;
        }
    }
}
