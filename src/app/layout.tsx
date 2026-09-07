import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SmartMenu Nepal | Smart QR Menu & Hotel Management Platform',
  description: 'Multi-tenant QR menu, live table ordering, realtime receptionist chat, and restaurant management platform.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0b0e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Model Viewer for 3D food preview */}
        <script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
          async
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-brandPink-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
