pragma solidity ^0.8.28;

import './Balance.sol';
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

struct GroupView {
    uint256 id;
    string name;
    address[] members;
}

struct GroupDetailsView {
    uint256 id;
    string name;
    address[] members;
    address[] requestsToJoin;
    Balance[] balances;
}

struct Group {
    // Unique identifier for the group
    uint256 id;
    // Human-readable name of the group
    string name;
    // Address of the user who created the group
    address creator;
    // Set of addresses that are members of the group
    EnumerableSet.AddressSet members;
    // Pending requests from users who want to join the group
    EnumerableSet.AddressSet requestsToJoin;
    // Incremental counter for assigning unique IDs to expenses
    uint256 nextExpenseId;
    // Directed debt graph: debts[from][to] = amount owed
    mapping(address => mapping(address => uint256)) debts;
    // Net balance of each member: positive if they are owed, negative if they owe
    mapping(address => int256) balances;
    // Timestamp when the group was created
    uint256 creationTimestamp;
}

