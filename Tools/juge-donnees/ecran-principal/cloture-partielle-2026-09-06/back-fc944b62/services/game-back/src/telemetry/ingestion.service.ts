// IMPLEMENTS: docs/tech/20_telemetry_analytics/telemetry_principles.md §2.2 (consent gate) + §2.3
//             (PII vs ANONYMOUS) + §2.4 (minimisation / maskPii) ; event_taxonomy.md §2.1 (grammar
//             evt.<domain>.<action>) + §2.2 (naming) ; 26/consent_flows.md §2.4 (ANALYTICS gate,
//             server-authoritative) ; 09/schema_telemetry_event.md §3/§11 (append-only INSERT)
//             -- session:2026-06-02 (Phase 0 Task 9) --
//
// `TelemetryIngestionService` — the PRIMARY ingestion layer (telemetry_principles.md §5 NestJS):
// validate the taxonomy, enforce the consent gate, mask PII, then append-only INSERT.
//
// FLOW (gate BEFORE INSERT — a rejected event writes NO row, append-only):
//   1. taxonomy   — `name` matches `evt.<domain>.<action>`, <domain> ∈ EventDomainEnum (lowercase),
//                   `domain` header ∈ EventDomainEnum, privacy_class ∈ {PII, ANONYMOUS}.
//   2. consent    — a PII event requires the ANALYTICS purpose in the request's consent scope
//                   (26 §2.4 server-authoritative gate). An ANONYMOUS / legitimate-interest event
//                   bypasses the gate (consent_scope may be null).
//   3. maskPii    — strip civil-PII keys from payload (minimisation, ch20 §2.4); bound payload size.
//   4. insert     — append-only via TelemetryEventRepository (occurred_at = server now(), ch13).
//
// CONSENT SEAM (documented): NO account-level consent table exists day-1 (26 ConsentRecord DEFERRED
// → `[à backporter 09]`). The consent scope is carried PER-EVENT on the request (the client declares
// its current scope); we PROJECT it into the `consent_scope` column at ingestion. When ConsentRecord
// lands in 09, this gate reads the persisted current-state instead of trusting the request body.

import { Injectable } from '@nestjs/common';

import { ApiError } from '../protocol/api-error';
import { intField, uuidField } from '../common/param-pipes';
import {
  eventDomain,
  eventPrivacyClass,
  type EventDomainEnumTs,
  type EventPrivacyClassEnumTs,
} from '../db/schema/telemetry_event';
import { telemetryTunables } from './telemetry-tunables';
import { TelemetryEventRepository } from './telemetry-event.repository';

/** The inbound event request (validated manually — the skeleton has no class-validator dep, cf. T6). */
export interface IngestRequest {
  name?: unknown;
  domain?: unknown;
  privacy_class?: unknown;
  schema_version?: unknown;
  player_id?: unknown;
  payload?: unknown;
  /** The client-declared consent scope at emission (consent seam — see header). */
  consent_scope?: unknown;
}

/** The result returned to the controller (→ 202 Accepted + event_id). */
export interface IngestResult {
  event_id: string;
  accepted: true;
}

// `evt.<domain>.<action>` — 3 segments, rigid `evt.` prefix, lowercase snake_case <action>
// (event_taxonomy.md §2.1). <domain> is the lowercase form of an EventDomainEnum member.
const EVENT_NAME_RE = /^evt\.[a-z]+\.[a-z][a-z0-9_]*$/;

// Civil-PII keys that must NEVER appear in a telemetry payload (minimisation, ch20 §2.4: no civil
// identity in an analytic event — email/receipt never appear). The list is a barrier, not exhaustive;
// it is the skeleton expression of the "what we do NOT collect" discipline.
const CIVIL_PII_KEYS: ReadonlySet<string> = new Set([
  'email',
  'phone',
  'full_name',
  'name',
  'first_name',
  'last_name',
  'address',
  'ip',
  'ip_address',
  'receipt',
  'credit_card',
  'ssn',
  'password',
]);

