pragma solidity ^0.8.28;

struct ExpenseShare {
    address participant;
    uint256 amount;
}

struct Expense {
    uint256 id;
    string description;
    uint256 amount;
    address paidBy;
    ExpenseShare[] shares;
    uint256 timestamp;
}

enum SplitMethod {
    EQUAL,
    EXACT,
    PERCENTAGE
}