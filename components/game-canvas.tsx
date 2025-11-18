"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { gameConfig } from "@/game/config";

/**
 * GameCanvas - Client-only React component that mounts the Phaser game
 *
 * This component:
 * - Creates a container div for Phaser to mount into
 * - Initializes the Phaser.Game instance on mount
 * - Properly cleans up the game instance on unmount to prevent memory leaks
 * - Is marked as a client component to ensure no SSR
 */
export function GameCanvas() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Only create game if container exists and game hasn't been created
    if (!gameContainerRef.current || gameInstanceRef.current) {
      return;
    }

    // Create Phaser game instance
    const config: Phaser.Types.Core.GameConfig = {
      ...gameConfig,
      parent: gameContainerRef.current,
    };

    gameInstanceRef.current = new Phaser.Game(config);

    // Cleanup on unmount
    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div
        ref={gameContainerRef}
        id="game-container"
        className="game-canvas-wrapper"
        style={{
          maxWidth: '100vw',
          maxHeight: 'calc(100vh - 2rem)',
          aspectRatio: '800 / 608',
        }}
      />
      <style jsx>{`
        .game-canvas-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game-canvas-wrapper canvas {
          width: 100% !important;
          height: 100% !important;
          max-width: 800px;
          max-height: 608px;
          object-fit: contain;
          border-radius: 0.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border: 2px solid #374151;
        }
        @media (max-width: 640px) {
          .game-canvas-wrapper canvas {
            border-radius: 0;
            border: none;
          }
        }
      `}</style>
    </div>
  );
}