const DOMAIN_VALUES = eventDomain.enumValues as readonly EventDomainEnumTs[];
const PRIVACY_CLASS_VALUES = eventPrivacyClass.enumValues as readonly EventPrivacyClassEnumTs[];

/** r3/MAJOR-1 (D5 v24) — the `>= 1` business rule `intField` never carried (it only bounds int4
 *  WIDTH) and this route's own pre-C1 ternary silently enforced by degrading to 1. A local copy
 *  (mirrors `execution-plan.service.ts`'s own `requirePositiveInt` — not imported, same "a cross-module
 *  dependency for one line of arithmetic" reasoning) — VALIDATION_FAILED + `details.param`, matching
 *  the code family `intField` itself already throws on this same field, not the sibling fields'
 *  `TELEMETRY_EVENT_INVALID` (this clause is a narrower bound ON TOP OF intField's own check, not a
 *  parallel convention). */
function requireSchemaVersionPositive(value: number): number {
  if (value < 1) {
    throw new ApiError('VALIDATION_FAILED', {
      message: `schema_version must be a positive integer, got ${value}.`,
      details: { param: 'schema_version' },
    });
  }
  return value;
}

@Injectable()
export class TelemetryIngestionService {
  constructor(private readonly repo: TelemetryEventRepository) {}

