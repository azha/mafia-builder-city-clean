using System;

namespace MafiaCleanCity.Operational.Lieutenant
{
    // ---------------------------------------------------------------------
    // Wire DTOs for the Phase-9 lieutenant rule-editor surface (COOK loop).
    // Field names are snake_case to match JsonUtility ↔ the NestJS contracts
    // (services/game-back/src/operational/lieutenant/*). Captured from the live
    // controller + projection + the DSL error type — no guessing (the T14 lesson):
    //   - POST /v1/lieutenants                              → { lieutenant_id }
    //   - GET  /v1/lieutenants/:id                          → LieutenantBands
    //   - POST /v1/lieutenants/:id/behavior-script[/validate] → { attached:true } / { valid:true }
    //     ; 422 VALIDATION_FAILED → error.details = DslDiagnostic[]
    //
    // R2.2 (information asymmetry): the projection (T2) is band STRINGS + the player-authored
    // script_source — never a raw scalar (no role_id / tenure / tick / raw rule count). The
    // recruit/attach/validate POSTs are ids / booleans. The 422 `details` are structured
    // diagnostics the client RENDERS (T3) — it never re-implements parse/compile.
    //
    // T1 (this task) uses only the recruit shapes (RecruitRequest* + RecruitResponse/Envelope)
    // and the error envelope (LieutenantError* + DslDiagnostic). The projection (LieutenantBands)
    // and validate/attach (BoolResult*) DTOs are declared now — cheap — so T2/T3 add their client
    // methods + render without re-touching the contract shapes.
    // ---------------------------------------------------------------------

    // ----- Request bodies (POST; require Bearer + UUID-v4 Idempotency-Key) -----

    // POST /v1/lieutenants  { archetype, assigned_building_id }  (the COOK loop — no dispatch target).
    [Serializable]
    public class RecruitRequest
    {
        public string archetype;            // COOK | SECURITY | BOOKKEEPER | LOGISTICS | LAUNDERING | DISTRIBUTION
        public string assigned_building_id; // the player-owned operational building to assign (a COOK requires a lab)
    }

    // POST /v1/lieutenants  { archetype, assigned_building_id, target_building_id }  (target ONLY when present — the
    // LOGISTICS dispatch DESTINATION). A separate DTO because JsonUtility cannot conditionally omit a field; the client
    // picks this shape only when a target is supplied (COOK/SECURITY/BOOKKEEPER use RecruitRequest, no target key).
    [Serializable]
    public class RecruitRequestWithTarget
    {
        public string archetype;
        public string assigned_building_id;
        public string target_building_id;  // LOGISTICS dispatch destination
    }

    // POST /v1/lieutenants/:id/reassign  { assigned_building_id }  (move a lieutenant to a NEW building — Phase-11 B2; no
    // dispatch target). The same with/without-target split as recruit: JsonUtility cannot conditionally omit a field, so the
    // client picks ReassignRequest (no target key) for COOK/SECURITY/BOOKKEEPER and ReassignRequestWithTarget when a target
    // is supplied (the dispatch archetypes). The backend normalizes an absent target to null (same as recruit).
    [Serializable]
    public class ReassignRequest
    {
        public string assigned_building_id; // the NEW player-owned operational building to move the lieutenant to
    }

    // POST /v1/lieutenants/:id/reassign  { assigned_building_id, target_building_id }  (target ONLY when present — the
    // LOGISTICS/LAUNDERING/DISTRIBUTION dispatch DESTINATION on the new assignment).
    [Serializable]
    public class ReassignRequestWithTarget
    {
        public string assigned_building_id;
        public string target_building_id;  // dispatch destination on the new assignment
    }

    // POST /v1/lieutenants/:id/behavior-script[/validate]  { source }  (the player-authored DSL text — T3).
    [Serializable]
    public class BehaviorScriptRequest
    {
        public string source;
    }

    // ----- Success response payloads (payload.data) -----

    // POST /v1/lieutenants → { lieutenant_id }
    [Serializable]
    public class RecruitResponse
    {
        public string lieutenant_id; // uuid identity of the recruited lieutenant
    }

    [Serializable] public class RecruitEnvelope { public RecruitPayload payload; }
    [Serializable] public class RecruitPayload { public RecruitResponse data; }

