const https = require('https');
const fs = require('fs');
const express = require('express');
const socketIo = require('socket.io');
const { Web3 } = require('web3');

// Load ABIs
const abi_roulette = require('./src/abis/rouletteContractAbi.json');

// Define the sets of numbers for each color
const redNumbers = new Set([32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3]);
const blackNumbers = new Set([15, 4, 2, 17, 6, 13, 11, 8, 10, 24, 33, 20, 31, 22, 29, 28, 35, 26]);

const app = express();
const server = https.createServer({
  key: fs.readFileSync('./localhost-key.pem'),
  cert: fs.readFileSync('./localhost.pem')
}, app);
const io = socketIo(server, {
  cors: {
    origin: "*",  // Be sure to restrict this in production!
    methods: ["GET", "POST"]
  }
});

// Roulette Contract
const infuraUrl = process.env.INFURA_URL;
const privateKey = process.env.PRIVATE_KEY_HOUSE;
const rouletteContractAddress = "0xa390Afb2bA2e7c4bFfddCB8Fb0b3d9e51a11FeD0";

// Define constants for the Flare network
const FLARE_CONTRACTS = "@flarenetwork/flare-periphery-contract-artifacts";
const FLARE_RPC = "https://coston-api.flare.network/ext/C/rpc";
const FLARE_CONTRACT_REGISTRY_ADDR = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

const web3 = new Web3(infuraUrl);
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);

const rouletteContract = new web3.eth.Contract(abi_roulette, rouletteContractAddress);

let stageZeroTimer = 100;
let secondaryTimer = 125;
let stageThreeTimer = 50;

let lastRandomNumber = null;
let stage = 0; // Stage control: 0 - Initial, 1 - Waiting for Closure, 2 - Waiting for RN, 3 - Payout and Reopen
let outcome = -1;
let globalRandomNumber = -1;
let lastRandomTimestamp = -1;
let playerCount = 0;

const fetch = require('node-fetch');
let currentEthPrice = -1;

let totalRed = 0;
let totalBlack = 0;

let lastCheckedIndex = 0;  // To track the last index of bets we checked

const mysql = require('mysql2/promise');  // Use promise-based MySQL client

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASS,
  database: 'GreenRoulette'
});

async function getUsername(address) {
  try {
    const [rows] = await pool.query('SELECT username FROM players WHERE address = ? LIMIT 1', [address]);
    if (rows.length > 0 && rows[0].username) {
      return rows[0].username;
    } else {
      return null;  // Return null if no username is found
    }
  } catch (error) {
    console.error('Error fetching username:', error);
    return null;
  }
}

