// IMPLEMENTS: docs/tech/18_api_protocol/error_handling.md §Catalogue des error.code
//             + §Mapping error.code → user_facing_i18n_key + §Retry semantics
//             -- session:2026-06-02 (Phase 0 Task 5) --
//
// Canonical error.code registry. 18 §Catalogue states the codes live in a
// declarative `error_codes.json` (loaded at boot of the api-protocol module);
// `T.api.error_codes_registry_ref` (18 §Tunables) points at the source. Here it
// is materialized as a typed TS const so the GlobalExceptionFilter can map a
// code → { http_status, user_facing_i18n_key, retryable_class } WITHOUT inlining
// magic numbers per call-site. Codes are SCREAMING_SNAKE_CASE and stable
// cross-version (R-EH-3); the i18n key namespace is `error.<family>.<short_label>`
// (18 §Mapping). The back NEVER translates — it only emits the key (R-EH-2).
//
// Phase 0 materializes the subset emitted by THIS layer (envelope, idempotency,
// versioning, generic infra). Auth/RBAC/rate-limit codes (AUTH_*, AUTHZ_*,
// RATE_LIMIT_*) land with chunks 17 / 7 (Task 6+) — listed here additively as
// they are wired, never renamed (R-EH-3).

import type { RetryableClass } from './envelope';

export interface ErrorCodeSpec {
  /** HTTP status that mirrors this code (18 §Taxonomie HTTP). */
  http_status: number;
  /** `error.<family>.<short_label>` i18n key (18 §Mapping). */
  user_facing_i18n_key: string;
  /** retry policy class — the client never invents it (R-EH-5). */
  retryable_class: RetryableClass;
}

/**
 * The canonical catalogue. Keys are the `error.code` (SCREAMING_SNAKE_CASE).
 * HTTP statuses + retryable_class are taken VERBATIM from
 * error_handling.md §Taxonomie HTTP + §Catalogue des error.code.
 */
