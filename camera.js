// Camera constants
const DEFAULT_ZOOM = 1.0;
const MAX_ZOOM_OUT = 0.7;  // How far we can zoom out (smaller number = more zoomed out)
const BASE_CAMERA_BUFFER_PERCENT = 0.2;  // Base buffer at default zoom
const MIN_CAMERA_BUFFER_PERCENT = 0.1;   // Minimum buffer when zoomed out
const ZOOM_SPEED = 0.03;  // Reduced from 0.05 for smoother zoom
const CAMERA_MOVE_SPEED = 0.05;  // How fast the camera pans

function lerp(start, end, t) {
    return start + (end - start) * t;
}

class Camera {
    constructor(viewportWidth, viewportHeight, worldWidth, worldHeight) {
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.x = 0;
        this.y = 0;
        this.currentZoom = DEFAULT_ZOOM;
        this.targetZoom = DEFAULT_ZOOM;
        this.targetX = 0;
        this.targetY = 0;
    }

    update(player, enemies) {
        // Calculate base camera position (centered on player)
        const targetX = player.x - this.viewportWidth/2;
        const targetY = player.y - this.viewportHeight/2;
        
        // Calculate dynamic buffer based on current zoom
        const zoomFactor = (this.currentZoom - MAX_ZOOM_OUT) / (DEFAULT_ZOOM - MAX_ZOOM_OUT);
        const dynamicBuffer = MIN_CAMERA_BUFFER_PERCENT + 
                            (BASE_CAMERA_BUFFER_PERCENT - MIN_CAMERA_BUFFER_PERCENT) * zoomFactor;
        
        // Check for nearby enemies with dynamic buffer
        let nearbyEnemies = enemies.filter(enemy => {
            const dx = Math.abs(enemy.x - player.x);
            const dy = Math.abs(enemy.y - player.y);
            return dx < this.viewportWidth * (1 + dynamicBuffer) &&
                   dy < this.viewportHeight * (1 + dynamicBuffer);
        });
        
        // Calculate target zoom based on nearby enemies
        if (nearbyEnemies.length > 0) {
            // Find the bounds of all relevant characters
            let minX = player.x, maxX = player.x;
            let minY = player.y, maxY = player.y;
            let totalX = player.x;
            let totalY = player.y;
            let characterCount = 1;
            
            nearbyEnemies.forEach(enemy => {
                minX = Math.min(minX, enemy.x);
                maxX = Math.max(maxX, enemy.x);
                minY = Math.min(minY, enemy.y);
                maxY = Math.max(maxY, enemy.y);
                totalX += enemy.x;
                totalY += enemy.y;
                characterCount++;
            });
            
            // Calculate required zoom to fit all characters
            const width = maxX - minX + 200;
            const height = maxY - minY + 200;
            const zoomX = this.viewportWidth / width;
            const zoomY = this.viewportHeight / height;
            this.targetZoom = Math.max(Math.min(zoomX, zoomY, DEFAULT_ZOOM), MAX_ZOOM_OUT);
            
            // Set target camera position to center of action
            const avgX = totalX / characterCount;
            const avgY = totalY / characterCount;
            
            this.targetX = avgX - this.viewportWidth/(2 * this.currentZoom);
            this.targetY = avgY - this.viewportHeight/(2 * this.currentZoom);
        } else {
            // Return to default zoom and center on player
            this.targetZoom = DEFAULT_ZOOM;
            this.targetX = targetX;
            this.targetY = targetY;
        }
        
        // Smoothly interpolate zoom and position
        this.currentZoom = lerp(this.currentZoom, this.targetZoom, ZOOM_SPEED);
        
        // Calculate effective viewport dimensions with current zoom
        const effectiveViewportWidth = this.viewportWidth / this.currentZoom;
        const effectiveViewportHeight = this.viewportHeight / this.currentZoom;
        
        // Allow camera to extend slightly beyond world bounds
        const overflow = 0.2;
        const minX = -effectiveViewportWidth * overflow;
        const minY = -effectiveViewportHeight * overflow;
        const maxX = this.worldWidth - effectiveViewportWidth * (1 - overflow);
        const maxY = this.worldHeight - effectiveViewportHeight * (1 - overflow);
        
        // Clamp target positions
        this.targetX = Math.max(minX, Math.min(this.targetX, maxX));
        this.targetY = Math.max(minY, Math.min(this.targetY, maxY));
        
        // Smoothly move camera towards target position
        this.x = lerp(this.x, this.targetX, CAMERA_MOVE_SPEED);
        this.y = lerp(this.y, this.targetY, CAMERA_MOVE_SPEED);
    }

    applyTransform(ctx) {
        const zoomOffsetX = this.viewportWidth * (1 - this.currentZoom) / 2;
        const zoomOffsetY = this.viewportHeight * (1 - this.currentZoom) / 2;
        ctx.translate(zoomOffsetX, zoomOffsetY);
        ctx.scale(this.currentZoom, this.currentZoom);
        ctx.translate(-this.x, -this.y);
    }
}

export { Camera }; 