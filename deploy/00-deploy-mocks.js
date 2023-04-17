const { network } = require('hardhat');

const BASE_FEE = ethers.utils.parseEther('0.25'); // It costs 0.25 LINK per request.
const GAS_PRICE_LINK = 1e9; // Calculated value based on the gas price of the chain (Link per gas)

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const chainId = network.config.chainId;
  const args = [BASE_FEE, GAS_PRICE_LINK];

  if (chainId == 31337) {
    log('Local network detected! Deploying mocks...');
    // deploy a mock vrfCoordinator..
    await deploy('VRFCoordinatorV2Mock', {
      from: deployer,
      log: true,
      args,
    });
    log('Mocks Deployed!');
    log('----------------------------------------------------------');
    log("You are deploying to a local network, you'll need a local network running to interact");
    log(
      'Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!'
    );
    log('----------------------------------------------------------');
  }
};

module.exports.tags = ['all', 'mocks'];
