import type { Metadata } from "next";
import Link from "next/link";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

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
      <body>
        <PWARegister />
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
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
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
