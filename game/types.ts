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
  SPEED_PAD = 2,
  MUD = 3,
  ICE = 4,
}

/** Position on the grid */
export interface GridPosition {
  x: number;
  y: number;
}

/** Trail segment that the gecko leaves behind */
export interface TrailSegment {
  x: number;
  y: number;
  createdAt: number;
  graphic: Phaser.GameObjects.Rectangle;
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
  INITIAL_SPEED: 150, // pixels per second
  SPEED_INCREMENT: 25, // speed increase per food eaten
  MAX_SPEED: 600,

  // Trail properties
  TRAIL_LIFETIME: 2000, // milliseconds
  TRAIL_OPACITY: 0.4,

  // Tile effects
  SPEED_PAD_BOOST: 200, // temporary speed boost
  SPEED_PAD_DURATION: 500, // milliseconds
  MUD_SLOWDOWN: 0.5, // multiplier
  ICE_FRICTION: 0.3, // low friction on ice

  // Colors
  COLORS: {
    GECKO_BODY: 0x4ade80, // green
    GECKO_ACCENT: 0x166534, // dark green
    TRAIL: 0x86efac, // light green
    FOOD: 0xfbbf24, // amber
    WALL: 0x374151, // gray
    FLOOR: 0x1f2937, // dark gray
    SPEED_PAD: 0xef4444, // red
    MUD: 0x92400e, // brown
    ICE: 0x93c5fd, // light blue
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
