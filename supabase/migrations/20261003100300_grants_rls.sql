-- =====================================================================
-- MIGRATION 4 / 6 : DROITS ET ROW LEVEL SECURITY
-- =====================================================================
-- Deux niveaux de protection, tous les deux cote base :
--
-- 1. Les DROITS (grant) disent quelles operations et quelles COLONNES
--    le role "authenticated" (un utilisateur connecte) peut toucher.
--    Exemple : on peut modifier le nom d'un spot, jamais son type ni
--    son createur, parce que ces colonnes ne sont pas accordees.
--
-- 2. Les REGLES RLS (policy) disent sur quelles LIGNES.
--    Exemple : seulement les spots que j'ai crees.
--
-- Le role "anon" (personne non connectee) n'a aucun droit.
--
-- Rappel Supabase : sur les projets recents, une table sans "grant"
-- explicite est invisible pour l'API. Tous les droits sont donc ecrits
-- ici noir sur blanc.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Schema prive : utilisable par les regles, invisible depuis l'API
-- ---------------------------------------------------------------------
grant usage on schema private to authenticated, service_role;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_active_user() to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.setting_int(text, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- On repart de zero sur les droits des tables et des vues
-- ---------------------------------------------------------------------
revoke all on
  public.profiles,
  public.spot_types,
  public.rating_categories,
  public.spots,
  public.spot_photos,
  public.spot_ratings,
  public.spot_updates,
  public.app_settings,
  public.spots_light,
  public.spot_rating_summary
from public, anon, authenticated;

-- Le role service_role (cle secrete, jamais dans le frontend) garde un
-- acces complet : il servira a d'eventuels scripts d'administration.
grant select, insert, update, delete on
  public.profiles,
  public.spot_types,
  public.rating_categories,
  public.spots,
  public.spot_photos,
  public.spot_ratings,
  public.spot_updates,
  public.app_settings
to service_role;
grant select on public.spots_light, public.spot_rating_summary to service_role;

-- ---------------------------------------------------------------------
-- Droits du role "authenticated", colonne par colonne
-- ---------------------------------------------------------------------

-- profiles : lecture ; modification limitee a trois colonnes (le
-- trigger protect_profile decide ensuite qui peut changer quoi).
grant select on public.profiles to authenticated;
grant update (display_name, role, is_active) on public.profiles to authenticated;

-- Tables de reference et parametres : l'admin gere tout (filtre par RLS).
grant select, insert, update, delete on public.spot_types to authenticated;
grant select, insert, update, delete on public.rating_categories to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;

-- spots : created_by n'est pas accorde en ecriture -> il prend toujours
-- la valeur par defaut auth.uid(). spot_type_id n'est pas accorde en
-- modification -> le type est fige apres creation.
grant select, delete on public.spots to authenticated;
grant insert (spot_type_id, name, description, lat, lng, address, address_source, visited_on)
  on public.spots to authenticated;
grant update (name, description, lat, lng, address, address_source, visited_on, cover_photo_id)
  on public.spots to authenticated;

-- spot_photos : l'application fournit l'id (il sert a nommer les
-- fichiers). Aucune modification possible.
grant select, delete on public.spot_photos to authenticated;
grant insert (id, spot_id, path_standard, path_thumb, width, height, size_bytes, taken_at)
  on public.spot_photos to authenticated;

-- spot_ratings : seule la valeur est modifiable.
grant select, delete on public.spot_ratings to authenticated;
grant insert (spot_id, category_id, value) on public.spot_ratings to authenticated;
grant update (value) on public.spot_ratings to authenticated;

-- spot_updates : seul le texte est modifiable.
grant select, delete on public.spot_updates to authenticated;
grant insert (spot_id, body) on public.spot_updates to authenticated;
grant update (body) on public.spot_updates to authenticated;

-- Vues.
grant select on public.spots_light to authenticated;
grant select on public.spot_rating_summary to authenticated;

-- ---------------------------------------------------------------------
-- Fonctions appelables par l'application
-- ---------------------------------------------------------------------
revoke all on function public.nearby_spots(double precision, double precision, integer, uuid)
  from public, anon;
revoke all on function public.spots_in_bbox(double precision, double precision, double precision, double precision, uuid[], integer)
  from public, anon;
revoke all on function public.set_spot_ratings(uuid, jsonb)
  from public, anon;
revoke all on function public.create_spot(uuid, text, double precision, double precision, text, text, text, date, jsonb)
  from public, anon;
revoke all on function public.admin_list_users()
  from public, anon;
revoke all on function public.admin_storage_report()
  from public, anon;
revoke all on function public.admin_orphan_files(integer)
  from public, anon;

grant execute on function public.nearby_spots(double precision, double precision, integer, uuid)
  to authenticated, service_role;
grant execute on function public.spots_in_bbox(double precision, double precision, double precision, double precision, uuid[], integer)
  to authenticated, service_role;
grant execute on function public.set_spot_ratings(uuid, jsonb)
  to authenticated, service_role;
grant execute on function public.create_spot(uuid, text, double precision, double precision, text, text, text, date, jsonb)
  to authenticated, service_role;
grant execute on function public.admin_list_users()
  to authenticated, service_role;
grant execute on function public.admin_storage_report()
  to authenticated, service_role;
grant execute on function public.admin_orphan_files(integer)
  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Activation de RLS : sans regle, tout est refuse
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.spot_types enable row level security;
alter table public.rating_categories enable row level security;
alter table public.spots enable row level security;
alter table public.spot_photos enable row level security;
alter table public.spot_ratings enable row level security;
alter table public.spot_updates enable row level security;
alter table public.app_settings enable row level security;

-- Dans les regles, les appels sont ecrits "(select fonction())" : la
-- base calcule alors le resultat une fois par requete au lieu d'une
-- fois par ligne.

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
-- Lecture : tout utilisateur actif voit les profils (pour afficher les
-- noms). Un compte desactive ne voit que le sien, ce qui permet a
-- l'application de lui afficher "compte desactive".
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_active_user())
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (
    (id = (select auth.uid()) and (select private.is_active_user()))
    or (select private.is_admin())
  )
  with check (
    (id = (select auth.uid()) and (select private.is_active_user()))
    or (select private.is_admin())
  );

