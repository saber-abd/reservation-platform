-- ============================================================================
-- Migration 0002 — Trigger anti double-réservation
-- À exécuter dans Supabase > SQL Editor, après schema.sql
-- ============================================================================

-- Quand un appointment est créé avec un availability_id, on marque le créneau
-- comme réservé de façon atomique. Si le créneau était déjà réservé,
-- l'insertion est annulée (empêche deux clients de réserver le même créneau).
create or replace function public.handle_new_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.availability_id is not null then
    update public.availabilities
    set is_booked = true
    where id = new.availability_id and is_booked = false;

    if not found then
      raise exception 'Ce créneau n''est plus disponible.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_appointment_created on public.appointments;

create trigger on_appointment_created
  before insert on public.appointments
  for each row
  execute function public.handle_new_appointment();
