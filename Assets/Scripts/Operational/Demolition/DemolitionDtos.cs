using System;

namespace MafiaCleanCity.Operational
{
    // ㉝ « Raser un site » — la fiche et la parcelle libérée (maquette `ecrans-brennar-6.html`,
    // cadres m-79..84, générateur `atelier/generateur-demol.py`).
    //
    // ⛔ TOUTES CES FORMES SONT MESURÉES SUR LA PILE DEV LE 2026-09-03, avec des comptes créés
    // par `POST /v1/auth/signup` et un parcours entièrement joueur — aucun seam `_test`, aucun
    // seed SQL. Les corps réels sont conservés dans `<back>/scratchpad/chantier-F-2026-09-03/`.
    // Trois choses que la mesure a apprises et qu'aucun document ne disait :
    //   (a) `decommission` exige `{confirm:true}` — sans lui, 422 DEMOLITION_CONFIRM_REQUIRED ;
    //   (b) un bâtiment qui porte un lieutenant REFUSE — 409 LIEUTENANT_ASSIGNED ;
    //   (c) une démolition réussie fait passer `structural_budget` à `{used:1, cap_reached:true}`.
    //       ⇒ la thèse du chantier — ㉜, ㉝ et ㉞ partagent UN jeton — n'est plus une affirmation
    //         de document : c'est une mesure. Elle se voit donc à l'identique sur les trois écrans,
    //         par `JetonDeStructure` (`ShellContracts`), publié une fois par le shell.

    /// <summary>`GET /v1/friction/state` — l'état global. Corps réel mesuré :
    /// <code>{ "friction_bucket":"light", "penalty_active":false, "friction_node_count":0 }</code>
    /// puis, après une démolition : <code>{"balanced", false, 3}</code> — les trois champs bougent
    /// ensemble, ce qui prouve qu'ils décrivent bien le même monde.</summary>
    [Serializable]
    public class GetFrictionStateResponseDto
    {
        /// <summary>`light` · `balanced` · `strained` · `overloaded`.</summary>
        public string friction_bucket;

        /// <summary>Le voyant « tout produit moins en ce moment ».
        /// ⛔ Le back ne sert NI le pourcentage NI le seuil (R2.2) — l'écran dit donc « tout
        /// produit moins », jamais « −12 % de rendement ». Un chiffre inventé ici serait le genre
        /// de précision que personne ne pourrait plus retirer.</summary>
        public bool penalty_active;

        /// <summary>Le nombre d'endroits qui se gênent entre eux. SERVI et DESSINÉ : c'est le gros
        /// chiffre du cadre m-79.</summary>
        public int friction_node_count;
    }

    [Serializable] public class GetFrictionStatePayload { public GetFrictionStateResponseDto data; }
    [Serializable] public class GetFrictionStateEnvelope { public GetFrictionStatePayload payload; }

    /// <summary>`GET /v1/friction/nodes/{buildingId}` — la fiche d'UN site. Corps réel mesuré sur
    /// un bâtiment du kit de départ :
    /// <code>
    /// { "output_value_bucket":"medium", "friction_load_bucket":"light",
    ///   "output_to_friction_ratio_bucket":"good", "decommission_cost_bucket":"expensive",
    ///   "neighbor_count":0 }
    /// </code>
    /// Les cinq champs de la maquette, dans son ordre, et rien de plus : la fiche ne demande donc
    /// aucune donnée que le back ne serve pas.</summary>
    [Serializable]
    public class GetFrictionNodesResponseDto
    {
        /// <summary>`very_low` · `low` · `medium` · `high` · `very_high` — « ce qu'il rapporte ».</summary>
        public string output_value_bucket;
        /// <summary>`light` · `balanced` · `strained` · `overloaded` — « ce qu'il gêne autour ».</summary>
        public string friction_load_bucket;
        /// <summary>`poor` · `fair` · `good` · `excellent` — « au total ». `poor` déclenche le
        /// verdict rouge de la maquette : « Il vous coûte plus qu'il ne vous rapporte. »</summary>
        public string output_to_friction_ratio_bucket;
        /// <summary>`cheap` · `moderate` · `expensive` · `very_expensive`.</summary>
        public string decommission_cost_bucket;
        /// <summary>⚠️ LE SEUL NOMBRE BRUT DE CET ÉCRAN, et il est servi tel quel. Tout le reste
        /// est en bandes fermées (R2.2) ; celui-ci se compte, donc il se montre.</summary>
        public int neighbor_count;
    }

