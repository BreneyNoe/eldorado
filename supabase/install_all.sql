-- =====================================================================
-- INSTALLATION COMPLETE EN UN SEUL COLLER
-- =====================================================================
-- Ce fichier est la simple concatenation des 21 fichiers du dossier
-- supabase/migrations, dans l'ordre, dans UNE seule transaction :
-- soit tout s'installe, soit rien n'est modifie.
--
-- Utilisation : Supabase > SQL Editor > New query > coller > Run.
-- Supabase affiche un avertissement "destructive operation" a cause des
-- lignes "drop ... if exists" : c'est attendu, confirme.
--
-- NE PAS MODIFIER CE FICHIER A LA MAIN : la reference reste le dossier
-- migrations. A executer une seule fois sur une base vide.
-- =====================================================================

begin;

-- >>>>>>>>>> 20261003100000_schema.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 1 / 6 : EXTENSIONS, TABLES, CONTRAINTES, INDEX
-- =====================================================================
-- A executer en premier dans Supabase > SQL Editor.
-- Ce fichier ne contient aucune regle de securite : elles arrivent dans
-- la migration 4. Tant que la migration 4 n'est pas passee, personne ne
-- peut lire ces tables depuis l'application (aucun droit n'est accorde).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
-- PostGIS : calculs geographiques (distance, proximite, zone).
-- pg_trgm : recherche par nom tolerante ("cascad" trouve "Cascade").
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Schema prive
-- ---------------------------------------------------------------------
-- Les fonctions rangees ici ne sont PAS appelables depuis l'API :
-- Supabase n'expose que le schema "public".
create schema if not exists private;

-- ---------------------------------------------------------------------
-- profiles : un profil par compte
-- ---------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null,
  role          text not null default 'user',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint profiles_display_name_length
    check (char_length(btrim(display_name)) between 2 and 40),
  constraint profiles_role_valid
    check (role in ('user', 'admin'))
);

comment on table public.profiles is
  'Profil applicatif. L''email reste dans auth.users et n''est jamais copie ici.';

-- ---------------------------------------------------------------------
-- spot_types : liste controlee des types de spots
-- ---------------------------------------------------------------------
create table public.spot_types (
  id          uuid primary key default gen_random_uuid(),
  key         text not null,
  label       text not null,
  color       text not null,
  icon        text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint spot_types_key_unique unique (key),
  constraint spot_types_key_format check (key ~ '^[a-z][a-z0-9_]{1,30}$'),
  constraint spot_types_label_length check (char_length(btrim(label)) between 1 and 40),
  constraint spot_types_color_format check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint spot_types_icon_length check (char_length(btrim(icon)) between 1 and 40)
);

-- ---------------------------------------------------------------------
-- rating_categories : categories de notation, propres a chaque type
-- ---------------------------------------------------------------------
create table public.rating_categories (
  id            uuid primary key default gen_random_uuid(),
  spot_type_id  uuid not null references public.spot_types (id) on delete restrict,
  key           text not null,
  label         text not null,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint rating_categories_type_key_unique unique (spot_type_id, key),
  constraint rating_categories_key_format check (key ~ '^[a-z][a-z0-9_]{1,30}$'),
  constraint rating_categories_label_length check (char_length(btrim(label)) between 1 and 40)
);

-- ---------------------------------------------------------------------
-- spots
-- ---------------------------------------------------------------------
-- lat / lng sont la reference. "location" est calculee automatiquement
-- par la base a partir de lat / lng : on ne l'ecrit jamais a la main.
create table public.spots (
  id              uuid primary key default gen_random_uuid(),
  spot_type_id    uuid not null references public.spot_types (id) on delete restrict,
  name            text not null,
  description     text,
  lat             double precision not null,
  lng             double precision not null,
  location        extensions.geography(Point, 4326)
                    generated always as (
                      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
                    ) stored,
  address         text,
  address_source  text not null default 'auto',
  visited_on      date,
  created_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  cover_photo_id  uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint spots_name_length check (char_length(btrim(name)) between 2 and 80),
  constraint spots_description_length check (description is null or char_length(description) <= 2000),
  constraint spots_lat_range check (lat between -90 and 90),
  constraint spots_lng_range check (lng between -180 and 180),
  constraint spots_address_length check (address is null or char_length(address) <= 300),
  constraint spots_address_source_valid check (address_source in ('auto', 'manual'))
);

-- ---------------------------------------------------------------------
-- spot_photos
-- ---------------------------------------------------------------------
-- L'application genere l'id de la photo, envoie les deux fichiers dans
-- le stockage, puis cree cette ligne. Les chemins sont imposes par la
-- base pour qu'une ligne ne puisse jamais pointer vers un fichier
-- arbitraire.
create table public.spot_photos (
  id             uuid primary key default gen_random_uuid(),
  spot_id        uuid not null references public.spots (id) on delete cascade,
  uploaded_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  path_standard  text not null,
  path_thumb     text not null,
  width          integer not null,
  height         integer not null,
  size_bytes     integer not null,
  taken_at       timestamptz,
  created_at     timestamptz not null default now(),

  constraint spot_photos_path_standard_unique unique (path_standard),
  constraint spot_photos_path_thumb_unique unique (path_thumb),
  constraint spot_photos_path_standard_format
    check (path_standard = 'spots/' || spot_id::text || '/' || id::text || '_std.jpg'),
  constraint spot_photos_path_thumb_format
    check (path_thumb = 'spots/' || spot_id::text || '/' || id::text || '_thumb.jpg'),
  constraint spot_photos_width_range check (width between 1 and 10000),
  constraint spot_photos_height_range check (height between 1 and 10000),
  constraint spot_photos_size_range check (size_bytes between 1 and 5000000)
);

-- Lien spots -> photo de couverture (ajoute ici car les deux tables se
-- referencent mutuellement).
alter table public.spots
  add constraint spots_cover_photo_fk
  foreign key (cover_photo_id) references public.spot_photos (id) on delete set null;

