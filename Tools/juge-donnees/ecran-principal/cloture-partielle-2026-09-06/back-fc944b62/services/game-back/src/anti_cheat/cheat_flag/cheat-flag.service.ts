// IMPLEMENTS: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §12 C4 ("UN écrivain de
//             `cheat_flag`, un seul, sur C1")
//             Canon: docs/tech/13_anti_exploit_balance/signature_detection.md (C1 decoy-spam signal) +
//             `false-report-ledger.service.ts` header (`flood_backlash_threshold` — REUSE, gdd/14 L137).
//             -- W1.2-a C4 — 2026-09-02 --
//
// `CheatFlagService#evaluateDecoySpam` — the ONE production evaluator this lot adds. Reads the C1
// false:genuine ratio over the REAL 30-day window (`CheatFlagRepository#countRecentReports`, never the
// cumulative-at-life `false_report_ledger_summary` — TD-517), and — if the ratio clears
// `T.city.flood_backlash_threshold` (REUSE, `inspectionTunables.floodBacklashThreshold` — the SAME
// tunable the flood-backlash mechanic already consumes; the canon's own `flood_backlash_false_to_
// genuine_ratio` key does NOT exist in this back — creating a second key for the SAME value would be a
// tunable without a distinct consumer) — QUEUEs a SOFT `cheat_flag` at a severity derived from HOW FAR
// past the threshold the ratio sits (`antiCheatTunables.c1`, R2.3 — no inline multiplier).
//
// ⛔ Best-effort by design (§12 C4: "une évaluation qui échoue ne doit pas faire échouer le signalement
// du joueur"). This service does NOT swallow its own errors — `fileReport`'s try/catch (the ONE call
// site, `false-report-ledger.service.ts#fileReport`) is where that containment lives, mirroring
// `session.service.ts`'s own `hlCards.computeAndPersist` try/catch precedent (containment at the CALL
// SITE, never duplicated inside the callee — same discipline `onboarding-grant.service.ts`'s header
// cites for the identical reason).

import { Injectable } from '@nestjs/common';

import { inspectionTunables } from '../../citysim/inspection/inspection-tunables';
import { antiCheatTunables } from '../anti-cheat-tunables';
import { CheatFlagRepository, type AntiCheatTx } from './cheat-flag.repository';
import type { CheatFlagSeverityEnumTs } from '../../db/schema/anti_cheat';

@Injectable()
export class CheatFlagService {
  constructor(private readonly repo: CheatFlagRepository) {}

  /**
   * Evaluate the C1 decoy-spam signal for `playerId` and QUEUE a `cheat_flag` if it fires. Called on
   * EVERY `POST /v1/city/inspection/report` (the C1 appelant de production, `false-report-ledger.
   * service.ts#fileReport`) — a no-op below threshold, and idempotent above it (migration 0153's
   * partial unique index — `CheatFlagRepository#insertQueuedFlag`).
   *
   * Predicate (§12 C4, verbatim): `false_n >= seuil × max(genuine_n, 1)` ET `false_n > 0` — the second
   * clause excludes the `false_n = 0, genuine_n = 0` degenerate case (a player with zero reports at all
   * would otherwise satisfy `0 >= threshold × 1` only if `threshold` were 0, but a genuine-only history
   * — `false_n = 0, genuine_n > 0` — must never flag, and `0 >= threshold × genuine_n` already excludes
   * it for any `threshold > 0`; the explicit `false_n > 0` is the named guard against a MISCONFIGURED
   * `threshold = 0` making every player instantly QUEUED).
   */
  async evaluateDecoySpam(playerId: string, executor?: AntiCheatTx): Promise<void> {
    const { falseN, genuineN } = await this.repo.countRecentReports(playerId, executor);
    const threshold = inspectionTunables.floodBacklashThreshold; // REUSE T.city.flood_backlash_threshold
    const fires = falseN >= threshold * Math.max(genuineN, 1) && falseN > 0;
    if (!fires) return;

    const ratio = falseN / Math.max(genuineN, 1);
    const severity = this.deriveSeverity(ratio, threshold);
    await this.repo.insertQueuedFlag(playerId, severity, executor);
  }

  /**
   * LOW at the predicate's own pass boundary (ratio == threshold), MEDIUM at
   * `threshold × severityMediumMultiplier`, HIGH at `threshold × severityHighMultiplier` — HIGH checked
   * FIRST so an env override that puts the two multipliers out of order degrades to "never HIGH"
   * (informational drift, never a crash).
   */
  private deriveSeverity(ratio: number, threshold: number): CheatFlagSeverityEnumTs {
    const highBound = threshold * antiCheatTunables.c1.severityHighMultiplier;
    const mediumBound = threshold * antiCheatTunables.c1.severityMediumMultiplier;
    if (ratio >= highBound) return 'HIGH';
    if (ratio >= mediumBound) return 'MEDIUM';
    return 'LOW';
  }
}
