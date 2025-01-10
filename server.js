const WebSocket = require('ws');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Create Express app for serving static files
const app = express();
app.use(express.static(path.join(__dirname)));

// Create HTTP server
const server = app.listen(8080, () => {
    console.log('HTTP Server running on port 8080');
    console.log('Current rooms:', rooms.size);
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ server });

// Game rooms for matchmaking
const rooms = new Map();
const playerConnections = new Map();

class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.gameState = null;
        this.isMatchmaking = true;
        this.maxPlayers = 4;
    }

    addPlayer(playerId, connection) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }
        console.log(`Adding player ${playerId} to room ${this.id}`);
        this.players.set(playerId, {
            connection,
            ready: false,
            lastInputFrame: 0,
            inputs: new Map()
        });
        return true;
    }

    removePlayer(playerId) {
        console.log(`\nRemoving player ${playerId} from room ${this.id}`);
        console.log('Room state before removal:');
        console.log('- isMatchmaking:', this.isMatchmaking);
        console.log('- players:', this.players.size);
        
        this.players.delete(playerId);
        
        // If we have less than 2 players, reset to matchmaking state
        if (this.players.size < 2) {
            console.log(`Room ${this.id} has less than 2 players, resetting to matchmaking`);
            this.isMatchmaking = true;
        }
        
        // Check if we have any connected players
        let hasConnectedPlayers = false;
        this.players.forEach((player) => {
            if (player.connection.readyState === WebSocket.OPEN) {
                hasConnectedPlayers = true;
            }
        });
        
        console.log('\nRoom state after removal:');
        console.log('- isMatchmaking:', this.isMatchmaking);
        console.log('- players:', this.players.size);
        console.log('- hasConnectedPlayers:', hasConnectedPlayers);
        
        // If no connected players, delete the room
        if (!hasConnectedPlayers) {
            console.log(`Room ${this.id} has no connected players, cleaning up`);
            rooms.delete(this.id);
        }
    }

    broadcast(message, excludePlayerId = null) {
        this.players.forEach((player, playerId) => {
            if (playerId !== excludePlayerId && player.connection.readyState === WebSocket.OPEN) {
                player.connection.send(JSON.stringify(message));
            }
        });
    }

    isReady() {
        if (this.players.size < 2) return false;
        let readyCount = 0;
        this.players.forEach((player) => {
            if (player.connection.readyState === WebSocket.OPEN && player.ready) {
                readyCount++;
            }
        });
        return readyCount >= 2;
    }

    startGame() {
        console.log(`\nStarting game in room ${this.id}`);
        console.log('Room state before game start:');
        console.log('- isMatchmaking:', this.isMatchmaking);
        console.log('- players:', this.players.size);
        
        this.isMatchmaking = false;
        // Only include connected players in the game start message
        const connectedPlayers = Array.from(this.players.entries())
            .filter(([_, player]) => player.connection.readyState === WebSocket.OPEN)
            .map(([playerId, _]) => playerId);
            
        console.log('Connected players:', connectedPlayers);
        this.broadcast({
            type: 'gameStart',
            players: connectedPlayers,
            timestamp: Date.now()
        });
        
        console.log('Room state after game start:');
        console.log('- isMatchmaking:', this.isMatchmaking);
        console.log('- players:', this.players.size);
    }
}

function logRoomState() {
    console.log('\nCurrent Room State:');
    console.log('Total rooms:', rooms.size);
    rooms.forEach((room, roomId) => {
        console.log(`\nRoom ${roomId}:`);
        console.log('- isMatchmaking:', room.isMatchmaking);
        console.log('- players:', room.players.size);
        console.log('- player details:');
        room.players.forEach((player, playerId) => {
            console.log(`  - ${playerId}: ready=${player.ready}, connected=${player.connection.readyState === WebSocket.OPEN}`);
        });
    });
    console.log('\n');
}

