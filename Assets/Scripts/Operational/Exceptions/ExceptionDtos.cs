using System;

namespace MafiaCleanCity.Operational.Exceptions
{
    // IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-20-ui-catchup-design.md §4-T1 — wire DTOs for the
    // Exception Queue surface (P14/P16 backend, merged). snake_case to match JsonUtility ↔ the NestJS contracts
    // (services/game-back/src/exceptions/exceptions.projection.service.ts — captured, never guessed).
    //
    // JsonUtility quirks the render code MUST honor:
    //   - a missing/null JSON string deserializes as "" (never null) → "teachable" is
    //     !string.IsNullOrEmpty(add_rule_dsl);
    //   - a missing nested [Serializable] object deserializes as a DEFAULT INSTANCE (never null) → "has a raid
    //     effect" is !string.IsNullOrEmpty(effect.type) (P14 cards omit `effect`; raid cards stamp it).
    //
    // R2.2: the card carries ONLY closed band labels + producer text — never the raw confidence/priority/severity.

    /// <summary>The raid candidates' server-side resolution descriptor ({type, target_building_id}); empty-type otherwise.</summary>
    [Serializable]
    public class ExceptionEffectDto
    {
        public string type;               // REPAIR | BRIBE | LAY_LOW — or "" (no effect: a P14 card's candidate)
        public string target_building_id; // opaque handle (player-safe, like lieutenant_id)
    }

    [Serializable]
    public class CandidateActionDto
    {
        public string id;
        public string label;                  // producer free text (chrome — never in the scan corpus)
        public string projected_consequence;  // producer free text (chrome)
        public string add_rule_dsl;           // the DSL rule ADD_RULE appends, or "" (not teachable)
        public ExceptionEffectDto effect;     // raid candidates only (empty-type instance otherwise)
    }

    [Serializable]
    public class ExceptionCardDto
    {
        public string exception_id;
        public string lieutenant_id;          // "" when the card is not lieutenant-bound
        public string event_descriptor;       // i18n-key text (chrome)
        public CandidateActionDto[] candidate_actions;
        public CandidateActionDto suggested_action;
        public string confidence_band;        // tentative | likely | confident  (closed, casse canon ConfidenceBucket — back lot-3 TD-072)
        public string priority_band;          // silent | watching | urgent | critical  (PriorityBucket canon — back lot-3 TD-072)
        public string severity_band;          // MILD | MODERATE | SEVERE  (SeverityEnum canon REUSE 08 — back lot-3 TD-072)
        public string resolution_status;      // pending | resolved | escalated | aged_out
    }

    [Serializable] public class ExceptionQueueData { public ExceptionCardDto[] exceptions; }
    [Serializable] public class ExceptionQueuePayload { public ExceptionQueueData data; }
    [Serializable] public class ExceptionQueueEnvelope { public ExceptionQueuePayload payload; }

    // POST /v1/exceptions/:id/resolve { method, chosen_action_id } → { resolved: true, outcome }.
    [Serializable] public class ResolveRequest { public string method; public string chosen_action_id; }
    [Serializable] public class ResolveResponse { public bool resolved; public string outcome; }
    [Serializable] public class ResolvePayload { public ResolveResponse data; }
    [Serializable] public class ResolveEnvelope { public ResolvePayload payload; }
}
