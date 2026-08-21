-- ============================================================================
-- Migration 0008 — Statut "en attente de validation" pour les réservations
-- À exécuter dans Supabase > SQL Editor (une seule fois), après 0007.
-- Les nouvelles réservations ne sont plus confirmées automatiquement : le
-- professionnel doit les valider depuis son dashboard (onglet "En attente").
-- ============================================================================

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'completed'));

alter table public.appointments
  alter column status set default 'pending';
