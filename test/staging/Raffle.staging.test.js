const { assert, expect } = require('chai');
const { getNamedAccounts, ethers, network } = require('hardhat');
const { developmentChains } = require('../../helper-hardhat-config');

developmentChains.includes(network.name)
  ? describe.skip
  : describe('Raffle Staging Tests', function () {
      let raffle, raffleEntranceFee, deployer;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract('Raffle', deployer);
        raffleEntranceFee = await raffle.getEntranceFee();
      });
    });
