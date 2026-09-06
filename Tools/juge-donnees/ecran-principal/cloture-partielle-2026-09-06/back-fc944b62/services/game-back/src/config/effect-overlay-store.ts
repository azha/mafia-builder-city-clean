// IMPLEMENTS: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C3 (★ EffectOverlayStore — the read layer)
//             Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §2.2 (architecture) + §2.4 (scope enum)
//             Schema: db/schema/effect_modifier.ts (effect_modifier table, migration 0106, C2)
//             Pattern MIRRORED: config/tunables-store.ts (TunablesStore) — plain module-level singleton,
//             dedicated `pg` LISTEN client, synchronous resolvers (no `await` in hot-path ticks).
//             — 04e-A1 C3 — 2026-07-04
//
// `EffectOverlayStore` — the scoped effect-modifier READ layer (design §2.2, "a scoped overlay
// singleton"). Holds an in-memory snapshot of the rows currently persisted in `effect_modifier`
// (keyed `tunable_key → EffectModifier[]`), refreshed via a dedicated `pg LISTEN` client on channel
// `effect_modifiers_changed` + a full reload on (re)connect and on boot. There is NO time-based
// filtering in this store: `effect_modifier` rows ARE the active set — `revertEvent`/`revertExpired`
// (C4) DELETE a row to revert it, so "every row present in the table" is exactly "every active
// modifier" (design §2.2/§2.3 — "the DELETE IS the revert, no floating baseline").
//
// Exposes ONE synchronous entry point: `applyModifiers(key, base, scope?)`. Compose order (design
// §2.2, fixed/deterministic): all MULTIPLY folded onto `base` first, then all ADD, then any SET
// (last write wins — ties within an op-group broken by `id` ascending, matching the persisted
// insertion order `applyEvent` (C4) will use). Scope-match (design §2.4): GLOBAL always matches;
// DISTRICT matches iff `scope.districtId === scope_ref`; PLAYER matches iff `scope.playerId ===
// scope_ref`; COHORT matches iff `scope.cohortId === scope_ref`.
//
// **Zero-regression contract**: an EMPTY snapshot, or a snapshot with no scope-matching row for
// `key`, returns `base` UNCHANGED (no arithmetic at all — byte-identical, same type/value). This is
// what lets C5 wrap every lever getter's body (`return EffectOverlayStore.applyModifiers(key, base)`)
// with zero call-site churn and zero behavioral change while the engine is unused.
//
// Degrades honestly on connect/reload failure → empty snapshot → every `applyModifiers` call falls
// through to `base` (identical to "no political event active"), exactly like `TunablesStore` degrades
// to env/defaults. Never throws in the hot path; never blocks serving on this store.
//
// Imported directly by the 9 lever getters at C5 (plain module import — NOT a Nest provider token,
// design §2.2: "no signature change, zero call-site churn").
//
// C4 addition (2026-07-04, plan C4 falsifiable clause (b) / design §2.3 "crash-safety"):
// `dropSnapshotForTest()` — a TEST-ONLY hook that clears the in-memory snapshot WITHOUT touching the
// DB or the LISTEN client. Combined with the already-public `init()` (the exact entrypoint `main.ts`
// calls at real boot), a spec can: apply a modifier -> observe the shift -> dropSnapshotForTest()
// (simulate the crash: prove the shift now reads as `base`, i.e. memory really was cleared, not
// faked) -> init() again (simulate the reboot: the SAME boot code path reconnects + reloads) ->
// observe the shift again, rebuilt from the persisted `effect_modifier` rows, not from memory. Never
// called from any production path — only from the gated `_test/effect-engine/*` controller routes
// (R-EC-2, `testControllersEnabled()`).
//
// 04e-A2 C0 addition (★ F2-RACE product fix, A2-D1, TDI §3.4): `reload()` used to swap
// `this.snapshot = next` unconditionally on query return — two notify-triggered reloads completing
// OUT OF ORDER (the older one's query finishing after the newer one's) could leave the in-memory
// snapshot transiently or durably stale. Unreachable in A1 prod (no event ever wrote `effect_modifier`,
// so the overlay was always empty); reachable the moment A2 wires real apply/revert under load (the
// NIGHTLY calendar tick + counter-play actions fire real notifications, sometimes in bursts). Fixed
// with a monotonic `reloadSeq` token: `reload()` captures `token = ++this.reloadSeq` BEFORE its
// SELECT, and the swap after the query returns is applied only if `token === this.reloadSeq` (no
// newer reload has started meanwhile) — a stale in-flight reload is discarded, never overwrites a
// fresher snapshot. The existing "keep previous snapshot on query error" behavior is unchanged. Also
// adds a public awaited `reloadNow(): Promise<void>` (same token discipline) so the A2 political
// calendar tick (C2) can force same-process, same-tick overlay visibility after applyEvent/revertEvent
// instead of racing the async pg-LISTEN round-trip (design §3, A2-D2). Byte-identical for the
// single-reload-in-flight case (today's only real traffic pattern) — the token comparison always
// passes when there is no concurrent reload, so this is a pure robustness addition, zero regression.

