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

    /// <summary>Un nœud de la chaîne d'appro. ⛔⛔ FORME JAMAIS MESURÉE : `nodes` est VIDE sur le
    /// compte de démo (mesuré 2026-09-03 — voir `ChaineDApproScreenController.AppliquerChaine`,
    /// c'est le fait le plus important de cet écran). Ce type sert seulement à ce que
    /// `JsonUtility` désérialise un `nodes: []` sans erreur ; ses champs sont à mesurer le jour où
    /// un compte porte au moins un nœud. Jamais utilisé pour construire une UI cette passe.</summary>
    [Serializable]
    public class SupplyChainNodeDto
    {
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
    }

    /// <summary>Une route de la chaîne. ⛔ FORME JAMAIS MESURÉE, même traitement que
    /// `SupplyChainNodeDto` — placeholder de désérialisation, pas une UI.</summary>
    [Serializable]
    public class SupplyChainRouteDto
    {
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

    /// <summary>`POST /v1/supply-chain/legs/:id/maintain` — corps et réponse NON REMPLIS. Cette
    /// route agit sur un `leg_id` : elle appartient à la même famille que `backpressure` /
    /// `trace-step` / `resolve` que le brief a écartées comme inatteignables (aucun nœud/tronçon
    /// connu sur ce compte, `nodes` vide — voir `GetSupplyChainGraphResponseDto`). Ne pas remplir
    /// une forme qu'aucun chemin de ce lot n'exerce : ce serait deviner un contrat, pas le
    /// mesurer. // MÉTIER ICI le jour où un compte porte un tronçon exerçable.</summary>
    [Serializable]
    public class PostSupplyChainLegsMaintainResponseDto
    {
        // MÉTIER ICI — route non câblée cette passe (inatteignable : aucun leg_id connu).
    }

    [Serializable] public class PostSupplyChainLegsMaintainPayload { public PostSupplyChainLegsMaintainResponseDto data; }
    [Serializable] public class PostSupplyChainLegsMaintainEnvelope { public PostSupplyChainLegsMaintainPayload payload; }

    [Serializable]
    public class PostSupplyChainLegsMaintainBody
    {
        // MÉTIER ICI — route non câblée cette passe (inatteignable : aucun leg_id connu).
    }
}
