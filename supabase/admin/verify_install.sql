-- =====================================================================
-- VERIFIER L'INSTALLATION
-- =====================================================================
-- A executer dans Supabase > SQL Editor apres l'installation.
-- Ne modifie rien. Chaque ligne du resultat doit afficher ok = true.
-- (Le rayon de doublons peut differer de 100 si tu l'as modifie : c'est normal.)
-- (La derniere ligne, "admin", passe a true apres make_first_admin.)
-- =====================================================================

with checks (check_name, expected, actual) as (
  select 'tables', '10',
    (select count(*)::text from pg_tables
      where schemaname = 'public'
        and tablename in ('profiles', 'spot_types', 'rating_categories', 'spots',
                          'spot_photos', 'spot_ratings', 'spot_updates', 'app_settings', 'spot_subtypes', 'spot_extra_types'))
  union all
  select 'tables avec RLS active', '10',
    (select count(*)::text from pg_tables
      where schemaname = 'public'
        and rowsecurity
        and tablename in ('profiles', 'spot_types', 'rating_categories', 'spots',
                          'spot_photos', 'spot_ratings', 'spot_updates', 'app_settings', 'spot_subtypes', 'spot_extra_types'))
  union all
  select 'regles RLS (tables)', '36',
    (select count(*)::text from pg_policies where schemaname = 'public')
  union all
  select 'regles RLS (stockage)', '3',
    (select count(*)::text from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname like 'spot_photos_objects_%')
  union all
  select 'types de spots', '5',
    (select count(*)::text from public.spot_types)
  union all
  select 'categories de notation', '16',
    (select count(*)::text from public.rating_categories)
  union all
  select 'sous-categories', '5',
    (select count(*)::text from public.spot_subtypes)
  union all
  select 'rayon de doublons (m)', '100',
    (select value::text from public.app_settings where key = 'duplicate_radius_m')
  union all
  select 'PostGIS installe', 'true',
    (select exists (select 1 from pg_extension where extname = 'postgis')::text)
  union all
  select 'bucket spot-photos public, 2 Mo, JPEG', 'true',
    (select exists (
       select 1 from storage.buckets
       where id = 'spot-photos' and public
         and file_size_limit = 2097152
         and allowed_mime_types = array['image/jpeg'])::text)
  union all
  select 'visiteur non connecte : aucun acces aux spots', 'false',
    (select has_table_privilege('anon', 'public.spots', 'select')::text)
  union all
  select 'utilisateur connecte : lecture des spots', 'true',
    (select has_table_privilege('authenticated', 'public.spots', 'select')::text)
  union all
  select 'type de spot non modifiable', 'false',
    (select has_column_privilege('authenticated', 'public.spots', 'spot_type_id', 'update')::text)
  union all
  select 'un profil par compte', 'true',
    (select ((select count(*) from auth.users) = (select count(*) from public.profiles))::text)
  union all
  select 'admin (au moins un)', 'true',
    (select exists (select 1 from public.profiles where role = 'admin' and is_active)::text)
)
select check_name, expected, actual, (expected = actual) as ok
from checks;
