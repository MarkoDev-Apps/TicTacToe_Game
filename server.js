const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

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

  socket.on('join', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit('player-joined');
  });

  // ✅ Listen for moves
  socket.on('make-move', ({ index, player, roomId }) => {
    console.log('server: received make-move', { index, player, roomId });
    io.to(roomId).emit('make-move', { index, player });
  });

  // ✅ Listen for restart
  socket.on('restart-round', ({ roomId }) => {
    console.log('server: received restart-round for', roomId);
    io.to(roomId).emit('restart-round');
  });

  // ✅ Notify others when a player disconnects
  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    rooms.forEach(roomId => socket.to(roomId).emit('player-left'));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
