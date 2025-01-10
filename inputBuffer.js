// Input action constants
export const INPUT_LEFT = 'left';
export const INPUT_RIGHT = 'right';
export const INPUT_JUMP = 'jump';
export const INPUT_SHOOT = 'shoot';
export const INPUT_RUSH = 'rush';
export const INPUT_DROP = 'drop';

// Input buffer class for handling input history
export class InputBuffer {
    constructor() {
        this.buffer = new Map();
        this.currentFrame = 0;
    }

    addInput(frame, input) {
        this.buffer.set(frame, input);
        this.currentFrame = Math.max(this.currentFrame, frame);
    }

    getInput(frame) {
        return this.buffer.get(frame) || {
            [INPUT_LEFT]: false,
            [INPUT_RIGHT]: false,
            [INPUT_JUMP]: false,
            [INPUT_SHOOT]: false,
            [INPUT_RUSH]: false,
            [INPUT_DROP]: false
        };
    }

    cleanup(beforeFrame) {
        for (const frame of this.buffer.keys()) {
            if (frame < beforeFrame) {
                this.buffer.delete(frame);
            }
        }
    }
} 