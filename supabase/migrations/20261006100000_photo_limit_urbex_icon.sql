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

begin;

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

commit;
