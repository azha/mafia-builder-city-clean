// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C4 ("graduation-seed-
//             mapper.ts: decisions + category + lieutenant archetype → DSL SOURCE with rules drawn ONLY
//             from getArchetypeVocab(archetype) (ABSENCE-CONTRACT REUSE), majority-disposition shaping
//             (the 04f-B D3 transposition precedent), compiled via the real parser/compiler (valid=true
//             asserted), script_seed_hash = SHA-256(compiled IR). Sparse → use what exists; zero → the
//             archetype default script (04f-A C7 precedent).").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md D5 ("emits
//             rules ONLY over the target archetype's ABSENCE-CONTRACT vocabulary (REUSE getArchetypeVocab
//             — recruitment-quest-outcome-mapper.ts), compiled through the REAL DslParserService/
//             DslCompilerService (unlockedTier=1), deterministic (script_seed_hash = SHA-256 of the
//             compiled IR)... Sparse history (< N decisions) → seed with what exists; zero decisions →
//             the archetype default script (the 04f-A C7 first-consumer precedent)").
//             — P3-F C4 — 2026-07-19 (the C7-seam THIRD consumer — 04f-A's Facility-manager default
//             script was the first, 04f-B's RecruitmentQuestOutcomeMapper the second)
//
// `GraduationSeedMapper.mapPlayerDecisionsToSeedScript` — the graduation seed pipeline's compile stage.
// REUSES, never re-implements: `getArchetypeVocab`/`vocabFieldNames` (the ABSENCE-CONTRACT wall,
// `recruitment-quest-outcome-mapper.ts`) and the REAL `DslParserService`/`DslCompilerService` pipeline
// (the SAME two services `attachScript`/`RecruitmentQuestOutcomeMapper` compile through).
//
// ★ THE MAJORITY-DISPOSITION TRANSPOSITION (the 04f-B D3 precedent, adapted): 04f-B's mapper picked ONE
// of 3 script shapes (exploratory/execution/escalation) from a SINGLE decision field (`opening_line`).
// P3-F's seed pipeline instead extracts UP TO N REAL decisions of two heterogeneous kinds (a structural
// audit row OR a resolved exception card) — there is no single "opening line" field to key off. The
// transposition: classify EACH decision into the SAME 3-way disposition space via a closed mapping (below,
// `classifyDisposition`), then take the MAJORITY disposition across the whole extracted history (ties
// broken toward the more RECENT occurrence — deterministic, no RNG) to pick which of the 3 D3 script
// shapes to render. This is a genuine coder-discretion call within the design's envelope (the design names
// the SHAPE — "majority-disposition shaping... the D3 transposition precedent" — but not a per-decision-
// type classification table, which does not exist anywhere in canon); the classification below is
// documented and closed, mirroring the SAME class of discretion 04f-B's own C3 exercised widening its
// vocabulary beyond the launch floor (decisions §8: "the launch DECISION... remains C3's call").
//
// CLASSIFICATION RATIONALE (closed, exhaustive over the REAL `EffectType` union, `exceptions.projection.
// service.ts:26-36`):
//   ESCALATE            → ESCALATION (exact semantic match — defers the decision to the player, the SAME
//                          "escalate to player" shape 04f-B's CAUTIOUS branch renders as PAUSE_OPS +
//                          REQUEST_PLAYER_INPUT).
//   LAY_LOW/DEFER_REPAIR → EXPLORATORY (a wait-and-observe play — gathers information/buys time before a
//                          firmer commitment, the SAME temperament 04f-B's CURIOUS branch renders as a
//                          REQUEST_PLAYER_INPUT-majority script).
//   everything else (ONE_TIME/ADD_RULE/REPAIR/REPAIR_IMMEDIATE/REPAIR_SLOW/DEMOLISH_REPLACE/BRIBE, and
//   EVERY structural_decisions_audit row — recruit/reassign/full-reset/reinforce are, by the P3-A
//   governor's own closed-world definition, org-shape-changing DECISIVE acts) → EXECUTION.
//
// ★ HONEST DISCLOSURE (found while wiring this chunk, not a silent guess): the design's own catalogue
// comment for HEAT_MANAGEMENT (`task-category-catalogue.ts`) names "LAY_LOW/BRIBE/ESCALATE verdicts" as
// the expected resolved-card signal — but the REAL citywide `HeatPressureExceptionProducerService` cards
// (`heat-pressure-exception-producer.service.ts`) carry candidates with NO `effect` field, so resolving
// one with `method:'LAY_LOW'`/`'BRIBE'` would 422 at `requireEffect` (`exceptions/effects/exception-
// effect.ts`) — those two literal `method` values are mechanically UNREACHABLE on this specific card (the
// LAY_LOW/BRIBE EffectTypes are real and DO 422-guard on `target_building_id`, but heat-pressure's own
// candidates never carry one). Only `ONE_TIME` (the 'acknowledge'/'lay_low' candidate ids) and `ESCALATE`
// (the 'escalate' id) are reachable in practice. This does NOT block the seed pipeline — the classification
// table above still closes over the full `EffectType` union (future card shapes that DO carry an effect,
// e.g. the raid-exception cards, classify correctly if ever bound to a category's source-tag list) — it
// only means THIS category's E2E fixture demonstrates 3 distinct player VERDICTS (acknowledge/escalate/
// lay_low, 3 distinct `chosen_action_id`s) via 2 distinct underlying `method`s, not 3. Flagged here per the
// C0-reanchor's own precedent for this class of finding (non-blocking, closable within chunk discretion).

