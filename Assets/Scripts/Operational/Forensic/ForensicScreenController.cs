using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>screen_b7 « Forensic » — squelette généré par Tools/nouvel-ecran.py.
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
    public class ForensicScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public GetForensicResponseDto DernierChargement { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }

        private RectTransform racinePleinEcran;
        private ForensicClient client;
        private bool initialise;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);

        // ⛔ `Start()`, PAS `Awake()` — MESURÉ le 2026-09-03 au premier montage réel de ㊴ sous
        // chrome : sa racine était bâtie sous le CANVAS et non sous `ContentSlot`.
        //     Tenant_ForensicScreenController ⊂ ContentSlot
        //     ForensicRoot                    ⊂ Canvas          ← échappé du slot
        // ⚠️ `Awake()` s'exécute DANS `AddComponent`, donc AVANT que `MountTenant<T>` ait appelé
        // `SetMountParent(ContentSlot)` : l'écran bâtissait avant de savoir OÙ, retombait sur sa
        // racine de repli (`FindFirstObjectByType<Canvas>()`) et n'atteignait jamais le slot. Or
        // c'est l'appartenance à `ContentSlot` — index 0, sous les barres — qui garantit la
        // non-occlusion par l'ordre de fratrie. Hors du slot, cette garantie ne s'applique plus.
        // ★ ET LA LEÇON ÉTAIT DÉJÀ ÉCRITE, à un écran d'ici : ㊲ porte ce même diagnostic daté de
        //   la veille — « il bâtit donc AVANT de savoir où : il retombe sur sa racine de repli et
        //   n'atteint jamais le slot de contenu ». Corrigé là-bas, jamais propagé ici. Une règle
        //   juste ne protège que l'endroit où elle a été écrite.
        // ⇒ Balayé plutôt que corrigé au cas par cas : sur les 15 locataires classables, QUATRE
        //   bâtissaient dans `Awake` — mais deux (HomeChrome, OrgVitalsPanel) ne sont montés par
        //   aucun `MountTenant` et ne peuvent donc pas porter ce défaut. Restaient ㊴ et la Revue
        //   du jour. *Compter en accusait quatre ; classer en laisse deux.*
        private void Start()
        {
            EnsureInitialized();
            amorce = StartCoroutine(Amorcer());
        }

        /// <summary>Charger ce que l'écran montre, une fois monté — MESURÉ MANQUANT le 2026-09-03.
        ///
        /// ⛔ `Charger()` existait et N'ÉTAIT APPELÉ PAR PERSONNE : ni ici, ni par le shell. Monté
        /// par un vrai geste joueur, ㊴ dessinait son squelette et restait vide POUR TOUJOURS —
        /// trois lignes de signaux sans libellé, valeur « — », un panneau bas vide.
        /// ⚠️ Et l'image ne le disait pas : cet état est visuellement IDENTIQUE à « le serveur n'a
        /// rien à montrer sur un compte du premier jour ». C'est en voulant garder la capture
        /// contre un échec silencieux que je l'ai trouvé — la garde que j'écrivais
        /// (`DerniereErreur == null`) était VRAIE À VIDE, puisque rien ne chargeait jamais.
        /// ★ Une garde vraie à vide est pire que pas de garde : elle donne le vert ET la
        ///   conscience tranquille. C'est le fait de vérifier qu'elle mordait qui a révélé le
        ///   défaut qu'elle était censée surveiller.
        /// ⇒ Patron de ㊲ (`Amorcer`), repris tel quel : hors session on ne charge rien et on
        ///   reste sur l'état vide NOMMÉ, plutôt que d'échouer.</summary>
        private IEnumerator Amorcer()
        {
            if (string.IsNullOrEmpty(token)) yield break;   // monté hors session : rien à charger
            if (corpsImposeParUnTest) yield break;          // un test tient l'écran
            yield return Charger();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new ForensicClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface. // MÉTIER ICI si `GetForensic` a des paramètres
        /// de chemin (id, etc.) — ajouter les arguments correspondants ici et les faire
        /// remonter depuis l'appelant (le shell, ou un `RendrePourTest`).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            yield return client.GetForensic(token,
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

        public void RendrePourTest(GetForensicResponseDto dto)
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

        /// <summary>// MÉTIER ICI — TOUT le rendu métier de cet écran part d'ici. Vide à
        /// dessein : remplir depuis la maquette RATIFIÉE et le corps RÉEL mesuré, jamais depuis
        /// une supposition sur ce que l'interface TypeScript back "devrait" rendre.</summary>
        private void AppliquerEtat(GetForensicResponseDto dto)
        {
            if (dto == null) { RendreEtatIndisponible(); return; }

            MajSignal(0, Lib("RISQUE D'AUDIT"),        dto.audit_risk_bucket);
            MajSignal(1, Lib("VISIBILITÉ DES REJETS"), dto.effluent_visibility_bucket);
            MajSignal(2, Lib("TRAIN DE VIE"),          dto.lifestyle_alarm_bucket);

            // ⛔ CE QUE L'ÉCRAN NE PEUT PAS SAVOIR, ET QU'IL DIT QUAND MÊME.
            // Mesuré le 2026-09-02 par la session back : `lifestyle_alarm_bucket` rend `quiet`
            // alors que `lifestyle_audit_state` ne porte AUCUNE ligne pour ce joueur — c'est une
            // valeur PAR DÉFAUT, pas une mesure. Et depuis le corps, rien ne les distingue :
            // ★ une bande rendue sans ligne source a exactement la même forme qu'une bande
            //   mesurée. Le client ne peut pas trancher — donc il ne prétend pas trancher : il
            //   porte l'écart avec SA DATE, comme ㊲ porte les siens.
            // ⚠️ À re-mesurer : la pile a été reconstruite après cette mesure, et le maillon de
            //   blanchiment dont dépend l'épingle d'audit a été fermé entre-temps.
            MajPanneau(Lib("CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE"),
                Lib("Une bande sans source ressemble à une bande mesurée"),
                "au 2 septembre 2026, « train de vie » rend « calme » alors qu'aucune ligne ne le "
                + "mesure pour vous : c'est la valeur par défaut du serveur. Le corps ne dit pas "
                + "lesquelles de ces trois bandes reposent sur des données — cet écran ne peut "
                + "donc pas les distinguer, et il préfère vous le dire plutôt que de les "
                + "présenter toutes les trois comme des faits.");
        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            // Les trois signaux repassent à « — » : sans ça, les bandes du chargement précédent
            // resteraient à l'écran et une panne ressemblerait à un état.
            MajSignal(0, "RISQUE D'AUDIT",        null);
            MajSignal(1, "VISIBILITÉ DES REJETS", null);
            MajSignal(2, "TRAIN DE VIE",          null);
            MajPanneau(Lib("CE QUE LE SERVEUR ENVOIE VRAIMENT"),
                Lib("Pas de réponse"),
                "la route n'a rien rendu. Ce n'est pas « tout va bien » : c'est « on ne sait pas ».");
        }

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

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()`/`PxTrait()` (un conteneur plus étroit fausserait
            // TOUTE la mise à l'échelle par un facteur muet).
            GameObject racine = NouveauUI("ForensicRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);

            // ⚠️ AUCUNE MAQUETTE RATIFIÉE POUR CET ÉCRAN — et c'est mesuré, pas supposé :
            // `front.md` porte `maquette ❌` pour `screen_b7`, et note que **20 des 24 écrans
            // v1.x n'en ont aucune**. La mise en page ci-dessous suit donc les CONVENTIONS du
            // châssis de la série 6 (enseigne / blocs / panneau bas), pas un dessin ratifié.
            // ⇒ Elle n'est pas opposable comme « conforme à la maquette » : il n'y en a pas.
            //   Ce qui EST opposable, c'est qu'elle ne montre que des bandes servies.
            VerticalLayoutGroup pile = racine.AddComponent<VerticalLayoutGroup>();
            // ⛔ LE CHROME MANGE SA PART, EN HAUT ET EN BAS — posé AVANT toute capture sous
            // chrome, parce que trois écrans sur trois portaient ce défaut le même jour (⑨ et ②
            // en bas, ㊱ aux deux bouts) et que 42 est un écran PLEIN comme ㊱.
            // ⚠️ NON VÉRIFIÉ SOUS CHROME : 42 n'est monté nulle part, donc aucune capture ne le
            // prouve. C'est un correctif par ANALOGIE, et je le dis plutôt que de le présenter
            // comme mesuré — la garde viendra avec le montage.
            // Hors shell les insets valent 0 et l'écran remplit tout.
            pile.padding = new RectOffset(
                (int)Px(CssMargeX), (int)Px(CssMargeX),
                (int)(Px(CssMargeY) + MafiaCleanCity.Shell.ShellChrome.TopInsetPx),
                (int)(Px(CssMargeY) + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx));
            pile.spacing = Px(CssEcart);
            pile.childControlWidth = true;  pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            ConstruireEnseigne(racine.transform);
            signalRoot = ConstruireSignaux(racine.transform);
            ConstruireEspaceur(racine.transform);
            ConstruirePanneau(racine.transform);
        }

        // ═══ Blocs ═══════════════════════════════════════════════════════════════════════════

        private const float CssMargeX   = 11f;
        private const float CssMargeY   = 14f;
        private const float CssEcart    = 10f;
        private const float CssHEnseigne = 51f;
        private const float CssHSignal   = 62f;
        private const float CssHPanneau  = 92f;

        private RectTransform signalRoot;
        private readonly TextMeshProUGUI[] sigLib = new TextMeshProUGUI[3];
        private readonly TextMeshProUGUI[] sigVal = new TextMeshProUGUI[3];
        private readonly Image[] sigRail = new Image[3];
        private TextMeshProUGUI pannSur, pannTitre, pannTexte;

        private void ConstruireEnseigne(Transform parent)
        {
            GameObject go = NouveauUI("Enseigne", parent);
            AjouterFond(go, DesignTokens.Current.surfaceCard);
            AjouterHauteur(go, Px(CssHEnseigne));
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            NouveauTexte(go.transform, "Titre", Lib("Ce qui se voit"), Px(19f),
                         DesignTokens.Current.accentGold, DesignTokens.Current.hudSerifFont)
                .alignment = TextAlignmentOptions.Center;
            NouveauTexte(go.transform, "SousTitre", Lib("TROIS SIGNAUX, TROIS BANDES"), Px(8.5f),
                         DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont)
                .alignment = TextAlignmentOptions.Center;
        }

        /// <summary>Les trois signaux. Chacun : son nom, sa bande EN MOTS, et un rail coloré.
        /// ⛔ Le rail ne porte JAMAIS l'information seul — la phrase la porte aussi (a11y : la
        /// gravité ne doit jamais tenir dans la couleur, convention globale du dépôt).</summary>
        private RectTransform ConstruireSignaux(Transform parent)
        {
            GameObject bloc = NouveauUI("Signaux", parent);
            var v = bloc.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(CssEcart);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            for (int i = 0; i < 3; i++)
            {
                GameObject ligne = NouveauUI($"Signal{i}", bloc.transform);
                AjouterFond(ligne, DesignTokens.Current.surfaceCard);
                AjouterHauteur(ligne, Px(CssHSignal));
                var lv = ligne.AddComponent<VerticalLayoutGroup>();
                lv.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(8f), (int)Px(8f));
                lv.spacing = Px(3f);
                lv.childControlWidth = true; lv.childControlHeight = true;
                lv.childForceExpandWidth = true; lv.childForceExpandHeight = false;

                sigLib[i] = NouveauTexte(ligne.transform, "Libelle", "", Px(8.5f),
                    DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
                sigVal[i] = NouveauTexte(ligne.transform, "Valeur", "—", Px(13f),
                    DesignTokens.Current.hudCreme, DesignTokens.Current.hudSerifFont);

                GameObject rail = NouveauUI("Rail", ligne.transform);
                sigRail[i] = AjouterFond(rail, DesignTokens.Current.onSurfaceMuted);
                AjouterHauteur(rail, PxTrait(2f));
            }
            return (RectTransform)bloc.transform;
        }

        private void ConstruireEspaceur(Transform parent)
        {
            GameObject go = NouveauUI("Espaceur", parent);
            var le = go.AddComponent<LayoutElement>();
            le.flexibleHeight = 1f; le.minHeight = 0f;
        }

        private void ConstruirePanneau(Transform parent)
        {
            GameObject go = NouveauUI("Panneau", parent);
            AjouterFond(go, DesignTokens.Current.surfaceCard);

            // ⛔ HAUTEUR PLANCHER, PAS HAUTEUR FIGÉE — mesuré sur la première capture sous chrome
            // de ㊴ (2026-09-03) : à `preferredHeight` verrouillé, le titre passait sur deux
            // lignes, CHEVAUCHAIT le corps, et le corps débordait sous le fond du panneau, par
            // dessus le dock.
            // ⚠️ La cause n'est pas le texte : c'est qu'un cadre de hauteur fixe reçoit un contenu
            // de longueur VARIABLE. Les trois lignes du haut portent des bandes courtes et tiennent
            // ; ce panneau porte une PHRASE, et sa longueur dépend de ce que le serveur a servi.
            // ★ Les hauteurs figées du châssis de la série 6 valent pour les blocs à contenu
            //   calibré. Les appliquer à un bloc qui argumente revient à décider d'avance combien
            //   de mots l'argument aura le droit de faire.
            // ⇒ `minHeight` conserve la silhouette du châssis quand le texte est court ;
            //   `preferredHeight` laissé au layout la rend au contenu quand il est long.
            var le = go.GetComponent<LayoutElement>() ?? go.AddComponent<LayoutElement>();
            le.minHeight = Px(CssHPanneau);
            le.preferredHeight = -1f;     // ⇒ calculée depuis les enfants, jamais imposée
            le.flexibleHeight = 0f;
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(9f), (int)Px(9f));
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            pannSur = NouveauTexte(go.transform, "SurTitre", "", Px(7.5f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            pannTitre = NouveauTexte(go.transform, "Titre", "", Px(13f),
                DesignTokens.Current.accentGold, DesignTokens.Current.hudSerifFont);
            pannTexte = NouveauTexte(go.transform, "Texte", "", Px(9f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
        }

        private void MajSignal(int i, string libelle, string bande)
        {
            if (sigLib[i] == null) return;
            sigLib[i].text = libelle;
            sigVal[i].text = ForensicResolvers.Phrase(bande);
            sigRail[i].color = ForensicResolvers.CouleurPour(ForensicResolvers.NiveauDe(bande));
        }

        private void MajPanneau(string sur, string titre, string texte)
        {
            if (pannSur == null) return;
            pannSur.text = sur; pannTitre.text = titre; pannTexte.text = texte;
        }

        /// <summary>Item 0.6 — un littéral STATIQUE de 42 passe par `forensic.bloc.<slug>`,
        /// repli sur le littéral.
        /// ⛔ N'Y PASSE PAS : la BANDE INCONNUE. `Phrase()` rend le mot du serveur TEL QUEL quand
        /// il n'est pas reconnu (`return bande;`) — c'est délibéré, et le keyer inverserait le
        /// choix : le joueur verrait une paraphrase rassurante au lieu du mot que le serveur a
        /// réellement envoyé.
        /// ★ Sur cet écran, montrer un mot non traduit est une INFORMATION, pas un manque.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("forensic", "bloc", litteral);

        private static void AjouterHauteur(GameObject go, float hauteur)
        {
            var le = go.GetComponent<LayoutElement>() ?? go.AddComponent<LayoutElement>();
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

    /// <summary>screen_b7 — les correspondances « valeur du domaine → apparence », chacune en
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
    public static class ForensicResolvers
    {
        /// <summary>Les trois signaux du corps. Chacun porte une bande, et les vocabulaires ne
        /// sont PAS les mêmes d'un signal à l'autre — c'est pourquoi il n'y a pas un enum unique.
        /// Valeurs observées le 2026-09-02 : `watched`, `glaring`, `quiet`.
        /// ⚠️ Le vocabulaire complet de chaque bande n'est PAS connu : une seule valeur par
        /// signal a été vue. `NiveauDe` range donc par gravité les valeurs observées ET les
        /// valeurs nommées par le canon, et rend `Inconnu` pour tout le reste — jamais une
        /// gravité par défaut, qui donnerait à une bande jamais vue l'apparence d'une bande
        /// mesurée.</summary>
        public enum Gravite { Inconnu = 0, Calme, Surveille, Criant }

        public static Gravite NiveauDe(string bande)
        {
            if (string.IsNullOrEmpty(bande)) return Gravite.Inconnu;
            switch (bande.Trim().ToLowerInvariant())
            {
                // ⛔ LES TROIS PISTES ONT CHACUNE SON ÉCHELLE — mesuré dans le back le 2026-09-03
                // (`forensic.projection.service.ts:98`, domaine clos ; `:141` ; `:200`) :
                //     audit     : clean → … → audited
                //     effluent  : clear → faint → visible → glaring
                //     lifestyle : quiet → … → subpoenaed
                // ⚠️ `clear` N'EST PAS un synonyme de `clean` : c'est le premier cran de SA piste,
                // et `:200` en donne la cause — « aucune production d'atelier ⇒ déviation nulle ⇒
                // clear ». C'est l'état normal d'un compte neuf.
                // ★ Cette table mélange donc DÉLIBÉRÉMENT trois vocabulaires. Je l'ai découvert en
                //   voyant « clear » s'afficher BRUT à l'écran : le repli qui montre le mot du
                //   serveur au lieu de le rabattre sur « calme » a fait apparaître le manque au
                //   lieu de le masquer. Une paraphrase rassurante l'aurait enterré.
                case "quiet":    case "clean":    case "dormant":
                case "clear":                                     return Gravite.Calme;
                case "watched":  case "elevated": case "noticed":
                case "faint":                                     return Gravite.Surveille;
                // ⚠️ QUATRE CRANS POUR TROIS GRAVITÉS : l'échelle des rejets en a un de plus que
                // l'échelle d'affichage, donc DEUX crans doivent partager une gravité. Le choix
                // n'est pas neutre et il est écrit ici : `visible` monte en « Criant » plutôt que
                // de rejoindre `faint` en « Surveillé ». Sur un écran d'affaires internes,
                // sous-déclarer une exposition coûte plus cher que sur-alerter — c'est la même
                // raison qui interdit de rabattre une bande INCONNUE sur « calme ».
                case "glaring":  case "critical": case "exposed":
                case "visible":                                   return Gravite.Criant;
                default: return Gravite.Inconnu;
            }
        }

        public static Color CouleurPour(Gravite g)
        {
            switch (g)
            {
                case Gravite.Calme:     return DesignTokens.Current.hudGaugeArcCold;
                case Gravite.Surveille: return DesignTokens.Current.accentGold;
                case Gravite.Criant:    return HeatBucketResolver.SeverityColor(
                                                   HeatBucketResolver.Severity.Severe);
                case Gravite.Inconnu:   return DesignTokens.Current.onSurfaceMuted;
                default: throw new System.ArgumentOutOfRangeException(nameof(g), g,
                    "ForensicResolvers.CouleurPour : membre de Gravite non résolu.");
            }
        }

        /// <summary>La bande, en mots. ⛔ Une bande inconnue s'affiche TELLE QUELLE, jamais
        /// traduite en « calme » par défaut : si le serveur invente un mot, le joueur doit voir
        /// le mot du serveur plutôt qu'une paraphrase rassurante.</summary>
        public static string Phrase(string bande)
        {
            switch (NiveauDe(bande))
            {
                case Gravite.Calme:     return MafiaCleanCity.I18n.Libelle.De("forensic", "gravite", "Rien ne dépasse");
                case Gravite.Surveille: return MafiaCleanCity.I18n.Libelle.De("forensic", "gravite", "On vous regarde");
                case Gravite.Criant:    return MafiaCleanCity.I18n.Libelle.De("forensic", "gravite", "Ça se voit de loin");
                default: return string.IsNullOrEmpty(bande) ? "—" : bande;
            }
        }
    }
}
