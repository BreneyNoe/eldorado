-- =====================================================================
-- MIGRATION 3 / 6 : VUES ET FONCTIONS APPELABLES PAR L'APPLICATION
-- =====================================================================
-- Codes d'erreur supplementaires :
--   APP_INVALID_RATINGS  format de notes invalide
--   APP_ADMIN_ONLY       fonction reservee aux admins
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Lecture d'un parametre entier dans app_settings
-- ---------------------------------------------------------------------
create or replace function private.setting_int(p_key text, p_default integer)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_value jsonb;
begin
  select s.value into v_value
  from public.app_settings s
  where s.key = p_key;

  if v_value is null or jsonb_typeof(v_value) <> 'number' then
    return p_default;
  end if;

  return round((v_value #>> '{}')::numeric)::integer;
end;
$$;

-- ---------------------------------------------------------------------
-- Vue legere : ce que chargent la carte et la liste
-- ---------------------------------------------------------------------
-- "security_invoker" : la vue applique les regles de securite des
-- tables a celui qui la lit (et non celles du proprietaire de la vue).
create or replace view public.spots_light
with (security_invoker = true)
as
select
  s.id,
  s.spot_type_id,
  s.name,
  s.lat,
  s.lng,
  s.address,
  s.created_by,
  s.created_at,
  s.updated_at,
  p.path_thumb as cover_thumb_path
from public.spots s
left join public.spot_photos p on p.id = s.cover_photo_id;

-- ---------------------------------------------------------------------
-- Vue des moyennes par categorie (aucune note globale)
-- ---------------------------------------------------------------------
create or replace view public.spot_rating_summary
with (security_invoker = true)
as
select
  r.spot_id,
  r.category_id,
  round(avg(r.value), 1) as average,
  count(*)::integer as votes
from public.spot_ratings r
group by r.spot_id, r.category_id;

-- ---------------------------------------------------------------------
-- nearby_spots : spots dans un rayon (detection de doublons)
-- ---------------------------------------------------------------------
-- p_radius_m absent  -> rayon lu dans app_settings (duplicate_radius_m).
-- Le rayon est borne entre 1 m et 5 000 m, 20 resultats au maximum.
-- p_exclude_spot_id  -> utile en modification, pour ignorer le spot
--                       qu'on est en train de deplacer.
create or replace function public.nearby_spots(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default null,
  p_exclude_spot_id uuid default null
)
returns table (
  id uuid,
  spot_type_id uuid,
  name text,
  lat double precision,
  lng double precision,
  address text,
  cover_thumb_path text,
  distance_m double precision
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_origin extensions.geography;
  v_radius double precision;
begin
  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    return;
  end if;

  v_origin := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  v_radius := least(
    greatest(coalesce(p_radius_m, private.setting_int('duplicate_radius_m', 100)), 1),
    5000
  );

  return query
  select
    s.id,
    s.spot_type_id,
    s.name,
    s.lat,
    s.lng,
    s.address,
    ph.path_thumb,
    extensions.st_distance(s.location, v_origin)
  from public.spots s
  left join public.spot_photos ph on ph.id = s.cover_photo_id
  where extensions.st_dwithin(s.location, v_origin, v_radius)
    and (p_exclude_spot_id is null or s.id <> p_exclude_spot_id)
  order by extensions.st_distance(s.location, v_origin)
  limit 20;
end;
$$;

-- ---------------------------------------------------------------------
-- spots_in_bbox : spots d'une zone rectangulaire
-- ---------------------------------------------------------------------
-- Non utilisee au depart (le MVP charge la liste legere complete).
-- Elle est prete pour le jour ou il y aura trop de spots.
-- Gere une zone a cheval sur l'antimeridien (min_lng > max_lng).
create or replace function public.spots_in_bbox(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_type_ids uuid[] default null,
  p_limit integer default 1000
)
returns setof public.spots_light
language sql
stable
security invoker
set search_path = ''
as $$
  select v.*
  from public.spots_light v
  where v.lat between p_min_lat and p_max_lat
    and (
      (p_min_lng <= p_max_lng and v.lng between p_min_lng and p_max_lng)
      or (p_min_lng > p_max_lng and (v.lng >= p_min_lng or v.lng <= p_max_lng))
    )
    and (p_type_ids is null or v.spot_type_id = any (p_type_ids))
  order by v.created_at desc
  limit least(greatest(coalesce(p_limit, 1000), 1), 5000);
$$;

-- ---------------------------------------------------------------------
-- set_spot_ratings : enregistre MES notes sur un spot
-- ---------------------------------------------------------------------
-- p_ratings est un objet JSON { "<id de categorie>": note }.
--   note de 1 a 5 -> cree ou remplace ma note
--   null          -> supprime ma note sur cette categorie
-- Les categories absentes de l'objet ne sont pas touchees.
-- Les notes des autres utilisateurs ne sont jamais modifiees.
create or replace function public.set_spot_ratings(
  p_spot_id uuid,
  p_ratings jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
  v_category_id uuid;
  v_number numeric;
begin
  if p_ratings is null or jsonb_typeof(p_ratings) <> 'object' then
    raise exception 'APP_INVALID_RATINGS' using errcode = '22023';
  end if;

  for v_key, v_value in select e.key, e.value from jsonb_each(p_ratings) as e
  loop
    begin
      v_category_id := v_key::uuid;
    exception when invalid_text_representation then
      raise exception 'APP_INVALID_RATINGS' using errcode = '22023';
    end;

    if jsonb_typeof(v_value) = 'null' then
      delete from public.spot_ratings r
      where r.spot_id = p_spot_id
        and r.category_id = v_category_id
        and r.user_id = (select auth.uid());

    elsif jsonb_typeof(v_value) = 'number' then
      v_number := (v_value #>> '{}')::numeric;
      if v_number not in (1, 2, 3, 4, 5) then
        raise exception 'APP_INVALID_RATINGS' using errcode = '22023';
      end if;

      insert into public.spot_ratings (spot_id, category_id, value)
      values (p_spot_id, v_category_id, v_number::smallint)
      on conflict (spot_id, category_id, user_id)
      do update set value = excluded.value;

    else
      raise exception 'APP_INVALID_RATINGS' using errcode = '22023';
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- create_spot : cree un spot et mes notes en une seule transaction
-- ---------------------------------------------------------------------
-- Renvoie l'id du nouveau spot. Si une note est invalide, rien n'est
-- cree. Les photos sont envoyees ensuite par l'application.
create or replace function public.create_spot(
  p_spot_type_id uuid,
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_description text default null,
  p_address text default null,
  p_address_source text default 'auto',
  p_visited_on date default null,
  p_ratings jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_spot_id uuid;
begin
  insert into public.spots (
    spot_type_id, name, description, lat, lng, address, address_source, visited_on
  )
  values (
    p_spot_type_id, p_name, p_description, p_lat, p_lng, p_address,
    coalesce(p_address_source, 'auto'), p_visited_on
  )
  returning id into v_spot_id;

  perform public.set_spot_ratings(v_spot_id, coalesce(p_ratings, '{}'::jsonb));

  return v_spot_id;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_list_users : liste des comptes avec email (admins uniquement)
-- ---------------------------------------------------------------------
-- "security definer" car l'email vit dans auth.users, inaccessible
-- autrement. La fonction verifie elle-meme que l'appelant est admin.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  is_active boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'APP_ADMIN_ONLY' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    p.is_active,
    p.created_at,
    u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_storage_report : jauge de stockage (admins uniquement)
-- ---------------------------------------------------------------------
-- file_*  : ce qui est reellement dans le bucket (fichiers).
-- photo_* : ce que la base connait (lignes de spot_photos).
-- Un ecart entre les deux signale des fichiers orphelins.
create or replace function public.admin_storage_report()
returns table (
  file_count bigint,
  file_bytes bigint,
  photo_count bigint,
  photo_bytes bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'APP_ADMIN_ONLY' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from storage.objects o where o.bucket_id = 'spot-photos'),
    (select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
       from storage.objects o where o.bucket_id = 'spot-photos'),
    (select count(*) from public.spot_photos),
    (select coalesce(sum(ph.size_bytes), 0)::bigint from public.spot_photos ph);
end;
$$;

-- ---------------------------------------------------------------------
-- admin_orphan_files : fichiers sans ligne en base (admins uniquement)
-- ---------------------------------------------------------------------
-- Ignore les fichiers recents (envoi peut-etre en cours).
-- La suppression se fait ensuite par l'application, via l'API de
-- stockage : cette fonction ne supprime rien.
create or replace function public.admin_orphan_files(
  p_min_age_minutes integer default 60
)
returns table (
  name text,
  size_bytes bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'APP_ADMIN_ONLY' using errcode = '42501';
  end if;

  return query
  select
    o.name,
    coalesce((o.metadata ->> 'size')::bigint, 0),
    o.created_at
  from storage.objects o
  where o.bucket_id = 'spot-photos'
    and o.created_at <= now() - make_interval(mins => greatest(coalesce(p_min_age_minutes, 60), 0))
    and not exists (
      select 1
      from public.spot_photos ph
      where ph.path_standard = o.name or ph.path_thumb = o.name
    )
  order by o.created_at
  limit 500;
end;
$$;

commit;
