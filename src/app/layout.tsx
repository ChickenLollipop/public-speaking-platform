import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Public Speaking Platform',
  description: 'Practice and improve your public speaking skills',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
