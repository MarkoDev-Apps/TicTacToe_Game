 // server.js
 const express = require('express');
 const http = require('http');
 const { Server } = require('socket.io');
 const path = require('path');

 const app = express();
 const server = http.createServer(app);
 const io = new Server(server, {
   cors: {
     origin: "https://play.markotictoegame.com",
     methods: ["GET", "POST"]
   }
 });

 // Serve static files from public directory
 app.use(express.static(path.join(__dirname, 'public')));

//const rooms = {}; // Track board + turn + game state per room
const rooms = {}; // { [roomId]: { players: [{ id, name }] } }

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

   // Chat: relay messages to everyone in the room
socket.on("chat-message", ({ roomId, from, text }) => {
  if (!roomId || !text) return;
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room || !room.has(socket.id)) return; // not in this room
  // (optional) hard cap length
  const safe = String(text).slice(0, 300);
  io.to(roomId).emit("chat-message", {
    from: String(from || "Player"),
    text: safe,
    ts: Date.now(),
  });
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

  //const rooms = {}; // Format: { roomId: { players: [{ id, name }] } }
  //socket.on("set-name", ({ name, roomId }) => {
 // Share ONE rooms map across sockets
  socket.on("set-name", ({ name, roomId }) => {
     if (!rooms[roomId]) {
       rooms[roomId] = { players: [] };
     }

     const players = rooms[roomId].players;

  // Avoid duplicates
  if (!players.some(p => p.id === socket.id)) {
    players.push({ id: socket.id, name });
  }

  // Only assign roles when two players have registered
  if (players.length === 2) {
    io.to(roomId).emit("assign-roles", {
      X: { id: players[0].id, name: players[0].name },
      O: { id: players[1].id, name: players[1].name },
    });
  }
});
     // Avoid duplicates
     // When 2 players are in the room, emit names with assigned roles
    // if (rooms[roomId].players.length === 2) {
    //  const [playerX, playerO] = rooms[roomId].players;
    //  io.to(roomId).emit("assign-roles", {
    //    X: playerX.name,
    //    O: playerO.name
    //  });

 // socket.on("disconnect", () => {
  //  for (const [roomId, room] of Object.entries(rooms)) {
  //    room.players = room.players.filter(p => p.id !== socket.id);
   //   if (room.players.length === 0) {
    //    delete rooms[roomId]; // Clean up empty rooms
    //  }
   // }
 // });
  socket.on("disconnect", () => {
    for (const [roomId, room] of Object.entries(rooms)) {
     room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) {
        delete rooms[roomId]; // Clean up empty rooms
      } else {
        io.to(roomId).emit("opponent-left"); // optional UX
      }
    }
  });
 });

 const PORT = process.env.PORT || 3000;
 server.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
 });