    [Serializable] public class GetFrictionNodesPayload { public GetFrictionNodesResponseDto data; }
    [Serializable] public class GetFrictionNodesEnvelope { public GetFrictionNodesPayload payload; }

    /// <summary>Corps de `POST /v1/friction/nodes/{buildingId}/decommission`.
    /// ⛔⛔ `confirm` EST OBLIGATOIRE, ET AUCUN DOCUMENT DE CE PROGRAMME NE LE DISAIT. Mesuré :
    /// un corps vide rend **422 DEMOLITION_CONFIRM_REQUIRED**, « decommission requires an explicit
    /// {confirm: true} — resend with the flag to proceed ».
    /// ⇒ Ce n'est pas une formalité de protocole, c'est le DEUXIÈME ÉCRAN de la maquette :
    ///   m-80 montre la fiche et son geste « LE RASER », m-81 le cadre de confirmation et son
    ///   « CONFIRMER — LE RASER ». Le back exigeait déjà ce que la planche dessinait ; on aurait pu
    ///   livrer un écran à un seul geste, et découvrir le 422 en jeu.</summary>
    [Serializable]
    public class PostFrictionNodesDecommissionBody
    {
        public bool confirm;
    }

    /// <summary>Réponse de la démolition. Corps réel mesuré :
    /// <code>{ "decommissioned":true, "freed_block_id":1502, "neighbor_count":0 }</code></summary>
    [Serializable]
    public class PostFrictionNodesDecommissionResponseDto
    {
        public bool decommissioned;
        /// <summary>Le bloc rendu libre — c'est LUI que les offres de remplacement citent, et donc
        /// le lien entre les deux moitiés de l'écran.</summary>
        public int freed_block_id;
        public int neighbor_count;
    }

    [Serializable] public class PostFrictionNodesDecommissionPayload { public PostFrictionNodesDecommissionResponseDto data; }
    [Serializable] public class PostFrictionNodesDecommissionEnvelope { public PostFrictionNodesDecommissionPayload payload; }

    /// <summary>Une offre de remplacement. Corps réel mesuré APRÈS une démolition — la parcelle en
    /// ouvre exactement DEUX, classées :
    /// <code>
    /// { "id":"175cb632-…", "freed_block_id":1502, "candidate_building_type":"cash_safehouse",
    ///   "rank":1, "projected":{ "output_value_bucket":"high", "friction_load_bucket":"balanced" } }
    /// { …, "candidate_building_type":"front_shop", "rank":2,
    ///   "projected":{ "output_value_bucket":"medium", "friction_load_bucket":"balanced" } }
    /// </code>
    /// ⚠️ `candidate_building_type` sert des valeurs (`cash_safehouse`, `front_shop`) que la table
    /// de libellés de la maquette ne connaissait PAS (elle nomme `warehouse`/`front`). Un écran qui
    /// aurait recopié la table de la maquette aurait affiché du vide sur les seules deux offres que
    /// le back produit réellement. Voir `DemolitionResolvers.NomDeType`.</summary>
    [Serializable]
    public class ReplacementOptionDto
    {
        public string id;
        public int freed_block_id;
        public string candidate_building_type;
        /// <summary>`1` ou `2`. La maquette en fait un rang visible (pastille ronde), et la
        /// première porte le liseré doré : elle est « la mieux placée ».</summary>
        public int rank;
        public ProjectedDto projected;
    }

