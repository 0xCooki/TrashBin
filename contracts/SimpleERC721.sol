// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "hardhat/console.sol";

contract SimpleERC721 is ERC721 {

    constructor() ERC721("Simple", "SMPL") {
        //Mints for deployer
        _mint(msg.sender, 0);
        _mint(msg.sender, 1);
        _mint(msg.sender, 2);
    }

    function mint(uint256 tokenId) external {
        _mint(msg.sender, tokenId);
    }
}