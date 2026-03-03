"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageBg from "@/components/PageBg";

type Club = { id: string; name: string; slug: string };

const NAV = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/giocatori", label: "Giocatori" },
  { href: "/app/eventi", label: "Calendario (Eventi)" },
  { href: "/app/convocazioni", label: "Convocazioni" },
  { href: "/app/impostazioni", label: "Impostazioni" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<Club | null>(null);

  useEffect(() => {
    async function boot() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.from("clubs").select("id, name, slug").limit(1);
      if (!error && data && data.length > 0) setClub(data[0]);

      setLoading(false);
    }

    boot();
  }, [router]);

  if (loading) {
    return <div className="pt-28 text-center">Caricamento...</div>;
  }

  return (
    <PageBg image="/assets/auth-bg.jpg">
      <div className="page-bg__content min-h-screen">
        <div className="mx-auto w-full max-w-7xl px-4 pt-1 md:pt-0 grid gap-6 md:grid-cols-[210px_1fr]">
          {/* Sidebar */}
          <aside className="hidden md:block card p-3 md:p-4">
            <nav className="flex gap-2 overflow-x-auto md:block md:space-y-1 md:overflow-visible">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "shrink-0 rounded-lg px-3 py-2 text-sm transition",
                      "md:block md:w-full",
                      active ? "bg-panel-theme border border-theme" : "hover:bg-panel-theme",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </PageBg>
  );
}