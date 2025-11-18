# SpeedyGecko Development Notes

## Using Image Assets for Death Tiles

Currently, lava and chemical tiles are rendered as solid colored rectangles. To use actual images instead:

### 1. Prepare Assets

Create image files (recommended sizes):
- `public/assets/lava.png` - 32x32px animated lava texture
- `public/assets/chemical.png` - 32x32px chemical puddle texture

For best results:
- Use PNG format with transparency
- Consider creating animated sprite sheets (e.g., 3-4 frames for bubbling lava)
- Keep file sizes small (<5KB each) for web performance

### 2. Load Assets in BootScene

Update `game/scenes/boot-scene.ts`:

```typescript
preload(): void {
  // Load tile images
  this.load.image('lava', '/assets/lava.png');
  this.load.image('chemical', '/assets/chemical.png');

  // Or for animated sprites:
  this.load.spritesheet('lava', '/assets/lava-sheet.png', {
    frameWidth: 32,
    frameHeight: 32
  });
}

create(): void {
  // Create animations if using spritesheets
  this.anims.create({
    key: 'lava-bubble',
    frames: this.anims.generateFrameNumbers('lava', { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1
  });

  this.scene.start("GameScene");
}
```

### 3. Update Grid Creation in GameScene

Modify `game/scenes/game-scene.ts`:

Replace the tile rectangle creation with:

```typescript
private createGrid(): void {
  // ... existing code ...

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const tileType = this.grid[y][x];

      if (tileType === TileType.LAVA) {
        // Use sprite for animated lava
        const lava = this.add.sprite(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          'lava'
        );
        lava.play('lava-bubble');
        // Store in tileGraphics for updates
      } else if (tileType === TileType.CHEMICAL) {
        // Use static image for chemical
        const chemical = this.add.image(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          'chemical'
        );
        // Store in tileGraphics for updates
      } else {
        // Keep rectangles for floor and walls
        // ... existing rectangle code ...
      }
    }
  }
}
```

### 4. Update Type Definitions

Update `tileGraphics` type to accept multiple GameObject types:

```typescript
private tileGraphics: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Sprite)[][] = [];
```

### 5. Update updateTileVisuals()

Modify to handle different GameObject types:

```typescript
private updateTileVisuals(): void {
  for (let y = 0; y < this.grid.length; y++) {
    for (let x = 0; x < this.grid[y].length; x++) {
      const tileType = this.grid[y][x];
      const existingTile = this.tileGraphics[y][x];

      // Destroy existing tile
      existingTile?.destroy();

      // Create new tile based on type
      if (tileType === TileType.LAVA) {
        const lava = this.add.sprite(...);
        lava.play('lava-bubble');
        this.tileGraphics[y][x] = lava;
      } else if (tileType === TileType.CHEMICAL) {
        // ... create chemical image ...
      } else {
        // ... create rectangle ...
      }
    }
  }
}
```

## Alternative: Using Tinted Images

If you want variations without multiple image files:

```typescript
// Load a base texture
this.load.image('puddle', '/assets/puddle-base.png');

// In create:
const lava = this.add.image(x, y, 'puddle');
lava.setTint(0xff4500); // Orange-red tint for lava

const chemical = this.add.image(x, y, 'puddle');
chemical.setTint(0x00ff00); // Green tint for chemical
```

## Performance Considerations

- **Static Images**: Best for chemical puddles (no animation overhead)
- **Animated Sprites**: Great for lava but check performance on mobile
- **Particle Effects**: Could add bubbles/drips as overlays for extra polish
- **Texture Atlas**: For multiple assets, consider using a texture atlas to reduce HTTP requests

## Recommended Tools

- **Aseprite**: Great for pixel art and sprite sheets
- **Photopea**: Free browser-based Photoshop alternative
- **TexturePacker**: For creating sprite atlases
- **TinyPNG**: For compressing PNGs
