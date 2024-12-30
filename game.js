// Initialize variables at the top
let canvas, ctx, healthDisplay;
let player, enemies, bullets;
let gameOver = false;
let sphereRadius;
let cameraX = 0;
let cameraY = 0;
let centerX, centerY, safeRadius;

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -10.2;
const HOLD_JUMP_FORCE = -0.425;
const MAX_JUMP_TIME = 20;
const MOVE_SPEED = 5;
const RUSH_SPEED = 10;
const RUSH_DURATION = 25;
const BULLET_SPEED = 12.75;
const MAX_HEARTS = 5;
const SHOOT_COOLDOWN = 250;
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
let frameCount = 0;
let lastFpsTime = Date.now();
let currentFps = 0;
let frameTime = 0;
let lastFrameTime = 0;
const TARGET_FRAME_TIME = 1000/60;

// Add debug control variables
const debugControls = {
    ai: true,
    minimap: true,
    sphere: true,
    platformCollision: true,
    bulletCollision: true,
    enemyAvoidance: true,
    debugBounds: true
};

// Add event listeners for debug controls
document.getElementById('toggle-ai').addEventListener('change', (e) => {
    debugControls.ai = e.target.checked;
});
document.getElementById('toggle-minimap').addEventListener('change', (e) => {
    debugControls.minimap = e.target.checked;
});
document.getElementById('toggle-sphere').addEventListener('change', (e) => {
    debugControls.sphere = e.target.checked;
});
document.getElementById('toggle-platform-collision').addEventListener('change', (e) => {
    debugControls.platformCollision = e.target.checked;
});
document.getElementById('toggle-bullet-collision').addEventListener('change', (e) => {
    debugControls.bulletCollision = e.target.checked;
});
document.getElementById('toggle-enemy-avoidance').addEventListener('change', (e) => {
    debugControls.enemyAvoidance = e.target.checked;
});
document.getElementById('toggle-debug-bounds').addEventListener('change', (e) => {
    debugControls.debugBounds = e.target.checked;
});

// Add this function to calculate FPS
function calculateFPS() {
    frameCount++;
    const currentTime = Date.now();
    const timeDiff = currentTime - lastFpsTime;
    
    // Update FPS every second
    if (timeDiff >= 1000) {
        currentFps = Math.round((frameCount * 1000) / timeDiff);
        frameCount = 0;
        lastFpsTime = currentTime;
    }
}

// Add this function to handle camera movement
function updateCamera() {
    // Calculate where the camera should try to be (centered on player)
    const targetX = player.x - VIEWPORT_WIDTH/2;
    const targetY = player.y - VIEWPORT_HEIGHT/2;
    
    // Only move camera when player is near the edges
    if (player.x - cameraX < CAMERA_BUFFER) {
        cameraX = player.x - CAMERA_BUFFER;
    } else if (player.x - cameraX > VIEWPORT_WIDTH - CAMERA_BUFFER) {
        cameraX = player.x - (VIEWPORT_WIDTH - CAMERA_BUFFER);
    }
    
    if (player.y - cameraY < CAMERA_BUFFER) {
        cameraY = player.y - CAMERA_BUFFER;
    } else if (player.y - cameraY > VIEWPORT_HEIGHT - CAMERA_BUFFER) {
        cameraY = player.y - (VIEWPORT_HEIGHT - CAMERA_BUFFER);
    }
    
    // Clamp camera to world bounds
    cameraX = Math.max(0, Math.min(cameraX, WORLD_WIDTH - VIEWPORT_WIDTH));
    cameraY = Math.max(0, Math.min(cameraY, WORLD_HEIGHT - VIEWPORT_HEIGHT));
}

class Character {
    constructor(x, y, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.color = color;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.hasDoubleJump = true;
        this.hasRush = true;
        this.isRushing = false;
        this.rushTimeLeft = 0;
        this.jumpHoldTime = 0;
        this.hearts = MAX_HEARTS;
        this.isPlayer = isPlayer;
        this.direction = 1;
        this.lastDamageTime = 0;
        this.damageInterval = 1000;
        this.lastShootTime = 0;
        this.rushVelocityY = 0;
        this.isFlashing = false;
        this.flashTimeLeft = 0;
        this.FLASH_DURATION = 300;
    }

