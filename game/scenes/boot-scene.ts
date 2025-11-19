import * as Phaser from "phaser";

/**
 * BootScene - Initial scene for loading assets and setup
 *
 * Since we're using generated graphics (no external assets),
 * this scene primarily serves as a loading screen and transitions
 * to the main game scene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Display loading text
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const loadingText = this.add.text(width / 2, height / 2, "Loading...", {
      fontSize: "32px",
      color: "#4ade80",
      fontFamily: "monospace",
    });
    loadingText.setOrigin(0.5);

    // Create a simple loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x374151, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 + 30, 320, 20);

    // Update loading bar (simulated since we have no real assets)
    this.load.on("progress", (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x4ade80, 1);
      progressBar.fillRect(width / 2 - 158, height / 2 + 32, 316 * value, 16);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Since we generate graphics procedurally, we'll create placeholder textures
    // This ensures the loader completes properly
    this.createPlaceholderAssets();
  }

  /**
   * Create procedurally generated tile textures
   * No background - just the lava/chemical spots on transparent background
   */
  private createPlaceholderAssets(): void {
    const tileSize = 32;

    // Create lava texture - just bubbling lava spots (no background)
    const lavaGraphics = this.make.graphics({ x: 0, y: 0 });

    // Main lava pools (orange-red)
    lavaGraphics.fillStyle(0xff4500, 1);
    lavaGraphics.fillCircle(8, 8, 7);
    lavaGraphics.fillCircle(22, 12, 6);
    lavaGraphics.fillCircle(12, 22, 5);
    lavaGraphics.fillCircle(24, 24, 4);

    // Darker lava spots for depth
    lavaGraphics.fillStyle(0xcc3300, 0.8);
    lavaGraphics.fillCircle(8, 8, 4);
    lavaGraphics.fillCircle(22, 12, 3);
    lavaGraphics.fillCircle(12, 22, 3);

    // Bright highlights for molten effect
    lavaGraphics.fillStyle(0xff6600, 1);
    lavaGraphics.fillCircle(10, 6, 2);
    lavaGraphics.fillCircle(24, 10, 2);
    lavaGraphics.fillCircle(14, 20, 2);
    lavaGraphics.fillCircle(26, 23, 1);

    // Extra bright spots
    lavaGraphics.fillStyle(0xff9900, 1);
    lavaGraphics.fillCircle(9, 7, 1);
    lavaGraphics.fillCircle(23, 11, 1);

    lavaGraphics.generateTexture("lava-tile", tileSize, tileSize);
    lavaGraphics.destroy();

    // Create chemical puddle texture - toxic green puddles (no background)
    const chemicalGraphics = this.make.graphics({ x: 0, y: 0 });

    // Main chemical puddles (bright green)
    chemicalGraphics.fillStyle(0x00ff00, 1);
    chemicalGraphics.fillCircle(10, 10, 8);
    chemicalGraphics.fillCircle(20, 16, 7);
    chemicalGraphics.fillCircle(14, 24, 6);

    // Darker areas for depth
    chemicalGraphics.fillStyle(0x00cc00, 0.7);
    chemicalGraphics.fillCircle(10, 12, 4);
    chemicalGraphics.fillCircle(20, 18, 3);
    chemicalGraphics.fillCircle(14, 26, 3);

    // Bubble highlights
    chemicalGraphics.fillStyle(0x66ff66, 0.9);
    chemicalGraphics.fillCircle(8, 8, 3);
    chemicalGraphics.fillCircle(18, 14, 2);
    chemicalGraphics.fillCircle(12, 22, 2);
    chemicalGraphics.fillCircle(22, 20, 2);

    // Bright toxic spots
    chemicalGraphics.fillStyle(0xccffcc, 1);
    chemicalGraphics.fillCircle(9, 9, 1);
    chemicalGraphics.fillCircle(19, 15, 1);
    chemicalGraphics.fillCircle(13, 23, 1);

    chemicalGraphics.generateTexture("chemical-tile", tileSize, tileSize);
    chemicalGraphics.destroy();
  }

  create(): void {
    // Immediately start the game
    this.scene.start("GameScene");
  }
}
