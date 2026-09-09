// IMPLEMENTS: docs/tech/18_api_protocol/versioning_strategy.md §Décision actée — URL versioning
//             -- session:2026-06-02 (Phase 0 Task 5) --
//
// URL (URI) versioning. versioning_strategy.md §Décision actée tranches the
// `06 §18` open decision: PRIMARY URL versioning `/v<major>/`, NO concurrent
// `Accept-Version` header negotiation (R-VS-1). The header `X-Api-Version` is
// exposed as a MIRROR on responses for tracing only — it does NOT negotiate
// (§Décision actée: "ne sert pas à la négociation"). All REST endpoints live
// under `/v<major>/<resource>` (§Conséquences) — realized via NestJS URI
// versioning so a controller declares `@Version('1')` and Nest prefixes `/v1`.

import { VersioningType, type VersioningOptions } from '@nestjs/common';

/**
 * The current GA major (versioning_strategy.md §Composite ApiVersion — `major`).
 * Day-1 the only served major is v1 (CURRENT). The multi-version cohabitation
 * (`ServerVersionMatrix`, per-major sub-modules) is a later-task concern; here we
 * pin the default served version to 1.
 */
export const CURRENT_API_MAJOR = 1;

/**
 * NestJS URI-versioning options. `type: URI` puts the version in the path
 * (`/v1/...`), `prefix: 'v'` yields the `/v` + major form mandated by 18
 * (`/v1/`, `/v2/`). `defaultVersion` makes v1 the served major when a controller
 * does not override it.
 *
 * Health is deliberately NOT versioned (versioning_strategy.md §Conséquences
 * lists `GET /healthz` among the non-versioned exceptions). The HealthController
 * carries `@Version(VERSION_NEUTRAL)` so it stays on the raw `/health` path,
 * outside the `/vN` prefix.
 */
export const URI_VERSIONING: VersioningOptions = {
  type: VersioningType.URI,
  prefix: 'v',
  defaultVersion: String(CURRENT_API_MAJOR),
};

/** Extract the `/v<major>/` major from a request path; defaults to CURRENT. */
export function apiMajorFromPath(path: string): number {
  const m = /^\/v(\d+)(\/|$)/.exec(path);
  return m ? Number.parseInt(m[1], 10) : CURRENT_API_MAJOR;
}
