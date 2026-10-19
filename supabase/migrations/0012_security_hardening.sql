-- ============================================================================
-- Migration 0012 — Durcissement sécurité (issu de l'audit du 19/10/2026)
-- À TESTER D'ABORD sur un projet Supabase de staging, puis à exécuter dans
-- Supabase > SQL Editor. Idempotente (rejouable).
--
-- Effets à connaître :
--  * Les fonctions ban/unban/delete ne sont plus appelables que par un
--    professionnel authentifié (compte Supabase réel, professionals.user_id).
--    Les dashboards "démo" qui s'appuient sur localStorage sans session
--    Supabase perdront ces actions tant que le RBAC n'est pas migré en base.
--  * Un client ne peut plus lire/modifier les autres clients ni se débannir.
--  * Un RDV ne peut plus être inséré que en 'pending' et sans chevauchement.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 00. Colonnes attendues (au cas où la migration 0009 n'aurait pas été jouée en entier)
-- ---------------------------------------------------------------------------
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferences TEXT DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ban TEXT NOT NULL DEFAULT 'non';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ban_reason TEXT DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE public.appointments  ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE public.messages      ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';

-- ---------------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_professional()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.professionals p WHERE p.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.not_banned()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT COALESCE((SELECT c.is_banned FROM public.clients c WHERE c.id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- 1. Fonctions admin : plus d'accès anonyme, contrôle de l'appelant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ban_user_by_admin(target_user_id uuid, reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_professional() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
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
  IF NOT public.is_professional() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.clients
     SET is_banned = false, ban = 'non', ban_reason = NULL, banned_at = NULL
   WHERE id = target_user_id;
  UPDATE auth.users SET banned_until = NULL WHERE id = target_user_id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_professional() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.messages     WHERE client_id = target_user_id;
  DELETE FROM public.client_notes WHERE client_id = target_user_id;
  -- Les RDV passés sont conservés pour l'historique/CA du pro (client_id -> NULL).
  UPDATE public.appointments SET client_id = NULL WHERE client_id = target_user_id;
  DELETE FROM public.clients WHERE id = target_user_id;
  DELETE FROM auth.users     WHERE id = target_user_id;
  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.ban_user_by_admin(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unban_user_by_admin(uuid)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_by_admin(uuid)    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.ban_user_by_admin(uuid, text) TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.unban_user_by_admin(uuid)     TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.delete_user_by_admin(uuid)    TO authenticated, service_role;

-- Suppression de SON PROPRE compte (droit à l'effacement, RGPD art. 17)
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.messages     WHERE client_id = uid;
  DELETE FROM public.client_notes WHERE client_id = uid;
  UPDATE public.appointments SET client_id = NULL WHERE client_id = uid;
  DELETE FROM public.clients WHERE id = uid;
  DELETE FROM auth.users     WHERE id = uid;
  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- Export de SES données (portabilité, RGPD art. 20)
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'profile',      (SELECT to_jsonb(c) FROM public.clients c WHERE c.id = auth.uid()),
    'appointments', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.appointments a WHERE a.client_id = auth.uid()), '[]'::jsonb),
    'messages',     COALESCE((SELECT jsonb_agg(to_jsonb(m)) FROM public.messages m WHERE m.client_id = auth.uid()), '[]'::jsonb)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. RLS public.clients : fin du "USING (true)"
-- ---------------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select_all" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_all" ON public.clients;
DROP POLICY IF EXISTS "clients_update_all" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_all" ON public.clients;
DROP POLICY IF EXISTS "clients_select_own" ON public.clients;
DROP POLICY IF EXISTS "clients_select_pro" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_own" ON public.clients;
DROP POLICY IF EXISTS "clients_update_own" ON public.clients;
DROP POLICY IF EXISTS "clients_update_pro" ON public.clients;

-- Un client voit sa fiche ; un professionnel voit les clients de son tag_bd.
CREATE POLICY "clients_select_own" ON public.clients FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "clients_select_pro" ON public.clients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND clients.tag_bd LIKE '%' || p.tag_bd || '%'
  ));
CREATE POLICY "clients_insert_own" ON public.clients FOR INSERT
  WITH CHECK (auth.uid() = id AND is_banned = false AND ban = 'non');
CREATE POLICY "clients_update_own" ON public.clients FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "clients_update_pro" ON public.clients FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.user_id = auth.uid() AND clients.tag_bd LIKE '%' || p.tag_bd || '%'
  ));
-- Pas de policy DELETE : la suppression passe par delete_my_account / delete_user_by_admin.

-- Les colonnes de modération ne sont modifiables que par les fonctions admin.
REVOKE UPDATE ON public.clients FROM anon, authenticated;
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'clients'
     AND column_name IN ('full_name', 'email', 'avatar_url', 'phone', 'preferences', 'tag_bd');
  IF cols IS NOT NULL THEN
    EXECUTE format('GRANT UPDATE (%s) ON public.clients TO authenticated', cols);
  END IF;
END $$;
REVOKE INSERT ON public.clients FROM anon;
REVOKE DELETE ON public.clients FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. appointments : insertion encadrée, plus d'auto-complétion, bannis bloqués
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "appointments_insert_public" ON public.appointments;
CREATE POLICY "appointments_insert_public" ON public.appointments FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND (client_id IS NULL OR (client_id = auth.uid() AND public.not_banned()))
  );

-- Lecture : on retire "client_id IS NULL" (RDV invités lisibles par tous) s'il existait.
DROP POLICY IF EXISTS "appointments_select_own" ON public.appointments;
CREATE POLICY "appointments_select_own" ON public.appointments FOR SELECT
  USING (
    auth.uid() = client_id
    OR EXISTS (SELECT 1 FROM public.professionals p
               WHERE p.id = appointments.professional_id AND p.user_id = auth.uid())
  );

-- Le client ne peut plus changer que le statut (annulation) ; le pro garde la main.
CREATE OR REPLACE FUNCTION public.guard_appointment_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.professionals p
             WHERE p.id = OLD.professional_id AND p.user_id = auth.uid()) THEN
    RETURN NEW;                       -- le professionnel concerné : libre
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
  -- Un client peut annuler ou déplacer (start/end), jamais "completed"/"confirmed".
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'status change not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_appointment_update ON public.appointments;
CREATE TRIGGER trg_guard_appointment_update
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.guard_appointment_update();

-- ---------------------------------------------------------------------------
-- 4. Anti double-réservation (pending + confirmed, chevauchements inclus)
-- ---------------------------------------------------------------------------
-- Si cette étape échoue, des RDV existants se chevauchent : les lister avec
--   SELECT a.id, b.id FROM appointments a JOIN appointments b
--     ON a.professional_id=b.professional_id AND a.id<b.id
--    AND a.status IN ('pending','confirmed') AND b.status IN ('pending','confirmed')
--    AND tstzrange(a.start_time,a.end_time) && tstzrange(b.start_time,b.end_time);
-- puis annuler/déplacer les doublons avant de relancer.
CREATE EXTENSION IF NOT EXISTS btree_gist;
DROP INDEX IF EXISTS public.idx_appointments_no_double_booking;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('pending', 'confirmed'));

-- ---------------------------------------------------------------------------
-- 5. Index et contraintes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointments_pro_tag_start
  ON public.appointments (professional_id, tag_bd, start_time);
CREATE INDEX IF NOT EXISTS idx_messages_pro_client_created
  ON public.messages (professional_id, client_id, created_at DESC);
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_ban_chk;
ALTER TABLE public.clients ADD CONSTRAINT clients_ban_chk CHECK (ban IN ('oui', 'non'));

-- ---------------------------------------------------------------------------
-- 6. À FAIRE À LA MAIN après vérification des colonnes réelles de `messages`
--    (0003 : sender/body/read_at — 0004 : sender_role/content/read).
--    Les policies de 0004 s'ajoutent à celles de 0003 et permettent à un
--    client d'écrire "en tant que pro". Si votre table a les colonnes de 0003 :
-- ---------------------------------------------------------------------------
-- DROP POLICY IF EXISTS "Pros voient leurs messages"    ON public.messages;
-- DROP POLICY IF EXISTS "Clients voient leurs messages" ON public.messages;
