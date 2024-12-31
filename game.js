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

// Game state
let lastFrameTime = 0;
const TARGET_FRAME_TIME = 1000/60;

// Create platforms array after centerX is initialized
let platforms = [];

function createPlatforms() {
    centerX = WORLD_WIDTH / 2;
    centerY = WORLD_HEIGHT / 2;
    
    platforms = [
        // Bottom left corner area
        new Platform(100, WORLD_HEIGHT - 200, 300),
        new Platform(500, WORLD_HEIGHT - 300, 300),
        new Platform(200, WORLD_HEIGHT - 400, 300),
        new Platform(400, WORLD_HEIGHT - 500, 300),
        new Platform(100, WORLD_HEIGHT - 600, 300),
        
        // Bottom right corner area
        new Platform(WORLD_WIDTH - 400, WORLD_HEIGHT - 200, 300),
        new Platform(WORLD_WIDTH - 800, WORLD_HEIGHT - 300, 300),
        new Platform(WORLD_WIDTH - 500, WORLD_HEIGHT - 400, 300),
        new Platform(WORLD_WIDTH - 300, WORLD_HEIGHT - 500, 300),
        new Platform(WORLD_WIDTH - 600, WORLD_HEIGHT - 600, 300),
        
        // Top left corner area
        new Platform(100, 200, 300),
        new Platform(500, 300, 300),
        new Platform(200, 400, 300),
        new Platform(400, 500, 300),
        new Platform(100, 600, 300),
        
        // Top right corner area
        new Platform(WORLD_WIDTH - 400, 200, 300),
        new Platform(WORLD_WIDTH - 800, 300, 300),
        new Platform(WORLD_WIDTH - 500, 400, 300),
        new Platform(WORLD_WIDTH - 300, 500, 300),
        new Platform(WORLD_WIDTH - 600, 600, 300),
        
        // Center area platforms - create a dense center area
        new Platform(centerX - 400, centerY, 300),
        new Platform(centerX + 100, centerY, 300),
        new Platform(centerX - 150, centerY - 200, 300),
        new Platform(centerX - 150, centerY + 200, 300),
        new Platform(centerX - 300, centerY - 100, 300),
        new Platform(centerX + 300, centerY + 100, 300),
        
        // Mid-level connecting platforms
        new Platform(centerX - 800, centerY - 100, 300),
        new Platform(centerX + 500, centerY - 100, 300),
        new Platform(centerX - 800, centerY + 100, 300),
        new Platform(centerX + 500, centerY + 100, 300),
        new Platform(centerX - 600, centerY, 300),
        new Platform(centerX + 600, centerY, 300),
        
        // Additional vertical movement platforms
        new Platform(centerX - 600, centerY - 300, 200),
        new Platform(centerX + 400, centerY - 300, 200),
        new Platform(centerX - 600, centerY + 300, 200),
        new Platform(centerX + 400, centerY + 300, 200),
        new Platform(centerX - 200, centerY - 400, 200),
        new Platform(centerX + 200, centerY + 400, 200),
        
        // Small platforms for precise jumping
        new Platform(centerX - 300, centerY - 250, 100),
        new Platform(centerX + 300, centerY + 250, 100),
        new Platform(centerX, centerY - 350, 100),
        new Platform(centerX, centerY + 350, 100),
        
        // Diagonal paths
        new Platform(centerX - 400, centerY - 400, 200),
        new Platform(centerX + 400, centerY + 400, 200),
        new Platform(centerX - 200, centerY - 200, 200),
        new Platform(centerX + 200, centerY + 200, 200),
        
        // High platforms for vertical gameplay
        new Platform(centerX - 100, 150, 200),
        new Platform(centerX + 100, 150, 200),
        new Platform(centerX - 100, WORLD_HEIGHT - 150, 200),
        new Platform(centerX + 100, WORLD_HEIGHT - 150, 200)
    ];
}