-- Pas de regle insert / delete : les profils sont crees par trigger et
-- supprimes avec le compte, depuis le tableau de bord Supabase.

-- ---------------------------------------------------------------------
-- spot_types
-- ---------------------------------------------------------------------
create policy spot_types_select on public.spot_types
  for select to authenticated
  using ((select private.is_active_user()));

create policy spot_types_insert on public.spot_types
  for insert to authenticated
  with check ((select private.is_admin()));

create policy spot_types_update on public.spot_types
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy spot_types_delete on public.spot_types
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- rating_categories
-- ---------------------------------------------------------------------
create policy rating_categories_select on public.rating_categories
  for select to authenticated
  using ((select private.is_active_user()));

create policy rating_categories_insert on public.rating_categories
  for insert to authenticated
  with check ((select private.is_admin()));

create policy rating_categories_update on public.rating_categories
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy rating_categories_delete on public.rating_categories
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------
create policy app_settings_select on public.app_settings
  for select to authenticated
  using ((select private.is_active_user()));

create policy app_settings_insert on public.app_settings
  for insert to authenticated
  with check ((select private.is_admin()));

create policy app_settings_update on public.app_settings
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy app_settings_delete on public.app_settings
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- spots
-- ---------------------------------------------------------------------
create policy spots_select on public.spots
  for select to authenticated
  using ((select private.is_active_user()));

create policy spots_insert on public.spots
  for insert to authenticated
  with check (
    (select private.is_active_user())
    and created_by = (select auth.uid())
  );

create policy spots_update on public.spots
  for update to authenticated
  using (
    (created_by = (select auth.uid()) and (select private.is_active_user()))
    or (select private.is_admin())
  )
  with check (
    (created_by = (select auth.uid()) and (select private.is_active_user()))
    or (select private.is_admin())
  );

-- Suppression : admin uniquement (d'autres utilisateurs ont pu ajouter
-- des photos et des updates au spot).
create policy spots_delete on public.spots
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- spot_photos
-- ---------------------------------------------------------------------
create policy spot_photos_select on public.spot_photos
  for select to authenticated
  using ((select private.is_active_user()));

create policy spot_photos_insert on public.spot_photos
  for insert to authenticated
  with check (
    (select private.is_active_user())
    and uploaded_by = (select auth.uid())
  );

create policy spot_photos_delete on public.spot_photos
  for delete to authenticated
  using (
    (uploaded_by = (select auth.uid()) and (select private.is_active_user()))
    or (select private.is_admin())
  );

-- ---------------------------------------------------------------------
-- spot_ratings
-- ---------------------------------------------------------------------
create policy spot_ratings_select on public.spot_ratings
  for select to authenticated
  using ((select private.is_active_user()));

create policy spot_ratings_insert on public.spot_ratings
  for insert to authenticated
  with check (
    (select private.is_active_user())
    and user_id = (select auth.uid())
  );

create policy spot_ratings_update on public.spot_ratings
  for update to authenticated
  using (user_id = (select auth.uid()) and (select private.is_active_user()))
  with check (user_id = (select auth.uid()) and (select private.is_active_user()));

create policy spot_ratings_delete on public.spot_ratings
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and (select private.is_active_user()))
    or (select private.is_admin())
  );

-- ---------------------------------------------------------------------
-- spot_updates
-- ---------------------------------------------------------------------
create policy spot_updates_select on public.spot_updates
  for select to authenticated
  using ((select private.is_active_user()));

create policy spot_updates_insert on public.spot_updates
  for insert to authenticated
  with check (
    (select private.is_active_user())
    and author_id = (select auth.uid())
  );

create policy spot_updates_update on public.spot_updates
  for update to authenticated
  using (author_id = (select auth.uid()) and (select private.is_active_user()))
  with check (author_id = (select auth.uid()) and (select private.is_active_user()));

create policy spot_updates_delete on public.spot_updates
  for delete to authenticated
  using (
    (author_id = (select auth.uid()) and (select private.is_active_user()))
    or (select private.is_admin())
  );

commit;