    canShoot() {
        return Date.now() - this.lastShootTime >= SHOOT_COOLDOWN;
    }

    takeDamage() {
        const currentTime = Date.now();
        // Only take damage if not flashing (invulnerable)
        if (!this.isFlashing && currentTime - this.lastDamageTime >= this.damageInterval) {
            this.hearts--;
            this.isFlashing = true;
            this.flashTimeLeft = this.FLASH_DURATION;
            this.lastDamageTime = currentTime;  // Update last damage time
            return true;
        }
        return false;
    }

    update(timeScale, deltaTime) {
        // Add debug logging for flash timing
        if (this.isFlashing) {
            this.flashTimeLeft -= deltaTime;
            console.log(`Flash time left for ${this.isPlayer ? 'player' : 'enemy'}: ${this.flashTimeLeft}`);
            if (this.flashTimeLeft <= 0) {
                console.log(`Flash ended for ${this.isPlayer ? 'player' : 'enemy'}`);
                this.isFlashing = false;
                this.flashTimeLeft = 0;
            }
        }

        if (!this.isRushing) {
            this.velocityY += GRAVITY * timeScale;
        }

        if (!this.isRushing && this.velocityY > 15) {
            this.velocityY = 15;
        }

        if (this.isRushing) {
            this.rushTimeLeft -= timeScale;
            if (this.rushTimeLeft <= 0) {
                this.isRushing = false;
                this.velocityX = this.direction * MOVE_SPEED;
                this.velocityY = this.rushVelocityY;
            }
        }

        if (this.isJumping && this.jumpHoldTime < MAX_JUMP_TIME && keys[' ']) {
            this.velocityY += HOLD_JUMP_FORCE * timeScale;
            this.jumpHoldTime++;
        }

        const previousY = this.y;
        this.y += this.velocityY * timeScale;
        this.x += this.velocityX * timeScale;

        // Platform collision
        if (debugControls.platformCollision) {
            for (const platform of platforms) {
                if (this.velocityY >= 0 && 
                    previousY + this.height <= platform.y && 
                    this.x + this.width > platform.x && 
                    this.x < platform.x + platform.width &&
                    this.y + this.height > platform.y &&
                    this.y < platform.y + platform.height) {
                    
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.isJumping = false;
                    this.hasDoubleJump = true;
                    this.hasRush = true;
                    this.jumpHoldTime = 0;
                }
            }
        }

        // Floor collision - use WORLD_HEIGHT instead of canvas.height
        if (this.y + this.height > WORLD_HEIGHT) {
            this.y = WORLD_HEIGHT - this.height;
            this.velocityY = 0;
            this.isJumping = false;
            this.hasDoubleJump = true;
            this.hasRush = true;
            this.jumpHoldTime = 0;
        }

        // Wall collision with world bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > WORLD_WIDTH) this.x = WORLD_WIDTH - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > WORLD_HEIGHT) this.y = WORLD_HEIGHT - this.height;

        // Check if character is outside the sphere
        const distanceFromCenter = Math.sqrt(
            Math.pow(this.x + this.width/2 - WORLD_WIDTH/2, 2) +
            Math.pow(this.y + this.height/2 - WORLD_HEIGHT/2, 2)
        );
        
        const currentTime = Date.now();
        if (distanceFromCenter > sphereRadius && 
            currentTime - this.lastDamageTime >= this.damageInterval) {
            if (this.takeDamage()) {
                if (this.hearts <= 0 && this.isPlayer) {
                    endGame();
                }
            }
        }
    }

    draw() {
        // Add a visual effect when rushing
        if (this.isRushing) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(this.x - this.direction * 20, this.y, 20, this.height);
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 10;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
        
        // Draw character body with flash effect
        ctx.fillStyle = this.isFlashing ? 'white' : this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw direction indicator (triangle)
        const triangleSize = 15;
        ctx.beginPath();
        if (this.direction > 0) {
            // Facing right
            ctx.moveTo(this.x + this.width, this.y + this.height/2);
            ctx.lineTo(this.x + this.width - triangleSize, this.y + this.height/2 - triangleSize);
            ctx.lineTo(this.x + this.width - triangleSize, this.y + this.height/2 + triangleSize);
        } else {
            // Facing left
            ctx.moveTo(this.x, this.y + this.height/2);
            ctx.lineTo(this.x + triangleSize, this.y + this.height/2 - triangleSize);
            ctx.lineTo(this.x + triangleSize, this.y + this.height/2 + triangleSize);
        }
        ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.fill();
        
        // Reset shadow after drawing character
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // Draw hearts
        for (let i = 0; i < this.hearts; i++) {
            ctx.fillStyle = 'red';
            ctx.fillText('♥', this.x + (i * 15), this.y - 10);
        }
    }

