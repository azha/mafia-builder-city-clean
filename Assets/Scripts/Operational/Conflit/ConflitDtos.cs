using System;

namespace MafiaCleanCity.Operational
{
    // ecran_conflit « Le conflit » (㉙) — DTO dérivés du CORPS RÉEL mesuré en direct sur la pile
    // de dev le 2026-09-03 (compte `operational_demo@example.test` ET un signup frais, via `rtk
    // proxy curl` — un `curl` nu sur cet arbre rend un SCHÉMA DE TYPES au lieu du corps réel).

    /// <summary>`GET /v1/me/engagements` — réponse, MESURÉE : `{engagements: []}`, VIDE sur les
    /// deux comptes sondés (démo ET signup frais). R2.2 : `engagements` est une PROJECTION P5
    /// (liste), jamais réduite à un scalaire.</summary>
    [Serializable]
    public class GetEngagementsResponseDto
    {
        public EngagementDto[] engagements;
    }

    /// <summary>⛔⛔ FORME JAMAIS OBSERVÉE. `engagements` est vide sur les deux comptes sondés —
    /// aucun élément non vide n'a pu être mesuré cette passe (le seul geste qui en créerait un,
    /// `POST /v1/me/engagements`, échoue TOUJOURS avant d'écrire quoi que ce soit : aucun compte
    /// sondé ne possède de lieutenant `MUSCLE`, voir `ConflitScreenController`). Le chantier
    /// annonce « 6 clés gelées » pour un engagement — NON VÉRIFIÉ, non recopié ici. `target_rival_key`
    /// est le SEUL champ posé, sur la PRÉSOMPTION qu'un engagement écrit fait écho au champ du
    /// même nom qu'il a reçu à la création (`PostEngagementsBody.target_rival_key`) — une
    /// convention observée ailleurs dans ce dépôt, jamais confirmée ICI par un corps réel. Voir
    /// implementation-notes.md § Deviations.</summary>
    [Serializable]
    public class EngagementDto
    {
        public string target_rival_key;
    }

    [Serializable] public class GetEngagementsPayload { public GetEngagementsResponseDto data; }
    [Serializable] public class GetEngagementsEnvelope { public GetEngagementsPayload payload; }

    /// <summary>`POST /v1/me/engagements` — réponse JAMAIS MESURÉE : les deux comptes sondés
    /// (démo ET signup frais) échouent tous deux sur le MÊME contrôle métier —
    /// `RESOURCE_NOT_FOUND · "No such MUSCLE lieutenant for this player: <uuid>"` — avant que le
    /// corps ne soit validé plus loin (`target_rival_key`/`target_holding_id` jamais atteints).
    /// Placeholder de désérialisation seulement, patron `PostOperationalDistributionDispatchResponseDto`
    /// (㉘) — à mesurer le jour où un compte porte un lieutenant `MUSCLE`.</summary>
    [Serializable]
    public class PostEngagementsResponseDto
    {
        // MÉTIER ICI — jamais atteint sur les comptes sondés (aucun lieutenant MUSCLE).
    }

    [Serializable] public class PostEngagementsPayload { public PostEngagementsResponseDto data; }
    [Serializable] public class PostEngagementsEnvelope { public PostEngagementsPayload payload; }

    /// <summary>Corps envoyé à `POST /v1/me/engagements` — MESURÉ en direct via l'énumération
    /// successive des 422 (`rtk proxy curl`, 2026-09-03) : 3 champs. `target_rival_key` — domaine
    /// ANNONCÉ CLOS par l'orchestrateur (coil · tarcum · iron_throat · saltline) — NON reproduit
    /// en direct cette passe : le contrôle `MUSCLE` répond AVANT toute validation de ce champ sur
    /// les deux comptes sondés (aucun n'a de lieutenant MUSCLE pour dépasser cette porte), donc le
    /// message d'erreur qui fermerait ce domaine n'a pas pu être obtenu ici. Voir
    /// implementation-notes.md § Deviations.</summary>
    [Serializable]
    public class PostEngagementsBody
    {
        public string lieutenant_id;
        public string target_rival_key;
        public string target_holding_id;
    }

    // ⛔⛔ `GET /v1/lieutenants` N'EST PAS DTO-ÉE ICI — RÉUTILISÉE, PAS DUPLIQUÉE. `DelegationDtos.cs`
    // (㉜, même namespace `MafiaCleanCity.Operational`) porte déjà `GetLieutenantsResponseDto` /
    // `GetLieutenantsPayload` / `GetLieutenantsEnvelope` / `LieutenantRowDto` pour CETTE MÊME
    // route, avec les 6 clés EXACTEMENT mesurées ici (`lieutenant_id`, `name`, `archetype`,
    // `op_state_band`, `rule_count_band`, `tenure_bucket`). Une redéclaration ici collisionnait à
    // la compilation (CS0101, mesuré) — un `dotnet build` réel, pas une revue, l'a trouvé.
    // `ConflitClient.GetLieutenants`/`ConflitScreenController` consomment donc directement
    // `LieutenantRowDto` de `DelegationDtos.cs` (DRY, R2.3 dans l'esprit : une correspondance —
    // ici une FORME de DTO — recopiée deux fois divergera).
}
