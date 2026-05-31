alter table public.club_members
  add column if not exists avatar_url text;

comment on column public.club_members.avatar_url is 'URL pubblico della foto profilo per membri staff/admin.';
