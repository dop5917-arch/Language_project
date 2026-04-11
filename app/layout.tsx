import type { Metadata } from "next";
import { Lora } from "next/font/google";
import Link from "next/link";
import PWARegister from "@/components/PWARegister";
import ReviewReminderPopup from "@/components/ReviewReminderPopup";
import StudyTimerOverlay from "@/components/StudyTimerOverlay";
import TopNavLinks from "@/components/TopNavLinks";
import "./globals.css";

const lora = Lora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-lora"
});

export const metadata: Metadata = {
  title: "AICards",
  description: "Умные карточки для изучения слов в контексте",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AICards"
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
            <Link href="/decks" className="text-lg font-semibold text-[#111111]">
              AICards
            </Link>
            <TopNavLinks />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <ReviewReminderPopup />
        <StudyTimerOverlay />
      </body>
    </html>
  );
}
