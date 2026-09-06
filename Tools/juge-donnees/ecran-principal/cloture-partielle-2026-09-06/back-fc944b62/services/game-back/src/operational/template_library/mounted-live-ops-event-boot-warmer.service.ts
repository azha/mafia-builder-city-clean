// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C4b (boot-warm hook for
//             `MountedLiveOpsEventStore`, design §3.6-B DD-RSK1 — "Warm : (1) au boot (hook
//             `OnApplicationBootstrap` du module template_library …)")
//             — 04g-D C4b — 2026-07-17
//
// `MountedLiveOpsEventBootWarmer` — a TINY, SEPARATE `OnApplicationBootstrap` provider whose ONLY job is
// `await MountedLiveOpsEventStore.reloadNow()` at boot. Deliberately NOT folded into `TemplateLibraryService`
// (that file's own C3 header explains WHY it stays untouched: it is directly imported by
// `template_library_registry.spec.ts`'s pure-module Playwright test, and MUST stay free of any transitive
// dependency that could complicate that direct import — this class has an EMPTY constructor, so it carries
// zero `@Inject(...)`-decorated parameters either way, but keeping the store-warm concern in its own file
// mirrors the SAME "one extra hook, not a shared method" pattern `AntiFomoValidator`'s own
// `OnApplicationBootstrap` already established for this exact reason). `TemplateLibraryModule`'s provider
// array order (this class listed after `TemplateLibraryService`/`AntiFomoValidator`) gives the SAME soft
// ordering guarantee those two hooks already rely on — NestJS bootstraps a module's own providers in array
// order absent an explicit DI dependency between them.
//
// The store itself (`operational/liveops/live-ops-mounted-event.store.ts`) is a plain module-level
// singleton (NOT a Nest provider) — this class only triggers its `reloadNow()`, it does not own any DB
// seam of its own (zero `@Inject(DB)` here).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { MountedLiveOpsEventStore } from '../liveops/live-ops-mounted-event.store';

@Injectable()
export class MountedLiveOpsEventBootWarmer implements OnApplicationBootstrap {
  private readonly logger = new Logger(MountedLiveOpsEventBootWarmer.name);

  async onApplicationBootstrap(): Promise<void> {
    await MountedLiveOpsEventStore.reloadNow();
    this.logger.log(
      `MountedLiveOpsEventBootWarmer: warmed ${MountedLiveOpsEventStore.size()} mounted LIVE_OPS reskin(s) ` +
      '(design §3.6-B DD-RSK1).',
    );
  }
}
