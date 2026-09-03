using System;

namespace MafiaCleanCity.Operational
{
    // ecran_distribution « La distribution » — DTO dérivés du CORPS RÉEL mesuré en direct sur la
    // pile de dev le 2026-09-03 (compte `operational_demo@example.test`), via `rtk proxy curl`
    // (le brief était lui-même faux sur les corps de `dispatch`/`vehicles/purchase` : non
    // mesurés — voir implementation-notes.md § Deviations pour le détail des trois écarts).

    /// <summary>`GET /v1/operational/couriers` — réponse, MESURÉE : `{couriers: [...]}`, 3
    /// courriers, 5 clés chacun. R2.2 : `couriers` est une PROJECTION P5 (liste), jamais réduite
    /// à un compte.</summary>
    [Serializable]
    public class GetOperationalCouriersResponseDto
    {
        public CourierDto[] couriers;
    }

    /// <summary>Un courrier — 5 clés MESURÉES. `vehicle_type` mesuré "FOOT"/"BIKE" (MAJUSCULES) —
    /// ⚠️ CASSE DIFFÉRENTE de celle qu'exige `POST .../vehicles/purchase`
    /// (foot|bike|car|refrigerated_van, minuscules, mesuré via le message 422) : deux routes du
    /// même domaine, deux casses. `DistributionResolvers.TexteVehicule` compare en
    /// `ToUpperInvariant()` pour ne pas dupliquer la table de correspondance.
    /// `transit_band` mesuré "ARRIVED"/"IDLE" sur les 3 courriers du compte — "IN_TRANSIT" est
    /// ANNONCÉ par le brief mais JAMAIS observé ici : traité comme hypothèse non confirmée par
    /// `DistributionResolvers.TexteTransitBand` (repli gracieux, pas de throw).
    /// `temperature_status` mesuré `null` sur les 3 — domaine NON INVENTÉ : jamais utilisé pour
    /// brancher une UI cette passe (consigne explicite du brief), affiché tel quel si non-null.
    /// `degrading` mesuré `false` sur les 3.</summary>
    [Serializable]
    public class CourierDto
    {
        public string courier;
        public string vehicle_type;
        public string transit_band;
        public string temperature_status;
        public bool degrading;
    }

    [Serializable] public class GetOperationalCouriersPayload { public GetOperationalCouriersResponseDto data; }
    [Serializable] public class GetOperationalCouriersEnvelope { public GetOperationalCouriersPayload payload; }

    /// <summary>`GET /v1/operational/distribution/projection` — réponse, MESURÉE : `{routes: [...]}`,
    /// 3 routes, 5 clés chacune. R2.2 : `routes` est une PROJECTION P5, jamais réduite à un
    /// scalaire.</summary>
    [Serializable]
    public class GetOperationalDistributionProjectionResponseDto
    {
        public DistributionRouteDto[] routes;
    }

    /// <summary>Une route — 5 clés MESURÉES.
    /// ⛔⛔ `severed`/`saturated` — LES DEUX CLÉS QUE LE BRIEF ANNONÇAIT N'EXISTENT PAS dans le
    /// corps réel (mesuré : 5 clés exactement, aucune des deux). L'état de la route est porté par
    /// `route_state`, mesuré UNE SEULE valeur sur les 3 routes : "active" (3/3). Domaine non
    /// confirmé fermé au-delà — `DistributionResolvers.TexteRouteState` a un repli gracieux.
    /// `sinuosity_bucket` mesuré "meandering" (2x) et "direct" (1x) — correspond EXACTEMENT à
    /// LE CHEMIN de la maquette. `river_crossings_count_bucket` mesuré "single" (2x) et "none"
    /// (1x) — correspond à À TRAVERSER.
    /// ⚠️ `available_vehicles` — ÉCART SIGNALÉ PAR LE BRIEF, MESURÉ ET EXPLIQUÉ (pas juste
    /// rapporté sans trancher, voir implementation-notes.md § Deviations) : rendait ["FOOT"] sur
    /// les 3 routes malgré 2 courriers BIKE déjà possédés — CE N'EST PAS une incohérence de
    /// données. `available_vehicles` reflète la FLOTTE DE VÉHICULES ACHETÉE (un pool par joueur,
    /// pas par courrier ni par route) : après un `POST .../vehicles/purchase` réel
    /// (`vehicle_type: "bike"`), les 3 routes sont passées à ["FOOT","BIKE"] D'UN COUP. Les 2
    /// courriers BIKE existaient donc AVANT tout achat via cette route (seedés autrement) —
    /// `available_vehicles` ne les voit pas, seul l'inventaire acheté compte.</summary>
    [Serializable]
    public class DistributionRouteDto
    {
        public string route_id;
        public string sinuosity_bucket;
        public string river_crossings_count_bucket;
        public string route_state;
        public string[] available_vehicles;
    }

