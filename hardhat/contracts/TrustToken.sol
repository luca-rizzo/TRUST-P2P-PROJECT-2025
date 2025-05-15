// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TrustToken is ERC20 {

    uint256 public constant RATE = 100; // 1 ETH = 100 TrustToken

    constructor() ERC20("TrustToken", "TT") {}

    function buyToken() public payable {
        require(msg.value > 0);
        uint256 amountToMint = msg.value;
        _mint(msg.sender, amountToMint);
    }

    function withdraw(uint256 tokenAmount) external {
        require(balanceOf(msg.sender) >= tokenAmount, "Not enough tokens");
        uint256 ethAmount = tokenAmount / RATE;
        require(address(this).balance >= ethAmount,
            "Contract has not enough ETH");
        _burn(msg.sender, tokenAmount);
        payable(msg.sender).transfer(ethAmount);
    }
}
