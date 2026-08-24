using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;

namespace MafiaCleanCity.CityMap
{
    /// <summary>
    /// nav-district (pan+zoom) — la pièce manquante mesurée sur `district_v2_starter_kit_4buildings.png` :
    /// le fond fait 1080×1920, la fenêtre n'en montre qu'une bande de 720px de haut, sans aucun
    /// mécanisme de défilement, et les 4 bâtiments du starter kit tombent hors de cette bande
    /// (Tools/district-v2-reimport-implementation-notes.md §6, Défaut 2).
    ///
    /// RULING USER (ferme) : le zoom ne change JAMAIS la perspective — le fond est une image 2D
    /// pré-rendue, la perspective y est fixe par construction. Ce composant n'applique donc QUE des
    /// similitudes 2D à SA PROPRE RectTransform : une translation (`anchoredPosition`, le pan) et une
    /// échelle UNIFORME (`localScale.x == y == z`, le zoom) — jamais de rotation, jamais de shear,
    /// jamais un Camera.fieldOfView touché (il n'y a même pas de Camera 3D dans ce pipeline UI).
    /// DistrictMapNavigationPlayModeTests.NoPerspective_TransformIsAlwaysASimilarity vérifie ça sur la
    /// MATRICE, pas sur une impression (livrable 5(d)).
    ///
    /// Attaché sur `DistrictScene` LUI-MÊME (voir DistrictInteriorScreenController.RenderHeroDiorama) —
    /// le fond ET chaque `Cell_x_y` (bâtiment + calques d'état + marqueurs de lieutenant) sont ses
    /// enfants directs ou indirects. "Les bâtiments suivent EXACTEMENT le fond" (livrable 3) n'est
    /// donc pas une synchronisation ajoutée après coup : c'est une PROPRIÉTÉ DE LA HIÉRARCHIE — un
    /// seul parent transformé, tout ce qu'il porte se déplace/s'échelonne identiquement, par
    /// construction. Aucun autre GameObject de ce diorama n'est jamais touché par ce composant.
    /// </summary>
    [RequireComponent(typeof(RectTransform))]
    public class DistrictMapNavigation : MonoBehaviour
    {
        // ── Politique de zoom, MESURÉE (Tools/district-v2-navigation-implementation-notes.md §Zoom) ──
        // Comparaison NEAREST vs BILINEAR contre un jumeau haute résolution (chaque sprite livré a un
        // second PPM, ~2.35× plus dense — ppm56.471 sert de "vérité terrain" pour ce que le rendu
        // DEVRAIT montrer à un zoom donné). Sur 4 à 6 paires testées : NEAREST bat BILINEAR à CHAQUE
        // échelle ENTIÈRE testée (×2, ×3, ×4 — delta MAE 0,01 à 0,79, toujours dans le même sens sauf
        // un cas marginal à ×3), BILINEAR bat NEAREST à ×1,5 (non entier). ⇒ paliers CONTRAINTS aux
        // valeurs entières : ×1 (référence bit-exacte certifiée, filtre indifférent à l'échantillonnage
        // exact 1:1) puis ×2 et ×3 (NEAREST). ×3 retenu comme maximum : au-delà, la fenêtre visible
        // rétrécit sous ce qu'un seul bâtiment occupe déjà à l'écran (aucun gain d'information — le
        // fond est une image FIXE, pas de détail supplémentaire à révéler au-delà de sa résolution
        // native) et le signe NEAREST-gagne s'affaiblit (marginal à ×3, mesuré).
        //
        // JUGE-D3 (audit visuel, 2026-08-21, Défaut 3 — « le joueur ne peut jamais voir son quartier
        // en entier ») — AMENDÉ : {1,2,3} n'incluait AUCUN palier ≤ 1, donc AUCUN dézoom ne pouvait
        // jamais montrer le fond ENTIER (mesuré : 31,25% de l'artefact visible à 1280×720, le
        // district-v2-navigation-implementation-notes.md §Deviations avait explicitement écarté le
        // dézoom comme "question de filtrage séparée" — un STOP produit, pas une Deviation
        // technique). `ZoomLevels` DEVIENT une propriété D'INSTANCE, calculée par `Configure()` à
        // partir du VRAI fond et du VRAI viewport de CE rendu (jamais une constante statique — la
        // résolution du joueur n'est pas connue à la compilation) : {1,2,3} PLUS un palier
        // "district entier" (voir <see cref="ComputeContainScale"/>), inséré dans l'ORDRE, sauf s'il
        // coïncide déjà avec un palier existant (cas 1080×1920 : le fond EST déjà un écran entier à
        // ×1, aucun palier de plus). ×1 (l'échelle certifiée bit-exacte) reste le palier DE DÉPART
        // (`referenceZoomIndex`, recalculé — plus jamais 0 en dur) : ce correctif ajoute une capacité
        // de dézoom, il ne change pas le cadrage initial par défaut (JUGE-D2 couvre séparément
        // l'absence de bande nue, via un backdrop — DistrictInteriorScreenController).
        public float[] ZoomLevels { get; private set; } = { 1f, 2f, 3f };
        private int referenceZoomIndex; // index de la valeur 1f dans ZoomLevels — recalculé à chaque Configure()

