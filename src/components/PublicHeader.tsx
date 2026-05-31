"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  ActiveClubOption,
  getUserClubOptions,
  getStoredActiveClubId,
  setStoredActiveClubId,
} from "@/lib/activeClub";
import {
  FALLBACK_CLUB_LOGO,
  FALLBACK_CLUB_NAME,
  getClubDisplayName,
  getClubLogoUrl,
  getClubWebsiteUrl,
} from "@/lib/clubBranding";

const NAV = [
  { href: "https://www.littleclub.it", label: "Home" },
  { href: "https://www.littleclub.it/chi-siamo", label: "Chi siamo" },
  { href: "https://www.littleclub.it/servizi", label: "Servizi" },
  { href: "https://www.littleclub.it/team", label: "Team" },
  { href: "https://www.littleclub.it/notizie", label: "Notizie" },
  { href: "https://www.littleclub.it/galleria-immagini", label: "Galleria immagini" },
  { href: "https://www.littleclub.it/contatti/", label: "Contatti" },
];

const APP_NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/giocatori", label: "Giocatori" },
  { href: "/eventi", label: "Calendario Eventi" },
  { href: "/convocazioni", label: "Convocazioni" },
  { href: "/impostazioni", label: "Impostazioni" },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const hideHeader =
    pathname === "/login" ||
    pathname === "/imposta-password" ||
    pathname?.startsWith("/auth/callback");

  const isAppSide =
  pathname !== "/login" &&
  pathname !== "/imposta-password" &&
  !pathname?.startsWith("/auth");

  const [isAuthed, setIsAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [clubOptions, setClubOptions] = useState<ActiveClubOption[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);

  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadClubOptions(nextUserId: string) {
      const options = await getUserClubOptions(supabase, nextUserId);
      if (!mounted) return;

      const stored = getStoredActiveClubId(nextUserId);
      const activeId = options.some((option) => option.id === stored)
        ? stored
        : options[0]?.id ?? null;

      setClubOptions(options);
      setActiveClubId(activeId);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(!!data.session);
      setUserId(data.session?.user?.id ?? null);

      if (data.session?.user?.id) {
        loadClubOptions(data.session.user.id).catch(() => {
          if (!mounted) return;
          setClubOptions([]);
          setActiveClubId(null);
        });

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
      setUserId(session?.user?.id ?? null);

      if (session?.user?.id) {
        loadClubOptions(session.user.id).catch(() => {
          setClubOptions([]);
          setActiveClubId(null);
        });

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
        setClubOptions([]);
        setActiveClubId(null);
      }
    });

    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      const inMobile = mobileMenuRef.current?.contains(target);
      const inDesktop = desktopMenuRef.current?.contains(target);

      if (!inMobile && !inDesktop) setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (hideHeader) return null;

  const mobileItems = isAppSide ? APP_NAV : NAV;
  const desktopItems = isAppSide ? [] : NAV;
  const activeClub = clubOptions.find((option) => option.id === activeClubId);
  const brandName = activeClub ? getClubDisplayName(activeClub) : FALLBACK_CLUB_NAME;
  const logoUrl = activeClub ? getClubLogoUrl(activeClub) : FALLBACK_CLUB_LOGO;
  const websiteUrl = activeClub ? getClubWebsiteUrl(activeClub) : null;
  const canSwitchClub = isAppSide && isAuthed && clubOptions.length > 1;

  function switchClub(clubId: string) {
    if (!userId) return;
    setStoredActiveClubId(userId, clubId);
    setActiveClubId(clubId);
    setOpen(false);
    window.location.reload();
  }

  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="bg-black/25 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href={isAppSide ? "/" : websiteUrl ?? "/"}
            className="flex items-center gap-2 text-white"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 overflow-hidden">
              <img
                src={logoUrl}
                alt={brandName}
                className="h-9 w-9 object-contain"
              />
            </span>
            <span className="text-sm font-semibold tracking-wide">
              {brandName}
            </span>
          </Link>

          {desktopItems.length > 0 ? (
            <nav className="hidden items-center gap-6 text-sm text-white/90 md:flex">
              {desktopItems.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  className="hover:text-white hover:underline underline-offset-4"
                >
                  {i.label}
                </Link>
              ))}
            </nav>
          ) : (
            <div className="hidden flex-1 md:block" />
          )}

          <div className="flex items-center gap-2">
            {/* DESKTOP: invariato */}
            <div className="hidden md:block text-sm text-white/80 mr-2">
              {isAuthed ? (
                <button
                  onClick={() => router.push("/impostazioni")}
                  className="hover:underline"
                >
                  {userName}
                </button>
              ) : (
                <span>Area riservata</span>
              )}
            </div>

            {/* MOBILE/ACCOUNT: un solo menu hamburger */}
            <div className="relative md:hidden" ref={mobileMenuRef}>
              <button
                className="relative z-[70] rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white hover:bg-white/10"
                onClick={() => setOpen((v) => !v)}
                aria-label="Menu"
                aria-expanded={open}
              >
                <span className="block h-[2px] w-5 bg-white/90 mb-1" />
                <span className="block h-[2px] w-5 bg-white/90 mb-1" />
                <span className="block h-[2px] w-5 bg-white/90" />
              </button>

              {open && (
                <>
                <button
                  type="button"
                  aria-label="Chiudi menu"
                  className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-[2px]"
                  onClick={() => setOpen(false)}
                />

                <div className="absolute right-0 z-[70] mt-2 w-64 overflow-hidden rounded-xl border border-white/15 bg-black/90 shadow-2xl backdrop-blur-md">
                  {/* header (se loggato mostra nome) */}
                  <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-white/10">
                    <div>
                      <div className="text-xs text-white/60">
                        {isAppSide ? "App" : "Sito"}
                      </div>
                      {isAuthed ? (
                        <div className="text-sm font-medium text-white/90">
                          <Link href="/impostazioni" className="hover:underline">
                            {userName ? userName : "Utente"}
                          </Link>
                        </div>
                      ) : (
                        <div className="text-sm text-white/80">Menu</div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
                      aria-label="Chiudi menu"
                      onClick={() => setOpen(false)}
                    >
                      ✕
                    </button>
                  </div>

                  {/* menu principale: web oppure app */}
                  {mobileItems.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      className="block px-4 py-3 text-sm text-white/90 hover:bg-white/10"
                      onClick={() => setOpen(false)}
                    >
                      {i.label}
                    </Link>
                  ))}

                  {canSwitchClub && (
                    <>
                      <div className="h-px bg-white/10" />
                      <div className="px-4 py-3">
                        <div className="text-xs text-white/60">Squadra</div>
                        <div className="mt-2 space-y-1">
                          {clubOptions.map((club) => (
                            <button
                              key={club.id}
                              type="button"
                              className={[
                                "block w-full rounded-md px-3 py-2 text-left text-sm text-white/90",
                                club.id === activeClubId
                                  ? "bg-white/15"
                                  : "hover:bg-white/10",
                              ].join(" ")}
                              onClick={() => switchClub(club.id)}
                            >
                              {club.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* AZIONI IN FONDO */}
                  {!isAuthed ? (
                    <>
                      <div className="h-px bg-white/10" />
                      <Link
                        href="/login"
                        className="block px-4 py-3 text-sm text-white/90 hover:bg-white/10"
                        onClick={() => setOpen(false)}
                      >
                        Login
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="h-px bg-white/10" />

                      {isAppSide ? (
                        websiteUrl ? (
                          <Link
                            href={websiteUrl}
                            className="block px-4 py-3 text-sm text-white/90 hover:bg-white/10"
                            onClick={() => setOpen(false)}
                          >
                            Torna al sito Web
                          </Link>
                        ) : null
                      ) : (
                        <Link
                          href="/"
                          className="block px-4 py-3 text-sm text-white/90 hover:bg-white/10"
                          onClick={() => setOpen(false)}
                        >
                          Dashboard
                        </Link>
                      )}

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
                    </>
                  )}
                </div>
                </>
              )}
            </div>

            {/* DESKTOP: login / menu account (invariato) */}
            <div className="relative hidden md:block">
              {!isAuthed ? (
                <Link
                  href="/login"
                  className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                >
                  Login
                </Link>
              ) : (
                <div className="relative" ref={desktopMenuRef}>
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
                    <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/15 bg-black/85 shadow-2xl backdrop-blur-md">
                      <div className="px-4 py-3 text-sm text-white/90 border-b border-white/10">
                        <div className="text-white/60 text-xs">Account</div>
                        <div className="font-medium">
                          {userName ? userName : "Utente"}
                        </div>
                        {activeClub ? (
                          <div className="mt-1 text-xs text-white/60">
                            {activeClub.name}
                          </div>
                        ) : null}
                      </div>

                      {canSwitchClub && (
                        <div className="border-b border-white/10 px-2 py-2">
                          <div className="px-2 pb-1 text-xs text-white/60">
                            Cambia squadra
                          </div>
                          {clubOptions.map((club) => (
                            <button
                              key={club.id}
                              type="button"
                              className={[
                                "block w-full rounded-md px-2 py-2 text-left text-sm text-white/90",
                                club.id === activeClubId
                                  ? "bg-white/15"
                                  : "hover:bg-white/10",
                              ].join(" ")}
                              onClick={() => switchClub(club.id)}
                            >
                              {club.name}
                            </button>
                          ))}
                        </div>
                      )}

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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
