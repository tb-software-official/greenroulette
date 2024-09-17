const https = require('https');
const fs = require('fs');
const express = require('express');
const socketIo = require('socket.io');

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

let stageOneTimer = 20;
let secondaryTimer = 30;
let stageThreeTimer = 50;

let lastRandomNumber = null;
let stage = 1; // Stage control: 0 - Initial, 1 - Waiting for Closure, 2 - Waiting for RN, 3 - Payout and Reopen
let outcome = -1;
let globalRandomNumber = -1;

function startStageOne() {
  const countdown = setInterval(() => {
    if (stageOneTimer <= 0) {
      console.log("Stage 0 ended.");
      clearInterval(countdown);
      stage = 1;
      return;
    }
    stageOneTimer--;
    console.log("Stage 0:", stageOneTimer);
    io.emit('timer', { countdown: stageOneTimer, stage: 0 });
  }, 1000);
}

function checkBettingClosed() {
  console.log("Checking if betting is closing.");
  // This creates a subscription to listen for the BettingClosed event

  const bettingClosedCheck = setInterval(() => {
    console.log("Betting closed!")
    // Reset and start the secondary timer upon receiving the event
    clearInterval(bettingClosedCheck);
    secondaryTimer = 30;
    startSecondaryTimer();
    return;
  }, 5000);
}

function startSecondaryTimer() {
  const secondaryCountdown = setInterval(() => {
    if (stage == 1) {
      if (secondaryTimer <= 0) {
        console.log("Stage is 1 and betting has closed. Fetching RN.")
        clearInterval(secondaryCountdown);
        lastRandomNumber = null;
        fetchRandomNumberUntilChange();
        stage = 2;
        return;
      }
      console.log("Stage 1:", secondaryTimer);
      io.emit('timer', { countdown: secondaryTimer, stage: 1 });
    }
    secondaryTimer--;
  }, 1000);
}

async function fetchRandomNumberUntilChange() {
  try {
    const currentRandomNumber = await fetchRandomNumber();
    console.log("Last random number:", lastRandomNumber)
    console.log("Current random number:", currentRandomNumber)
    if (lastRandomNumber === null || lastRandomNumber == currentRandomNumber) {
      lastRandomNumber = currentRandomNumber;
      setTimeout(fetchRandomNumberUntilChange, 5000); // Fetch every 5 seconds
    } else {
      // Numbers have changed, proceed to stage 3
      prepareForPayout(currentRandomNumber);
    }
    io.emit('timer', { countdown: 0, stage: 2 });
  } catch (error) {
    console.error('Error fetching random number:', error);
  }
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

async function prepareForPayout(randomNumber) {
  stageThreeTimer = 50;
  stage = 3;
  randomNumber = await fetchRandomNumber();
  globalRandomNumber = randomNumber;
  outcome = convertRandomNumber(randomNumber);

  const countdown = setInterval(() => {
    if (stageThreeTimer <= 0) {
      console.log("Stage 3 ended.");
      clearInterval(countdown);
      stage = 0;
      stageOneTimer = 30;
      checkBettingClosed();
      startStageOne(); // Restart stage one
      outcome = -1;
      return;
    }
    stageThreeTimer--;
    console.log("Stage 3:", stageThreeTimer);
    io.emit('timer', { countdown: stageThreeTimer, stage: 3, game_outcome: randomNumber });
  }, 1000);
}

async function fetchRandomNumber() {
  const randomNumber = Math.floor(Math.random() * 37); 
  return randomNumber;
}

// Start the initial stage as soon as the server starts
// startStageOne();
// checkBettingClosed();
// prepareForPayout(0);
prepareForPayout(1);

// Handling a new connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  if (stage == 0) {
    io.emit('timer', { countdown: stageOneTimer, stage: 0 });
  } else if (stage == 1) {
    io.emit('timer', { countdown: secondaryTimer, stage: 1 });
  } else if (stage == 2) {
    io.emit('timer', { countdown: -1, stage: 2 });
  } else {
    io.emit('timer', { countdown: stageThreeTimer, stage: 3, game_outcome: globalRandomNumber });
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Serve the app
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