-- ---------------------------------------------------------------------
-- spot_ratings : une note par (spot, categorie, utilisateur)
-- ---------------------------------------------------------------------
create table public.spot_ratings (
  id           uuid primary key default gen_random_uuid(),
  spot_id      uuid not null references public.spots (id) on delete cascade,
  category_id  uuid not null references public.rating_categories (id) on delete restrict,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  value        smallint not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint spot_ratings_unique_per_user unique (spot_id, category_id, user_id),
  constraint spot_ratings_value_range check (value between 1 and 5)
);

-- ---------------------------------------------------------------------
-- spot_updates : journal chronologique d'un spot
-- ---------------------------------------------------------------------
create table public.spot_updates (
  id          uuid primary key default gen_random_uuid(),
  spot_id     uuid not null references public.spots (id) on delete cascade,
  author_id   uuid default auth.uid() references public.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint spot_updates_body_length check (char_length(btrim(body)) between 1 and 1000)
);

-- ---------------------------------------------------------------------
-- app_settings : parametres globaux modifiables par l'admin
-- ---------------------------------------------------------------------
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid() references public.profiles (id) on delete set null,

  constraint app_settings_key_format check (key ~ '^[a-z][a-z0-9_]{1,50}$')
);

-- ---------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------
-- Recherche geographique : doublons, distance, zone visible.
create index spots_location_gist on public.spots using gist (location);
-- Filtre par type, "mes spots", tri par date.
create index spots_spot_type_id_idx on public.spots (spot_type_id);
create index spots_created_by_idx on public.spots (created_by);
create index spots_created_at_idx on public.spots (created_at desc);
create index spots_cover_photo_id_idx on public.spots (cover_photo_id);
-- Recherche par zone rectangulaire (fonction spots_in_bbox).
create index spots_lat_lng_idx on public.spots (lat, lng);
-- Recherche par nom.
create index spots_name_trgm on public.spots using gin (name extensions.gin_trgm_ops);

create index rating_categories_spot_type_id_idx on public.rating_categories (spot_type_id);

create index spot_photos_spot_created_idx on public.spot_photos (spot_id, created_at);
create index spot_photos_uploaded_by_idx on public.spot_photos (uploaded_by);

create index spot_updates_spot_created_idx on public.spot_updates (spot_id, created_at desc);
create index spot_updates_author_id_idx on public.spot_updates (author_id);

-- L'index unique (spot_id, category_id, user_id) sert deja aux moyennes.
create index spot_ratings_user_id_idx on public.spot_ratings (user_id);
create index spot_ratings_category_id_idx on public.spot_ratings (category_id);

-- >>>>>>>>>> 20261003100100_functions_triggers.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 2 / 6 : FONCTIONS INTERNES ET TRIGGERS
-- =====================================================================
-- Tout ce qui est ici vit dans le schema "private" : rien n'est
-- appelable directement depuis l'application.
--
-- Convention d'erreurs : les messages sont des codes stables
-- (APP_...) que le frontend traduit en francais. Liste :
--   APP_FORBIDDEN_PROFILE_FIELDS  un non-admin touche a role / is_active
--   APP_LAST_ADMIN                on retire le dernier admin actif
--   APP_SPOT_TYPE_INACTIVE        creation d'un spot sur un type desactive
--   APP_COVER_NOT_IN_SPOT         la couverture n'appartient pas au spot
--   APP_RATING_CATEGORY_MISMATCH  la categorie n'est pas celle du type
--   APP_RATING_CATEGORY_INACTIVE  nouvelle note sur une categorie desactivee
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fonctions utilisees par les regles de securite (RLS)
-- ---------------------------------------------------------------------
-- "security definer" : la fonction lit profiles avec les droits de son
-- proprietaire, ce qui evite une boucle (une regle sur profiles qui
-- relirait profiles).
-- "search_path = ''" : bonne pratique de securite, tous les noms sont
-- ecrits avec leur schema.

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
      and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Creation automatique du profil a la creation d'un compte
-- ---------------------------------------------------------------------
-- Nom par defaut : metadonnee "display_name" si elle existe, sinon le
-- debut de l'email. L'utilisateur le modifie ensuite dans "Mon compte".
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := btrim(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  ));
  v_name := btrim(left(v_name, 40));
  if char_length(v_name) < 2 then
    v_name := 'Utilisateur';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Rattrapage : profils des comptes crees avant cette migration.
insert into public.profiles (id, display_name)
select
  u.id,
  case
    when char_length(btrim(left(split_part(coalesce(u.email, ''), '@', 1), 40))) >= 2
      then btrim(left(split_part(u.email, '@', 1), 40))
    else 'Utilisateur'
  end
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Protection du profil
-- ---------------------------------------------------------------------
-- Un utilisateur ne change que son nom. Seul un admin change role et
-- is_active. Il doit toujours rester au moins un admin actif.
-- Depuis le SQL Editor (aucun utilisateur connecte), tout est permis :
-- c'est ce qui permet de designer le premier admin.
create or replace function private.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.display_name := btrim(new.display_name);

  if (select auth.uid()) is null then
    return new;
  end if;

  if not private.is_admin()
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'APP_FORBIDDEN_PROFILE_FIELDS' using errcode = '42501';
  end if;

  if old.role = 'admin' and old.is_active
     and (new.role <> 'admin' or not new.is_active)
     and not exists (
       select 1
       from public.profiles p
       where p.id <> old.id
         and p.role = 'admin'
         and p.is_active
     ) then
    raise exception 'APP_LAST_ADMIN' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger profiles_10_protect
  before update on public.profiles
  for each row execute function private.protect_profile();

create trigger profiles_90_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- spot_types et rating_categories
-- ---------------------------------------------------------------------
create trigger spot_types_90_set_updated_at
  before update on public.spot_types
  for each row execute function private.set_updated_at();

