// Serialization utilities for game state

export function serializeVector(vector) {
    return {
        x: vector.x,
        y: vector.y
    };
}

export function deserializeVector(data) {
    return {
        x: data.x,
        y: data.y
    };
}

export function serializeCharacter(character) {
    return {
        id: character.id,
        x: character.x,
        y: character.y,
        width: character.width,
        height: character.height,
        color: character.color,
        velocityX: character.velocityX,
        velocityY: character.velocityY,
        isJumping: character.isJumping,
        hasDoubleJump: character.hasDoubleJump,
        hasRush: character.hasRush,
        isRushing: character.isRushing,
        rushTimeLeft: character.rushTimeLeft,
        jumpHoldTime: character.jumpHoldTime,
        hearts: character.hearts,
        isPlayer: character.isPlayer,
        direction: character.direction,
        isFlashing: character.isFlashing,
        flashTimeLeft: character.flashTimeLeft,
        rushVelocityY: character.rushVelocityY,
        isDropping: character.isDropping,
        dropCooldown: character.dropCooldown,
        isDead: character.isDead,
        personality: character.personality || 'default',
        movementGoal: character.movementGoal ? {
            x: character.movementGoal.x,
            y: character.movementGoal.y,
            timeLeft: character.movementGoal.timeLeft
        } : null
    };
}

export function deserializeCharacter(data, Character) {
    const character = new Character(data.x, data.y, data.color, data.isPlayer);
    Object.assign(character, {
        id: data.id,
        width: data.width,
        height: data.height,
        velocityX: data.velocityX,
        velocityY: data.velocityY,
        isJumping: data.isJumping,
        hasDoubleJump: data.hasDoubleJump,
        hasRush: data.hasRush,
        isRushing: data.isRushing,
        rushTimeLeft: data.rushTimeLeft,
        jumpHoldTime: data.jumpHoldTime,
        hearts: data.hearts,
        direction: data.direction,
        isFlashing: data.isFlashing,
        flashTimeLeft: data.flashTimeLeft,
        rushVelocityY: data.rushVelocityY,
        isDropping: data.isDropping,
        dropCooldown: data.dropCooldown,
        isDead: data.isDead,
        personality: data.personality,
        movementGoal: data.movementGoal
    });
    return character;
}

export function serializeBullet(bullet) {
    return {
        x: bullet.x,
        y: bullet.y,
        radius: bullet.radius,
        velocityX: bullet.velocityX,
        color: bullet.color,
        width: bullet.width,
        height: bullet.height,
        ownerId: bullet.owner.id  // Store only the owner's ID
    };
}

export function deserializeBullet(data, Bullet, findCharacterById) {
    const owner = findCharacterById(data.ownerId);
    if (!owner) {
        console.warn('Could not find bullet owner with ID:', data.ownerId);
        return null;
    }
    const bullet = new Bullet(data.x, data.y, Math.sign(data.velocityX), owner);
    Object.assign(bullet, {
        radius: data.radius,
        velocityX: data.velocityX,
        color: data.color,
        width: data.width,
        height: data.height
    });
    return bullet;
}

export function serializeEffect(effect) {
    if (effect.constructor.name === 'DeathBurst') {
        return {
            type: 'DeathBurst',
            x: effect.x,
            y: effect.y,
            color: effect.color,
            particles: effect.particles.map(p => ({
                x: p.x,
                y: p.y,
                angle: p.angle,
                speed: p.speed,
                color: p.color,
                size: p.size,
                alpha: p.alpha,
                rotation: p.rotation,
                rotationSpeed: p.rotationSpeed
            }))
        };
    }
    return null;
}

export function deserializeEffect(data, DeathBurst) {
    if (data.type === 'DeathBurst') {
        const effect = new DeathBurst(data.x, data.y, data.color);
        effect.particles = data.particles.map(p => {
            const particle = {
                x: p.x,
                y: p.y,
                angle: p.angle,
                speed: p.speed,
                color: p.color,
                size: p.size,
                alpha: p.alpha,
                rotation: p.rotation,
                rotationSpeed: p.rotationSpeed
            };
            return particle;
        });
        return effect;
    }
    return null;
}

export function serializeGameState(state) {
    return {
        player: serializeCharacter(state.player),
        enemies: state.enemies.map(serializeCharacter),
        bullets: state.bullets.map(serializeBullet),
        effects: state.effects.map(serializeEffect),
        sphereRadius: state.sphereRadius,
        gameOver: state.gameOver,
        currentMap: state.currentMap,
        frameNumber: state.frameNumber
    };
}

export function deserializeGameState(serializedState) {
    return {
        player: deserializeCharacter(serializedState.player),
        enemies: serializedState.enemies.map(deserializeCharacter),
        bullets: serializedState.bullets.map(deserializeBullet),
        effects: serializedState.effects.map(deserializeEffect),
        sphereRadius: serializedState.sphereRadius,
        gameOver: serializedState.gameOver,
        currentMap: serializedState.currentMap,
        frameNumber: serializedState.frameNumber
    };
} 