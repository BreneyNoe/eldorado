-- =====================================================================
-- MIGRATION 9 : SOUS-CATEGORIE "GOOFY" POUR LE TYPE RIDE
-- =====================================================================
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance : rien n'est cree en double.
-- =====================================================================

begin;

insert into public.spot_subtypes (spot_type_id, key, label, icon, sort_order)
select t.id, 'goofy', 'Goofy', 'fluent-emoji-high-contrast:zany-face', 50
from public.spot_types t
where t.key = 'ride'
on conflict (spot_type_id, key) do nothing;

commit;
