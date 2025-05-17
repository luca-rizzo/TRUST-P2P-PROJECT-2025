pragma solidity ^0.8.28;

import './Expense.sol';
import './Balance.sol';

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

event GroupCreated(
    uint256 groupId,
    string name,
    address creator,
    address[] members
);

struct Group {
    uint256 id;
    string name;
    address creator;
    address[] members;
    address[] requestsToJoin;
    uint256 nextExpenseId;
    Expense[] expenses;
    mapping(address => mapping(address => uint256)) debts;
    mapping(address => int256) balances;
    uint256 creationTimestamp;
}