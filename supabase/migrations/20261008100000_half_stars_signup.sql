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

begin;

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

commit;