create trigger rating_categories_90_set_updated_at
  before update on public.rating_categories
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- spots : nettoyage des textes et verifications
-- ---------------------------------------------------------------------
create or replace function private.spots_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  new.description := nullif(btrim(new.description), '');
  new.address := nullif(btrim(new.address), '');

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.spot_types t
      where t.id = new.spot_type_id and t.is_active
    ) then
      raise exception 'APP_SPOT_TYPE_INACTIVE' using errcode = 'P0001';
    end if;
    -- Un spot neuf n'a pas encore de photo.
    new.cover_photo_id := null;
  end if;

  if tg_op = 'UPDATE'
     and new.cover_photo_id is not null
     and new.cover_photo_id is distinct from old.cover_photo_id
     and not exists (
       select 1 from public.spot_photos p
       where p.id = new.cover_photo_id and p.spot_id = new.id
     ) then
    raise exception 'APP_COVER_NOT_IN_SPOT' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger spots_10_before_write
  before insert or update on public.spots
  for each row execute function private.spots_before_write();

create trigger spots_90_set_updated_at
  before update on public.spots
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- spot_photos : gestion automatique de la photo de couverture
-- ---------------------------------------------------------------------
-- "security definer" car celui qui ajoute une photo n'est pas forcement
-- le createur du spot, et n'a donc pas le droit de modifier le spot.

create or replace function private.spot_photos_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.spots s
  set cover_photo_id = new.id
  where s.id = new.spot_id
    and s.cover_photo_id is null;
  return null;
end;
$$;

create or replace function private.spot_photos_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Si la photo supprimee etait la couverture, la plus ancienne photo
  -- restante la remplace (ou rien s'il n'en reste aucune).
  update public.spots s
  set cover_photo_id = (
    select p.id
    from public.spot_photos p
    where p.spot_id = old.spot_id
      and p.id <> old.id
    order by p.created_at, p.id
    limit 1
  )
  where s.id = old.spot_id
    and (s.cover_photo_id is null or s.cover_photo_id = old.id);
  return null;
end;
$$;

create trigger spot_photos_cover_after_insert
  after insert on public.spot_photos
  for each row execute function private.spot_photos_after_insert();

create trigger spot_photos_cover_after_delete
  after delete on public.spot_photos
  for each row execute function private.spot_photos_after_delete();

-- ---------------------------------------------------------------------
-- spot_ratings : la categorie doit appartenir au type du spot
-- ---------------------------------------------------------------------
create or replace function private.spot_ratings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category_type uuid;
  v_category_active boolean;
  v_spot_type uuid;
begin
  select c.spot_type_id, c.is_active
    into v_category_type, v_category_active
  from public.rating_categories c
  where c.id = new.category_id;

  select s.spot_type_id
    into v_spot_type
  from public.spots s
  where s.id = new.spot_id;

  -- Spot ou categorie inexistants : on laisse la cle etrangere
  -- produire son erreur habituelle.
  if v_category_type is null or v_spot_type is null then
    return new;
  end if;

  if v_category_type <> v_spot_type then
    raise exception 'APP_RATING_CATEGORY_MISMATCH' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' and not v_category_active then
    raise exception 'APP_RATING_CATEGORY_INACTIVE' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger spot_ratings_10_before_write
  before insert or update on public.spot_ratings
  for each row execute function private.spot_ratings_before_write();

create trigger spot_ratings_90_set_updated_at
  before update on public.spot_ratings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- spot_updates : nettoyage du texte
-- ---------------------------------------------------------------------
create or replace function private.spot_updates_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.body := btrim(new.body);
  return new;
end;
$$;

create trigger spot_updates_10_before_write
  before insert or update on public.spot_updates
  for each row execute function private.spot_updates_before_write();

create trigger spot_updates_90_set_updated_at
  before update on public.spot_updates
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- app_settings : trace de la derniere modification
-- ---------------------------------------------------------------------
create or replace function private.app_settings_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger app_settings_10_before_write
  before insert or update on public.app_settings
  for each row execute function private.app_settings_before_write();

-- >>>>>>>>>> 20261003100200_views_rpc.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 3 / 6 : VUES ET FONCTIONS APPELABLES PAR L'APPLICATION
-- =====================================================================
-- Codes d'erreur supplementaires :
--   APP_INVALID_RATINGS  format de notes invalide
--   APP_ADMIN_ONLY       fonction reservee aux admins
-- =====================================================================

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

-- >>>>>>>>>> 20261003100300_grants_rls.sql >>>>>>>>>>

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

-- >>>>>>>>>> 20261003100400_storage.sql >>>>>>>>>>

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

