using System;

namespace MafiaCleanCity.Operational
{
    // ecran_appro « La chaîne d'appro » — DTO dérivés du CORPS RÉEL mesuré en direct sur la pile de
    // dev le 2026-09-03 (compte de démo `operational_demo@example.test`), PAS de l'interface
    // TypeScript back lue seule. Le brief qui a livré ces mesures se trompait sur trois contrats
    // (voir implementation-notes.md § Deviations : `building_id` obligatoire, 9 clés et non 5,
    // `nodes` vide) — ce fichier suit les mesures, pas la note qui les précédait.

    /// <summary>`GET /v1/operational/precursors?building_id=<uuid>` — réponse, 9 clés mesurées.
    /// R2.2 — aucun champ ici n'est une projection P5 réduite : les trois « bandes »
    /// (`stock_band`/`price_trend_bucket`/`supplier_pressure_bucket`) sont des scalaires DE
    /// NAISSANCE côté back (un bucket fermé, pas une liste qu'on aurait comptée) — les résolveurs
    /// de `ChaineDApproResolvers` les traduisent en texte, jamais en un compte.</summary>
    [Serializable]
    public class GetOperationalPrecursorsResponseDto
    {
        public string building;               // uuid — l'identité du bâtiment interrogé
        public string precursor_type;          // ex. "PYRALIN" — domaine mesuré via l'erreur 422 de la
                                                // route d'ordre : PYRALIN | VERDANT_ROOT_EXTRACT |
                                                // LULL_RESIN | GLASS_LILY | THALMITE | GARN… (tronqué à
                                                // la mesure — le reste du domaine n'est pas connu)
        public string stock_band;              // mesuré "NONE" — domaine NON confirmé au-delà
        public bool has_pending_order;         // mesuré false, puis true après POST .../order
        public bool has_arrived_order;         // mesuré false — jamais observé à true sur ce compte
        public string stock_liters_label;      // ⚠️ LABEL DÉJÀ FORMATÉ par le back (mesuré "0 L") —
                                                // à afficher TEL QUEL, jamais reconstruit en plage
        public string price_trend_bucket;      // mesuré "UP" — domaine NON confirmé au-delà
        public bool scarcity_active;           // mesuré false sur ce compte
        public string supplier_pressure_bucket; // mesuré "FRESH" — domaine ANNONCÉ (message d'erreur
                                                 // du 2026-09-03) : FRESH | USED | STRAINED, fermé
    }

    [Serializable] public class GetOperationalPrecursorsPayload { public GetOperationalPrecursorsResponseDto data; }
    [Serializable] public class GetOperationalPrecursorsEnvelope { public GetOperationalPrecursorsPayload payload; }

    /// <summary>`POST /v1/operational/precursors/order` — réponse mesurée : UNE seule clé.
    /// Ni la fiche rafraîchie ni l'état du bon de commande : pour les connaître, il faut re-lire
    /// `GET .../precursors` (patron `DeclareRuleResponseDto` de ㊲, même forme de contrat).</summary>
    [Serializable]
    public class PostOperationalPrecursorsOrderResponseDto
    {
        public string order_id;
    }

    [Serializable] public class PostOperationalPrecursorsOrderPayload { public PostOperationalPrecursorsOrderResponseDto data; }
    [Serializable] public class PostOperationalPrecursorsOrderEnvelope { public PostOperationalPrecursorsOrderPayload payload; }

    /// <summary>Corps envoyé à `POST /v1/operational/precursors/order` — mesuré :
    /// `{building_id, precursor_type, quantity_units}`.
    /// ⚠️ `quantity_units` — AUCUNE UI de quantité dans la maquette (m-48..m-53 : un seul bouton
    /// « EN COMMANDER », zéro sélecteur). Le pis-aller retenu (1 unité) est posé au site d'appel
    /// (`ChaineDApproScreenController.PasserCommandeCoroutine`), pas ici — voir
    /// implementation-notes.md § Deviations.</summary>
    [Serializable]
    public class PostOperationalPrecursorsOrderBody
    {
        public string building_id;
        public string precursor_type;
        public int quantity_units;
    }

