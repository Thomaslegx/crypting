const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

// Indique à Express de servir le dossier "public"
app.use(express.static(path.join(__dirname, 'public')));

// Renvoie automatiquement public/index.html quand on accède à l'accueil
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestion de la connexion Socket.IO
io.on('connection', function(socket) {
  console.log('Un utilisateur s est connecte');

  socket.on('chat message', function(data) {
    io.emit('chat message', data);
  });
});

var PORT = process.env.PORT || 3000;
http.listen(PORT, function() {
  console.log('Serveur lance sur le port ' + PORT);
});
