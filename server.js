const express = require('express');
const app = express();
const http = require('http').createServer(app);

const io = require('socket.io')(http, {
  maxHttpBufferSize: 1e7
});

app.use(express.static('public'));

var users = {};

io.on('connection', function(socket) {
  var currentUser = null;

  socket.on('register user', function(username) {
    if (!username) return;
    currentUser = String(username).trim().toLowerCase();
    users[currentUser] = socket.id;
    console.log('[CONNEXION] ' + currentUser + ' (ID: ' + socket.id + ')');
  });

  /* --- CHAT MESSAGES --- */
  socket.on('chat message', function(data) {
    if (!data) return;
    
    var targetUser = data.target ? String(data.target).trim().toLowerCase() : null;
    var sender = data.sender ? String(data.sender).trim().toLowerCase() : currentUser;
    var targetSocketId = users[targetUser];

    if (targetSocketId) {
      io.to(targetSocketId).emit('chat message', {
        sender: sender,
        text: data.text ? String(data.text) : null,
        image: data.image ? String(data.image) : null
      });
    }
  });

  /* --- SIGNALISATION WEBRTC --- */
  socket.on('call-user', function(data) {
    var target = data.target ? String(data.target).trim().toLowerCase() : null;
    var targetSocketId = users[target];
    
    console.log('[APPEL] ' + currentUser + ' -> ' + target);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', {
        from: currentUser,
        offer: data.offer
      });
    }
  });

  socket.on('answer-call', function(data) {
    var target = data.target ? String(data.target).trim().toLowerCase() : null;
    var targetSocketId = users[target];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-answered', {
        answer: data.answer
      });
    }
  });

  socket.on('ice-candidate', function(data) {
    var target = data.target ? String(data.target).trim().toLowerCase() : null;
    var targetSocketId = users[target];
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', {
        candidate: data.candidate
      });
    }
  });

  socket.on('end-call', function(data) {
    var target = data.target ? String(data.target).trim().toLowerCase() : null;
    var targetSocketId = users[target];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended');
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
