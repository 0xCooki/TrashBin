// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "hardhat/console.sol";

contract SimpleERC20 is ERC20 {

    constructor() ERC20("Simple", "SMPL") {
        //Mints for deployer
        //_mint(msg.sender, 100e18);
    }

    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    } 
}