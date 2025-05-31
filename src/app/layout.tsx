
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MotoVision',
  description: 'Motorcycle Diagnostic System',
  manifest: '/manifest.json', // Next.js way to link manifest
  icons: { // Next.js way to link icons
    apple: '/icons/icon-192x192.png', 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="MotoVision" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MotoVision" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* <meta name="msapplication-config" content="/icons/browserconfig.xml" /> You would need to create this XML file */}
        <meta name="msapplication-TileColor" content="hsl(225, 40%, 45%)" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="hsl(225, 40%, 45%)" />

        {/* Additional Apple touch icons if needed, though `metadata.icons.apple` is preferred */}
        {/* <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" /> */}
        {/* <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" /> */}
        {/* <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167x167.png" /> */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
