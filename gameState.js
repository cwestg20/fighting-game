import { Random } from './random.js';
import { SHOOT_COOLDOWN, DAMAGE_COOLDOWN } from './constants.js';

export class GameState {
    constructor(seed = 1) {
        this.currentFrame = 0;
        this.currentTime = 0;
        this.lastShootTimes = new Map(); // Track shoot cooldowns by character ID
        this.lastDamageTimes = new Map(); // Track damage cooldowns by character ID
        this.rng = new Random(seed);
        
        // Network state
        this.networkPlayers = new Map(); // Track network player states by ID
        this.lastProcessedInputs = new Map(); // Track last processed input frame by player ID
        this.inputBuffer = new Map(); // Buffer incoming inputs by player ID
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

    // Network player management
    updateNetworkPlayer(playerId, state) {
        this.networkPlayers.set(playerId, state);
    }

    removeNetworkPlayer(playerId) {
        this.networkPlayers.delete(playerId);
        this.lastProcessedInputs.delete(playerId);
        this.inputBuffer.delete(playerId);
        this.lastShootTimes.delete(playerId);
        this.lastDamageTimes.delete(playerId);
    }

    getNetworkPlayer(playerId) {
        return this.networkPlayers.get(playerId);
    }

    // Input management
    updateLastProcessedInput(playerId, frame) {
        this.lastProcessedInputs.set(playerId, frame);
    }

    getLastProcessedInput(playerId) {
        return this.lastProcessedInputs.get(playerId) || 0;
    }

    addInput(playerId, frame, input) {
        if (!this.inputBuffer.has(playerId)) {
            this.inputBuffer.set(playerId, new Map());
        }
        this.inputBuffer.get(playerId).set(frame, input);
    }

    getInput(playerId, frame) {
        return this.inputBuffer.get(playerId)?.get(frame);
    }

    clearOldInputs(frame) {
        this.inputBuffer.forEach((inputs, playerId) => {
            for (const [inputFrame] of inputs) {
                if (inputFrame < frame) {
                    inputs.delete(inputFrame);
                }
            }
        });
    }

    // State snapshot management
    createSnapshot() {
        return {
            frame: this.currentFrame,
            time: this.currentTime,
            networkPlayers: Array.from(this.networkPlayers.entries()),
            lastProcessedInputs: Array.from(this.lastProcessedInputs.entries()),
            lastShootTimes: Array.from(this.lastShootTimes.entries()),
            lastDamageTimes: Array.from(this.lastDamageTimes.entries())
        };
    }

    loadSnapshot(snapshot) {
        this.currentFrame = snapshot.frame;
        this.currentTime = snapshot.time;
        this.networkPlayers = new Map(snapshot.networkPlayers);
        this.lastProcessedInputs = new Map(snapshot.lastProcessedInputs);
        this.lastShootTimes = new Map(snapshot.lastShootTimes);
        this.lastDamageTimes = new Map(snapshot.lastDamageTimes);
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
