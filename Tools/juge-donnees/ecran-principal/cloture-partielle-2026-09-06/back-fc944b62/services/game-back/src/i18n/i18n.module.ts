// IMPLEMENTS: docs/tech/19_i18n_strategy/string_extraction.md §Implications par couche — NestJS — backend jeu
//             -- session:2026-06-02 (Phase 0 Task 9) --
//
// `I18nModule` — hosts the string-table registry endpoint (`GET /v1/i18n/bundle`). No DB / DI deps:
// the registry is an in-process const (string_table.ts). The translation/CDN pipeline is DEFERRED.

import { Module } from '@nestjs/common';

import { I18nController } from './i18n.controller';

@Module({
  controllers: [I18nController],
})
export class I18nModule {}
