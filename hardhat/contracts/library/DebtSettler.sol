pragma solidity ^0.8.28;

import "../struct/Group.sol";
import "../struct/Balance.sol";
import "../TrustToken.sol";

library DebtSettler {
    
    event DebtSettled(
        uint256 indexed groupId,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    function settleDebt(
        Group storage group,
        uint256 amount,
        address to,
        TrustToken token
    ) internal {
        // Check that the debt exists and is enough to cover the amount
        require(
            group.debts[msg.sender][to] >= amount,
            "Debts are smaller than amount!"
        );
        // Check that the sender has enough tokens
        require(
            token.balanceOf(msg.sender) >= amount,
            "Insufficient balance of token to settle the debs"
        );
        // Check that the contract is allowed to transfer the tokens
        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "Not enough allowance given to this contract"
        );
        //even if we do not interact with external accounts, we still use the Checks Effects Interactions pattern
        //and first update the state of the group, then trasfer amount
        group.debts[msg.sender][to] -= amount;
        group.balances[msg.sender] += int256(amount);
        group.balances[to] -= int256(amount);
        // Transfer tokens from sender to recipient
        require(token.transferFrom(msg.sender, to, amount), "Transfer failed");
        // Emit event for off-chain tracking
        emit DebtSettled(group.id, msg.sender, to, amount);
    }
}