    /// <summary>Un nœud de la chaîne d'appro : les 5 clés SERVIES par `GET /v1/supply-chain/graph`, toutes lues par
    /// `ChaineDApproGraphe.Maillons` (bande → mot et rang, `has_arrow` + `arrow_to_building_id` → « refoule vers »,
    /// `is_blocked_output` → la ligne de cause). `is_blocked_output` dit que CE maillon est la cause du bouchon au DERNIER tick :
    /// il se LIT, il ne se déduit d'aucune autre clé (la règle « non silencieux sans flèche ⇒ cause » est réfutée, contrat TD-1035 §1).
    /// `NOT NULL DEFAULT false` en base, donc jamais `null` ; clé absente du corps ⇒ `false`, et l'écran se tait — son silence ne
    /// distingue alors pas « aucun bouchon » de « la pile ne sert pas encore la clé ».
    /// ⛔ ÉNONCÉ DATÉ, propriété d'un compte à une date et non de la forme : `nodes` était VIDE sur le compte de démo au 2026-09-03
    /// (mesuré — voir `ChaineDApproScreenController.AppliquerChaine`) ; l'affirmer au présent demande de le re-mesurer.</summary>
    [Serializable]
    public class SupplyChainNodeDto
    {
        // Lus depuis la passe UX du 2026-09-26 (état vide de ㉚, table 63) — forme SERVIE, `supply-chain.controller.ts:128-132` @5e792a3c.
        public string building_id;
        public string bucket;                 // silent | mild | warm | critical (BackpressureBucket)
        public bool has_arrow;
        public string arrow_to_building_id;
        // TD-1035 (12/11, BACK-6 `lot/td-1035-cause-bouchon` @ba55e828, `supply-chain.controller.ts:138`, V15) : booléen servi, jamais null ; true = ce nœud est
        // une CAUSE du bouchon (non dérivable des autres clés). DÉCLARÉ pour ne pas être jeté par JsonUtility (forme G) ; DESSINÉ par `Maillon.EstLaCause` (la 2ᵉ ligne du maillon).
        public bool is_blocked_output;
    }

    /// <summary>Un tronçon de la chaîne — mesuré (2026-09-03) : `leg_id`, `origin_building_id`,
    /// `destination_building_id`, `debt_bucket`, `bypassed`. ⚠️ Le statut de POPULATION de ce
    /// tableau sur le compte de démo n'a PAS été mesuré (contrairement à `nodes`, confirmé vide) —
    /// non consommé cette passe : la section « chaîne » se contente du vide de `nodes` pour son
    /// état honnête (voir implementation-notes.md § Deviations).</summary>
    [Serializable]
    public class SupplyChainLegDto
    {
        public string leg_id;
        public string origin_building_id;
        public string destination_building_id;
        public string debt_bucket;
        public bool bypassed;
        /// <summary>`legs[].maintaining` — ADDITIF, à servir par BACK-1 (TD-1047) ; nom FIXÉ. Définition sûre (juge ㉚ E3) : `maintenance_completes_at_tick IS NOT NULL`
        /// (un patch ou un renfort EN COURS), PAS `maintenance_mode IS NOT NULL` — un contournement pose aussi `maintenance_mode`. ⚠️ JsonUtility ne distingue
        /// pas l'absent du faux : lire `MaintainingServi`, jamais ce champ seul.</summary>
        public bool maintaining;
        /// <summary>La clé `maintaining` est-elle PRÉSENTE dans le corps brut de CETTE liaison ? Posé par `ChaineDApproClient.LireGraphe` (patron
        /// `DelegationClient.LireTaskCategories`). Faux ⇒ rien n'est dessiné (règle (3) : on ne devine pas).</summary>
        [NonSerialized] public bool MaintainingServi;
    }

