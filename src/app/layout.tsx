import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { RegisterSW } from "@/components/RegisterSW";
import { AppShell } from "@/components/AppShell";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "FutureJournal",
  description: "Write tomorrow tonight, as if it already happened.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "FutureJournal", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#15121d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Inside the Android/iOS app, mark the page before it paints so the
            loading cover (and lock) show from the first frame. No effect on the website. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var c=window.Capacitor;if(c&&c.isNativePlatform&&c.isNativePlatform())document.documentElement.classList.add('fj-app')}catch(e){}",
          }}
        />
      </head>
      <body className="sky antialiased">
        <main className="mx-auto w-full max-w-xl px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
          {children}
        </main>
        <BottomNav />
        <RegisterSW />
        <AppShell />
      </body>
    </html>
  );
}
