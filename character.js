import { debugControls } from './debug.js';

// Game constants needed by Character
const GRAVITY = 0.6;
const JUMP_FORCE = -10.2;
const HOLD_JUMP_FORCE = -0.425;
const MAX_JUMP_TIME = 20;
const MOVE_SPEED = 5;
const RUSH_SPEED = 10;
const RUSH_DURATION = 25;
const MAX_HEARTS = 5;
const SHOOT_COOLDOWN = 250;

// Utility functions needed by Character
function checkCollision(rect1, rect2) {
    return rect1.x + rect1.width > rect2.x &&
           rect1.x < rect2.x + rect2.width &&
           rect1.y + rect1.height > rect2.y &&
           rect1.y < rect2.y + rect2.height;
}

function checkPlatformCollision(character, platform, previousY) {
    return character.velocityY >= 0 && 
           previousY + character.height <= platform.y &&
           checkCollision(character, platform) &&
           !character.isDropping;
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
        this.FLASH_DURATION = 900;
        this.isFlashing = false;
        this.flashTimeLeft = 0;
        this.lastShootTime = 0;
        this.rushVelocityY = 0;
        this.isDropping = false;
        this.dropCooldown = 0;
        this.isDead = false;
        
        // Initialize movement goal for AI
        this.movementGoal = {
            x: x,
            y: y,
            timeLeft: 120
        };
    }

    canShoot() {
        return Date.now() - this.lastShootTime >= SHOOT_COOLDOWN;
    }

    takeDamage() {
        const currentTime = Date.now();
        if (!this.isFlashing && currentTime - this.lastDamageTime >= this.FLASH_DURATION) {
            this.hearts--;
            console.log('Character took damage:', this.color, 'Hearts remaining:', this.hearts);
            this.isFlashing = true;
            this.flashTimeLeft = this.FLASH_DURATION;
            this.lastDamageTime = currentTime;
            
            // If this is the player and they're immortal, restore hearts to 4
            if (this.isPlayer && debugControls.immortal && this.hearts < 4) {
                this.hearts = 4;
            }
            
            return true;
        }
        return false;
    }

    update(timeScale, deltaTime, platforms, WORLD_WIDTH, WORLD_HEIGHT, sphereRadius, keys, endGame, DeathBurst, effects) {
        if (this.dropCooldown > 0) {
            this.dropCooldown -= deltaTime;
        }

        if (this.isFlashing) {
            this.flashTimeLeft -= deltaTime;
            if (this.flashTimeLeft <= 0) {
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

        for (const platform of platforms) {
            if (checkPlatformCollision(this, platform, previousY)) {
                this.y = platform.y - this.height;
                this.velocityY = 0;
                this.isJumping = false;
                this.hasDoubleJump = true;
                this.hasRush = true;
                this.jumpHoldTime = 0;
            }
        }

        if (this.isDropping && this.dropCooldown <= 0) {
            this.isDropping = false;
        }

        if (this.y + this.height > WORLD_HEIGHT) {
            this.y = WORLD_HEIGHT - this.height;
            this.velocityY = 0;
            this.isJumping = false;
            this.hasDoubleJump = true;
            this.hasRush = true;
            this.jumpHoldTime = 0;
        }

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > WORLD_WIDTH) this.x = WORLD_WIDTH - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > WORLD_HEIGHT) this.y = WORLD_HEIGHT - this.height;

        const distanceFromCenter = Math.sqrt(
            Math.pow(this.x + this.width/2 - WORLD_WIDTH/2, 2) +
            Math.pow(this.y + this.height/2 - WORLD_HEIGHT/2, 2)
        );
        
        const currentTime = Date.now();
        if (debugControls.sphere && distanceFromCenter > sphereRadius && 
            currentTime - this.lastDamageTime >= this.FLASH_DURATION) {
            if (this.takeDamage()) {
                if (this.hearts <= 0 && !this.isDead) {
                    this.isDead = true;
                    if (DeathBurst && effects) {
                        effects.push(new DeathBurst(
                            this.x + this.width/2,
                            this.y + this.height/2,
                            this.color
                        ));
                    }
                    if (this.isPlayer) {
                        endGame();
                    }
                }
            }
        }
    }

    draw(ctx) {
        // Don't draw if dead (handled in game loop now)
        
        if (this.isRushing) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(this.x - this.direction * 20, this.y, 20, this.height);
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 10;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
        
        // Calculate flash opacity if flashing
        let flashOpacity = 0;
        if (this.isFlashing) {
            // Create a pulsing effect that goes from 0.8 to 0 opacity
            const normalizedTime = (this.flashTimeLeft / this.FLASH_DURATION);
            const pulseSpeed = 10; // Higher number = faster pulse
            flashOpacity = 0.8 * Math.abs(Math.sin(normalizedTime * pulseSpeed));
        }
        
        // Draw character with flash overlay
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        if (flashOpacity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        const triangleSize = 15;
        ctx.beginPath();
        if (this.direction > 0) {
            ctx.moveTo(this.x + this.width, this.y + this.height/2);
            ctx.lineTo(this.x + this.width - triangleSize, this.y + this.height/2 - triangleSize);
            ctx.lineTo(this.x + this.width - triangleSize, this.y + this.height/2 + triangleSize);
        } else {
            ctx.moveTo(this.x, this.y + this.height/2);
            ctx.lineTo(this.x + triangleSize, this.y + this.height/2 - triangleSize);
            ctx.lineTo(this.x + triangleSize, this.y + this.height/2 + triangleSize);
        }
        ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        for (let i = 0; i < this.hearts; i++) {
            ctx.fillStyle = 'red';
            ctx.fillText('♥', this.x + (i * 15), this.y - 10);
        }
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = JUMP_FORCE;
            this.isJumping = true;
            this.jumpHoldTime = 0;
        } else if (this.hasDoubleJump) {
            this.velocityY = JUMP_FORCE * 0.8;
            this.hasDoubleJump = false;
            this.jumpHoldTime = 0;
        }
    }

    shoot() {
        if (this.canShoot()) {
            this.lastShootTime = Date.now();
            return {
                x: this.x + this.width/2,
                y: this.y + this.height/2,
                direction: this.direction,
                owner: this
            };
        }
        return null;
    }

    rush() {
        if (this.hasRush) {
            this.isRushing = true;
            this.rushTimeLeft = RUSH_DURATION;
            this.hasRush = false;
            this.rushVelocityY = this.velocityY;
            this.velocityX = this.direction * RUSH_SPEED;
            this.velocityY = 0;
        }
    }

    drop() {
        if (!this.isDropping && this.velocityY === 0) {
            this.isDropping = true;
            this.dropCooldown = 250;
            this.velocityY = 1;
        }
    }
}

export { Character, MOVE_SPEED }; 