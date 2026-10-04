-- =====================================================================
-- DONNEES DE DEMONSTRATION
-- =====================================================================
-- Cree 30 spots fictifs repartis en France, avec quelques notes et
-- updates, pour essayer la carte, les regroupements et les filtres.
-- Les lieux existent, mais tout le contenu est invente.
--
-- A executer dans Supabase > SQL Editor. Sans danger pour le reste :
-- chaque spot cree ici porte la mention [demo] a la fin de sa
-- description, ce qui permet de tout retirer ensuite avec le fichier
-- remove_demo_spots.sql.
--
-- Prerequis : au moins un administrateur (les spots lui sont attribues).
-- Relancer ce fichier ne cree pas de doublons.
-- IMPORTANT : ce fichier contient des accents, il doit rester en UTF-8.
-- =====================================================================

do $$
declare
  v_admin uuid;
  v_spot record;
  v_spot_id uuid;
  v_category record;
  v_created integer := 0;
begin
  select p.id into v_admin
  from public.profiles p
  where p.role = 'admin' and p.is_active
  order by p.created_at
  limit 1;

  if v_admin is null then
    raise exception 'Aucun administrateur : execute d''abord admin/make_first_admin.sql';
  end if;

  for v_spot in
    select *
    from (
      values
        -- Trois groupes serres, pour voir les regroupements se former.
        ('nature',   'Cascade du Ray-Pic',            44.8009,  4.2530, 'Péreyres, Ardèche',                  'Chute spectaculaire sur des orgues basaltiques. Dix minutes de marche depuis le parking.'),
        ('baignade', 'Pont du Diable',                44.6762,  4.2921, 'Thueyts, Ardèche',                   'Vasques profondes sous le pont. Eau fraîche même en août.'),
        ('nature',   'Chaussée des Géants',           44.6731,  4.2985, 'Thueyts, Ardèche',                   'Coulée basaltique le long de la rivière.'),
        ('peche',    'Lac d''Issarlès',               44.8197,  4.0717, 'Le Lac-d''Issarlès, Ardèche',        'Lac de cratère très profond. Truites et ombles.'),
        ('urbex',    'Ancien moulinage',              44.6405,  4.2550, 'Vallée de la Lignon, Ardèche',       'Atelier textile à l''abandon. Planchers fragiles à l''étage.'),
        ('baignade', 'Pont d''Arc',                   44.3822,  4.4160, 'Vallon-Pont-d''Arc, Ardèche',        'Plage de galets sous l''arche. Beaucoup de monde en été.'),
        ('nature',   'Belvédère de la Madeleine',     44.3338,  4.4955, 'Gorges de l''Ardèche',               'Le plus beau point de vue sur les gorges.'),

        ('baignade', 'Lac de Sainte-Croix',           43.7690,  6.1920, 'Sainte-Croix-du-Verdon',             'Eau turquoise, plages de galets.'),
        ('nature',   'Point Sublime',                 43.7930,  6.3975, 'Rougon, Verdon',                     'Vue plongeante sur l''entrée du grand canyon.'),
        ('baignade', 'Pont du Galetas',               43.7965,  6.2535, 'Aiguines, Verdon',                   'Entrée des gorges, sauts possibles depuis les rochers.'),
        ('peche',    'Lac de Castillon',              43.8850,  6.5320, 'Castellane',                         'Grand lac de retenue, carnassiers.'),

        ('nature',   'Lac Blanc',                     45.9817,  6.8895, 'Chamonix-Mont-Blanc',                'Face au massif du Mont-Blanc. Deux heures de montée.'),
        ('nature',   'Cascade du Rouget',             46.0298,  6.7620, 'Sixt-Fer-à-Cheval',                  'La reine des Alpes, visible depuis la route.'),
        ('baignade', 'Lac d''Annecy, plage d''Angon', 45.8170,  6.2180, 'Talloires',                          'Petite plage ombragée, eau très claire.'),
        ('peche',    'Lac de Montriond',              46.2125,  6.7230, 'Montriond, Haute-Savoie',            'Lac d''altitude, pêche à la truite.'),

        -- Le reste est disperse.
        ('nature',   'Cirque de Gavarnie',            42.6950, -0.0100, 'Gavarnie, Hautes-Pyrénées',          'Amphithéâtre de falaises et grande cascade.'),
        ('peche',    'Lac de Gaube',                  42.8330, -0.1410, 'Cauterets',                          'Lac de montagne, une heure de marche.'),
        ('nature',   'Dune du Pilat',                 44.5890, -1.2130, 'La Teste-de-Buch, Gironde',          'La plus haute dune d''Europe. Coucher de soleil superbe.'),
        ('baignade', 'Plage du Petit Nice',           44.5580, -1.2400, 'La Teste-de-Buch, Gironde',          'Grande plage océane au pied de la dune.'),
        ('urbex',    'Base sous-marine',              44.8690, -0.5590, 'Bordeaux',                           'Bunker de la Seconde Guerre mondiale, partie extérieure libre d''accès.'),
        ('nature',   'Pointe du Raz',                 48.0400, -4.7400, 'Plogoff, Finistère',                 'Le bout du monde par grand vent.'),
        ('peche',    'Lac de Guerlédan',              48.2050, -3.0500, 'Mûr-de-Bretagne',                    'Brochets et sandres. Mise à l''eau facile.'),
        ('urbex',    'Sanatorium abandonné',          48.4380, -3.9700, 'Monts d''Arrée, Finistère',          'Grand bâtiment vide au milieu de la lande.'),
        ('baignade', 'Plage de l''Île Vierge',        48.2400, -4.4500, 'Crozon, Finistère',                  'Crique sous la falaise. Accès raide.'),
        ('nature',   'Falaises d''Étretat',           49.7070,  0.1950, 'Étretat, Seine-Maritime',            'L''Aiguille et la porte d''Aval.'),
        ('urbex',    'Fort oublié',                   49.1950,  6.1500, 'Environs de Metz',                   'Ouvrage militaire recouvert par la forêt.'),
        ('peche',    'Étang de la Dombes',            46.0000,  5.0300, 'Villars-les-Dombes, Ain',            'Carpes et brochets, à la journée.'),
        ('baignade', 'Calanque d''En-Vau',            43.2020,  5.4990, 'Cassis',                             'Deux heures de marche aller-retour. Eau limpide.'),
        ('urbex',    'Usine du bord de l''eau',       45.7400,  4.8150, 'Lyon',                               'Halle industrielle en friche.'),
        ('nature',   'Puy Mary',                      45.1090,  2.6760, 'Cantal',                             'Sommet volcanique, panorama à 360 degrés.')
    ) as demo (type_key, name, lat, lng, address, description)
  loop
    -- Deja cree lors d'un lancement precedent : on passe.
    if exists (
      select 1 from public.spots s
      where s.name = v_spot.name and s.description like '%[demo]'
    ) then
      continue;
    end if;

    insert into public.spots (
      spot_type_id, name, description, lat, lng, address, address_source, visited_on, created_by
    )
    select t.id, v_spot.name, v_spot.description || ' [demo]', v_spot.lat, v_spot.lng,
           v_spot.address, 'manual', current_date - (30 + v_created * 9), v_admin
    from public.spot_types t
    where t.key = v_spot.type_key
    returning id into v_spot_id;

    if v_spot_id is null then
      raise notice 'Type introuvable pour "%", spot ignore.', v_spot.name;
      continue;
    end if;

    -- Une note de l'administrateur sur chaque categorie du type.
    for v_category in
      select c.id, row_number() over (order by c.sort_order) as position
      from public.rating_categories c
      join public.spot_types t on t.id = c.spot_type_id
      where t.key = v_spot.type_key and c.is_active
    loop
      insert into public.spot_ratings (spot_id, category_id, user_id, value)
      values (v_spot_id, v_category.id, v_admin, 3 + ((v_created + v_category.position) % 3));
    end loop;

    -- Deux updates sur un spot sur trois.
    if v_created % 3 = 0 then
      insert into public.spot_updates (spot_id, author_id, body, created_at)
      values
        (v_spot_id, v_admin, 'Accès dégagé, parking presque vide en semaine.', now() - interval '20 days'),
        (v_spot_id, v_admin, 'Sentier boueux après la pluie, prévoir de bonnes chaussures.', now() - interval '5 days');
    end if;

    v_created := v_created + 1;
    v_spot_id := null;
  end loop;

  raise notice '% spots de demonstration crees.', v_created;
end;
$$;

select count(*) as spots_de_demonstration
from public.spots
where description like '%[demo]';
