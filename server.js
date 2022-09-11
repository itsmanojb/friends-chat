const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const hri = require('human-readable-ids').hri;
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true,
});


app.use('/peerjs', peerServer);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.locals.baseURL = "http://localhost:3000/"
const rooms = {};

app.get('/', (req, res) => {
  res.render('index', { msg: '' });
});

app.post('/', (req, res) => {
  if (req.body.room) {
    if (rooms[req.body.room] != null) {
      return res.redirect(`join/${req.body.room}`);
    }
    res.render('index', { msg: 'not-found' });
  } else {
    const room = hri.random();
    rooms[room] = {
      users: {},
      created: new Date().getTime(),
    };
    res.redirect(`create/${room}`);
  }
});

app.get('/create/:roomId', (req, res) => {
  if (rooms[req.params.roomId] == null) {
    return res.redirect('/');
  }
  res.render('join', {
    roomId: req.params.roomId,
    users: 0,
    mode: 'creator',
    msg: ''
  });
});

app.get('/join/:roomId', (req, res) => {
  if (rooms[req.params.roomId] == null) {
    return res.redirect('/');
  }
  res.render('join', {
    roomId: req.params.roomId,
    users: Object.keys(rooms[req.params.roomId].users || {}).length || 0,
    mode: 'guest',
    msg: ''
  });
});

app.post('/join/:roomId', (req, res) => {
  if (rooms[req.params.roomId] == null) {
    return res.redirect('/');
  }
  if (req.body.name) {
    return res.redirect(`/${req.params.roomId}`);
  }
  res.render('join', {
    roomId: req.params.roomId,
    users: Object.keys(rooms[req.params.roomId].users || {}).length || 0,
    mode: 'guest',
    msg: 'Not allowed'
  });
});

app.get('/:room', (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect('/');
  }
  res.render('room', { roomId: req.params.room });
});

io.on('connection', (socket) => {

  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);

    if (!rooms[roomId]) return;

    if (Object.keys(rooms[roomId].users).length === 0) {
      rooms[roomId].initiator = userId;
    }
    rooms[roomId].users[userId] = userName;
    socket.to(roomId).broadcast.emit('user-connected', {
      userId,
      userName,
      users: rooms[roomId].users,
    });

    socket.on('user-check', (roomId) => {
      socket.to(roomId).emit('attendance', { users: rooms[roomId].users });
    });

    socket.on('send-chat-message', (roomId, message) => {
      socket.to(roomId).emit('chat-message', {
        message,
        name: rooms[roomId].users[userId],
        msgTime: new Date().getTime(),
      });
    });

    socket.on('disconnect', () => {
      if (!rooms[roomId]) return;
      const name = rooms[roomId].users[userId];
      const isHost = rooms[roomId].initiator === userId ? true : false;
      if (isHost) {
        socket.to(roomId).broadcast.emit('ended');
        delete rooms[roomId];
      } else {
        socket.to(roomId).broadcast.emit('user-disconnected', {
          userId,
          name,
          users: rooms[roomId].users,
        });
        delete rooms[roomId].users[userId];
      }
    });
  });
});

server.listen(process.env.PORT || 3000);