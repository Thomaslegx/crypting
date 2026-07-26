const express = require('express');
const app = express();
const http = require('http').createServer(app);

// Limite augmentée (10 Mo) pour envoyer les données audio sans coupure
const io = require('socket.io')(http, {
  maxHttpBufferSize: 1e7
});

app.use(express.static('public'));

var users = {};

io.on('connection', function(socket) {
  var currentUser = null;

  socket.on('register user', function(username) {
    if (!username) return;
    currentUser = String(username).trim();
    users[currentUser] = socket.id;
    console.log('[CONNEXION] ' + currentUser + ' (ID: ' + socket.id + ')');
  });

  socket.on('chat message', function(data) {
    if (!data) return;
    
    var targetUser = data.target ? String(data.target).trim() : null;
    var sender = data.sender ? String(data.sender).trim() : currentUser;
    var targetSocketId = users[targetUser];

    if (targetSocketId) {
      io.to(targetSocketId).emit('chat message', {
        sender: sender,
        text: data.text ? String(data.text) : null,
        image: data.image ? String(data.image) : null,
        audio: data.audio ? String(data.audio) : null // Support de l'audio
      });
      console.log('[MSG PRIVÉ] De ' + sender + ' vers ' + targetUser);
    } else {
      console.log('[ATTENTION] Destinataire non disponible : ' + targetUser);
    }
  });

  socket.on('disconnect', function() {
    if (currentUser && users[currentUser]) {
      delete users[currentUser];
      console.log('[DÉCONNEXION] ' + currentUser);
    }
  });
});

http.listen(3000, function() {
  console.log('Serveur Crypting démarré sur le port 3000');
});
