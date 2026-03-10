"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageBg from "@/components/PageBg";
import InviteRedirect from "./_components/InviteRedirect";
import ThemeClient from "@/components/ThemeClient";
import PublicHeader from "@/components/PublicHeader";

const bodyFont = Inter({
  subsets: ["latin"],
  display: "swap",
});

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/giocatori", label: "Giocatori" },
  { href: "/eventi", label: "Calendario (Eventi)" },
  { href: "/convocazioni", label: "Convocazioni" },
  { href: "/impostazioni", label: "Impostazioni" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/imposta-password");

  useEffect(() => {
    async function boot() {
      const { data } = await supabase.auth.getSession();

      if (!data.session && !isAuthPage) {
        router.replace("/login");
        return;
      }

      setLoading(false);
    }

    boot();
  }, [pathname, router, isAuthPage]);

  if (loading) {
    return (
      <html lang="it" className={bodyFont.className}>
        <body className="brand-gradient">
          <div className="pt-28 text-center">Caricamento...</div>
        </body>
      </html>
    );
  }

  return (
    <html lang="it" className={bodyFont.className}>
      <body className="brand-gradient">
        <InviteRedirect />
        <ThemeClient />
        <PublicHeader />

        {/* PAGINE AUTH → layout pulito */}
        {isAuthPage ? (
          <main>{children}</main>
        ) : (
          <PageBg image="/assets/auth-bg.jpg">
            <div className="page-bg__content min-h-screen pt-21">
              <div className="mx-auto w-full max-w-7xl px-6 pt-1 md:pt-0 grid gap-6 md:grid-cols-[210px_1fr]">
                
                {/* SIDEBAR */}
                <aside className="hidden md:block card p-3 md:p-4">
                  <nav className="flex gap-2 overflow-x-auto md:block md:space-y-1 md:overflow-visible">
                    {NAV.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={[
                            "shrink-0 rounded-lg px-3 py-2 text-sm transition",
                            "md:block md:w-full",
                            active
                              ? "bg-panel-theme border border-theme"
                              : "hover:bg-panel-theme",
                          ].join(" ")}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </aside>

                {/* CONTENUTO */}
                <main className="min-w-0">{children}</main>
              </div>
            </div>
          </PageBg>
        )}
      </body>
    </html>
  );
}