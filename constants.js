// Game timing constants
export const FIXED_TIMESTEP = 1000 / 60; // 60 FPS in milliseconds
export const TIMESTEP = 1 / 60; // 60 FPS in seconds

// Character constants (all values are per second)
export const GRAVITY = 30;
export const JUMP_FORCE = -800; // Increased from -600 for higher jumps
export const HOLD_JUMP_FORCE = -40; // Increased from -30 for better jump control
export const MAX_JUMP_TIME = 25;
export const MOVE_SPEED = 400;
export const RUSH_SPEED = 900;
export const RUSH_DURATION = 0.3; // seconds (was 25 frames)
export const MAX_HEARTS = 5;
export const SHOOT_COOLDOWN = 250; // milliseconds
export const DAMAGE_COOLDOWN = 500; // milliseconds

// Bullet constants
export const BULLET_SPEED = 750; // pixels per second 