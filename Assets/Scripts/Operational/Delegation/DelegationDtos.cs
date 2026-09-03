using System;

namespace MafiaCleanCity.Operational
{
    // ㉜ « Ce que vous avez confié » — le tableau de service (maquette `ecrans-brennar-6.html`,
    // cadres m-73..78, générateur `atelier/generateur-service.py`).
    //
    // ⛔ CES FORMES SONT MESURÉES SUR LA PILE DEV, PAS LUES DANS UN DOCBLOCK. Compte créé le
    // 2026-09-03 par `POST /v1/auth/signup`, puis chaque route appelée avec SON jeton ; les corps
    // réels sont conservés dans `<back>/scratchpad/chantier-F-2026-09-03/*.json`. Ce qui suit ne
    // contient AUCUN champ que je n'aie vu passer sur le fil, sauf `RecallPreviewDto` — voir sa
    // propre note, il est le seul dont le corps de SUCCÈS m'a été refusé (409, et pour une raison
    // qui est elle-même une mesure).

    /// <summary>Une ligne de `GET /v1/meta/task-categories` → `payload.data.task_categories[]`.
    /// Corps réel observé sur un compte neuf (les 4 catégories LIVE, toujours les 4, jamais une
    /// liste creuse) :
    /// <code>
    /// { "category_key":"ROUTE_ASSIGNMENT", "mastery_bucket":"NASCENT", "progress_band":"LOW",
    ///   "delegation_state":"SELF", "recovery":false, "recall_scar":false }
    /// </code>
    /// Les champs optionnels sont OMIS et non `null` quand ils ne s'appliquent pas
    /// (`meta-progression.projection.service.ts:55-56`) — `JsonUtility` rend donc `null` pour une
    /// chaîne absente et `false`/`null` pour un objet absent, ce que le rendu doit traiter comme
    /// « pas applicable » et jamais comme une valeur.
    ///
    /// ⛔⛔ CE QUE CETTE PROJECTION NE SERT PAS, ET C'EST LE DÉFAUT QUI COMMANDE TOUT L'ÉCRAN :
    /// **elle ne sert pas le `category_id`**. Les trois routes d'action l'exigent, et l'exigent
    /// en ENTIER (`intField(..., 'int4')`, `meta-progression.controller.ts:127`/`:167` ;
    /// `@Param('categoryId', IntParam)` `:184`). Mesuré : `POST /v1/meta/recall` avec
    /// `{"category_id":"ROUTE_ASSIGNMENT"}` rend **422 VALIDATION_FAILED**, message
    /// « category_id must be an integer (got "ROUTE_ASSIGNMENT") ». La correspondance clé→code
    /// n'existe que dans `task-category-catalogue.ts` côté serveur.
    /// ⇒ C'est une **forme F** (défaut de PROJECTION, pas d'écriture) : la donnée existe, elle est
    /// déjà l'index de la boucle qui construit la réponse
    /// (`taskCategoryProjection` itère `TASK_CATEGORY_CATALOGUE.filter(live)` et passe
    /// `entry.code` à `projectRow`), et la projection l'omet. Le client la porte donc en dur, ci-
    /// dessous, EN PIS-ALLER DÉCLARÉ — voir <see cref="DelegationCatalogue"/>. Dette TD-530.</summary>
    [Serializable]
    public class TaskCategoryRowDto
    {
        /// <summary>`ROUTE_ASSIGNMENT` · `LIEUTENANT_HIRING` · `SUPPLY_SOURCING` · `HEAT_MANAGEMENT`
        /// — les 4 LIVE, et elles seules : la projection n'itère JAMAIS les 8 RESERVED
        /// (`meta-progression.projection.service.ts:115`). C'est pourquoi le cadre m-78 (« ce qui
        /// n'est pas encore à confier ») ne peut pas venir du réseau.</summary>
        public string category_key;