import { Client } from 'pg';

import type { EffectModifierRow } from '../db/schema/effect_modifier';

const CHANNEL = 'effect_modifiers_changed';
const RECONNECT_BASE_MS = 1000;
const RECONNECT_CAP_MS = 30000;

/**
 * The scope a lever getter's caller resolves against (design §2.4). GLOBAL modifiers need no
 * context and always match; DISTRICT/PLAYER/COHORT modifiers match only when the corresponding
 * field is present AND equals the modifier's `scope_ref`.
 */
export interface EffectScopeContext {
  districtId?: string;
  playerId?: string;
  cohortId?: string;
}

class EffectOverlayStoreImpl {
  private snapshot = new Map<string, EffectModifierRow[]>();
  private client: Client | null = null;
  private stopped = false;
  private reconnectDelay = RECONNECT_BASE_MS;
  // single-flight: 'error' + 'end' on a dying client must not spawn parallel reconnect loops
  private reconnectPending = false;
  private warnedMagnitudes = new Set<string>();
  // F2-RACE guard (04e-A2 C0, A2-D1): monotonic reload token. Each `reload()` call captures its own
  // strictly-increasing token BEFORE issuing its SELECT; `applyReloadRows` below only commits the swap
  // if no newer reload has started meanwhile (`token === this.reloadSeq`) — see the class-level doc
  // comment for the full rationale.
  private reloadSeq = 0;

  /** Boot wiring (main.ts): connect the dedicated LISTEN client + initial full load. Failures log, never throw. */
  async init(): Promise<void> {
    this.stopped = false;
    await this.connect();
  }

  /** Shutdown wiring: stop reconnects + end the client. */
  async close(): Promise<void> {
    this.stopped = true;
    const c = this.client;
    this.client = null;
    if (c) await c.end().catch(() => undefined);
  }

