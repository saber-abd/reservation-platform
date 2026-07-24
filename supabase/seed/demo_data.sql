-- ============================================================================
-- Seed données de démo — Prestations + réservations passées
-- ============================================================================
-- ⚠️ ÉTAPE OBLIGATOIRE avant d'exécuter ce script :
--    SELECT id FROM professionals LIMIT 1;
--    Vérifiez qu'il y a bien un professionnel. Sinon, créez-en un via /inscription.
-- ============================================================================

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

  -- Noms/emails pour les réservations invité (pas de compte)
  names  text[] := ARRAY['Marie Dupont','Sophie Martin','Camille Bernard','Lucas Moreau','Emma Petit','Jade Lefebvre','Nathan Rousseau'];
  emails text[] := ARRAY['marie.dupont@demo.fr','sophie.martin@demo.fr','camille.b@demo.fr','lucas.moreau@demo.fr','emma.petit@demo.fr','jade.lefebvre@demo.fr','nathan.rousseau@demo.fr'];
BEGIN
  -- ── 1. Professionnel ─────────────────────────────────────────────────────
  SELECT id INTO prof_id FROM public.professionals LIMIT 1;

  IF prof_id IS NULL THEN
    RAISE EXCEPTION
      'Aucun professionnel trouvé. Créez d''abord un compte pro via /inscription puis revenez ici.';
  END IF;

  -- ── 2. Prestations ───────────────────────────────────────────────────────
  -- Supprime les doublons éventuels avant de réinsérer
  DELETE FROM public.services
  WHERE professional_id = prof_id
    AND name = ANY(ARRAY[
      'Coupe femme','Coupe homme','Coupe enfant','Coloration complète',
      'Balayage / Mèches','Brushing','Lissage brésilien','Permanente',
      'Soin capillaire','Chignon coiffé'
    ]);

  INSERT INTO public.services
    (professional_id, name, description, duration_minutes, price, is_active)
  VALUES
    (prof_id, 'Coupe femme',       'Coupe, shampoing et brushing inclus',                       45,  45.00, true),
    (prof_id, 'Coupe homme',       'Coupe classique ou dégradé, finition soignée',              20,  22.00, true),
    (prof_id, 'Coupe enfant',      'Coupe pour enfants jusqu''à 12 ans',                        20,  16.00, true),
    (prof_id, 'Coloration complète','Coloration racines + longueurs avec soin',                 90,  75.00, true),
    (prof_id, 'Balayage / Mèches', 'Balayage ou mèches avec brushing',                        120,  90.00, true),
    (prof_id, 'Brushing',          'Mise en forme et brushing volume',                          30,  28.00, true),
    (prof_id, 'Lissage brésilien', 'Traitement lissant longue durée',                          150, 180.00, true),
    (prof_id, 'Permanente',        'Frisage permanent avec soin restructurant',                120,  85.00, true),
    (prof_id, 'Soin capillaire',   'Masque professionnel nourrissant',                          30,  35.00, true),
    (prof_id, 'Chignon coiffé',    'Coiffure de cérémonie ou mariage',                          60,  65.00, true);

  RAISE NOTICE '10 prestations créées pour le professionnel %', prof_id;

  -- ── 3. Récupération des IDs de prestations ────────────────────────────────
  SELECT id INTO svc_coupe_f FROM public.services WHERE professional_id = prof_id AND name = 'Coupe femme'        LIMIT 1;
  SELECT id INTO svc_coupe_h FROM public.services WHERE professional_id = prof_id AND name = 'Coupe homme'        LIMIT 1;
  SELECT id INTO svc_coupe_e FROM public.services WHERE professional_id = prof_id AND name = 'Coupe enfant'       LIMIT 1;
  SELECT id INTO svc_color   FROM public.services WHERE professional_id = prof_id AND name = 'Coloration complète' LIMIT 1;
  SELECT id INTO svc_balay   FROM public.services WHERE professional_id = prof_id AND name = 'Balayage / Mèches'  LIMIT 1;
  SELECT id INTO svc_brush   FROM public.services WHERE professional_id = prof_id AND name = 'Brushing'           LIMIT 1;
  SELECT id INTO svc_lissage FROM public.services WHERE professional_id = prof_id AND name = 'Lissage brésilien'  LIMIT 1;
  SELECT id INTO svc_perm    FROM public.services WHERE professional_id = prof_id AND name = 'Permanente'         LIMIT 1;
  SELECT id INTO svc_soin    FROM public.services WHERE professional_id = prof_id AND name = 'Soin capillaire'    LIMIT 1;
  SELECT id INTO svc_chignon FROM public.services WHERE professional_id = prof_id AND name = 'Chignon coiffé'     LIMIT 1;

  -- ── 4. Réservations passées (mode invité, client_id = null) ──────────────
  -- ⚠️ Le trigger on_appointment_created vérifie availability_id.
  --    On l'insère à NULL pour contourner le trigger (pas de créneau réel à bloquer).
  --    Ces réservations servent uniquement à alimenter les statistiques.

  INSERT INTO public.appointments
    (professional_id, service_id, availability_id, client_id,
     client_name,   client_email,
     start_time,                                            end_time,
     status)
  VALUES
    -- ── Mai 2026 ──
    (prof_id, svc_coupe_f, null, null, names[1], emails[1], now()-interval '90 days'+interval '9 hours',  now()-interval '90 days'+interval '9 hours 45 minutes',  'completed'),
    (prof_id, svc_color,   null, null, names[2], emails[2], now()-interval '88 days'+interval '10 hours', now()-interval '88 days'+interval '11 hours 30 minutes', 'completed'),
    (prof_id, svc_brush,   null, null, names[3], emails[3], now()-interval '86 days'+interval '14 hours', now()-interval '86 days'+interval '14 hours 30 minutes', 'completed'),
    (prof_id, svc_coupe_h, null, null, names[4], emails[4], now()-interval '85 days'+interval '11 hours', now()-interval '85 days'+interval '11 hours 20 minutes', 'completed'),
    (prof_id, svc_soin,    null, null, names[5], emails[5], now()-interval '83 days'+interval '9 hours',  now()-interval '83 days'+interval '9 hours 30 minutes',  'completed'),
    (prof_id, svc_balay,   null, null, names[1], emails[1], now()-interval '80 days'+interval '10 hours', now()-interval '80 days'+interval '12 hours',            'completed'),
    (prof_id, svc_coupe_f, null, null, names[2], emails[2], now()-interval '78 days'+interval '15 hours', now()-interval '78 days'+interval '15 hours 45 minutes', 'completed'),
    (prof_id, svc_lissage, null, null, names[3], emails[3], now()-interval '76 days'+interval '9 hours',  now()-interval '76 days'+interval '11 hours 30 minutes', 'completed'),
    (prof_id, svc_chignon, null, null, names[5], emails[5], now()-interval '74 days'+interval '11 hours', now()-interval '74 days'+interval '12 hours',            'completed'),
    (prof_id, svc_coupe_h, null, null, names[4], emails[4], now()-interval '72 days'+interval '14 hours', now()-interval '72 days'+interval '14 hours 20 minutes', 'completed'),
    -- ── Juin 2026 ──
    (prof_id, svc_coupe_f, null, null, names[6], emails[6], now()-interval '60 days'+interval '9 hours',  now()-interval '60 days'+interval '9 hours 45 minutes',  'completed'),
    (prof_id, svc_brush,   null, null, names[2], emails[2], now()-interval '58 days'+interval '10 hours', now()-interval '58 days'+interval '10 hours 30 minutes', 'completed'),
    (prof_id, svc_color,   null, null, names[3], emails[3], now()-interval '56 days'+interval '11 hours', now()-interval '56 days'+interval '12 hours 30 minutes', 'completed'),
    (prof_id, svc_coupe_h, null, null, names[4], emails[4], now()-interval '55 days'+interval '14 hours', now()-interval '55 days'+interval '14 hours 20 minutes', 'completed'),
    (prof_id, svc_balay,   null, null, names[5], emails[5], now()-interval '53 days'+interval '9 hours',  now()-interval '53 days'+interval '11 hours',            'completed'),
    (prof_id, svc_soin,    null, null, names[1], emails[1], now()-interval '50 days'+interval '10 hours', now()-interval '50 days'+interval '10 hours 30 minutes', 'completed'),
    (prof_id, svc_coupe_f, null, null, names[2], emails[2], now()-interval '48 days'+interval '15 hours', now()-interval '48 days'+interval '15 hours 45 minutes', 'completed'),
    (prof_id, svc_lissage, null, null, names[7], emails[7], now()-interval '46 days'+interval '9 hours',  now()-interval '46 days'+interval '11 hours 30 minutes', 'completed'),
    (prof_id, svc_chignon, null, null, names[4], emails[4], now()-interval '44 days'+interval '11 hours', now()-interval '44 days'+interval '12 hours',            'completed'),
    (prof_id, svc_coupe_f, null, null, names[5], emails[5], now()-interval '42 days'+interval '14 hours', now()-interval '42 days'+interval '14 hours 45 minutes', 'completed'),
    -- ── Juillet 2026 ──
    (prof_id, svc_color,   null, null, names[1], emails[1], now()-interval '30 days'+interval '9 hours',  now()-interval '30 days'+interval '10 hours 30 minutes', 'completed'),
    (prof_id, svc_coupe_f, null, null, names[2], emails[2], now()-interval '28 days'+interval '10 hours', now()-interval '28 days'+interval '10 hours 45 minutes', 'completed'),
    (prof_id, svc_brush,   null, null, names[3], emails[3], now()-interval '26 days'+interval '11 hours', now()-interval '26 days'+interval '11 hours 30 minutes', 'completed'),
    (prof_id, svc_coupe_h, null, null, names[4], emails[4], now()-interval '25 days'+interval '14 hours', now()-interval '25 days'+interval '14 hours 20 minutes', 'completed'),
    (prof_id, svc_balay,   null, null, names[5], emails[5], now()-interval '23 days'+interval '9 hours',  now()-interval '23 days'+interval '11 hours',            'completed'),
    (prof_id, svc_soin,    null, null, names[1], emails[1], now()-interval '20 days'+interval '10 hours', now()-interval '20 days'+interval '10 hours 30 minutes', 'completed'),
    (prof_id, svc_lissage, null, null, names[6], emails[6], now()-interval '18 days'+interval '15 hours', now()-interval '18 days'+interval '17 hours 30 minutes', 'completed'),
    (prof_id, svc_coupe_f, null, null, names[3], emails[3], now()-interval '15 days'+interval '9 hours',  now()-interval '15 days'+interval '9 hours 45 minutes',  'completed'),
    (prof_id, svc_chignon, null, null, names[4], emails[4], now()-interval '10 days'+interval '11 hours', now()-interval '10 days'+interval '12 hours',            'completed'),
    (prof_id, svc_color,   null, null, names[5], emails[5], now()-interval '5 days' +interval '14 hours', now()-interval '5 days' +interval '15 hours 30 minutes', 'completed');

  RAISE NOTICE '30 réservations de démo insérées (mode invité) pour le professionnel %', prof_id;
END $$;
