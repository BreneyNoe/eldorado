-- =====================================================================
-- DESIGNER LE PREMIER ADMINISTRATEUR
-- =====================================================================
-- A executer UNE fois dans Supabase > SQL Editor, apres avoir cree ton
-- compte dans Authentication > Users.
--
-- 1. Remplace l'email ci-dessous par le tien (deux endroits).
-- 2. Execute. Le resultat doit afficher une ligne avec role = admin.
--    Aucune ligne affichee = l'email ne correspond a aucun compte.
--
-- Les admins suivants se nomment depuis l'ecran d'administration de
-- l'application, sans repasser par ce fichier.
-- =====================================================================

update public.profiles
set role = 'admin', is_active = true
where id = (select u.id from auth.users u where u.email = 'ton.email@exemple.com');

select p.id, u.email, p.display_name, p.role, p.is_active
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'ton.email@exemple.com';
