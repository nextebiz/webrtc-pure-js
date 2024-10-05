import express from "express";
import { createServer } from "https";
import { Server } from "socket.io";
import fs from "fs";

let users = [];
// format {name: 'imran', id: 'abc'}

const sslConfig = {
  key: fs.readFileSync("./cert/server.key"),
  cert: fs.readFileSync("./cert/server.cert"),
};

const app = express();
app.use(express.static("public"));

const httpsServer = createServer(sslConfig, app);
const io = new Server(httpsServer, {
  cors: {
    origin: "https://192.168.100.20:9000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.get("/", (req, res) => {
  console.log("Request Get /");
  res.sendFile(process.cwd() + "/app/index.html");
});

io.on("connection", (socket) => {
  console.log(`user connected ${socket.id}`);
  //

  socket.on("user-join", (name) => {
    const userExists = users.find((user) => user.id == socket.id);
    if (!userExists) {
      const user_data = {
        name: name,
        id: socket.id,
      };
      users.push(user_data);
      io.emit("user-join", user_data);
    }
    io.emit("user-joined", users);
    console.log("user-joined");
  });

  socket.on("offer", ({ from, to, offer }) => {
    //find user and send him call offer
    const callToUserExists = users.find((user) => user.id == to.id);
    if (callToUserExists) {
      io.to(callToUserExists.id).emit("offer", { from, to, offer });
      console.log("offder from server sent to user ", to);
    }
  });
  socket.on("answer", ({ from, to, answer }) => {
    const answerFromUserExists = users.find((user) => user.id == from.id);
    if (answerFromUserExists) {
      io.to(answerFromUserExists.id).emit("answer", { from, to, answer });
      console.log("answer from server sent to user ", from);
    }
  });
  socket.on("icecandidate", (candidate) => {
    console.log("ICE candidate received");
    socket.broadcast.emit("icecandidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log(`disconnected ${socket.id}`);
    const userExists = users.find((user) => user.id == socket.id);
    if (userExists) {
      users = users.filter((user) => user.id != socket.id);
    }
  });
});

httpsServer.listen(9000, () => {
  console.log("listening on https://192.168.100.20:9000");
});
