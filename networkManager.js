export class NetworkManager {
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.ws = null;
        this.playerId = null;
        this.roomId = null;
        this.players = new Set();
        this.connected = false;
        this.ready = false;
        this.inputBuffer = new Map();
        this.lastProcessedInput = new Map();

        // UI callbacks
        this.onConnectionStatusChange = null;
        this.onRoomJoin = null;
        this.onPlayersUpdate = null;
        this.onGameStart = null;
    }

    connect() {
        console.log('Attempting to connect to server...');
        this.ws = new WebSocket('ws://localhost:8080');

        this.ws.onopen = () => {
            console.log('Connected to server');
            this.connected = true;
            if (this.onConnectionStatusChange) {
                this.onConnectionStatusChange('Connected to server');
            }
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server. Players before disconnect:', Array.from(this.players));
            this.connected = false;
            this.ready = false;
            // Clear the players set on disconnect
            this.players.clear();
            if (this.onConnectionStatusChange) {
                this.onConnectionStatusChange('Disconnected from server');
            }
            // Update UI to reflect empty player list
            this.updatePlayerList();
            // Attempt to reconnect after a delay
            console.log('Attempting to reconnect in 5 seconds...');
            setTimeout(() => this.connect(), 5000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (this.onConnectionStatusChange) {
                this.onConnectionStatusChange('Connection error');
            }
        };
    }

    handleMessage(message) {
        console.log('Received message:', message);
        switch (message.type) {
            case 'connected':
                this.playerId = message.playerId;
                console.log('Received player ID:', this.playerId);
                break;

            case 'joinedRoom':
                this.roomId = message.roomId;
                this.players = new Set(message.players);
                console.log('Joined room:', this.roomId, 'with players:', Array.from(this.players));
                if (this.onRoomJoin) {
                    this.onRoomJoin(this.roomId);
                }
                this.updatePlayerList();
                break;

            case 'playerJoined':
                console.log('Player joined. Before update - Current players:', Array.from(this.players));
                this.players.add(message.playerId);
                console.log('After adding player:', message.playerId, '- Current players:', Array.from(this.players));
                this.updatePlayerList();
                break;

            case 'playerLeft':
                console.log('Player left. Before update - Current players:', Array.from(this.players));
                this.players.delete(message.playerId);
                console.log('After removing player:', message.playerId, '- Current players:', Array.from(this.players));
                this.updatePlayerList();
                break;

            case 'gameStart':
                console.log('Game starting with players:', message.players);
                // Update our player set to match the game start state
                this.players = new Set(message.players);
                console.log('Updated player set for game start:', Array.from(this.players));
                this.startGame(message.players, message.timestamp);
                if (this.onGameStart) {
                    this.onGameStart();
                }
                break;

            case 'playerInput':
                this.inputBuffer.set(message.frame, {
                    playerId: message.playerId,
                    input: message.input
                });
                break;

            case 'stateUpdate':
                this.handleStateUpdate(message.frame, message.state);
                break;
        }
    }

    updatePlayerList() {
        if (this.onPlayersUpdate) {
            // Convert players Set to array of player objects
            const playerList = Array.from(this.players).map(id => ({
                id,
                ready: true
            }));
            console.log('Updating player list. Current players:', playerList);
            this.onPlayersUpdate(playerList);
        }
    }

    joinGame() {
        if (this.connected) {
            console.log('Sending joinGame request');
            this.ws.send(JSON.stringify({
                type: 'joinGame'
            }));
        }
    }

    sendReady() {
        if (this.connected) {
            console.log('Sending ready signal');
            this.ws.send(JSON.stringify({
                type: 'ready'
            }));
            this.ready = true;
            // Update player list to reflect ready state
            this.updatePlayerList();
        }
    }

    sendInput(frame, input) {
        if (this.connected && this.ready) {
            this.ws.send(JSON.stringify({
                type: 'input',
                frame: frame,
                input: input
            }));
        }
    }

    sendState(frame, state) {
        if (this.connected && this.ready) {
            this.ws.send(JSON.stringify({
                type: 'state',
                frame: frame,
                state: state
            }));
        }
    }

    handleStateUpdate(frame, state) {
        // Compare received state with local prediction
        const localState = this.gameLoop.stateManager.getState(frame);
        if (localState && !this.gameLoop.stateManager.statesMatch(localState, state)) {
            // State mismatch detected, trigger rollback
            console.log('State mismatch detected at frame', frame);
            this.gameLoop.stateManager.rollback(frame, this.gameLoop);
        }
    }

    startGame(players, timestamp) {
        // For now, just log that the game is starting
        // We'll implement full multiplayer game state later
        console.log('Game starting with players:', players);
        console.log('Start timestamp:', timestamp);
        
        // Update the player list one final time
        if (this.onPlayersUpdate) {
            this.onPlayersUpdate(players.map(id => ({
                id,
                ready: true
            })));
        }
    }

    disconnect() {
        console.log('Disconnecting. Current players:', Array.from(this.players));
        if (this.ws) {
            this.ws.close();
        }
    }
} 