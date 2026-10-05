-- =====================================================================
-- MIGRATION 18 : DERNIER RANG ANNONCE A L'UTILISATEUR
-- =====================================================================
-- profiles.rank_seen : seuil du dernier rang dont l'application a deja
-- felicite l'utilisateur (0, 5, 15, 30, 50 ou 80). Tant que son rang
-- reel le depasse, l'application lui affiche une annonce, une seule
-- fois, quel que soit l'appareil.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

begin;

alter table public.profiles
  add column if not exists rank_seen integer not null default 0;

alter table public.profiles drop constraint if exists profiles_rank_seen_range;
alter table public.profiles
  add constraint profiles_rank_seen_range check (rank_seen between 0 and 100000);

-- Chacun note pour lui-meme l'annonce qu'il a vue. Cette valeur ne donne
-- aucun droit et ne change pas le rang, qui depend du seul compteur de spots.
grant update (rank_seen) on public.profiles to authenticated;

commit;
