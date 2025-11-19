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
  private tileGraphics: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image)[][] = [];

  // UI
  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private gameOverContainer!: Phaser.GameObjects.Container;

  // Death tiles
  private deathTilePositions: GridPosition[] = [];

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

    // Add random death tiles
    this.placeRandomDeathTiles();

    // Create visual representation
    this.tileGraphics = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.tileGraphics[y] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tileType = this.grid[y][x];
        const posX = x * TILE_SIZE + TILE_SIZE / 2;
        const posY = y * TILE_SIZE + TILE_SIZE / 2;

        let tile: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;

        if (tileType === TileType.LAVA) {
          // Use lava texture
          tile = this.add.image(posX, posY, "lava-tile");
        } else if (tileType === TileType.CHEMICAL) {
          // Use chemical texture
          tile = this.add.image(posX, posY, "chemical-tile");
        } else {
          // Use colored rectangles for floor and walls
          let color: number = COLORS.FLOOR;
          if (tileType === TileType.WALL) {
            color = COLORS.WALL;
          }
          tile = this.add.rectangle(posX, posY, TILE_SIZE - 1, TILE_SIZE - 1, color);
        }

        this.tileGraphics[y][x] = tile;
      }
    }
  }

  /**
   * Place random death tiles (lava and chemical puddles) on the grid
   * Avoids placing tiles in gecko's immediate path to prevent instant deaths
   */
  private placeRandomDeathTiles(): void {
    const { GRID_WIDTH, GRID_HEIGHT, NUM_DEATH_TILES } = GAME_CONSTANTS;

    // Clear existing death tiles from grid
    for (const pos of this.deathTilePositions) {
      if (this.grid[pos.y] && this.grid[pos.y][pos.x]) {
        this.grid[pos.y][pos.x] = TileType.EMPTY;
      }
    }

    this.deathTilePositions = [];

    // Get gecko's current direction and position
    const direction = this.inputController.getCurrentDirection();
    const directionVector = DIRECTION_VECTORS[direction];

    // Calculate positions to avoid (tiles in gecko's path)
    const avoidPositions: Set<string> = new Set();

    // Avoid 3 tiles ahead in current direction
    for (let i = 1; i <= 3; i++) {
      const aheadX = this.geckoGridPos.x + directionVector.x * i;
      const aheadY = this.geckoGridPos.y + directionVector.y * i;
      if (this.isValidGridPosition(aheadX, aheadY)) {
        avoidPositions.add(`${aheadX},${aheadY}`);
      }
    }

    // Avoid 1 tile behind (in case of immediate direction reversal)
    const behindX = this.geckoGridPos.x - directionVector.x;
    const behindY = this.geckoGridPos.y - directionVector.y;
    if (this.isValidGridPosition(behindX, behindY)) {
      avoidPositions.add(`${behindX},${behindY}`);
    }

    let placed = 0;
    let attempts = 0;
    const maxAttempts = 200;

    while (placed < NUM_DEATH_TILES && attempts < maxAttempts) {
      const x = Phaser.Math.Between(2, GRID_WIDTH - 3);
      const y = Phaser.Math.Between(2, GRID_HEIGHT - 3);

      // Check if position is valid (empty, not too close to start position, not in path)
      const distanceFromStart = Math.abs(x - 5) + Math.abs(y - 5);
      const posKey = `${x},${y}`;

      if (
        this.grid[y][x] === TileType.EMPTY &&
        distanceFromStart > 3 && // At least 3 tiles away from start
        !(x === this.foodGridPos.x && y === this.foodGridPos.y) && // Not on food
        !avoidPositions.has(posKey) // Not in gecko's immediate path
      ) {
        // Alternate between lava and chemical
        const tileType = placed % 2 === 0 ? TileType.LAVA : TileType.CHEMICAL;
        this.grid[y][x] = tileType;
        this.deathTilePositions.push({ x, y });
        placed++;
      }
      attempts++;
    }
  }

  /**
   * Update the visual tiles to match the grid state
   * Destroys and recreates tiles to switch between rectangles and images
   */
  private updateTileVisuals(): void {
    const { COLORS, TILE_SIZE } = GAME_CONSTANTS;

    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const tileType = this.grid[y][x];
        const existingTile = this.tileGraphics[y][x];
        const posX = x * TILE_SIZE + TILE_SIZE / 2;
        const posY = y * TILE_SIZE + TILE_SIZE / 2;

        // Check if we need to change the tile type
        const needsImageTile = tileType === TileType.LAVA || tileType === TileType.CHEMICAL;
        const isCurrentlyImage = existingTile instanceof Phaser.GameObjects.Image;

        // If type mismatch, destroy and recreate
        if (needsImageTile !== isCurrentlyImage) {
          existingTile.destroy();

          let newTile: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;

          if (tileType === TileType.LAVA) {
            newTile = this.add.image(posX, posY, "lava-tile");
          } else if (tileType === TileType.CHEMICAL) {
            newTile = this.add.image(posX, posY, "chemical-tile");
          } else {
            const color = tileType === TileType.WALL ? COLORS.WALL : COLORS.FLOOR;
            newTile = this.add.rectangle(posX, posY, TILE_SIZE - 1, TILE_SIZE - 1, color);
          }

          this.tileGraphics[y][x] = newTile;
        } else if (!isCurrentlyImage) {
          // Just update the color for rectangles
          const color = tileType === TileType.WALL ? COLORS.WALL : COLORS.FLOOR;
          (existingTile as Phaser.GameObjects.Rectangle).setFillStyle(color);
        } else {
          // Update the texture for images
          const texture = tileType === TileType.LAVA ? "lava-tile" : "chemical-tile";
          (existingTile as Phaser.GameObjects.Image).setTexture(texture);
        }
      }
    }
  }

  /**
   * Create the gecko (player character)
   * Drawn as a simple top-down gecko shape
   */
  private createGecko(): void {
    const { TILE_SIZE, COLORS } = GAME_CONSTANTS;

    this.geckoContainer = this.add.container(0, 0);
    this.geckoContainer.setDepth(2); // Above food and tiles

    // Body (oval)
    const body = this.add.ellipse(0, 0, TILE_SIZE * 0.7, TILE_SIZE * 0.9, COLORS.GECKO_BODY);

    // Head (circle at top)
    const head = this.add.circle(0, -TILE_SIZE * 0.35, TILE_SIZE * 0.25, COLORS.GECKO_BODY);

    // Eyes
    const leftEye = this.add.circle(-4, -TILE_SIZE * 0.38, 3, COLORS.GECKO_ACCENT);
    const rightEye = this.add.circle(4, -TILE_SIZE * 0.38, 3, COLORS.GECKO_ACCENT);

    // Legs (4 rectangles) - larger and more visible
    const legWidth = 8;
    const legHeight = 14;
    const frontLeftLeg = this.add.rectangle(-TILE_SIZE * 0.3, -TILE_SIZE * 0.15, legWidth, legHeight, COLORS.GECKO_ACCENT);
    const frontRightLeg = this.add.rectangle(TILE_SIZE * 0.3, -TILE_SIZE * 0.15, legWidth, legHeight, COLORS.GECKO_ACCENT);
    const backLeftLeg = this.add.rectangle(-TILE_SIZE * 0.3, TILE_SIZE * 0.15, legWidth, legHeight, COLORS.GECKO_ACCENT);
    const backRightLeg = this.add.rectangle(TILE_SIZE * 0.3, TILE_SIZE * 0.15, legWidth, legHeight, COLORS.GECKO_ACCENT);

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
   * Simple alpha pulsing for visibility in all directions
   */
  private startLegAnimation(): void {
    const duration = this.calculateLegAnimationDuration();

    // Kill existing animations if any
    this.tweens.killTweensOf(this.geckoLegs);

    // Animate legs with alternating alpha/opacity - diagonal pairs
    // Front-left and back-right pair
    this.tweens.add({
      targets: [this.geckoLegs[0], this.geckoLegs[3]],
      alpha: 0.5,
      duration: duration / 2,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Front-right and back-left pair (offset for alternating effect)
    this.tweens.add({
      targets: [this.geckoLegs[1], this.geckoLegs[2]],
      alpha: 0.5,
      duration: duration / 2,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: duration / 4,
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
    this.food.setDepth(1); // Above tiles, below gecko

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

    const moveDistance = (this.currentSpeed * delta) / 1000;

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

    // Check for death tiles
    if (tileType === TileType.LAVA || tileType === TileType.CHEMICAL) {
      this.showGameOver();
      return;
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

    // Regenerate death tiles and spawn new food after a short delay
    this.time.delayedCall(200, () => {
      this.placeRandomDeathTiles();
      this.updateTileVisuals();
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
