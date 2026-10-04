-- =====================================================================
-- MIGRATION 5 / 6 : STOCKAGE DES PHOTOS
-- =====================================================================
-- Bucket "spot-photos" :
--   - public : une photo est lisible par quiconque possede son URL
--     exacte (decision validee). Les URLs contiennent deux identifiants
--     aleatoires et ne sont pas devinables. Lister le contenu du bucket
--     reste impossible sans etre proprietaire ou admin.
--   - 2 Mo maximum par fichier, JPEG uniquement : ces deux limites sont
--     appliquees par Supabase, pas par l'application.
--
-- Chemins imposes :
--   spots/<id du spot>/<id de la photo>_std.jpg
--   spots/<id du spot>/<id de la photo>_thumb.jpg
-- =====================================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spot-photos', 'spot-photos', true, 2097152, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Envoi : utilisateur actif, dans le dossier "spots", fichier .jpg.
drop policy if exists spot_photos_objects_insert on storage.objects;
create policy spot_photos_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'spot-photos'
    and (select private.is_active_user())
    and (storage.foldername(name))[1] = 'spots'
    and lower(storage.extension(name)) = 'jpg'
  );

-- Lecture via l'API (lister, verifier avant suppression) : proprietaire
-- du fichier ou admin. L'affichage des images par URL publique ne passe
-- pas par cette regle.
drop policy if exists spot_photos_objects_select on storage.objects;
create policy spot_photos_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'spot-photos'
    and (
      owner_id = (select auth.uid()::text)
      or (select private.is_admin())
    )
  );

-- Suppression : proprietaire actif du fichier, ou admin.
drop policy if exists spot_photos_objects_delete on storage.objects;
create policy spot_photos_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'spot-photos'
    and (
      (owner_id = (select auth.uid()::text) and (select private.is_active_user()))
      or (select private.is_admin())
    )
  );

-- Volontairement aucune regle "update" : un fichier envoye ne peut pas
-- etre remplace. C'est ce qui autorise un cache tres long cote
-- navigateur.

commit;
