const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const rooms = {};
const roomPlayers = {};

const app = express(); // ✅ Make sure this line comes first
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "play.markotictoegame.com", // Replace with your actual frontend domain
    methods: ["GET", "POST"]
  }
});

// ✅ Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room: ${roomId}`);

    if (!roomPlayers[roomId]) roomPlayers[roomId] = [];

    // Prevent duplicates
    if (!roomPlayers[roomId].includes(socket.id)) {
      roomPlayers[roomId].push(socket.id);
    }

    // Let the joining client know join was successful
    socket.emit('join-success');
  });

  socket.on('player-ready', ({ roomId, name }) => {
    socket.name = name;

    // Store name under socket ID
    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] = name;

    // If both players are now ready
    if (Object.keys(rooms[roomId]).length === 2) {
      const otherId = Object.keys(rooms[roomId]).find(id => id !== socket.id);
      const otherName = rooms[roomId][otherId];

      // Send name to the other player
      io.to(otherId).emit('both-ready', { p2name: name });
      io.to(socket.id).emit('both-ready', { p2name: otherName });
    }
  });

  socket.on('make-move', ({ index, player, roomId }) => {
    console.log('server: received make-move', { index, player, roomId });
    io.to(roomId).emit('make-move', { index, player });
  });

  socket.on('restart-round', ({ roomId }) => {
    console.log('server: received restart-round for', roomId);
    io.to(roomId).emit('restart-round');
  });

  socket.on('disconnecting', () => {
    Object.keys(socket.rooms)
      .filter(r => r !== socket.id)
      .forEach(roomId => {
        io.to(roomId).emit('player-left');
        delete rooms[roomId]?.[socket.id];
        roomPlayers[roomId] = roomPlayers[roomId]?.filter(id => id !== socket.id);
      });
  });
});

const PORT = process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Server running on port ${PORT}`));