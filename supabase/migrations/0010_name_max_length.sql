-- Longueur maximale des noms de clients : 60 caractères (même valeur que MAX_NAME_LENGTH côté application).
-- Un trigger tronque au lieu de rejeter la ligne, pour ne jamais faire échouer une inscription
-- (ex. nom très long renvoyé par un fournisseur OAuth) ni la mise à jour de données existantes.

CREATE OR REPLACE FUNCTION public.clamp_person_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'clients' AND NEW.full_name IS NOT NULL THEN
    NEW.full_name := left(btrim(NEW.full_name), 60);
  ELSIF TG_TABLE_NAME = 'appointments' AND NEW.client_name IS NOT NULL THEN
    NEW.client_name := left(btrim(NEW.client_name), 60);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clamp_client_name ON public.clients;
CREATE TRIGGER trg_clamp_client_name
  BEFORE INSERT OR UPDATE OF full_name ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.clamp_person_name();

DROP TRIGGER IF EXISTS trg_clamp_appointment_client_name ON public.appointments;
CREATE TRIGGER trg_clamp_appointment_client_name
  BEFORE INSERT OR UPDATE OF client_name ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.clamp_person_name();
-- Les noms existants plus longs ne sont pas modifiés : l'affichage les tronque proprement (voir l'UI).
