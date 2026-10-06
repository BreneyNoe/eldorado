#!/usr/bin/env node
// =====================================================================
// SAUVEGARDE
// =====================================================================
// Copie sur cet ordinateur tout ce qui fait l'application :
//   - le contenu de chaque table (spots, notes, updates, profils...) ;
//   - la liste des comptes (identifiant et e-mail, jamais les mots de passe) ;
//   - les photos des spots et les photos de profil.
//
// Usage :  npm run backup
//
// Le script ne modifie rien dans Supabase : il ne fait que lire.
//
// Il a besoin de la cle SECRETE du projet (elle seule lit tout, y compris
// les notes de chacun). Elle se range dans le fichier ".env.backup.local",
// jamais envoye sur GitHub. Voir docs/sauvegarde.md.
// =====================================================================

import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const ROOT = path.resolve(import.meta.dirname, '..')
const BACKUPS = path.join(ROOT, 'backups')

// Tables a copier, avec la colonne qui donne un ordre stable pour lire page par page.
const TABLES = [
  ['profiles', 'id'],
  ['spot_types', 'id'],
  ['rating_categories', 'id'],
  ['spot_subtypes', 'id'],
  ['app_settings', 'key'],
  ['spots', 'id'],
  ['spot_extra_types', 'spot_id,spot_type_id'],
  ['spot_photos', 'id'],
  ['spot_ratings', 'id'],
  ['spot_updates', 'id'],
]
const PAGE = 1000

/** Lit un fichier de configuration "CLE=valeur", s'il existe. */
async function readEnvFile(name) {
  const file = path.join(ROOT, name)
  if (!existsSync(file)) return {}
  const values = {}
  for (const line of (await readFile(file, 'utf8')).split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (match && !line.trimStart().startsWith('#')) values[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return values
}

function fail(message) {
  console.error(`\nSauvegarde impossible : ${message}\n`)
  process.exit(1)
}

const local = { ...(await readEnvFile('.env.local')), ...(await readEnvFile('.env.backup.local')) }
const url = (process.env.SUPABASE_URL || local.SUPABASE_URL || local.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const key = process.env.SUPABASE_SECRET_KEY || local.SUPABASE_SECRET_KEY || ''

if (!url) fail("l'adresse du projet est introuvable (VITE_SUPABASE_URL dans .env.local).")
if (!key) fail('la cle secrete est introuvable. Cree le fichier .env.backup.local (voir docs/sauvegarde.md).')
if (key.startsWith('sb_publishable_')) {
  fail('la cle fournie est la cle publique. Il faut la cle secrete (elle commence par "sb_secret_").')
}

const headers = { apikey: key, Authorization: `Bearer ${key}` }

async function getJson(pathAndQuery, extraHeaders = {}) {
  const response = await fetch(`${url}${pathAndQuery}`, { headers: { ...headers, ...extraHeaders } })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    throw new Error(`${response.status} sur ${pathAndQuery.split('?')[0]} : ${detail}`)
  }
  return { data: await response.json(), range: response.headers.get('content-range') }
}

/** Toutes les lignes d'une table, lues page par page, avec le total annonce par la base. */
async function readTable(table, order) {
  const rows = []
  let announced = null
  for (let offset = 0; ; offset += PAGE) {
    const { data, range } = await getJson(`/rest/v1/${table}?select=*&order=${order}&limit=${PAGE}&offset=${offset}`, {
      Prefer: 'count=exact',
    })
    rows.push(...data)
    const total = range?.split('/')[1]
    if (total && total !== '*') announced = Number(total)
    if (data.length < PAGE) break
  }
  return { rows, announced }
}

/** Comptes : identifiant, e-mail et dates. Les mots de passe ne sont pas lisibles, meme avec la cle secrete. */
async function readAccounts() {
  const accounts = []
  for (let page = 1; ; page += 1) {
    const { data } = await getJson(`/auth/v1/admin/users?page=${page}&per_page=200`)
    const users = Array.isArray(data) ? data : (data.users ?? [])
    accounts.push(
      ...users.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
      })),
    )
    if (users.length < 200) break
  }
  return accounts
}

/**
 * Copie un fichier du stockage, sauf s'il est deja la : un fichier ne change
 * jamais (son nom est unique), ce qui rend les sauvegardes suivantes rapides.
 */
