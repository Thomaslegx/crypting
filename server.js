const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

// Servir les fichiers situés dans le dossier "public"
app.use(express.static('public'));

// Gestion de la connexion Socket.IO
io.on('connection', function(socket) {
  console.log('Un utilisateur s est connecte');

  socket.on('chat message', function(data) {
    // Transmet le message et l'expéditeur à tout le monde
    io.emit('chat message', data);
  });
});

// Render attribue dynamiquement le port via la variable d'environnement PORT
var PORT = process.env.PORT || 3000;
http.listen(PORT, function() {
  console.log('Serveur lance sur le port ' + PORT);
});