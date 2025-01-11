import { DeathBurst } from './effects.js';
import { Character } from './character.js';

const MAX_CHARACTERS = 8;
const CHARACTER_COLORS = ['red', 'green', 'purple', 'orange', 'yellow', 'cyan', 'magenta', 'brown'];
const PERSONALITIES = {
    default: { name: 'Default AI', description: 'Standard fighting behavior' },
    stationary: { name: 'Stationary', description: 'Stands still, only shoots' }
};

export class CharacterManager {
    constructor(player, enemies) {
        this.player = player;
        this.enemies = enemies;
        this.networkPlayers = new Map();
        this.characterList = document.getElementById('character-list');
        this.playerColors = new Map(); // Track assigned colors
        this.updateCharacterList();
    }

    setPlayerColor(character, color) {
        if (!character) return;
        
        console.log('[CharacterManager] Setting player color:', {
            characterId: character.id,
            oldColor: character.color,
            newColor: color,
            isLocalPlayer: character === this.player,
            existingColors: Array.from(this.playerColors.entries())
        });
        
        // Update the color in both places
        character.color = color;
        if (character.id) {
            this.playerColors.set(character.id, color);
            console.log(`[CharacterManager] Color set for player ${character.id}:`, color);
        }
        this.updateCharacterList();
    }

    assignColorToPlayer(playerId) {
        console.log('[CharacterManager] Assigning color to player:', {
            playerId,
            existingColors: Array.from(this.playerColors.entries()),
            localPlayerId: this.player?.id,
            localPlayerColor: this.player?.color
        });
        
        // If player already has a color, return it
        if (this.playerColors.has(playerId)) {
            const existingColor = this.playerColors.get(playerId);
            console.log('[CharacterManager] Player already has color:', {
                playerId,
                color: existingColor
            });
            return existingColor;
        }

        // Get all used colors
        const usedColors = new Set([
            ...Array.from(this.playerColors.values()),
            ...this.enemies.map(e => e.color)
        ]);
        
        console.log('[CharacterManager] Finding available color:', {
            usedColors: Array.from(usedColors),
            availableColors: CHARACTER_COLORS.filter(color => !usedColors.has(color))
        });
        
        // Find first available color
        const availableColors = CHARACTER_COLORS.filter(color => !usedColors.has(color));
        const assignedColor = availableColors[0] || 'gray';
        
        // Store the color assignment and update character if it exists
        this.playerColors.set(playerId, assignedColor);
        console.log('[CharacterManager] New color assigned:', {
            playerId,
            color: assignedColor,
            allColors: Array.from(this.playerColors.entries())
        });
        
        // Update the character's color if it exists
        if (playerId === this.player?.id) {
            console.log('[CharacterManager] Updating local player color:', {
                playerId,
                color: assignedColor,
                oldColor: this.player.color
            });
            this.setPlayerColor(this.player, assignedColor);
        } else {
            const networkPlayer = this.networkPlayers.get(playerId);
            if (networkPlayer) {
                console.log('[CharacterManager] Updating network player color:', {
                    playerId,
                    color: assignedColor,
                    oldColor: networkPlayer.color
                });
                this.setPlayerColor(networkPlayer, assignedColor);
            }
        }
        
        return assignedColor;
    }

    addNetworkPlayer(playerId) {
        console.log('[CharacterManager] Adding network player:', {
            playerId,
            localPlayerId: this.player?.id,
            existingPlayers: Array.from(this.networkPlayers.keys()),
            existingColors: Array.from(this.playerColors.entries())
        });
        
        // Don't create network player for local player
        if (playerId === this.player?.id) {
            console.log('[CharacterManager] Skipping network player creation for local player:', playerId);
            return;
        }

        if (!this.networkPlayers.has(playerId)) {
            // Only get color from playerColors map, don't assign new ones if we're not the host
            const playerColor = this.playerColors.get(playerId) || 'gray';
            console.log('[CharacterManager] Creating network player:', {
                playerId,
                assignedColor: playerColor,
                existingColor: this.playerColors.get(playerId)
            });
            
            const networkPlayer = new Character(200, 200, playerColor);
            networkPlayer.id = playerId;
            networkPlayer.isNetworkPlayer = true;
            this.networkPlayers.set(playerId, networkPlayer);
            this.updateCharacterList();
        }
    }