-- >>>>>>>>>> 20261003100500_seed_reference.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 6 / 6 : DONNEES DE REFERENCE
-- =====================================================================
-- Les 4 types, leurs 13 categories de notation et les parametres
-- globaux. Ce fichier peut etre relance sans creer de doublons.
-- IMPORTANT : ce fichier contient des accents, il doit rester encode
-- en UTF-8 (c'est le reglage par defaut de VS Code).
-- =====================================================================

insert into public.spot_types (key, label, color, icon, sort_order)
values
  ('nature',   'Nature',   '#2F9E44', 'trees',   10),
  ('peche',    'Pêche',    '#E8590C', 'fish',    20),
  ('baignade', 'Baignade', '#1C7ED6', 'waves',   30),
  ('urbex',    'Urbex',    '#7048E8', 'factory', 40)
on conflict (key) do nothing;

insert into public.rating_categories (spot_type_id, key, label, sort_order)
select t.id, c.key, c.label, c.sort_order
from (
  values
    ('nature',   'beaute',            'Beauté',               10),
    ('nature',   'accessibilite',     'Accessibilité',        20),
    ('nature',   'tranquillite',      'Tranquillité',         30),

    ('peche',    'qualite',           'Qualité du spot',      10),
    ('peche',    'quantite_poissons', 'Quantité de poissons', 20),
    ('peche',    'accessibilite',     'Accessibilité',        30),

    ('baignade', 'beaute',            'Beauté',               10),
    ('baignade', 'frequentation',     'Fréquentation',        20),
    ('baignade', 'accessibilite',     'Accessibilité',        30),
    ('baignade', 'cliffjump',         'Cliffjump',            40),

    ('urbex',    'interet',           'Intérêt du lieu',      10),
    ('urbex',    'accessibilite',     'Accessibilité',        20),
    ('urbex',    'ambiance',          'Ambiance',             30)
) as c (type_key, key, label, sort_order)
join public.spot_types t on t.key = c.type_key
on conflict (spot_type_id, key) do nothing;

-- Rayon de detection des doublons, en metres.
insert into public.app_settings (key, value)
values ('duplicate_radius_m', '100'::jsonb)
on conflict (key) do nothing;

-- >>>>>>>>>> 20261004120000_ride_type.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 7 : CINQUIEME TYPE DE SPOT, "SPOT DE RIDE"
-- =====================================================================
-- Ajoute le type "Spot de ride" et ses trois categories de notation :
-- Originalite, Difficulte, Faisabilite.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance : rien n'est cree en double.
-- (Une installation neuve avec install_all.sql le contient deja.)
--
-- Les libelles, l'ordre et les categories pourront ensuite etre modifies
-- depuis l'ecran d'administration, sans nouvelle migration.
-- IMPORTANT : ce fichier contient des accents, il doit rester en UTF-8.
-- =====================================================================

insert into public.spot_types (key, label, color, icon, sort_order)
values ('ride', 'Spot de ride', '#D6336C', 'scooter', 50)
on conflict (key) do nothing;

insert into public.rating_categories (spot_type_id, key, label, sort_order)
select t.id, c.key, c.label, c.sort_order
from (
  values
    ('originalite', 'Originalité', 10),
    ('difficulte',  'Difficulté',  20),
    ('faisabilite', 'Faisabilité', 30)
) as c (key, label, sort_order)
join public.spot_types t on t.key = 'ride'
on conflict (spot_type_id, key) do nothing;

-- >>>>>>>>>> 20261005100000_spot_subtypes.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 8 : SOUS-CATEGORIES DE SPOTS
-- =====================================================================
-- 1. Le type "Spot de ride" est renomme "Ride".
-- 2. Nouvelle table spot_subtypes : des sous-categories propres a un type.
--    Les quatre premieres concernent le type Ride : Gaps, Ledges et curbs,
--    Plans inclines, Rails.
-- 3. Chaque spot peut porter une sous-categorie (colonne spots.subtype_id),
--    qui doit appartenir a son type.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. (Une installation neuve avec install_all.sql le contient deja.)
--
-- Les icones sont des noms Iconify (https://icon-sets.iconify.design) :
-- "collection:nom".
-- Nouveau code d'erreur : APP_SUBTYPE_MISMATCH (la sous-categorie n'est pas
-- celle du type du spot).
-- IMPORTANT : ce fichier contient des accents, il doit rester en UTF-8.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Renommage
-- ---------------------------------------------------------------------
update public.spot_types set label = 'Ride' where key = 'ride';

-- ---------------------------------------------------------------------
-- 2. Table des sous-categories
-- ---------------------------------------------------------------------
create table public.spot_subtypes (
  id            uuid primary key default gen_random_uuid(),
  spot_type_id  uuid not null references public.spot_types (id) on delete restrict,
  key           text not null,
  label         text not null,
  icon          text not null,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint spot_subtypes_type_key_unique unique (spot_type_id, key),
  constraint spot_subtypes_key_format check (key ~ '^[a-z][a-z0-9_]{1,30}$'),
  constraint spot_subtypes_label_length check (char_length(btrim(label)) between 1 and 40),
  constraint spot_subtypes_icon_length check (char_length(btrim(icon)) between 1 and 80)
);

create index spot_subtypes_spot_type_id_idx on public.spot_subtypes (spot_type_id);

create trigger spot_subtypes_90_set_updated_at
  before update on public.spot_subtypes
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Sous-categorie d'un spot
-- ---------------------------------------------------------------------
-- Facultative en base : les spots existants n'en ont pas. Si la
-- sous-categorie est supprimee un jour, le spot la perd sans disparaitre.
alter table public.spots
  add column subtype_id uuid references public.spot_subtypes (id) on delete set null;

create index spots_subtype_id_idx on public.spots (subtype_id);

-- Meme fonction qu'avant (migration 2), avec en plus la verification que
-- la sous-categorie appartient bien au type du spot.
create or replace function private.spots_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  new.description := nullif(btrim(new.description), '');
  new.address := nullif(btrim(new.address), '');

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.spot_types t
      where t.id = new.spot_type_id and t.is_active
    ) then
      raise exception 'APP_SPOT_TYPE_INACTIVE' using errcode = 'P0001';
    end if;
    -- Un spot neuf n'a pas encore de photo.
    new.cover_photo_id := null;
  end if;

  if tg_op = 'UPDATE'
     and new.cover_photo_id is not null
     and new.cover_photo_id is distinct from old.cover_photo_id
     and not exists (
       select 1 from public.spot_photos p
       where p.id = new.cover_photo_id and p.spot_id = new.id
     ) then
    raise exception 'APP_COVER_NOT_IN_SPOT' using errcode = 'P0001';
  end if;

  if new.subtype_id is not null
     and (tg_op = 'INSERT' or new.subtype_id is distinct from old.subtype_id)
     and not exists (
       select 1 from public.spot_subtypes st
       where st.id = new.subtype_id and st.spot_type_id = new.spot_type_id
     ) then
    raise exception 'APP_SUBTYPE_MISMATCH' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Vue legere : la sous-categorie y figure (pour le marqueur de la carte)
-- ---------------------------------------------------------------------
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
  p.path_thumb as cover_thumb_path,
  s.subtype_id
from public.spots s
left join public.spot_photos p on p.id = s.cover_photo_id;

-- ---------------------------------------------------------------------
-- 5. create_spot accepte une sous-categorie
-- ---------------------------------------------------------------------
-- L'ancienne version est retiree : deux fonctions de meme nom rendraient
-- l'appel ambigu pour l'API.
drop function public.create_spot(uuid, text, double precision, double precision, text, text, text, date, jsonb);

create function public.create_spot(
  p_spot_type_id uuid,
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_description text default null,
  p_address text default null,
  p_address_source text default 'auto',
  p_visited_on date default null,
  p_ratings jsonb default '{}'::jsonb,
  p_subtype_id uuid default null
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
    spot_type_id, name, description, lat, lng, address, address_source, visited_on, subtype_id
  )
  values (
    p_spot_type_id, p_name, p_description, p_lat, p_lng, p_address,
    coalesce(p_address_source, 'auto'), p_visited_on, p_subtype_id
  )
  returning id into v_spot_id;

  perform public.set_spot_ratings(v_spot_id, coalesce(p_ratings, '{}'::jsonb));

  return v_spot_id;
