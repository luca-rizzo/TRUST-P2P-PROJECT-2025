pragma solidity ^0.8.28;


import './Expense.sol';

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
