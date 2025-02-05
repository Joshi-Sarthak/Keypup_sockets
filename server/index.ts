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
	email: string
	finished: boolean
	id: string
	name: string
	mode: string
	subtype: string
	correctChars: number
	rawChars: number
}

// Rooms mapping: { roomCode: [socketIds] }
const rooms: Record<string, User[]> = {}

io.on("connection", (socket) => {
	console.log("User connected", {id: socket.id})

	// Handle user joining a room

	socket.on("create_room", (roomCode: string, name: string, email: string) => {
		console.log("email : " + email)
		if (!rooms[roomCode]) {
			rooms[roomCode] = []
		}

		// Check if the user's socket ID is already in the room
		const userExists = rooms[roomCode].some((user) => user.id === socket.id)
		if (!userExists) {
			rooms[roomCode].push({
				email,
				id: socket.id,
				name,
				finished: false,
				mode: "",
				subtype: "",
				correctChars: 0,
				rawChars: 0,
			})
			socket.join(roomCode)
			console.log(`User ${socket.id} joined room ${roomCode}`)
		} else {
			console.log(`User ${socket.id} is already in room ${roomCode}`)
		}
	})

	socket.on("check_room", (roomCode: string) => {
		if (rooms[roomCode]) {
			console.log(`Room ${roomCode} exists`)
			socket.emit("room_exists", true)
		} else {
			console.log(`Room ${roomCode} does not exist`)
			socket.emit("room_exists", false)
		}
	})

	socket.on("join_room", (roomCode: string, name: string, email: string) => {
		// Check if the user's socket ID is already in the room
		const userExists = rooms[roomCode].some((user) => user.id === socket.id)
		if (!userExists) {
			rooms[roomCode].push({
				email,
				id: socket.id,
				name,
				finished: false,
				mode: "",
				subtype: "",
				correctChars: 0,
				rawChars: 0,
			})
			socket.join(roomCode)
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

		socket.on(
			"endGame",
			(
				mode: string,
				subtype: string,
				correctChars: number,
				rawChars: number,
				totalTime: number
			) => {
				console.log(mode, subtype, correctChars, rawChars)

				if (rooms[roomCode]) {
					// Update the player's stats
					rooms[roomCode] = rooms[roomCode].map((user) =>
						user.id === socket.id
							? {
									...user,
									mode,
									subtype,
									correctChars,
									rawChars,
									totalTime,
									finished: true,
							  }
							: user
					)

					// Check if all players have finished
					const allFinished = rooms[roomCode].every((user) => user.finished)
					console.log(allFinished)

					if (allFinished) {
						io.to(roomCode).emit("gameResults", rooms[roomCode])
					}
				}
			}
		)
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