import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import type { CompareOp } from '../dsl/ast';
import { DslCompilerService } from '../dsl/compiler.service';
import { DslParserService } from '../dsl/parser.service';
import type { CompiledScript } from '../dsl/ir';
import { getArchetypeVocab, type ArchetypeVocabEntry, type SeedSignalSpec } from '../operational/recruitment/recruitment-quest-outcome-mapper';
import type { LieutenantArchetype } from '../operational/lieutenant/lieutenant-archetype';
import type { CategoryDecisionEntry } from './category-decision-log.repository';

/** The 3-way script-shape disposition (the D3 transposition — see file header). */
export type SeedDisposition = 'EXPLORATORY' | 'EXECUTION' | 'ESCALATION';

/** The closed `resolution.method` (`EffectType`) → disposition table (see file header rationale). An
 *  unrecognized method (should not occur — the union is closed — defensive only) defaults to EXECUTION,
 *  never left unclassified. */
const RESOLVED_METHOD_DISPOSITION: Readonly<Record<string, SeedDisposition>> = {
  ESCALATE: 'ESCALATION',
  LAY_LOW: 'EXPLORATORY',
  DEFER_REPAIR: 'EXPLORATORY',
  ONE_TIME: 'EXECUTION',
  ADD_RULE: 'EXECUTION',
  REPAIR: 'EXECUTION',
  REPAIR_IMMEDIATE: 'EXECUTION',
  REPAIR_SLOW: 'EXECUTION',
  DEMOLISH_REPLACE: 'EXECUTION',
  BRIBE: 'EXECUTION',
};

/** Classify one extracted decision into the 3-way disposition space (see file header). A structural
 *  decision is ALWAYS EXECUTION (every structural code is, by the P3-A governor's own closed-world
 *  definition, a decisive org-shape-changing act — no canon signal distinguishes e.g. a RECRUIT from a
 *  REASSIGN by temperament, so no distinction is fabricated). */
export function classifyDecisionDisposition(entry: CategoryDecisionEntry): SeedDisposition {
  if (entry.kind === 'STRUCTURAL_DECISION') return 'EXECUTION';
  return RESOLVED_METHOD_DISPOSITION[entry.provenance as string] ?? 'EXECUTION';
}

/**
 * The majority disposition across `decisions` (newest-first ordered — the extractor's own contract).
 * Ties broken toward the disposition whose MOST RECENT occurrence is earliest in the (newest-first)
 * array — i.e. the more recently-expressed disposition wins a tie. Deterministic (no RNG); `decisions`
 * must be non-empty (the caller — `mapPlayerDecisionsToSeedScript` — branches to the zero-history default
 * script before this is ever called on an empty array).
 */
