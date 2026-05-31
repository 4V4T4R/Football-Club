alter table public.club_members
  add column if not exists phone text,
  add column if not exists document_type text,
  add column if not exists document_number text,
  add column if not exists document_expiry date;

comment on column public.club_members.phone is
  'Telefono profilo per staff/admin senza scheda giocatore.';

comment on column public.club_members.document_type is
  'Tipo documento profilo per staff/admin senza scheda giocatore.';

comment on column public.club_members.document_number is
  'Numero documento profilo per staff/admin senza scheda giocatore.';

comment on column public.club_members.document_expiry is
  'Scadenza documento profilo per staff/admin senza scheda giocatore.';
