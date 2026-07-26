const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');

// On augmente maxHttpBufferSize à 10 Mo (1e7 octets)
const io = require('socket.io')(http, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e7
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
