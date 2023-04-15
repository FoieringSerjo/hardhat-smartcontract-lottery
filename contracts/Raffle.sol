// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol"; // ---> function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal virtual;

// Enter the lottery (paying some amount)
// Pick a random winner (verifiable random)
// Winner to be selected every X minutes  --> completly automate
// Chainlink Oracle --> Randomness, Automated Execution (Chainlink Keepers)

error Raffle__NotEnoughETHEntered();

contract Raffle is VRFConsumerBaseV2 {
    /* State Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;

    /* Events */
    event RaffleEnter(address indexed player);

    constructor(
        address verfCoordinatorV2,
        uint256 entranceFee
    ) VRFConsumerBaseV2(verfCoordinatorV2) {
        i_entranceFee = entranceFee;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        s_players.push(payable(msg.sender));
        // Emit an event when we update a dynamic array ot mapping
        // Named events with the function name reversed
        emit RaffleEnter(msg.sender);
    }

    // Chainlink docks for random number (RandomWords): https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number
    function requestRandomWinner() external {
        // Request to random number
        // Once we get it, do somthing with it
        // 2 transaction process
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {}

    /* View / Pure Functions */

    /**
     * This public function returns the entrance fee required to enter in ETH.
     * @return entrance fee (immutable)
     */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    /**
     * This function returns the address of the entered player
     * @param index - index of the entered player
     */
    function getPlayers(uint256 index) public view returns (address) {
        return s_players[index];
    }
}
