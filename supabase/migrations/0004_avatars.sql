-- ============================================================================
-- Migration 0004 — Colonnes avatar_url + préférences utilisateurs
-- ============================================================================

-- Ajout avatar_url sur professionals
alter table public.professionals
  add column if not exists avatar_url text default null,
  add column if not exists phone text default null;

-- Ajout avatar_url sur clients
alter table public.clients
  add column if not exists avatar_url text default null,
  add column if not exists phone text default null;

-- Table messages (si pas encore créée par 0003)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references public.professionals(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  sender_role text not null check (sender_role in ('professional', 'client')),
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- RLS messages
alter table public.messages enable row level security;

drop policy if exists "Pros voient leurs messages" on public.messages;
create policy "Pros voient leurs messages"
  on public.messages for all
  using (
    professional_id = (
      select id from public.professionals where user_id = auth.uid() limit 1
    )
  );

drop policy if exists "Clients voient leurs messages" on public.messages;
create policy "Clients voient leurs messages"
  on public.messages for all
  using (
    client_id = (
      select id from public.clients where user_id = auth.uid() limit 1
    )
  );