const getEthPrice = async () => {
  const apiKey = process.env.CRYPTO_COMPARE_API_KEY; // Ensure you have this in your environment variables
  const url = `https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD&api_key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    currentEthPrice = data.USD;
  } catch (error) {
    console.error("Error fetching ETH price:", error);
  }
};

function emitInfo(countdown, stage) {
  io.emit('timer', {
    countdown: countdown,
    stage: stage,
    exchange: currentEthPrice,
    total_red: totalRed,
    total_black: totalBlack
  });
}

async function checkNewBets() {
  console.log("Checking for bets.");
  const bettorCount = await rouletteContract.methods.getNumberOfBets().call();
  for (let i = lastCheckedIndex; i < bettorCount; i++) {
    const bettor = await rouletteContract.methods.bettors(i).call();
    const betDetails = await rouletteContract.methods.playerBets(bettor).call();
    const ethAmount = parseFloat(web3.utils.fromWei(betDetails.amount, 'ether'));
    const guess =  Number(betDetails.guess);

    console.log(`New bet from ${bettor}: Amount ${web3.utils.fromWei(betDetails.amount, 'ether')} ETH on ${guess === 0 ? 'Red' : 'Black'}`);

    // Fetch the username from the database
    const username = await getUsername(bettor);

    const message = {
      user: bettor,
      name: username,
      betAmount: ethAmount,
      betChoice: guess,
      betExchange: currentEthPrice
    };

    // Emit the special bet message to all connected clients
    io.emit('special bet message', message);

    if (guess === 0) {
      totalRed += ethAmount;
    } else {
      totalBlack += ethAmount;
    }
    
    lastCheckedIndex++;
  }
}

async function openBetting() {
  try {
    const tx = await rouletteContract.methods.openBetting().send({ from: account.address });
    console.log('Betting opened:', tx);
    checkBettingClosed();
  } catch (error) {
    console.error('Failed to open betting:', error);
  }
}

async function payoutWinners(outcome) {
  try {
    const tx = await rouletteContract.methods.payoutWinners(outcome).send({ from: account.address });
    console.log('Winners paid out:', tx);
  } catch (error) {
    console.error('Failed to pay out winners:', error);
  }
}

async function fetchRandomNumber() {
    // 1. Import Dependencies
    const ethers = await import("ethers");
    const flare = await import(FLARE_CONTRACTS);
    const provider = new ethers.JsonRpcProvider(FLARE_RPC);
  
    // 2. Access the Contract Registry
    const flareContractRegistry = new ethers.Contract(
      FLARE_CONTRACT_REGISTRY_ADDR,
      flare.nameToAbi("FlareContractRegistry", "coston").data,
      provider
    );
  
    // 3. Retrieve the Relay Contract
    const relayAddress = await flareContractRegistry.getContractAddressByName(
      "Relay"
    );
    const relay = new ethers.Contract(
      relayAddress,
      flare.nameToAbi("IRelay", "coston").data,
      provider
    );
  
    // 4. Get the Random Number
    const [randomBigNumber, isSecure, timestamp] = await relay.getRandomNumber();
    console.log("Random Number is", randomBigNumber);
    console.log("Is it secure", isSecure);
    console.log("Creation timestamp is", timestamp);

    lastRandomTimestamp = Number(timestamp);

    if (isSecure)
      return randomBigNumber;

    return null;
}

// The function to fetch a random number and convert it to 0 or 1 based on its color
function convertRandomNumber(randomNumber) {
  // Convert the random number to 0 (red) or 1 (black)
  if (redNumbers.has(randomNumber)) {
    return 0; // Red
  } else if (blackNumbers.has(randomNumber)) {
    return 1; // Black
  } else {
    return 2;
  }
}

function waitForPlayers () {
  const countdown = setInterval(() => {
    console.log("Waiting for players...")

    if (playerCount >= 1) {
      console.log("Players detected!");
      openBetting();
      stage = 0;
      stageZeroTimer = 100;
      secondaryTimer = 125;
      outcome = -1;
      startStageZero();
      clearInterval(countdown);
      return;
    }
  }, 1000);
}


function startStageZero() {
  getEthPrice();

  totalRed = 0; // Reset totals when going back to stage 0
  totalBlack = 0;
  lastCheckedIndex = 0;

  const countdown = setInterval(() => {
    if (stageZeroTimer <= 0) {
      console.log("Stage 0 ended.");
      clearInterval(countdown);
      stage = 1;
      return;
    }

    // Fetch ETH price every 10 seconds and check new bets.
    if (stageZeroTimer % 10 === 0) {
      getEthPrice();
      checkNewBets();
    }

    console.log("Stage 0:", stageZeroTimer);
    emitInfo(stageZeroTimer, 0);
    stageZeroTimer--;
  }, 1000);
}

function checkBettingClosed() {
  console.log("Checking if betting is closing.");
  // This creates a subscription to listen for the BettingClosed event

  const bettingClosedCheck = setInterval(() => {
    rouletteContract.events.BettingClosed({
      fromBlock: 'latest'
    })
    .on('data', event => {
      console.log("Event received. Betting closes in 2 minutes!");

      // Reset and start the secondary timer upon receiving the event
      clearInterval(bettingClosedCheck);
      secondaryTimer = 125;
      startSecondaryTimer();
      return;
    })
  }, 5000);
}

function noBets() {
  let timer = 10;

  const countdown = setInterval(() => {
    console.log("No bets detected. Resetting!")

    if (playerCount >= 1 && timer <= 0) {
      waitForPlayers();
      clearInterval(countdown);
      return;
    }

    timer -=1;

    emitInfo(timer, -1);
  }, 1000);
}

function startSecondaryTimer() {
  const secondaryCountdown = setInterval(() => {
    console.log("Betting closes in:", secondaryTimer)
    if (stage == 1) {
      // Fetch ETH price every 10 seconds and check new bets.
      if (secondaryTimer % 10 === 0) {
        getEthPrice();
        checkNewBets();
      }

      if (secondaryTimer <= 0) {
        console.log("Stage is 1 and betting has closed. Fetching RN.")

        clearInterval(secondaryCountdown);
        
        if (lastCheckedIndex == 0) {
          noBets();
        } else {
          lastRandomNumber = null;
          fetchRandomNumberUntilChange();
          stage = 2;
        }

        return;
      }
      emitInfo(secondaryTimer, 1);
    }
    secondaryTimer--;
  }, 1000);
}

async function fetchRandomNumberUntilChange() {
  try {
    const currentRandomNumber = await fetchRandomNumber();
    console.log("Last random number:", lastRandomNumber)
    console.log("Current random number:", currentRandomNumber)

    if (currentRandomNumber == null || lastRandomNumber === null || lastRandomNumber == currentRandomNumber) {
      lastRandomNumber = currentRandomNumber;
      setTimeout(fetchRandomNumberUntilChange, 5000); // Fetch every 5 seconds
    } else {
      // Numbers have changed, proceed to stage 3
      prepareForPayout(Number(currentRandomNumber % BigInt(37)));
    }
  
    emitInfo(lastRandomTimestamp, 2);
  } catch (error) {
    console.error('Error fetching random number:', error);
  }
}


async function prepareForPayout(randomNumber) {
  stageThreeTimer = 50; // Reset stage three timer
  stage = 3;
  globalRandomNumber = randomNumber;
  outcome = convertRandomNumber(randomNumber);
  payoutWinners(outcome);

  const countdown = setInterval(() => {
    getEthPrice();
    if (stageThreeTimer <= 0) {
      console.log("Stage 3 ended.");
      clearInterval(countdown);

      if (playerCount >= 1) {
        stage = 0;
        stageZeroTimer = 100;
        openBetting();
        startStageZero(); // Restart stage one
        outcome = -1;
      } else {
        waitForPlayers();
      }

      return;
    }
    stageThreeTimer--;
    console.log("Stage 3:", stageThreeTimer);
    io.emit('timer', { countdown: stageThreeTimer, stage: 3, exchange: currentEthPrice, game_outcome: randomNumber, total_red: totalRed, total_black: totalBlack });
  }, 1000);
}

// Start the initial stage as soon as the server starts
waitForPlayers();
// noBets();
// payoutWinners(0);
// fetchRandomNumberUntilChange();

// Handling a new connection
io.on('connection', (socket) => {
  console.log('New client connected');
  playerCount += 1;
  
  if (stage == 0) {
    emitInfo(stageZeroTimer, 0);
  } else if (stage == 1) {
    emitInfo(secondaryTimer, 1);
  } else if (stage == 2) {
    emitInfo(lastRandomTimestamp, 2);
  } else {
    io.emit('timer', { countdown: stageThreeTimer, stage: 3, exchange: currentEthPrice, game_outcome: globalRandomNumber, total_red: totalRed, total_black: totalBlack });
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    playerCount -= 1;
  });
});

// Serve the app
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
