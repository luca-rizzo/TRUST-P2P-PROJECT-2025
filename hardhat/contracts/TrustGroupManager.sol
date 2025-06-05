pragma solidity ^0.8.28;
import "hardhat/console.sol";
import "./struct/Expense.sol";
import "./struct/Group.sol";
import "./struct/Debts.sol";
import "./library/DebtSimplifier.sol";
import "./library/DebtSettler.sol";
import "./library/ExpenseHandler.sol";
import "./library/GroupRequestHandler.sol";
import "./library/GroupUtility.sol";
import "./TrustToken.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "hardhat/console.sol";

using DebtSimplifier for Group;
using DebtSettler for Group;
using ExpenseHandler for Group;
using GroupRequestHandler for Group;
using GroupUtility for Group;
using EnumerableSet for EnumerableSet.AddressSet;

contract TrustGroupManager {
    
    uint256 public nextGroupId;
    mapping(uint256 => Group) private groups;
    mapping(address => uint256[]) private groupsOfAddress;

    TrustToken private token;

    constructor(address payable tokenAddress) {
        token = TrustToken(tokenAddress);
    }

    function createGroup(
        string calldata name,
        address[] calldata otherMembers
    ) external returns (uint256) {
        uint groupId = ++nextGroupId;
        Group storage newGroup = groups[groupId];
        newGroup.initializeGroup(name, groupId, otherMembers, groupsOfAddress);
        return groupId;
    }

    function retrieveGroup(
        uint256 group_id
    ) external view returns (GroupDetailsView memory) {
        Group storage group = groups[group_id];
        require(group.id != 0, "You are not member of this group");
        require(
            group.containsMember(msg.sender),
            "You are not member of this group"
        );
        Balance[] memory balances = new Balance[](group.members.length());
        for (uint i = 0; i < group.members.length(); i++) {
            address fromMember = group.members.at(i);
            int256 balanceAmount = group.balances[fromMember];
            balances[i] = Balance(fromMember, balanceAmount);
        }
        return
            GroupDetailsView({
                id: group.id,
                name: group.name,
                members: group.members.values(),
                requestsToJoin: group.requestsToJoin.values(),
                balances: balances,
                expenses: group.expenses
            });
    }

    function allGroupDebts(
        uint256 group_id
    ) external view returns (DebtNode[] memory) {
        Group storage group = groups[group_id];
        require(group.id != 0, "Group does not exist");
        require(
            group.containsMember(msg.sender),
            "You are not member of this group"
        );

        uint numMembers = group.members.length();
        DebtNode[] memory debts = new DebtNode[](numMembers);
        for (uint i = 0; i < numMembers; i++) {
            address fromMember = group.members.at(i);
            DebtEdge[] memory tempEdges = new DebtEdge[](numMembers);
            uint edgeCount = 0;
            for (uint j = 0; j < numMembers; j++) {
                address toMember = group.members.at(j);
                uint256 debt = group.debts[fromMember][toMember];
                if (debt > 0) {
                    tempEdges[edgeCount] = DebtEdge(toMember, debt);
                    edgeCount++;
                }
            }
            DebtEdge[] memory edges = new DebtEdge[](edgeCount);
            for (uint k = 0; k < edgeCount; k++) {
                edges[k] = tempEdges[k];
            }
            debts[i] = DebtNode(fromMember, edges);
        }
        return debts;
    }

    function retrieveMyGroups() external view returns (GroupView[] memory) {
        address user = msg.sender;
        uint256[] storage groupIds = groupsOfAddress[user];
        GroupView[] memory toReturn = new GroupView[](groupIds.length);
        for (uint i = 0; i < groupIds.length; i++) {
            Group storage group = groups[groupIds[i]];
            toReturn[i] = GroupView({
                id: group.id,
                name: group.name,
                members: group.members.values()
            });
        }
        return toReturn;
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

    function rejectAddress(uint256 group_id, address userToReject) external {
        Group storage group = groups[group_id];
        require(group.id != 0);
        group.rejectRequest(userToReject);
    }

    function settleDebt(uint256 group_id, uint256 amount, address to) external {
        Group storage group = groups[group_id];
        require(group.id != 0);
        require(
            group.containsMember(msg.sender),
            "You can not register an expense on a group you do not belong to"
        );
        require(
            group.containsMember(to),
            "You can not settle a debt for a user that does not belong to group"
        );
        require(amount > 0, "Amount must be greater than 0");
        require(msg.sender != to, "You can not settle a debt to yourself");
        group.settleDebt(amount, to, token);
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
            group.containsMember(msg.sender),
            "You can not register an expense on a group you do not belong to"
        );
        require(amount > 0, "Amount must be greater than 0");
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
        require(group.id != 0, "You are not fromMember of this group");
        require(
            group.containsMember(msg.sender),
            "You are not fromMember of this group"
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
            group.containsMember(msg.sender),
            "You are not member of this group"
        );
        return group.debts[msg.sender][to];
    }

    function simplifyDebt(uint256 groupId) external {
        Group storage group = groups[groupId];
        require(group.id != 0, "Group does not exists");
        require(
            group.containsMember(msg.sender),
            "You can not simplify debts of a group you do not belong to"
        );
        group.simplifyDebt();
    }
}
