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

begin;

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

commit;
