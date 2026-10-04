-- =====================================================================
-- RETIRER LES DONNEES DE DEMONSTRATION
-- =====================================================================
-- Supprime uniquement les spots crees par demo_spots.sql (ceux dont la
-- description se termine par [demo]), avec leurs notes et updates.
-- Les vrais spots ne sont pas touches.
--
-- Si tu as ajoute des photos a un spot de demonstration depuis
-- l'application, leurs fichiers restent dans le stockage : l'outil
-- d'administration (etape 14) permettra de les retirer.
-- =====================================================================

delete from public.spots
where description like '%[demo]'
returning name;
