-- =====================================================================
-- MIGRATION 16 : PHOTO OU ICONE DE PROFIL
-- =====================================================================
-- Chaque utilisateur peut choisir une photo de profil, ou a defaut une
-- icone. Sans l'une ni l'autre, l'application affiche son initiale.
--
--   - profiles.avatar_path : chemin de la photo dans le bucket "avatars",
--     toujours de la forme <id de l'utilisateur>/<identifiant>.jpg ;
--   - profiles.avatar_icon : nom d'une icone ;
--   - bucket "avatars" : public en lecture, JPEG uniquement, 300 Ko au
--     plus ; chacun n'ecrit que dans son propre dossier.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

begin;

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists avatar_icon text;

alter table public.profiles drop constraint if exists profiles_avatar_path_format;
alter table public.profiles
  add constraint profiles_avatar_path_format
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.jpg$'));

alter table public.profiles drop constraint if exists profiles_avatar_icon_format;
alter table public.profiles
  add constraint profiles_avatar_icon_format
  check (avatar_icon is null or avatar_icon ~ '^[a-z0-9-]{1,40}(:[a-z0-9-]{1,40})?$');

-- Chacun modifie son propre avatar ; un admin peut retirer celui d'un autre
-- (memes regles RLS que le reste du profil).
grant update (avatar_path, avatar_icon) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- Stockage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 307200, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Envoi : utilisateur actif, uniquement dans le dossier a son nom.
drop policy if exists avatars_objects_insert on storage.objects;
create policy avatars_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (select private.is_active_user())
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and lower(storage.extension(name)) = 'jpg'
  );

-- Lecture via l'API (necessaire avant une suppression) : proprietaire ou
-- admin. L'affichage par URL publique ne passe pas par cette regle.
drop policy if exists avatars_objects_select on storage.objects;
create policy avatars_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (
      owner_id = (select auth.uid()::text)
      or (select private.is_admin())
    )
  );

-- Suppression : proprietaire actif du fichier, ou admin.
drop policy if exists avatars_objects_delete on storage.objects;
create policy avatars_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (owner_id = (select auth.uid()::text) and (select private.is_active_user()))
      or (select private.is_admin())
    )
  );

commit;
