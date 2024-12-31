class Particle {
    constructor(x, y, angle, speed, color, size = 4) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.color = color;
        this.size = size;
        this.alpha = 1;
        this.deceleration = 0.97; // Slower deceleration (was 0.95)
        this.fadeRate = 0.02;     // Slower fade (was 0.03)
        this.rotation = Math.random() * Math.PI * 2; // Add rotation
        this.rotationSpeed = (Math.random() - 0.5) * 0.2; // Rotation speed
    }

    update() {
        // Update position using angle and speed
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        // Slow down the particle
        this.speed *= this.deceleration;
        
        // Update rotation
        this.rotation += this.rotationSpeed;
        
        // Fade out
        this.alpha = Math.max(0, this.alpha - this.fadeRate);
        
        return this.alpha > 0; // Return true if particle is still visible
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Draw a more interesting shape (diamond)
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

class DeathBurst {
    constructor(x, y, color) {
        this.x = x;  // Store initial position
        this.y = y;
        this.color = color;
        this.particles = [];
        const numParticles = 30;
        
        // Create particles in a circular burst
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles + (Math.random() * 0.5 - 0.25);
            const speed = 8 + Math.random() * 4;
            const size = 4 + Math.random() * 4;
            this.particles.push(new Particle(x, y, angle, speed, color, size));
        }
        console.log('DeathBurst created with', numParticles, 'particles at', x, y);
    }

    update() {
        const oldLength = this.particles.length;
        // Update all particles and remove dead ones
        this.particles = this.particles.filter(particle => particle.update());
        if (oldLength !== this.particles.length) {
            console.log('Particles updated, count changed from', oldLength, 'to', this.particles.length);
        }
        return this.particles.length > 0; // Return true if any particles are still alive
    }

    draw(ctx) {
        // Add glow effect
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.particles[0]?.color || 'white';
        
        this.particles.forEach(particle => particle.draw(ctx));
        
        ctx.restore();
    }
}

export { DeathBurst }; 