        /// <summary>`NASCENT` · `LEARNING` · `PRACTICED` · `ELIGIBLE` (`mastery-bucket.ts:33`).
        /// ⛔ `ELIGIBLE` N'EST PAS UN LIBELLÉ, C'EST LE PRÉDICAT D'ÉLIGIBILITÉ LUI-MÊME : la garde
        /// serveur est `deriveMasteryBucket(raw, seuil) !== 'ELIGIBLE'` → 422
        /// (`graduation.service.ts:225-230`), c'est-à-dire la MÊME fonction que celle qui remplit
        /// ce champ. Le client peut donc dire AVANT d'appuyer si le geste passera, sans deviner et
        /// sans figer de seuil (le seuil, lui, est un tunable rechargeable — le client ne le voit
        /// jamais, et c'est bien ainsi).
        /// Mesuré : un compte neuf est `NASCENT` sur les 4, et `POST /v1/meta/graduation` rend
        /// « category 1 is not ELIGIBLE for graduation (raw &lt; threshold) ».</summary>
        public string mastery_bucket;

        /// <summary>`LOW` · `MEDIUM` · `HIGH` — tiers grossiers vers le seuil (`mastery-bucket.ts:38`).
        /// SERVI, NON DESSINÉ dans la maquette : noté au commit pour le juge-données.</summary>
        public string progress_band;

        /// <summary>`SELF` · `DELEGATED` · `RETIRED` (contrainte réelle en base :
        /// `CHECK (delegation_state IN ('SELF','DELEGATED','RETIRED'))`, migration `0002:62-63`).</summary>
        public string delegation_state;

        /// <summary>⛔ C'EST UN **UUID**, PAS UN NOM. `delegated_to_lieutenant_id`
        /// (`meta-progression.projection.service.ts:147`). La maquette écrit « Vito » / « Salvatore » :
        /// ces noms ne sont dans AUCUN corps de cette route. Ils viennent de `GET /v1/lieutenants`
        /// → `name` (mesuré : « Lt. Vesk », « Lt. Ferrand »), et c'est la seule raison pour laquelle
        /// cet écran appelle une seconde route. Un `ref` sans correspondance dans le roster se rend
        /// donc « quelqu'un » — jamais un UUID à l'écran, jamais un nom inventé.</summary>
        public string delegated_lieutenant_ref;

        /// <summary>Présent dès que la catégorie a DÉJÀ gradué une fois (même revenue à `SELF` —
        /// `graduated_at != null`, la cicatrice). SERVI, NON DESSINÉ.</summary>
        public TaskCategorySuccessorDto successor;

        /// <summary>`player_proficiency.recovery_period_remaining > 0` — il rattrape encore ce
        /// qu'une reprise lui a coûté. SERVI, NON DESSINÉ dans la maquette ; l'écran l'emploie
        /// comme sous-ligne honnête à la place du « depuis 6 jours » qui n'a pas de source.</summary>
        public bool recovery;

        /// <summary>La qualité du repli pendant une fenêtre de reprise ACTIVE (omise sinon).
        /// SERVI, NON DESSINÉ.</summary>
        public string fallback_quality_bucket;

        /// <summary>Cette catégorie a déjà été reprise au moins une fois. SERVI, NON DESSINÉ ;
        /// employé comme sous-ligne.</summary>
        public bool recall_scar;
    }

    /// <summary>`successor` — le domaine qu'une graduation débloque. `substrate` vaut toujours
    /// `PENDING` sur cette base (aucun des 5 successeurs n'a de verbe joueur : P3-G..K).</summary>
    [Serializable]
    public class TaskCategorySuccessorDto
    {
        public string key;
        public string substrate;
        public bool suspended;
    }

    /// <summary>`payload.data.delegated[]` — champ FRÈRE additif, dérivé des mêmes lignes
    /// (`deriveDelegatedSummaries`). Mesuré `[]` sur un compte neuf. L'écran ne le lit PAS :
    /// il n'apporte rien que `task_categories` ne porte déjà, et lire deux fois la même vérité
    /// est le meilleur moyen de les faire diverger. Déclaré ici pour que la forme du corps soit
    /// COMPLÈTE — un DTO qui omet une clé servie ment sur ce que le back rend.</summary>
    [Serializable]
    public class DelegatedSummaryDto
    {
        public string category_key;
        public string delegated_lieutenant_ref;
        public TaskCategorySuccessorDto successor;
    }

