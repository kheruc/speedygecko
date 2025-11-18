/**
 * Core types and enums for SpeedyGecko game
 */

/** Direction enum for character movement */
export enum Direction {
  UP = "up",
  DOWN = "down",
  LEFT = "left",
  RIGHT = "right",
}

/** Game state tracking */
export enum GameState {
  PLAYING = "playing",
  PAUSED = "paused",
  GAME_OVER = "game_over",
}

/** Tile types for the game grid */
export enum TileType {
  EMPTY = 0,
  WALL = 1,
  LAVA = 2,
  CHEMICAL = 3,
}

/** Position on the grid */
export interface GridPosition {
  x: number;
  y: number;
}

/** Animation frame for particle effects */
export interface ParticleEffect {
  x: number;
  y: number;
  createdAt: number;
  graphics: Phaser.GameObjects.Arc[];
}

/** Game constants - centralized configuration */
export const GAME_CONSTANTS = {
  // Grid dimensions
  GRID_WIDTH: 25,
  GRID_HEIGHT: 19,
  TILE_SIZE: 32,

  // Game dimensions (calculated from grid)
  get GAME_WIDTH() {
    return this.GRID_WIDTH * this.TILE_SIZE;
  },
  get GAME_HEIGHT() {
    return this.GRID_HEIGHT * this.TILE_SIZE;
  },

  // Gecko properties
  INITIAL_SPEED: 225, // pixels per second (increased for better pacing)
  SPEED_INCREMENT: 25, // speed increase per food eaten
  MAX_SPEED: 600,

  // Animation
  LEG_ANIMATION_BASE_DURATION: 400, // milliseconds at base speed
  LEG_ANIMATION_MIN_DURATION: 100, // milliseconds at max speed

  // Death tiles
  NUM_DEATH_TILES: 6, // total number of death tiles (lava + chemical)

  // Colors
  COLORS: {
    GECKO_BODY: 0x4ade80, // green
    GECKO_ACCENT: 0x166534, // dark green
    FOOD: 0xfbbf24, // amber
    WALL: 0x374151, // gray
    FLOOR: 0x1f2937, // dark gray
    LAVA: 0xff4500, // orange-red
    CHEMICAL: 0x00ff00, // bright green
  },

  // UI
  SCORE_FONT_SIZE: 24,
  UI_PADDING: 16,
} as const;

/** Direction vectors for movement calculation */
export const DIRECTION_VECTORS: Record<Direction, GridPosition> = {
  [Direction.UP]: { x: 0, y: -1 },
  [Direction.DOWN]: { x: 0, y: 1 },
  [Direction.LEFT]: { x: -1, y: 0 },
  [Direction.RIGHT]: { x: 1, y: 0 },
};

/** Opposite directions for 180-degree turn prevention */
export const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
};

/** Perpendicular directions for wall sliding */
export const PERPENDICULAR_DIRECTIONS: Record<Direction, Direction[]> = {
  [Direction.UP]: [Direction.LEFT, Direction.RIGHT],
  [Direction.DOWN]: [Direction.LEFT, Direction.RIGHT],
  [Direction.LEFT]: [Direction.UP, Direction.DOWN],
  [Direction.RIGHT]: [Direction.UP, Direction.DOWN],
};
