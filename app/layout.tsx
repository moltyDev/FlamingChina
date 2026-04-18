import type { Metadata } from "next";
import { Orbitron, Teko, Share_Tech_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import FlameBackground from "@/components/FlameBackground";
import LiveFeedTicker from "@/components/LiveFeedTicker";
import SoundToggle from "@/components/SoundToggle";

const headline = Teko({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-headline",
});

const body = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

const mono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Flaming China Intelligence Portal",
  description:
    "Token-gated classified leak intelligence portal for verified $FC holders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headline.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <FlameBackground />
        <div className="portal-shell">
          <header className="sticky top-0 z-30 border-b border-orange-500/25 bg-black/70 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
              <Link
                href="/"
                className="section-title text-2xl tracking-[0.15em] text-orange-200 drop-shadow-[0_0_12px_rgba(255,122,26,0.45)]"
              >
                Flaming China Portal
              </Link>
              <nav className="flex items-center gap-3 text-sm uppercase tracking-[0.14em] text-orange-100/82">
                <Link className="rounded px-2 py-1 transition hover:bg-red-950/75" href="/">
                  Briefing
                </Link>
                <Link className="rounded px-2 py-1 transition hover:bg-red-950/75" href="/verify">
                  Verify
                </Link>
                <Link className="rounded px-2 py-1 transition hover:bg-red-950/75" href="/dashboard">
                  Vault
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
          <SoundToggle />
          <LiveFeedTicker />
        </div>
      </body>
    </html>
  );
}