// Import Platform class
import Platform from './platform.js';
import { Character, MOVE_SPEED } from './character.js';
import { Bullet } from './bullet.js';
import { DeathBurst } from './effects.js';
import { Camera } from './camera.js';
import { 
    debugControls, 
    performanceMetrics, 
    calculateFPS, 
    initializeDebugControls,
    drawFPS 
} from './debug.js';
import { InputHandler } from './input.js';
import { Minimap } from './minimap.js';
import { maps } from './maps.js';
import { CharacterManager } from './characterManager.js';
import { GameState } from './gameState.js';
import { Random } from './random.js';
import { FIXED_TIMESTEP, MAX_HEARTS } from './constants.js';
import { characterSprite } from './assets.js';

// Game loop constants
const FRAME_RATE = 60;
const FRAME_TIME = 1000 / FRAME_RATE;
const MAX_FRAME_SKIP = 5;
const INITIAL_SEED = 12345; // Fixed seed for deterministic gameplay

class GameLoop {
    constructor(game) {
        this.game = game;
        this.lastUpdateTime = 0;
        this.frameDelta = 0;
        this.frameNumber = 0;
        this.fixedTimeStep = FIXED_TIMESTEP / 1000; // Convert ms to seconds
        this.gameState = new GameState(INITIAL_SEED);
        this.isVisible = true;

        // Add visibility change listener
        document.addEventListener('visibilitychange', () => {
            this.isVisible = document.visibilityState === 'visible';
            if (this.isVisible) {
                // Reset timing when becoming visible again
                this.lastUpdateTime = performance.now() / 1000;
                this.frameDelta = 0;
            }
        });
    }

    start() {
        this.lastUpdateTime = performance.now() / 1000; // Convert to seconds
        this.loop();
    }

    loop() {
        if (!this.isVisible) {
            requestAnimationFrame(() => this.loop());
            return;
        }

        const currentTime = performance.now() / 1000; // Convert to seconds
        const deltaTime = Math.min(currentTime - this.lastUpdateTime, 0.1); // Cap at 100ms
        this.lastUpdateTime = currentTime;

        this.frameDelta += deltaTime;

        // Process fixed number of updates
        let updates = 0;
        while (this.frameDelta >= this.fixedTimeStep && updates < MAX_FRAME_SKIP) {
            this.gameState.update();
            this.game.fixedUpdate(this.fixedTimeStep, this.gameState);
            this.frameDelta -= this.fixedTimeStep;
            updates++;
            this.frameNumber++;
        }

        // If we still have too much accumulated time, discard it
        if (this.frameDelta > this.fixedTimeStep * 2) {
            this.frameDelta = this.fixedTimeStep;
        }

        // Render can interpolate between states if needed
        this.game.render();
        requestAnimationFrame(() => this.loop());
    }
}

// Initialize variables at the top
let canvas, ctx, healthDisplay;
let player, enemies, bullets;
let gameOver = false;
let sphereRadius;
let centerX, centerY, safeRadius;
let effects = []; // Array to hold active effects
let camera; // Add camera variable
let inputHandler; // Add input handler variable
let minimap; // Add minimap variable
let currentMap = 'default'; // Track current map
let characterManager; // Add character manager variable
let gameLoop; // Add game loop variable
let gameState; // Add game state variable

// Game constants
const WORLD_WIDTH = 1280 * 3;
const WORLD_HEIGHT = 720 * 3;
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;
const CAMERA_BUFFER = 200;
const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const MINIMAP_MARGIN = 10;
const SPHERE_SHRINK_RATE = 0.5;

// Create platforms array after centerX is initialized
let platforms = [];

function createPlatforms() {
    centerX = WORLD_WIDTH / 2;
    centerY = WORLD_HEIGHT / 2;
    
    // Get platform definitions from current map
    const platformDefs = maps[currentMap].createPlatforms(WORLD_WIDTH, WORLD_HEIGHT);
    
    // Convert platform definitions to Platform instances
    platforms = platformDefs.map(def => new Platform(def.x, def.y, def.width));
}

