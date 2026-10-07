using System;

namespace MafiaCleanCity.Operational
{
    // screen_c6 « Horizon » — DTO générés par Tools/nouvel-ecran.py. Un warning de compilation
    // "field never assigned" est ATTENDU tant que les champs MÉTIER ICI ne sont pas remplis :
    // c'est le signal que ce fichier n'est pas encore fini, pas une erreur de l'outil.

    /// <summary>`GET /v1/meta/horizon-feed` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetMetaHorizonFeedResponseDto
    {
        public HorizonCardDto[] cards;
    }

    /// <summary>Une carte du flux — les 9 clés, lues à la source (`horizon-feed.service.ts:74-84`)
    /// et confirmées par le corps mesuré sur le compte de démo.
    ///
    /// ⚠️ `adoption_cost` est un NOMBRE : le back le sanctionne comme l'un des seuls nombres affichables de ce lot
    /// (`horizon-feed.service.ts:12,42`, R2.2), et il est débité des `free_units` du BUDGET DE COMPLEXITÉ du joueur
    /// (`affordable = freeUnits >= required`, `:226-239` ; `GET /v1/meta/complexity-budget`). Ce n'est PAS un coût en
    /// jetons ni en Marks : aucune monnaie. Le bundle n'en donne aucun nom de fiction, donc l'écran ne l'affiche pas
    /// (décision f2, 08/10) ; seule `affordable` se lit, la carte non abordable est éteinte.
    ///
    /// ★ `predicate_regressed` est le champ qui porte cet écran : une capacité dont les conditions
    ///   ont RECULÉ — elle était à portée, elle ne l'est plus. Le back le calcule depuis toujours
    ///   et aucun écran ne l'avait jamais affiché.</summary>
    [Serializable]
    public class HorizonCardDto
    {
        public string card_id;
        public string capability_key;
        public string name_i18n_key;      // ⛔ une CLÉ, pas un libellé — voir la note de l'écran
        public string desc_i18n_key;      // idem
        public string view_status;        // unseen | seen | deferred | adopted | dismissed
        public int    adoption_cost;
        public bool   affordable;
        public bool   predicate_regressed;
        public HorizonPredicateDto[] visible_predicates;
    }

    /// <summary>Une condition visible. Deux clés seulement : son TYPE et une clé de description.
    /// ⛔ Aucun seuil, aucune valeur atteinte — le service l'interdit explicitement. L'écran ne
    /// peut donc PAS dessiner de barre de progression : les conditions sont des phrases, jamais
    /// « 7 sur 10 ». Une jauge inventerait la seule chose que le serveur refuse de dire.</summary>
    [Serializable]
    public class HorizonPredicateDto
    {
        public string predicate_type;
        public string desc_i18n_key;
    }

    [Serializable] public class GetMetaHorizonFeedPayload { public GetMetaHorizonFeedResponseDto data; }
    [Serializable] public class GetMetaHorizonFeedEnvelope { public GetMetaHorizonFeedPayload payload; }
    /// <summary>`POST /v1/meta/horizon/adopt` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class PostMetaHorizonAdoptResponseDto
    {
        // On ne consomme aucun champ de cette réponse : l'écran RECHARGE le flux
        // après l'action plutôt que de patcher son état local depuis le corps.
        // Déclarer des champs qu'on ne lit pas donnerait l'illusion qu'ils sont traités.
    }

    [Serializable] public class PostMetaHorizonAdoptPayload { public PostMetaHorizonAdoptResponseDto data; }
    [Serializable] public class PostMetaHorizonAdoptEnvelope { public PostMetaHorizonAdoptPayload payload; }
    /// <summary>Corps envoyé à `POST /v1/meta/horizon/adopt`. // MÉTIER ICI : lister les champs attendus
    /// par la route back (`*.controller.ts`) — jamais deviner un nom de clé.</summary>
    [Serializable]
    public class PostMetaHorizonAdoptBody
    {
        public string card_id;
    }
    /// <summary>`POST /v1/meta/horizon-feed/:cardId/defer` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class PostMetaHorizonFeedDeferResponseDto
    {
        // On ne consomme aucun champ de cette réponse : l'écran RECHARGE le flux
        // après l'action plutôt que de patcher son état local depuis le corps.
        // Déclarer des champs qu'on ne lit pas donnerait l'illusion qu'ils sont traités.
    }

    [Serializable] public class PostMetaHorizonFeedDeferPayload { public PostMetaHorizonFeedDeferResponseDto data; }
    [Serializable] public class PostMetaHorizonFeedDeferEnvelope { public PostMetaHorizonFeedDeferPayload payload; }
    /// <summary>Corps envoyé à `POST /v1/meta/horizon-feed/:cardId/defer`. // MÉTIER ICI : lister les champs attendus
    /// par la route back (`*.controller.ts`) — jamais deviner un nom de clé.</summary>
    [Serializable]
    public class PostMetaHorizonFeedDeferBody
    {
        // Le `cardId` voyage dans l'URL, pas dans le corps — aucun champ.
    }
    /// <summary>`POST /v1/meta/horizon-feed/:cardId/dismiss` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class PostMetaHorizonFeedDismissResponseDto
    {
        // On ne consomme aucun champ de cette réponse : l'écran RECHARGE le flux
        // après l'action plutôt que de patcher son état local depuis le corps.
        // Déclarer des champs qu'on ne lit pas donnerait l'illusion qu'ils sont traités.
    }

    [Serializable] public class PostMetaHorizonFeedDismissPayload { public PostMetaHorizonFeedDismissResponseDto data; }
    [Serializable] public class PostMetaHorizonFeedDismissEnvelope { public PostMetaHorizonFeedDismissPayload payload; }
    /// <summary>Corps envoyé à `POST /v1/meta/horizon-feed/:cardId/dismiss`. // MÉTIER ICI : lister les champs attendus
    /// par la route back (`*.controller.ts`) — jamais deviner un nom de clé.</summary>
    [Serializable]
    public class PostMetaHorizonFeedDismissBody
    {
        // Le `cardId` voyage dans l'URL, pas dans le corps — aucun champ.
    }
}
