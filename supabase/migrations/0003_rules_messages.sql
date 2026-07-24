-- ============================================================================
-- Migration 0003 — Règles de disponibilité récurrentes + messagerie pro/client
-- À exécuter dans Supabase > SQL Editor (une seule fois), après 0002.
-- ============================================================================

-- ============================================================================
-- Table: availability_rules
-- Remplace la création manuelle de créneaux un par un : le pro définit des
-- règles récurrentes ("Lundi à Vendredi, 8h-16h, créneaux de 30 min") ou des
-- exceptions ponctuelles pour une date précise (dispo libre ce jour-là).
-- Les créneaux réels sont calculés à la volée côté application (src/lib/slots.ts),
-- pas stockés un par un.
-- ============================================================================
create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  days_of_week integer[] not null default '{}', -- 0 = dimanche ... 6 = samedi, ignoré si is_exception
  start_time time not null,
  end_time time not null,
  slot_duration_minutes integer not null default 30 check (slot_duration_minutes > 0),
  is_exception boolean not null default false,
  exception_date date, -- requis si is_exception = true
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  check (is_exception = false or exception_date is not null)
);

comment on table public.availability_rules is 'Règles de disponibilité récurrentes (par jour de semaine) ou exceptionnelles (date précise).';

create index if not exists idx_availability_rules_professional_id on public.availability_rules (professional_id);

alter table public.availability_rules enable row level security;

create policy "availability_rules_select_public"
  on public.availability_rules for select
  using (true);

create policy "availability_rules_insert_own"
  on public.availability_rules for insert
  with check (
    exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );

create policy "availability_rules_delete_own"
  on public.availability_rules for delete
  using (
    exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Anti double-booking pour le nouveau flux de réservation (créneaux calculés
-- à la volée, non liés à une ligne `availabilities`) : un même professionnel
-- ne peut pas avoir deux rendez-vous confirmés qui démarrent à la même heure.
-- ============================================================================
create unique index if not exists idx_appointments_no_double_booking
  on public.appointments (professional_id, start_time)
  where status = 'confirmed';

-- ============================================================================
-- Le professionnel doit pouvoir voir les clients qui ont déjà un rendez-vous
-- avec lui (liste "clients inscrits"), en plus de son propre profil client.
-- ============================================================================
create policy "clients_select_by_professional"
  on public.clients for select
  using (
    exists (
      select 1
      from public.appointments a
      join public.professionals p on p.id = a.professional_id
      where a.client_id = clients.id and p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Table: messages
-- Messagerie simple entre un professionnel et un client (dans les deux sens).
-- ============================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  sender text not null check (sender in ('professional', 'client')),
  body text not null check (char_length(body) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

comment on table public.messages is 'Messages échangés entre un professionnel et un client.';

create index if not exists idx_messages_professional_id on public.messages (professional_id);
create index if not exists idx_messages_client_id on public.messages (client_id);

alter table public.messages enable row level security;

create policy "messages_select_participant"
  on public.messages for select
  using (
    auth.uid() = client_id
    or exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );

create policy "messages_insert_participant"
  on public.messages for insert
  with check (
    (sender = 'client' and auth.uid() = client_id)
    or (
      sender = 'professional'
      and exists (
        select 1 from public.professionals p
        where p.id = professional_id and p.user_id = auth.uid()
      )
    )
  );
