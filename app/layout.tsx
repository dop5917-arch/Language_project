import type { Metadata } from "next";
import { Lora } from "next/font/google";
import Link from "next/link";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

const lora = Lora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-lora"
});

export const metadata: Metadata = {
  title: "English SRS",
  description: "Simple Anki-like English study app",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "English SRS"
  }
};

export const viewport = {
  themeColor: "#0f172a"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={lora.variable}>
        <PWARegister />
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/decks" className="text-lg font-semibold text-slate-900">
              English SRS
            </Link>
            <Link href="/decks" className="text-sm">
              Decks
            </Link>
            <Link href="/review/all" className="text-sm">
              Global Review
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
