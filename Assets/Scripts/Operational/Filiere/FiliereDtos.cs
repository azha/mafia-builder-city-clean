using System;

namespace MafiaCleanCity.Operational
{
    // screen_c2 « Filiere » — DTO générés par Tools/nouvel-ecran.py. Un warning de compilation
    // "field never assigned" est ATTENDU tant que les champs MÉTIER ICI ne sont pas remplis :
    // c'est le signal que ce fichier n'est pas encore fini, pas une erreur de l'outil.

    /// <summary>`GET /v1/laundering/:nodeId` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetLaunderingResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class GetLaunderingPayload { public GetLaunderingResponseDto data; }
    [Serializable] public class GetLaunderingEnvelope { public GetLaunderingPayload payload; }
    /// <summary>`GET /v1/laundering/:nodeId/pipeline` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetLaunderingPipelineResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class GetLaunderingPipelinePayload { public GetLaunderingPipelineResponseDto data; }
    [Serializable] public class GetLaunderingPipelineEnvelope { public GetLaunderingPipelinePayload payload; }
    /// <summary>`POST /v1/laundering/inject` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class PostLaunderingInjectResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class PostLaunderingInjectPayload { public PostLaunderingInjectResponseDto data; }
    [Serializable] public class PostLaunderingInjectEnvelope { public PostLaunderingInjectPayload payload; }
    /// <summary>Corps envoyé à `POST /v1/laundering/inject`. // MÉTIER ICI : lister les champs attendus
    /// par la route back (`*.controller.ts`) — jamais deviner un nom de clé.</summary>
    [Serializable]
    public class PostLaunderingInjectBody
    {
        // MÉTIER ICI
    }
    /// <summary>`POST /v1/laundering/stage` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class PostLaunderingStageResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class PostLaunderingStagePayload { public PostLaunderingStageResponseDto data; }
    [Serializable] public class PostLaunderingStageEnvelope { public PostLaunderingStagePayload payload; }
    /// <summary>Corps envoyé à `POST /v1/laundering/stage`. // MÉTIER ICI : lister les champs attendus
    /// par la route back (`*.controller.ts`) — jamais deviner un nom de clé.</summary>
    [Serializable]
    public class PostLaunderingStageBody
    {
        // MÉTIER ICI
    }
}
