// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TrustToken is ERC20 {

    uint256 public rate = 100; // 1 ETH = 100 TrustToken
    address public owner;

    constructor() ERC20("TrustToken", "TT") {
         owner = msg.sender;
    }

    function buyTokens() public payable {
        require(msg.value > 0);
        uint256 amountToMint = msg.value * rate;
        _mint(msg.sender, amountToMint);
    }
    
    
    function updateRate(uint256 newRate) external {
        require(msg.sender == owner, "Only owner can update the rate");
        rate = newRate;
    }

}