end;
$$;

revoke all on function public.create_spot(uuid, text, double precision, double precision, text, text, text, date, jsonb, uuid)
  from public, anon;
grant execute on function public.create_spot(uuid, text, double precision, double precision, text, text, text, date, jsonb, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 6. Droits et regles de securite
-- ---------------------------------------------------------------------
revoke all on public.spot_subtypes from public, anon, authenticated;
grant select, insert, update, delete on public.spot_subtypes to authenticated, service_role;

-- La sous-categorie d'un spot se choisit a la creation et se modifie ensuite
-- (par son createur ou un admin : memes regles que le reste du spot).
grant insert (subtype_id) on public.spots to authenticated;
grant update (subtype_id) on public.spots to authenticated;

alter table public.spot_subtypes enable row level security;

create policy spot_subtypes_select on public.spot_subtypes
  for select to authenticated
  using ((select private.is_active_user()));

create policy spot_subtypes_insert on public.spot_subtypes
  for insert to authenticated
  with check ((select private.is_admin()));

create policy spot_subtypes_update on public.spot_subtypes
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy spot_subtypes_delete on public.spot_subtypes
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- 7. Les quatre sous-categories du type Ride
-- ---------------------------------------------------------------------
insert into public.spot_subtypes (spot_type_id, key, label, icon, sort_order)
select t.id, s.key, s.label, s.icon, s.sort_order
from (
  values
    ('gaps',           'Gaps',            'lucide-lab:stairs-arrow-down-left',        10),
    ('ledges_curbs',   'Ledges et curbs', 'pinhead:lowered-curb',                     20),
    ('plans_inclines', 'Plans inclinés',  'pinhead:flush-curb',                       30),
    ('rails',          'Rails',           'material-symbols-light:escalator-outline', 40)
) as s (key, label, icon, sort_order)
join public.spot_types t on t.key = 'ride'
on conflict (spot_type_id, key) do nothing;

-- >>>>>>>>>> 20261005110000_goofy_subtype.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 9 : SOUS-CATEGORIE "GOOFY" POUR LE TYPE RIDE
-- =====================================================================
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance : rien n'est cree en double.
-- =====================================================================

insert into public.spot_subtypes (spot_type_id, key, label, icon, sort_order)
select t.id, 'goofy', 'Goofy', 'fluent-emoji-high-contrast:zany-face', 50
from public.spot_types t
where t.key = 'ride'
on conflict (spot_type_id, key) do nothing;

-- >>>>>>>>>> 20261005120000_type_icons.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 10 : NOUVELLES ICONES DE TROIS TYPES
-- =====================================================================
-- Peche    : game-icons:fishing
-- Baignade : boxicons:swimming
-- Ride     : spots:ride (icone dessinee pour l'application, embarquee
--            dans son code : elle n'existe pas chez Iconify)
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

update public.spot_types set icon = 'game-icons:fishing' where key = 'peche';
update public.spot_types set icon = 'boxicons:swimming'  where key = 'baignade';
update public.spot_types set icon = 'spots:ride'         where key = 'ride';

-- >>>>>>>>>> 20261006100000_photo_limit_urbex_icon.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 11 : LIMITE DE PHOTOS PAR SPOT, NOUVELLE ICONE URBEX
-- =====================================================================
-- 1. Un spot ne peut plus recevoir plus de 10 photos. Le nombre est un
--    reglage (app_settings, cle max_photos_per_spot) : il se modifie dans
--    l'administration, onglet Reglages.
--    Les spots qui depassent deja la limite gardent leurs photos ; ils ne
--    peuvent simplement plus en recevoir.
-- 2. Le type Urbex prend l'icone game-icons:castle-ruins.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- Nouveau code d'erreur : APP_PHOTO_LIMIT.
-- =====================================================================

insert into public.app_settings (key, value)
values ('max_photos_per_spot', '10'::jsonb)
on conflict (key) do nothing;

create or replace function private.spot_photos_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max   integer;
  v_count integer;
begin
  select case when jsonb_typeof(s.value) = 'number' then (s.value #>> '{}')::numeric::integer end
    into v_max
  from public.app_settings s
  where s.key = 'max_photos_per_spot';

  -- Reglage absent ou illisible : on retombe sur 10.
  v_max := coalesce(v_max, 10);

  select count(*) into v_count
  from public.spot_photos p
  where p.spot_id = new.spot_id;

  if v_count >= v_max then
    raise exception 'APP_PHOTO_LIMIT' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.spot_photos_enforce_limit() from public, anon, authenticated;

drop trigger if exists spot_photos_enforce_limit on public.spot_photos;
create trigger spot_photos_enforce_limit
  before insert on public.spot_photos
  for each row execute function private.spot_photos_enforce_limit();

update public.spot_types set icon = 'game-icons:castle-ruins' where key = 'urbex';

-- >>>>>>>>>> 20261007100000_ping.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 12 : FONCTION "PING"
-- =====================================================================
-- Une fonction sans effet, qui repond simplement "true". Elle sert a la
-- tache planifiee de GitHub (.github/workflows/keep-supabase-awake.yml) :
-- en l'appelant tous les trois jours, elle evite la mise en pause du
-- projet Supabase gratuit.
--
-- Elle est appelable sans etre connecte : elle ne lit aucune table et ne
-- revele rien.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

create or replace function public.ping()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated, service_role;

-- >>>>>>>>>> 20261008100000_half_stars_signup.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 13 : DEMI-ETOILES, INSCRIPTION AVEC VALIDATION
-- =====================================================================
-- 1. Les notes acceptent les demi-etoiles : 0,5 - 1 - 1,5 ... 5.
--    Les notes existantes sont conservees telles quelles.
-- 2. Un nouveau compte demarre "en attente" (is_active = false) : il ne
--    voit rien tant qu'un administrateur ne l'a pas active dans
--    l'application (Administration > Utilisateurs).
--    C'est ce qui permet d'ouvrir l'inscription sans que n'importe qui
--    puisse lire les spots. Les comptes existants ne sont pas modifies.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee.
-- IMPORTANT : ce fichier contient des accents, il doit rester en UTF-8.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Demi-etoiles
-- ---------------------------------------------------------------------
-- La vue des moyennes lit la colonne dont on change le type : elle est
-- supprimee puis recreee a l'identique.
drop view public.spot_rating_summary;

alter table public.spot_ratings drop constraint spot_ratings_value_range;

alter table public.spot_ratings
  alter column value type numeric(2, 1) using value::numeric(2, 1);

alter table public.spot_ratings
  add constraint spot_ratings_value_range
  check (value between 0.5 and 5 and value * 2 = trunc(value * 2));

create view public.spot_rating_summary
with (security_invoker = true)
as
select
  r.spot_id,
  r.category_id,
  round(avg(r.value), 1) as average,
  count(*)::integer as votes
from public.spot_ratings r
group by r.spot_id, r.category_id;

revoke all on public.spot_rating_summary from public, anon, authenticated;
grant select on public.spot_rating_summary to authenticated, service_role;

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
      -- De 0,5 a 5, par pas de 0,5.
      if v_number < 0.5 or v_number > 5 or v_number * 2 <> trunc(v_number * 2) then
        raise exception 'APP_INVALID_RATINGS' using errcode = '22023';
      end if;

      insert into public.spot_ratings (spot_id, category_id, value)
      values (p_spot_id, v_category_id, v_number::numeric(2, 1))
      on conflict (spot_id, category_id, user_id)
      do update set value = excluded.value;

    else
      raise exception 'APP_INVALID_RATINGS' using errcode = '22023';
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Inscription : un nouveau compte est en attente d'activation
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  -- Nom choisi a l'inscription, sinon debut de l'adresse e-mail.
  v_name := btrim(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  ));
  v_name := btrim(left(v_name, 40));
  if char_length(v_name) < 2 then
    v_name := 'Utilisateur';
  end if;

  -- is_active = false : le compte existe, mais ne donne acces a rien tant
  -- qu'un administrateur ne l'a pas active.
  insert into public.profiles (id, display_name, is_active)
  values (new.id, v_name, false)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- >>>>>>>>>> 20261009100000_open_signup.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 14 : INSCRIPTION LIBRE
-- =====================================================================
-- Un nouveau compte est actif des sa creation : plus besoin qu'un
-- administrateur l'active. L'administrateur garde la main apres coup :
-- il peut bannir un compte dans l'application (Administration >
-- Utilisateurs), ce qui lui retire tout acces.
--
-- Remplace le comportement de la migration 13 (compte en attente).
-- Les comptes restes en attente depuis ne sont pas modifies : ils
-- apparaissent comme bannis, et se retablissent d'un toucher.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  -- Nom choisi a l'inscription, sinon debut de l'adresse e-mail.
  v_name := btrim(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  ));
  v_name := btrim(left(v_name, 40));
  if char_length(v_name) < 2 then
    v_name := 'Utilisateur';
  end if;

  -- Le role et l'activation ne viennent jamais de ce que l'inscription
  -- envoie : toujours simple membre, toujours actif.
  insert into public.profiles (id, display_name, role, is_active)
  values (new.id, v_name, 'user', true)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- >>>>>>>>>> 20261010100000_multi_types.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 15 : PLUSIEURS TYPES PAR SPOT
