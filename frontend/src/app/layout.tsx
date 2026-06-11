import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Norsk Nettverk — Investigative Intelligence",
  description:
    "Utforsk maktnettverk i norsk politikk, styrer og næringsliv. Avdekk roterende dører og interessekonflikter.",
  manifest: "/manifest.webmanifest",
  applicationName: "Norsk Nettverk",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Norsk Nettverk",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1326",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
        {children}
      </body>
    </html>
  );
}

