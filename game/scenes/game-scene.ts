import * as Phaser from "phaser";
import { InputController } from "../input/input-controller";
import {
  Direction,
  GameState,
  TileType,
  GridPosition,
  TrailSegment,
  GAME_CONSTANTS,
  DIRECTION_VECTORS,
} from "../types";

/**
 * GameScene - Main game logic for SpeedyGecko
 *
 * Handles:
 * - Grid-based movement with smooth interpolation
 * - Gecko rendering and animation
 * - Food spawning and collection
 * - Trail management (fading trail that causes death on collision)
 * - Speed increase mechanics
 * - Special tiles (speed pads, mud, ice)
 * - Score tracking and game over flow
 */
export class GameScene extends Phaser.Scene {
  // Game state
  private gameState: GameState = GameState.PLAYING;
  private score: number = 0;
  private currentSpeed: number = GAME_CONSTANTS.INITIAL_SPEED;

  // Input
  private inputController!: InputController;

  // Gecko (player)
  private geckoContainer!: Phaser.GameObjects.Container;
  private geckoGridPos: GridPosition = { x: 5, y: 5 };
  private targetGridPos: GridPosition = { x: 5, y: 5 };
  private isMoving: boolean = false;

  // Trail
  private trail: TrailSegment[] = [];

  // Food
  private food!: Phaser.GameObjects.Container;
  private foodGridPos: GridPosition = { x: 10, y: 10 };

  // Grid/Map
  private grid: TileType[][] = [];
  private tileGraphics: Phaser.GameObjects.Rectangle[][] = [];

  // UI
  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private gameOverContainer!: Phaser.GameObjects.Container;

  // Speed effects
  private speedBoostActive: boolean = false;
  private speedBoostEndTime: number = 0;
  private currentTileEffect: TileType = TileType.EMPTY;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.resetGameState();
    this.createGrid();
    this.createGecko();
    this.createFood();
    this.createUI();
    this.createGameOverUI();
    this.inputController = new InputController(this, Direction.RIGHT);

