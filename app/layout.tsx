import type { Metadata } from "next";
import { Lora } from "next/font/google";
import Link from "next/link";
import PWARegister from "@/components/PWARegister";
import TopNavLinks from "@/components/TopNavLinks";
import "./globals.css";

const lora = Lora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-lora"
});

export const metadata: Metadata = {
  title: "SmartCards",
  description: "Умные карточки для изучения слов в контексте",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartCards"
  }
};

export const viewport = {
  themeColor: "#FAFAFA"
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
        <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/decks" className="inline-flex items-start text-[#111111]">
              <span
                className="text-xl font-bold tracking-[-0.04em]"
                style={{ fontFamily: "Futura, 'Century Gothic', 'Avenir Next', Inter, Arial, sans-serif" }}
              >
                SmartCards
              </span>
              <span className="-mt-1 ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#059669] px-1 text-[8px] font-bold uppercase leading-none text-white">
                AI
              </span>
            </Link>
            <TopNavLinks />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
