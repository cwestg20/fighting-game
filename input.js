// Track pressed keys
import { MOVE_SPEED } from './character.js';

export class InputHandler {
    constructor(player) {
        this.player = player;
        this.keys = {};
        this.character = player;

        // Bind event listeners
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // Only handle these events if we have a character
            if (this.character) {
                // Jump
                if (e.key === ' ' || e.code === 'Space') {
                    e.preventDefault();
                    if (!this.character.isJumping) {
                        this.character.jump();
                    } else if (this.character.hasDoubleJump) {
                        this.character.jump();
                        this.character.hasDoubleJump = false;
                    }
                }
                
                // Rush ability
                if ((e.key === 'k' || e.key === 'K') && this.character.hasRush && !this.character.isRushing) {
                    this.character.rush();
                }
                
                // Drop through platform
                if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
                    if (this.character.velocityY === 0 && !this.character.isDropping) {
                        this.character.isDropping = true;
                        this.character.dropCooldown = 0.1; // 100ms
                    }
                }

                // Respawn with 'r' key if dead
                if ((e.key === 'r' || e.key === 'R') && this.character.isDead) {
                    window.respawnPlayer();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            // Cut jump short if spacebar is released
            if (e.key === ' ' && this.character.velocityY < 0) {
                this.character.velocityY *= 0.5;
            }
        });
    }

    update(timeScale, player, bullets, Bullet, gameState) {
        if (!player.isRushing) {
            if (this.keys['a'] || this.keys['A']) {
                player.velocityX = -MOVE_SPEED * timeScale;
                player.direction = -1;
            } else if (this.keys['d'] || this.keys['D']) {
                player.velocityX = MOVE_SPEED * timeScale;
                player.direction = 1;
            } else {
                player.velocityX = 0;
            }
        }

        // Handle continuous shooting with O key
        if ((this.keys['o'] || this.keys['O']) && player.canShoot(gameState)) {
            const bulletData = player.shoot(gameState);
            if (bulletData) {
                bullets.push(new Bullet(bulletData.x, bulletData.y, bulletData.direction, bulletData.owner));
            }
        }
    }

    // Helper method to check if a key is pressed
    isKeyPressed(key) {
        return this.keys[key];
    }

    setCharacter(character) {
        this.character = character;
    }
} 