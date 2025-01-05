"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_http_1 = require("node:http");
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
const server = (0, node_http_1.createServer)(app);
app.use((0, cors_1.default)());
const io = new socket_io_1.Server(server, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});
// Rooms mapping: { roomCode: [socketIds] }
const rooms = {};
io.on("connection", (socket) => {
    console.log("User connected", { id: socket.id });
    // Handle user joining a room
    socket.on("join_room", (roomCode, name) => {
        if (!rooms[roomCode]) {
            rooms[roomCode] = [];
        }
        // Check if the user's socket ID is already in the room
        const userExists = rooms[roomCode].some((user) => user.id === socket.id);
        if (!userExists) {
            // Add the user's socket ID to the room
            rooms[roomCode].push({ id: socket.id, name });
            socket.join(roomCode);
            console.log(`User ${socket.id} joined room ${roomCode}`);
        }
        else {
            console.log(`User ${socket.id} is already in room ${roomCode}`);
        }
        console.log(rooms);
        io.to(roomCode).emit("room_users", rooms);
    });
    // Handle user disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        // Remove user from all rooms they were part of
        for (const roomCode in rooms) {
            rooms[roomCode] = rooms[roomCode].filter((user) => user.id !== socket.id);
            // Notify other users in the room about the update
            io.to(roomCode).emit("room_users", rooms[roomCode]);
            // Clean up empty rooms
            if (rooms[roomCode].length === 0) {
                delete rooms[roomCode];
                console.log(`Room ${roomCode} deleted (empty)`);
            }
        }
    });
});
app.get("/", (req, res) => {
    res.send("Hello World");
});
server.listen(4000, () => {
    console.log("Server is running on port 4000");
});
