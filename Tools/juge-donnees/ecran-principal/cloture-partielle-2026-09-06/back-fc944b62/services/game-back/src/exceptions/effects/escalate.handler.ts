import { Injectable } from '@nestjs/common';

import { ExceptionsRepository } from '../exceptions.repository';
import type { ExceptionEffectHandler, ResolveContext } from './exception-effect';

/** ESCALATE — archive this card (no real mutation). A card-level disposition: works with any chosen action (byte-identical
 *  to the Phase-14 ESCALATE branch — it does NOT require the chosenActionId to resolve to a candidate). */
@Injectable()
export class EscalateHandler implements ExceptionEffectHandler {
  readonly effectType = 'ESCALATE' as const;
  constructor(private readonly repo: ExceptionsRepository) {}

  async apply(ctx: ResolveContext): Promise<string> {
    await this.repo.markResolved(ctx.row.exception_id, 'escalated', {
      method: 'ESCALATE',
      chosen_action_id: ctx.chosenActionId,
    });
    return 'ESCALATED';
  }
}
