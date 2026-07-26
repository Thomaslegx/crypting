const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// Tableau pour associer chaque pseudo à son socket ID
// Structure : { "pc": "socket_id_123", "iphone4": "socket_id_456" }
const users = {};

io.on('connection', (socket) => {
  let currentUser = null;

  // 1. Quand un utilisateur rejoint et enregistre son pseudo
  socket.on('register user', (username) => {
    if (!username) return;
    currentUser = username.trim();
    users[currentUser] = socket.id;
    console.log(`[CONNEXION] ${currentUser} connecté (ID: ${socket.id})`);
  });

  // 2. Gestion de l'envoi de message privé
  socket.on('chat message', (data) => {
    const targetUser = data.target ? data.target.trim() : null;
    const targetSocketId = users[targetUser];

    // S'assurer que l'expéditeur a bien renseigné son nom
    const sender = data.sender || currentUser;

    if (targetSocketId) {
      // Envoie le message UNIQUEMENT au destinataire ciblé
      io.to(targetSocketId).emit('chat message', {
        sender: sender,
        text: data.text,
        image: data.image
      });
      console.log(`[MSG PRIVÉ] De ${sender} vers ${targetUser}`);
    } else {
      console.log(`[ERREUR] Utilisateur non connecté : ${targetUser}`);
    }
  });

  // 3. Quand l'utilisateur se déconnecte
  socket.on('disconnect', () => {
    if (currentUser && users[currentUser]) {
      delete users[currentUser];
      console.log(`[DÉCONNEXION] ${currentUser} s'est déconnecté`);
    }
  });
});

http.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});
