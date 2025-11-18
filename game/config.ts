import * as Phaser from "phaser";
import { BootScene } from "./scenes/boot-scene";
import { GameScene } from "./scenes/game-scene";
import { GAME_CONSTANTS } from "./types";

/**
 * Phaser game configuration for SpeedyGecko
 *
 * Uses AUTO renderer (WebGL with Canvas fallback) and Arcade Physics
 * for simple collision detection.
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONSTANTS.GAME_WIDTH,
  height: GAME_CONSTANTS.GAME_HEIGHT,
  backgroundColor: GAME_CONSTANTS.COLORS.FLOOR,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, GameScene],
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  input: {
    keyboard: true,
    touch: true,
  },
};