export const ERROR_CODES = {
  // --- ENVELOPE_* (18/envelope_format.md) ---
  ENVELOPE_REQUEST_ID_MISSING: {
    http_status: 400,
    user_facing_i18n_key: 'error.envelope.request_id_missing',
    retryable_class: 'NEVER',
  },
  JSON_PARSE_ERROR: {
    http_status: 400,
    user_facing_i18n_key: 'error.envelope.json_parse_error',
    retryable_class: 'NEVER',
  },
  PAYLOAD_TOO_LARGE: {
    http_status: 413,
    user_facing_i18n_key: 'error.envelope.payload_too_large',
    retryable_class: 'NEVER',
  },

  // --- IDEMPOTENCY_* (18/idempotency.md) ---
  IDEMPOTENCY_KEY_MISSING: {
    http_status: 428,
    user_facing_i18n_key: 'error.idempotency.key_missing',
    retryable_class: 'NEVER',
  },
  IDEMPOTENCY_KEY_FORMAT_INVALID: {
    http_status: 400,
    user_facing_i18n_key: 'error.idempotency.key_format_invalid',
    retryable_class: 'NEVER',
  },
  IDEMPOTENCY_KEY_CONFLICT: {
    http_status: 409,
    user_facing_i18n_key: 'error.idempotency.key_conflict',
    retryable_class: 'NEVER',
  },
  IDEMPOTENCY_REQUEST_IN_FLIGHT: {
    http_status: 409,
    user_facing_i18n_key: 'error.idempotency.request_in_flight',
    retryable_class: 'AFTER_DELAY',
  },
  IDEMPOTENCY_REPLAY_MISMATCH: {
    http_status: 403,
    user_facing_i18n_key: 'error.idempotency.replay_mismatch',
    retryable_class: 'NEVER',
  },

  // --- API_VERSION_* (18/versioning_strategy.md) ---
  API_VERSION_SUNSET: {
    http_status: 410,
    user_facing_i18n_key: 'error.api_version.sunset',
    retryable_class: 'NEVER',
  },
  CLIENT_BUILD_TOO_OLD: {
    http_status: 426,
    user_facing_i18n_key: 'error.client.build_too_old',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- generic (18 §Catalogue: source chunk = générique) ---
  // Payment barrier: the player has insufficient cash to cover a mandatory per-case fee
  // (Tier-2/3 lawyer hire — LawyerService.hire, 04d-A C5).
  // Pattern: contract.service.ts:324-334 (insurance LAPSED debit — ancre re-vérifiée 2026-08-13,
  // re-revue ⊥ MINOR-2 : le lot a déplacé les lignes sans reporter l'ancre). 402 = "payment needed
  // before retrying" (AFTER_USER_ACTION: top up wallet then retry).
  PAYMENT_REQUIRED: {
    http_status: 402,
    user_facing_i18n_key: 'error.payment.required',
    retryable_class: 'AFTER_USER_ACTION',
  },
  RESOURCE_NOT_FOUND: {
    http_status: 404,
    user_facing_i18n_key: 'error.resource.not_found',
    retryable_class: 'NEVER',
  },
  RESOURCE_STATE_CONFLICT: {
    http_status: 409,
    user_facing_i18n_key: 'error.resource.state_conflict',
    retryable_class: 'AFTER_USER_ACTION',
  },
  HTTP_METHOD_NOT_ALLOWED: {
    http_status: 405,
    user_facing_i18n_key: 'error.http.method_not_allowed',
    retryable_class: 'NEVER',
  },
  VALIDATION_FAILED: {
    http_status: 422,
    user_facing_i18n_key: 'error.validation.failed',
    retryable_class: 'AFTER_USER_ACTION',
  },
  INTERNAL_ERROR: {
    http_status: 500,
    user_facing_i18n_key: 'error.internal.unexpected',
    retryable_class: 'AFTER_DELAY',
  },

  // --- AUTH_* (17, Task 6 — added additively; lot-2 splits the collapsed placeholder codes) ---
  // R-AF-1: sign-in NEVER distinguishes "unknown email" vs "wrong password" — both map to
  // this single generic credential-failure code (401). The dev-facing `message` may differ
  // for logs, but `code` + `user_facing_i18n_key` are identical for every credential failure.
  AUTH_INVALID_CREDENTIALS: {
    http_status: 401,
    user_facing_i18n_key: 'error.auth.invalid_credentials',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // Bearer token absent from the request (no Authorization header / non-Bearer scheme). 401.
  // error_handling.md §Catalogue line 121 (VERBATIM name). lot-2: materialized (pre-release split).
  AUTH_TOKEN_MISSING: {
    http_status: 401,
    user_facing_i18n_key: 'error.auth.token_missing',
    retryable_class: 'AFTER_REFRESH',
  },
  // Bearer token present but expired (`exp` in the past). 401.
  // error_handling.md §Catalogue line 122 (VERBATIM name). lot-2: materialized (pre-release split).
  // i18n key 'error.auth.session_expired' is the canon example (error_handling.md §Mapping line 167).
  AUTH_TOKEN_EXPIRED: {
    http_status: 401,
    user_facing_i18n_key: 'error.auth.session_expired',
    retryable_class: 'AFTER_REFRESH',
  },
  // Bearer token present and non-expired but signature/alg/iss/structure invalid. 401.
  // error_handling.md §Catalogue line 123 (VERBATIM name). lot-2: materialized (pre-release split).
  // Also covers wrong-audience on the PLAYER surface (token not valid HERE — "I don't know who
  // you are" — stays 401, error_handling.md §401 vs 403). Maps `bad_iss` → this code (no AUTH_*_ISS).
  AUTH_TOKEN_INVALID_SIGNATURE: {
    http_status: 401,
    user_facing_i18n_key: 'error.auth.token_invalid_signature',
    retryable_class: 'AFTER_REFRESH',
  },
  // Authenticated (valid token) but wrong audience on a STAFF surface — valid token, wrong
  // surface. 403 (I know who you are, you're just not allowed here). lot-2 materialized (pre-release rename).
  // error_handling.md §Catalogue line 124 (VERBATIM name).
  AUTHZ_AUDIENCE_MISMATCH: {
    http_status: 403,
    user_facing_i18n_key: 'error.authz.audience_mismatch',
    retryable_class: 'NEVER',
  },
  // Authenticated (valid token) but insufficient kind/role for this surface. 403.
  // error_handling.md §Catalogue line 125 (VERBATIM name). Covers not-STAFF + below-min-role
  // (staff-role.guard.ts) AND, since W0.3b R-SA-3 bound (§8.8), not-PLAYER on the player surface
  // (jwt-auth.guard.ts) — the mirror-image account-kind mismatch.
  AUTHZ_PERMISSION_DENIED: {
    http_status: 403,
    user_facing_i18n_key: 'error.authz.permission_denied',
    retryable_class: 'NEVER',
  },
  SERVICE_UNAVAILABLE_MAINTENANCE: {
    http_status: 503,
    user_facing_i18n_key: 'error.service.maintenance',
    retryable_class: 'AFTER_DELAY',
  },
  // --- ACCOUNT_* lifecycle gating (17/authentication_flows.md §Flow — sign-in step 4) ---
  // These codes are emitted ONLY after a SUCCESSFUL password verify on a RESOLVED account
  // (i.e. R-AF-1 is NOT violated — the credential path still returns AUTH_INVALID_CREDENTIALS
  // for unknown identifier and wrong password). Only the three non-ACTIVE lifecycle states
  // that have been fully resolved get targeted codes (authentication_flows.md line 100:
  //   lifecycle_state ∈ {SUSPENDED, BANNED, DELETED_TOMBSTONE} → keys `auth.signin.error.*`).
  // SUSPENDED — account exists + identity resolved, but access is temporarily revoked. 403
  // (I know who you are, you're not allowed in right now — "AFTER_USER_ACTION" to reach support).
  ACCOUNT_SUSPENDED: {
    http_status: 403,
    user_facing_i18n_key: 'error.auth.account_suspended',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // BANNED — account exists + identity resolved, but access is permanently revoked. 403.
  ACCOUNT_BANNED: {
    http_status: 403,
    user_facing_i18n_key: 'error.auth.account_banned',
    retryable_class: 'NEVER',
  },
  // DELETED_TOMBSTONE — account soft-deleted (tombstoned). From the client's perspective the
  // account no longer exists → 404. i18n key `auth.signin.error.not_found` per spec line 100.
  ACCOUNT_NOT_FOUND: {
    http_status: 404,
    user_facing_i18n_key: 'error.auth.account_not_found',
    retryable_class: 'NEVER',
  },

  // --- SIGNUP_* (17, W1.0 — POST /v1/auth/signup) ---
  // Question 1 (design 2026-08-07-w1.0-signup-design.md §7): the callsign is diégétique PUBLIC
  // (player_search_and_detail_shell.md:129 classes it explicitly "NON sensible") — telling the
  // client it is already taken reveals nothing a player search does not already reveal. Contrast
  // the email path (Invariant 2 / R-AF-1 anti-enumeration): a taken email NEVER gets a distinct
  // code — signup.service silently drops the email and still creates the account (201).
  SIGNUP_CALLSIGN_TAKEN: {
    http_status: 409,
    user_facing_i18n_key: 'error.signup.callsign_taken',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- AUTH_REFRESH_* (17, lot-5 TD-001a — refresh handle rotation) ---
  // Presented refresh handle not found, already consumed, or hash mismatch. 401.
  // (session_management.md §Rotation step 2: "Si introuvable, expiré, déjà consommé → 401".)
  AUTH_REFRESH_INVALID: {
    http_status: 401,
    user_facing_i18n_key: 'error.auth.refresh_invalid',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // Refresh handle TTL elapsed (refresh_expires_at in the past). 401.
  AUTH_REFRESH_EXPIRED: {
    http_status: 401,
    user_facing_i18n_key: 'error.auth.refresh_expired',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- TELEMETRY_* (20 telemetry + 26 consent — Phase 0 Task 9; additive, never renamed R-EH-3) ---
  // Consent gate (26 consent_flows.md §2.4): a PII-class telemetry event whose request scope does
  // NOT grant the ANALYTICS purpose is REJECTED before any INSERT (no row written, append-only). 403
  // (authenticated/identified but the processing is not permitted under the declared consent) —
  // the player withholds the optional analytics consent (Art.6(1)(a)). NEVER (no client retry can fix
  // it without the player granting consent first → AFTER_USER_ACTION).
  TELEMETRY_CONSENT_REQUIRED: {
    http_status: 403,
    user_facing_i18n_key: 'error.telemetry.consent_required',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // Taxonomy / shape failure (20 event_taxonomy.md §2.1 grammar `evt.<domain>.<action>` + §2.4 lint;
  // 20 telemetry_principles.md §2.4 minimisation): a malformed event name, an unknown domain, a bad
  // privacy_class, or civil PII smuggled into the payload. 422 (well-formed JSON, semantic rule break).
  TELEMETRY_EVENT_INVALID: {
    http_status: 422,
    user_facing_i18n_key: 'error.telemetry.event_invalid',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- CORE_LOOPS_* (05, P3-A C5 — Loop 10 `StructuralDecisionGovernorService.commit`) ---
  // The ONE-decision-per-session structural cap is exhausted for the player's ACTIVE session (D8/D9 —
  // session-scoped enforcement; a sessionless commit never reaches this code, D9 pass-through). The
  // canon message ("Structural decisions exhausted for this session. Return in next session.") is a
  // STATE description, never a countdown (D12 anti-pattern wall) — the retry scope is carried
  // qualitatively via `payload_vars.retry_scope: 'next_session'`, never a numeric ETA/timer.
  STRUCTURAL_CAP_EXHAUSTED: {
    http_status: 409,
    user_facing_i18n_key: 'error.core_loops.structural_cap_exhausted',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- SUPPLY_CHAIN_* (05, P3-C C4 — Loop 5 Mycelial Ledger maintenance verb) ---
  // I3 (design §15): the leg already has an active maintenance job (`maintenance_mode IS NOT NULL`) —
  // the atomic claim `UPDATE ... WHERE maintenance_mode IS NULL RETURNING` matched 0 rows. A STATE
  // description (the job IS running, or the leg IS resting) — never a countdown; the player retries
  // once the OTHER job completes or (REROUTE_BYPASS) the leg's debt decays to the resume threshold, so
  // this resolves on its own without any user action being required (AFTER_DELAY, the SAME class
  // `IDEMPOTENCY_REQUEST_IN_FLIGHT` uses for its own "busy now, will clear" 409).
  MAINTENANCE_IN_PROGRESS: {
    http_status: 409,
    user_facing_i18n_key: 'error.supply_chain.maintenance_in_progress',
    retryable_class: 'AFTER_DELAY',
  },
  // A dispatch was attempted on a (origin, destination) pair whose leg is currently `bypassed`
  // (REROUTE_BYPASS — design §5.4: "leg resting"). State-not-timer (sub-décision #10): resolves itself
  // once the leg's decaying debt_load crosses `mycelial_bypass_resume_threshold`, never a fixed ETA.
  LEG_RESTING: {
    http_status: 409,
    user_facing_i18n_key: 'error.supply_chain.leg_resting',
    retryable_class: 'AFTER_DELAY',
  },
  // P3-C C6 — Loop 3 Backpressure Trace `resolve` verb (design §6.3: "À la source"). The queried building
  // is not CURRENTLY a diagnosed blocked-output source (`is_blocked_output = false`) — resolve only makes
  // sense once the hop-by-hop trace has actually reached the source. A STATE description (the building
  // may become a source again on a later tick, or the trace may not yet be at_source) — resolves itself
  // without user action once the condition changes (AFTER_DELAY, the SAME class `MAINTENANCE_IN_PROGRESS`
  // uses for its own "not now, will clear on its own" 409).
  TRACE_NOT_AT_SOURCE: {
    http_status: 409,
    user_facing_i18n_key: 'error.supply_chain.trace_not_at_source',
    retryable_class: 'AFTER_DELAY',
  },
  // --- SINUOSITY_* (05, P3-C C7 — Loop 4 Sinuosity Debt: saved-route dents + rebuild) ---
  // I7 (design §15/§7.5): a dispatch consumed a `savedRouteId` whose route is CURRENTLY inside its
  // rebuild downtime window (`rebuild_completes_at_tick` armed and not yet elapsed, design §7.4's 12-tick
  // downtime). A STATE description (the downtime elapses on its own, no user action required) — the
  // SAME class MAINTENANCE_IN_PROGRESS/LEG_RESTING use for their own "busy now, will clear" 409.
  ROUTE_REBUILDING: {
    http_status: 409,
    user_facing_i18n_key: 'error.sinuosity.route_rebuilding',
    retryable_class: 'AFTER_DELAY',
  },
  // I7 (design §7.4): the rebuild verb's OWN atomic claim (`UPDATE ... WHERE rebuild_completes_at_tick
  // IS NULL RETURNING`) matched 0 rows — a rebuild is ALREADY in flight on this route (a concurrent
  // racer, or an earlier rebuild whose downtime has not yet elapsed). Resolves on its own once the
  // in-flight rebuild's downtime elapses (AFTER_DELAY, the SAME class MAINTENANCE_IN_PROGRESS uses).
  REBUILD_IN_PROGRESS: {
    http_status: 409,
    user_facing_i18n_key: 'error.sinuosity.rebuild_in_progress',
    retryable_class: 'AFTER_DELAY',
  },
  // I8 (design §7.5 anti-bypass): `createRoute` on a (player, origin, dest) triple that ALREADY has a
  // `severed` saved route, or `deleteRoute`/dispatch on a `severed` saved route itself — the ONLY exit
  // from a severed route is one of the 3 paid rebuild modes (MINIMAL_REROUTE is cheap — never a dead
  // end). AFTER_USER_ACTION: the player must choose + pay for a rebuild before retrying (never resolves
  // on its own — the opposite retry semantics of ROUTE_REBUILDING/REBUILD_IN_PROGRESS above).
  REBUILD_REQUIRED: {
    http_status: 409,
    user_facing_i18n_key: 'error.sinuosity.rebuild_required',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- CUE_STACK_* (05, P3-D C2 — Loop 6 Cue Stack lifecycle: compose/reorder/commit) ---
  // A compose payload names a RESERVED-INERT `SlotType` (design §5.1 — `STASH_CONSOLIDATION`/
  // `INSPECTION_RESPONSE`/`LAUNDERING_INJECTION`: present in the closed 7-member domain, but no LIVE
  // verb backs them on this base — decisions §0 row 16). 422 (well-formed payload, semantic rule break):
  // never committable, never a silent no-op. AFTER_USER_ACTION: the player must pick a LIVE slot type.
  SLOT_TYPE_RESERVED: {
    http_status: 422,
    user_facing_i18n_key: 'error.cue_stack.slot_type_reserved',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // A compose/reorder payload's intra-stack `dependencies` graph contains a cycle (design §4.3 — deps
  // must be acyclic AND reference slot_ids present in the SAME payload). 422 — the player must fix their
  // own drag-reorder graph before compose can succeed.
  CUE_STACK_DEPENDENCY_CYCLE: {
    http_status: 422,
    user_facing_i18n_key: 'error.cue_stack.dependency_cycle',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // A slot's `target_ref` does not resolve to an existing, player-owned, currently-actionable entity of
  // the expected kind (design §5.1 — "target_ref existant et actionnable par le validateur de l'executor").
  // 422 — the player must retarget the slot (e.g. a route that was since deleted, a candidate that was
  // since hired by someone else's quest, a building no longer owned).
  CUE_STACK_SLOT_TARGET_INVALID: {
    http_status: 422,
    user_facing_i18n_key: 'error.cue_stack.slot_target_invalid',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // I1 (design §4.1): compose was attempted while the player's ONE non-terminal stack is already
  // COMMITTED/EXECUTING (not PENDING) — the partial-unique-index conflict target matched, but the
  // DO-UPDATE's own `WHERE state='pending'` guard refused the write (cue-stack.repository.ts#
  // composeUpsert). A STATE description (the stack will return to composable once it resolves) —
  // AFTER_DELAY, the SAME class MAINTENANCE_IN_PROGRESS/LEG_RESTING use for "busy now, will clear".
  CUE_STACK_ALREADY_ACTIVE: {
    http_status: 409,
    user_facing_i18n_key: 'error.cue_stack.already_active',
    retryable_class: 'AFTER_DELAY',
  },
  // I7 (P3-D C7, design §10.2, ruling #8): commit targets ≥1 building CURRENTLY actively settling (Loop 7
  // Annealing Window) and the request did NOT carry `acknowledge_compounding: true` — the anti-rapid-fire
  // guard (canon `annealing_window.md:146`: "prevents rapid-fire ... warning + confirm/cancel", the 409-
  // unless-ack IS the server-side confirm/cancel). `details.settling` carries BANDS ONLY (never the raw
  // `settling_ends_at`/remaining minutes — R2.2/P5, leak-scanned). AFTER_USER_ACTION: the player must
  // resend the SAME commit with `acknowledge_compounding: true` to proceed (the commit THEN applies the
  // compounding exactly once, I7 — never resolves on its own like the AFTER_DELAY codes above).
  SETTLING_COMPOUND_REQUIRED: {
    http_status: 409,
    user_facing_i18n_key: 'error.cue_stack.settling_compound_required',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- NAMED_SEQUENCE_* (05, P3-D C5 — Loop 6 Named Sequences: save/list/apply) — ADDITIVE ---
  // I4 (design §8, decisions D7): the DB-atomic cap-5 arbiter (`INSERT … SELECT … WHERE count(*) <
  // cap`, `named-sequence.repository.ts#saveAtomic`) refused the save — the player already has
  // `cueStackNamedSequencesMax` saved templates. 409 (a STATE description — deleting an existing
  // template, once that verb exists, would clear it; today AFTER_USER_ACTION means "pick a different
  // save slot", the CUE_STACK_ALREADY_ACTIVE 409-shape precedent just above).
  NAMED_SEQUENCE_CAP_REACHED: {
    http_status: 409,
    user_facing_i18n_key: 'error.named_sequence.cap_reached',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // D7 (`named_sequences_player_name_unique`, mig 0129): a save under a `name` this player already has
  // saved. 409 — never a silent overwrite (the SAME real DB UNIQUE constraint the C1 schema-migration
  // spec already proves bites at the raw-SQL level; this code is the app-facing mirror of it).
  NAMED_SEQUENCE_NAME_TAKEN: {
    http_status: 409,
    user_facing_i18n_key: 'error.named_sequence.name_taken',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // Sub-décision #2(a) (decisions §6.2, design §8): the whole Loop 6 named-sequences surface
  // (save/list/apply) is gated on the LIVE Phase-17 `rule_vocabulary_tier >= 2` meta-progression gate
  // (`ProgressionRepository.getProgression` REUSE — the same read `ProgressionService.onResolution`
  // uses). 403 — authenticated, just not unlocked yet (the AUTHZ_PERMISSION_DENIED 403-shape
  // precedent); qualitative only (R2.2 — the `details` payload mirrors EXACTLY what `GET /v1/progression`
  // already exposes to this SAME player: `vocabulary_tier` + `progress_to_next`, never a NEW raw K/N leak).
  NAMED_SEQUENCE_UNLOCK_REQUIRED: {
    http_status: 403,
    user_facing_i18n_key: 'error.named_sequence.unlock_required',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- DEMOLITION_* (05, P3-E C4 — Loop 8 decommission verb: POST /v1/friction/nodes/:id/decommission) — ADDITIVE ---
  // Design §6.2 verbatim: "Lieutenant assigné au building → 409 `LIEUTENANT_ASSIGNED`" (D7 — no
  // auto-unassign; the player must reassign the lieutenant elsewhere FIRST, a real decision, before the
  // decommission can proceed). AFTER_USER_ACTION: never resolves on its own.
  LIEUTENANT_ASSIGNED: {
    http_status: 409,
    user_facing_i18n_key: 'error.demolition.lieutenant_assigned',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // Design §6.2 verbatim: "Dernier node possédé (`friction_org_size == 1`) → 409 `LAST_NODE`" (D8 — a
  // 0-node org is a degenerate state with no v1 rattrapage; decommissioning the player's LAST node in
  // the ★#1 friction perimeter is refused, even though the block itself remains re-purchasable later).
  LAST_NODE: {
    http_status: 409,
    user_facing_i18n_key: 'error.demolition.last_node',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // Design §6.1 step 2: "la confirmation est portée par le client ... l'API exige le flag explicite,
  // 422 sinon" — a well-formed request missing `{confirm: true}` is a SEMANTIC failure (422, not a
  // syntactic 400): the player must resend with the flag before the decommission can proceed.
  DEMOLITION_CONFIRM_REQUIRED: {
    http_status: 422,
    user_facing_i18n_key: 'error.demolition.confirm_required',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // P3-E C5 (design §7/I9 — POST /v1/friction/replacement-options/:id/pick): the option EXISTS for this
  // player (404 RESOURCE_NOT_FOUND otherwise) but the I9 guarded close matched 0 rows for it — already
  // picked, already expired, or closed as the LOSER of a concurrent sibling pick. AFTER_USER_ACTION: the
  // player can pick a DIFFERENT still-open option, or nothing at all (★#5 — picking is optional).
  REPLACEMENT_OPTION_ALREADY_CLOSED: {
    http_status: 409,
    user_facing_i18n_key: 'error.demolition.replacement_option_already_closed',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- COMPRESSION_* (05, P3-E C6 — Loop 9 defer verb: POST /v1/compression/defer) — ADDITIVE ---
  // Design §9.2 verbatim: "2e defer → 409 (I6 — 2e defer même cycle)" — the single-use deferral
  // (`compression_events.deferral_count <= 1`, ★#5) already spent this cycle, OR no non-terminal cycle
  // is open at all for this player. AFTER_USER_ACTION: the player cannot retry this exact call; they can
  // only wait for the NEXT compression cycle.
  DEFERRAL_EXHAUSTED: {
    http_status: 409,
    user_facing_i18n_key: 'error.compression.deferral_exhausted',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // Design §9.2 verbatim: "Refusé si stress ≥ compression_force_engagement_threshold (95) → 409
  // FORCED_ENGAGEMENT" — past this stress, the org can no longer buy more time; the cycle proceeds to
  // forced engagement instead (C7). AFTER_USER_ACTION: no retry of THIS call resolves it.
  FORCED_ENGAGEMENT: {
    http_status: 409,
    user_facing_i18n_key: 'error.compression.forced_engagement',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- COMPRESSION_* (05, P3-E C7 — Loop 9 board: POST /v1/compression/board/problems/:id/decide) — ADDITIVE ---
  // Design §10.2 verbatim (I7): "décision concurrente n°6 → exactement 5 passent" — the guarded
  // `decisions_used < decisions_budget` UPDATE matched 0 rows: THIS cycle's budget (5 default) is fully
  // spent. AFTER_USER_ACTION: no retry resolves it — the player must wait for the board to finalize and
  // the NEXT cycle to open.
  COMPRESSION_BUDGET_EXHAUSTED: {
    http_status: 409,
    user_facing_i18n_key: 'error.compression.budget_exhausted',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- META_PROGRESSION_* (06, P3-F C6 — CategoryDelegationGuard surface retirement) — ADDITIVE ---
  // Design D6/§8.3: a mutating call on a LIVE category's guard site while that (player, category) row is
  // `DELEGATED` (or the dormant `RETIRED`) — the category's direct player surface is retired for as long
  // as a lieutenant runs it. A STATE description (the lieutenant ref + the successor pointer), NEVER a
  // countdown (D12 anti-pattern wall — the SAME wall STRUCTURAL_CAP_EXHAUSTED honors above): the player
  // must RECALL the category (a genuine, deliberate structural decision, C8) before this clears — it never
  // resolves "on its own" the way an AFTER_DELAY code does (mirrors LIEUTENANT_ASSIGNED/REBUILD_REQUIRED's
  // own "never resolves without a user action" classification).
  CATEGORY_DELEGATED: {
    http_status: 409,
    user_facing_i18n_key: 'error.meta_progression.category_delegated',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- META_PROGRESSION_* (06, P3-G C3 — Possibility Horizon feed lifecycle) — ADDITIVE ---
  // Design D8 (self-brick guard): `POST /v1/meta/horizon-feed/:cardId/dismiss` on a card whose
  // capability is NOT `dismissible` (the catalogue's own `dismissible: boolean` — the v1 LIVE set, the 4
  // VOCAB_TIER_* capabilities, is ENTIRELY non-dismissible: dismissing T3 would permanently dead-end
  // T4-6 under the strict tier sequence, a self-brick canon cannot have intended). 409 — a STATE
  // description (this capability's catalogue row), never resolves on its own (AFTER_USER_ACTION would be
  // wrong too — there is no user action that changes a catalogue-level fact); NEVER (no retry, ever,
  // for this exact card/capability pair — the closest existing class is `LAST_NODE`'s own permanent-
  // refusal shape, but that resolves via a DIFFERENT action; here nothing resolves it client-side at
  // all, so NEVER is the honest classification).
  CAPABILITY_NOT_DISMISSIBLE: {
    http_status: 409,
    user_facing_i18n_key: 'error.meta_progression.capability_not_dismissible',
    retryable_class: 'NEVER',
  },

  // --- META_PROGRESSION_* (06, P3-G C5 — CAPABILITY_ADOPT adoption gate) — ADDITIVE ---
  // Design §9 step 1 (validate): predicates are RE-DERIVED at adoption time (never trusting the card's
  // possibly-stale `predicate_regressed` flag — a FRESH re-evaluation runs every time) — a capability
  // whose org-context has since collapsed (canon: "the capability emerges when the org created the
  // context") refuses adoption (decisions §4 #21). 422 — a VALIDATION-class refusal (the request is
  // well-formed, the STATE just no longer qualifies); AFTER_USER_ACTION — the player CAN make it true
  // again (re-satisfy the clauses), unlike `CAPABILITY_NOT_DISMISSIBLE`'s NEVER (a catalogue-level fact,
  // never player-actionable).
  PREDICATES_NO_LONGER_MET: {
    http_status: 422,
    user_facing_i18n_key: 'error.meta_progression.predicates_no_longer_met',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- META_PROGRESSION_* (06, P3-H C2 — Decision Horizon Lock: ExecutionPlan creation) — ADDITIVE ---
  // Design §6.1 verbatim: "execution_window <= cycles_ahead(tier) ... Refuse a mode above the tier (422
  // DEVIATION_MODE_NOT_AVAILABLE)" (plan C2's own falsifiable names this code literally). 422 — the
  // request is well-formed, but the player's CURRENT decision_horizon_tier caps the engageable window
  // (`cycles_per_horizon_tier_t{1,2,3}` — value-sensitive, C2's own flip falsifiable). AFTER_USER_ACTION —
  // the player can retry with a smaller window, or advance the tier first (C4).
  EXECUTION_WINDOW_EXCEEDS_TIER: {
    http_status: 422,
    user_facing_i18n_key: 'error.meta_progression.execution_window_exceeds_tier',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // Design §6.1 tier ladder (ABORT@T1 / +ESCALATE@T2 / +ADAPT@T3, plan C2's own falsifiable names this
  // code literally): the requested `deviation_rule` is not yet unlocked at the player's current tier
  // (e.g. ESCALATE at T1). 422 — AFTER_USER_ACTION (retry with an available mode, or advance the tier).
  DEVIATION_MODE_NOT_AVAILABLE: {
    http_status: 422,
    user_facing_i18n_key: 'error.meta_progression.deviation_mode_not_available',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // Plan C2's own falsifiable verbatim: "a plan on a standing order the player does NOT own -> 403".
  // ★ DIVERGENCE (disclosed, coder-flagged — see execution-plan.service.ts's own header note): every
  // OTHER "not owned by this player" check in this codebase (graduation.service.ts:237,
  // promotion-lock.service.ts:200, exceptions.controller.ts) resolves to 404 RESOURCE_NOT_FOUND (the
  // existence-masking convention). The C2 plan text is explicit and repeated (plan.md C2 + the dispatched
  // brief) that THIS check is 403, not 404 — implemented literally per that explicit, doubly-stated
  // instruction rather than silently folded into the codebase's usual masking convention. Flagged loud for
  // reviewer ⊥ / controller — not a silent guess either way.
  STANDING_ORDER_NOT_OWNED: {
    http_status: 403,
    user_facing_i18n_key: 'error.meta_progression.standing_order_not_owned',
    retryable_class: 'NEVER',
  },

  // --- META_PROGRESSION_* (06, P3-H C4 — Decision Horizon Lock: MANUAL tier advancement) — ADDITIVE ---
  // Design §6.6/D6 verbatim: "counter gate (`≥ script_stability_cycles_tier{2,3}`)" — the player requested
  // an advance but their `script_stability_counters.consecutive_no_deviation_cycles` for the target
  // lieutenant has not yet reached the target tier's threshold. 422 — the request is well-formed, the
  // STATE just does not qualify yet; AFTER_USER_ACTION — the player can keep executing clean cycles (the
  // counter climbs on its own) and retry.
  STABILITY_COUNTER_INSUFFICIENT: {
    http_status: 422,
    user_facing_i18n_key: 'error.meta_progression.stability_counter_insufficient',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // `decision_horizon_tier`'s domain is 1..3 (D1 — player-shared v1, mig 0002's own `pps_decision_horizon_
  // tier_chk`); a player already at tier 3 has no further tier to advance into. 409 — a STATE description
  // (a permanent catalogue-level fact, mirrors `CAPABILITY_NOT_DISMISSIBLE`'s own 409 shape); NEVER — no
  // retry ever resolves this (there is no tier 4 to reach, unlike `STABILITY_COUNTER_INSUFFICIENT`, which
  // genuinely resolves with more play).
  HORIZON_TIER_ALREADY_MAXIMUM: {
    http_status: 409,
    user_facing_i18n_key: 'error.meta_progression.horizon_tier_already_maximum',
    retryable_class: 'NEVER',
  },

  // --- META_PROGRESSION_* (06, P3-H C7 — Benchmark Drift: re-anchor + weekly quota) — ADDITIVE ---
  // Design §9.3 verbatim: "quota gate (`uses_remaining_this_week > 0` ...)" — the player has 0 re-anchor
  // uses remaining this real week. 409 — a STATE description (the current week's quota, a fact about THIS
  // player right now, mirrors `HORIZON_TIER_ALREADY_MAXIMUM`'s own 409 shape); AFTER_USER_ACTION (unlike
  // that code's NEVER) — the quota genuinely resolves on its own: the design §9.4 elapsed-at-read weekly
  // reset (or a `HorizonTierAdvancedEvent` quota upgrade) restores uses, no admin action needed.
  REANCHOR_QUOTA_EXHAUSTED: {
    http_status: 409,
    user_facing_i18n_key: 'error.meta_progression.reanchor_quota_exhausted',
    retryable_class: 'AFTER_USER_ACTION',
  },
  // Design §9.3 verbatim: "`|metric_kinds| ≤ metrics_simultaneous_reanchor`" — the request named more
  // metrics than the tunable allows this single re-anchor action. 422 — the request is well-formed, the
  // COUNT just exceeds the current tier limit; AFTER_USER_ACTION (retry with fewer metrics, mirrors
  // `EXECUTION_WINDOW_EXCEEDS_TIER`'s own shape).
  METRICS_SIMULTANEOUS_REANCHOR_EXCEEDED: {
    http_status: 422,
    user_facing_i18n_key: 'error.meta_progression.metrics_simultaneous_reanchor_exceeded',
    retryable_class: 'AFTER_USER_ACTION',
  },

  // --- combat/conflict (W6.1 engagements.controller.ts) ---
  // TD-553 — `POST /v1/me/engagements` narrowed: a player-OWNED lieutenant of the WRONG archetype
  // is a distinct, actionable state from "no such resource" (RESOURCE_NOT_FOUND stays for a
  // lieutenant_id that is not this player's at all or does not exist — D7's own "existence is
  // intelligence" posture, engagements.controller.ts's header, is UNCHANGED for that case: an
  // adversarial probe of another player's id still learns nothing). Here the player already owns
  // and can already see this lieutenant's archetype (`GET /v1/lieutenants`) — no new information is
  // leaked by naming the refusal. 409 + AFTER_USER_ACTION mirrors the `<CONDITION>_REQUIRED` family
  // (`SETTLING_COMPOUND_REQUIRED`/`REBUILD_REQUIRED` above): recruit or reassign a MUSCLE lieutenant,
  // then retry.
  MUSCLE_LIEUTENANT_REQUIRED: {
    http_status: 409,
    user_facing_i18n_key: 'error.engagements.muscle_lieutenant_required',
    retryable_class: 'AFTER_USER_ACTION',
  },
} as const satisfies Record<string, ErrorCodeSpec>;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Map an arbitrary HTTP status (e.g. from a thrown HttpException) to a canonical code. */
export function codeForHttpStatus(status: number): ErrorCode {
  switch (status) {
    case 402:
      return 'PAYMENT_REQUIRED';
    case 400:
      // Q2-2 (T5 nit): 400 = SYNTACTIC failure only (error_handling.md §Taxonomie HTTP
      // line 77 + §Options line 279 "400 syntactique / 422 sémantique" — RETENU). Genuine
      // body-parser/JSON failures + a missing obligatory header land here → JSON_PARSE_ERROR.
      // A SEMANTIC failure (a well-formed body breaking a business rule) must NOT be mislabeled
      // JSON_PARSE_ERROR — it is 422. The skeleton has NO NestJS ValidationPipe / class-validator
      // dep; semantic validation is done MANUALLY in the controller (auth.controller.ts), which
      // throws VALIDATION_FAILED (422) directly → mapped via the `case 422` below. The 400 default
      // therefore correctly stays JSON_PARSE_ERROR (we cannot finer-distinguish a raw 400 here).
      return 'JSON_PARSE_ERROR';
    case 404:
      return 'RESOURCE_NOT_FOUND';
    case 405:
      return 'HTTP_METHOD_NOT_ALLOWED';
    case 409:
      return 'RESOURCE_STATE_CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 422:
      return 'VALIDATION_FAILED';
    case 503:
      return 'SERVICE_UNAVAILABLE_MAINTENANCE';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'RESOURCE_NOT_FOUND';
  }
}
