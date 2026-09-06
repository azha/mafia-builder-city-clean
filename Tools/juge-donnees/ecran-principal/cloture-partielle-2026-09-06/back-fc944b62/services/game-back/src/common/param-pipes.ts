// IMPLEMENTS: docs/superpowers/specs/2026-08-25-lot0-conventions-design.md §1 D5 (L0.3, « Mécanisme ») +
//             §3 C0/C1.
//             -- Lot 0 "Les conventions", chunk C0 (infrastructure) — 2026-08-26 --
//
// L0.3 (D5) — the ONE mechanism every entry-validation site in this lot uses: any client entry (path
// param, query param, first-level body field, or a structured field's leaf) whose value reaches a TYPED
// column (uuid / int / enum) must render 422 `VALIDATION_FAILED` with `details.param` = the entry's own
// name, NEVER 500 — except the allowlist's 4 entries (D5, 3 criteria), which keep their epingled 404.
//
// WHY NOT Nest's `ParseUUIDPipe`/`ParseIntPipe` (Dv10 — a DEVIATION from `back.md`'s prescription,
// consigned there at G0 closure): `ParseUUIDPipe`/`ParseIntPipe` throw a plain `BadRequestException`
// (HTTP 400), and `codeForHttpStatus(400)` maps to `JSON_PARSE_ERROR` (`error-codes.ts:606-614` — "400 =
// SYNTACTIC failure only", the codebase's OWN decision, reserved for genuine body-parser failures). This
// lot's convention is 422 `VALIDATION_FAILED` (a SEMANTIC failure — a well-formed request breaking a
// business rule), so every pipe/helper here throws `ApiError('VALIDATION_FAILED', …)` directly — NEVER a
// Nest `HttpException` (a `HttpException(400, …)` would silently land on `JSON_PARSE_ERROR` and defeat
// the whole convention without `tsc` ever noticing, since both are perfectly valid Nest exceptions).
// `GlobalExceptionFilter` (`protocol/envelope.interceptor.ts:177-195`) reads an `ApiError`'s `.code`/
// `.details` VERBATIM regardless of where it was thrown — a pipe runs inside the same Nest enhancer
// chain as a handler, so its thrown `ApiError` renders exactly like one thrown from inside a handler
// body (422, from `ERROR_CODES.VALIDATION_FAILED.http_status`, `error-codes.ts:118-121`).
//
// INVENTORY — 10 symbols, exactly (r19/m7 closed the "7 vs +3" ambiguity: ONE list, here):
//   5 Nest PIPES (posed in the decorator — `@Param('id', UuidParam)`, `@Query('pool', EnumQuery(values))`):
//     `UuidParam`, `IntParam`   — for `@Param(...)`: Express guarantees a route param is always PRESENT
//                                 (a non-matching segment 404s before the handler runs), so these two
//                                 never see `undefined`.
//     `UuidQuery`, `IntQuery`, `EnumQuery(values)` — for `@Query(...)`: a query param can legitimately be
//                                 ABSENT (an optional filter). All THREE now treat `undefined` AND a
//                                 blank string (`''`, or whitespace-only, `?x=` / `?x=%20`) IDENTICALLY —
//                                 pass through as `undefined` (r1 M2: a prior draft made `UuidQuery`/
//                                 `EnumQuery` return `''` verbatim on `?x=`, the docstring claimed the
//                                 three were identical, and a live GET on `precursors?building_id=`
//                                 500'd through that gap — closed here). Whether the route then REQUIRES
//                                 the value at all is the handler's own business logic. A value that is
//                                 PRESENT but NOT A STRING (Express turns a repeated key `?x=a&x=b` into
//                                 an ARRAY, and a bracketed key `?x[]=a`/`?x[y]=z` into an ARRAY/OBJECT —
//                                 TypeScript's `string | undefined` parameter type does NOT reflect this
//                                 at runtime) is REJECTED 422 with `details.param`, never silently
//                                 stringified or passed through.
//   5 HELPERS (called manually inside a handler, BEFORE its existing manual validation — D5: "sinon 90
//     des 117 champs continuent de rendre 422 pour un AUTRE champ", i.e. the manual checks that already
//     run must not shadow the pipe's own field-name attribution):
//     `uuidField`, `optionalUuidField`, `uuidArrayField`, `intField`, `enumField`. Each already rejects a
//     non-string value where a string is expected (`isUuid`/`isIntLiteral`/the `values.includes` check
//     are all `typeof … === 'string'`-gated, so a JSON body's own number/array/object/`null` in a string
//     slot 422s the same as a malformed string) — `optionalUuidField` additionally treats a blank string
//     as absent (`undefined`), matching the `*Query` pipes' own rule for OPTIONAL entries.
//
// Every symbol names the OFFENDING FIELD in `details.param` (never the value — R-EH-6/anti-disclosure:
// a rejected value can be echoed in `message`, a dev-facing EN string, but `details.param` is a stable
// field NAME a client can match on, not user input).
//
// r2/MA-2 — CLASS SWEPT ACROSS THE 10 SYMBOLS: "which values does each predicate ADMIT that still reach a
// typed column?" (r1/section-10's own class; r2 found it closed on FORM/blank but NOT on MAGNITUDE):
//   uuid  (UuidParam, UuidQuery, uuidField, optionalUuidField, uuidArrayField) — CLOSED: `UUID_RE` admits
//         only the exact 8-4-4-4-12 hex shape; no magnitude dimension exists for a UUID.
//   enum  (EnumQuery, enumField) — CLOSED: `values.includes(value)` admits only literal members of the
//         closed domain passed in; no magnitude dimension either.
//   int   (IntParam, IntQuery, intField) — 3 SYMBOLS, was OPEN, now BOUNDED: `INT_RE`/`Number.isInteger`
//         admitted any base-10 integer literal/JS number with NO upper/lower bound — measured,
//         `freed_block_id=2147483648` (one past `int4`'s max) reached the DB layer and 500'd while
//         `2147483647` succeeded, and `IntQuery` admitted BOTH before this fix. `checkInt4Bound` (below)
//         now closes this on all 3 `int` symbols (design v21 section-25) — `int4` is the DEFAULT bound,
//         C1 widens it per field for `bigint`-backed columns once its 117-field table exists.

