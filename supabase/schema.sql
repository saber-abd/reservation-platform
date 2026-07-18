-- ============================================================================
-- Schéma initial — Plateforme vitrine + réservation (Phase 3)
-- À exécuter dans Supabase > SQL Editor (une seule fois, sur un projet vierge)
-- ============================================================================

-- Extension nécessaire pour gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================================
-- Table: professionals
-- Un compte "pro" = un professionnel (fleuriste, coiffeur, coach...)
-- Lié à auth.users via user_id (1 utilisateur Supabase Auth = 1 professionnel)
-- ============================================================================
create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  activity text,
  description text,
  phone text,
  email text,
  address text,
  logo_url text,
  opening_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

comment on table public.professionals is 'Informations publiques du professionnel (vitrine + admin).';

-- ============================================================================
-- Table: services
-- Prestations proposées par un professionnel
-- ============================================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(10, 2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.services is 'Prestations proposées par un professionnel (durée, prix).';

-- ============================================================================
-- Table: availabilities
-- Créneaux disponibles définis par le professionnel
-- ============================================================================
create table if not exists public.availabilities (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_booked boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

comment on table public.availabilities is 'Créneaux disponibles proposés par le professionnel.';

-- ============================================================================
-- Table: clients
-- Compte client (espace "mes rendez-vous"), lié à auth.users
-- ============================================================================
create table if not exists public.clients (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

comment on table public.clients is 'Profil client lié à un compte Supabase Auth.';

-- ============================================================================
-- Table: appointments
-- Réservations. client_id est nullable pour permettre la réservation "invité"
-- (sans compte) via nom/email/téléphone.
-- ============================================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  availability_id uuid references public.availabilities(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

comment on table public.appointments is 'Rendez-vous réservés par les clients (avec ou sans compte).';

create index if not exists idx_services_professional_id on public.services (professional_id);
create index if not exists idx_availabilities_professional_id on public.availabilities (professional_id);
create index if not exists idx_appointments_professional_id on public.appointments (professional_id);
create index if not exists idx_appointments_client_id on public.appointments (client_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.availabilities enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

-- ---- professionals -------------------------------------------------------
-- Lecture publique (vitrine) : tout le monde peut voir les infos d'un pro.
create policy "professionals_select_public"
  on public.professionals for select
  using (true);

-- Un pro ne peut créer que sa propre ligne (user_id = son propre uid).
create policy "professionals_insert_own"
  on public.professionals for insert
  with check (auth.uid() = user_id);

-- Un pro ne peut modifier/supprimer que sa propre ligne.
create policy "professionals_update_own"
  on public.professionals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "professionals_delete_own"
  on public.professionals for delete
  using (auth.uid() = user_id);

-- ---- services --------------------------------------------------------
-- Lecture publique (vitrine) : besoin d'afficher les prestations aux visiteurs.
create policy "services_select_public"
  on public.services for select
  using (true);

-- Seul le pro propriétaire peut gérer ses services.
create policy "services_insert_own"
  on public.services for insert
  with check (
    exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );

create policy "services_update_own"
  on public.services for update
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

create policy "services_delete_own"
  on public.services for delete
  using (
    exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );

-- ---- availabilities ----------------------------------------------------
-- Lecture publique : le formulaire de réservation doit voir les créneaux libres.
create policy "availabilities_select_public"
  on public.availabilities for select
  using (true);

create policy "availabilities_insert_own"
  on public.availabilities for insert
  with check (
    exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );

create policy "availabilities_update_own"
  on public.availabilities for update
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

create policy "availabilities_delete_own"
  on public.availabilities for delete
  using (
    exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );

-- ---- clients ------------------------------------------------------------
-- Un client ne voit/modifie que son propre profil.
create policy "clients_select_own"
  on public.clients for select
  using (auth.uid() = id);

create policy "clients_insert_own"
  on public.clients for insert
  with check (auth.uid() = id);

create policy "clients_update_own"
  on public.clients for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- appointments ---------------------------------------------------------
-- Insertion publique : permet la réservation même sans compte (formulaire vitrine).
create policy "appointments_insert_public"
  on public.appointments for insert
  with check (true);

-- Lecture : le client authentifié voit ses propres RDV,
-- le professionnel voit les RDV le concernant.
create policy "appointments_select_own"
  on public.appointments for select
  using (
    auth.uid() = client_id
    or exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );

-- Mise à jour (annulation) : client propriétaire ou professionnel concerné.
create policy "appointments_update_own"
  on public.appointments for update
  using (
    auth.uid() = client_id
    or exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = client_id
    or exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );

-- Suppression réservée au professionnel concerné.
create policy "appointments_delete_own"
  on public.appointments for delete
  using (
    exists (
      select 1 from public.professionals p
      where p.id = professional_id and p.user_id = auth.uid()
    )
  );
