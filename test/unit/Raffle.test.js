const { assert, expect } = require('chai');
const { network, deployments, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../../helper-hardhat-config');

!developmentChains.includes(network.name)
  ? describe.skip
  : describe('Raffle Unit Tests', () => {
      let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(['all']);
        raffle = await ethers.getContract('Raffle', deployer);
        vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', deployer);
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
      });

      describe('constructor', () => {
        it('initializes the raffle correctly', async function () {
          // Ideally we make our tests have just 1 assert per "it"
          //note: raffleState will transform into uint256 big number hence required for toString
          const raffleState = await raffle.getRaffleState();

          assert.equal(raffleState.toString(), '0');
          assert.equal(
            interval.toString(),
            networkConfig[network.config.chainId]['keepersUpdateInterval']
          );
        });
      });

      describe('enterRaffle', () => {
        it("reverts when you don't pay enough", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWith('Raffle__SendMoreToEnterRaffle');
        });

        it('records player when they enter', async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const playerFromContract = await raffle.getPlayer(0);
          assert.equal(playerFromContract, deployer);
        });

        it('emits event on enter', async () => {
          await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
            raffle,
            'RaffleEnter'
          );
        });

        it("doesn't allow entrance when raffle is calculating", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          // we pretend to be a keeper for a second
          await raffle.performUpkeep([]); // changes the state to calculating for our comparison below
          await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
            // is reverted as raffle is calculating
            'Raffle__RaffleNotOpen'
          );
        });
      });

      describe('checkUpkeep', () => {
        it("returns false is people haven't sent any ETH", async () => {
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert(!upkeepNeeded);
        });

        it("returns false if raffle isn't open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          await raffle.performUpkeep([]);
          const raffleState = await raffle.getRaffleState();
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert.equal(raffleState.toString(), '1');
          assert.equal(upkeepNeeded, false);
        });

        it("returns false if enough time hasn't passed", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send('evm_increaseTime', [interval.toNumber() - 5]); // use a higher number here if this test fails
          await network.provider.request({ method: 'evm_mine', params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep('0x'); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(!upkeepNeeded);
        });

        it('returns true if enough time has passed, has players, eth, and is open', async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep('0x'); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(upkeepNeeded);
        });
      });

      describe('performUpkeep', () => {
        it('it can only run if checkupkeep is true', async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          const tx = await raffle.performUpkeep([]);
          assert(tx);
        });

        it('reverts when checkupkeep is false', async () => {
          await expect(raffle.performUpkeep([])).to.be.revertedWith('Raffle__UpkeepNotNeeded');
        });

        it('updates the raffle state, emit, event and calls the vrf coordinator', async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
          const txResponse = await raffle.performUpkeep([]);
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.events[1].args.requestId;
          const raffleState = await raffle.getRaffleState();
          assert(requestId.toNumber() > 0);
          assert(raffleState.toString() == '1');
        });
      });

      describe('fulfillRandomWords', () => {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send('evm_increaseTime', [interval.toNumber() + 1]);
          await network.provider.request({ method: 'evm_mine', params: [] });
        });

        it('can only be called after performUpKeep', async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled
          ).to.be.revertedWith('nonexistent request');
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
          ).to.be.revertedWith('nonexistent request');
        });

        // This test is too big...
        // This test simulates users entering the raffle and wraps the entire functionality of the raffle
        // inside a promise that will resolve if everything is successful.
        // An event listener for the WinnerPicked is set up
        // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
        // All the assertions are done once the WinnerPicked event is fired
        it('picks a winner, reset the lottery, and sends money', async () => {
          const additionalEntrants = 3;
          const startingAccountIndex = 1; // deployer = 0
          const accounts = await ethers.getSigners();
          for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
            const accountConnectedRaffle = raffle.connect(accounts[i]); // Returns a new instance of the Raffle contract connected to player
            await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
          }
          const startingTimeStamp = await raffle.getLastTimeStamp(); // stores starting timestamp (before we fire our event)

          // performUpkeep (mock being Chainlink Keepers)
          // fulfillRandomWords (mock being Chainlink VRFCoordinator)
          // We will have to wait for the fulfillRandomWords to be called
          await new Promise(async (resolve, reject) => {
            raffle.once('WinnerPicked', async () => {
              // assert throws an error if it fails, so we need to wrap
              // it in a try/catch so that the promise returns event
              // if it fails.
              console.log('Found the event!');
              try {
                const recentWinner = await raffle.getRecentWinner();
                // console.log('recentWinner:', recentWinner);
                // console.log(accounts[2].address);
                // console.log(accounts[1].address);
                // console.log(accounts[0].address);
                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLastTimeStamp();
                const numPlayers = await raffle.getNumberOfPlayers();
                const winnerEndingBalance = await accounts[1].getBalance();
                assert.equal(numPlayers.toString(), '0');
                assert.equal(raffleState.toString(), '0');
                assert(endingTimeStamp > startingTimeStamp);

                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(
                    raffleEntranceFee.mul(additionalEntrants).add(raffleEntranceFee).toString()
                  )
                );
              } catch (error) {
                reject(error);
              }

              resolve();
            });

            // setting up the listener
            // below we will fire the event, and the listener will pick it up, and resolve
            const tx = await raffle.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            const winnerStartingBalance = await accounts[1].getBalance();
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              raffle.address
            );
          });
        });
      });
    });
