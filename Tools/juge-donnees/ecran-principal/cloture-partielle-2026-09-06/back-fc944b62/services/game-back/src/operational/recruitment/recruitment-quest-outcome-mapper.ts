// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C3 (Mapper + finalizeHire —
//             `mapDecisionsToSeedScript` D3 vocabulary wall)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §6
//             (`RecruitmentQuestOutcomeMapper` → the seeded behavior-script) + §7 (composite buckets)
//             Decisions: docs/superpowers/specs/2026-07-11-04f-B-recruitment-decisions.md D3/D4/D5/D6 +
//             §8 (the C0 per-binding signal-vocabulary map — THE mapper contract, the ABSENCE-CONTRACT wall)
//             — 04f-B C3 — 2026-07-11
//
// `RecruitmentQuestOutcomeMapper.mapDecisionsToSeedScript(decisions, archetype)` — the ★ C7 seam's SECOND
// consumer (the FIRST was 04f-A's Facility-manager default script). Transposes the quest's decisions onto a
// REAL compiled Tier-1 behavior script through the SAME `DslParserService`/`DslCompilerService` pipeline the
// C7 precedent uses (`unlockedTier=1`, `valid=true` asserted PRE-tx — a diagnostic here is an INTERNAL BUG,
// never a player-facing failure, since every emitted rule is drawn from the closed vocabulary table below).
//
// ★★ THE ABSENCE-CONTRACT WALL (decisions §8): every emitted rule's `<signal>` is drawn from
// `ARCHETYPE_VOCAB` below — copied VERBATIM from the C0 per-binding extraction (decisions §8's table),
// EXCLUDING the two documented STUBS (`MUSCLE.percolation_band`, `INTELLIGENCE.belief_band` — hardcoded
// constants; a rule keyed on their varying value would never fire) and EXCLUDING `INTELLIGENCE.
// behavioral_indicator` (a real signal, but NOT registered in the DSL compiler's `ENUM_STATE_FIELDS` table —
// `compiler.service.ts:115-123` only lists `interpretation_drift`/`regime_pressure_band` — a STATE trigger on
// it would fail `checkTriggerValue`'s scalar check and never compile; using it would be the OTHER fig-leaf
// wall, D3's "compile-invalid" one). All 9 archetypes get a REAL bespoke vocabulary entry here — WIDER than
// design §6's stated 4-rich-archetype launch floor (LOGISTICS/MUSCLE/SECURITY/COOK), a deliberate widening
// C0 §8 explicitly authorized ("the launch DECISION of which archetypes get bespoke vocabulary vs the
// universal fallback remains C3's call") — every one of the remaining 5 archetypes (BOOKKEEPER/DISTRIBUTION/
// FACILITY_MANAGER/LAUNDERING/INTELLIGENCE) already had a concrete real-signal extraction in decisions §8, so
// building a genuine per-archetype entry for each is MORE honest than an underspecified "universal fallback"
// that would itself need per-archetype signal knowledge to avoid dead rules. See the C3 handoff report for
// the full reasoning.
//
// ★ THE D3 TRANSPOSITION (canon script archetypes → the REAL executable grammar, `compiler.service.ts:62-73`):
//   exploratory (CURIOUS)  → majority `STATE(<signal>, <op>, <val>) → REQUEST_PLAYER_INPUT`
//   execution   (DIRECT)   → majority `→ EXECUTE_DEFAULT`, preferring an EVENT trigger when the target
//                             archetype's binding populates a REAL `events.*` signal (LOGISTICS only in this
//                             vocabulary; decisions §8 — every other archetype exposes ZERO populated events
//                             signals) and degrading to STATE otherwise — NEVER fabricating an EVENT rule
//                             against an absent signal (the ABSENCE-CONTRACT wins over the literal D3 shape).
//   escalation  (CAUTIOUS)  → `STATE(<signal>, …) → PAUSE_OPS` + a `REQUEST_PLAYER_INPUT` companion (the
//                             shipped escalate-to-player semantics — the C7 `PAUSE_OPS` precedent).
//
// ★ NEGOTIATION MODIFIER (design §6 "Modifier composition"): `autonomy_band` scales the CAUTIOUS archetype's
// escalation-rule (PAUSE_OPS/REQUEST_PLAYER_INPUT) DENSITY — LOOSE=2, BALANCED=3, TIGHT=4 rules (canon "high
// autonomy = fewer ESCALATE rules"). Applied to CAUTIOUS specifically (the escalation-driven archetype is the
// canon example scenario; CURIOUS/DIRECT keep a fixed 3-rule base ± the axis-fit bonus below — see the C3
// handoff report for the scoping rationale). `salary_band` does NOT touch the script — it scales the
// one-time hire debit (`SALARY_BAND_MULTIPLIER`, consumed by `finalizeHire`, D4).
//
// ★ TRIAL-AXIS BIAS (design §6 "trial axis → the ACTION-rule bias"): when the revealed `TrialAxisBucket`
// matches the CHOSEN archetype's family (`AXIS_TO_ARCHETYPE_FAMILY` — `logistics→LOGISTICS`, `muscle→MUSCLE`,
// `fixer→SECURITY`, D4), CURIOUS/DIRECT scripts gain ONE extra EXECUTE_DEFAULT "confidence" rule (biasing the
// ACTION mix toward more action — never applied to CAUTIOUS, keeping its autonomy-density count formula
// exact for the falsifiable floor). The SAME axis-fit boolean feeds `computeHireQualityBucket` below.
//
// ★ COMPOSITE BUCKETS (D5/D6, R2.2 — server-only weights, closed-domain output ONLY):
//   `computeHireQualityBucket` — deterministic score over axis-fit (0|2) + salary-band (0|1|2) + autonomy-
//   band (0|1|2), bucketed WEAK(0-1)|SOLID(2-3)|STRONG(4-5)|EXEMPLARY(6). Same decisions → same bucket
//   (pure function, no RNG, no clock).
//   `computeLoyaltySeedBucket` — D5's INITIAL-per-pool value (saltline/defector → 'tested', civilian →
//   'seeded'); C3 wires ONLY the saltline path (defector/civilian depth = C5/C6 — their downgrades/mismatches
//   are honest forward extensions of this same function, not re-implemented here).

