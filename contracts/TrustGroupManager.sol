pragma solidity ^0.8.28;

struct Expense {
    string description;
    uint256 amount;
    address paidBy;
    address[] involved;
    SplitMethod method;
}

struct GroupView {
    uint256 id;
    string name;
    uint256 nextExpenseId;
    address creator;
    address[] other_members;
    Expense[] expenses;
}

struct Group {
    uint256 id;
    string name;
    uint256 nextExpenseId;
    address creator;
    address[] members;
    Expense[] expenses;
    mapping(address => mapping(address => uint256)) debs;
    mapping(address => int256) balances;
}

enum SplitMethod {
    EQUAL,
    EXACT,
    PERCENTAGE
}

struct Balance {
    address member;
    int256 amount;
}

contract TrustGroupManager {
    uint256 public nextGroupId;
    mapping(uint256 => Group) private groups;

    function createGroup(
        string calldata name,
        address[] calldata other_members
    ) public returns (uint256) {
        uint id = ++nextGroupId;
        Group storage newGroup = groups[id];
        newGroup.name = name;
        newGroup.id = id;
        newGroup.creator = msg.sender;
        newGroup.members = other_members;
        newGroup.members.push(msg.sender);
        return id;
    }

    function retrieveGroup(
        uint256 group_id
    ) external view returns (GroupView memory) {
        Group storage group = groups[group_id];
        require(group.id != 0, "You are not member of this group");
        require(
            isMemberOfGroup(group, msg.sender),
            "You are not member of this group"
        );
        return
            GroupView({
                id: group.id,
                name: group.name,
                nextExpenseId: group.nextExpenseId,
                creator: group.creator,
                other_members: group.members,
                expenses: group.expenses
            });
    }

    function registerExpenses(
        uint256 group_id,
        string calldata description,
        uint256 amount,
        address[] calldata splitWith,
        SplitMethod splitMethod,
        uint256[] calldata values
    ) external {
        Group storage group = groups[group_id];
        require(group.id != 0);
        require(
            isMemberOfGroup(group, msg.sender),
            "You can not register an expense on a group you do not belong to"
        );
        require(
            allMemberOfGroup(group, splitWith),
            "You can not register an expense to split with an address that not belont to group"
        );
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
        Expense memory expense = Expense(
            description,
            amount,
            msg.sender,
            splitWith,
            SplitMethod.EQUAL
        );
        group.expenses.push(expense);
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

    function getMyBalanceInGroup(
        uint256 group_id
    ) external view returns (int256) {
        Group storage group = groups[group_id];
        require(group.id != 0, "You are not member of this group");
        require(
            isMemberOfGroup(group, msg.sender),
            "You are not member of this group"
        );
        return group.balances[msg.sender];
    }

    function groupDebtTo(
        uint256 group_id,
        address to
    ) external view returns (uint256) {
        Group storage group = groups[group_id];
        require(group.id != 0, "You are not member of this group");
        require(
            isMemberOfGroup(group, msg.sender),
            "You are not member of this group"
        );
        return group.debs[msg.sender][to];
    }

    function isMemberOfGroup(
        Group storage group,
        address member
    ) private view returns (bool) {
        for (uint256 i = 0; i < group.members.length; i++) {
            if (member == group.members[i]) {
                return true;
            }
        }
        return false;
    }

    function allMemberOfGroup(
        Group storage group,
        address[] calldata members
    ) private view returns (bool) {
        for (uint256 i = 0; i < members.length; i++) {
            if (!isMemberOfGroup(group, members[i])) {
                return false;
            }
        }
        return true;
    }

    function abs(int256 x) internal pure returns (uint256) {
        return uint256(x >= 0 ? x : -x);
    }

    function order(Balance[] memory balances) private {}

    function insertOrdered(
        Balance[] memory balances,
        Balance memory newBalance
    ) private {}
}