    /// <summary>Ce que l'offre PROJETTE — deux bandes, jamais un chiffre.</summary>
    [Serializable]
    public class ProjectedDto
    {
        public string output_value_bucket;
        public string friction_load_bucket;
    }

    /// <summary>`GET /v1/friction/replacement-options` — ensemble de clés mesuré : `{ options }`.
    /// Vaut `[]` tant qu'aucune parcelle n'a été libérée, et c'est l'état NORMAL, pas un vide
    /// suspect : le back ne propose rien tant qu'il n'y a pas de trou à combler.</summary>
    [Serializable]
    public class GetFrictionReplacementOptionsResponseDto
    {
        public ReplacementOptionDto[] options;
    }

    [Serializable] public class GetFrictionReplacementOptionsPayload { public GetFrictionReplacementOptionsResponseDto data; }
    [Serializable] public class GetFrictionReplacementOptionsEnvelope { public GetFrictionReplacementOptionsPayload payload; }

    /// <summary>`POST /v1/friction/replacement-options/{id}/pick`. Corps de succès non observé
    /// (il faudrait une démolition ET une offre encore ouverte dans la même session — le jeton de
    /// structure n'en autorise qu'une par jour) : TD-533. Ce qui EST mesuré, c'est le refus —
    /// un id inconnu rend **404 RESOURCE_NOT_FOUND**, « replacement option … does not exist for
    /// this player », et une offre déjà prise rend `REPLACEMENT_OPTION_ALREADY_CLOSED` (nommé par
    /// le canon). L'écran traite les deux comme « cette offre est fermée » (cadre m-84) plutôt que
    /// comme une panne : *un refus qui a un cadre dans la maquette n'est pas une erreur.*</summary>
    [Serializable]
    public class PostFrictionReplacementOptionsPickResponseDto
    {
        public bool picked;
    }

    [Serializable] public class PostFrictionReplacementOptionsPickPayload { public PostFrictionReplacementOptionsPickResponseDto data; }
    [Serializable] public class PostFrictionReplacementOptionsPickEnvelope { public PostFrictionReplacementOptionsPickPayload payload; }

    /// <summary>Corps vide — la route ne prend que son id de chemin (mesuré : un `{}` passe).</summary>
    [Serializable]
    public class PostFrictionReplacementOptionsPickBody { }

    // ═══ Le chemin joueur vers un `building_id` — et il n'y en a qu'un ═══════════════════════

    /// <summary>Une entrée de `GET /v1/world/districts` → `payload.data.districts[]`. Corps réel :
    /// <code>{ "id":1, "profile":"tidewater", "index":"1", "name_canonical":"Tidewater-1",
    ///          "block_count":37, "bank_side":"north", "control_state":"UNCONTESTED",
    ///          "name":"Les Bassins", "precinct_id":1 }</code>
    /// Seuls `id` et `name` servent ici — le reste est déclaré pour que la forme soit complète.</summary>
    [Serializable]
    public class WorldDistrictDto
    {
        public int id;
        public string name;
        public string name_canonical;
        public string profile;
        public string bank_side;
        public string control_state;
        public int block_count;
        public int precinct_id;
    }

    [Serializable] public class GetWorldDistrictsResponseDto { public WorldDistrictDto[] districts; }
    [Serializable] public class GetWorldDistrictsPayload { public GetWorldDistrictsResponseDto data; }
    [Serializable] public class GetWorldDistrictsEnvelope { public GetWorldDistrictsPayload payload; }

