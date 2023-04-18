const { network } = require('hardhat');
const { developmentChains, networkConfig } = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther('2');

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;

  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock');
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.events[0].args.subId;
    // Fund the subscription
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]['vrfCoordinatorV2'];
    subscriptionId = networkConfig[chainId]['subscriptionId'];
  }

  const entranceFee = networkConfig[chainId]['entranceFee'];
  const gasLane = networkConfig[chainId]['gasLane'];
  const callbackGasLimit = networkConfig[chainId]['callbackGasLimit'];
  const keepersUpdateInterval = networkConfig[chainId]['keepersUpdateInterval'];
  const args = [
    vrfCoordinatorV2Address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    keepersUpdateInterval,
  ];

  const raffle = await deploy('Raffle', {
    from: deployer,
    args,
    log: true,
    waitConfirmations: 1,
  });

  // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock');
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
  }

  if (!developmentChains.includes(network.name)) {
    log('Verifying...');
    await verify(raffle.address, args);
    log('Verified');
  }
  log('--------------------------------------------------------------------');
};

module.exports.tags = ['all', 'raffle'];
