"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

/**
 * Dynamic import of GameCanvas with SSR disabled
 * This ensures Phaser only runs on the client side
 */
const GameCanvas = dynamic(
  () => import("@/components/game-canvas").then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-green-400 text-2xl font-mono">Loading game...</div>
      </div>
    ),
  }
);

/**
 * Game page - hosts the Phaser game canvas
 */
export default function GamePage() {
  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-10">
        <Link
          href="/"
          className="text-gray-400 hover:text-white font-mono text-sm transition-colors"
        >
          ← Back to Menu
        </Link>
      </div>

      {/* Game Canvas */}
      <GameCanvas />
    </div>
  );
}
