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
        public I18nRefDto label_i18n;         // TD-452 — présent sur 5 actions sur 13 (mesuré)
        public string projected_consequence;  // producer free text (chrome)
        public I18nRefDto projected_consequence_i18n;
        public string add_rule_dsl;           // the DSL rule ADD_RULE appends, or "" (not teachable)
        public ExceptionEffectDto effect;     // raid candidates only (empty-type instance otherwise)
    }

    /// <summary>Une référence i18n. FORME MESURÉE le 2026-09-02 sur le corps réel :
    /// `{"key":"exception.heat_pressure.card.descriptor","params":{}}` — un objet, pas une
    /// chaîne. Identique à `name_i18n` de la fiche bâtiment.
    /// ⚠️ `params` n'est PAS lu : `JsonUtility` ne sait pas lire un objet à clés arbitraires, et
    /// il est **vide sur les 12 références mesurées**. Le jour où il portera quelque chose, un
    /// paramètre non substitué restera VISIBLE dans le texte (`{nom}`) — le résolveur est écrit
    /// pour ça. Déclaré ici plutôt que découvert à l'écran.</summary>
    [Serializable] public class I18nRefDto { public string key; }

    [Serializable]
    public class ExceptionCardDto
    {
        public string exception_id;
        public string lieutenant_id;          // "" when the card is not lieutenant-bound
        public string event_descriptor;       // i18n-key text (chrome)
        /// <summary>La référence i18n de la réplique — TD-452, ADDITIF : la prose reste.
        /// Mesuré : non nulle sur 2 cartes sur 6 (les producteurs), nulle sur les 4 du seeder,
        /// dont les libellés sont EN BASE et hors de portée du back (TD-453).</summary>
        public I18nRefDto event_descriptor_i18n;
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
