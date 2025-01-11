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
        this.updateCharacterList();
    }

    addNetworkPlayer(playerId) {
        if (!this.networkPlayers.has(playerId)) {
            console.log('Adding network player:', playerId);
            const networkPlayer = new Character(200, 200, 'gray');
            networkPlayer.id = playerId;
            this.networkPlayers.set(playerId, networkPlayer);
            this.updateCharacterList();
        }
    }

    removeNetworkPlayer(playerId) {
        console.log('Removing network player:', playerId);
        this.networkPlayers.delete(playerId);
        this.updateCharacterList();
    }

    createCharacterEntry(character, isLocal = false, isNetworkPlayer = false) {
        const entry = document.createElement('div');
        entry.className = 'character-entry';
        
        if (isLocal || isNetworkPlayer) {
            // Player entry (local or network)
            const title = document.createElement('div');
            title.className = 'character-title';
            
            // Only show one entry for the local player
            if (isLocal && character.id === window.networkManager?.playerId) {
                title.textContent = `You - Player ${character.id.substring(0, 8)}`;
                if (window.networkManager?.isHost) {
                    const hostBadge = document.createElement('span');
                    hostBadge.className = 'host-badge';
                    hostBadge.textContent = 'Host';
                    title.appendChild(hostBadge);
                }
            } else if (!isLocal && character.id !== window.networkManager?.playerId) {
                title.textContent = `Player ${character.id.substring(0, 8)}`;
                if (character.isHost) {
                    const hostBadge = document.createElement('span');
                    hostBadge.className = 'host-badge';
                    hostBadge.textContent = 'Host';
                    title.appendChild(hostBadge);
                }
            } else {
                return null; // Skip duplicate entries
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
        
        console.log('Updating character list:', {
            player: this.player,
            playerId: this.player?.id,
            isHost: window.networkManager?.isHost,
            networkPlayers: Array.from(this.networkPlayers.entries())
        });
        
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