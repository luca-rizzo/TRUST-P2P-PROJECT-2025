pragma solidity ^0.8.28;

import './Expense.sol';
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
    Expense[] expenses;
}

struct Group {
    uint256 id;
    string name;
    address creator;
    EnumerableSet.AddressSet members;
    EnumerableSet.AddressSet requestsToJoin;
    uint256 nextExpenseId;
    Expense[] expenses;
    mapping(address => mapping(address => uint256)) debts;
    mapping(address => int256) balances;
    uint256 creationTimestamp;
}