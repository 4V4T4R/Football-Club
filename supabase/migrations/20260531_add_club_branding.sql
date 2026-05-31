alter table public.clubs
  add column if not exists display_name text,
  add column if not exists logo_url text,
  add column if not exists background_url text,
  add column if not exists icon_url text,
  add column if not exists website_url text;

comment on column public.clubs.display_name is 'Nome pubblico da mostrare nell''app.';
comment on column public.clubs.logo_url is 'URL pubblico del logo squadra.';
comment on column public.clubs.background_url is 'URL pubblico dello sfondo app della squadra.';
comment on column public.clubs.icon_url is 'URL pubblico dell''icona web/app della squadra.';
comment on column public.clubs.website_url is 'Sito web pubblico della squadra.';