import { Injectable } from '@nestjs/common';

import type { CompareOp } from '../../dsl/ast';
import { DslCompilerService } from '../../dsl/compiler.service';
import { DslParserService } from '../../dsl/parser.service';
import type { CompiledScript } from '../../dsl/ir';
import { maintenanceTunables } from '../maintenance/maintenance-tunables';
import type { LieutenantArchetype } from '../lieutenant/lieutenant-archetype';
import type { RecruitmentDecisionEntry } from './recruitment.repository';
import type {
  AutonomyBand,
  NegotiationDecisionValue,
  OpeningLine,
  SalaryBand,
  TrialTaskType,
} from './saltline-recruitment.service';
import type { HireQualityEnum } from '../../db/schema/recruitment';
import type { LoyaltySeedBucketEnum } from '../../db/schema/lieutenant';

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The per-archetype REAL signal vocabulary (decisions §8, verbatim field names — the ABSENCE-CONTRACT wall)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** One STATE (or EVENT) signal a binding REALLY populates — the closed set the mapper may reference. */
export interface SeedSignalSpec {
  /** The bare signal name (a `state.*`/`events.*` key the binding populates — decisions §8, verbatim). */
  field: string;
  op: CompareOp;
  value: number | boolean | string;
}

/** A resolved per-archetype vocabulary entry — every field here is a signal the C0 extraction (decisions
 *  §8) confirmed the archetype's binding REALLY populates this tick (never a stub, never an unregistered
 *  enum field). `primaryEvent` is present ONLY for archetypes with a genuinely-populated `events.*` signal
 *  (LOGISTICS — the sole member in this vocabulary; decisions §8 confirms every other archetype has ZERO). */
export interface ArchetypeVocabEntry {
  archetype: LieutenantArchetype;
  primaryState: SeedSignalSpec;
  secondaryState?: SeedSignalSpec;
  primaryEvent?: SeedSignalSpec;
}

/**
 * Resolve the REAL vocabulary entry for `archetype` (decisions §8, one entry per bound archetype — all 9).
 * FACILITY_MANAGER's threshold is resolved LIVE from the registered tunable (the C7 precedent,
 * `maintenanceTunables.autoScheduleWindowBeforeDueDays`) — never hardcoded — so a seeded script always
 * matches the CURRENT registered window at seed time (the same "the compiled rule pins the current default"
 * posture the C7 Facility-manager default script uses).
 */
