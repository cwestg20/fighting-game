// Map definitions
const maps = {
    default: {
        name: "Default Arena",
        createPlatforms: (WORLD_WIDTH, WORLD_HEIGHT) => {
            const centerX = WORLD_WIDTH / 2;
            const centerY = WORLD_HEIGHT / 2;
            
            return [
                // Bottom left corner area
                { x: 100, y: WORLD_HEIGHT - 200, width: 300 },
                { x: 500, y: WORLD_HEIGHT - 300, width: 300 },
                { x: 200, y: WORLD_HEIGHT - 400, width: 300 },
                { x: 400, y: WORLD_HEIGHT - 500, width: 300 },
                { x: 100, y: WORLD_HEIGHT - 600, width: 300 },
                
                // Bottom right corner area
                { x: WORLD_WIDTH - 400, y: WORLD_HEIGHT - 200, width: 300 },
                { x: WORLD_WIDTH - 800, y: WORLD_HEIGHT - 300, width: 300 },
                { x: WORLD_WIDTH - 500, y: WORLD_HEIGHT - 400, width: 300 },
                { x: WORLD_WIDTH - 300, y: WORLD_HEIGHT - 500, width: 300 },
                { x: WORLD_WIDTH - 600, y: WORLD_HEIGHT - 600, width: 300 },
                
                // Top left corner area
                { x: 100, y: 200, width: 300 },
                { x: 500, y: 300, width: 300 },
                { x: 200, y: 400, width: 300 },
                { x: 400, y: 500, width: 300 },
                { x: 100, y: 600, width: 300 },
                
                // Top right corner area
                { x: WORLD_WIDTH - 400, y: 200, width: 300 },
                { x: WORLD_WIDTH - 800, y: 300, width: 300 },
                { x: WORLD_WIDTH - 500, y: 400, width: 300 },
                { x: WORLD_WIDTH - 300, y: 500, width: 300 },
                { x: WORLD_WIDTH - 600, y: 600, width: 300 },
                
                // Center area platforms
                { x: centerX - 400, y: centerY, width: 300 },
                { x: centerX + 100, y: centerY, width: 300 },
                { x: centerX - 150, y: centerY - 200, width: 300 },
                { x: centerX - 150, y: centerY + 200, width: 300 },
                { x: centerX - 300, y: centerY - 100, width: 300 },
                { x: centerX + 300, y: centerY + 100, width: 300 },
                
                // Mid-level connecting platforms
                { x: centerX - 800, y: centerY - 100, width: 300 },
                { x: centerX + 500, y: centerY - 100, width: 300 },
                { x: centerX - 800, y: centerY + 100, width: 300 },
                { x: centerX + 500, y: centerY + 100, width: 300 },
                { x: centerX - 600, y: centerY, width: 300 },
                { x: centerX + 600, y: centerY, width: 300 }
            ];
        }
    },
    
    empty: {
        name: "Empty Arena",
        createPlatforms: (WORLD_WIDTH, WORLD_HEIGHT) => {
            const centerX = WORLD_WIDTH / 2;
            const centerY = WORLD_HEIGHT / 2;
            
            return [
                // Just a few platforms near the center
                { x: centerX - 200, y: centerY, width: 400 },
                { x: centerX - 100, y: centerY - 200, width: 200 },
                { x: centerX - 100, y: centerY + 200, width: 200 }
            ];
        }
    }
};

export { maps }; 