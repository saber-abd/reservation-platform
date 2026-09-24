-- ============================================================================
-- Migration 0009 — Synchronisation Supabase Auth + Multi-Démos + Bannissement & Suppression en BD
-- À exécuter dans Supabase > SQL Editor
-- ============================================================================

-- 1. Ajout des colonnes email, tag_bd et champs de modération sur la table clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferences TEXT DEFAULT NULL;

-- Colonnes de bannissement en base de données
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ban TEXT NOT NULL DEFAULT 'non';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ban_reason TEXT DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ DEFAULT NULL;

-- Index pour accélérer les filtres et vérifications
CREATE INDEX IF NOT EXISTS idx_clients_tag_bd ON public.clients(tag_bd);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_is_banned ON public.clients(is_banned);
CREATE INDEX IF NOT EXISTS idx_clients_ban ON public.clients(ban);

-- 2. Mise à jour des politiques RLS sur public.clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select_own" ON public.clients;
DROP POLICY IF EXISTS "clients_select_all" ON public.clients;
CREATE POLICY "clients_select_all"
  ON public.clients FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "clients_insert_own" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_all" ON public.clients;
CREATE POLICY "clients_insert_all"
  ON public.clients FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "clients_update_own" ON public.clients;
DROP POLICY IF EXISTS "clients_update_all" ON public.clients;
CREATE POLICY "clients_update_all"
  ON public.clients FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "clients_delete_own" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_all" ON public.clients;
CREATE POLICY "clients_delete_all"
  ON public.clients FOR DELETE
  USING (true);

-- 3. Fonctions administratives sécurisées (SECURITY DEFINER)
-- Permettent d'appliquer le bannissement et la suppression directe dans la BD

-- Fonction de Bannissement en BD (clients + auth.users)
CREATE OR REPLACE FUNCTION public.ban_user_by_admin(target_user_id uuid, reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Marquer le client comme banni dans public.clients (is_banned = true, ban = 'oui')
  UPDATE public.clients
  SET is_banned = true,
      ban = 'oui',
      ban_reason = COALESCE(reason, 'Non-respect des conditions de réservation'),
      banned_at = now()
  WHERE id = target_user_id;

  -- 2. Verrouiller également au niveau auth.users pour invalider immédiatement les sessions Supabase
  UPDATE auth.users
  SET banned_until = '2999-01-01 00:00:00+00'
  WHERE id = target_user_id;

  RETURN true;
END;
$$;

-- Fonction de Débannissement en BD
CREATE OR REPLACE FUNCTION public.unban_user_by_admin(target_user_id uuid)
RETURNS boolean
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

-- Fonction de Suppression Totale de Compte en BD
-- Supprime en cascade dans les tables applicatives ET dans auth.users
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Supprimer tous les rendez-vous, messages et notes du client
  DELETE FROM public.appointments WHERE client_id = target_user_id;
  DELETE FROM public.messages WHERE client_id = target_user_id;
  DELETE FROM public.client_notes WHERE client_id = target_user_id;

  -- 2. Supprimer la fiche client dans public.clients
  DELETE FROM public.clients WHERE id = target_user_id;

  -- 3. Supprimer le compte d'authentification dans auth.users (Google ou email)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN true;
END;
$$;

-- Donner les droits d'exécution nécessaires
GRANT EXECUTE ON FUNCTION public.ban_user_by_admin(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unban_user_by_admin(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(uuid) TO anon, authenticated, service_role;

-- 4. Rattrapage immédiat des comptes existants (Backfill depuis auth.users)
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

-- 5. Déclencheur automatique (Trigger) pour les prochaines inscriptions
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
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
