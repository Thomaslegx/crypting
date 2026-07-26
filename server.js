<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();
  let currentFriend = null;

  const getStoredData = (key, fallback) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  };

  const setStoredData = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  let myUsername = localStorage.getItem('crypting_username');
  while (!myUsername || !myUsername.trim()) {
    myUsername = prompt("Entre ton pseudo (ex: iphone16, pc) :");
  }
  myUsername = myUsername.trim().toLowerCase();
  localStorage.setItem('crypting_username', myUsername);

  socket.emit('register user', myUsername);

  let friends = getStoredData('crypting_friends', []);
  let chats = getStoredData('crypting_chats', {});

  const openSettings = () => {
    document.getElementById('my-username-display').textContent = `Mon pseudo : ${myUsername}`;
    document.getElementById('settings-modal').style.display = 'flex';
  };

  const closeSettings = () => {
    document.getElementById('settings-modal').style.display = 'none';
  };

  const clearBrowserCache = () => {
    if (confirm("Effacer les contacts et discussions ?")) {
      localStorage.clear();
      location.reload();
    }
  };

  const renderFriendsList = () => {
    const listEl = document.getElementById('friends-list');
    listEl.innerHTML = '';

    if (friends.length === 0) {
      listEl.innerHTML = '<div class="empty-state">Aucun ami.<br>Clique sur <b>"+ Ajouter"</b> pour démarrer.</div>';
      return;
    }

    friends.forEach(friendName => {
      const li = document.createElement('li');
      li.className = 'friend-item';

      const friendMsgs = chats[friendName] || [];
      // Correction compatible 100% navigateurs modernes
      const lastMsg = friendMsgs.length > 0 ? friendMsgs[friendMsgs.length - 1] : null;
      const lastText = lastMsg ? (lastMsg.image ? '📷 Snap' : lastMsg.text) : 'Nouvelle discussion';

      li.innerHTML = `
        <div class="avatar">${friendName.charAt(0).toUpperCase()}</div>
        <div class="friend-info">
          <div class="friend-name">${friendName}</div>
          <div class="last-message">${lastText}</div>
        </div>`;

      li.onclick = () => openChat(friendName);
      listEl.appendChild(li);
    });
  };

  const addFriend = () => {
    const name = prompt("Pseudo exact du contact :");
    if (name) {
      const cleanName = name.trim().toLowerCase();
      if (cleanName && cleanName !== myUsername) {
        if (!friends.includes(cleanName)) {
          friends.push(cleanName);
          setStoredData('crypting_friends', friends);
        }
        openChat(cleanName);
      }
    }
  };

  const openChat = (friendName) => {
    currentFriend = friendName;
    document.getElementById('active-user-title').textContent = currentFriend;
    document.getElementById('btn-start-call').style.display = 'inline-block';
    document.body.classList.add('in-chat');
    renderMessages();
  };

  const closeChat = () => {
    document.body.classList.remove('in-chat');
    currentFriend = null;
    document.getElementById('active-user-title').textContent = 'Sélectionne une discussion';
    document.getElementById('btn-start-call').style.display = 'none';
    renderFriendsList();
  };

  const renderMessages = () => {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';

    if (!currentFriend) return;

    const msgs = chats[currentFriend] || [];

    msgs.forEach(msg => {
      const div = document.createElement('div');
      div.className = `message-item ${msg.sender === 'me' ? 'me' : 'other'}`;

      if (msg.text) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.textContent = msg.text;
        div.appendChild(bubble);
      }

      if (msg.image) {
        const img = document.createElement('img');
        img.src = msg.image;
        img.className = 'chat-img';
        div.appendChild(img);
      }

      container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
  };

  document.getElementById('input-message').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      triggerSend();
    }
  });

  const triggerSend = () => {
    const input = document.getElementById('input-message');
    const val = input.value.trim();

    if (val) {
      sendMessage(val, null);
      input.value = '';
    }
  };

  const sendMessage = (text, image) => {
    if (!currentFriend) {
      alert("Sélectionne une discussion d'abord !");
      return;
    }
    if (!chats[currentFriend]) chats[currentFriend] = [];

    chats[currentFriend].push({
      sender: 'me',
      text,
      image,
      timestamp: Date.now()
    });

    setStoredData('crypting_chats', chats);

    socket.emit('chat message', {
      sender: myUsername,
      target: currentFriend,
      text: text ? String(text) : null,
      image: image ? String(image) : null
    });

    renderMessages();
    renderFriendsList();
  };

  // WEBRTC (APPELS AUDIO)
  let peerConnection = null;
  let localStream = null;
  let incomingOffer = null;
  let callingFriend = null;
  let iceCandidatesQueue = [];

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const unlockAudio = () => {
    const remoteAudio = document.getElementById('remote-audio');
    remoteAudio.play().catch(() => {});
  };

  const createPeerConnection = () => {
    peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.ontrack = (event) => {
      const remoteAudio = document.getElementById('remote-audio');
      if (event.streams && event.streams[0]) {
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play().catch(() => {});
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && callingFriend) {
        socket.emit('ice-candidate', { target: callingFriend, candidate: event.candidate });
      }
    };
  };

  const processIceCandidates = async () => {
    while (iceCandidatesQueue.length > 0) {
      const cand = iceCandidatesQueue.shift();
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {}
    }
  };

  const startCall = async () => {
    if (!currentFriend) {
      alert("Sélectionne un ami à appeler.");
      return;
    }
    unlockAudio();
    callingFriend = currentFriend;
    document.getElementById('call-bar').style.display = 'block';
    document.getElementById('call-status-text').textContent = `Appel de ${callingFriend}...`;
    document.getElementById('btn-accept-call').style.display = 'none';

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      createPeerConnection();

      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('call-user', { target: callingFriend, offer: peerConnection.localDescription });
    } catch (err) {
      alert(`Erreur accès micro : ${err.message}`);
      endCall();
    }
  };

  socket.on('incoming-call', (data) => {
    callingFriend = data.from.toLowerCase();
    incomingOffer = data.offer;

    if (!currentFriend || currentFriend !== callingFriend) {
      openChat(callingFriend);
    }

    document.getElementById('call-bar').style.display = 'block';
    document.getElementById('call-status-text').textContent = `📞 Appel entrant de ${callingFriend}`;
    document.getElementById('btn-accept-call').style.display = 'inline-block';
  });

  const acceptCall = async () => {
    unlockAudio();
    document.getElementById('btn-accept-call').style.display = 'none';
    document.getElementById('call-status-text').textContent = `En ligne avec ${callingFriend}`;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      createPeerConnection();

      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      await processIceCandidates();

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer-call', { target: callingFriend, answer: peerConnection.localDescription });
    } catch (err) {
      alert(`Erreur accès micro : ${err.message}`);
      endCall();
    }
  };

  socket.on('call-answered', async (data) => {
    document.getElementById('call-status-text').textContent = `En ligne avec ${callingFriend}`;
    if (peerConnection && data.answer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      await processIceCandidates();
    }
  });

  socket.on('ice-candidate', async (data) => {
    if (data.candidate) {
      if (peerConnection && peerConnection.remoteDescription) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {}
      } else {
        iceCandidatesQueue.push(data.candidate);
      }
    }
  });

  socket.on('call-ended', () => {
    closeCallBar();
  });

  const endCall = () => {
    if (callingFriend) {
      socket.emit('end-call', { target: callingFriend });
    }
    closeCallBar();
  };

  const closeCallBar = () => {
    document.getElementById('call-bar').style.display = 'none';
    iceCandidatesQueue = [];
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    callingFriend = null;
  };

  socket.on('chat message', (data) => {
    const sender = data.sender.toLowerCase();
    if (!sender) return;

    if (!friends.includes(sender)) {
      friends.push(sender);
      setStoredData('crypting_friends', friends);
    }

    if (!chats[sender]) chats[sender] = [];

    chats[sender].push({
      sender: 'other',
      text: data.text,
      image: data.image,
      timestamp: Date.now()
    });

    setStoredData('crypting_chats', chats);

    if (currentFriend === sender) {
      renderMessages();
    }
    renderFriendsList();
  });

  socket.on('connect', () => {
    if (myUsername) {
      socket.emit('register user', myUsername);
    }
  });

  // GESTION DES IMAGES ET CAMÉRA
  document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxDim = 800; 
          let w = img.width, h = img.height;

          if (w > h && w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
          else if (h > maxDim) { w = Math.round(w * (maxDim / h)); h = maxDim; }

          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);

          sendMessage(null, canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  let mediaStream = null;
  const openCamera = async () => {
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        document.getElementById('video-preview').srcObject = mediaStream;
        document.getElementById('camera-modal').style.display = 'flex';
      } catch (err) {
        alert("Caméra indisponible ou permissions refusées.");
      }
    } else {
      alert("Utilise l'icône dossier 📁 pour sélectionner une photo.");
    }
  };

  const closeCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    document.getElementById('camera-modal').style.display = 'none';
  };

  const takeSnap = () => {
    const video = document.getElementById('video-preview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    sendMessage(null, canvas.toDataURL('image/jpeg', 0.7));
    closeCamera();
  };

  renderFriendsList();
</script>
