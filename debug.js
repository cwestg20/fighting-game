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
let lastFpsTime = performance.now();
let currentFps = 0;

function calculateFPS() {
    frameCount++;
    const currentTime = performance.now();
    const timeDiff = currentTime - lastFpsTime;
    
    // Update FPS every 500ms for more stable readings
    if (timeDiff >= 500) {
        currentFps = Math.round((frameCount * 1000) / timeDiff);
        frameCount = 0;
        lastFpsTime = currentTime;
    }
    return currentFps;
}

function initializeDebugControls() {
    // Initially disable debug controls container until host is determined
    const debugControlsContainer = document.getElementById('debug-controls');
    if (debugControlsContainer) {
        debugControlsContainer.classList.add('disabled');
    }

    // Add event listeners for debug controls
    const toggleAI = document.getElementById('toggle-ai');
    if (toggleAI) {
        toggleAI.checked = debugControls.ai;
        toggleAI.addEventListener('change', (e) => {
            debugControls.ai = e.target.checked;
            console.log('AI toggle:', debugControls.ai);
            e.target.blur();  // Remove focus
        });
    }

    const toggleMinimap = document.getElementById('toggle-minimap');
    if (toggleMinimap) {
        toggleMinimap.checked = debugControls.minimap;
        toggleMinimap.addEventListener('change', (e) => {
            debugControls.minimap = e.target.checked;
            console.log('Minimap toggle:', debugControls.minimap);
            e.target.blur();
        });
    }

    const toggleSphere = document.getElementById('toggle-sphere');
    if (toggleSphere) {
        toggleSphere.checked = debugControls.sphere;
        toggleSphere.addEventListener('change', (e) => {
            debugControls.sphere = e.target.checked;
            console.log('Sphere toggle:', debugControls.sphere);
            e.target.blur();
        });
    }

    const togglePlatformCollision = document.getElementById('toggle-platform-collision');
    if (togglePlatformCollision) {
        togglePlatformCollision.checked = debugControls.platformCollision;
        togglePlatformCollision.addEventListener('change', (e) => {
            debugControls.platformCollision = e.target.checked;
            console.log('Platform collision toggle:', debugControls.platformCollision);
            e.target.blur();
        });
    }

    const toggleBulletCollision = document.getElementById('toggle-bullet-collision');
    if (toggleBulletCollision) {
        toggleBulletCollision.checked = debugControls.bulletCollision;
        toggleBulletCollision.addEventListener('change', (e) => {
            debugControls.bulletCollision = e.target.checked;
            console.log('Bullet collision toggle:', debugControls.bulletCollision);
            e.target.blur();
        });
    }

    const toggleEnemyAvoidance = document.getElementById('toggle-enemy-avoidance');
    if (toggleEnemyAvoidance) {
        toggleEnemyAvoidance.checked = debugControls.enemyAvoidance;
        toggleEnemyAvoidance.addEventListener('change', (e) => {
            debugControls.enemyAvoidance = e.target.checked;
            console.log('Enemy avoidance toggle:', debugControls.enemyAvoidance);
            e.target.blur();
        });
    }

    const toggleDebugBounds = document.getElementById('toggle-debug-bounds');
    if (toggleDebugBounds) {
        toggleDebugBounds.checked = debugControls.debugBounds;
        toggleDebugBounds.addEventListener('change', (e) => {
            debugControls.debugBounds = e.target.checked;
            console.log('Debug bounds toggle:', debugControls.debugBounds);
            e.target.blur();
        });
    }

    const toggleImmortal = document.getElementById('toggle-immortal');
    if (toggleImmortal) {
        toggleImmortal.checked = debugControls.immortal;
        toggleImmortal.addEventListener('change', (e) => {
            debugControls.immortal = e.target.checked;
            console.log('Immortal toggle:', debugControls.immortal);
            e.target.blur();
        });
    }
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