// Add map change handler
function changeMap(mapId) {
    if (!maps[mapId]) {
        console.error('Invalid map ID:', mapId);
        return;
    }
    
    currentMap = mapId;
    
    // Reset game state
    gameOver = false;
    document.getElementById('game-over').classList.add('hidden');
    
    // Initialize sphere radius
    sphereRadius = Math.min(canvas.width, canvas.height) * 3;
    
    // Initialize world center coordinates
    centerX = WORLD_WIDTH / 2;
    centerY = WORLD_HEIGHT / 2;
    safeRadius = sphereRadius * 0.7;
    
    // Create platforms
    createPlatforms();
    
    // Reset player position
    player.x = 200;
    player.y = WORLD_HEIGHT - 100;
    player.velocityX = 0;
    player.velocityY = 0;
    player.hearts = MAX_HEARTS;
    player.isDead = false;
    
    // Reset enemies to default positions
    enemies = [
        new Character(WORLD_WIDTH - 200, WORLD_HEIGHT - 100, 'red'),
        new Character(200, WORLD_HEIGHT - 100, 'green'),
        new Character(WORLD_WIDTH - 200, WORLD_HEIGHT - 100, 'purple')
    ];
    
    // Update character manager
    if (characterManager) {
        characterManager.enemies = enemies;
        characterManager.updateCharacterList();
    }
    
    // Clear bullets and effects
    bullets = [];
    effects = [];
    
    // Update map selector to reflect current map
    const mapSelect = document.getElementById('map-select');
    if (mapSelect) {
        mapSelect.value = currentMap;
    }
}