    jump() {
        if (!this.isJumping) {
            // First jump
            this.velocityY = JUMP_FORCE;
            this.isJumping = true;
            this.jumpHoldTime = 0;
        } else if (this.hasDoubleJump) {
            // Double jump
            this.velocityY = JUMP_FORCE * 0.8; // Slightly weaker double jump
            this.hasDoubleJump = false;
            this.jumpHoldTime = 0;
        }
    }

    shoot() {
        if (this.canShoot()) {
            this.lastShootTime = Date.now();
            return new Bullet(
                this.x + this.width/2,
                this.y + this.height/2,
                this.direction * BULLET_SPEED,
                this
            );
        }
        return null;
    }

    rush() {
        if (this.hasRush) {
            this.isRushing = true;
            this.rushTimeLeft = RUSH_DURATION;
            this.hasRush = false;
            // Store current vertical velocity
            this.rushVelocityY = this.velocityY;
            // Set velocities for rush
            this.velocityX = this.direction * RUSH_SPEED;
            this.velocityY = 0; // Zero vertical velocity during rush
        }
    }
}

class Bullet {
    constructor(x, y, velocityX, owner) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.velocityX = velocityX;
        this.owner = owner;
    }

    update(timeScale) {
        this.x += this.velocityX * timeScale;
    }

    draw() {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }

    checkCollision(character) {
        // Don't damage the character that shot this bullet or characters that are rushing
        if (character === this.owner || character.isRushing) {
            return false;
        }

        // Adjust collision detection for circular bullets
        const bulletLeft = this.x - this.radius;
        const bulletRight = this.x + this.radius;
        const bulletTop = this.y - this.radius;
        const bulletBottom = this.y + this.radius;

        return bulletRight > character.x &&
               bulletLeft < character.x + character.width &&
               bulletBottom > character.y &&
               bulletTop < character.y + character.height;
    }
}

class Platform {
    constructor(x, y, width) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 15;
    }

    draw() {
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

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

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') {  // Spacebar for jumping
        player.jump();
    }
    if (e.key === 'k' || e.key === 'K') {
        player.rush();
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    // Cut jump short if spacebar is released
    if (e.key === ' ' && player.velocityY < 0) {
        player.velocityY *= 0.5;
    }
});

function updatePlayer(timeScale) {
    if (!player.isRushing) {
        if (keys['a'] || keys['A']) {
            player.velocityX = -MOVE_SPEED * timeScale;
            player.direction = -1;
        } else if (keys['d'] || keys['D']) {
            player.velocityX = MOVE_SPEED * timeScale;
            player.direction = 1;
        } else {
            player.velocityX = 0;
        }
    }

    // Handle continuous shooting with O key
    if ((keys['o'] || keys['O']) && player.canShoot()) {
        const bullet = player.shoot();
        if (bullet) {
            bullets.push(bullet);
        }
    }
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
            const bullet = enemy.shoot();
            if (bullet) bullets.push(bullet);
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
        enemy.update(timeScale, deltaTime);
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

function drawMinimap() {
    const mapX = VIEWPORT_WIDTH - MINIMAP_WIDTH - MINIMAP_MARGIN;
    const mapY = MINIMAP_MARGIN;
    
    // Draw minimap background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(mapX, mapY, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    
    // Draw minimap border
    ctx.strokeStyle = 'white';
    ctx.strokeRect(mapX, mapY, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    
    // Calculate scale factors
    const scaleX = MINIMAP_WIDTH / WORLD_WIDTH;
    const scaleY = MINIMAP_HEIGHT / WORLD_HEIGHT;
    
    // Draw platforms
    ctx.fillStyle = '#666';
    platforms.forEach(platform => {
        ctx.fillRect(
            mapX + platform.x * scaleX,
            mapY + platform.y * scaleY,
            platform.width * scaleX,
            platform.height * scaleY
        );
    });
    
    // Draw player (blue square)
    const playerSize = 4;
    ctx.fillStyle = 'blue';
    ctx.fillRect(
        mapX + player.x * scaleX,
        mapY + player.y * scaleY,
        playerSize,
        playerSize
    );
    
    // Draw enemies (colored squares)
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(
            mapX + enemy.x * scaleX,
            mapY + enemy.y * scaleY,
            playerSize,
            playerSize
        );
    });
    
    // Draw sphere boundary
    ctx.beginPath();
    ctx.arc(
        mapX + (WORLD_WIDTH/2) * scaleX,
        mapY + (WORLD_HEIGHT/2) * scaleY,
        sphereRadius * scaleX,
        0,
        Math.PI * 2
    );
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.stroke();
}

