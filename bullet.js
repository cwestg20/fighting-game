const BULLET_SPEED = 12.75;

// Utility function needed by Bullet
function checkCollision(rect1, rect2) {
    return rect1.x + rect1.width > rect2.x &&
           rect1.x < rect2.x + rect2.width &&
           rect1.y + rect1.height > rect2.y &&
           rect1.y < rect2.y + rect2.height;
}

class Bullet {
    constructor(x, y, direction, owner) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.velocityX = direction * BULLET_SPEED;
        this.owner = owner;
        this.color = this.lightenColor(owner.color, 50);  // 50% lighter
    }

    // Add method to lighten colors
    lightenColor(color, percent) {
        // Handle named colors
        if (color === 'blue') color = '#0000FF';
        if (color === 'red') color = '#FF0000';
        if (color === 'green') color = '#008000';
        if (color === 'purple') color = '#800080';
        
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

    update(timeScale) {
        this.x += this.velocityX * timeScale;
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

        return checkCollision(bulletRect, character);
    }
}

export { Bullet, BULLET_SPEED }; 