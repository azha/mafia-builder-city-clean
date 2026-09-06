import { Injectable } from '@nestjs/common';

import { ExceptionsRepository } from '../exceptions.repository';
import type { ExceptionEffectHandler, ResolveContext } from './exception-effect';

/** ONE_TIME — handle this card once (no real mutation). A card-level disposition: works with any chosen action (the raw
 *  chosenActionId is passed through to the resolution payload — byte-identical to the Phase-14 ONE_TIME branch). */
@Injectable()
export class OneTimeHandler implements ExceptionEffectHandler {
  readonly effectType = 'ONE_TIME' as const;
  constructor(private readonly repo: ExceptionsRepository) {}

  async apply(ctx: ResolveContext): Promise<string> {
    await this.repo.markResolved(ctx.row.exception_id, 'resolved', {
      method: 'ONE_TIME',
      chosen_action_id: ctx.chosenActionId,
    });
    return 'RESOLVED';
  }
}