    /// <summary>`GET /v1/meta/task-categories` — l'ENSEMBLE DE CLÉS mesuré de `payload.data` est
    /// exactement `{ task_categories, delegated }`, et rien d'autre.</summary>
    [Serializable]
    public class GetMetaTaskCategoriesResponseDto
    {
        public TaskCategoryRowDto[] task_categories;
        public DelegatedSummaryDto[] delegated;
    }

    [Serializable] public class GetMetaTaskCategoriesPayload { public GetMetaTaskCategoriesResponseDto data; }
    [Serializable] public class GetMetaTaskCategoriesEnvelope { public GetMetaTaskCategoriesPayload payload; }

    /// <summary>`GET /v1/meta/recall-preview/{categoryId}` — l'aperçu de reprise (cadre m-76).
    ///
    /// ⚠️ **LE SEUL DTO DE CE FICHIER DONT LE CORPS DE SUCCÈS N'A PAS ÉTÉ VU SUR LE FIL, ET JE LE
    /// DIS PLUTÔT QUE DE LAISSER CROIRE LE CONTRAIRE.** Mesuré sur mon compte :
    /// `GET /v1/meta/recall-preview/1` rend **409 RESOURCE_STATE_CONFLICT**, « category 1 is not
    /// DELEGATED for this player — no recall to preview ». Et ce 409 n'est pas un accident de
    /// fixture : pour déléguer il faut être `ELIGIBLE`, ce qu'un compte neuf n'est pas — la route
    /// est donc INATTEIGNABLE tant que la maîtrise n'a pas monté par du jeu réel. Les champs ci-
    /// dessous sont recopiés de la seule source qui les définisse
    /// (`promotion-lock.service.ts`, `export interface RecallPreview`), signature relue caractère
    /// par caractère et non reformulée. Dette TD-531 : re-mesurer le corps de SUCCÈS le jour où un
    /// parcours amène un compte jusqu'à une délégation réelle.
    ///
    /// Les six lignes de l'aperçu, dans l'ordre de la maquette, sont exactement ces six champs :
    /// ce qu'il a appris (`drop_bucket`) · pour tout regagner (`recovery_bucket`) · ce qu'on lui
    /// doit (`severance_bucket`) · il vous en veut (`window_days_band`) · celui qu'il formait
    /// (`suspended_successor_key`) · si vous reconfiez plus tard (`re_delegation_penalty`).
    /// **Rien n'est inventé côté maquette — tout était déjà nommé côté serveur.**</summary>
    [Serializable]
    public class GetMetaRecallPreviewResponseDto
    {
        /// <summary>`FAIBLE` · `MOYEN` · `ELEVE` — déjà en français dans le back.</summary>
        public string drop_bucket;
        /// <summary>`COURT` · `MOYEN` · `LONG` — déjà en français dans le back.</summary>
        public string recovery_bucket;
        /// <summary>`LOW` · `MEDIUM` · `HIGH` · `RUINOUS` (`severance-bucket.ts:29`).</summary>
        public string severance_bucket;
        /// <summary>`SHORT` · `STANDARD` · `EXTENDED`.</summary>
        public string window_days_band;
        /// <summary>Optionnel — omis quand la graduation n'avait débloqué aucun successeur.</summary>
        public string suspended_successor_key;
        public bool re_delegation_penalty;
    }

    [Serializable] public class GetMetaRecallPreviewPayload { public GetMetaRecallPreviewResponseDto data; }
    [Serializable] public class GetMetaRecallPreviewEnvelope { public GetMetaRecallPreviewPayload payload; }

    /// <summary>`POST /v1/meta/graduation` → `{ graduated: true, category_id, lieutenant_id }`
    /// (contrat du contrôleur, `meta-progression.controller.ts:106`). Corps de succès NON observé
    /// pour la même raison que l'aperçu ci-dessus (422 not ELIGIBLE sur un compte neuf) — TD-531.</summary>
    [Serializable]
    public class PostMetaGraduationResponseDto
    {
        public bool graduated;
        public int category_id;
        public string lieutenant_id;
    }

    [Serializable] public class PostMetaGraduationPayload { public PostMetaGraduationResponseDto data; }
    [Serializable] public class PostMetaGraduationEnvelope { public PostMetaGraduationPayload payload; }

