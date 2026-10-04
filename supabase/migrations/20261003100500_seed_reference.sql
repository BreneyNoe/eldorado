-- =====================================================================
-- MIGRATION 6 / 6 : DONNEES DE REFERENCE
-- =====================================================================
-- Les 4 types, leurs 13 categories de notation et les parametres
-- globaux. Ce fichier peut etre relance sans creer de doublons.
-- IMPORTANT : ce fichier contient des accents, il doit rester encode
-- en UTF-8 (c'est le reglage par defaut de VS Code).
-- =====================================================================

begin;

insert into public.spot_types (key, label, color, icon, sort_order)
values
  ('nature',   'Nature',   '#2F9E44', 'trees',   10),
  ('peche',    'Pêche',    '#E8590C', 'fish',    20),
  ('baignade', 'Baignade', '#1C7ED6', 'waves',   30),
  ('urbex',    'Urbex',    '#7048E8', 'factory', 40)
on conflict (key) do nothing;

insert into public.rating_categories (spot_type_id, key, label, sort_order)
select t.id, c.key, c.label, c.sort_order
from (
  values
    ('nature',   'beaute',            'Beauté',               10),
    ('nature',   'accessibilite',     'Accessibilité',        20),
    ('nature',   'tranquillite',      'Tranquillité',         30),

    ('peche',    'qualite',           'Qualité du spot',      10),
    ('peche',    'quantite_poissons', 'Quantité de poissons', 20),
    ('peche',    'accessibilite',     'Accessibilité',        30),

    ('baignade', 'beaute',            'Beauté',               10),
    ('baignade', 'frequentation',     'Fréquentation',        20),
    ('baignade', 'accessibilite',     'Accessibilité',        30),
    ('baignade', 'cliffjump',         'Cliffjump',            40),

    ('urbex',    'interet',           'Intérêt du lieu',      10),
    ('urbex',    'accessibilite',     'Accessibilité',        20),
    ('urbex',    'ambiance',          'Ambiance',             30)
) as c (type_key, key, label, sort_order)
join public.spot_types t on t.key = c.type_key
on conflict (spot_type_id, key) do nothing;

-- Rayon de detection des doublons, en metres.
insert into public.app_settings (key, value)
values ('duplicate_radius_m', '100'::jsonb)
on conflict (key) do nothing;

commit;
