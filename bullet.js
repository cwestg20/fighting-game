import { BULLET_SPEED } from './constants.js';
import { debugControls } from './debug.js';

// Utility function needed by Bullet
function checkCollision(rect1, rect2) {
    // Add a small buffer to make collisions more forgiving
    const buffer = 2;
    return rect1.x + buffer < rect2.x + rect2.width &&
           rect1.x + rect1.width - buffer > rect2.x &&
           rect1.y + buffer < rect2.y + rect2.height &&
           rect1.y + rect1.height - buffer > rect2.y;
}

class Bullet {
    constructor(x, y, direction, owner) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.velocityX = direction * BULLET_SPEED * (1/60); // Scale for one frame
        this.owner = owner;
        this.color = this.lightenColor(owner.color, 50);  // 50% lighter
        // Add debug bounds
        this.width = this.radius * 2;
        this.height = this.radius * 2;
    }

    // Add method to lighten colors
    lightenColor(color, percent) {
        // Handle named colors
        const colorMap = {
            'blue': '#0000FF',
            'red': '#FF0000',
            'green': '#008000',
            'purple': '#800080',
            'orange': '#FFA500',
            'yellow': '#FFD700',  // Using a darker yellow for better visibility
            'cyan': '#00FFFF',
            'magenta': '#FF00FF',
            'brown': '#A52A2A'
        };
        
        // Convert named color to hex if it exists in our map
        if (colorMap[color]) {
            color = colorMap[color];
        }
        
        // Convert to RGB
        let hex = color.replace('#', '');
        let r = parseInt(hex.substr(0, 2), 16);
        let g = parseInt(hex.substr(2, 2), 16);
        let b = parseInt(hex.substr(4, 2), 16);

        // Make lighter
        r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
        g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
        b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

        // Convert back to hex
        const rr = r.toString(16).padStart(2, '0');
        const gg = g.toString(16).padStart(2, '0');
        const bb = b.toString(16).padStart(2, '0');

        return `#${rr}${gg}${bb}`;
    }

    update(timeStep) {
        // Use fixed timestep for deterministic physics
        this.x += this.velocityX;
        // Update collision bounds
        this.width = this.radius * 2;
        this.height = this.radius * 2;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a glowing effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;  // Reset shadow for other drawings
        ctx.closePath();

        // Draw collision bounds for debugging
        if (debugControls.debugBounds) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.width, this.height);
        }
    }

    checkCollision(character) {
        // Don't damage the character that shot this bullet or characters that are rushing
        if (character === this.owner || character.isRushing) {
            return false;
        }

        // Create a rectangle representation of the bullet for collision check
        const bulletRect = {
            x: this.x - this.radius,
            y: this.y - this.radius,
            width: this.radius * 2,
            height: this.radius * 2
        };

        const characterRect = {
            x: character.x,
            y: character.y,
            width: character.width,
            height: character.height
        };

        const hasCollision = checkCollision(bulletRect, characterRect);
        
        if (hasCollision) {
            console.log('Bullet collision detected:', {
                bullet: bulletRect,
                character: characterRect,
                bulletColor: this.color,
                characterColor: character.color
            });
        }

        return hasCollision;
    }
}

export { Bullet }; 