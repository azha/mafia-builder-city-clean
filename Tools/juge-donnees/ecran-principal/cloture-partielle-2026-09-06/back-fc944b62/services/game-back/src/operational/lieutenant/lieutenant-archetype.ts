// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/lieutenant_definition.md §Composite LieutenantArchetype
//             (the 6 canonical archetypes COOK | LOGISTICS | DISTRIBUTION | LAUNDERING | SECURITY | BOOKKEEPER —
//             a PROJECTION of the 14-role catalogue) + §Archetype projection (the 6 ↔ 14 mapping table: `COOK` ↔
//             `Operator` (× 4 substances)) +
//             docs/tech/04a_operational_systems/lieutenant_role_mapping.md §Invariants canoniques §1 + §Vue d'ensemble
//             (the EXHAUSTIVE 14-role canonical catalogue, `Operator` listed FIRST) +
//             docs/superpowers/specs/2026-06-07-phase-06-lieutenants-dsl-slice1-design.md §5 (role_id = the 14-role id;
//             the COOK archetype is DERIVED at runtime via LieutenantArchetype — 09 has NO role_archetype column)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 4, lieutenant entity) --
//
// The archetype ↔ role_id mapping (REUSE 04a/07 — never re-invented). The canonical `lieutenant` table (09) persists a
// `role_id integer` (the 14-role id); the behavioral ARCHETYPE (the 6-family projection) is DERIVED from it at runtime
// (09 deliberately has NO role_archetype column — lieutenant_definition.md §Composite LieutenantArchetype). This build
// registers ALL 6 archetypes via the binding registry — COOK/SECURITY/BOOKKEEPER/LOGISTICS/LAUNDERING/DISTRIBUTION
// (Phase-8 T2 lands DISTRIBUTION, the LAST archetype — the 6-archetype roster is now complete); each maps to a grounded
// 04a role_id below. The COOK archetype's sole 04a role is `Operator`
// (lieutenant_definition.md §Archetype projection: `COOK` ↔ `Operator (× 4 substances)`).
//
// GROUNDING THE COOK role_id (R2.3 — no invented number with no basis): 04a/lieutenant_role_mapping.md gives an
// EXHAUSTIVE 14-role catalogue but no literal int ids (the role_id is "the 14-role id", a stable index over that
// catalogue). The catalogue's canonical ORDER is fixed by 04a §Invariants canoniques §1 (the exhaustive list) AND the
// §Vue d'ensemble overview table — both enumerate the 14 roles in the SAME order, `Operator` FIRST. So a stable,
// 1-based representative role_id over that canonical order assigns `Operator` = 1. COOK therefore maps to role_id 1.
// T7's projection reuses THIS map (archetypeForRoleId) to derive the archetype back from the persisted role_id, so the
// recruit-side roleIdForArchetype() and the read-side archetypeForRoleId() are a single source of truth (no drift).

/**
 * The 9 canonical behavioral archetypes (lieutenant_definition.md §Composite LieutenantArchetype — verbatim for the
 * original 6 + `MUSCLE` added by 04b-B C3 DD-MUSCLE + `INTELLIGENCE` added by 04b-C C3 DD-INTEL +
 * `FACILITY_MANAGER` added by 04f-A C7 DD8).
 * `MUSCLE` is the 7th archetype (role_id=12); `INTELLIGENCE` is the 8th archetype (role_id=13);
 * `FACILITY_MANAGER` is the 9th archetype (role_id=15, D8 — code-owned, NOT one of the 04a 14-role catalogue
 * entries; see FACILITY_MANAGER_ROLE_ID below).
 * All are wired on the LIVE DSL registry via the single BINDING_REGISTRY_PROVIDER factory (lieutenant.module.ts).
 * INTELLIGENCE_ROLE_ID=13 is grounded in the 04a 14-role catalogue: `'Sector lead'` is the canon name at index 12
 * (1-based role_id=13), ∉ {1,3,4,6,8,10,12} — the bijection {1,3,4,6,8,10,12,13} holds.
 */
