# TRUST – Ethereum-based Splitwise

**TRUST** (eThereum baSed spliTwise) is a decentralized application for managing group expenses, inspired by Splitwise and implemented entirely through smart contracts on the Ethereum blockchain.

The system enables users to create groups, log shared expenses, track debt relationships, and settle obligations on-chain using a native ERC-20 token called the **Trust Token (TT)**.  
While user interfaces and settlements are decentralized, all debt relationships are **centralized within the smart contract** – ensuring a consistent, verifiable global state across all users.

---

## 🌍 Live Demo

Explore the application here:  
**👉 https://luca-rizzo.github.io/TRUST-P2P-PROJECT-2025**

> To use it, connect MetaMask to the **Sepolia** testnet and acquire some test ETH.

---

## ⚙️ Deployed Contracts (Sepolia Testnet)

```js
trustContracts: {
  trustTokenAddress: '0x29008fB98A5b2e629596b20dcAC7Fb896B99862f',
  groupManagerAddress: '0xcA2C17a3d57ef90EAb9f0dF3c53A5c298D4C320A'
}
```

| Contract            | Address                                                                 |
|---------------------|-------------------------------------------------------------------------|
| TrustToken          | [`0x29008fB98A5b2e629596b20dcAC7Fb896B99862f`](https://sepolia.etherscan.io/address/0x29008fB98A5b2e629596b20dcAC7Fb896B99862f) |
| TrustGroupManager   | [`0xcA2C17a3d57ef90EAb9f0dF3c53A5c298D4C320A`](https://sepolia.etherscan.io/address/0xcA2C17a3d57ef90EAb9f0dF3c53A5c298D4C320A) |

---

## 🧾 Project Overview

TRUST enables users to:

- Create groups and manage membership via join requests
- Register shared expenses with flexible splitting modes (equal, exact, percentage)
- Track a **directed debt graph** between participants
- **Settle debts** using a native fungible token (TT)
- Apply a **greedy debt simplification algorithm** to reduce transaction complexity

The goal is to ensure **fairness**, **traceability**, and **automation**, removing any need for centralized accounting.

---

## 🧱 Architecture

The system is modularized into specialized contracts:

- `TrustGroupManager.sol`: orchestrates group management, expense tracking, and debt graph updates
- `ExpenseHandler.sol`: computes and applies debt shares
- `DebtSettler.sol`: manages settlements via TT transfers
- `DebtSimplifier.sol`: reduces debt complexity via a greedy algorithm
- `GroupRequestHandler.sol`: handles membership and join requests
- `BalanceHeap.sol`: assists in efficiently matching debtors and creditors

Each group is stored in a mapping:
```solidity
mapping(uint256 => Group) private groups;
```
Each `Group` contains:
- `members` and `requestsToJoin` as `EnumerableSet`
- `debts` and `balances` as mappings
- `expenses` registered via emitted events, not storage

---

## 🪙 Trust Token (TT)

The **Trust Token (TT)** is a custom ERC-20 token used to settle debts within the system.

Key properties:
- Mintable by sending ETH to the contract (1 TT ≈ 1 EUR)
- ETH remains **locked** in the contract; **no withdraw** function exists
- Acts as a **closed-loop currency**, preventing speculation
- Fully compatible with ERC-20 interfaces (OpenZeppelin implementation)

Settlements are executed via `transferFrom` between users and automatically update the contract’s debt graph.

---

## 🔄 Expense Semantics

- Only **expenses paid for others** are recorded as debts
- Payers specify how much each participant owes (equal, exact, percentage)
- The system updates the debt graph and net balances accordingly
- All expense data is emitted via the `ExpenseRegistered` event for frontend tracking

Example event:
```solidity
event ExpenseRegistered(
  uint256 indexed groupId,
  uint256 indexed expenseId,
  address indexed payer,
  uint256 amount,
  string description,
  address[] splitWith,
  uint256[] amountForEach
);
```

---

## 🔧 Debt Simplification

The system includes a greedy simplification algorithm to reduce the number of active debt edges:

- Computes net balance for each user
- Uses two heaps (min/max) to iteratively match the highest debtor with the highest creditor
- Clears the previous debt matrix and reconstructs a minimal one

This improves efficiency and reduces the total number of settlements required, without altering net balances.

---

## 💰 Gas Cost Optimization

Special care was taken to **minimize gas costs**, including:

- Using events instead of on-chain structs to store expense history
- Avoiding storage for group memberships (inferred from events)
- Linear-time simplification with in-place heap structures
- Internal balances updated incrementally to avoid recomputation

**Examples:**
- Expense with 8 members: from ~4.00 € to ~1.89 €
- Group creation with 20 users: from ~7.64 € to ~4.34 €
- Settlement cost is constant (~0.31 €), independent of amount

---

## 🛑 Centralization Note

Although the application runs on a decentralized blockchain, the **debt logic is centralized in the TrustGroupManager contract**.  
This means the global state of who owes what is stored and updated in a single contract, ensuring consistency and correctness across all users.

---

## ✅ Testing and Security

The system is thoroughly tested via Hardhat and includes:

- Positive and negative unit tests for all functionalities
- Edge cases and reentrancy protection
- Use of `msg.sender` to enforce permissions and prevent spoofing
- Overflow protection via Solidity ^0.8.0

The only external call (`transferFrom`) follows the checks-effects-interactions pattern and is used only after internal state updates.

---

## 📘 Full Report

For a detailed explanation of the architecture, data structures, algorithms, optimizations, and contract code:

**📄 [Read the full report (PDF)](https://github.com/luca-rizzo/TRUST-P2P-PROJECT-2025/blob/main/TRUST%20P2P%20Project%20Report.pdf)**

This document contains a complete breakdown of every design choice and analysis of costs and limitations.

---

## 👨‍🎓 Author

Developed by **Luca Rizzo**  
Final project for the course *Peer-to-Peer Systems and Blockchain*  
University of Pisa – Academic Year 2024/2025
