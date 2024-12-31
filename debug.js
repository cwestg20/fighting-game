// Debug control state
const debugControls = {
    ai: true,
    minimap: true,
    sphere: true,
    platformCollision: true,
    bulletCollision: true,
    enemyAvoidance: true,
    debugBounds: true,
    immortal: false
};

// Performance monitoring variables
const performanceMetrics = {
    update: 0,
    draw: 0,
    ai: 0,
    bullets: 0,
    total: 0
};

// FPS tracking variables
let frameCount = 0;
let lastFpsTime = Date.now();
let currentFps = 0;

function calculateFPS() {
    frameCount++;
    const currentTime = Date.now();
    const timeDiff = currentTime - lastFpsTime;
    
    // Update FPS every second
    if (timeDiff >= 1000) {
        currentFps = Math.round((frameCount * 1000) / timeDiff);
        frameCount = 0;
        lastFpsTime = currentTime;
    }
    return currentFps;
}

function initializeDebugControls() {
    // Add event listeners for debug controls
    document.getElementById('toggle-ai').addEventListener('change', (e) => {
        debugControls.ai = e.target.checked;
        e.target.blur();  // Remove focus
    });
    document.getElementById('toggle-minimap').addEventListener('change', (e) => {
        debugControls.minimap = e.target.checked;
        e.target.blur();  // Remove focus
    });
    document.getElementById('toggle-sphere').addEventListener('change', (e) => {
        debugControls.sphere = e.target.checked;
        e.target.blur();  // Remove focus
    });
    document.getElementById('toggle-platform-collision').addEventListener('change', (e) => {
        debugControls.platformCollision = e.target.checked;
        e.target.blur();  // Remove focus
    });
    document.getElementById('toggle-bullet-collision').addEventListener('change', (e) => {
        debugControls.bulletCollision = e.target.checked;
        e.target.blur();  // Remove focus
    });
    document.getElementById('toggle-enemy-avoidance').addEventListener('change', (e) => {
        debugControls.enemyAvoidance = e.target.checked;
        e.target.blur();  // Remove focus
    });
    document.getElementById('toggle-debug-bounds').addEventListener('change', (e) => {
        debugControls.debugBounds = e.target.checked;
        e.target.blur();  // Remove focus
    });
    document.getElementById('toggle-immortal').addEventListener('change', (e) => {
        debugControls.immortal = e.target.checked;
        e.target.blur();  // Remove focus
    });
}

function drawFPS(ctx, x, y) {
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`FPS: ${currentFps}`, x, y);
}

export { 
    debugControls, 
    performanceMetrics, 
    calculateFPS, 
    initializeDebugControls,
    drawFPS
}; 