import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

import { ApiError } from '../protocol/api-error';

/** RFC-4122-shaped UUID, any version/variant (this codebase's `uuid` columns are `gen_random_uuid()` —
 *  v4 — but a literal-format check has no reason to pin the version nibble). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A bare (non-negative OR negative) base-10 integer literal — no leading/trailing whitespace, no `.`,
 *  no exponent. Deliberately stricter than `Number.parseInt` (which happily parses `"12abc"` as `12`). */
const INT_RE = /^-?\d+$/;

/** r2/BLOCKING-1(b) — exported (DRY, CLAUDE.md "règles centralisées, jamais répétées"): a value
 *  reaching a `uuid` column OUTSIDE the shared `@Param`/`@Body` helpers (a mid-service check, e.g. an
 *  ownership lookup keyed by a client-controlled ambient value never itself first-level in the body)
 *  still needs the SAME format gate — never a second hand-copied regex. */
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

function isIntLiteral(v: unknown): v is string {
  return typeof v === 'string' && INT_RE.test(v);
}

/** r2/MA-2 — the class INT_RE/isIntLiteral does NOT close: a value that IS a valid integer literal can
 *  still be OUT OF RANGE for the Postgres `integer` (`int4`) column most `int` entries in this codebase
 *  reach (measured: `freed_block_id=2147483648` — one past `int4`'s max — 500s at the DB layer, confirmed
 *  in the container log as Postgres `22003 value "2147483648" is out of range for type integer`;
 *  `2147483647` succeeds). `int4` is the DEFAULT bound for `IntParam`/`IntQuery`/`intField` — C1 widens
 *  it PER FIELD (an explicit wider bound, e.g. `Number.isSafeInteger`) for the columns its own 117-field
 *  table classifies as `bigint`-backed.
 *
 *  r3/MA3-1 — CORRECTED, paraphrased (a prior draft here mis-described the `bigint` population as
 *  columns the client never supplies; that claim was false, measured, and is not repeated verbatim):
 *  measured BY DECLARED COLUMN across `db/schema/**\/*.ts` (`bigint('name'…)`, excluding import lines) —
 *  112 `bigint` columns, of which 28 are NOT a tick/minute counter (20 `*_cents` amounts, 5 game-day
 *  fields, `gameMinute`, `findings_bitmask`, `premium_balance`) — against 206 `integer` columns. TWO
 *  client-supplied body fields already reach a `bigint` column, on FOUR player routes, TODAY — this is
 *  C1's OPPOSABLE STARTING LIST for its own per-field width check, not a hypothetical:
 *    - `insured_value_cents` — `POST /v1/me/insurance/contracts` — `insurance.ts` `bigint(…, { mode:
 *      'bigint' })`, the schema's own comment: "large cash values".
 *    - `amount_cents` — `POST /v1/operational/building/:id/deposit-cash`, `…/withdraw-cash`, and
 *      `POST /v1/operational/laundering/inject` — reaches table `economy_states`.`cash_cents`
 *      (`db/schema/player_economy_state.ts:13-14,22`) / table `money_holding`.`held_cents` (`operational_chain.ts:498-499,504`)
 *      (both `bigint`; r4-C0/m4-2: an earlier revision named the schema FILES as if they were tables).
 *  Defaulting to `int4` (the NARROWEST bound) stays the right choice — a false 422 on these 2 fields is a
 *  cost C1 measures and removes per field (widen to `int8`/`Number.isSafeInteger` once it classifies the
 *  column), never a silent 500 nobody catches — but this default is NOT justified by "the wider columns
 *  are never client-facing": 2 of them already are. */
