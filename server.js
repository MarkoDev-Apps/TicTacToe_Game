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

// track rooms and names
const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', roomId => {
    socket.join(roomId);
    console.log(`${socket.id} joined ${roomId}`);
    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] = true;
    if (Object.keys(rooms[roomId]).length === 2) {
      io.to(roomId).emit('both-joined');
    }
  });

   socket.on('await-player',roomId=>{
    socket.join(roomId);
  });

  socket.on('provide-name',({name, roomId})=>{
    io.to(roomId).emit('player-2-joined', name);
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
   socket.on('disconnecting',()=>{
    Object.keys(socket.rooms)
      .filter(r=>r!==socket.id)
      .forEach(roomId=>io.to(roomId).emit('player-left'));
  });
});

const PORT = process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Server running on port ${PORT}`));