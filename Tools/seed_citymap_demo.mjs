// Dev fixture: seed a STABLE demo player (+ credential) and a few heated buildings,
// then advance the city sim so the Heat projection shows variation. Idempotent.
//
// This talks to the REAL dockerized backend stack (project mafia-clean-city) — no mocks.
// It mirrors the seeding the backend E2E specs do (tests/e2e/citysim/heat_propagation.spec.ts):
//   account(PLAYER,ACTIVE) + player(callsign/email/locale) + account_credential(scrypt hash)
//   + buildings(ownership='player', operational, heat) + POST /v1/_test/citysim/advance.
//
// Usage:  node Tools/seed_citymap_demo.mjs
// Prints the demo credentials + resolved player_id/account_id + the per-district heat seeds.

import { execFileSync } from 'node:child_process';
import { scryptSync, randomBytes } from 'node:crypto';

const COMPOSE = ['compose', '--project-name', 'mafia-clean-city'];
const PG_USER = process.env.POSTGRES_USER ?? 'mafia';
const PG_DB = process.env.POSTGRES_DB ?? 'mafia_clean_city';
const BASE_URL = process.env.STACK_BASE_URL ?? 'http://localhost';

// Stable, recognizable demo identity (persists in the pg volume across sessions).
const EMAIL = 'citymap_demo@example.test';
const CALLSIGN = 'citymap_demo';
const PASSWORD = 'citymap-demo-pw';

// Per-district heat seeds → expected bucket spread (COLD elsewhere).
// 0.9 → BURNING, 0.6 → HOT, 0.35 → WARM (exact bucket thresholds owned by the server).
const HEAT_SEEDS = [
  { district: 3, heat: 0.9 },
  { district: 7, heat: 0.6 },
  { district: 11, heat: 0.35 },
];

// Mirror of services/game-back/src/auth/password.hasher.ts → scrypt$N$r$p$saltB64$hashB64.
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

async function main() {
  // 1. Idempotent account: reuse if the demo player already exists (by email), else create.
  let accountId = psql(`SELECT account_id FROM "player" WHERE email = '${EMAIL}';`);
  let playerId;
  if (accountId) {
    playerId = psql(`SELECT player_id FROM "player" WHERE account_id = '${accountId}';`);
    // Refresh the credential so the known password always works.
    psql(
      `UPDATE "account_credential" SET password_hash = '${hashPassword(PASSWORD)}', updated_at = now() WHERE account_id = '${accountId}';`,
    );
    console.log(`[seed] reusing demo account ${accountId} (player ${playerId})`);
  } else {
    accountId = psql(`INSERT INTO "account" ("kind","lifecycle_state") VALUES ('PLAYER','ACTIVE') RETURNING account_id;`);
    playerId = psql(
      `INSERT INTO "player" ("account_id","callsign","email","locale") VALUES ('${accountId}','${CALLSIGN}','${EMAIL}','en') RETURNING player_id;`,
    );
    psql(
      `INSERT INTO "account_credential" ("account_id","password_hash") VALUES ('${accountId}','${hashPassword(PASSWORD)}');`,
    );
    console.log(`[seed] created demo account ${accountId} (player ${playerId})`);
  }

  // 2. Reset this demo player's buildings, then seed fresh heated ones at EXACT band values
  //    (thresholds: COLD <0.2, WARM 0.2–0.5, HOT 0.5–0.8, BURNING ≥0.8).
  psql(`DELETE FROM buildings WHERE player_id = '${playerId}';`);
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

  // 3. Advance EXACTLY ONE minute-tick: lazily creates the city_sim_clock row AND recomputes the
  //    in-memory district/citywide aggregates from the freshly-seeded heat (so district_bucket is
  //    correct, not stale). One tick climbs operational heat only ~+0.04 — each building stays in its
  //    band, preserving the BURNING/HOT/WARM gradient. (More ticks would trend everything to BURNING.)
  const res = await fetch(`${BASE_URL}/v1/_test/citysim/advance?ticks=1&player_id=${playerId}`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID(), 'Content-Type': 'application/json' },
    body: '{}',
  });
  const body = await res.json();
  console.log(`[seed] advance(1) → HTTP ${res.status}:`, JSON.stringify(body.payload?.data ?? body));

  console.log('\n=== DEMO CREDENTIALS ===');
  console.log(JSON.stringify({ email: EMAIL, callsign: CALLSIGN, password: PASSWORD, accountId, playerId }, null, 2));
}

main().catch((e) => {
  console.error('[seed] FAILED:', e.message);
  process.exit(1);
});
