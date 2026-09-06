// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-16-raid-exception-design.md §4-T2 (the effect-descriptor + handler
//             contract — resolve dispatches by effect type to a registered handler; the seeded roll + mutation live in
//             the handler). The handler owns its side-effects + the markResolved; it returns the qualitative outcome enum.

import { ApiError } from '../../protocol/api-error';
import type { ExceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import type { CandidateActionView, EffectType, ExceptionEffect } from '../exceptions.projection.service';

/** The per-resolution context the registry hands a handler. Carries BOTH the raw chosenActionId (legacy ONE_TIME/ESCALATE
 *  pass it through without requiring a candidate match) and the resolved chosenAction (undefined if the id matches none —
 *  the action-bound handlers 422 on that via requireEffect). */
export interface ResolveContext {
  playerId: string;
  row: ExceptionQueueRow;
  chosenActionId: string;
  chosenAction: CandidateActionView | undefined;
}

/** A resolution effect. apply() performs the side-effects (+ markResolved) and returns the qualitative outcome enum for the
 *  HTTP response (e.g. 'RESOLVED' | 'REPAIRING' | 'BRIBE_SUCCEEDED' — never a raw scalar). */
export interface ExceptionEffectHandler {
  readonly effectType: EffectType;
  apply(ctx: ResolveContext): Promise<string>;
}

/** Assert the chosen action carries the action-bound effect this handler serves, and return the narrowed descriptor (with
 *  its target_building_id). A missing/mismatched candidate → 422 (you cannot bribe via the repair action / an unknown id). */
export function requireEffect<T extends ExceptionEffect['type']>(
  ctx: ResolveContext,
  type: T,
): Extract<ExceptionEffect, { type: T }> {
  const eff = ctx.chosenAction?.effect;
  if (!eff || eff.type !== type) {
    throw new ApiError('VALIDATION_FAILED', {
      message: `action '${ctx.chosenActionId}' does not carry the required '${type}' effect.`,
    });
  }
  return eff as Extract<ExceptionEffect, { type: T }>;
}
