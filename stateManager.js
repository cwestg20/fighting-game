import { serializeGameState, deserializeGameState } from './serialization.js';

export class StateManager {
    constructor(maxStates = 60) {
        this.maxStates = maxStates;
        this.states = new Map();
        this.predictions = new Map();
        this.confirmedStates = new Map();
    }

    saveState(frameNumber, state) {
        this.states.set(frameNumber, this.cloneState(state));
    }

    savePrediction(frameNumber, state) {
        this.predictions.set(frameNumber, this.cloneState(state));
    }

    confirmState(frameNumber, state) {
        this.confirmedStates.set(frameNumber, this.cloneState(state));
    }

    getState(frameNumber) {
        return this.states.get(frameNumber);
    }

    getEarliestMismatchFrame(currentFrame) {
        // Compare confirmed states with predictions
        for (const [frame, confirmedState] of this.confirmedStates) {
            if (frame > currentFrame - this.maxStates) {
                const predictedState = this.predictions.get(frame);
                if (predictedState && !this.statesMatch(confirmedState, predictedState)) {
                    return frame;
                }
            }
        }
        return null;
    }

    rollback(frameNumber, gameLoop) {
        const state = this.getState(frameNumber);
        if (!state) {
            console.warn('No saved state for frame', frameNumber);
            return false;
        }

        // Clear predictions after rollback point
        for (let frame = frameNumber + 1; frame <= frameNumber + this.maxStates; frame++) {
            this.predictions.delete(frame);
            this.states.delete(frame);
        }

        // Load the state
        Object.assign(gameLoop.gameState, state.gameState);
        Object.assign(gameLoop.game.player, state.player);
        gameLoop.game.enemies = state.enemies.map(e => Object.assign({}, e));
        gameLoop.game.bullets = state.bullets.map(b => Object.assign({}, b));
        gameLoop.game.effects = state.effects.map(e => Object.assign({}, e));
        gameLoop.game.sphereRadius = state.sphereRadius;
        gameLoop.game.gameOver = state.gameOver;
        gameLoop.game.currentMap = state.currentMap;
        gameLoop.frameNumber = state.frameNumber;

        return true;
    }

    cleanup(currentFrame) {
        // Remove states older than maxStates frames
        for (const [frame] of this.states) {
            if (frame < currentFrame - this.maxStates) {
                this.states.delete(frame);
                this.predictions.delete(frame);
                this.confirmedStates.delete(frame);
            }
        }
    }

    cloneState(state) {
        return {
            gameState: { ...state.gameState },
            player: { ...state.player },
            enemies: state.enemies.map(e => ({ ...e })),
            bullets: state.bullets.map(b => ({ ...b })),
            effects: state.effects.map(e => ({ ...e })),
            sphereRadius: state.sphereRadius,
            gameOver: state.gameOver,
            currentMap: state.currentMap,
            frameNumber: state.frameNumber
        };
    }

    statesMatch(state1, state2) {
        // Compare essential game state properties
        if (
            state1.player.x !== state2.player.x ||
            state1.player.y !== state2.player.y ||
            state1.player.velocityX !== state2.player.velocityX ||
            state1.player.velocityY !== state2.player.velocityY ||
            state1.player.hearts !== state2.player.hearts ||
            state1.player.isFlashing !== state2.player.isFlashing ||
            state1.player.isDead !== state2.player.isDead ||
            state1.enemies.length !== state2.enemies.length ||
            state1.bullets.length !== state2.bullets.length ||
            state1.effects.length !== state2.effects.length ||
            state1.sphereRadius !== state2.sphereRadius ||
            state1.gameOver !== state2.gameOver
        ) {
            return false;
        }

        // Compare enemies in detail
        for (let i = 0; i < state1.enemies.length; i++) {
            const enemy1 = state1.enemies[i];
            const enemy2 = state2.enemies[i];
            if (
                enemy1.x !== enemy2.x ||
                enemy1.y !== enemy2.y ||
                enemy1.velocityX !== enemy2.velocityX ||
                enemy1.velocityY !== enemy2.velocityY ||
                enemy1.hearts !== enemy2.hearts ||
                enemy1.isFlashing !== enemy2.isFlashing ||
                enemy1.isDead !== enemy2.isDead ||
                enemy1.color !== enemy2.color
            ) {
                return false;
            }
        }

        // Compare bullets in detail
        for (let i = 0; i < state1.bullets.length; i++) {
            const bullet1 = state1.bullets[i];
            const bullet2 = state2.bullets[i];
            if (
                bullet1.x !== bullet2.x ||
                bullet1.y !== bullet2.y ||
                bullet1.velocityX !== bullet2.velocityX ||
                bullet1.velocityY !== bullet2.velocityY ||
                bullet1.color !== bullet2.color
            ) {
                return false;
            }
        }

        // Compare effects in detail
        for (let i = 0; i < state1.effects.length; i++) {
            const effect1 = state1.effects[i];
            const effect2 = state2.effects[i];
            if (
                effect1.x !== effect2.x ||
                effect1.y !== effect2.y ||
                effect1.color !== effect2.color ||
                effect1.particles?.length !== effect2.particles?.length
            ) {
                return false;
            }
        }

        return true;
    }
} 