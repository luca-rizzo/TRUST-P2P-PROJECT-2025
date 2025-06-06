pragma solidity ^0.8.28;
import "hardhat/console.sol";
import "./struct/SplitMethod.sol";
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
        newGroup.initializeGroup(name, groupId, otherMembers);
        return groupId;
    }

    /// Returns the details of a group, including balances and members.
    /// Only members can retrieve group details.
    function retrieveGroup(
        uint256 group_id
    ) external view returns (GroupDetailsView memory) {
        Group storage group = groups[group_id];
        require(group.id != 0, "You are not member of this group");
        require(
            group.containsMember(msg.sender),
            "You are not member of this group"
        );
        // Map the mapping of balances to an array of Balance structs to return in the view
        Balance[] memory balances = new Balance[](group.members.length());
        for (uint i = 0; i < group.members.length(); i++) {
            address fromMember = group.members.at(i);
            int256 balanceAmount = group.balances[fromMember];
            balances[i] = Balance(fromMember, balanceAmount);
        }
        // Return all group details, including members and pending join requests
        return
            GroupDetailsView({
                id: group.id,
                name: group.name,
                members: group.members.values(),
                requestsToJoin: group.requestsToJoin.values(),
                balances: balances
            });
    }
    
    /// Returns the current debt graph of a group in adjacency list format.
    /// Transforms the nested mapping debts[from][to] into an array of DebtNode structs.
    /// Each DebtNode contains the address of a debtor and a list of outgoing DebtEdges.
    /// This is conceptually similar to converting an adjacency matrix into an adjacency list.
    function allGroupDebts(
        uint256 group_id
    ) external view returns (DebtNode[] memory) {
        Group storage group = groups[group_id];
        require(group.id != 0, "Group does not exist");
        require(
            group.containsMember(msg.sender),
            "You are not member of this group"
        );
        // Map the debts mapping to an array of DebtNode structs.
        // This is conceptually similar to converting an adjacency matrix
        // of a weighted graph into an adjacency list representation.
        uint numMembers = group.members.length();
        DebtNode[] memory debts = new DebtNode[](numMembers);
        for (uint i = 0; i < numMembers; i++) {
            address fromMember = group.members.at(i);
            // Temporary array to collect all outgoing edges for this member
            DebtEdge[] memory tempEdges = new DebtEdge[](numMembers);
            uint edgeCount = 0;
            for (uint j = 0; j < numMembers; j++) {
                address toMember = group.members.at(j);
                uint256 debt = group.debts[fromMember][toMember];
                // Only include non-zero debts
                if (debt > 0) {
                    tempEdges[edgeCount] = DebtEdge(toMember, debt);
                    edgeCount++;
                }
            }
            // Copy only the non-zero edges to the final array
            DebtEdge[] memory edges = new DebtEdge[](edgeCount);
            for (uint k = 0; k < edgeCount; k++) {
                edges[k] = tempEdges[k];
            }
            debts[i] = DebtNode(fromMember, edges);
        }
        return debts;
    }

    /// Allows a user to request to join a group.
    /// The request is stored in the group's pending requests.
    function requestToJoin(uint256 group_id) external {
        Group storage group = groups[group_id];
        require(group.id != 0, "Group does not exist");
        // Add the sender to the group's join requests
        group.requestToJoin();
    }

    /// Approves a user's join request for a group.
    /// Only a group member can approve a pending request.
    function approveAddress(uint256 group_id, address userToApprove) external {
        Group storage group = groups[group_id];
        require(group.id != 0, "Group does not exist");
        // Approve the specified user's join request
        group.approveRequest(userToApprove);
    }

    /// Rejects a user's join request for a group.
    /// Only a group member can reject a pending request.
    function rejectAddress(uint256 group_id, address userToReject) external {
        Group storage group = groups[group_id];
        require(group.id != 0, "Group does not exist");
        // Reject the specified user's join request
        group.rejectRequest(userToReject);
    }

    /// Allows a member to settle a debt with another member.
    /// Requires both sender and recipient to be group members.
    function settleDebt(uint256 group_id, uint256 amount, address to) external {
        Group storage group = groups[group_id];
        require(group.id != 0, "Group does not exist");
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

    /// Registers a new expense in the group.
    /// Only members can register expenses. Amount must be greater than zero.
    function registerExpenses(
        uint256 group_id,
        string calldata description,
        uint256 amount,
        address[] calldata splitWith,
        SplitMethod splitMethod,
        uint256[] calldata values
    ) external {
        Group storage group = groups[group_id];
        require(group.id != 0, "Group does not exist");
        require(
            group.containsMember(msg.sender),
            "You can not register an expense on a group you do not belong to"
        );
        require(amount > 0, "Amount must be greater than 0");
        // Register the expense and update debts/balances accordingly
        group.registerExpense(
            description,
            amount,
            splitWith,
            splitMethod,
            values
        );
    }

    /// Returns the caller's net balance in the group.
    /// Only members can call this function.
    function getMyBalanceInGroup(
        uint256 group_id
    ) external view returns (int256) {
        Group storage group = groups[group_id];
        require(group.id != 0, "You are not fromMember of this group");
        require(
            group.containsMember(msg.sender),
            "You are not fromMember of this group"
        );
        // Return the caller's balance in the group
        return group.balances[msg.sender];
    }

    /// Returns the debt the caller owes to another member in the group.
    /// Only members can call this function.
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
        // Return the debt from the caller to the specified member
        return group.debts[msg.sender][to];
    }

    /// Simplifies the group's debt graph.
    /// Only members can trigger debt simplification.
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
