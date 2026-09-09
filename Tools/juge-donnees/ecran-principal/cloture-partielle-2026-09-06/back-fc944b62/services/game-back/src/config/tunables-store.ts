// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-23-tunables-registry-design.md §4-T2 — the process-wide
// tunables override store: a dedicated pg LISTEN client + an in-memory snapshot + SYNCHRONOUS typed resolvers
// (no await in hot paths — ticks read a Map). Precedence: DB-override > env > gdd/14 default (the env stays the
// test-only knob; defaults stay cited in each *-tunables module, R2.3). Degrades honestly: DB unreachable →
// empty snapshot → today's env/default behavior + a warning; serving never blocks on this store.
// -- Phase-23 T2 --
import { Client } from 'pg';

const CHANNEL = 'tunables_changed';
const RECONNECT_BASE_MS = 1000;
const RECONNECT_CAP_MS = 30000;

class TunablesStoreImpl {
  private snapshot = new Map<string, string>();
  private client: Client | null = null;
  private stopped = false;
  private reconnectDelay = RECONNECT_BASE_MS;
  // single-flight: 'error' + 'end' on a dying client must not spawn parallel loops
  private reconnectPending = false;
  private warnedKeys = new Set<string>();

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
      console.log('[tunables-store] connected + listening');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[tunables-store] connect failed (degraded to env/defaults): ${(err as Error).message}`);
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

  // Full snapshot reload (trivial scale — one SELECT). Swap-in atomically.
  private async reload(client: Client): Promise<void> {
    try {
      const res = await client.query('SELECT key, value FROM tunable_overrides');
      const next = new Map<string, string>();
      for (const row of res.rows as Array<{ key: string; value: string }>) next.set(row.key, row.value);
      this.snapshot = next;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[tunables-store] reload failed (keeping previous snapshot): ${(err as Error).message}`);
    }
  }

  // ---- synchronous resolvers (DB-override > env > default; defensive parse — never throw in hot paths) ----

  /** Warn once per key when a DB override value is present but cannot be parsed (avoids log spam on every tick). */
  private warnOnce(key: string, value: string): void {
    if (this.warnedKeys.has(key)) return;
    this.warnedKeys.add(key);
    // eslint-disable-next-line no-console
    console.warn(`[tunables-store] unparseable DB override for '${key}' ('${value}') — falling back to env/default`);
  }

  resolveInt(key: string, envVar: string, def: number): number {
    const db = this.snapshot.get(key);
    if (db !== undefined) { const n = Number.parseInt(db, 10); if (!Number.isNaN(n)) return n; this.warnOnce(key, db); }
    const raw = process.env[envVar];
    if (raw !== undefined && raw.trim() !== '') { const n = Number.parseInt(raw, 10); if (!Number.isNaN(n)) return n; }
    return def;
  }
  resolveFloat(key: string, envVar: string, def: number): number {
    const db = this.snapshot.get(key);
    if (db !== undefined) { const n = Number.parseFloat(db); if (!Number.isNaN(n)) return n; this.warnOnce(key, db); }
    const raw = process.env[envVar];
    if (raw !== undefined && raw.trim() !== '') { const n = Number.parseFloat(raw); if (!Number.isNaN(n)) return n; }
    return def;
  }
  /** 0/1-int convention (project-wide): non-zero int → true; 0 → false; unparseable → next layer. */
  resolveBool(key: string, envVar: string, def: boolean): boolean {
    const db = this.snapshot.get(key);
    if (db !== undefined) { const n = Number.parseInt(db, 10); if (!Number.isNaN(n)) return n !== 0; this.warnOnce(key, db); }
    const raw = process.env[envVar];
    if (raw !== undefined && raw.trim() !== '') { const n = Number.parseInt(raw, 10); if (!Number.isNaN(n)) return n !== 0; }
    return def;
  }
  resolveString(key: string, envVar: string, def: string): string {
    const db = this.snapshot.get(key);
    if (db !== undefined) return db;
    const raw = process.env[envVar];
    if (raw !== undefined && raw.trim() !== '') return raw;
    return def;
  }
}

/** The process-wide singleton — plain module-level (the *-tunables modules are not Nest-injectable). */
export const TunablesStore = new TunablesStoreImpl();