export type LieutenantArchetype =
  | 'COOK'
  | 'LOGISTICS'
  | 'DISTRIBUTION'
  | 'LAUNDERING'
  | 'SECURITY'
  | 'BOOKKEEPER'
  // 04b-B C3 DD-MUSCLE: the Muscle archetype (P4 legible assault scripts; requestAssault via CombatService).
  | 'MUSCLE'
  // 04b-C C3 DD-INTEL: the Intelligence archetype (info-warfare DSL binding; DIV-C1 option-i; the 8th archetype).
  | 'INTELLIGENCE'
  // 04f-A C7 DD8: the Facility manager archetype (maintenance auto-schedule DSL binding; the 9th archetype —
  // code-owned, no migration; see FACILITY_MANAGER_ROLE_ID).
  | 'FACILITY_MANAGER';

/**
 * The canonical 14-role catalogue order (04a §Invariants canoniques §1 / §Vue d'ensemble — exhaustive, `Operator`
 * first). 1-based: the role_id of role i is i+1's index... — i.e. ROLE_CATALOGUE_ORDER[k] is the role with role_id k+1.
 * `Operator` (index 0) ⇒ role_id 1 (the COOK archetype's sole role). The other 13 are listed for completeness / so the
 * stable index is unambiguous + auditable (later vectors map the other archetypes off this same order). NOT persisted —
 * a code-owned grounding of the 09 `role_id` integer to the 04a catalogue.
 */
export const ROLE_CATALOGUE_ORDER = [
  'Operator', // role_id 1 — COOK (× 4 substances)
  'Stash keeper', // role_id 2 — LOGISTICS
  'Cash custodian', // role_id 3 — BOOKKEEPER (this build; cash-custody role) ∈ LAUNDERING family in the canonical table (LAUNDERING takes role_id 4 in this build)
  'Front shop manager', // role_id 4 — LAUNDERING (this build; the front-shop laundering-injection role — Phase-8 T1)
  'Pipeline accountant', // role_id 5 — LAUNDERING
  'Courier coordinator', // role_id 6 — LOGISTICS
  'Runner coordinator', // role_id 7 — DISTRIBUTION
  'Dealer coordinator', // role_id 8 — DISTRIBUTION
  'Procurement specialist', // role_id 9 — LOGISTICS
  'Heat manager', // role_id 10 — SECURITY
  'Fixer', // role_id 11 — SECURITY
  'Muscle', // role_id 12 — SECURITY
  'Sector lead', // role_id 13 — late-game overlay
  'Chief of staff', // role_id 14 — late-game overlay
  // 04f-A C7 DD8: 'Facility manager' — a 15th entry, ADDITIVE beyond the 04a §14 EXHAUSTIVE 14-role catalogue
  // (docs/tech/04a_operational_systems/lieutenant_role_mapping.md §Vue d'ensemble stays the canon 14; this
  // entry does NOT amend that list — it is a code-owned addition layered on top, D8). No migration: role_id is
  // a plain int (lieutenant.ts:88, no FK/pgEnum), so a 15th value is a pure code change.
  'Facility manager', // role_id 15 — FACILITY_MANAGER (code-owned, 04f-A C7)
] as const;

/** The COOK archetype's role_id (the `Operator` role — first in the 04a catalogue order ⇒ role_id 1). */
export const COOK_ROLE_ID = 1;

/**
 * The SECURITY archetype's role_id (Phase-7 T2). GROUNDING (R2.3 — no invented number with no basis): the SECURITY
 * archetype projects onto the 04a roles `Heat manager` / `Fixer` / `Muscle` (lieutenant_definition.md §Archetype
 * projection — `SECURITY` ↔ `Heat manager`, `Fixer`, `Muscle`). Mirroring the COOK precedent (which takes `Operator`, the
 * FIRST role of its family in the 04a catalogue order ⇒ role_id 1), SECURITY takes the FIRST of its family roles in that
 * SAME canonical order (ROLE_CATALOGUE_ORDER): `Heat manager` (index 9) ⇒ role_id 10. So SECURITY maps to role_id 10.
 */
export const SECURITY_ROLE_ID = 10;

