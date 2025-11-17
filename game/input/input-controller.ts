import { Direction, OPPOSITE_DIRECTIONS } from "../types";

/**
 * InputController - Abstraction layer for game input
 *
 * Handles both keyboard and touch/swipe input, providing a unified
 * interface for the game logic. Prevents 180-degree turns to avoid
 * instant self-collision at high speeds.
 */
export class InputController {
  private currentDirection: Direction;
  private nextDirection: Direction;
  private scene: Phaser.Scene;
  private swipeStartX: number = 0;
  private swipeStartY: number = 0;
  private minSwipeDistance: number = 30;

  constructor(scene: Phaser.Scene, initialDirection: Direction = Direction.RIGHT) {
    this.scene = scene;
    this.currentDirection = initialDirection;
    this.nextDirection = initialDirection;

    this.setupKeyboardInput();
    this.setupTouchInput();
  }

  /**
   * Set up keyboard listeners for arrow keys and WASD
   */
  private setupKeyboardInput(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    // Arrow keys
    keyboard.on("keydown-UP", () => this.setDirection(Direction.UP));
    keyboard.on("keydown-DOWN", () => this.setDirection(Direction.DOWN));
    keyboard.on("keydown-LEFT", () => this.setDirection(Direction.LEFT));
    keyboard.on("keydown-RIGHT", () => this.setDirection(Direction.RIGHT));

    // WASD keys
    keyboard.on("keydown-W", () => this.setDirection(Direction.UP));
    keyboard.on("keydown-S", () => this.setDirection(Direction.DOWN));
    keyboard.on("keydown-A", () => this.setDirection(Direction.LEFT));
    keyboard.on("keydown-D", () => this.setDirection(Direction.RIGHT));
  }

  /**
   * Set up touch/swipe input for mobile support
   */
  private setupTouchInput(): void {
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.swipeStartX = pointer.x;
      this.swipeStartY = pointer.y;
    });

    this.scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - this.swipeStartX;
      const dy = pointer.y - this.swipeStartY;

      // Check if swipe is long enough
      if (Math.abs(dx) < this.minSwipeDistance && Math.abs(dy) < this.minSwipeDistance) {
        return;
      }

      // Determine swipe direction
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 0) {
          this.setDirection(Direction.RIGHT);
        } else {
          this.setDirection(Direction.LEFT);
        }
      } else {
        // Vertical swipe
        if (dy > 0) {
          this.setDirection(Direction.DOWN);
        } else {
          this.setDirection(Direction.UP);
        }
      }
    });
  }

  /**
   * Set the next direction, preventing 180-degree turns
   */
  setDirection(direction: Direction): void {
    // Prevent 180-degree turns (instant self-collision)
    if (OPPOSITE_DIRECTIONS[this.currentDirection] === direction) {
      return;
    }
    this.nextDirection = direction;
  }

  /**
   * Get the current direction the gecko is moving
   */
  getCurrentDirection(): Direction {
    return this.currentDirection;
  }

  /**
   * Get the next queued direction (for previewing)
   */
  getNextDirection(): Direction {
    return this.nextDirection;
  }

  /**
   * Apply the queued direction change
   * Called when the gecko reaches a grid position and can turn
   */
  applyNextDirection(): void {
    // Double-check for 180-degree turn prevention
    if (OPPOSITE_DIRECTIONS[this.currentDirection] !== this.nextDirection) {
      this.currentDirection = this.nextDirection;
    }
  }

  /**
   * Reset input state (e.g., on game restart)
   */
  reset(direction: Direction = Direction.RIGHT): void {
    this.currentDirection = direction;
    this.nextDirection = direction;
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.scene.input.keyboard?.removeAllListeners();
    this.scene.input.removeAllListeners();
  }
}
