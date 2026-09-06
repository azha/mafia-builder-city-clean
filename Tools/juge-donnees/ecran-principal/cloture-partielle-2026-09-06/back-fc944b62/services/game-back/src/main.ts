import type { Server } from 'node:http';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { adminPool } from './db';
import { runMigrations } from './db/migration.runner';
import {
  EnvelopeInterceptor,
  GlobalExceptionFilter,
} from './protocol/envelope.interceptor';
import { URI_VERSIONING } from './protocol/versioning';
import { TunablesStore } from './config/tunables-store';
import { EffectOverlayStore } from './config/effect-overlay-store';

/**
 * game-back bootstrap.
 *
 * Phase 0 Task 4: migrations are applied at boot by the MigrationRunner BEFORE NestJS serves the
 * HTTP port (09 §7 NestJS-jeu « migrations au boot, avant que NestJS commence à servir » + readiness
 * probe `/health` qui inclut migrations status §6). If migrations fail (after retries), the process
 * exits non-zero → Docker restart loop (never serve on a desynced schema, §7 Docker). The init-container
 * decision (§3.1/§9) is realized here as a boot-time gate on the same image — `COPY src/db/migrations`
 * is in the Dockerfile so the `.sql` + `_journal.json` are present at runtime.
 *
 * `app.enableShutdownHooks()` wires NestJS lifecycle hooks (OnModuleDestroy) so the DbModule drains
 * the app pg pool + Redis client on SIGTERM/SIGINT (graceful shutdown — folded T2/T3 review fix).
 *
 * Connection split (review S1-2): migrations (DDL) run on `adminPool` (MIGRATION_DATABASE_URL =
 * owner role `mafia`); the app then serves on the least-privilege `pool` (DATABASE_URL = `app_rw`)
 * via the DbModule providers. The admin pool is drained right after migrations so the app process
 * holds no owner/superuser connection while serving traffic.
 */
