import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Feeling Moisty?',
  description: 'Random penguinz0 videos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
