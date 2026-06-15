import type { Metadata, Viewport } from "next";
import { Pwa } from "@/components/Pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruminate — Explainable AI for dairy herds",
  description:
    "Wearable sensors give every cow a voice. Ruminate predicts illness and heat early and explains why, built for Nigerian dairy herds.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#13100A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="bg" />
        <svg className="sun" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="20" />
          <circle cx="50" cy="50" r="30" />
          <circle cx="50" cy="50" r="40" />
          <circle cx="50" cy="50" r="49" />
        </svg>
        <div className="dots" />
        <div className="grain" />
        <Pwa />
        {children}
      </body>
    </html>
  );
}
