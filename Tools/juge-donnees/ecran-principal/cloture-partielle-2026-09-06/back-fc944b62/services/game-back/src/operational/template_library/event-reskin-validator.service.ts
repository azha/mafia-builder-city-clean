// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C3 (event-reskin-validator.ts —
//             rule 4's DB half + the aggregate validate() — design names this class "EventReskinValidator"
//             inside `event-reskin-validator.ts`; it lives in THIS sibling file for a technical reason, see
//             below, never a design deviation)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.5.1 (EventReskin-
//             Validator — validation du SPEC, niveau wizard/HTTP)
//             — 04g-D C3 — 2026-07-17
//
// `EventReskinValidator` — the `@Injectable()` class wrapping rule 4's DB-backed half (existing
// `event_reskin.event_id` collision) + the aggregate `validate()` that runs all 4 canon rules in order.
// Rules 1-3 are the PURE functions imported from `./event-reskin-validator` (delegation, never a
// duplicate) — this class adds ONLY what genuinely needs a live DB connection.
//
// ★ WHY THIS IS A SEPARATE FILE from `event-reskin-validator.ts` (not a design deviation — a verified
// technical constraint): this class's constructor needs `@Inject(DB)` (the standard codebase-wide DI
// pattern, precedent `raid-exception.repository.ts` etc.) — but Playwright's esbuild-based TS transform
// cannot parse ANY parameter decorator at all ("Decorators cannot be used to decorate parameters",
// reproduced directly against this repo's `playwright.config.ts`). Since ES-module transforms parse a
// WHOLE file before tree-shaking, if this class lived in the SAME file as the 3 pure rule functions,
// `template_library_validators.spec.ts` (the C3 direct-import pure-module floor) could not import even
// `validateCrossRefs` without hitting that parse error. Splitting keeps `event-reskin-validator.ts` 100%
// decorator-free (safely Playwright-importable) while this file stays a normal NestJS provider, exercised
// ONLY via the real HTTP stack (`template_library_reskin_validate.spec.ts`) — never directly imported by
// any spec. Mirrors the SAME split applied to `anti-fomo-validator.ts` / `anti-fomo-validator.service.ts`.

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { eventReskin } from '../../db/schema/template_library';
import {
  validateCrossRefs,
  validateTemplateExists,
  validateTunableRanges,
  catalogueInstantiationIds,
  findDanglingCrossRefs,
  type ReskinSpec,
  type EventReskinValidationError,
  type EventReskinValidationResult,
} from './event-reskin-validator';

@Injectable()
export class EventReskinValidator {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ── rule 4 — validateEventIdFresh (catalogue half PURE/registry-derived, persisted half DB-backed) ────
  async validateEventIdFresh(spec: ReskinSpec): Promise<EventReskinValidationError | undefined> {
    if (catalogueInstantiationIds().has(spec.eventId)) {
      return { reason: 'event_id_taken', message: `eventId '${spec.eventId}' collides with an existing catalogue instantiationId (E-POL-*/E-LO-*/FLOW-*).` };
    }
    const existing = await this.db.select({ id: eventReskin.id }).from(eventReskin).where(eq(eventReskin.event_id, spec.eventId)).limit(1);
    if (existing.length > 0) {
      return { reason: 'event_id_taken', message: `eventId '${spec.eventId}' collides with an existing event_reskin row.` };
    }
    return undefined;
  }

  /** Runs the rules in canon order (1a crossRefs-empty → 1b crossRefs-dangling → 3 templateExists → 4
   *  eventIdFresh → 2 tunableRanges — cheap pure checks before the DB-dependent one, tunableRanges LAST
   *  since it is the only rule `TemplateInstantiationValidator.enforce()` conditionally downgrades under
   *  lax mode, §3.5.2), returns the FIRST violation (canon singular `validation_failure_reason`, never a
   *  collected array). ALWAYS strict — mode-awareness (BOTH rule 2's AND rule 1b's lax-downgrade) is
   *  `TemplateInstantiationValidator`'s own concern (§3.5.2, decisions D18), not this class's — so a
   *  dangling anchor here ALWAYS blocks (same `missing_cross_ref` reason, naming the anchor). */
  async validate(spec: ReskinSpec): Promise<EventReskinValidationResult> {
    const crossRefError = validateCrossRefs(spec);
    if (crossRefError) return { valid: false, error: crossRefError };

    const dangling = findDanglingCrossRefs(spec);
    if (dangling.length > 0) {
      const first = dangling[0]!;
      return {
        valid: false,
        error: {
          reason: 'missing_cross_ref',
          message:
            `ReskinSpec.crossRefs names a dangling anchor '${first.anchor}' (system '${first.system}') — it ` +
            `resolves to no known doc-anchor/tunable-key/templateId/instantiationId (design §3.5.1-1b, decisions D18).`,
        },
      };
    }

    const templateError = validateTemplateExists(spec);
    if (templateError) return { valid: false, error: templateError };

    const eventIdError = await this.validateEventIdFresh(spec);
    if (eventIdError) return { valid: false, error: eventIdError };

    const tunableError = validateTunableRanges(spec);
    if (tunableError) return { valid: false, error: tunableError };

    return { valid: true };
  }
}
