const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const users = new Map();

io.on('connection', (socket) => {
  console.log('Utilisateur connecté :', socket.id);

  socket.on('register user', (username) => {
    if (username) {
      const cleanName = username.trim().toLowerCase();
      users.set(cleanName, socket.id);
      socket.username = cleanName;
    }
  });

  socket.on('chat message', (data) => {
    socket.broadcast.emit('chat message', data);
  });

  // Signalisation WebRTC pour les appels
  socket.on('call-user', (data) => {
    const targetId = users.get(data.target.toLowerCase());
    if (targetId) {
      io.to(targetId).emit('incoming-call', { from: socket.username, offer: data.offer });
    }
  });

  socket.on('answer-call', (data) => {
    const targetId = users.get(data.target.toLowerCase());
    if (targetId) {
      io.to(targetId).emit('call-answered', { answer: data.answer });
    }
  });

  socket.on('ice-candidate', (data) => {
    const targetId = users.get(data.target.toLowerCase());
    if (targetId) {
      io.to(targetId).emit('ice-candidate', { candidate: data.candidate });
    }
  });

  socket.on('end-call', (data) => {
    const targetId = users.get(data.target.toLowerCase());
    if (targetId) {
      io.to(targetId).emit('call-ended');
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      users.delete(socket.username);
    }
    console.log('Utilisateur déconnecté');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