        /// <summary>Le plus grand facteur d'échelle tel que le fond ENTIER (dimensions natives)
        /// tienne dans le viewport SANS être coupé sur AUCUN axe — la classique "contain fit"
        /// (par opposition à la "cover fit" qui remplirait le viewport en coupant l'excédent). Pure,
        /// testable sans Canvas ni Screen (JUGE §MÉTHODE : falsifiables PARAMÉTRÉES par la
        /// résolution, `[TestCase]`) — voir DistrictMapNavigationPlayModeTests.
        /// `fondSizeNative`/`viewportSize` : mêmes unités (locales post-scaleFactor, comme partout
        /// ailleurs dans ce fichier) — le rapport est indépendant de l'unité choisie tant qu'elle est
        /// PARTAGÉE par les deux arguments.</summary>
        public static float ComputeContainScale(Vector2 fondSizeNative, Vector2 viewportSize)
        {
            if (fondSizeNative.x <= 0f || fondSizeNative.y <= 0f) return 1f; // défensif — jamais une division par zéro
            return Mathf.Min(viewportSize.x / fondSizeNative.x, viewportSize.y / fondSizeNative.y);
        }

        /// <summary>Construit le jeu de paliers pour CE rendu : {1,2,3} plus le palier "district
        /// entier" (<see cref="ComputeContainScale"/>) s'il n'est pas déjà l'un des trois (tolérance
        /// <paramref name="eps"/> — évite un doublon quasi-identique, ex. 1080×1920 où contain==1
        /// EXACTEMENT). Trié ascendant : le nouveau palier peut tomber AVANT ×1 (viewport plus
        /// "large" que le fond — ex. 1280×720, contain≈0,375) ou ENTRE deux paliers existants
        /// (viewport plus "haut" que le fond MAIS plus étroit que lui à ×1 — ex. 1440×3200,
        /// contain≈1,333, entre ×1 et ×2). `referenceIndex` sort l'index de la valeur ×1 dans le
        /// tableau résultant (jamais supposé être 0).</summary>
        public static float[] BuildZoomLevels(Vector2 fondSizeNative, Vector2 viewportSize, out int referenceIndex, float eps = 0.01f)
        {
            float contain = ComputeContainScale(fondSizeNative, viewportSize);
            var levels = new System.Collections.Generic.List<float> { 1f, 2f, 3f };
            bool alreadyPresent = false;
            foreach (float lvl in levels)
                if (Mathf.Abs(lvl - contain) < eps) { alreadyPresent = true; break; }
            if (!alreadyPresent && contain > 0f) levels.Add(contain);
            levels.Sort();
            referenceIndex = levels.FindIndex(v => Mathf.Abs(v - 1f) < eps);
            return levels.ToArray();
        }

        // ---- test hooks ------------------------------------------------------------------------
        public int ZoomIndex { get; private set; }
        public float CurrentScale => ZoomLevels[ZoomIndex];
        public Vector2 PanPosition => sceneRt.anchoredPosition;
        public bool HasFond { get; private set; }

        private RectTransform sceneRt;
        private RectTransform rootRt;
        private RectTransform fondRt;
        private Canvas canvas;

