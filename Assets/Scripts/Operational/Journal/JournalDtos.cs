using System;

namespace MafiaCleanCity.Operational
{
    // screen_c1 « Journal » — DTO générés par Tools/nouvel-ecran.py. Un warning de compilation
    // "field never assigned" est ATTENDU tant que les champs MÉTIER ICI ne sont pas remplis :
    // c'est le signal que ce fichier n'est pas encore fini, pas une erreur de l'outil.

    /// <summary>`GET /v1/news/feed` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetNewsFeedResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class GetNewsFeedPayload { public GetNewsFeedResponseDto data; }
    [Serializable] public class GetNewsFeedEnvelope { public GetNewsFeedPayload payload; }
    /// <summary>`GET /v1/news/beats/:id` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetNewsBeatsResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class GetNewsBeatsPayload { public GetNewsBeatsResponseDto data; }
    [Serializable] public class GetNewsBeatsEnvelope { public GetNewsBeatsPayload payload; }
    /// <summary>`GET /v1/ambient/feed` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetAmbientFeedResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class GetAmbientFeedPayload { public GetAmbientFeedResponseDto data; }
    [Serializable] public class GetAmbientFeedEnvelope { public GetAmbientFeedPayload payload; }
    /// <summary>`POST /v1/ambient/attend/:id` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class PostAmbientAttendResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class PostAmbientAttendPayload { public PostAmbientAttendResponseDto data; }
    [Serializable] public class PostAmbientAttendEnvelope { public PostAmbientAttendPayload payload; }
    /// <summary>Corps envoyé à `POST /v1/ambient/attend/:id`. // MÉTIER ICI : lister les champs attendus
    /// par la route back (`*.controller.ts`) — jamais deviner un nom de clé.</summary>
    [Serializable]
    public class PostAmbientAttendBody
    {
        // MÉTIER ICI
    }
    /// <summary>`GET /v1/random-world/active` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetRandomWorldActiveResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class GetRandomWorldActivePayload { public GetRandomWorldActiveResponseDto data; }
    [Serializable] public class GetRandomWorldActiveEnvelope { public GetRandomWorldActivePayload payload; }
    /// <summary>`GET /v1/random-world/known-couplings` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetRandomWorldKnownCouplingsResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class GetRandomWorldKnownCouplingsPayload { public GetRandomWorldKnownCouplingsResponseDto data; }
    [Serializable] public class GetRandomWorldKnownCouplingsEnvelope { public GetRandomWorldKnownCouplingsPayload payload; }
    /// <summary>`POST /v1/random-world/hollow/:eventId/attend-funeral` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class PostRandomWorldHollowAttendFuneralResponseDto
    {
        // MÉTIER ICI
    }

    [Serializable] public class PostRandomWorldHollowAttendFuneralPayload { public PostRandomWorldHollowAttendFuneralResponseDto data; }
    [Serializable] public class PostRandomWorldHollowAttendFuneralEnvelope { public PostRandomWorldHollowAttendFuneralPayload payload; }
    /// <summary>Corps envoyé à `POST /v1/random-world/hollow/:eventId/attend-funeral`. // MÉTIER ICI : lister les champs attendus
    /// par la route back (`*.controller.ts`) — jamais deviner un nom de clé.</summary>
    [Serializable]
    public class PostRandomWorldHollowAttendFuneralBody
    {
        // MÉTIER ICI
    }
}
