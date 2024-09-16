// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract Roulette {
    address private house_addr;
    uint256 public bettingClosesAt;

    // Outcome & Meaning: 0 = Red, 1 = Black, 2 = Green
    uint256 public temporaryBalance;

    // Partner Information
    mapping(address => uint256) public partnerContributions; // Mapping of partner addresses to their ETH contributions
    address[] public partners; // Array to store all partners
    uint256 public totalPartnerContributions; // Total ETH contributed by all partners
    uint256 public totalRewardsDistributedToPartners; // Total rewards distributed to partners in ETH

    // Betting details
    struct BetDetails {
        uint256 amount;
        uint8 guess;
    }

    mapping(address => BetDetails) public playerBets;
    address[] public bettors;  // Array to keep track of all bettors

    address[] public charities;
    uint256 public totalDonated;
    AggregatorV3Interface internal priceFeed;

    event BettingClosed(uint256 closedAt);

    // House deploys contract.
    constructor() {
        house_addr = msg.sender;
        temporaryBalance = address(this).balance;
        totalDonated = 0;
        totalPartnerContributions = 0;
        totalRewardsDistributedToPartners = 0;
        priceFeed = AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);
    }

    // Function to get the current ETH/USD price
    function getLatestPrice() public view returns (uint256) {
        (, int price, , ,) = priceFeed.latestRoundData();
        return uint256(price / 1e8);  // Price feed returns with 8 decimal places
    }

    // Function to convert ETH amount to USD amount
    function ethToUsd(uint256 ethAmount) public view returns (uint256) {
        uint256 ethPrice = getLatestPrice();
        return (ethAmount * ethPrice) / 1e18;  // Convert wei to ether
    }

    modifier onlyOwner() {
        require(msg.sender == house_addr, "Only owner can call this function.");
        _;
    }

    // Function to supply funding to the pool.
    function donate() external payable {
        temporaryBalance += msg.value;
    }

    // Function for partners to add ETH to the pool.
    function becomePartner() external payable {
        require(msg.value > 0, "Must send ETH to become a partner");
        if (partnerContributions[msg.sender] == 0) {
            partners.push(msg.sender); // Add new partner to the array
        }
        partnerContributions[msg.sender] += msg.value;
        totalPartnerContributions += msg.value;
        temporaryBalance += msg.value;
    }

    // Function for partners to withdraw their contributions
    function withdrawPartnership() external {
        uint256 contributedAmount = partnerContributions[msg.sender];
        require(contributedAmount > 0, "No contribution to withdraw");
        require(temporaryBalance > contributedAmount, "Wait for funds to be available.");

        // Update partner state
        totalPartnerContributions -= contributedAmount;
        partnerContributions[msg.sender] = 0;
        removePartner(msg.sender); // Remove partner from the array

        // Transfer the contributed amount back to the partner
        payable(msg.sender).transfer(contributedAmount);

        temporaryBalance -= contributedAmount;
    }

    // Internal function to remove a partner from the array
    function removePartner(address partner) private {
        for (uint i = 0; i < partners.length; i++) {
            if (partners[i] == partner) {
                partners[i] = partners[partners.length - 1]; // Replace with the last element
                partners.pop(); // Remove the last element
                break;
            }
        }
    }

    // Function for the house to open the betting round.
    function openBetting() external onlyOwner {
        bettingClosesAt = block.timestamp + 2 minutes;  // Betting open for 2 minutes
        emit BettingClosed(bettingClosesAt);  // Emit event with the future close time
    }

    // Pay house in case of security breach or transfer of funds.
    function withdraw() external onlyOwner {
        payable(house_addr).transfer(address(this).balance);
    }

    // Set bet
    function setBet (uint8 _guess) external payable {
        require(block.timestamp < bettingClosesAt, "Betting is closed");
        require(_guess <= 1, "Invalid guess.");
        require(msg.value > 0 && temporaryBalance > msg.value, "Bet amount invalid or pool low");
        require(playerBets[msg.sender].amount == 0, "Already placed bet");

        bettors.push(msg.sender);

        // Storing the bet details in the mapping
        playerBets[msg.sender] = BetDetails({
            amount: msg.value,
            guess: _guess
        });

        temporaryBalance -= msg.value;
    }

    function payoutWinners(uint8 outcome_game) external onlyOwner {
        require(block.timestamp >= bettingClosesAt, "Betting period has not ended yet");

        // First, determine payouts and update the state before any transfers.
        uint256[] memory payouts = new uint256[](bettors.length);
        for (uint i = 0; i < bettors.length; i++) {
            address bettor = bettors[i];
            if (playerBets[bettor].guess == outcome_game) {
                payouts[i] = playerBets[bettor].amount * 2;
            }
            delete playerBets[bettor];  // Cleanup state upfront
        }

        // After state is cleaned up, then transfer payouts
        for (uint i = 0; i < bettors.length; i++) {
            if (payouts[i] > 0) {
                payable(bettors[i]).transfer(payouts[i]);
            }
        }

        temporaryBalance = address(this).balance;

        delete bettors;  // Clear list of bettors after all operations are complete
    }

    function addCharity(address _charity) external onlyOwner {
        charities.push(_charity);
    }

    function removeCharity(uint index) external onlyOwner {
        require(index < charities.length, "Index out of bounds.");
        for (uint i = index; i < charities.length - 1; i++) {
            charities[i] = charities[i + 1];
        }
        charities.pop();
    }

    function distributeFunds() external onlyOwner {
        require(temporaryBalance > 0, "Insufficient funds");

        uint256 distributedSum = 0;

        uint256 houseShare = temporaryBalance * 1 / 100;
        payable(house_addr).transfer(houseShare);
        distributedSum += houseShare;

        if (charities.length >= 1){
            uint256 charityShare = temporaryBalance * 4 / 100;
            // uint256 donationUsd = ethToUsd(charityShare);

            // totalDonated += donationUsd;

            uint256 perCharityShare = charityShare / charities.length;

            for (uint i = 0; i < charities.length; i++) {
                payable(charities[i]).transfer(perCharityShare);
            }

            distributedSum += charityShare;
        }

        if (totalPartnerContributions > 0) {
            uint256 partnerShare = temporaryBalance * 1 / 100;
            distributePartnerRewards(partnerShare);

            distributedSum += partnerShare;
        }

        temporaryBalance -= distributedSum;
    }

    function distributePartnerRewards(uint256 partnerShare) private {
        for (uint i = 0; i < partners.length; i++) {
            address partner = partners[i];
            uint256 partnerContribution = partnerContributions[partner];
            uint256 reward = (partnerContribution * partnerShare) / totalPartnerContributions;

            payable(partner).transfer(reward);
            totalRewardsDistributedToPartners += reward;
        }
    }

    // View balance of pool.
    function viewPool() external view returns(uint256){
        return address(this).balance;
    }

    // Get number of bets
    function getNumberOfBets() external view returns(uint) {
        return bettors.length;
    }

    // View total amount donated in USD
    function getTotalDonated() external view returns(uint) {
        return totalDonated;
    }

    // Get number of partners
    function getNumberOfPartners() external view returns (uint) {
        return partners.length;
    }

    // Get total amount of ETH contributed by partners
    function getTotalPartnerContributions() external view returns (uint256) {
        return totalPartnerContributions;
    }

    // Get total rewards distributed to partners
    function getTotalRewardsDistributedToPartners() external view returns (uint256) {
        return totalRewardsDistributedToPartners;
    }

    receive() external payable {}
}
