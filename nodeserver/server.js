require('dotenv').config(); // For environment variables
const mongoose = require('mongoose');
const io = require("socket.io")(8000, { cors: { origin: "*" } });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Schemas
const pollSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Use custom ID (e.g., UUID)
  title: { type: String, required: true },
  options: { type: Map, of: Number, default: {} }, // { optionName: voteCount }
  totalVotes: { type: Number, default: 0 }
});
const Poll = mongoose.model('Poll', pollSchema);

const userVoteSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  pollId: { type: String, required: true },
  voted: { type: Boolean, default: true }
});
const UserVote = mongoose.model('UserVote', userVoteSchema);

// Helper to emit poll list to all clients
const emitPollList = async () => {
  const polls = await Poll.find({});
  const pollData = {};
  polls.forEach(poll => {
    pollData[poll._id] = { title: poll.title, options: Object.fromEntries(poll.options), totalVotes: poll.totalVotes };
  });
  io.emit("poll-list", pollData);
};

// Helper to emit updates for a specific poll
const emitPollUpdate = async (pollId) => {
  const poll = await Poll.findById(pollId);
  if (poll) {
    io.emit("poll-update", { pollId, poll: { title: poll.title, options: Object.fromEntries(poll.options), totalVotes: poll.totalVotes } });
  }
};

io.on("connection", (socket) => {
  // Send current poll list to new user
  emitPollList();

  // Handle creating a new poll
  socket.on("create-poll", async (data) => {
    const { title, options } = data;
    if (!title || !options || options.length < 2) {
      socket.emit("error", "Invalid poll: Need a title and at least 2 options.");
      return;
    }
    const pollId = require('uuid').v4(); // Generate unique ID
    const newPoll = new Poll({
      _id: pollId,
      title,
      options: options.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {})
    });
    await newPoll.save();
    emitPollList(); // Update all clients
  });

  // Handle voting on a specific poll
  socket.on("vote", async (data) => {
    const { pollId, option } = data;
    const poll = await Poll.findById(pollId);
    if (!poll || !poll.options.has(option)) {
      socket.emit("error", "Invalid poll or option.");
      return;
    }
    // Check if user already voted on this poll
    const existingVote = await UserVote.findOne({ socketId: socket.id, pollId });
    if (existingVote) {
      socket.emit("error", "Already voted on this poll.");
      return;
    }
    // Update poll
    poll.options.set(option, poll.options.get(option) + 1);
    poll.totalVotes += 1;
    await poll.save();
    // Record user vote
    const userVote = new UserVote({ socketId: socket.id, pollId });
    await userVote.save();
    emitPollUpdate(pollId); // Update all clients
  });

  // Optional: Handle deleting a poll
  socket.on("delete-poll", async (pollId) => {
    await Poll.findByIdAndDelete(pollId);
    await UserVote.deleteMany({ pollId }); // Clean up votes
    emitPollList();
  });
});