function updateAI(timeScale, deltaTime, gameState) {
    const DESIRED_ENEMY_SPACING = 200;
    const SPACING_FORCE = 1;
    const RANDOM_MOVEMENT_INTERVAL = 120;
    const AI_MOVE_SPEED = MOVE_SPEED * 0.6;
    const MOVEMENT_DEADZONE = 10;

    // Only update alive enemies
    const aliveEnemies = enemies.filter(enemy => !enemy.isDead);
    
    aliveEnemies.forEach(enemy => {
        // Always update enemy physics for all enemies
        enemy.update(timeScale, deltaTime, platforms, WORLD_WIDTH, WORLD_HEIGHT, sphereRadius, inputHandler.isKeyPressed.bind(inputHandler), endGame, DeathBurst, effects, gameState);
        
        // Only apply AI logic to non-player characters and if AI is enabled
        if (!enemy.isPlayer && debugControls.ai) {
            // Handle different personalities
            switch (enemy.personality || 'default') {
                case 'stationary':
                    // Stationary enemies only shoot, they don't move
                    enemy.velocityX = 0;
                    
                    // Find closest target for shooting
                    let stationaryTarget = player;
                    let stationaryDistance = Math.abs(player.x - enemy.x);
                    
                    aliveEnemies.forEach(otherEnemy => {
                        if (otherEnemy !== enemy) {
                            const distance = Math.abs(otherEnemy.x - enemy.x);
                            if (distance < stationaryDistance) {
                                stationaryDistance = distance;
                                stationaryTarget = otherEnemy;
                            }
                        }
                    });
                    
                    // Set direction based on target position
                    enemy.direction = stationaryTarget.x > enemy.x ? 1 : -1;
                    
                    // Shoot if target is in range
                    const stationaryHeightDiff = Math.abs(stationaryTarget.y - enemy.y);
                    if (stationaryHeightDiff < 50 && stationaryDistance < 400 && gameState.randomChance(0.05)) {
                        const bulletData = enemy.shoot(gameState);
                        if (bulletData) {
                            bullets.push(new Bullet(bulletData.x, bulletData.y, bulletData.direction, bulletData.owner));
                        }
                    }
                    break;
                    
                case 'default':
                default:
                    // Give each enemy a movement goal if they don't have one
                    if (!enemy.movementGoal) {
                        enemy.movementGoal = {
                            x: gameState.random() * WORLD_WIDTH,
                            y: gameState.random() * WORLD_HEIGHT,
                            timeLeft: RANDOM_MOVEMENT_INTERVAL
                        };
                    }

                    // Update movement goal timer
                    enemy.movementGoal.timeLeft--;
                    if (enemy.movementGoal.timeLeft <= 0 || 
                        (Math.abs(enemy.x - enemy.movementGoal.x) < 50 && Math.abs(enemy.y - enemy.movementGoal.y) < 50)) {
                        // Pick a new random position, handling case where there are no platforms
                        let newX, newY;
                        if (platforms.length > 0) {
                            const targetPlatform = platforms[Math.floor(gameState.random() * platforms.length)];
                            newX = targetPlatform.x + gameState.random() * targetPlatform.width;
                            newY = targetPlatform.y - 50 - gameState.random() * 50;
                        } else {
                            // If no platforms, move randomly along the ground
                            newX = gameState.random() * WORLD_WIDTH;
                            newY = WORLD_HEIGHT - 100; // Just above ground level
                        }
                        
                        enemy.movementGoal = {
                            x: newX,
                            y: newY,
                            timeLeft: RANDOM_MOVEMENT_INTERVAL
                        };
                    }

                    // Find closest target (can be player or other enemy)
                    let activeTarget = player;
                    let activeDistance = Math.abs(player.x - enemy.x);
                    
                    aliveEnemies.forEach(otherEnemy => {
                        if (otherEnemy !== enemy) {
                            const distance = Math.abs(otherEnemy.x - enemy.x);
                            if (distance < activeDistance) {
                                activeDistance = distance;
                                activeTarget = otherEnemy;
                            }
                        }
                    });

                    const activeHeightDiff = activeTarget.y - enemy.y;
                    
                    // Calculate repulsion from other enemies and threats
                    let avoidanceForceX = 0;
                    let avoidanceForceY = 0;

                    // Only do avoidance if enabled
                    if (debugControls.enemyAvoidance) {
                        // Avoid other enemies
                        aliveEnemies.forEach(otherEnemy => {
                            if (enemy !== otherEnemy) {
                                const dx = enemy.x - otherEnemy.x;
                                const dy = enemy.y - otherEnemy.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                
                                if (distance < DESIRED_ENEMY_SPACING) {
                                    avoidanceForceX += (dx / distance) * SPACING_FORCE;
                                    avoidanceForceY += (dy / distance) * SPACING_FORCE;
                                }
                            }
                        });
                        
                        // Avoid bullets
                        bullets.forEach(bullet => {
                            if (bullet.owner !== enemy) {
                                const dx = enemy.x - bullet.x;
                                const dy = enemy.y - bullet.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                
                                if (distance < 150) {
                                    avoidanceForceX += (dx / distance) * 2;
                                    avoidanceForceY += (dy / distance) * 2;
                                    
                                    // Emergency jump or rush if bullet is very close
                                    if (distance < 50 && gameState.randomChance(0.3)) {
                                        if (enemy.hasRush && gameState.randomChance(0.3)) {
                                            enemy.rush();
                                        } else if (!enemy.isJumping && gameState.randomChance(0.5)) {
                                            enemy.jump();
                                        }
                                    }
                                }
                            }
                        });
                    }

                    // Move towards movement goal while avoiding threats
                    if (!enemy.isRushing) {
                        const dx = enemy.movementGoal.x - enemy.x;
                        const dy = enemy.movementGoal.y - enemy.y;
                        
                        // Set direction based on movement
                        if (Math.abs(dx) > MOVEMENT_DEADZONE) {
                            if (dx > 0) {
                                enemy.direction = 1;
                            } else {
                                enemy.direction = -1;
                            }
                            // Only move if outside deadzone
                            enemy.velocityX = Math.sign(dx) * AI_MOVE_SPEED * timeScale + avoidanceForceX * 0.5;
                        } else {
                            enemy.velocityX = 0; // Stop if within deadzone
                        }
                        
                        // Jump if need to go up or dodge, with reduced frequency
                        if ((dy < -50 && !enemy.isJumping && gameState.randomChance(0.05)) ||
                            (Math.abs(avoidanceForceY) > 3 && gameState.randomChance(0.1))) {
                            if (enemy.hasDoubleJump && gameState.randomChance(0.2)) {
                                enemy.jump();
                            }
                        }
                    }

                    // Opportunistic shooting with slightly reduced frequency
                    const hasGoodShot = Math.abs(activeHeightDiff) < 50 && 
                                   activeDistance < 400 && 
                                   gameState.randomChance(0.05);

                    if (hasGoodShot && enemy.canShoot(gameState)) {
                        const bulletData = enemy.shoot(gameState);
                        if (bulletData) {
                            bullets.push(new Bullet(bulletData.x, bulletData.y, bulletData.direction, bulletData.owner));
                        }
                    }

                    // Opportunistic rushing with reduced frequency
                    const hasGoodRush = Math.abs(activeHeightDiff) < 50 && 
                                   activeDistance < 300 && 
                                   activeDistance > 100 && 
                                   enemy.hasRush &&
                                   gameState.randomChance(0.02);

                    if (hasGoodRush) {
                        enemy.rush();
                    }
                    break;
            }
        } else if (!enemy.isPlayer) {
            // When AI is disabled, just stop movement but keep physics
            enemy.velocityX = 0;
        }
    });
}

