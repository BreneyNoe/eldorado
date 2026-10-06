-- =====================================================================
-- MIGRATION 20 : ICONE DES RAILS, SOUS-CATEGORIE "CURBS"
-- =====================================================================
-- 1. La sous-categorie "Rails" prend l'icone spots:rail (une rampe,
--    dessinee pour l'application et embarquee dans son code).
-- 2. "Ledges et curbs" est renommee "Curbs". Sa cle technique ne change
--    pas : les spots qui l'utilisent ne sont pas touches.
--
-- A executer une fois dans Supabase > SQL Editor sur une base deja
-- installee. Sans danger si on le relance.
-- =====================================================================

begin;

update public.spot_subtypes set icon = 'spots:rail' where key = 'rails';
update public.spot_subtypes set label = 'Curbs' where key = 'ledges_curbs';

commit;