/**
 * The BOOKKEEPER archetype's role_id (Phase-7 T3). GROUNDING (R2.3 — no invented number with no basis): the canonical 6↔14
 * archetype-projection table (lieutenant_definition.md §Archetype projection) lists BOOKKEEPER as "transverse — TBD"
 * (chunk 07.17 `bookkeeper_archetype.md`), i.e. it has no settled FAMILY of 04a roles like COOK/SECURITY do. The Phase-7
 * plan grounds the DELEGATED BOOKKEEPER binding (auto-deposit clean cash into a money_holding) on the 04a role whose
 * SYSTEM is cash CUSTODY — `Cash custodian` (04a/lieutenant_role_mapping.md §Vue d'ensemble: "Safehouse + Erlang slot
 * management" — the cash-holding role). In the canonical 14-role catalogue order (ROLE_CATALOGUE_ORDER), `Cash custodian`
 * is index 2 ⇒ role_id 3. So this build's BOOKKEEPER maps to role_id 3. (NB `Cash custodian` is ALSO one of the LAUNDERING
 * archetype's projected roles in the canonical table, but the shipped LAUNDERING binding (Phase-8 T1) deliberately takes a
 * DIFFERENT role from its family — `Front shop manager` (role_id 4) — so there is NO live role_id collision: role_id 3 is
 * claimed only by BOOKKEEPER in this build's roleIdForArchetype / archetypeForRoleId. The catalogue annotation that tags
 * index 2 "LAUNDERING" reflects that canonical-table membership; see LAUNDERING_ROLE_ID for the role it actually claims.)
 */
export const BOOKKEEPER_ROLE_ID = 3;

/**
 * The LOGISTICS archetype's role_id (Phase-7 T4). GROUNDING (R2.3 — no invented number with no basis): the LOGISTICS
 * archetype projects onto the 04a roles `Stash keeper` / `Courier coordinator` / `Procurement specialist`
 * (lieutenant_definition.md §Archetype projection — LOGISTICS is the product-movement family). The DELEGATED LOGISTICS
 * binding (auto-dispatch a courier source→target via DistributionService.dispatch) is grounded on the 04a role whose
 * SYSTEM is exactly courier dispatch + route management — `Courier coordinator` (04a/lieutenant_role_mapping.md §Vue
 * d'ensemble: "Courier dispatch + route management"; §Cross-cutting cross-refs it to distribution_couriers_runners.md
 * chunk 9 — the dispatch system this binding consumes). In the canonical 14-role catalogue order (ROLE_CATALOGUE_ORDER),
 * `Courier coordinator` is index 5 ⇒ role_id 6. So this build's LOGISTICS maps to role_id 6. NO COLLISION with the
 * already-registered set {COOK=1, BOOKKEEPER=3, SECURITY=10}: 6 ∉ {1,3,10}, so roleIdForArchetype / archetypeForRoleId
 * stay a clean bijection over the live archetypes. (The other LOGISTICS-family roles `Stash keeper` (role_id 2) /
 * `Procurement specialist` (role_id 9) stay unclaimed — a future LOGISTICS sub-binding could take one, no current clash.)
 */
export const LOGISTICS_ROLE_ID = 6;

/**
 * The LAUNDERING archetype's role_id (Phase-8 T1). GROUNDING (R2.3 — no invented number with no basis): the LAUNDERING
 * archetype projects onto the 04a roles `Front shop manager` / `Pipeline accountant` (lieutenant_definition.md §Archetype
 * projection — LAUNDERING is the front-shop laundering-pipeline family). The DELEGATED LAUNDERING binding (auto-inject
 * safehouse cash into a front-shop's Stage-1 laundering node via LaunderingService.inject) is grounded on the 04a role
 * whose SYSTEM is exactly the front-shop laundering injection — `Front shop manager` (04a/lieutenant_role_mapping.md
 * §Vue d'ensemble: the front-shop laundering-injection role; the system this binding consumes is laundering_pipeline.md
 * §Stage 1). Mirroring the COOK/SECURITY/LOGISTICS precedent (which take the FIRST role of their family in the 04a
 * catalogue order), LAUNDERING takes the FIRST of its family roles in that SAME canonical order (ROLE_CATALOGUE_ORDER):
 * `Front shop manager` (index 3) ⇒ role_id 4. So this build's LAUNDERING maps to role_id 4. NO COLLISION with the
 * already-registered set {COOK=1, BOOKKEEPER=3, LOGISTICS=6, SECURITY=10}: 4 ∉ {1,3,6,10}, so roleIdForArchetype /
 * archetypeForRoleId stay a clean bijection over the live archetypes. (The other LAUNDERING-family role `Pipeline
 * accountant` (role_id 5) stays unclaimed — a future LAUNDERING sub-binding could take it, no current clash. NB the
 * canonical table also lists `Cash custodian` (role_id 3) in the LAUNDERING family, but role_id 3 is claimed by BOOKKEEPER
 * in this build — see BOOKKEEPER_ROLE_ID; LAUNDERING deliberately takes its OWN family role `Front shop manager` so there
 * is no clash.)
 */
