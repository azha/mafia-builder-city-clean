using System;
using MafiaCleanCity.Operational.Exceptions; // REUSE ExceptionCardDto (queue) — already the EXACT
                                              // ExceptionCardProjection shape, consumed by ExceptionsClient.cs.

namespace MafiaCleanCity.Shell
{
    // W3.U1 C3 (design §3 C3, §1.3.b/c) — wire DTOs for `POST /v1/session/open`
    // (`session-open-sequence.service.ts:229-246` — the closed set of 12 top-level keys, W3.U1 C2's
    // `opened_game_day` addition included, design D3/§3-bis). Captured field-for-field from the
    // server interfaces (never guessed — the T14 lesson every other DTO file in this repo cites).
    //
    // R2.2: every sub-shape here is bands/booleans/counts/enums-as-strings — the SAME closed-domain
    // discipline `session_lifecycle.spec.ts`'s ALLOWED_OPEN_PAYLOAD_KEYS enforces server-side.

    [Serializable]
    public class DecisionOptionDto
    {
        public string label;
    }

    // HighestLeverageCardProjection (`hl-card-projection.ts:114-121`).
    [Serializable]
    public class HlCardDto
    {
        public string card_id;
        public string decision_type_key;
        public string impact_bucket;   // minor | moderate | major
        public string urgency_bucket;  // low | elevated | pressing
        public DecisionOptionDto[] options;
        public bool structural;
    }

    [Serializable]
    public class StructuralBudgetDto
    {
        public int used;
        public bool cap_reached;
    }

    // FlagReviewGlance (`session-open-sequence.service.ts:141-144`).
    [Serializable]
    public class FlagReviewGlanceDto
    {
        public int pending_review_count;
        public bool auto_open;
    }

    // SettlingGlance (`:152-155`).
    [Serializable]
    public class SettlingGlanceDto
    {
        public int settling_count;
        public bool all_clear;
    }

    // FrictionGlance (`:161-164`).
    [Serializable]
    public class FrictionGlanceDto
    {
        public string friction_bucket; // FrictionBudgetBucket
        public bool penalty_active;
    }

    // CompressionGlance (`:172-176`).
    [Serializable]
    public class CompressionGlanceDto
    {
        public string stress_bucket; // StressBucket
        public string week_state;    // compression_week_state enum value
        public bool forced;
    }

    // OnboardingGlance (`:185-188`).
    [Serializable]
    public class OnboardingGlanceDto
    {
        public string funnel_step; // OnboardingFunnelStep enum value
        public bool first_decision_recorded;
    }

    // The FULL `POST /v1/session/open` response — a closed set of 14 top-level keys (12 → 14 : F14, back f4883b7c)
    // (`session-open-sequence.service.ts:229-246`, W3.U1 C2 GREW it additively with
    // `opened_game_day`). §3-bis of the design is the falsifiable that keeps this DTO's field COUNT
    // in lockstep with the server interface (C3-F2 — parity of FORM, never a re-typed shape check).
    [Serializable]
    public class SessionOpenDto
    {
        public string session_id;
        /// <summary>B4 — les deux jours de la famille SERVIS (courant, et celui de l'ouverture de CETTE session), lus du corps brut
        /// par `CycleDeSession.ChampsServis` (`family_day`, `opened_family_day`, noms CONFIRMÉS par le back le 07/10). Null tant que le back ne les sert pas ⇒ le repli de 48 min.
        /// ⚠️ PROPRIÉTÉS, pas champs : la parité de forme C3-F2/C3-F3 (`SessionClientPlayModeTests`) compte les CHAMPS publics du DTO
        /// contre les clés servies. Quand le back servira ces deux clés, C3-F3 rougira (clés brutes 16 ≠ champs 14) : ce jour-là,
        /// deux vrais champs remplacent ces propriétés.</summary>
        public int? JourDeFamille { get; set; }
        public int? JourDeFamilleALOuverture { get; set; }
        public HlCardDto hl_card;              // nullable — JsonUtility gives a default instance, never null (see C3 tests)
        public ExceptionCardDto[] queue;
        public bool backlog_badge;
        public string queue_pressure_band;     // normal | warning | saturated
        public StructuralBudgetDto structural_budget;
        public FlagReviewGlanceDto flag_review;
        public SettlingGlanceDto settling_glance;
        public FrictionGlanceDto friction_glance;
        public CompressionGlanceDto compression_glance;
        public OnboardingGlanceDto onboarding;
        public int opened_game_day; // W3.U1 C2/D3 — the 12th key
        // F14 (forme G, back f4883b7c `session-open-sequence.service.ts`) — la minute de jeu À L'OUVERTURE, FIGÉE (le nom le dit).
        // DÉCLARÉE, JAMAIS AFFICHÉE comme une heure : une horloge figée se lit comme une horloge qui marche et devient
        // fausse à mesure que la session vieillit ; la faire avancer côté client est interdit (§6.3). ① garde « JOUR N » +
        // la phase ; une heure, si elle doit exister, reste au district, qui la projette à chaque récupération.
        public int opened_game_minute; // 13th key
        // F14 (forme G) — DAWN | DAY | DUSK | NIGHT, calculée par le back avec la fonction du district
        // (`citysim/day-phase-quarter.ts`) sur le MÊME relevé d'horloge qu'`opened_game_day`. Hors district, c'est elle
        // que la barre affiche (`AppShell.PhaseHorsDistrict`) ; absente (back plus ancien) ⇒ null ⇒ « — », comme avant.
        public string day_phase;       // 14th key
    }

    [Serializable] public class SessionOpenPayload { public SessionOpenDto data; }
    [Serializable] public class SessionOpenEnvelope { public SessionOpenPayload payload; }

    [Serializable] public class OpenSessionRequestDto { public string client_version; }
}