async function bootstrap(): Promise<void> {
  // Forward-only migrations gate (09 §5.3/§7). Throws → process exits non-zero.
  // Runs on the admin/owner connection (DDL + provisions app_rw in 0013).
  await runMigrations(adminPool);
  // Release the admin connection immediately — the app must not keep an owner pool open.
  await adminPool.end().catch(() => undefined);

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  // --- API protocol layer (Phase 0 Task 5, chapter 18) ---
  // URI versioning `/v<major>/` (versioning_strategy.md §Décision actée — URL
  // versioning, NO Accept-Version). HealthController is VERSION_NEUTRAL so
  // `/health` stays unversioned (versioning §Conséquences non-versioned exception).
  app.enableVersioning(URI_VERSIONING);

  // EnvelopeInterceptor: wraps every 2xx response in a ResponseEnvelope success
  // profile (18 §ResponseEnvelope). Registered as the OUTERMOST global interceptor
  // (runs after the DI-bound IdempotencyInterceptor in AppModule, so it wraps the
  // already-deduped raw value). Has no DI deps → instantiated here.
  app.useGlobalInterceptors(new EnvelopeInterceptor());

  // GlobalExceptionFilter: maps any thrown error → ResponseEnvelope error profile
  // with a canonical SCREAMING_SNAKE_CASE error.code (error_handling.md §Implications).
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(process.env.PORT ?? 3000);
  // Phase-23: tunables override store — LISTEN client + initial snapshot (degrades to env/defaults on failure).
  // No explicit shutdown wiring: no signal handler exists in this file; the LISTEN client dies with the process
  // (container lifecycle — Docker SIGTERM kills the process; NestJS enableShutdownHooks drains the app pool/Redis
  // via DbModule, which is sufficient; the dedicated LISTEN client is a single idle connection and needs no drain).
  await TunablesStore.init();
  // 04e-A1 C3: effect-modifier scoped overlay store — a dedicated LISTEN client on
  // `effect_modifiers_changed` (mirrors TunablesStore's own init above; degrades to an empty
  // snapshot → base values on failure, never blocks boot). No explicit shutdown wiring, same
  // rationale as TunablesStore: the LISTEN client dies with the process on container SIGTERM.
  await EffectOverlayStore.init();
  // TD-341: `app.listen()` is typed `Promise<any>` on `INestApplication`
  // (`@nestjs/common/interfaces/nest-application.interface.d.ts:46`) — narrowed here to the REAL runtime
  // type (`@nestjs/platform-express`'s `ExpressAdapter.listen()` returns Node's `http.Server`,
  // `express-adapter.d.ts:32-33`) so a typo on `keepAliveTimeout`/`headersTimeout` below fails `tsc`
  // instead of silently no-op'ing onto an untyped `any`.
  const server = (await app.listen(port, '0.0.0.0')) as Server;

  // ── Keep-alive / headers timeouts (debt lot fix/server-transport-and-overlay-race) ──────────────
  // Node's `http.Server` (what `app.listen()` returns for the `@nestjs/platform-express` adapter, per
  // `resolve(this.httpServer)` in `@nestjs/core`'s `NestApplication.listen`) defaults to
  // `keepAliveTimeout: 5000` / `headersTimeout: 60000` — confirmed by introspecting a fresh
  // `http.createServer()` on THIS repo's pinned runtime (`docker run node:20-alpine`, Dockerfile "Node
  // 20 pinned"), matching https://nodejs.org/docs/latest-v20.x/api/http.html#serverkeepalivetimeout /
  // #serverheaderstimeout. Traefik (pinned `traefik:v3.5`, `traefik/traefik.yml`) declares no
  // `serversTransport` override, so its backend-facing leg (Traefik → game-back) runs on its own
  // default: `forwardingTimeouts.idleConnTimeout = 90s` — verified directly at the PINNED v3.5, no
  // hedge needed: https://doc.traefik.io/traefik/v3.5/reference/routing-configuration/http/load-balancing/serverstransport/
  // states 90s, and Traefik's own Go source carries the literal —
  // `raw.githubusercontent.com/traefik/traefik/v3.5.0/pkg/server/service/transport.go`,
  // `createRoundTripper()` line 216: `IdleConnTimeout: 90 * time.Second` (Traefik-owned constant; a
  // zero-value `http.Transport{}` has NO idle limit — Go's own 90s lives only in `http.DefaultTransport`,
  // which Traefik does not use here). `grep -rn "serversTransport|idleConnTimeout|forwardingTimeouts"`
  // over every `*.yml`/`*.yaml`/`*.toml` in the repo (minus `node_modules`) → zero hits, no override.
  //
  // GOLDEN RULE: a backend's `keepAliveTimeout` must sit STRICTLY ABOVE the idle timeout of whatever
  // sits in front of it re-using pooled keep-alive sockets. If the backend destroys a pooled socket
  // before the proxy considers it stale, the proxy (or any keep-alive HTTP client) will try to reuse a
  // socket that no longer exists on our side. In PRODUCTION this surfaces as an intermittent 502
  // (Traefik gives up on the dead upstream socket; Go's `http.Transport` only retries idempotent
  // requests whose bytes were never written, so POSTs surface as hard 502s) — this alone justifies the
  // fix, independent of anything below.
  //
  // ★ ATTRIBUTION — method-agnostic, not client-specific (⊥ gate REVISION 2, `.review-transport/
  // VERDICT.md` Crux 2 — the gate REVERSES its own prior Finding 1/Crux 2, which had narrowed this to
  // "Playwright only, undici immune" on a single trial per case). This repo's E2E specs reach the API
  // through TWO different keep-alive-pooled HTTP clients, and BOTH are susceptible to the unset 5000ms
  // default:
  //   - Playwright's `APIRequestContext` pools connections on a Node `http.Agent({ keepAlive: true })`
  //     (`playwright-core/lib/coreBundle.js:7945-7946`). Reproduced directly on this repo's pinned
  //     runtime: a request reused across a 6s synchronous block (mimicking this suite's `execFileSync`
  //     psql seeding) deterministically threw `Error: socket hang up` / `ECONNRESET` pre-fix (the idle
  //     pooled socket is destroyed by the server at ~5-6s) and succeeded post-fix.
  //   - undici `fetch` (Node's global `fetch`) is NOT immune. The gate's first pass claimed immunity
  //     from a SINGLE trial per case (n=1) — worthless for characterising a ~50% race, and withdrawn.
  //     Re-run at n=5/n=20 on the exact shape of `off_hours_drift.spec.ts`'s `runDetector` (POST,
  //     `Content-Type: application/json` body, 6s blocked event loop, mimicking `execFileSync` psql
  //     seeding): `keepAliveTimeout=5000` -> 10/20 FAILED (50%, `TypeError: fetch failed` /
  //     `ECONNRESET`); `keepAliveTimeout=95000` -> 0/20 FAILED. Across 9 request shapes (GET/HEAD/
  //     POST/PUT/DELETE, with/without body) at n=5 each: 27/45 OK pre-fix -> 45/45 OK post-fix (Fisher
  //     exact p ≈ 2×10⁻⁶ on the aggregate, p ≈ 1×10⁻⁴ on the exact spec shape alone). Two follow-up
  //     hypotheses were tried and BOTH refuted: "undici merely honours the server's advertised
  //     `Keep-Alive: timeout=…` header" (forcing the server to advertise `timeout=60` while actually
  //     closing at 5s did not change the failure rate) and the tidier-looking "undici doesn't retry
  //     non-idempotent requests" (at n=5, `GET` fails too — 3/5 — and bodiless `POST` fails too — 3/5;
  //     there is no method or body discriminator).
  // The real mechanism is simple and CLIENT-AGNOSTIC, not undici-specific: the server destroys the
  // pooled socket at `keepAliveTimeout`; the FIN/RST sits unread in the kernel buffer while the
  // client's event loop is blocked (`execFileSync` here); on unblock, whichever of the client's
  // socket-teardown or dispatch path runs first is a coin-flip — dispatch-first writes to a dead
  // socket, surfacing as `ECONNRESET` (`Error: socket hang up` on Playwright's agent,
  // `TypeError: fetch failed` / `SocketError: other side closed` on undici `fetch`). Any pooled
  // keep-alive client races the same way under a blocked caller event loop; undici is not special. So
  // this fix explains BOTH symptom families — `Error: socket hang up` / `ECONNRESET` (Playwright) AND
  // `TypeError: fetch failed` / `SocketError: other side closed` (undici `fetch`) — closing TD-340
  // ("undici family unattributed"). The retry helpers covering both families are KEPT regardless (see
  // each call site's own in-file rationale), but the motive inverts: no longer a guard against an
  // unidentified cause, they are now belt-and-braces against an infra/proxy-side idle close
  // reproducing the identical cut, and a live, zero-cost regression detector (every retry fires a log
  // line) for this exact, now-fixed defect.
  //
  // Also: the Traefik leg above is a PRODUCTION-only rationale. The sharded E2E lane never routes
  // through Traefik — `docker-compose.e2e-shard.yml` publishes game-back straight to a host port and
  // `traefik/traefik.yml` states the shards "never route through this Traefik" — so it explains zero E2E
  // failures by itself; only the Node-side `keepAliveTimeout` leg (both clients, per above) does.
  //
  // `headersTimeout` must in turn stay ABOVE `keepAliveTimeout` (Node's own stock defaults already
  // respect this ordering, 60000 > 5000) — otherwise a connection reused just inside the keep-alive
  // window could still get cut off waiting on its next request's headers.
  //
  // Both values are read through the tunables registry (Phase-23) rather than a raw `Number(process.env
  // ...)` parse — the repo standard for boot-frozen infra timeouts (`tunables.ts:41-43`,
  // `T.db.pool.idle_timeout_ms`, the closest sibling: same shape, same BOOT-FROZEN posture, single read
  // at boot). `resolveInt` never returns `NaN` (falls back to the default on any unparseable value),
  // closing the silent-disable hole a raw `Number('oops')` parse would open. `TunablesStore.init()` has
  // already run above, so the store is ready before this call.
  server.keepAliveTimeout = TunablesStore.resolveInt('T.http.server.keep_alive_timeout_ms', 'KEEP_ALIVE_TIMEOUT_MS', 95000);
  server.headersTimeout = TunablesStore.resolveInt('T.http.server.headers_timeout_ms', 'HEADERS_TIMEOUT_MS', 96000);

  // eslint-disable-next-line no-console
  console.log(`[game-back] listening on :${port}`);
}

void bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[game-back] bootstrap failed:', err);
  process.exit(1);
});