    // Set up restart key
    this.input.keyboard?.on("keydown-R", () => {
      if (this.gameState === GameState.GAME_OVER) {
        this.restartGame();
      }
    });
  }

  /**
   * Reset all game state variables
   */
  private resetGameState(): void {
    this.gameState = GameState.PLAYING;
    this.score = 0;
    this.currentSpeed = GAME_CONSTANTS.INITIAL_SPEED;
    this.geckoGridPos = { x: 5, y: 5 };
    this.targetGridPos = { x: 5, y: 5 };
    this.isMoving = false;
    this.speedBoostActive = false;
    this.currentTileEffect = TileType.EMPTY;
    this.trail = [];
  }

  /**
   * Create the game grid with walls and special tiles
   */
  private createGrid(): void {
    const { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, COLORS } = GAME_CONSTANTS;

    // Initialize grid with empty tiles
    this.grid = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(TileType.EMPTY));

    // Add border walls
    for (let x = 0; x < GRID_WIDTH; x++) {
      this.grid[0][x] = TileType.WALL;
      this.grid[GRID_HEIGHT - 1][x] = TileType.WALL;
    }
    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.grid[y][0] = TileType.WALL;
      this.grid[y][GRID_WIDTH - 1] = TileType.WALL;
    }

    // Add some internal walls to create maze-like obstacles
    this.addInternalWalls();

    // Add special tiles
    this.addSpecialTiles();

    // Create visual representation
    this.tileGraphics = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.tileGraphics[y] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tileType = this.grid[y][x];
        let color: number = COLORS.FLOOR;

        switch (tileType) {
          case TileType.WALL:
            color = COLORS.WALL;
            break;
          case TileType.SPEED_PAD:
            color = COLORS.SPEED_PAD;
            break;
          case TileType.MUD:
            color = COLORS.MUD;
            break;
          case TileType.ICE:
            color = COLORS.ICE;
            break;
        }

        const tile = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 1,
          TILE_SIZE - 1,
          color
        );
        this.tileGraphics[y][x] = tile;
      }
    }
  }

  /**
   * Add internal walls to create obstacles
   */
  private addInternalWalls(): void {
    // Create some L-shaped and rectangular obstacles
    const wallPatterns = [
      // Horizontal walls
      { startX: 5, startY: 5, length: 6, horizontal: true },
      { startX: 14, startY: 5, length: 6, horizontal: true },
      { startX: 8, startY: 10, length: 9, horizontal: true },
      { startX: 5, startY: 14, length: 6, horizontal: true },
      { startX: 14, startY: 14, length: 6, horizontal: true },
      // Vertical walls
      { startX: 10, startY: 3, length: 4, horizontal: false },
      { startX: 14, startY: 3, length: 4, horizontal: false },
      { startX: 10, startY: 12, length: 4, horizontal: false },
      { startX: 14, startY: 12, length: 4, horizontal: false },
    ];

    for (const pattern of wallPatterns) {
      for (let i = 0; i < pattern.length; i++) {
        const x = pattern.horizontal ? pattern.startX + i : pattern.startX;
        const y = pattern.horizontal ? pattern.startY : pattern.startY + i;
        if (this.isValidGridPosition(x, y)) {
          this.grid[y][x] = TileType.WALL;
        }
      }
    }
  }

  /**
   * Add special tiles (speed pads, mud, ice)
   */
  private addSpecialTiles(): void {
    // Speed pads - high risk/reward
    const speedPadPositions = [
      { x: 3, y: 3 },
      { x: 21, y: 3 },
      { x: 3, y: 15 },
      { x: 21, y: 15 },
      { x: 12, y: 9 },
    ];

    // Mud tiles - slow down
    const mudPositions = [
      { x: 7, y: 7 },
      { x: 8, y: 7 },
      { x: 17, y: 7 },
      { x: 18, y: 7 },
      { x: 7, y: 12 },
      { x: 8, y: 12 },
      { x: 17, y: 12 },
      { x: 18, y: 12 },
    ];

    // Ice tiles - low friction
    const icePositions = [
      { x: 11, y: 3 },
      { x: 12, y: 3 },
      { x: 13, y: 3 },
      { x: 11, y: 16 },
      { x: 12, y: 16 },
      { x: 13, y: 16 },
    ];

    for (const pos of speedPadPositions) {
      this.grid[pos.y][pos.x] = TileType.SPEED_PAD;
    }
    for (const pos of mudPositions) {
      this.grid[pos.y][pos.x] = TileType.MUD;
    }
    for (const pos of icePositions) {
      this.grid[pos.y][pos.x] = TileType.ICE;
    }
  }

  /**
   * Create the gecko (player character)
   * Drawn as a simple top-down gecko shape
   */
  private createGecko(): void {
    const { TILE_SIZE, COLORS } = GAME_CONSTANTS;

    this.geckoContainer = this.add.container(0, 0);

    // Body (oval)
    const body = this.add.ellipse(0, 0, TILE_SIZE * 0.7, TILE_SIZE * 0.9, COLORS.GECKO_BODY);

    // Head (circle at top)
    const head = this.add.circle(0, -TILE_SIZE * 0.35, TILE_SIZE * 0.25, COLORS.GECKO_BODY);

    // Eyes
    const leftEye = this.add.circle(-4, -TILE_SIZE * 0.38, 3, COLORS.GECKO_ACCENT);
    const rightEye = this.add.circle(4, -TILE_SIZE * 0.38, 3, COLORS.GECKO_ACCENT);

    // Legs (4 small rectangles)
    const legWidth = 6;
    const legHeight = 12;
    const frontLeftLeg = this.add.rectangle(-TILE_SIZE * 0.35, -TILE_SIZE * 0.15, legWidth, legHeight, COLORS.GECKO_BODY);
    frontLeftLeg.setAngle(-30);
    const frontRightLeg = this.add.rectangle(TILE_SIZE * 0.35, -TILE_SIZE * 0.15, legWidth, legHeight, COLORS.GECKO_BODY);
    frontRightLeg.setAngle(30);
    const backLeftLeg = this.add.rectangle(-TILE_SIZE * 0.35, TILE_SIZE * 0.15, legWidth, legHeight, COLORS.GECKO_BODY);
    backLeftLeg.setAngle(30);
    const backRightLeg = this.add.rectangle(TILE_SIZE * 0.35, TILE_SIZE * 0.15, legWidth, legHeight, COLORS.GECKO_BODY);
    backRightLeg.setAngle(-30);

    // Tail
    const tail = this.add.ellipse(0, TILE_SIZE * 0.45, TILE_SIZE * 0.2, TILE_SIZE * 0.4, COLORS.GECKO_BODY);

    this.geckoContainer.add([
      tail,
      backLeftLeg,
      backRightLeg,
      body,
      frontLeftLeg,
      frontRightLeg,
      head,
      leftEye,
      rightEye,
    ]);

    this.updateGeckoPosition();
  }

  /**
   * Update gecko visual position based on grid position
   */
  private updateGeckoPosition(): void {
    const { TILE_SIZE } = GAME_CONSTANTS;
    this.geckoContainer.x = this.geckoGridPos.x * TILE_SIZE + TILE_SIZE / 2;
    this.geckoContainer.y = this.geckoGridPos.y * TILE_SIZE + TILE_SIZE / 2;
  }

  /**
   * Create the food item
   */
  private createFood(): void {
    const { TILE_SIZE, COLORS } = GAME_CONSTANTS;

    this.food = this.add.container(0, 0);

    // Main food body (glowing orb)
    const foodBody = this.add.circle(0, 0, TILE_SIZE * 0.3, COLORS.FOOD);
    const foodGlow = this.add.circle(0, 0, TILE_SIZE * 0.35, COLORS.FOOD, 0.3);

    this.food.add([foodGlow, foodBody]);

    // Add pulsing animation
    this.tweens.add({
      targets: foodGlow,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.spawnFood();
  }

  /**
   * Spawn food at a random valid position
   */
  private spawnFood(): void {
    const { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE } = GAME_CONSTANTS;

    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const x = Phaser.Math.Between(2, GRID_WIDTH - 3);
      const y = Phaser.Math.Between(2, GRID_HEIGHT - 3);

      // Check if position is valid (not wall, not gecko, not trail)
      if (
        this.grid[y][x] === TileType.EMPTY &&
        !(x === this.geckoGridPos.x && y === this.geckoGridPos.y) &&
        !this.isTrailAtPosition(x, y)
      ) {
        this.foodGridPos = { x, y };
        this.food.x = x * TILE_SIZE + TILE_SIZE / 2;
        this.food.y = y * TILE_SIZE + TILE_SIZE / 2;
        return;
      }
      attempts++;
    }

    // Fallback: just place it somewhere
    this.foodGridPos = { x: 12, y: 9 };
    this.food.x = this.foodGridPos.x * TILE_SIZE + TILE_SIZE / 2;
    this.food.y = this.foodGridPos.y * TILE_SIZE + TILE_SIZE / 2;
  }

  /**
   * Check if there's trail at a given position
   */
  private isTrailAtPosition(x: number, y: number): boolean {
    return this.trail.some((segment) => segment.x === x && segment.y === y);
  }

  /**
   * Create UI elements (score, speed display)
   */
  private createUI(): void {
    const { UI_PADDING, SCORE_FONT_SIZE } = GAME_CONSTANTS;

    this.scoreText = this.add.text(UI_PADDING, UI_PADDING, "Score: 0", {
      fontSize: `${SCORE_FONT_SIZE}px`,
      color: "#ffffff",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 4,
    });

    this.speedText = this.add.text(UI_PADDING, UI_PADDING + 30, `Speed: ${this.currentSpeed}`, {
      fontSize: "18px",
      color: "#fbbf24",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
    });

    // Instructions
    const instructions = this.add.text(
      GAME_CONSTANTS.GAME_WIDTH - UI_PADDING,
      UI_PADDING,
      "Arrow/WASD to move\nR to restart",
      {
        fontSize: "14px",
        color: "#9ca3af",
        fontFamily: "monospace",
        align: "right",
      }
    );
    instructions.setOrigin(1, 0);
  }

  /**
   * Create game over overlay
   */
  private createGameOverUI(): void {
    const { GAME_WIDTH, GAME_HEIGHT } = GAME_CONSTANTS;

    this.gameOverContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.gameOverContainer.setVisible(false);

    // Dark overlay
    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    // Game Over text
    const gameOverText = this.add.text(0, -60, "GAME OVER", {
      fontSize: "48px",
      color: "#ef4444",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 6,
    });
    gameOverText.setOrigin(0.5);

    // Final score
    const finalScoreText = this.add.text(0, 0, "Score: 0", {
      fontSize: "32px",
      color: "#ffffff",
      fontFamily: "monospace",
    });
    finalScoreText.setOrigin(0.5);
    finalScoreText.setName("finalScore");

    // Restart instruction
    const restartText = this.add.text(0, 60, "Press R or tap to restart", {
      fontSize: "20px",
      color: "#9ca3af",
      fontFamily: "monospace",
    });
    restartText.setOrigin(0.5);

    this.gameOverContainer.add([overlay, gameOverText, finalScoreText, restartText]);

    // Add touch restart
    overlay.setInteractive();
    overlay.on("pointerdown", () => {
      if (this.gameState === GameState.GAME_OVER) {
        this.restartGame();
      }
    });
  }

  /**
   * Show game over screen
   */
  private showGameOver(): void {
    this.gameState = GameState.GAME_OVER;
    this.gameOverContainer.setVisible(true);

    const finalScoreText = this.gameOverContainer.getByName("finalScore") as Phaser.GameObjects.Text;
    if (finalScoreText) {
      finalScoreText.setText(`Score: ${this.score}`);
    }

    // Flash the gecko red
    this.tweens.add({
      targets: this.geckoContainer,
      alpha: 0.3,
      duration: 200,
      yoyo: true,
      repeat: 3,
    });
  }

  /**
   * Restart the game
   */
  private restartGame(): void {
    // Clear trail graphics
    for (const segment of this.trail) {
      segment.graphic.destroy();
    }

    this.resetGameState();
    this.inputController.reset(Direction.RIGHT);

    // Reset gecko position
    this.geckoGridPos = { x: 5, y: 5 };
    this.updateGeckoPosition();
    this.geckoContainer.setRotation(0);
    this.geckoContainer.setAlpha(1);

    // Spawn new food
    this.spawnFood();

    // Update UI
    this.scoreText.setText("Score: 0");
    this.speedText.setText(`Speed: ${this.currentSpeed}`);

    // Hide game over
    this.gameOverContainer.setVisible(false);
  }

  /**
   * Main game update loop
   */
  update(time: number, delta: number): void {
    if (this.gameState !== GameState.PLAYING) {
      return;
    }

    // Update trail (remove expired segments)
    this.updateTrail(time);

    // Check for speed boost expiration
    if (this.speedBoostActive && time > this.speedBoostEndTime) {
      this.speedBoostActive = false;
    }

    // Handle movement
    if (!this.isMoving) {
      this.startNextMove();
    } else {
      this.continueMove(delta);
    }
  }

  /**
   * Start the next movement towards target grid position
   */
  private startNextMove(): void {
    // Apply any queued direction change
    this.inputController.applyNextDirection();

    const direction = this.inputController.getCurrentDirection();
    const vector = DIRECTION_VECTORS[direction];

    const nextX = this.geckoGridPos.x + vector.x;
    const nextY = this.geckoGridPos.y + vector.y;

    // Check if next position is valid
    if (!this.isValidMove(nextX, nextY)) {
      // Try to continue in current direction (will hit wall)
      return;
    }

    // Add current position to trail before moving
    this.addTrailSegment(this.geckoGridPos.x, this.geckoGridPos.y);

    // Set target
    this.targetGridPos = { x: nextX, y: nextY };
    this.isMoving = true;

    // Rotate gecko to face movement direction
    this.updateGeckoRotation(direction);
  }

  /**
   * Continue smooth movement towards target
   */
  private continueMove(delta: number): void {
    const { TILE_SIZE } = GAME_CONSTANTS;

    // Calculate effective speed
    let effectiveSpeed = this.currentSpeed;

    // Apply speed boost if active
    if (this.speedBoostActive) {
      effectiveSpeed += GAME_CONSTANTS.SPEED_PAD_BOOST;
    }

    // Apply tile effects
    switch (this.currentTileEffect) {
      case TileType.MUD:
        effectiveSpeed *= GAME_CONSTANTS.MUD_SLOWDOWN;
        break;
      case TileType.ICE:
        // Ice doesn't slow down, but we could add sliding mechanics later
        break;
    }

    const moveDistance = (effectiveSpeed * delta) / 1000;

    // Calculate current world position
    const currentWorldX = this.geckoContainer.x;
    const currentWorldY = this.geckoContainer.y;

    // Calculate target world position
    const targetWorldX = this.targetGridPos.x * TILE_SIZE + TILE_SIZE / 2;
    const targetWorldY = this.targetGridPos.y * TILE_SIZE + TILE_SIZE / 2;

    // Move towards target
    const dx = targetWorldX - currentWorldX;
    const dy = targetWorldY - currentWorldY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= moveDistance) {
      // Reached target
      this.geckoGridPos = { ...this.targetGridPos };
      this.updateGeckoPosition();
      this.isMoving = false;

      // Check tile effects at new position
      this.checkTileEffects();

      // Check collisions
      this.checkCollisions();
    } else {
      // Continue moving
      const ratio = moveDistance / distance;
      this.geckoContainer.x += dx * ratio;
      this.geckoContainer.y += dy * ratio;
    }
  }

  /**
   * Check if a move to the given position is valid
   */
  private isValidMove(x: number, y: number): boolean {
    if (!this.isValidGridPosition(x, y)) {
      return false;
    }
    return this.grid[y][x] !== TileType.WALL;
  }

  /**
   * Check if position is within grid bounds
   */
  private isValidGridPosition(x: number, y: number): boolean {
    return x >= 0 && x < GAME_CONSTANTS.GRID_WIDTH && y >= 0 && y < GAME_CONSTANTS.GRID_HEIGHT;
  }

  /**
   * Update gecko rotation based on direction
   */
  private updateGeckoRotation(direction: Direction): void {
    const rotations: Record<Direction, number> = {
      [Direction.UP]: 0,
      [Direction.RIGHT]: Math.PI / 2,
      [Direction.DOWN]: Math.PI,
      [Direction.LEFT]: -Math.PI / 2,
    };

    this.tweens.add({
      targets: this.geckoContainer,
      rotation: rotations[direction],
      duration: 100,
    });
  }

  /**
   * Add a trail segment at the given position
   */
  private addTrailSegment(x: number, y: number): void {
    const { TILE_SIZE, COLORS, TRAIL_OPACITY } = GAME_CONSTANTS;

    const graphic = this.add.rectangle(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE * 0.6,
      TILE_SIZE * 0.6,
      COLORS.TRAIL,
      TRAIL_OPACITY
    );

    // Add to back of display list (behind gecko)
    graphic.setDepth(-1);

    const segment: TrailSegment = {
      x,
      y,
      createdAt: this.time.now,
      graphic,
    };

    this.trail.push(segment);
  }

  /**
   * Update trail - fade out and remove old segments
   */
  private updateTrail(currentTime: number): void {
    const { TRAIL_LIFETIME, TRAIL_OPACITY } = GAME_CONSTANTS;

    const expiredSegments: TrailSegment[] = [];

    for (const segment of this.trail) {
      const age = currentTime - segment.createdAt;

      if (age >= TRAIL_LIFETIME) {
        expiredSegments.push(segment);
      } else {
        // Fade based on age
        const fadeRatio = 1 - age / TRAIL_LIFETIME;
        segment.graphic.setAlpha(TRAIL_OPACITY * fadeRatio);
      }
    }

    // Remove expired segments
    for (const segment of expiredSegments) {
      segment.graphic.destroy();
      const index = this.trail.indexOf(segment);
      if (index > -1) {
        this.trail.splice(index, 1);
      }
    }
  }

  /**
   * Check tile effects at current position
   */
  private checkTileEffects(): void {
    const tileType = this.grid[this.geckoGridPos.y][this.geckoGridPos.x];
    this.currentTileEffect = tileType;

    if (tileType === TileType.SPEED_PAD && !this.speedBoostActive) {
      // Activate speed boost
      this.speedBoostActive = true;
      this.speedBoostEndTime = this.time.now + GAME_CONSTANTS.SPEED_PAD_DURATION;

      // Visual feedback
      this.cameras.main.flash(100, 255, 100, 100, true);
    }
  }

  /**
   * Check for collisions (food, trail)
   */
  private checkCollisions(): void {
    // Check food collision
    if (
      this.geckoGridPos.x === this.foodGridPos.x &&
      this.geckoGridPos.y === this.foodGridPos.y
    ) {
      this.collectFood();
    }

    // Check trail collision (skip very recent segments)
    const graceTime = 200; // ms grace period to avoid instant death
    for (const segment of this.trail) {
      if (
        segment.x === this.geckoGridPos.x &&
        segment.y === this.geckoGridPos.y &&
        this.time.now - segment.createdAt > graceTime
      ) {
        this.showGameOver();
        return;
      }
    }
  }

  /**
   * Collect food and increase score/speed
   */
  private collectFood(): void {
    this.score++;
    this.scoreText.setText(`Score: ${this.score}`);

    // Increase speed
    this.currentSpeed = Math.min(
      this.currentSpeed + GAME_CONSTANTS.SPEED_INCREMENT,
      GAME_CONSTANTS.MAX_SPEED
    );
    this.speedText.setText(`Speed: ${Math.round(this.currentSpeed)}`);

    // Visual feedback
    this.tweens.add({
      targets: this.food,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.spawnFood();
      },
    });

    // Camera shake for feedback
    this.cameras.main.shake(100, 0.005);
  }

  /**
   * Clean up when scene is destroyed
   */
  shutdown(): void {
    this.inputController?.destroy();
  }
}