export function getArchetypeVocab(archetype: LieutenantArchetype): ArchetypeVocabEntry {
  switch (archetype) {
    case 'LOGISTICS':
      return {
        archetype,
        primaryState: { field: 'courier_available', op: '=', value: true },
        secondaryState: { field: 'source_has_product', op: '=', value: true },
        primaryEvent: { field: 'shipment_pending', op: '=', value: true },
      };
    case 'MUSCLE':
      // `regime_pressure_band` is REAL (conditionally present per rival_state row) — NEVER `percolation_band`
      // (the [C5-DEP] hardcoded-constant stub, decisions §8 — a rule on it would never fire).
      return { archetype, primaryState: { field: 'regime_pressure_band', op: '=', value: 'mounting' } };
    case 'COOK':
      return {
        archetype,
        primaryState: { field: 'cook_idle', op: '=', value: true },
        secondaryState: { field: 'heat_high', op: '=', value: false },
      };
    case 'SECURITY':
      return { archetype, primaryState: { field: 'building_damaged', op: '=', value: true } };
    case 'FACILITY_MANAGER':
      return {
        archetype,
        primaryState: {
          field: 'days_until_maintenance_due',
          op: '<=',
          value: maintenanceTunables.autoScheduleWindowBeforeDueDays,
        },
      };
    case 'BOOKKEEPER':
      return { archetype, primaryState: { field: 'wallet_cents', op: '>', value: 0 } };
    case 'DISTRIBUTION':
      return {
        archetype,
        primaryState: { field: 'safehouse_headroom_cents', op: '>', value: 0 },
        secondaryState: { field: 'dealer_float_cents', op: '>', value: 0 },
      };
    case 'LAUNDERING':
      return {
        archetype,
        primaryState: { field: 'safehouse_filled', op: '=', value: true },
        secondaryState: { field: 'node_has_capacity', op: '=', value: true },
      };
    case 'INTELLIGENCE':
      // Same `regime_pressure_band` semantics as MUSCLE (decisions §8) — NEVER `belief_band` (the [C9-DEP]
      // stub) nor `behavioral_indicator` (real, but not compiler-enum-registered — would fail to compile).
      return { archetype, primaryState: { field: 'regime_pressure_band', op: '=', value: 'mounting' } };
  }
}

/** Every real signal field name `archetype`'s vocabulary may reference (the in-test no-dead-rule oracle). */
export function vocabFieldNames(archetype: LieutenantArchetype): string[] {
  const v = getArchetypeVocab(archetype);
  return [v.primaryState.field, v.secondaryState?.field, v.primaryEvent?.field].filter(
    (f): f is string => f !== undefined,
  );
}

