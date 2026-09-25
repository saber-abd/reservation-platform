# Guide & Script SQL Consolidé — Restauration Complète de la Base de Données

Ce document contient l'intégralité du code SQL nécessaire pour **recréer ou restaurer de zéro la base de données Supabase / PostgreSQL**, consolidant le schéma initial (`schema.sql`) et toutes les migrations successives (`0002` à `0009`).

---

## 1. Procédure de Restauration dans Supabase

En cas de perte de base de données ou pour déployer un nouvel environnement (recette, production, nouvelle instance) :

1. Connectez-vous à votre interface [Supabase Dashboard](https://supabase.com/dashboard).
2. Rendez-vous dans le projet cible > menu latéral gauche **SQL Editor**.
3. Cliquez sur **New query** (Nouvelle requête).
4. Copiez l'intégralité du script de la **Section 2 (Script SQL Consolidé Complet)** ci-dessous.
5. Collez le contenu dans l'éditeur et cliquez sur **Run** (Exécuter).
6. *(Optionnel)* Exécutez le script de la **Section 3** si vous souhaitez insérer des prestations et des réservations de démo.

---

## 2. Script SQL Consolidé Complet (Exécution d'un seul bloc)

```sql
-- ============================================================================
-- SCRIPT DE RESTAURATION COMPLÈTE — PLATEFORME DE RÉSERVATION (DÉMOS STANDARD / PREMIUM / DIAMANT)
-- Consolide : schema.sql + migrations 0002 à 0009 + tag_bd multi-démos
-- ============================================================================

-- 0. Activer l'extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLES FONDAMENTALES
-- ============================================================================

-- ── Table: professionals ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  activity TEXT,
  description TEXT,
  phone TEXT DEFAULT NULL,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  avatar_url TEXT DEFAULT NULL,
  opening_hours JSONB,
  tag_bd TEXT NOT NULL DEFAULT 'diamant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

COMMENT ON TABLE public.professionals IS 'Informations publiques et administratives du professionnel.';

-- ── Table: services ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Coiffure',
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false, -- Soft delete (0005)
  image_url TEXT DEFAULT NULL,               -- Photo prestation (0006)
  tag_bd TEXT NOT NULL DEFAULT 'diamant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.services IS 'Catalogue des prestations (durée, tarif, état et image).';

-- ── Table: availabilities (Créneaux manuels) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  tag_bd TEXT NOT NULL DEFAULT 'diamant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

COMMENT ON TABLE public.availabilities IS 'Créneaux fixes manuels définis par le professionnel.';

-- ── Table: availability_rules (Règles récurrentes & exceptions) ─────────────
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  days_of_week INTEGER[] NOT NULL DEFAULT '{}', -- 0 = Dimanche, 1 = Lundi ... 6 = Samedi
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_duration_minutes > 0),
  is_exception BOOLEAN NOT NULL DEFAULT false,
  exception_date DATE,
  tag_bd TEXT NOT NULL DEFAULT 'diamant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (is_exception = false OR exception_date IS NOT NULL)
);

COMMENT ON TABLE public.availability_rules IS 'Règles récurrentes hebdomadaires ou ponctuelles pour le calcul dynamique des créneaux.';

-- ── Table: clients ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT DEFAULT NULL,
  avatar_url TEXT DEFAULT NULL,
  preferences TEXT DEFAULT NULL,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  ban TEXT NOT NULL DEFAULT 'non',
  ban_reason TEXT DEFAULT NULL,
  banned_at TIMESTAMPTZ DEFAULT NULL,
  tag_bd TEXT NOT NULL DEFAULT 'diamant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clients IS 'Fiches clients synchronisées avec les comptes auth.users.';

-- ── Table: appointments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  availability_id UUID REFERENCES public.availabilities(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  tag_bd TEXT NOT NULL DEFAULT 'diamant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

COMMENT ON TABLE public.appointments IS 'Réservations de rendez-vous (avec ou sans compte client).';

-- ── Table: messages ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('professional', 'client')),
  body TEXT NOT NULL CHECK (char_length(body) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ DEFAULT NULL,
  tag_bd TEXT NOT NULL DEFAULT 'diamant'
);

COMMENT ON TABLE public.messages IS 'Messagerie directe entre professionnels et clients.';

-- ── Table: client_notes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  tag_bd TEXT NOT NULL DEFAULT 'diamant',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (professional_id, client_id)
);

COMMENT ON TABLE public.client_notes IS 'Notes privées du professionnel sur un client (strictement confidentiel).';

-- ============================================================================
-- 2. INDEX D'OPTIMISATION & CONTRAINTES CRITIQUES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_professionals_tag_bd ON public.professionals(tag_bd);
CREATE INDEX IF NOT EXISTS idx_services_professional_id ON public.services(professional_id);
CREATE INDEX IF NOT EXISTS idx_services_tag_bd ON public.services(tag_bd);
CREATE INDEX IF NOT EXISTS idx_availabilities_professional_id ON public.availabilities(professional_id);
CREATE INDEX IF NOT EXISTS idx_availability_rules_professional_id ON public.availability_rules(professional_id);
CREATE INDEX IF NOT EXISTS idx_clients_tag_bd ON public.clients(tag_bd);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_is_banned ON public.clients(is_banned);
CREATE INDEX IF NOT EXISTS idx_clients_ban ON public.clients(ban);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tag_bd ON public.appointments(tag_bd);
CREATE INDEX IF NOT EXISTS idx_messages_professional_id ON public.messages(professional_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_professional_id ON public.client_notes(professional_id);

-- Anti double-booking pour les rendez-vous confirmés
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_double_booking
  ON public.appointments (professional_id, start_time)
  WHERE status = 'confirmed';

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) & POLITIQUES D'ACCÈS
-- ============================================================================

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- ── Policies: professionals ────────────────────────────────────────────────
DROP POLICY IF EXISTS "professionals_select_public" ON public.professionals;
CREATE POLICY "professionals_select_public" ON public.professionals FOR SELECT USING (true);

DROP POLICY IF EXISTS "professionals_insert_own" ON public.professionals;
CREATE POLICY "professionals_insert_own" ON public.professionals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "professionals_update_own" ON public.professionals;
CREATE POLICY "professionals_update_own" ON public.professionals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "professionals_delete_own" ON public.professionals;
CREATE POLICY "professionals_delete_own" ON public.professionals FOR DELETE USING (auth.uid() = user_id);

-- ── Policies: services ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "services_select_public" ON public.services;
CREATE POLICY "services_select_public" ON public.services FOR SELECT USING (true);

DROP POLICY IF EXISTS "services_insert_own" ON public.services;
CREATE POLICY "services_insert_own" ON public.services FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "services_update_own" ON public.services;
CREATE POLICY "services_update_own" ON public.services FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "services_delete_own" ON public.services;
CREATE POLICY "services_delete_own" ON public.services FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

-- ── Policies: availabilities & availability_rules ──────────────────────────
DROP POLICY IF EXISTS "availabilities_select_public" ON public.availabilities;
CREATE POLICY "availabilities_select_public" ON public.availabilities FOR SELECT USING (true);

DROP POLICY IF EXISTS "availabilities_insert_own" ON public.availabilities;
CREATE POLICY "availabilities_insert_own" ON public.availabilities FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "availabilities_update_own" ON public.availabilities;
CREATE POLICY "availabilities_update_own" ON public.availabilities FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "availabilities_delete_own" ON public.availabilities;
CREATE POLICY "availabilities_delete_own" ON public.availabilities FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "availability_rules_select_public" ON public.availability_rules;
CREATE POLICY "availability_rules_select_public" ON public.availability_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "availability_rules_insert_own" ON public.availability_rules;
CREATE POLICY "availability_rules_insert_own" ON public.availability_rules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "availability_rules_delete_own" ON public.availability_rules;
CREATE POLICY "availability_rules_delete_own" ON public.availability_rules FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

-- ── Policies: clients (0009 mise à jour globale) ───────────────────────────
DROP POLICY IF EXISTS "clients_select_own" ON public.clients;
DROP POLICY IF EXISTS "clients_select_by_professional" ON public.clients;
DROP POLICY IF EXISTS "clients_select_all" ON public.clients;
CREATE POLICY "clients_select_all" ON public.clients FOR SELECT USING (true);

DROP POLICY IF EXISTS "clients_insert_own" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_all" ON public.clients;
CREATE POLICY "clients_insert_all" ON public.clients FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "clients_update_own" ON public.clients;
DROP POLICY IF EXISTS "clients_update_all" ON public.clients;
CREATE POLICY "clients_update_all" ON public.clients FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "clients_delete_own" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_all" ON public.clients;
CREATE POLICY "clients_delete_all" ON public.clients FOR DELETE USING (true);

-- ── Policies: appointments ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "appointments_insert_public" ON public.appointments;
CREATE POLICY "appointments_insert_public" ON public.appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_select_own" ON public.appointments;
CREATE POLICY "appointments_select_own" ON public.appointments FOR SELECT USING (
  auth.uid() = client_id
  OR EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
  OR client_id IS NULL -- Réservations de démo ou invités
);

DROP POLICY IF EXISTS "appointments_update_own" ON public.appointments;
CREATE POLICY "appointments_update_own" ON public.appointments FOR UPDATE USING (
  auth.uid() = client_id
  OR EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "appointments_delete_own" ON public.appointments;
CREATE POLICY "appointments_delete_own" ON public.appointments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

-- ── Policies: messages ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
CREATE POLICY "messages_select_participant" ON public.messages FOR SELECT USING (
  auth.uid() = client_id
  OR EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
CREATE POLICY "messages_insert_participant" ON public.messages FOR INSERT WITH CHECK (
  (sender = 'client' AND auth.uid() = client_id)
  OR (
    sender = 'professional'
    AND EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
  )
);

-- ── Policies: client_notes ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "client_notes_owner_all" ON public.client_notes;
CREATE POLICY "client_notes_owner_all" ON public.client_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
);

-- ============================================================================
-- 4. BUCKET SUPABASE STORAGE (PHOTOS DES PRESTATIONS)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "service_images_public_read" ON storage.objects;
CREATE POLICY "service_images_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'service-images');

DROP POLICY IF EXISTS "service_images_owner_insert" ON storage.objects;
CREATE POLICY "service_images_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-images'
    AND EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.user_id = auth.uid() AND p.id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "service_images_owner_update" ON storage.objects;
CREATE POLICY "service_images_owner_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-images'
    AND EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.user_id = auth.uid() AND p.id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "service_images_owner_delete" ON storage.objects;
CREATE POLICY "service_images_owner_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-images'
    AND EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.user_id = auth.uid() AND p.id::text = (storage.foldername(name))[1]
    )
  );

-- ============================================================================
-- 5. FONCTIONS MÉTIER & TRIGGERS POSTGRESQL
-- ============================================================================

-- ── Trigger: Verrouillage atomique de créneau lors d'un RDV (0002) ──────────
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.availability_id IS NOT NULL THEN
    UPDATE public.availabilities
    SET is_booked = true
    WHERE id = new.availability_id AND is_booked = false;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ce créneau n''est plus disponible.';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_appointment();

-- ── Trigger: Inscription synchronisée auth.users -> public.clients (0009) ───
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tag text;
  user_name text;
  user_avatar text;
BEGIN
  user_tag := COALESCE(new.raw_user_meta_data->>'demo_tag', 'diamant');
  user_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'Client'
  );
  user_avatar := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    NULL
  );

  INSERT INTO public.clients (id, full_name, email, avatar_url, tag_bd, is_banned, ban, created_at)
  VALUES (new.id, user_name, new.email, user_avatar, user_tag, false, 'non', new.created_at)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.clients.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.clients.avatar_url, EXCLUDED.avatar_url);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- 6. FONCTIONS D'ADMINISTRATION RPC (MODÉRATION & SÉCURITÉ)
-- ============================================================================

-- Bannissement d'un utilisateur (table clients + verrouillage auth.users)
CREATE OR REPLACE FUNCTION public.ban_user_by_admin(target_user_id UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.clients
  SET is_banned = true,
      ban = 'oui',
      ban_reason = COALESCE(reason, 'Non-respect des conditions de réservation'),
      banned_at = now()
  WHERE id = target_user_id;

  UPDATE auth.users
  SET banned_until = '2999-01-01 00:00:00+00'
  WHERE id = target_user_id;

  RETURN true;
END;
$$;

-- Débannissement d'un utilisateur
CREATE OR REPLACE FUNCTION public.unban_user_by_admin(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.clients
  SET is_banned = false,
      ban = 'non',
      ban_reason = NULL,
      banned_at = NULL
  WHERE id = target_user_id;

  UPDATE auth.users
  SET banned_until = NULL
  WHERE id = target_user_id;

  RETURN true;
END;
$$;

-- Suppression définitive en cascade (RDV, messages, notes, profil et auth.users)
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM public.appointments WHERE client_id = target_user_id;
  DELETE FROM public.messages WHERE client_id = target_user_id;
  DELETE FROM public.client_notes WHERE client_id = target_user_id;
  DELETE FROM public.clients WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN true;
END;
$$;

-- Attribution des permissions d'exécution
GRANT EXECUTE ON FUNCTION public.ban_user_by_admin(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unban_user_by_admin(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO anon, authenticated, service_role;

-- ── Rattrapage des comptes déjà existants dans auth.users ───────────────────
INSERT INTO public.clients (id, full_name, email, avatar_url, tag_bd, created_at)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'Client'
  ) AS full_name,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture',
    NULL
  ) AS avatar_url,
  COALESCE(u.raw_user_meta_data->>'demo_tag', 'diamant') AS tag_bd,
  u.created_at
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(public.clients.full_name, EXCLUDED.full_name),
  avatar_url = COALESCE(public.clients.avatar_url, EXCLUDED.avatar_url);
```

---

## 3. Données de Test & Seed Initial (Optionnel)

Après avoir exécuté le script ci-dessus et avoir créé votre compte professionnel via la page `/demo-diamant/inscription` (ou `/demo-premium/inscription`), vous pouvez peupler la base avec les 10 prestations du salon et 30 réservations passées pour alimenter immédiatement les statistiques du dashboard :

```sql
DO $$
DECLARE
  prof_id uuid;
  svc_coupe_f uuid;
  svc_coupe_h uuid;
  svc_coupe_e uuid;
  svc_color   uuid;
  svc_balay   uuid;
  svc_brush   uuid;
  svc_lissage uuid;
  svc_perm    uuid;
  svc_soin    uuid;
  svc_chignon uuid;

  names  text[] := ARRAY['Marie Dupont','Sophie Martin','Camille Bernard','Lucas Moreau','Emma Petit','Jade Lefebvre','Nathan Rousseau'];
  emails text[] := ARRAY['marie.dupont@demo.fr','sophie.martin@demo.fr','camille.b@demo.fr','lucas.moreau@demo.fr','emma.petit@demo.fr','jade.lefebvre@demo.fr','nathan.rousseau@demo.fr'];
BEGIN
  -- 1. Récupération du professionnel existant
  SELECT id INTO prof_id FROM public.professionals WHERE tag_bd = 'diamant' LIMIT 1;
  IF prof_id IS NULL THEN
    SELECT id INTO prof_id FROM public.professionals LIMIT 1;
  END IF;

  IF prof_id IS NULL THEN
    RAISE EXCEPTION 'Aucun professionnel trouvé. Créez d''abord un compte via /inscription.';
  END IF;

  -- 2. Insertion des prestations signatures
  INSERT INTO public.services (professional_id, name, description, duration_minutes, price, is_active, tag_bd)
  VALUES
    (prof_id, 'Coupe femme',        'Coupe, shampoing et brushing inclus',          45,   45.00, true, 'diamant'),
    (prof_id, 'Coupe homme',        'Coupe classique ou dégradé, finition soignée', 20,   22.00, true, 'diamant'),
    (prof_id, 'Coupe enfant',       'Coupe pour enfants jusqu''à 12 ans',           20,   16.00, true, 'diamant'),
    (prof_id, 'Coloration complète','Coloration racines + longueurs avec soin',    90,   75.00, true, 'diamant'),
    (prof_id, 'Balayage / Mèches',  'Balayage ou mèches avec brushing',           120,   90.00, true, 'diamant'),
    (prof_id, 'Brushing',           'Mise en forme et brushing volume',             30,   28.00, true, 'diamant'),
    (prof_id, 'Lissage brésilien',  'Traitement lissant longue durée',             150,  180.00, true, 'diamant'),
    (prof_id, 'Permanente',         'Frisage permanent avec soin restructurant',   120,   85.00, true, 'diamant'),
    (prof_id, 'Soin capillaire',    'Masque professionnel nourrissant',             30,   35.00, true, 'diamant'),
    (prof_id, 'Chignon coiffé',     'Coiffure de cérémonie ou mariage',             60,   65.00, true, 'diamant')
  ON CONFLICT DO NOTHING;

  -- 3. Récupération des IDs
  SELECT id INTO svc_coupe_f FROM public.services WHERE professional_id = prof_id AND name = 'Coupe femme' LIMIT 1;
  SELECT id INTO svc_color   FROM public.services WHERE professional_id = prof_id AND name = 'Coloration complète' LIMIT 1;
  SELECT id INTO svc_balay   FROM public.services WHERE professional_id = prof_id AND name = 'Balayage / Mèches' LIMIT 1;

  -- 4. Réservations d'exemple pour alimenter les courbes de statistiques
  INSERT INTO public.appointments (professional_id, service_id, client_name, client_email, start_time, end_time, status, tag_bd)
  VALUES
    (prof_id, svc_coupe_f, names[1], emails[1], now() - interval '15 days', now() - interval '15 days' + interval '45 min', 'completed', 'diamant'),
    (prof_id, svc_color,   names[2], emails[2], now() - interval '10 days', now() - interval '10 days' + interval '90 min', 'completed', 'diamant'),
    (prof_id, svc_balay,   names[3], emails[3], now() - interval '3 days',  now() - interval '3 days'  + interval '120 min','completed', 'diamant'),
    (prof_id, svc_coupe_f, names[4], emails[4], now() + interval '1 day',   now() + interval '1 day'   + interval '45 min', 'confirmed', 'diamant');

  RAISE NOTICE 'Données initialisées avec succès pour le professionnel %', prof_id;
END $$;
```
