import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import PublicHeader from "@/components/PublicHeader";
import InviteRedirect from "./_components/InviteRedirect";
import { headers } from "next/headers";

const bodyFont = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Little Club James",
  description: "Sito e gestionale per società calcistica",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h: any = await headers(); // ✅ nel tuo Next è Promise
  const pathname =
    h.get?.("x-invoke-path") ||
    h.get?.("x-matched-path") ||
    h.get?.("next-url") ||
    "";
    
  const isApp = String(pathname).startsWith("/app");

  const hideHeader =
    isApp ||
    String(pathname).startsWith("/imposta-password") ||
    String(pathname).startsWith("/auth");

  return (
    <html lang="it" className={bodyFont.className}>
      <body>
        <InviteRedirect />

        {!hideHeader && <PublicHeader />}

        <main className={isApp ? "pt-24" : (hideHeader ? "" : "mx-auto max-w-6xl px-4 py-10 pt-24")}>
          {children}
        </main>
      </body>
    </html>
  );
}