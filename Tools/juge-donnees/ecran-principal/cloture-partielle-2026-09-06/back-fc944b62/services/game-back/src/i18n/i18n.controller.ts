// IMPLEMENTS: docs/tech/19_i18n_strategy/string_extraction.md §Source of truth — dictionnaires
//             + §Build integration (the client pulls the locale bundle; the back serves the registry)
//             -- session:2026-06-02 (Phase 0 Task 9) --
//
// `I18nController` — exposes the key→ICU-template registry so the CLIENT can render player-facing
// strings (F1: the back emits keys + serves templates; it NEVER translates a literal inline, R-EH-2).
//
// Skeleton scope: a single read endpoint `GET /v1/i18n/bundle?locale=<code>`. The full pipeline
// (CDN bundle build, dictionary_refresh_interval pull, locale validation, codegen) is DEFERRED
// (string_extraction.md §Docker / infra — "push CDN au merge sur master").

import { Controller, Get, Query } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { normalizeLocale, resolveBundle } from './string_table';

/** The success `data` of the bundle endpoint (the interceptor wraps it in a ResponseEnvelope). */
interface I18nBundle {
  locale: string;
  /** key → ICU-MessageFormat template. The client renders against runtime vars (F1). */
  messages: Record<string, string>;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class I18nController {
  /**
   * `GET /v1/i18n/bundle?locale=<code>` — return the merged key→template map for a locale.
   * Public (no auth — the dictionary is not player data; R2.2 inverted does not apply: these are
   * UI strings, not a per-player projection). An unsupported / missing locale falls back to the
   * canonical EN (supported_locales.md fallback chain).
   */
  @Get('i18n/bundle')
  bundle(@Query('locale') locale?: string): I18nBundle {
    const resolved = normalizeLocale(locale);
    return { locale: resolved, messages: resolveBundle(resolved) };
  }
}
