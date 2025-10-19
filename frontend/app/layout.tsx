import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess.com Game Analyzer",
  description: "Analyze your Chess.com games with Stockfish",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
