import { Bullet } from './bullet.js';

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
        // Only log non-state-update messages
        if (message.type !== 'stateUpdate') {
            console.log('Received message:', message);
        }
        switch (message.type) {
            case 'connected':
                this.playerId = message.playerId;
                console.log('[NetworkManager] Player connected with ID:', this.playerId);
                if (this.onPlayerIdReceived) {
                    this.onPlayerIdReceived(this.playerId);
                }
                break;

            case 'joinedRoom':
                this.roomId = message.roomId;
                this.players = new Set(message.players);
                console.log('[NetworkManager] Joined room:', {
                    roomId: this.roomId,
                    players: Array.from(this.players),
                    isHost: this.isHost,
                    newPlayerId: message.newPlayerId
                });
                
                // If we're the host, assign colors to all players
                if (this.isHost) {
                    const characterManager = this.gameLoop.characterManager;
                    console.log('[NetworkManager] Host assigning colors. Current colors:', {
                        playerColors: Array.from(characterManager.playerColors.entries()),
                        localPlayerId: this.playerId,
                        localPlayerColor: characterManager.player?.color
                    });
                    
                    // If there's a new player, assign them a color
                    if (message.newPlayerId) {
                        const assignedColor = characterManager.assignColorToPlayer(message.newPlayerId);
                        console.log('[NetworkManager] Host assigned color:', {
                            targetPlayer: message.newPlayerId,
                            color: assignedColor
                        });
                        
                        // Broadcast the color assignment to all players
                        this.ws.send(JSON.stringify({
                            type: 'colorAssignment',
                            targetPlayerId: message.newPlayerId,
                            color: assignedColor
                        }));
                    }
                } else {
                    // If we're not the host, request our color assignment
                    console.log('[NetworkManager] Not host, requesting color assignment');
                    // Set local player color to gray temporarily
                    if (this.gameLoop && this.gameLoop.characterManager && this.gameLoop.characterManager.player) {
                        this.gameLoop.characterManager.player.color = 'gray';
                        this.gameLoop.characterManager.updateCharacterList();
                    }
                    this.ws.send(JSON.stringify({
                        type: 'requestColorAssignment',
                        playerId: this.playerId,
                        roomId: this.roomId
                    }));
                }
                
                if (this.onRoomJoin) {
                    this.onRoomJoin(this.roomId);
                }
                this.updatePlayerList();
                break;

            case 'requestColorAssignment':
                if (this.isHost) {
                    console.log('[NetworkManager] Host received color request from:', message.playerId);
                    const characterManager = this.gameLoop.characterManager;
                    
                    // Check if we already assigned a color to this player
                    let assignedColor = characterManager.playerColors.get(message.playerId);
                    
                    // If no color was assigned yet, assign a new one
                    if (!assignedColor) {
                        assignedColor = characterManager.assignColorToPlayer(message.playerId);
                        // Store the color assignment in the host's map
                        characterManager.playerColors.set(message.playerId, assignedColor);
                    }
                    
                    console.log('[NetworkManager] Host assigning/confirming color:', {
                        targetPlayer: message.playerId,
                        color: assignedColor,
                        isNewAssignment: !characterManager.playerColors.has(message.playerId)
                    });
                    
                    // Send the color assignment to all players
                    this.ws.send(JSON.stringify({
                        type: 'colorAssignment',
                        targetPlayerId: message.playerId,
                        color: assignedColor,
                        roomId: message.roomId
                    }));
                }
                break;

            case 'colorAssignment':
                console.log('[NetworkManager] Received color assignment:', {
                    message,
                    currentPlayerId: this.playerId,
                    isHost: this.isHost,
                    localPlayerColor: this.gameLoop.characterManager.player?.color
                });
                
                const characterManager = this.gameLoop.characterManager;
                const targetPlayerId = message.targetPlayerId;
                
                // Always apply the color assignment regardless of host status
                if (targetPlayerId === this.playerId) {
                    console.log('[NetworkManager] Applying color to local player:', {
                        color: message.color,
                        currentColor: characterManager.player?.color
                    });
                    if (characterManager.player) {
                        characterManager.setPlayerColor(characterManager.player, message.color);
                        // Force a UI update
                        characterManager.updateCharacterList();
                    }
                } else {
                    console.log('[NetworkManager] Applying color to network player:', {
                        targetPlayerId,
                        color: message.color,
                        existingPlayer: characterManager.networkPlayers.has(targetPlayerId),
                        existingColor: characterManager.networkPlayers.get(targetPlayerId)?.color
                    });
                    let networkPlayer = characterManager.networkPlayers.get(targetPlayerId);
                    if (networkPlayer) {
                        characterManager.setPlayerColor(networkPlayer, message.color);
                    }
                    // Store the color for when the player is created
                    characterManager.playerColors.set(targetPlayerId, message.color);
                }
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
                
                // If we're the host, assign a color to the new player
                if (this.isHost) {
                    const characterManager = this.gameLoop.characterManager;
                    const assignedColor = characterManager.assignColorToPlayer(message.playerId);
                    console.log('[NetworkManager] Host assigning color to new player:', {
                        targetPlayer: message.playerId,
                        color: assignedColor
                    });
                    
                    // Send the color assignment to all players
                    this.ws.send(JSON.stringify({
                        type: 'colorAssignment',
                        targetPlayerId: message.playerId,
                        color: assignedColor
                    }));
                }
                
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

            case 'bulletCreated':
                this.handleBulletEvent(message);
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
            // Add player ID to state before sending
            const stateWithId = {
                ...state,
                playerId: this.playerId
            };
            
            this.ws.send(JSON.stringify({
                type: 'state',
                frame: frame,
                state: stateWithId
            }));
        }
    }

    handleStateUpdate(frame, state) {
        // Skip state updates for local player
        if (state.playerId === this.playerId) {
            return;
        }

        // Get the network player
        const networkPlayer = this.gameLoop.characterManager.networkPlayers.get(state.playerId);
        if (!networkPlayer) {
            // Only log when we can't find a player - this is an error condition
            console.log('[NetworkManager] No network player found for ID:', state.playerId);
            return;
        }

        // Update network player state
        networkPlayer.x = state.x;
        networkPlayer.y = state.y;
        networkPlayer.velocityX = state.velocityX;
        networkPlayer.velocityY = state.velocityY;
        networkPlayer.direction = state.direction;
        networkPlayer.isJumping = state.isJumping;
        networkPlayer.isRushing = state.isRushing;
        networkPlayer.isFlashing = state.isFlashing;
        networkPlayer.isDead = state.isDead;
        networkPlayer.hearts = state.hearts;

        // Handle bullet updates if present
        if (state.bullets && Array.isArray(state.bullets)) {
            state.bullets.forEach(bulletData => {
                if (!bulletData || !bulletData.ownerId) {
                    console.warn('[NetworkManager] Invalid bullet data received:', bulletData);
                    return;
                }

                // Create new bullets that we don't have
                const existingBullet = this.gameLoop.game.bullets.find(b => 
                    b && b.owner && b.owner.id === bulletData.ownerId && 
                    Math.abs(b.x - bulletData.x) < 5 && 
                    Math.abs(b.y - bulletData.y) < 5
                );

                if (!existingBullet) {
                    console.log('[NetworkManager] Creating bullet from state update:', {
                        ownerId: bulletData.ownerId,
                        ownerColor: networkPlayer.color,
                        position: { x: bulletData.x, y: bulletData.y }
                    });

                    const newBullet = new Bullet(
                        bulletData.x,
                        bulletData.y,
                        Math.sign(bulletData.velocityX),
                        networkPlayer
                    );
                    this.gameLoop.game.bullets.push(newBullet);
                }
            });
        }

        // Update the game state's network player data
        this.gameLoop.gameState.updateNetworkPlayer(state.playerId, networkPlayer);
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

    updateNetworkPlayerState(state) {
        // Skip state updates for local player
        if (state.playerId === this.playerId) {
            return;
        }

        // Get the network player
        const networkPlayer = this.gameLoop.characterManager.networkPlayers.get(state.playerId);
        if (!networkPlayer) {
            // Only log when we can't find a player - this is an error condition
            console.log('[NetworkManager] No network player found for ID:', state.playerId);
            return;
        }

        // Update network player state
        networkPlayer.x = state.x;
        networkPlayer.y = state.y;
        networkPlayer.velocityX = state.velocityX;
        networkPlayer.velocityY = state.velocityY;
        networkPlayer.direction = state.direction;
        networkPlayer.isJumping = state.isJumping;
        networkPlayer.isRushing = state.isRushing;
        networkPlayer.isFlashing = state.isFlashing;
        networkPlayer.isDead = state.isDead;
        networkPlayer.hearts = state.hearts;

        // Update the game state's network player data
        this.gameLoop.gameState.updateNetworkPlayer(state.playerId, networkPlayer);
    }

    // Add new method to send bullet creation
    sendBulletCreated(bullet) {
        if (!this.connected || !this.ws) return;

        const bulletData = {
            type: 'bulletCreated',
            bullet: {
                x: bullet.x,
                y: bullet.y,
                velocityX: bullet.velocityX,
                ownerId: bullet.owner.id,
                color: bullet.color
            }
        };

        console.log('[NetworkManager] Sending bullet creation:', {
            ownerId: bullet.owner.id,
            ownerColor: bullet.owner.color,
            position: { x: bullet.x, y: bullet.y }
        });

        this.ws.send(JSON.stringify(bulletData));
    }

    // Add method to handle incoming bullet events
    handleBulletEvent(bullet) {
        const owner = this.gameLoop.characterManager.findCharacterById(bullet.ownerId);
        if (!owner) return;

        const newBullet = new Bullet(
            bullet.x,
            bullet.y,
            Math.sign(bullet.velocityX),
            owner,
            {
                isNetworkBullet: true,
                ownerId: bullet.ownerId,
                ownerColor: owner.color
            }
        );
        this.gameLoop.game.bullets.push(newBullet);
    }
} 