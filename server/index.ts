import express from "express"
import {createServer} from "node:http"
import cors from "cors"
import {Server} from "socket.io"

const app = express()
const server = createServer(app)
app.use(cors())

const io = new Server(server, {
	cors: {origin: "http://localhost:3000", methods: ["GET", "POST"]},
})

interface User {
	id: string
	name: string
}

// Rooms mapping: { roomCode: [socketIds] }
const rooms: Record<string, User[]> = {}

io.on("connection", (socket) => {
	console.log("User connected", {id: socket.id})

	// Handle user joining a room
	socket.on("join_room", (roomCode: string, name: string) => {
		if (!rooms[roomCode]) {
			rooms[roomCode] = []
		}

		// Check if the user's socket ID is already in the room
		const userExists = rooms[roomCode].some((user) => user.id === socket.id)
		if (!userExists) {
			// Add the user's socket ID to the room
			rooms[roomCode].push({id: socket.id, name})
			socket.join(roomCode)

			console.log(`User ${socket.id} joined room ${roomCode}`)
		} else {
			console.log(`User ${socket.id} is already in room ${roomCode}`)
		}

		console.log(rooms[roomCode])
		io.to(roomCode).emit("room_users", rooms[roomCode])

		socket.on("changeMode", (mode, selected) => {
			console.log(mode, selected)
			io.to(roomCode).emit("changeNonHostMode", mode, selected)
		})

		socket.on("startGame", (initialWords: string[]) => {
			console.log(initialWords)
			io.to(roomCode).emit("startNonHostGame", initialWords)
		})
	})

	// Handle user disconnection
	socket.on("disconnect", () => {
		console.log("User disconnected:", socket.id)

		// Remove user from all rooms they were part of
		for (const roomCode in rooms) {
			rooms[roomCode] = rooms[roomCode].filter((user) => user.id !== socket.id)

			// Notify other users in the room about the update
			io.to(roomCode).emit("room_users", rooms[roomCode])

			// Clean up empty rooms
			if (rooms[roomCode].length === 0) {
				delete rooms[roomCode]
				console.log(`Room ${roomCode} deleted (empty)`)
			}
		}
	})
})

app.get("/", (req, res) => {
	res.send("Hello World")
})

server.listen(4000, () => {
	console.log("Server is running on port 4000")
})
