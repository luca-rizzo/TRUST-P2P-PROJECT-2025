pragma solidity ^0.8.28;

struct Expense {
    string description;
    uint256 amount;
    address paidBy;
    address[] involved;
    SplitMethod method;
}

enum SplitMethod {
    EQUAL,
    EXACT,
    PERCENTAGE
}