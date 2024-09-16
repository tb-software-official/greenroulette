const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
      origin: "*", // Be sure to restrict this in production!
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
