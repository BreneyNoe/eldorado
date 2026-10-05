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

begin;

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

commit;
