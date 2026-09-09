// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 ("Provider registry +
//             the 5 LIVE providers")
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §8 ("Provider
//             registry (`hl-card-provider.registry.ts`): closed, boot-registered").
//             Pattern: `src/exceptions/effects/exception-effect-registry.service.ts`
//             (`ExceptionEffectRegistry` — Map<key, handler>, built ONCE at construction, duplicate-key
//             throws — the SAME "closed set built from a `useFactory` handler list" convention,
//             `exceptions.module.ts:47-63`).
//             — P3-A C6 — 2026-07-10
//
// P3-C C8 ADDITION (2026-07-13) — 2 more providers registered (`BACKPRESSURE_CRITICAL_TRACE` code 106 /
//             `MYCELIAL_STRESSED_LEG` code 107, ruling #9) — 7 total. This registry's OWN logic is
//             UNCHANGED (dup-throw, registration-order `all()`); only the `Loop10Module useFactory`
//             provider list grew.
//
// `HlCardProviderRegistry` — the closed set of 7 v1 LIVE HL card providers (5 decisions §6 RULING #4 + 2
// P3-C C8 ruling #9), built ONCE from the `Loop10Module` `useFactory` provider list (mirrors
// `ExceptionEffectRegistry` EXACTLY). A duplicate `providerType` throws at boot (the SAME
// loud-misconfiguration convention). `all()` returns providers in REGISTRATION order (deterministic —
// D13; matters only for the internal candidate-array build order, NOT for ranking, which the scorer's
// own stable tie-break owns).

import type { HlCardProvider, HlCardProviderType } from './hl-card-types';

export class HlCardProviderRegistry {
  private readonly byType = new Map<HlCardProviderType, HlCardProvider>();
  private readonly ordered: HlCardProvider[] = [];

  constructor(providers: HlCardProvider[]) {
    for (const p of providers) {
      if (this.byType.has(p.providerType)) {
        throw new Error(
          `HlCardProviderRegistry: duplicate provider for type '${String(p.providerType)}' — register each exactly ` +
            'once in the Loop10Module useFactory provider list.',
        );
      }
      this.byType.set(p.providerType, p);
      this.ordered.push(p);
    }
  }

  /** All 7 registered providers, in registration order. */
  all(): HlCardProvider[] {
    return [...this.ordered];
  }
}
