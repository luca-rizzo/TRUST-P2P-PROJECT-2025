pragma solidity ^0.8.28;
import "hardhat/console.sol";
import "./struct/Expense.sol";
import "./struct/Group.sol";
import "./library/DebtSimplifier.sol";
import "./library/ExpenseHandler.sol";
import "./library/GroupAccessControl.sol";
import "./TrustToken.sol";

import "hardhat/console.sol";

using DebtSimplifier for Group;
using ExpenseHandler for Group;
using GroupAccessControl for Group;

contract TrustGroupManager {
    uint256 public nextGroupId;
    mapping(uint256 => Group) private groups;
    mapping(address => uint256[]) private groupsOfAddress;

    TrustToken private token;

    constructor(address tokenAddress) {
        token = TrustToken(tokenAddress);
    }

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
        groupsOfAddress[msg.sender].push(id);
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
                creator: group.creator,
                other_members: group.members
            });
    }

    function retrieveMyGroups() external view returns (GroupView[] memory) {
        
    }

    function requestToJoin(uint256 group_id) external {
        Group storage group = groups[group_id];
        require(group.id != 0);
        group.requestToJoin();
    }

    function approveAddress(uint256 group_id, address userToApprove) external {
        Group storage group = groups[group_id];
        require(group.id != 0);
        group.approveRequest(userToApprove);
        groupsOfAddress[userToApprove].push(group.id);
    }

    function settleDebt(uint256 group_id, uint256 amount, address to) external {
        Group storage group = groups[group_id];
        require(group.id != 0);
        require(
            isMemberOfGroup(group, msg.sender),
            "You can not register an expense on a group you do not belong to"
        );
        require(
            isMemberOfGroup(group, to),
            "You can not settle a debt for a user that does not belong to group"
        );
        require(
            group.debs[msg.sender][to] >= amount,
            "Debs are smaller than amount!"
        );
        require(
            token.balanceOf(msg.sender) >= amount,
            "Insufficient balance of token to settle the debs"
        );
        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "Not enough allowance given to this contract"
        );
        require(token.transferFrom(msg.sender, to, amount), "Transfer failed");
        group.debs[msg.sender][to] -= amount;
        group.balances[msg.sender] += int256(amount);
        group.balances[to] -= int256(amount);
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
        group.registerExpense(
            description,
            amount,
            splitWith,
            splitMethod,
            values
        );
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

    function simplifyDebt(uint256 groupId) external {
        Group storage group = groups[groupId];
        require(group.id != 0, "Group does not exists");
        require(
            isMemberOfGroup(group, msg.sender),
            "You can not simplify debts of a group you do not belong to"
        );
        group.simplifyDebt();
    }
}
