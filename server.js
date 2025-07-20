const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://play.markotictoegame.com", // Make sure this matches your domain
    methods: ["GET", "POST"]
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO logic
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // === SINGLE-PLAYER SUPPORT ===
  socket.on("make-move", ({ index, player }) => {
    socket.emit("make-move", { index, player });
  });

  socket.on("restart-round", () => {
    socket.emit("restart-round");
  });

  // === MULTIPLAYER SUPPORT ===
  socket.on('join-room', (roomId) => {
    const clients = io.sockets.adapter.rooms.get(roomId) || new Set();
    if (clients.size === 0) {
      socket.join(roomId);
      socket.emit('room-joined', { roomId, host: true });
    } else if (clients.size === 1) {
      socket.join(roomId);
      socket.emit('room-joined', { roomId, host: false });
      io.to(roomId).emit('start-multiplayer', { roomId });
    } else {
      socket.emit('room-full');
    }
  });

  socket.on('move-room', ({ roomId, index, player }) => {
    io.to(roomId).emit('make-move', { index, player });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
