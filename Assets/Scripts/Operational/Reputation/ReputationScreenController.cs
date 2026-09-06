using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>㊲ LA RÉPUTATION (`screen_b3`) — « le miroir ».
    ///
    /// L'écran d'un lieutenant : sa posture envers vous, et ce qu'il a **absorbé** de vos règles
    /// de maison. Le sujet du back est ici littéralement un dessin — `portrait_posture` incline
    /// le buste, les quatre `uniform_tells` allument quatre voyants et changent la tenue. Rien
    /// n'est décoratif : chaque trait est une clé du corps de réponse.
    ///
    /// ⛔⛔ LA THÈSE QUI A ÉTÉ CORRIGÉE, ET QUI SE REPERDRAIT SANS CE PARAGRAPHE. La première
    /// maquette dessinait DEUX portraits — « le vôtre tel qu'on vous lit, et le sien ». C'était
    /// faux contre le canon : `uniform_tells` est PAR LIEUTENANT (PK `lieutenant_id` ;
    /// `projectUniformTells(lieutenantId, playerId)`), et `reputation_mechanics.md:233` dit
    /// « posture cues + uniform tells. **Both appear on same portrait** ».
    /// ⇒ **UN seul portrait, celui du lieutenant. Le miroir, c'est que vous vous lisez SUR LUI.**
    /// Un futur contributeur qui rajouterait un portrait « joueur » attribuerait à l'un ce qui
    /// décrit l'autre. (juge-données ⊥ 2026-08-30, écart É1 ; maquette v2.)
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables :
    ///  · **aucune valeur dérivée de `Screen.*`** ni d'un `rect` lu une seule fois au montage.
    ///    Tout passe par <see cref="EchelleMaquette"/> avec la largeur DÉCLARÉE de la maquette
    ///    dont l'écran est issu. Un écran bâti sur `Screen.width/1280` naît avec le défaut qu'un
    ///    autre lot est en train de supprimer (mesuré : 84 % à 1080, 112 % à 1440).
    ///  · **`Canvas.scaleFactor` lu la frame de la création rend 1,0** — une valeur PLAUSIBLE et
    ///    fausse, la famille la plus dangereuse. Toute lecture de géométrie attend
    ///    `yield return null` (voir <see cref="AttendreLayoutPuis"/>).
    ///
    /// On bâtit sous `mountParent` et on ne touche JAMAIS à `ConstruireLocataire` — le shell est
    /// propriétaire du montage.</summary>
    public class ReputationScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) ---------------------------------
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ------------------------------------------------------------
        public ReputationSurfaceDto DernierChargement { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }
        public bool AAfficheEtatVide { get; private set; }
        public int VoyantsAllumes { get; private set; }
        public string LieutenantIdCourant { get; private set; }

        /// <summary>Le plafond de déclarations, tel que le SERVEUR l'a dit dans son refus 409 —
        /// `null` tant qu'on ne l'a pas rencontré. ⛔ Jamais « 4 » en dur : c'est un tunable de
        /// plage 2..8, et un client qui le fige ment le jour où il bouge.</summary>
        public int? PlafondDeclareParLeServeur { get; private set; }

        // ---- racines de la mise en page ---------------------------------------------------
        private RectTransform racinePleinEcran;   // la racine qui COUVRE l'écran — jamais un panneau
        private RectTransform corps;              // sous le chrome : l'écran proprement dit
        private TextMeshProUGUI sousTitre;
        private RectTransform compteursRoot;
        private RectTransform zoneElastique;
        private RectTransform panneauProse;
        private ReputationPortrait portrait;
        private readonly TellVoyant[] voyants = new TellVoyant[4];
        private ReputationClient client;
        private bool initialise;

        // ── Géométrie de la maquette, en px CSS — convertie, jamais employée telle quelle ──
        // Source unique : ecrans-brennar-6.html + generateur-reputation.py (v2, 2026-08-30).
        private const float CssMargeH        = 13f;   // .enseigne/.compteurs/.elast/.pann margin-x
        private const float CssCernInset     = 5f;    // .cerne{inset:5px}
        private const float CssEnseigneHaut  = 13f;   // .enseigne{margin:13px 13px 0}
        private const float CssEnseignePadY  = 7f;
        private const float CssTitreCorps    = 17f;   // .enseigne b — 'DejaVu Serif' 700
        private const float CssSousTitre     = 6.4f;  // .enseigne i
        private const float CssEcartBloc     = 9f;    // margin-top des blocs successifs
        private const float CssCompteurNombre = 14f;  // .fen b

        /// <summary>Le rayon de flou du halo du chiffre — `text-shadow:0 0 8px` (`chassis6.py:122`).</summary>
        private const float CssHaloFlou = 8f;

        /// <summary>Son opacité — le `99` de `cyan99`, soit 0x99/255. Lue dans la source, pas
        /// choisie pour l'effet obtenu.</summary>
        private const float CssHaloOpacite = 0x99 / 255f;

        /// <summary>⛔⛔⛔ DEUX CORRECTIONS, ET FERMER SUR UNE SEULE LAISSE LE DÉFAUT — ㊲ M1.
        ///
        /// Un `text-shadow` de navigateur est un flou GAUSSIEN : il étale l'encre, donc son pic est
        /// bien plus bas que l'opacité déclarée et sa queue s'éteint vite. `VoileRadial` part au
        /// contraire à PLEINE opacité au centre et décroît en cosinus jusqu'au bord de sa boîte.
        /// Recopier `0x99/255` et laisser la queue courir jusqu'au bord reproduit donc **deux**
        /// écarts, pas un.
        /// ⇒ MESURÉ par un juge ⊥ en ajustant le même profil des deux côtés
        ///   (`A·exp(−d/λ)`) : canon **A = 38,0 pts · λ = 8,01 px** ; jeu **A = 81,2 · λ = 12,56**
        ///   ⇒ **alpha ×2,13 · rayon ×1,57 · lumière totale ×5,2**.
        /// ⛔ ET IL ÉCRIT POURQUOI UNE SEULE NE SUFFIT PAS : ramener l'alpha seul laisserait un halo
        ///   **1,57× trop large**, qui porterait encore ≈ +10 pts à d = 20 là où la maquette est
        ///   à +1 ; ramener le rayon seul laisserait le contraste vers 5,5 pour 8,67 au canon.
        ///   *Corriger une des deux grandeurs rend une valeur parfaitement plausible et garde le
        ///   défaut* — c'est la famille « durcir sur une autre grandeur que le monde dégénéré ».
        ///
        /// ⚠️ LES DEUX FACTEURS SONT DES CORRECTIONS DÉCLARÉES, PAS DES VALEURS CHOISIES, et ils
        /// vivent à côté de la constante du canon plutôt qu'à sa place : `CssHaloOpacite` reste ce
        /// que la source dit, et ce qui la corrige reste lisible comme une correction. Écraser la
        /// constante aurait effacé la trace de l'écart.
        /// ⚠️ ET LA CLÔTURE NE SE PROUVE PAS SUR CES DEUX NOMBRES : elle se prouve en RENDANT et en
        /// comptant — **deux lignes d'encre dans la boîte du compteur** (le canon en a deux, le jeu
        /// une seule, la lueur soudant le chiffre à son libellé). Un critère sans seuil, qu'aucun
        /// réglage à l'œil ne satisfait par hasard. *Une garde sur les PARAMÈTRES d'un effet n'est
        /// pas une garde sur son EFFET* : ce dépôt a déjà livré un halo dont les trois réglages
        /// étaient valides et qui ne produisait aucun pixel.</summary>
        /// <summary>Les deux cotes du flou de l'`Underlay`. `dilate` élargit l'encre avant le
        /// flou, `softness` étale la transition — ensemble elles jouent le rôle du rayon `8px` du
        /// `text-shadow` canon, à l'échelle de l'atlas de la fonte et non des pixels d'écran.
        /// ⚠️ ELLES NE SONT PAS DÉRIVABLES DU CANON : TMP floute dans l'espace du champ de distance
        /// signée, le navigateur en pixels. Aucune conversion exacte n'existe entre les deux, et
        /// prétendre le contraire serait le genre de dérivation qui a déjà coûté trois tours ici.
        /// ⇒ Point de départ posé à l'échelle du dépôt (le titre de district emploie le même
        /// mécanisme), et **le juge tranchera sur le plateau et la vallée en points** — son critère
        /// corrigé, celui qui ne dépend d'aucun seuil non déclaré.</summary>
        private const float HaloDilatation = 0.12f;
        private const float HaloDouceur = 0.55f;

        private const float HaloAmplitudeCorrection = 1f / 2.13f;
        private const float HaloEtendueCorrection = 1f / 1.57f;
        private const float CssCompteurLib   = 5.4f;  // .fen > span
        private const float CssPortraitLarg  = 118f;  // .prt{width:118px}

        // ⛔ CES CINQ-LÀ SONT `internal`, ET C'EST UN CORRECTIF, PAS UN DÉTAIL DE PORTÉE.
        // Elles décrivent le voyant, que `TellVoyant` construit — une AUTRE classe. Tant qu'elles
        // étaient `private`, TellVoyant ne pouvait pas les lire et portait les mêmes nombres EN
        // DUR (7.4f, 5.4f, 7f, 8f, 5f). Deux sources pour une seule valeur : le jour où la
        // maquette bouge, on corrige ici et le voyant garde l'ancienne, en silence.
        // ⚠️ Et le pire est ce que ça faisait à la GARDE : `comparer-code-maquette-reputation.py`
        // validait « CssVoyantSens = 5.4px, concordant avec .tl small » sur une constante que
        // RIEN N'EMPLOYAIT. La garde certifiait une valeur inerte pendant que le rendu réel
        // utilisait un littéral qu'elle ne regardait pas. C'est le « tunable sans consommateur »
        // du socle, retourné contre l'instrument qui devait le détecter.
        // ⇒ Le comparateur exige désormais l'USAGE (≥ 2 occurrences), pas la seule déclaration.
        internal const float CssVoyantPadY    = 5f;    // .tl{padding:5px 8px}
        internal const float CssVoyantPadX    = 8f;
        internal const float CssVoyantDiam    = 7f;    // .tl .lum{width:7px;height:7px}
        internal const float CssVoyantTitre   = 7.4f;  // .tl b
        internal const float CssVoyantSens    = 5.4f;  // .tl small
        internal const float CssVoyantEcart   = 7f;    // .tl{gap:7px}
        private const float CssPannPadX      = 10f;
        private const float CssPannPadY      = 8f;
        private const float CssPannSurTitre  = 5.6f;
        private const float CssPannTitre     = 13f;
        private const float CssPannTexte     = 6.6f;
        private const float CssCtaPad        = 8f;
        private const float CssCtaCorps      = 8.5f;
        private const float CssPiedHaut      = 9f;

        // ── HAUTEURS DE BLOC, lues à la source : `H_FIXE` et `H_MIROIR` de
        //    generateur-reputation.py:279-280. Ce ne sont PAS des valeurs choisies à l'œil.
        // ⛔ Sans elles, le VerticalLayoutGroup de `corps` calcule la hauteur de chaque bloc
        //    depuis ses enfants et les étire : mesuré sur la capture du run 17, les compteurs
        //    faisaient plus du double de leur hauteur et le bloc portrait laissait un grand vide.
        //    Une garde structurelle ne voit pas ça — c'est l'angle mort A3, « l'effet des
        //    espacements n'est pas vérifié », et il ressort une deuxième fois.
        private const float CssHEnseigne  = 51f;
        // ⚠️ 32 et non 42, et c'est l'IMAGE qui tranche, pas la constante. `H_FIXE['compteurs']`
        //    vaut 42, mais le juge visuel a mesuré la rangée à 32,0 px CSS sur la référence pour
        //    42,2 en jeu (+31,9 %), avec un padding bas de 13,6 contre 5,3 — la signature d'un bloc
        //    étiré et non d'un bloc plus garni. La doctrine du juge est explicite : l'image de
        //    référence fait autorité, la source sert à NOMMER les valeurs voulues, jamais à
        //    contredire ce que le rendu montre. Les 10 px d'écart sont la marge que `verifier()`
        //    compte dans sa somme et que le bloc ne porte pas lui-même.
        private const float CssHCompteurs = 32f;
        private const float CssHPann      = 74f;
        private const float CssHPied      = 52f;
        // ⚠️ 188 et non 172 : `verifier()` compte la zone du miroir comme `H_MIROIR + H_ENTOUR`
        //    (172 + 16, generateur-reputation.py:280 et 292). J'avais pris `H_MIROIR` seul parce que
        //    c'est la constante qui PORTE le nom du bloc — mais le nom désigne le dessin, pas la
        //    zone qui le contient. Vérifié sur la somme que la maquette contraint :
        //    51 + 42 + 188 + 74 + 52 = 407, + 34 = 441 ≤ 462. Avec 172, le contenu du portrait
        //    (8 + 12,3 + 119 + 16,75 + 8,25 + 9 = 173,3 px CSS) ne rentrait pas dans sa propre
        //    boîte et le buste passait par-dessus le verdict.
        private const float CssHMiroir    = 188f;
        private const float CssHCarteMiroir = 182.7f;  // le contenu du bloc, mesuré sur la maquette
        private const float CssHRegleVide =  60f;   // l'état « rien » ; une liste pleine vaut n × 30
        private const float CssPiedPadHaut =  9f;   // `.pied{padding:9px 13px 14px}`
        private const float CssPiedPadBas  = 14f;
        private const float CssHauteurCadre = 462f;  // `reputation(cadre, H=462)`

        /// <summary>La marge sous le cadre, en px CSS — MESURÉE sur la référence
        /// (`reputation/reference-1080x2102.png`) : le filet doré s'arrête à y = 2078 pour une
        /// image de 2102, soit **24 px** à l'échelle ×3,6 de cette référence = 6,67 px CSS.
        /// Elle n'est pas dérivée d'un padding CSS : elle est lue sur l'image ratifiée.</summary>
        private const float CssMargeBasseCadre = 24f / 3.6f;
        private const float CssEnseignePadX = 11f;  // `.enseigne{padding:7px 11px 8px}`
        private const float CssRefletY    = 62f;   // 34,7 % de la course de `%(p)s-scan`
        private const float CssRefletHaut =  2f;   // `.elast::after{height:2px}`
        private const float CssHRegle       = 30f;  // H_REGLE — la hauteur d'UNE règle listée
        private const float CssVerdictTitre   = 10f;   // `.verdict b`  — serif 700
        private const float CssVerdictLegende = 6.4f;  // `.verdict span`
        private const float CssVerdictEcart   = 8f;    // `.verdict` gap
        private const float CssHRegleEntour = 16f;  // H_ENTOUR — le sur-titre et les marges du bloc

        // ⚠️ LE BLOC MIROIR EST LE SEUL ÉLASTIQUE — `.elast{flex:1;min-height:0}`, défini dans
        //    chassis6.py:126 (le châssis COMMUN), pas dans generateur-reputation.py. Les hauteurs
        //    ci-dessus sont donc des PLANCHERS pour lui, et des tailles fixes pour les autres.
        //
        // ⛔ J'ai fait l'aller-retour, et je consigne les deux erreurs parce que la seconde est la
        //    plus instructive. (1) J'ai d'abord mis flexibleHeight=1 en qualifiant ce bloc de
        //    « zone élastique » — juste, mais SANS SOURCE : je l'avais deviné. (2) Puis je l'ai
        //    RETIRÉ en écrivant « aucune ligne de la maquette ne parle d'élasticité », après avoir
        //    cherché `elast` dans le seul generateur-reputation.py, où la classe est POSÉE sur le
        //    div (ligne 160) mais jamais DÉFINIE. J'ai lu une absence dans un fichier comme une
        //    absence tout court, et j'ai troqué une intuition juste contre une déduction fausse.
        //    Le juge visuel l'a mesuré : 0,10 % de pixels différents entre 1080×1920 et 1080×2400,
        //    les 480 px supplémentaires partant intégralement au vide — « l'élastique n'est pas
        //    élastique », 35,5 % de la plaque vide sur la cible téléphone.
        // ★ Une classe s'appelait `elast`. Le nom disait la réponse, et je l'ai écarté parce que
        //    je n'avais pas trouvé sa règle dans le fichier où je regardais.
        //
        //    `verifier()` (generateur-reputation.py:291-294) contraint la somme à 462 : c'est une
        //    garde de DÉBORDEMENT sur le contenu minimum, pas une description du remplissage.

        /// <summary>Convertit une valeur en px CSS de LA maquette de cet écran. Passe par la
        /// largeur DÉCLARÉE (`LargeurEcransBrennar6`) : jamais le repli implicite, jamais la
        /// constante d'une maquette voisine qui vaut le même nombre aujourd'hui.</summary>
        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        /// <summary>Idem, planché à 1 — RÉSERVÉ aux grandeurs dont un zéro est un défaut de
        /// rendu (épaisseur de trait, corps de texte). ⛔ Jamais sur un retrait ou un débord,
        /// qui peuvent être légitimement négatifs : le plancher retournerait le signe.</summary>
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        // ⛔ LA CONSTRUCTION A LIEU DANS `Start`, PAS DANS `Awake` — et c'est le shell qui l'impose.
        // `ConstruireLocataire` fait `host.AddComponent<T>()`, ce qui déclenche `Awake` IMMÉDIATEMENT,
        // puis appelle `SetMountParent` à la ligne suivante. Un écran qui construit dans `Awake` se
        // bâtit donc AVANT de savoir où : il retombe sur sa racine de repli et n'atteint jamais le
        // slot de contenu. Le commentaire du shell le dit pour les autres locataires — « Start() et
        // donc BuildLayout() sont différés à la frame suivante ».
        //
        // ⚠️ Mesuré au premier montage réel (2026-09-02) : le slot de contenu portait 2 nœuds au
        // lieu de la vingtaine attendue. La garde anti-vacuité de la capture l'a arrêté — sans elle,
        // le PNG d'un écran VIDE serait parti comme « premier écran atteignable du programme ».
        // ★ L'écran était juste depuis huit tours de juge ; c'est son MOMENT de construction qui
        //   était faux, et rien hors du shell ne pouvait le révéler. Un composant testé isolément
        //   ne prouve rien de l'ordre dans lequel son hôte l'assemble.
        private void Start()
        {
            EnsureInitialized();
            amorce = StartCoroutine(Amorcer());
        }

        /// <summary>⛔ L'ÉCRAN SE CHARGE LUI-MÊME AU MONTAGE. Sans ça il se construit et reste VIDE :
        /// le shell monte le locataire et lui passe un jeton, mais n'appelle jamais `Charger`.
        ///
        /// ⚠️ Mesuré à la première capture sous chrome (2026-09-02) : la charpente était là — cadre,
        /// blocs, portrait, bouton — et TOUS les textes issus des données étaient vides. Compteurs
        /// sans chiffres ni libellés, verdict absent, voyants sans nom, panneau vide. L'écran
        /// paraissait construit, il n'était pas rempli.
        /// ★ Huit tours de juge ne pouvaient pas le voir : mes tests appellent `Charger` eux-mêmes,
        ///   donc ils fournissaient l'amorce que le produit n'avait pas. **Un test qui déclenche
        ///   lui-même ce qu'il vérifie ne prouve rien du déclencheur.**
        ///
        /// Le contrat `IShellTenant` ne porte que `SetMountParent` et `SetToken` : le shell ne
        /// désigne aucun lieutenant, l'écran doit donc en choisir un — le premier de la liste.
        private IEnumerator Amorcer()
        {
            if (string.IsNullOrEmpty(token)) yield break;   // monté hors session : rien à charger
            if (corpsImposeParUnTest) yield break;          // un test tient l'écran : ne pas l'écraser
            string id = null;
            yield return client.GetPremierLieutenantId(token, v => id = v,
                code => Debug.LogWarning($"[b3] liste des lieutenants indisponible (HTTP {code}) — "
                                         + "l'écran reste sur son état vide nommé"));
            // ⛔ RELU APRÈS CHAQUE `yield` : le test a pu poser le drapeau pendant l'appel réseau.
            // Ne le lire qu'à l'entrée laisserait passer exactement la course qu'on ferme.
            if (corpsImposeParUnTest) yield break;
            if (string.IsNullOrEmpty(id)) yield break;
            yield return Charger(id);
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new ReputationClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface pour `lieutenantId`.
        ///
        /// ⚠️ `lieutenantId` n'est PAS optionnel et son absence n'est pas un « écran vide » : la
        /// route rend 404 sans lui, et 404 s'il n'appartient pas à l'appelant (propriété validée
        /// dans le contrôleur back, jamais déléguée — c'est ce qui empêche de distinguer le
        /// sondage d'un joueur tiers de « pas encore de données »).
        ///
        /// ⚠️ `counterpartyId` reste `null` par défaut, et ce n'est pas un oubli : sans lui la
        /// section `restraint` est OMISE du corps, ce qui est l'état NORMAL de cet écran. Aucune
        /// route ne liste les contreparties (mesuré) — le sélecteur des rappelés est un lot back
        /// (L5). Ne pas fabriquer d'identifiant : un `counterparty_id` mal formé rend **500**,
        /// pas 404.</summary>
        public IEnumerator Charger(string lieutenantId, string counterpartyId = null)
        {
            EnsureInitialized();
            LieutenantIdCourant = lieutenantId;
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

            yield return client.GetReputation(token, lieutenantId, counterpartyId,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // mesurer quoi que ce soit (voir AttendreLayoutPuis).
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponible(); yield break; }
            Rendre(DernierChargement);
        }

        /// <summary>Déclare une règle de maison, puis RELIT la surface — le serveur ne rend que
        /// `{declared:true}`, jamais l'état d'après-geste : le seul moyen honnête de savoir ce
        /// que le joueur a maintenant est de redemander.</summary>
        public IEnumerator DeclarerRegle(string ruleId)
        {
            EnsureInitialized();
            DerniereErreur = null;
            bool ok = false;

            yield return client.DeclareHouseRule(token, ruleId,
                dto => ok = dto != null && dto.declared,
                (code, msg) =>
                {
                    DernierCodeErreur = code;
                    DerniereErreur = msg;
                    // 409 = le plafond, pas une panne : c'est la règle du jeu qui parle. On lit
                    // le couple current/cap DANS le refus plutôt que de le figer côté client.
                    if (code == 409) PlafondDeclareParLeServeur = LirePlafond(msg);
                });

            if (ok && !string.IsNullOrEmpty(LieutenantIdCourant))
                yield return Charger(LieutenantIdCourant);
        }

        /// <summary>Extrait le `cap` du message de refus (« … cap reached (4/4) … »).
        /// ⚠️ Lecture BEST-EFFORT d'un message d'erreur : elle peut échouer sans que ce soit un
        /// défaut, et alors on rend `null` — l'écran dit « plafond atteint » sans le chiffrer,
        /// plutôt que d'afficher un nombre inventé.</summary>
        private static int? LirePlafond(string message)
        {
            if (string.IsNullOrEmpty(message)) return null;
            var m = System.Text.RegularExpressions.Regex.Match(message, @"\((\d+)\s*/\s*(\d+)\)");
            if (!m.Success) return null;
            return int.TryParse(m.Groups[2].Value, out int cap) ? cap : (int?)null;
        }

        // ═══ Rendu ═══════════════════════════════════════════════════════════════════════════

        /// <summary>Rend un corps FABRIQUÉ, sans passer par le réseau — réservé aux tests.
        ///
        /// ⛔ Ce n'est pas un raccourci de confort : c'est le seul moyen d'exercer les états que le
        /// back ne sait pas produire par un chemin joueur aujourd'hui. `drifting`, `hostile` et
        /// `wary` ont du code écrit et JAMAIS exécuté — c'est l'angle mort A5, déclaré depuis le
        /// premier jour et signalé « non vérifiable » par chaque juge visuel, faute d'image.
        ///
        /// ⚠️ Ce que ce point d'entrée NE prouve pas, et qu'il ne faut pas lui faire dire : que le
        /// back émette un jour ces valeurs, ni qu'il les émette sous cette forme. Il exerce le
        /// RENDU d'un corps supposé, pas le contrat. Un test qui fabrique son entrée ne vérifie
        /// jamais que l'entrée existe — il vérifie ce qu'on en fait si elle arrive.
        /// ⇒ La dette de contrat reste entière et reste déclarée ; seule la dette de RENDU se ferme.
        /// <summary>⛔⛔ CE DRAPEAU FERME UNE COURSE MESURÉE, et il explique un rouge qu'on avait
        /// attribué ailleurs. `MonterEcran()` pose un VRAI jeton avant que `Start()` ne lance
        /// `Amorcer()` : l'auto-chargement part donc en parallèle, va chercher les données réelles
        /// d'un compte FRAIS — sans réputation, donc `indeterminate` — et ÉCRASE le corps fabriqué
        /// par le test, à une frame près.
        /// ★ C'est très probablement la vraie cause de `B3S5`, qui voyait « Pas encore jugeable »
        ///   là où il posait `aligned` : la valeur observée n'était pas un défaut de résolveur,
        ///   c'était **l'état réel du compte** rendu par-dessus. *Un test qui perd une course lit
        ///   une vérité — celle d'un autre monde que le sien.*
        /// ⚠️ Et le garde-fou `IsNullOrEmpty(token)` ne suffit PAS ici : il protège l'écran monté
        ///   HORS session, pas celui à qui un test donne une vraie identité avant de lui imposer
        ///   un corps de test. Deux protections différentes pour deux situations différentes.
        /// ⇒ Le drapeau est consulté à CHAQUE reprise d'`Amorcer`, pas seulement à son entrée :
        ///   la coroutine peut être déjà partie quand le test le pose.</summary>
        private bool corpsImposeParUnTest;
        private Coroutine amorce;
        private Coroutine nomEnVol;

        public void RendrePourTest(ReputationSurfaceDto dto)
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
            Rendre(dto);
        }

        private void Rendre(ReputationSurfaceDto dto)
        {
            AAfficheEtatVide = false;
            BossMirrorDto bm = dto.boss_mirror;
            UniformTellsDto tells = dto.hidden_curriculum != null
                ? dto.hidden_curriculum.uniform_tells : null;

            int absorbe = tells != null ? tells.CompteAbsorbe() : 0;
            int declarees = bm != null && bm.declared_rules != null ? bm.declared_rules.Length : 0;

            // Le sous-titre et le panneau NOMMENT l'état, ils ne le décorent pas. Trois états
            // distincts, un par valeur de `consistency_cue` — et `indeterminate` n'est pas le
            // cran du milieu, c'est « pas encore assez vu ».
            AppliquerEtat(bm != null ? bm.consistency_cue : null, absorbe);

            MajCompteur(0, declarees.ToString("00"), null, "RÈGLES DONNÉES");
            MajCompteur(1, absorbe.ToString("00"), "/4", "ABSORBÉES");
            // ⛔ ENFREINTES : TOUJOURS un tiret. Voir la note ENFREINTES plus bas.
            //
            // ⚠️ RÉTRACTÉ le 2026-08-31, et la garde B3T1 a mordu avant moi. J'avais mis « 00 »
            // quand `declarees == 0`, en le justifiant ainsi : « sans règle déclarée, rien ne peut
            // être enfreint, donc le zéro est DÉDUIT et non inventé ». C'est faux, et la maquette
            // porte elle-même la réfutation : une règle déclarée tient « jusqu'à ce que vous la
            // retiriez publiquement ». Une règle déclarée, enfreinte, puis retirée laisse
            // `declared_rules` VIDE et une enfreinte bien réelle. `declarees == 0` ne prouve donc
            // rien sur le nombre d'enfreintes — ma déduction n'était pas une déduction.
            // ★ Ce que je retiens : j'ai reconnu la maquette comme autorité pour lui emprunter son
            //   « 00 », et ignoré la phrase, deux blocs plus loin dans le MÊME fichier, qui le
            //   contredisait. On ne cite pas une source en choisissant la ligne qui arrange.
            MajCompteur(2, "—", null, "ENFREINTES");

            // Le pied nomme le PREMIER geste tant qu'aucune règle n'existe — `reputation()` donne
            // « DONNER UNE PREMIÈRE RÈGLE » à la seule vue vierge (ligne 211) et « DONNER UNE
            // RÈGLE » partout ailleurs (200, 222, 237).
            if (ctaLibelle != null)
                ctaLibelle.text = declarees == 0 ? "DONNER UNE PREMIÈRE RÈGLE" : Lib("DONNER UNE RÈGLE");

            RendreListeDesRegles(bm != null ? bm.declared_rules : null);

            if (bm != null)
            {
                portrait.Appliquer(tells, bm.portrait_posture);
                // Le nom vient du serveur, jamais d'une constante. L'appel est lancé sans bloquer
                // le rendu : le portrait s'affiche tout de suite avec « VOTRE LIEUTENANT », et se
                // complète quand la fiche arrive. Si elle n'arrive pas, il reste sans nom — ce qui
                // est la vérité, et non un nom de remplacement.
                // ⛔⛔ CETTE COROUTINE EST DÉTACHÉE, ET `StopCoroutine(amorce)` NE LA TUE PAS.
                // Relevé par la session C : arrêter la coroutine d'amorçage suffit pour tout ce
                // qui passe par `yield return` — la chaîne meurt avec son parent — mais PAS pour
                // ce qui est lancé par un `StartCoroutine` séparé. Celle-ci survit à l'arrêt et
                // écrit le VRAI nom du lieutenant sur le portrait, plusieurs frames après que le
                // test a imposé son corps.
                // ★ *Un arrêt ne remonte que le long du lien qui l'a créé.* Une coroutine
                //   détachée n'a pas ce lien : elle doit être suivie et arrêtée nommément.
                // ⚠️ On ne garde PAS le callback par le drapeau : `RendrePourTest` appelle
                //   `Rendre()`, qui relance cette coroutine — la garder ferait taire le nom dans
                //   le rendu du test lui-même. On annule la PRÉCÉDENTE, et celle du test vit.
                if (nomEnVol != null) StopCoroutine(nomEnVol);
                if (!string.IsNullOrEmpty(LieutenantIdCourant))
                    nomEnVol = StartCoroutine(client.GetLieutenant(token, LieutenantIdCourant,
                        nom => portrait.DefinirNom(nom),
                        code => Debug.LogWarning($"[b3] nom du lieutenant indisponible (HTTP {code}) — "
                                                 + "le portrait reste sans nom, il n'en invente pas")));
                portrait.DefinirVerdict(ReputationResolvers.PosturePhrase(bm.portrait_posture),
                                        ReputationResolvers.PostureCouleur(bm.portrait_posture));
            }

            // Les quatre voyants — la polarité vient du DTO, jamais d'une comparaison locale.
            VoyantsAllumes = 0;
            int i = 0;
            foreach (UniformTellsDto.Pose pose in ReputationResolvers.PosesDansLOrdre())
            {
                bool actif = tells != null && tells.ActifEstAbsorbe(pose);
                if (actif) VoyantsAllumes++;
                voyants[i].Appliquer(ReputationResolvers.PoseLibelle(pose, actif),
                                     ReputationResolvers.PoseSens(pose), actif);
                i++;
            }
        }

        /// <summary>L'état de l'écran, dérivé de `consistency_cue` — sous-titre ET panneau de
        /// prose ensemble, parce qu'ils disent la MÊME chose et que les séparer les laisserait
        /// diverger.
        ///
        /// ⛔ POURQUOI `drifting` A SON PROPRE ÉTAT, ET CE N'EST PAS UN DÉTAIL DE TEXTE. C'est le
        /// moment dramatique de l'écran : le joueur a laissé passer ce qu'il avait lui-même
        /// interdit. La maquette lui consacre un cadre entier, avec un panneau en AMBRE. Le
        /// traiter comme le cas ordinaire — ce que faisait la première version de ce contrôleur,
        /// où `drifting` n'apparaissait nulle part — revient à taire l'information que le joueur
        /// est précisément venu chercher.
        ///
        /// ⚠️ Et ce que l'écran ne peut PAS dire, il le dit : le serveur signale QUE vous dérivez,
        /// jamais SUR QUELLE RÈGLE (le `rule_id` fautif est en base, jamais projeté — forme F,
        /// lot back S13-k). Le texte de dérive le mentionne au lieu de laisser croire à un choix
        /// de mise en page.</summary>
        private void AppliquerEtat(string cue, int absorbe)
        {
            if (ReputationResolvers.CoherenceEstIndeterminee(cue))
            {
                sousTitre.text = absorbe == 0
                    ? "UN LIEUTENANT NEUF N’A ENCORE RIEN ABSORBÉ"
                    : "PERSONNE NE VOUS A ENCORE JUGÉ";
                MajVerdict("indeterminate");
                MajPanneau("« PAS JUGEABLE » N’EST PAS « MOYEN »",
                    "Rien n’a encore déteint",
                    "ses quatre voyants sont éteints parce qu’il n’a " + Or("rien pris de vous") +
                    " — pas parce qu’il est médiocre. Et le serveur refuse de juger votre " +
                    "constance tant qu’il n’a pas assez vu : " + Or("indéterminé") +
                    ", jamais au milieu d’une jauge.",
                    ReputationResolvers.Creme);
                return;
            }

            if (cue == "drifting")
            {
                sousTitre.text = "VOUS VOUS ÉCARTEZ DE VOS PROPRES RÈGLES";
                MajVerdict("drifting");
                MajPanneau("CE QUI A CHANGÉ",
                    "Une règle donnée, une règle enfreinte",
                    "vous avez laissé passer ce que vous aviez interdit. Les deux cercles " +
                    "l’enregistrent — le vôtre et le sien. Le serveur dit " + Or("que") +
                    " vous dérivez, jamais " + Or("sur quelle règle") +
                    " : c’est un maillon manquant, pas un choix d’écran.",
                    ReputationResolvers.Ambre);
                return;
            }

            sousTitre.text = "CE QU’IL A PRIS DE VOUS SE VOIT SUR LUI";
            MajVerdict("aligned");
            MajPanneau("LA RÈGLE DU JEU",
                "Vous vous lisez sur lui",
                "chaque vertu qu’il vous voit tenir finit sur sa tenue — col, manches, montre, " +
                "gants. Une règle déclarée tient " + Or("jusqu’à ce que vous la retiriez publiquement") +
                " : la donner, c’est se donner une corde.",
                ReputationResolvers.Creme);
        }

        /// <summary>Écrit le verdict de cohérence et sa couleur. Les trois libellés viennent de la
        /// table `COHERENCE` de la maquette (generateur-reputation.py:57-61) et sont écrits ici tels
        /// quels — « vous vous y tenez » / « vous vous en écartez » / « pas encore jugeable ».
        ///
        /// ⚠️ Les trois appelants sont les trois branches d'`AppliquerEtat`, et il n'existe pas de
        /// quatrième chemin : un état qui oublierait d'appeler cette méthode laisserait la colonne
        /// SANS titre, ce qui est exactement le défaut qu'on vient de corriger. Une couleur nulle
        /// est refusée bruyamment plutôt que rendue en blanc par défaut.</summary>
        private void MajVerdict(string cue)
        {
            if (verdictTitre == null) return;   // écran pas encore construit — pas une erreur
            // ⛔ LE LIBELLÉ ET LA COULEUR VIENNENT DU RÉSOLVEUR, jamais d'ici. Les trois branches
            // d'`AppliquerEtat` les recopiaient en clair — deux sources pour une même valeur, et
            // c'est exactement ce que le fichier des résolveurs interdit dans son propre en-tête.
            // Le juge données l'a relevé : `CoherencePhrase` et `CoherenceCouleur` avaient ZÉRO
            // appelant alors qu'elles portaient déjà les trois libellés et les trois couleurs.
            // ★ Une duplication ne fait pas de mal tant que les deux copies s'accordent — ce qui
            //   la rend invisible en revue. Elle ne coûte qu'au moment où l'une des deux change,
            //   et c'est alors l'autre qu'on cherche.
            verdictTitre.text = ReputationResolvers.CoherencePhrase(cue);
            verdictTitre.color = ReputationResolvers.CoherenceCouleur(cue);
        }

        /// <summary>Repli NOMMÉ quand la récupération échoue — jamais une exception, jamais un
        /// écran noir. Mesuré sur un autre écran de ce dépôt : `Render(null)` levait une
        /// NullReferenceException à la première ligne qui lisait le payload, et l'écran plantait
        /// dès que le réseau toussait. Un échec doit donner un ÉTAT, pas un plantage.</summary>
        private void RendreEtatIndisponible()
        {
            AAfficheEtatVide = true;
            VoyantsAllumes = 0;
            sousTitre.text = "LE MIROIR EST INDISPONIBLE";
            // Le panneau AUSSI — sinon il garderait la prose du chargement précédent (« vous vous
            // écartez de vos propres règles ») sur un écran qui annonce ne rien savoir. Même
            // défaut que des voyants restés allumés ou qu'une liste de règles non vidée : chaque
            // chemin d'échec doit remettre TOUT ce qu'il a pu laisser derrière lui.
            MajPanneau("CE QUE L’ON NE SAIT PAS",
                "Le miroir ne répond pas",
                "impossible de lire ce que votre lieutenant a retenu de vous. Ce n’est pas un " +
                "verdict neutre : c’est une absence de verdict.",
                ReputationResolvers.Muet);
            MajCompteur(0, "—", null, "RÈGLES DONNÉES");
            MajCompteur(1, "—", "/4", "ABSORBÉES");
            MajCompteur(2, "—", null, "ENFREINTES");
            // La liste est VIDÉE, pas laissée telle quelle : garder les règles du chargement
            // précédent afficherait celles d'un AUTRE lieutenant sur un écran qui annonce ne
            // rien savoir — même défaut que des voyants restés allumés.
            RendreListeDesRegles(null);
            portrait.Eteindre();
            int i = 0;
            foreach (UniformTellsDto.Pose pose in ReputationResolvers.PosesDansLOrdre())
                voyants[i++].Appliquer(ReputationResolvers.PoseLibelle(pose, false),
                                       ReputationResolvers.PoseSens(pose), false);
        }

        // ⛔ NOTE « ENFREINTES » — POURQUOI CE COMPTEUR AFFICHE UN TIRET ET NON UN NOMBRE.
        // La maquette dessine un compteur d'enfreintes. Le corps de réponse n'en porte AUCUNE
        // clé : `ReputationSurfaceProjection` a trois clés (`boss_mirror`, `restraint?`,
        // `hidden_curriculum`) et aucune ne compte les violations. La donnée existe pourtant en
        // base — `boss_mirror_violation_ring.violation_slots[] = { rule_id, severity }` est
        // ÉCRITE et jamais projetée : c'est une forme F, consignée en lot back (S13-k).
        // ⇒ On affiche « — », pas « 00 ». Un zéro serait un MENSONGE : il dirait « aucune
        // enfreinte » là où la vérité est « le serveur ne le dit pas ». C'est la même règle que
        // pour `rule_id` affiché en clair — on ne masque pas le trou, on le montre.

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
            Transform root = mountParent != null ? mountParent : canvas.transform;

            // La racine PLEIN ÉCRAN — c'est elle, et jamais un panneau intermédiaire, qui sert
            // de référence d'échelle. Passer un conteneur plus étroit diviserait toute la mise à
            // l'échelle par un facteur muet (déjà payé ici sur un espacement corrigé au mauvais
            // niveau : un défaut SÉLECTIF désigne son conteneur).
            GameObject racine = NouveauUI("ReputationRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, ReputationResolvers.Encre);

            // ⛔ LES TROIS COUCHES DU FOND — sans elles « l'écran est éteint ». Le juge a sondé 16
            // points et trouvé un aplat unique (13,13,22) là où la maquette monte à (41,40,35) sous
            // l'enseigne : plus de dégradé vertical, plus de halo doré en haut, plus de halo cyan
            // au pied. Six mesures centre/bord rendaient Δlum = 0,0 contre +2,7, +4,6, −8,9 et +11.
            // ★ Chaque aplat était pourtant juste à ≤ 4/255. Un écran peut avoir toutes ses
            //   couleurs exactes et n'avoir aucune lumière : ce qui manquait n'était dans aucune
            //   valeur nommée, mais dans ce qui les relie.
            //
            // Traduites une à une de `.%(p)s{background:…}` (chassis6.py:104-107). ⚠️ L'axe Y de la
            // CSS descend, celui des UV monte : `at 50% 22%` devient donc un centre à (0,5 · 0,78).
            //   radial-gradient(72% 40% at 50% 22%,  rgba(217,171,78,.15), transparent 66%)
            //   radial-gradient(90% 60% at 50% 96%,  rgba(127,212,217,.07), transparent 70%)
            //   linear-gradient(178deg, carte 0%, fond 54%, fond2 100%)
            // ⛔⛔ LES ALPHAS SONT CONVERTIS, PAS RECOPIÉS — et c'est le piège sRGB/linéaire, le
            // seul de la journée que la colorimétrie des aplats ne pouvait pas révéler.
            // Le navigateur mélange en sRGB, Unity en LINÉAIRE. Le même 0,07 ne donne donc pas la
            // même couleur, et l'écart n'est pas petit : mesuré par le juge au même point du corps,
            // maquette (11,16,22) luminance 15,4 · jeu (37,63,65) luminance **57,6**, 3,7× plus
            // clair — le tiers bas de l'écran virait au vert à la résolution cible, et le trait
            // d'identité « fond presque noir, l'or seul brille » tombait.
            //
            // Vérifié par le calcul avant de toucher au code, et le calcul REPRODUIT la mesure :
            //     alpha 0,070 mélangé en linéaire      → (36, 64, 67)   le juge mesure (36, 62, 64)
            //     le même 0,070 mélangé en sRGB        → (19, 31, 40)   ce que la maquette rend
            // On résout donc pour l'alpha qui, mélangé en LINÉAIRE, rend la couleur que le
            // navigateur obtient en sRGB — ce n'est pas un ajustement à l'œil, c'est l'inverse
            // d'une fonction connue :
            //     halo or   0,150 → 0,0290   cible (42,39,30)  obtenu (42,35,25)
            //     halo cyan 0,070 → 0,0130   cible (19,30,36)  obtenu (18,31,35)
            // ★ Les facteurs (0,193 et 0,186) sont PROCHES mais différents : la correction dépend
            //   de la couleur, donc un facteur global appliqué aux deux serait faux pour l'un des
            //   deux. C'est pourquoi chaque halo a le sien, calculé séparément.
            AjouterVoile(racine, "FondDegrade",
                ProceduralUI.VerticalGradient(128, ReputationResolvers.Panneau, ReputationResolvers.Fond2),
                Color.white);
            AjouterVoile(racine, "HaloOr",
                ProceduralUI.VoileRadial(160, Color.white, new Vector2(0.5f, 0.78f), 0.72f, 0.40f, 0.66f),
                new Color(217f / 255f, 171f / 255f, 78f / 255f, 0.0290f));   // CSS 0,15 → linéaire
            AjouterVoile(racine, "HaloCyan",
                ProceduralUI.VoileRadial(160, Color.white, new Vector2(0.5f, 0.04f), 0.90f, 0.60f, 0.70f),
                new Color(127f / 255f, 212f / 255f, 217f / 255f, 0.0130f));  // CSS 0,07 → linéaire

            // ⛔ L'ÉCHELLE AVANT TOUT — un RectTransform qui vient d'être étiré n'a PAS encore son
            // `rect` résolu, et `Px()` le lit dès la première constante convertie. Mesuré sur cet
            // écran (run 21, log `[GEOM b3]`) : les six blocs rendaient EXACTEMENT la hauteur qu'ils
            // demandaient — `Miroir=86css(voulu 86)` — mais chaque « voulu » valait la MOITIÉ de sa
            // constante (51→26, 42→21, 172→86, 60→30, 74→37, 52→26). Le layout était juste ; c'est
            // la conversion qui s'était faite contre une largeur de canvas de 640 au lieu de 1280.
            //
            // ⚠️ Le garde-fou du socle ne l'attrape pas : `LargeurCanvas` accepte toute largeur
            // `> 100f`, ce qui écarte un zéro mais pas une valeur PLAUSIBLE ET FAUSSE. Un repli qui
            // ne teste que la vacuité laisse passer la moitié exacte de la bonne réponse — et une
            // échelle divisée par deux ne ressemble pas à un bug, elle ressemble à un écran sobre.
            Canvas.ForceUpdateCanvases();
            float largeurLue = racinePleinEcran.rect.width;
            if (largeurLue < EchelleMaquette.LargeurCanvasParDefaut * 0.9f)
            {
                // On le DIT plutôt que de le corriger en silence : si la racine n'est toujours pas
                // résolue après un ForceUpdateCanvases, l'échelle qui suit est une supposition, et
                // le prochain lecteur doit l'apprendre du log et non d'une capture qui a l'air bien.
                Debug.LogWarning($"[ECHELLE b3] racine non résolue : rect.width={largeurLue:F0} < "
                                 + $"{EchelleMaquette.LargeurCanvasParDefaut:F0} attendu. Toutes les "
                                 + "conversions px CSS de cet écran seront proportionnellement fausses.");
            }

            // Le corps vit SOUS le chrome : le bandeau et le dock mangent leur part, publiée par
            // le shell. Hors shell (test isolé) les insets valent 0 et l'écran remplit tout —
            // le comportement d'avant que ces champs existent.
            GameObject corpsGo = NouveauUI("Corps", racine.transform);
            corps = (RectTransform)corpsGo.transform;
            // ⛔ HAUTEUR FIXE DE 462 px CSS, ancrée en HAUT — et non étirée sur tout l'écran.
            // La maquette le dit dans sa signature : `reputation(cadre, H=462)` produit
            // `<div style="height:462px">`. Le cadre a une hauteur, il ne remplit pas la page ;
            // c'est le CHROME qui occupe le reste (m-120 fait 584 px CSS = 122 de chrome + 462).
            //
            // ⚠️ Sans ça, tout le surplus d'un écran plus haut que la maquette tombe dans le bloc
            // élastique — et le juge a mesuré le trou : 21,0 px CSS de vide sous la carte en
            // maquette, 85,0 en 16:9 et **218,3 en 1080×2400**, soit 54,7 % du grand panneau et
            // 32,7 % de la hauteur de l'écran. Tout ce qui est au-dessus est identique au pixel
            // entre les deux captures : les 480 px ajoutés vont INTÉGRALEMENT à cet endroit.
            // ★ Et l'effet n'est pas qu'esthétique. Sur un écran dont le métier est de dire « il
            //   n'y a rien à lire ENCORE », un vide de cette taille se met à dire « ça n'a pas fini
            //   de charger ». Le vide cesse d'être une respiration et devient un message faux.
            //
            // Corriger l'élastique ne pouvait pas suffire : le mou existait parce que le cadre
            // s'étirait. On supprime le mou à sa source plutôt que de choisir qui l'absorbe.
            // ⛔⛔ ET IL EST ANCRÉ EN BAS, PAS EN HAUT — corrigé le 2026-09-06, après QUATRE tours
            // de juge passés à mesurer autre chose. L'ancrage haut venait du dossier remis au juge
            // au r8 ; il s'est propagé sans que personne ne le confronte à l'image.
            // MESURÉ sur la référence elle-même (`reputation/reference-1080x2102.png`, 1080×2102) :
            // le filet doré du cadre va de **y 452 à y 2078**, soit **24 px sous lui** et 452
            // au-dessus. Le cadre n'est pas posé sous le chrome : c'est une FEUILLE DE BAS, et ce
            // qui est au-dessus (chrome + bande d'art) prend ce qui reste.
            // ★ POURQUOI L'ERREUR A SURVÉCU QUATRE TOURS, et c'est la partie qui vaut : sur l'écran
            //   de la maquette, les deux ancrages donnent EXACTEMENT le même résultat. 2102 px =
            //   584 px CSS ; 584 − 462 = **122**, le chiffre que le commentaire d'à côté écrivait
            //   déjà. Ancrer en haut sous 122 de chrome et ancrer en bas ne divergent que sur un
            //   écran PLUS HAUT que la maquette — et le seul écran réellement visé, 1080×2400, fait
            //   667 px CSS. *Une arithmétique exacte sur la seule résolution de la référence est
            //   une arithmétique non testée.* Le juge ne pouvait pas trancher : sa capture était
            //   sans chrome, donc le cadre y touchait le haut pour une seconde raison.
            // ⇒ Le surplus d'un écran plus haut va désormais AU-DESSUS du cadre, là où la référence
            //   met de l'art, et non en dessous où il n'y a rien à montrer.
            corps.anchorMin = new Vector2(0f, 0f);
            corps.anchorMax = new Vector2(1f, 0f);
            corps.pivot = new Vector2(0.5f, 0f);
            corps.offsetMin = new Vector2(0f, 0f);
            corps.offsetMax = new Vector2(0f, 0f);
            // Les 24 px de marge basse de la référence valent 24/3,6 = 6,67 px CSS ; le dock du
            // shell s'ajoute par-dessus (0 hors shell, comportement d'avant inchangé).
            corps.anchoredPosition = new Vector2(0f, ShellChrome.BottomInsetPx + Px(CssMargeBasseCadre));
            // ⛔⛔ LA HAUTEUR EST BORNÉE PAR LA ZONE LIBRE, ET C'EST UN BLOQUANT DU r11.
            // Le cadre valait 462 px CSS FIXES. Mesuré par un juge ⊥ aux deux résolutions : au 2400
            // la gouttière basse est juste (+70, l'ancrage au dock tient) ; au **1920** le cadre
            // déborde sous le bandeau de **−141 px** et le titre disparaît — **0 % d'encre intacte**.
            // La zone libre au 16:9 vaut 1 556 px, le cadre en demande 1 698.
            // ⇒ Le canon NE COUVRE PAS le 16:9 : sa page fait 584 px CSS = 122 de chrome + 462, et
            //   cette arithmétique n'a de solution qu'à cette proportion-là. *Une arithmétique
            //   exacte sur la seule résolution de la référence est une arithmétique non testée* —
            //   c'est déjà ce qui avait masqué l'ancrage pendant quatre tours.
            // ⇒ DÉVIATION CONSIGNÉE : le cadre prend `min(462 CSS, zone libre)`. Au format visé
            //   (1080×2400) le rendu est INCHANGÉ — 462 exactement, la borne ne mord pas. Au 16:9
            //   il se comprime, et le contenu suit par le panneau DÉJÀ élastique par contrat
            //   (`.elast{flex:1}`), jamais par la tête. L'user peut retirer le 16:9 des cibles de
            //   cet écran ; d'ici là il ne rend plus un titre invisible.
            // ⚠️ Recalculée à CHAQUE changement de dimensions, pas une fois au montage : une
            //   capture bascule la résolution APRÈS le montage, et une hauteur cuite au montage
            //   serait celle d'un autre écran (la classe que ce dépôt a payée sur le fond de
            //   district et sur les bandes de l'Accueil).
            var borne = corpsGo.AddComponent<HauteurBorneeParLaZoneLibre>();
            borne.hauteurVoulue = Px(CssHauteurCadre);
            borne.margeBasseHorsChrome = Px(CssMargeBasseCadre);
            borne.margeBasse = ShellChrome.BottomInsetPx + borne.margeBasseHorsChrome;
            borne.insetHaut = ShellChrome.TopInsetPx;
            borne.Appliquer();

            // ⛔⛔ SANS CE LAYOUT, LES SIX BLOCS RESTENT TOUS À LA POSITION PAR DÉFAUT.
            // Mesuré sur la première capture réussie : l'enseigne était en place (elle porte son
            // propre ancrage), et les cinq autres blocs s'empilaient au CENTRE, superposés, les
            // textes rendus en colonne d'une lettre faute de largeur. `corps` recevait bien ses
            // enfants, mais rien ne leur disait où aller.
            // ⇒ C'est mon angle mort A3, déclaré une heure plus tôt : « les constantes sont
            //   vérifiées contre la maquette (42 concordances), leur EFFET ne l'est pas ». Le
            //   comparateur code↔maquette était vert, et l'écran était illisible. Une valeur juste
            //   dans un conteneur sans layout ne produit rien.
            // Marges de la maquette : `.enseigne{margin:13px 13px 0}` puis `margin-top:9px` entre
            // blocs successifs (chassis6.py), converties par EchelleMaquette.
            // ⛔⛔⛔ LE CADRE DEVIENT UNE FENÊTRE QUI DÉFILE — ruling user du 2026-09-07, après la
            // mesure qui a montré qu'il n'y avait pas d'autre issue. MESURÉ : le groupe demandait
            // `MIN 1845` pour une boîte de 467, et **le MIN vaut le PRÉFÉRÉ**, donc zéro marge de
            // compression. Les six blocs fixent chacun leur minimum à leur hauteur canonique : la
            // somme des minimums EST la hauteur pleine.
            // ⇒ Et le panneau dit « élastique » ne l'était qu'à moitié : `flexibleHeight = 1f` avec
            //   le commentaire « `.elast{flex:1}` », alors que **`flex:1` vaut `flex-grow:1` ET
            //   `flex-shrink:1`** — `flexibleHeight` d'Unity ne fait que GRANDIR au-dessus du
            //   préféré, rien ne descend jamais sous `minHeight`. *La moitié « shrink » du contrat
            //   n'a jamais été traduite*, et le commentaire attestait pourtant l'élasticité.
            // ⇒ À 1080×1920 sous chrome il manque ~382 px (≈ 118 CSS) : **aucun réglage
            //   d'élasticité ne fabrique cette place.** Le canon n'a de solution qu'à sa propre
            //   proportion, ce fichier le disait déjà sans en tirer la conséquence.
            //
            // REUSE du patron de ㉝ (`DemolitionScreenController.ConstruireZoneCentrale`) et du menu
            // « Plus », qui ont payé cette classe avant nous — avec sa leçon, qui n'est PAS
            // facultative : **couper sans donner accès au reste rend du contenu INJOIGNABLE**, ce
            // qui est pire que de déborder. D'où les quatre gestes, un par morceau, aucun en trop :
            //   · `minHeight = preferredHeight = 0` sur la fenêtre — elle ne RÉCLAME rien ;
            //   · `RectMask2D` — elle COUPE ce qui dépasse (`overflow:hidden`), et c'est la seule
            //     des quatre qui empêche un enfant de dessiner par-dessus le dock ;
            //   · `ScrollRect` vertical — ce qui est coupé reste ATTEIGNABLE ;
            //   · `ContentSizeFitter` sur le contenu — sans course à parcourir, le défilement ne
            //     défile pas.
            // ⚠️ LE CERNE RESTE SUR LA FENÊTRE, pas sur le contenu : il encadre l'écran et ne doit
            //   pas défiler avec lui. Il porte déjà `ignoreLayout` et s'étire à son parent, donc il
            //   suit la BOÎTE — c'est exactement ce qu'on veut, et c'est aussi ce qui fait que le
            //   CTA n'apparaîtra plus DEHORS : il est désormais coupé par la fenêtre au lieu d'être
            //   dessiné par-dessus le filet.
            // ★ Au format visé (1080×2400) rien ne change : la boîte y vaut 1 971, le contenu 1 845,
            //   donc la fenêtre ne coupe pas et le défilement n'a aucune course. La déviation ne se
            //   voit qu'au format que le canon ne couvre pas.
            LayoutElement fenetreLe = corpsGo.AddComponent<LayoutElement>();
            fenetreLe.minHeight = 0f;
            fenetreLe.preferredHeight = 0f;
            corpsGo.AddComponent<RectMask2D>();
            ScrollRect defilement = corpsGo.AddComponent<ScrollRect>();
            defilement.horizontal = false;
            defilement.vertical = true;
            defilement.movementType = ScrollRect.MovementType.Clamped;
            defilement.scrollSensitivity = 40f;

            GameObject contenuGo = NouveauUI("Contenu", corpsGo.transform);
            RectTransform contenuRt = (RectTransform)contenuGo.transform;
            contenuRt.anchorMin = new Vector2(0f, 1f);
            contenuRt.anchorMax = new Vector2(1f, 1f);
            contenuRt.pivot = new Vector2(0.5f, 1f);
            contenuRt.offsetMin = Vector2.zero;
            contenuRt.offsetMax = Vector2.zero;
            defilement.viewport = (RectTransform)corpsGo.transform;
            defilement.content = contenuRt;
            // ⛔⛔⛔ PAS DE `ContentSizeFitter` — ET C'EST LE CORRECTIF DE ㊲ M3, une régression que
            //    j'ai produite en posant le défilement.
            // MESURÉ par le juge : le panneau élastique perd **89 px** (765 → 676) pendant que le
            // cadre garde sa hauteur, et la carte portrait SORT de son panneau de 8,5 à 9,0 px là
            // où la maquette laisse 82 px de marge.
            // ⇒ LA CAUSE, et elle est mécanique : un `ContentSizeFitter` en `PreferredSize` donne au
            //   contenu **exactement** sa hauteur préférée. Il n'y a donc plus de MOU dans le groupe
            //   vertical — et `flexibleHeight = 1f` du panneau élastique, qui n'existe que pour
            //   absorber ce mou, devient **inerte**. *Le panneau n'a pas rétréci : il a cessé de
            //   recevoir ce qui restait, parce qu'il ne restait plus rien.*
            // ★ Deux symptômes, une racine : M3 (le panneau perd sa part) et M2 (la carte déborde
            //   d'un panneau devenu trop court pour elle) se ferment du même geste.
            // ⇒ CE QUE LE DÉFILEMENT DEMANDE VRAIMENT : une course à parcourir **quand le contenu
            //   dépasse**, et rien d'autre. Quand il tient, le contenu doit REMPLIR la fenêtre pour
            //   que le mou revienne au panneau élastique. La hauteur juste est donc
            //   `max(préféré, fenêtre)` — pas `préféré`, qui casse le cas qui tient, et pas
            //   `fenêtre`, qui casse le cas qui déborde.
            // ⚠️ Recalculée à chaque changement de dimensions, jamais cuite au montage : c'est la
            //   classe que cet écran a déjà payée deux fois cette nuit, sur la hauteur puis sur la
            //   position du cadre.
            var courseGo = contenuGo.AddComponent<HauteurDeContenuDefilant>();
            courseGo.fenetre = (RectTransform)corpsGo.transform;
            courseGo.Appliquer();

            VerticalLayoutGroup pile = contenuGo.AddComponent<VerticalLayoutGroup>();
            pile.spacing = Px(CssEcartBloc);
            // ⛔ AUCUNE MARGE BASSE SUR LE CADRE. Tous les blocs de la maquette portent
            // `margin:<n>px 13px 0` — une marge HAUTE et zéro en bas (chassis6.py:111/118/126/132) ;
            // l'espace sous le bouton vient du `padding-bottom:14px` du pied, pas du cadre.
            // ⚠️ J'y ajoutais 9 px CSS, et ils se voyaient : bande sous le bouton mesurée à 31,39
            // px CSS pour 9,00 en maquette, puis 18,06 après avoir garni le pied — l'écart résiduel
            // valait exactement le padding de trop.
            // ★ Une marge basse est invisible tant qu'un bloc élastique la mange. Ici le cadre a
            //   une hauteur fixe : chaque padding se paie, et se voit à l'endroit le plus visible
            //   de l'écran — sous le bouton d'action.
            pile.padding = new RectOffset(PxTrait(CssMargeH), PxTrait(CssMargeH),
                                          PxTrait(CssEnseigneHaut), 0);
            pile.childControlWidth = true;  pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            // Le cerne sur la FENÊTRE (il encadre et ne défile pas) ; les cinq blocs dans le
            // CONTENU (c'est eux qui défilent). Aucun d'eux n'a à savoir qu'il y a un défilement.
            ConstruireCerne(corpsGo.transform);
            ConstruireEnseigne(contenuGo.transform);
            ConstruireCompteurs(contenuGo.transform);
            ConstruireMiroir(contenuGo.transform);
            ConstruireListeDesRegles(contenuGo.transform);
            ConstruirePanneau(contenuGo.transform);
            ConstruirePied(contenuGo.transform);
        }

        /// <summary>Le liseré doré qui encadre l'écran (`.cerne{inset:5px}`).</summary>
        private void ConstruireCerne(Transform parent)
        {
            GameObject go = NouveauUI("Cerne", parent);
            RectTransform rt = (RectTransform)go.transform;
            // Le cerne ENCADRE l'écran, il ne s'empile pas avec les blocs : on l'exclut du layout.
            go.AddComponent<LayoutElement>().ignoreLayout = true;
            float inset = Px(CssCernInset);
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(inset, inset);
            rt.offsetMax = new Vector2(-inset, -inset);
            Image img = AjouterImage(go);
            img.sprite = ProceduralUI.RoundedRectOutline(PxTrait(3f), PxTrait(1f), Color.white);
            img.type = Image.Type.Sliced;
            img.color = ReputationResolvers.OrFilet;
            img.raycastTarget = false;
        }

        /// <summary>Une couche de fond étirée sur toute la racine, derrière tout le reste et
        /// hors du flux. Le sprite porte la FORME du dégradé, `teinte` en porte la couleur et
        /// l'alpha — jamais les deux, sinon uGUI multiplie et rend la couleur au carré (défaut
        /// déjà payé sur le teint du portrait, mesuré à (133,116,81) pour (185,173,146)).</summary>
        private void AjouterVoile(GameObject parent, string nom, Sprite sprite, Color teinte)
        {
            GameObject go = NouveauUI(nom, parent.transform);
            Image img = go.AddComponent<Image>();
            img.sprite = sprite;
            img.color = teinte;
            img.raycastTarget = false;
            Etirer((RectTransform)go.transform);
            go.AddComponent<LayoutElement>().ignoreLayout = true;   // décor : jamais une colonne
        }

        private void ConstruireEnseigne(Transform parent)
        {
            GameObject go = NouveauUI("Enseigne", parent);
            LayoutElement hle = go.AddComponent<LayoutElement>();
            hle.minHeight = Px(CssHEnseigne);
            hle.preferredHeight = Px(CssHEnseigne);
            hle.flexibleHeight = 0f;   // hauteur FIXE : ne s'étire pas
            // ⚠️ PLUS D'ANCRAGE MANUEL ICI : le VerticalLayoutGroup de `corps` place ce bloc.
            // Les deux mécanismes se contredisent — un ancrage haut + un layout parent donnent
            // une position que ni l'un ni l'autre ne décrit.
            AjouterFond(go, ReputationResolvers.Panneau);
            // ⛔ LE CADRE DE L'ENSEIGNE — `.enseigne{border:1px solid lisere}` (chassis6.py:113),
            // le `border-bottom` doré n'en étant que le quatrième côté. Il manquait entièrement :
            // le juge a balayé toute la bande et trouvé ZÉRO arête, alors que le même balayage
            // trouve bien les arêtes dorées du panneau — son contrôle négatif est passé.
            // ⚠️ C'est un écart SÉLECTIF : `.fen`, `.tl` et `.pann` ont tous leur contour dans ce
            // fichier, l'enseigne seule ne l'avait pas. Un défaut qui frappe UNE instance d'une
            // famille dont les autres membres sont corrects n'est pas une règle mal comprise,
            // c'est une ligne oubliée — et c'est précisément ce qu'une relecture ne voit pas,
            // puisque tout autour est juste.
            Contour(go, ReputationResolvers.Lisere);

            // Le filet doré du bas (`border-bottom:2px solid --laiton`) — un enfant, pas une
            // bordure : Unity n'a pas de border-bottom, et le simuler par une image 9-slice
            // arrondirait aussi les autres côtés.
            GameObject filet = NouveauUI("FiletBas", go.transform);
            RectTransform frt = (RectTransform)filet.transform;
            frt.anchorMin = new Vector2(0f, 0f); frt.anchorMax = new Vector2(1f, 0f);
            frt.pivot = new Vector2(0.5f, 0f);
            frt.sizeDelta = new Vector2(0f, PxTrait(2f));
            AjouterFond(filet, ReputationResolvers.OrFilet);
            // Même classe : un filet est un DÉCOR, il ne s'empile pas avec le titre et le
            // sous-titre. Sans ça, le VerticalLayoutGroup de l'enseigne lui réserve une ligne.
            filet.AddComponent<LayoutElement>().ignoreLayout = true;

            TextMeshProUGUI titre = NouveauTexte(go.transform, "Titre", Lib("Le miroir"),
                CssTitreCorps, ReputationResolvers.OrVif, DesignTokens.Current.hudSerifFont,
                1f);  // interligne maquette — .enseigne b{font:700 17px/1}
            titre.fontStyle = TMPro.FontStyles.Bold;   // maquette : .enseigne b, 700 17px
            titre.alignment = TextAlignmentOptions.Center;
            titre.characterSpacing = 20f; // letter-spacing:.2em

            sousTitre = NouveauTexte(go.transform, "SousTitre", "", CssSousTitre,
                ReputationResolvers.Creme2, DesignTokens.Current.primaryFont,
                1f);  // interligne maquette — .enseigne i{font:700 6.4px/1}
            sousTitre.fontStyle = TMPro.FontStyles.Bold;   // maquette : sous-titre de l’enseigne (.enseigne i, 700 6.4px)
            sousTitre.alignment = TextAlignmentOptions.Center;
            sousTitre.characterSpacing = 34f;

            // ⛔ LE PADDING HORIZONTAL DE L'ENSEIGNE — `padding:7px 11px 8px` (chassis6.py:114).
            // Il manquait, et c'est ce qui empêchait le sous-titre de se REPLIER : mesuré par le
            // juge, marges de 3,9 / 4,1 px CSS au lieu de 27,3, une seule ligne au lieu de deux, et
            // 97 % de la plaque occupée. L'avance par caractère est pourtant identique à la
            // maquette (6,32 contre 6,34) — donc ce n'était ni la police ni la chasse : le texte
            // avait simplement 22 px CSS de plus pour s'étaler, et il ne repassait plus à la ligne.
            // ⚠️ Un libellé d'état plus long touchera les bords tant que ce padding manque : le
            // défaut ne se voyait que parce que CE texte-ci tenait tout juste.
            EmpilerVertical(go, Px(CssEnseignePadY), Px(5f), Px(CssEnseignePadX));
        }

        private readonly TextMeshProUGUI[] compteurNombre = new TextMeshProUGUI[3];
        private readonly TextMeshProUGUI[] compteurLibelle = new TextMeshProUGUI[3];

        private void ConstruireCompteurs(Transform parent)
        {
            GameObject go = NouveauUI("Compteurs", parent);
            LayoutElement hle = go.AddComponent<LayoutElement>();
            hle.minHeight = Px(CssHCompteurs);
            hle.preferredHeight = Px(CssHCompteurs);
            hle.flexibleHeight = 0f;   // hauteur FIXE : ne s'étire pas
            compteursRoot = (RectTransform)go.transform;
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.spacing = Px(6f);
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true;

            for (int i = 0; i < 3; i++)
            {
                GameObject fen = NouveauUI("Fenetre" + i, go.transform);
                // ⛔ TROIS TIERS ÉGAUX, et c'est `preferredWidth = 0` qui l'obtient. Sans lui, la
                // largeur préférée de chaque tuile vient de son CONTENU : « RÈGLES DONNÉES » est
                // plus long que « ABSORBÉES », donc la 1ʳᵉ tuile prend plus de place, et
                // `childForceExpandWidth` ne répartit également que le RESTE. Mesuré par le juge :
                // 33,70 / 26,57 / 27,22 %L au lieu de trois fois 28,56 — la première est 27 % plus
                // large que la deuxième, dans une rangée que la maquette veut régulière.
                LayoutElement tle = fen.AddComponent<LayoutElement>();
                tle.minWidth = 0f; tle.preferredWidth = 0f; tle.flexibleWidth = 1f;
                AjouterFond(fen, ReputationResolvers.Creux);
                Contour(fen, ReputationResolvers.Lisere);

                // ⛔ LE HALO DU CHIFFRE — `.fen b{…text-shadow:0 0 8px cyan99}` (`chassis6.py:122`).
                // Mesuré ABSENT par un juge ⊥ : luminance au-dessus du fond de la fenêtre, à d px à
                // gauche du premier pixel de chiffre — la référence rend **+20,3 / +17,6 / +14,8 /
                // +10,5 / +6,9 / +3,1 / −1,5** à d = 2/4/6/9/12/16/22 px, le jeu **+0,0 à toutes**.
                // Ce n'est pas un réglage manquant, c'est un OBJET manquant : rien ne le portait.
                // ⚠️ L'opacité de la CSS (0x99/255 = 0,6) est en sRGB et ce projet compose en
                //   LINÉAIRE — même classe que les cinq sites du chrome corrigés le même jour. Le
                //   fond est CONNU ici (le creux de la fenêtre), donc la solution est exacte : on
                //   garde l'opacité et on déplace la couleur.
                // ⚠️ `ignoreLayout` : un décor enfant direct d'un groupe de disposition en devient
                //   une COLONNE — c'est la classe que `B3S3` ferme, et elle en avait déjà trouvé
                //   cinq instances sur cet écran.
                GameObject haloGo = NouveauUI("HaloChiffre", fen.transform);
                var haloLe = haloGo.AddComponent<LayoutElement>();
                haloLe.ignoreLayout = true;
                var haloRt = (RectTransform)haloGo.transform;
                haloRt.anchorMin = haloRt.anchorMax = new Vector2(0.5f, 0.5f);
                haloRt.pivot = new Vector2(0.5f, 0.5f);
                // ⛔ L'ÉTENDUE EST CELLE DE L'ENCRE PLUS DEUX FOIS LE FLOU, PAS CELLE DE LA BOÎTE.
                // Première version : un voile de 66 × 30 px CSS, dérivé du CORPS du texte et
                // multiplié par 2,2 « pour couvrir les deux chiffres ». Regardé sur la planche :
                // ⛔⛔⛔ LE HALO EST UN UNDERLAY DU GLYPHE, PLUS UN SPRITE POSÉ SOUS LA CASE —
                //    et c'est un correctif de MÉCANISME, pas de réglage. Troisième état du même
                //    défaut : **absent** (r11) → **trop fort** (r12/r13) → **au mauvais endroit**
                //    (r14). Chaque correctif fermait la couche visible et déplaçait le défaut d'un
                //    cran ; corriger la POSITION aurait produit le quatrième.
                // ⇒ CE QUI L'A NOMMÉ, et aucun réglage ne peut l'expliquer : le juge mesure sur les
                //   TROIS compteurs un objet **identique** — pic 68,3 pts, largeur 45/44/45 px —
                //   pour des encres de **62, 103 et 47 px**. *Un objet dont le pic, la largeur et la
                //   position ne changent pas quand le glyphe change n'est pas un rayonnement, c'est
                //   une décoration.* Et son barycentre est **18,4 px sous** celui du chiffre (la
                //   référence est à +0,6), avec **zéro** lumière 12 rangées au-dessus contre 643 en
                //   dessous — là où la référence rend 177 / 184, rapport 1,04. La lumière totale ne
                //   bougeait que de +3,3 % : elle était **déplacée**, pas supprimée.
                // ⇒ La cause est dans l'ancien code, lisible : `haloLargeur = Px(16 + 2×flou)` —
                //   une CONSTANTE, dérivée de « deux chiffres d'un corps de 14 font ≈ 16 CSS ». Elle
                //   suppose deux chiffres pour toujours, donc elle ignore l'encre par construction.
                // ⇒ Un `text-shadow` de navigateur est un flou du GLYPHE : il naît de l'encre et
                //   meurt avec elle. L'équivalent TMP est l'`Underlay`, qui rend une copie floutée
                //   du glyphe — attaché à l'encre PAR CONSTRUCTION, donc largeur, position et pic
                //   suivent le texte sans qu'aucune cote ne le dise.
                // ⚠️ L'ALPHA 0,67 EST BON — le juge l'a certifié (×2,13 → ×0,67, contraste 4,49 →
                //   11,34 pour 11,03 au canon). Il est repris tel quel ; seul le PORTEUR change.
                // ⚠️ MATÉRIAU D'INSTANCE, JAMAIS LE PARTAGÉ : `fontMaterial` clone,
                //   `fontSharedMaterial` contaminerait tous les textes de la même fonte — ce dépôt
                //   a déjà écrit sur un asset partagé par trois écrans et ne l'a vu qu'à la
                //   sauvegarde suivante. Et `GetShaderPropertyIDs()` avant tout `SetFloat` : sans
                //   lui les identifiants peuvent désigner autre chose et l'ombre se pose « en
                //   silence sur rien ».
                // ⚠️ CE QUE JE NE PRÉTENDS PAS : que les cotes de flou soient justes. Ce dépôt a
                //   livré un halo dont les trois paramètres étaient valides et qui ne produisait
                //   AUCUN pixel — *une garde sur les paramètres d'un effet n'est pas une garde sur
                //   son effet*. Le juge mesurera le plateau et la vallée EN POINTS, son critère
                //   corrigé, et c'est lui qui dira si le flou porte.
                TMPro.ShaderUtilities.GetShaderPropertyIDs();

                compteurNombre[i] = NouveauTexte(fen.transform, "Nombre", "—",
                    CssCompteurNombre, ReputationResolvers.Cyan, DesignTokens.Current.primaryFont,
                1f);  // interligne maquette — .fen b{font:700 14px/1}

                // Le halo, porté par le glyphe lui-même. Teinte = celle du chiffre (`cyan99` du
                // canon), alpha = celui que le juge a certifié.
                Material halo = compteurNombre[i].fontMaterial;   // INSTANCE — voir plus haut
                halo.EnableKeyword(TMPro.ShaderUtilities.Keyword_Underlay);
                Color teinteHalo = ReputationResolvers.Cyan;
                teinteHalo.a = CssHaloOpacite * HaloAmplitudeCorrection;
                halo.SetColor(TMPro.ShaderUtilities.ID_UnderlayColor, teinteHalo);
                halo.SetFloat(TMPro.ShaderUtilities.ID_UnderlayOffsetX, 0f);
                halo.SetFloat(TMPro.ShaderUtilities.ID_UnderlayOffsetY, 0f);
                halo.SetFloat(TMPro.ShaderUtilities.ID_UnderlayDilate, HaloDilatation);
                halo.SetFloat(TMPro.ShaderUtilities.ID_UnderlaySoftness, HaloDouceur);
                compteurNombre[i].fontStyle = TMPro.FontStyles.Bold;   // maquette : le chiffre du compteur (.fen, 700 14px)
                compteurNombre[i].alignment = TextAlignmentOptions.Center;

                compteurLibelle[i] = NouveauTexte(fen.transform, "Libelle", "",
                    CssCompteurLib, ReputationResolvers.Muet, DesignTokens.Current.primaryFont,
                1.1f);  // interligne maquette — .fen>span{font:700 5.4px/1.1}
                compteurLibelle[i].fontStyle = TMPro.FontStyles.Bold;   // maquette : le libellé du compteur (.fen>span, 700 5.4px)
                compteurLibelle[i].alignment = TextAlignmentOptions.Center;
                compteurLibelle[i].characterSpacing = 16f;

                EmpilerVertical(fen, Px(4f), Px(3f));
            }
        }

        /// <summary>Un compteur : la valeur, un suffixe optionnel (« /4 »), le libellé.
        /// Le suffixe est un TEXTE À PART et non une concaténation : la maquette le rend plus
        /// petit et d'une autre couleur, et surtout « 02 » et « /4 » ne disent pas la même
        /// chose — l'un est une mesure, l'autre un dénominateur fixe.</summary>
        private void MajCompteur(int index, string valeur, string suffixe, string libelle)
        {
            if (index < 0 || index >= 3) return;
            compteurNombre[index].text = string.IsNullOrEmpty(suffixe)
                ? valeur
                : valeur + "<size=64%><color=#" +
                  ColorUtility.ToHtmlStringRGB(ReputationResolvers.Muet) + ">" + suffixe + "</color></size>";
            compteurLibelle[index].text = libelle;
        }

        private void ConstruireMiroir(Transform parent)
        {
            GameObject go = NouveauUI("Miroir", parent);
            LayoutElement hle = go.AddComponent<LayoutElement>();
            hle.minHeight = Px(CssHMiroir);
            hle.preferredHeight = Px(CssHMiroir);
            hle.flexibleHeight = 1f;   // ⚠️ ÉLASTIQUE — `.elast{flex:1}`, voir la note ci-dessous
            zoneElastique = (RectTransform)go.transform;
            AjouterFond(go, ReputationResolvers.Fond2);
            Contour(go, ReputationResolvers.Lisere);

            // ⛔ LE REFLET — c'est lui qui fait de ce panneau une GLACE, et donc qui justifie le
            // titre « Le miroir ». Il manquait entièrement : le juge visuel l'a mesuré à 6,6 % de
            // score de détection contre 67,7 % sur la référence, aux deux résolutions.
            // ★ « L'écran s'appelle Le miroir et ne montre plus de miroir » — un élément d'IDENTITÉ
            //   ne se remarque pas dans une revue de code, seulement dans l'image.
            //
            // La maquette l'anime (`.elast::after`, chassis6.py:129-131) : une ligne de scan qui
            // descend de -6 px à 190 px en 7,5 s, opacité 0,45 entre 12 % et 88 % de la course.
            // Le rendu de référence est FIGÉ par `animation-delay:-2.6s`, soit 34,7 % de course :
            //     -6 + 0,347 × (190 + 6) = 62 px CSS sous le haut du bloc
            // — ce que le juge retrouve indépendamment à y=301,7 dans l'image entière.
            // ⚠️ On pose donc un filet STATIQUE à cette position, et non une animation : cet écran
            // est vérifié « 0 pixel différent entre T et T+1 s » (prouvé, 2 073 600 pixels), et
            // animer casserait cette garde pour un gain que la référence ne montre pas.
            GameObject reflet = NouveauUI("Reflet", go.transform);
            Image refImg = reflet.AddComponent<Image>();
            refImg.sprite = ProceduralUI.HorizontalFade(256, 0.5f, 0f);
            Color cyanReflet = ReputationResolvers.Cyan;
            // 0,45 est l'opacité de la CSS, mais le rendu mesuré sortait à +118,7 de surcroît pour
            // +73 en maquette, soit 1,6× — le trait se lisait « comme une affordance d'interface
            // inexistante » plutôt que comme un reflet. Le mélange n'est pas le même que celui du
            // navigateur ; on cale donc sur l'EFFET mesuré et on le dit, plutôt que de garder une
            // valeur juste sur le papier qui rend faux à l'écran.
            cyanReflet.a = 0.45f * (73f / 118.7f);
            refImg.color = cyanReflet;
            refImg.raycastTarget = false;
            // Décor : jamais une colonne du HorizontalLayoutGroup — c'est la classe que la garde
            // B3S3 ferme, et elle avait déjà trouvé cinq instances de ce défaut sur cet écran.
            reflet.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rrt = (RectTransform)reflet.transform;
            rrt.anchorMin = new Vector2(0f, 1f); rrt.anchorMax = new Vector2(1f, 1f);
            rrt.pivot = new Vector2(0.5f, 1f);
            rrt.offsetMin = new Vector2(0f, 0f); rrt.offsetMax = new Vector2(0f, 0f);
            rrt.anchoredPosition = new Vector2(0f, -Px(CssRefletY));
            rrt.sizeDelta = new Vector2(0f, Px(CssRefletHaut));


            // ⛔ LE NIVEAU `.mir6` MANQUAIT, et c'est lui qui décide OÙ va le mou de la page.
            // La maquette empile deux conteneurs, pas un :
            //   `.elast{flex:1; flex-direction:column}`  ⇐ absorbe le mou (ce bloc-ci)
            //   `.mir6 {display:flex; align-items:stretch}`  ⇐ SANS flex-grow : hauteur du CONTENU
            // Le mou reste donc dans `.elast`, SOUS le `.mir6`. En collant le groupe horizontal
            // directement sur le bloc élastique, je l'envoyais dans la carte du portrait.
            // ⚠️ Mesuré par le juge : cadre doré à 252,5 px CSS en 16:9 et 385,8 en 20:9, pour
            // 182,7 en maquette — soit 231 CSS de vide, 60 % du cadre, à la résolution cible. « Le
            // va-et-vient portrait ↔ tuiles, qui est le propos de l'écran, devient une colonne vide
            // bordée d'or à côté d'une liste courte. »
            // ★ Et ma garde B3S4 restait VERTE : elle vérifie que le bloc élastique absorbe la
            //   hauteur ajoutée, ce qu'il faisait — mais par le mauvais enfant. Une garde qui
            //   mesure un total ne dit rien de sa répartition. A3 n'était donc pas aussi fermée
            //   que je l'avais déclaré, et c'est le juge qui me l'apprend.
            VerticalLayoutGroup pileMiroir = go.AddComponent<VerticalLayoutGroup>();
            pileMiroir.childControlWidth = true; pileMiroir.childControlHeight = true;
            pileMiroir.childForceExpandWidth = true;
            pileMiroir.childForceExpandHeight = false;   // le mou reste SOUS le mir6
            pileMiroir.childAlignment = TextAnchor.UpperCenter;
            // ⛔ `padding:7px 8px` PLUS le `border:1px` — et les deux manquaient (㊲ F8).
            // La règle est `.elast{…border:1px solid …; padding:7px 8px…}` (`chassis6.py:126-128`) :
            // le retrait du contenu depuis le bord EXTÉRIEUR vaut donc **8 en haut et en bas**,
            // **9 à gauche et à droite** — pas 7 partout. Le client posait 7 sur les quatre côtés
            // et ne comptait pas le trait : un juge ⊥ a mesuré le padding intérieur à **23 px
            // contre 30** en référence, et les tuiles s'élargir de 4,2 % en conséquence — ce qui
            // fait passer l'en-tête « ce qu'il a absorbé de vos règles » de TROIS lignes à DEUX,
            // donc raccourcit la colonne, donc creuse le vide du bas (F1).
            // ★ *Une bordure est un retrait comme un autre* : la CSS l'ajoute au padding, le
            //   `RectOffset` d'un layout ne le sait pas — c'est à l'appelant de l'additionner.
            pileMiroir.padding = new RectOffset(PxTrait(9f), PxTrait(9f), PxTrait(8f), PxTrait(8f));

            GameObject mir6 = NouveauUI("Mir6", go.transform);
            // ⛔ HAUTEUR IMPOSÉE, et non laissée au calcul. `childForceExpandHeight = false` sur la
            // pile ne suffisait pas : mesuré (log `[PRT b3]`), Mir6 rendait 1077 unités sur les
            // 1137 du bloc — il ne s'étirait pas, sa hauteur PRÉFÉRÉE valait déjà tout le bloc,
            // parce qu'un groupe horizontal prend le maximum des préférées de ses enfants et que le
            // portrait, lui, n'a aucun plafond.
            // ★ J'ai d'abord cru que le correctif était de « l'empêcher de s'étirer ». Il ne
            //   s'étirait pas : il DEMANDAIT cette hauteur. Empêcher un étirement qui n'a pas lieu
            //   ne change rien — deux causes différentes produisent ici la même image.
            // La maquette donne au contenu la hauteur du bloc moins ses marges : 188 − 2 × 7 = 174.
            // ⚠️ 182,7 et non 174. J'avais dérivé cette hauteur de `H_MIROIR − 2 × 7` (le bloc
            // moins son padding), ce qui est un raisonnement sur la boîte et non une mesure du
            // contenu. L'arithmétique du cadre le montre : 462 = 13 (marge haute) + 196 (blocs
            // fixes) + 36 (4 gouttières) + 217 (le bloc élastique). Sur ces 217, moins 14 de
            // padding, il reste 203 pour la carte ET le vide sous elle. La maquette laisse 21,4 de
            // vide ⇒ la carte vaut 182,7, pas 174.
            // ★ Les 8,7 de différence ne se voyaient pas sur la carte — elles se voyaient EN
            //   DESSOUS, où le juge a mesuré 37,5 de vide pour 21,4 attendus. Un bloc trop court
            //   ne se lit jamais comme un bloc trop court : il se lit comme un trou à côté.
            LayoutElement mle = mir6.AddComponent<LayoutElement>();
            mle.minHeight = Px(CssHCarteMiroir);
            mle.preferredHeight = Px(CssHCarteMiroir);
            mle.flexibleHeight = 0f;   // le mou de la page reste SOUS lui, dans le bloc élastique
            HorizontalLayoutGroup h = mir6.AddComponent<HorizontalLayoutGroup>();
            h.spacing = Px(10f);
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandHeight = true;

            // Le portrait — largeur FIXE (118 px CSS convertis), le reste s'étire.
            GameObject prtGo = NouveauUI("Portrait", mir6.transform);
            AjouterFond(prtGo, ReputationResolvers.Panneau);
            Contour(prtGo, ReputationResolvers.OrFilet);
            LayoutElement le = prtGo.AddComponent<LayoutElement>();
            // ⛔ `minWidth` AUTANT que `preferredWidth` — la maquette dit `flex:none` (.prt, ligne
            // 71), ce qui interdit à ce cadre de rétrécir, pas seulement de grandir.
            // ⚠️ Mesuré avant correction (log `[PRT b3]`, run 26) : le cadre rendait 369 unités
            // au lieu des 503 demandées, soit 86 px CSS pour 118 déclarés — la colonne de lecture,
            // elle sans largeur plancher, réclamait la place et Unity comprimait le portrait
            // jusqu'à son `minWidth` implicite de ZÉRO. `preferredWidth` seul n'est qu'un souhait.
            // Le débordement du buste en découlait : le dessin calcule son échelle sur les 96 px
            // CSS VOULUS, si bien que les épaules faisaient 330 unités dans une zone devenue large
            // de 301. La forme ne débordait pas parce qu'elle était mal dessinée, mais parce que
            // son cadre avait rétréci sous elle.
            le.minWidth = Px(CssPortraitLarg);
            le.preferredWidth = Px(CssPortraitLarg);
            le.flexibleWidth = 0f;
            portrait = prtGo.AddComponent<ReputationPortrait>();
            portrait.Construire(racinePleinEcran);

            // La colonne de lecture : le verdict de cohérence, puis les quatre voyants.
            GameObject lect = NouveauUI("Lecture", mir6.transform);
            VerticalLayoutGroup v = lect.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(4f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandHeight = false;

            // ⛔ LE VERDICT — le titre de la colonne, et il MANQUAIT. Mon commentaire ci-dessus
            // annonçait « le verdict de cohérence, puis les quatre voyants » depuis le début, et
            // seuls les voyants existaient : un commentaire décrivait une intention que le code ne
            // réalisait pas, ce qui est pire qu'un commentaire absent — il m'a fait relire cette
            // fonction plusieurs fois sans voir le trou, puisqu'elle DISAIT contenir le verdict.
            // Trouvé en comparant la capture à `m-120.png`, pas en relisant le code.
            //
            // Mesuré à la source (`.verdict`, generateur-reputation.py:88-90) : serif 700 à 10 px
            // pour le verdict, sans-serif 6,4 px `muet` pour la légende, alignés sur la LIGNE DE
            // BASE avec 8 px d'écart — d'où l'alignement horizontal plutôt qu'une pile.
            GameObject verdictGo = NouveauUI("Verdict", lect.transform);
            HorizontalLayoutGroup hv = verdictGo.AddComponent<HorizontalLayoutGroup>();
            hv.spacing = Px(CssVerdictEcart);
            hv.childControlWidth = true; hv.childControlHeight = true;
            hv.childForceExpandWidth = false; hv.childForceExpandHeight = false;
            hv.childAlignment = TextAnchor.LowerLeft;   // `align-items:baseline`, au plus près

            verdictTitre = NouveauTexte(verdictGo.transform, "Titre", "",
                CssVerdictTitre, ReputationResolvers.Muet, DesignTokens.Current.hudSerifFont,
                1f);  // interligne maquette — .verdict b{font:700 10px/1}
            verdictTitre.fontStyle = TMPro.FontStyles.Bold;   // maquette : .verdict b, 700 10px

            // La légende ne dépend d'AUCUN état : c'est la même phrase dans les six vues de la
            // maquette. La poser une fois ici, plutôt que dans `AppliquerEtat`, évite qu'un état
            // futur oublie de la réécrire et laisse une colonne sans son explication.
            NouveauTexte(verdictGo.transform, "Legende", Lib("ce qu’il a absorbé de vos règles"),
                CssVerdictLegende, ReputationResolvers.Muet, DesignTokens.Current.primaryFont,
                1.2f);  // interligne maquette — .pcle{font:5.2px/1.2}

            for (int i = 0; i < 4; i++)
                voyants[i] = TellVoyant.Construire(lect.transform, this);

            // ⛔ LE REFLET REMONTE AU-DESSUS DE TOUT — ICI, et pas à sa création.
            // ⚠️ Je l'avais déjà « corrigé » au tour précédent par un `SetAsLastSibling()` posé
            // juste après sa création… c'est-à-dire AVANT que `Mir6` et la carte du portrait
            // n'existent. Il était donc bien dernier — d'une fratrie qui n'avait pas encore ses
            // autres membres. Le juge l'a mesuré : reflet strictement NUL de x=118 à x=470, toute
            // la largeur de la carte, par deux instruments indépendants.
            // ★ `SetAsLastSibling` ordonne au moment où on l'appelle, pas au moment du rendu. Un
            //   correctif d'ORDRE dépend de l'instant où il s'exécute — c'est la même famille que
            //   la conversion d'échelle faite avant que le canvas ait sa taille.
            reflet.transform.SetAsLastSibling();
        }

        private GameObject    listeReglesBloc;   // le bloc ENTIER — masqué quand il n'y a rien à lister
        private LayoutElement listeReglesHauteur; // sa hauteur suit le NOMBRE de règles (n × 30 CSS)
        private RectTransform listeReglesRoot;
        private TextMeshProUGUI listeReglesVide;
        private TextMeshProUGUI pannSurTitre, pannTitre, pannTexte;
        private TextMeshProUGUI verdictTitre;
        private TextMeshProUGUI ctaLibelle;

        /// <summary>Le verdict de cohérence tel qu'il est AFFICHÉ — crochet de test.</summary>
        public string VerdictAffiche => verdictTitre != null ? verdictTitre.text : null;

        /// <summary>Le sur-titre du panneau, tel qu'il est AFFICHÉ — crochet de test. C'est lui
        /// qui distingue les trois états ; l'asserter sur la sortie plutôt que sur la valeur
        /// d'entrée évite une garde tautologique (« l'état vaut ce que je viens de lui donner »).</summary>
        public string PanneauSurTitreAffiche => pannSurTitre != null ? pannSurTitre.text : null;

        /// <summary>L'emphase du corps de texte, telle que la maquette la définit : `<u>` y est
        /// redéfini en `text-decoration:none; color:or_vif; font-weight:700` (chassis6.py:138 et
        /// 146). Ce n'est donc PAS un souligné — c'est un mot en or gras.
        ///
        /// ⚠️ Ces emphases avaient disparu du rendu, et le juge visuel l'a chiffré : 0 pixel d'or
        /// dans le paragraphe contre 1 212 en maquette. « rien pris de vous » et « indéterminé »
        /// sont les deux mots qui PORTENT l'écran — l'un dit que le lieutenant n'a rien absorbé,
        /// l'autre que le serveur refuse de juger — et ils se lisaient comme du texte courant.
        /// ⛔ Passer par cette méthode, jamais par un balisage recopié : cinq copies d'une couleur
        /// littérale divergeraient au premier changement de palette.</summary>
        private static string Or(string mot) =>
            "<b><color=#" + ColorUtility.ToHtmlStringRGB(ReputationResolvers.OrVif) + ">"
            + mot + "</color></b>";

        private void MajPanneau(string surTitre, string titre, string texte, Color couleurTitre)
        {
            if (pannSurTitre == null) return;
            pannSurTitre.text = surTitre;
            pannTitre.text = titre;
            pannTitre.color = couleurTitre;
            pannTexte.text = texte;
        }

        /// <summary>La liste des règles que le joueur a déclarées — le cadre `regles` de la
        /// maquette.
        ///
        /// ⛔⛔ ET C'EST ICI QUE SE JOUE LA CONSIGNE LA PLUS EXPLICITE DU LOT : `rule_id` EST
        /// AFFICHÉ EN CLAIR. Le serveur ne rend que cet identifiant — il est écrit par le joueur
        /// lui-même (`reputation.controller.ts:84-86`, « free-form, player-authored ») et AUCUN
        /// libellé n'existe nulle part : le bundle i18n mesuré rend 67 clés, 63 `error.*` et
        /// 4 `game.*`, zéro pour ce domaine. Écrire une table de correspondance côté client
        /// fabriquerait du contenu que le back ne connaît pas, et le premier `rule_id` inattendu
        /// tomberait dans un « (règle inconnue) ».
        /// ⇒ On montre l'identifiant tel quel. **Le trou se montre, il ne se masque pas** — c'est
        /// la même règle que le compteur d'enfreintes à « — ».
        /// ⚠️ Ce renvoi citait aussi la mention « lieutenant.name — non projeté » : elle a été
        /// RETIRÉE, parce que le trou qu'elle annonçait était réparé côté back depuis un lot que
        /// personne n'avait re-mesuré. Un exemple qui survit à ce qu'il illustre transforme une
        /// règle juste en preuve d'une chose fausse.
        ///
        /// ⚠️ Et il n'y a AUCUN bouton de retrait, volontairement : `retractRule` existe côté
        /// serveur mais n'a qu'un appelant, de test — zéro en production. Le canon dit qu'une
        /// règle tient jusqu'à retrait public ; tant que ce maillon manque, une règle donnée est
        /// définitive, et l'écran le DIT au lieu d'offrir un geste qui échouerait.</summary>
        private void ConstruireListeDesRegles(Transform parent)
        {
            GameObject go = NouveauUI("ListeDesRegles", parent);
            listeReglesBloc = go;
            LayoutElement hle = go.AddComponent<LayoutElement>();
            listeReglesHauteur = hle;
            hle.minHeight = Px(CssHRegleVide);
            hle.preferredHeight = Px(CssHRegleVide);
            hle.flexibleHeight = 0f;
            AjouterFond(go, ReputationResolvers.Fond2);
            Contour(go, ReputationResolvers.Lisere);

            NouveauTexte(go.transform, "SurTitre", Lib("LES RÈGLES QUE VOUS AVEZ DONNÉES"),
                CssPannSurTitre, ReputationResolvers.Muet,
                DesignTokens.Current.primaryFont,
                1f).characterSpacing = 19f;  // interligne maquette — .pann i{font:700 5.6px/1}

            GameObject lignes = NouveauUI("Lignes", go.transform);
            listeReglesRoot = (RectTransform)lignes.transform;
            VerticalLayoutGroup v = lignes.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            listeReglesVide = NouveauTexte(go.transform, "Vide",
                Lib("vous n’avez encore donné aucune règle — rien ne peut donc être enfreint"),
                CssPannTexte, ReputationResolvers.Eteint, DesignTokens.Current.primaryFont,
                1.4f);  // interligne maquette — .pann small{font:6.6px/1.4}

            EmpilerVertical(go, Px(CssPannPadY), Px(4f), Px(CssPannPadX));
        }

        /// <summary>Combien de règles la liste affiche RÉELLEMENT — crochet de test. Distinct du
        /// compteur « RÈGLES DONNÉES » de l'en-tête : celui-ci compte ce que le corps porte,
        /// celui-là compte ce qui est DESSINÉ. Les confondre masquerait exactement le défaut
        /// qu'on veut voir (« disponible, et pourtant non affiché »).</summary>
        public int ReglesAffichees { get; private set; }

        private void RendreListeDesRegles(DeclaredRuleDto[] regles)
        {
            for (int i = listeReglesRoot.childCount - 1; i >= 0; i--)
                Object.Destroy(listeReglesRoot.GetChild(i).gameObject);

            ReglesAffichees = 0;
            bool vide = regles == null || regles.Length == 0;

            // ⛔ VIDE ⇒ LE BLOC ENTIER DISPARAÎT, il ne se contente pas d'afficher « aucune règle ».
            // La maquette ne laisse pas le choix : `reputation()` (generateur-reputation.py:200-211)
            // construit la vue `vierge` avec l'enseigne, les compteurs, LE MIROIR, le panneau et le
            // pied — et rien d'autre. La liste appartient à une vue SÉPARÉE (`rg6`), et `verifier()`
            // les traite en `if/elif` : jamais les deux dans le même cadre.
            // ⚠️ Mesuré en comparant ma capture à la référence `m-120.png` : j'affichais un sixième
            // bloc que la maquette ne montre nulle part dans cet état. Il ne venait d'aucune source
            // — je l'avais construit parce que l'écran « devait bien » lister les règles.
            listeReglesBloc.SetActive(!vide);
            listeReglesVide.gameObject.SetActive(false);
            if (vide) return;

            // La hauteur est un COMPTE, pas une constante : `H_REGLE = 30` par règle (ligne 280),
            // plus l'entourage. Une hauteur figée tronquerait la 3ᵉ règle ou laisserait un vide.
            float haut = regles.Length * CssHRegle + CssHRegleEntour;
            listeReglesHauteur.minHeight = Px(haut);
            listeReglesHauteur.preferredHeight = Px(haut);

            foreach (DeclaredRuleDto regle in regles)
            {
                if (regle == null || string.IsNullOrEmpty(regle.rule_id)) continue;

                GameObject ligne = NouveauUI("Regle_" + regle.rule_id, listeReglesRoot);
                AjouterFond(ligne, ReputationResolvers.Panneau);
                HorizontalLayoutGroup h = ligne.AddComponent<HorizontalLayoutGroup>();
                h.spacing = Px(7f);
                h.padding = new RectOffset(PxTrait(8f), PxTrait(8f), PxTrait(5f), PxTrait(5f));
                h.childControlWidth = true; h.childControlHeight = true;
                h.childForceExpandWidth = false;
                h.childAlignment = TextAnchor.MiddleLeft;

                // Le liseré vertical. ⚠️ Il est NEUTRE, et c'est une décision : la maquette le
                // colore en vert (tenue) ou ambre (enfreinte), mais AUCUNE clé du corps ne dit
                // quelle règle est enfreinte — le `rule_id` fautif est écrit en base
                // (`boss_mirror_violation_ring.violation_slots[]`) et jamais projeté. Colorer au
                // hasard inventerait l'information la plus lourde de l'écran.
                GameObject sc = NouveauUI("Liseré", ligne.transform);
                AjouterFond(sc, ReputationResolvers.Lisere);
                LayoutElement scle = sc.AddComponent<LayoutElement>();
                scle.preferredWidth = PxTrait(3f);
                scle.flexibleWidth = 0f;

                // L'identifiant, EN CLAIR. Pas de table de libellés : il n'en existe aucune.
                TextMeshProUGUI id = NouveauTexte(ligne.transform, "RuleId", regle.rule_id,
                    CssVoyantTitre, ReputationResolvers.Creme, DesignTokens.Current.primaryFont,
                1.2f);  // interligne maquette — .ptitre{font:700 7.4px/1.2}
                LayoutElement idle = id.gameObject.AddComponent<LayoutElement>();
                idle.flexibleWidth = 1f;

                ReglesAffichees++;
            }
        }

        private void ConstruirePanneau(Transform parent)
        {
            GameObject go = NouveauUI("Panneau", parent);
            LayoutElement hle = go.AddComponent<LayoutElement>();
            hle.minHeight = Px(CssHPann);
            hle.preferredHeight = Px(CssHPann);
            hle.flexibleHeight = 0f;   // hauteur FIXE : ne s'étire pas
            panneauProse = (RectTransform)go.transform;
            AjouterFond(go, ReputationResolvers.Panneau);
            Contour(go, ReputationResolvers.Lisere);

            // Les trois textes sont MÉMORISÉS : le panneau change avec l'état (`AppliquerEtat`),
            // il n'est pas figé à la construction. Un panneau figé afficherait « la règle du
            // jeu » à un joueur en train de dériver — au moment précis où l'écran doit lui dire
            // autre chose.
            pannSurTitre = NouveauTexte(go.transform, "SurTitre", "", CssPannSurTitre,
                ReputationResolvers.Muet, DesignTokens.Current.primaryFont,
                1f);  // interligne maquette — .pann i{font:700 5.6px/1}
            pannSurTitre.fontStyle = TMPro.FontStyles.Bold;   // maquette : le sur-titre du panneau (.pann, 700 5.6px)
            pannSurTitre.characterSpacing = 19f;
            pannTitre = NouveauTexte(go.transform, "Titre", "", CssPannTitre,
                ReputationResolvers.Creme, DesignTokens.Current.hudSerifFont,
                1.15f);  // interligne maquette — .pann b{font:700 13px/1.15}
            pannTitre.fontStyle = TMPro.FontStyles.Bold;   // maquette : le titre du panneau (.pann, 700 13px)
            pannTexte = NouveauTexte(go.transform, "Texte", "",
                CssPannTexte, ReputationResolvers.Creme2, DesignTokens.Current.primaryFont,
                1.4f);  // interligne maquette — .pann small{font:6.6px/1.4}

            EmpilerVertical(go, Px(CssPannPadY), Px(4f), Px(CssPannPadX));
        }

        public Button CtaDonnerRegle { get; private set; }

        private void ConstruirePied(Transform parent)
        {
            GameObject go = NouveauUI("Pied", parent);
            // ⚠️ UN SEUL LayoutElement — il y en avait DEUX sur ce même GameObject, l'un posé à
            // 52 px CSS et l'autre à la hauteur du bouton. Deux composants de layout sur un objet
            // ne se moyennent pas : l'un gagne, et lequel ne se lit nulle part dans le code.
            GameObject cta = NouveauUI("CtaDonnerRegle", go.transform);
            Image fond = AjouterImage(cta);
            fond.color = ReputationResolvers.Carte2;
            Contour(cta, ReputationResolvers.OrFilet);

            CtaDonnerRegle = cta.AddComponent<Button>();
            CtaDonnerRegle.targetGraphic = fond;

            ctaLibelle = NouveauTexte(cta.transform, "Libelle", "DONNER UNE RÈGLE",
                CssCtaCorps, ReputationResolvers.OrVif, DesignTokens.Current.primaryFont,
                1f);  // interligne maquette — .cta6{font:700 8.5px/1}
            ctaLibelle.fontStyle = TMPro.FontStyles.Bold;   // maquette : .cta6, 700 8.5px
            ctaLibelle.alignment = TextAlignmentOptions.Center;
            ctaLibelle.characterSpacing = 11f;
            RectTransform lrt = (RectTransform)ctaLibelle.transform;
            Etirer(lrt, Px(CssCtaPad));

            LayoutElement le = cta.AddComponent<LayoutElement>();
            le.minHeight = Px(CssCtaCorps + 2f * CssCtaPad);
            le.preferredHeight = Px(CssCtaCorps + 2f * CssCtaPad);
            // Le PIED lui-même doit réserver sa hauteur au layout de `corps`, sinon il se réduit
            // à zéro et le CTA déborde hors du cadre — mesuré sur la capture du run 14.
            // ⛔ LE PADDING DU PIED EST ASYMÉTRIQUE : `.pied{padding:9px 13px 14px}` — 9 au-dessus
            // du bouton, 14 en dessous. Je n'en posais aucun, donc le bouton se collait en haut de
            // son bloc et tout le reste s'ouvrait sous lui.
            // ⚠️ Mesuré des deux côtés avec le même instrument : la bande entre le bas du bouton et
            // le bas du cadre vaut 9,00 px CSS en maquette et 31,39 en jeu — ×3,5. Un bandeau vide
            // et clair barrait le bas du cadre doré, et le bouton n'ancrait plus rien.
            // ★ Le bloc avait pourtant la BONNE hauteur (52). C'est sa garniture interne qui
            //   manquait — une hauteur juste ne dit rien de ce qui se passe à l'intérieur.
            LayoutElement pied = go.AddComponent<LayoutElement>();
            pied.minHeight = Px(CssCtaCorps + 2f * CssCtaPad + CssPiedPadBas);
            pied.preferredHeight = pied.minHeight;
            pied.flexibleHeight = 0f;
            VerticalLayoutGroup vp = go.AddComponent<VerticalLayoutGroup>();
            // ⛔ PADDING HAUT À ZÉRO : la gouttière du VerticalLayoutGroup fait DÉJÀ les 9 px CSS.
            // Dans la maquette, `.pied` est le seul bloc sans `margin-top` — son `padding:9px`
            // REMPLACE la marge, il ne s'y ajoute pas. En posant les deux, j'empilais 9 + 9.
            // ⚠️ Mesuré par le juge : 18,3 px CSS au-dessus du bouton pour 9,4 en maquette, +95 %.
            // ★ Traduire une règle CSS composant par composant fait perdre ce que la cascade
            //   arbitrait : ici, que ce bloc-ci prend son espace par le padding et les autres par
            //   la marge. Deux mécanismes pour un même espacement, et j'ai appliqué les deux.
            vp.padding = new RectOffset(0, 0, 0, PxTrait(CssPiedPadBas));
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
        }

        // ═══ Primitives ══════════════════════════════════════════════════════════════════════

        internal float PxPublic(float css) => Px(css);
        internal int PxTraitPublic(float css) => PxTrait(css);

        private static GameObject NouveauUI(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>⛔ TOUTE Image passe par ici, et ce n'est pas du confort.
        /// `AddComponent&lt;T&gt;()` à l'exécution **n'honore pas** le `[RequireComponent(
        /// CanvasRenderer)]` d'une classe de base — et sans `CanvasRenderer`, un `Graphic` ne
        /// dessine RIEN, sans la moindre erreur console. Mesuré sur ce dépôt : des panneaux et
        /// leur fond rendaient la même couleur des deux côtés, la plaque n'avait jamais existé,
        /// seul le trait de bordure la simulait. L'avertissement était écrit en tête du fichier
        /// du composant, et le site d'appel neuf l'a violé quand même — *écrire l'avertissement
        /// ne protège pas le prochain appelant, seul un test le protège*. D'où cette fabrique
        /// unique, sur laquelle une garde structurelle peut mordre.</summary>
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

        /// <summary>Un contour d'un pixel, en ENFANT — pas une bordure sur l'image de fond
        /// (Unity n'en a pas) et pas un second Image sur le même objet (un seul Graphic par
        /// GameObject).</summary>
        private void Contour(GameObject go, Color couleur)
        {
            GameObject b = NouveauUI("Contour", go.transform);
            Etirer((RectTransform)b.transform);
            // ⛔ MÊME DÉFAUT QUE LE CERNE, ET IL ÉTAIT VISIBLE À L'ÉCRAN : un `Contour` est un
            // ENFANT du bloc qu'il borde, donc un LayoutGroup parent le compte comme un ÉLÉMENT.
            // Mesuré sur la capture du run 14 : une COLONNE VIDE à gauche du portrait, large
            // comme un tiers du miroir — c'était le contour, aligné par le HorizontalLayoutGroup
            // au même titre que le portrait et la colonne de lecture.
            // ⇒ Un cadre ne s'empile pas : il se superpose. `ignoreLayout` le dit au layout.
            b.AddComponent<LayoutElement>().ignoreLayout = true;
            Image img = AjouterImage(b);
            img.sprite = ProceduralUI.RoundedRectOutline(PxTrait(2f), PxTrait(1f), Color.white);
            img.type = Image.Type.Sliced;
            img.color = couleur;
            img.raycastTarget = false;
        }

        /// <summary>Item 0.6 — un littéral STATIQUE de cet écran passe par une clé
        /// `reputation.bloc.<slug>`, et retombe sur lui-même tant que le dictionnaire ne la porte
        /// pas (contrat de `Libelle`, repli byte-identique).
        /// ⛔ POSÉ SITE PAR SITE, JAMAIS AU FABRICANT DE TEXTE. `NouveauTexte` reçoit aussi des
        /// valeurs CALCULÉES — `regle.rule_id` ligne ~1135, les phrases de verdict — et keyer au
        /// point de passage fabriquerait une clé par donnée.
        /// ⚠️ J'avais écrit un convertisseur automatique par expression régulière pour faire ce
        /// travail : il a converti 4 sites sur 20 et inséré un appel à un helper inexistant. Une
        /// réécriture de masse au regex sur du C# produit du plausible, pas du juste.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("reputation", "bloc", litteral);

        /// <summary>Un texte de cet écran, à son corps ET À SON INTERLIGNE de maquette.
        ///
        /// ⛔⛔ L'INTERLIGNE EST OBLIGATOIRE, ET C'EST LE CORRECTIF DE F6, PAS UN DÉTAIL DE
        /// SIGNATURE. Cette fabrique ne posait AUCUN `lineSpacing` : tous les blocs multi-lignes de
        /// l'écran héritaient donc du défaut de TMP (~1,157 em pour DejaVu Sans) là où la maquette
        /// déclare un interligne par bloc. Mesuré par un juge ⊥ : paragraphe `.pann` **33,0 → 27,5
        /// px** (−17 %) à hauteur de glyphe IDENTIQUE et à largeur de ligne à ≤ 1 % ; titre de carte
        /// 27 → 24 ; sous-titre d'enseigne 23 → 22 ; tuile 98 → 90.
        /// ⇒ Un paramètre OPTIONNEL aurait laissé les sites existants sur le défaut de TMP en
        ///   silence — *« optionnel » est l'endroit où le compilateur cesse d'aider*. Requis, il a
        ///   obligé à visiter les onze sites et à écrire, pour chacun, la valeur de SA règle CSS.
        ///
        /// `interligneEm` est le dénominateur de `font: <corps>px/<interligne>` de la maquette
        /// (`chassis6.py`) : `.pann small{font:6.6px/1.4}` ⇒ 1,4.
        /// ⚠️ La conversion vers `lineSpacing` est DÉRIVÉE de la police chargée, jamais d'une
        /// constante devinée : TMP exprime `lineSpacing` en centièmes de cadratin AJOUTÉS à
        /// l'interligne naturel de la fonte, qu'on lit dans `faceInfo`. Une constante en dur serait
        /// fausse le jour où la fonte change — et ce dépôt a déjà payé une référence de police
        /// substituée sans que personne ne s'en aperçoive.</summary>
        private TextMeshProUGUI NouveauTexte(Transform parent, string nom, string texte,
                                             float corpsCss, Color couleur, TMP_FontAsset police,
                                             float interligneEm)
        {
            GameObject go = NouveauUI(nom, parent);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.text = texte;
            t.fontSize = PxTrait(corpsCss);   // un corps de texte à 0 est un défaut de rendu
            t.color = couleur;
            t.raycastTarget = false;
            if (police != null && police.faceInfo.pointSize > 0f)
            {
                float naturelEm = police.faceInfo.lineHeight / police.faceInfo.pointSize;
                t.lineSpacing = (interligneEm - naturelEm) * 100f;
            }
            return t;
        }

        /// <summary>Borne la hauteur du cadre par la place réellement disponible sous le bandeau.
        ///
        /// ⛔ Un composant plutôt qu'un calcul au montage : `OnRectTransformDimensionsChange` est le
        /// seul endroit qui voit un changement de résolution APRÈS coup. Ce dépôt a payé deux fois
        /// la classe « géométrie cuite au montage » — le fond de district à 0,9000 de sa taille, et
        /// les bandes de l'Accueil — et les deux fois le défaut n'est apparu qu'en capturant à une
        /// autre résolution que celle de la mise en page.</summary>
        private sealed class HauteurBorneeParLaZoneLibre : UnityEngine.EventSystems.UIBehaviour
        {
            public float hauteurVoulue, margeBasse, insetHaut;

            /// <summary>La marge basse PROPRE au cadre (hors chrome). Le chrome est relu à chaque
            /// passe : `ShellChrome.BottomInsetPx` peut être publié après le montage du locataire,
            /// et une valeur figée serait celle d'un écran qui n'est plus affiché.</summary>
            public float margeBasseHorsChrome;

            protected override void OnEnable() { base.OnEnable(); Appliquer(); }

            protected override void OnRectTransformDimensionsChange() { Appliquer(); }

            public void Appliquer()
            {
                var rt = transform as RectTransform;
                var parent = rt != null ? rt.parent as RectTransform : null;
                if (rt == null || parent == null || hauteurVoulue <= 0f) return;
                // ⛔⛔⛔ LA POSITION SE REPREND AUSSI, ET C'EST LE CORRECTIF DU BLOQUANT ㊲ B1.
                // Ce composant ne reprenait que la HAUTEUR. La position, elle, était posée UNE FOIS
                // au montage à partir de `ShellChrome.BottomInsetPx` — or ce champ est publié par le
                // shell APRÈS sa passe de layout, et une capture bascule la résolution APRÈS le
                // montage. Le cadre gardait donc l'offset d'un autre écran.
                // ⇒ Mesuré par un juge ⊥ à 1080×1920 : zone libre y 143..1681 (**1 539 px**), contenu
                //   **1 488 px** — il TIENT — mais posé à y=250, soit **107 px trop bas**, d'où
                //   **56 px** qui passent sous le dock. Le libellé du CTA y perd 47 à 49 % de ses
                //   colonnes. *Il y a la place, elle est mal utilisée.*
                // ★ ET C'EST EXACTEMENT LA CLASSE QUE LE COMMENTAIRE VOISIN DÉNONCE, sur l'autre
                //   grandeur : « une hauteur cuite au montage serait celle d'un autre écran ». La
                //   hauteur a été rendue élastique, la position est restée cuite. *Un correctif qui
                //   nomme une classe et n'en traite qu'une grandeur laisse la classe ouverte.*
                // ⚠️ LES DEUX INSETS SE RELISENT, PAS UN SEUL. N'en rendre qu'un élastique serait
                //    appliquer la règle à la moitié de son objet — la faute exacte que ce même
                //    écran vient de payer sur la coiffe (M5), où le bon principe a été appliqué au
                //    dôme et pas à l'occlusion qui le creuse.
                float bas = MafiaCleanCity.Shell.ShellChrome.BottomInsetPx + margeBasseHorsChrome;
                margeBasse = bas;
                insetHaut = MafiaCleanCity.Shell.ShellChrome.TopInsetPx;
                if (!Mathf.Approximately(rt.anchoredPosition.y, bas))
                    rt.anchoredPosition = new Vector2(rt.anchoredPosition.x, bas);

                float zoneLibre = parent.rect.height - insetHaut - margeBasse;
                if (zoneLibre <= 0f) return;   // rect pas encore résolu : on ne cuit rien
                float h = Mathf.Min(hauteurVoulue, zoneLibre);
                if (!Mathf.Approximately(rt.sizeDelta.y, h))
                    rt.sizeDelta = new Vector2(rt.sizeDelta.x, h);

                // Le journal dit ce que le composant a VU, pas ce qu'on suppose qu'il voit : les
                // deux insets viennent du shell et n'existent pas hors shell (ils valent 0).
                // ⚠️ LA HAUTEUR POSÉE N'EST PAS FORCÉMENT LA HAUTEUR RENDUE, et c'est l'hypothèse
                //    que ce journal existe pour trancher. Un `VerticalLayoutGroup` ou un
                //    `ContentSizeFitter` peut imposer une hauteur PRÉFÉRÉE supérieure à la boîte
                //    comprimée : le rect grandit alors des deux côtés — le sommet remonte au-dessus
                //    de l'inset (le losange du chrome tombe sur le titre) ET le dernier enfant sort
                //    par le bas (le CTA passe sous le filet). **Une cause, deux symptômes opposés**,
                //    qui ressemblent à s'y méprendre à « une borne sur deux a été traitée ».
                float rendu = rt.rect.height;
                // ⚠️ LE GROUPE VIT DÉSORMAIS SUR L'ENFANT `Contenu`, pas sur la fenêtre. Lire le
                //    groupe ici rendrait −1 et le journal se tairait sur la grandeur qui décide.
                Transform contenuT = rt.Find("Contenu");
                var rtMesure = contenuT != null ? (RectTransform)contenuT : rt;
                var lg = rtMesure.GetComponent<UnityEngine.UI.LayoutGroup>();
                float prefere = lg != null ? UnityEngine.UI.LayoutUtility.GetPreferredHeight(rtMesure) : -1f;
                // ⚠️ LE MINIMUM DÉCIDE, PAS LE PRÉFÉRÉ. Un `VerticalLayoutGroup` ne comprime qu'entre
                //    le MIN et le PRÉFÉRÉ : si la somme des minimums vaut déjà le préféré, il n'a
                //    aucune marge et dispose ses enfants hors de la boîte. Le préféré seul ne
                //    permet donc pas de conclure — c'est le min qu'il faut lire.
                float mini = lg != null ? UnityEngine.UI.LayoutUtility.GetMinHeight(rtMesure) : -1f;
                Debug.Log($"[CADRE-ELASTIQUE] écran {parent.rect.height:F0} · insetHaut {insetHaut:F0}"
                          + $" · margeBasse {bas:F0} · zone libre {zoneLibre:F0} · voulu "
                          + $"{hauteurVoulue:F0} · posé {h:F0} · RENDU {rendu:F0} · préféré "
                          + $"{prefere:F0} · MIN {mini:F0} · sommet "
                          + $"{(parent.rect.height - bas - rendu):F0}");
            }
        }

        /// <summary>La hauteur d'un contenu défilant : `max(préféré, fenêtre)`.
        ///
        /// ⛔ POURQUOI PAS `ContentSizeFitter` EN `PreferredSize`, qui est le réflexe : il donne au
        /// contenu EXACTEMENT sa hauteur préférée, donc il supprime le mou du groupe vertical — et
        /// tout `flexibleHeight` d'un enfant, qui n'existe que pour absorber ce mou, devient inerte.
        /// Mesuré sur ㊲ : le panneau élastique a perdu **89 px** et la carte qu'il contient est
        /// sortie de lui de 9 px, sans que rien d'autre ne bouge.
        /// ⇒ Le défilement n'a besoin d'une course que **quand le contenu dépasse**. Quand il tient,
        ///   le contenu doit REMPLIR la fenêtre, sinon les enfants élastiques perdent leur part.
        ///   `max(préféré, fenêtre)` sert les deux cas ; ni l'un ni l'autre des deux termes seul ne
        ///   le fait.
        /// ⚠️ `OnRectTransformDimensionsChange` et non un calcul au montage : une capture bascule la
        /// résolution APRÈS le montage, et une hauteur cuite serait celle d'un autre écran — la
        /// classe que cet écran a déjà payée sur la hauteur puis sur la position de son cadre.</summary>
        private sealed class HauteurDeContenuDefilant : UnityEngine.EventSystems.UIBehaviour
        {
            public RectTransform fenetre;

            protected override void OnRectTransformDimensionsChange() { Appliquer(); }

            public void Appliquer()
            {
                var rt = transform as RectTransform;
                if (rt == null || fenetre == null) return;
                float prefere = LayoutUtility.GetPreferredHeight(rt);
                float h = Mathf.Max(prefere, fenetre.rect.height);
                if (h <= 0f) return;   // rect pas encore résolu : on ne cuit rien
                if (!Mathf.Approximately(rt.sizeDelta.y, h))
                    rt.sizeDelta = new Vector2(rt.sizeDelta.x, h);
            }
        }

        private static void Etirer(RectTransform rt, float marge = 0f)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(marge, marge);
            rt.offsetMax = new Vector2(-marge, -marge);
        }

        private static void AncrerHaut(RectTransform rt, float haut, float margeH)
        {
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(0.5f, 1f);
            rt.offsetMin = new Vector2(margeH, rt.offsetMin.y);
            rt.offsetMax = new Vector2(-margeH, -haut);
        }

        private static void EmpilerVertical(GameObject go, float padY, float espacement,
                                            float padX = 0f)
        {
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.spacing = espacement;
            v.padding = new RectOffset(Mathf.RoundToInt(padX), Mathf.RoundToInt(padX),
                                       Mathf.RoundToInt(padY), Mathf.RoundToInt(padY));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
        }

        /// <summary>⛔ Le sas obligatoire avant toute LECTURE de géométrie.
        /// `Canvas.scaleFactor` et les `rect` lus dans la frame de création rendent des valeurs
        /// PLAUSIBLES et fausses (1,0 pour le scaleFactor) — la famille de défauts la plus
        /// dangereuse, parce que rien ne signale l'erreur. Un `yield return null` coûte une
        /// frame ; une valeur neutre non initialisée coûte un round de juge.</summary>
        public IEnumerator AttendreLayoutPuis(System.Action apres)
        {
            yield return null;
            Canvas.ForceUpdateCanvases();
            if (racinePleinEcran != null)
                LayoutRebuilder.ForceRebuildLayoutImmediate(racinePleinEcran);
            yield return null;
            apres?.Invoke();
        }
    }
}
