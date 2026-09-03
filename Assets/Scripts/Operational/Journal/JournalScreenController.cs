using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>screen_c1 « Journal » — squelette généré par Tools/nouvel-ecran.py.
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
    public class JournalScreenController : MonoBehaviour, IShellTenant
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

            // ⛔ L'HÔTE SE PARENTE, SE DIMENSIONNE ET PASSE EN DERNIER — correctif de gabarit
            // mesuré par la session F sur SEPT locataires (2026-09-03). Le gabarit bâtissait sa
            // racine sous `mountParent`, ce qui en faisait un FRÈRE de l'hôte au lieu d'un enfant :
            // l'écran se retrouvait hors de la sous-arborescence que le shell croit contrôler, et
            // n'importe quel frère posé après lui le recouvrait.
            // ⚠️ Les quatre gestes vont ENSEMBLE, aucun ne suffit seul :
            //   1. un `RectTransform` EXPLICITE sur l'hôte — `ConstruireLocataire` crée un
            //      GameObject NU, et un `(RectTransform)transform` jetterait ;
            //   2. l'hôte ÉTIRÉ — sans quoi il a une taille nulle et tout ce qu'il contient
            //      mesure zéro, ce qui ressemble à un défaut de mise en page ;
            //   3. `SetAsLastSibling()` ICI **et** dans `Start()` — le montage et la frame
            //      suivante sont deux moments où un frère peut passer devant ;
            //   4. la racine sous `transform` (voir `BuildLayout`), pas sous `mountParent`.
            // ⚠️ ALIGNÉ MOT POUR MOT sur `Tools/nouvel-ecran.py:393-405` — un producteur, N
            // citations. Ma première version appelait en plus `SetParent(parent)` : inutile, car
            // `ConstruireLocataire` a DÉJÀ parenté l'hôte sous `ContentSlot` avant d'appeler
            // ceci. Un geste redondant dans une copie manuelle est le début d'une divergence.
            // ⛔ ET C'EST BIEN AU CONTRÔLEUR DE LE FAIRE — mesuré sur `main` (68f6851) :
            // `AppShell.cs` ne contient AUCUN `AddComponent<RectTransform>`, et
            // `ConstruireLocataire` crée `new GameObject($"Tenant_{T}")`, un objet NU. L'hôte
            // n'a donc ni `RectTransform` ni taille tant que le locataire ne se les donne pas.
            RectTransform rtHote = transform as RectTransform;
            if (rtHote == null) rtHote = gameObject.AddComponent<RectTransform>();
            rtHote.anchorMin = Vector2.zero;
            rtHote.anchorMax = Vector2.one;
            rtHote.offsetMin = Vector2.zero;
            rtHote.offsetMax = Vector2.zero;
            transform.SetAsLastSibling();

            EnsureInitialized();
        }

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public GetNewsFeedResponseDto DernierChargement { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }

        private RectTransform racinePleinEcran;
        private JournalClient client;
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
            EnsureInitialized();
            // ⛔ SECOND `SetAsLastSibling` — non redondant. Celui de `SetMountParent` s'applique au
            // montage ; celui-ci à la frame suivante, quand tous les frères de ce parent ont eu le
            // temps d'être posés. Un seul des deux laisse une fenêtre où l'écran passe dessous.
            if (mountParent != null) transform.SetAsLastSibling();
            StartCoroutine(Amorcer());
        }

        /// <summary>Charger dès le montage — sans quoi l'écran reste un squelette. ㊴ portait ce
        /// défaut : `Charger()` existait et n'était appelé par personne, et l'image ne pouvait pas
        /// le dire (un écran non chargé et un compte vide donnent la même photo).</summary>
        private IEnumerator Amorcer()
        {
            if (string.IsNullOrEmpty(token)) yield break;   // hors session : état vide NOMMÉ
            yield return Charger();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new JournalClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface. // MÉTIER ICI si `GetNewsFeed` a des paramètres
        /// de chemin (id, etc.) — ajouter les arguments correspondants ici et les faire
        /// remonter depuis l'appelant (le shell, ou un `RendrePourTest`).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            yield return client.GetNewsFeed(token,
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
        public void RendrePourTest(GetNewsFeedResponseDto dto)
        {
            EnsureInitialized();
            AppliquerEtat(dto);
        }

        /// <summary>// MÉTIER ICI — TOUT le rendu métier de cet écran part d'ici. Vide à
        /// dessein : remplir depuis la maquette RATIFIÉE et le corps RÉEL mesuré, jamais depuis
        /// une supposition sur ce que l'interface TypeScript back "devrait" rendre.</summary>
        private void AppliquerEtat(GetNewsFeedResponseDto dto)
        {
            // MÉTIER ICI
        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            // MÉTIER ICI — au minimum, un texte d'état ; ne PAS laisser le rendu du chargement
            // précédent affiché (même défaut qu'une liste non vidée : ㊲ l'a payé).
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
            // ⛔ LA RACINE SOUS `transform`, PAS SOUS `mountParent` — 4e geste du correctif de
            // gabarit (voir `SetMountParent`). Sous `mountParent`, `JournalRoot` naîtrait FRÈRE
            // de l'hôte : le shell croirait contrôler une sous-arborescence qui ne contient pas
            // l'écran. Hors shell (`mountParent == null`), on retombe sur le canvas comme avant.
            Transform root = mountParent != null ? transform : canvas.transform;

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()`/`PxTrait()` (un conteneur plus étroit fausserait
            // TOUTE la mise à l'échelle par un facteur muet).
            GameObject racine = NouveauUI("JournalRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);

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

    /// <summary>screen_c1 — les correspondances « valeur du domaine → apparence », chacune en
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
    public static class JournalResolvers
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
                    "JournalResolvers.CouleurPour : membre de EtatDomaine non résolu.");
            }
        }
    }
}