/** The 9 bound archetypes this mapper has a real vocabulary entry for (finalizeHire's domain check). */
export const MAPPER_KNOWN_ARCHETYPES: LieutenantArchetype[] = [
  'LOGISTICS',
  'MUSCLE',
  'COOK',
  'SECURITY',
  'FACILITY_MANAGER',
  'BOOKKEEPER',
  'DISTRIBUTION',
  'LAUNDERING',
  'INTELLIGENCE',
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Trial-axis → archetype-family recommendation (D4 — `logistics→LOGISTICS`, `muscle→MUSCLE`, `fixer→SECURITY`)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const AXIS_TO_ARCHETYPE_FAMILY: Record<TrialTaskType, LieutenantArchetype[]> = {
  LOGISTICS: ['LOGISTICS'],
  MUSCLE: ['MUSCLE'],
  FIXER: ['SECURITY'],
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Negotiation modifiers (D4 — salary → hire-cost multiplier; autonomy → escalation-rule density)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** [PROV] the salary-band → one-time hire-debit multiplier (code-owned; no separate registry key —
 *  design §12 registers only the ONE base `saltline_hire_cost_cents` key; `finalizeHire` multiplies it by
 *  this band). Exported so the E2E floor precomputes the EXACT expected debit (the raid-bribe pattern). */
export const SALARY_BAND_MULTIPLIER: Record<SalaryBand, number> = { LOW: 0.75, FAIR: 1.0, GENEROUS: 1.5 };

/** [PROV] the autonomy-band → CAUTIOUS escalation-rule count (canon "high autonomy = fewer ESCALATE
 *  rules"). Exported for the E2E floor's precompute (LOOSE < BALANCED < TIGHT, a strict count inequality).
 *  Capped at 3 (the 3-rule ceiling, see `mapDecisionsToSeedScript`'s CAUTIOUS branch) — BALANCED=2 is the
 *  canon-minimal PAUSE_OPS+companion pair; LOOSE=1 drops the companion (the loosest autonomy setting);
 *  TIGHT=3 adds one extra vigilance rule. */
export const ESCALATION_RULE_COUNT_BY_AUTONOMY: Record<AutonomyBand, number> = { LOOSE: 1, BALANCED: 2, TIGHT: 3 };

const SALARY_BAND_SCORE: Record<SalaryBand, number> = { LOW: 0, FAIR: 1, GENEROUS: 2 };
const AUTONOMY_BAND_SCORE: Record<AutonomyBand, number> = { TIGHT: 0, BALANCED: 1, LOOSE: 2 };

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Decision extraction (the append-only `decisions_made` array → the mapper's typed inputs)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function extractLatestValue(decisions: RecruitmentDecisionEntry[], decisionType: string): unknown {
  for (let i = decisions.length - 1; i >= 0; i -= 1) {
    if (decisions[i].decision_type === decisionType) return decisions[i].decision_value;
  }
  return undefined;
}

function extractOpeningLine(decisions: RecruitmentDecisionEntry[]): OpeningLine {
  const v = extractLatestValue(decisions, 'opening_line');
  return v === 'CURIOUS' || v === 'DIRECT' || v === 'CAUTIOUS' ? v : 'CURIOUS';
}

/** Exported so `RecruitmentQuestService.finalizeHire` can derive the negotiated hire-cost multiplier
 *  without re-implementing the `decisions_made` extraction (D4 — salary_band → the one-time debit). */
export function extractNegotiationDecision(decisions: RecruitmentDecisionEntry[]): NegotiationDecisionValue | undefined {
  return extractNegotiation(decisions);
}

function extractNegotiation(decisions: RecruitmentDecisionEntry[]): NegotiationDecisionValue | undefined {
  const v = extractLatestValue(decisions, 'negotiation');
  if (v && typeof v === 'object' && 'salary_band' in v && 'autonomy_band' in v) {
    return v as NegotiationDecisionValue;
  }
  return undefined;
}

/** The revealed `TrialAxisBucket` (gdd/15:2943) — recorded ALONGSIDE (not inside) the player's `trial_task`
 *  input by `RecruitmentQuestService.advanceStep` (`decisionEntry.revealed_axis`, C2). Exported for
 *  `finalizeHire`'s `expected_outcome.axis` projection field (design §4). */
export function extractRevealedAxis(decisions: RecruitmentDecisionEntry[]): TrialTaskType | undefined {
  for (let i = decisions.length - 1; i >= 0; i -= 1) {
    if (decisions[i].decision_type === 'trial_task') {
      const axis = decisions[i].revealed_axis;
      if (axis === 'LOGISTICS' || axis === 'MUSCLE' || axis === 'FIXER') return axis;
    }
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Rule-source rendering (DSL text — `WHEN STATE(field, op, value) THEN ACTION @priority;`)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

type SeedAction = 'EXECUTE_DEFAULT' | 'PAUSE_OPS' | 'REQUEST_PLAYER_INPUT';

function renderValue(v: number | boolean | string): string {
  return typeof v === 'string' ? v : String(v);
}

function ruleLine(trigger: 'STATE' | 'EVENT', sig: SeedSignalSpec, action: SeedAction, priority: number): string {
  return `WHEN ${trigger}(${sig.field}, ${sig.op}, ${renderValue(sig.value)}) THEN ${action} @${priority};`;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The compiled seed script
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export interface RecruitmentSeedScript {
  source: string;
  rules: CompiledScript;
  /** The D3 script-archetype label — carried into `expected_outcome.script_style` (design §4 projection). */
  scriptStyle: 'exploratory' | 'execution' | 'escalation';
}

const SCRIPT_STYLE_BY_OPENING_LINE: Record<OpeningLine, RecruitmentSeedScript['scriptStyle']> = {
  CURIOUS: 'exploratory',
  DIRECT: 'execution',
  CAUTIOUS: 'escalation',
};

@Injectable()
export class RecruitmentQuestOutcomeMapper {
  constructor(
    private readonly parser: DslParserService,
    private readonly compiler: DslCompilerService,
  ) {}

  /**
   * Map a quest's `decisions_made` onto a REAL compiled Tier-1 behavior script for `archetype` (the C7 seam
   * consumer). Pure, deterministic (no RNG, no clock — the ONLY runtime input beyond `decisions`/`archetype`
   * is the FACILITY_MANAGER threshold tunable, itself deterministic per-call). Compiles through the SAME
   * `DslParserService`/`DslCompilerService` pipeline at `unlockedTier=1`; a diagnostic here is an INTERNAL
   * BUG (every rule is drawn from the closed, C0-verified vocabulary — never player input) and THROWS —
   * `finalizeHire` must 500 BEFORE any tx rather than seed an invalid script (the C7 contract).
   */
  mapDecisionsToSeedScript(
    decisions: RecruitmentDecisionEntry[],
    archetype: LieutenantArchetype,
  ): RecruitmentSeedScript {
    const vocab = getArchetypeVocab(archetype);
    const openingLine = extractOpeningLine(decisions);
    const negotiation = extractNegotiation(decisions);
    const autonomyBand: AutonomyBand = negotiation?.autonomy_band ?? 'BALANCED';
    const revealedAxis = extractRevealedAxis(decisions);
    const axisFit = revealedAxis !== undefined && AXIS_TO_ARCHETYPE_FAMILY[revealedAxis].includes(archetype);

    const lines: string[] = [];
    let priority = 90;
    const nextPriority = (): number => {
      const p = priority;
      priority -= 10;
      return p;
    };

    // ★ THE 3-RULE CEILING: the shared E2E stack's `dsl.max_rules_per_script` fast-tunable pins to 3 (test-
    // only — the registry default is 20, unaffected in production) — but a script that only WORKS inside a
    // roomy 4-rule budget is fragile precisely at the boundary a shared-tunable environment might legally
    // tighten. The mapper therefore stays inside a 3-rule ceiling UNCONDITIONALLY (design §6's "Rule count:
    // 2-4" reading narrowed to its safe 2-3 subset, decisions §8's "C3's call" latitude) — the trial-axis
    // bias (design §6 "biases the ACTION mix") SWAPS which action a rule uses rather than ADDING a 4th rule.
    switch (openingLine) {
      case 'CURIOUS': {
        // Exploratory — majority STATE→REQUEST_PLAYER_INPUT (D3): 2 REQUEST_PLAYER_INPUT (2 distinct
        // signals when the archetype has a second one) + 1 EXECUTE_DEFAULT. On axis-fit, the mix SWAPS
        // toward more action (1 REQUEST_PLAYER_INPUT + 2 EXECUTE_DEFAULT — "biases the ACTION mix") while
        // the rule COUNT stays fixed at 3.
        lines.push(ruleLine('STATE', vocab.primaryState, 'REQUEST_PLAYER_INPUT', nextPriority()));
        if (axisFit) {
          lines.push(ruleLine('STATE', vocab.secondaryState ?? vocab.primaryState, 'EXECUTE_DEFAULT', nextPriority()));
        } else {
          lines.push(ruleLine('STATE', vocab.secondaryState ?? vocab.primaryState, 'REQUEST_PLAYER_INPUT', nextPriority()));
        }
        lines.push(ruleLine('STATE', vocab.primaryState, 'EXECUTE_DEFAULT', nextPriority()));
        break;
      }
      case 'DIRECT': {
        // Execution-heavy — majority →EXECUTE_DEFAULT (D3), preferring EVENT when the archetype REALLY
        // populates one (LOGISTICS only, decisions §8) — never a fabricated EVENT rule (the ABSENCE-
        // CONTRACT wins over the literal EVENT→ACTION shape for the other 8 archetypes). 2 EXECUTE_DEFAULT
        // + 1 REQUEST_PLAYER_INPUT minority; on axis-fit the minority ALSO becomes EXECUTE_DEFAULT (fully
        // action-oriented — "biases the ACTION mix"), rule COUNT still fixed at 3.
        if (vocab.primaryEvent) {
          lines.push(ruleLine('EVENT', vocab.primaryEvent, 'EXECUTE_DEFAULT', nextPriority()));
        } else {
          lines.push(ruleLine('STATE', vocab.primaryState, 'EXECUTE_DEFAULT', nextPriority()));
        }
        lines.push(ruleLine('STATE', vocab.secondaryState ?? vocab.primaryState, 'EXECUTE_DEFAULT', nextPriority()));
        lines.push(
          ruleLine('STATE', vocab.primaryState, axisFit ? 'EXECUTE_DEFAULT' : 'REQUEST_PLAYER_INPUT', nextPriority()),
        );
        break;
      }
      case 'CAUTIOUS': {
        // Escalation-driven — STATE-threshold→PAUSE_OPS + a REQUEST_PLAYER_INPUT companion (D3), density
        // scaled by autonomy_band (canon "high autonomy = fewer ESCALATE rules", D4): LOOSE=1 (the bare
        // threshold rule, the companion dropped at the loosest setting), BALANCED=2 (the canon-minimal
        // PAUSE_OPS+companion pair), TIGHT=3 (an extra vigilance rule). NO axis-fit bonus here — keeps the
        // autonomy-density count formula EXACT for the falsifiable floor (LOOSE < BALANCED < TIGHT), and
        // stays inside the 3-rule ceiling at every band.
        const count = ESCALATION_RULE_COUNT_BY_AUTONOMY[autonomyBand];
        for (let i = 0; i < count; i += 1) {
          const action: SeedAction = i % 2 === 0 ? 'PAUSE_OPS' : 'REQUEST_PLAYER_INPUT';
          lines.push(ruleLine('STATE', vocab.primaryState, action, nextPriority()));
        }
        break;
      }
    }

    const source = lines.join('\n');
    const parsed = this.parser.parse(source);
    if ('diagnostics' in parsed) {
      throw new Error(
        `RecruitmentQuestOutcomeMapper: seeded script failed to PARSE (internal bug — fix the vocabulary ` +
          `table): ${JSON.stringify(parsed.diagnostics)} | source=${source}`,
      );
    }
    const compiled = this.compiler.compile(parsed.ast, 1);
    if ('diagnostics' in compiled) {
      throw new Error(
        `RecruitmentQuestOutcomeMapper: seeded script failed to COMPILE (internal bug — fix the vocabulary ` +
          `table): ${JSON.stringify(compiled.diagnostics)} | source=${source}`,
      );
    }
    return { source, rules: compiled.ir, scriptStyle: SCRIPT_STYLE_BY_OPENING_LINE[openingLine] };
  }

  /**
   * `mapCivilianSeedScript(archetype)` — C6: the civilian pool's SHORT script variant (design §5 step 4 —
   * "civilian hires seed the SHORTER script variant (2-3 rules vs 4)... no prior experience"). The
   * civilian flow carries NO `opening_line`/`trial_task`/`negotiation` decisions at all (its OWN decision
   * vocabulary is `affinity_source`/`courting_session`/`initiation_task`, C6) — this is deliberately NOT a
   * `decisions`-driven branch like `mapDecisionsToSeedScript` above; it emits a FIXED, deterministic
   * 2-rule script from the SAME C0-verified per-archetype vocabulary (`getArchetypeVocab` — the
   * ABSENCE-CONTRACT wall applies identically): 1 STATE→REQUEST_PLAYER_INPUT (the civilian's own
   * inexperience — deferring to the player) + 1 STATE→EXECUTE_DEFAULT (the archetype's secondary signal
   * when the vocabulary has one, else the primary again at a different action — the SAME
   * `vocab.secondaryState ?? vocab.primaryState` fallback `mapDecisionsToSeedScript`'s CURIOUS branch
   * already uses, never a fabricated signal). Exactly 2 rules, ALWAYS — a strict, testable count
   * inequality against Saltline/Defector's CURIOUS/DIRECT 3-rule baseline (the C6 falsifiable floor's
   * "2-3 rules... count inequality... the lower-tier honesty" point). Compiled through the SAME
   * parser/compiler pipeline — a diagnostic here is an internal bug (THROWS, never a player-facing
   * failure), the identical C7 contract `mapDecisionsToSeedScript` upholds.
   */
  mapCivilianSeedScript(archetype: LieutenantArchetype): RecruitmentSeedScript {
    const vocab = getArchetypeVocab(archetype);
    const lines: string[] = [
      ruleLine('STATE', vocab.primaryState, 'REQUEST_PLAYER_INPUT', 90),
      ruleLine('STATE', vocab.secondaryState ?? vocab.primaryState, 'EXECUTE_DEFAULT', 80),
    ];
    const source = lines.join('\n');
    const parsed = this.parser.parse(source);
    if ('diagnostics' in parsed) {
      throw new Error(
        `RecruitmentQuestOutcomeMapper: civilian seeded script failed to PARSE (internal bug — fix the ` +
          `vocabulary table): ${JSON.stringify(parsed.diagnostics)} | source=${source}`,
      );
    }
    const compiled = this.compiler.compile(parsed.ast, 1);
    if ('diagnostics' in compiled) {
      throw new Error(
        `RecruitmentQuestOutcomeMapper: civilian seeded script failed to COMPILE (internal bug — fix the ` +
          `vocabulary table): ${JSON.stringify(compiled.diagnostics)} | source=${source}`,
      );
    }
    // 'exploratory' — the civilian's inexperience-driven REQUEST_PLAYER_INPUT-first framing mirrors the
    // CURIOUS archetype's own scriptStyle label (design §4 projection: `expected_outcome.script_style`).
    return { source, rules: compiled.ir, scriptStyle: 'exploratory' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Composite buckets (D5/D6, R2.2 — pure functions, exported for the E2E floor's precompute proof)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * `HireQualityBucket` (WEAK|SOLID|STRONG|EXEMPLARY, design §7) — a deterministic score over: axis-fit
 * (chosen archetype vs the revealed `TrialAxisBucket`, 0 or 2) + salary-band coherence (0/1/2) + autonomy-
 * band coherence (0/1/2). Server-only weights (R2.2) — only the bucket crosses the player boundary. Same
 * decisions → same bucket (no RNG, no clock); flipping any ONE decision moves the score, and often the
 * bucket (the falsifiable floor's "flip a decision → bucket moves" proof).
 */
export function computeHireQualityBucket(
  decisions: RecruitmentDecisionEntry[],
  archetype: LieutenantArchetype,
): HireQualityEnum {
  const revealedAxis = extractRevealedAxis(decisions);
  const negotiation = extractNegotiation(decisions);
  const axisFit = revealedAxis !== undefined && AXIS_TO_ARCHETYPE_FAMILY[revealedAxis].includes(archetype);

  let score = axisFit ? 2 : 0;
  score += SALARY_BAND_SCORE[negotiation?.salary_band ?? 'FAIR'];
  score += AUTONOMY_BAND_SCORE[negotiation?.autonomy_band ?? 'BALANCED'];

  if (score >= 6) return 'EXEMPLARY';
  if (score >= 4) return 'STRONG';
  if (score >= 2) return 'SOLID';
  return 'WEAK';
}

/**
 * `LoyaltySeedBucket` initial value per pool (D5): saltline/defector → 'tested', civilian → 'seeded'. C3
 * wired ONLY the saltline call site (`finalizeHire`); C5 extended this SAME function (not re-implemented)
 * with the defector `downgrade` param — a defector hire whose Maladaptive band ≥ moderate (D10) OR whose
 * seeded residual roll comes back a double agent (D9) downgrades `tested` → `fractured`. C6 extends it
 * ONE step further with the civilian `downgrade` reading (design §5 step 3': "LEDGER/LOOKOUT keep
 * `seeded`; a failed-fit (task vs demographic mismatch, deterministic) drops to `tested`") —
 * `CivilianRecruitmentService.initiationMismatch`'s output. `downgrade` is a SINGLE boolean param whose
 * MEANING is pool-conditioned (defector: `tested`→`fractured`; civilian: `seeded`→`tested`) — every
 * existing 1-arg call site (`computeLoyaltySeedBucket('saltline')` / `computeLoyaltySeedBucket('defector')`
 * / `computeLoyaltySeedBucket('civilian')`) is UNCHANGED (`downgrade` defaults `undefined` → falsy →
 * 'tested'/'seeded' respectively, byte-identical to before C6 — `recruitment_saltline_hire.spec.ts`'s own
 * `computeLoyaltySeedBucket('civilian')` → `'seeded'` assertion still holds verbatim).
 */
export function computeLoyaltySeedBucket(
  pool: 'saltline' | 'defector' | 'civilian',
  downgrade?: boolean,
): LoyaltySeedBucketEnum {
  if (pool === 'civilian') return downgrade ? 'tested' : 'seeded';
  if (pool === 'defector' && downgrade) return 'fractured';
  return 'tested';
}
