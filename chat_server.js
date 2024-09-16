const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const https = require('https');
const fs = require('fs');
const app = express();
const server = https.createServer({
  key: fs.readFileSync('/etc/letsencrypt/live/greenroulette.io/privkey.pem'), // Path to your private key
  cert: fs.readFileSync('/etc/letsencrypt/live/greenroulette.io/fullchain.pem'), // Path to your full chain certificate
}, app);

const io = socketIo(server, {
  cors: {
    origin: "https://greenroulette.io",  // Update to your domain
    methods: ["GET", "POST"]
  }
});
const xss = require('xss');

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Keep track of the number of connected users
let onlineUsers = 0;

io.on('connection', (socket) => {
  onlineUsers++;
  console.log('A user connected', `Total online: ${onlineUsers}`);

  // Emit the updated online users count to all clients
  io.emit('onlineUsers', onlineUsers);

  socket.on('send message', (address, username, betChoice, betAmount, msg, isPartner) => {
    const safeMessage = xss(msg);
    io.emit('message', { 
      user: address, 
      name: username,
      text: safeMessage, 
      betChoice: betChoice, 
      betAmount: betAmount,
      isPartner: isPartner
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    onlineUsers--;

    // Emit the updated online users count to all clients
    io.emit('onlineUsers', onlineUsers);
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
