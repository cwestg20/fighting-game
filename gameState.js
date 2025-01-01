import { Random } from './random.js';
import { SHOOT_COOLDOWN, DAMAGE_COOLDOWN } from './constants.js';

class GameState {
    constructor(seed = 1) {
        this.currentFrame = 0;
        this.currentTime = 0;
        this.lastShootTimes = new Map(); // Track shoot cooldowns by character ID
        this.lastDamageTimes = new Map(); // Track damage cooldowns by character ID
        this.rng = new Random(seed);
    }

    // Get current time in seconds
    getCurrentTime() {
        return this.currentTime;
    }

    // Update time state
    update() {
        this.currentFrame++;
        this.currentTime = this.currentFrame / 60; // Convert frames to seconds at 60 FPS
    }

    // Check if enough time has passed since last shoot
    canShoot(characterId) {
        const lastShootTime = this.lastShootTimes.get(characterId) || 0;
        return this.currentTime - lastShootTime >= SHOOT_COOLDOWN / 1000;
    }

    // Record shoot time
    recordShot(characterId) {
        this.lastShootTimes.set(characterId, this.currentTime);
    }

    // Check if character can take damage
    canTakeDamage(characterId) {
        const lastDamageTime = this.lastDamageTimes.get(characterId) || 0;
        const canTake = this.currentTime - lastDamageTime >= DAMAGE_COOLDOWN / 1000;
        console.log('Can take damage check:', {
            characterId,
            currentTime: this.currentTime,
            lastDamageTime,
            timeSinceLastDamage: this.currentTime - lastDamageTime,
            requiredCooldown: DAMAGE_COOLDOWN / 1000,
            canTake
        });
        return canTake;
    }

    // Record damage time
    recordDamage(characterId) {
        console.log('Recording damage:', {
            characterId,
            time: this.currentTime
        });
        this.lastDamageTimes.set(characterId, this.currentTime);
    }

    // Get a deterministic random number
    random() {
        return this.rng.next();
    }

    // Get a deterministic random integer
    randomInt(min, max) {
        return this.rng.nextInt(min, max);
    }

    // Get a deterministic random float
    randomFloat(min, max) {
        return this.rng.nextFloat(min, max);
    }

    // Get a deterministic random chance
    randomChance(probability) {
        return this.rng.chance(probability);
    }
}

export { GameState }; 