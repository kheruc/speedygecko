import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpeedyGecko - Pacman × Snake Hybrid Game",
  description: "A fast-paced grid-based game where eating food increases your speed and makes control harder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-mono">
        {children}
      </body>
    </html>
  );
}
