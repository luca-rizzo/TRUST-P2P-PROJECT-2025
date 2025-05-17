pragma solidity ^0.8.28;

struct DebtEdge {
    address to;
    uint256 amount;
}

struct DebtNode {
    address from;
    DebtEdge[] edges;
}
