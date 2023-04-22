const { ethers } = require('hardhat');

const networkConfig = {
  default: {
    name: 'hardhat',
    keepersUpdateInterval: '30',
  },
  31337: {
    name: 'localhost',
    entranceFee: ethers.utils.parseEther('0.01'),
    gasLane: '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
    subscriptionId: '0',
    callbackGasLimit: '500000',
    keepersUpdateInterval: '30',
  },
  11155111: {
    name: 'sepolia',
    vrfCoordinatorV2: '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625',
    entranceFee: ethers.utils.parseEther('0.01'),
    gasLane: '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
    subscriptionId: '1377',
    callbackGasLimit: '500000',
    keepersUpdateInterval: '30',
  },
  80001: {
    name: 'polygonMumbai',
    vrfCoordinatorV2: '0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed',
    entranceFee: ethers.utils.parseEther('0.01'),
    gasLane: '0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f',
    subscriptionId: '0',
    callbackGasLimit: '500000',
    keepersUpdateInterval: '30',
  },
};

const developmentChains = ['hardhat', 'localhost'];

module.exports = {
  networkConfig,
  developmentChains,
};
