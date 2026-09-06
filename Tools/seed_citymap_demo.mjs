// Dev fixture: seed a STABLE demo player (+ credential), advance the city sim far
// enough that the slow cadences (nightly / 12h / 30-min) have fired — so cohesion,
// inspection and patrol return real data instead of 404 — then seed a few heated
// buildings for a deterministic heat gradient. Idempotent.
//
// Talks to the REAL dockerized backend (project mafia-clean-city) — no mocks. Mirrors
// the seeding the backend E2E specs do (tests/e2e/citysim/*.spec.ts).
//
// ORDER MATTERS:
//   1. clear buildings, 2. heavy-advance with NO buildings (fires the slow cadences
//   WITHOUT climbing any heat), 3. seed the heat gradient, 4. advance ONE tick (recompute
//   the heat aggregate from the gradient + climb ~+0.04, staying in-band).
// Advancing with buildings present would pull operational heat up toward BURNING and wash
// the gradient — hence buildings are seeded AFTER the heavy advance.
//
// Usage:  node Tools/seed_citymap_demo.mjs

import { execFileSync } from 'node:child_process';
import { scryptSync, randomBytes } from 'node:crypto';

const COMPOSE = ['compose', '--project-name', 'mafia-clean-city'];
const PG_USER = process.env.POSTGRES_USER ?? 'mafia';
const PG_DB = process.env.POSTGRES_DB ?? 'mafia_clean_city';
const BASE_URL = process.env.STACK_BASE_URL ?? 'http://localhost';

// Surcharge par variable d'environnement (2026-08-30, ajoutée pour SYMÉTRIE avec
// seed_operational_demo.mjs — identité de démo par éditeur, MÊME NOM que
// DemoIdentityResolver.CityMapIdentifierEnvVar/CityMapPasswordEnvVar côté client Unity). Additif —
// défaut INCHANGÉ quand la variable est absente ou vide.
const EMAIL = process.env.MAFIA_CITYMAP_IDENTIFIER || 'citymap_demo@example.test';
const CALLSIGN = EMAIL.split('@')[0]; // dérivé de EMAIL — rend 'citymap_demo' au défaut (inchangé).
const PASSWORD = process.env.MAFIA_CITYMAP_PASSWORD || 'citymap-demo-pw';

// ⛔⛔ LA MÊME PORTE QUE LE SEEDER OPÉRATIONNEL, ET ELLE MANQUAIT ICI — c'est par ce trou que le
// compte gelé a perdu 14 bâtiments et ses 2 planques le 2026-09-06.
// LA CHAÎNE, mesurée et non supposée : `CityMapHeatPlayModeTests` et `CityMapDetailPlayModeTests`
// (catégorie `ScreenCarte`) s'AUTO-SÈMENT en `[OneTimeSetUp]` en lançant ce script ; ce script lit
// `MAFIA_CITYMAP_IDENTIFIER` ; et il appelle `advance()`. Une session de capture a exporté cette
// paire sur le compte gelé — pour corriger l'identité d'une planche — et a du même coup pointé le
// SEMIS dessus. Deux suites = deux ticks = +2 minutes de jeu, et le lapse de maintenance a détruit
// ce qui n'était pas entretenu.
// ⇒ *Un canal de repointage ne couvre que les maillons qu'on a ÉNUMÉRÉS.* La règle était écrite le
//   jour même, dans le runbook, pour l'AUTRE paire — « poser les deux variables pointe le client ET
//   le seeder » — et elle n'a pas été appliquée à celle-ci. Nommer un piège ne protège pas de lui.
// ⚠️ ET LA GARDE PORTE SUR LA MUTATION, PAS SUR LE SEMIS. Le refus du seeder opérationnel parle de
//   « semis » ; ici le geste destructeur est l'AVANCE DE L'HORLOGE, qui n'est pas un semis. Une
//   garde qui nomme l'opération au lieu de la CLASSE laisse passer sa voisine — c'est exactement ce
//   qui vient d'arriver.
const COMPTES_GELES = new Set([
  // L'état de ce compte EST la base de preuve des planches jugées : toute MUTATION — semis, avance
  // d'horloge, raid — invalide en silence les rapports qui s'y réfèrent.
  'demo_capture@example.test',
]);
const AUTORISE_GEL = process.env.MAFIA_SEED_ALLOW_FROZEN === '1';