const INT4_MIN = -2147483648;
const INT4_MAX = 2147483647;

function checkInt4Bound(n: number, field: string): void {
  if (n < INT4_MIN || n > INT4_MAX) {
    rejected(field, `${field} must be an integer between ${INT4_MIN} and ${INT4_MAX} (int4 range — got ${n}).`);
  }
}

/** C1 — the width parameter `intField` is EXTENDED with (D5 Magnitude: "d'un paramètre de largeur, forme
 *  à dire ; jamais un helper `int` parallèle"). `int4` (unchanged, `checkInt4Bound`) stays the DEFAULT —
 *  `IntParam`/`IntQuery` never call this (their population, D5's 13+1 named entries, is exhaustively
 *  `int4`-bound already, checked at C0). Two directions found by C1 reading the 117-field table:
 *  WIDER (`int8`, a body field reaching a `bigint` column — the 2 fields/4 routes D5 names verbatim
 *  above) and, discovered while classifying `execution_window` (`vertical_horizon.ts:85`, `smallint`,
 *  NARROWER than int4 — the same overflow-at-the-DB-layer risk `checkInt4Bound` exists to close, one
 *  size down, undocumented by D5 because C0's own bigint sweep only measured WIDE columns): a
 *  `smallint` column accepts `int4`'s own max (`2147483647`) as a syntactically valid integer literal,
 *  and Postgres' `22003` truncation error at the DB layer is indistinguishable from the bug this whole
 *  mechanism exists to close. `int8` uses `Number.isSafeInteger` (D5's own suggested form) rather than
 *  a literal `2^63` bound — JS numbers lose precision past 2^53, so a literal int8 bound would silently
 *  admit values it cannot represent exactly; every field routed here (cents amounts) is nowhere near
 *  either limit. */
const INT2_MIN = -32768;
const INT2_MAX = 32767;

export type IntFieldWidth = 'int2' | 'int4' | 'int8';

function checkIntWidthBound(n: number, field: string, width: IntFieldWidth): void {
  if (width === 'int2') {
    if (n < INT2_MIN || n > INT2_MAX) {
      rejected(field, `${field} must be an integer between ${INT2_MIN} and ${INT2_MAX} (int2 range — got ${n}).`);
    }
    return;
  }
  if (width === 'int8') {
    if (!Number.isSafeInteger(n)) {
      rejected(field, `${field} must be a safe integer (int8 range — got ${n}).`);
    }
    return;
  }
  checkInt4Bound(n, field);
}