    [Serializable] public class GetOperationalDistributionProjectionPayload { public GetOperationalDistributionProjectionResponseDto data; }
    [Serializable] public class GetOperationalDistributionProjectionEnvelope { public GetOperationalDistributionProjectionPayload payload; }

    /// <summary>`POST /v1/operational/distribution/dispatch` — réponse JAMAIS MESURÉE : le seul
    /// bâtiment `distribution_hub` trouvable sur le compte de démo (`operational_type ==
    /// "distribution_hub"`, district 1) a un stock DE ZÉRO — `cargo_grams: 1` (le minimum
    /// possible) rend déjà 409 « Insufficient product at the source building to dispatch 1 g. »
    /// Même famille que ChaineDAppro/`stock_band: NONE` : la route existe, le corps de succès ne
    /// se laisse pas mesurer sur CE compte. Placeholder de désérialisation seulement — voir
    /// implementation-notes.md § Deviations.</summary>
    [Serializable]
    public class PostOperationalDistributionDispatchResponseDto
    {
        // MÉTIER ICI — jamais atteint sur le compte de démo (stock source à zéro). À mesurer le
        // jour où un compte porte du stock au hub de distribution.
    }

    [Serializable] public class PostOperationalDistributionDispatchPayload { public PostOperationalDistributionDispatchResponseDto data; }
    [Serializable] public class PostOperationalDistributionDispatchEnvelope { public PostOperationalDistributionDispatchPayload payload; }

    /// <summary>Corps envoyé à `POST /v1/operational/distribution/dispatch` — MESURÉ en direct
    /// via l'énumération successive des erreurs 422 (`rtk proxy curl`, 2026-09-03) : 3 champs,
    /// dans cet ordre de validation, `{from_building_id, to_building_id, cargo_grams}`. Ni
    /// `vehicle_type` ni `route_id` ne sont demandés — la route ne prend PAS le `route_id` de la
    /// projection : voir `DistributionScreenController.DecouvrirRoute` pour la conséquence (le
    /// mapping route affichée ↔ bâtiments envoyés est INDISCOUVRABLE depuis les 4 routes
    /// données, voir implementation-notes.md § Deviations).
    /// ⚠️ `cargo_grams` — aucune UI de quantité dans la maquette (m-54..m-58 : un seul bouton,
    /// zéro sélecteur). Pis-aller retenu (1, le minimum) posé au site d'appel, pas ici — même
    /// idiome que `ChaineDApproScreenController.PasserCommandeCoroutine`.</summary>
    [Serializable]
    public class PostOperationalDistributionDispatchBody
    {
        public string from_building_id;
        public string to_building_id;
        public int cargo_grams;
    }

    /// <summary>`POST /v1/operational/vehicles/purchase` — réponse MESURÉE (succès réel obtenu,
    /// `vehicle_type: "bike"`) : UNE seule clé, `{ok: true}`. Effet de bord confirmé : les 3
    /// routes de `GET .../distribution/projection` sont passées de `available_vehicles:["FOOT"]`
    /// à `["FOOT","BIKE"]` immédiatement après, sans autre appel.</summary>
    [Serializable]
    public class PostOperationalVehiclesPurchaseResponseDto
    {
        public bool ok;
    }

    [Serializable] public class PostOperationalVehiclesPurchasePayload { public PostOperationalVehiclesPurchaseResponseDto data; }
    [Serializable] public class PostOperationalVehiclesPurchaseEnvelope { public PostOperationalVehiclesPurchasePayload payload; }

    /// <summary>Corps envoyé à `POST /v1/operational/vehicles/purchase` — MESURÉ : `{vehicle_type}`,
    /// domaine FERMÉ ANNONCÉ par le message d'erreur 422 (2026-09-03) : foot | bike | car |
    /// refrigerated_van — MINUSCULES (voir `CourierDto.vehicle_type` pour l'écart de casse avec
    /// `GET .../couriers`).</summary>
    [Serializable]
    public class PostOperationalVehiclesPurchaseBody
    {
        public string vehicle_type;
    }
}
