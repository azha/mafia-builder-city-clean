// IMPLEMENTS: docs/tech/20_telemetry_analytics/telemetry_principles.md §6 Tunables `T.telemetry.*`
//             + event_catalog.md / event_taxonomy.md §2.2 (event_payload_max_bytes bounds the payload)
//             -- session:2026-06-02 (Phase 0 Task 9) --
//
// Telemetry-layer tunables (`T.telemetry.*`).
//
// R2.3: numeric balance values live ONLY in the registry, never inline as magic numbers. The
// `T.telemetry.*` namespace is OPENED by telemetry_principles.md §6 (default_sampling_rate,
// pii_event_retention_days, anonymous_event_retention_days) and EXTENDED by event_catalog/taxonomy
// with `event_payload_max_bytes` (the payload bound cited by event_taxonomy.md §2.2 "pas de valeur
// dans le nom — les valeurs vivent dans le payload borné").
//
// Like `T.api.*` (protocol-tunables.ts) and `T.auth.*` (auth-tunables.ts), `gdd/14 §Telemetry`
// is NOT YET CONSOLIDATED with calibrated defaults/ranges for these keys ([PROV-Y26Q2] in the spec).
// We therefore surface env-overridable PLACEHOLDER defaults (within the documented bands) so the
// ingestion layer is functional, and FLAG it as DEBT: when `gdd/14 §Telemetry` is consolidated with
// the real defaults/ranges, update this map in the SAME commit (R9.3 propagation) and replace the
// placeholders with the registry values. Do NOT edit gdd/14 from here.
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../config/tunables-store';

export const telemetryTunables = {
  /**
   * T.telemetry.event_payload_max_bytes (PLACEHOLDER — not yet calibrated in gdd/14, see header).
   * Bounds the serialized `payload` jsonb (schema_telemetry_event.md §2 "payload jsonb borné
   * T.telemetry.event_payload_max_bytes ; AUCUNE PII civile"). The ingestion rejects an oversized
   * payload before INSERT. Default 8 KiB — a generous bound for a minimal analytic event.
   * Env override: `TELEMETRY_EVENT_PAYLOAD_MAX_BYTES`. (DB-override > env > default — Phase-23).
   */
  get eventPayloadMaxBytes(): number {
    return TunablesStore.resolveInt('T.telemetry.event_payload_max_bytes', 'TELEMETRY_EVENT_PAYLOAD_MAX_BYTES', 8 * 1024);
  },

  /**
   * T.telemetry.default_sampling_rate (PLACEHOLDER). Default-1.0 sampling (collecte intégrale) —
   * the skeleton does NOT drop events (telemetry_principles.md §2.4: critical events are never
   * sampled; sampling of high-volume events is a later calibration). Surfaced so no bare 1.0 sits
   * inline. Env override: `TELEMETRY_DEFAULT_SAMPLING_RATE`. (DB-override > env > default — Phase-23).
   */
  get defaultSamplingRate(): number {
    return TunablesStore.resolveFloat('T.telemetry.default_sampling_rate', 'TELEMETRY_DEFAULT_SAMPLING_RATE', 1.0);
  },
};
