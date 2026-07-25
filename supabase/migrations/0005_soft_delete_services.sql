-- ============================================================================
-- Migration: 0005_soft_delete_services
-- Description: Ajoute une colonne is_deleted pour permettre une suppression
-- "douce" sans casser l'historique des rendez-vous.
-- ============================================================================

alter table public.services
add column if not exists is_deleted boolean not null default false;

-- Mettre à jour les politiques RLS existantes si nécessaire.
-- Les services publics doivent être actifs et non supprimés.
-- Pour simplifier, nous gérerons le filtre `is_deleted = false` directement dans les requêtes client.
