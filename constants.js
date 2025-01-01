// Game timing constants
export const FIXED_TIMESTEP = 1000 / 60; // 60 FPS in milliseconds
export const TIMESTEP = 1 / 60; // 60 FPS in seconds

// Character constants (all values are per second)
export const GRAVITY = 35;
export const JUMP_FORCE = -600;
export const HOLD_JUMP_FORCE = -25;
export const MAX_JUMP_TIME = 20;
export const MOVE_SPEED = 300;
export const RUSH_SPEED = 600;
export const RUSH_DURATION = 0.4; // seconds (was 25 frames)
export const MAX_HEARTS = 5;
export const SHOOT_COOLDOWN = 250; // milliseconds
export const DAMAGE_COOLDOWN = 500; // milliseconds

// Bullet constants
export const BULLET_SPEED = 750; // pixels per second 