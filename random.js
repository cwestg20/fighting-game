// Mulberry32 seeded RNG implementation
class Random {
    constructor(seed = 1) {
        this.seed = seed;
    }

    // Returns a number between 0 and 1
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    // Returns an integer between min (inclusive) and max (exclusive)
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min)) + min;
    }

    // Returns a float between min (inclusive) and max (exclusive)
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }

    // Returns true or false with given probability
    chance(probability) {
        return this.next() < probability;
    }
}

export { Random }; 