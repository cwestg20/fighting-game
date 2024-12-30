const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const healthDisplay = document.getElementById('health-display');

// Set canvas size
canvas.width = 1280;
canvas.height = 720;

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -10.2;
const HOLD_JUMP_FORCE = -0.425;
const MAX_JUMP_TIME = 20;
const MOVE_SPEED = 5;
const RUSH_SPEED = 10;
const RUSH_DURATION = 25; // frames
const BULLET_SPEED = 12.75;
const MAX_HEARTS = 5;
const SHOOT_COOLDOWN = 250; // Cooldown between shots in milliseconds

// Game state
let gameOver = false;
let sphereRadius = Math.min(canvas.width, canvas.height);
const sphereShrinkRate = 0.1;

// Make sure game-over is hidden at start
document.getElementById('game-over').classList.add('hidden');

// Add near the top with other game variables
let frameCount = 0;
let lastFpsTime = Date.now();
let currentFps = 0;

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
        this.rushVelocityY = 0; // Store vertical velocity at start of rush
        this.isFlashing = false;
        this.flashTimeLeft = 0;
        this.FLASH_DURATION = 500; // 500ms of invulnerability
    }

    canShoot() {
        return Date.now() - this.lastShootTime >= SHOOT_COOLDOWN;
    }

    takeDamage() {
        const currentTime = Date.now();
        // Only take damage if not flashing (invulnerable)
        if (!this.isFlashing) {
            this.hearts--;
            this.isFlashing = true;
            this.flashTimeLeft = this.FLASH_DURATION;
            return true;
        }
        return false;
    }

    update() {
        // Update flash state
        if (this.isFlashing) {
            this.flashTimeLeft -= 16.67; // Approximate time per frame at 60fps
            if (this.flashTimeLeft <= 0) {
                this.isFlashing = false;
            }
        }

        // Only apply gravity when not rushing
        if (!this.isRushing) {
            this.velocityY += GRAVITY;
        }

        // Cap fall speed (only when not rushing)
        if (!this.isRushing && this.velocityY > 15) {
            this.velocityY = 15;
        }

        // Handle rush movement
        if (this.isRushing) {
            this.rushTimeLeft--;
            if (this.rushTimeLeft <= 0) {
                this.isRushing = false;
                // Restore normal horizontal velocity
                this.velocityX = this.direction * MOVE_SPEED;
                // Restore vertical velocity
                this.velocityY = this.rushVelocityY;
            }
        }

        // Apply continued jump force if holding jump
        if (this.isJumping && this.jumpHoldTime < MAX_JUMP_TIME && keys[' ']) {
            this.velocityY += HOLD_JUMP_FORCE;
            this.jumpHoldTime++;
        }

        // Store previous position for collision handling
        const previousY = this.y;

        this.y += this.velocityY;
        this.x += this.velocityX;

        // Platform collision
        for (const platform of platforms) {
            if (this.velocityY >= 0 && // Only check when moving downward
                previousY + this.height <= platform.y && // Was above platform on last frame
                this.x + this.width > platform.x && // Horizontal collision check
                this.x < platform.x + platform.width &&
                this.y + this.height > platform.y &&
                this.y < platform.y + platform.height) {
                
                this.y = platform.y - this.height;
                this.velocityY = 0;
                this.isJumping = false;
                this.hasDoubleJump = true;
                this.hasRush = true; // Reset rush on landing
                this.jumpHoldTime = 0;
            }
        }

        // Floor collision
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.velocityY = 0;
            this.isJumping = false;
            this.hasDoubleJump = true;
            this.hasRush = true; // Reset rush on landing
            this.jumpHoldTime = 0;
        }

        // Wall collision
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // Check if character is outside the sphere
        const distanceFromCenter = Math.sqrt(
            Math.pow(this.x + this.width/2 - canvas.width/2, 2) +
            Math.pow(this.y + this.height/2 - canvas.height/2, 2)
        );
        
        const currentTime = Date.now();
        if (distanceFromCenter > sphereRadius && 
            currentTime - this.lastDamageTime >= this.damageInterval) {
            this.hearts--;
            this.lastDamageTime = currentTime;
            if (this.hearts <= 0) {
                if (this.isPlayer) {
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

    update() {
        this.x += this.velocityX;
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

// Game objects
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const safeRadius = sphereRadius * 0.7; // Spawn within 70% of the sphere radius

// Calculate spawn positions in a circle around the center
const player = new Character(
    centerX - safeRadius/2,
    canvas.height - 100,
    'blue',
    true
);

const enemies = [
    new Character(centerX + safeRadius/2, canvas.height - 100, 'red'),
    new Character(centerX, canvas.height - 200, 'green'),
    new Character(centerX + safeRadius/3, canvas.height - 100, 'purple')
];
let bullets = [];

// Add platforms array after other game objects
const platforms = [
    // Top row (3 platforms)
    new Platform(centerX - 400, 150, 200),
    new Platform(centerX - 100, 150, 200),
    new Platform(centerX + 200, 150, 200),
    
    // Middle row (2 platforms)
    new Platform(centerX - 300, 350, 200),
    new Platform(centerX + 100, 350, 200),
    
    // Bottom row (3 platforms)
    new Platform(centerX - 400, 550, 200),
    new Platform(centerX - 100, 550, 200),
    new Platform(centerX + 200, 550, 200),
];

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

function updatePlayer() {
    // Only update movement if not rushing
    if (!player.isRushing) {
        // A/D keys for movement
        if (keys['a'] || keys['A']) {
            player.velocityX = -MOVE_SPEED;
            player.direction = -1;
        } else if (keys['d'] || keys['D']) {
            player.velocityX = MOVE_SPEED;
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

function updateAI() {
    const DESIRED_ENEMY_SPACING = 200;
    const SPACING_FORCE = 1;
    const RANDOM_MOVEMENT_INTERVAL = 120;
    const AI_MOVE_SPEED = MOVE_SPEED * 0.6;
    const MOVEMENT_DEADZONE = 10; // Stop moving if very close to target

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

        // Avoid bullets more actively
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
                enemy.velocityX = Math.sign(dx) * AI_MOVE_SPEED + avoidanceForceX * 0.5;
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
        enemy.update();
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
    sphereRadius = Math.min(canvas.width, canvas.height);
    
    // Clear bullets
    bullets = [];
}

function gameLoop() {
    const startTime = performance.now();
    
    if (!gameOver) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw sphere of influence
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height/2, sphereRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
        
        // Draw platforms
        platforms.forEach(platform => platform.draw());
        
        // Shrink sphere
        sphereRadius = Math.max(100, sphereRadius - sphereShrinkRate);
        
        // Update and draw player
        updatePlayer();
        player.update();
        player.draw();
        
        // Update and draw enemies
        updateAI();
        enemies.forEach(enemy => {
            enemy.update();
            enemy.draw();
        });
        
        // Update and draw bullets
        bullets = bullets.filter(bullet => {
            bullet.update();
            bullet.draw();
            
            let hit = false;
            
            // Check player collision
            if (bullet.checkCollision(player)) {
                if (player.takeDamage()) {  // Only apply damage if not invulnerable
                    hit = true;
                    if (player.hearts <= 0) {
                        endGame();
                    }
                }
            }
            
            // Check enemy collisions
            enemies.forEach((enemy, index) => {
                if (bullet.checkCollision(enemy)) {
                    if (enemy.takeDamage()) {  // Only apply damage if not invulnerable
                        hit = true;
                        if (enemy.hearts <= 0) {
                            enemies.splice(index, 1);
                        }
                    }
                }
            });
            
            // Remove bullets that are off screen or have hit something
            return !hit && 
                   bullet.x > 0 && 
                   bullet.x < canvas.width;
        });
        
        // Update health display
        healthDisplay.textContent = `❤️ ${player.hearts}`;
        
        // Calculate and display FPS
        calculateFPS();
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`FPS: ${currentFps}`, 110, 20);
        
        // Display frame time
        const frameTime = performance.now() - startTime;
        ctx.fillText(`Frame Time: ${frameTime.toFixed(2)}ms`, 110, 40);
    }
    
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop(); 