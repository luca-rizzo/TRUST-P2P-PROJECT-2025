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
        require(
            group.debts[msg.sender][to] >= amount,
            "Debts are smaller than amount!"
        );
        require(
            token.balanceOf(msg.sender) >= amount,
            "Insufficient balance of token to settle the debs"
        );
        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "Not enough allowance given to this contract"
        );
        //even if we do not interact with external accounts, we still use the Checks Effects Interactions pattern
        //and first update the state of the group, then trasfer amount
        group.debts[msg.sender][to] -= amount;
        group.balances[msg.sender] += int256(amount);
        group.balances[to] -= int256(amount);
        require(token.transferFrom(msg.sender, to, amount), "Transfer failed");
        emit DebtSettled(group.id, msg.sender, to, amount);
    }
}
