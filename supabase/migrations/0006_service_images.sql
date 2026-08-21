-- ============================================================================
-- Migration 0006 — Photos des prestations (colonne + bucket de stockage)
-- À exécuter dans Supabase > SQL Editor (une seule fois), après 0005.
-- ============================================================================

alter table public.services
  add column if not exists image_url text default null;

-- Bucket public pour héberger les photos illustrant les prestations.
insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do nothing;

-- Lecture publique (vitrine + réservation).
drop policy if exists "service_images_public_read" on storage.objects;
create policy "service_images_public_read"
  on storage.objects for select
  using (bucket_id = 'service-images');

-- Écriture réservée au professionnel propriétaire (fichiers rangés sous {professional_id}/...).
drop policy if exists "service_images_owner_insert" on storage.objects;
create policy "service_images_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'service-images'
    and exists (
      select 1 from public.professionals p
      where p.user_id = auth.uid() and p.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "service_images_owner_update" on storage.objects;
create policy "service_images_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'service-images'
    and exists (
      select 1 from public.professionals p
      where p.user_id = auth.uid() and p.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "service_images_owner_delete" on storage.objects;
create policy "service_images_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'service-images'
    and exists (
      select 1 from public.professionals p
      where p.user_id = auth.uid() and p.id::text = (storage.foldername(name))[1]
    )
  );