/** A blank string — empty OR whitespace-only (`''`, `' '`, `?x=%20`). NOT blank for anything that isn't
 *  a string (arrays/objects/numbers are handled by `rejectNonString`, never by this). */
function isBlank(v: unknown): boolean {
  return typeof v === 'string' && v.trim() === '';
}

/** r1 M2 — the class this closes: "quelles valeurs le mécanisme laisse-t-il passer que la passe 2 ne
 *  sonde pas ?" Express turns a repeated query key (`?x=a&x=b`) into a `string[]`, and a bracketed key
 *  (`?x[]=a`, `?x[y]=z`) into an array/object — NestJS's `@Query(name)` extraction does not coerce this
 *  to a single string, and the pipe's own TS parameter type (`string | undefined`) does not reflect it
 *  at runtime. Called AFTER the undefined/blank check, so only a genuinely PRESENT, non-blank, non-string
 *  value reaches here. */
function rejectNonString(value: unknown, field: string): asserts value is string {
  if (typeof value === 'string') return;
  const kind = Array.isArray(value) ? 'multiple values (a repeated query key)' : value !== null && typeof value === 'object' ? 'an object (a bracketed query key)' : typeof value;
  rejected(field, `${field} must be a single string value (got ${kind}).`);
}

function paramName(metadata: ArgumentMetadata, fallback: string): string {
  return typeof metadata.data === 'string' && metadata.data.length > 0 ? metadata.data : fallback;
}

function rejected(field: string, message: string): never {
  throw new ApiError('VALIDATION_FAILED', { message, details: { param: field } });
}

// ===================================================================================================
// PIPES — @Param (value always present)
// ===================================================================================================

/** `@Param(name, UuidParam)` — the value MUST be a UUID. Returns it unchanged (string). */
@Injectable()
export class UuidParam implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    const field = paramName(metadata, 'id');
    if (!isUuid(value)) {
      rejected(field, `${field} must be a UUID (got "${String(value)}").`);
    }
    return value;
  }
}

/** `@Param(name, IntParam)` — the value MUST be a bare base-10 integer literal WITHIN `int4` range
 *  (r2/MA-2 — see `checkInt4Bound`); returns it PARSED (number). Precedes, and does NOT replace, any
 *  handler's own NARROWER range check (`1..18`, `1..6` — D5, "IntParam précède les bornes manuelles
 *  existantes… et ne les remplace pas"): this pipe only rejects non-integer garbage and out-of-int4-range
 *  garbage, the handler keeps asserting its own tighter domain. */
@Injectable()
export class IntParam implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const field = paramName(metadata, 'id');
    if (!isIntLiteral(value)) {
      rejected(field, `${field} must be an integer (got "${String(value)}").`);
    }
    const n = Number.parseInt(value, 10);
    checkInt4Bound(n, field);
    return n;
  }
}

// ===================================================================================================
// PIPES — @Query (value may legitimately be absent)
// ===================================================================================================

/** `@Query(name, UuidQuery)` — absent OR blank (`''`, whitespace-only) normalizes to `undefined`
 *  (r1 M2 — matches the other two `*Query` pipes; a prior draft returned `''` verbatim here). A PRESENT,
 *  non-blank value that is NOT a string (an array from a repeated key, an object from a bracketed key)
 *  422s via `rejectNonString`. A PRESENT string must be a UUID. Whether the route REQUIRES the query
 *  param at all is the handler's own business logic (unchanged by this pipe). */
@Injectable()
export class UuidQuery implements PipeTransform<unknown, string | undefined> {
  transform(value: unknown, metadata: ArgumentMetadata): string | undefined {
    if (value === undefined || isBlank(value)) return undefined;
    const field = paramName(metadata, 'query');
    rejectNonString(value, field);
    if (!isUuid(value)) {
      rejected(field, `${field} must be a UUID (got "${value}").`);
    }
    return value;
  }
}