-- =====================================================================
-- Un spot garde son type principal (spots.spot_type_id), qui donne sa
-- couleur et son icone sur la carte et ne se modifie pas. Il peut
-- desormais recevoir des types supplementaires : un spot de peche qui
-- est aussi un lieu d'urbex, une riviere ou l'on ride, etc.
--
-- Consequences :
--   - le spot se note sur les categories de tous ses types ;
--   - sa sous-categorie peut appartenir a n'importe lequel de ses types ;
--   - la vue legere expose la liste de ses types supplementaires, pour
--     les filtres de la carte et des listes.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee.
-- Nouveau code d'erreur : APP_EXTRA_TYPE_IS_MAIN.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table des types supplementaires
-- ---------------------------------------------------------------------
create table public.spot_extra_types (
  spot_id       uuid not null references public.spots (id) on delete cascade,
  spot_type_id  uuid not null references public.spot_types (id) on delete restrict,
  created_at    timestamptz not null default now(),
  primary key (spot_id, spot_type_id)
);

create index spot_extra_types_spot_type_id_idx on public.spot_extra_types (spot_type_id);

create or replace function private.spot_extra_types_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Le type principal n'a pas a etre repete parmi les supplementaires.
  if exists (
    select 1 from public.spots s
    where s.id = new.spot_id and s.spot_type_id = new.spot_type_id
  ) then
    raise exception 'APP_EXTRA_TYPE_IS_MAIN' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.spot_types t
    where t.id = new.spot_type_id and t.is_active
  ) then
    raise exception 'APP_SPOT_TYPE_INACTIVE' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger spot_extra_types_10_before_insert
  before insert on public.spot_extra_types
  for each row execute function private.spot_extra_types_before_insert();

-- Quand un type supplementaire est retire, la sous-categorie du spot est
-- effacee si elle lui appartenait.
create or replace function private.spot_extra_types_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.spots s
  set subtype_id = null
  where s.id = old.spot_id
    and s.subtype_id is not null
    and exists (
      select 1 from public.spot_subtypes st
      where st.id = s.subtype_id and st.spot_type_id = old.spot_type_id
    );
  return old;
end;
$$;

create trigger spot_extra_types_20_after_delete
  after delete on public.spot_extra_types
  for each row execute function private.spot_extra_types_after_delete();

