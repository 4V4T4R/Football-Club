export const FALLBACK_CLUB_NAME = "Football Club";
export const FALLBACK_CLUB_LOGO = "/assets/logo.png";
export const FALLBACK_CLUB_BACKGROUND = "/assets/auth-bg.jpg";

type BrandableClub = {
  name?: string | null;
  display_name?: string | null;
  logo_url?: string | null;
  background_url?: string | null;
  icon_url?: string | null;
  website_url?: string | null;
};

function clean(value: string | null | undefined) {
  return value?.trim() || null;
}

export function getClubDisplayName(club: BrandableClub | null | undefined) {
  return clean(club?.display_name) ?? clean(club?.name) ?? FALLBACK_CLUB_NAME;
}

export function getClubLogoUrl(club: BrandableClub | null | undefined) {
  return clean(club?.logo_url) ?? FALLBACK_CLUB_LOGO;
}

export function getClubBackgroundUrl(club: BrandableClub | null | undefined) {
  return clean(club?.background_url) ?? FALLBACK_CLUB_BACKGROUND;
}

export function getClubWebsiteUrl(club: BrandableClub | null | undefined) {
  return clean(club?.website_url);
}
