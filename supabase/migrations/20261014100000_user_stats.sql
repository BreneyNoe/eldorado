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

begin;

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

commit;