    // GET /v1/lieutenants/:id → the qualitative band projection (T2; R2.2 inverted — every field a CLOSED-domain band
    // STRING, plus the ONE allowed readable field script_source). Captured from LieutenantProjectionService's
    // LieutenantBands interface (archetype / granted_role / mode / op_state_band / rule_count_band / script_source).
    [Serializable]
    public class LieutenantBands
    {
        /// <summary>⛔ SERVI DEPUIS TOUJOURS ET LU PAR PERSONNE — `reassign_availability`
        /// (AVAILABLE | ON_COOLDOWN | …). Mesuré le 2026-09-06 : **0 site actif** dans tout
        /// `Assets/Scripts`, alors que `GET /v1/lieutenants/:id` le rend (corps commité,
        /// `demo_capture`, horloge 72 013, valeur `AVAILABLE`).
        /// ⇒ CE QUE SON ABSENCE COÛTAIT : `ReassignChosen()` gardait l'authentification, la
        ///   sélection et le bâtiment de destination — **jamais la disponibilité**. Un joueur en
        ///   période de latence voyait donc le geste offert, le confirmait, et récoltait un 409.
        ///   *Un geste impossible qu'on laisse cliquer n'est pas une erreur de serveur : c'est
        ///   une promesse que l'écran n'avait pas le droit de faire.*</summary>
        public string reassign_availability;
        /// <summary>⛔ LE MÊME CHAMP, LA MÊME OMISSION, SUR L'AUTRE ROUTE. `name` était servi par
        /// `GET /v1/lieutenants` ET par `GET /v1/lieutenants/:id` — deux routes, un seul contrat
        /// de projection. D-1 a déclaré le champ sur la LISTE et laissé le DÉTAIL sans lui : le
        /// panneau de détail nomme donc l'archétype, le rôle, le mode, l'état, les règles et
        /// l'ancienneté d'un lieutenant, et jamais le lieutenant.
        /// ★★ *Fermer une omission sur la route qu'on regardait ne la ferme pas sur sa sœur* —
        ///   c'est le correctif scopé à l'INSTANCE, appliqué à un contrat servi en deux
        ///   exemplaires. La CLASSE ici est « les routes qui servent cette projection », et elles
        ///   se comptent avant d'écrire le correctif, pas après le rapport du juge.</summary>
        public string name;
        public string archetype;        // COOK | SECURITY | BOOKKEEPER | LOGISTICS | LAUNDERING | DISTRIBUTION | UNKNOWN
        public string granted_role;     // advisory | executor | delegated_owner | cohort_overseer (CLOSED 07 domain)
        public string mode;             // tasked | delegated (CLOSED 07 domain)
        public string op_state_band;    // PAUSED | ACTIVE | IDLE — the delegated operational state band
        public string rule_count_band;  // NONE | FEW | MANY — the behavior-script rule count as a band (never the raw count)
        public string script_source;    // the player-authored DSL text (the ONE explicitly-allowed non-band field; "" if none)
        // ----- Phase-11 tenure-inertia bands (NEW; A5 backend contract — closed-domain band STRINGS, never a raw scalar) -----
        public string tenure_bucket;          // FRESH | ACCLIMATED | SEASONED | SENIOR | ENTRENCHED — DERIVED from the BO-only streak (raw tenure_score NEVER escapes)
        public string script_revision_cost;   // COST_1 | COST_2 | COST_3 | COST_MAX — how expensive re-scripting is (the inertia COST), DERIVED from the bucket
        public string reassignment_disruption;// DISRUPT_SHORT | DISRUPT_MED | DISRUPT_LONG | DISRUPT_MAX — the settling-window drag after a move, DERIVED from the bucket
        public string role_efficiency_bonus;  // BONUS_NONE | BONUS_LOW | BONUS_MID | BONUS_CAP — the tenure yield reward (NONE = no change for a FRESH one), DERIVED from the bucket
    }

    [Serializable] public class LieutenantBandsEnvelope { public LieutenantBandsPayload payload; }
    [Serializable] public class LieutenantBandsPayload { public LieutenantBands data; }

