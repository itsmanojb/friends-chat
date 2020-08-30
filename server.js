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
    const pvtRoom = req.body.private ? true : false;
    rooms[room] = {
      users: {},
      private: pvtRoom,
      created: new Date().getTime(),
    };
    res.redirect(room);
    io.emit('room-created', room);
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
    rooms[roomId].users[socket.id] = userName;
    socket.to(roomId).broadcast.emit('user-connected', { userName, userId });

    socket.on('send-chat-message', (roomId, message) => {
      socket.to(roomId).broadcast.emit('chat-message', {
        message: message,
        name: rooms[roomId].users[socket.id],
      });
    });

    socket.on('disconnect', () => {
      getUserRooms(socket).forEach((room) => {
        socket
          .to(room)
          .broadcast.emit('user-disconnected', rooms[room].users[socket.id]);
        delete rooms[room].users[socket.id];
      });
    });
  });
});

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name);
    return names;
  }, []);
}