export const LAUNDERING_ROLE_ID = 4;

/**
 * The DISTRIBUTION archetype's role_id (Phase-8 T2 — the LAST archetype). GROUNDING (R2.3 — no invented number with no
 * basis): the DISTRIBUTION archetype projects onto the 04a roles `Runner coordinator` / `Dealer coordinator`
 * (lieutenant_definition.md §Archetype projection — DISTRIBUTION is the dealer/runner street-distribution family). The
 * DELEGATED DISTRIBUTION binding (auto-collect a dealer-spot's accumulated float into a safehouse via SellingService.
 * collect — the runner pickup) is grounded on the 04a role whose SYSTEM is exactly dealer coordination + the runner
 * float pickup — `Dealer coordinator` (04a/lieutenant_role_mapping.md §Vue d'ensemble: the dealer-spot / runner-pickup
 * role; the system this binding consumes is selling_dealers_leks.md §Lek control vs dealer assignment — "Runners pickup
 * dealer float"). In the canonical 14-role catalogue order (ROLE_CATALOGUE_ORDER), `Dealer coordinator` is index 7 ⇒
 * role_id 8. So this build's DISTRIBUTION maps to role_id 8. NO COLLISION with the already-registered set
 * {COOK=1, BOOKKEEPER=3, LAUNDERING=4, LOGISTICS=6, SECURITY=10}: 8 ∉ {1,3,4,6,10}, so roleIdForArchetype /
 * archetypeForRoleId are now a COMPLETE clean bijection over all 6 live archetypes {1,3,4,6,8,10}. (The other
 * DISTRIBUTION-family role `Runner coordinator` (role_id 7) stays unclaimed — a future DISTRIBUTION sub-binding could take
 * it, no current clash. NB DISTRIBUTION deliberately takes `Dealer coordinator` — the dealer-float-collection role this
 * binding consumes — rather than `Runner coordinator`, mirroring the COOK/SECURITY/LOGISTICS/LAUNDERING precedent of
 * grounding on the role whose SYSTEM the binding actually drives.)
 */
export const DISTRIBUTION_ROLE_ID = 8;

/**
 * The MUSCLE archetype's role_id (04b-B C3 DD-MUSCLE). GROUNDING (R2.3 — no invented number with no basis):
 * the 04a 14-role catalogue (`lieutenant_role_mapping.md §Invariants canoniques §1 / §Vue d'ensemble`) lists the role
 * `'Muscle'` at index 11 (0-based) in the canonical `ROLE_CATALOGUE_ORDER` → 1-based role_id = 12.
 * `'Muscle'` is the CANON NAME (not a PROV fabrication): the catalogue entry is `'Muscle'` verbatim.
 * NO COLLISION: 12 ∉ {1 (COOK), 3 (BOOKKEEPER), 4 (LAUNDERING), 6 (LOGISTICS), 8 (DISTRIBUTION), 10 (SECURITY)}.
 * The bijection {1,3,4,6,8,10,12} remains clean after adding MUSCLE.
 * (Roles 2 `Stash keeper`, 5 `Pipeline accountant`, 7 `Runner coordinator`, 9 `Procurement specialist`,
 *  11 `Fixer`, 13 `Sector lead`, 14 `Chief of staff` stay unclaimed — no clash.)
 */
export const MUSCLE_ROLE_ID = 12;

/**
 * The INTELLIGENCE archetype's role_id (04b-C C3 DD-INTEL). GROUNDING (R2.3 — no invented number with no basis):
 * the 04a 14-role catalogue (`lieutenant_role_mapping.md §Invariants canoniques §1 / §Vue d'ensemble`) lists the role
 * `'Sector lead'` at index 12 (0-based) in the canonical `ROLE_CATALOGUE_ORDER` → 1-based role_id = 13.
 * `'Sector lead'` is the CANON NAME at that index (the first of the two late-game overlay roles).
 * NO COLLISION: 13 ∉ {1 (COOK), 3 (BOOKKEEPER), 4 (LAUNDERING), 6 (LOGISTICS), 8 (DISTRIBUTION), 10 (SECURITY), 12 (MUSCLE)}.
 * The bijection {1,3,4,6,8,10,12,13} remains clean after adding INTELLIGENCE.
 * [PROV-Y26Q2] INTELLIGENCE binds the 'Sector lead' slot — this is the info-warfare / surveillance
 * operative role; when canon makes the Sector lead role's archetype explicit, update this grounding.
 * (Role 14 `Chief of staff` stays unclaimed — no clash.)
 */
