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
   */
  private createPlaceholderAssets(): void {
    const tileSize = 32;

    // Create lava texture - bubbling orange-red effect
    const lavaGraphics = this.make.graphics({ x: 0, y: 0 });

    // Base lava color
    lavaGraphics.fillStyle(0xff4500, 1);
    lavaGraphics.fillRect(0, 0, tileSize, tileSize);

    // Add darker lava spots for texture
    lavaGraphics.fillStyle(0xcc3300, 0.6);
    lavaGraphics.fillCircle(8, 8, 6);
    lavaGraphics.fillCircle(20, 15, 5);
    lavaGraphics.fillCircle(12, 24, 4);
    lavaGraphics.fillCircle(26, 26, 5);

    // Add bright highlights
    lavaGraphics.fillStyle(0xff6600, 0.8);
    lavaGraphics.fillCircle(16, 12, 3);
    lavaGraphics.fillCircle(24, 8, 2);
    lavaGraphics.fillCircle(6, 20, 3);

    lavaGraphics.generateTexture("lava-tile", tileSize, tileSize);
    lavaGraphics.destroy();

    // Create chemical puddle texture - toxic green
    const chemicalGraphics = this.make.graphics({ x: 0, y: 0 });

    // Base chemical color
    chemicalGraphics.fillStyle(0x00ff00, 1);
    chemicalGraphics.fillRect(0, 0, tileSize, tileSize);

    // Add darker areas for depth
    chemicalGraphics.fillStyle(0x00cc00, 0.5);
    chemicalGraphics.fillCircle(10, 10, 7);
    chemicalGraphics.fillCircle(22, 18, 6);
    chemicalGraphics.fillCircle(16, 26, 5);

    // Add bubbles/highlights
    chemicalGraphics.fillStyle(0x66ff66, 0.7);
    chemicalGraphics.fillCircle(8, 16, 3);
    chemicalGraphics.fillCircle(20, 10, 2);
    chemicalGraphics.fillCircle(14, 22, 2);
    chemicalGraphics.fillCircle(26, 24, 3);

    // Add bright spots
    chemicalGraphics.fillStyle(0xccffcc, 0.6);
    chemicalGraphics.fillCircle(12, 8, 2);
    chemicalGraphics.fillCircle(24, 14, 1);

    chemicalGraphics.generateTexture("chemical-tile", tileSize, tileSize);
    chemicalGraphics.destroy();
  }

  create(): void {
    // Immediately start the game
    this.scene.start("GameScene");
  }
}