  /**
   * TEST-ONLY (04e-A1 C4): drop the in-memory snapshot to an empty Map, WITHOUT touching the LISTEN
   * client or the DB. Simulates the "crash" half of a crash-recovery proof — a subsequent
   * `applyModifiers` call falls through to `base` for every key until `init()` (the real boot
   * entrypoint) is called again to rebuild the snapshot from the persisted `effect_modifier` rows.
   * Never invoked from any production code path.
   */
  dropSnapshotForTest(): void {
    this.snapshot = new Map();
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    // Detach + end any previous client before opening a new one (prevents double-LISTEN after reconnect).
    const prev = this.client; this.client = null;
    if (prev) { prev.removeAllListeners(); void prev.end().catch(() => undefined); }
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await client.connect();
      client.on('notification', () => { void this.reload(client); });
      client.on('error', () => this.scheduleReconnect());
      client.on('end', () => this.scheduleReconnect());
      await client.query(`LISTEN ${CHANNEL}`);
      this.client = client;
      this.reconnectDelay = RECONNECT_BASE_MS;
      await this.reload(client); // full load on (re)connect — covers notifications missed while down.
      // eslint-disable-next-line no-console
      console.log('[effect-overlay-store] connected + listening');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[effect-overlay-store] connect failed (degraded to empty snapshot → base values): ${(err as Error).message}`);
      await client.end().catch(() => undefined);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectPending) return;
    this.reconnectPending = true;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_CAP_MS);
    setTimeout(() => { this.reconnectPending = false; void this.connect(); }, delay).unref();
  }

  // Full snapshot reload (trivial scale — one SELECT, grouped by tunable_key). Swap-in atomically.
  // ORDER BY id ASC so each key's array is already in the deterministic tie-break order applyModifiers
  // relies on (defensively re-sorted there too — never depend on query-plan ordering alone).
  //
  // F2-RACE guard (04e-A2 C0, A2-D1): captures a monotonic token BEFORE the query; the swap is applied
  // via `applyReloadRows` (shared with the test-only race-guard seam below), which discards the write
  // if a newer reload has started meanwhile. Keeps the existing "keep previous snapshot on query
  // error" behavior unchanged.
  private async reload(client: Client): Promise<void> {
    const token = ++this.reloadSeq;
    try {
      const res = await client.query(
        `SELECT id, active_event_id, scope_type, scope_ref, tunable_key, op, magnitude,
                applied_at_game_day, expires_at_game_day
         FROM effect_modifier
         ORDER BY tunable_key, id ASC`,
      );
      this.applyReloadRows(token, res.rows as EffectModifierRow[]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[effect-overlay-store] reload failed (keeping previous snapshot): ${(err as Error).message}`);
    }
  }

  /**
   * Public awaited full reload (04e-A2 C0, A2-D2 — same-tick overlay visibility). Same token
   * discipline as the notify-triggered `reload()` above: forces a full reload against the store's
   * current LISTEN client and resolves once it lands (or is discarded as stale, in the vanishingly
   * unlikely case a concurrent notify-triggered reload started later and finished first — the guard
   * makes this safe either way). Used by the A2 political calendar tick (C2) to guarantee same-
   * process, same-tick overlay visibility after `applyEvent`/`revertEvent` instead of racing the async
   * pg-LISTEN round-trip (design §3). No-op (resolves immediately, snapshot unchanged) if the store is
   * not currently connected — mirrors the store's existing "degrade to previous/empty snapshot, never
   * throw" contract; a caller needing a guaranteed connected client should ensure `init()` has already
   * resolved (mirrors `main.ts`'s own boot sequencing).
   */
  async reloadNow(): Promise<void> {
    const client = this.client;
    if (!client) return;
    await this.reload(client);
  }

  /**
   * F2-RACE guard core (04e-A2 C0, A2-D1): group `rows` by `tunable_key` and swap them in as the new
   * snapshot ONLY if `token` is still the most recently issued reload (`token === this.reloadSeq`) —
   * i.e. no newer reload has started since this one captured its token. A stale in-flight reload's
   * result is discarded, never overwriting a fresher snapshot.
   *
   * Called from two places: the real `reload()` above (token+rows sourced from an actual DB query) and
   * the TEST-ONLY `applyReloadRowsForTest()` below (token+rows supplied directly by a spec so the
   * race-guard test can assert the discard deterministically, with no query-timing dependency — same
   * swap-decision logic in both paths, never a re-implementation).
   *
   * @returns whether the swap actually happened (`false` = discarded as stale).
   */
  private applyReloadRows(token: number, rows: readonly EffectModifierRow[]): boolean {
    if (token !== this.reloadSeq) return false; // stale — discarded (F2-RACE guard, A2-D1).
    const next = new Map<string, EffectModifierRow[]>();
    for (const row of rows) {
      const list = next.get(row.tunable_key);
      if (list) list.push(row); else next.set(row.tunable_key, [row]);
    }
    this.snapshot = next;
    return true;
  }

  /**
   * TEST-ONLY (04e-A2 C0, F2-RACE guard falsifiable test): captures a token exactly like a real
   * `reload()` would, WITHOUT touching the DB — lets a spec deterministically control which of two
   * "in-flight reloads" (real query timing aside) completes its swap first vs. second, with no
   * wall-clock dependency. Mirrors `dropSnapshotForTest()`'s precedent: a test-only entry point into
   * REAL internal state, never a mock of the guard logic itself. Never called from any production path.
   */
  beginReloadForTest(): number {
    return ++this.reloadSeq;
  }

  /**
   * TEST-ONLY (04e-A2 C0, F2-RACE guard falsifiable test): completes a "reload" using a token obtained
   * from `beginReloadForTest()` and caller-supplied rows, running the EXACT SAME swap-decision logic
   * (`applyReloadRows`) the real `reload()` uses. Returns whether the swap actually happened (`false` =
   * discarded as stale) so the race-guard test can assert on it directly — falsifiable, not
   * timing-dependent. Never called from any production path.
   */
  applyReloadRowsForTest(token: number, rows: readonly EffectModifierRow[]): boolean {
    return this.applyReloadRows(token, rows);
  }

  // ---- scope-match (design §2.4) ----

  private scopeMatches(row: EffectModifierRow, scope: EffectScopeContext | undefined): boolean {
    switch (row.scope_type) {
      case 'GLOBAL':
        return true;
      case 'DISTRICT':
        return scope?.districtId !== undefined && scope.districtId === row.scope_ref;
      case 'PLAYER':
        return scope?.playerId !== undefined && scope.playerId === row.scope_ref;
      case 'COHORT':
        return scope?.cohortId !== undefined && scope.cohortId === row.scope_ref;
      default:
        return false;
    }
  }

  /** Warn once per row id when a persisted magnitude cannot be parsed (never throw in the hot path). */
  private warnOnceMagnitude(row: EffectModifierRow): void {
    if (this.warnedMagnitudes.has(row.id)) return;
    this.warnedMagnitudes.add(row.id);
    // eslint-disable-next-line no-console
    console.warn(`[effect-overlay-store] unparseable magnitude for modifier '${row.id}' (key='${row.tunable_key}', value='${row.magnitude}') — skipped`);
  }

  // ---- synchronous compose (design §2.2 — no `await`, hot-path safe) ----

  /**
   * Compose every active modifier on `key` whose scope matches `scope` on top of `base`.
   *
   * Compose order (fixed, deterministic — design §2.2): all MULTIPLY folded first (in `id` ascending
   * order), then all ADD (in `id` ascending order), then any SET (in `id` ascending order — the last
   * SET, i.e. the highest `id` among SET rows, wins). Ties within an op-group are broken by `id`
   * ascending, so two calls against the SAME persisted snapshot always compose identically
   * (design §"Determinism" — a pure function of `(rows, tunables, day)`; there is no `day` argument
   * here because expiry is enforced by deletion, C4).
   *
   * **Zero-regression contract**: with no rows for `key`, or no row whose scope matches `scope`,
   * returns `base` UNCHANGED — no arithmetic, so the return value is byte-identical to `base` (same
   * type, same value, no float re-boxing).
   */
  applyModifiers(key: string, base: number, scope?: EffectScopeContext): number {
    const rows = this.snapshot.get(key);
    if (!rows || rows.length === 0) return base;

    const matching = rows
      .filter((r) => this.scopeMatches(r, scope))
      .slice() // defensive copy — never mutate the shared snapshot array
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (matching.length === 0) return base;

    let result = base;
    for (const row of matching) {
      if (row.op !== 'MULTIPLY') continue;
      const n = Number(row.magnitude);
      if (Number.isNaN(n)) { this.warnOnceMagnitude(row); continue; }
      result = result * n;
    }
    for (const row of matching) {
      if (row.op !== 'ADD') continue;
      const n = Number(row.magnitude);
      if (Number.isNaN(n)) { this.warnOnceMagnitude(row); continue; }
      result = result + n;
    }
    for (const row of matching) {
      if (row.op !== 'SET') continue;
      const n = Number(row.magnitude);
      if (Number.isNaN(n)) { this.warnOnceMagnitude(row); continue; }
      result = n;
    }
    return result;
  }
}

/** The process-wide singleton — plain module-level (the lever getters are not Nest-injectable). */
export const EffectOverlayStore = new EffectOverlayStoreImpl();
