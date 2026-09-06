import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { ExceptionsRepository } from '../exceptions.repository';
import { LieutenantService } from '../../operational/lieutenant/lieutenant.service';
import { LieutenantRepository } from '../../operational/lieutenant/lieutenant.repository';
import type { ExceptionEffectHandler, ResolveContext } from './exception-effect';

/** ADD_RULE — teach the lieutenant a permanent rule: append the chosen candidate's add_rule_dsl to its current script and
 *  re-attach via the SAME parse→compile→store the player's POST /behavior-script runs (LieutenantService.attachScript). A
 *  compile failure throws 422 → markResolved never runs → the card STAYS pending. Byte-identical to the Phase-14 branch. */
@Injectable()
export class AddRuleHandler implements ExceptionEffectHandler {
  readonly effectType = 'ADD_RULE' as const;
  constructor(
    private readonly repo: ExceptionsRepository,
    private readonly lieutenant: LieutenantService,
    private readonly lieutenantRepo: LieutenantRepository,
  ) {}

  async apply(ctx: ResolveContext): Promise<string> {
    if (!ctx.chosenAction || ctx.chosenAction.add_rule_dsl === null) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'this action is not addable as a rule (choose ONE_TIME/ESCALATE).',
      });
    }
    if (ctx.row.lieutenant_id === null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'exception has no lieutenant to teach.' });
    }
    const currentSource = await this.lieutenantRepo.getBehaviorScriptSource(ctx.playerId, ctx.row.lieutenant_id);
    const ruleText = ctx.chosenAction.add_rule_dsl.trim().replace(/;?$/, ';'); // exactly one terminator (the P14 bug fix).
    const prior = (currentSource ?? '').trim();
    const newSource = prior ? `${prior}\n${ruleText}` : ruleText;
    await this.lieutenant.attachScript(ctx.playerId, ctx.row.lieutenant_id, newSource); // 422 on compile fail → card stays pending.
    await this.repo.markResolved(ctx.row.exception_id, 'resolved', {
      method: 'ADD_RULE',
      chosen_action_id: ctx.chosenActionId,
    });
    return 'TAUGHT';
  }
}