revoke all on function private.spot_extra_types_before_insert() from public, anon, authenticated;
revoke all on function private.spot_extra_types_after_delete() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. La sous-categorie peut appartenir a n'importe quel type du spot
-- ---------------------------------------------------------------------
create or replace function private.spots_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  new.description := nullif(btrim(new.description), '');
  new.address := nullif(btrim(new.address), '');

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.spot_types t
      where t.id = new.spot_type_id and t.is_active
    ) then
      raise exception 'APP_SPOT_TYPE_INACTIVE' using errcode = 'P0001';
    end if;
    -- Un spot neuf n'a pas encore de photo.
    new.cover_photo_id := null;
  end if;

  if tg_op = 'UPDATE'
     and new.cover_photo_id is not null
     and new.cover_photo_id is distinct from old.cover_photo_id
     and not exists (
       select 1 from public.spot_photos p
       where p.id = new.cover_photo_id and p.spot_id = new.id
     ) then
    raise exception 'APP_COVER_NOT_IN_SPOT' using errcode = 'P0001';
  end if;

  if new.subtype_id is not null
     and (tg_op = 'INSERT' or new.subtype_id is distinct from old.subtype_id)
     and not exists (
       select 1 from public.spot_subtypes st
       where st.id = new.subtype_id
         and (
           st.spot_type_id = new.spot_type_id
           or exists (
             select 1 from public.spot_extra_types e
             where e.spot_id = new.id and e.spot_type_id = st.spot_type_id
           )
         )
     ) then
    raise exception 'APP_SUBTYPE_MISMATCH' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Les notes portent sur les categories de tous les types du spot
-- ---------------------------------------------------------------------
create or replace function private.spot_ratings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category_type uuid;
  v_category_active boolean;
  v_spot_type uuid;
begin
  select c.spot_type_id, c.is_active
    into v_category_type, v_category_active
  from public.rating_categories c
  where c.id = new.category_id;

  select s.spot_type_id
    into v_spot_type
  from public.spots s
  where s.id = new.spot_id;

  -- Spot ou categorie inexistants : on laisse la cle etrangere
  -- produire son erreur habituelle.
  if v_category_type is null or v_spot_type is null then
    return new;
  end if;

  if v_category_type <> v_spot_type
     and not exists (
       select 1 from public.spot_extra_types e
       where e.spot_id = new.spot_id and e.spot_type_id = v_category_type
     ) then
    raise exception 'APP_RATING_CATEGORY_MISMATCH' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' and not v_category_active then
    raise exception 'APP_RATING_CATEGORY_INACTIVE' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Vue legere : les types supplementaires y figurent
-- ---------------------------------------------------------------------
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
  p.path_thumb as cover_thumb_path,
  s.subtype_id,
  coalesce(
    (
      select array_agg(e.spot_type_id order by e.created_at, e.spot_type_id)
      from public.spot_extra_types e
      where e.spot_id = s.id
    ),
    '{}'::uuid[]
  ) as extra_type_ids
from public.spots s
left join public.spot_photos p on p.id = s.cover_photo_id;

-- ---------------------------------------------------------------------
-- 5. Droits et regles de securite
-- ---------------------------------------------------------------------
revoke all on public.spot_extra_types from public, anon, authenticated;
grant select, insert, delete on public.spot_extra_types to authenticated;
grant all on public.spot_extra_types to service_role;

alter table public.spot_extra_types enable row level security;

create policy spot_extra_types_select on public.spot_extra_types
  for select to authenticated
  using ((select private.is_active_user()));

-- Ajouter ou retirer un type : comme modifier le spot (son createur, ou un admin).
create policy spot_extra_types_insert on public.spot_extra_types
  for insert to authenticated
  with check (
    (select private.is_admin())
    or (
      (select private.is_active_user())
      and exists (
        select 1 from public.spots s
        where s.id = spot_id and s.created_by = (select auth.uid())
      )
    )
  );

