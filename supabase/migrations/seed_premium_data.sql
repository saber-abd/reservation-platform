-- SCRIPT DE GÉNÉRATION DE DONNÉES (DÉMO PREMIUM)
-- Exécutez ce script dans l'éditeur SQL de Supabase.
-- REMPLACEZ LA VALEUR SUIVANTE par votre propre User ID récupéré depuis l'onglet Authentication de Supabase.
DO $$
DECLARE
    -- Mettez votre vrai UUID ici entre les guillemets !
    my_user_id UUID := '8335869b-2773-4d39-88e6-3bca5aab8e76';
    
    pro_id UUID;
    client1_id UUID := gen_random_uuid();
    client2_id UUID := gen_random_uuid();
    client3_id UUID := gen_random_uuid();
    
    svc_diag_id UUID := gen_random_uuid();
    svc_vidange_id UUID := gen_random_uuid();
    svc_freins_id UUID := gen_random_uuid();
    svc_ceramic_id UUID := gen_random_uuid();
    svc_pneus_id UUID := gen_random_uuid();
BEGIN

    -- 1. Nettoyer les anciennes données Premium si besoin
    DELETE FROM appointments WHERE tag_bd = 'premium';
    DELETE FROM services WHERE tag_bd = 'premium';
    DELETE FROM clients WHERE tag_bd = 'premium' AND id IN (client1_id, client2_id, client3_id);
    DELETE FROM professionals WHERE tag_bd = 'premium';

    -- 2. Créer le Profil Professionnel Premium
    INSERT INTO professionals (id, user_id, business_name, activity, tag_bd)
    VALUES (gen_random_uuid(), my_user_id, 'Arsenal Mécanique Premium', 'Garage Automobile', 'premium')
    RETURNING id INTO pro_id;

    -- 3. Créer des Prestations "Garage" (Services)
    INSERT INTO services (id, professional_id, name, category, description, duration_minutes, price, tag_bd) VALUES
    (svc_diag_id, pro_id, 'Diagnostic Électronique', 'Diagnostic', 'Lecture des codes défauts et effacement', 30, 49.90, 'premium'),
    (svc_vidange_id, pro_id, 'Vidange Huile Synthétique', 'Entretien', 'Remplacement huile 5W30 + filtre à huile', 60, 129.00, 'premium'),
    (svc_freins_id, pro_id, 'Remplacement Plaquettes', 'Freinage', 'Montage plaquettes Brembo / Bosch', 45, 89.50, 'premium'),
    (svc_ceramic_id, pro_id, 'Lustrage Céramique', 'Esthétique', 'Protection carrosserie hydrofuge 12 mois', 180, 290.00, 'premium'),
    (svc_pneus_id, pro_id, 'Montage & Équilibrage (x2)', 'Pneus', 'Démontage, valve, équilibrage pour 2 roues', 40, 35.00, 'premium');

    -- 4. Créer de Faux Clients (Pilotes)
    -- Attention : la table clients reference auth.users.id, il faut donc insérer dans auth.users d'abord.
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES 
    ('00000000-0000-0000-0000-000000000000', client1_id, 'authenticated', 'authenticated', 'lucas.dubois@demo.com', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"account_role":"client"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', client2_id, 'authenticated', 'authenticated', 'emma.laurent@demo.com', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"account_role":"client"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', client3_id, 'authenticated', 'authenticated', 'thomas.martin@demo.com', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"account_role":"client"}', now(), now(), '', '', '', '')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO clients (id, full_name, phone, tag_bd) VALUES
    (client1_id, 'Lucas Dubois (Audi RS3)', '06 12 34 56 78', 'premium'),
    (client2_id, 'Emma Laurent (Golf 8 R)', '06 98 76 54 32', 'premium'),
    (client3_id, 'Thomas Martin (Porsche 911)', '07 11 22 33 44', 'premium')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, tag_bd = EXCLUDED.tag_bd;

    -- 5. Créer des Rendez-vous (Appointments) pour remplir le dashboard Télémétrie
    
    -- Rendez-vous terminés (Mois Précédent)
    INSERT INTO appointments (professional_id, client_id, service_id, client_name, client_email, client_phone, start_time, end_time, status, tag_bd) VALUES
    (pro_id, client1_id, svc_vidange_id, 'Lucas Dubois (Audi RS3)', 'lucas.dubois@demo.com', '06 12 34 56 78', (CURRENT_DATE - INTERVAL '20 days') + TIME '09:00:00', (CURRENT_DATE - INTERVAL '20 days') + TIME '10:00:00', 'completed', 'premium'),
    (pro_id, client2_id, svc_freins_id, 'Emma Laurent (Golf 8 R)', 'emma.laurent@demo.com', '06 98 76 54 32', (CURRENT_DATE - INTERVAL '15 days') + TIME '14:00:00', (CURRENT_DATE - INTERVAL '15 days') + TIME '14:45:00', 'completed', 'premium'),
    (pro_id, client3_id, svc_ceramic_id, 'Thomas Martin (Porsche 911)', 'thomas.martin@demo.com', '07 11 22 33 44', (CURRENT_DATE - INTERVAL '10 days') + TIME '10:00:00', (CURRENT_DATE - INTERVAL '10 days') + TIME '13:00:00', 'completed', 'premium'),
    (pro_id, client1_id, svc_diag_id, 'Lucas Dubois (Audi RS3)', 'lucas.dubois@demo.com', '06 12 34 56 78', (CURRENT_DATE - INTERVAL '5 days') + TIME '16:00:00', (CURRENT_DATE - INTERVAL '5 days') + TIME '16:30:00', 'completed', 'premium');

    -- Rendez-vous confirmés (Aujourd'hui et Demain)
    INSERT INTO appointments (professional_id, client_id, service_id, client_name, client_email, client_phone, start_time, end_time, status, tag_bd) VALUES
    (pro_id, client2_id, svc_vidange_id, 'Emma Laurent (Golf 8 R)', 'emma.laurent@demo.com', '06 98 76 54 32', CURRENT_DATE + TIME '11:00:00', CURRENT_DATE + TIME '12:00:00', 'confirmed', 'premium'),
    (pro_id, client3_id, svc_pneus_id, 'Thomas Martin (Porsche 911)', 'thomas.martin@demo.com', '07 11 22 33 44', CURRENT_DATE + TIME '15:00:00', CURRENT_DATE + TIME '15:40:00', 'confirmed', 'premium'),
    (pro_id, client1_id, svc_freins_id, 'Lucas Dubois (Audi RS3)', 'lucas.dubois@demo.com', '06 12 34 56 78', (CURRENT_DATE + INTERVAL '1 day') + TIME '09:30:00', (CURRENT_DATE + INTERVAL '1 day') + TIME '10:15:00', 'confirmed', 'premium'),
    (pro_id, client2_id, svc_diag_id, 'Emma Laurent (Golf 8 R)', 'emma.laurent@demo.com', '06 98 76 54 32', (CURRENT_DATE + INTERVAL '2 days') + TIME '14:00:00', (CURRENT_DATE + INTERVAL '2 days') + TIME '14:30:00', 'pending', 'premium');

END $$;
