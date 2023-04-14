// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

// Enter the lottery (paying some amount)
// Pick a random winner (verifiable random)
// Winner to be selected every X minutes  --> completly automate
// Chainlink Oracle --> Randomness, Automated Execution (Chainlink Keepers)

error Raffle__NotEnoughETHEntered();

contract Raffle {
    /* State Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;

    /* Events */
    event RaffleEnter(address indexed player);

    constructor(uint256 entranceFee) {
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

    // function pickRandomWinner() {}

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
