import { MOVE_SPEED } from './character.js';
import { debugControls } from './debug.js';
import { Bullet } from './bullet.js';

const DESIRED_ENEMY_SPACING = 200;
const SPACING_FORCE = 1;
const RANDOM_MOVEMENT_INTERVAL = 120;
const AI_MOVE_SPEED = MOVE_SPEED * 0.6;
const MOVEMENT_DEADZONE = 10;

export function updateAI(enemies, player, bullets, timeScale, deltaTime, gameState, WORLD_WIDTH, WORLD_HEIGHT, platforms) {
    // Only update alive enemies
    const aliveEnemies = enemies.filter(enemy => !enemy.isDead);
    
    aliveEnemies.forEach(enemy => {
        // Always update enemy physics for all enemies
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