-- ============================================================================
-- Migration 0013 — RBAC en base : collaborateurs (admin / employee / demo)
-- À exécuter APRÈS 0012, dans Supabase > SQL Editor. Idempotente.
--
-- Principe : un professionnel (professionals.user_id) est propriétaire. Ses
-- collaborateurs sont de vrais comptes Supabase listés dans team_members.
-- Les droits sont appliqués par la base (RLS), pas par le navigateur :
--   admin    : lecture + écriture + modération (ban/suppression)
--   employee : lecture + écriture (pas de modération)
--   demo     : lecture seule
-- Les comptes collaborateurs sont créés par la route serveur /api/team
-- (clé service_role), jamais depuis le navigateur.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text NOT NULL,
  role            text NOT NULL CHECK (role IN ('admin', 'employee', 'demo')),
  specialty       text,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  tag_bd          text NOT NULL DEFAULT 'diamant',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_members_professional ON public.team_members (professional_id);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER pour éviter la récursion de RLS)
-- ---------------------------------------------------------------------------
-- Établissements dont je suis propriétaire ou collaborateur actif (tous rôles)
CREATE OR REPLACE FUNCTION public.my_pro_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
  UNION
  SELECT t.professional_id FROM public.team_members t WHERE t.user_id = auth.uid() AND t.status = 'active';
$$;

-- Établissements où je peux écrire (propriétaire, admin, employee ; pas demo)
CREATE OR REPLACE FUNCTION public.my_writable_pro_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
  UNION
  SELECT t.professional_id FROM public.team_members t
   WHERE t.user_id = auth.uid() AND t.status = 'active' AND t.role IN ('admin', 'employee');
$$;

-- Établissements où je peux modérer / gérer l'équipe (propriétaire ou admin)
CREATE OR REPLACE FUNCTION public.my_admin_pro_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
  UNION
  SELECT t.professional_id FROM public.team_members t
   WHERE t.user_id = auth.uid() AND t.status = 'active' AND t.role = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_professional()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.my_pro_ids());
$$;

CREATE OR REPLACE FUNCTION public.is_pro_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.my_admin_pro_ids());
$$;

-- Tag(s) des établissements pour lesquels j'ai un droit donné ('read' | 'write')
CREATE OR REPLACE FUNCTION public.client_visible_to_me(client_tags text, need_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professionals p
     WHERE client_tags LIKE '%' || p.tag_bd || '%'
       AND (
         (NOT need_write AND p.id IN (SELECT public.my_pro_ids()))
         OR (need_write AND p.id IN (SELECT public.my_writable_pro_ids()))
       )
  );
$$;

