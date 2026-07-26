const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté');

  socket.on('register user', (username) => {
    socket.username = username;
  });

  socket.on('chat message', (data) => {
    socket.broadcast.emit('chat message', data);
  });

  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
