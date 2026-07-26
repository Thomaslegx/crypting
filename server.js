const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

// Sert les fichiers statiques directement depuis le dossier racine
app.use(express.static(__dirname));

// Envoie index.html quand on arrive sur le site
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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
