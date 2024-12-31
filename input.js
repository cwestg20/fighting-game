// Track pressed keys
import { MOVE_SPEED } from './character.js';

const keys = {};

class InputHandler {
    constructor(player) {
        this.player = player;
        
        // Bind event listeners
        document.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            if (e.key === ' ') {  // Spacebar for jumping
                player.jump();
            }
            if (e.key === 'k' || e.key === 'K') {
                player.rush();
            }
            if (e.key === 's' || e.key === 'S') {  // S key for dropping
                player.drop();
            }
        });

        document.addEventListener('keyup', (e) => {
            keys[e.key] = false;
            // Cut jump short if spacebar is released
            if (e.key === ' ' && player.velocityY < 0) {
                player.velocityY *= 0.5;
            }
        });
    }

    update(timeScale, player, bullets, Bullet) {
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
            const bulletData = player.shoot();
            if (bulletData) {
                bullets.push(new Bullet(bulletData.x, bulletData.y, bulletData.direction, bulletData.owner));
            }
        }
    }

    // Helper method to check if a key is pressed
    isKeyPressed(key) {
        return keys[key];
    }
}

export { InputHandler }; 