-- =====================================================================
-- MIGRATION 7 : CINQUIEME TYPE DE SPOT, "SPOT DE RIDE"
-- =====================================================================
-- Ajoute le type "Spot de ride" et ses trois categories de notation :
-- Originalite, Difficulte, Faisabilite.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance : rien n'est cree en double.
-- (Une installation neuve avec install_all.sql le contient deja.)
--
-- Les libelles, l'ordre et les categories pourront ensuite etre modifies
-- depuis l'ecran d'administration, sans nouvelle migration.
-- IMPORTANT : ce fichier contient des accents, il doit rester en UTF-8.
-- =====================================================================

begin;

insert into public.spot_types (key, label, color, icon, sort_order)
values ('ride', 'Spot de ride', '#D6336C', 'scooter', 50)
on conflict (key) do nothing;

insert into public.rating_categories (spot_type_id, key, label, sort_order)
select t.id, c.key, c.label, c.sort_order
from (
  values
    ('originalite', 'Originalité', 10),
    ('difficulte',  'Difficulté',  20),
    ('faisabilite', 'Faisabilité', 30)
) as c (key, label, sort_order)
join public.spot_types t on t.key = 'ride'
on conflict (spot_type_id, key) do nothing;

commit;