export const INTELLIGENCE_ROLE_ID = 13;

/**
 * The FACILITY_MANAGER archetype's role_id (04f-A C7, DD8 — code-owned, NOT a migration). GROUNDING: unlike
 * every archetype above, `Facility manager` is NOT one of the 04a `lieutenant_role_mapping.md` §14
 * EXHAUSTIVE-canon 14 roles — it is a NEW, backend-only 15th catalogue entry (`ROLE_CATALOGUE_ORDER` index 14,
 * 0-based ⇒ role_id 15) added specifically for the 04f-A maintenance-decay lot's auto-schedule delegation.
 * NO COLLISION: 15 ∉ {1,3,4,6,8,10,12,13} — the bijection {1,3,4,6,8,10,12,13,15} remains clean after adding
 * FACILITY_MANAGER. (Role_id 14, `Chief of staff`, stays unclaimed — no clash.)
 */
export const FACILITY_MANAGER_ROLE_ID = 15;

/** The COOK-host operational building types (04a §Operator: LAB/REFINERY/PRESS_HOUSE/SPECIALIZED_LAB ops). Slice 1
 *  recruits a COOK on a `lab` (the M1 Brindle host — the only COOK-host type wired end-to-end this slice). */
export const COOK_HOST_OPERATIONAL_TYPES = new Set<string>(['lab']);

/**
 * The WRITE-SIDE archetype → role_id map (the generic recruit persists `role_id = roleIdForArchetype(archetype)`). The
 * INVERSE of {@link archetypeForRoleId} — the two stay a single source of truth (no drift between the int written and the
 * archetype read back). Phase-7 T1 maps COOK (→ the grounded `Operator` role_id 1); T2 added SECURITY (→ `Heat manager`
 * role_id 10); T3 added BOOKKEEPER (→ `Cash custodian` role_id 3); T4 added LOGISTICS (→ `Courier coordinator` role_id 6);
 * Phase-8 T1 added LAUNDERING (→ `Front shop manager` role_id 4); Phase-8 T2 added DISTRIBUTION (→ `Dealer coordinator`
 * role_id 8 — the LAST archetype, completing the {1,3,4,6,8,10} bijection), each grounded in the 04a 14-role catalogue
 * order — see {@link ROLE_CATALOGUE_ORDER}. An
 * archetype with no role_id mapped here yet throws (a programming error — the recruit's registry.require gate rejects an
 * unregistered archetype with 422 BEFORE this is reached, so a thrown here means a binding was registered without a
 * role_id mapping, which its task must add together).
 */
export function roleIdForArchetype(archetype: LieutenantArchetype): number {
  switch (archetype) {
    case 'COOK':
      return COOK_ROLE_ID;
    case 'SECURITY':
      return SECURITY_ROLE_ID;
    case 'BOOKKEEPER':
      return BOOKKEEPER_ROLE_ID;
    case 'LOGISTICS':
      return LOGISTICS_ROLE_ID;
    case 'LAUNDERING':
      return LAUNDERING_ROLE_ID;
    case 'DISTRIBUTION':
      return DISTRIBUTION_ROLE_ID;
    // 04b-B C3 DD-MUSCLE: MUSCLE → `Muscle` (index 11 in ROLE_CATALOGUE_ORDER → role_id 12).
    case 'MUSCLE':
      return MUSCLE_ROLE_ID;
    // 04b-C C3 DD-INTEL: INTELLIGENCE → `Sector lead` (index 12 in ROLE_CATALOGUE_ORDER → role_id 13).
    case 'INTELLIGENCE':
      return INTELLIGENCE_ROLE_ID;
    // 04f-A C7 DD8: FACILITY_MANAGER → `Facility manager` (index 14 in ROLE_CATALOGUE_ORDER → role_id 15).
    case 'FACILITY_MANAGER':
      return FACILITY_MANAGER_ROLE_ID;
    default:
      throw new Error(
        `roleIdForArchetype: no role_id mapped for archetype '${String(archetype)}' — ` +
          'add it alongside its ArchetypeBinding (the 04a 14-role catalogue order grounds the int).',
      );
  }
}

