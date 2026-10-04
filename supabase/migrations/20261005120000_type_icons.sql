-- =====================================================================
-- MIGRATION 10 : NOUVELLES ICONES DE TROIS TYPES
-- =====================================================================
-- Peche    : game-icons:fishing
-- Baignade : boxicons:swimming
-- Ride     : spots:ride (icone dessinee pour l'application, embarquee
--            dans son code : elle n'existe pas chez Iconify)
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

begin;

update public.spot_types set icon = 'game-icons:fishing' where key = 'peche';
update public.spot_types set icon = 'boxicons:swimming'  where key = 'baignade';
update public.spot_types set icon = 'spots:ride'         where key = 'ride';

commit;
