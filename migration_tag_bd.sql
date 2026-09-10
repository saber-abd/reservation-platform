-- Migration Script: Ajouter le tag multi-démos (tag_bd)
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Ajout de la colonne `tag_bd` avec une valeur par défaut 'diamant' (ou 'standard'/'premium' selon votre choix actuel)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE services ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE availability_rules ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';
ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS tag_bd TEXT NOT NULL DEFAULT 'diamant';

-- 2. (Optionnel) Mise à jour des index pour optimiser les requêtes qui filtreront systématiquement par tag_bd
CREATE INDEX IF NOT EXISTS idx_professionals_tag_bd ON professionals(tag_bd);
CREATE INDEX IF NOT EXISTS idx_services_tag_bd ON services(tag_bd);
CREATE INDEX IF NOT EXISTS idx_appointments_tag_bd ON appointments(tag_bd);
CREATE INDEX IF NOT EXISTS idx_clients_tag_bd ON clients(tag_bd);

-- Note: Ce script préserve vos données existantes. Par défaut, elles seront considérées comme appartenant à la démo "diamant".
-- Vous pourrez toujours changer manuellement dans l'interface Supabase la valeur de tag_bd de certaines lignes pour 'premium' ou 'standard'.
