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

event ExpenseRegistered(
    uint256 indexed groupId,
    uint256 indexed expenseId,
    address indexed payer,
    uint256 amount,
    string description,
    address[] splitWith,
    uint256[] amountForEach
);

enum SplitMethod {
    EQUAL,
    EXACT,
    PERCENTAGE
}