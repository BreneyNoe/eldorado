-- =====================================================================
-- MIGRATION 1 / 6 : EXTENSIONS, TABLES, CONTRAINTES, INDEX
-- =====================================================================
-- A executer en premier dans Supabase > SQL Editor.
-- Ce fichier ne contient aucune regle de securite : elles arrivent dans
-- la migration 4. Tant que la migration 4 n'est pas passee, personne ne
-- peut lire ces tables depuis l'application (aucun droit n'est accorde).
-- =====================================================================

begin;

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

commit;