/** `@Query(name, IntQuery)` — absent OR blank (`''`, whitespace-only) normalizes to `undefined` (r1 M2 —
 *  a prior draft only checked `=== ''`, missing whitespace-only like `?x=%20`). A PRESENT, non-blank
 *  value that is NOT a string 422s via `rejectNonString`. A PRESENT string must be a bare integer
 *  literal WITHIN `int4` range (r2/MA-2 — measured: `freed_block_id=2147483648` reached the DB layer and
 *  500'd, `2147483647` succeeded; `IntQuery` admitted BOTH before this fix), returned PARSED (number). */
@Injectable()
export class IntQuery implements PipeTransform<unknown, number | undefined> {
  transform(value: unknown, metadata: ArgumentMetadata): number | undefined {
    if (value === undefined || isBlank(value)) return undefined;
    const field = paramName(metadata, 'query');
    rejectNonString(value, field);
    if (!isIntLiteral(value)) {
      rejected(field, `${field} must be an integer (got "${value}").`);
    }
    const n = Number.parseInt(value, 10);
    checkInt4Bound(n, field);
    return n;
  }
}

/** `@Query(name, EnumQuery(values))` — a FACTORY (unlike the other 4 pipes, this one is parameterized by
 *  the closed domain, e.g. `EnumQuery(lieutenantSourcePg.enumValues)` — NEVER a hand-written literal
 *  list, DF-11: the pgEnum's own `.enumValues` is the single source of truth for its members). Absent OR
 *  blank normalizes to `undefined` (r1 M2, same rule as `UuidQuery`/`IntQuery`); a PRESENT non-string
 *  422s via `rejectNonString`; a PRESENT string must be one of `values`. */
export function EnumQuery(values: readonly string[]): PipeTransform<unknown, string | undefined> {
  @Injectable()
  class EnumQueryPipe implements PipeTransform<unknown, string | undefined> {
    transform(value: unknown, metadata: ArgumentMetadata): string | undefined {
      if (value === undefined || isBlank(value)) return undefined;
      const field = paramName(metadata, 'query');
      rejectNonString(value, field);
      if (!values.includes(value)) {
        rejected(field, `${field} must be one of: ${values.join(' | ')} (got "${value}").`);
      }
      return value;
    }
  }
  return new EnumQueryPipe();
}

// ===================================================================================================
// HELPERS — first-level body fields and structured-field leaves, called manually, BEFORE the handler's
// existing manual validation (D5: otherwise 90 of the 117 body fields keep 422-ing for a DIFFERENT
// field — the existing checks run in some declared order and short-circuit before reaching the field
// these helpers police).
// ===================================================================================================

/** Read `body[field]`, require it to be a UUID string. Returns the value. */
export function uuidField(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (!isUuid(value)) {
    rejected(field, `${field} must be a UUID (got "${String(value)}").`);
  }
  return value;
}

/** Read `body[field]`; `undefined`/`null`/a blank string (`''`, whitespace-only — r1 M2, matching the
 *  `*Query` pipes' own rule for optional entries) all pass through as `undefined` (the field is OPTIONAL
 *  on this body — the handler's own logic decides whether that is acceptable). A PRESENT, non-blank
 *  value must be a UUID (`isUuid` already rejects a non-string — number/array/object — the same way it
 *  rejects a malformed string). */
export function optionalUuidField(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  if (value === undefined || value === null || isBlank(value)) return undefined;
  if (!isUuid(value)) {
    rejected(field, `${field} must be a UUID (got "${String(value)}").`);
  }
  return value;
}

/** Read `body[field]`, require a NON-EMPTY ARRAY of UUID strings (e.g. `building_ids`). Rejects a
 *  non-array value, and — DECISION (r2/m3, written down rather than left latent) — rejects the EMPTY
 *  array `[]` too: measured, the one live consumer of this shape
 *  (`mass-schedule-maintenance {building_ids: []}`) already 422s on empty via its OWN handler-side
 *  manual check ("must be a non-empty array"), and D5's whole point is that the HELPER runs BEFORE that
 *  manual check — if this helper let `[]` through, a FUTURE array field wired without its own guard
 *  would silently accept it. A caller that genuinely wants "empty is valid" does not use this helper
 *  (it reads `body[field]` and checks `Array.isArray` itself). Rejects by the SAME `details.param` =
 *  `field` convention (not a per-element param — the field IS the array). */
