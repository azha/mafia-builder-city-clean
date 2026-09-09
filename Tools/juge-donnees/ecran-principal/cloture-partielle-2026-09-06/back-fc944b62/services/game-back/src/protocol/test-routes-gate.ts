// IMPLEMENTS: docs/tech/18_api_protocol/envelope_format.md §_test routes (env-gate R-EC-2)
//             -- lot-1 remediation (TD-064) ; pattern: scheduler.module.ts:28 (CitySimTestController) --
//
// Pure predicate: are protocol _test controllers enabled in this environment?
//
// WHY extracted: the conditional mount in ProtocolModule (Task 2) uses this predicate, and by
// exporting a named pure function we can test the prod/dev boundary with a direct TS import
// (unit-pure strate légalisée, charte 27 §2(a) — zero stack/DB/mock) without booting the
// NestJS application. This is the ONLY way to prove refusal #2 (routes absent in production)
// since the E2E environment runs NODE_ENV=development and routes are intentionally ON there
// (envelope.spec.ts relies on _test/boom + _test/echo — charte requirement).
//
// Contract: returns `false` ONLY for NODE_ENV === 'production'. Any other value (including
// undefined) returns `true` — same semantics as scheduler.module.ts:32 + heat.module.ts:53 +
// deal-lek.module.ts:42 (the canonical pattern). The E2E compose stack does NOT set
// NODE_ENV=production (verified: docker-compose.yml:54,107 default is `development`), so test
// routes remain available in E2E, satisfying the envelope.spec.ts precondition.

/**
 * Returns `true` if protocol test controllers (`_test/boom`, `_test/echo`) should be mounted.
 * They are DISABLED in `production` and ENABLED in all other environments (development / test / unset).
 *
 * @param env — the NODE_ENV value to check (defaults to `process.env.NODE_ENV`).
 */
export function testControllersEnabled(env: string | undefined = process.env.NODE_ENV): boolean {
  return env !== 'production';
}
