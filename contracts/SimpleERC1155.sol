// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

import "hardhat/console.sol";

contract SimpleERC1155 is ERC1155 {

    uint256 public constant NFTid0 = 0;
    uint256 public constant NFTid1 = 1;
    uint256 public constant NFTid2 = 2;

    constructor() ERC1155("https://www.thehashes.xyz/api/token/") {
        //Mints for deployer
        _mint(msg.sender, NFTid0, 100, "");
        _mint(msg.sender, NFTid1, 200, "");
        _mint(msg.sender, NFTid2, 1, "");
    }

    function mint(uint256 nftId) external {
        _mint(msg.sender, nftId, 1, "");
    }
}