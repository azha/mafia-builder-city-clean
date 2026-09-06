// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             ("Module dsl/parser : parse source DSL → AST, diagnostics" — the parser is the FIRST stage of the DSL
//             engine; the compiler/executor are sibling stages added by T2/T3)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 1, DSL parser) --
//
// `DslModule` — the archetype-agnostic DSL engine module (07 §Implications NestJS). Slice-1 Task 1 ships ONLY the parser
// stage (`DslParserService`: source → tier-tagged AST). It is PURE (no DB, no scheduler, no auth) so the module has NO
// imports — just the provider + export. The downstream tasks ADD their stage to THIS module: T2 adds
// `DslCompilerService` (AST → IR + validation), T3 adds `DslExecutorService` (the sandboxed, budgeted interpreter). The
// `lieutenant/` module (T4) imports `DslModule` to parse/compile an attached behavior script.

import { Module } from '@nestjs/common';

import { DslCompilerService } from './compiler.service';
import { DslExecutorService } from './executor.service';
import { DslParserService } from './parser.service';

@Module({
  providers: [DslParserService, DslCompilerService, DslExecutorService],
  exports: [DslParserService, DslCompilerService, DslExecutorService],
})
export class DslModule {}
