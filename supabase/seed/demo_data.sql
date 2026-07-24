-- ============================================================================
-- Seed données de démo — Prestations, clients, réservations
-- ============================================================================
-- ⚠️ IMPORTANT : Remplacer 'VOTRE_PROFESSIONAL_ID' par l'UUID réel du professionnel
-- trouvable via : SELECT id FROM professionals LIMIT 1;
-- ============================================================================

-- 1. PRESTATIONS (services) — remplacer professional_id
-- Exécutez d'abord : SELECT id FROM professionals LIMIT 1; et copiez l'UUID
-- Puis remplacez 'VOTRE_PROFESSIONAL_ID' dans les lignes suivantes

DO $$
DECLARE
  prof_id uuid;
BEGIN
  -- On prend le premier professionnel disponible
  SELECT id INTO prof_id FROM public.professionals LIMIT 1;
  
  IF prof_id IS NULL THEN
    RAISE EXCEPTION 'Aucun professionnel trouvé. Créez d''abord un compte pro via /inscription.';
  END IF;

  -- Supprimer les services de démo existants pour éviter les doublons
  DELETE FROM public.services WHERE professional_id = prof_id AND name IN (
    'Coupe femme', 'Coupe homme', 'Coupe enfant', 'Coloration complète',
    'Balayage / Mèches', 'Brushing', 'Lissage brésilien', 'Permanente',
    'Soin capillaire', 'Chignon coiffé'
  );

  -- Insérer les prestations
  INSERT INTO public.services (professional_id, name, duration_minutes, price_eur, description)
  VALUES
    (prof_id, 'Coupe femme', 45, 45.00, 'Coupe, shampoing et brushing inclus'),
    (prof_id, 'Coupe homme', 20, 22.00, 'Coupe classique ou dégradé'),
    (prof_id, 'Coupe enfant', 20, 16.00, 'Coupe pour enfants jusqu''à 12 ans'),
    (prof_id, 'Coloration complète', 90, 75.00, 'Coloration racines + longueurs avec soin'),
    (prof_id, 'Balayage / Mèches', 120, 90.00, 'Balayage ou mèches avec brushing'),
    (prof_id, 'Brushing', 30, 28.00, 'Mise en forme et brushing volume'),
    (prof_id, 'Lissage brésilien', 150, 180.00, 'Traitement lissant longue durée'),
    (prof_id, 'Permanente', 120, 85.00, 'Frisage permanent avec soin restructurant'),
    (prof_id, 'Soin capillaire', 30, 35.00, 'Masque professionnel nourrissant'),
    (prof_id, 'Chignon coiffé', 60, 65.00, 'Coiffure de cérémonie ou mariage');

  RAISE NOTICE 'Prestations insérées pour le professionnel %', prof_id;
END $$;


-- 2. CLIENTS de démo supplémentaires
-- (les mots de passe ne peuvent pas être insérés directement — voir les comptes dans auth.users)
-- Ces entrées supposent que les users ont été créés via Supabase Auth
-- Pour ajouter des clients de démo dans la table clients uniquement (sans auth), 
-- on peut insérer des enregistrements avec un user_id fictif pour les stats uniquement

-- 3. RÉSERVATIONS passées (30 réservations sur 3 derniers mois)
-- ⚠️ Ces réservations sont insérées directement sans passer par le trigger (qui bloquerait les créneaux)
-- Elles servent uniquement à alimenter les statistiques

DO $$
DECLARE
  prof_id uuid;
  svc_coupe_f uuid;
  svc_coupe_h uuid;
  svc_color uuid;
  svc_balayage uuid;
  svc_brushing uuid;
  svc_lissage uuid;
  svc_soin uuid;
  svc_chignon uuid;
  
  -- Clients fictifs pour les stats (user_id null = données de démo)
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid();
  c5 uuid := gen_random_uuid();
