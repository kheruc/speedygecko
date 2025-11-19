import Link from "next/link";

/**
 * Home page with game title, description, and play button
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      <main className="max-w-2xl text-center">
        {/* Game Title */}
        <h1 className="text-6xl font-bold text-green-400 mb-4 font-mono tracking-wider">
          SpeedyGecko
        </h1>

        {/* Gecko ASCII Art */}
        <div className="text-green-500 font-mono text-sm mb-8 opacity-80">
          <pre className="inline-block text-left">
            {`
    .--.
   /    \\
  | o  o |
   \\  __/
    |  |
   /|  |\\
  / |  | \\
     \\/
            `}
          </pre>
        </div>

        {/* Game Description */}
        <div className="text-gray-300 text-lg mb-8 space-y-4">
          <p>
            A <span className="text-amber-400 font-semibold">fast-paced arcade game</span> where
            every bite makes you faster!
          </p>
          <p className="text-gray-400">
            Collect food to increase your score and speed. Navigate around deadly hazards that
            shift position after each meal. How long can you survive as you get faster and faster?
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-sm max-w-lg mx-auto">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-orange-400 font-semibold mb-2">🔥 Lava Pools</div>
            <div className="text-gray-400">Molten hazards that spell instant doom</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-green-400 font-semibold mb-2">☣️ Chemical Puddles</div>
            <div className="text-gray-400">Toxic spills to avoid at all costs</div>
          </div>
        </div>

        {/* Controls Info */}
        <div className="text-gray-500 text-sm mb-8">
          <p>
            <span className="text-gray-400">Controls:</span> Arrow keys or WASD | Swipe on mobile
          </p>
        </div>

        {/* Play Button */}
        <Link
          href="/game"
          className="inline-block bg-green-500 hover:bg-green-400 text-gray-900 font-bold py-4 px-12 rounded-full text-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/50"
        >
          PLAY
        </Link>

        {/* Version info */}
        <div className="mt-12 text-gray-600 text-xs">
          Built with Next.js + Phaser 3 | v1.0.0
        </div>
      </main>
    </div>
  );
}
