var express = require("express");
const app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(express.static("build"));
let port = 8081;
http.listen(port, function() {
  console.log("Port is:" + port);
});

class Player {
  constructor(name) {
    this.name = name;
    this.voters = [];
  }
}

class HistoryElement {
  constructor(string) {
    this.string = string;
    this.time = Date().slice(16, 21);
  }
}

players = [];
history = [];
deadline = "";

io.on("connection", function(socket) {
  broadcastUpdate = () => {
    io.emit("updatePlayers", players);
    io.emit("updateHistory", history);
  };
  socket.name = undefined;
  socket.emit("updatePlayers", players);
  socket.emit("updateHistory", history);
  socket.on("addPlayer", function(name) {
    if (players.filter(elem => elem.name == name).length == 0) {
      players.push(new Player(name));
      io.emit("updatePlayers", players);
    }
    socket.name = name;
  });
  socket.on("vote", function(name) {
    if (socket.name != undefined) {
      let target = players.find(elem => elem.name == name);
      if (target) {
        //current voter is not already voting for the target
        if (target.voters.find(elem => elem == socket.name) == undefined) {
          //remove current voter from all other targets
          for (let player of players) {
            player.voters = player.voters.filter(elem => elem != socket.name);
          }
          target.voters.push(socket.name);
          //add this to history]
          history.push(
            new HistoryElement(`${socket.name} has voted for ${target.name}`),
          );
        } else {
          //current voter is trying to unvote
          target.voters = target.voters.filter(elem => elem != socket.name);
          //add this to history
          history.push(
            new HistoryElement(`${socket.name} has unvoted for ${target.name}`),
          );
        }
        broadcastUpdate();
      }
    }
  });
  socket.on("restart", function() {
    socket.name = undefined;
    players = [];
    history = [];
    broadcastUpdate();
  });
  socket.on("clearVotes", function() {
    for (let player of players) {
      player.voters = [];
    }
    broadcastUpdate();
  });
});
