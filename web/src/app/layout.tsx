import type { Metadata } from "next";
import { Open_Sans, Bangers, Fira_Mono } from "next/font/google";
import "./globals.css";

const display = Bangers({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const body = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const mono = Fira_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Metablazt",
  description:
    "Metablazt blends Card Bazaar energy with a next-gen MTG browsing and deckbuilding experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`h-full ${display.variable} ${body.variable} ${mono.variable} antialiased bg-[color:var(--color-surface-primary)] text-[color:var(--color-text-body)]`}
      >
        {children}
      </body>
    </html>
  );
}
