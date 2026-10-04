-- =====================================================================
-- DONNER UN NOUVEAU MOT DE PASSE A UN UTILISATEUR
-- =====================================================================
-- Pour un mot de passe oublie : le projet n'envoie aucun email, c'est
-- donc l'administrateur qui remet un mot de passe provisoire.
--
-- 1. Remplace l'email et le mot de passe provisoire ci-dessous
--    (8 caracteres au minimum).
-- 2. Execute dans Supabase > SQL Editor.
--    Le resultat doit afficher une ligne avec l'email concerne.
--    Aucune ligne = l'email ne correspond a aucun compte.
-- 3. Transmets le mot de passe provisoire a la personne, qui le change
--    aussitot dans l'application : Mon compte > Mot de passe.
--
-- IMPORTANT : n'enregistre pas ce fichier avec un vrai mot de passe
-- dedans, et ne l'envoie jamais sur GitHub ainsi rempli.
-- =====================================================================

update auth.users
set encrypted_password = extensions.crypt('MotDePasseProvisoire', extensions.gen_salt('bf')),
    updated_at = now()
where email = 'personne@exemple.com'
returning email, updated_at;
