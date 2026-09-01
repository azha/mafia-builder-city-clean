using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>screen_c6 « Horizon » — squelette généré par Tools/nouvel-ecran.py.
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
    public class HorizonScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public GetMetaHorizonFeedResponseDto DernierChargement { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }

        private RectTransform racinePleinEcran;
        private HorizonClient client;
        private bool initialise;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);

        // ⛔ `Start`, PAS `Awake` — et c'est le shell qui l'impose. `ConstruireLocataire` fait
        // `host.AddComponent<T>()`, ce qui déclenche `Awake` IMMÉDIATEMENT, puis appelle
        // `SetMountParent` à la ligne suivante. Un écran qui construit dans `Awake` se bâtit donc
        // AVANT de savoir où : il retombe sur sa racine de repli, ses ancres plein écran ne sont
        // jamais posées, et ses textes s'empilent au centre — ce qui RESSEMBLE à un défaut de mise
        // en page. Mesuré sur ㊲, puis reproduit par une autre session sur son propre écran.
        // ⚠️ Le squelette généré met `Awake` : signalé à qui tient le scaffold.
        private void Start() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new HorizonClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface. // MÉTIER ICI si `GetMetaHorizonFeed` a des paramètres
        /// de chemin (id, etc.) — ajouter les arguments correspondants ici et les faire
        /// remonter depuis l'appelant (le shell, ou un `RendrePourTest`).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            yield return client.GetMetaHorizonFeed(token,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponible(); yield break; }
            AppliquerEtat(DernierChargement);
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        public void RendrePourTest(GetMetaHorizonFeedResponseDto dto)
        {
            EnsureInitialized();
            AppliquerEtat(dto);
        }

        /// <summary>// MÉTIER ICI — TOUT le rendu métier de cet écran part d'ici. Vide à
        /// dessein : remplir depuis la maquette RATIFIÉE et le corps RÉEL mesuré, jamais depuis
        /// une supposition sur ce que l'interface TypeScript back "devrait" rendre.</summary>
        private void AppliquerEtat(GetMetaHorizonFeedResponseDto dto)
        {
            HorizonCardDto[] cartes = dto != null && dto.cards != null
                ? dto.cards : new HorizonCardDto[0];
            Cartes = cartes;

            int aPortee = 0, prises = 0, reculees = 0;
            foreach (HorizonCardDto c in cartes)
            {
                if (c == null) continue;
                if (c.view_status == "adopted") prises++;
                else if (c.predicate_regressed) reculees++;
                else if (c.affordable) aPortee++;
            }

            sousTitre.text = "CE QUE LE SERVEUR NE DIT PAS";
            MajCompteur(0, aPortee, cartes.Length, "À PORTÉE");
            MajCompteur(1, prises, -1, "DÉJÀ PRISES");
            MajCompteur(2, reculees, -1, "ONT RECULÉ");

            RendreCartes(cartes);

            // ⛔ LE PANNEAU DIT LE TROU, il ne le masque pas — et c'est la maquette qui l'exige :
            // son cadre ratifié affiche l'écran « tel qu'il s'afficherait aujourd'hui », clés
            // techniques en titre. Le serveur ne rend que des CLÉS de traduction, et le
            // dictionnaire du jeu ne contient aujourd'hui que des messages d'erreur.
            // ★ C'est la même règle que sur ㊲ : afficher un nom inventé serait plus joli et
            //   faux. Ici le dessin lui-même a tranché en faveur du vrai.
            MajPanneau("CE QUE LE SERVEUR ENVOIE VRAIMENT",
                cartes.Length == 0 ? "Rien à l'horizon" : "Aucune de ces cartes n'a de nom",
                cartes.Length == 0
                    ? "le serveur ne propose aucune capacité pour l'instant — ce n'est pas une "
                      + "panne, c'est un état : rien n'est encore à portée."
                    : "le serveur ne rend que des clés de traduction, et le dictionnaire du jeu ne "
                      + "contient que des messages d'erreur. Voilà l'écran tel qu'il s'afficherait "
                      + "aujourd'hui. Quelqu'un doit écrire les textes.");
        }

        /// <summary>Les cartes du flux. Chacune porte son titre (une CLÉ), son statut, son coût en
        /// jetons et ses conditions — et, si elle a reculé, son cadre rouge et sa phrase.
        ///
        /// ⚠️ Les conditions sont des PHRASES, jamais des jauges : le service back interdit
        /// explicitement de projeter un seuil ou une valeur atteinte. Dessiner « 7 sur 10 »
        /// inventerait la seule chose que le serveur refuse de dire.</summary>
        private void RendreCartes(HorizonCardDto[] cartes)
        {
            for (int i = listeRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(listeRoot.GetChild(i).gameObject);

            foreach (HorizonCardDto c in cartes)
            {
                if (c == null) continue;
                GameObject carte = NouveauUI("Carte_" + c.card_id, listeRoot);
                Image fond = carte.AddComponent<Image>();
                fond.color = c.predicate_regressed ? FondRecule : FondCarte;
                if (c.predicate_regressed) Contour(carte, AccentRecule);

                VerticalLayoutGroup v = carte.AddComponent<VerticalLayoutGroup>();
                v.padding = new RectOffset(PxI(12f), PxI(12f), PxI(10f), PxI(10f));
                v.spacing = Px(3f);
                v.childControlWidth = true; v.childControlHeight = true;
                v.childForceExpandWidth = true; v.childForceExpandHeight = false;

                // Le titre EST la clé : c'est ce que la maquette ratifiée montre.
                TextMeshProUGUI titre = NouveauTexte(carte.transform, "Titre",
                    c.name_i18n_key ?? c.capability_key ?? "(sans clé)", 13f, TexteFort);
                titre.fontStyle = TMPro.FontStyles.Bold;

                NouveauTexte(carte.transform, "Cle", c.capability_key ?? "", 8.5f, TexteFaible);

                foreach (HorizonPredicateDto pr in c.visible_predicates ?? new HorizonPredicateDto[0])
                {
                    if (pr == null) continue;
                    // Le préfixe porte l'information, pas seulement la couleur (a11y F2) : une
                    // condition qui a reculé se lit aussi sans distinguer les teintes.
                    string puce = c.predicate_regressed ? "×  " : "·  ";
                    NouveauTexte(carte.transform, "Pred",
                        puce + (pr.desc_i18n_key ?? pr.predicate_type ?? ""), 9.5f,
                        c.predicate_regressed ? AccentRecule : TexteFaible);
                }

                if (c.predicate_regressed)
                {
                    TextMeshProUGUI perte = NouveauTexte(carte.transform, "Perte",
                        "C'était à portée. Ça s'est éloigné.", 10f, AccentRecule);
                    perte.fontStyle = TMPro.FontStyles.Bold;
                }
            }
        }

        /// <summary>Les cartes du dernier chargement — crochet de test.</summary>
        public HorizonCardDto[] Cartes { get; private set; } = new HorizonCardDto[0];

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            // ⛔ VIDER D'ABORD. Laisser les cartes du chargement précédent afficherait un
            // horizon périmé sous un message d'erreur — le joueur lirait des capacités qui ne
            // sont peut-être plus là. ㊲ a payé exactement ce défaut sur sa liste de règles.
            RendreCartes(new HorizonCardDto[0]);
            Cartes = new HorizonCardDto[0];
            sousTitre.text = "CE QUE LE SERVEUR NE DIT PAS";
            MajCompteur(0, -1, -1, "À PORTÉE");
            MajCompteur(1, -1, -1, "DÉJÀ PRISES");
            MajCompteur(2, -1, -1, "ONT RECULÉ");
            MajPanneau("L'HORIZON EST INDISPONIBLE",
                "Le serveur n'a pas répondu",
                "l'écran ne montre rien plutôt que de montrer un horizon périmé — ce qui était à "
                + "portée il y a une minute ne l'est peut-être plus.");
        }

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        // ── les mesures de `generateur-horizon.py`, qui importe `chassis6.py`.
        // ⚠️ La largeur vient donc de LargeurEcransBrennar6 : même CHÂSSIS, donc même source, et
        // c'est la source qui fonde une constante — pas l'écran. Emprunter la constante d'un
        // voisin qui n'a pas la même source serait le défaut ; ici c'est le même fichier.
        private const float CssMargeH        = 13f;
        private const float CssEcartBloc     =  9f;
        private const float CssHautEnseigne  = 51f;   // H_FIXE['enseigne']
        private const float CssHautCompteurs = 42f;   // H_FIXE['compteurs']
        private const float CssHautPann      = 70f;   // H_FIXE['pann']
        private const float CssTitreCorps    = 17f;
        private const float CssSousTitre     = 6.4f;
        private const float CssCompteurNb    = 14f;
        private const float CssCompteurLib   = 5.4f;

        private static Color FondCarte   => DesignTokens.Current.surfaceCard;
        private static Color FondRecule   => DesignTokens.Current.surfaceCard;
        private static Color AccentRecule => HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Severe);
        private static Color TexteFort   => DesignTokens.Current.hudCreme;
        private static Color TexteFaible => DesignTokens.Current.hudCremeSecondary;

        private RectTransform listeRoot;
        private TextMeshProUGUI sousTitre;
        private readonly TextMeshProUGUI[] compteurNb = new TextMeshProUGUI[3];
        private readonly TextMeshProUGUI[] compteurLib = new TextMeshProUGUI[3];
        private TextMeshProUGUI pannSurTitre, pannTitre, pannTexte;

        private int PxI(float css) => PxTrait(css);

        private TextMeshProUGUI NouveauTexte(Transform parent, string nom, string texte,
                                             float corpsCss, Color couleur)
        {
            GameObject go = NouveauUI(nom, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.text = texte; t.color = couleur;
            t.fontSize = Px(corpsCss);
            t.font = DesignTokens.Current.primaryFont;
            t.raycastTarget = false;
            t.enableWordWrapping = true;
            return t;
        }

        /// <summary>Un contour, posé en PREMIER enfant — la convention de fratrie du dépôt : un
        /// décor ne s'empile pas avec le contenu, et il ignore le layout.</summary>
        private void Contour(GameObject cible, Color couleur)
        {
            GameObject b = NouveauUI("Contour", cible.transform);
            b.transform.SetAsFirstSibling();
            Image i = b.AddComponent<Image>();
            i.color = couleur; i.raycastTarget = false;
            RectTransform rt = (RectTransform)b.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            b.AddComponent<LayoutElement>().ignoreLayout = true;
        }

        /// <summary>Un compteur. `valeur < 0` ⇒ « — » : le trou se montre, il ne se comble pas
        /// par un zéro. Un « 0 » dirait « mesuré à zéro », un tiret dit « pas de source » —
        /// distinction payée sur ㊲, où la garde a refusé un zéro déduit.</summary>
        private void MajCompteur(int i, int valeur, int total, string libelle)
        {
            if (compteurNb[i] == null) return;
            compteurNb[i].text = valeur < 0 ? "—"
                : (total >= 0 ? $"{valeur:00}<size=64%>/{total}</size>" : $"{valeur:00}");
            compteurLib[i].text = libelle;
        }

        private void MajPanneau(string surTitre, string titre, string texte)
        {
            if (pannSurTitre == null) return;
            pannSurTitre.text = surTitre; pannTitre.text = titre; pannTexte.text = texte;
        }

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

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()`/`PxTrait()` (un conteneur plus étroit fausserait
            // TOUTE la mise à l'échelle par un facteur muet).
            GameObject racine = NouveauUI("HorizonRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION. Un RectTransform qui vient d'être étiré n'a
            // pas encore son `rect` résolu, et `Px()` le lit dès la première constante. Payé sur
            // ㊲ : tout l'écran converti à la MOITIÉ de son échelle, invisible parce qu'un écran
            // deux fois trop petit ressemble à un écran sobre.
            Canvas.ForceUpdateCanvases();

            GameObject corps = NouveauUI("Corps", racine.transform);
            RectTransform crt = (RectTransform)corps.transform;
            crt.anchorMin = new Vector2(0f, 0f); crt.anchorMax = new Vector2(1f, 1f);
            crt.offsetMin = new Vector2(Px(CssMargeH), Px(CssMargeH));
            crt.offsetMax = new Vector2(-Px(CssMargeH), -Px(CssMargeH));

            VerticalLayoutGroup pile = corps.AddComponent<VerticalLayoutGroup>();
            pile.spacing = Px(CssEcartBloc);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            ConstruireEnseigne(corps.transform);
            ConstruireCompteurs(corps.transform);
            ConstruireListe(corps.transform);
            ConstruirePanneau(corps.transform);
        }

        private void ConstruireEnseigne(Transform parent)
        {
            GameObject go = NouveauUI("Enseigne", parent);
            AjouterFond(go, DesignTokens.Current.surfaceCard);
            Contour(go, DesignTokens.Current.hudHairlineGold);
            AjouterLayout(go, Px(CssHautEnseigne));

            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(11f), PxI(11f), PxI(7f), PxI(8f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.MiddleCenter;

            TextMeshProUGUI titre = NouveauTexte(go.transform, "Titre", "L'horizon",
                                                 CssTitreCorps, DesignTokens.Current.accentGold);
            titre.alignment = TextAlignmentOptions.Center;
            titre.characterSpacing = 20f;
            titre.fontStyle = TMPro.FontStyles.Bold;
            titre.font = DesignTokens.Current.hudSerifFont;

            sousTitre = NouveauTexte(go.transform, "SousTitre", "", CssSousTitre, TexteFaible);
            sousTitre.alignment = TextAlignmentOptions.Center;
            sousTitre.characterSpacing = 34f;
            sousTitre.fontStyle = TMPro.FontStyles.Bold;
        }

        private void ConstruireCompteurs(Transform parent)
        {
            GameObject go = NouveauUI("Compteurs", parent);
            AjouterLayout(go, Px(CssHautCompteurs));
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.spacing = Px(6f);
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true;

            for (int i = 0; i < 3; i++)
            {
                GameObject fen = NouveauUI("Fenetre" + i, go.transform);
                AjouterFond(fen, DesignTokens.Current.surfaceCard);
                Contour(fen, DesignTokens.Current.hudHairlineGold);
                // Trois tiers ÉGAUX : sans `preferredWidth = 0`, la largeur vient du CONTENU et
                // « DÉJÀ PRISES » écraserait « À PORTÉE ». Payé sur ㊲.
                LayoutElement le = fen.AddComponent<LayoutElement>();
                le.minWidth = 0f; le.preferredWidth = 0f; le.flexibleWidth = 1f;

                VerticalLayoutGroup v = fen.AddComponent<VerticalLayoutGroup>();
                v.padding = new RectOffset(0, 0, PxI(4f), PxI(3f));
                v.childControlWidth = true; v.childControlHeight = true;
                v.childForceExpandWidth = true; v.childForceExpandHeight = false;
                v.childAlignment = TextAnchor.MiddleCenter;

                compteurNb[i] = NouveauTexte(fen.transform, "Nombre", "—",
                                             CssCompteurNb, DesignTokens.Current.hudGaugeArcCold);
                compteurNb[i].alignment = TextAlignmentOptions.Center;
                compteurNb[i].fontStyle = TMPro.FontStyles.Bold;

                compteurLib[i] = NouveauTexte(fen.transform, "Libelle", "",
                                              CssCompteurLib, TexteFaible);
                compteurLib[i].alignment = TextAlignmentOptions.Center;
                compteurLib[i].characterSpacing = 16f;
                compteurLib[i].fontStyle = TMPro.FontStyles.Bold;
            }
        }

        /// <summary>La liste des cartes — le SEUL bloc élastique : c'est lui qui absorbe la
        /// hauteur restante, les autres ont la leur. (`.elast{flex:1}` du châssis.)</summary>
        private void ConstruireListe(Transform parent)
        {
            GameObject go = NouveauUI("Liste", parent);
            AjouterFond(go, DesignTokens.Current.surfaceBase);
            Contour(go, DesignTokens.Current.hudHairlineGold);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(120f); le.flexibleHeight = 1f;

            GameObject inner = NouveauUI("Cartes", go.transform);
            listeRoot = (RectTransform)inner.transform;
            Etirer(listeRoot);
            VerticalLayoutGroup v = inner.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(8f), PxI(8f), PxI(8f), PxI(8f));
            v.spacing = Px(6f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;
        }

        private void ConstruirePanneau(Transform parent)
        {
            GameObject go = NouveauUI("Panneau", parent);
            AjouterFond(go, DesignTokens.Current.surfaceCard);
            Contour(go, DesignTokens.Current.hudHairlineGold);
            AjouterLayout(go, Px(CssHautPann));

            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(10f), PxI(10f), PxI(8f), PxI(9f));
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            pannSurTitre = NouveauTexte(go.transform, "SurTitre", "", 5.6f, TexteFaible);
            pannSurTitre.characterSpacing = 19f;
            pannSurTitre.fontStyle = TMPro.FontStyles.Bold;
            pannTitre = NouveauTexte(go.transform, "Titre", "", 13f, DesignTokens.Current.accentGold);
            pannTitre.fontStyle = TMPro.FontStyles.Bold;
            pannTitre.font = DesignTokens.Current.hudSerifFont;
            pannTexte = NouveauTexte(go.transform, "Texte", "", 8f, TexteFaible);
        }

        /// <summary>Hauteur FIXE : `min` autant que `preferred`. Un `preferredHeight` seul n'est
        /// pas une taille, c'est une préférence — le layout comprime jusqu'à un `minHeight`
        /// implicite de zéro dès qu'un voisin réclame la place. Payé deux fois sur ㊲.</summary>
        private void AjouterLayout(GameObject go, float hauteur)
        {
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.minHeight = hauteur; le.preferredHeight = hauteur; le.flexibleHeight = 0f;
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

    /// <summary>screen_c6 — les correspondances « valeur du domaine → apparence », chacune en
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
    public static class HorizonResolvers
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
                    "HorizonResolvers.CouleurPour : membre de EtatDomaine non résolu.");
            }
        }
    }
}