export function majorityDisposition(decisions: readonly CategoryDecisionEntry[]): SeedDisposition {
  const counts = new Map<SeedDisposition, number>();
  const mostRecentIndex = new Map<SeedDisposition, number>();
  decisions.forEach((entry, index) => {
    const disposition = classifyDecisionDisposition(entry);
    counts.set(disposition, (counts.get(disposition) ?? 0) + 1);
    if (!mostRecentIndex.has(disposition)) mostRecentIndex.set(disposition, index);
  });
  let best: SeedDisposition = 'EXECUTION';
  let bestCount = -1;
  let bestIndex = Number.POSITIVE_INFINITY;
  for (const [disposition, count] of counts) {
    const index = mostRecentIndex.get(disposition)!;
    if (count > bestCount || (count === bestCount && index < bestIndex)) {
      best = disposition;
      bestCount = count;
      bestIndex = index;
    }
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Rule-source rendering — reuses vocab.primaryState/secondaryState/primaryEvent ONLY (the ABSENCE-
// CONTRACT wall: every field referenced below is guaranteed populated by `getArchetypeVocab`, `vocab
// FieldNames(archetype)` is the exhaustive membership oracle every consumer/test checks against).
// ═══════════════════════════════════════════════════════════════════════════════════════════════

type SeedAction = 'EXECUTE_DEFAULT' | 'PAUSE_OPS' | 'REQUEST_PLAYER_INPUT';

function renderValue(v: number | boolean | string): string {
  return typeof v === 'string' ? v : String(v);
}

function ruleLine(trigger: 'STATE' | 'EVENT', sig: SeedSignalSpec, action: SeedAction, priority: number): string {
  return `WHEN ${trigger}(${sig.field}, ${sig.op as CompareOp}, ${renderValue(sig.value)}) THEN ${action} @${priority};`;
}

/** The zero-history archetype DEFAULT script (04f-A C7 precedent, `buildFacilityManagerDefaultScript`'s
 *  own ONE-rule shape): `WHEN STATE(<primary>, …) THEN EXECUTE_DEFAULT @100;` — always compilable (the
 *  vocab is guaranteed populated for every real archetype), deterministic, never a fabricated decision. */
function buildDefaultScriptSource(vocab: ArchetypeVocabEntry): string {
  return ruleLine('STATE', vocab.primaryState, 'EXECUTE_DEFAULT', 100);
}

/** The majority-disposition-shaped script (the D3 transposition, ≤3 rules — this stack's shared
 *  `dsl.max_rules_per_script` E2E fast-tunable pins to 3, `recruitment-quest-outcome-mapper.ts`'s own
 *  "3-RULE CEILING" note — honored unconditionally here too, never assuming the 20-default headroom). */
function buildDispositionScriptSource(vocab: ArchetypeVocabEntry, disposition: SeedDisposition): string {
  const lines: string[] = [];
  switch (disposition) {
    case 'EXPLORATORY':
      // Mirrors 04f-B's CURIOUS branch: majority STATE→REQUEST_PLAYER_INPUT.
      lines.push(ruleLine('STATE', vocab.primaryState, 'REQUEST_PLAYER_INPUT', 90));
      lines.push(ruleLine('STATE', vocab.secondaryState ?? vocab.primaryState, 'REQUEST_PLAYER_INPUT', 80));
      lines.push(ruleLine('STATE', vocab.primaryState, 'EXECUTE_DEFAULT', 70));
      break;
    case 'EXECUTION':
      // Mirrors 04f-B's DIRECT branch: majority →EXECUTE_DEFAULT, preferring a REAL EVENT trigger when the
      // archetype's vocabulary populates one (LOGISTICS only — the ABSENCE-CONTRACT wins over a fabricated
      // EVENT rule for every other archetype).
      if (vocab.primaryEvent) {
        lines.push(ruleLine('EVENT', vocab.primaryEvent, 'EXECUTE_DEFAULT', 90));
      } else {
        lines.push(ruleLine('STATE', vocab.primaryState, 'EXECUTE_DEFAULT', 90));
      }
      lines.push(ruleLine('STATE', vocab.secondaryState ?? vocab.primaryState, 'EXECUTE_DEFAULT', 80));
      lines.push(ruleLine('STATE', vocab.primaryState, 'REQUEST_PLAYER_INPUT', 70));
      break;
    case 'ESCALATION':
      // Mirrors 04f-B's CAUTIOUS/BALANCED shape: STATE-threshold→PAUSE_OPS + a REQUEST_PLAYER_INPUT
      // companion (the canon-minimal escalate-to-player pair — no autonomy-band axis exists here to scale
      // density by, so this stays fixed at 2 rules).
      lines.push(ruleLine('STATE', vocab.primaryState, 'PAUSE_OPS', 90));
      lines.push(ruleLine('STATE', vocab.primaryState, 'REQUEST_PLAYER_INPUT', 80));
      break;
  }
  return lines.join('\n');
}

/** The compiled graduation seed script — `GraduationService.executeGraduation` (C5) consumes `source`
 *  (fed to `attachScript`) and `scriptSeedHash` (stored on the `graduation_events` GRADUATION row). */
export interface GraduationSeedScript {
  readonly source: string;
  readonly compiled: CompiledScript;
  /** SHA-256 hex digest of `JSON.stringify(compiled)` — deterministic (the SAME source always compiles
   *  to byte-identical IR object construction), auditable BO-side (canon `GraduationEvent.script_seed_
   *  hash`). */
  readonly scriptSeedHash: string;
  /** The disposition that shaped this script, or `'DEFAULT'` for the zero-history archetype default. */
  readonly disposition: SeedDisposition | 'DEFAULT';
  /** The ACTUAL number of decisions consumed (≤ N — the caller's seed-depth getter) — `0` for the
   *  zero-history default-script path. Mirrors the `graduation_events.seed_decisions_n` column (C5). */
  readonly seedDecisionsN: number;
  readonly categoryCode: number;
  readonly archetype: LieutenantArchetype;
}

@Injectable()
export class GraduationSeedMapper {
  constructor(
    private readonly parser: DslParserService,
    private readonly compiler: DslCompilerService,
  ) {}

  /**
   * `decisions` — the extractor's newest-first, N-capped output (`CategoryDecisionLogRepository.
   * extractCategoryDecisions`, D5's own "last N real decisions"). Pure, deterministic (no RNG, no clock —
   * the ONLY runtime inputs are `decisions`/`categoryCode`/`archetype`): the SAME `decisions` array always
   * produces byte-identical `source`/`scriptSeedHash`. Sparse history (< N) seeds with whatever exists
   * (the majority vote over however many entries are present); zero history falls to the archetype
   * default script (04f-A C7 precedent) — NEVER a fabricated decision. Compiles through the REAL
   * `DslParserService`/`DslCompilerService` pipeline at `unlockedTier=1` (the graduation seed's own
   * baseline tier, mirroring `attachScript`'s default); a diagnostic here is an INTERNAL BUG (every
   * emitted rule is drawn from the closed, vetted vocabulary table, never player input) and THROWS —
   * `GraduationService.executeGraduation` (C5) must fail BEFORE any tx rather than seed an invalid script
   * (the SAME C7 contract `RecruitmentQuestOutcomeMapper`/`buildFacilityManagerDefaultScript` uphold).
   */
  mapPlayerDecisionsToSeedScript(
    decisions: readonly CategoryDecisionEntry[],
    categoryCode: number,
    archetype: LieutenantArchetype,
  ): GraduationSeedScript {
    const vocab = getArchetypeVocab(archetype);

    if (decisions.length === 0) {
      return this.compileAndHash(buildDefaultScriptSource(vocab), 'DEFAULT', 0, categoryCode, archetype);
    }

    const disposition = majorityDisposition(decisions);
    const source = buildDispositionScriptSource(vocab, disposition);
    return this.compileAndHash(source, disposition, decisions.length, categoryCode, archetype);
  }

  private compileAndHash(
    source: string,
    disposition: SeedDisposition | 'DEFAULT',
    seedDecisionsN: number,
    categoryCode: number,
    archetype: LieutenantArchetype,
  ): GraduationSeedScript {
    const parsed = this.parser.parse(source);
    if ('diagnostics' in parsed) {
      throw new Error(
        `GraduationSeedMapper: seeded script failed to PARSE (internal bug — fix the vocabulary/rendering ` +
          `table): ${JSON.stringify(parsed.diagnostics)} | source=${source}`,
      );
    }
    const compiled = this.compiler.compile(parsed.ast, 1);
    if ('diagnostics' in compiled) {
      throw new Error(
        `GraduationSeedMapper: seeded script failed to COMPILE (internal bug — fix the vocabulary/rendering ` +
          `table): ${JSON.stringify(compiled.diagnostics)} | source=${source}`,
      );
    }
    const scriptSeedHash = createHash('sha256').update(JSON.stringify(compiled.ir)).digest('hex');
    return { source, compiled: compiled.ir, scriptSeedHash, disposition, seedDecisionsN, categoryCode, archetype };
  }
}