async function copyFile(bucket, name) {
  const target = path.join(BACKUPS, 'fichiers', bucket, ...name.split('/'))
  if (existsSync(target) && (await stat(target)).size > 0) return 'deja'
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${name.split('/').map(encodeURIComponent).join('/')}`, { headers })
  if (!response.ok) return 'manquant'
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, Buffer.from(await response.arrayBuffer()))
  return 'copie'
}

/** Traite une liste par petits groupes, pour ne pas ouvrir des centaines de connexions a la fois. */
async function inBatches(items, size, work) {
  const results = []
  for (let index = 0; index < items.length; index += size) {
    results.push(...(await Promise.all(items.slice(index, index + size).map(work))))
    if (items.length > 50) process.stdout.write(`\r  ${Math.min(index + size, items.length)} / ${items.length}`)
  }
  if (items.length > 50) process.stdout.write('\n')
  return results
}

// ---------------------------------------------------------------------

const now = new Date()
const pad = (value) => String(value).padStart(2, '0')
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
const folder = path.join(BACKUPS, stamp)
await mkdir(path.join(folder, 'donnees'), { recursive: true })

console.log(`Sauvegarde de ${url}\n`)
const manifest = { date: now.toISOString(), projet: url, tables: {}, comptes: 0, fichiers: {}, problemes: [] }
const data = {}

try {
  console.log('Donnees :')
  for (const [table, order] of TABLES) {
    const { rows, announced } = await readTable(table, order)
    data[table] = rows
    await writeFile(path.join(folder, 'donnees', `${table}.json`), JSON.stringify(rows, null, 1))
    manifest.tables[table] = rows.length
    console.log(`  ${table.padEnd(20)} ${String(rows.length).padStart(6)} ligne${rows.length > 1 ? 's' : ''}`)
    if (announced !== null && announced !== rows.length) {
      manifest.problemes.push(`${table} : ${rows.length} lignes lues, ${announced} annoncees par la base`)
    }
  }

  const accounts = await readAccounts()
  await writeFile(path.join(folder, 'donnees', 'comptes.json'), JSON.stringify(accounts, null, 1))
  manifest.comptes = accounts.length
  console.log(`  ${'comptes'.padEnd(20)} ${String(accounts.length).padStart(6)}`)
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

console.log('\nPhotos :')
const wanted = [
  ...data.spot_photos.flatMap((photo) => [
    ['spot-photos', photo.path_standard],
    ['spot-photos', photo.path_thumb],
  ]),
  ...data.profiles.filter((profile) => profile.avatar_path).map((profile) => ['avatars', profile.avatar_path]),
].filter(([, name]) => typeof name === 'string' && name.length > 0)

const outcomes = await inBatches(wanted, 6, async ([bucket, name]) => {
  try {
    return [bucket, name, await copyFile(bucket, name)]
  } catch {
    return [bucket, name, 'manquant']
  }
})
for (const [bucket, name, outcome] of outcomes) {
  manifest.fichiers[bucket] ??= { copies: 0, deja_presents: 0, manquants: 0 }
  if (outcome === 'copie') manifest.fichiers[bucket].copies += 1
  else if (outcome === 'deja') manifest.fichiers[bucket].deja_presents += 1
  else {
    manifest.fichiers[bucket].manquants += 1
    manifest.problemes.push(`fichier introuvable : ${bucket}/${name}`)
  }
}
for (const [bucket, counts] of Object.entries(manifest.fichiers)) {
  console.log(`  ${bucket.padEnd(20)} ${counts.copies} copie(s), ${counts.deja_presents} deja la, ${counts.manquants} introuvable(s)`)
}
if (wanted.length === 0) console.log('  aucune')

await writeFile(path.join(folder, 'manifeste.json'), JSON.stringify(manifest, null, 1))

console.log(`\nDossier : ${path.relative(ROOT, folder)} (donnees) et ${path.relative(ROOT, path.join(BACKUPS, 'fichiers'))} (photos)`)
if (manifest.problemes.length > 0) {
  console.log(`\nA regarder (${manifest.problemes.length}) :`)
  for (const problem of manifest.problemes.slice(0, 20)) console.log(`  - ${problem}`)
  if (manifest.problemes.length > 20) console.log(`  ... et ${manifest.problemes.length - 20} autres, dans manifeste.json`)
  process.exitCode = 2
} else {
  console.log('\nSauvegarde complete.')
}