function updateAI(timeScale, deltaTime) {
    if (!debugControls.ai) return;
    
    const DESIRED_ENEMY_SPACING = 200;
    const SPACING_FORCE = 1;
    const RANDOM_MOVEMENT_INTERVAL = 120;
    const AI_MOVE_SPEED = MOVE_SPEED * 0.6;
    const MOVEMENT_DEADZONE = 10;

    enemies.forEach(enemy => {
        // Give each enemy a movement goal if they don't have one
        if (!enemy.movementGoal) {
            enemy.movementGoal = {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                timeLeft: RANDOM_MOVEMENT_INTERVAL
            };
        }

        // Update movement goal timer
        enemy.movementGoal.timeLeft--;
        if (enemy.movementGoal.timeLeft <= 0 || 
            (Math.abs(enemy.x - enemy.movementGoal.x) < 50 && Math.abs(enemy.y - enemy.movementGoal.y) < 50)) {
            // Pick a new random position, favoring platforms and avoiding edges
            const targetPlatform = platforms[Math.floor(Math.random() * platforms.length)];
            enemy.movementGoal = {
                x: targetPlatform.x + Math.random() * targetPlatform.width,
                y: targetPlatform.y - 50 - Math.random() * 50,
                timeLeft: RANDOM_MOVEMENT_INTERVAL
            };
        }

        // Find closest target (can be player or other enemy)
        let closestTarget = player;
        let closestDistance = Math.abs(player.x - enemy.x);
        
        enemies.forEach(otherEnemy => {
            if (otherEnemy !== enemy) {
                const distance = Math.abs(otherEnemy.x - enemy.x);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTarget = otherEnemy;
                }
            }
        });

        const heightDiff = closestTarget.y - enemy.y;
        
        // Calculate repulsion from other enemies and threats
        let avoidanceForceX = 0;
        let avoidanceForceY = 0;

        // Only do avoidance if enabled
        if (debugControls.enemyAvoidance) {
            // Avoid other enemies
            enemies.forEach(otherEnemy => {
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
                        if (distance < 50 && Math.random() < 0.3) {
                            if (enemy.hasRush && Math.random() < 0.3) {
                                enemy.rush();
                            } else if (!enemy.isJumping && Math.random() < 0.5) {
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
            if ((dy < -50 && !enemy.isJumping && Math.random() < 0.05) ||
                (Math.abs(avoidanceForceY) > 3 && Math.random() < 0.1)) {
                if (enemy.hasDoubleJump && Math.random() < 0.2) {
                    enemy.jump();
                }
            }
        }

        // Opportunistic shooting with slightly reduced frequency
        const hasGoodShot = Math.abs(heightDiff) < 50 && 
                           closestDistance < 400 && 
                           Math.random() < 0.05;

        if (hasGoodShot && enemy.canShoot()) {
            const bulletData = enemy.shoot();
            if (bulletData) {
                bullets.push(new Bullet(bulletData.x, bulletData.y, bulletData.direction, bulletData.owner));
            }
        }

        // Opportunistic rushing with reduced frequency
        const hasGoodRush = Math.abs(heightDiff) < 50 && 
                           closestDistance < 300 && 
                           closestDistance > 100 && 
                           enemy.hasRush &&
                           Math.random() < 0.02;

        if (hasGoodRush) {
            enemy.rush();
        }

        // Update enemy physics
        enemy.update(timeScale, deltaTime, platforms, WORLD_WIDTH, WORLD_HEIGHT, sphereRadius, inputHandler.isKeyPressed.bind(inputHandler), endGame);
    });
}

function endGame() {
    gameOver = true;
    document.getElementById('game-over').classList.remove('hidden');
}

function restartGame() {
    gameOver = false;
    document.getElementById('game-over').classList.add('hidden');
    
    // Reset player
    player.x = centerX - safeRadius/2;
    player.y = canvas.height - 100;
    player.hearts = MAX_HEARTS;
    player.velocityX = 0;
    player.velocityY = 0;
    
    // Reset enemies array with new enemy instances
    enemies.length = 0; // Clear the array
    enemies.push(
        new Character(centerX + safeRadius/2, canvas.height - 100, 'red'),
        new Character(centerX, canvas.height - 200, 'green'),
        new Character(centerX + safeRadius/3, canvas.height - 100, 'purple')
    );
    
    // Reset sphere
    sphereRadius = Math.min(canvas.width, canvas.height) * 9;  // 9x bigger
    
    // Clear bullets
    bullets = [];
}

// Add restartGame to window object
window.restartGame = restartGame;

function gameLoop(timestamp) {
    // Calculate delta time
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaTime = timestamp - lastFrameTime;
    const timeScale = deltaTime / TARGET_FRAME_TIME;
    lastFrameTime = timestamp;
    
    if (!gameOver) {
        camera.update(player, enemies);
        ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
        ctx.save();
        
        // Apply camera transform
        camera.applyTransform(ctx);
        
        // Draw sphere
        if (debugControls.sphere) {
            ctx.beginPath();
            ctx.arc(WORLD_WIDTH/2, WORLD_HEIGHT/2, sphereRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.stroke();
            sphereRadius = Math.max(100, sphereRadius - SPHERE_SHRINK_RATE * timeScale);
        }
        
        // Draw platforms
        platforms.forEach(platform => platform.draw(ctx));
        
        // Update and draw effects first
        effects = effects.filter(effect => {
            effect.update();
            effect.draw(ctx);
            const isAlive = effect.particles.length > 0;
            if (!isAlive) {
                console.log('Effect removed - no particles left');
            }
            return isAlive;
        });
        
        // Update game objects
        inputHandler.update(timeScale, player, bullets, Bullet);  // Update input
        player.update(timeScale, deltaTime, platforms, WORLD_WIDTH, WORLD_HEIGHT, sphereRadius, inputHandler.isKeyPressed.bind(inputHandler), endGame);
        if (!player.isDead) {
            player.draw(ctx);
        }
        
        updateAI(timeScale, deltaTime);
        enemies.forEach(enemy => {
            enemy.update(timeScale, deltaTime, platforms, WORLD_WIDTH, WORLD_HEIGHT, sphereRadius, inputHandler.isKeyPressed.bind(inputHandler), endGame);
            
            // Only hide the character if they're dead AND their death effect is gone
            const deathEffect = enemy.isDead ? effects.find(effect => {
                const matches = effect instanceof DeathBurst && 
                    Math.abs(effect.x - (enemy.x + enemy.width/2)) < 50 &&
                    Math.abs(effect.y - (enemy.y + enemy.height/2)) < 50;
                if (enemy.isDead && matches) {
                    console.log('Found matching death effect, particles:', effect.particles.length);
                }
                return matches;
            }) : null;
            
            const shouldDraw = !enemy.isDead || (deathEffect && deathEffect.particles.length > 0);
            if (enemy.isDead) {
                console.log('Enemy is dead, shouldDraw:', shouldDraw, 
                    'hasDeathEffect:', !!deathEffect, 
                    'particleCount:', deathEffect?.particles.length || 0);
            }
            if (shouldDraw) {
                enemy.draw(ctx);
            }
        });
        
        // Update bullets with timeScale
        bullets = bullets.filter(bullet => {
            bullet.update(timeScale);
            bullet.draw(ctx);
            
            let hit = false;
            if (debugControls.bulletCollision) {
                if (bullet.checkCollision(player)) {
                    if (player.takeDamage()) {
                        hit = true;
                        if (player.hearts <= 0) {
                            player.isDead = true;
                            effects.push(new DeathBurst(player.x + player.width/2, player.y + player.height/2, player.color));
                            endGame();
                        }
                    }
                }
                
                enemies.forEach((enemy, index) => {
                    if (bullet.checkCollision(enemy)) {
                        console.log('Processing bullet collision with enemy:', enemy.color);
                        if (enemy.takeDamage()) {
                            hit = true;
                            if (enemy.hearts <= 0 && !enemy.isDead) {
                                console.log('Enemy died:', enemy.color);
                                enemy.isDead = true;
                                console.log('Creating death effect at:', enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                                effects.push(new DeathBurst(
                                    enemy.x + enemy.width/2, 
                                    enemy.y + enemy.height/2, 
                                    enemy.color
                                ));
                                console.log('Effects array length after adding:', effects.length);
                            }
                        }
                    }
                });
            }
            
            return !hit && bullet.x > 0 && bullet.x < WORLD_WIDTH;
        });
        
        // Remove dead enemies after their death animation completes
        const beforeFilterCount = enemies.length;
        enemies = enemies.filter(enemy => {
            if (enemy.isDead) {
                console.log('Checking dead enemy:', enemy.color);
                // Find the death effect for this enemy
                const deathEffect = effects.find(effect => {
                    const matches = effect instanceof DeathBurst && 
                        Math.abs(effect.x - (enemy.x + enemy.width/2)) < 50 &&
                        Math.abs(effect.y - (enemy.y + enemy.height/2)) < 50;
                    if (matches) {
                        console.log('Found matching death effect for', enemy.color, 'with', effect.particles.length, 'particles');
                    }
                    return matches;
                });
                const keepEnemy = deathEffect && deathEffect.particles.length > 0;
                console.log('Decision for', enemy.color, '- Keep enemy:', keepEnemy);
                return keepEnemy;
            }
            return true;
        });
        if (beforeFilterCount !== enemies.length) {
            console.log('Enemies filtered from', beforeFilterCount, 'to', enemies.length);
        }
        
        ctx.restore();
        
        // UI updates
        healthDisplay.textContent = `❤️ ${player.hearts}`;
        const fps = calculateFPS();
        
        // Draw FPS counter
        drawFPS(ctx, 110, 20);
        
        // Draw minimap if enabled
        if (debugControls.minimap) {
            minimap.draw(ctx, VIEWPORT_WIDTH, player, enemies, platforms, sphereRadius);
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Update initialization
function initializeGame() {
    // Initialize sphere radius (reduced from 9x to 4x)
    sphereRadius = Math.min(canvas.width, canvas.height) * 3;
    
    // Initialize world center coordinates
    centerX = WORLD_WIDTH / 2;
    centerY = WORLD_HEIGHT / 2;
    safeRadius = sphereRadius * 0.7;
    
    // Create platforms
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
    
    // Spawn enemies in other corners
    enemies = [
        new Character(WORLD_WIDTH - 200, 200, 'red'),
        new Character(200, 200, 'green'),
        new Character(WORLD_WIDTH - 200, WORLD_HEIGHT - 100, 'purple')
    ];
    
    bullets = [];
    effects = []; // Initialize effects array
    
    // Make sure game-over is hidden at start
    document.getElementById('game-over').classList.add('hidden');
}

// Update window.onload
window.onload = function() {
    console.log('Game starting...');
    
    // Initialize canvas and context
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    healthDisplay = document.getElementById('health-display');
    
    // Set canvas size
    canvas.width = 1280;
    canvas.height = 720;
    
    // Initialize debug controls
    initializeDebugControls();
    
    // Initialize game objects
    initializeGame();
    
    // Start the game loop with timestamp
    requestAnimationFrame(gameLoop);
}; 