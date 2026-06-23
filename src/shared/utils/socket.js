import { Server } from "socket.io";

let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User joins their personal room
    socket.on("join", (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`Socket ${socket.id} joined user_${userId} room`);
      }
    });

    socket.on("join_user_room", (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`Socket ${socket.id} joined user_${userId} room (join_user_room)`);
      }
    });

    // Admin joins the admin room
    socket.on("join_admin", () => {
      socket.join("admin");
      console.log(`Socket ${socket.id} joined admin room`);
    });

    socket.on("join_admin_room", () => {
      socket.join("admin");
      console.log(`Socket ${socket.id} joined admin room (join_admin_room)`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId.toString()}`).emit(event, data);
  }
};

export const emitToAdmin = (event, data) => {
  if (io) {
    io.to("admin").emit(event, data);
  }
};
