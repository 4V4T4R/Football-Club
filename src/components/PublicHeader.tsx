"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/servizi", label: "Servizi" },
  { href: "/galleria-immagini", label: "Galleria immagini" },
  { href: "/team", label: "Team" },
  { href: "/notizie", label: "Notizie" },
  { href: "/contatti", label: "Contatti" },
];

const APP_NAV = [
  { href: "/app/giocatori", label: "Giocatori" },
  { href: "/app/eventi", label: "Eventi" },
  { href: "/app/convocazioni", label: "Convocazioni" },
  { href: "/app/impostazioni", label: "Impostazioni" },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // ✅ nascondi header su login + imposta password + callback auth
  const hideHeader =
    pathname === "/login" ||
    pathname === "/imposta-password" ||
    pathname?.startsWith("/auth/callback");

  const [isAuthed, setIsAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(!!data.session);
      if (data.session?.user?.id) {
        supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", data.session.user.id)
          .single()
          .then(({ data: u }) => {
            if (!mounted) return;
            if (u?.first_name || u?.last_name) {
              setUserName(`${u.first_name ?? ""} ${u.last_name ?? ""}`.trim());
            }
          });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      if (session?.user?.id) {
        supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", session.user.id)
          .single()
          .then(({ data: u }) => {
            if (u?.first_name || u?.last_name) {
              setUserName(`${u.first_name ?? ""} ${u.last_name ?? ""}`.trim());
            } else {
              setUserName(null);
            }
          });
      } else {
        setUserName(null);
      }
    });

    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [router]);

  if (hideHeader) return null;

  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="bg-black/25 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 overflow-hidden">
              <Image
                src="/assets/logo.png"
                alt="Logo"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
            </span>
            <span className="text-sm font-semibold tracking-wide">
              Little Club James
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-white/90 md:flex">
            {NAV.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="hover:text-white hover:underline underline-offset-4"
              >
                {i.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:block text-sm text-white/80 mr-2">
              {isAuthed ? (
                <span>{userName ? `${userName}` : ""}</span>
              ) : (
                <span>Area riservata</span>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              {!isAuthed ? (
                <Link
                  href="/login"
                  className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                >
                  Login
                </Link>
              ) : (
                <>
                  <button
                    className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white hover:bg-white/10"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Menu account"
                  >
                    <span className="block h-[2px] w-5 bg-white/90 mb-1" />
                    <span className="block h-[2px] w-5 bg-white/90 mb-1" />
                    <span className="block h-[2px] w-5 bg-white/90" />
                  </button>

                  {open && (
                    <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/15 bg-black/60 backdrop-blur-md">
                      {/* user header */}
                      <div className="px-4 py-3 text-sm text-white/90 border-b border-white/10">
                        <div className="text-white/60 text-xs">Account</div>
                        <div className="font-medium">
                          {userName ? userName : "Utente"}
                        </div>
                      </div>

                      <Link
                        href="/app"
                        className="block px-4 py-3 text-sm text-white/90 hover:bg-white/10"
                        onClick={() => setOpen(false)}
                      >
                        Dashboard
                      </Link>

                      {/* App nav SOLO mobile */}
                      <div className="md:hidden">
                        {APP_NAV.map((i) => (
                          <Link
                            key={i.href}
                            href={i.href}
                            className="block px-4 py-3 text-sm text-white/90 hover:bg-white/10"
                            onClick={() => setOpen(false)}
                          >
                            {i.label}
                          </Link>
                        ))}
                        <div className="h-px bg-white/10" />
                      </div>

                      <button
                        className="block w-full px-4 py-3 text-left text-sm text-white/90 hover:bg-white/10"
                        onClick={async () => {
                          await supabase.auth.signOut();
                          setOpen(false);
                          window.location.href = "/";
                        }}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}