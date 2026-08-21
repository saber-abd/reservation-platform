-- ============================================================================
-- Migration 0007 — Notes privées du professionnel sur ses clients (fiche client)
-- À exécuter dans Supabase > SQL Editor (une seule fois), après 0006.
-- ============================================================================

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  note text not null default '',
  updated_at timestamptz not null default now(),
  unique (professional_id, client_id)
);

comment on table public.client_notes is 'Note privée du professionnel sur un client (visible uniquement par ce professionnel, jamais par le client).';

create index if not exists idx_client_notes_professional_id on public.client_notes (professional_id);

alter table public.client_notes enable row level security;

-- Uniquement le professionnel propriétaire peut lire/écrire ses propres notes. Le client n'y a jamais accès.
drop policy if exists "client_notes_owner_all" on public.client_notes;
create policy "client_notes_owner_all"
  on public.client_notes for all
  using (
    exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );
