-- Migration 0011 — Lecture du statut de bannissement depuis la page de connexion.
-- Un compte banni (auth.users.banned_until) ne peut pas ouvrir de session : la page de connexion
-- ne peut donc pas lire ses informations en tant qu'utilisateur connecté. Cette fonction renvoie
-- uniquement le statut, le motif et les dates de la sanction, pour afficher un message clair.

CREATE OR REPLACE FUNCTION public.get_ban_status(p_email text DEFAULT NULL, p_user_id uuid DEFAULT NULL)
RETURNS TABLE (is_banned boolean, reason text, banned_at timestamptz, banned_until timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH target AS (
    SELECT u.id, u.banned_until
    FROM auth.users u
    WHERE (p_user_id IS NOT NULL AND u.id = p_user_id)
       OR (p_email IS NOT NULL AND lower(u.email) = lower(btrim(p_email)))
    LIMIT 1
  ),
  client AS (
    SELECT c.ban_reason, c.banned_at
    FROM public.clients c
    WHERE (c.is_banned = true OR c.ban = 'oui')
      AND (
        (p_user_id IS NOT NULL AND c.id = p_user_id)
        OR (p_email IS NOT NULL AND lower(c.email) = lower(btrim(p_email)))
        OR c.id IN (SELECT id FROM target)
      )
    ORDER BY c.banned_at DESC NULLS LAST
    LIMIT 1
  )
  SELECT
    true,
    (SELECT ban_reason FROM client),
    (SELECT banned_at FROM client),
    (SELECT banned_until FROM target WHERE banned_until > now())
  WHERE EXISTS (SELECT 1 FROM client)
     OR EXISTS (SELECT 1 FROM target WHERE banned_until > now());
$$;

GRANT EXECUTE ON FUNCTION public.get_ban_status(text, uuid) TO anon, authenticated, service_role;
