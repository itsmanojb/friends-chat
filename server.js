const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
const { v4: uuidV4 } = require('uuid');

app.use('/peerjs', peerServer);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const rooms = {};

app.get('/', (req, res) => {
  res.render('index', { msg: '' });
});

app.post('/', (req, res) => {
  if (req.body.room) {
    if (rooms[req.body.room] != null) {
      return res.redirect(req.body.room);
    }
    res.render('index', { msg: 'not-found' });
  } else {
    const room = uuidV4();
    rooms[room] = {
      users: {},
      created: new Date().getTime(),
    };
    // io.emit('room-created', room);
    res.redirect(room);
  }
});

app.get('/:room', (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect('/');
  }
  res.render('room', { roomId: req.params.room });
});

server.listen(process.env.PORT || 3030);

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);

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
      });
    });

    socket.on('disconnect', () => {
      const name = rooms[roomId].users[userId];
      socket.to(roomId).broadcast.emit('user-disconnected', {
        userId,
        name,
        admin: rooms[roomId].initiator === userId ? true : false,
        users: rooms[roomId].users,
      });
      delete rooms[roomId].users[userId];
    });
  });
});

// io.on('connection', (socket) => {
//   socket.on('join-room', (roomId, userId, userName) => {
//     socket.join(roomId);
//     rooms[roomId].users[socket.id] = userName;
//     socket.to(roomId).broadcast.emit('user-connected', {
//       userName,
//       userId,
//       users: rooms[roomId].users,
//       id: socket.id,
//     });

//     socket.on('send-chat-message', (roomId, message) => {
//       socket.to(roomId).broadcast.emit('chat-message', {
//         message: message,
//         name: rooms[roomId].users[socket.id],
//       });
//     });

//     socket.on('disconnect', () => {
//       getUserRooms(socket).forEach((room) => {
//         const name = rooms[room].users[socket.id];
//         const id = socket.id;
//         delete rooms[room].users[socket.id];

//         socket.to(room).broadcast.emit('user-disconnected', {
//           name,
//           id,
//           users: rooms[roomId].users,
//         });
//       });
//     });
//   });
// });

// function getUserRooms(socket) {
//   return Object.entries(rooms).reduce((names, [name, room]) => {
//     if (room.users[socket.id] != null) names.push(name);
//     return names;
//   }, []);
// }
