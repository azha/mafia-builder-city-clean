// IMPLEMENTS: docs/superpowers/specs/2026-07-18-brennar-voice-per-outlet-design.md §2.1 (the
//             `OutletVoiced<T>` shape + `copyForOutlet` selector) — Phase-2b (coder), 2026-07-18
//
// Pure, zero-I/O module (mirrors `cooper-affair.ts`/`three-outlet-storm.ts`'s own posture) — kept OUT
// of `press-registry.ts` so that file stays static-substrate-only (design §2.1). The entire runtime
// diff of the "Brennar voice" lot funnels through this one file: every copy catalogue nests one level
// under `OutletVoiced<T>`, and every composer copy-lookup site becomes `copyForOutlet(<map>, outletKey)`
// instead of a direct property read.

import type { PressOutletKey } from './press-registry';

/**
 * `OutletVoiced<T>` (design §2.1): a per-variant copy entry `T` (e.g. `CooperCopyEntry`), carrying a
 * REQUIRED `default` (the pre-this-lot neutral EN string, demoted byte-identical — design §2.2 REUSE
 * rule) plus an OPTIONAL per-outlet override for any subset of the 3 canon outlets. Partial rollout is
 * therefore always safe (§2.5): a catalogue may voice 0, 1, 2, or all 3 outlets per variant.
 */
export type OutletVoiced<T> = { readonly default: T } & Partial<Readonly<Record<PressOutletKey, T>>>;

/**
 * The one total selector every copy-lookup site in the composer calls (design §2.4): `voiced[outletKey]
 * ?? voiced.default`. Never throws — an unknown/missing outlet key (a hypothetical 4th outlet, or a
 * variant that simply hasn't been voiced yet) degrades to `default`, exactly the pre-this-lot string
 * (design §2.5 fallback rule). `outletKey` is deliberately typed `string`, not `PressOutletKey`: callers
 * pass the beat's own already-resolved `outletKey`/`journalistKey`-derived string, and this function's
 * own job is to be safe against ANY input, not to re-validate the closed domain (that validation already
 * lives at `pressOutletByKey`, a DIFFERENT concern — resolving a real outlet entry vs. selecting copy).
 */
export function copyForOutlet<T>(voiced: OutletVoiced<T>, outletKey: string): T {
  return (voiced as Record<string, T | undefined>)[outletKey] ?? voiced.default;
}