-- Mon contexte pro (appelé par le front après connexion)
CREATE OR REPLACE FUNCTION public.my_pro_context()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object('role', 'admin', 'owner', true, 'professional_id', p.id,
              'name', p.business_name, 'email', p.email, 'tag_bd', p.tag_bd)
       FROM public.professionals p WHERE p.user_id = auth.uid() LIMIT 1),
    (SELECT jsonb_build_object('role', t.role, 'owner', false, 'professional_id', t.professional_id,
              'name', t.name, 'email', t.email, 'tag_bd', t.tag_bd, 'specialty', t.specialty, 'member_id', t.id)
       FROM public.team_members t WHERE t.user_id = auth.uid() AND t.status = 'active' LIMIT 1)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.my_pro_ids(), public.my_writable_pro_ids(), public.my_admin_pro_ids(),
  public.is_professional(), public.is_pro_admin(), public.my_pro_context(),
  public.client_visible_to_me(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_pro_ids(), public.my_writable_pro_ids(), public.my_admin_pro_ids(),
  public.is_professional(), public.is_pro_admin(), public.my_pro_context(),
  public.client_visible_to_me(text, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- team_members : lecture par l'équipe, écriture uniquement via service_role
-- ---------------------------------------------------------------------------
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT
  USING (user_id = auth.uid() OR professional_id IN (SELECT public.my_admin_pro_ids()));
REVOKE INSERT, UPDATE, DELETE ON public.team_members FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Modération : réservée aux admins (propriétaire ou collaborateur admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ban_user_by_admin(target_user_id uuid, reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_pro_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  UPDATE public.clients
     SET is_banned = true, ban = 'oui',
         ban_reason = COALESCE(reason, 'Non-respect des conditions de réservation'),
         banned_at = now()
   WHERE id = target_user_id;
  UPDATE auth.users SET banned_until = '2999-01-01 00:00:00+00' WHERE id = target_user_id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.unban_user_by_admin(target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_pro_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  UPDATE public.clients
     SET is_banned = false, ban = 'non', ban_reason = NULL, banned_at = NULL
   WHERE id = target_user_id;
  UPDATE auth.users SET banned_until = NULL WHERE id = target_user_id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_pro_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  -- On ne supprime pas un compte pro / collaborateur par cette voie.
  IF EXISTS (SELECT 1 FROM public.professionals WHERE user_id = target_user_id)
     OR EXISTS (SELECT 1 FROM public.team_members WHERE user_id = target_user_id) THEN
    RAISE EXCEPTION 'target is a professional account' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.messages     WHERE client_id = target_user_id;
  DELETE FROM public.client_notes WHERE client_id = target_user_id;
  UPDATE public.appointments SET client_id = NULL WHERE client_id = target_user_id;
  DELETE FROM public.clients WHERE id = target_user_id;
  DELETE FROM auth.users     WHERE id = target_user_id;
  RETURN true;
END; $$;

-- ---------------------------------------------------------------------------
-- RLS : les collaborateurs accèdent aux données de leur établissement
-- ---------------------------------------------------------------------------
-- clients
DROP POLICY IF EXISTS "clients_select_pro" ON public.clients;
DROP POLICY IF EXISTS "clients_update_pro" ON public.clients;
CREATE POLICY "clients_select_pro" ON public.clients FOR SELECT
  USING (public.client_visible_to_me(tag_bd, false));
CREATE POLICY "clients_update_pro" ON public.clients FOR UPDATE
  USING (public.client_visible_to_me(tag_bd, true));

-- appointments
DROP POLICY IF EXISTS "appointments_select_own" ON public.appointments;
CREATE POLICY "appointments_select_own" ON public.appointments FOR SELECT
  USING (auth.uid() = client_id OR professional_id IN (SELECT public.my_pro_ids()));

DROP POLICY IF EXISTS "appointments_update_own" ON public.appointments;
CREATE POLICY "appointments_update_own" ON public.appointments FOR UPDATE
  USING (auth.uid() = client_id OR professional_id IN (SELECT public.my_writable_pro_ids()))
  WITH CHECK (auth.uid() = client_id OR professional_id IN (SELECT public.my_writable_pro_ids()));

DROP POLICY IF EXISTS "appointments_delete_own" ON public.appointments;
CREATE POLICY "appointments_delete_own" ON public.appointments FOR DELETE
  USING (professional_id IN (SELECT public.my_writable_pro_ids()));

CREATE OR REPLACE FUNCTION public.guard_appointment_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.professional_id IN (SELECT public.my_writable_pro_ids()) THEN
    RETURN NEW;                       -- équipe de l'établissement : libre
  END IF;
  IF NOT public.not_banned() THEN
    RAISE EXCEPTION 'account banned' USING ERRCODE = '42501';
  END IF;
  IF NEW.professional_id IS DISTINCT FROM OLD.professional_id
     OR NEW.client_id    IS DISTINCT FROM OLD.client_id
     OR NEW.service_id   IS DISTINCT FROM OLD.service_id
     OR NEW.tag_bd       IS DISTINCT FROM OLD.tag_bd THEN
    RAISE EXCEPTION 'immutable column' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'status change not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

-- Autres tables rattachées à un établissement (professional_id) :
-- lecture pour toute l'équipe, écriture pour admin/employee (jamais demo).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['services', 'availabilities', 'availability_rules', 'client_notes', 'messages']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = t AND column_name = 'professional_id') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_team_select', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_team_write', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (professional_id IN (SELECT public.my_pro_ids()))',
                     t || '_team_select', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (professional_id IN (SELECT public.my_writable_pro_ids())) WITH CHECK (professional_id IN (SELECT public.my_writable_pro_ids()))',
                     t || '_team_write', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Compte de démonstration (lecture seule) — À ADAPTER puis exécuter À LA MAIN :
--  1. Supabase > Authentication > Users > Add user (email + mot de passe, "Auto confirm").
--  2. Remplacez les 3 valeurs ci-dessous et exécutez :
--
-- INSERT INTO public.team_members (professional_id, user_id, name, email, role, specialty, tag_bd)
-- VALUES ('<ID_DU_PROFESSIONNEL>', '<ID_UTILISATEUR_AUTH>', 'Visite démo', 'demo@votre-domaine.fr',
--         'demo', 'Compte démonstration (lecture seule)', 'diamant');
-- ---------------------------------------------------------------------------
