import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Museum of Art History',
  description: 'A zoomable timeline of art history and walkable 3D galleries, built entirely from Wikipedia and Wikimedia Commons.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