        /// <summary>Appelé une fois par `Render()` (DistrictInteriorScreenController), juste après
        /// que tous les `Cell_x_y` sont construits. `initialFocusLocal` est le barycentre des
        /// bâtiments du joueur (ou (0,0), le centre du fond, s'il n'en a aucun — livrable 4) en
        /// unités locales de CETTE RectTransform.
        ///
        /// ⚠️ AMENDÉ le 2026-08-22 : cette clause disait « le même espace que
        /// `Cell_x_y.anchoredPosition`, puisque ces cellules sont ses enfants directs ». La seconde
        /// moitié a CESSÉ d'être vraie — les cellules sont désormais des descendants, sous
        /// `DistrictCells` (le calque calqué sur le fond qui porte la découpe de gouttière). Leur
        /// `anchoredPosition` est relatif au centre du FOND, pas à celui de la scène ; l'appelant
        /// y ajoute `DistrictCells.anchoredPosition` avant d'appeler (site de collecte dans
        /// `DistrictInteriorScreenController.Render`). Une prose laissée intacte dans un fichier
        /// corrigé devient fausse dès que la correction déplace ce qu'elle référence.</summary>
        public void Configure(RectTransform fond, Vector2 initialFocusLocal)
        {
            sceneRt = (RectTransform)transform;
            rootRt = (RectTransform)transform.parent;
            fondRt = fond;
            HasFond = fondRt != null;
            canvas = GetComponentInParent<Canvas>();

            // JUGE-D3 — jeu de paliers RECALCULÉ pour CE fond/viewport (jamais la constante {1,2,3}
            // seule). Repli {1,2,3}/index 0 si pas de fond (rien à borner — HasFond==false ci-dessous
            // retourne de toute façon avant que ça compte).
            if (HasFond)
                ZoomLevels = BuildZoomLevels(fondRt.rect.size, rootRt.rect.size, out referenceZoomIndex);
            else
            {
                ZoomLevels = new[] { 1f, 2f, 3f };
                referenceZoomIndex = 0;
            }

            ZoomIndex = referenceZoomIndex;
            sceneRt.localScale = Vector3.one; // ×1 — jamais un rescale résiduel d'un composant précédent

            if (!HasFond) return;

            Vector2 desired = -initialFocusLocal * CurrentScale;
            sceneRt.anchoredPosition = ClampPan(desired, CurrentScale);
            // Référence : re-snap au pixel écran entier APRÈS le cadrage initial — le même mécanisme
            // que le fond/les ancres bâtiment (SnapToScreenPixel, DistrictInteriorScreenController),
            // REUSE explicite, jamais dupliqué (R9.3 généralisé). Sans ça, un barycentre non-entier en
            // pixels écran romprait la bit-exactité certifiée dès le premier cadrage.
            DistrictInteriorScreenController.SnapToScreenPixel(sceneRt);
            ApplyFilterModeForZoom();
        }

        // ============================================================== effet (surface testable)

        /// <summary>Déplace le contenu de `screenPixelDelta` PIXELS ÉCRAN (pas d'unités locales — le
        /// même repère que les deltas Input System), borné (livrable 1 / falsifiable a). Public :
        /// c'est CETTE méthode que les falsifiables appellent directement (patron de ce fichier —
        /// voir DistrictInteriorScreenController, toute la famille de test hooks), pas une simulation
        /// de geste tactile brut (aucun précédent dans ce dépôt pour ça — voir § Deviations).</summary>
        public void PanBy(Vector2 screenPixelDelta)
        {
            if (!HasFond) return;
            float sf = EffectiveScaleFactor();
            Vector2 localDelta = screenPixelDelta / sf;
            sceneRt.anchoredPosition = ClampPan(sceneRt.anchoredPosition + localDelta, CurrentScale);
            if (ZoomIndex == referenceZoomIndex) DistrictInteriorScreenController.SnapToScreenPixel(sceneRt);
        }

        /// <summary>Zoome vers `ZoomLevels[newIndex]` (borné à [0, Length-1]) en gardant le point de
        /// CONTENU actuellement sous `focusScreenPos` immobile à l'écran (livrable 2 : "autour du
        /// point de focus"). No-op si le fond n'existe pas ou si l'index cible == l'actuel.</summary>
        public void ZoomTo(int newIndex, Vector2 focusScreenPos)
        {
            if (!HasFond) return;
            newIndex = Mathf.Clamp(newIndex, 0, ZoomLevels.Length - 1);
            if (newIndex == ZoomIndex) return;

            float oldScale = CurrentScale;
            float newScale = ZoomLevels[newIndex];

            Camera cam = (canvas != null && canvas.renderMode != RenderMode.ScreenSpaceOverlay) ? canvas.worldCamera : null;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(rootRt, focusScreenPos, cam, out Vector2 focusRootLocal);

            // Le point de CONTENU (unités non-échelonnées de sceneRt) actuellement sous le focus.
            Vector2 contentLocalPoint = (focusRootLocal - sceneRt.anchoredPosition) / oldScale;
            Vector2 desiredPos = focusRootLocal - contentLocalPoint * newScale;

            ZoomIndex = newIndex;
            sceneRt.localScale = new Vector3(newScale, newScale, 1f);
            sceneRt.anchoredPosition = ClampPan(desiredPos, newScale);
            if (ZoomIndex == referenceZoomIndex) DistrictInteriorScreenController.SnapToScreenPixel(sceneRt);
            ApplyFilterModeForZoom();
        }

