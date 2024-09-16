# GreenRoulette

GreenRoulette is a decentralized application (dApp) built on the Ethereum blockchain that combines gaming with philanthropy. Players can bet on a game of chance while contributing to charitable causes. By staking ETH, users can become partners and earn a share of the pool each month. The platform is designed to be transparent, fair, and community-driven.

## Key Features

- **Decentralized and Transparent**: GreenRoulette leverages Ethereum smart contracts to ensure fairness and transparency in every game.
- **Charity Support**: 4% of the total pool is donated to various charities every month, allowing users to support meaningful causes while playing.
- **Partner Rewards**: 1% of the pool is distributed to partners who stake their ETH. The rewards are proportional to the amount staked compared to the total amount staked by all partners.
- **Secure Random Number Generation**: Utilizes Flare's FTSO to provide secure, unbiased random numbers for game outcomes.

## How It Works

1. **Betting**: Users place their bets on either red or black in a roulette-style game.
2. **Random Number Generation**: The outcome is determined using a secure random number provided by Flare's FTSO, ensuring a fair and tamper-proof game.
3. **Monthly Distribution**:
   - **4%** of the total pool is donated to charities.
   - **1%** goes to the house.
   - **1%** is distributed among partners who have staked their ETH.
4. **Earnings for Partners**: Partners who stake ETH earn rewards proportional to their stake size relative to the total staked amount.

## Installation

To run GreenRoulette locally, follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/tb-software-official/GreenRoulette.git
   cd GreenRoulette
   ```
2. **Install Dependencies**: Make sure you have Node.js installed. Then, run:

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**: Create a `.env` file in the root directory and configure the necessary environment variables:

   ```env
   INFURA_URL=<Your Infura URL>
   PRIVATE_KEY_HOUSE=<Your Private Key>
   CRYPTO_COMPARE_API_KEY=<Your CryptoCompare API Key>
   DB_PASS=<Your Database Password>
   ```

4. **Run the Timer Server**: Start the backend server that manages the game's state and fetches random numbers:

   ```bash
   node timerServer.js
   ```

5. **Run the React Application**: Navigate to the client directory and start the React application:

   ```bash
   cd client
   npm install
   npm start
   ```

6. **Access the Application**: Open your browser and navigate to `http://localhost:3000` to see GreenRoulette in action.

## Usage

- **Play the Game**: Place bets on red or black and see if you win based on the securely generated random number.
- **Stake ETH**: Become a partner by staking ETH and earn rewards from the pool every month.
- **Support Charities**: Know that 4% of the pool goes to charities, supporting meaningful causes with every bet.

## Contributing

Contributions are welcome! To contribute to GreenRoulette:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a new Pull Request.

## License

This project is licensed under the GNU General Public License v3.0. See the LICENSE file for more details.

## Disclaimer

GreenRoulette is a decentralized application running on the Ethereum blockchain. Participation is at your own risk, and you should only bet what you can afford to lose. Please be aware of local regulations regarding gambling and online gaming.

## Contact

For questions or support, please open an issue in the repository or reach out via the discussion board.