    /// <summary>Un bâtiment de `GET /v1/city/district/{id}/interior` → `payload.data.buildings[]`.
    /// C'est la SEULE source d'un `building_id` accessible à un joueur (voir l'en-tête de
    /// `DemolitionScreenController`). Corps réel mesuré :
    /// <code>
    /// { "building":"eac3d60b-…", "block_id":1501, "operational_type":"lab",
    ///   "conversion_band":"OPERATIONAL", "shell_state":"STANDING", "condition_band":"SOUND",
    ///   "revenue_band":"IDLE", "revenue_chain":"UNWIRED", "activity_band":"IDLE",
    ///   "lieutenant_ids":[…], "maintenance_in_progress":…, "lapse_phase_bucket":…,
    ///   "name_i18n":{ "key":"game.fiction.building.name",
    ///                 "params":{ "enseigne":"Atelier Vesk", "district":"La Lisière", "block":"1501" } } }
    /// </code>
    /// ⚠️ Le champ s'appelle `building`, PAS `building_id` — un DTO qui aurait deviné le nom long
    /// aurait rendu `null` en silence, et l'écran aurait cherché la fiche d'un site vide.</summary>
    [Serializable]
    public class DistrictBuildingDto
    {
        /// <summary>L'UUID à passer à `friction/nodes/{buildingId}`.</summary>
        public string building;
        public int block_id;
        public string operational_type;
        public string shell_state;
        public string condition_band;
        public string revenue_band;
        public string activity_band;
        /// <summary>⛔ NON VIDE ⇒ la démolition REFUSERA (409 LIEUTENANT_ASSIGNED, mesuré).
        /// L'écran peut donc le dire AVANT le geste, au lieu de laisser le joueur découvrir le
        /// refus. C'est la même famille que `mastery_bucket` sur ㉜ : la précondition du serveur
        /// est déjà dans le corps que l'écran lit.</summary>
        public string[] lieutenant_ids;
        /// <summary>Le nom de fiction, en CLÉ i18n + paramètres — jamais une chaîne prête.
        /// `params.enseigne` porte le nom lisible (« Atelier Vesk »).</summary>
        public BuildingNameI18nDto name_i18n;
    }

    // ⛔⛔ `BuildingNameI18nDto` / `BuildingNameParamsDto` NE SONT PAS REDÉCLARÉS ICI — ils
    // existent déjà dans la MÊME assembly et le MÊME namespace
    // (`Operational/BuildingCard/BuildingCardDtos.cs:29,51`). Je les avais réécrits ; le
    // compilateur a rendu CS0101, et c'est lui qui a eu raison.
    // ⇒ Ce dépôt a déjà payé la version SILENCIEUSE de cette faute : deux types HOMONYMES dans
    //   deux fichiers voisins, deux importateurs, et l'un qui prend le mauvais sans que rien ne
    //   rougisse. Ici le namespace partagé rend le doublon fatal à la compilation — c'est la
    //   chance, pas la vigilance, et la bonne réponse reste la même : RÉUTILISER.
    // ⚠️ Et la version partagée est PLUS RICHE que la mienne : elle porte `rang`, avec la mesure
    //   qui l'accompagne (le serveur l'omet quand il vaut 1, et un client qui le complèterait
    //   écrirait « n° 1 » sur tous les bâtiments uniques). Ma copie l'aurait perdu en silence.
    //   *Un doublon ne se contente pas de dupliquer : il retire ce que l'original avait appris.*

    /// <summary>`GET /v1/city/district/{id}/interior` — l'écran n'en lit que `buildings` et `name`.
    /// Le corps en porte bien plus (`blocks[]`, `grid`, `lieutenants`, `day_phase`…) ; les déclarer
    /// tous ferait croire que cet écran les consomme.</summary>
    [Serializable]
    public class GetCityDistrictInteriorResponseDto
    {
        public int district_id;
        public string name;
        public DistrictBuildingDto[] buildings;
    }

    [Serializable] public class GetCityDistrictInteriorPayload { public GetCityDistrictInteriorResponseDto data; }
    [Serializable] public class GetCityDistrictInteriorEnvelope { public GetCityDistrictInteriorPayload payload; }
}
