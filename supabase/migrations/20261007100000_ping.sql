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

begin;

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

commit;
