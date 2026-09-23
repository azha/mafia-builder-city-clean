using System;

namespace MafiaCleanCity.Operational
{
    // ecran_conflit « Le conflit » (㉙) — DTO de `GET`/`POST /v1/me/engagements`. Liste mesurée VIDE sur la pile
    // de dev (2026-09-03, `rtk proxy curl`) ; la forme d'un envoi et la réponse du POST sont lues dans le back
    // (2026-09-23, `combat.service.ts`, `engagements.controller.ts`).

    /// <summary>`GET /v1/me/engagements` — réponse, MESURÉE : `{engagements: []}`, VIDE sur les
    /// deux comptes sondés (démo ET signup frais). R2.2 : `engagements` est une PROJECTION P5
    /// (liste), jamais réduite à un scalaire.</summary>
    [Serializable]
    public class GetEngagementsResponseDto
    {
        public EngagementDto[] engagements;
    }

    /// <summary>Un envoi — `EngagementView`, 7 clés (back `combat.service.ts:95-103`, lu le 2026-09-23 ; forme G :
    /// chaque clé servie est DÉCLARÉE, une clé servie non déclarée serait jetée en silence par JsonUtility).
    /// Pas de corps non vide mesuré sur la pile (aucun compte sondé n'a d'envoi) : la forme vient de l'interface
    /// du back, et la garde de valeur (`EcranConflitL1_*`) désérialise un corps de CETTE forme.
    ///   · `status` : `scheduled` | `resolved` ;
    ///   · `outcome_bucket` : `retreat` | `hold` | `contested` | `advance` | `breakthrough` | null (null tant que
    ///     `scheduled`) — `COMBAT_OUTCOME_BUCKETS`, `combat-tunables.ts:47-53` ;
    ///   · `friction_consumed_bucket` : `low` | `medium` | `high` | null — `FrictionBand`, `combat.types.ts:39` ;
    ///   · `heat_increment_bucket` : `string | null` côté type ; seul `medium` est produit aujourd'hui
    ///     (`ASSAULT_HEAT_INCREMENT_BUCKET`, provisoire) — les mots couvrent low/medium/high (table 40) ;
    ///   · `target_axis_i18n` et `lieutenant` : PAS ENCORE SERVIS (le back les ajoute après le gate du 23/09 ; noms
    ///     figés par l'orchestrateur le même jour). Déclarés AVANT d'être servis (forme G) ; absents, ils se lisent
    ///     `key` vide / `name` vide, et rien ne s'affiche à leur place (aucun axe ni nom deviné).
    /// ⚠️ JsonUtility rend `""` pour une chaîne `null` servie, et une INSTANCE VIDE pour un objet `null` :
    /// l'absence se lit chaîne vide.</summary>
    [Serializable]
    public class EngagementDto
    {
        public string engagement_id;
        public string target_rival_key;
        public RivalNomI18nDto target_rival_name_i18n;
        public string status;
        public string outcome_bucket;
        public string friction_consumed_bucket;
        public string heat_increment_bucket;
        public AxeI18nDto target_axis_i18n;          // `{key: "conflit.axe.<axe>", params: {}}` | null (aucun axe visé)
        public EngagementLieutenantDto lieutenant;   // `{id, name}` | null (soft-ref sans FK : un lieutenant disparu ⇒ null)
    }

    /// <summary>`target_axis_i18n` — l'axe visé, une des 5 clés `conflit.axe.*` (table 40), `params` toujours `{}`.</summary>
    [Serializable] public class AxeI18nDto { public string key; public AxeParamsVidesDto @params; }
    /// <summary>`params` de `target_axis_i18n` : `{}` — déclaré pour que l'oracle des clés servies le compte (forme G).</summary>
    [Serializable] public class AxeParamsVidesDto { }

    /// <summary>`lieutenant` — celui qu'on a envoyé, un seul par envoi. null côté back quand le lieutenant n'existe plus
    /// (`combat_event.lieutenant_id` sans FK) : le nom s'OMET, sans mot de repli.</summary>
    [Serializable] public class EngagementLieutenantDto { public string id; public string name; }

    /// <summary>`target_rival_name_i18n` — `rivalNameRef` (back `common/fiction-names.ts`) :
    /// `{key: "game.fiction.rival.name", params: {nom}}`, gabarit servi `{nom}`. Hors des 4 familles, le back sert
    /// `nom = "unknown_<clé>"` : une valeur machine, que le résolveur ne rend JAMAIS (`ConflitResolvers.NomServi`).</summary>
    [Serializable] public class RivalNomI18nDto { public string key; public RivalNomParamsDto @params; }
    [Serializable] public class RivalNomParamsDto { public string nom; }

    [Serializable] public class GetEngagementsPayload { public GetEngagementsResponseDto data; }
    [Serializable] public class GetEngagementsEnvelope { public GetEngagementsPayload payload; }

    /// <summary>`POST /v1/me/engagements` — réponse `{ engagement_id }` (back `engagements.controller.ts:124`, `:215`).
    /// Erreurs, lues au même endroit : 409 `MUSCLE_LIEUTENANT_REQUIRED` (le lieutenant n'est pas un gros bras) ;
    /// 404 (lieutenant qui n'est pas au joueur, famille hors domaine, famille sans état) ; 422 (corps invalide).</summary>
    [Serializable]
    public class PostEngagementsResponseDto
    {
        public string engagement_id;
    }

    [Serializable] public class PostEngagementsPayload { public PostEngagementsResponseDto data; }
    [Serializable] public class PostEngagementsEnvelope { public PostEngagementsPayload payload; }

    /// <summary>Corps envoyé à `POST /v1/me/engagements` : `{lieutenant_id, target_rival_key, target_holding_id?}`.
    /// `target_rival_key` : coil · tarcum · iron_throat · saltline. `target_holding_id` est FACULTATIF et, s'il est
    /// présent, doit être un des 5 axes (`muscle` · `finance` · `intel` · `infrastructure` · `leadership`,
    /// `engagements.controller.ts:176-183`) : ce n'est PAS un bâtiment. ⛔ Ne jamais sérialiser ce corps avec
    /// `JsonUtility.ToJson` directement — il écrirait `"target_holding_id":""` quand aucun axe n'est choisi, et le
    /// back répond 422 ; passer par `ConflitClient.CorpsEnvoye`, qui omet la clé.</summary>
    [Serializable]
    public class PostEngagementsBody
    {
        public string lieutenant_id;
        public string target_rival_key;
        public string target_holding_id;
    }

    /// <summary>Le même corps SANS axe — ce que `ConflitClient.CorpsEnvoye` sérialise quand `target_holding_id` est vide.</summary>
    [Serializable]
    public class PostEngagementsBodySansAxe
    {
        public string lieutenant_id;
        public string target_rival_key;
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