        public void ZoomStep(int direction, Vector2 focusScreenPos) => ZoomTo(ZoomIndex + (direction >= 0 ? 1 : -1), focusScreenPos);

        // ============================================================== bornes (falsifiable a)

        /// <summary>Camera-clamp-to-bounds standard, par axe (camera-systems : level-bounds
        /// clamping) : si le contenu à l'échelle `scale` est PLUS GRAND que le viewport sur cet axe,
        /// borne la position pour que le fond couvre TOUJOURS le viewport (jamais de vide) ; sinon
        /// (fond plus PETIT que le viewport sur cet axe), fixe la position à 0 — le fond reste
        /// CENTRÉ sur cet axe (livrable 1, deuxième clause). Bornes calculées contre `rootRt.rect`
        /// EN ENTIER (pas la fenêtre rétrécie par les insets TopBar/TabBar) — choix conservateur :
        /// le vide caché derrière les barres opaques du shell est de toute façon invisible au joueur
        /// (ordre de fratrie shell, AppShell.cs:29-33), donc borner contre le rect ENTIER est PLUS
        /// STRICT que nécessaire, jamais moins — la sécurité qui compte (aucun vide VISIBLE) est
        /// garantie par construction, au prix d'un peu de marge de pan non exploitée sous les barres.</summary>
        private Vector2 ClampPan(Vector2 pos, float scale)
        {
            Vector2 fondSize = fondRt.rect.size;
            Vector2 viewport = rootRt.rect.size;
            return new Vector2(
                ClampAxis(pos.x, fondSize.x * scale, viewport.x),
                ClampAxis(pos.y, fondSize.y * scale, viewport.y));
        }

        private static float ClampAxis(float pos, float contentSize, float viewportSize)
        {
            float contentHalf = contentSize * 0.5f;
            float viewportHalf = viewportSize * 0.5f;
            if (contentHalf >= viewportHalf)
                return Mathf.Clamp(pos, viewportHalf - contentHalf, contentHalf - viewportHalf);
            return 0f; // contenu plus petit que le viewport sur cet axe — reste centré
        }

        private float EffectiveScaleFactor() =>
            (canvas != null && canvas.scaleFactor > 0f) ? canvas.scaleFactor : 1f;

        // ============================================================== filtrage (§Zoom)

        /// <summary>POINT au-delà de la référence (échelles entières ≥2, NEAREST mesuré meilleur),
        /// BILINEAR à la référence (×1 — indifférent à l'échantillonnage exact, et c'est le réglage
        /// d'IMPORT déjà certifié bit-exact). S'applique à TOUT ce que la scène affiche aujourd'hui
        /// (fond + sprites bâtiment + calques additifs) — un `Texture2D.filterMode` modifié au
        /// runtime est un état PARTAGÉ par toutes les références à cette texture (jamais persisté sur
        /// l'asset) : appelé inconditionnellement à chaque changement de zoom ET à Configure(), pour
        /// ne jamais hériter d'un mode POINT laissé par une visite de district précédente.</summary>
        private void ApplyFilterModeForZoom()
        {
            FilterMode mode = (ZoomIndex == referenceZoomIndex) ? FilterMode.Bilinear : FilterMode.Point;
            Image[] images = sceneRt.GetComponentsInChildren<Image>(true);
            foreach (Image img in images)
                if (img.sprite != null && img.sprite.texture != null)
                    img.sprite.texture.filterMode = mode;
        }

        // ============================================================== gestes (lecture d'input)
        // Non couvert par les falsifiables PlayMode (§ Deviations : aucun précédent dans ce dépôt pour
        // simuler un événement Input System brut en test — la surface TESTABLE est PanBy/ZoomTo/
        // Configure ci-dessus, MÊME patron que les test hooks de DistrictInteriorScreenController).
        // TopBar/TabBar/tout élément interactif ne sont JAMAIS traversés (unity-input-touch : "un
        // touché qui débute sur un Graphic raycastable appartient à l'UI") — mais ce diorama contient
        // des Image raycastables SANS Selectable (le sprite bâtiment, raycastTarget==true par défaut,
        // aucun Button dessus) : `EventSystem.IsPointerOverGameObject` seul BLOQUERAIT le pan sur la
        // quasi-totalité de la surface visible. Le geste de test est donc plus étroit et plus correct
        // que le patron générique de la skill : "appartient à l'UI" ⟺ un `Selectable` (Button, etc.)
        // est dans la chaîne de hits — ce qui protège TopBar/TabBar/le bouton Entrer/← Carte (tous des
        // Selectable) sans jamais voler un geste à du contenu de carte purement visuel.

