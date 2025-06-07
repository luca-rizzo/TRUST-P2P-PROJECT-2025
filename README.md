# TRUST – Ethereum-based Splitwise

**TRUST** is a decentralized application (dApp) built on the Ethereum blockchain that reimagines Splitwise by enabling automated, transparent, and immutable expense sharing. It eliminates the need for trust between participants by storing all logic and settlement directly on-chain using smart contracts and a native token.

---

## Live Demo

Try it now:  
👉 **[https://luca-rizzo.github.io/TRUST-P2P-PROJECT-2025](https://luca-rizzo.github.io/TRUST-P2P-PROJECT-2025)**

> Connect with MetaMask on the **Sepolia Testnet** to interact with the dApp.

---

## 📜 Project Summary

TRUST replicates the core functionalities of Splitwise — group creation, shared expense tracking, and debt settlement — with blockchain-native features:

- No central authority
- Immutable records via smart contracts
- Real token-based settlements
- Transparent debt tracking via a directed debt graph
- Simplified settlements through greedy graph optimization

The entire backend logic is handled by Solidity smart contracts, while a responsive Angular frontend enables real-time interaction using ethers.js.

---

## 📦 Deployed Contracts (Sepolia Testnet)

```js
trustContracts: {
  trustTokenAddress:      '0x29008fB98A5b2e629596b20dcAC7Fb896B99862f',
  groupManagerAddress:    '0xcA2C17a3d57ef90EAb9f0dF3c53A5c298D4C320A'
}