create policy spot_extra_types_delete on public.spot_extra_types
  for delete to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.is_active_user())
      and exists (
        select 1 from public.spots s
        where s.id = spot_id and s.created_by = (select auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------
-- 6. Fonctions appelees par l'application
-- ---------------------------------------------------------------------
-- Remplace la liste des types supplementaires d'un spot, en une fois.
create or replace function public.set_spot_extra_types(
  p_spot_id uuid,
  p_type_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_wanted uuid[] := coalesce(p_type_ids, '{}'::uuid[]);
begin
  -- Sans ce controle, un utilisateur sans droit verrait sa demande ignoree
  -- en silence (les regles RLS ne suppriment simplement rien).
  if not exists (
    select 1 from public.spots s
    where s.id = p_spot_id
      and (s.created_by = (select auth.uid()) or (select private.is_admin()))
  ) then
    raise exception 'permission denied for spot' using errcode = '42501';
  end if;

  delete from public.spot_extra_types e
  where e.spot_id = p_spot_id
    and e.spot_type_id <> all (v_wanted);

  insert into public.spot_extra_types (spot_id, spot_type_id)
  select distinct p_spot_id, t.id
  from unnest(v_wanted) as t (id)
  where t.id <> (select s.spot_type_id from public.spots s where s.id = p_spot_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.set_spot_extra_types(uuid, uuid[]) from public, anon;
grant execute on function public.set_spot_extra_types(uuid, uuid[]) to authenticated, service_role;

-- create_spot accepte les types supplementaires. L'ancienne version est
-- retiree : deux fonctions de meme nom rendraient l'appel ambigu.
drop function public.create_spot(uuid, text, double precision, double precision, text, text, text, date, jsonb, uuid);

create function public.create_spot(
  p_spot_type_id uuid,
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_description text default null,
  p_address text default null,
  p_address_source text default 'auto',
  p_visited_on date default null,
  p_ratings jsonb default '{}'::jsonb,
  p_subtype_id uuid default null,
  p_extra_type_ids uuid[] default '{}'::uuid[]
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

  insert into public.spot_extra_types (spot_id, spot_type_id)
  select distinct v_spot_id, t.id
  from unnest(coalesce(p_extra_type_ids, '{}'::uuid[])) as t (id)
  where t.id <> p_spot_type_id;

  -- La sous-categorie est posee apres les types : elle peut appartenir a
  -- l'un des types supplementaires.
  if p_subtype_id is not null then
    update public.spots set subtype_id = p_subtype_id where id = v_spot_id;
  end if;

  perform public.set_spot_ratings(v_spot_id, coalesce(p_ratings, '{}'::jsonb));

  return v_spot_id;
end;
$$;

revoke all on function public.create_spot(uuid, text, double precision, double precision, text, text, text, date, jsonb, uuid, uuid[])
  from public, anon;
grant execute on function public.create_spot(uuid, text, double precision, double precision, text, text, text, date, jsonb, uuid, uuid[])
  to authenticated, service_role;

-- >>>>>>>>>> 20261011100000_avatars.sql >>>>>>>>>>

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

-- >>>>>>>>>> 20261012100000_avatar_color_ranks.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 17 : COULEUR DE L'AVATAR, RANGS SELON LES SPOTS PUBLIES
-- =====================================================================
-- 1. profiles.avatar_color : couleur de fond choisie par l'utilisateur
--    pour son icone (ou son initiale). Format #RRGGBB.
-- 2. profiles.spot_count : nombre de spots publies par l'utilisateur.
--    L'application en deduit l'ornement qui entoure son avatar
--    (5, 15, 30 puis 50 spots).
--    Ce compteur est tenu a jour par la base a chaque creation ou
--    suppression de spot. Personne ne peut le modifier a la main : il
--    ne fait pas partie des colonnes que l'application a le droit
--    d'ecrire.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

alter table public.profiles
  add column if not exists avatar_color text,
  add column if not exists spot_count integer not null default 0;

alter table public.profiles drop constraint if exists profiles_avatar_color_format;
alter table public.profiles
  add constraint profiles_avatar_color_format
  check (avatar_color is null or avatar_color ~ '^#[0-9a-fA-F]{6}$');

alter table public.profiles drop constraint if exists profiles_spot_count_positive;
alter table public.profiles
  add constraint profiles_spot_count_positive check (spot_count >= 0);

-- La couleur se choisit ; le compteur, non (aucun droit d'ecriture dessus).
grant update (avatar_color) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- Compteur de spots publies
-- ---------------------------------------------------------------------
create or replace function private.spots_count_for_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set spot_count = spot_count + 1 where id = new.created_by;

  elsif tg_op = 'DELETE' then
    update public.profiles set spot_count = greatest(spot_count - 1, 0) where id = old.created_by;

  elsif new.created_by is distinct from old.created_by then
    -- Le createur change (son compte est supprime, par exemple).
    update public.profiles set spot_count = greatest(spot_count - 1, 0) where id = old.created_by;
    update public.profiles set spot_count = spot_count + 1 where id = new.created_by;
  end if;

  return null;
end;
$$;

revoke all on function private.spots_count_for_creator() from public, anon, authenticated;

drop trigger if exists spots_95_count_for_creator on public.spots;
create trigger spots_95_count_for_creator
  after insert or delete or update of created_by on public.spots
  for each row execute function private.spots_count_for_creator();

-- Mise a niveau : le compte exact pour les spots deja publies.
update public.profiles p
set spot_count = c.total
from (
  select pr.id, count(s.id)::integer as total
  from public.profiles pr
  left join public.spots s on s.created_by = pr.id
  group by pr.id
) c
where c.id = p.id and p.spot_count is distinct from c.total;

-- >>>>>>>>>> 20261013100000_rank_seen.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 18 : DERNIER RANG ANNONCE A L'UTILISATEUR
-- =====================================================================
-- profiles.rank_seen : seuil du dernier rang dont l'application a deja
-- felicite l'utilisateur (0, 5, 15, 30, 50 ou 80). Tant que son rang
-- reel le depasse, l'application lui affiche une annonce, une seule
-- fois, quel que soit l'appareil.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

alter table public.profiles
  add column if not exists rank_seen integer not null default 0;

alter table public.profiles drop constraint if exists profiles_rank_seen_range;
alter table public.profiles
  add constraint profiles_rank_seen_range check (rank_seen between 0 and 100000);

-- Chacun note pour lui-meme l'annonce qu'il a vue. Cette valeur ne donne
-- aucun droit et ne change pas le rang, qui depend du seul compteur de spots.
grant update (rank_seen) on public.profiles to authenticated;

-- >>>>>>>>>> 20261014100000_user_stats.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 19 : STATISTIQUES D'UN UTILISATEUR
-- =====================================================================
-- Fonction lue par la page de profil d'un utilisateur : nombre de spots
-- publies, de photos ajoutees et d'updates publies.
--
-- Elle s'execute avec les droits de l'appelant : un compte banni ou non
-- connecte n'obtient que des zeros, comme partout ailleurs.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

create or replace function public.user_stats(p_user_id uuid)
returns table (
  spot_count integer,
  photo_count integer,
  update_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*)::integer from public.spots s where s.created_by = p_user_id),
    (select count(*)::integer from public.spot_photos p where p.uploaded_by = p_user_id),
    (select count(*)::integer from public.spot_updates u where u.author_id = p_user_id);
$$;

revoke all on function public.user_stats(uuid) from public, anon;
grant execute on function public.user_stats(uuid) to authenticated, service_role;

-- >>>>>>>>>> 20261015100000_rails_icon_curbs.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 20 : ICONE DES RAILS, SOUS-CATEGORIE "CURBS"
-- =====================================================================
-- 1. La sous-categorie "Rails" prend l'icone spots:rail (une rampe,
--    dessinee pour l'application et embarquee dans son code).
-- 2. "Ledges et curbs" est renommee "Curbs". Sa cle technique ne change
--    pas : les spots qui l'utilisent ne sont pas touches.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

update public.spot_subtypes set icon = 'spots:rail' where key = 'rails';
update public.spot_subtypes set label = 'Curbs' where key = 'ledges_curbs';

-- >>>>>>>>>> 20261016100000_swap_curb_icons.sql >>>>>>>>>>

-- =====================================================================
-- MIGRATION 21 : ICONES DE "CURBS" ET "PLANS INCLINES" INTERVERTIES
-- =====================================================================
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance : chaque icone est fixee par
-- son nom, et non echangee.
-- =====================================================================

update public.spot_subtypes set icon = 'pinhead:flush-curb'   where key = 'ledges_curbs';
update public.spot_subtypes set icon = 'pinhead:lowered-curb' where key = 'plans_inclines';

commit;
