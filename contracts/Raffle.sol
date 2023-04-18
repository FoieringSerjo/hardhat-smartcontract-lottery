// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol"; // ---> function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal virtual;
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

// Enter the lottery (paying some amount)
// Pick a random winner (verifiable random)
// Winner to be selected every X minutes  --> completly automate
// Chainlink Oracle --> Randomness, Automated Execution (Chainlink Keepers)

error Raffle__SendMoreToEnterRaffle();
error Raffle__TransferFailed();
error Raffle__RaffleNotOpen();
error Raffle__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 raffleState
);

/**
 * @title A sample Raffle Contract
 * @author Patrick Collins - Blockchain, Solidity and Hardhat Course
 * @notice This contract is for creating an untamperable decentralized smart contract
 * @dev This implements the Chainlink VRF Version 2 and Keepers
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /* Type declaration */
    enum RaffleSate {
        OPEN,
        CALCULATING
        // uint256 0 = OPEN, 1 = CALCULATING
    }

    /* State Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    // Lottary variables
    address private s_recentWinner;
    RaffleSate private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /* Events */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    /* Functions */
    constructor(
        address verfCoordinatorV2, // contract
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(verfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(verfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleSate.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__SendMoreToEnterRaffle();
        }

        if (s_raffleState != RaffleSate.OPEN) {
            revert Raffle__RaffleNotOpen();
        }
        s_players.push(payable(msg.sender));
        // Emit an event when we update a dynamic array ot mapping
        // Named events with the function name reversed
        emit RaffleEnter(msg.sender);
    }

    /**
     * Reference: https://docs.chain.link/chainlink-automation/compatible-contracts/
     * @dev This is the function that Chainlink  Keeper nodes call
     * they look for the `upkeepNeeded` to return true
     * the following should be true in order to return true
     * 1. Our time interval should have passed
     * 2. The lottery should have at least 1 player, and have some ETH
     * 3. Our subscription is funded with LINK
     * 4. The lottery should be in "open" state
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool isOpen = (RaffleSate.OPEN == s_raffleState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    // Chainlink docks for random number contract (RandomWords): https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number
    /**
     * @dev Once `checkUpkeep` is returning `true`, this function is called
     * and it kicks off a Chainlink VRF call to get a random winner.
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        // Request to random number
        // Once we get it, do somthing with it
        // 2 transaction process
        s_raffleState = RaffleSate.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, // bytes32 keyHash: The gas lane key hash value, which is the maximum gas price you are willing to pay for a request in wei. It functions as an ID of the off-chain VRF job that runs in response to requests.
            i_subscriptionId, // The subscription ID that this contract uses for funding requests.
            REQUEST_CONFIRMATIONS, // How many confirmations the Chainlink node should wait before responding. The longer the node waits, the more secure the random value is. It must be greater than the minimumRequestBlockConfirmations limit on the coordinator contract
            i_callbackGasLimit,
            NUM_WORDS // How many random values to request. If you can use several random values in a single callback, you can reduce the amount of gas that you spend per random value. The total cost of the callback request depends on how your fulfillRandomWords() function processes and stores the received random values, so adjust your callbackGasLimit accordingly.
        );
        emit RequestedRaffleWinner(requestId);
    }

    /**
     * @dev This is the function that Chainlink VRF node
     * calls to send the money to the random winner.
     */
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        // https://docs.soliditylang.org/en/v0.8.19/types.html#modulo
        uint256 indexOfWinner = randomWords[0] % s_players.length; // randomWords at index 0 due to we only have 1 word
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleSate.OPEN;
        // reset players array
        s_players = new address payable[](0);
        // reset timestamp
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        // required success
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    /** Getter Functions */

    /**
     * This public function returns the entrance fee required to enter in ETH.
     * @dev
     * @return entrance fee (immutable)
     */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    /**
     * This function returns the address of the entered player
     * @dev
     * @param index - index of the entered player
     */
    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    /**
     * This public function returns the Lottery state ( To enter the lottery it should be OPEN)
     * @return OPEN or CALCULATING
     */
    function getRaffleState() public view returns (RaffleSate) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
