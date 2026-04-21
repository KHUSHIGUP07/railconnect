const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

// ✅ Load env (Render automatically provides env vars)
dotenv.config();

// ✅ Imports
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// ✅ Connect DB
connectDB();

const app = express();

// ✅ Middleware (IMPORTANT)
app.use(express.json());

// ✅ API Routes (IMPORTANT)
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// ✅ Test route (so homepage works)
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ❌ REMOVE FRONTEND SERVING (CAUSE OF YOUR ERROR)
// (We will deploy frontend separately later)

// ✅ Error Handling
app.use(notFound);
app.use(errorHandler);

// ✅ Server setup
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});

// ✅ Socket.io
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*", // allow all for now (fix later if needed)
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    const chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
  });
});