// Add performance monitoring variables
const performanceMetrics = {
    update: 0,
    draw: 0,
    ai: 0,
    bullets: 0,
    total: 0
};

function gameLoop(timestamp) {
    // Calculate delta time
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaTime = timestamp - lastFrameTime;
    const timeScale = deltaTime / TARGET_FRAME_TIME;
    lastFrameTime = timestamp;
    
    if (!gameOver) {
        updateCamera();
        ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
        ctx.save();
        ctx.translate(-cameraX, -cameraY);
        
        // Draw sphere
        if (debugControls.sphere) {
            ctx.beginPath();
            ctx.arc(WORLD_WIDTH/2, WORLD_HEIGHT/2, sphereRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.stroke();
            sphereRadius = Math.max(100, sphereRadius - SPHERE_SHRINK_RATE * timeScale);
        }
        
        // Draw platforms
        platforms.forEach(platform => platform.draw());
        
        // Update game objects
        updatePlayer(timeScale);
        player.update(timeScale, deltaTime);
        player.draw();
        
        updateAI(timeScale, deltaTime);
        enemies.forEach(enemy => {
            enemy.update(timeScale, deltaTime);
            enemy.draw();
        });
        
        // Update bullets with timeScale
        bullets = bullets.filter(bullet => {
            bullet.update(timeScale);
            bullet.draw();
            
            let hit = false;
            if (debugControls.bulletCollision) {
                if (bullet.checkCollision(player)) {
                    if (player.takeDamage()) {
                        hit = true;
                        if (player.hearts <= 0) {
                            endGame();
                        }
                    }
                }
                
                enemies.forEach((enemy, index) => {
                    if (bullet.checkCollision(enemy)) {
                        if (enemy.takeDamage()) {
                            hit = true;
                            if (enemy.hearts <= 0) {
                                enemies.splice(index, 1);
                            }
                        }
                    }
                });
            }
            
            return !hit && bullet.x > 0 && bullet.x < WORLD_WIDTH;
        });
        
        ctx.restore();
        
        // UI updates
        healthDisplay.textContent = `❤️ ${player.hearts}`;
        calculateFPS();
        
        // Draw FPS counter
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`FPS: ${currentFps}`, 110, 20);
        
        // Draw minimap if enabled
        if (debugControls.minimap) {
            drawMinimap();
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Move initialization into a function
function initializeGame() {
    // Initialize sphere radius (reduced from 9x to 4x)
    sphereRadius = Math.min(canvas.width, canvas.height) * 3;
    
    // Initialize world center coordinates
    centerX = WORLD_WIDTH / 2;
    centerY = WORLD_HEIGHT / 2;
    safeRadius = sphereRadius * 0.7;
    
    // Create platforms
    createPlatforms();
    
    // Spawn player in bottom-left corner
    player = new Character(
        200,
        WORLD_HEIGHT - 100,
        'blue',
        true
    );
    
    // Spawn enemies in other corners
    enemies = [
        new Character(WORLD_WIDTH - 200, 200, 'red'),
        new Character(200, 200, 'green'),
        new Character(WORLD_WIDTH - 200, WORLD_HEIGHT - 100, 'purple')
    ];
    
    bullets = [];
    
    // Make sure game-over is hidden at start
    document.getElementById('game-over').classList.add('hidden');
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
    
    // Initialize game objects
    initializeGame();
    
    // Start the game loop with timestamp
    requestAnimationFrame(gameLoop);
}; 