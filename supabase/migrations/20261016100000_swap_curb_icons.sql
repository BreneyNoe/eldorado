-- =====================================================================
-- MIGRATION 21 : ICONES DE "CURBS" ET "PLANS INCLINES" INTERVERTIES
-- =====================================================================
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance : chaque icone est fixee par
-- son nom, et non echangee.
-- =====================================================================

begin;

update public.spot_subtypes set icon = 'pinhead:flush-curb'   where key = 'ledges_curbs';
update public.spot_subtypes set icon = 'pinhead:lowered-curb' where key = 'plans_inclines';

commit;
