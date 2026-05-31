"use client";

type SupabaseClientLike = any;

export type ActiveClubOption = {
  id: string;
  name: string;
  slug: string;
  display_name?: string | null;
  logo_url?: string | null;
  background_url?: string | null;
  icon_url?: string | null;
  website_url?: string | null;
  role: string;
  source: "staff" | "player";
};

export type ActiveClubResolution = {
  clubId: string | null;
  club: ActiveClubOption | null;
  role: string | null;
  isStaff: boolean;
  options: ActiveClubOption[];
};

function storageKey(userId: string) {
  return `football-club:active-club:${userId}`;
}

export function getStoredActiveClubId(userId: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey(userId));
}

export function setStoredActiveClubId(userId: string, clubId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), clubId);
  window.dispatchEvent(
    new CustomEvent("football-club:active-club-change", {
      detail: { userId, clubId },
    })
  );
}

export async function getUserClubOptions(
  supabase: SupabaseClientLike,
  userId: string
): Promise<ActiveClubOption[]> {
  const { data: memberships, error: membershipsErr } = await supabase
    .from("club_members")
    .select("club_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (membershipsErr) throw new Error(membershipsErr.message);

  const { data: playerRows, error: playerErr } = await supabase
    .from("players")
    .select("club_id")
    .eq("user_id", userId);

  if (playerErr) throw new Error(playerErr.message);

  const membershipRows = (memberships ?? []) as Array<{
    club_id: string;
    role: string;
  }>;
  const playerClubIds = ((playerRows ?? []) as Array<{ club_id: string }>).map(
    (p) => p.club_id
  );

  const clubIds = Array.from(
    new Set([
      ...membershipRows.map((m) => m.club_id),
      ...playerClubIds,
    ].filter(Boolean))
  );

  if (clubIds.length === 0) return [];

  const { data: clubs, error: clubsErr } = await supabase
    .from("clubs")
    .select("*")
    .in("id", clubIds);

  if (clubsErr) throw new Error(clubsErr.message);

  const clubById = new Map(((clubs ?? []) as any[]).map((c) => [c.id, c]));

  const options: ActiveClubOption[] = [];
  const seen = new Set<string>();

  for (const membership of membershipRows) {
    const club = clubById.get(membership.club_id);
    if (!club || seen.has(club.id)) continue;
    seen.add(club.id);
    options.push({
      id: club.id,
      name: club.name,
      slug: club.slug,
      display_name: club.display_name ?? null,
      logo_url: club.logo_url ?? null,
      background_url: club.background_url ?? null,
      icon_url: club.icon_url ?? null,
      website_url: club.website_url ?? null,
      role: membership.role,
      source: "staff",
    });
  }

  for (const clubId of playerClubIds) {
    const club = clubById.get(clubId);
    if (!club || seen.has(club.id)) continue;
    seen.add(club.id);
    options.push({
      id: club.id,
      name: club.name,
      slug: club.slug,
      display_name: club.display_name ?? null,
      logo_url: club.logo_url ?? null,
      background_url: club.background_url ?? null,
      icon_url: club.icon_url ?? null,
      website_url: club.website_url ?? null,
      role: "player",
      source: "player",
    });
  }

  return options;
}

export async function resolveActiveClub(
  supabase: SupabaseClientLike,
  userId: string
): Promise<ActiveClubResolution> {
  const options = await getUserClubOptions(supabase, userId);
  const storedClubId = getStoredActiveClubId(userId);
  const club =
    options.find((option) => option.id === storedClubId) ?? options[0] ?? null;

  if (!club) {
    return {
      clubId: null,
      club: null,
      role: null,
      isStaff: false,
      options,
    };
  }

  return {
    clubId: club.id,
    club,
    role: club.role,
    isStaff: ["admin", "staff", "coach"].includes(club.role),
    options,
  };
}