    /// <summary>Une route de la chaîne — les 7 clés SERVIES, recopiées du code back (`supply-chain.controller.ts:92-99` et `:141-148`, main 6040a213 ;
    /// TD-1013, 11/11 : le placeholder vide d'avant jetait les 7 clés, forme G). Que des bandes et des références (mur R2.2 du contrôleur, `:113-120` :
    /// jamais `sinuosity_index`, `straight_line_distance`, `stress_streak`, `patch_count` ; et `rebuilding` n'est JAMAIS le compte à rebours brut
    /// `rebuild_completes_at_tick` : doc de `RouteGraphView`, `supply-chain-graph.service.ts:70`). Lues par `ChaineDApproGraphe.Routes` (section « Les routes », ㉚ gestes) ; le point d'entrée de `rebuild`.</summary>
    [Serializable]
    public class SupplyChainRouteDto
    {
        public string route_id;
        public string origin_building_id;
        public string destination_building_id;
        public string sinuosity_stress_bucket;   // pristine | stressed | critical | severed (`sinuosity-stress-bucket.ts:34`)
        public string time_to_collapse_bucket;   // distant | approaching | imminent | na (`time-to-collapse-bucket.ts:24`)
        public string state;                     // draft | active | saturated | severed
        public bool rebuilding;                  // l'arrêt de reconstruction, qualitatif (jamais le compte à rebours)
    }

    /// <summary>`GET /v1/supply-chain/graph` — réponse mesurée (2026-09-03) : `{nodes, legs,
    /// routes}`. ⚠️ SANS le préfixe `operational/` dans l'URL (avec, 404 — voir le client).</summary>
    [Serializable]
    public class GetSupplyChainGraphResponseDto
    {
        public SupplyChainNodeDto[] nodes;
        public SupplyChainLegDto[] legs;
        public SupplyChainRouteDto[] routes;
    }

    [Serializable] public class GetSupplyChainGraphPayload { public GetSupplyChainGraphResponseDto data; }
    [Serializable] public class GetSupplyChainGraphEnvelope { public GetSupplyChainGraphPayload payload; }

    /// <summary>`POST /v1/supply-chain/legs/:id/maintain` — réponse JAMAIS MESURÉE (TD-1049) : le juge ne l'a appelée que sur un `legId` inexistant
    /// (`mesures/00-commandes.sh:49-50`). Elle reste donc VIDE et déclarée telle : l'après-geste vient de la RELECTURE du graphe, jamais de ce corps
    /// (juge ㉚ E2). Un 2xx est un succès, quel que soit son corps.</summary>
    [Serializable]
    public class PostSupplyChainLegsMaintainResponseDto
    {
        // VIDE, déclaré tel — voir ci-dessus.
    }

    [Serializable] public class PostSupplyChainLegsMaintainPayload { public PostSupplyChainLegsMaintainResponseDto data; }
    [Serializable] public class PostSupplyChainLegsMaintainEnvelope { public PostSupplyChainLegsMaintainPayload payload; }

    /// <summary>Corps de `POST /v1/supply-chain/legs/:id/maintain` : `{mode}` (V15 @74c5a0b0, lu par le poseur) — quick_patch | structural_reinforce | reroute_bypass.</summary>
    [Serializable]
    public class PostSupplyChainLegsMaintainBody
    {
        public string mode;
    }

    /// <summary>Corps de `POST /v1/operational/routes/:id/rebuild` : `{mode}` — MINIMAL_REROUTE | MODERATE_RESTRUCTURE | FULL_GEOMETRIC_RESET.</summary>
    [Serializable]
    public class PostOperationalRoutesRebuildBody
    {
        public string mode;
    }

    /// <summary>Réponse MESURÉE de `rebuild` (`mesures/08-rebuild-MINIMAL_REROUTE.json`, back 8d0184a4) : **camelCase**, quatre clés.
    /// ⛔ `rebuildCompletesAtTick` est un TICK BRUT : lu pour que JsonUtility ne le jette pas, JAMAIS affiché (R2.2, garde G-D3). L'état d'après-geste
    /// se RELIT sur le graphe (E2) — ce corps ne dit rien que l'écran montre.</summary>
    [Serializable]
    public class PostOperationalRoutesRebuildResponseDto
    {
        public string routeId;
        public string mode;
        public int version;
        public int rebuildCompletesAtTick;
    }

    [Serializable] public class PostOperationalRoutesRebuildPayload { public PostOperationalRoutesRebuildResponseDto data; }
    [Serializable] public class PostOperationalRoutesRebuildEnvelope { public PostOperationalRoutesRebuildPayload payload; }
}