// Le dispositif DÉCLARE son régime à chaque exécution : un dispositif inerte ressemble trait pour
// trait à un dispositif appliqué, sauf s'il dit lequel des deux il est.
console.log(`[seed-citymap] compte=${EMAIL} · gel=${COMPTES_GELES.has(EMAIL) ? 'COMPTE GELÉ' : 'compte ordinaire'}`
          + ` · MAFIA_SEED_ALLOW_FROZEN=${AUTORISE_GEL ? '1 (contournement EXPLICITE)' : 'non posée'}`);

if (COMPTES_GELES.has(EMAIL) && !AUTORISE_GEL) {
  console.error(
    `[seed-citymap] REFUS : « ${EMAIL} » est un COMPTE GELÉ — son état est la base de preuve des\n` +
    `       planches jugées, et ce script le MUTE deux fois : il sème le gradient de chaleur ET il\n` +
    `       AVANCE L'HORLOGE (\`advance()\`), ce qui déclenche le lapse de maintenance et détruit les\n` +
    `       bâtiments et planques non entretenus. Mesuré le 2026-09-06 : −14 bâtiments, −2 planques.\n` +
    `       ⇒ C'est presque toujours une paire de CAPTURE exportée dans un run qui embarque une suite\n` +
    `         de la catégorie \`ScreenCarte\` — celles-ci s'auto-sèment en OneTimeSetUp.\n` +
    `       ⇒ Pour capturer la carte : n'exporter QUE \`MAFIA_DEMO_*\`, jamais \`MAFIA_CITYMAP_*\`, et\n` +
    `         lancer \`CaptureCarte\` sans \`ScreenCarte\`.\n` +
    `       ⇒ Pour re-semer ce compte À DESSEIN : MAFIA_SEED_ALLOW_FROZEN=1, empreinte publiée AVANT\n` +
    `         et APRÈS.`);
  process.exit(3);
}

// Advance to at least this game-minute so nightly (1440) + 12h (720) + 30-min cadences fire.
const TARGET_MINUTE = 1500;

// Per-district heat seeds (thresholds: COLD <0.2, WARM 0.2–0.5, HOT 0.5–0.8, BURNING ≥0.8).
const HEAT_SEEDS = [
  { district: 3, heat: 0.9 },
  { district: 7, heat: 0.6 },
  { district: 11, heat: 0.35 },
];