export function uuidArrayField(body: Record<string, unknown>, field: string): string[] {
  const value = body[field];
  if (!Array.isArray(value)) {
    rejected(field, `${field} must be an array (got "${String(value)}").`);
  }
  if (value.length === 0) {
    rejected(field, `${field} must be a non-empty array.`);
  }
  for (const el of value) {
    if (!isUuid(el)) {
      rejected(field, `${field} must be an array of UUIDs (got "${String(el)}").`);
    }
  }
  return value as string[];
}

/** r3-C1/MAJOR-2 (D5 v24 "Domaine accepté") — `intField` must neither WIDEN nor NARROW the domain
 *  `main` accepted on a given site, and the two are DIFFERENT wrongs: a BLANKET default that coerces a
 *  string literal WIDENS every site that pre-C1 already rejected a string via its own `typeof !==
 *  'number'` (r2/MAJOR-1, `amount_cents` on 3 money routes) — but REMOVING that coercion outright then
 *  NARROWS every site pre-C1 coerced via a bare `Number(x)` with no type check at all (r3/MAJOR-2,
 *  measured on `de311e06`: `category_id` ×2, `block_id`, `lek_tile_id`, `cargo_grams`, `quantity_units`
 *  — `main` accepted `{"category_id":"3"}`; C1 without this option 422s it, a real narrowing on 6
 *  player routes). `acceptNumericString` restores exactly that domain, POSED PER SITE (never the
 *  default) and CITED at each call site with the `main` evidence that justified it — never chosen for
 *  a NEW site without first checking what `main` did there. Uses the same strict `isIntLiteral` (never
 *  `Number()`'s looser coercion — no `"1e2"`, no leading/trailing whitespace, no hex). */
export interface IntFieldOptions {
  readonly acceptNumericString?: boolean;
}

/** Read `body[field]`, require a `typeof === 'number'` integer WITHIN `width` range (r2/MA-1 — a BODY
 *  helper never widens the domain it validates BY DEFAULT: `IntParam`/`IntQuery` accept a string literal
 *  because an URL segment/query value IS ALWAYS a string at the transport layer — coercing it is the
 *  pipe's whole job. A JSON body field has NO such excuse BY DEFAULT: `{"amount_cents":"12"}` is a
 *  STRING in a slot the schema and every pre-existing manual check (`money-holding.service.ts`'s own
 *  `typeof !== 'number'`) declare NUMBER. `int4` is the DEFAULT bound; C1 (`checkIntWidthBound` above)
 *  passes `'int8'` for the `bigint`-backed fields it names and `'int2'` for `smallint`-backed ones —
 *  NEVER a parallel helper. A float or `NaN` is rejected, never truncated, on EITHER branch. See
 *  `IntFieldOptions.acceptNumericString` above for the ONE opt-in exception, posed per site. */
export function intField(
  body: Record<string, unknown>,
  field: string,
  width: IntFieldWidth = 'int4',
  options?: IntFieldOptions,
): number {
  const value = body[field];
  if (typeof value === 'number' && Number.isInteger(value)) {
    checkIntWidthBound(value, field, width);
    return value;
  }
  if (options?.acceptNumericString && isIntLiteral(value)) {
    const n = Number.parseInt(value, 10);
    checkIntWidthBound(n, field, width);
    return n;
  }
  rejected(field, `${field} must be an integer (got "${String(value)}").`);
}

/** Read `body[field]`, require it to be one of the closed `values` domain. Returns the value. */
export function enumField(values: readonly string[], body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || !values.includes(value)) {
    rejected(field, `${field} must be one of: ${values.join(' | ')} (got "${String(value)}").`);
  }
  return value;
}

