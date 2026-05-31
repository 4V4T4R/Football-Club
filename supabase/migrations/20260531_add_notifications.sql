create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info',
  audience text not null default 'club',
  player_id uuid references public.players(id) on delete cascade,
  entity_type text,
  entity_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint notifications_audience_check
    check (audience in ('club', 'staff', 'players', 'player'))
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  enabled boolean not null default true,
  event_created boolean not null default true,
  convocation boolean not null default true,
  event_changed boolean not null default true,
  document_expiry boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, club_id)
);

create index if not exists notifications_club_created_idx
  on public.notifications (club_id, created_at desc);

create index if not exists notifications_player_idx
  on public.notifications (player_id);

create index if not exists notification_reads_user_idx
  on public.notification_reads (user_id, read_at desc);

create index if not exists notification_preferences_club_idx
  on public.notification_preferences (club_id);

comment on table public.notifications is
  'Notifiche interne per squadra, staff, giocatori o singolo giocatore.';

comment on table public.notification_reads is
  'Stato lettura notifiche per utente.';

comment on table public.notification_preferences is
  'Preferenze notifiche per utente e squadra.';