const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_KEYLEN = 32;
function hashPassword(plain) {
  const salt = randomBytes(16);
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

function psql(sql) {
  const out = execFileSync(
    'docker',
    [...COMPOSE, 'exec', '-T', 'pg', 'psql', '-U', PG_USER, '-d', PG_DB, '-v', 'ON_ERROR_STOP=1', '-tAc', sql],
    { encoding: 'utf-8' },
  );
  return out.trim().split('\n')[0].trim();
}

async function advance(playerId, ticks) {
  const res = await fetch(`${BASE_URL}/v1/_test/citysim/advance?ticks=${ticks}&player_id=${playerId}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID(), 'Content-Type': 'application/json' },
    body: '{}',
  });
  const body = await res.json();
  return body.payload?.data ?? body;
}

async function main() {
  // 1. Idempotent account.
  let accountId = psql(`SELECT account_id FROM "player" WHERE email = '${EMAIL}';`);
  let playerId;
  if (accountId) {
    playerId = psql(`SELECT player_id FROM "player" WHERE account_id = '${accountId}';`);
    psql(`UPDATE "account_credential" SET password_hash = '${hashPassword(PASSWORD)}', updated_at = now() WHERE account_id = '${accountId}';`);
    // ⛔ MÊME RATTRAPAGE QUE DANS `seed_operational_demo.mjs` — les DEUX comptes de démo sont
    //    photographiés, donc la CLASSE compte deux membres et un correctif sur un seul laisse ③
    //    CarteVille en anglais. Mesuré le 2026-09-04 : `citymap_demo@example.test` était `en`,
    //    comme `operational_demo`. Le client demande le bundle SANS paramètre de locale ⇒ le back
    //    rend celle du COMPTE ⇒ un compte `en` sert les littéraux anglais et ÉCRASE les replis
    //    français du client. TD-539 n'a changé que le défaut d'un signup NEUF ; sans cette ligne
    //    un compte déjà créé reste `en` pour toujours (la branche de création ne le revoit jamais).
    const localeAvant = psql(`SELECT locale FROM "player" WHERE account_id = '${accountId}';`);
    if (localeAvant !== 'fr') {
      psql(`UPDATE "player" SET locale = 'fr' WHERE account_id = '${accountId}';`);
      console.log(`[seed] locale du compte de démo : '${localeAvant}' -> 'fr' (TD-539 ; pas de migration de masse, c'est ce seeder qui rattrape)`);
    }
    console.log(`[seed] reusing demo account ${accountId} (player ${playerId})`);
  } else {
    accountId = psql(`INSERT INTO "account" ("kind","lifecycle_state") VALUES ('PLAYER','ACTIVE') RETURNING account_id;`);
    // `fr` à la création — la langue réelle du jeu (TD-539).
    playerId = psql(`INSERT INTO "player" ("account_id","callsign","email","locale") VALUES ('${accountId}','${CALLSIGN}','${EMAIL}','fr') RETURNING player_id;`);
    psql(`INSERT INTO "account_credential" ("account_id","password_hash") VALUES ('${accountId}','${hashPassword(PASSWORD)}');`);
    console.log(`[seed] created demo account ${accountId} (player ${playerId})`);
  }

  // 2. Clear buildings BEFORE the heavy advance (so it climbs no heat).
  //    MESURÉ (nav-hud-design-v1.md chunk 5, hud-F5) : un run précédent (le heavy-advance de
  //    l'étape 3 déclenche les cadences lentes, dont l'assignation de lieutenant) peut laisser un
  //    lieutenant assigné à un bâtiment que CE DELETE veut supprimer — `lieutenant.
  //    assigned_building_id` référence `buildings(building_id)` SANS `ON DELETE` (migration 0026),
  //    donc sans ce détachement le DELETE échoue avec une violation de FK, à CHAQUE run suivant
  //    (reproduit 2×, pas transitoire). Détache d'abord — la colonne est NULLable par conception
  //    (0026 : "NULL si non-délégué"), donc ce reset est schema-compliant, pas un contournement.
  psql(`UPDATE lieutenant SET assigned_building_id = NULL WHERE assigned_building_id IN (SELECT building_id FROM buildings WHERE player_id = '${playerId}');`);
  psql(`DELETE FROM buildings WHERE player_id = '${playerId}';`);

  // 3. Heavy-advance to fire the slow cadences (cohesion nightly / inspection 12h / patrol).
  //    Idempotent: skip if the clock is already past the nightly boundary.
  const currentMinuteRaw = psql(`SELECT game_minute FROM city_sim_clock WHERE player_id = '${playerId}';`);
  const currentMinute = currentMinuteRaw ? Number(currentMinuteRaw) : 0;
  if (currentMinute < TARGET_MINUTE) {
    const ticks = TARGET_MINUTE - currentMinute;
    console.log(`[seed] heavy-advancing ${ticks} ticks (clock ${currentMinute} → ${TARGET_MINUTE}; may take ~20s)…`);
    const d = await advance(playerId, ticks);
    console.log(`[seed] cadences fired:`, JSON.stringify(d.cadences_fired ?? d));
  } else {
    console.log(`[seed] clock already at ${currentMinute} (≥ ${TARGET_MINUTE}) — slow cadences already fired, skipping heavy advance`);
  }

  // 4. Seed the heat gradient (after the heavy advance).
  const seeded = [];
  for (const { district, heat } of HEAT_SEEDS) {
    const blockId = psql(`SELECT id FROM blocks WHERE district_id = ${district} ORDER BY id LIMIT 1;`);
    const buildingId = psql(
      `INSERT INTO buildings (player_id, block_id, building_type, ownership, structural_state, heat, last_heat_update_at) ` +
        `VALUES ('${playerId}', ${blockId}, 11, 'player', 'operational', ${heat}, now()) RETURNING building_id;`,
    );
    seeded.push({ district, block_id: Number(blockId), heat, building_id: buildingId });
  }
  console.log('[seed] buildings:', JSON.stringify(seeded));

  // 5. One tick: recompute the heat aggregate from the gradient (stays in-band).
  const d = await advance(playerId, 1);
  console.log(`[seed] advance(1) → game_minute ${d.game_minute}`);

  console.log('\n=== DEMO CREDENTIALS ===');
  console.log(JSON.stringify({ email: EMAIL, callsign: CALLSIGN, password: PASSWORD, accountId, playerId }, null, 2));
}

main().catch((e) => {
  console.error('[seed] FAILED:', e.message);
  process.exit(1);
});
