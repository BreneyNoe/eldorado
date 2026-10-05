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

begin;

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

commit;
