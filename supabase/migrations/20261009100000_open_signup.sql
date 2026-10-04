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

begin;

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

commit;
