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

const rooms = {}; // Track board + turn + game state per room

// Socket.IO logic
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  // ~~~ SINGLE-PLAYER SUPPORT ~~~
  socket.on('make-move', ({ index, player }) => {
    socket.emit('make-move', { index, player });
  });

  socket.on('restart-round', () => {
    socket.emit('restart-round');
  });
  // ~~~ MULTIPLAYER SUPPORT ~~~
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

    socket.on("match-won", ({ winnerName, roomId }) => {
    io.to(roomId).emit("match-won", { winnerName });
    });

  socket.on('move-room', ({ roomId, index, player }) => {
    // Broadcast the move to everyone in the same room
     io.to(roomId).emit("make-move", { index, player });
  });

  socket.on('restart-room', ({ roomId }) => {
    io.to(roomId).emit('restart-round');
  });

  socket.on('game-over-room', ({ roomId, result }) => {
    io.to(roomId).emit('game-over', { result });
  });

  const rooms = {}; // Format: { roomId: { players: [{ id, name }] } }
    socket.on("set-name", ({ name, roomId }) => {
     if (!rooms[roomId]) {
    rooms[roomId] = { players: [] };
  }
  // Avoid duplicates
  if (!rooms[roomId].players.some(p => p.id === socket.id)) {
    rooms[roomId].players.push({ id: socket.id, name });
  }
  // When 2 players are in the room, emit names with assigned roles
  if (rooms[roomId].players.length === 2) {
    const [playerX, playerO] = rooms[roomId].players;
    io.to(roomId).emit("assign-roles", {
      X: playerX.name,
      O: playerO.name
         });
       }
    });

    socket.on("disconnect", () => {
    for (const [roomId, room] of Object.entries(rooms)) {
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) {
      delete rooms[roomId]; // Clean up empty rooms
        }
      }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
