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
        /// <summary>V20 — la CLÉ SERVIE de la conséquence de l'option (`<label>.projected_consequence` au back, `hl-option-table.ts`). Elle était servie PUIS JETÉE (le DTO ne la déclarait pas) et le client la
        /// reconstruisait par concaténation (identique 16/16 le 11/11, mais deux sources d'une même vérité) : on lit désormais la clé servie ; la concaténation ne reste que pour une réponse qui ne porte pas
        /// le champ (back plus ancien, fixtures).</summary>
        public string projected_consequence;
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
        /// <summary>Le nombre de cibles que `commit` AGIRAIT (le contenu du joueur : `hl-card-projection.ts:128,142`, `targetCountFor`). 0 pour une carte de
        /// navigation, un code hors table ou une cible vide. Le compte `n` du titre pluriel (TD-886) et le `{total}` de l'arrêt partiel (TD-889).</summary>
        public int target_count;
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

    // The FULL `POST /v1/session/open` response — a closed set of 16 top-level keys (12 → 14 : F14, back f4883b7c ; 14 → 16 : L1, `family_day` + `opened_family_day`, portées par DEUX PROPRIÉTÉS — voir `ClesPortees`)
    // (`session-open-sequence.service.ts:229-246`, W3.U1 C2 GREW it additively with
    // `opened_game_day`). §3-bis of the design is the falsifiable that keeps this DTO's field COUNT
    // in lockstep with the server interface (C3-F2 — parity of FORM, never a re-typed shape check).
    [Serializable]
    public class SessionOpenDto
    {
        public string session_id;
        /// <summary>B4 — les deux jours de la famille SERVIS (courant, et celui de l'ouverture de CETTE session), lus du corps brut
        /// par `CycleDeSession.ChampsServis` (`family_day`, `opened_family_day`, noms CONFIRMÉS par le back le 07/10). Null tant que le
        /// back ne les sert pas ⇒ le repli de 48 min ; servis à null (`JourDeFamilleServi`), ils disent « pas d'ancre » / « pas de session ».
        /// ⛔⛔ AU DÉPLOIEMENT DE L1 (session/open : 14 → 16 clés) : GARDER ces PROPRIÉTÉS NULLABLES, lues dans le corps brut. NE JAMAIS les
        /// remplacer par deux champs `int` : `JsonUtility` ne porte pas `int?`, un champ rend 0 pour un null servi — et « jour 0 » ≠ « pas
        /// d'ancre » (revue ⊥ de CLIENT-2, M2, 07/10 ; le plan du commit caf210dc disait le contraire, il est RETIRÉ). Les gardes de parité
        /// (C3-F2, C3-F3, W3U1 C9F2) rougiront alors à 14 ≠ 16 : les CORRIGER pour compter ces deux propriétés en plus des champs
        /// (14 champs + 2 propriétés = 16) — jamais en ajoutant des champs. Liste dans `Tools/CRENEAU-2026-09-22.md` (« Au déploiement de L1 »).
        /// ⚠️ Aujourd'hui : PROPRIÉTÉS parce que la parité de forme compte les CHAMPS publics du DTO.</summary>
        public int? JourDeFamille { get; set; }
        public int? JourDeFamilleALOuverture { get; set; }
        /// <summary>LES CLÉS DE `session/open` QUE CE DTO PORTE, par leur NOM SERVI : les champs publics (lus par `JsonUtility`) PLUS les deux propriétés
        /// nullables ci-dessus (lues du corps brut, sous `CycleDeSession.ChampsServis`). Une SEULE définition de « la forme du DTO » pour les gardes de parité
        /// (C3-F2, C3-F3, C9F2) : compter les champs seuls fait rougir 14 ≠ 16 depuis que le back sert `family_day` et `opened_family_day`
        /// (`session-open-sequence.service.ts:262,266`, construits `:370-371`) ; ajouter deux champs `int` serait la faute documentée ci-dessus.</summary>
        public static string[] ClesPortees()
        {
            var noms = new System.Collections.Generic.List<string>();
            foreach (System.Reflection.FieldInfo f in typeof(SessionOpenDto).GetFields(
                         System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.DeclaredOnly))
                noms.Add(f.Name);
            noms.Add(CycleDeSession.ChampsServis.JourDeFamille);
            noms.Add(CycleDeSession.ChampsServis.JourDeFamilleALOuverture);
            return noms.ToArray();
        }
        /// <summary>La clé `family_day` est DANS le corps (même à null) — la différence entre « pas d'ancre » (servi null : on ne déclenche RIEN) et « le
        /// back ne la sert pas » (le repli de 48 min). `opened_family_day` n'a pas de drapeau : null avec une ancre = le repli, quelle que soit la raison.</summary>
        public bool JourDeFamilleServi { get; set; }
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
