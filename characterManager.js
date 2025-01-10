import { DeathBurst } from './effects.js';

const MAX_CHARACTERS = 8;
const CHARACTER_COLORS = ['red', 'green', 'purple', 'orange', 'yellow', 'cyan', 'magenta', 'brown'];
const PERSONALITIES = {
    default: { name: 'Default AI', description: 'Standard fighting behavior' },
    stationary: { name: 'Stationary', description: 'Stands still, only shoots' }
};

class CharacterManager {
    constructor(enemies, Character, worldWidth, worldHeight, effects) {
        this.enemies = enemies;
        this.Character = Character;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.effects = effects;
        this.networkPlayers = new Map(); // Store network players with their IDs
        this.availableColors = ['orange', 'cyan', 'magenta', 'yellow', 'brown']; // Colors for network players
        
        // Initialize character list
        this.characterList = document.getElementById('character-list');
        this.updateCharacterList();
    }

    getUniqueColor() {
        // Get all currently used colors
        const usedColors = new Set([
            ...this.enemies.map(enemy => enemy.color),
            ...Array.from(this.networkPlayers.values()).map(player => player.color)
        ]);
        
        // Find first available color
        return this.availableColors.find(color => !usedColors.has(color)) || 
               `hsl(${Math.random() * 360}, 70%, 50%)`; // Fallback to random HSL
    }

    addNetworkPlayer(playerId) {
        if (!this.networkPlayers.has(playerId)) {
            this.networkPlayers.set(playerId, {
                id: playerId,
                color: this.getUniqueColor(),
                isConnected: true
            });
            this.updateCharacterList();
        }
    }

    removeNetworkPlayer(playerId) {
        if (this.networkPlayers.has(playerId)) {
            this.networkPlayers.delete(playerId);
            this.updateCharacterList();
        }
    }

    updateNetworkPlayerStatus(playerId, isConnected) {
        const player = this.networkPlayers.get(playerId);
        if (player) {
            player.isConnected = isConnected;
            this.updateCharacterList();
        }
    }

    createCharacterEntry(character, isAI = true) {
        const entry = document.createElement('div');
        entry.className = 'character-entry';
        
        if (isAI) {
            // Create AI character entry (existing code)
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
        } else {
            // Create network player entry (simpler version)
            const status = character.isConnected ? 'Connected' : 'Disconnected';
            const statusClass = character.isConnected ? 'connected' : 'disconnected';
            
            entry.innerHTML = `
                <div class="character-title">Player ${character.id.slice(0, 4)}...</div>
                <div class="character-row">
                    <div class="color-indicator" style="background-color: ${character.color}"></div>
                    <span class="player-status ${statusClass}">${status}</span>
                </div>
            `;
        }
        
        return entry;
    }

    updateCharacterList() {
        // Clear the list
        while (this.characterList.firstChild) {
            this.characterList.removeChild(this.characterList.firstChild);
        }
        
        // Add AI characters
        this.enemies.forEach(enemy => {
            if (!enemy.isPlayer) {
                this.characterList.appendChild(this.createCharacterEntry(enemy, true));
            }
        });
        
        // Add network players
        this.networkPlayers.forEach(player => {
            this.characterList.appendChild(this.createCharacterEntry(player, false));
        });
    }
}

export { CharacterManager, PERSONALITIES }; 