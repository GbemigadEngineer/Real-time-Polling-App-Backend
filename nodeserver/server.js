const io = require("socket.io")(8000, {
  cors: {
    origin: "*",
  },
});

let totalVotes = 0;
let votingPolls = {
  html: 0,
  css: 0,
  js: 0,
  python: 0,
};

//  Send Current Polls Data to New User
io.on("connection", (socket) => {
  socket.on("send-vote", (voteTo) => {
    totalVotes += 1;
    votingPolls[voteTo] += 1;
    socket.broadcast.emit("receive-vote", { votingPolls, totalVotes });
    socket.emit("update", { votingPolls, totalVotes });
  });
});