        private void OnEnable() => EnhancedTouchSupport.Enable();

        private bool mouseDragArmed;
        private Vector2 lastMousePos;
        private bool touchDragArmed;
        private Vector2 lastTouchPos;
        private float lastPinchDist = -1f;
        private float pinchAccum = 1f;
        private const float PinchStepRatio = 1.2f; // ±20% cumulé déclenche un palier de zoom

        private void Update()
        {
            if (!HasFond) return;
            HandleTouch();
            HandleMouse();
        }

        private void HandleTouch()
        {
            var touches = Touch.activeTouches;
            if (touches.Count >= 2)
            {
                touchDragArmed = false;
                Vector2 p0 = touches[0].screenPosition, p1 = touches[1].screenPosition;
                float dist = Vector2.Distance(p0, p1);
                bool justStarted = lastPinchDist < 0f ||
                    touches[0].phase == TouchPhase.Began || touches[1].phase == TouchPhase.Began;
                if (justStarted)
                {
                    if (IsOverInteractiveUI(p0) || IsOverInteractiveUI(p1)) { lastPinchDist = -1f; return; }
                    lastPinchDist = dist;
                    pinchAccum = 1f;
                    return;
                }
                if (lastPinchDist > 1f)
                {
                    pinchAccum *= dist / lastPinchDist;
                    Vector2 mid = (p0 + p1) * 0.5f;
                    if (pinchAccum >= PinchStepRatio) { ZoomStep(1, mid); pinchAccum = 1f; }
                    else if (pinchAccum <= 1f / PinchStepRatio) { ZoomStep(-1, mid); pinchAccum = 1f; }
                }
                lastPinchDist = dist;
                return;
            }

            lastPinchDist = -1f;
            pinchAccum = 1f;
            if (touches.Count != 1) { touchDragArmed = false; return; }

            Touch t = touches[0];
            switch (t.phase)
            {
                case TouchPhase.Began:
                    touchDragArmed = !IsOverInteractiveUI(t.screenPosition);
                    lastTouchPos = t.screenPosition;
                    break;
                case TouchPhase.Moved:
                    if (touchDragArmed) { PanBy(t.screenPosition - lastTouchPos); lastTouchPos = t.screenPosition; }
                    break;
                case TouchPhase.Ended:
                case TouchPhase.Canceled:
                    touchDragArmed = false;
                    break;
            }
        }

        private void HandleMouse()
        {
            Mouse mouse = Mouse.current;
            if (mouse == null) return;

            if (mouse.leftButton.wasPressedThisFrame)
            {
                Vector2 pos = mouse.position.ReadValue();
                mouseDragArmed = !IsOverInteractiveUI(pos);
                lastMousePos = pos;
            }
            else if (mouse.leftButton.isPressed && mouseDragArmed)
            {
                Vector2 pos = mouse.position.ReadValue();
                Vector2 delta = pos - lastMousePos;
                if (delta.sqrMagnitude > 0.0001f) { PanBy(delta); lastMousePos = pos; }
            }
            else if (mouse.leftButton.wasReleasedThisFrame)
            {
                mouseDragArmed = false;
            }

            float scrollY = mouse.scroll.ReadValue().y;
            if (Mathf.Abs(scrollY) > 0.01f)
            {
                Vector2 pos = mouse.position.ReadValue();
                if (!IsOverInteractiveUI(pos)) ZoomStep(scrollY > 0f ? 1 : -1, pos);
            }
        }

        /// <summary>"appartient à l'UI" ⟺ un `Selectable` est dans la chaîne de hits à `screenPos`
        /// (voir le commentaire de tête de section ci-dessus pour pourquoi PAS
        /// `EventSystem.IsPointerOverGameObject` seul).</summary>
        private static bool IsOverInteractiveUI(Vector2 screenPos)
        {
            if (EventSystem.current == null) return false;
            var ped = new PointerEventData(EventSystem.current) { position = screenPos };
            var results = new List<RaycastResult>();
            EventSystem.current.RaycastAll(ped, results);
            foreach (RaycastResult r in results)
                if (r.gameObject.GetComponentInParent<Selectable>() != null) return true;
            return false;
        }
    }
}