function findOrCreateRoom() {
    console.log('\nLooking for available room...');
    logRoomState();
    
    // First try to find a room in matchmaking
    for (const [roomId, room] of rooms) {
        console.log(`\nChecking room ${roomId}:`);
        console.log(`- matchmaking: ${room.isMatchmaking}`);
        console.log(`- players: ${room.players.size}`);
        console.log(`- maxPlayers: ${room.maxPlayers}`);
        
        if (room.isMatchmaking && room.players.size < room.maxPlayers) {
            console.log(`Found available matchmaking room: ${roomId}`);
            return room;
        }
    }
    
    // If no matchmaking rooms, try to join any non-full room
    for (const [roomId, room] of rooms) {
        if (room.players.size < room.maxPlayers) {
            console.log(`Found non-full room: ${roomId}`);
            return room;
        }
    }
    
    // Create new room if none available
    const roomId = uuidv4();
    const room = new GameRoom(roomId);
    rooms.set(roomId, room);
    console.log(`\nCreated new room: ${roomId}`);
    return room;
}

function handlePlayerJoin(ws, playerId) {
    console.log(`\nPlayer ${playerId} joining...`);
    
    const room = findOrCreateRoom();
    room.addPlayer(playerId, ws);
    
    // Send room info to the new player
    const roomInfo = {
        type: 'roomInfo',
        roomId: room.id,
        players: Array.from(room.players.keys()),
        isMatchmaking: room.isMatchmaking
    };
    ws.send(JSON.stringify(roomInfo));
    
    // Notify other players about the new player
    const playerJoinedMsg = {
        type: 'playerJoined',
        playerId: playerId
    };
    room.broadcast(JSON.stringify(playerJoinedMsg), playerId);
    
    // If this is a game in progress, send the current game state
    if (!room.isMatchmaking) {
        const gameStateMsg = {
            type: 'gameState',
            players: Array.from(room.players.keys()),
            // Add any other relevant game state here
        };
        ws.send(JSON.stringify(gameStateMsg));
    }
    // Start game if room is full during matchmaking
    else if (room.players.size >= 2) {
        room.startGame();
    }
    
    console.log(`Player ${playerId} joined room ${room.id}`);
    console.log(`Room now has ${room.players.size} players`);
}

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    let currentRoom = null;

    console.log(`\nPlayer ${playerId} connected`);
    playerConnections.set(playerId, ws);
    console.log('Total connected players:', playerConnections.size);

    // Send initial connection acknowledgment
    ws.send(JSON.stringify({
        type: 'connected',
        playerId: playerId
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'joinGame':
                    currentRoom = findOrCreateRoom();
                    if (currentRoom.addPlayer(playerId, ws)) {
                        console.log(`Player ${playerId} joined room ${currentRoom.id}`);
                        ws.send(JSON.stringify({
                            type: 'joinedRoom',
                            roomId: currentRoom.id,
                            players: Array.from(currentRoom.players.keys())
                        }));
                        // Notify other players in room
                        currentRoom.broadcast({
                            type: 'playerJoined',
                            playerId: playerId
                        }, playerId);
                    }
                    break;

                case 'ready':
                    if (currentRoom && currentRoom.players.has(playerId)) {
                        console.log(`Player ${playerId} is ready in room ${currentRoom.id}`);
                        currentRoom.players.get(playerId).ready = true;
                        if (currentRoom.isReady()) {
                            currentRoom.startGame();
                        }
                    }
                    break;

                case 'input':
                    if (currentRoom && !currentRoom.isMatchmaking) {
                        // Store and broadcast input to other players
                        const playerData = currentRoom.players.get(playerId);
                        playerData.inputs.set(data.frame, data.input);
                        playerData.lastInputFrame = Math.max(playerData.lastInputFrame, data.frame);
                        
                        currentRoom.broadcast({
                            type: 'playerInput',
                            playerId: playerId,
                            frame: data.frame,
                            input: data.input
                        }, playerId);
                    }
                    break;

                case 'state':
                    if (currentRoom && !currentRoom.isMatchmaking) {
                        // Broadcast state update to all players
                        currentRoom.broadcast({
                            type: 'stateUpdate',
                            frame: data.frame,
                            state: data.state
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log(`\nPlayer ${playerId} disconnected`);
        if (currentRoom) {
            console.log(`Player was in room: ${currentRoom.id}`);
            currentRoom.broadcast({
                type: 'playerLeft',
                playerId: playerId
            });
            currentRoom.removePlayer(playerId);
            console.log('Room state after player removal:');
            logRoomState();
        }
        playerConnections.delete(playerId);
        console.log('Total connected players:', playerConnections.size);
    });
}); 