-- =====================================================================
-- !!! DANGER : SUPPRIME TOUTES LES DONNEES DE L'APPLICATION !!!
-- =====================================================================
-- Remet la base dans l'etat d'avant l'installation : tables, vues,
-- fonctions et regles sont supprimees, avec tous les spots, notes,
-- updates et profils.
--
-- Ne supprime PAS : les comptes (Authentication > Users), le bucket
-- "spot-photos" et ses fichiers, les extensions.
--
-- Usage prevu : pendant le developpement uniquement, pour repartir de
-- zero avant de relancer install_all.sql. Ne jamais l'utiliser une fois
-- que de vraies donnees existent.
-- =====================================================================

begin;

drop trigger if exists on_auth_user_created on auth.users;

drop policy if exists spot_photos_objects_insert on storage.objects;
drop policy if exists spot_photos_objects_select on storage.objects;
drop policy if exists spot_photos_objects_delete on storage.objects;

drop function if exists public.nearby_spots(double precision, double precision, integer, uuid);
drop function if exists public.spots_in_bbox(double precision, double precision, double precision, double precision, uuid[], integer);
drop function if exists public.ping();
drop function if exists public.create_spot(uuid, text, double precision, double precision, text, text, text, date, jsonb);
drop function if exists public.create_spot(uuid, text, double precision, double precision, text, text, text, date, jsonb, uuid);
drop function if exists public.set_spot_ratings(uuid, jsonb);
drop function if exists public.admin_list_users();
drop function if exists public.admin_storage_report();
drop function if exists public.admin_orphan_files(integer);

drop view if exists public.spots_light;
drop view if exists public.spot_rating_summary;

drop table if exists public.spot_updates cascade;
drop table if exists public.spot_ratings cascade;
drop table if exists public.spot_photos cascade;
drop table if exists public.spots cascade;
drop table if exists public.spot_subtypes cascade;
drop table if exists public.rating_categories cascade;
drop table if exists public.spot_types cascade;
drop table if exists public.app_settings cascade;
drop table if exists public.profiles cascade;

drop schema if exists private cascade;

commit;
