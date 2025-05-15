pragma solidity ^0.8.28;


import './Expense.sol';

struct GroupView {
    uint256 id;
    string name;
    address creator;
    address[] other_members;
}

struct Group {
    uint256 id;
    string name;
    address creator;
    address[] members;
    address[] requestsToJoin;
    mapping(address => mapping(address => uint256)) debs;
    mapping(address => int256) balances;
}