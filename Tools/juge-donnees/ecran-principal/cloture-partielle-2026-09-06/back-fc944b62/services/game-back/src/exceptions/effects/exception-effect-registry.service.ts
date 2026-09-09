// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-16-raid-exception-design.md §4-T2 / §5 (the effect handler registry —
//             Map<EffectType, handler>, the resolve dispatch + the open/closed extension point; mirrors BindingRegistry).

import { ApiError } from '../../protocol/api-error';
import type { EffectType } from '../exceptions.projection.service';
import type { ExceptionEffectHandler } from './exception-effect';

/** effectType → its handler (built ONCE at construction; immutable). A duplicate effectType throws at boot (a loud
 *  misconfiguration). `require` 422s an unknown method (the Phase-14 "unknown resolution method" guard, generalized). */
export class ExceptionEffectRegistry {
  private readonly byType = new Map<EffectType, ExceptionEffectHandler>();

  constructor(handlers: ExceptionEffectHandler[]) {
    for (const h of handlers) {
      if (this.byType.has(h.effectType)) {
        throw new Error(
          `ExceptionEffectRegistry: duplicate handler for effect '${h.effectType}' — register each exactly once in ` +
            'the exceptions.module.ts useFactory handler list.',
        );
      }
      this.byType.set(h.effectType, h);
    }
  }

  /** Resolve the handler for a method, or throw 422 (the unknown-method guard). */
  require(type: EffectType): ExceptionEffectHandler {
    const handler = this.byType.get(type);
    if (!handler) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `unknown resolution method '${String(type)}' (expected ${this.supported().join(' | ')}).`,
      });
    }
    return handler;
  }

  /** The registered effect types (deterministic insertion order). */
  supported(): EffectType[] {
    return [...this.byType.keys()];
  }
}
