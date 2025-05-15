pragma solidity ^0.8.28;

import "../struct/Expense.sol";
import "../struct/Group.sol";

event ExpenseRegistered(
    uint256 indexed groupId,
    address indexed payer,
    uint256 amount,
    string description,
    address[] splitWith,
    SplitMethod method,
    uint256[] values
);

library ExpenseHandler {

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
        if (splitMethod == SplitMethod.EQUAL) {
            splitExpenseEqual(group, amount, splitWith, values);
        } else if (splitMethod == SplitMethod.EXACT) {
            splitExpenseExact(group, amount, splitWith, values);
        } else if (splitMethod == SplitMethod.PERCENTAGE) {
            splitExpensePercentage(group, amount, splitWith, values);
        }
        
        emit ExpenseRegistered(
            group.id,
            msg.sender,
            amount,
            description,
            splitWith,
            splitMethod,
            values
        );

    }

    function splitExpenseEqual(
        Group storage group,
        uint256 amount,
        address[] calldata splitWith,
        uint256[] calldata values
    ) private {
        require(values.length == 0, "No values needed for EQUAL");
        uint256 individualAmount = amount / uint256(splitWith.length);
        uint256 remainder = amount % uint256(splitWith.length);
        for (uint i = 0; i < splitWith.length; i++) {
            address member = splitWith[i];
            // i have to pay my part so i do not borrow anything to anyone
            if (member == msg.sender) continue;
            uint256 amountBorrowed = i < remainder
                ? individualAmount + 1
                : individualAmount;
            updateDebtsGraph(group.debs, member, msg.sender, amountBorrowed);
            group.balances[member] -= int256(amountBorrowed);
            group.balances[msg.sender] += int256(amountBorrowed);
        }
    }

    function splitExpenseExact(
        Group storage group,
        uint256 amount,
        address[] calldata splitWith,
        uint256[] calldata amountsBorrowed
    ) private {
        require(
            amountsBorrowed.length == splitWith.length,
            "Number of values passed should match the number of member to split with"
        );
        require(
            sumValuesEqualTo(amount, amountsBorrowed),
            "Sum of all values should be equal to total amount"
        );
        for (uint i = 0; i < splitWith.length; i++) {
            address member = splitWith[i];
            if (member == msg.sender) continue;
            updateDebtsGraph(
                group.debs,
                member,
                msg.sender,
                amountsBorrowed[i]
            );
            group.balances[member] -= int256(amountsBorrowed[i]);
            group.balances[msg.sender] += int256(amountsBorrowed[i]);
        }
    }

    function splitExpensePercentage(
        Group storage group,
        uint256 amount,
        address[] calldata splitWith,
        uint256[] calldata percentages
    ) private {
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
            updateDebtsGraph(group.debs, member, msg.sender, amountBorrowed);
            group.balances[member] -= int256(amountBorrowed);
            group.balances[msg.sender] += int256(amountBorrowed);
        }
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

    function isIn(
        address[] calldata members,
        address toCheck
    ) private pure returns (bool) {
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == toCheck) return true;
        }
        return false;
    }

    function updateDebtsGraph(
        mapping(address => mapping(address => uint256)) storage debs,
        address from,
        address to,
        uint256 amount
    ) private {
        //exist the inverse arch? is already present an arch in the other direction
        uint256 inverseDebs = debs[to][from];
        if (inverseDebs > 0) {
            if (inverseDebs >= amount) {
                debs[to][from] -= amount;
            } else {
                debs[from][to] = amount - inverseDebs;
                debs[to][from] = 0;
            }
        } else {
            debs[from][to] += amount;
        }
    }
}