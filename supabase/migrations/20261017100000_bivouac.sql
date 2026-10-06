-- =====================================================================
-- MIGRATION 22 : OPTION "BIVOUAC" DU TYPE NATURE
-- =====================================================================
-- 1. Une sous-categorie peut avoir des precisions : "Bivouac" se precise
--    en "Tente" ou "Hamac". Techniquement, une sous-categorie peut
--    designer sa sous-categorie parente (colonne parent_id), sur un seul
--    niveau.
-- 2. Un type peut rendre sa sous-categorie facultative (colonne
--    subtype_optional). C'est le cas de Nature : le bivouac est une
--    option que l'on coche, pas une obligation. Ride reste obligatoire.
-- 3. Trois sous-categories pour Nature : Bivouac, et ses precisions
--    Tente et Hamac.
--
-- Un spot continue de porter une seule sous-categorie : "Bivouac", ou
-- plus precisement "Tente" ou "Hamac".
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- Nouveau code d'erreur : APP_SUBTYPE_PARENT_INVALID.
-- =====================================================================

begin;

alter table public.spot_types
  add column if not exists subtype_optional boolean not null default false;

alter table public.spot_subtypes
  add column if not exists parent_id uuid references public.spot_subtypes (id) on delete restrict;

create index if not exists spot_subtypes_parent_id_idx on public.spot_subtypes (parent_id);

-- Une precision appartient au meme type que sa sous-categorie, et celle-ci
-- n'est pas elle-meme une precision (un seul niveau).
create or replace function private.spot_subtypes_check_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_id is not null and (
    new.parent_id = new.id
    or not exists (
      select 1 from public.spot_subtypes p
      where p.id = new.parent_id
        and p.spot_type_id = new.spot_type_id
        and p.parent_id is null
    )
  ) then
    raise exception 'APP_SUBTYPE_PARENT_INVALID' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function private.spot_subtypes_check_parent() from public, anon, authenticated;

drop trigger if exists spot_subtypes_05_check_parent on public.spot_subtypes;
create trigger spot_subtypes_05_check_parent
  before insert or update of parent_id, spot_type_id on public.spot_subtypes
  for each row execute function private.spot_subtypes_check_parent();

update public.spot_types set subtype_optional = true where key = 'nature';

insert into public.spot_subtypes (spot_type_id, key, label, icon, sort_order)
select t.id, 'bivouac', 'Bivouac', 'game-icons:forest-camp', 10
from public.spot_types t
where t.key = 'nature'
on conflict (spot_type_id, key) do nothing;

insert into public.spot_subtypes (spot_type_id, key, label, icon, sort_order, parent_id)
select p.spot_type_id, v.key, v.label, v.icon, v.sort_order, p.id
from public.spot_subtypes p
join public.spot_types t on t.id = p.spot_type_id and t.key = 'nature'
cross join (
  values
    ('bivouac_tente', 'Tente', 'fluent-emoji-high-contrast:tent', 10),
    ('bivouac_hamac', 'Hamac', 'iconmind:hammock-outline-thin', 20)
) as v (key, label, icon, sort_order)
where p.key = 'bivouac'
on conflict (spot_type_id, key) do nothing;

commit;
