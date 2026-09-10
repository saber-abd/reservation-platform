-- SCRIPT DE GÉNÉRATION DE DONNÉES (DÉMO PREMIUM)
-- Exécutez ce script dans l'éditeur SQL de Supabase.
-- REMPLACEZ LA VALEUR SUIVANTE par votre propre User ID récupéré depuis l'onglet Authentication de Supabase.
DO $$
DECLARE
    -- Mettez votre vrai UUID ici entre les guillemets !
    my_user_id UUID := '4d655ed7-3c1d-4da2-afc5-6e22ea749651';
    
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
    INSERT INTO clients (id, full_name, phone, tag_bd) VALUES
    (client1_id, 'Lucas Dubois (Audi RS3)', '06 12 34 56 78', 'premium'),
    (client2_id, 'Emma Laurent (Golf 8 R)', '06 98 76 54 32', 'premium'),
    (client3_id, 'Thomas Martin (Porsche 911)', '07 11 22 33 44', 'premium');

    -- 5. Créer des Rendez-vous (Appointments) pour remplir le dashboard Télémétrie
    
    -- Rendez-vous terminés (Mois Précédent)
    INSERT INTO appointments (professional_id, client_id, service_id, appointment_date, start_time, end_time, status, tag_bd) VALUES
    (pro_id, client1_id, svc_vidange_id, CURRENT_DATE - INTERVAL '20 days', '09:00:00', '10:00:00', 'completed', 'premium'),
    (pro_id, client2_id, svc_freins_id, CURRENT_DATE - INTERVAL '15 days', '14:00:00', '14:45:00', 'completed', 'premium'),
    (pro_id, client3_id, svc_ceramic_id, CURRENT_DATE - INTERVAL '10 days', '10:00:00', '13:00:00', 'completed', 'premium'),
    (pro_id, client1_id, svc_diag_id, CURRENT_DATE - INTERVAL '5 days', '16:00:00', '16:30:00', 'completed', 'premium');

    -- Rendez-vous confirmés (Aujourd'hui et Demain)
    INSERT INTO appointments (professional_id, client_id, service_id, appointment_date, start_time, end_time, status, tag_bd) VALUES
    (pro_id, client2_id, svc_vidange_id, CURRENT_DATE, '11:00:00', '12:00:00', 'confirmed', 'premium'),
    (pro_id, client3_id, svc_pneus_id, CURRENT_DATE, '15:00:00', '15:40:00', 'confirmed', 'premium'),
    (pro_id, client1_id, svc_freins_id, CURRENT_DATE + INTERVAL '1 day', '09:30:00', '10:15:00', 'confirmed', 'premium'),
    (pro_id, client2_id, svc_diag_id, CURRENT_DATE + INTERVAL '2 days', '14:00:00', '14:30:00', 'pending', 'premium');

END $$;