/**
 * Derive the behavioral ARCHETYPE from a persisted `role_id` (the read-side inverse of {@link roleIdForArchetype}; T7's
 * projection consumes it). Phase-7 materialized COOK (role_id 1 ⇒ Operator) + SECURITY (role_id 10 ⇒ Heat manager) +
 * BOOKKEEPER (role_id 3 ⇒ Cash custodian) + LOGISTICS (role_id 6 ⇒ Courier coordinator); Phase-8 T1 adds LAUNDERING
 * (role_id 4 ⇒ Front shop manager); Phase-8 T2 adds DISTRIBUTION (role_id 8 ⇒ Dealer coordinator — the LAST archetype, so
 * all 6 archetypes now resolve {1,3,4,6,8,10}); a role_id outside the mapped set returns null (a non-materialized 14-role
 * id — and the projection then surfaces a neutral archetype). Kept here so recruit + the projection
 * share ONE mapping (no drift between
 * the int written and the archetype read back); each archetype's role_id is added alongside in {@link roleIdForArchetype}.
 */
export function archetypeForRoleId(roleId: number): LieutenantArchetype | null {
  if (roleId === COOK_ROLE_ID) return 'COOK';
  if (roleId === SECURITY_ROLE_ID) return 'SECURITY';
  if (roleId === BOOKKEEPER_ROLE_ID) return 'BOOKKEEPER';
  if (roleId === LOGISTICS_ROLE_ID) return 'LOGISTICS';
  if (roleId === LAUNDERING_ROLE_ID) return 'LAUNDERING';
  if (roleId === DISTRIBUTION_ROLE_ID) return 'DISTRIBUTION';
  // 04b-B C3 DD-MUSCLE: MUSCLE_ROLE_ID=12 → 'MUSCLE' (canon 'Muscle' role at index 11).
  if (roleId === MUSCLE_ROLE_ID) return 'MUSCLE';
  // 04b-C C3 DD-INTEL: INTELLIGENCE_ROLE_ID=13 → 'INTELLIGENCE' (canon 'Sector lead' role at index 12).
  if (roleId === INTELLIGENCE_ROLE_ID) return 'INTELLIGENCE';
  // 04f-A C7 DD8: FACILITY_MANAGER_ROLE_ID=15 → 'FACILITY_MANAGER' (the code-owned 'Facility manager' entry).
  if (roleId === FACILITY_MANAGER_ROLE_ID) return 'FACILITY_MANAGER';
  return null;
}

/** The DSL peer-role vocabulary (the 6 archetype names, lowercase — the `role` a PEER_STATE reference may name). Passed
 *  to the compiler as `knownPeerRoles` so the (archetype-AGNOSTIC) engine can diagnose an unknown role without importing
 *  the archetype enum. */
export const DSL_PEER_ROLES: ReadonlySet<string> = new Set([
  'cook',
  'security',
  'bookkeeper',
  'logistics',
  'laundering',
  'distribution',
  // 04b-B C3 DD-MUSCLE: 'muscle' added as the 7th DSL peer role.
  'muscle',
  // 04b-C C3 DD-INTEL: 'intelligence' added as the 8th DSL peer role.
  'intelligence',
  // 04f-A C7 DD8: 'facility_manager' added as the 9th DSL peer role (the token form of `Facility manager` — a
  // single lowercase-underscore ident, parseable by the DSL lexer's bare-ident rule; NOT the literal
  // space-containing prose label, which could never lex as a single PEER_STATE role token).
  'facility_manager',
]);

/** Map a DSL peer-role name (lowercase, e.g. `cook`) → its LieutenantArchetype, or null if not a known role. The TICK
 *  uses this to resolve a peer reference to a role_id (archetypeForDslRole → roleIdForArchetype). */
export function archetypeForDslRole(name: string): LieutenantArchetype | null {
  switch (name.toLowerCase()) {
    case 'cook': return 'COOK';
    case 'security': return 'SECURITY';
    case 'bookkeeper': return 'BOOKKEEPER';
    case 'logistics': return 'LOGISTICS';
    case 'laundering': return 'LAUNDERING';
    case 'distribution': return 'DISTRIBUTION';
    // 04b-B C3 DD-MUSCLE: 'muscle' added.
    case 'muscle': return 'MUSCLE';
    // 04b-C C3 DD-INTEL: 'intelligence' added.
    case 'intelligence': return 'INTELLIGENCE';
    // 04f-A C7 DD8: 'facility_manager' added.
    case 'facility_manager': return 'FACILITY_MANAGER';
    default: return null;
  }
}
