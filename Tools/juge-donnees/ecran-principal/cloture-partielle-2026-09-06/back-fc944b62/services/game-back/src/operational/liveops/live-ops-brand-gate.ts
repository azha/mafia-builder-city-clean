// IMPLEMENTS: docs/superpowers/plans/2026-07-09-04e-C-composer-plan.md C5 (D6 / DD-C5 — "Brand gate:
//             composer-authored subject/body run the 04e-B enforced grep-gate at compose/send: a
//             compose-time lint that REJECTS forbidden-pattern copy")
//             Decisions: docs/superpowers/specs/2026-07-09-04e-C-composer-decisions.md §1 D6.
//             REUSES (never duplicates): scripts/ci/check-political-brand-gate.sh's own `PATTERN`
//             (D6/D3 enforced CI grep gate, 04e-A2 C9 + 04e-B C9 — already scans this ENTIRE directory,
//             `services/game-back/src/operational/liveops/**`, as committed source). Byte-identity
//             between the token list below and that script's `PATTERN=` line is pinned by
//             `tests/e2e/operational/liveops/liveops_composer_page2.spec.ts`'s "source-sync" test — any
//             drift here without a matching script change fails that test.
//             — 04e-C C5 — 2026-07-10
//
// `live-ops-brand-gate.ts` — the RUNTIME half of the D6 brand tonal guard (the CI script above is the
// STATIC half, scanning committed source/docs on every commit; this module is the ONE new drift surface
// C5 introduces — staff-typed free-text push subject/body, which is never committed source and so is
// invisible to the CI script). `sendPush` (`live-ops-admin.controller.ts`) calls `assertLiveOpsBrandGateClean`
// BEFORE any targeting/consent/send/audit — a hit REFUSES the send outright (422 VALIDATION_FAILED), no
// mutation, no `admin_audit_log` row.
//
// UNLIKE the CI script (which exempts a hit tagged `% allowed-mention` — a code-review discipline for
// canon documentation that legitimately DISCUSSES the forbidden patterns), a composer push subject/body
// is live player-facing copy: there is no legitimate "this hit is allowed" case at send time — ANY hit
// rejects. No escape hatch is exposed here (the CI script's tag mechanism is a docs/code-review
// convention, not applicable to runtime content).

import { ApiError } from '../../protocol/api-error';

/**
 * The forbidden-pattern token list, ONE token per array element (each on its own source line so the
 * enforced CI script's own self-scan of this directory sees each hit individually) — byte-identical to
 * `scripts/ci/check-political-brand-gate.sh`'s `PATTERN=` line when `.join('|')`-ed (pinned by the
 * "source-sync" E2E test). REUSED verbatim, never re-derived — D6/D3's single source of truth for what
 * "forbidden" means stays the CI script; this array is its runtime mirror, not a second decision.
 *
 * Each line below is itself a literal occurrence of what the CI script's OWN pattern forbids (this is a
 * genuine "this pattern is explicitly forbidden" self-reference, the same class of legitimate mention
 * the CI script's own canon-docs scan tags) — `% allowed-mention` on the SAME line, mirroring the
 * established convention this file's sibling modules already use (`live-ops-admin.controller.ts`,
 * `live-ops-cadence-controller.ts`).
 */
export const LIVE_OPS_BRAND_GATE_TOKENS: readonly string[] = [
  'FOMO', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN (reused, not duplicated)
  'countdown', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN
  'spring sale', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN
  'black friday', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN
  'limited.time', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN
  'act now', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN
  'exclusive', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN
  'event.only.currency', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN
  'event.chain', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN
  'last chance', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN
  'independence day', // % allowed-mention: D6 runtime lint token, mirrors check-political-brand-gate.sh's own PATTERN
];

/** Case-insensitive, `.` = any char (mirrors GNU `grep -E`'s OWN semantics for the identical tokens —
 *  JS `RegExp`'s default `.` is already "any char", so the token strings translate verbatim, no escaping). */
const LIVE_OPS_BRAND_GATE_REGEX = new RegExp(LIVE_OPS_BRAND_GATE_TOKENS.join('|'), 'i');

/** Returns the matched substring if `text` contains a forbidden pattern, else `null`. Pure — no I/O. */
export function findLiveOpsBrandGateHit(text: string): string | null {
  const match = LIVE_OPS_BRAND_GATE_REGEX.exec(text);
  return match ? match[0] : null;
}

/**
 * Throws `ApiError('VALIDATION_FAILED')` (422) if `subject` or `body` contains a forbidden pattern.
 * The matched substring is interpolated into the thrown message at RUNTIME (never a literal source-code
 * occurrence of caller-supplied copy) — checked subject first, so a subject-only hit reports without
 * needing to also inspect the body.
 */
export function assertLiveOpsBrandGateClean(subject: string, body: string): void {
  const hit = findLiveOpsBrandGateHit(subject) ?? findLiveOpsBrandGateHit(body);
  if (hit !== null) {
    throw new ApiError('VALIDATION_FAILED', {
      message: `Composer push copy was refused by the D6 brand tonal guard (matched forbidden pattern "${hit}").`,
    });
  }
}
