using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using MafiaCleanCity.Operational.Lieutenant;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // ⑯ LA REVUE DU JOUR — « le matin au Verge d'Or ».
    //
    // Référence RATIFIÉE par l'user (« nickel », 2026-08-25) : série 4, `ecrans-brennar-4.html`,
    // cadres « trois jetons sur le zinc » / « personne au comptoir » / « après vos verdicts ».
    // La scène : le patron passe derrière le zinc avant l'ouverture. Un signalement, c'est un
    // homme qui a DÉPENSÉ UN JETON DE CONFIANCE pour poser une question — il est accoudé, son
    // jeton posé devant lui. Sa phrase — un titre, puis un motif en italique — est choisie par
    // `descriptor.key` (⑯-4, `PhraseDe`) : c'est LUI qui parle, pas une fiche.
    //
    // LE JETON EST LE GESTE : le toucher = le lui rendre (`validate`) ; le GARDER en appui long =
    // `dismiss`, irréversible — donc le même geste que le tampon du registre (arbitrage E5 : le
    // canon voulait une feuille de confirmation, l'appui long EST la confirmation).
    //
    // ÉCHELLE — la maquette est un téléphone de 300 px CSS, le canvas du shell fait 1280 unités de
    // large (`AppShell.ReferenceResolutionWidth`, `matchWidthOrHeight=0`). Toute dimension de la
    // référence est donc multipliée par 1280/300 = 4,2667, jamais recopiée telle quelle.
    // ⚠️ Et toute OPACITÉ reprise de la maquette est exprimée dans l'espace du NAVIGATEUR (sRGB)
    // alors que ce projet rend en LINÉAIRE (`m_ActiveColorSpace: 1`) : les voiles passent par
    // `ProceduralUI.CouleurPourMelangeLineaire`, jamais par une recopie de l'alpha CSS.
    //
    // Ouverture automatique pilotée par `flag_review.auto_open` DÉJÀ CALCULÉ côté serveur — ce
    // contrôleur ne recalcule PAS la règle « première session du jour », il la LIT.
    //
    // ⛔ NON REVU — jalon 2026-09-05 (régime « full prod » du ruling user 2026-09-01 : aucun juge
    // ⊥, aucune suite complète ; test simple = typecheck + compile + une capture).
    public class DailyReviewScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- test hooks ------------------------------------------------------
        public bool IsOpen { get; private set; }
        public bool RenderedEmptyState { get; private set; }
        public int RenderedCardCount { get; private set; }
        public int ValidateRequestCount { get; private set; }
        public int DismissRequestCount { get; private set; }
        public int BatchConfirmRequestCount { get; private set; }
        public string LastValidateError { get; private set; }
        public string LastDismissError { get; private set; }
        public string LastBatchConfirmError { get; private set; }
        public int? LastBatchConfirmedCount { get; private set; }
        public FlagReviewResponseDto LastLoadedReview { get; private set; }

        public LongPressButton BatchConfirmButton { get; private set; }

        private RectTransform rowsRoot;
        private TextMeshProUGUI emptyStateText;   // le titre de la plaque du matin (⑯-2)
        private GameObject plaqueVide;
        private RectTransform registreRoot;       // ⑯-6
        private RevueDuJourDecor decor;          // ⑯-7 la scène, le dégradé, le zinc
        private GameObject tabourets;            // ⑯-7 v4-1, les trois tabourets vides
        private TextMeshProUGUI plaqueSurtitre;
        private TextMeshProUGUI registreCompte;
        private GameObject tamponRoot;
        private TextMeshProUGUI tamponLibelle;
        private TextMeshProUGUI tamponSous;
        private Image tamponFond;
        private Image tamponBord;
        private GameObject tamponCachet;
        // ⑯-3 — l'état « après vos verdicts » survit à un re-rendu : `LoadRoster` re-rend les billets
        // quand le roster arrive, et sans ces deux mémoires un verdict rendu entre-temps s'effacerait.
        private readonly Dictionary<string, BilletVue> billets = new Dictionary<string, BilletVue>();
        private readonly Dictionary<string, FlagVerdictResponseDto> verdicts = new Dictionary<string, FlagVerdictResponseDto>();
        private int lotSigne;
        private int? jourCourantPose;

        /// <summary>Ce qu'un verdict change sur un billet déjà posé.</summary>
        private sealed class BilletVue
        {
            public CanvasGroup Bulle;
            public Image Jeton, Buste;
            public TextMeshProUGUI Frequence;
            public TextMeshProUGUI Coche, Verbe, Sous;
            public Button Rendre;
            public LongPressButton Garder;
        }
        private RosterRow[] roster;
        private Transform mountParent;
        private DailyReviewClient client;
        private string token;
        private bool initialized;

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            client = new DailyReviewClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ⛔ SANS DÉCLENCHEUR, L'ÉCRAN S'OUVRE VIDE — et c'est un précédent MESURÉ de ce dépôt, pas
        // une précaution : `LieutenantScreenController` a livré un écran affichant « aucun
        // lieutenant » à un compte qui en possédait DEUX, parce que le chargement du roster n'avait
        // qu'un seul appelant — un bouton de mise au point. Ici, `LoadReview` et `LoadRoster`
        // n'avaient AUCUN appelant de production : l'écran se serait monté sur un comptoir vide et
        // aurait eu l'air correct.
        //
        // ⇒ Le déclencheur est le CONTRAT DU SHELL, pas une seconde authentification. `AppShell`
        // tient déjà le jeton et le remet à chaque locataire par `IShellTenant.SetToken` — ma
        // première version rouvrait un `signin` à elle, c'est-à-dire un second chemin d'auth pour
        // un jeton déjà acquis. Et ne pas implémenter cette interface était une ERREUR DE
        // COMPILATION, pas un oubli silencieux : `MountTenant<T>` la contraint.
        /// <summary>⛔ ET LE PARENTAGE SE FAIT ICI, PAS DANS `BuildLayout()`. Mesuré sur la première
        /// capture réussie : les cinq billets se sont empilés dans une colonne de largeur nulle,
        /// tous les textes superposés. Cause — `BuildLayout()` est appelé depuis `Awake()`, donc
        /// AVANT que le shell n'appelle `SetMountParent` : `mountParent` y valait null, les ancres
        /// de plein écran n'étaient jamais posées, et la racine gardait une largeur de zéro.
        /// *Un rect de largeur nulle ne casse rien et ne lève rien : il laisse tout déborder au
        /// centre, ce qui ressemble à un défaut de mise en page et n'en est pas un.*</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            EnsureInitialized();
            if (parent == null) return;
            transform.SetParent(parent, false);
            RectTransform rt = (RectTransform)transform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            // ⛔⛔ ET L'ORDRE DE FRATRIE DÉCIDE DE CE QU'ON VOIT. Mesuré le 2026-09-02 sur deux
            // captures : `rect=1280x960`, `frere=1/8` — l'écran était de la BONNE taille, au BON
            // endroit, sous le BON canvas, et SIX frères se dessinaient par-dessus. La capture
            // montrait la carte de la ville, l'autonomie et le dock ; l'écran, nulle part.
            // ⇒ Un locataire monté en surimpression doit être le DERNIER enfant, sinon il est
            // rendu dessous. C'est une propriété STRUCTURELLE — elle ne dépend d'aucun pixel,
            // d'aucune résolution, d'aucune couleur — et c'est la seule classe de garde qui ait
            // fermé ce genre de défaut ici.
            transform.SetAsLastSibling();
        }


        /// <summary>⛔⛔ CE HOOK-CI EST LE BON, ET LES DEUX PRÉCÉDENTS ÉTAIENT DÉCORATIFS.
        /// Lu dans le corps du shell (`AppShell.ConstruireLocataire`), pas déduit :
        ///   1. `host = new GameObject(...)`      — créé à la racine, SANS parent
        ///   2. `host.transform.SetParent(slot)`  — le parent change ICI
        ///   3. `host.AddComponent&lt;T&gt;()`         — le composant naît APRÈS
        ///   4. `tenant.SetMountParent(slot)`     — puis `SetToken`, même frame
        /// ⇒ `OnTransformParentChanged` ne pouvait JAMAIS tirer : au moment du re-parentage,
        /// ce composant n'existait pas. Un dispositif qui nomme un mécanisme réel et ne
        /// s'exécute jamais — et il a survécu deux runs en passant pour un correctif, parce que
        /// six écrans sur sept étaient déjà derniers SANS lui.
        /// ⇒ Et poser l'ordre en (4) ne suffit pas non plus : la mesure dit `frère 6 sur 11`,
        /// donc des frères s'ajoutent APRÈS la fenêtre synchrone du montage.
        /// ⇒ `Start()` s'exécute à la frame SUIVANTE — après tout ce que le shell fait en
        /// synchrone. C'est le premier instant où « être dernier » est stable.
        /// ★ La leçon vaut plus que la ligne : *avant d'écrire un hook, lire le CORPS de ce qui
        /// l'appelle, et se demander si l'événement qu'il observe peut seulement se produire.*</summary>
        private void Start()
        {
            if (transform.parent != null) transform.SetAsLastSibling();
        }


        public void SetToken(string bearer)
        {
            EnsureInitialized();
            token = bearer;
            if (!string.IsNullOrEmpty(bearer)) StartCoroutine(Charger(bearer));
        }

        private IEnumerator Charger(string bearer)
        {
            yield return LoadReview(bearer);
            yield return LoadRoster(bearer);
        }

        /// <summary>Design C8-F3 — the screen opens WHEN the server boolean is true, and stays
        /// closed when false. A value read, never re-derived client-side.</summary>
        public void ApplyAutoOpen(bool serverAutoOpen)
        {
            EnsureInitialized();
            IsOpen = serverAutoOpen;
        }

        public IEnumerator LoadReview(string bearerToken)
        {
            EnsureInitialized();
            token = bearerToken;
            FlagReviewResponseDto recu = null;
            yield return client.GetFlagReview(token, dto => recu = dto, (c, m) => { });
            if (recu != null) AppliquerRevue(recu);
        }

        /// <summary>Le seul chemin par lequel une revue chargée devient un écran — celui de
        /// `LoadReview`, et celui des tests qui posent un corps sans passer par le réseau. Un seul
        /// chemin, pour qu'une garde qui l'exerce exerce ce que le joueur voit.</summary>
        public void AppliquerRevue(FlagReviewResponseDto revue)
        {
            EnsureInitialized();
            LastLoadedReview = revue;
            if (revue != null) Render(revue.cards);
        }

        // ---- test hooks : le tampon, tel qu'il est posé sur le zinc ------------------------------
        public bool TamponPresent => tamponRoot != null && tamponRoot.activeSelf;
        public string TamponLibelleTexte => tamponLibelle != null ? tamponLibelle.text : null;
        public string TamponSousTexte => tamponSous != null ? tamponSous.text : null;
        public bool PlaqueDuMatinPresente => plaqueVide != null && plaqueVide.activeSelf;
        public TextMeshProUGUI PlaqueDuMatinSurtitre => plaqueSurtitre;
        public TextMeshProUGUI PlaqueDuMatinTitre => emptyStateText;
        public RevueDuJourDecor Decor => decor;
        public bool TabouretsPresents => tabourets != null && tabourets.activeSelf;

        public IEnumerator ValidateFlag(string flagId)
        {
            EnsureInitialized();
            ValidateRequestCount++;
            LastValidateError = null;
            yield return client.Validate(token, flagId, dto => AppliquerVerdict(flagId, dto), (c, m) => LastValidateError = $"{c}: {m}");
        }

        public IEnumerator DismissFlag(string flagId)
        {
            EnsureInitialized();
            DismissRequestCount++;
            LastDismissError = null;
            yield return client.Dismiss(token, flagId, dto => AppliquerVerdict(flagId, dto), (c, m) => LastDismissError = $"{c}: {m}");
        }

        /// <summary>Wired to `BatchConfirmButton.OnLongPressCompleted` — design C8-F2: batch confirm
        /// REQUIRES the long press, a tap emits nothing (the button's OWN gesture gate already
        /// filters that; this method fires only on a genuine completion).</summary>
        public IEnumerator RequestBatchConfirm()
        {
            EnsureInitialized();
            BatchConfirmRequestCount++;
            LastBatchConfirmError = null;
            yield return client.BatchConfirm(token,
                dto => { LastBatchConfirmedCount = dto.batch_confirmed_count; AppliquerLotSigne(dto.batch_confirmed_count); },
                (c, m) => LastBatchConfirmError = $"{c}: {m}");
        }

        // --------------------------------------------------------------- render

        // Toutes les dimensions ci-dessous sont celles de la RÉFÉRENCE (px CSS du téléphone de
        // 300), multipliées par ce facteur. Les écrire en dur, converties, ferait perdre le lien
        // avec la maquette — et c'est ce lien qui permet de rejuger sans re-deviner.
        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        // ⑯ / TD-612 — HUIT DE CES QUATORZE COULEURS RECOPIAIENT LA VALEUR D'UN TOKEN NOMMÉ.
        // Valeur juste, chemin faux : l'écran rendait exactement la bonne teinte, et aucune garde
        // ne pouvait le voir — les allowlists comptent les ACCÈS à `DesignTokens.Current.*` (un
        // littéral n'en est pas un) et un juge de pixels rend « conforme » tant que la valeur
        // coïncide. Le défaut ne se serait manifesté que le jour où la palette bouge : les huit
        // écrans seraient restés à l'ancienne teinte, en silence.
        // ⇒ Appariement MESURÉ, jamais choisi au nom — `Tools/apparier-litteraux-aux-tokens.py`,
        //   distances toutes à 0,00. Et c'est bien un appariement par la VALEUR, pas par le nom :
        //   « Or » n'est PAS `accentGold` (celui-ci vaut #ffd23f, à 47 d'ici) mais
        //   `hudMoneyUnderlineGold`. Choisir au nom aurait changé la couleur en croyant la ranger.
        //
        // ⛔⛔ ET LA FORME EST `=>`, PAS `= …`. Un `static readonly Color X = DesignTokens.Current.Y`
        //    s'évalue à l'initialisation du TYPE, donc en contexte de constructeur, où le
        //    `Resources.Load` de `DesignTokens.Current` JETTE. Ce dépôt a mesuré la conséquence :
        //    65 champs de cette forme étaient VERTS en run complet (un test antérieur avait chauffé
        //    le cache) et ROUGES en run scopé à froid. Il ne reste aujourd'hui aucun champ de cette
        //    forme dans `Assets/Scripts` — cette réparation n'en réintroduit pas un.
        private static Color Creme      => DesignTokens.Current.hudCreme;                // #eae0c8
        private static Color Creme2     => DesignTokens.Current.hudCremeSecondary;       // #b9ad92
        private static Color Or         => DesignTokens.Current.hudMoneyUnderlineGold;   // #d9ab4e
        private static Color OrVif      => DesignTokens.Current.hudMoneyGold;            // #f2c96b
        private static Color Laiton     => DesignTokens.Current.hudHairlineGold;         // #b08d3e
        private static Color Braise     => DesignTokens.Current.hudGaugeArcHot;          // #e0664a
        private static Color Cyan       => DesignTokens.Current.hudGaugeArcCold;         // #7fd4d9
        private static Color Vert       => DesignTokens.Current.accentCalm;              // #7db36a

        // LES SIX SUIVANTES RESTENT DES LITTÉRAUX, ET C'EST UNE DÉCISION, PAS UN OUBLI. Aucune n'a
        // de token à moins de 4 (la plus proche est à 13,2, la plus lointaine à 52,0 — mesuré) :
        // c'est la palette du PAPIER, propre à cet écran, que rien dans les tokens ne porte. Les
        // convertir demanderait de CRÉER des tokens, c'est-à-dire un arbitrage de palette qui
        // appartient à l'atelier. Substituer une valeur ne serait pas ranger, ce serait repeindre.
        private static readonly Color PapierHaut = Hex("#efe4c6");
        private static readonly Color PapierBas  = Hex("#dccfa9");
        private static readonly Color EncrePapier = Hex("#2b1d0e");
        private static readonly Color EncrePapier2 = Hex("#5a4629");
        private static readonly Color Rouge     = Hex("#93402c");
        private static readonly Color VertCachet = Hex("#4f7f3f");

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        private void Render(FlagCardDto[] cards)
        {
            for (int i = rowsRoot.childCount - 1; i >= 0; i--) UnityEngine.Object.Destroy(rowsRoot.GetChild(i).gameObject);
            billets.Clear();

            int enAttente = LastLoadedReview != null ? LastLoadedReview.routine_pending_count : 0;
            // ⛔⛔ LE TAMPON SUIT LE BOOLÉEN DU BACK, Y COMPRIS SUR UNE FILE VIDE — ET C'EST UNE DÉCISION RATIFIÉE.
            // Une version précédente exigeait aussi « au moins une carte affichée ». Elle partait d'une
            // mesure juste (compte de démo : `cards: []`, `routine_pending_count: 156`,
            // `batch_confirm_available: TRUE`) et d'une crainte juste : un geste irréversible sur des
            // routines jamais vues. Mais la décision n'était pas au client, elle était déjà prise :
            // le cadre v4-1 « personne au comptoir », ratifié par l'user (« nickel »), dessine le tampon
            // « CONFIRMER LA ROUTINE · 9 » sur une journée SANS signalement. Clore la journée quand
            // personne n'a rien demandé, c'est le geste même de cet écran.
            // ⇒ Ce qui répond à la crainte est dans la maquette, pas dans une garde : le compte est
            //   affiché EN ENTIER (JD-E3) et le geste exige un APPUI LONG (JD-E5).
            // ⇒ Le back l'accepte, lu dans le CORPS (pas le docblock) : `batchConfirm` →
            //   `UPDATE routine_items … WHERE status='pending'` (`flag-discipline.repository.ts:669-676`),
            //   sans aucune condition sur les signalements ; `batch_confirm_available =
            //   routinePendingCount > 0` (`flag-discipline.service.ts:295`).
            // ★ La garde retirée n'était pas fausse sur le risque. Elle était plus STRICTE que le produit,
            //   et c'est l'écran qui en payait le prix : juge-visuel r1 (2026-09-06), F2 BLOQUANT,
            //   « l'action qui referme l'écran n'existe pas ».
            bool tamponDisponible = LastLoadedReview != null && LastLoadedReview.batch_confirm_available;

            if (cards == null || cards.Length == 0)
            {
                RenderedEmptyState = true;
                RenderedCardCount = 0;
                plaqueVide.SetActive(true);
                tabourets.SetActive(true);
                decor.AppliquerEtat(vide: true);
                // « Personne au comptoir » — trois tabourets vides, le registre et son tampon. Le
                // texte est la scène, pas un état d'erreur : c'est une bonne nouvelle, pas un vide
                // technique. Le compte des routines est porté par le REGISTRE, et le tampon offre le
                // geste qui les traite (v4-1) : le nombre affiché a toujours son geste en face.
                // Mot pour mot le cadre v4-1. L'ancienne phrase (« Personne au comptoir ce matin. »)
                // était la LÉGENDE du cadre, pas son texte : sa clé servie devient orpheline (⑯-2).
                plaqueSurtitre.text = Lib("bloc", "Ce matin, au Verge d’Or");
                emptyStateText.text = Lib("bloc", "Vos lieutenants ont tenu la ligne — rien ne réclame votre parole");
                MajRegistre(enAttente, tamponDisponible, 0);
                return;
            }

            RenderedEmptyState = false;
            plaqueVide.SetActive(false);
            tabourets.SetActive(false);
            decor.AppliquerEtat(vide: false);
            RenderedCardCount = cards.Length;
            foreach (FlagCardDto card in cards) AddRow(card);
            foreach (var v in verdicts) PeindreVerdict(v.Key, v.Value);
            MajRegistre(enAttente, tamponDisponible, cards.Length);
        }

        /// <summary>Le registre et son tampon. « tenue sans vous · N » est `routine_pending_count`
        /// EN ENTIER (arbitrage JD-E3, ratifié tel que dessiné) ; le tampon n'existe que si
        /// `batch_confirm_available` — son absence n'est pas un bouton grisé, c'est un objet qui
        /// n'est pas sur le zinc.</summary>
        private void MajRegistre(int enAttente, bool tamponDisponible, int signalements)
        {
            if (registreCompte != null) registreCompte.text = enAttente.ToString();
            if (tamponRoot != null)
            {
                tamponRoot.SetActive(tamponDisponible);
                if (tamponLibelle != null) tamponLibelle.text = Lib("bloc", "CONFIRMER LA ROUTINE · ") + enAttente;
                // Sans signalement : la phrase du cadre v4-1, mot pour mot — le tampon clôt la journée,
                // « rien d’autre ne vous attend ». (Avant ⑯-1, cette branche disait « appui long » nu :
                // elle ne s'affichait jamais, la garde retirait le tampon avant.)
                if (tamponSous != null)
                    tamponSous.text = signalements > 0
                        ? "appui long — les " + signalements + " signalements restent à votre main"
                        : Lib("bloc", "appui long — rien d’autre ne vous attend");
                if (lotSigne > 0) PeindreLotSigne();
            }
        }

        /// <summary>Un « billet » : le médaillon du buste, la bulle où il parle, la colonne du
        /// jeton. Le nom vient de la maquette — c'est ce qu'on pose sur un zinc.</summary>
        private void AddRow(FlagCardDto card)
        {
            GameObject billet = new GameObject("Billet_" + card.flag_id, typeof(RectTransform));
            billet.transform.SetParent(rowsRoot, false);
            HorizontalLayoutGroup hlg = billet.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = Px(7f);
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            // ⚠️ `childForceExpandWidth` DOIT RESTER FAUX. Mis à vrai pour réparer le débordement,
            // il a étiré le médaillon et le jeton en ELLIPSES larges — le correctif d'un défaut de
            // largeur qui en fabrique un autre, un cran plus loin. Ce qui règle vraiment le
            // débordement est `preferredWidth = 0` sur la bulle (voir plus bas) : elle cesse de
            // réclamer la largeur de son texte non coupé, et son `flexibleWidth` lui donne le
            // reste. Les deux voisins gardent alors leur taille carrée.
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;
            hlg.childAlignment = TextAnchor.LowerLeft;

            // ── le buste ─────────────────────────────────────────────────────────────────────
            // ⑯-5 → ⑯-9 — le médaillon du billet (`.medl` + `.billet .medl` : carré arrondi 40, rayon 14, face radiale, rayons
            // blancs .05, bord 1px laiton, buste posé en bas à 74 %) passe par `MedaillonAuComptoir` (ShellContracts), le MÊME
            // code que la file de ⑨ : deux codes du même médaillon divergeraient au premier correctif. Le buste reste
            // `ui_element_buste_lieutenant` pour tout lieutenant (arbitrage de l'orchestrateur, atelier 09-…, d2bf698b).
            // ⚠️ ⑥ emploie 0,688 et 3,6 % : des corrections MESURÉES par un juge sur SON médaillon rond. La CSS fait foi ici.
            Sprite silhouette = Resources.Load<Sprite>(BusteLieutenant);
            GameObject medl = MedaillonAuComptoir.Construire(billet.transform, "Medaillon", Px(40f), Px(14f), Px(1f), silhouette);
            Transform busteT = medl.transform.Find("Buste");
            Image buste = busteT != null ? busteT.GetComponent<Image>() : null;

            // ── la bulle : c'est LUI qui parle ───────────────────────────────────────────────
            GameObject bulle = new GameObject("Bulle", typeof(RectTransform));
            bulle.transform.SetParent(billet.transform, false);
            // `.billet.fait .bulle { opacity:.72 }` — un groupe, pas une couleur : le verdict l'atténue.
            CanvasGroup bulleGroupe = bulle.AddComponent<CanvasGroup>();
            Image bulleFond = bulle.AddComponent<Image>();
            bulleFond.sprite = ProceduralUI.RoundedRectOutline((int)Px(12f), Px(1f), Hex("#ffffff2a"));
            bulleFond.type = Image.Type.Sliced;
            bulleFond.color = Color.white;
            GameObject bulleVerre = new GameObject("Verre", typeof(RectTransform));
            bulleVerre.transform.SetParent(bulle.transform, false);
            RectTransform bvRt = (RectTransform)bulleVerre.transform;
            bvRt.anchorMin = Vector2.zero; bvRt.anchorMax = Vector2.one;
            bvRt.offsetMin = Vector2.zero; bvRt.offsetMax = Vector2.zero;
            Image bvImg = bulleVerre.AddComponent<Image>();
            bvImg.sprite = ProceduralUI.VerticalGradient((int)Px(60f),
                DesignTokens.Current.lieutenantGlassTop, DesignTokens.Current.lieutenantGlassBottom);
            bvImg.type = Image.Type.Sliced;
            bulleVerre.transform.SetAsFirstSibling();

            VerticalLayoutGroup bvlg = bulle.AddComponent<VerticalLayoutGroup>();
            bvlg.padding = new RectOffset((int)Px(9f), (int)Px(9f), (int)Px(6f), (int)Px(7f));
            bvlg.spacing = Px(2f);
            bvlg.childControlWidth = true;
            bvlg.childControlHeight = true;
            bvlg.childForceExpandWidth = true;
            bvlg.childForceExpandHeight = false;
            LayoutElement bulleLe = bulle.AddComponent<LayoutElement>();
            // ⛔ `preferredWidth = 0` EST LE POINT QUI COMPTE. Sans lui, TMP réclame la largeur de
            // sa ligne NON COUPÉE : la bulle demandait des milliers d'unités, poussait la colonne
            // du jeton hors de l'écran, et le débordement se lisait comme un défaut de marge alors
            // que c'était une demande de taille. *Une boîte qui réclame plus que son contenant ne
            // rétrécit pas : elle pousse ses voisins dehors.*
            bulleLe.preferredWidth = 0f;
            bulleLe.flexibleWidth = 1f;

            // ligne « qui » : le nom, ses chips, le jour poussé à droite
            GameObject qui = new GameObject("Qui", typeof(RectTransform));
            qui.transform.SetParent(bulle.transform, false);
            HorizontalLayoutGroup qhlg = qui.AddComponent<HorizontalLayoutGroup>();
            qhlg.spacing = Px(5f);
            qhlg.childControlWidth = true;
            qhlg.childControlHeight = true;
            qhlg.childForceExpandWidth = false;
            qhlg.childAlignment = TextAnchor.MiddleLeft;

            // ⚠️ CE NOM VAUDRA « Lieutenant » POUR TOUT LE MONDE, ET CE N'EST PAS UN DÉFAUT D'ICI.
            // Mesuré côté back : le chemin de recrutement de PRODUCTION écrit le littéral
            // (`lieutenant.service.ts:235`, `name: 'Lieutenant'` — pool de noms localisés différé,
            // spec §11), et l'octroi d'onboarding fait pareil. En base, tous joueurs confondus :
            // « Lieutenant » ×18996, « LT w3u1 » ×474, et deux vrais noms.
            // ⇒ La colonne ACCEPTE un vrai nom, c'est le POOL qui n'existe pas. Cette projection est
            // correcte : elle affiche fidèlement ce que la production écrit. Le juge-données avait
            // raison sur le symptôme (« les noms sont un bouchon ») et à côté sur la cause — ce
            // n'est pas la base qui est bouchonnée, c'est l'écrivain UNIQUE qui écrit une constante.
            // Couvert par TD-046 (pool de noms différé) ; ne pas rouvrir de dette ici.
            string nom = card.lieutenant != null && !string.IsNullOrEmpty(card.lieutenant.name)
                ? card.lieutenant.name
                : "—";
            Texte(qui.transform, "Nom", nom, Px(11.5f), OrVif, DesignTokens.Current.hudSerifFont);

            // ⑯ B05 — « signale rarement / souvent » : `flag_frequency_band`, servie SUR LA CARTE par le lot
            // back S5-e (`71ae6f89`). Absente (pile sans S5) ou inconnue ⇒ aucune chip, jamais « — ».
            TextMeshProUGUI frequence = null;
            string texteFrequence = FrequenceChip(card.flag_frequency_band);
            if (texteFrequence != null) frequence = Chip(qui.transform, texteFrequence.ToUpperInvariant(), Creme2);
            // La chip « NOUVELLE » vient de la JOINTURE client sur `GET /v1/lieutenants` (`tenure_bucket`).
            string anciennete = AncienneteChip(card.lieutenant != null ? card.lieutenant.id : null);
            if (!string.IsNullOrEmpty(anciennete)) Chip(qui.transform, anciennete, Cyan);

            GameObject espace = new GameObject("Espace", typeof(RectTransform));
            espace.transform.SetParent(qui.transform, false);
            espace.AddComponent<LayoutElement>().flexibleWidth = 1f;

            Chip(qui.transform, "J" + card.flagged_game_day, Creme2);

            // sa phrase : le titre, puis le motif en italique
            GameObject phraseGo = new GameObject("Phrase", typeof(RectTransform));
            phraseGo.transform.SetParent(bulle.transform, false);
            TextMeshProUGUI phrase = phraseGo.AddComponent<TextMeshProUGUI>();
            phrase.font = DesignTokens.Current.hudSerifFont;
            phrase.fontSize = Px(10.5f);
            phrase.color = Creme;
            phrase.lineSpacing = -8f;
            phrase.enableWordWrapping = true;
            // ⑯-4 — LA PHRASE DU LIEUTENANT, choisie par `descriptor.key` (une clé par générateur).
            // Avant : `Lisible()` découpait la clé technique (« Front shop reconciliation ») — un
            // pis-aller déclaré, que le bundle NE POUVAIT PAS remplacer : il sert bien
            // `routine.*.descriptor` et `reason.*`, mais à paramètres OPAQUES (`{route_id}`,
            // `{building_id}`… — S5-a) et dans le registre d'une fiche (« Caisse — {building_id} »).
            // La maquette ratifiée (v4-0) fait parler le lieutenant, sans aucun paramètre.
            // ⚠️ La table s'indexe sur `descriptor.key`, PAS sur `flag_reason.key` : les générateurs
            //    de production écrivent un motif par générateur, mais le seam de test `force-flag`
            //    écrit le motif générique `reason.deviation_detected` sur toutes ses cartes (corps
            //    réel du 25/08). Indexée sur le motif, la table dirait la même phrase partout.
            (string titre, string motif) = PhraseDuBillet(card);
            // ⛔ LE NEUVIÈME LITTÉRAL DE CET ÉCRAN VIVAIT ICI, DANS UNE BALISE DE TEXTE RICHE — et
            //    c'est le site que les DEUX instruments rataient. Il ne s'écrit pas `Hex("#…")` mais
            //    `<color=#…>` au milieu d'une chaîne : le motif de la garde exigeait un guillemet
            //    collé au dièse, donc il ne mordait pas. *Deux formulations du même faux demandent
            //    deux motifs* — la garde en porte désormais un troisième, avec son contrôle.
            //    La teinte se dérive du token, jamais recopiée : elle suivra la palette.
            string gris = ColorUtility.ToHtmlStringRGB(DesignTokens.Current.hudCremeSecondary);
            // Le motif PORTE son tiret (« — l’horaire… ») : c'est lui qui est en italique, comme le
            // `<i> — …</i>` du cadre.
            phrase.text = string.IsNullOrEmpty(motif)
                ? titre
                : titre + "<i><color=#" + gris + "> " + motif + "</color></i>";
            DernierePhrase = phrase.text;

            // ── la colonne du jeton : le geste ───────────────────────────────────────────────
            GameObject col = new GameObject("JetonCol", typeof(RectTransform));
            col.transform.SetParent(billet.transform, false);
            VerticalLayoutGroup cvlg = col.AddComponent<VerticalLayoutGroup>();
            cvlg.spacing = Px(1f);
            cvlg.childControlWidth = true;
            cvlg.childControlHeight = true;
            // le jeton est un DISQUE : étiré à la largeur de sa colonne il devient un ovale, et la
            // troisième capture le montrait sur les cinq billets. Même cause que les médaillons, un
            // conteneur plus loin — *un correctif de largeur se vérifie sur CHAQUE conteneur qui
            // porte un objet rond, pas seulement sur celui qu'on vient de toucher.*
            cvlg.childForceExpandWidth = false;
            cvlg.childForceExpandHeight = false;
            cvlg.childAlignment = TextAnchor.MiddleCenter;
            LayoutElement colLe = col.AddComponent<LayoutElement>();
            colLe.preferredWidth = Px(50f);
            colLe.flexibleWidth = 0f;
            colLe.flexibleHeight = 0f;

            GameObject jeton = new GameObject("Jeton", typeof(RectTransform));
            jeton.transform.SetParent(col.transform, false);
            Image jetonImg = jeton.AddComponent<Image>();
            jetonImg.sprite = ProceduralUI.RadialDisc((int)Px(34f), Hex("#f2d9a0"), Hex("#7a5a14"));
            LayoutElement jetonLe = jeton.AddComponent<LayoutElement>();
            jetonLe.preferredWidth = Px(34f);
            jetonLe.preferredHeight = Px(34f);
            jetonLe.flexibleWidth = 0f;
            TextMeshProUGUI coche = Texte(jeton.transform, "Coche", "✓", Px(13f), Hex("#3a2a12"), DesignTokens.Current.primaryFont,
                  TextAlignmentOptions.Center, true);

            // LE GESTE, et il porte les deux verdicts sur le MÊME objet — c'est la maquette :
            // toucher = rendre, garder = passer outre. `LongPressButton` n'expose que la
            // complétion ; le `Button` tirerait AUSSI au relâchement d'un appui long, donc on
            // consomme le geste explicitement plutôt que de laisser les deux partir.
            LongPressButton garder = jeton.AddComponent<LongPressButton>();
            bool consomme = false;
            garder.OnLongPressCompleted += () =>
            {
                consomme = true;
                StartCoroutine(DismissFlag(card.flag_id));
            };
            Button rendre = jeton.AddComponent<Button>();
            rendre.targetGraphic = jetonImg;
            rendre.onClick.AddListener(() =>
            {
                if (consomme) { consomme = false; return; }
                StartCoroutine(ValidateFlag(card.flag_id));
            });

            TextMeshProUGUI verbe = Texte(col.transform, "Rendre", "RENDRE", Px(7.5f), OrVif,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            TextMeshProUGUI sous = Texte(col.transform, "Garder", "garder · appui long", Px(6.3f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            billets[card.flag_id ?? ""] = new BilletVue
            {
                Bulle = bulleGroupe, Jeton = jetonImg, Buste = buste, Frequence = frequence,
                Coche = coche, Verbe = verbe, Sous = sous,
                Rendre = rendre, Garder = garder,
            };

            // la réserve — `trust_budget_bucket`, trois pastilles
            GameObject reserve = new GameObject("Reserve", typeof(RectTransform));
            reserve.transform.SetParent(col.transform, false);
            HorizontalLayoutGroup rhlg = reserve.AddComponent<HorizontalLayoutGroup>();
            rhlg.spacing = Px(2f);
            rhlg.childControlWidth = true;
            rhlg.childControlHeight = true;
            rhlg.childForceExpandWidth = false;
            rhlg.childAlignment = TextAnchor.MiddleCenter;
            int allumees = ReservePastilles(card.trust_budget_bucket);
            for (int k = 0; k < 3; k++)
            {
                GameObject pip = new GameObject("Pip" + k, typeof(RectTransform));
                pip.transform.SetParent(reserve.transform, false);
                Image pi = pip.AddComponent<Image>();
                pi.sprite = k < allumees
                    ? ProceduralUI.RadialDisc((int)Px(9f), Hex("#f2d9a0"), Hex("#7a5a14"))
                    : ProceduralUI.Ring((int)Px(9f), Px(1f), Hex("#ffffff22"));
                LayoutElement pl = pip.AddComponent<LayoutElement>();
                pl.preferredWidth = Px(9f);
                pl.preferredHeight = Px(9f);
                pl.flexibleWidth = 0f;
            }
            Texte(col.transform, "ReserveLib", "RÉSERVE · " + ReserveLibelle(card.trust_budget_bucket),
                  Px(5.8f), Creme2, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
        }

        // ---------------------------------------------------------- ⑯-3 après vos verdicts

        /// <summary>⑯-3 — cadre v4-2 « après vos verdicts ». Un verdict ne retire pas le billet :
        /// il reste sur le zinc, ATTÉNUÉ, et son jeton dit ce que la décision a coûté. La réponse du
        /// back était jetée (`dto => { }`), alors qu'elle porte la seule clé qui rend l'économie du
        /// jeton visible au moment où elle se joue : `token_returned` (juge-données Q2 ★★★,
        /// `flag-discipline.service.ts:65-69` ; `true` sur validate `:223`, `false` sur dismiss `:262`).
        /// Même chemin pour le jeu et pour les tests.</summary>
        public void AppliquerVerdict(string flagId, FlagVerdictResponseDto verdict)
        {
            if (string.IsNullOrEmpty(flagId) || verdict == null || !verdict.resolved) return;
            verdicts[flagId] = verdict;
            PeindreVerdict(flagId, verdict);
        }

        private void PeindreVerdict(string flagId, FlagVerdictResponseDto verdict)
        {
            if (!billets.TryGetValue(flagId, out BilletVue b)) return;
            // `.billet.fait .bulle { opacity:.72 }`. ⚠️ Opacité de GROUPE, appliquée telle quelle : le
            // navigateur compose en sRGB et ce projet en linéaire, donc l'atténuation perçue diffère un
            // peu — aucun ajustement n'existe pour un groupe (il vaut pour une couleur sur un fond).
            // Non repris : `.billet.fait .medl { filter:saturate(.7) }` (aucun filtre en uGUI).
            b.Bulle.alpha = 0.72f;
            // Le geste est consommé : un second appel rend 409 (juge-données, E5 mesuré).
            b.Rendre.interactable = false;
            b.Garder.enabled = false;
            if (verdict.token_returned)
            {
                // `.jeton.rendu` : le même or, poussé et tourné — `rotate(-12deg)` en CSS (sens
                // anti-horaire à l'écran) = +12° en z dans Unity. `translateX(-10px)` non repris : le
                // jeton est placé par son groupe de mise en page.
                b.Jeton.rectTransform.localRotation = Quaternion.Euler(0f, 0f, 12f);
                b.Verbe.text = Lib("verdict", "RENDU");
                b.Verbe.color = OrVif;
                b.Sous.text = Lib("verdict", "il garde sa confiance");
            }
            else
            {
                // `.jeton.perdu` : radial #3a3f4a → #1c2029, la marque en `--braise`, le verbe aussi. Le cœur passe par
                // le token `mapChipBg` (#383d4c, d = 3,5 : TD-612, garde Palette) ; #1c2029 n'a aucun token proche.
                b.Jeton.sprite = ProceduralUI.RadialDisc((int)Px(34f), DesignTokens.Current.mapChipBg, Hex("#1c2029"));
                b.Coche.text = "✕";
                b.Coche.color = Braise;
                b.Verbe.text = Lib("verdict", "PERDU");
                b.Verbe.color = Braise;
                b.Sous.text = TexteRemise(JourCourant());
            }
        }

        /// <summary>« remise dans N jours » — DÉRIVÉ, aucune clé ne le porte (juge-données Q7) :
        /// les jetons se remettent à plat quand l'époque hebdomadaire avance,
        /// `week_epoch = floor(game_day / 7)` (`flag-weekly-reset-tick.service.ts:22`), donc la
        /// prochaine remise tombe au jour 7·(⌊j/7⌋+1), soit dans 7 − (j mod 7) jours. Jour 12 ⇒ 2 :
        /// exactement le cadre v4-2.
        /// ⚠️ Déduit de la source, pas observé : le tick WEEKLY tire à une minute qui n'est pas
        /// forcément le début du jour. Jour inconnu ⇒ la phrase de l'annexe de la maquette, sans
        /// chiffre, plutôt qu'un chiffre inventé.</summary>
        public static string TexteRemise(int? jourCourant)
        {
            if (jourCourant == null || jourCourant.Value < 0)
                return Lib("verdict", "jusqu’à la remise hebdomadaire");
            int n = 7 - (jourCourant.Value % 7);
            return n == 1 ? Lib("verdict", "remise demain") : "remise dans " + n + " jours";
        }

        /// <summary>Le jour courant n'est pas dans `GET /v1/flag-review` (S5-g) : il vient de
        /// `session/open.opened_game_day`, que le shell tient déjà. Lu comme ⑤ le lit
        /// (`DecisionDetailScreenController.cs:153`) — sans toucher `AppShell`.</summary>
        private int? JourCourant()
        {
            if (jourCourantPose.HasValue) return jourCourantPose;
            AppShell shell = FindFirstObjectByType<AppShell>();
            return shell != null && shell.LastSessionOpen != null ? shell.LastSessionOpen.opened_game_day : (int?)null;
        }

        /// <summary>Test hook — pose le jour courant sans shell ni session.</summary>
        public void PoserJourCourant(int jour) => jourCourantPose = jour;

        /// <summary>⑯-3 — le tampon après l'appui long : `batch_confirmed_count` (`service.ts:311`)
        /// était stocké et jamais rendu. Cadre v4-2 : « 17 ROUTINES SIGNÉES · d’un seul appui — le
        /// registre est clos pour aujourd’hui », tampon vert, cachet « SIGNÉ ».
        /// ⚠️ Un compte de 0 (second appel, idempotent — D13) ne signe RIEN : la maquette ne dessine
        /// pas cet état, et « 0 ROUTINES SIGNÉES » affirmerait un geste qui n'a rien fait.</summary>
        public void AppliquerLotSigne(int confirmees)
        {
            if (confirmees <= 0) return;
            lotSigne = confirmees;
            PeindreLotSigne();
        }

        private void PeindreLotSigne()
        {
            if (tamponRoot == null) return;
            tamponFond.color = Hex("#dccfa9");
            tamponBord.sprite = ProceduralUI.RoundedRectOutline((int)Px(11f), Px(2f), VertCachet);
            tamponLibelle.text = lotSigne + Lib("bloc", " ROUTINES SIGNÉES");
            tamponLibelle.color = VertCachet;
            tamponSous.text = Lib("bloc", "d’un seul appui — le registre est clos pour aujourd’hui");
            tamponSous.color = VertCachet;
            tamponCachet.SetActive(true);
            BatchConfirmButton.enabled = false;
        }

        // ---- test hooks : un billet après son verdict, le tampon après le lot -------------------
        public bool BilletGesteActif(string flagId) =>
            billets.TryGetValue(flagId, out BilletVue b) && b.Rendre.interactable && b.Garder.enabled;
        public float BilletBulleAlpha(string flagId) => billets.TryGetValue(flagId, out BilletVue b) ? b.Bulle.alpha : -1f;
        public string BilletVerbe(string flagId) => billets.TryGetValue(flagId, out BilletVue b) ? b.Verbe.text : null;
        public string BilletSous(string flagId) => billets.TryGetValue(flagId, out BilletVue b) ? b.Sous.text : null;
        public string BilletCoche(string flagId) => billets.TryGetValue(flagId, out BilletVue b) ? b.Coche.text : null;
        public RectTransform Registre => registreRoot;
        /// <summary>Le texte de la chip de fréquence du billet, ou null s'il n'en porte pas.</summary>
        public string BilletFrequence(string flagId) =>
            billets.TryGetValue(flagId, out BilletVue b) && b.Frequence != null ? b.Frequence.text : null;
        public Image BilletBuste(string flagId) => billets.TryGetValue(flagId, out BilletVue b) ? b.Buste : null;
        public bool TamponSigne => lotSigne > 0 && tamponCachet != null && tamponCachet.activeSelf;
        public bool TamponGesteActif => BatchConfirmButton != null && BatchConfirmButton.enabled;
        public Image TamponFond => tamponFond;

        // ------------------------------------------------------------------ ⑯-4 la phrase

        /// <summary>Test hook — le texte riche de la phrase du dernier billet posé.</summary>
        public string DernierePhrase { get; private set; }

        private const string PrefixeRoutine = "core_loops.flag_discipline.routine.";

        // ------------------------------------------------------------------ ⑯-8 la phrase de v4-3

        /// <summary>⑯-8 — la phrase d'un billet, choisie par ce que la carte porte :
        ///   · un SUJET résolu (`subject_name_i18n`, clé servie) ET une condition (`deviation_condition`) ⇒ la
        ///     phrase de v4-3, sujet en gras (`PhraseDeCondition`) ;
        ///   · sinon ⇒ la phrase de v4-0 de son générateur (`PhraseDe`), celle d'aujourd'hui. Tant que la pile
        ///     ne sert pas S5, rien ne change à l'écran.</summary>
        public static (string titre, string motif) PhraseDuBillet(FlagCardDto card)
        {
            string descriptorKey = card != null && card.descriptor != null ? card.descriptor.key : null;
            string sujet = card != null ? SujetResolu(card.subject_name_i18n) : null;
            if (sujet != null && card != null && !string.IsNullOrEmpty(card.deviation_condition))
                return PhraseDeCondition(card.deviation_condition, descriptorKey, sujet);
            return PhraseDe(descriptorKey);
        }

        /// <summary>Le nom du sujet, résolu par le catalogue — ou null si la carte n'en porte pas, ou si la clé
        /// n'est pas servie. ⚠️ JAMAIS la clé nue : un billet qui dirait « la tournée game.fiction.route.named »
        /// serait pire que la phrase de v4-0.</summary>
        public static string SujetResolu(SujetRefDto sujet)
        {
            if (sujet == null || string.IsNullOrEmpty(sujet.key)) return null;
            if (!MafiaCleanCity.I18n.I18nCatalog.Connait(sujet.key)) return null;
            var p = new Dictionary<string, string>();
            SujetParamsDto s = sujet.@params;
            if (s != null)
            {
                Poser(p, "enseigne", s.enseigne); Poser(p, "district", s.district); Poser(p, "block", s.block);
                Poser(p, "rang", s.rang); Poser(p, "depart", s.depart); Poser(p, "arrivee", s.arrivee);
                Poser(p, "index", s.index);
            }
            string nom = MafiaCleanCity.I18n.I18nCatalog.Traduire(sujet.key, p);
            return string.IsNullOrWhiteSpace(nom) ? null : nom;
        }

        private static void Poser(Dictionary<string, string> p, string cle, string valeur)
        {
            if (!string.IsNullOrEmpty(valeur)) p[cle] = valeur;
        }

        /// <summary>⑯-8 — les phrases de v4-3, une par `deviation_condition` (atelier
        /// `10-mots-revue-etats-v4-3.md` §3, `8a1ea438`). Le sujet entre NU, sans article, après un nom commun
        /// (« la tournée », « les comptes de ») : un nom libre, « départ → arrivée » et « n° 7 » y entrent sans
        /// accord à calculer. Il est en GRAS (un nom propre) et en `<nobr>` : le nom d'une façade porte son propre
        /// tiret (« Laverie du Quai — Sarnes… »), et l'atelier demande de ne jamais couper la ligne entre le nom
        /// et ce tiret.
        /// Domaine complet (`deviation-condition.ts`, 12 valeurs) — chaque valeur rend une phrase :
        ///   · 4 conditions atteignables en production (tournées, façade) ⇒ leur phrase ;
        ///   · `baseline` et `unrecorded` ⇒ le repli générique (arbitrage de l'orchestrateur : « rien d'anormal » ne
        ///     se prétend pas, et `unrecorded` ne sait pas) ;
        ///   · les 6 conditions du Lek, des précurseurs et de la réserve ⇒ la phrase de v4-0 de leur générateur :
        ///     aucun chemin de production ne les atteint aujourd'hui, et l'atelier écrira leurs phrases avec
        ///     leurs conditions.</summary>
        public static (string titre, string motif) PhraseDeCondition(string condition, string descriptorKey, string sujet)
        {
            string gabarit, motif;
            switch (condition)
            {
                case "route_saturated_or_severed":
                    gabarit = Lib("phrase", "J’ai réacheminé la tournée {sujet}");
                    motif = Lib("phrase", "— l’ancien trajet ne passait plus : saturé, ou coupé.");
                    break;
                case "route_meandering":
                    gabarit = Lib("phrase", "J’ai replanifié la tournée {sujet}");
                    motif = Lib("phrase", "— le trajet fait plus de détours que d’habitude.");
                    break;
                case "audit_pinned":
                    gabarit = Lib("phrase", "J’ai rapproché les comptes de {sujet}");
                    motif = Lib("phrase", "— la façade est épinglée pour un contrôle.");
                    break;
                case "buffer_loaded":
                    gabarit = Lib("phrase", "J’ai rapproché les comptes de {sujet}");
                    motif = Lib("phrase", "— il passe plus d’argent par la caisse que la façade ne peut en justifier.");
                    break;
                case "baseline":
                case "unrecorded":
                    return PhraseDe(null);
                default:
                    return PhraseDe(descriptorKey);
            }
            var p = new Dictionary<string, string> { { "sujet", "<nobr><b>" + sujet + "</b></nobr>" } };
            return (MafiaCleanCity.I18n.IcuFormat.Formater(gabarit, p), motif);
        }

        /// <summary>Le domaine de `deviation_condition`, recopié de `deviation-condition.ts`
        /// (`DEVIATION_CONDITIONS`, back `04f35021`) — exposé pour que les gardes balayent la population ENTIÈRE.</summary>
        public static readonly string[] DomaineConditions =
        {
            "route_saturated_or_severed", "route_meandering", "audit_pinned", "buffer_loaded",
            "dealer_compromised", "lek_rhythm_off", "precursor_scarcity", "precursor_price_rising",
            "stash_filling", "stash_heated", "baseline", "unrecorded",
        };

        /// <summary>⑯ B05 — la chip de fréquence. Domaine : `FlagFrequencyBand = 'none' | 'occasional' |
        /// 'frequent'` (`convergence.ts:35` ; `0` signalement sur 7 jours ⇒ `none`, sous le seuil ⇒ `occasional`).
        /// ⇒ `frequent` → « signale souvent » ; `occasional` → « signale rarement » ; **`none` → AUCUNE chip**.
        /// Tranché par l'atelier (`10-…` §7, `4620fa78`) : la fenêtre compte les signalements des 7 derniers jours,
        /// et chaque billet de ⑯ EST un signalement de ce lieutenant. `none` n'arrive donc que pour un billet de plus
        /// d'une semaine, ce que la chip du jour (« J11 ») dit déjà. Dire « rarement » pour zéro dirait autre chose que
        /// la donnée. (⑦ recevra un mot pour `none`, « ne signale rien » : ce n'est pas ⑯.)
        /// Toute autre valeur (casse comprise) ⇒ null : pas de chip plutôt qu'une bande déguisée.</summary>
        public static string FrequenceChip(string bande)
        {
            switch (bande)
            {
                case "frequent": return Lib("chip", "signale souvent");
                case "occasional": return Lib("chip", "signale rarement");
                default: return null;   // `none` compris : aucune chip (atelier 4620fa78)
            }
        }

        /// <summary>⑯-5 — le buste de TOUT lieutenant de ⑯, le même que ⑥ et ① (`Resources/Lieutenant/`).</summary>
        public const string BusteLieutenant = "Lieutenant/ui_element_buste_lieutenant";

        /// <summary>⑯-4 — la phrase d'un billet : un TITRE à la première personne, au passé composé (ce
        /// que le lieutenant a FAIT de la routine), et un MOTIF qui dit l'écart à l'habitude, jamais un
        /// chiffre ni un nom propre. Une par générateur, indexée sur `descriptor.key`, sans paramètre.
        /// SOURCE : atelier `Tools/atelier-2026-09-22/08-revue-du-jour-phrases-et-decor.md` (`b95dd8c7`).
        ///   · courier_scheduling, lek_rotation, front_shop_reconciliation : le texte de v4-0, RATIFIÉ
        ///     (« nickel », user, 2026-08-25), verbatim.
        ///   · precursor_order, stash_reorder, et le REPLI : propositions de l'atelier dans le même
        ///     registre, **NON RATIFIÉES** (veto de l'user ouvert). Leurs motifs disent l'UNION des
        ///     conditions de leur score, parce que le back calcule la condition et la jette (S5-b) :
        ///     un motif qui en choisirait une mentirait une fois sur deux.
        ///     ⚠️ Ces deux phrases ne peuvent PAS s'afficher aujourd'hui : aucun archétype ne donne les
        ///     rôles 2 ni 9 (`lieutenant-archetype.ts:213`), et `routine-item-generation.service.ts:117`
        ///     saute le signalement faute de lieutenant. Leur preuve est donc un test de la TABLE.
        ///   · le repli couvre une clé absente, inconnue, ou un générateur futur. C'est la phrase honnête
        ///     d'un lieutenant qui signale sans pouvoir dire quoi.
        /// « Vous validez ? » (fin du premier billet de v4-0 seulement, absent de v4-2) n'est PAS une
        /// phrase de générateur : non repris.</summary>
        public static (string titre, string motif) PhraseDe(string descriptorKey)
        {
            string generateur = descriptorKey != null && descriptorKey.StartsWith(PrefixeRoutine)
                                && descriptorKey.EndsWith(".descriptor")
                ? descriptorKey.Substring(PrefixeRoutine.Length,
                                          descriptorKey.Length - PrefixeRoutine.Length - ".descriptor".Length)
                : null;
            switch (generateur)
            {
                case "courier_scheduling":
                    return (Lib("phrase", "J’ai replanifié la tournée des coursiers"),
                            Lib("phrase", "— l’horaire habituel n’a pas été tenu."));
                case "lek_rotation":
                    return (Lib("phrase", "J’ai fait tourner le coin de vente"),
                            Lib("phrase", "— le Lek tournait hors du rythme convenu."));
                case "front_shop_reconciliation":
                    return (Lib("phrase", "J’ai rapproché les comptes de la façade"),
                            Lib("phrase", "— la caisse déclarée s’écarte de l’habitude."));
                case "precursor_order":
                    return (Lib("phrase", "J’ai passé la commande de précurseurs"),
                            Lib("phrase", "— le marché est plus tendu que d’habitude."));
                case "stash_reorder":
                    return (Lib("phrase", "J’ai allégé le stock"),
                            Lib("phrase", "— il était plus chargé, ou plus regardé, que d’habitude."));
                default:
                    return (Lib("phrase", "J’ai suivi la routine"),
                            Lib("phrase", "— quelque chose s’écartait de l’habitude."));
            }
        }

        // ⛔ LA BANDE DU MILIEU S'APPELLE `standard`, PAS `normal` — lue dans le TYPE du back
        //    (`convergence.ts:39` : `TrustBudgetBucket = 'low' | 'standard' | 'high'`), confirmée par le
        //    corps réel `juge-donnees/revue-du-jour/maquette-2026-08-25/mesures/flag-review-standard.json`.
        //    Ces deux tables attendaient `"normal"` : un lieutenant à trois jetons sur cinq s'affichait
        //    0 pastille et « RÉSERVE · — », sans rien signaler, comme une bande inconnue.
        //    Même classe que le badge « NOUVELLE » mort sur `"new"` (`AncienneteChip`) : une valeur
        //    SUPPOSÉE au lieu d'être lue dans le domaine. « NORMALE » reste le MOT de la maquette ; ce
        //    qui change, c'est la valeur servie qui l'allume.
        public static int ReservePastilles(string bucket)
        {
            switch (bucket)
            {
                case "high": return 3;
                case "standard": return 2;
                case "low": return 1;
                default: return 0;
            }
        }

        public static string ReserveLibelle(string bucket)
        {
            switch (bucket)
            {
                case "high": return "ÉLEVÉE";
                case "standard": return "NORMALE";
                case "low": return "FAIBLE";
                default: return "—";
            }
        }

        /// <summary>Jointure client sur `GET /v1/lieutenants` (`tenure_bucket`) — la maquette la
        /// pose explicitement comme faisable SANS lot back. Rendue vide tant que le roster n'est
        /// pas chargé : une chip absente vaut mieux qu'une chip inventée.</summary>
        private string AncienneteChip(string lieutenantId)
        {
            if (string.IsNullOrEmpty(lieutenantId) || roster == null) return null;
            foreach (RosterRow r in roster)
            {
                // ⛔ « new » N'EST PAS UNE VALEUR DE CE DOMAINE — je l'avais supposée par bon sens.
                // `bucketForStreak` (tenure-inertia.ts) ne rend que FRESH | ACCLIMATED | SEASONED |
                // SENIOR | ENTRENCHED. La comparaison était donc morte : le badge « NOUVELLE » ne
                // s'affichait JAMAIS, sur aucun lieutenant, et rien ne le signalait — un badge qui ne
                // s'allume pas ressemble à un badge dont la condition n'est pas remplie.
                if (r != null && r.lieutenant_id == lieutenantId && r.tenure_bucket == "FRESH") return "NOUVELLE";
            }
            return null;
        }

        private static TextMeshProUGUI Texte(Transform parent, string nom, string valeur, float taille,
            Color couleur, TMP_FontAsset police,
            TextAlignmentOptions alignement = TextAlignmentOptions.Left, bool etendre = false)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            if (etendre)
            {
                RectTransform rt = (RectTransform)go.transform;
                rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
                rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            }
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.fontSize = taille;
            t.color = couleur;
            t.text = valeur;
            t.alignment = alignement;
            t.enableWordWrapping = false;
            return t;
        }

        private static TextMeshProUGUI Chip(Transform parent, string libelle, Color couleur)
        {
            GameObject go = new GameObject("Chip", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            Image bord = go.AddComponent<Image>();
            bord.sprite = ProceduralUI.RoundedRectOutline((int)Px(7f), Px(1f), new Color(couleur.r, couleur.g, couleur.b, 0.35f));
            bord.type = Image.Type.Sliced;
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset((int)Px(5f), (int)Px(5f), (int)Px(1f), (int)Px(1f));
            h.childControlWidth = true;
            h.childControlHeight = true;
            h.childForceExpandWidth = false;
            h.childAlignment = TextAnchor.MiddleCenter;
            TextMeshProUGUI t = Texte(go.transform, "Lib", libelle, Px(6.3f), couleur,
                                      DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            t.characterSpacing = 8f;
            return t;
        }

        // --------------------------------------------------------------- UI build

        /// <summary>Le comptoir : les billets en haut, le registre, le tampon. `margin-top:auto`
        /// de la maquette devient un `childAlignment` bas — la scène est ancrée au zinc, pas au
        /// haut de l'écran, et c'est ce qui la fait lire comme un comptoir.</summary>
        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();
            // Le shell donne son emplacement AVANT `Start()` : on s'y parente plutôt que de
            // découvrir un Canvas, sinon l'écran se monte à côté de la zone de contenu.
            if (mountParent != null)
            {
                transform.SetParent(mountParent, false);
                selfRt.anchorMin = Vector2.zero;
                selfRt.anchorMax = Vector2.one;
                selfRt.offsetMin = Vector2.zero;
                selfRt.offsetMax = Vector2.zero;
            }

            VerticalLayoutGroup vlg = gameObject.AddComponent<VerticalLayoutGroup>();
            // ⛔ SANS LES MARGES DE CHROME, LE PREMIER BILLET PASSE SOUS LA TOPBAR ET LE TAMPON SOUS
            // LA BARRE D'ONGLETS — mesuré sur la première capture lisible : les deux étaient à
            // moitié couverts. Le shell publie ses insets pour tout locataire (`ShellChrome`), et
            // ne pas les consommer est le défaut par défaut, pas un cas limite.
            vlg.padding = new RectOffset((int)Px(10f), (int)Px(10f),
                                         (int)ShellChrome.TopInsetPx + (int)Px(6f),
                                         (int)ShellChrome.BottomInsetPx + (int)Px(6f));
            vlg.spacing = Px(8f);
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            vlg.childAlignment = TextAnchor.LowerCenter;

            GameObject rowsGo = new GameObject("FlagRows", typeof(RectTransform));
            rowsGo.transform.SetParent(transform, false);
            VerticalLayoutGroup rvlg = rowsGo.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = Px(8f);
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            rowsRoot = (RectTransform)rowsGo.transform;

            // ⑯-7 — v4-1 : les tabourets vides sont au comptoir, AU-DESSUS de la plaque (ordre du `.comptoir`).
            tabourets = RevueDuJourDecor.ConstruireTabourets(transform);
            tabourets.SetActive(false);
            BuildPlaqueDuMatin();
            BuildRegistre();
            BuildTampon();

            // ⑯-7 — le décor se pose EN DERNIER mais passe PREMIER enfant (`SetAsFirstSibling`) : il est
            // dessiné sous tout le comptoir, et hors de la mise en page (`ignoreLayout`).
            decor = RevueDuJourDecor.Construire(transform);
        }

        /// <summary>⑯-2 — LA PLAQUE DU MATIN (cadre v4-1, « personne au comptoir »). La version
        /// précédente posait une phrase NUE, centrée, grise, en 11 px, sur le noir : le juge ⊥ r1
        /// (2026-09-06) l'a mesurée contre le cadre ratifié — F3 plaque et surtitre absents, F4 or
        /// devenu gris chaud, F6 hauteur de capitale −18,9 %, F7 centrée au lieu de ferrée à gauche.
        /// Tout vient de la CSS du cadre (`ecrans-brennar-4.html`, `.plaque`, `.kicker`, `.titre`),
        /// convertie par `Px`, jamais recopiée à l'œil :
        ///   .plaque  border-radius 14 · padding 11/14/12 ·
        ///            linear-gradient(160deg, rgba(22,33,53,.72), rgba(9,14,24,.88)) ·
        ///            border 1px #ffffff24 · ::before inset 3px, border 1px #ffffff10, radius 11
        ///   .kicker  8px · letter-spacing .22em · uppercase · --creme-2
        ///   .titre   Georgia 15px · --or-vif · letter-spacing .04em · margin-top 2px
        /// ⚠️ F5 (titre « en gras » selon le juge) N'EST PAS repris : la CSS ne pose AUCUNE graisse
        ///    sur `.titre`. L'écart de fût mesuré relève plus probablement de l'arbitrage A1 (famille
        ///    de police Noto/DejaVu) que d'un `font-weight` : poser un gras que la maquette n'écrit
        ///    pas serait corriger l'instrument avec le sujet.</summary>
        private void BuildPlaqueDuMatin()
        {
            // ⑨-6 — le verre vient de `PlaqueAuComptoir`, le code que ⑨ partage (plaque du soir, bloc de l'après-tampon) :
            // même arbre (Verre, Bord, FiletInterieur), mêmes grandeurs, mêmes sprites qu'avant la convergence.
            plaqueVide = PlaqueAuComptoir.Construire(transform, "PlaqueDuMatin", PlaqueAuComptoir.Plaque(Px));

            // texte posé au RENDU, pas ici : `Awake` précède le chargement du catalogue i18n.
            plaqueSurtitre = Texte(plaqueVide.transform, "Surtitre", "",
                                   Px(8f), Creme2, DesignTokens.Current.primaryFont);
            plaqueSurtitre.fontStyle = FontStyles.UpperCase;
            plaqueSurtitre.characterSpacing = 22f;

            emptyStateText = Texte(plaqueVide.transform, "Titre", "", Px(15f), OrVif,
                                   DesignTokens.Current.hudSerifFont);
            emptyStateText.characterSpacing = 4f;
            emptyStateText.enableWordWrapping = true;

            plaqueVide.SetActive(false);
        }

        /// <summary>Un disque plein centré, hors mise en page (⑯-6, l'anneau de la pastille).</summary>
        private static void Disque(Transform parent, string nom, float diametre, Color couleur)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            go.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = rt.pivot = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(diametre, diametre);
            Image img = go.AddComponent<Image>();
            img.sprite = ProceduralUI.RadialDisc((int)diametre, couleur, couleur);
            img.raycastTarget = false;
        }

        private static void Etirer(RectTransform rt, float retrait)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(retrait, retrait);
            rt.offsetMax = new Vector2(-retrait, -retrait);
        }

        /// <summary>Un filet de bord, hors mise en page, en retrait de `retrait` sur les quatre côtés.</summary>
        private static void Filet(Transform parent, string nom, float retrait, float rayon, Color couleur)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            Etirer((RectTransform)go.transform, retrait);
            Image img = go.AddComponent<Image>();
            img.sprite = ProceduralUI.RoundedRectOutline((int)rayon, Px(1f), couleur);
            img.type = Image.Type.Sliced;
            img.raycastTarget = false;
            go.AddComponent<LayoutElement>().ignoreLayout = true;
        }

        /// <summary>Le registre — un papier, pas un panneau : c'est le seul objet clair de l'écran,
        /// et c'est ce qui le fait lire comme un cahier posé sur le zinc.</summary>
        private void BuildRegistre()
        {
            GameObject reg = new GameObject("Registre", typeof(RectTransform));
            reg.transform.SetParent(transform, false);
            Image papier = reg.AddComponent<Image>();
            papier.sprite = ProceduralUI.VerticalGradient((int)Px(40f), PapierHaut, PapierBas);
            papier.type = Image.Type.Sliced;
            registreRoot = (RectTransform)reg.transform;
            // ⑯-6 — F11 : `.registre{transform:rotate(-.4deg)}`. Le cahier est POSÉ de travers sur le zinc : sans
            // cette inclinaison, le juge r1 l'a vu, il « redevient une barre d'interface ». rotate(-.4deg) en CSS
            // (anti-horaire à l'écran) = +0,4° en z. La rotation ne touche pas la mise en page.
            registreRoot.localRotation = Quaternion.Euler(0f, 0f, 0.4f);
            // ⑯-6 — F8 : `.registre::before` — le DOS du livre, 6px à gauche, toute la hauteur,
            // `repeating-linear-gradient(180deg, #93402c 0 6px, #7a3322 6px 12px)`, hors mise en page.
            GameObject tranche = new GameObject("Tranche", typeof(RectTransform));
            tranche.transform.SetParent(reg.transform, false);
            tranche.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform trt = (RectTransform)tranche.transform;
            trt.anchorMin = Vector2.zero;
            trt.anchorMax = new Vector2(0f, 1f);
            trt.pivot = new Vector2(0f, 0.5f);
            trt.offsetMin = Vector2.zero;
            trt.offsetMax = new Vector2(Px(6f), 0f);
            RayuresVerticales.Poser(tranche, Rouge, Hex("#7a3322"), Px(12f));

            HorizontalLayoutGroup h = reg.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(8f), (int)Px(8f));
            h.spacing = Px(8f);
            h.childControlWidth = true;
            h.childControlHeight = true;
            h.childForceExpandWidth = false;
            // ⛔ MESURÉ EN CAPTURE (planche ⑯, 2026-09-04) : sans cette ligne, la valeur par défaut
            // est `true` et la rangée étirait ses enfants sur TOUTE sa hauteur. Ce qu'on voyait :
            // la pastille — un disque de `Px(10)` — rendue en FUSEAU VERT de ~1 300 px, et le
            // compte « 78 » centré au milieu du vide, à quinze centimètres du titre qui le légende.
            // *Un joueur ne pouvait pas relier le nombre à sa phrase.*
            // ★ C'est la MÊME classe que le jeton rendu en ellipse sur ㉜ (un `preferredWidth`
            //   sans plancher dans un groupe qui comprime) : une DIMENSION dictée par le groupe et
            //   non par l'objet. Je l'avais fermée sur cet écran-là, sur l'axe X. Elle vivait
            //   toujours ici, sur l'axe Y. *Fermer une instance ne ferme pas la classe.*
            h.childForceExpandHeight = false;
            h.childAlignment = TextAnchor.MiddleLeft;

            GameObject pt = new GameObject("Pastille", typeof(RectTransform));
            pt.transform.SetParent(reg.transform, false);
            // ⑯-6 — F9 : `.registre .pt{box-shadow:0 0 0 2px #dccfa9, 0 0 0 3px #4f7f3f66}` — le point vert porte
            // un liseré de papier (2px) puis un filet vert à .4 (1px). Le juge r1 : « la pastille perd son anneau ».
            // Trois disques concentriques, du plus grand (dessous) au point (dessus), hors mise en page : la
            // pastille garde sa place de 10. Le filet vert est à .4 sur un fond CONNU, le papier : sa couleur est
            // donc résolue EXACTEMENT pour le mélange linéaire (`CouleurPourMelangeLineaire`), pas recopiée.
            //   fond = le papier à mi-hauteur, milieu de #efe4c6 → #dccfa9 (la pastille est centrée en hauteur).
            Color papierMilieu = Color.Lerp(PapierHaut, PapierBas, 0.5f);
            Color filetVert = ProceduralUI.CouleurPourMelangeLineaire(VertCachet, papierMilieu, 0.4f, out _);
            filetVert.a = 0.4f;
            Disque(pt.transform, "Filet", Px(16f), filetVert);
            Disque(pt.transform, "Lisere", Px(14f), PapierBas);
            Disque(pt.transform, "Point", Px(10f), VertCachet);
            LayoutElement ptLe = pt.AddComponent<LayoutElement>();
            ptLe.preferredWidth = Px(10f);
            ptLe.preferredHeight = Px(10f);
            // `preferred` est un SOUHAIT : un groupe qui force l'expansion le piétine, un groupe
            // qui comprime descend jusqu'au `min` (0 par défaut). Le disque porte donc ses deux
            // bornes, pour qu'aucun des deux régimes ne puisse le déformer.
            ptLe.minWidth = Px(10f);
            ptLe.minHeight = Px(10f);
            ptLe.flexibleWidth = 0f;
            ptLe.flexibleHeight = 0f;

            GameObject quoi = new GameObject("Quoi", typeof(RectTransform));
            quoi.transform.SetParent(reg.transform, false);
            VerticalLayoutGroup qv = quoi.AddComponent<VerticalLayoutGroup>();
            qv.childControlWidth = true;
            qv.childControlHeight = true;
            qv.childForceExpandWidth = true;
            qv.childForceExpandHeight = false;
            quoi.AddComponent<LayoutElement>().flexibleWidth = 1f;
            Texte(quoi.transform, "Titre", "La routine, tenue sans vous", Px(11.5f), EncrePapier,
                  DesignTokens.Current.hudSerifFont);
            Texte(quoi.transform, "Sous", "rien n’a dévié", Px(8f), EncrePapier2,
                  DesignTokens.Current.primaryFont);

            registreCompte = Texte(reg.transform, "Compte", "0", Px(18f), Rouge,
                                   DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Right);
        }

        /// <summary>Le tampon — le MÊME geste que le jeton gardé : appui long. L'arbitrage JD-E5
        /// (ratifié) supprime la feuille de confirmation du canon : l'appui long EST la
        /// confirmation. Un tampon qu'on peut poser d'un doigt distrait ne serait pas un tampon.</summary>
        private void BuildTampon()
        {
            tamponRoot = new GameObject("Tampon", typeof(RectTransform));
            tamponRoot.transform.SetParent(transform, false);
            // ⛔ LE PAPIER DU TAMPON ÉTAIT TRANSPARENT. `RoundedRectOutline` dessine un TRAIT (sa doc :
            //    « ceci le fait pour un TRAIT ») : le fond #d9cca9 ne faisait que TEINDRE le contour
            //    rouge, et l'intérieur laissait voir la scène. Jamais vu : le juge r1 n'a jamais eu de
            //    tampon à mesurer (F2). ⇒ La surface pleine est un `RoundedRectMask` teint ; le bord
            //    (`border:2px solid #93402c`) et le filet (`::before inset 3px #93402c55 r7`) sont posés
            //    dessus, comme les deux filets de la plaque du matin.
            tamponFond = tamponRoot.AddComponent<Image>();
            tamponFond.sprite = ProceduralUI.RoundedRectMask((int)Px(11f));
            tamponFond.type = Image.Type.Sliced;
            tamponFond.color = Hex("#d9cca9");
            GameObject bordGo = new GameObject("Bord", typeof(RectTransform));
            bordGo.transform.SetParent(tamponRoot.transform, false);
            Etirer((RectTransform)bordGo.transform, 0f);
            tamponBord = bordGo.AddComponent<Image>();
            tamponBord.sprite = ProceduralUI.RoundedRectOutline((int)Px(11f), Px(2f), Rouge);
            tamponBord.type = Image.Type.Sliced;
            tamponBord.raycastTarget = false;
            bordGo.AddComponent<LayoutElement>().ignoreLayout = true;
            Filet(tamponRoot.transform, "FiletInterieur", Px(3f), Px(7f), Hex("#93402c55"));

            VerticalLayoutGroup v = tamponRoot.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(12f), (int)Px(12f), (int)Px(10f), (int)Px(10f));
            v.spacing = Px(2f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.MiddleCenter;

            tamponLibelle = Texte(tamponRoot.transform, "Libelle", "CONFIRMER LA ROUTINE", Px(12f),
                                  Rouge, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            tamponLibelle.characterSpacing = 22f;
            tamponLibelle.fontStyle = FontStyles.Bold;
            tamponSous = Texte(tamponRoot.transform, "Sous", "appui long", Px(8.5f), Rouge,
                               DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);

            BuildCachet();

            BatchConfirmButton = tamponRoot.AddComponent<LongPressButton>();
            BatchConfirmButton.OnLongPressCompleted += () => StartCoroutine(RequestBatchConfirm());
            tamponRoot.SetActive(false);
        }

        /// <summary>`.cachet-rouge` : « SIGNÉ », Georgia 10px, espacement .2em, bord 2px #93402c,
        /// encre #93402c, papier #efe4c6cc, `right:10px; top:-12px; rotate(-14deg)` — hors mise en
        /// page, à cheval sur le bord haut du tampon. Caché jusqu'au lot signé.</summary>
        private void BuildCachet()
        {
            tamponCachet = new GameObject("Cachet", typeof(RectTransform));
            tamponCachet.transform.SetParent(tamponRoot.transform, false);
            tamponCachet.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)tamponCachet.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(1f, 0.5f);
            rt.anchoredPosition = new Vector2(-Px(10f), 0f);
            rt.localRotation = Quaternion.Euler(0f, 0f, 14f);
            Image papier = tamponCachet.AddComponent<Image>();
            papier.sprite = ProceduralUI.RoundedRectMask((int)Px(3f));
            papier.type = Image.Type.Sliced;
            papier.color = Hex("#efe4c6cc");
            papier.raycastTarget = false;
            Filet(tamponCachet.transform, "Bord", 0f, Px(3f), Rouge);
            HorizontalLayoutGroup h = tamponCachet.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(3f), (int)Px(3f));
            h.childControlWidth = true;
            h.childControlHeight = true;
            ContentSizeFitter ajuste = tamponCachet.AddComponent<ContentSizeFitter>();
            ajuste.horizontalFit = ContentSizeFitter.FitMode.PreferredSize;
            ajuste.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            TextMeshProUGUI signe = Texte(tamponCachet.transform, "Signe", "SIGNÉ", Px(10f), Rouge,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            signe.characterSpacing = 20f;
            signe.fontStyle = FontStyles.Bold;
            tamponCachet.SetActive(false);
        }

        /// <summary>Jointure client — `tenure_bucket` par lieutenant, la maquette la pose comme
        /// faisable sans lot back. Non bloquante : si le roster ne répond pas, les chips
        /// disparaissent, l'écran reste lisible.</summary>
        public IEnumerator LoadRoster(string bearerToken)
        {
            EnsureInitialized();
            yield return new LieutenantClient { BaseUrl = baseUrl }
                .ListLieutenants(bearerToken, rows => roster = rows, (c, m) => { });
            if (LastLoadedReview != null) Render(LastLoadedReview.cards);
        }

        /// <summary>Item 0.6 — le littéral d'écran passe par une CLÉ. Le repli passé à `Libelle`
        /// est FRANÇAIS : `Libelle.De` rend le littéral quand la clé manque au bundle, donc un
        /// repli anglais resterait anglais à l'écran À TRAVERS la conversion (mesuré par le
        /// chantier B : 81 replis sur 107 étaient anglais après une première passe — « converti
        /// sans traduire »). Convertir sans traduire ne change rien pour le joueur.</summary>
        private static string Lib(string role, string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("revue", role, litteral);

    }
}
