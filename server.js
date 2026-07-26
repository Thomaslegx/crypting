const express = require('express');
const app = express();
const http = require('http').createServer(app);
// Augmentation de la taille de buffer pour supporter les Snaps/images depuis iOS 7
const io = require('socket.io')(http, {
  maxHttpBufferSize: 1e7 // 10 MB
});

app.use(express.static('public'));

// Association pseudo -> socket.id
var users = {};

io.on('connection', function(socket) {
  var currentUser = null;

  // 1. Enregistrement du pseudo
  socket.on('register user', function(username) {
    if (!username) return;
    currentUser = String(username).trim();
    users[currentUser] = socket.id;
    console.log('[CONNEXION] ' + currentUser + ' (ID: ' + socket.id + ')');
  });

  // 2. Transmissions de messages 1-à-1 ciblé
  socket.on('chat message', function(data) {
    if (!data) return;
    
    var targetUser = data.target ? String(data.target).trim() : null;
    var sender = data.sender ? String(data.sender).trim() : currentUser;
    var targetSocketId = users[targetUser];

    if (targetSocketId) {
      // Transmission exclusive au destinataire
      io.to(targetSocketId).emit('chat message', {
        sender: sender,
        text: data.text ? String(data.text) : null,
        image: data.image ? String(data.image) : null
      });
      console.log('[MSG PRIVÉ] De ' + sender + ' vers ' + targetUser);
    } else {
      console.log('[ATTENTION] Destinataire non trouvé ou déconnecté : ' + targetUser);
    }
  });

  // 3. Déconnexion
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
