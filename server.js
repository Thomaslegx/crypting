<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();

  // Demander le pseudo s'il n'existe pas
  let myUsername = localStorage.getItem('chat_username');
  while (!myUsername || !myUsername.trim()) {
    myUsername = prompt("Entre ton pseudo :");
  }
  myUsername = myUsername.trim();
  localStorage.setItem('chat_username', myUsername);

  // Enregistrer l'utilisateur auprès du serveur
  socket.emit('register user', myUsername);

  // Gestion de l'envoi de message
  const sendMessage = () => {
    const input = document.getElementById('input-message');
    const text = input.value.trim();

    if (text) {
      // Afficher son propre message localement
      appendMessage('Me', text, 'me');

      // Envoyer au serveur
      socket.emit('chat message', { sender: myUsername, text: text });

      input.value = '';
    }
  };

  // Écouter la touche Entrée
  document.getElementById('input-message').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // Recevoir un message du serveur
  socket.on('chat message', (data) => {
    appendMessage(data.sender, data.text, 'other');
  });

  // Fonction utilitaire pour ajouter un message dans le conteneur HTML
  const appendMessage = (sender, text, type) => {
    const container = document.getElementById('messages-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `message-item ${type}`;
    div.innerHTML = `<div class="bubble"><b>${sender}:</b> ${text}</div>`;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  };
</script>