    // GET /v1/lieutenants → the band-only ROSTER projection (B2; A1 backend contract). payload.data is
    // { lieutenants: RosterRow[] } — one row per delegated lieutenant the player owns ([] when none). Each row is
    // R2.2-safe: the identity uuid (an opaque key, not a scalar) + closed-domain band STRINGS only (archetype /
    // op_state_band / rule_count_band) — never a raw role_id / building-id / rule count. The roster RENDERS these bands
    // and lets the player Open one (→ load its full bands via GET /v1/lieutenants/:id); it never derives a scalar.
    [Serializable]
    public class RosterRow
    {
        public string lieutenant_id;    // uuid identity of the lieutenant (the Open key; opaque, not a scalar)
        /// <summary>⛔⛔ LE NOM ÉTAIT SERVI ET LE CLIENT LE JETAIT — forme F, côté client.
        /// Mesuré le 2026-09-06 sur le corps de `GET /v1/lieutenants` (`demo_capture`, horloge
        /// 72 013) : le serveur rend **six** clés — `lieutenant_id · name · archetype ·
        /// op_state_band · rule_count_band · tenure_bucket` — et ce DTO n'en déclarait que
        /// **cinq**. `JsonUtility` ignore en silence ce qu'il ne sait pas nommer.
        /// ⇒ Conséquence à l'écran, relevée par le juge ⊥ à la bbox : l'organigramme affichait
        ///   l'ARCHÉTYPE à la place du nom, et les trois lieutenants du compte étant tous `COOK`,
        ///   le joueur lisait **« Cuisinier » trois fois** au lieu de `Lt. Oster / Lt. Brasse /
        ///   Lt. Sallo`. *Un champ absent d'un DTO ne lève rien : il se voit à l'écran, sous la
        ///   forme d'un autre champ qui prend sa place.*</summary>
        public string name;             // le nom de fiction du lieutenant (servi ; jamais dérivé côté client)
        public string archetype;        // COOK | SECURITY | BOOKKEEPER | LOGISTICS | LAUNDERING | DISTRIBUTION | UNKNOWN
        public string op_state_band;    // PAUSED | ACTIVE | IDLE — the delegated operational state band
        public string rule_count_band;  // NONE | FEW | MANY — the behavior-script rule count as a band (never the raw count)
        public string tenure_bucket;    // FRESH | ACCLIMATED | SEASONED | SENIOR | ENTRENCHED — the roster's tenure band (Phase-11; the filter-by-bucket teaser surface). The roster carries ONLY the bucket (NOT the 3 effect bands — those live on the detail GET /:id).
    }

    [Serializable] public class RosterListData { public RosterRow[] lieutenants; }
    [Serializable] public class RosterListEnvelope { public RosterListPayload payload; }
    [Serializable] public class RosterListPayload { public RosterListData data; }

    // POST /v1/lieutenants/:id/behavior-script → { attached:true } ; .../validate → { valid:true } (T3). One DTO covers
    // both boolean acks — the client reads the relevant flag (attached / valid) off the parsed data.
    [Serializable]
    public class BoolResult
    {
        public bool attached; // POST .../behavior-script
        public bool valid;    // POST .../behavior-script/validate
    }

    [Serializable] public class BoolResultEnvelope { public BoolResultPayload payload; }
    [Serializable] public class BoolResultPayload { public BoolResult data; }

    // ----- Error envelope (payload.error) -----

    // A single structured DSL diagnostic — mirrors the backend's DslDiagnostic (src/dsl/dsl-errors.ts): a 1-based
    // line/col source span in the player-authored text, a plain-English message, and a stable kind (SYNTAX_ERROR |
    // TIER_NOT_UNLOCKED | NOT_SUPPORTED_YET | RULE_COUNT_EXCEEDED | PRIORITY_OUT_OF_BOUNDS | CONDITION_DEPTH_EXCEEDED).
    // The 422 VALIDATION_FAILED error carries these in error.details; the client RENDERS them near the offending rule
    // (T3) — it never re-implements parse/compile (the backend is authoritative for DSL validity).
    [Serializable]
    public class DslDiagnostic
    {
        public int line;       // 1-based source line of the offending token
        public int col;        // 1-based source column of the offending token
        public string message; // plain-English description of what went wrong / what was expected
        public string kind;    // the stable diagnostic code (SCREAMING_SNAKE_CASE; cross-version stable)
    }

    // Mirror of the canonical error envelope (18/error_handling.md §ErrorObjectComposite) so the client can render the
    // human `message` (F2 — never a raw code) AND, for 422 VALIDATION_FAILED, the structured `details` DslDiagnostic[]
    // (T3). JsonUtility maps only the fields it knows; the rest of the envelope (trace, retryable_class, …) is ignored.
    [Serializable] public class LieutenantErrorEnvelope { public LieutenantErrorPayload payload; }
    [Serializable] public class LieutenantErrorPayload { public LieutenantError error; }

    [Serializable]
    public class LieutenantError
    {
        public string code;                  // SCREAMING_SNAKE_CASE stable code (e.g. VALIDATION_FAILED, RESOURCE_NOT_FOUND)
        public int http_status;              // the HTTP status (kept for logs; never shown raw to the player)
        public string message;               // EN dev-facing message — surfaced to the UI as the readable error (F2)
        public string user_facing_i18n_key;  // the player-facing i18n key (the back never translates)
        public DslDiagnostic[] details;      // the structured DSL diagnostics on a 422 VALIDATION_FAILED (else null/absent)
    }
}
