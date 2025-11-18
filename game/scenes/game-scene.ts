import * as Phaser from "phaser";
import { InputController } from "../input/input-controller";
import {
  Direction,
  GameState,
  TileType,
  GridPosition,
  ParticleEffect,
  GAME_CONSTANTS,
  DIRECTION_VECTORS,
  PERPENDICULAR_DIRECTIONS,
} from "../types";

/**
 * GameScene - Main game logic for SpeedyGecko
 *
 * Handles:
 * - Grid-based movement with smooth interpolation and wall sliding
 * - Gecko rendering with animated legs
 * - Food spawning and collection with eating animation
 * - Speed increase mechanics
 * - Special tiles (speed pads, mud, ice) and death tiles (lava, chemical)
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
  private geckoLegs!: Phaser.GameObjects.Rectangle[];
  private legAnimationTween?: Phaser.Tweens.Tween;
  private geckoGridPos: GridPosition = { x: 5, y: 5 };
  private targetGridPos: GridPosition = { x: 5, y: 5 };
  private isMoving: boolean = false;

  // Food
  private food!: Phaser.GameObjects.Container;
  private foodGridPos: GridPosition = { x: 10, y: 10 };
  private foodVisible: boolean = true;

  // Effects
  private particleEffects: ParticleEffect[] = [];

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
    this.foodVisible = true;
    this.particleEffects = [];
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
          case TileType.LAVA:
            color = COLORS.LAVA;
            break;
          case TileType.CHEMICAL:
            color = COLORS.CHEMICAL;
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
   * Add special tiles (speed pads, mud, ice, lava, chemical)
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

    // Lava tiles - instant death
    const lavaPositions = [
      { x: 6, y: 9 },
      { x: 7, y: 9 },
      { x: 18, y: 9 },
      { x: 19, y: 9 },
    ];

    // Chemical puddles - instant death
    const chemicalPositions = [
      { x: 12, y: 5 },
      { x: 13, y: 5 },
      { x: 12, y: 13 },
      { x: 13, y: 13 },
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
    for (const pos of lavaPositions) {
      this.grid[pos.y][pos.x] = TileType.LAVA;
    }
    for (const pos of chemicalPositions) {
      this.grid[pos.y][pos.x] = TileType.CHEMICAL;
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

    // Legs (4 small rectangles) - store for animation
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

    // Store legs for animation
    this.geckoLegs = [frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg];

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
    this.startLegAnimation();
  }

  /**
   * Start continuous leg animation based on speed
   */
  private startLegAnimation(): void {
    const duration = this.calculateLegAnimationDuration();

    // Kill existing animation if any
    if (this.legAnimationTween) {
      this.legAnimationTween.stop();
    }

    // Animate legs with alternating pattern
    this.legAnimationTween = this.tweens.add({
      targets: [this.geckoLegs[0], this.geckoLegs[3]], // front-left and back-right
      angle: "+=20",
      duration: duration / 2,
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: [this.geckoLegs[1], this.geckoLegs[2]], // front-right and back-left
      angle: "-=20",
      duration: duration / 2,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Calculate leg animation duration based on current speed
   */
  private calculateLegAnimationDuration(): number {
    const { INITIAL_SPEED, MAX_SPEED, LEG_ANIMATION_BASE_DURATION, LEG_ANIMATION_MIN_DURATION } =
      GAME_CONSTANTS;

    // Linear interpolation between base and min duration
    const speedRatio = (this.currentSpeed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);
    const duration =
      LEG_ANIMATION_BASE_DURATION -
      speedRatio * (LEG_ANIMATION_BASE_DURATION - LEG_ANIMATION_MIN_DURATION);

    return Math.max(duration, LEG_ANIMATION_MIN_DURATION);
  }

  /**
   * Update leg animation speed based on current speed
   */
  private updateLegAnimationSpeed(): void {
    const newDuration = this.calculateLegAnimationDuration();

    // Restart animation with new duration
    this.startLegAnimation();
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

      // Check if position is valid (empty tile, not gecko, not death tile)
      const tileType = this.grid[y][x];
      if (
        tileType === TileType.EMPTY &&
        !(x === this.geckoGridPos.x && y === this.geckoGridPos.y)
      ) {
        this.foodGridPos = { x, y };
        this.food.x = x * TILE_SIZE + TILE_SIZE / 2;
        this.food.y = y * TILE_SIZE + TILE_SIZE / 2;
        this.food.setVisible(true);
        this.foodVisible = true;
        return;
      }
      attempts++;
    }

    // Fallback: just place it somewhere safe
    this.foodGridPos = { x: 12, y: 9 };
    this.food.x = this.foodGridPos.x * TILE_SIZE + TILE_SIZE / 2;
    this.food.y = this.foodGridPos.y * TILE_SIZE + TILE_SIZE / 2;
    this.food.setVisible(true);
    this.foodVisible = true;
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
    // Clear particle effects
    for (const effect of this.particleEffects) {
      for (const graphic of effect.graphics) {
        graphic.destroy();
      }
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

    // Restart leg animation at initial speed
    this.updateLegAnimationSpeed();

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

    // Clean up old particle effects
    this.updateParticleEffects(time);

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
   * Update and clean up particle effects
   */
  private updateParticleEffects(currentTime: number): void {
    const expiredEffects: ParticleEffect[] = [];

    for (const effect of this.particleEffects) {
      const age = currentTime - effect.createdAt;

      if (age >= 500) {
        // 500ms lifetime for food particles
        expiredEffects.push(effect);
      } else {
        // Fade out
        const fadeRatio = 1 - age / 500;
        for (const graphic of effect.graphics) {
          graphic.setAlpha(fadeRatio);
        }
      }
    }

    // Remove expired effects
    for (const effect of expiredEffects) {
      for (const graphic of effect.graphics) {
        graphic.destroy();
      }
      const index = this.particleEffects.indexOf(effect);
      if (index > -1) {
        this.particleEffects.splice(index, 1);
      }
    }
  }

  /**
   * Start the next movement towards target grid position
   * Implements wall sliding - auto-turns 90 degrees when hitting a wall
   */
  private startNextMove(): void {
    // Apply any queued direction change
    this.inputController.applyNextDirection();

    let direction = this.inputController.getCurrentDirection();
    let vector = DIRECTION_VECTORS[direction];

    let nextX = this.geckoGridPos.x + vector.x;
    let nextY = this.geckoGridPos.y + vector.y;

    // Check if next position is valid
    if (!this.isValidMove(nextX, nextY)) {
      // Wall hit! Try to slide along it by trying perpendicular directions
      const perpendicularDirs = PERPENDICULAR_DIRECTIONS[direction];

      let foundValid = false;
      for (const perpendicularDir of perpendicularDirs) {
        const perpendicularVector = DIRECTION_VECTORS[perpendicularDir];
        const perpendicularX = this.geckoGridPos.x + perpendicularVector.x;
        const perpendicularY = this.geckoGridPos.y + perpendicularVector.y;

        if (this.isValidMove(perpendicularX, perpendicularY)) {
          // Found a valid perpendicular direction - slide along the wall
          direction = perpendicularDir;
          nextX = perpendicularX;
          nextY = perpendicularY;
          this.inputController.setDirection(perpendicularDir); // Update input controller
          foundValid = true;
          break;
        }
      }

      if (!foundValid) {
        // Completely blocked, can't move
        return;
      }
    }

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
   * Check tile effects at current position
   */
  private checkTileEffects(): void {
    const tileType = this.grid[this.geckoGridPos.y][this.geckoGridPos.x];
    this.currentTileEffect = tileType;

    // Check for death tiles
    if (tileType === TileType.LAVA || tileType === TileType.CHEMICAL) {
      this.showGameOver();
      return;
    }

    // Speed pad effect
    if (tileType === TileType.SPEED_PAD && !this.speedBoostActive) {
      // Activate speed boost
      this.speedBoostActive = true;
      this.speedBoostEndTime = this.time.now + GAME_CONSTANTS.SPEED_PAD_DURATION;

      // Visual feedback
      this.cameras.main.flash(100, 255, 100, 100, true);
    }
  }

  /**
   * Check for collisions (food)
   */
  private checkCollisions(): void {
    // Check food collision only if food is visible
    if (
      this.foodVisible &&
      this.geckoGridPos.x === this.foodGridPos.x &&
      this.geckoGridPos.y === this.foodGridPos.y
    ) {
      this.collectFood();
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

    // Update leg animation speed
    this.updateLegAnimationSpeed();

    // Hide food immediately
    this.food.setVisible(false);
    this.foodVisible = false;

    // Create eating animation - particles bursting outward
    this.createEatingAnimation();

    // Camera shake for feedback
    this.cameras.main.shake(100, 0.005);

    // Spawn new food after a short delay
    this.time.delayedCall(200, () => {
      this.spawnFood();
    });
  }

  /**
   * Create particle effect when eating food
   */
  private createEatingAnimation(): void {
    const { TILE_SIZE, COLORS } = GAME_CONSTANTS;
    const particles: Phaser.GameObjects.Arc[] = [];

    // Create 8 particles bursting outward
    const numParticles = 8;
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const particle = this.add.circle(
        this.foodGridPos.x * TILE_SIZE + TILE_SIZE / 2,
        this.foodGridPos.y * TILE_SIZE + TILE_SIZE / 2,
        4,
        COLORS.FOOD
      );

      particles.push(particle);

      // Animate particle flying outward
      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * 30,
        y: particle.y + Math.sin(angle) * 30,
        alpha: 0,
        duration: 300,
        ease: "Quad.easeOut",
      });
    }

    // Store effect for cleanup
    this.particleEffects.push({
      x: this.foodGridPos.x,
      y: this.foodGridPos.y,
      createdAt: this.time.now,
      graphics: particles,
    });
  }

  /**
   * Clean up when scene is destroyed
   */
  shutdown(): void {
    this.inputController?.destroy();
  }
}
