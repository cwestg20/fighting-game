export class NetworkManager {
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.gameState = gameLoop ? gameLoop.gameState : null;
        this.ws = null;
        this.playerId = null;
        this.roomId = null;
        this.players = new Set();
        this.connected = false;
        this.ready = false;
        this.inputBuffer = new Map();
        this.lastProcessedInput = new Map();
        this.isHost = false;
        this.hostId = null;

        // UI callbacks
        this.onConnectionStatusChange = (status) => {
            const networkStatus = document.getElementById('network-status');
            if (networkStatus) {
                networkStatus.textContent = status;
            }
            // Join game when connected
            if (status === 'Connected to server') {
                this.joinGame();
            }
        };

        this.onRoomJoin = (roomId) => {
            console.log('Joined room:', roomId);
            this.sendReady();
        };

        this.onPlayersUpdate = (players) => {
            console.log('Players update:', players);
            if (this.gameLoop && this.gameLoop.characterManager) {
                players.forEach(player => {
                    if (player.ready) {
                        this.gameLoop.characterManager.addNetworkPlayer(player.id);
                    }
                    // Update host status for existing players
                    const existingPlayer = this.gameLoop.characterManager.networkPlayers.get(player.id);
                    if (existingPlayer) {
                        existingPlayer.isHost = player.isHost;
                        this.gameLoop.characterManager.updateCharacterList();
                    }
                });

                // Remove players that aren't in the update
                const currentIds = new Set(players.map(p => p.id));
                Array.from(this.gameLoop.characterManager.networkPlayers.keys()).forEach(id => {
                    if (!currentIds.has(id)) {
                        this.gameLoop.characterManager.removeNetworkPlayer(id);
                    }
                });
            }
        };

        this.onHostUpdate = (hostId) => {
            console.log('Host updated:', hostId);
            const debugControlsElement = document.getElementById('debug-controls');
            if (debugControlsElement) {
                if (this.isHost) {
                    debugControlsElement.classList.remove('disabled');
                } else {
                    debugControlsElement.classList.add('disabled');
                }
            }
            
            if (this.gameLoop && this.gameLoop.characterManager) {
                // Update host status for all players
                this.gameLoop.characterManager.networkPlayers.forEach((player, id) => {
                    player.isHost = id === hostId;
                });
                this.gameLoop.characterManager.updateCharacterList();
            }
        };
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
                if (this.onPlayerIdReceived) {
                    this.onPlayerIdReceived(this.playerId);
                }
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

            case 'hostUpdate':
                console.log('Host update received:', message.hostId);
                this.hostId = message.hostId;
                this.isHost = this.playerId === message.hostId;
                
                // Update debug controls visibility based on host status
                const debugControlsContainer = document.getElementById('debug-controls');
                if (debugControlsContainer) {
                    if (this.isHost) {
                        debugControlsContainer.classList.remove('disabled');
                    } else {
                        debugControlsContainer.classList.add('disabled');
                    }
                }
                
                if (this.onHostUpdate) {
                    this.onHostUpdate(message.hostId);
                }

                // Update local player's host status and trigger list update
                if (this.gameLoop && this.gameLoop.characterManager) {
                    const characterManager = this.gameLoop.characterManager;
                    if (characterManager.player) {
                        characterManager.player.isHost = this.isHost;
                        console.log('Updated local player host status:', {
                            playerId: characterManager.player.id,
                            isHost: this.isHost
                        });
                    }
                    characterManager.updateCharacterList();
                }

                this.updatePlayerList();
                break;

            case 'playerJoined':
                console.log('Player joined:', message.playerId);
                this.players.add(message.playerId);
                if (message.isHost !== undefined) {
                    console.log('Host status update:', { playerId: message.playerId, isHost: message.isHost });
                    this.handleHostUpdate(message.playerId, message.isHost);
                }
                this.updatePlayerList();
                break;

            case 'playerLeft':
                console.log('Player left:', message.playerId);
                this.players.delete(message.playerId);
                // Log network players state before removal
                console.log('Network players before removal:', this.gameState.networkPlayers);
                this.gameState.removeNetworkPlayer(message.playerId);
                console.log('Network players after removal:', this.gameState.networkPlayers);
                this.updatePlayerList();
                break;

            case 'gameStart':
                console.log('Game starting with players:', message.players);
                this.players = new Set(message.players);
                this.hostId = message.hostId;
                this.isHost = this.playerId === message.hostId;
                if (this.onGameStart) {
                    this.onGameStart();
                }
                break;

            case 'playerInput':
                this.handlePlayerInput(message.playerId, message.frame, message.input);
                break;

            case 'stateUpdate':
                this.handleStateUpdate(message.frame, message.state);
                break;

            case 'gameState':
                console.log('Received game state update. Network players:', 
                    Array.from(message.state.networkPlayers.entries())
                        .map(([id, player]) => ({
                            id,
                            x: player.x,
                            y: player.y
                        }))
                );
                // ... rest of the gameState handling
                break;
        }
    }

    updatePlayerList() {
        if (this.onPlayersUpdate) {
            const playerList = Array.from(this.players).map(id => ({
                id,
                ready: true,
                isHost: id === this.hostId,
                isConnected: true
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
        console.log('Received state update:', {
            frame,
            networkPlayers: Array.from(state.networkPlayers.entries()).map(([id, player]) => ({
                id,
                x: player.x,
                y: player.y,
                hearts: player.hearts,
                isFlashing: player.isFlashing
            }))
        });

        // Compare received state with local prediction
        const localState = this.gameLoop.stateManager.getState(frame);
        if (localState && !this.gameLoop.stateManager.statesMatch(localState, state)) {
            // State mismatch detected, trigger rollback
            console.log('State mismatch detected at frame', frame, {
                local: {
                    networkPlayers: Array.from(localState.networkPlayers.entries()),
                    player: localState.player
                },
                remote: {
                    networkPlayers: Array.from(state.networkPlayers.entries()),
                    player: state.player
                }
            });
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