BEGIN
  SELECT id INTO prof_id FROM public.professionals LIMIT 1;
  IF prof_id IS NULL THEN RETURN; END IF;
  
  -- Récupérer IDs des services
  SELECT id INTO svc_coupe_f FROM public.services WHERE professional_id = prof_id AND name = 'Coupe femme' LIMIT 1;
  SELECT id INTO svc_coupe_h FROM public.services WHERE professional_id = prof_id AND name = 'Coupe homme' LIMIT 1;
  SELECT id INTO svc_color FROM public.services WHERE professional_id = prof_id AND name = 'Coloration complète' LIMIT 1;
  SELECT id INTO svc_balayage FROM public.services WHERE professional_id = prof_id AND name = 'Balayage / Mèches' LIMIT 1;
  SELECT id INTO svc_brushing FROM public.services WHERE professional_id = prof_id AND name = 'Brushing' LIMIT 1;
  SELECT id INTO svc_lissage FROM public.services WHERE professional_id = prof_id AND name = 'Lissage brésilien' LIMIT 1;
  SELECT id INTO svc_soin FROM public.services WHERE professional_id = prof_id AND name = 'Soin capillaire' LIMIT 1;
  SELECT id INTO svc_chignon FROM public.services WHERE professional_id = prof_id AND name = 'Chignon coiffé' LIMIT 1;

  -- Insérer des clients fictifs pour les stats
  INSERT INTO public.clients (id, user_id, full_name, email)
  VALUES
    (c1, null, 'Marie Dupont', 'marie.dupont@example.com'),
    (c2, null, 'Sophie Martin', 'sophie.martin@example.com'),
    (c3, null, 'Camille Bernard', 'camille.b@example.com'),
    (c4, null, 'Lucas Moreau', 'lucas.moreau@example.com'),
    (c5, null, 'Emma Petit', 'emma.petit@example.com')
  ON CONFLICT DO NOTHING;
  
  -- 30 réservations passées, réparties sur 3 mois
  -- Bypass trigger via une insertion directe dans appointments sans availability_id
  INSERT INTO public.appointments (professional_id, client_id, service_id, availability_id, starts_at, status, notes)
  VALUES
    -- Mois -3 (mai 2026)
    (prof_id, c1, svc_coupe_f, null, now() - interval '90 days' + interval '9 hours', 'completed', null),
    (prof_id, c2, svc_color, null, now() - interval '88 days' + interval '10 hours', 'completed', null),
    (prof_id, c3, svc_brushing, null, now() - interval '86 days' + interval '14 hours', 'completed', null),
    (prof_id, c4, svc_coupe_h, null, now() - interval '85 days' + interval '11 hours', 'completed', null),
    (prof_id, c5, svc_soin, null, now() - interval '83 days' + interval '9 hours 30 minutes', 'completed', null),
    (prof_id, c1, svc_balayage, null, now() - interval '80 days' + interval '10 hours', 'completed', null),
    (prof_id, c2, svc_coupe_f, null, now() - interval '78 days' + interval '15 hours', 'completed', null),
    (prof_id, c3, svc_lissage, null, now() - interval '76 days' + interval '9 hours', 'completed', null),
    (prof_id, c5, svc_chignon, null, now() - interval '74 days' + interval '11 hours', 'completed', null),
    (prof_id, c4, svc_coupe_h, null, now() - interval '72 days' + interval '14 hours', 'completed', null),
    -- Mois -2 (juin 2026)
    (prof_id, c1, svc_coupe_f, null, now() - interval '60 days' + interval '9 hours', 'completed', null),
    (prof_id, c2, svc_brushing, null, now() - interval '58 days' + interval '10 hours', 'completed', null),
    (prof_id, c3, svc_color, null, now() - interval '56 days' + interval '11 hours', 'completed', null),
    (prof_id, c4, svc_coupe_h, null, now() - interval '55 days' + interval '14 hours', 'completed', null),
    (prof_id, c5, svc_balayage, null, now() - interval '53 days' + interval '9 hours', 'completed', null),
    (prof_id, c1, svc_soin, null, now() - interval '50 days' + interval '10 hours', 'completed', null),
    (prof_id, c2, svc_coupe_f, null, now() - interval '48 days' + interval '15 hours', 'completed', null),
    (prof_id, c3, svc_lissage, null, now() - interval '46 days' + interval '9 hours', 'completed', null),
    (prof_id, c4, svc_chignon, null, now() - interval '44 days' + interval '11 hours', 'completed', null),
    (prof_id, c5, svc_coupe_f, null, now() - interval '42 days' + interval '14 hours', 'completed', null),
    -- Mois -1 (juillet 2026)
    (prof_id, c1, svc_color, null, now() - interval '30 days' + interval '9 hours', 'completed', null),
    (prof_id, c2, svc_coupe_f, null, now() - interval '28 days' + interval '10 hours', 'completed', null),
    (prof_id, c3, svc_brushing, null, now() - interval '26 days' + interval '11 hours', 'completed', null),
    (prof_id, c4, svc_coupe_h, null, now() - interval '25 days' + interval '14 hours', 'completed', null),
    (prof_id, c5, svc_balayage, null, now() - interval '23 days' + interval '9 hours', 'completed', null),
    (prof_id, c1, svc_soin, null, now() - interval '20 days' + interval '10 hours', 'completed', null),
    (prof_id, c2, svc_lissage, null, now() - interval '18 days' + interval '15 hours', 'completed', null),
    (prof_id, c3, svc_coupe_f, null, now() - interval '15 days' + interval '9 hours', 'completed', null),
    (prof_id, c4, svc_chignon, null, now() - interval '10 days' + interval '11 hours', 'completed', null),
    (prof_id, c5, svc_color, null, now() - interval '5 days' + interval '14 hours', 'completed', null);

  RAISE NOTICE '30 réservations de démo insérées pour le professionnel %', prof_id;
END $$;
