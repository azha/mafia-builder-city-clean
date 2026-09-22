using System;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C8 — wire DTOs for `GET /v1/flag-review` + the 3 verdict/batch routes
    // (`flag-discipline.controller.ts` + `.service.ts:64-98`). `descriptor`/`flag_reason` are typed
    // `unknown` server-side (already-shaped `{key,params}` jsonb, forwarded verbatim) — only `key`
    // is modelled here (R2.2: i18n key + producer text, never a raw score); JsonUtility silently
    // drops any undeclared nested field (e.g. `params`), the SAME documented quirk `ExceptionDtos.cs`
    // already names for this project.

    [Serializable] public class LieutenantRefDto { public string id; public string name; }
    [Serializable] public class FlagDescriptorDto { public string key; }

    [Serializable]
    public class FlagCardDto
    {
        public string flag_id;
        public LieutenantRefDto lieutenant;
        public FlagDescriptorDto descriptor;
        public FlagDescriptorDto flag_reason;
        public int flagged_game_day;
        public string trust_budget_bucket;
        // S5-e (back `71ae6f89`, `back/s5-revue-du-jour`) — la bande de fréquence de signalement du lieutenant,
        // la même que `GET /v1/lieutenants/:id`. Type : `FlagFrequencyBand = 'none' | 'occasional' | 'frequent'`
        // (`core_loops/flag_discipline/convergence.ts:35`). ABSENTE tant que la pile ne sert pas S5 (`main` =
        // `4841d7ad`) : JsonUtility laisse alors `null`, et l'écran ne pose AUCUNE chip. Déclarée ici AVANT
        // d'être servie : une clé servie qu'aucun champ ne déclare serait jetée en silence (forme G).
        public string flag_frequency_band;
        // S5-a (forme A, back `04f35021`) — le NOM de ce que la routine concerne, `I18nRef | null`, À CÔTÉ du
        // descriptor. Bâtiment ⇒ `game.fiction.building.name[.rang]` ; route ⇒ `game.fiction.route.named` ou
        // `.indexed` (`common/fiction-names.ts`, `routeNameRef`). ⚠️ JsonUtility rend une INSTANCE VIDE (jamais
        // null) quand le champ manque : l'absence se lit `key` vide.
        public SujetRefDto subject_name_i18n;
        // S5-b (forme A) — la condition qui a fait le score : `DeviationCondition`
        // (`core_loops/flag_discipline/deviation-condition.ts`, 12 valeurs) ; `unrecorded` pour un signalement
        // antérieur au lot. Absente (pile sans S5) ⇒ "" ⇒ la carte garde sa phrase de v4-0.
        public string deviation_condition;
    }

    /// <summary>Une `I18nRef` AVEC ses paramètres — contrairement à `FlagDescriptorDto`, dont `params` est
    /// jeté. JsonUtility ne lit pas un objet à clés libres : `params` est donc l'UNION DÉCLARÉE des
    /// placeholders des trois gabarits que `subject_name_i18n` peut porter (forme G : un paramètre servi
    /// qu'aucun champ ne déclare serait jeté en silence, et l'accolade resterait à l'écran).</summary>
    [Serializable] public class SujetRefDto { public string key; public SujetParamsDto @params; }

    /// <summary>`game.fiction.building.name` : enseigne, district, block (+ rang pour `.rang`) ;
    /// `game.fiction.route.named` : depart, arrivee ; `game.fiction.route.indexed` : index.</summary>
    [Serializable]
    public class SujetParamsDto
    {
        public string enseigne; public string district; public string block; public string rang;
        public string depart; public string arrivee; public string index;
    }

    [Serializable]
    public class FlagReviewResponseDto
    {
        public FlagCardDto[] cards;
        public int routine_pending_count;
        public bool batch_confirm_available;
    }
    [Serializable] public class FlagReviewPayload { public FlagReviewResponseDto data; }
    [Serializable] public class FlagReviewEnvelope { public FlagReviewPayload payload; }

    [Serializable] public class FlagVerdictResponseDto { public bool resolved; public string verdict; public bool token_returned; }
    [Serializable] public class FlagVerdictPayload { public FlagVerdictResponseDto data; }
    [Serializable] public class FlagVerdictEnvelope { public FlagVerdictPayload payload; }

    [Serializable] public class BatchConfirmResponseDto { public int batch_confirmed_count; }
    [Serializable] public class BatchConfirmPayload { public BatchConfirmResponseDto data; }
    [Serializable] public class BatchConfirmEnvelope { public BatchConfirmPayload payload; }
}