/**
 * `rejectUnknownFields(body, allowed, route)` — TD-451. Un champ INCONNU dans un corps de mutation
 * doit rendre **422 `details.param = <le champ>`**, jamais un 200 silencieux.
 *
 * ⛔ POURQUOI CE HELPER EXISTE. Mesuré le 2026-09-02 : `POST /v1/exceptions/:id/resolve` lisait
 * `String(body?.chosen_action_id ?? '')`. Un corps portant `action_id` au lieu de `chosen_action_id`
 * passait donc en **200**, le champ inconnu ignoré, la chaîne vide ne matchant aucune action
 * candidate — et **la carte était consommée sans que rien ne soit enseigné**. Un corps mal formé
 * n'échouait pas : il faisait autre chose, et la réponse ne le disait pas.
 *
 * ⚠️ ACCEPTE L'ABSENCE. Les champs facultatifs sont OMIS par le client Unity, jamais envoyés à
 * `null` (mesuré : `RecruitRequest` / `RecruitRequestWithTarget` sont deux DTO distincts). Ce helper
 * ne vérifie donc QUE la présence d'un champ hors liste — il n'exige jamais qu'un champ soit là.
 */
export function rejectUnknownFields(body: Record<string, unknown> | undefined | null, allowed: readonly string[]): void {
  if (!body || typeof body !== 'object') return; // un corps absent est traité par les champs requis eux-mêmes
  for (const cle of Object.keys(body)) {
    if (!allowed.includes(cle)) {
      rejected(cle, `unknown field '${cle}' (allowed: ${allowed.join(' | ')}).`);
    }
  }
}

/**
 * `stringField(body, field)` — une chaîne NON VIDE, obligatoire. 422 `details.param = field` sinon.
 * Distinct de `uuidField` : tous les identifiants de ce dépôt ne sont pas des uuid (un
 * `chosen_action_id` est un slug d'action, `'pause'`, `'ack'`…).
 */
export function stringField(body: Record<string, unknown>, field: string, maxLen?: number): string {
  const v = body[field];
  if (typeof v !== 'string' || v.trim() === '') {
    rejected(field, `${field} is required and must be a non-empty string.`);
  }
  // ⛔ `maxLen` ferme la classe de TD-420 : une chaîne plus longue que sa colonne `varchar(n)` fait
  //    remonter l'erreur Postgres en `500 INTERNAL_ERROR`, dont le corps ne nomme ni la colonne ni la
  //    longueur — indiagnosticable côté client sans lire les logs du conteneur. Mesuré une première
  //    fois sur `client_version` (TD-420). Le paramètre est OPTIONNEL : les appelants existants sont
  //    inchangés, et celui qui écrit dans une colonne bornée passe sa borne.
  //    ⚠️ La borne se DÉRIVE de la déclaration de la colonne, jamais ne se recopie à la main — une
  //    borne recopiée survit à l'élargissement de sa colonne et se met à refuser du légitime.
  if (maxLen !== undefined && (v as string).length > maxLen) {
    rejected(field, `${field} must be at most ${maxLen} characters.`);
  }
  return v as string;
}

/**
 * `optionalStringField(body, field, maxLen?)` — W1.2-a C3. Same optional-normalization rule as
 * `optionalUuidField` (`undefined`/`null`/blank → `undefined`, the field is OPTIONAL on this body) but
 * for a plain string, not a UUID (e.g. `enforcement_action.ticket_ref` — a free support-ticket
 * reference, not an identifier of any closed domain). A PRESENT, non-blank value must be a string; the
 * SAME TD-420 `maxLen` discipline as `stringField` applies when given (derive from the column
 * declaration, never recopy by hand).
 */
export function optionalStringField(body: Record<string, unknown>, field: string, maxLen?: number): string | undefined {
  const value = body[field];
  if (value === undefined || value === null || isBlank(value)) return undefined;
  if (typeof value !== 'string') {
    rejected(field, `${field} must be a string (got "${String(value)}").`);
  }
  if (maxLen !== undefined && (value as string).length > maxLen) {
    rejected(field, `${field} must be at most ${maxLen} characters.`);
  }
  return value as string;
}