  async ingest(req: IngestRequest): Promise<IngestResult> {
    // --- 1. taxonomy validation (event_taxonomy.md §2.1 + §2.2) ---
    const name = typeof req.name === 'string' ? req.name : '';
    if (!EVENT_NAME_RE.test(name)) {
      throw new ApiError('TELEMETRY_EVENT_INVALID', {
        message: `Event name "${name}" does not match the grammar evt.<domain>.<action>.`,
        details: { field_path: '/name', rule_violated: 'EVENT_NAMESPACE_GRAMMAR' },
      });
    }
    const domain = req.domain;
    if (typeof domain !== 'string' || !DOMAIN_VALUES.includes(domain as EventDomainEnumTs)) {
      throw new ApiError('TELEMETRY_EVENT_INVALID', {
        message: `Unknown event domain "${String(domain)}".`,
        details: { field_path: '/domain', rule_violated: 'UNKNOWN_DOMAIN' },
      });
    }
    // The name's <domain> segment must agree with the declared domain (lowercase EventDomainEnum).
    const nameDomain = name.split('.')[1];
    if (nameDomain !== (domain as string).toLowerCase()) {
      throw new ApiError('TELEMETRY_EVENT_INVALID', {
        message: `Event name domain segment "${nameDomain}" disagrees with domain "${String(domain)}".`,
        details: { field_path: '/name', rule_violated: 'DOMAIN_SEGMENT_MISMATCH' },
      });
    }
    const privacyClass = req.privacy_class;
    if (
      typeof privacyClass !== 'string' ||
      !PRIVACY_CLASS_VALUES.includes(privacyClass as EventPrivacyClassEnumTs)
    ) {
      throw new ApiError('TELEMETRY_EVENT_INVALID', {
        message: `Invalid privacy_class "${String(privacyClass)}" (expected PII | ANONYMOUS).`,
        details: { field_path: '/privacy_class', rule_violated: 'INVALID_PRIVACY_CLASS' },
      });
    }
    const klass = privacyClass as EventPrivacyClassEnumTs;

    // schema_version defaults to 1 (event_taxonomy.md §2.3 — monotone, starts at 1) when ABSENT.
    // r2/BLOCKING-1, then re-wired after r2/(d)+(MAJOR-3) both flagged the first fix (a local bound
    // extension) as invisible to the shared garde: `telemetry_event.schema_version` is `integer`
    // (db/schema/telemetry_event.ts:43, int4) reached UNGUARDED past this route's own "garbage -> 1"
    // ternary — a value one-past int4's max 500'd (Postgres 22003). Converged onto the SAME shared
    // `intField` mechanism as the rest of L0.3 (D5: "the ONE mechanism every entry-validation site in
    // this lot uses"). r3/MAJOR-1 (D5 v24 "un helper précède et ne remplace jamais") — the FIRST version
    // of this fix DROPPED the pre-existing `>= 1` clause instead of preceding it: `intField` only bounds
    // WIDTH (int4 range), so `0`/`-5` (present, in-range, non-positive) passed through and were
    // PERSISTED — measured, `de311e06`'s own ternary coerced BOTH to 1, this lot's first attempt did
    // not. `requireSchemaVersionPositive` restores it, called AFTER `intField` (never replacing it, the
    // exact two-line shape `execution-plan.service.ts:166-167` already uses: `intField(...)` then
    // `requirePositiveInt(...)` — a local copy here, not an import, same reasoning as that file's own
    // "a cross-module dependency for one line of arithmetic" note).
    const schemaVersion = req.schema_version === undefined ? 1 : requireSchemaVersionPositive(intField(req as unknown as Record<string, unknown>, 'schema_version'));

    // --- 2. PII keying (telemetry_principles.md §2.3): PII ⇒ keyed by player_id ; ANONYMOUS ⇒ null ---
    let playerId: string | null = null;
    if (klass === 'PII') {
      // r2/BLOCKING-1(b), then re-wired after r2/(d)+(MAJOR-3): `telemetry_event.player_id` is
      // `uuid('player_id')` (db/schema/telemetry_event.ts:44, FK -> player.player_id). The pre-existing
      // check only asked "is it a non-empty string", never "is it UUID-shaped" — a well-formed-but-
      // non-uuid string reached the INSERT unguarded (Postgres 22P02).
      // r3/m6(a) (D5 v24 "un helper précède") — `uuidField` ran AFTER the manual non-empty check, à
      // rebours of D5's own mandate. Reordered: `uuidField` FIRST. Its own format check (`isUuid`) already
      // rejects `undefined`/blank/non-string exactly like the manual check did — a blank or absent
      // `player_id` still 422s, just via `VALIDATION_FAILED`/`details.param` (uuidField's own shape)
      // instead of `TELEMETRY_EVENT_INVALID` for that ONE degenerate case; no pinned test in
      // tests/e2e/ names that specific code for a missing player_id (checked before this change).
      playerId = uuidField(req as unknown as Record<string, unknown>, 'player_id');
    }
    // ANONYMOUS events carry NO player_id, even if one was sent (telemetry_principles.md §2.3).

    // --- 3. consent gate (26 consent_flows.md §2.4, server-authoritative) ---
    // A PII event requires the ANALYTICS purpose granted in the request's consent scope. An ANONYMOUS
    // / legitimate-interest event bypasses the gate. Gate runs BEFORE INSERT — a rejection writes no row.
    const grantedAnalytics = this.scopeGrantsAnalytics(req.consent_scope);
    let consentScopeProjection: Record<string, unknown> | null = null;
    if (klass === 'PII') {
      if (!grantedAnalytics) {
        throw new ApiError('TELEMETRY_CONSENT_REQUIRED', {
          message: 'PII telemetry requires the ANALYTICS consent purpose, which was not granted.',
          details: { required_purpose: 'ANALYTICS' },
        });
      }
      // Record the consent scope projection AT INGESTION (schema_telemetry_event.md §2 consent_scope:
      // "projection TelemetryConsentScope au moment ingestion"). Shape mirrors TelemetryConsentScope
      // (telemetry_principles.md §7): { required_purpose, enforced_server_side }.
      consentScopeProjection = { required_purpose: 'ANALYTICS', enforced_server_side: true };
    }
    // ANONYMOUS → consent_scope stays null (legitimate-interest event outside the gate, §7).

    // --- 4. maskPii + payload bound (telemetry_principles.md §2.4 minimisation) ---
    const maskedPayload = this.maskPii(req.payload);
    this.assertPayloadWithinBound(maskedPayload);

    // --- 5. append-only INSERT (occurred_at = server now(), ch13 — never client time) ---
    const eventId = await this.repo.insert({
      name,
      domain: domain as EventDomainEnumTs,
      schema_version: schemaVersion,
      player_id: playerId,
      payload: maskedPayload,
      privacy_class: klass,
      consent_scope: consentScopeProjection,
    });
    return { event_id: eventId, accepted: true };
  }

