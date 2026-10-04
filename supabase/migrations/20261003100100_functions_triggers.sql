-- =====================================================================
-- MIGRATION 2 / 6 : FONCTIONS INTERNES ET TRIGGERS
-- =====================================================================
-- Tout ce qui est ici vit dans le schema "private" : rien n'est
-- appelable directement depuis l'application.
--
-- Convention d'erreurs : les messages sont des codes stables
-- (APP_...) que le frontend traduit en francais. Liste :
--   APP_FORBIDDEN_PROFILE_FIELDS  un non-admin touche a role / is_active
--   APP_LAST_ADMIN                on retire le dernier admin actif
--   APP_SPOT_TYPE_INACTIVE        creation d'un spot sur un type desactive
--   APP_COVER_NOT_IN_SPOT         la couverture n'appartient pas au spot
--   APP_RATING_CATEGORY_MISMATCH  la categorie n'est pas celle du type
--   APP_RATING_CATEGORY_INACTIVE  nouvelle note sur une categorie desactivee
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Fonctions utilisees par les regles de securite (RLS)
-- ---------------------------------------------------------------------
-- "security definer" : la fonction lit profiles avec les droits de son
-- proprietaire, ce qui evite une boucle (une regle sur profiles qui
-- relirait profiles).
-- "search_path = ''" : bonne pratique de securite, tous les noms sont
-- ecrits avec leur schema.

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
      and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Creation automatique du profil a la creation d'un compte
-- ---------------------------------------------------------------------
-- Nom par defaut : metadonnee "display_name" si elle existe, sinon le
-- debut de l'email. L'utilisateur le modifie ensuite dans "Mon compte".
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := btrim(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  ));
  v_name := btrim(left(v_name, 40));
  if char_length(v_name) < 2 then
    v_name := 'Utilisateur';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Rattrapage : profils des comptes crees avant cette migration.
insert into public.profiles (id, display_name)
select
  u.id,
  case
    when char_length(btrim(left(split_part(coalesce(u.email, ''), '@', 1), 40))) >= 2
      then btrim(left(split_part(u.email, '@', 1), 40))
    else 'Utilisateur'
  end
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Protection du profil
-- ---------------------------------------------------------------------
-- Un utilisateur ne change que son nom. Seul un admin change role et
-- is_active. Il doit toujours rester au moins un admin actif.
-- Depuis le SQL Editor (aucun utilisateur connecte), tout est permis :
-- c'est ce qui permet de designer le premier admin.
create or replace function private.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.display_name := btrim(new.display_name);

  if (select auth.uid()) is null then
    return new;
  end if;

  if not private.is_admin()
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'APP_FORBIDDEN_PROFILE_FIELDS' using errcode = '42501';
  end if;

  if old.role = 'admin' and old.is_active
     and (new.role <> 'admin' or not new.is_active)
     and not exists (
       select 1
       from public.profiles p
       where p.id <> old.id
         and p.role = 'admin'
         and p.is_active
     ) then
    raise exception 'APP_LAST_ADMIN' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger profiles_10_protect
  before update on public.profiles
  for each row execute function private.protect_profile();

create trigger profiles_90_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- spot_types et rating_categories
-- ---------------------------------------------------------------------
create trigger spot_types_90_set_updated_at
  before update on public.spot_types
  for each row execute function private.set_updated_at();

create trigger rating_categories_90_set_updated_at
  before update on public.rating_categories
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- spots : nettoyage des textes et verifications
-- ---------------------------------------------------------------------
create or replace function private.spots_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  new.description := nullif(btrim(new.description), '');
  new.address := nullif(btrim(new.address), '');

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.spot_types t
      where t.id = new.spot_type_id and t.is_active
    ) then
      raise exception 'APP_SPOT_TYPE_INACTIVE' using errcode = 'P0001';
    end if;
    -- Un spot neuf n'a pas encore de photo.
    new.cover_photo_id := null;
  end if;

  if tg_op = 'UPDATE'
     and new.cover_photo_id is not null
     and new.cover_photo_id is distinct from old.cover_photo_id
     and not exists (
       select 1 from public.spot_photos p
       where p.id = new.cover_photo_id and p.spot_id = new.id
     ) then
    raise exception 'APP_COVER_NOT_IN_SPOT' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger spots_10_before_write
  before insert or update on public.spots
  for each row execute function private.spots_before_write();

create trigger spots_90_set_updated_at
  before update on public.spots
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- spot_photos : gestion automatique de la photo de couverture
-- ---------------------------------------------------------------------
-- "security definer" car celui qui ajoute une photo n'est pas forcement
-- le createur du spot, et n'a donc pas le droit de modifier le spot.

create or replace function private.spot_photos_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.spots s
  set cover_photo_id = new.id
  where s.id = new.spot_id
    and s.cover_photo_id is null;
  return null;
end;
$$;

create or replace function private.spot_photos_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Si la photo supprimee etait la couverture, la plus ancienne photo
  -- restante la remplace (ou rien s'il n'en reste aucune).
  update public.spots s
  set cover_photo_id = (
    select p.id
    from public.spot_photos p
    where p.spot_id = old.spot_id
      and p.id <> old.id
    order by p.created_at, p.id
    limit 1
  )
  where s.id = old.spot_id
    and (s.cover_photo_id is null or s.cover_photo_id = old.id);
  return null;
end;
$$;

create trigger spot_photos_cover_after_insert
  after insert on public.spot_photos
  for each row execute function private.spot_photos_after_insert();

create trigger spot_photos_cover_after_delete
  after delete on public.spot_photos
  for each row execute function private.spot_photos_after_delete();

-- ---------------------------------------------------------------------
-- spot_ratings : la categorie doit appartenir au type du spot
-- ---------------------------------------------------------------------
create or replace function private.spot_ratings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category_type uuid;
  v_category_active boolean;
  v_spot_type uuid;
begin
  select c.spot_type_id, c.is_active
    into v_category_type, v_category_active
  from public.rating_categories c
  where c.id = new.category_id;

  select s.spot_type_id
    into v_spot_type
  from public.spots s
  where s.id = new.spot_id;

  -- Spot ou categorie inexistants : on laisse la cle etrangere
  -- produire son erreur habituelle.
  if v_category_type is null or v_spot_type is null then
    return new;
  end if;

  if v_category_type <> v_spot_type then
    raise exception 'APP_RATING_CATEGORY_MISMATCH' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' and not v_category_active then
    raise exception 'APP_RATING_CATEGORY_INACTIVE' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger spot_ratings_10_before_write
  before insert or update on public.spot_ratings
  for each row execute function private.spot_ratings_before_write();

create trigger spot_ratings_90_set_updated_at
  before update on public.spot_ratings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- spot_updates : nettoyage du texte
-- ---------------------------------------------------------------------
create or replace function private.spot_updates_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.body := btrim(new.body);
  return new;
end;
$$;

create trigger spot_updates_10_before_write
  before insert or update on public.spot_updates
  for each row execute function private.spot_updates_before_write();

create trigger spot_updates_90_set_updated_at
  before update on public.spot_updates
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- app_settings : trace de la derniere modification
-- ---------------------------------------------------------------------
create or replace function private.app_settings_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger app_settings_10_before_write
  before insert or update on public.app_settings
  for each row execute function private.app_settings_before_write();

commit;
