import { DeathBurst } from './effects.js';

const MAX_CHARACTERS = 8;
const CHARACTER_COLORS = ['red', 'green', 'purple', 'orange', 'yellow', 'cyan', 'magenta', 'brown'];
const PERSONALITIES = {
    default: { name: 'Default AI', description: 'Standard fighting behavior' },
    stationary: { name: 'Stationary', description: 'Stands still, only shoots' }
};

class CharacterManager {
    constructor(enemies, Character, WORLD_WIDTH, WORLD_HEIGHT, effects) {
        this.enemies = enemies;
        this.Character = Character;
        this.WORLD_WIDTH = WORLD_WIDTH;
        this.WORLD_HEIGHT = WORLD_HEIGHT;
        this.effects = effects;
        this.characterList = document.getElementById('character-list');
        this.addButton = document.getElementById('add-character');
        
        // Initialize UI
        this.setupUI();
        
        // Update initial character list
        this.updateCharacterList();
    }
    
    setupUI() {
        if (!this.addButton) return;
        this.addButton.addEventListener('click', () => this.addCharacter());
        this.updateAddButtonState();
    }
    
    createCharacterEntry(enemy, index) {
        const entry = document.createElement('div');
        entry.className = 'character-entry';
        
        // Create title
        const title = document.createElement('div');
        title.className = 'character-title';
        title.textContent = `Character ${index + 1}`;
        entry.appendChild(title);
        
        // Create color row
        const colorRow = document.createElement('div');
        colorRow.className = 'character-row';
        
        // Create color indicator
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'color-indicator';
        colorIndicator.style.backgroundColor = enemy.color;
        colorRow.appendChild(colorIndicator);
        
        // Create remove button
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-character';
        removeButton.textContent = '×';
        removeButton.tabIndex = -1;
        removeButton.addEventListener('click', () => {
            this.removeCharacter(index);
        });
        colorRow.appendChild(removeButton);
        
        entry.appendChild(colorRow);
        
        // Create personality row
        const personalityRow = document.createElement('div');
        personalityRow.className = 'character-row';
        
        const select = document.createElement('select');
        select.className = 'personality-select';
        select.tabIndex = -1;
        
        // Add personality options
        Object.entries(PERSONALITIES).forEach(([key, personality]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = personality.name;
            select.appendChild(option);
        });
        
        // Set current personality
        select.value = enemy.personality || 'default';
        
        // Add change listener
        select.addEventListener('change', (e) => {
            enemy.personality = e.target.value;
            e.target.blur();  // Remove focus
        });
        
        personalityRow.appendChild(select);
        entry.appendChild(personalityRow);
        
        return entry;
    }
    
    updateCharacterList() {
        // Clear current list
        this.characterList.innerHTML = '';
        
        // Add entry for each enemy that isn't dead
        this.enemies.filter(enemy => !enemy.isDead).forEach((enemy, index) => {
            this.characterList.appendChild(this.createCharacterEntry(enemy, index));
        });
        
        this.updateAddButtonState();
    }
    
    updateAddButtonState() {
        this.addButton.disabled = this.enemies.filter(enemy => !enemy.isDead).length >= MAX_CHARACTERS;
    }
    
    addCharacter() {
        const aliveEnemies = this.enemies.filter(enemy => !enemy.isDead);
        if (aliveEnemies.length >= MAX_CHARACTERS) return;
        
        // Calculate spawn position near center
        const centerX = this.WORLD_WIDTH / 2;
        const centerY = this.WORLD_HEIGHT / 2;
        const spawnRadius = 300; // Random spawn within this radius from center
        
        // Random angle and distance within spawn radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * spawnRadius;
        
        // Calculate spawn position using polar coordinates
        const spawnX = centerX + Math.cos(angle) * distance;
        const spawnY = centerY + Math.sin(angle) * distance;
        
        // Create new enemy at spawn position
        const newEnemy = new this.Character(
            spawnX,
            spawnY,
            CHARACTER_COLORS[aliveEnemies.length]
        );
        
        // Initialize required properties
        newEnemy.isDead = false;
        newEnemy.movementGoal = {
            x: spawnX,
            y: spawnY,
            timeLeft: 120
        };
        newEnemy.hearts = 5;
        newEnemy.isPlayer = false;
        newEnemy.personality = 'default';  // Set default personality
        
        // Add to enemies array
        this.enemies.push(newEnemy);
        
        // Update UI
        this.updateCharacterList();
    }
    
    removeCharacter(index) {
        // Get the actual enemy from the list of alive enemies
        const aliveEnemies = this.enemies.filter(enemy => !enemy.isDead);
        const enemy = aliveEnemies[index];
        
        if (enemy) {
            // Find the index in the original array
            const originalIndex = this.enemies.indexOf(enemy);
            if (originalIndex !== -1) {
                // Remove from the original array
                this.enemies.splice(originalIndex, 1);
                
                // Create death burst effect
                const deathBurst = new DeathBurst(
                    enemy.x + enemy.width/2,
                    enemy.y + enemy.height/2,
                    enemy.color
                );
                this.effects.push(deathBurst);
                
                // Update UI to reflect the new state
                this.updateCharacterList();
            }
        }
    }
}

export { CharacterManager, PERSONALITIES }; 