  /**
   * `maskPii` — return a payload with every configured civil-PII key stripped RECURSIVELY, at ANY
   * depth (minimisation, ch20 §2.4). The barrier descends into nested objects AND arrays, so a
   * leaked `{ context: { user_email } }` or `items: [{ phone }]` is stripped too — not only the top
   * level. This matters because `telemetry_event` is append-only / immutable (UPDATE/DELETE REVOKEd;
   * app_rw INSERT-only): any nested PII that slips through can NEVER be deleted afterwards.
   *
   * The skeleton STRIPS (not rejects) so a well-meaning client that over-sends doesn't lose the
   * event; the resulting payload is guaranteed free of the configured PII KEYS before INSERT.
   *
   * This remains a DEFENCE-IN-DEPTH BACKSTOP keyed on a NAME list (`CIVIL_PII_KEYS`): it strips keys
   * whose NAME matches, but it does NOT detect PII by value/pattern (e.g. an email sitting under an
   * innocuous key like `note` is not caught). The PRIMARY control stays the client contract +
   * minimisation discipline (ch20 §2.4: "what we do NOT collect") + the PII/ANONYMOUS privacy_class.
   * The key list is a barrier, not an exhaustive PII taxonomy.
   *
   * Non-object payloads (null, arrays, primitives) collapse to `{}` at the top level — the column
   * always holds a JSON object.
   */
  maskPii(payload: unknown): Record<string, unknown> {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }
    return this.stripPiiFromObject(payload as Record<string, unknown>, 0);
  }

  // Guard against pathological nesting (cyclic-ish / adversarially deep payloads): values deeper
  // than this are passed through as-is rather than recursed into. The byte-bound check
  // (assertPayloadWithinBound) is the real size guard; this just keeps the strip from blowing the
  // stack. Generous enough that no legitimate telemetry payload is affected.
  private static readonly MAX_PII_STRIP_DEPTH = 32;

  /** Recursively strip configured PII keys from a plain object, descending into nested objects/arrays. */
  private stripPiiFromObject(obj: Record<string, unknown>, depth: number): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (CIVIL_PII_KEYS.has(key.toLowerCase())) {
        continue; // drop civil-PII keys at ANY depth — never persisted (minimisation)
      }
      out[key] = this.stripPiiFromValue(value, depth);
    }
    return out;
  }

  /** Strip PII recursively from an arbitrary value (object → recurse, array → map, else pass through). */
  private stripPiiFromValue(value: unknown, depth: number): unknown {
    if (value === null || typeof value !== 'object' || depth >= TelemetryIngestionService.MAX_PII_STRIP_DEPTH) {
      return value; // primitive, null, or too-deep — pass through unchanged
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.stripPiiFromValue(item, depth + 1));
    }
    return this.stripPiiFromObject(value as Record<string, unknown>, depth + 1);
  }

  /** Bound the serialized payload by `T.telemetry.event_payload_max_bytes` (R2.3, schema §2). */
  private assertPayloadWithinBound(payload: Record<string, unknown>): void {
    const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
    if (bytes > telemetryTunables.eventPayloadMaxBytes) {
      throw new ApiError('TELEMETRY_EVENT_INVALID', {
        message: `Payload (${bytes} bytes) exceeds T.telemetry.event_payload_max_bytes (${telemetryTunables.eventPayloadMaxBytes}).`,
        details: { field_path: '/payload', rule_violated: 'PAYLOAD_TOO_LARGE' },
      });
    }
  }

  /**
   * Read the request consent scope and decide whether the ANALYTICS purpose is granted. The seam
   * accepts the skeleton shape `{ granted_purposes: string[] }` (the client declares its current
   * scope). When ConsentRecord lands in 09, this reads the persisted current-state instead.
   */
  private scopeGrantsAnalytics(scope: unknown): boolean {
    if (scope === null || typeof scope !== 'object') {
      return false;
    }
    const granted = (scope as { granted_purposes?: unknown }).granted_purposes;
    return Array.isArray(granted) && granted.includes('ANALYTICS');
  }
}
