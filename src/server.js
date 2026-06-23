import "dotenv/config";
import { createServer } from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./shared/utils/socket.js";

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Initialize workers
import "./shared/queue/workers/email.worker.js";
import "./shared/queue/workers/payment.worker.js";

const server = createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});