    removeNetworkPlayer(playerId) {
        console.log('Removing network player:', playerId);
        // Keep the color assignment even after player leaves
        // this.playerColors.delete(playerId);
        if (this.networkPlayers.has(playerId)) {
            this.networkPlayers.delete(playerId);
            this.updateCharacterList();
        }
    }

    createCharacterEntry(character, isLocal = false, isNetworkPlayer = false) {
        const entry = document.createElement('div');
        entry.className = 'character-entry';
        
        if (isLocal || isNetworkPlayer) {
            // Player entry (local or network)
            const title = document.createElement('div');
            title.className = 'character-title';
            
            // Get player ID if it exists, ensure it's a string, otherwise use a placeholder
            const playerId = character.id ? String(character.id).substring(0, 8) : 'Connecting...';
            
            if (isLocal) {
                title.textContent = character.id ? `You - Player ${playerId}` : 'You';
                if (window.networkManager?.isHost) {
                    const hostBadge = document.createElement('span');
                    hostBadge.className = 'host-badge';
                    hostBadge.textContent = 'Host';
                    title.appendChild(hostBadge);
                }
            } else if (isNetworkPlayer) {
                title.textContent = `Player ${playerId}`;
                if (character.isHost) {
                    const hostBadge = document.createElement('span');
                    hostBadge.className = 'host-badge';
                    hostBadge.textContent = 'Host';
                    title.appendChild(hostBadge);
                }
            }
            
            entry.appendChild(title);
            
            const row = document.createElement('div');
            row.className = 'character-row';
            
            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'color-indicator';
            colorIndicator.style.backgroundColor = character.color;
            row.appendChild(colorIndicator);
            
            const status = document.createElement('div');
            status.className = 'status-container';
            status.innerHTML = `<span class="player-status connected">Connected</span>`;
            row.appendChild(status);
            
            entry.appendChild(row);
        } else {
            // AI character entry
            entry.innerHTML = `
                <div class="character-title">AI Character</div>
                <div class="character-row">
                    <div class="color-indicator" style="background-color: ${character.color}"></div>
                    <select class="personality-select">
                        <option value="default">Default</option>
                        <option value="stationary">Stationary</option>
                    </select>
                    <button class="remove-character">×</button>
                </div>
            `;
            
            // Add event listeners for AI controls
            const select = entry.querySelector('.personality-select');
            select.value = character.personality || 'default';
            select.addEventListener('change', (e) => {
                character.personality = e.target.value;
            });
            
            const removeButton = entry.querySelector('.remove-character');
            removeButton.addEventListener('click', () => {
                const index = this.enemies.indexOf(character);
                if (index > -1) {
                    this.enemies.splice(index, 1);
                    this.updateCharacterList();
                }
            });
        }
        
        return entry;
    }

    updateCharacterList() {
        if (!this.characterList) {
            console.log('Character list element not found');
            return;
        }
        
        // Clear the list
        this.characterList.innerHTML = '';
        
        // Add local player if it exists
        if (this.player) {
            const entry = this.createCharacterEntry(this.player, true);
            if (entry) this.characterList.appendChild(entry);
        }
        
        // Add network players
        this.networkPlayers.forEach(player => {
            const entry = this.createCharacterEntry(player, false, true);
            if (entry) this.characterList.appendChild(entry);
        });
        
        // Add AI players
        this.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                const entry = this.createCharacterEntry(enemy);
                if (entry) this.characterList.appendChild(entry);
            }
        });
    }
}

export { PERSONALITIES }; 