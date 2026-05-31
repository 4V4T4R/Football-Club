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
import { resolveActiveClub } from "@/lib/activeClub";
import { FALLBACK_CLUB_BACKGROUND, getClubBackgroundUrl } from "@/lib/clubBranding";

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

const SETTINGS_NAV = [
  { href: "/staff", label: "Staff", panel: null },
  { href: "/impostazioni?panel=password", label: "Password", panel: "password" },
  { href: "/impostazioni?panel=notifiche", label: "Notifiche", panel: "notifiche" },
  { href: "/impostazioni?panel=tema", label: "Tema", panel: "tema" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [backgroundUrl, setBackgroundUrl] = useState(FALLBACK_CLUB_BACKGROUND);

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/imposta-password");

  function openSettingsPanel(panel: string) {
    window.history.replaceState(null, "", `/impostazioni?panel=${panel}`);
    window.dispatchEvent(new CustomEvent("footballclub:settings-panel", { detail: panel }));
  }

  useEffect(() => {
    async function boot() {
      const { data } = await supabase.auth.getSession();

      if (!data.session && !isAuthPage) {
        router.replace("/login");
        return;
      }

      if (data.session?.user?.id && !isAuthPage) {
        const active = await resolveActiveClub(supabase, data.session.user.id);
        setBackgroundUrl(getClubBackgroundUrl(active.club));
      } else {
        setBackgroundUrl(FALLBACK_CLUB_BACKGROUND);
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
          <PageBg image={backgroundUrl}>
            <div className="page-bg__content min-h-screen pt-21">
              <div className="mx-auto w-full max-w-7xl px-6 pt-1 md:pt-0 grid gap-6 md:grid-cols-[230px_1fr]">
                
                {/* SIDEBAR */}
                <aside className="hidden md:block card p-3 md:p-4">
                  <nav className="flex gap-2 overflow-x-auto md:block md:space-y-1 md:overflow-visible">
                    {NAV.map((item) => {
                      const isSettingsArea =
                        pathname.startsWith("/impostazioni") ||
                        pathname.startsWith("/staff");
                      const active =
                        item.href === "/impostazioni"
                          ? isSettingsArea
                          : pathname === item.href ||
                            (item.href !== "/" && pathname.startsWith(item.href));

                      return (
                        <div key={item.href}>
                          <Link
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
                          {item.href === "/impostazioni" && active ? (
                            <div className="mt-1 space-y-1 border-l border-theme pl-3">
                              {SETTINGS_NAV.map((subItem) => {
                                const subActive =
                                  subItem.href === "/staff"
                                    ? pathname.startsWith("/staff")
                                    : false;
                                const itemClassName = [
                                  "block rounded-md px-3 py-2 text-left text-xs transition",
                                  subActive
                                    ? "bg-panel-theme border border-theme"
                                    : "text-muted-theme hover:bg-panel-theme hover:text-base-theme",
                                ].join(" ");

                                if (subItem.panel && pathname.startsWith("/impostazioni")) {
                                  return (
                                    <button
                                      key={subItem.href}
                                      type="button"
                                      onClick={() => openSettingsPanel(subItem.panel)}
                                      className={`${itemClassName} w-full`}
                                    >
                                      {subItem.label}
                                    </button>
                                  );
                                }

                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    className={itemClassName}
                                  >
                                    {subItem.label}
                                  </Link>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
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