    /// <summary>Corps de `POST /v1/meta/graduation`. Les DEUX champs sont obligatoires et la route
    /// REFUSE tout champ hors de cette allowlist (`rejectUnknownFields(body, ['category_id',
    /// 'lieutenant_id'])`, `meta-progression.controller.ts:117`) — un DTO qui porterait un champ
    /// de confort en plus ferait 422 sur TOUS les appels.
    /// `category_id` : entier. `lieutenant_id` : UUID (`uuidField`).</summary>
    [Serializable]
    public class PostMetaGraduationBody
    {
        public int category_id;
        public string lieutenant_id;
    }

    /// <summary>`POST /v1/meta/recall` → `{ recalled: true, category_id, lieutenant_id }`.</summary>
    [Serializable]
    public class PostMetaRecallResponseDto
    {
        public bool recalled;
        public int category_id;
        public string lieutenant_id;
    }

    [Serializable] public class PostMetaRecallPayload { public PostMetaRecallResponseDto data; }
    [Serializable] public class PostMetaRecallEnvelope { public PostMetaRecallPayload payload; }

    /// <summary>Corps de `POST /v1/meta/recall`. UN seul champ autorisé
    /// (`rejectUnknownFields(body, ['category_id'])`, `:160`).</summary>
    [Serializable]
    public class PostMetaRecallBody
    {
        public int category_id;
    }

    /// <summary>Une ligne de `GET /v1/lieutenants` → `payload.data.lieutenants[]`. Corps réel
    /// mesuré sur un compte neuf (le kit de départ en donne deux) :
    /// <code>
    /// { "lieutenant_id":"01a06654-…", "name":"Lt. Vesk", "archetype":"COOK",
    ///   "op_state_band":"IDLE", "rule_count_band":"NONE", "tenure_bucket":"FRESH" }
    /// </code>
    /// ⚠️ `name` est bien SERVI ici (« Lt. Vesk ») — c'est la seule route de cet écran qui donne
    /// un nom lisible, et donc la seule façon d'écrire « Salvatore » sous une plaque confiée sans
    /// l'inventer.</summary>
    [Serializable]
    public class LieutenantRowDto
    {
        public string lieutenant_id;
        public string name;
        public string archetype;
        public string op_state_band;
        public string rule_count_band;
        /// <summary>`FRESH` · … — l'ancienneté DU LIEUTENANT dans la maison.
        /// ⛔ CE N'EST PAS « depuis 6 jours » : la maquette date la DÉLÉGATION, et l'ancienneté de
        /// la délégation n'est servie par AUCUNE route de cet écran. Employer celle-ci à sa place
        /// serait un chiffre juste répondant à une autre question — exactement la faute d'unités
        /// que ce dépôt a déjà payée. L'écran n'affiche donc aucune durée.</summary>
        public string tenure_bucket;
    }

    /// <summary>`GET /v1/lieutenants` — ensemble de clés de `payload.data` : `{ lieutenants }`.</summary>
    [Serializable]
    public class GetLieutenantsResponseDto
    {
        public LieutenantRowDto[] lieutenants;
    }

    [Serializable] public class GetLieutenantsPayload { public GetLieutenantsResponseDto data; }
    [Serializable] public class GetLieutenantsEnvelope { public GetLieutenantsPayload payload; }

    /// <summary>L'enveloppe d'ERREUR du back, commune à toutes ses routes. Sans elle, un refus
    /// métier parfaitement normal (422 « pas encore prête », 409 « déjà tranché aujourd'hui »)
    /// arriverait à l'écran sous la forme « HTTP/1.1 422 Unprocessable Entity » — le joueur
    /// lirait un code là où le serveur a écrit une phrase.
    /// Forme mesurée : `payload.error = { code, http_status, user_facing_i18n_key, message, … }`.</summary>
    [Serializable] public class ApiErreurDto { public string code; public int http_status; public string user_facing_i18n_key; public string message; }
    [Serializable] public class ApiErreurPayload { public ApiErreurDto error; }
    [Serializable] public class ApiErreurEnvelope { public ApiErreurPayload payload; }
}
