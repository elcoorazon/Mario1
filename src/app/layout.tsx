import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Skyward Scrap Runner',
  description: 'Original retro-inspired 2D platformer built with Next.js Canvas.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
