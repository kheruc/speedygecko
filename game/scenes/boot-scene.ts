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
   * Create placeholder/generated assets
   * These are simple colored rectangles that we'll use as textures
   */
  private createPlaceholderAssets(): void {
    // Create a 1x1 white pixel texture that can be tinted
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 1, 1);
    graphics.generateTexture("pixel", 1, 1);
    graphics.destroy();
  }

  create(): void {
    // Immediately start the game
    this.scene.start("GameScene");
  }
}