function endGame() {
    // Just show the game over screen, don't stop the game
    document.getElementById('game-over').classList.remove('hidden');
}

function restartGame() {
    initializeGame();
}

// Add restartGame to window object
window.restartGame = restartGame;

function render() {
    ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    ctx.save();
    
    // Apply camera transform
    camera.applyTransform(ctx);
    
    // Draw sphere if enabled
    if (debugControls.sphere) {
        ctx.beginPath();
        ctx.arc(WORLD_WIDTH/2, WORLD_HEIGHT/2, sphereRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
    }
    
    // Draw platforms
    platforms.forEach(platform => platform.draw(ctx));
    
    // Draw player if not dead
    if (!player.isDead) {
        player.draw(ctx);
    }
    
    // Draw enemies (only if they're alive)
    enemies.forEach(enemy => {
        if (!enemy.isDead) {
            enemy.draw(ctx);
        }
    });
    
    // Draw bullets
    bullets.forEach(bullet => bullet.draw(ctx));
    
    // Draw effects (including death bursts)
    effects.forEach(effect => effect.draw(ctx));
    
    ctx.restore();
    
    // UI updates
    healthDisplay.textContent = `❤️ ${player.hearts}`;
    
    // Draw FPS counter
    drawFPS(ctx, 110, 20);
    
    // Draw minimap if enabled
    if (debugControls.minimap) {
        minimap.draw(ctx, VIEWPORT_WIDTH, player, enemies, platforms, sphereRadius);
    }
}

function initializeGame() {
    // Store current map selection
    const previousMap = currentMap;
    
    // Reset game state
    gameOver = false;
    document.getElementById('game-over').classList.add('hidden');
    
    // Initialize game state with seed
    gameState = new GameState(INITIAL_SEED);
    
    // Initialize sphere radius
    sphereRadius = Math.min(canvas.width, canvas.height) * 3;
    
    // Initialize world center coordinates
    centerX = WORLD_WIDTH / 2;
    centerY = WORLD_HEIGHT / 2;
    safeRadius = sphereRadius * 0.7;
    
    // Restore previous map selection
    currentMap = previousMap;
    
    // Create platforms using current map
    createPlatforms();
    
    // Initialize camera
    camera = new Camera(VIEWPORT_WIDTH, VIEWPORT_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT);
    
    // Initialize minimap
    minimap = new Minimap(MINIMAP_WIDTH, MINIMAP_HEIGHT, MINIMAP_MARGIN, WORLD_WIDTH, WORLD_HEIGHT);
    
    // Spawn player in bottom-left corner
    player = new Character(
        200,
        WORLD_HEIGHT - 100,
        'blue',
        true
    );
    
    // Initialize input handler
    inputHandler = new InputHandler(player);
    
    // Initialize enemies array with spread out positions
    enemies = [
        new Character(WORLD_WIDTH - 400, WORLD_HEIGHT - 100, 'red'),      // Right side
        new Character(centerX, WORLD_HEIGHT - 100, 'green'),              // Center
        new Character(400, WORLD_HEIGHT - 100, 'purple')                  // Left side
    ];
    
    // Initialize character manager if not already initialized
    if (!characterManager) {
        characterManager = new CharacterManager(enemies, Character, WORLD_WIDTH, WORLD_HEIGHT, effects);
    } else {
        characterManager.enemies = enemies;  // Ensure reference is up to date
        characterManager.updateCharacterList();
    }
    
    // Update map selector to reflect current map
    const mapSelect = document.getElementById('map-select');
    if (mapSelect) {
        mapSelect.value = currentMap;
    }
    
    bullets = [];
    effects = [];
    
    // Initialize game loop
    gameLoop = new GameLoop({
        fixedUpdate: fixedUpdate,
        render: render
    });
    gameLoop.start();
}

function fixedUpdate(timeStep, gameState) {
    // Remove the gameOver check so the game continues running
    camera.update(player, enemies);
    
    // Update game objects
    // Only update player if they're not dead
    if (!player.isDead) {
        inputHandler.update(timeStep, player, bullets, Bullet, gameState);
    }
    player.update(timeStep, timeStep, platforms, WORLD_WIDTH, WORLD_HEIGHT, sphereRadius, inputHandler.isKeyPressed.bind(inputHandler), endGame, DeathBurst, effects, gameState);
    
    // Update and draw all enemies
    updateAI(timeStep, timeStep, gameState);
    
    // Update bullets with timeStep
    bullets = bullets.filter(bullet => {
        bullet.update(timeStep);
        
        // Remove bullets that are out of bounds
        if (bullet.x < 0 || bullet.x > WORLD_WIDTH) {
            return false;
        }
        
        // Check collisions if enabled
        if (debugControls.bulletCollision) {
            // Check player collision only if player is alive
            if (!player.isDead && bullet.checkCollision(player)) {
                console.log('Bullet hit player');
                // Only apply damage if not already flashing
                if (!player.isFlashing && player.takeDamage(gameState)) {
                    console.log('Player took damage, hearts:', player.hearts);
                    if (player.hearts <= 0) {
                        player.isDead = true;
                        effects.push(new DeathBurst(player.x + player.width/2, player.y + player.height/2, player.color, gameState));
                        endGame();
                    }
                    return false; // Remove bullet only if damage was dealt
                }
            }
            
            // Check enemy collisions
            for (const enemy of enemies) {
                if (bullet.checkCollision(enemy)) {
                    console.log('Bullet hit enemy:', enemy.color);
                    // Only apply damage if not already flashing
                    if (!enemy.isFlashing && enemy.takeDamage(gameState)) {
                        console.log('Enemy took damage, hearts:', enemy.hearts);
                        if (enemy.hearts <= 0 && !enemy.isDead) {
                            enemy.isDead = true;
                            effects.push(new DeathBurst(
                                enemy.x + enemy.width/2, 
                                enemy.y + enemy.height/2, 
                                enemy.color,
                                gameState
                            ));
                        }
                        return false; // Remove bullet only if damage was dealt
                    }
                }
            }
        }
        
        return true; // Keep bullet if no damage was dealt
    });
    
    // Update effects
    effects = effects.filter(effect => effect.update());
    
    // Remove dead enemies after their death animation completes
    enemies = enemies.filter(enemy => {
        if (enemy.isDead) {
            // Find the death effect for this enemy
            const deathEffect = effects.find(effect => {
                const matches = effect instanceof DeathBurst && 
                    Math.abs(effect.x - (enemy.x + enemy.width/2)) < 50 &&
                    Math.abs(effect.y - (enemy.y + enemy.height/2)) < 50;
                return matches;
            });
            const keepEnemy = deathEffect && deathEffect.particles.length > 0;
            if (!keepEnemy) {
                characterManager.updateCharacterList();
            }
            return keepEnemy;
        }
        return true;
    });
    
    // Ensure enemies array is synced with character manager
    if (characterManager.enemies !== enemies) {
        characterManager.enemies = enemies;
    }
    
    // Update sphere radius only if sphere is enabled
    if (debugControls.sphere) {
        sphereRadius = Math.max(100, sphereRadius - SPHERE_SHRINK_RATE * timeStep);
    }
}

// Update window.onload
window.onload = function() {
    // Initialize canvas and context
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    healthDisplay = document.getElementById('health-display');
    
    // Set canvas size
    canvas.width = 1280;
    canvas.height = 720;
    
    // Initialize debug controls
    initializeDebugControls();
    
    // Add map selection handler
    const mapSelect = document.getElementById('map-select');
    mapSelect.addEventListener('change', (e) => {
        changeMap(e.target.value);
        e.target.blur();  // Remove focus
    });
    
    // Prevent keyboard events from affecting map select
    mapSelect.addEventListener('keydown', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    // Add reset button handler
    document.getElementById('reset-button').addEventListener('click', (e) => {
        initializeGame();
        e.target.blur();  // Remove focus
    });
    
    // Prevent spacebar from triggering the add character button
    document.getElementById('add-character').addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    // Add keyboard shortcut for reset
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            initializeGame();
            // Also blur any active element to prevent spacebar from triggering buttons
            if (document.activeElement) {
                document.activeElement.blur();
            }
        }
    });
    
    // Prevent spacebar from scrolling the page
    window.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
        }
    });
    
    // Wait for sprite to load before starting game
    if (characterSprite.complete) {
        initializeGame();
    } else {
        characterSprite.onload = initializeGame;
    }
}; 