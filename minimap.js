class Minimap {
    constructor(width, height, margin, worldWidth, worldHeight) {
        this.width = width;
        this.height = height;
        this.margin = margin;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        
        // Calculate scale factors
        this.scaleX = this.width / this.worldWidth;
        this.scaleY = this.height / this.worldHeight;
    }

    draw(ctx, viewportWidth, player, enemies, platforms, sphereRadius) {
        const mapX = viewportWidth - this.width - this.margin;
        const mapY = this.margin;
        
        // Draw minimap background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(mapX, mapY, this.width, this.height);
        
        // Draw minimap border
        ctx.strokeStyle = 'white';
        ctx.strokeRect(mapX, mapY, this.width, this.height);
        
        // Draw platforms
        ctx.fillStyle = '#666';
        platforms.forEach(platform => {
            ctx.fillRect(
                mapX + platform.x * this.scaleX,
                mapY + platform.y * this.scaleY,
                platform.width * this.scaleX,
                platform.height * this.scaleY
            );
        });
        
        // Draw player (blue square)
        const playerSize = 4;
        ctx.fillStyle = 'blue';
        ctx.fillRect(
            mapX + player.x * this.scaleX,
            mapY + player.y * this.scaleY,
            playerSize,
            playerSize
        );
        
        // Draw enemies (colored squares)
        enemies.forEach(enemy => {
            ctx.fillStyle = enemy.color;
            ctx.fillRect(
                mapX + enemy.x * this.scaleX,
                mapY + enemy.y * this.scaleY,
                playerSize,
                playerSize
            );
        });
        
        // Draw sphere boundary
        ctx.beginPath();
        ctx.arc(
            mapX + (this.worldWidth/2) * this.scaleX,
            mapY + (this.worldHeight/2) * this.scaleY,
            sphereRadius * this.scaleX,
            0,
            Math.PI * 2
        );
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
    }
}

export { Minimap }; 