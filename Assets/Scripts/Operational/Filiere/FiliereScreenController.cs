using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>screen_c2 « Filiere » — squelette généré par Tools/nouvel-ecran.py.
    ///
    /// Patron : `ReputationScreenController` (㊲, `pilote-B` — le seul écran construit ET jugé
    /// par juge-visuel ET juge-données). Ce squelette pose le contrat `IShellTenant`, un fond
    /// CanvasRenderer-safe et un résolveur exhaustif d'exemple ; il NE POSE PAS la géométrie de
    /// la maquette — ça, c'est `// MÉTIER ICI`, une fois la maquette lue.
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables (mesurées ailleurs dans ce dépôt) :
    ///  · aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage — passer par
    ///    `EchelleMaquette.Px(...)` avec la largeur DÉCLARÉE de LA maquette de cet écran
    ///    (`EchelleMaquette.LargeurEcransBrennar` = 300 par défaut pour les écrans de la famille
    ///    `ecrans-brennar.html` — // MÉTIER ICI : vérifier laquelle des 3 maquettes est la
    ///    source, ou ajouter une constante `Largeur<Nom>` si c'en est une quatrième).
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class FiliereScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;
        /// <summary>⛔ CE POINT D'INJECTION CONSTRUIT — ET C'EST LE CORRECTIF (mesuré 2026-09-02).
        /// Le gabarit appelait <c>EnsureInitialized()</c> depuis <c>Awake()</c>. Or <c>Awake</c>
        /// s'exécute SYNCHRONEMENT DANS <c>AddComponent&lt;T&gt;()</c>, donc AVANT que l'appelant
        /// ait pu poser le parent : la racine n'a pas encore de largeur, et <c>BuildLayout()</c>
        /// mesure zéro. Symptôme observé sur un écran réel : textes empilés au centre, ce qui
        /// ressemble à un défaut de mise en page alors que c'est un défaut d'ORDRE.
        /// ⇒ *Le shell, lui, fait déjà le bon ordre à ses trois sites de montage (parent, puis
        /// géométrie, puis <c>AddComponent</c> en DERNIER) — le défaut n'était pas chez lui, il
        /// était dans ce gabarit, donc dans les 46 écrans qu'il reste à générer.*
        /// La construction se déclenche donc quand le parent est CONNU, pas quand l'objet naît.</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;

            // ⛔⛔ LES DEUX GESTES CI-DESSOUS SONT UN CORRECTIF MESURÉ (2026-09-03, écran ㉜),
            // et ce gabarit produit les écrans qui restent : sans eux, CHACUN naîtrait avec le
            // même défaut. Le gabarit faisait bâtir la racine sous `mountParent` (= `ContentSlot`) :
            // elle devenait un FRÈRE de l'hôte du locataire au lieu de son enfant. La garde d'ordre
            // de fratrie de la planche l'a dit au premier montage réel — « frère 18 sur 20 — ce qui
            // se dessine PAR DESSUS : [19] <Nom>Root graphics=52 ». L'écran était complet et se
            // recouvrait LUI-MÊME : la garde mesurait l'hôte, le dessin vivait sur la racine.
            // ⇒ Les écrans qui passent déjà sous le shell (`Shop`, `Settings`, …) font tous
            //   l'inverse : hôte étiré au conteneur, hôte DERNIER, racine sous l'hôte.

            // (1) L'hôte remplit son conteneur. Sans ça son rect reste à 100×100 — la taille par
            // défaut d'un RectTransform neuf — et tout ce qu'on bâtit dessous tient dans 100 px,
            // sans la moindre erreur console.
            // ⛔⛔ L'HÔTE N'EST PAS UN `RectTransform` — ET LA RÈGLE EXACTE A ÉTÉ MESURÉE.
            // `AppShell.ConstruireLocataire` crée l'hôte par `new GameObject($"Tenant_...")`,
            // donc avec un `Transform` NU. Les écrans qui en ont quand même un ne l'ont pas
            // reçu : ils l'ont PROVOQUÉ, en posant un `Graphic` directement sur l'hôte — Unity
            // convertit alors le Transform toute seule.
            // ⇒ **L'hôte est un `RectTransform` si et seulement si l'écran dessine dessus.**
            //   Cet écran-ci dessine dans un ENFANT de l'hôte, donc la conversion n'arriverait
            //   jamais : le harnais de capture rendrait « n'est pas un RectTransform », et un
            //   cast dur rendrait une `InvalidCastException` nue (mesuré, run r2 et run 3).
            // ⇒ On la demande donc EXPLICITEMENT, plutôt que de compter sur un effet de bord de
            //   quelqu'un d'autre. Un `RectTransform` ajouté ici remplace le `Transform` — c'est
            //   l'opération prévue par Unity pour exactement ce cas.
            RectTransform rtHote = transform as RectTransform;
            if (rtHote == null) rtHote = gameObject.AddComponent<RectTransform>();
            if (rtHote != null)
            {
                rtHote.anchorMin = Vector2.zero;
                rtHote.anchorMax = Vector2.one;
                rtHote.offsetMin = Vector2.zero;
                rtHote.offsetMax = Vector2.zero;
            }

            // (2) Un locataire monté en surimpression doit être le DERNIER enfant, sinon il est
            // rendu SOUS ses frères. Propriété STRUCTURELLE : aucun pixel, aucune résolution.
            transform.SetAsLastSibling();

            EnsureInitialized();
        }

        private string token;
        public void SetToken(string t) => token = t;

        /// <summary>Le nœud dont on montre la filière — surchargeable, sinon découvert.
        ///
        /// ⛔⛔ CE COMMENTAIRE A PORTÉ UN ÉNONCÉ FAUX 88 LIGNES AU-DESSUS DU CODE QUI LE RÉFUTE.
        /// Il affirmait qu'aucune route amont ne rend cet identifiant — au PRÉSENT, sans réserve.
        /// Or `Charger()` appelle `GetLaunderingNodes(token, …)` et prend `nodes[0].node` : la
        /// route amont était déjà écrite, dans ce fichier, avant que je lise cette ligne.
        /// ★ *Deux énoncés du même faux vivaient dans un seul fichier : l'un s'est fait corriger
        ///   en 2026-09-03 par la mesure, l'autre est resté parce que personne ne l'a rouvert.*
        ///   Le correctif était scopé à la ligne qu'on regardait, pas à la PROPRIÉTÉ qu'elle
        ///   affirmait — c'est la façon dont un défaut survit à sa propre réparation.
        ///
        /// CE QUI EST VRAI AUJOURD'HUI : le champ reste vide par DÉFAUT, et c'est voulu — l'écran
        /// découvre alors la tête de la filière tout seul. `SetNodeId` existe pour l'ouvrir sur un
        /// nœud choisi (une future navigation depuis ⑪/⑫), pas pour compenser un manque.</summary>
        private string nodeId;
        public void SetNodeId(string id) => nodeId = id;

        /// <summary>Vrai dès que l'écran a FINI de se rendre — succès, cassure ou repli.
        /// Même raison que sur ㊳ : un appelant qui attend N frames photographie un écran qui
        /// n'a pas encore rendu, et l'image ne le dit pas.</summary>
        public bool RenduTermine { get; private set; }

        // ---- crochets de test ---------------------------------------------------------------
        public LaunderingPipelineDto DernierChargement { get; private set; }
        /// <summary>La liste des nœuds (`GET …/laundering`) — c'est ELLE qui porte `stage_index`, l'ORDRE servi des étapes.</summary>
        public LaunderingNodesDto DerniereListe { get; private set; }
        /// <summary>`deviation_active` lu sur la TÊTE seule (`GET …/laundering/{node}` ne sert que le nœud de tête, mesuré le 23/09) ;
        /// absent = non lu (échec).</summary>
        public IReadOnlyDictionary<string, bool> EcartsParNoeud => ecartsParNoeud;
        private readonly Dictionary<string, bool> ecartsParNoeud = new Dictionary<string, bool>();
        /// <summary>Les nœuds des étapes, DANS L'ORDRE AFFICHÉ — pour la garde de valeur (ordre affiché == ordre de `stage_index`).</summary>
        public IReadOnlyList<string> OrdreAffiche => ordreAffiche;
        private readonly List<string> ordreAffiche = new List<string>();
        /// <summary>Vrai quand l'ordre affiché vient de `stage_index` ; faux quand une étape n'y figure pas et que l'ordre du
        /// serveur est gardé tel quel (le trou est journalisé, jamais comblé).</summary>
        public bool OrdreParStageIndex { get; private set; }
        /// <summary>La valeur posée dans le compteur « ÉCARTS » au dernier rendu.</summary>
        public int EcartsAffiches { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }

        private RectTransform racinePleinEcran;
        // ⛔ `LaunderingClient` — LE PRODUCTEUR QUI EXISTAIT DÉJÀ, pas un client neuf.
        // Le générateur m'en avait fabriqué un second (`FiliereClient`), supprimé : ⑪ appelle ces
        // quatre routes depuis toujours, et sous un préfixe que je n'avais pas cherché.
        private MafiaCleanCity.Operational.LaunderingClient client;
        private bool initialise;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);

        // ⚠️ PAS d'appel depuis `Awake()` : il court dans `AddComponent`, avant tout parentage.
        // `Start()` est le filet — il s'exécute après que l'appelant a eu sa frame pour injecter le
        // parent, et `EnsureInitialized` est idempotent, donc le premier des deux qui arrive gagne
        // sans que le second ne reconstruise. Sans ce filet, un écran monté sans `SetMountParent`
        // ni `Charger()` ne se construirait JAMAIS — un vert par absence, pas une économie.
        private void Start()
        {
            // ⛔ RÉPÉTÉ ICI, ET CE N'EST PAS UNE REDONDANCE. Le shell ajoute des enfants à
            // `ContentSlot` APRÈS la fenêtre synchrone du montage — mesuré ailleurs dans ce dépôt :
            // « frère 6 sur 11 » restait inchangé quand l'ordre n'était posé qu'au montage.
            // `Start()` court à la frame SUIVANTE : c'est le premier instant où « être dernier »
            // est stable.
            if (transform.parent != null) transform.SetAsLastSibling();
            EnsureInitialized();
            amorce = StartCoroutine(Amorcer());
        }

        /// <summary>Charger dès le montage — ㊴ a montré ce que coûte un `Charger()` que personne
        /// n'appelle : l'écran reste un squelette et l'image ne peut pas le dire.</summary>
        private IEnumerator Amorcer()
        {
            if (string.IsNullOrEmpty(token)) yield break;   // hors session : état initial NOMMÉ
            if (corpsImposeParUnTest) yield break;          // un test tient l'écran
            yield return Charger();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new MafiaCleanCity.Operational.LaunderingClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface. // MÉTIER ICI si `GetLaundering` a des paramètres
        /// de chemin (id, etc.) — ajouter les arguments correspondants ici et les faire
        /// remonter depuis l'appelant (le shell, ou un `RendrePourTest`).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            // ⛔ SANS CETTE LIGNE, LA CONVERSION i18n EST INERTE. `Libelle.De` rend son LITTÉRAL
            // tant que `I18nCatalog` est vide, donc un écran « converti » qui n'amorce jamais le
            // dictionnaire affiche exactement ce qu'il affichait avant — et ses captures sont
            // belles, françaises, et ne prouvent rien.
            // ★ *Convertir et amorcer sont deux gestes.* Le premier est visible dans le diff, le
            //   second ne l'est nulle part : rien ne rougit quand il manque, puisque le repli est
            //   byte-identique au texte d'origine. C'est la même famille que « deux populations
            //   disjointes » — la garantie qui rendait la conversion sûre est ce qui a caché
            //   qu'elle ne servait à rien. Mesuré le 2026-09-04 : AUCUN de mes 7 écrans convertis
            //   n'amorçait, sur les 6 du dépôt qui le font.
            yield return MafiaCleanCity.I18n.I18nCatalog.Amorcer(
                new MafiaCleanCity.I18n.I18nClient { BaseUrl = baseUrl }, token);
            RenduTermine = false;

            // ⛔ ON DEMANDE LA LISTE — corrigé le 2026-09-03 après mesure, complété le 2026-09-06.
            // Ma première version tenait cet identifiant pour introuvable, sur la foi d'une entrée
            // de dette dont le NUMÉRO désignait en fait un tout autre sujet (le bundle i18n du
            // VPS), et affichait la chaîne rompue sans rien demander.
            // MESURÉ le 2026-09-03 : `GET /v1/operational/laundering` rend 200, tableau vide sur
            // un compte FRAIS. La route EXISTE ; c'est le joueur neuf qui n'a aucun nœud.
            // MESURÉ le 2026-09-04, et c'est la moitié qui manquait : sur `operational_demo` la
            // même route rend **QUATRE** nœuds — corps commité dans le dossier de juge de cet
            // écran, `Tools/juge-visuel/screen_c2/corps-reels/GET_operational_laundering.json`,
            // back `6ff684db`. La première mesure avait laissé sa propre question ouverte en
            // toutes lettres (« ce que rend cette route pour un joueur qui possède une boutique »)
            // et personne n'était revenu la fermer.
            // ★ *Une mesure qui borne honnêtement sa portée désigne la mesure suivante ; encore
            //   faut-il que quelqu'un la fasse.* Deux jours et un écran inachevé, ici.
            // ★ « On ne peut pas savoir » et « il n'y a rien encore » se dessinent différemment,
            //   et seule la seconde est vraie. J'allais peindre la première sur l'autorité d'une
            //   maquette — qui, elle, a été dessinée quand la route n'existait peut-être pas.
            // ⛔ LA LISTE EST DEMANDÉE MÊME QUAND LE NŒUD EST CONNU (2026-09-23) : c'est elle qui porte `stage_index`, l'ordre
            //    SERVI des étapes — `stages` ne le porte pas. Personne ne le lisait (inventaire de l'atelier, `25-donnees-servies`).
            LaunderingNodesDto liste = null;
            yield return client.GetLaunderingNodes(token,
                dto => liste = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });
            yield return null;
            DerniereListe = liste;

            if (string.IsNullOrEmpty(nodeId))
            {
                if (liste == null) { RendreEtatIndisponible(); RenduTermine = true; yield break; }
                if (liste.nodes == null || liste.nodes.Length == 0)
                {
                    RendreAucunNoeud();
                    RenduTermine = true;
                    yield break;
                }
                // ⛔ `.node` — l'UUID DANS l'objet, pas l'objet. Voir `LaunderingNodeRefDto` :
                // ce champ était `string[]` parce que je l'avais mesuré sur un compte VIDE.
                // ⛔ La TÊTE est le plus petit `stage_index`, pas `nodes[0]` : l'ordre du tableau n'est promis par personne.
                nodeId = liste.nodes.Where(n => n != null).OrderBy(n => n.stage_index).First().node;
            }

            yield return client.GetLaunderingPipeline(nodeId, token,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponible(); RenduTermine = true; yield break; }

            // ⛔ `deviation_active` VIT SUR LA ROUTE DU NŒUD (`GET …/laundering/{node}`), pas dans `stages`. Seul ⑪ le lisait ; ㊵ a
            //    un cadre pour lui (maquette série 6, cadre 138). ⚠️ MESURÉ au créneau du 2026-09-23 : cette route ne sert QUE le nœud
            //    de TÊTE — 404 « is not a player-owned Stage-1 laundering node » sur les trois autres. Le drapeau est donc celui de la
            //    FILIÈRE, porté par sa tête (l'épingle d'audit de la façade hôte) : UNE lecture, sur la tête. Un échec laisse la tête
            //    NON LUE — elle ne compte pas comme « sans écart ».
            ecartsParNoeud.Clear();
            {
                LaunderingNodeDto n = null;
                string tete = nodeId;
                yield return client.GetLaunderingNode(tete, token, dto => n = dto,
                    (code, msg) => Debug.LogWarning($"[FILIERE] écart de la tête {tete} NON LU ({code} — {msg})"));
                if (n != null) ecartsParNoeud[tete] = n.deviation_active;
            }

            AppliquerEtat(DernierChargement, liste, ecartsParNoeud);
            RenduTermine = true;
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        /// <summary>⛔ FERME LA COURSE ENTRE `Start()` ET LE RENDU DE TEST. Une suite qui pose un
        /// VRAI jeton puis appelle `RendrePourTest` laisse `Amorcer()` partir en parallèle :
        /// l'auto-chargement va chercher les données réelles et ÉCRASE le corps fabriqué, à une
        /// frame près. *Un test qui perd cette course lit une vérité — celle d'un autre monde que
        /// le sien*, et son rouge accuse alors le résolveur au lieu de l'ordonnancement.
        /// ⚠️ Le garde-fou `IsNullOrEmpty(token)` NE COUVRE PAS ce cas : il protège l'écran monté
        /// hors session, pas celui à qui un test donne une identité PUIS impose un corps.
        /// ⚠️ Relu APRÈS CHAQUE `yield`, jamais seulement à l'entrée : la coroutine peut être déjà
        /// partie quand le test pose le drapeau. Mesuré sur ⑨ (patron `2efdf2e`).</summary>
        private bool corpsImposeParUnTest;
        private Coroutine amorce;

        public void RendrePourTest(LaunderingPipelineDto dto)
        {
            corpsImposeParUnTest = true;
            // ⛔ ON ARRÊTE L'AUTO-CHARGEMENT, on ne se contente pas de le décourager. Le drapeau
            // seul ne ferme que le cas facile (le test rend AVANT que la coroutine ne parte) :
            // si elle est déjà dans son appel réseau, elle rendra son résultat PAR-DESSUS le corps
            // du test quelques frames plus tard, et `Charger()` applique son état dans plusieurs
            // branches — y semer des gardes serait fragile et incomplet.
            // ★ *Fermer une course en demandant poliment à l'autre de renoncer suppose qu'il
            //   repasse par un point où on peut le lui dire.* `StopCoroutine` ne le suppose pas.
            if (amorce != null) { StopCoroutine(amorce); amorce = null; }
            EnsureInitialized();
            AppliquerEtat(dto);
        }

        /// <summary>Même contrat que `RendrePourTest(dto)`, avec la liste (`stage_index`) et les écarts par nœud — pour les tests
        /// d'état de l'ordre et du cadre 138, sans réseau.</summary>
        public void RendrePourTest(LaunderingPipelineDto dto, LaunderingNodesDto liste, IDictionary<string, bool> ecarts)
        {
            corpsImposeParUnTest = true;
            if (amorce != null) { StopCoroutine(amorce); amorce = null; }
            EnsureInitialized();
            AppliquerEtat(dto, liste, ecarts);
        }

        /// <summary>// MÉTIER ICI — TOUT le rendu métier de cet écran part d'ici. Vide à
        /// dessein : remplir depuis la maquette RATIFIÉE et le corps RÉEL mesuré, jamais depuis
        /// une supposition sur ce que l'interface TypeScript back "devrait" rendre.</summary>
        /// <summary>⛔⛔ CETTE MÉTHODE ÉTAIT VIDE — `// MÉTIER ICI` — ET L'ÉCRAN PASSAIT POUR BÂTI.
        /// Le 2026-09-03 j'ai mesuré `GET /v1/operational/laundering` sur un compte FRAIS, lu
        /// `{"nodes":[]}`, et j'en ai tiré DEUX conclusions : que la chaîne était rompue au premier
        /// maillon — en le consignant sous un numéro de dette qui désigne un autre sujet — et que
        /// ses éléments étaient des chaînes. Les deux étaient fausses.
        /// L'écran a donc été écrit comme un CONSTAT DE RUPTURE, son rendu nominal jamais posé, et
        /// sa planche de juge montrait l'état initial sans que rien ne le signale — le test était
        /// vert, `RenduTermine` valait vrai.
        /// ★ *`RenduTermine` dit que le code a fini, jamais que l'écran a changé.*
        /// ★ *Une seule mesure prise dans le mauvais monde a produit un DTO faux, un TD faux et un
        ///   écran inachevé* — et chacun de ces trois se citait pour justifier les autres.
        ///
        /// CE QUE LE SERVEUR ENVOIE VRAIMENT, mesuré le 2026-09-04 sur `operational_demo` :
        ///   GET /v1/operational/laundering/{node}/pipeline
        ///   → {"stages":[{node, cleanliness_band, terminal, has_cash}, …]}  — ordonné tête→queue
        ///   quatre étapes, bandes PARTIAL → MOSTLY_CLEAN → CLEAN → CLEAN(terminal).
        ///
        /// ⚠️ LA BANDE D'UNE ÉTAPE N'EST PAS CELLE DU NŒUD. `GET …/laundering/{node}` rend
        /// `CLEAN` pour le nœud qui vaut `PARTIAL` dans son propre pipeline : deux projections
        /// voisines de la même entité. On lit donc la bande DANS `stages`, jamais ailleurs.</summary>
        private void AppliquerEtat(LaunderingPipelineDto dto) => AppliquerEtat(dto, null, null);

        /// <summary>⛔ 2026-09-23 (ruling de f2, reco (a) de l'atelier `25-donnees-servies` §1 : l'onglet Filière monte ㊵) — deux
        /// conditions : l'ORDRE des étapes vient de `stage_index` (la liste des nœuds), et `deviation_active` est LU (cadre 138).
        /// · ordre : tri STABLE par `stage_index` quand CHAQUE étape a le sien ; sinon l'ordre du serveur est gardé et le trou
        ///   journalisé — on n'invente pas de rang ;
        /// · « ÉCARTS » compte les étapes dont le nœud s'écarte de son profil (`deviation_active`), comme les cadres 137 (« 00
        ///   écarts » avec des étapes sales) et 138 (« 01 écarts ») de la maquette. Les étapes pas encore propres n'y comptent
        ///   plus : la bande de chaque étape le dit déjà (jusqu'ici ㊵ les comptait, faute de lire `deviation_active`) ;
        /// · une étape en écart porte « écart » ; le panneau du cadre 138 remplace celui du cadre nominal.</summary>
        private void AppliquerEtat(LaunderingPipelineDto dto, LaunderingNodesDto liste, IDictionary<string, bool> ecartsLus)
        {
            ViderListe();
            ordreAffiche.Clear();
            LaunderingStageDto[] etapes = dto != null && dto.stages != null
                ? dto.stages : new LaunderingStageDto[0];

            if (etapes.Length == 0) { RendreAucunNoeud(); return; }

            var rangs = new Dictionary<string, int>();
            if (liste != null && liste.nodes != null)
                foreach (LaunderingNodeRefDto n in liste.nodes)
                    if (n != null && !string.IsNullOrEmpty(n.node)) rangs[n.node] = n.stage_index;
            string[] sansRang = etapes.Where(e => e == null || string.IsNullOrEmpty(e.node) || !rangs.ContainsKey(e.node))
                                      .Select(e => e?.node ?? "<null>").ToArray();
            OrdreParStageIndex = sansRang.Length == 0;
            if (OrdreParStageIndex)
                etapes = etapes.OrderBy(e => rangs[e.node]).ToArray();   // OrderBy est STABLE
            else if (liste != null)
                Debug.LogWarning($"[FILIERE] ordre du SERVEUR gardé : {sansRang.Length} étape(s) sans stage_index dans la liste " +
                                 $"des nœuds [{string.Join(", ", sansRang)}]");

            System.Func<LaunderingStageDto, bool> enEcart = e => e != null && !string.IsNullOrEmpty(e.node)
                && ecartsLus != null && ecartsLus.TryGetValue(e.node, out bool v) && v;

            int propres = 0, ecarts = 0;
            foreach (LaunderingStageDto e in etapes)
            {
                if (e == null) continue;
                if (e.terminal && e.cleanliness_band == "CLEAN") propres++;
                if (enEcart(e)) ecarts++;
            }

            // ⚠️ Rôle PROPRE (`sous_titre`) : sous `bloc`, ce sous-titre et le titre du panneau (« La filière s’écarte… ») auraient la
            //    MÊME clé — le slug ignore la casse — et le back ne pourrait servir qu'une casse pour les deux.
            sousTitre.text = ecarts > 0
                ? MafiaCleanCity.I18n.Libelle.De("filiere", "sous_titre", "la filière s’écarte de son profil")
                : Lib("LA CHAÎNE, DE LA TÊTE À LA SORTIE");

            MajCompteur(0, etapes.Length, Lib("ÉTAPES"));
            MajCompteur(1, propres, Lib("PROPRE AU BOUT"));
            MajCompteur(2, ecarts, Lib("ÉCARTS"));
            EcartsAffiches = ecarts;

            for (int i = 0; i < etapes.Length; i++)
            {
                Etape(i + 1, etapes[i], enEcart(etapes[i]));
                if (i < etapes.Length - 1) Connecteur(i + 1);
                ordreAffiche.Add(etapes[i]?.node);
            }

            if (ecarts > 0)
                MajPanneau(Lib("un seul voyant"),
                    Lib("La filière s’écarte de son profil"),
                    // Mots de l'atelier (4b, 02374169) : la note de maquette (« le serveur dit… du domaine ») parlait au juge ; le
                    // panneau parle au joueur.
                    Lib("on vous dit oui ou non : jamais de combien, ni pourquoi. C’est le seul signal d’alerte de la filière — "
                        + "et il ne se mesure pas."));
            else
                MajPanneau(Lib("CE QUE LA CHAÎNE FAIT DE VOTRE ARGENT"),
                    Lib("Elle le lave par paliers, pas d'un coup"),
                    Lib("chaque étape rend l'argent un peu plus propre que la précédente. Seule la "
                        + "DERNIÈRE crédite le portefeuille — tant qu'il n'y a pas de sortie, il n'y a "
                        + "pas d'argent, seulement une file d'attente."));
        }

        /// <summary>Une étape RÉELLE de la chaîne — à ne pas confondre avec `Maillon`, qui dessine
        /// un maillon MANQUANT. Les deux se ressemblent à l'écran et disent le contraire.</summary>
        private void Etape(int rang, LaunderingStageDto e, bool enEcart = false)
        {
            GameObject go = NouveauUI("Etape" + rang, listeRoot);
            AjouterFond(go, DesignTokens.Current.surfaceCard);
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(66f); le.preferredHeight = -1f; le.flexibleHeight = 0f;
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(9f), (int)Px(9f), (int)Px(7f), (int)Px(7f));
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            // ⛔ Le libellé de propreté vient du PRODUCTEUR UNIQUE (`PureteResolvers`, table 48 : `filiere.proprete.*`), jamais
            // d'un `switch` local.
            string bande = PureteResolvers.Libelle(e != null ? e.cleanliness_band : null);
            string rangTexte = Lib("ÉTAPE") + "   " + rang.ToString("00");
            if (e != null && e.terminal) rangTexte += "   ·   " + Lib("LA SORTIE");

            // Cadres 137-141 : chaque étape est d'abord une CUVE, pas seulement trois lignes de texte. Le serveur ne livre
            // aucun volume : le remplissage représente donc exclusivement la BANDE qualitative (1/4…4/4), jamais un montant.
            // Les quatre couleurs sont celles de la référence ratifiée ; hors domaine, une cuve neutre évite d'inventer un rang.
            Cuve(go.transform, e != null ? e.cleanliness_band : null);
            NouveauTexte(go.transform, "Rang", rangTexte, Px(7f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            NouveauTexte(go.transform, "Titre", bande, Px(12f),
                DesignTokens.Current.hudCreme, DesignTokens.Current.hudSerifFont);
            // Cadre 138 : l'étape dont le nœud s'écarte de son profil porte « écart » — un voyant, jamais une mesure.
            if (enEcart)
                NouveauTexte(go.transform, "Ecart", Lib("écart"), Px(8f),
                    DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            // ⚠️ `has_cash` est un DRAPEAU DE PRÉSENCE, jamais un montant — le serveur ne projette
            // pas les centimes ici. On écrit donc ce qu'on sait, et pas un chiffre inventé.
            NouveauTexte(go.transform, "Texte",
                e != null && e.has_cash ? Lib("de l'argent attend à cette étape")
                                        : Lib("rien n'attend à cette étape"),
                Px(8f), DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
        }

        /// <summary>La jauge qualitative d'une étape. Les quarts codent uniquement le membre de bande servi ; ils ne prétendent
        /// jamais représenter les centimes présents, une durée ou un pourcentage brut (R2.2).</summary>
        private void Cuve(Transform parent, string bande)
        {
            int niveau;
            Color couleur;
            switch (bande)
            {
                case "DIRTY":        niveau = 1; couleur = new Color32(0xDA, 0x4F, 0x45, 0xFF); break;
                case "PARTIAL":      niveau = 2; couleur = new Color32(0xDA, 0x88, 0x37, 0xFF); break;
                case "MOSTLY_CLEAN": niveau = 3; couleur = new Color32(0xCF, 0xAD, 0x5E, 0xFF); break;
                case "CLEAN":        niveau = 4; couleur = new Color32(0x6B, 0x9A, 0x5D, 0xFF); break;
                default:              niveau = 0; couleur = DesignTokens.Current.onSurfaceMuted; break;
            }

            GameObject cuve = NouveauUI("Cuve", parent);
            AjouterFond(cuve, DesignTokens.Current.surfaceRaised);
            LayoutElement le = cuve.AddComponent<LayoutElement>();
            le.minHeight = Px(12f); le.preferredHeight = Px(12f); le.flexibleHeight = 0f;
            HorizontalLayoutGroup h = cuve.AddComponent<HorizontalLayoutGroup>();
            int bord = Mathf.Max(1, (int)PxTrait(2f));
            h.padding = new RectOffset(bord, bord, bord, bord);
            h.spacing = 0f;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true; h.childForceExpandHeight = true;

            GameObject plein = NouveauUI("Niveau", cuve.transform);
            AjouterFond(plein, couleur);
            LayoutElement lp = plein.AddComponent<LayoutElement>();
            lp.flexibleWidth = niveau;

            GameObject vide = NouveauUI("Reste", cuve.transform);
            AjouterFond(vide, DesignTokens.Current.surfaceBase);
            LayoutElement lv = vide.AddComponent<LayoutElement>();
            lv.flexibleWidth = 4 - niveau;
            if (niveau == 4) vide.SetActive(false);
        }

        /// <summary>Le tuyau entre deux cuves : pur dessin de chaîne, sans donnée ni action implicite.</summary>
        private void Connecteur(int apresRang)
        {
            GameObject ligne = NouveauUI("Connecteur" + apresRang, listeRoot);
            LayoutElement le = ligne.AddComponent<LayoutElement>();
            le.minHeight = Px(6f); le.preferredHeight = Px(6f); le.flexibleHeight = 0f;
            HorizontalLayoutGroup h = ligne.AddComponent<HorizontalLayoutGroup>();
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = true;
            GameObject gauche = NouveauUI("MargeGauche", ligne.transform);
            LayoutElement lg = gauche.AddComponent<LayoutElement>();
            lg.flexibleWidth = 1f;
            GameObject tuyau = NouveauUI("Tuyau", ligne.transform);
            AjouterFond(tuyau, DesignTokens.Current.surfaceRaised);
            LayoutElement lt = tuyau.AddComponent<LayoutElement>();
            lt.minWidth = PxTrait(2f); lt.preferredWidth = PxTrait(2f); lt.flexibleWidth = 0f;
            GameObject droite = NouveauUI("MargeDroite", ligne.transform);
            LayoutElement ld = droite.AddComponent<LayoutElement>();
            ld.flexibleWidth = 1f;
        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            ViderListe();
            sousTitre.text = Lib("LA FILIÈRE N'A PAS RÉPONDU");
            MajCompteur(0, 0, Lib("ÉTAPES"));
            MajCompteur(1, 0, Lib("PROPRE AU BOUT"));
            MajCompteur(2, 0, Lib("ÉCARTS"));
            MajPanneau(Lib("CE QU'ON SAIT VRAIMENT"), Lib("Pas de réponse"),
                Lib("on n'a pas eu de réponse. Ce n'est pas « la filière est vide » : c'est « on "
                    + "ne sait pas où elle en est »."));
        }

        /// <summary>Le repli « ce joueur n'a aucun nœud » — cadre 142 de la maquette.
        ///
        /// ⛔⛔ CE BLOC PORTAIT UN DIAGNOSTIC QUI EST FAUX DEPUIS LE 2026-08-31, ET IL LE PORTAIT
        /// AVEC UN NUMÉRO DE DETTE. Il déclarait la chaîne rompue au premier maillon, faute d'une
        /// route amont qui donne un identifiant de nœud, et renvoyait à une entrée d'inventaire
        /// pour l'attester. Les trois moitiés de cet énoncé sont tombées à la mesure :
        ///
        ///  (1) LA ROUTE AMONT EXISTE, et elle est appelée dix lignes plus haut dans ce fichier :
        ///      `GetLaunderingNodes(bearer, …)` — signature à jeton SEUL, aucun identifiant requis
        ///      (`LaunderingClient.cs:45`). Le contrôleur en tire `nodes[0].node`. L'obstacle
        ///      décrit n'a jamais existé dans le code qui le décrivait.
        ///  (2) LE COMPTE DE DÉMO EST SERVI. Corps capturé dans le dossier de juge de cet écran —
        ///      `Tools/juge-visuel/screen_c2/corps-reels/GET_operational_laundering.json`, back
        ///      `6ff684db`, 2026-09-04 : **statut 200, QUATRE nœuds**, `PARTIAL` → `MOSTLY_CLEAN`
        ///      → `CLEAN` → `CLEAN` terminal. Ce repli n'est donc PAS l'état nominal de l'écran ;
        ///      c'est le cas d'un joueur sans planque, et il le reste, légitimement.
        ///  (3) LE NUMÉRO DE DETTE CITÉ DÉSIGNE UN AUTRE SUJET — l'entrée existe, elle est
        ///      ouverte, et elle parle du bundle i18n servi par le VPS. *Une dette citée ressemble
        ///      à une dette inscrite, et une dette inscrite SOUS UN AUTRE SUJET ressemble encore
        ///      mieux à une preuve* : le lecteur qui vérifie trouve une entrée réelle et s'arrête.
        ///      Le maillon manquant, lui, a été refermé par le lot planque le 2026-08-31 —
        ///      `safehouses` a un écrivain de production via le welcome grant.
        ///
        /// ★ Ce que ce bloc illustre pour la suite : *une seule mesure prise dans le mauvais monde*
        ///   — ici un compte FRAIS, interrogé le 2026-09-03 — *a produit un DTO faux, un diagnostic
        ///   faux et un écran inachevé*, et chacun des trois se citait pour justifier les deux
        ///   autres. Le correctif du 2026-09-04 a rempli le rendu nominal et n'a pas rouvert ce
        ///   commentaire-ci : *le texte qu'un correctif aurait dû rouvrir et n'a pas rouvert est
        ///   exactement là où le défaut survit.*
        ///
        /// ⚠️ CE QUI RESTE VRAI, et ne doit pas être perdu dans la rectification : on ne fabrique
        /// pas d'identifiant pour « voir quelque chose ». Un joueur sans nœud voit ce repli, qui
        /// nomme le maillon qui lui manque — pas une filière qui n'est pas la sienne.
        /// ⚠️ NON VÉRIFIÉ ICI : la maquette porte un décompte de maillons cassés et un tampon
        /// d'action désactivé, tous deux écrits quand la chaîne l'était. Savoir s'ils sont encore
        /// justes est une question de DESSIN, pas de code — elle est remontée à l'atelier, et cet
        /// écran ne se corrige pas vers une maquette dont la prémisse a bougé.</summary>
        private void RendreAucunNoeud()
        {
            ViderListe();
            sousTitre.text = Lib("AUCUN NŒUD POUR VOUS");
            MajCompteur(0, 0, Lib("ÉTAPES"));
            MajCompteur(1, 0, Lib("PROPRE AU BOUT"));
            MajCompteur(2, 0, Lib("ÉCARTS"));

            Maillon("1", Lib("Obtenir une planque"),
                Lib("le premier maillon : sans elle, rien n'entre dans la filière — et rien ne se "
                    + "ramasse chez les dealers non plus."));
            Maillon("2", Lib("Dire combien il y a dans la filière"),
                Lib("on ne vous dira que si c'est propre : ni combien, ni depuis quand, ni à quel prix. C'est voulu."));

            MajPanneau(Lib("CE QUE LA FILIÈRE NE DIT PAS"),
                Lib("Vous n'avez encore aucun nœud"),
                Lib("ce n'est pas une panne, c'est un état : il n'y a rien à montrer tant qu'il n'y a "
                    + "rien de monté. Il faut une planque pour que la filière commence quelque part."));
        }

        /// <summary>Un maillon manquant — le patron du cadre 142.</summary>
        private void Maillon(string rang, string titre, string explication)
        {
            GameObject go = NouveauUI("Maillon" + rang, listeRoot);
            AjouterFond(go, DesignTokens.Current.surfaceCard);
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(58f); le.preferredHeight = -1f; le.flexibleHeight = 0f;
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(9f), (int)Px(9f), (int)Px(7f), (int)Px(7f));
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            NouveauTexte(go.transform, "Rang", Lib("MAILLON MANQUANT") + "   " + rang, Px(7f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            NouveauTexte(go.transform, "Titre", titre, Px(12f),
                DesignTokens.Current.hudCreme, DesignTokens.Current.hudSerifFont);
            NouveauTexte(go.transform, "Texte", explication, Px(8f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
        }

        /// <summary>L'état AVANT tout chargement — le troisième, celui qu'on oublie (leçon ㊳).</summary>
        private void RendreEtatInitial()
        {
            sousTitre.text = Lib("EN ATTENTE");
            MajCompteur(0, 0, Lib("ÉTAPES"));
            MajCompteur(1, 0, Lib("PROPRE AU BOUT"));
            MajCompteur(2, 0, Lib("ÉCARTS"));
            MajPanneau(Lib("CE QU'ON SAIT POUR L'INSTANT"),
                Lib("La filière n'a pas encore été interrogée"),
                Lib("ce n'est ni « elle est vide » ni « elle ne répond pas », c'est « pas encore »."));
        }

        private void ViderListe()
        {
            if (listeRoot == null) return;
            for (int i = listeRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(listeRoot.GetChild(i).gameObject);
        }

        private void MajCompteur(int i, int valeur, string libelle)
        {
            if (compteurNombre[i] == null) return;
            compteurNombre[i].text = valeur < 100 ? valeur.ToString("00") : valeur.ToString();
            compteurLibelle[i].text = libelle;
        }

        private void MajPanneau(string sur, string titre, string texte)
        {
            if (pannSur == null) return;
            pannSur.text = sur; pannTitre.text = titre; pannTexte.text = texte;
        }

        private RectTransform listeRoot;
        private TextMeshProUGUI sousTitre;
        private readonly TextMeshProUGUI[] compteurNombre = new TextMeshProUGUI[3];
        private readonly TextMeshProUGUI[] compteurLibelle = new TextMeshProUGUI[3];
        private TextMeshProUGUI pannSur, pannTitre, pannTexte;

        /// <summary>Item 0.6 — les littéraux statiques de ㊵ passent par `filiere.bloc.<slug>`.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("filiere", "bloc", litteral);

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        private void BuildLayout()
        {
            Canvas canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                GameObject go = new GameObject("Canvas",
                    typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                canvas = go.GetComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                CanvasScaler sc = go.GetComponent<CanvasScaler>();
                sc.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                sc.referenceResolution = new Vector2(1280, 720);
            }
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` — voir `SetMountParent`. Monté dans le shell,
            // `transform` EST déjà l'enfant de `ContentSlot` que le shell gouverne. Hors shell
            // (test isolé), l'hôte n'est sous aucun canvas : on retombe sur le canvas découvert.
            Transform root = mountParent != null ? transform : canvas.transform;

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()`/`PxTrait()` (un conteneur plus étroit fausserait
            // TOUTE la mise à l'échelle par un facteur muet).
            GameObject racine = NouveauUI("FiliereRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);

            VerticalLayoutGroup pile = racine.AddComponent<VerticalLayoutGroup>();
            pile.padding = new RectOffset(
                (int)Px(13f), (int)Px(13f),
                (int)(Px(10f) + MafiaCleanCity.Shell.ShellChrome.TopInsetPx),
                (int)(Px(10f) + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx));
            pile.spacing = Px(9f);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            // L'enseigne
            GameObject ens = NouveauUI("Enseigne", racine.transform);
            AjouterFond(ens, DesignTokens.Current.surfaceCard);
            var ve = ens.AddComponent<VerticalLayoutGroup>();
            ve.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(7f), (int)Px(7f));
            ve.childControlWidth = true; ve.childControlHeight = true;
            ve.childForceExpandWidth = true; ve.childForceExpandHeight = false;
            TextMeshProUGUI titre = NouveauTexte(ens.transform, "Titre", Lib("La filière"),
                Px(19f), DesignTokens.Current.hudMoneyGold, DesignTokens.Current.hudSerifFont);
            titre.alignment = TextAlignmentOptions.Center;
            titre.characterSpacing = 14f;
            sousTitre = NouveauTexte(ens.transform, "SousTitre", "", Px(7.5f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            sousTitre.alignment = TextAlignmentOptions.Center;
            sousTitre.characterSpacing = 18f;

            // Les trois compteurs
            GameObject bande = NouveauUI("Compteurs", racine.transform);
            // ⛔ HAUTEUR DONNÉE À LA BANDE — omise à la première écriture, et la capture l'a
            // montrée tout de suite : les trois compteurs s'étiraient sur 600 px. Leur
            // `HorizontalLayoutGroup` a `childForceExpandHeight`, donc sans hauteur propre la
            // bande prend tout ce que la pile lui laisse.
            // ★ ㊳ portait déjà cette ligne ; je ne l'ai pas recopiée. Un patron qu'on suit de
            //   mémoire perd une ligne à chaque copie — c'est l'argument pour un producteur, et
            //   ici je n'en ai pas fait un : les deux écrans dupliquent leurs primitives par
            //   convention du dépôt.
            var leBande = bande.AddComponent<LayoutElement>();
            leBande.minHeight = Px(44f); leBande.preferredHeight = Px(44f); leBande.flexibleHeight = 0f;
            var hb = bande.AddComponent<HorizontalLayoutGroup>();
            hb.spacing = Px(6f);
            hb.childControlWidth = true; hb.childControlHeight = true;
            hb.childForceExpandWidth = true; hb.childForceExpandHeight = true;
            for (int i = 0; i < 3; i++)
            {
                GameObject c = NouveauUI("Compteur" + i, bande.transform);
                AjouterFond(c, DesignTokens.Current.surfaceCard);
                LayoutElement largeurEgale = c.AddComponent<LayoutElement>();
                largeurEgale.minWidth = 0f;
                largeurEgale.preferredWidth = 0f;
                largeurEgale.flexibleWidth = 1f;
                var vc = c.AddComponent<VerticalLayoutGroup>();
                vc.padding = new RectOffset((int)Px(4f), (int)Px(4f), (int)Px(5f), (int)Px(5f));
                vc.childControlWidth = true; vc.childControlHeight = true;
                vc.childForceExpandWidth = true; vc.childForceExpandHeight = false;
                compteurNombre[i] = NouveauTexte(c.transform, "Nombre", "00", Px(15f),
                    DesignTokens.Current.hudGaugeArcCold, DesignTokens.Current.hudSerifFont);
                compteurNombre[i].alignment = TextAlignmentOptions.Center;
                compteurLibelle[i] = NouveauTexte(c.transform, "Libelle", "", Px(6.5f),
                    DesignTokens.Current.onSurfaceSecondary, DesignTokens.Current.primaryFont);
                compteurLibelle[i].alignment = TextAlignmentOptions.Center;
                compteurLibelle[i].characterSpacing = 16f;
            }

            // Le cadre de la liste — CADRE borné (min 0, masqué) / CONTENU libre.
            // ⚠️ Structure reprise de ㊳ où elle a été mesurée : mettre la pile sur le CADRE fait
            // de sa hauteur minimale la somme de ses lignes, tout retombe aux minimums et déborde.
            GameObject cadre = NouveauUI("Liste", racine.transform);
            var lec = cadre.AddComponent<LayoutElement>();
            lec.minHeight = 0f; lec.preferredHeight = 0f; lec.flexibleHeight = 1f;
            cadre.AddComponent<RectMask2D>();
            GameObject contenu = NouveauUI("Contenu", cadre.transform);
            var rtc = (RectTransform)contenu.transform;
            rtc.anchorMin = new Vector2(0f, 1f); rtc.anchorMax = new Vector2(1f, 1f);
            rtc.pivot = new Vector2(0.5f, 1f);
            rtc.offsetMin = Vector2.zero; rtc.offsetMax = Vector2.zero;
            var vco = contenu.AddComponent<VerticalLayoutGroup>();
            vco.spacing = Px(5f);
            vco.childControlWidth = true; vco.childControlHeight = true;
            vco.childForceExpandWidth = true; vco.childForceExpandHeight = false;
            vco.childAlignment = TextAnchor.UpperCenter;
            var fit = contenu.AddComponent<ContentSizeFitter>();
            fit.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            listeRoot = rtc;

            // Le panneau
            GameObject pan = NouveauUI("Panneau", racine.transform);
            AjouterFond(pan, DesignTokens.Current.surfaceCard);
            var lep = pan.AddComponent<LayoutElement>();
            lep.minHeight = Px(92f); lep.preferredHeight = -1f; lep.flexibleHeight = 0f;
            var vp = pan.AddComponent<VerticalLayoutGroup>();
            vp.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(9f), (int)Px(9f));
            vp.spacing = Px(3f);
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            pannSur = NouveauTexte(pan.transform, "SurTitre", "", Px(7.5f),
                DesignTokens.Current.onSurfaceSecondary, DesignTokens.Current.primaryFont);
            pannTitre = NouveauTexte(pan.transform, "Titre", "", Px(13f),
                DesignTokens.Current.hudCreme, DesignTokens.Current.hudSerifFont);
            pannTexte = NouveauTexte(pan.transform, "Texte", "", Px(9f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);

            RendreEtatInitial();
            // MÉTIER ICI — le reste de la mise en page (enseigne, blocs, listes…) se construit
            // ici, depuis la maquette. `ConstruireCerne`/`ConstruireEnseigne`/… de ㊲ montrent le
            // patron : un bloc = une méthode `Construire<Nom>(Transform parent)`.
        }

        // ═══ Primitives — dupliquées par convention (aucun fichier du dépôt ne les partage,
        // mesuré sur `main` le 2026-09-02) ═════════════════════════════════════════════════════

        private static GameObject NouveauUI(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>⛔ TOUTE Image passe par ici. `AddComponent&lt;T&gt;()` à l'exécution
        /// n'honore PAS le `[RequireComponent(CanvasRenderer)]` d'une classe de base — sans
        /// `CanvasRenderer`, un `Graphic` ne dessine RIEN, sans la moindre erreur console
        /// (mesuré sur ce dépôt : `VerticalGradientImage`, deux panneaux jamais visibles).
        /// Et un `Image` standard `UnityEngine.UI.Image` (utilisée ici) EST déjà `MaskableGraphic`
        /// — elle passe donc sous un `Mask` parent sans rien de plus à faire ; seul un `Graphic`
        /// personnalisé dérivé directement de `Graphic` (pas `MaskableGraphic`) aurait besoin
        /// d'un correctif de base en plus de ce `CanvasRenderer` explicite.</summary>
        private static Image AjouterImage(GameObject go)
        {
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            return go.AddComponent<Image>();
        }

        private static Image AjouterFond(GameObject go, Color couleur)
        {
            Image img = AjouterImage(go);
            img.color = couleur;
            img.raycastTarget = false;
            return img;
        }

        private static TextMeshProUGUI NouveauTexte(Transform parent, string nom, string texte,
                                                     float corpsPx, Color couleur, TMP_FontAsset police)
        {
            GameObject go = NouveauUI(nom, parent);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.text = texte;
            t.fontSize = corpsPx;   // un corps de texte à 0 est un défaut de rendu
            t.color = couleur;
            t.raycastTarget = false;
            return t;
        }

        private static void Etirer(RectTransform rt, float marge = 0f)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(marge, marge);
            rt.offsetMax = new Vector2(-marge, -marge);
        }
    }

    /// <summary>screen_c2 — les correspondances « valeur du domaine → apparence », chacune en
    /// FONCTION NOMMÉE prenant la valeur du domaine (patron `HeatBucketResolver.SeverityColor` —
    /// jamais un tableau positionnel ni une chaîne de ternaires : mesuré sur ce dépôt, un
    /// balayage anti-régression écrit pour traquer ces correspondances rend ZÉRO sur un fichier
    /// qui les porte par l'ordre d'un tableau — la garde ne peut voir sa cible qu'APRÈS ce
    /// passage en fonction nommée).
    ///
    /// // MÉTIER ICI — `EtatDomaine` est un PLACEHOLDER : remplacer par l'enum réel du domaine
    /// (ex. `Severity`, `Posture`…) une fois le corps back mesuré, PUIS écrire le switch
    /// EXHAUSTIF sans `default` silencieux (un `default: throw` rend une 5ᵉ valeur BRUYANTE
    /// plutôt que collisionner avec un repli connu — patron `HeatBucketResolver`, note M2 :
    /// un `switch` STATEMENT C# sans `default` est une erreur de compilation CS0161, donc
    /// "exhaustif sans default" n'existe PAS ici — le détecteur d'un membre neuf est un TEST sur
    /// `Enum.GetValues(typeof(EtatDomaine))`, jamais le compilateur).</summary>
    public static class FiliereResolvers
    {
        public enum EtatDomaine
        {
            // MÉTIER ICI — remplacer par les valeurs RÉELLES du domaine.
            Inconnu = 0,
        }

        public static Color CouleurPour(EtatDomaine etat)
        {
            switch (etat)
            {
                case EtatDomaine.Inconnu: return DesignTokens.Current.onSurfaceMuted;
                default: throw new System.ArgumentOutOfRangeException(nameof(etat), etat,
                    "FiliereResolvers.CouleurPour : membre de EtatDomaine non résolu.");
            }
        }
    }
}
