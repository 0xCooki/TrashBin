const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("TrashBin Testing", function () {

    ////////////////////
    //Global Variables//
    ////////////////////

    const forLoopLimit = 100;

    //////////////////////
    //Deploy Environment//
    //////////////////////

    async function deployEnvironment() {
        //Signers
        const [owner, addy0, addy1] = await ethers.getSigners();

        //Deploy Hashes ERC721
        const Hashes = await ethers.getContractFactory("Hashes");
        //0 mint fee, 0 reserved, 10 governance cap, no token URI
        const deployedHashes = await Hashes.deploy("0", "0", "10", "");
        const deployedHashesAddress = deployedHashes.address;

        //Mint several ERC721s for owner
        await deployedHashes.generate("timmy's NFT");
        await deployedHashes.generate("timmy's NFT");
        await deployedHashes.generate("timmy's NFT");

        //And one for Addy0
        await deployedHashes.connect(addy0).generate("jimmy's NFT");

        //Deploy Hashes DAO - constructor settings just so that passing a proposal is simple
        const HashesDAO = await ethers.getContractFactory("HashesDAO");
        const deployedHashesDAO = await HashesDAO.deploy(deployedHashesAddress, [owner.address], 10, 1, 10, 10000000, 0, 1, 1);
        const deployedHashesDAOAddress = deployedHashesDAO.address;

        //Deploy Trashbin
        const Trashbin = await ethers.getContractFactory("TrashBin");
        const deployedTrashbin = await Trashbin.deploy(deployedHashesAddress, deployedHashesDAOAddress, owner.address);

        //const deployedHashesDAOe = await deployedHashesDAO.signer
        const deployedTrashbinAddress = deployedTrashbin.address;

        //Send the trashbin some ETH
        await owner.sendTransaction({to: deployedTrashbinAddress, value: ethers.utils.parseEther("0.001")});

        //Deploy simple ERC721 - Version 1
        const SimpleERC721v1 = await ethers.getContractFactory("SimpleERC721");
        const deployedSimpleERC721v1 = await SimpleERC721v1.deploy();

        //Deploy simple ERC721 - Version 2
        const SimpleERC721v2 = await ethers.getContractFactory("SimpleERC721");
        const deployedSimpleERC721v2 = await SimpleERC721v2.deploy();

        //Deploy simple ERC1155 - Version 1
        const SimpleERC1155v1 = await ethers.getContractFactory("SimpleERC1155");
        const deployedSimpleERC1155v1 = await SimpleERC1155v1.deploy();

        //Deploy simple ERC1155 - Version 2
        const SimpleERC1155v2 = await ethers.getContractFactory("SimpleERC1155");
        const deployedSimpleERC1155v2 = await SimpleERC1155v2.deploy();

        //Simple ERC20
        const SimpleERC20v1 = await ethers.getContractFactory("SimpleERC20");
        const deployedSimpleERC20v1 = await SimpleERC20v1.deploy();

        return { 
            owner,
            addy0,
            addy1,
            deployedHashes,
            deployedHashesDAO,
            deployedTrashbin,
            deployedSimpleERC721v1,
            deployedSimpleERC721v2,
            deployedSimpleERC1155v1,
            deployedSimpleERC1155v2,
            deployedSimpleERC20v1
        };
    }

    /////////////////////
    //Proper Deployment//
    /////////////////////

    describe("Testing Proper Deployment and Ownership", () => {
        it("All constructor variables are correct", async function () {

            const { owner, deployedHashes, deployedHashesDAO, deployedTrashbin } = await loadFixture(deployEnvironment);
            
            //Checks owner
            const trashBinOwner = await deployedTrashbin.owner();
            expect(trashBinOwner).to.equal(owner.address);

            //Checks hashes
            const trashBinHashes = await deployedTrashbin.hashes();
            expect(trashBinHashes).to.equal(deployedHashes.address);

            //Checks hashes DAO
            const trashBinHashesDAO = await deployedTrashbin.hashesDAO();
            expect(trashBinHashesDAO).to.equal(deployedHashesDAO.address);

            //Checks buyPrice
            const trashBinBuyPrice = await deployedTrashbin.buyPrice();
            expect(trashBinBuyPrice).to.equal(BigInt(0.02e18));

            //Checks sellPrice
            const trashBinSellPrice = await deployedTrashbin.sellPrice();
            expect(trashBinSellPrice).to.equal(100);

            //Checks standardHashDiscount
            const trashBinStandardHashDiscount = await deployedTrashbin.standardHashDiscount();
            expect(trashBinStandardHashDiscount).to.equal(7500);

            //Checks daoHashDiscount
            const trashBinDaoHashDiscount = await deployedTrashbin.daoHashDiscount();
            expect(trashBinDaoHashDiscount).to.equal(2500);

            //Checks buyableDelay
            const trashBinBuyableDelay = await deployedTrashbin.buyableDelay();
            expect(trashBinBuyableDelay).to.equal(20000);

            //Checks minEthBalance
            const trashBinMinEthBalance = await deployedTrashbin.minEthBalance();
            expect(trashBinMinEthBalance).to.equal(BigInt(0.001e18));

            //Checks maxEthBalance
            const trashBinMaxEthBalance = await deployedTrashbin.maxEthBalance();
            expect(trashBinMaxEthBalance).to.equal(BigInt(0.1e18));

            //Checks ethPercentage
            const trashBinEthPercentage= await deployedTrashbin.ethPercentageToOwner();
            expect(trashBinEthPercentage).to.equal(2000);
        });
        it("Owner successfully transfers ownership", async function () {

            const { addy0, deployedTrashbin } = await loadFixture(deployEnvironment);

            //Owner transfers ownership
            await deployedTrashbin.transferOwnership(addy0.address);
            
            //Checks new owner
            const trashBinOwner = await deployedTrashbin.owner();
            expect(trashBinOwner).to.equal(addy0.address);
        });
        it("Hashes DAO successfully transfers ownership", async function () {

            const { addy0, deployedHashesDAO, deployedTrashbin } = await loadFixture(deployEnvironment);

            //Makes proposal to hashes DAO to transfer ownership
            await deployedHashesDAO.propose([deployedTrashbin.address], [0], ["transferOwnership(address)"], ["0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"], "transferOwnership");

            //increment the number of blocks by 2
            await hre.network.provider.send("hardhat_mine", ["0x2"]);

            //cast vote
            await deployedHashesDAO.castVote(1, true, false, '0x');

            //increment the number of blocks by 100
            await hre.network.provider.send("hardhat_mine", ["0x64"]);

            //queue proposal
            await deployedHashesDAO.queue(1);

            //increment the number of blocks by 1
            await hre.network.provider.send("hardhat_mine", ["0x1"]);

            //execute 
            await deployedHashesDAO.execute(1);
            
            //Checks new owner
            const trashBinOwner = await deployedTrashbin.owner();
            expect(trashBinOwner).to.equal(addy0.address);
        });
        it("Non-Owner unsuccessfully transfers ownership", async function () {

            const { addy0, addy1, deployedTrashbin } = await loadFixture(deployEnvironment);

            await expect(deployedTrashbin.connect(addy1).transferOwnership(addy0.address)).to.rejectedWith("TrashBin: must be contract owner or Hashes DAO");
        });
    });

    /////////////
    //Transfers//
    /////////////

    describe("Testing NFT Transfers", () => {
        it("Successful single ERC721 safeTransfer to TrashBin", async function () {

            const { addy0, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints a simpleERC721
            await deployedSimpleERC721v1.connect(addy0).mint(3);

            const addy0BalanceBefore = await ethers.provider.getBalance(addy0.address);

            //sends NFT to TrashBin
            const sentTXN = await deployedSimpleERC721v1.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, deployedTrashbin.address, 3);

            const addy0BalanceAfter = await ethers.provider.getBalance(addy0.address);

            //Block mined of send transaction
            const blockMined = sentTXN.blockNumber;

            //Gas
            const receipt = await sentTXN.wait();
            const cumulativeGasUsed = receipt.cumulativeGasUsed;
            const effectiveGasPrice = receipt.effectiveGasPrice;
            const ETHpaid = BigInt(cumulativeGasUsed) * BigInt(effectiveGasPrice);
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(1);

            //Accessing new NFT storage created on safe Transfer
            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC721v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(true);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 100000000 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(100));

            //Checks that Addy0 has been paid
            expect(BigInt(addy0BalanceAfter) + BigInt(ETHpaid) - BigInt(addy0BalanceBefore)).to.equal(BigInt(100));
        });
        it("Successful single ERC1155 safeTransfer to TrashBin", async function () {

            const { addy0, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints a simpleERC721
            await deployedSimpleERC1155v1.connect(addy0).mint(3);

            const addy0BalanceBefore = await ethers.provider.getBalance(addy0.address);

            //sends NFT to TrashBin
            const sentTXN = await deployedSimpleERC1155v1.connect(addy0)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy0.address, deployedTrashbin.address, 3, 1, "0x");

            const addy0BalanceAfter = await ethers.provider.getBalance(addy0.address);

            //Gas
            const receipt = await sentTXN.wait();
            const cumulativeGasUsed = receipt.cumulativeGasUsed;
            const effectiveGasPrice = receipt.effectiveGasPrice;
            const ETHpaid = BigInt(cumulativeGasUsed) * BigInt(effectiveGasPrice);

            //Block mined of send transaction
            const blockMined = sentTXN.blockNumber;
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(1);

            //Accessing new NFT storage created on safe Transfer
            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(false);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 100000000 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(100));

            //Checks that Addy0 has been paid
            expect(BigInt(addy0BalanceAfter) + BigInt(ETHpaid) - BigInt(addy0BalanceBefore)).to.equal(BigInt(100));
        });
        it("Successful batch ERC1155 safeTransfer to TrashBin", async function () {

            const { addy0, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints a simpleERC721
            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            await deployedSimpleERC1155v1.connect(addy0).mint(4);

            const addy0BalanceBefore = await ethers.provider.getBalance(addy0.address);

            //sends NFT to TrashBin
            const sentTXN = await deployedSimpleERC1155v1.connect(addy0)["safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)"](addy0.address, deployedTrashbin.address, [3,4], [2,1], "0x");

            const addy0BalanceAfter = await ethers.provider.getBalance(addy0.address);

            //Gas
            const receipt = await sentTXN.wait();
            const cumulativeGasUsed = receipt.cumulativeGasUsed;
            const effectiveGasPrice = receipt.effectiveGasPrice;
            const ETHpaid = BigInt(cumulativeGasUsed) * BigInt(effectiveGasPrice);

            //Block mined of send transaction
            const blockMined = sentTXN.blockNumber;
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(3);

            //Accessing new NFT storage 0 created on safe Transfer
            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(false);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined);

            //Accessing new NFT storage 1 created on safe Transfer
            const nftStorageSlot1 = await deployedTrashbin.nftStorage(1);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot1.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot1.id).to.equal(3);
            expect(nftStorageSlot1.isERC721).to.equal(false);
            expect(nftStorageSlot1.blockSold).to.equal(blockMined);

            //Accessing new NFT storage 2 created on safe Transfer
            const nftStorageSlot2 = await deployedTrashbin.nftStorage(2);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot2.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot2.id).to.equal(4);
            expect(nftStorageSlot2.isERC721).to.equal(false);
            expect(nftStorageSlot2.blockSold).to.equal(blockMined);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 100000000 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(200));

            //Checks that Addy0 has been paid
            expect(BigInt(addy0BalanceAfter) + BigInt(ETHpaid) - BigInt(addy0BalanceBefore)).to.equal(BigInt(200));
        });
        it("Unsuccessful single ERC721 unSafeTransfer to TrashBin", async function () {

            const { addy0, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints a simpleERC721
            await deployedSimpleERC721v1.connect(addy0).mint(3);

            //sends NFT to TrashBin
            const sentTXN = await deployedSimpleERC721v1.connect(addy0)["transferFrom(address,address,uint256)"](addy0.address, deployedTrashbin.address, 3);
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(0);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin hasn't been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18));
        });
    });

    ////////
    //Sell//
    ////////

    describe("Testing Sell", () => {
        it("Unsuccessful sell to TrashBin if collection arrays provided are of unequal length", async function () {

            const { addy0, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            await deployedSimpleERC1155v1.connect(addy0).mint(4);

            //try to sell NFTs to TrashBin with differing array lengths
            //one address
            await expect(deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address], [3,4], [1,1], [false, false])).to.rejectedWith("TrashBin: All arrays must be the same length.");
            //one id
            await expect(deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address, deployedSimpleERC1155v1.address], [3], [1,1], [false, false])).to.rejectedWith("TrashBin: All arrays must be the same length.");
            //one value
            await expect(deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address, deployedSimpleERC1155v1.address], [3,4], [1], [false, false])).to.rejectedWith("TrashBin: All arrays must be the same length.");
            //one isERC721
            await expect(deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address, deployedSimpleERC1155v1.address], [3,4], [1], [false])).to.rejectedWith("TrashBin: All arrays must be the same length.");
        });
        it("Unsuccessful sell to TrashBin if is not approved", async function () {

            const { addy0, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC1155v1.connect(addy0).mint(3);

            await expect(deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address], [3], [1], [false])).to.rejectedWith("TrashBin: TrashBin is not approved to transfer ERC1155 NFTs.");
        });
        it("Unsuccessful sell to TrashBin if collection is incorrectly labeled an ERC721", async function () {

            const { addy0, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC1155v1.connect(addy0).mint(3);

            //addy0 approves Trashbin
            await deployedSimpleERC1155v1.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);

            await expect(deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address], [3], [1], [true])).to.rejected;
        });
        it("Unsuccessful sell to TrashBin if collection is incorrectly labeled an ERC1155", async function () {

            const { addy0, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC721v1.connect(addy0).mint(3);

            //addy0 approves Trashbin
            await deployedSimpleERC721v1.connect(addy0).approve(deployedTrashbin.address, 3);

            await expect(deployedTrashbin.connect(addy0).sell([deployedSimpleERC721v1.address], [3], [1], [false])).to.rejected;
        });
        it("Successful single ERC1155 sell to TrashBin", async function () {

            const { addy0, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC1155v1.connect(addy0).mint(3);

            //addy0 approves Trashbin
            await deployedSimpleERC1155v1.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);

            const sentTXN = await deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address], [3], [1], [false]);

            //Block mined of send transaction
            const blockMined = sentTXN.blockNumber;
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(1);

            //Accessing new NFT storage created on safe Transfer
            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(false);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(100));
        });
        it("Successful single ERC721 sell to TrashBin", async function () {

            const { addy0, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC721v1.connect(addy0).mint(3);

            //addy0 approves Trashbin
            await deployedSimpleERC721v1.connect(addy0).approve(deployedTrashbin.address, 3);

            const sentTXN = await deployedTrashbin.connect(addy0).sell([deployedSimpleERC721v1.address], [3], [1], [true]);

            //Block mined of send transaction
            const blockMined = sentTXN.blockNumber;
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(1);

            //Accessing new NFT storage created on safe Transfer
            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC721v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(true);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(100));
        });
        it("Successful mutliple (same contract, same id, multiple expressed with amount) ERC1155 sell to TrashBin", async function () {

            const { addy0, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            await deployedSimpleERC1155v1.connect(addy0).mint(3);

            //addy0 approves Trashbin
            await deployedSimpleERC1155v1.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);

            const sentTXN = await deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address], [3], [2], [false]);

            //Block mined of send transaction
            const blockMined = sentTXN.blockNumber;
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(2);

            //Accessing new NFT storage created on safe Transfer
            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(false);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined);

            const nftStorageSlot1 = await deployedTrashbin.nftStorage(1);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot1.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot1.id).to.equal(3);
            expect(nftStorageSlot1.isERC721).to.equal(false);
            expect(nftStorageSlot1.blockSold).to.equal(blockMined);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(100));
        });
        it("Successful mutliple (same contract, same id, multiple expressed with arrays) ERC1155 sell to TrashBin", async function () {

            const { addy0, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            await deployedSimpleERC1155v1.connect(addy0).mint(3);

            //addy0 approves Trashbin
            await deployedSimpleERC1155v1.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);

            const sentTXN = await deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address, deployedSimpleERC1155v1.address], [3, 3], [1, 1], [false, false]);

            //Block mined of send transaction
            const blockMined = sentTXN.blockNumber;
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(2);

            //Accessing new NFT storage created on safe Transfer
            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(false);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined);

            const nftStorageSlot1 = await deployedTrashbin.nftStorage(1);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot1.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot1.id).to.equal(3);
            expect(nftStorageSlot1.isERC721).to.equal(false);
            expect(nftStorageSlot1.blockSold).to.equal(blockMined);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(200));
        });
        it("Successful mutliple (different contract) ERC1155 sell to TrashBin", async function () {

            const { addy0, deployedSimpleERC1155v1, deployedSimpleERC1155v2, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            await deployedSimpleERC1155v2.connect(addy0).mint(3);

            //addy0 approves Trashbin
            await deployedSimpleERC1155v1.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);
            await deployedSimpleERC1155v2.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);

            const sentTXN = await deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address, deployedSimpleERC1155v2.address], [3, 3], [1, 1], [false, false]);

            //Block mined of send transaction
            const blockMined = sentTXN.blockNumber;
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(2);

            //Accessing new NFT storage created on safe Transfer
            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(false);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined);

            const nftStorageSlot1 = await deployedTrashbin.nftStorage(1);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot1.collection).to.equal(deployedSimpleERC1155v2.address);
            expect(nftStorageSlot1.id).to.equal(3);
            expect(nftStorageSlot1.isERC721).to.equal(false);
            expect(nftStorageSlot1.blockSold).to.equal(blockMined);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(200));
        });
        it("Successful mutliple (different contract) ERC721 sell to TrashBin", async function () {

            const { addy0, deployedSimpleERC721v1, deployedSimpleERC721v2, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC721v1.connect(addy0).mint(3);
            await deployedSimpleERC721v2.connect(addy0).mint(3);

            //addy0 approves Trashbin
            await deployedSimpleERC721v1.connect(addy0).approve(deployedTrashbin.address, 3);
            await deployedSimpleERC721v2.connect(addy0).approve(deployedTrashbin.address, 3);

            const sentTXN = await deployedTrashbin.connect(addy0).sell([deployedSimpleERC721v1.address, deployedSimpleERC721v2.address], [3, 3], [1, 100], [true, true]);

            //Block mined of send transaction
            const blockMined = sentTXN.blockNumber;
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(2);

            //Accessing new NFT storage created on safe Transfer
            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC721v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(true);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined);

            const nftStorageSlot1 = await deployedTrashbin.nftStorage(1);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot1.collection).to.equal(deployedSimpleERC721v2.address);
            expect(nftStorageSlot1.id).to.equal(3);
            expect(nftStorageSlot1.isERC721).to.equal(true);
            expect(nftStorageSlot1.blockSold).to.equal(blockMined);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(200));
        });
        it("Successful mutliple ERC721 and ERC1155 sell to TrashBin", async function () {

            const { addy0, deployedSimpleERC721v1, deployedSimpleERC721v2, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC721v1.connect(addy0).mint(3);
            await deployedSimpleERC721v2.connect(addy0).mint(3);

            for(i = 0; i < 11; i++) {
                await deployedSimpleERC1155v1.connect(addy0).mint(3);
            }

            //addy0 approves Trashbin
            await deployedSimpleERC721v1.connect(addy0).approve(deployedTrashbin.address, 3);
            await deployedSimpleERC721v2.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);
            await deployedSimpleERC1155v1.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);

            const sentTXN = await deployedTrashbin.connect(addy0).sell([deployedSimpleERC721v1.address, deployedSimpleERC721v2.address, deployedSimpleERC1155v1.address], [3, 3, 3], [1, 0, 10], [true, true, false]);

            //Block mined of send transaction
            const blockMined = sentTXN.blockNumber;
            
            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(12);

            //Accessing new NFT storage created on safe Transfer
            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC721v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(true);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined);

            const nftStorageSlot1 = await deployedTrashbin.nftStorage(1);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot1.collection).to.equal(deployedSimpleERC721v2.address);
            expect(nftStorageSlot1.id).to.equal(3);
            expect(nftStorageSlot1.isERC721).to.equal(true);
            expect(nftStorageSlot1.blockSold).to.equal(blockMined);

            const nftStorageSlot100 = await deployedTrashbin.nftStorage(10);

            //Checks that nftStorage has been updated
            expect(nftStorageSlot100.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot100.id).to.equal(3);
            expect(nftStorageSlot100.isERC721).to.equal(false);
            expect(nftStorageSlot100.blockSold).to.equal(blockMined);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(300));
        });
    });

    ///////
    //Buy//
    ///////

    describe("Testing Buy", () => {
        it("Unsuccessful buy if insufficient ETH is provided", async function () {

            const { addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //Attempts to buy without paying
            await expect(deployedTrashbin.connect(addy1).buy([0], [])).to.rejectedWith("TrashBin: insufficient ETH payment.");
        });
        it("Unsuccessful buy if indexed provided is out of bounds", async function () {

            const { addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //Attempts to buy without paying
            await expect(deployedTrashbin.connect(addy1).buy([1], [], { value: ethers.utils.parseEther("0.02") })).to.rejectedWith("TrashBin: index out of bounds.");
        });
        it("Unsuccessful buy if insufficient time has passed", async function () {

            const { addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //Attempts to buy without paying
            await expect(deployedTrashbin.connect(addy1).buy([0], [], { value: ethers.utils.parseEther("0.02") })).to.rejectedWith("TrashBin: insufficient time has passed since sale of this NFT.");
        });
        it("Unsuccessful multiple buy if indexes provided are not monotonically decreasing", async function () {

            const { addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            await deployedSimpleERC721v1.connect(addy1).mint(4);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 4);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //Attempts to buy with non-monotic indexes
            await expect(deployedTrashbin.connect(addy1).buy([0, 1], [], { value: ethers.utils.parseEther("0.04") })).to.rejectedWith("Trashbin: indexes array provided is not monotonically decreasing.");
        });
        it("Successful single buy", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //buys
            await deployedTrashbin.connect(addy0).buy([0], [], { value: ethers.utils.parseEther("0.02") });

            //checks new owner
            const newOwnerOfSimpleERC721v1ID3 = await deployedSimpleERC721v1.ownerOf(3);

            expect(newOwnerOfSimpleERC721v1ID3).to.equal(addy0.address);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei + the income from sale
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(100) + BigInt(0.02e18));

            //nftStorage is zero
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(0);
        });
        it("Successful multiple (both ERC721) buy", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedSimpleERC721v2, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            await deployedSimpleERC721v2.connect(addy1).mint(3);
            await deployedSimpleERC721v2.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //buys
            await deployedTrashbin.connect(addy0).buy([1, 0], [], { value: ethers.utils.parseEther("0.04") });

            //checks new owner
            const newOwnerOfSimpleERC721v1ID3 = await deployedSimpleERC721v1.ownerOf(3);
            expect(newOwnerOfSimpleERC721v1ID3).to.equal(addy0.address);

            const newOwnerOfSimpleERC721v2ID3 = await deployedSimpleERC721v2.ownerOf(3);
            expect(newOwnerOfSimpleERC721v2ID3).to.equal(addy0.address);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei + sale income
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(200) + BigInt(0.04e18));

            //nftStorage is zero
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(0);
        });
        it("Successful multiple (one ERC721 and one ERC1155) buy", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            await deployedSimpleERC1155v1.connect(addy1).mint(3);
            await deployedSimpleERC1155v1.connect(addy1)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy1.address, deployedTrashbin.address, 3, 1, "0x");

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //buys
            await deployedTrashbin.connect(addy0).buy([1,0], [], { value: ethers.utils.parseEther("0.04") });

            //checks new owner
            const newOwnerOfSimpleERC721v1ID3 = await deployedSimpleERC721v1.ownerOf(3);
            expect(newOwnerOfSimpleERC721v1ID3).to.equal(addy0.address);

            const newBalanceOfERC1155v1 = await deployedSimpleERC1155v1.balanceOf(addy0.address, 3);
            expect(newBalanceOfERC1155v1).to.equal(1);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(200) + BigInt(0.04e18));

            //nftStorage is zero
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(0);
        });
        it("Successful multiple (seven ERC721) buy", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedSimpleERC721v2, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            await deployedSimpleERC721v2.connect(addy1).mint(4);
            await deployedSimpleERC721v2.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 4);

            await deployedSimpleERC721v2.connect(addy1).mint(5);
            await deployedSimpleERC721v2.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 5);

            await deployedSimpleERC721v2.connect(addy1).mint(6);
            await deployedSimpleERC721v2.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 6);

            await deployedSimpleERC721v2.connect(addy1).mint(7);
            await deployedSimpleERC721v2.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 7);

            await deployedSimpleERC721v2.connect(addy1).mint(8);
            await deployedSimpleERC721v2.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 8);

            await deployedSimpleERC721v2.connect(addy1).mint(9);
            await deployedSimpleERC721v2.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 9);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //buys
            await deployedTrashbin.connect(addy0).buy([6, 2, 0], [], { value: ethers.utils.parseEther("0.06") });

            //checks new owner
            const newOwnerOfSimpleERC721v1ID3 = await deployedSimpleERC721v1.ownerOf(3);
            expect(newOwnerOfSimpleERC721v1ID3).to.equal(addy0.address);

            const newOwnerOfSimpleERC721v1ID5 = await deployedSimpleERC721v2.ownerOf(5);
            expect(newOwnerOfSimpleERC721v1ID5).to.equal(addy0.address);

            const newOwnerOfSimpleERC721v1ID9 = await deployedSimpleERC721v2.ownerOf(9);
            expect(newOwnerOfSimpleERC721v1ID9).to.equal(addy0.address);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei + sale income
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(700) + BigInt(0.06e18));

            //nftStorage is zero
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(4);
        });

        /////////////////////////////
        //Testing the price of buys//
        /////////////////////////////

        it("Unsuccessful single buy when more than one hashes NFT is provided", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //Attempts to buy without two hashes Ids
            await expect(deployedTrashbin.buy([0], [1,2], { value: ethers.utils.parseEther("0.02") })).to.rejectedWith("TrashBin: more than one Hashes NFT provided."); 
        });
        it("Unsuccessful single buy when buyer enters un-owned hashes Id", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //Attempts to buy with two hashes Ids
            await expect(deployedTrashbin.connect(addy0).buy([0], [1], { value: ethers.utils.parseEther("0.02") })).to.rejectedWith("TrashBin: buyer does not own hashes NFT provided."); 
        });
        it("Successful single buy with DAO Hashes NFT", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //buys
            await deployedTrashbin.connect(addy0).buy([0], [3], { value: ethers.utils.parseEther("0.005") });

            //checks new owner
            const newOwnerOfSimpleERC721v1ID3 = await deployedSimpleERC721v1.ownerOf(3);

            expect(newOwnerOfSimpleERC721v1ID3).to.equal(addy0.address);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(100) + BigInt(0.005e18));

            //nftStorage is zero
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(0);
        });
        it("Successful single buy with Standard Hashes NFT", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin, deployedHashes } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            for (i = 4; i < 12; i++) {
                deployedHashes.connect(addy0).generate("iterate");
            } 

            //buys
            await deployedTrashbin.connect(addy0).buy([0], [11], { value: ethers.utils.parseEther("0.015") });

            //checks new owner
            const newOwnerOfSimpleERC721v1ID3 = await deployedSimpleERC721v1.ownerOf(3);

            expect(newOwnerOfSimpleERC721v1ID3).to.equal(addy0.address);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(100) + BigInt(0.015e18));

            //nftStorage is zero
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(0);
        });
        it("Successful single buy with Deactivated DAO Hashes NFT", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin, deployedHashes } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //Mints out all DAO hashes NFTs
            for (i = 4; i < 12; i++) {
                deployedHashes.connect(addy0).generate("iterate");
            }

            //makes DAO hash #9 deactivated
            //uses a custom function to toggle the deactivated tokens in the hashes collection
            await deployedHashes.deactivateToggle(9);

            //buys
            await deployedTrashbin.connect(addy0).buy([0], [9], { value: ethers.utils.parseEther("0.015") });

            //checks new owner
            const newOwnerOfSimpleERC721v1ID3 = await deployedSimpleERC721v1.ownerOf(3);

            expect(newOwnerOfSimpleERC721v1ID3).to.equal(addy0.address);

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin has been docked 1 wei
            expect(trashbinBalance).to.equal(BigInt(0.001e18) - BigInt(100) + BigInt(0.015e18));

            //nftStorage is zero
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(0);
        });
        it("Unsuccessful single buy with Standard/Deactivated Hashes NFT if insufficient fee is payed", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin, deployedHashes } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //Mints out all DAO hashes NFTs
            for (i = 4; i < 12; i++) {
                deployedHashes.connect(addy0).generate("iterate");
            } 

            //makes DAO hash #9 deactivated
            //uses a custom function to toggle the deactivated tokens in the hashes collection
            await deployedHashes.deactivateToggle(9);

            //attempts to buy with standard
            await expect(deployedTrashbin.connect(addy0).buy([0], [11], { value: ethers.utils.parseEther("0.005") })).to.rejectedWith("TrashBin: insufficient ETH payment.");

            //attempts to buy with deactivated
            await expect(deployedTrashbin.connect(addy0).buy([0], [9], { value: ethers.utils.parseEther("0.005") })).to.rejectedWith("TrashBin: insufficient ETH payment.");
        });
        it("Testing that the isNFTAvailableToBuy function works correctly", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin, deployedHashes } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 64
            await hre.network.provider.send("hardhat_mine", ["0x64"]);

            const beforeTimeIsUp = await deployedTrashbin.isNFTAvailableToBuy(0);
            expect(beforeTimeIsUp).to.equal(false);

            await hre.network.provider.send("hardhat_mine", ["0x4e20"]);

            const afterTimeIsUp = await deployedTrashbin.isNFTAvailableToBuy(0);
            expect(afterTimeIsUp).to.equal(true);

            //fails if index is out of bounds
            await expect(deployedTrashbin.isNFTAvailableToBuy(1)).to.rejectedWith("TrashBin: index out of bounds.");

            //pause the contract
            await deployedTrashbin.togglePause();

            await expect(deployedTrashbin.isNFTAvailableToBuy(0)).to.rejectedWith("TrashBin: paused.");
        });
    });
    
    ///////////////////
    //For Loop Limits//
    ///////////////////

    describe("Testing For Loop Max", () => {
        it("Unsuccessful ERC1155 transfer where amount exceeds for loop limit", async function () {
            const { addy0, addy1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            for (i = 0; i < (forLoopLimit + 2); i++) {
                await deployedSimpleERC1155v1.connect(addy0).mint(3);
            }

            await expect(deployedSimpleERC1155v1.connect(addy0)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy0.address, deployedTrashbin.address, 3, (forLoopLimit + 1), "0x")).to.rejectedWith("TrashBin: a maximum of 100 NFTs per transaction.");
        });
        it("Unsuccessful ERC1155 batch transfer where ids exceeds for loop limit", async function () {
            const { addy0, addy1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            let ids = [];
            let values = [];

            for (i = 0; i < (forLoopLimit + 2); i++) {
                await deployedSimpleERC1155v1.connect(addy0).mint(3);
                ids.push(3);
                values.push(1);
            }

            await expect(deployedSimpleERC1155v1.connect(addy0)["safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)"](addy0.address, deployedTrashbin.address, ids, values, "0x")).to.rejectedWith("TrashBin: a maximum of 100 NFT ids per transaction.");
        });
        it("Unsuccessful ERC1155 batch transfer where a value exceeds the for loop limit", async function () {
            const { addy0, addy1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            for (i = 0; i < (forLoopLimit + 2); i++) {
                await deployedSimpleERC1155v1.connect(addy0).mint(3);
            }

            await expect(deployedSimpleERC1155v1.connect(addy0)["safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)"](addy0.address, deployedTrashbin.address, [3], [(forLoopLimit + 1)], "0x")).to.rejectedWith("TrashBin: a maximum of 100 NFTs per id.");
        });
        it("Unsuccessful mulitple buy when indexes exceed the for loop limit", async function () {
            const { addy0, addy1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            let indexes = [];

            for (i = 0; i < (forLoopLimit + 2); i++) {
                await deployedSimpleERC1155v1.connect(addy0).mint(3);
                indexes.push(forLoopLimit + 1 - i);
            }
            await deployedSimpleERC1155v1.connect(addy0)["safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)"](addy0.address, deployedTrashbin.address, [3], [forLoopLimit], "0x");

            await expect(deployedTrashbin.buy(indexes, [], { value: ethers.utils.parseEther("10") })).to.rejectedWith("TrashBin: a maximum of 100 purchases per transaction.");
        });
        it("Unsuccessful mulitple sell when collections exceed the for loop limit", async function () {
            const { addy0, addy1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            let collections = [];
            let ids = [];
            let amounts = [];
            let isERC721s = [];

            for (i = 0; i < (forLoopLimit + 2); i++) {
                await deployedSimpleERC1155v1.connect(addy0).mint(3);
                collections.push(deployedSimpleERC1155v1.address);
                ids.push(3);
                amounts.push(1);
                isERC721s.push(false);
            }
            await deployedSimpleERC1155v1.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);

            await expect(deployedTrashbin.sell(collections, ids, amounts, isERC721s)).to.rejectedWith("TrashBin: a maximum of 100 collections per transaction.");
        });
        it("Unsuccessful mulitple sell when a values entry exceeds the for loop limit", async function () {
            const { addy0, addy1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            for (i = 0; i < (forLoopLimit + 2); i++) {
                await deployedSimpleERC1155v1.connect(addy0).mint(3);
            }
            await deployedSimpleERC1155v1.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);

            await expect(deployedTrashbin.sell([deployedSimpleERC1155v1.address], [3], [(forLoopLimit + 1)], [false])).to.rejectedWith("TrashBin: a maximum of 100 sales per collection.");
        });
    });

    ////////////////
    //Withdraw ETH//
    ////////////////

    describe("Testing Withdraw ETH", () => {
        it("Unsuccessful Withdraw ETH if contract balance below minETH balance", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //Attempts to withdraw eth
            await expect(deployedTrashbin.withdrawETH()).to.rejectedWith("TrashBin: contract balance is less than minimum balance amount.");
        });
        it("Successful Withdraw ETH by non-owner", async function () {

            const { owner, addy0, addy1, deployedSimpleERC721v1, deployedTrashbin, deployedHashesDAO } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //buys
            await deployedTrashbin.connect(addy0).buy([0], [], { value: ethers.utils.parseEther("0.02") });

            //Owner balance before
            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

            //Hashes balance before
            const hashesBalanceBefore = await ethers.provider.getBalance(deployedHashesDAO.address);

            //Attempts to withdraw eth
            await deployedTrashbin.connect(addy1).withdrawETH();

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Checks that Trashbin
            expect(trashbinBalance).to.equal(BigInt(0.001e18));

            //Owner balance after
            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

            //Hashes balance before
            const hashesBalanceAfter = await ethers.provider.getBalance(deployedHashesDAO.address);

            //Checks that Owner has been awarded their percentage
            expect(BigInt(ownerBalanceAfter) - BigInt(ownerBalanceBefore)).to.equal((BigInt(2000) * (BigInt(0.02e18) - BigInt(100))) / BigInt(10000));

            expect(BigInt(hashesBalanceAfter) - BigInt(hashesBalanceBefore)).to.equal((BigInt(8000) * (BigInt(0.02e18) - BigInt(100))) / BigInt(10000));
        });
        it("Successful ETH Auto-Withdraw by buyer", async function () {

            const { owner, addy0, addy1, deployedSimpleERC721v1, deployedTrashbin, deployedHashesDAO } = await loadFixture(deployEnvironment);

            //sends funds to trashbin that exceeds the maxBalance
            await owner.sendTransaction({to: deployedTrashbin.address, value: ethers.utils.parseEther("1")});

            await deployedSimpleERC721v1.connect(addy0).mint(3);
            await deployedSimpleERC721v1.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //Owner balance before
            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

            //Hashes balance before
            const hashesBalanceBefore = await ethers.provider.getBalance(deployedHashesDAO.address);

            //buy and autowithdraw
            await deployedTrashbin.connect(addy0).buy([0], [], { value: ethers.utils.parseEther("0.02")});

            //Owner balance after
            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

            //Hashes balance before
            const hashesBalanceAfter = await ethers.provider.getBalance(deployedHashesDAO.address);

            //Checks that Owner has been awarded their percentage
            expect(BigInt(ownerBalanceAfter) - BigInt(ownerBalanceBefore)).to.equal((BigInt(2000) * (BigInt(1e18) + BigInt(0.02e18) - BigInt(100))) / BigInt(10000));

            expect(BigInt(hashesBalanceAfter) - BigInt(hashesBalanceBefore)).to.equal((BigInt(8000) * (BigInt(1e18) + BigInt(0.02e18) - BigInt(100))) / BigInt(10000));
        });
    });

    //////////////
    //Remove NFT//
    //////////////

    describe("Testing Remove NFT", () => {
        it("Unsuccessful Remove NFT with index out of bounds", async function () {

            const { addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //Attempts to withdraw nft
            await expect(deployedTrashbin.removeNFT(1, 0)).to.rejectedWith("TrashBin: index out of bounds.");
        });
        it("Unsuccessful Remove NFT with non-owned DAO hash", async function () {

            const { addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //Attempts to withdraw nft
            await expect(deployedTrashbin.removeNFT(0, 3)).to.rejectedWith("TrashBin: message sender does not own the Hashes NFT provided.");
        });
        it("Unsuccessful Remove NFT with non-DAO hash", async function () {

            const { addy1, deployedHashes, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            await deployedHashes.generate("trashbin");

            await deployedHashes.deactivateToggle(4);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //Attempts to withdraw nft
            await expect(deployedTrashbin.removeNFT(0, 4)).to.rejectedWith("TrashBin: Hashes NFT Id provided is not a DAO NFT.");
        });
        it("Successful Remove ERC721 NFT", async function () {

            const { owner, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //Attempts to withdraw nft
            await deployedTrashbin.removeNFT(0, 0);

            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(0);

            //checks new owner
            const newOwnerOfSimpleERC721v1ID3 = await deployedSimpleERC721v1.ownerOf(3);

            expect(newOwnerOfSimpleERC721v1ID3).to.equal(owner.address);
        });
        it("Successful Remove ERC1155 NFT", async function () {

            const { owner, addy1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC1155v1.connect(addy1).mint(3);
            await deployedSimpleERC1155v1.connect(addy1)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy1.address, deployedTrashbin.address, 3, 1, "0x");

            //Attempts to withdraw nft
            await deployedTrashbin.removeNFT(0, 0);

            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(0);

            //checks new owner
            const newBalanceOfERC1155v1 = await deployedSimpleERC1155v1.balanceOf(owner.address, 3);
            expect(newBalanceOfERC1155v1).to.equal(1);
        });
    });

    ////////////
    //Settings//
    ////////////

    describe("Testing Settings", () => {
        it("Unsuccessful update buy price", async function () {
            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalBuyPrice = await deployedTrashbin.buyPrice();
            expect(initalBuyPrice).to.equal(BigInt(0.02e18));

            await expect(deployedTrashbin.updateBuyPrice(1)).to.rejectedWith("TrashBin: newBuyPrice not within the lower and upper bounds.");
            await expect(deployedTrashbin.updateBuyPrice(BigInt(10e18))).to.rejectedWith("TrashBin: newBuyPrice not within the lower and upper bounds.");
        });
        it("Successful update buy price", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalBuyPrice = await deployedTrashbin.buyPrice();

            expect(initalBuyPrice).to.equal(BigInt(0.02e18));

            await deployedTrashbin.updateBuyPrice(1000000000000);

            const newBuyPrice = await deployedTrashbin.buyPrice();

            expect(newBuyPrice).to.equal(1000000000000);
        });
        it("Unsuccessful update sell price", async function () {
            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalBuyPrice = await deployedTrashbin.sellPrice();
            expect(initalBuyPrice).to.equal(BigInt(100));

            await expect(deployedTrashbin.updateSellPrice(0)).to.rejectedWith("TrashBin: newSellPrice not within the lower and upper bounds.");
            await expect(deployedTrashbin.updateSellPrice(BigInt(10e18))).to.rejectedWith("TrashBin: newSellPrice not within the lower and upper bounds.");
        });
        it("Successful update sell price", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalSellPrice = await deployedTrashbin.sellPrice();

            expect(initalSellPrice).to.equal(BigInt(100));

            await deployedTrashbin.updateSellPrice(1000);

            const newSellPrice = await deployedTrashbin.sellPrice();

            expect(newSellPrice).to.equal(1000);
        });
        it("Unsuccessful update standard hash discount with too large of a value", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalStandardHashDiscount = await deployedTrashbin.standardHashDiscount();

            expect(initalStandardHashDiscount).to.equal(7500);

            await expect(deployedTrashbin.updateStandardHashDiscount(10001)).to.rejectedWith("TrashBin: updated Standard Hash Discount may not exceed 100%.");
        });
        it("Successful update standard hash discount", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalStandardHashDiscount = await deployedTrashbin.standardHashDiscount();

            expect(initalStandardHashDiscount).to.equal(7500);

            await deployedTrashbin.updateStandardHashDiscount(100);

            const newStandardHashDiscount = await deployedTrashbin.standardHashDiscount();

            expect(newStandardHashDiscount).to.equal(100);
        });
        it("Unsuccessful update dao hash discount with too large of a value", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalDaoHashDiscount = await deployedTrashbin.daoHashDiscount();

            expect(initalDaoHashDiscount).to.equal(2500);

            await expect(deployedTrashbin.updateDaoHashDiscount(10001)).to.rejectedWith("TrashBin: updated DAO Hash Discount may not exceed 100%.");
        });
        it("Successful update dao hash discount", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalDaoHashDiscount = await deployedTrashbin.daoHashDiscount();

            expect(initalDaoHashDiscount).to.equal(2500);

            await deployedTrashbin.updateDaoHashDiscount(100);

            const newDaoHashDiscount = await deployedTrashbin.daoHashDiscount();

            expect(newDaoHashDiscount).to.equal(100);
        });
        it("Unsuccessful update buyable delay", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalBuyableDelay = await deployedTrashbin.buyableDelay();
            expect(initalBuyableDelay).to.equal(20000);

            await expect(deployedTrashbin.updateBuyableDelay(1)).to.rejectedWith("TrashBin: newBuyableDelay not within the lower and upper bounds.");
            await expect(deployedTrashbin.updateBuyableDelay(BigInt(10e18))).to.rejectedWith("TrashBin: newBuyableDelay not within the lower and upper bounds.");
        });
        it("Successful update buyable delay", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalBuyableDelay = await deployedTrashbin.buyableDelay();

            expect(initalBuyableDelay).to.equal(20000);

            await deployedTrashbin.updateBuyableDelay(100);

            const newBuyableDelay = await deployedTrashbin.buyableDelay();

            expect(newBuyableDelay).to.equal(100);
        });
        it("Unsuccessful update min Eth balance", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalMinEthBalance = await deployedTrashbin.minEthBalance();
            expect(initalMinEthBalance).to.equal(BigInt(0.001e18));

            await expect(deployedTrashbin.updateMinEthBalance(BigInt(0.2e18))).to.rejectedWith("TrashBin: newMinEthBalance may not exceed 0.1ETH.");
        });
        it("Successful update min Eth balance", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalMinEthBalance = await deployedTrashbin.minEthBalance();

            expect(initalMinEthBalance).to.equal(BigInt(0.001e18));

            await deployedTrashbin.updateMinEthBalance(100);

            const newMinEthBalance = await deployedTrashbin.minEthBalance();

            expect(newMinEthBalance).to.equal(100);
        });
        it("Unsuccessful update max Eth balance", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalMaxEthBalance = await deployedTrashbin.maxEthBalance();
            expect(initalMaxEthBalance).to.equal(BigInt(0.1e18));

            await expect(deployedTrashbin.updateMaxEthBalance(1)).to.rejectedWith("TrashBin: newMaxEthBalance not within the lower and upper bounds.");
            await expect(deployedTrashbin.updateMaxEthBalance(BigInt(10e18))).to.rejectedWith("TrashBin: newMaxEthBalance not within the lower and upper bounds.");
        });
        it("Successful update max Eth balance", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalMaxEthBalance = await deployedTrashbin.maxEthBalance();

            expect(initalMaxEthBalance).to.equal(BigInt(0.1e18));

            await deployedTrashbin.updateMaxEthBalance(1000000000000);

            const newMaxEthBalance = await deployedTrashbin.maxEthBalance();

            expect(newMaxEthBalance).to.equal(1000000000000);
        });
        it("Unsuccessful update eth percentage with too large of a value", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalEthPercentage = await deployedTrashbin.ethPercentageToOwner();

            expect(initalEthPercentage).to.equal(2000);

            await expect(deployedTrashbin.updateEthPercentageToOwner(10001)).to.rejectedWith("TrashBin: updated ETH percentage may not exceed 100%.");
        });
        it("Successful update eth percentage", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const initalEthPercentage = await deployedTrashbin.ethPercentageToOwner();

            expect(initalEthPercentage).to.equal(2000);

            await deployedTrashbin.updateEthPercentageToOwner(100);

            const newEthPercentage = await deployedTrashbin.ethPercentageToOwner();

            expect(newEthPercentage).to.equal(100);
        });
        it("Successful update all settings", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            //Checks buyPrice
            const trashBinBuyPrice = await deployedTrashbin.buyPrice();
            expect(trashBinBuyPrice).to.equal(BigInt(0.02e18));

            //Checks sellPrice
            const trashBinSellPrice = await deployedTrashbin.sellPrice();
            expect(trashBinSellPrice).to.equal(100);

            //Checks standardHashDiscount
            const trashBinStandardHashDiscount = await deployedTrashbin.standardHashDiscount();
            expect(trashBinStandardHashDiscount).to.equal(7500);

            //Checks daoHashDiscount
            const trashBinDaoHashDiscount = await deployedTrashbin.daoHashDiscount();
            expect(trashBinDaoHashDiscount).to.equal(2500);

            //Checks buyableDelay
            const trashBinBuyableDelay = await deployedTrashbin.buyableDelay();
            expect(trashBinBuyableDelay).to.equal(20000);

            //Checks minEthBalance
            const trashBinMinEthBalance = await deployedTrashbin.minEthBalance();
            expect(trashBinMinEthBalance).to.equal(BigInt(0.001e18));

            //Checks ethPercentage
            const trashBinEthPercentage= await deployedTrashbin.ethPercentageToOwner();
            expect(trashBinEthPercentage).to.equal(2000);

            //updates all settings
            await deployedTrashbin.updateAllSettings(1000000000000, 100, 100, 100, 100, 100, 1000000000000, 100);

            //Checks buyPrice
            const newtrashBinBuyPrice = await deployedTrashbin.buyPrice();
            expect(newtrashBinBuyPrice).to.equal(1000000000000);

            //Checks sellPrice
            const newtrashBinSellPrice = await deployedTrashbin.sellPrice();
            expect(newtrashBinSellPrice).to.equal(100);

            //Checks standardHashDiscount
            const newtrashBinStandardHashDiscount = await deployedTrashbin.standardHashDiscount();
            expect(newtrashBinStandardHashDiscount).to.equal(100);

            //Checks daoHashDiscount
            const newtrashBinDaoHashDiscount = await deployedTrashbin.daoHashDiscount();
            expect(newtrashBinDaoHashDiscount).to.equal(100);

            //Checks buyableDelay
            const newtrashBinBuyableDelay = await deployedTrashbin.buyableDelay();
            expect(newtrashBinBuyableDelay).to.equal(100);

            //Checks minEthBalance
            const newtrashBinMinEthBalance = await deployedTrashbin.minEthBalance();
            expect(newtrashBinMinEthBalance).to.equal(100);

            //Checks minEthBalance
            const newtrashBinMaxEthBalance = await deployedTrashbin.maxEthBalance();
            expect(newtrashBinMaxEthBalance).to.equal(1000000000000);

            //Checks ethPercentage
            const newtrashBinEthPercentage= await deployedTrashbin.ethPercentageToOwner();
            expect(newtrashBinEthPercentage).to.equal(100);
        });
        it("Non-Owner unable to update any settings", async function () {

            const { addy0, deployedTrashbin } = await loadFixture(deployEnvironment);

            await expect(deployedTrashbin.connect(addy0).updateBuyPrice(100)).to.rejectedWith("Ownable: caller is not the owner");
            await expect(deployedTrashbin.connect(addy0).updateSellPrice(100)).to.rejectedWith("Ownable: caller is not the owner");
            await expect(deployedTrashbin.connect(addy0).updateStandardHashDiscount(100)).to.rejectedWith("Ownable: caller is not the owner");
            await expect(deployedTrashbin.connect(addy0).updateDaoHashDiscount(100)).to.rejectedWith("Ownable: caller is not the owner");
            await expect(deployedTrashbin.connect(addy0).updateBuyableDelay(100)).to.rejectedWith("Ownable: caller is not the owner");
            await expect(deployedTrashbin.connect(addy0).updateMinEthBalance(100)).to.rejectedWith("Ownable: caller is not the owner");
            await expect(deployedTrashbin.connect(addy0).updateEthPercentageToOwner(100)).to.rejectedWith("Ownable: caller is not the owner");
            await expect(deployedTrashbin.connect(addy0).updateAllSettings(100, 100, 100, 100, 100, 100, 100, 100)).to.rejectedWith("Ownable: caller is not the owner");
        });

        ////////////////////
        //Zero'd Variables//
        ////////////////////

        it("EthPercentageToOwner works when set to zero", async function () {
            const { owner, addy0, deployedTrashbin, deployedHashesDAO } = await loadFixture(deployEnvironment);

            const initalEthPercentage = await deployedTrashbin.ethPercentageToOwner();
            expect(initalEthPercentage).to.equal(2000);
            
            await deployedTrashbin.updateEthPercentageToOwner(0);

            await owner.sendTransaction({to: deployedTrashbin.address, value: ethers.utils.parseEther("1")});

            //Owner balance before
            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

            //Hashes balance before
            const hashesBalanceBefore = await ethers.provider.getBalance(deployedHashesDAO.address);

            //buy and autowithdraw
            await deployedTrashbin.connect(addy0).withdrawETH();

            //Owner balance after
            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

            //Hashes balance before
            const hashesBalanceAfter = await ethers.provider.getBalance(deployedHashesDAO.address);

            //Checks that Owner has been awarded their percentage
            expect(BigInt(ownerBalanceAfter) - BigInt(ownerBalanceBefore)).to.equal(0);

            expect(BigInt(hashesBalanceAfter) - BigInt(hashesBalanceBefore)).to.equal((BigInt(1e18)));
        });
        it("Standard hash discount works when set to zero", async function () {
            const { owner, addy0, deployedTrashbin, deployedHashesDAO, deployedHashes, deployedSimpleERC721v1 } = await loadFixture(deployEnvironment);
 
            const initalStandardHashDiscount = await deployedTrashbin.standardHashDiscount();
            expect(initalStandardHashDiscount).to.equal(7500);
            
            await deployedTrashbin.updateStandardHashDiscount(0);

            await deployedSimpleERC721v1.connect(addy0).mint(3);
            await deployedSimpleERC721v1.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, deployedTrashbin.address, 3);

            for (i = 4; i < 12; i++) {
                deployedHashes.connect(addy0).generate("iterate");
            }

            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            await deployedTrashbin.connect(addy0).buy([0], [11], {value: ethers.utils.parseEther("0")});
        });
        it("DAO hash discount works when set to zero", async function () {
            const { owner, addy0, deployedTrashbin, deployedHashesDAO, deployedHashes, deployedSimpleERC721v1 } = await loadFixture(deployEnvironment);
 
            const initalDAOHashDiscount = await deployedTrashbin.daoHashDiscount();
            expect(initalDAOHashDiscount).to.equal(2500);
            
            await deployedTrashbin.updateDaoHashDiscount(0);

            await deployedSimpleERC721v1.connect(addy0).mint(3);
            await deployedSimpleERC721v1.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, deployedTrashbin.address, 3);

            for (i = 4; i < 12; i++) {
                deployedHashes.connect(addy0).generate("iterate");
            }

            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            await deployedTrashbin.connect(addy0).buy([0], [5], {value: ethers.utils.parseEther("0")});
        });
    });

    /////////////////
    //Testing Pause//
    /////////////////

    describe("Testing Pause", () => {
        it("Unsuccessful pause of all core functions by non-owner", async function () {
            const { owner, addy1, deployedTrashbin, deployedSimpleERC721v1 } = await loadFixture(deployEnvironment);

            await expect(deployedTrashbin.connect(addy1).togglePause()).to.rejectedWith("Ownable: caller is not the owner");
        });
        it("Successful pause of all core functions", async function () {
            const { owner, addy1, deployedTrashbin, deployedSimpleERC721v1, deployedSimpleERC1155v1 } = await loadFixture(deployEnvironment);

            await deployedSimpleERC721v1.connect(addy1).mint(4);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 4);

            const beforeToggle = await deployedTrashbin.paused();
            expect(beforeToggle).to.equal(false);

            await deployedTrashbin.togglePause();

            const afterToggle = await deployedTrashbin.paused();
            expect(afterToggle).to.equal(true);

            //Testing that all the core functions are paused

            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await expect(deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3)).to.rejectedWith("Pausable: paused");

            await deployedSimpleERC1155v1.connect(addy1).mint(3);
            await expect(deployedSimpleERC1155v1.connect(addy1)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy1.address, deployedTrashbin.address, 3, 1, "0x")).to.rejectedWith("Pausable: paused");

            await deployedSimpleERC1155v1.connect(addy1).mint(3);
            await expect(deployedSimpleERC1155v1.connect(addy1)["safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)"](addy1.address, deployedTrashbin.address, [3], [2], "0x")).to.rejectedWith("Pausable: paused");

            await expect(deployedTrashbin.connect(addy1).buy([0], [], { value: ethers.utils.parseEther("0.02")})).to.rejectedWith("Pausable: paused");

            await deployedSimpleERC1155v1.connect(addy1).setApprovalForAll(deployedTrashbin.address, true);

            await expect(deployedTrashbin.connect(addy1).sell([deployedSimpleERC1155v1.address], [3], [2], [false])).to.rejectedWith("Pausable: paused");

            await expect(deployedTrashbin.removeNFT(0, 0)).to.rejectedWith("Pausable: paused");

            await owner.sendTransaction({to: deployedTrashbin.address, value: ethers.utils.parseEther("0.1")});

            //Reverts with ownable string 'cos of unique conditional modifier that also requires paused
            await expect(deployedTrashbin.connect(addy1).withdrawETH()).to.rejectedWith("Ownable: caller is not the owner");
        });
        it("Successful pause and unpause", async function () {

            const { owner, addy1, deployedTrashbin, deployedSimpleERC721v1 } = await loadFixture(deployEnvironment);

            await deployedTrashbin.togglePause();

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await expect(deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3)).to.rejectedWith("Pausable: paused");

            await deployedTrashbin.togglePause();

            deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);
        });
        it("Successful pause and withdrawETH", async function () {

            const { owner, addy1, deployedTrashbin, deployedSimpleERC721v1, deployedHashesDAO, deployedSimpleERC1155v1 } = await loadFixture(deployEnvironment);

            const beforeToggle = await deployedTrashbin.paused();
            expect(beforeToggle).to.equal(false);

            await deployedTrashbin.togglePause();

            const afterToggle = await deployedTrashbin.paused();
            expect(afterToggle).to.equal(true);

            await owner.sendTransaction({to: deployedTrashbin.address, value: ethers.utils.parseEther("0.1")});

            //Owner balance before
            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

            //Hashes balance before
            const hashesBalanceBefore = await ethers.provider.getBalance(deployedHashesDAO.address);

            const sentTXN = await deployedTrashbin.withdrawETH();

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //Gas
            const receipt = await sentTXN.wait();
            const cumulativeGasUsed = receipt.cumulativeGasUsed;
            const effectiveGasPrice = receipt.effectiveGasPrice;
            const ETHpaid = BigInt(cumulativeGasUsed) * BigInt(effectiveGasPrice);

            //Checks that Trashbin
            expect(trashbinBalance).to.equal(BigInt(0.001e18));

            //Owner balance after
            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

            //Hashes balance before
            const hashesBalanceAfter = await ethers.provider.getBalance(deployedHashesDAO.address);

            //Checks that Owner has been awarded their percentage
            expect(BigInt(ownerBalanceAfter) + BigInt(ETHpaid) - BigInt(ownerBalanceBefore)).to.equal((BigInt(2000) * BigInt(0.1e18)) / BigInt(10000));

            expect(BigInt(hashesBalanceAfter) - BigInt(hashesBalanceBefore)).to.equal((BigInt(8000) * BigInt(0.1e18)) / BigInt(10000));
        });
    });

    //////////////////////
    //Failsafe Functions//
    //////////////////////

    describe("Testing failsafe functions", () => {
        it("Successful withraw ERC721", async function () {

            const { addy1, owner, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //owner withdraws ERC721
            await deployedTrashbin.withdrawERC721(deployedSimpleERC721v1.address, 3);

            //checks that owner is the new owner of the NFT
            const newOwner = await deployedSimpleERC721v1.ownerOf(3);

            expect(newOwner).to.equal(owner.address);
        });
        it("Successful withraw ERC1155", async function () {

            const { addy0, owner, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            await deployedSimpleERC1155v1.connect(addy0)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy0.address, deployedTrashbin.address, 3, 1, "0x");

            await deployedTrashbin.withdrawERC1155(deployedSimpleERC1155v1.address, 3, 1);

            const newBalanceOfERC1155v1 = await deployedSimpleERC1155v1.balanceOf(owner.address, 3);
            expect(newBalanceOfERC1155v1).to.equal(1);
        });
        it("Successful withraw ERC20", async function () {

            const { addy0, owner, deployedSimpleERC20v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            await deployedSimpleERC20v1.connect(addy0).mint(3000);
            await deployedSimpleERC20v1.connect(addy0)["transfer(address,uint256)"](deployedTrashbin.address, 3000);

            await deployedTrashbin.withdrawERC20(deployedSimpleERC20v1.address, 3000);

            const newBalanceOfERC20v1 = await deployedSimpleERC20v1.balanceOf(owner.address);
            expect(newBalanceOfERC20v1).to.equal(3000);
        });
        it("Unsuccessful delete index with index out of bounds", async function () {

            const { addy1, owner, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            await expect(deployedTrashbin.deleteIndexes([1])).to.rejectedWith("TrashBin: index out of bounds.");
        });
        it("Successful delete single index", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            await deployedSimpleERC721v1.connect(addy1).mint(4);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 4);

            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            await deployedSimpleERC1155v1.connect(addy0)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy0.address, deployedTrashbin.address, 3, 1, "0x");

            await deployedSimpleERC721v1.connect(addy1).mint(5);
            const sentTXN = await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 5);

            await deployedTrashbin.deleteIndexes([1]);

            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(3);

            //Accessing new NFT storage created on safe Transfer
            const nftStorageSlot1 = await deployedTrashbin.nftStorage(1);

            const blockMined = sentTXN.blockNumber;

            //Checks that nftStorage has been updated
            expect(nftStorageSlot1.collection).to.equal(deployedSimpleERC721v1.address);
            expect(nftStorageSlot1.id).to.equal(5);
            expect(nftStorageSlot1.isERC721).to.equal(true);
            expect(nftStorageSlot1.blockSold).to.equal(blockMined);
        });
        it("Unsuccessful delete (not monotonically decreasing) multiple indexes", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            await deployedSimpleERC721v1.connect(addy1).mint(4);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 4);

            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            await deployedSimpleERC1155v1.connect(addy0)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy0.address, deployedTrashbin.address, 3, 1, "0x");

            await deployedSimpleERC721v1.connect(addy1).mint(5);
            const sentTXN = await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 5);

            await expect(deployedTrashbin.deleteIndexes([1, 2])).to.rejectedWith("Trashbin: indexes array provided is not monotonically decreasing.");
        });
        it("Successful delete multiple indexes", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            await deployedSimpleERC721v1.connect(addy1).mint(4);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 4);

            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            const sentTXN0 =await deployedSimpleERC1155v1.connect(addy0)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy0.address, deployedTrashbin.address, 3, 1, "0x");

            await deployedSimpleERC721v1.connect(addy1).mint(5);
            const sentTXN1 = await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 5);

            await deployedTrashbin.deleteIndexes([1,0]);

            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(2);

            const nftStorageSlot1 = await deployedTrashbin.nftStorage(1);

            const blockMined = sentTXN1.blockNumber;

            //Checks that nftStorage has been updated
            expect(nftStorageSlot1.collection).to.equal(deployedSimpleERC721v1.address);
            expect(nftStorageSlot1.id).to.equal(5);
            expect(nftStorageSlot1.isERC721).to.equal(true);
            expect(nftStorageSlot1.blockSold).to.equal(blockMined);

            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            const blockMined0 = sentTXN0.blockNumber;

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(false);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined0);
        });
        it("Successful delete multiple indexes successively", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            await deployedSimpleERC721v1.connect(addy1).mint(4);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 4);

            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            const sentTXN0 =await deployedSimpleERC1155v1.connect(addy0)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy0.address, deployedTrashbin.address, 3, 1, "0x");

            await deployedSimpleERC721v1.connect(addy1).mint(5);
            const sentTXN1 = await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 5);

            await deployedTrashbin.deleteIndexes([1,0]);

            //Gets the length of the NFT storage array
            const nftStorageLength = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength).to.equal(2);

            const nftStorageSlot1 = await deployedTrashbin.nftStorage(1);

            const blockMined = sentTXN1.blockNumber;

            //Checks that nftStorage has been updated
            expect(nftStorageSlot1.collection).to.equal(deployedSimpleERC721v1.address);
            expect(nftStorageSlot1.id).to.equal(5);
            expect(nftStorageSlot1.isERC721).to.equal(true);
            expect(nftStorageSlot1.blockSold).to.equal(blockMined);

            const nftStorageSlot0 = await deployedTrashbin.nftStorage(0);

            const blockMined0 = sentTXN0.blockNumber;

            //Checks that nftStorage has been updated
            expect(nftStorageSlot0.collection).to.equal(deployedSimpleERC1155v1.address);
            expect(nftStorageSlot0.id).to.equal(3);
            expect(nftStorageSlot0.isERC721).to.equal(false);
            expect(nftStorageSlot0.blockSold).to.equal(blockMined0);

            //Then mints some more and sends them to the Trashbin also
            await deployedSimpleERC721v1.connect(addy1).mint(6);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 6);

            await deployedSimpleERC721v1.connect(addy1).mint(7);
            const sentTXNB = await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 7);

            //delete three and zero
            await deployedTrashbin.deleteIndexes([2,0]);

            //Gets the length of the NFT storage array
            const nftStorageLength0 = await deployedTrashbin.nftStorageLength();

            expect(nftStorageLength0).to.equal(2);

            const nftStorageSlotA = await deployedTrashbin.nftStorage(1);

            expect(nftStorageSlotA.collection).to.equal(deployedSimpleERC721v1.address);
            expect(nftStorageSlotA.id).to.equal(5);
            expect(nftStorageSlotA.isERC721).to.equal(true);
            expect(nftStorageSlotA.blockSold).to.equal(blockMined);

            const nftStorageSlotB = await deployedTrashbin.nftStorage(0);

            const blockMinedB = sentTXNB.blockNumber;

            expect(nftStorageSlotB.collection).to.equal(deployedSimpleERC721v1.address);
            expect(nftStorageSlotB.id).to.equal(7);
            expect(nftStorageSlotB.isERC721).to.equal(true);
            expect(nftStorageSlotB.blockSold).to.equal(blockMinedB);
        });
        it("Non-owner unable to use failsafe functions", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedSimpleERC1155v1, deployedSimpleERC20v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            await deployedSimpleERC1155v1.connect(addy0).mint(3);
            await deployedSimpleERC1155v1.connect(addy0)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy0.address, deployedTrashbin.address, 3, 1, "0x");

            await deployedSimpleERC20v1.connect(addy0).mint(3000);
            await deployedSimpleERC20v1.connect(addy0)["transfer(address,uint256)"](deployedTrashbin.address, 3000);

            await expect(deployedTrashbin.connect(addy1).withdrawERC721(deployedSimpleERC721v1.address, 3)).to.rejectedWith("Ownable: caller is not the owner");
            await expect(deployedTrashbin.connect(addy1).withdrawERC1155(deployedSimpleERC1155v1.address, 3, 1)).to.rejectedWith("Ownable: caller is not the owner");
            await expect(deployedTrashbin.connect(addy1).withdrawERC20(deployedSimpleERC20v1.address, 3000)).to.rejectedWith("Ownable: caller is not the owner");
            await expect(deployedTrashbin.connect(addy1).deleteIndexes([1])).to.rejectedWith("Ownable: caller is not the owner");
        });
    });

    //////////////////
    //Testing Events//
    //////////////////

    describe("Testing Events", () => {
        it("Successful emission of event after sale of ERC721", async function () {

            const { addy0, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC721v1.connect(addy0).mint(3);

            //addy0 gives approval
            const approvedTXN = await deployedSimpleERC721v1.connect(addy0).approve(deployedTrashbin.address, 3);

            //gets current block
            const blockMined = approvedTXN.blockNumber;

            await expect(deployedTrashbin.connect(addy0).sell([deployedSimpleERC721v1.address], [3], [0], [true])).to.emit(deployedTrashbin, "Sale").withArgs(deployedSimpleERC721v1.address, 3, true, blockMined + 1);
        });
        it("Successful emission of event after sale of ERC1155", async function () {

            const { addy0, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //addy0 mints some simpleERC721
            await deployedSimpleERC1155v1.connect(addy0).mint(3);

            //addy0 approves Trashbin
            const approvedTXN = await deployedSimpleERC1155v1.connect(addy0).setApprovalForAll(deployedTrashbin.address, true);

            //gets current block
            const blockMined = approvedTXN.blockNumber;

            await expect(deployedTrashbin.connect(addy0).sell([deployedSimpleERC1155v1.address], [3], [1], [false])).to.emit(deployedTrashbin, "Sale").withArgs(deployedSimpleERC1155v1.address, 3, false, blockMined + 1);
        });
        it("Successful emission of event after single buy", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //buys and emits event
            await expect(deployedTrashbin.connect(addy0).buy([0], [], { value: ethers.utils.parseEther("0.02") })).to.emit(deployedTrashbin, "Purchase").withArgs(deployedSimpleERC721v1.address, 3, true);
        });
        it("Successful emission of event after withdrawETH", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //increment the number of blocks by 20001
            await hre.network.provider.send("hardhat_mine", ["0x4e21"]);

            //buys the NFT
            await deployedTrashbin.connect(addy0).buy([0], [], { value: ethers.utils.parseEther("0.02") })

            //TrashBin balance
            const trashbinBalance = await ethers.provider.getBalance(deployedTrashbin.address);

            //withdraws and emits event
            await expect(deployedTrashbin.connect(addy0).withdrawETH()).to.emit(deployedTrashbin, "WithdrawETH").withArgs(BigInt(trashbinBalance - 0.001e18));
        });
        it("Successful emission of event after RemoveNFT", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //emits event
            await expect(deployedTrashbin.removeNFT(0, 0)).to.emit(deployedTrashbin, "RemoveNFT").withArgs(deployedSimpleERC721v1.address, 3);
        });
        it("Successful emission of event after WithdrawERC721", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //emits event
            await expect(deployedTrashbin.withdrawERC721(deployedSimpleERC721v1.address, 3)).to.emit(deployedTrashbin, "WithdrawERC721").withArgs(deployedSimpleERC721v1.address, 3);
        });
        it("Successful emission of event after WithdrawERC1155", async function () {

            const { addy0, addy1, deployedSimpleERC1155v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC1155v1.connect(addy1).mint(3);
            await deployedSimpleERC1155v1.connect(addy1)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addy1.address, deployedTrashbin.address, 3, 1, "0x");

            //emits event
            await expect(deployedTrashbin.withdrawERC1155(deployedSimpleERC1155v1.address, 3, 1)).to.emit(deployedTrashbin, "WithdrawERC1155").withArgs(deployedSimpleERC1155v1.address, 3, 1);
        });
        it("Successful emission of event after WithdrawERC20", async function () {

            const { addy0, addy1, deployedSimpleERC20v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            await deployedSimpleERC20v1.connect(addy1).mint(BigInt(1e18));
            await deployedSimpleERC20v1.connect(addy1)["transfer(address,uint256)"](deployedTrashbin.address, BigInt(1e18));

            //emits event
            await expect(deployedTrashbin.withdrawERC20(deployedSimpleERC20v1.address, BigInt(1e18))).to.emit(deployedTrashbin, "WithdrawERC20").withArgs(deployedSimpleERC20v1.address, BigInt(1e18));
        });
        it("Successful emission of event after DeleteIndexes", async function () {

            const { addy0, addy1, deployedSimpleERC721v1, deployedTrashbin } = await loadFixture(deployEnvironment);

            //first sends an NFT to Trashbin
            await deployedSimpleERC721v1.connect(addy1).mint(3);
            await deployedSimpleERC721v1.connect(addy1)["safeTransferFrom(address,address,uint256)"](addy1.address, deployedTrashbin.address, 3);

            //emits event
            await expect(deployedTrashbin.deleteIndexes([0])).to.emit(deployedTrashbin, "DeleteIndex").withArgs(deployedSimpleERC721v1.address, 3);
        });
        it("Successful emission of event after update all settings", async function () {

            const { deployedTrashbin } = await loadFixture(deployEnvironment);

            const oldtrashBinBuyPrice = await deployedTrashbin.buyPrice();
            await expect(deployedTrashbin.updateBuyPrice(1000000000000)).to.emit(deployedTrashbin, "UpdatedSetting").withArgs("buyPrice", oldtrashBinBuyPrice, 1000000000000);

            const oldtrashBinSellPrice = await deployedTrashbin.sellPrice();
            await expect(deployedTrashbin.updateSellPrice(10)).to.emit(deployedTrashbin, "UpdatedSetting").withArgs("sellPrice", oldtrashBinSellPrice, 10);

            const oldtrashBinStandardHashDiscount = await deployedTrashbin.standardHashDiscount();
            await expect(deployedTrashbin.updateStandardHashDiscount(100)).to.emit(deployedTrashbin, "UpdatedSetting").withArgs("standardHashDiscount", oldtrashBinStandardHashDiscount, 100);

            const oldtrashBinDaoHashDiscount = await deployedTrashbin.daoHashDiscount();
            await expect(deployedTrashbin.updateDaoHashDiscount(1000)).to.emit(deployedTrashbin, "UpdatedSetting").withArgs("daoHashDiscount", oldtrashBinDaoHashDiscount, 1000);

            const oldtrashBinBuyableDelay = await deployedTrashbin.buyableDelay();
            await expect(deployedTrashbin.updateBuyableDelay(10000)).to.emit(deployedTrashbin, "UpdatedSetting").withArgs("buyableDelay", oldtrashBinBuyableDelay, 10000);

            const oldtrashBinMinEthBalance = await deployedTrashbin.minEthBalance();
            await expect(deployedTrashbin.updateMinEthBalance(1000000000000)).to.emit(deployedTrashbin, "UpdatedSetting").withArgs("minEthBalance", oldtrashBinMinEthBalance, 1000000000000);
            
            const oldtrashBinMaxEthBalance= await deployedTrashbin.maxEthBalance();
            await expect(deployedTrashbin.updateMaxEthBalance(1000000000000)).to.emit(deployedTrashbin, "UpdatedSetting").withArgs("maxEthBalance", oldtrashBinMaxEthBalance, 1000000000000);
            
            const oldtrashBinEthPercentageToOwner = await deployedTrashbin.ethPercentageToOwner();
            await expect(deployedTrashbin.updateEthPercentageToOwner(1000)).to.emit(deployedTrashbin, "UpdatedSetting").withArgs("ethPercentageToOwner", oldtrashBinEthPercentageToOwner, 1000);
        });
    });

    describe("Testing getNFTStorageIndex", () => {
        it("Successful location of index using getNFTStorageIndex", async function () {
            const { owner, addy0, deployedTrashbin, deployedSimpleERC721v1, deployedSimpleERC721v2 } = await loadFixture(deployEnvironment);

            for (i = 3; i < (forLoopLimit + 3); i++) {
                await deployedSimpleERC721v1.connect(addy0).mint(i);

                await deployedSimpleERC721v1.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, deployedTrashbin.address, i);
            }

            const position = await deployedTrashbin.connect(addy0).getNFTStorageIndex(deployedSimpleERC721v1.address, 75, 0);

            expect(position).to.equal("72");
        });
        it("Unsuccessful location of index using getNFTStorageIndex", async function () {
            const { owner, addy0, deployedTrashbin, deployedSimpleERC721v1, deployedSimpleERC721v2 } = await loadFixture(deployEnvironment);

            for (i = 3; i < (forLoopLimit + 3); i++) {
                await deployedSimpleERC721v1.connect(addy0).mint(i);

                await deployedSimpleERC721v1.connect(addy0)["safeTransferFrom(address,address,uint256)"](addy0.address, deployedTrashbin.address, i);
            }

            await expect(deployedTrashbin.connect(addy0).getNFTStorageIndex(deployedSimpleERC721v2.address, 75, 0)).to.rejectedWith("NFT index not located. Check that the collection and id values are correct, and/or choose a different starting index.");
        });
    });
});