// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TrustToken is ERC20 {
    
    // rate determines how many TrustToken are minted per 1 ETH sent
    // this value can be changed by the owner to adjust the exchange rate
    uint256 public rate = 100; // 1 ETH = 100 TrustToken
    address public owner;

    // sets the deployer as the owner and initializes the ERC20 token
    constructor() ERC20("TrustToken", "TT") {
        owner = msg.sender;
    }

    // allows anyone to buy tokens by sending ETH; mints tokens based on current rate
    function buyTokens() public payable {
        require(msg.value > 0, "Must send ETH to buy tokens");
        uint256 amountToMint = msg.value * rate;
        _mint(msg.sender, amountToMint);
    }

    // allows the owner to update the exchange rate for buying tokens
    function updateRate(uint256 newRate) external {
        require(msg.sender == owner, "Only owner can update the rate");
        rate = newRate;
    }

    // allows users to buy tokens by sending ETH directly to the contract
    receive() external payable {
        buyTokens();
    }

    // fallback function also allows buying tokens with ETH sent to contract
    fallback() external payable {
        buyTokens();
    }
}
