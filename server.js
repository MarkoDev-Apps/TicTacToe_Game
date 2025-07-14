const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://play.markotictoegame.com/", // Replace "*" with your frontend domain if needed
    methods: ["GET", "POST"]
  }

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit('player-joined');
  });

  // ✅ Move these OUTSIDE the join handler and use roomId from data
 socket.on('make-move', ({ index, player, roomId }) => {
  console.log('server: received make-move', { index, player, roomId });
  io.to(roomId).emit('make-move', { index, player });
});

socket.on('restart-round', ({ roomId }) => {
  console.log('server: received restart-round for', roomId);
  io.to(roomId).emit('restart-round');
});

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    rooms.forEach(roomId => socket.to(roomId).emit('player-left'));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));