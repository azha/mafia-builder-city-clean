using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.CityMap
{
    // Drives the City Map screen:
    //   1. fetches /v1/world/districts (public) and builds a two-column layout grouped
    //      by bank_side, one DistrictCellView per district coloured by control_state;
    //   2. signs in (POST /v1/auth/signin) to get a Bearer token;
    //   3. fetches the JWT-gated Heat projection per district and shows a heat badge
    //      on each cell — a togglable overlay.
    //
    // The whole UI is built programmatically from a single Canvas so the scene needs
    // almost no manual wiring — the controller find-or-creates the Canvas + EventSystem.
    public class CityMapController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
    {
        [Header("Backend")]
        [Tooltip("Public game API base. /v1 districts is unauthed; heat needs a token.")]
        [SerializeField] private string baseUrl = "http://localhost";

        [Header("Demo sign-in (seeded by Tools/seed_citymap_demo.mjs)")]
        [SerializeField] private string demoIdentifier = "citymap_demo@example.test";
        [SerializeField] private string demoPassword = "citymap-demo-pw";

        [Header("Overlay")]
        [SerializeField] private bool heatOverlayOn = true;

        // District-load state.
        public bool IsLoaded { get; private set; }
        public string LastError { get; private set; }
        public IReadOnlyList<DistrictCellView> Cells => cells;
        public int NorthCount { get; private set; }
        public int SouthCount { get; private set; }

        // Auth + heat state.
        public bool IsAuthenticated { get; private set; }
        public string Token { get; private set; }
        public string AuthError { get; private set; }
        public bool HeatLoaded { get; private set; }
        public bool HeatOverlayOn => heatOverlayOn;

        // District detail panel state.
        public DistrictDetail CurrentDetail { get; private set; }
        public bool DetailLoaded { get; private set; }
        public int SelectedDistrictId { get; private set; } = -1;

        // nav-hud-design-v1.md §3.2 (chunk 2) — « Entrer » : fired with the district id the SAME
        // way every other event in this file surfaces state (a public C# event, no shell coupling
        // here — AppShell subscribes when it mounts this controller as the City tenant, §3.3).
        public event System.Action<int> OnEnterDistrict;

        private readonly List<DistrictCellView> cells = new List<DistrictCellView>();
        private RectTransform northContent;
        private RectTransform southContent;
        private TextMeshProUGUI toggleLabel;
        private TMP_FontAsset font;

        private GameObject detailPanel;
        private RectTransform detailContent;
        private TextMeshProUGUI detailTitle;
        private Coroutine detailCoroutine;
        private VerticalLayoutGroup rootVlg;

        // §3.2 — « Entrer », un enfant PERSISTANT de detailPanel ("Footer", 3ᵉ enfant — §3.2 : la
        // destruction de RenderDetail est scopée à detailContent, jamais à detailPanel lui-même,
        // donc ce bouton SURVIT à tous les rafraîchissements du panneau).
        private Button enterButton;

        // Right padding reserved for the detail panel (380 wide + 16 margin + gap) so the
        // banks reflow to the left instead of being covered when the panel is open.
        private const int PanelReservedRight = 408;
        private const int RootPadding = 16;

        // ShellChrome.BottomInsetPx (dock height) read fresh each time, never cached: the shell
        // publishes it AFTER a locataire mounts, and it can be 0 for a while during that window.
        // Vaut 0 hors shell (les fixtures ci-dessous montent CityMapController seul) — repli
        // inchangé pour elles.
        private static int BottomPadding => RootPadding + (int)MafiaCleanCity.Shell.ShellChrome.BottomInsetPx;

        private void Start()
        {
            font = DesignTokens.Current.primaryFont;
            BuildLayout();
            EnsureEventSystem();
            StartCoroutine(Load());
        }

        /// <summary>Fetch districts + render, then sign in + load the heat overlay.</summary>
        public IEnumerator Load()
        {
            IsLoaded = false;
            LastError = null;
            ClearCells();

            var client = new WorldApiClient { BaseUrl = baseUrl };
            List<DistrictDto> result = null;
            string error = null;
            yield return client.GetDistricts(d => result = d, e => error = e);

            if (error != null)
            {
                LastError = error;
                Debug.LogError($"[CityMap] {error}");
                yield break;
            }

            Populate(result);
            IsLoaded = true;
            Debug.Log($"[CityMap] Loaded {cells.Count} districts (north={NorthCount}, south={SouthCount}).");

            yield return AuthThenHeat();
        }

        /// <summary>AMENDÉ (hud-session-arbitrages-design.md §1.2, B1) — si un jeton a déjà été
        /// INJECTÉ par le shell (`SetToken`, avant `Start()`), `IsAuthenticated` est déjà vrai ici :
        /// saute le sign-in démo, pose l'état comme le ferait un signin réussi (repli inchangé,
        /// `IShellTenant.cs` — REÇU un jeton ⇒ ne signe pas soi-même). Le second publieur du chunk 5
        /// (`AdoptToken` vers le shell) a QUITTÉ ce point : le shell possède la session, la
        /// direction locataire→shell pour le JETON meurt avec la course qu'elle portait (§1.1).</summary>
        private IEnumerator AuthThenHeat()
        {
            if (IsAuthenticated)
            {
                RefreshEnterInteractable();
                yield return LoadHeat();
                yield break;
            }

            var auth = new AuthClient { BaseUrl = baseUrl };
            string token = null;
            string err = null;
            yield return DemoIdentityResolver.ResolveAndSignIn(auth,
                DemoIdentityResolver.CityMapIdentifierEnvVar, DemoIdentityResolver.CityMapPasswordEnvVar,
                demoIdentifier, demoPassword, t => token = t, e => err = e);

            if (err != null || string.IsNullOrEmpty(token))
            {
                AuthError = err ?? "sign-in returned no token";
                Debug.LogError($"[CityMap] auth failed: {AuthError}");
                yield break;
            }

            Token = token;
            IsAuthenticated = true;
            RefreshEnterInteractable(); // §3.2 — 2e point : le panneau peut avoir été ouvert AVANT l'auth (Populate à :98, signature à :102)
            Debug.Log("[CityMap] Signed in — Bearer token acquired.");

            yield return LoadHeat();
        }

        /// <summary>IShellTenant token injection (B1) — set directly by the shell BEFORE Start() runs
        /// (synchronous MountTenant<T> window). Mirrors DashboardController.SetToken.</summary>
        public void SetToken(string token)
        {
            Token = token;
            IsAuthenticated = !string.IsNullOrEmpty(token);
        }

        /// <summary>Fetch the heat projection for every district and badge each cell.</summary>
        public IEnumerator LoadHeat()
        {
            if (!IsAuthenticated)
            {
                Debug.LogWarning("[CityMap] LoadHeat called before authentication");
                yield break;
            }

            var client = new WorldApiClient { BaseUrl = baseUrl };
            foreach (DistrictCellView cell in cells)
            {
                DistrictHeatDto heat = null;
                string err = null;
                yield return client.GetDistrictHeat(cell.Model.id, Token, h => heat = h, e => err = e);
                if (heat != null)
                {
                    cell.SetHeat(CityMapEnums.ParseHeatBucket(heat.district_bucket));
                }
                else if (err != null)
                {
                    Debug.LogWarning($"[CityMap] heat fetch failed for district {cell.Model.id}: {err}");
                }
            }

            HeatLoaded = true;
            ApplyOverlayVisibility();
            Debug.Log($"[CityMap] Heat overlay loaded for {cells.Count} districts.");
        }

        /// <summary>Toggle the heat overlay on/off (button + public API for tests).</summary>
        public void SetHeatOverlay(bool on)
        {
            heatOverlayOn = on;
            UpdateToggleLabel();
            ApplyOverlayVisibility();
        }

        private void ApplyOverlayVisibility()
        {
            foreach (DistrictCellView cell in cells) cell.ShowHeat(heatOverlayOn);
        }

        private void Populate(List<DistrictDto> districts)
        {
            NorthCount = 0;
            SouthCount = 0;
            foreach (DistrictDto dto in districts)
            {
                BankSide bank = CityMapEnums.ParseBankSide(dto.bank_side);
                RectTransform parent = bank == BankSide.South ? southContent : northContent;
                if (bank == BankSide.South) SouthCount++; else NorthCount++;

                DistrictCellView cell = BuildCell(parent);
                cell.Bind(dto, cell.GetComponent<Image>(), cell.GetComponentInChildren<TextMeshProUGUI>());
                cells.Add(cell);
            }
        }

        private void ClearCells()
        {
            foreach (DistrictCellView c in cells)
            {
                if (c != null) Destroy(c.gameObject);
            }
            cells.Clear();
            NorthCount = 0;
            SouthCount = 0;
            HeatLoaded = false;
        }

        // W3.U1 C1 (design D2) — optional parent-of-mount the AppShell renseigne BEFORE Start() runs.
        // See DashboardController.mountParent for the full rationale (byte-identical mechanism here).
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        // ----------------------------------------------------------------- UI

        private void BuildLayout()
        {
            Canvas canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                GameObject canvasGo = new GameObject("Canvas",
                    typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                canvas = canvasGo.GetComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                CanvasScaler scaler = canvasGo.GetComponent<CanvasScaler>();
                scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                scaler.referenceResolution = new Vector2(1280, 720);
            }
            Transform mountRoot = mountParent != null ? mountParent : canvas.transform; // W3.U1 D2

            GameObject root = NewUI("CityMapRoot", mountRoot);
            RectTransform rootRt = (RectTransform)root.transform;
            Stretch(rootRt, Vector2.zero, Vector2.zero);
            // 2026-09-02 — hygiène de montage : aucune garde d'ordre de fratrie n'existait ici.
            // `CityMapRoot` (contrairement à ShopScreenController) n'est PAS le transform du
            // locataire lui-même — c'est un enfant SÉPARÉ créé ici, sous `mountRoot`, jamais
            // reparenté ensuite : un site unique suffit (pas de `OnTransformParentChanged` à poser,
            // rien ne le reparente après cette ligne — le patron à deux sites de
            // ShopScreenController.cs:105-135 répond à un mécanisme qui ne s'applique pas ici).
            rootRt.SetAsLastSibling();
            Image rootBg = root.AddComponent<Image>();
            rootBg.color = DesignTokens.Current.mapRootBg;
            rootVlg = root.AddComponent<VerticalLayoutGroup>();
            // 2026-09-02 — `ShellChrome.BottomInsetPx` (zone sûre + barre d'onglets) n'était lu
            // nulle part dans ce fichier : le contenu (dernière rangée de districts, légende)
            // pouvait passer sous le dock. Vaut 0 hors shell (tests isolés ci-dessous) : inchangé
            // pour eux. Même valeur réutilisée dans ReserveSpaceForPanel — ne PAS dupliquer le 0
            // implicite là-bas.
            rootVlg.padding = new RectOffset(RootPadding, RootPadding, RootPadding, BottomPadding);
            rootVlg.spacing = 12;
            rootVlg.childControlWidth = true;
            rootVlg.childControlHeight = true;
            rootVlg.childForceExpandWidth = true;
            rootVlg.childForceExpandHeight = false;

            // Header row: title + heat-overlay toggle button.
            GameObject header = NewUI("Header", root.transform);
            HorizontalLayoutGroup hhlg = header.AddComponent<HorizontalLayoutGroup>();
            hhlg.spacing = 12;
            hhlg.childAlignment = TextAnchor.MiddleCenter;
            hhlg.childControlWidth = true;
            hhlg.childControlHeight = true;
            hhlg.childForceExpandWidth = false;
            hhlg.childForceExpandHeight = true;
            AddLayoutElement(header, minHeight: 44, flexibleHeight: 0);

            // JUGE-D5 (audit visuel du district, 2026-08-21, balayage étendu à CityMap.cs — même
            // périmètre CityMap/) — chaîne traduite, était en anglais dans une surface autrement
            // française ("← Carte"/Lib("Entrer") plus bas dans ce même fichier).
            TextMeshProUGUI title = NewText("Title", header.transform, Lib("CARTE DE LA VILLE — Districts"), 28, TextAlignmentOptions.Left);
            title.fontStyle = FontStyles.Bold;
            AddLayoutElement(title.gameObject, flexibleWidth: 1);

            BuildToggleButton(header.transform);

            // Banks row: two columns side by side, DIMENSIONNÉES SUR LEUR CONTENU (retour user
            // relayé par le contrôleur, 2026-08-21 : les captures multi-résolution du lot HUD v3.1
            // ont montré cette rangée forcée à `flexibleHeight=1` — elle s'étirait pour occuper
            // TOUT l'espace vertical restant du canvas, laissant les 3/4 d'un écran portrait
            // recouverts d'un aplat de couleur totalement vide sous la liste de districts. MESURÉ
            // (execute_code, geometry live) : le contenu réel (en-tête + N cellules de 40px) tenait
            // dans le quart supérieur d'un canvas 1080×2400. `flexibleHeight=0` (retiré) : `Banks`
            // se dimensionne maintenant sur son CONTENU — le reste du canvas montre `mapRootBg`
            // (le fond de l'écran, PAS un second aplat de panneau) ; `childForceExpandHeight=true`
            // À L'INTÉRIEUR de `Banks` reste utile pour égaliser les deux colonnes ENTRE ELLES si
            // north/south ont des comptes différents — inchangé, portée réduite au strict besoin.
            GameObject banks = NewUI("Banks", root.transform);
            HorizontalLayoutGroup banksHlg = banks.AddComponent<HorizontalLayoutGroup>();
            banksHlg.spacing = 12;
            banksHlg.childControlWidth = true;
            banksHlg.childControlHeight = true;
            banksHlg.childForceExpandWidth = true;
            banksHlg.childForceExpandHeight = true;
            AddLayoutElement(banks, flexibleHeight: 0);

            northContent = BuildColumn(banks.transform, "North Bank", DesignTokens.Current.mapPanelNorth);
            southContent = BuildColumn(banks.transform, "South Bank", DesignTokens.Current.mapPanelSouth);

            BuildLegend(root.transform);
            BuildDetailPanel(mountRoot); // W3.U1 D2 — modal stays confined to the shell's content slot too
        }

        private void BuildToggleButton(Transform parent)
        {
            GameObject btn = NewUI("HeatToggle", parent);
            Image img = btn.AddComponent<Image>();
            img.color = DesignTokens.Current.mapChipBg;
            Button button = btn.AddComponent<Button>();
            button.targetGraphic = img;
            AddLayoutElement(btn, minHeight: 36, flexibleHeight: 0, minWidth: 210, preferredWidth: 210);

            toggleLabel = NewText("Label", btn.transform, "", 16, TextAlignmentOptions.Center);
            Stretch((RectTransform)toggleLabel.transform, new Vector2(8, 4), new Vector2(-8, -4));

            button.onClick.AddListener(() => SetHeatOverlay(!heatOverlayOn));
            UpdateToggleLabel();
        }

        private void UpdateToggleLabel()
        {
            if (toggleLabel != null)
            {
                toggleLabel.text = heatOverlayOn ? "Heat overlay: ON" : "Heat overlay: OFF";
            }
        }

        private RectTransform BuildColumn(Transform parent, string header, Color panelColor)
        {
            GameObject col = NewUI(header.Replace(" ", ""), parent);
            // PIÈGE MESURÉ ailleurs dans ce dépôt (`Shell/VerticalGradientImage.cs`) — `Graphic`
            // porte `[RequireComponent(typeof(CanvasRenderer))]`, mais `AddComponent<T>()` seul ne
            // l'ajoute PAS à l'exécution : sans lui, ce Graphic ne dessinerait RIEN, silencieusement.
            // `NewUI` ne construit qu'un `RectTransform` — CanvasRenderer explicite ici.
            col.AddComponent<CanvasRenderer>();
            // Retour user relayé par le contrôleur (2026-08-21) : « verre gravé, aucun aplat de
            // couleur » — REUSE du dégradé 2 arrêts (voir `CityMapVerticalGradient.cs`, patron de
            // `Shell/VerticalGradientImage.cs`, dupliqué ICI faute de pouvoir référencer `Shell`
            // depuis `CityMap` sans cycle d'assembly). Arrêt HAUT = `panelColor` (identité de la
            // banque, PRÉSERVÉE — north/south restent visuellement distincts) ; arrêt BAS =
            // `mapRootBg` (le fond partagé de l'écran) — le panneau se fond dans le fond au lieu
            // de s'arrêter net sur un bord d'aplat, quelle que soit sa hauteur réelle après le
            // correctif de layout ci-dessus.
            CityMapVerticalGradient colBg = col.AddComponent<CityMapVerticalGradient>();
            colBg.SetColors(panelColor, DesignTokens.Current.mapRootBg);
            VerticalLayoutGroup vlg = col.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(8, 8, 8, 8);
            vlg.spacing = 6;
            vlg.childAlignment = TextAnchor.UpperCenter;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            AddLayoutElement(col, flexibleWidth: 1);

            TextMeshProUGUI h = NewText("Header", col.transform, header.ToUpperInvariant(), 20, TextAlignmentOptions.Center);
            h.fontStyle = FontStyles.Bold;
            AddLayoutElement(h.gameObject, minHeight: 32, flexibleHeight: 0);

            return (RectTransform)col.transform;
        }

        private DistrictCellView BuildCell(Transform parent)
        {
            GameObject cell = NewUI("DistrictCell", parent);
            Image bg = cell.AddComponent<Image>();
            bg.color = Color.gray;
            AddLayoutElement(cell, minHeight: 40, preferredHeight: 40, flexibleHeight: 0);

            TextMeshProUGUI label = NewText("Label", cell.transform, "", 16, TextAlignmentOptions.Left);
            RectTransform labelRt = (RectTransform)label.transform;
            Stretch(labelRt, new Vector2(10, 2), new Vector2(-94, -2)); // leave room for the heat badge

            // Heat badge — right-anchored. Hidden until heat is fetched.
            //
            // Retour user relayé par le contrôleur (2026-08-21) : « l'état de chaleur signalé sans
            // pastille pleine ». L'ANCIEN badge remplissait tout le conteneur 80×24 de la couleur
            // heat (une vraie "pastille pleine" — même défaut que l'ancien onglet actif de la
            // TabBar, une teinte fonctionnelle en APLAT). REUSE du patron déjà établi PLUS BAS dans
            // ce même fichier pour la légende de contrôle (`AddLegendItem` : petit carré-témoin +
            // légende neutre, jamais un pavé coloré) — le même conteneur 80×24 reste inchangé (le
            // label de la cellule réserve déjà 94px pour lui, `Stretch` ci-dessus), mais son CONTENU
            // devient un petit carré-témoin (14px, gauche) + un texte NEUTRE (blanc, comme tout
            // autre texte de cet écran — `NewText`) au lieu d'un fond coloré.
            GameObject badge = NewUI("HeatBadge", cell.transform);
            RectTransform badgeRt = (RectTransform)badge.transform;
            badgeRt.anchorMin = new Vector2(1f, 0.5f);
            badgeRt.anchorMax = new Vector2(1f, 0.5f);
            badgeRt.pivot = new Vector2(1f, 0.5f);
            badgeRt.sizeDelta = new Vector2(80f, 24f);
            badgeRt.anchoredPosition = new Vector2(-8f, 0f);

            const float SwatchDiameterPx = 14f;
            GameObject swatchGo = NewUI("HeatSwatch", badge.transform);
            RectTransform swatchRt = (RectTransform)swatchGo.transform;
            swatchRt.anchorMin = new Vector2(0f, 0.5f);
            swatchRt.anchorMax = new Vector2(0f, 0.5f);
            swatchRt.pivot = new Vector2(0f, 0.5f);
            swatchRt.sizeDelta = new Vector2(SwatchDiameterPx, SwatchDiameterPx);
            swatchRt.anchoredPosition = Vector2.zero;
            Image badgeBg = swatchGo.AddComponent<Image>();
            badgeBg.color = CityMapEnums.HeatColorFor(HeatBucket.Unknown);
            badgeBg.raycastTarget = false; // let clicks fall through to the cell button

            TextMeshProUGUI badgeLabel = NewText("HeatLabel", badge.transform, "", 12, TextAlignmentOptions.Left);
            Stretch((RectTransform)badgeLabel.transform, new Vector2(SwatchDiameterPx + 6f, 2f), new Vector2(0f, -2f));

            DistrictCellView view = cell.AddComponent<DistrictCellView>();
            view.AttachHeatBadge(badge, badgeBg, badgeLabel);

            // The whole cell is a button → opens the district detail panel.
            Button cellButton = cell.AddComponent<Button>();
            cellButton.targetGraphic = bg;
            cellButton.onClick.AddListener(() => SelectDistrict(view.Model.id));

            return view;
        }

        private void BuildLegend(Transform parent)
        {
            GameObject legend = NewUI("Legend", parent);
            HorizontalLayoutGroup hlg = legend.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 18;
            hlg.childAlignment = TextAnchor.MiddleCenter;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;
            AddLayoutElement(legend, minHeight: 30, flexibleHeight: 0);

            AddLegendItem(legend.transform, "Uncontested", CityMapEnums.ColorFor(ControlState.Uncontested));
            AddLegendItem(legend.transform, "Contested", CityMapEnums.ColorFor(ControlState.Contested));
            AddLegendItem(legend.transform, "Player held", CityMapEnums.ColorFor(ControlState.PlayerHeld));
            AddLegendItem(legend.transform, "Rival held", CityMapEnums.ColorFor(ControlState.RivalHeld));
        }

        private void AddLegendItem(Transform parent, string label, Color swatchColor)
        {
            GameObject item = NewUI("LegendItem", parent);
            HorizontalLayoutGroup hlg = item.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 6;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;

            GameObject swatch = NewUI("Swatch", item.transform);
            Image sw = swatch.AddComponent<Image>();
            sw.color = swatchColor;
            AddLayoutElement(swatch, minHeight: 18, preferredHeight: 18, minWidth: 18, preferredWidth: 18);

            TextMeshProUGUI t = NewText("Caption", item.transform, label, 14, TextAlignmentOptions.Left);
            AddLayoutElement(t.gameObject, minHeight: 18);
        }

        // ------------------------------------------------------ detail panel

        private void BuildDetailPanel(Transform canvasParent)
        {
            detailPanel = NewUI("DetailPanel", canvasParent);
            RectTransform dp = (RectTransform)detailPanel.transform;
            dp.anchorMin = new Vector2(1f, 0f);
            dp.anchorMax = new Vector2(1f, 1f);
            dp.pivot = new Vector2(1f, 1f);
            // 2026-09-02 — le bas de ce panneau tombait EXACTEMENT sur le bord bas de ContentSlot
            // (0 px d'écart : anchorMin.y=0, pivot=(1,1), l'ancien `sizeDelta.y=-16` ne mange QUE
            // l'inset du haut). Sous shell, ContentSlot couvre tout le canvas par conception, donc
            // le Footer/« Entrer » du panneau passait sous le dock. `sizeDelta.y` mange maintenant
            // AUSSI `ShellChrome.BottomInsetPx` — `anchoredPosition.y` reste -16 (inset du haut,
            // hors périmètre de ce correctif) ; vaut 0 hors shell, repli inchangé pour les fixtures.
            dp.sizeDelta = new Vector2(380f, -(16f + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx));
            dp.anchoredPosition = new Vector2(-16f, -16f);
            // 2026-09-02 — même garde structurelle que CityMapRoot ci-dessus : ce panneau doit
            // toujours rendre AU-DESSUS de la carte. Aujourd'hui redondant (BuildDetailPanel est
            // appelé après CityMapRoot dans le même BuildLayout, donc déjà dernier enfant à la
            // création) — posé explicitement pour ne plus dépendre de cet ordre d'appel.
            dp.SetAsLastSibling();

            Image bg = detailPanel.AddComponent<Image>();
            bg.color = DesignTokens.Current.mapDialogBg;

            VerticalLayoutGroup vlg = detailPanel.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(14, 14, 12, 12);
            vlg.spacing = 8;
            vlg.childAlignment = TextAnchor.UpperLeft;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            GameObject header = NewUI("Header", detailPanel.transform);
            HorizontalLayoutGroup hlg = header.AddComponent<HorizontalLayoutGroup>();
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;
            hlg.spacing = 8;
            AddLayoutElement(header, minHeight: 30, flexibleHeight: 0);

            detailTitle = NewText("Title", header.transform, "", 20, TextAlignmentOptions.Left);
            detailTitle.fontStyle = FontStyles.Bold;
            AddLayoutElement(detailTitle.gameObject, flexibleWidth: 1);

            GameObject closeBtn = NewUI("Close", header.transform);
            Image closeImg = closeBtn.AddComponent<Image>();
            closeImg.color = DesignTokens.Current.mapCloseButtonBg;
            Button cb = closeBtn.AddComponent<Button>();
            cb.targetGraphic = closeImg;
            cb.onClick.AddListener(HideDetail);
            AddLayoutElement(closeBtn, minHeight: 26, flexibleHeight: 0, minWidth: 30, preferredWidth: 30);
            TextMeshProUGUI cx = NewText("X", closeBtn.transform, "X", 16, TextAlignmentOptions.Center);
            Stretch((RectTransform)cx.transform, Vector2.zero, Vector2.zero);

            GameObject content = NewUI("Content", detailPanel.transform);
            VerticalLayoutGroup cvlg = content.AddComponent<VerticalLayoutGroup>();
            cvlg.spacing = 4;
            cvlg.childAlignment = TextAnchor.UpperLeft;
            cvlg.childControlWidth = true;
            cvlg.childControlHeight = true;
            cvlg.childForceExpandWidth = true;
            cvlg.childForceExpandHeight = false;
            AddLayoutElement(content, flexibleHeight: 1);
            detailContent = (RectTransform)content.transform;

            // §3.2 — "Footer", 3ᵉ enfant DIRECT de detailPanel (siblings: Header, Content, Footer).
            // Construit ICI, UNE fois, jamais recréé par RenderDetail (dont la boucle de
            // destruction est scopée à detailContent — vérifié dans le corps ci-dessus, :587 avant
            // ce chunk). Second argument décisif du design : BuildDetail fait ~13 requêtes
            // séquentielles avant FinishDetail ⇒ un bouton construit dans RenderDetail serait
            // ABSENT pendant tout le chargement ; construit ici, il existe dès l'ouverture du
            // panneau (SelectDistrict), avant même la première requête de projection.
            GameObject footer = NewUI("Footer", detailPanel.transform);
            HorizontalLayoutGroup fhlg = footer.AddComponent<HorizontalLayoutGroup>();
            fhlg.childAlignment = TextAnchor.MiddleCenter;
            fhlg.childControlWidth = true;
            fhlg.childControlHeight = true;
            fhlg.childForceExpandWidth = true;
            fhlg.childForceExpandHeight = true;
            AddLayoutElement(footer, minHeight: 40, flexibleHeight: 0);

            GameObject enterGo = NewUI("EnterButton", footer.transform);
            Image enterImg = enterGo.AddComponent<Image>();
            enterImg.color = DesignTokens.Current.mapChipBg; // REUSE — même token que HeatToggle (pas accentGold : allowlist C5F2 fermée)
            enterButton = enterGo.AddComponent<Button>();
            enterButton.targetGraphic = enterImg;
            enterButton.interactable = false; // aucun jeton au démarrage (nav-F3)
            enterButton.onClick.AddListener(() => OnEnterDistrict?.Invoke(SelectedDistrictId));

            TextMeshProUGUI enterLabel = NewText("Label", enterGo.transform, "Entrer", 16, TextAlignmentOptions.Center);
            Stretch((RectTransform)enterLabel.transform, Vector2.zero, Vector2.zero);

            detailPanel.SetActive(false);
        }

        /// <summary>§3.2 — les TROIS points de rafraîchissement de l'interactable de « Entrer »,
        /// EXACTEMENT ceux nommés par le design : SelectDistrict, juste après IsAuthenticated=true,
        /// FinishDetail. Un jeton ET un district sélectionné sont tous deux requis — le panneau qui
        /// porte ce bouton n'est de toute façon visible que quand un district est sélectionné, mais
        /// l'interactable epingle la valeur, jamais l'activation du GameObject seule.</summary>
        private void RefreshEnterInteractable()
        {
            if (enterButton != null) enterButton.interactable = IsAuthenticated && SelectedDistrictId >= 0;
        }

        // I2 (hud-session-arbitrages-design.md §3) — RETIRÉ FRANCHEMENT (branche 2 : « garde-le sur
        // un chemin emprunté OU retire-le franchement »). Ce localisateur n'a plus AUCUN appelant
        // ici sous B1 : `AdoptToken` a quitté le contrat (§1.2) et CityMapController ne publie pas
        // de heat (seul Dashboard le fait, §6.2). Sa copie dédupliquée vit désormais dans
        // `ShellContracts.ShellSessionSinkLocator`, sur le seul chemin qui l'emprunte encore
        // (`DashboardController.LoadDashboard`).

        /// <summary>Open the detail panel for a district and fetch its system projections.</summary>
        public void SelectDistrict(int districtId)
        {
            SelectedDistrictId = districtId;
            DetailLoaded = false;
            DistrictCellView cell = cells.FirstOrDefault(c => c.Model != null && c.Model.id == districtId);
            // 2026-09-02 — même repli que la tuile (CityMapEnums.DisplayName) : fiction d'abord,
            // name_canonical si le back n'en sert pas.
            if (detailTitle != null) detailTitle.text = cell != null ? CityMapEnums.DisplayName(cell.Model) : $"District {districtId}";
            if (detailPanel != null) detailPanel.SetActive(true);
            ReserveSpaceForPanel(true);
            RefreshEnterInteractable(); // §3.2 — 1er point
            if (detailCoroutine != null) StopCoroutine(detailCoroutine);
            detailCoroutine = StartCoroutine(BuildDetail(districtId, cell));
        }

        public void HideDetail()
        {
            SelectedDistrictId = -1;
            if (detailPanel != null) detailPanel.SetActive(false);
            ReserveSpaceForPanel(false);
        }

        // Reflow the map to the left of the panel (reassign padding so the layout group
        // re-runs — mutating RectOffset fields in place would not mark it dirty).
        private void ReserveSpaceForPanel(bool reserve)
        {
            if (rootVlg == null) return;
            int right = reserve ? PanelReservedRight : RootPadding;
            // 2026-09-02 — ce recalcul écrasait le padding bas posé dans BuildLayout et retombait
            // sur un `RootPadding` nu, perdant le BottomInsetPx dès le premier SelectDistrict/
            // HideDetail. Même valeur qu'à la construction (BottomPadding), pas un second calcul.
            rootVlg.padding = new RectOffset(RootPadding, right, RootPadding, BottomPadding);
        }

        private static DetailRow Missing(string label) => new DetailRow(label, "n/a (not ticked)", false);

        // Aggregate the per-district system projections into the detail view model.
        private IEnumerator BuildDetail(int districtId, DistrictCellView cell)
        {
            var detail = new DistrictDetail { districtId = districtId, title = detailTitle != null ? detailTitle.text : "" };

            if (cell != null)
            {
                detail.rows.Add(new DetailRow("Profile", cell.Model.profile));
                detail.rows.Add(new DetailRow("Blocks", cell.Model.block_count.ToString()));
                detail.rows.Add(new DetailRow("Bank", cell.Model.bank_side));
                detail.rows.Add(new DetailRow("Control", cell.Model.control_state, true, true, CityMapEnums.ColorFor(cell.State)));
            }

            if (!IsAuthenticated)
            {
                detail.rows.Add(new DetailRow("Projections", "sign-in required", false));
                FinishDetail(detail);
                yield break;
            }

            var world = new WorldApiClient { BaseUrl = baseUrl };
            var proj = new CityProjectionsClient { BaseUrl = baseUrl };

            DistrictHeatDto heat = null;
            yield return world.GetDistrictHeat(districtId, Token, h => heat = h, _ => { });
            if (heat != null)
            {
                HeatBucket db = CityMapEnums.ParseHeatBucket(heat.district_bucket);
                HeatBucket cbk = CityMapEnums.ParseHeatBucket(heat.citywide_bucket);
                detail.rows.Add(new DetailRow("Heat — district", heat.district_bucket, true, true, CityMapEnums.HeatColorFor(db)));
                detail.rows.Add(new DetailRow("Heat — citywide", heat.citywide_bucket, true, true, CityMapEnums.HeatColorFor(cbk)));
                detail.rows.Add(new DetailRow("Heat — escalated", heat.escalated ? "YES" : "no"));
            }
            else detail.rows.Add(Missing("Heat"));

            FlowDto flow = null; bool flowOk = false;
            yield return proj.Flow(districtId, Token, f => { flow = f; flowOk = true; }, _ => { });
            detail.rows.Add(flowOk && flow != null ? new DetailRow("Flow backpressure", flow.backpressure) : Missing("Flow backpressure"));

            ThroughputDto thr = null; bool thrOk = false;
            yield return proj.Throughput(districtId, Token, t => { thr = t; thrOk = true; }, _ => { });
            if (thrOk && thr != null)
            {
                detail.rows.Add(new DetailRow("Exposure", thr.exposure_band));
                detail.rows.Add(new DetailRow("Network cleanliness", thr.network_cleanliness));
            }
            else detail.rows.Add(Missing("Throughput"));

            StashDto stash = null; bool stashOk = false;
            yield return proj.Stash(districtId, Token, s => { stash = s; stashOk = true; }, _ => { });
            detail.rows.Add(stashOk && stash != null ? new DetailRow("Stash blocking", stash.district_blocking_band) : Missing("Stash blocking"));

            BufferDto buf = null; bool bufOk = false;
            yield return proj.Buffer(districtId, Token, b => { buf = b; bufOk = true; }, _ => { });
            if (bufOk && buf != null)
            {
                detail.rows.Add(new DetailRow("Buffer load", buf.district_load_band));
                detail.rows.Add(new DetailRow("Buffer tail", buf.district_tail_band));
            }
            else detail.rows.Add(Missing("Buffer"));

            InspectionDto insp = null; bool inspOk = false;
            yield return proj.Inspection(districtId, Token, x => { insp = x; inspOk = true; }, _ => { });
            if (inspOk && insp != null)
            {
                detail.rows.Add(new DetailRow("Inspection queue", insp.queue_load));
                detail.rows.Add(new DetailRow("Dispatcher regime", insp.dispatcher_regime));
            }
            else detail.rows.Add(Missing("Inspection queue"));

            UnconformityDto unc = null; bool uncOk = false;
            yield return proj.Unconformity(districtId, Token, u => { unc = u; uncOk = true; }, _ => { });
            detail.rows.Add(uncOk && unc != null ? new DetailRow("Audit pins", unc.audit_pin_presence) : Missing("Audit pins"));

            LeksDto leks = null; bool leksOk = false;
            yield return proj.Leks(districtId, Token, l => { leks = l; leksOk = true; }, _ => { });
            detail.rows.Add(leksOk && leks != null ? new DetailRow("Deal leks", (leks.leks?.Count ?? 0).ToString()) : Missing("Deal leks"));

            CohesionDto coh = null; bool cohOk = false;
            yield return proj.Cohesion(districtId, Token, c => { coh = c; cohOk = true; }, _ => { });
            detail.rows.Add(cohOk && coh != null ? new DetailRow("Cohesion", coh.cohesion_state) : Missing("Cohesion"));

            // 2026-09-02 — precinct_id SERVI par le district (cell.Model), passé explicitement à
            // Belief/Patrol : c'est la valeur d'AUTORITÉ (CityProjectionsClient.PrecinctForDistrict
            // n'est qu'un repli client pour l'appelant qui n'a qu'un districtId nu — voir son
            // commentaire). `cell` peut être null (districtId sans cellule correspondante) : repli
            // sur la formule dans ce cas aussi, ce que `?? ` couvre.
            int? servedPrecinct = cell?.Model?.precinct_id;
            int precinct = servedPrecinct ?? CityProjectionsClient.PrecinctForDistrict(districtId);

            BeliefDto bel = null; bool belOk = false;
            yield return proj.Belief(districtId, Token, b => { bel = b; belOk = true; }, _ => { }, servedPrecinct);
            detail.rows.Add(belOk && bel != null ? new DetailRow($"Police belief (P{precinct})", bel.belief) : Missing($"Police belief (P{precinct})"));

            PatrolDto pat = null; bool patOk = false;
            yield return proj.Patrol(districtId, Token, p => { pat = p; patOk = true; }, _ => { }, servedPrecinct);
            detail.rows.Add(patOk && pat != null ? new DetailRow($"Patrol heat (P{precinct})", pat.patrol_heat) : Missing($"Patrol heat (P{precinct})"));

            WhisperDto whi = null; bool whiOk = false;
            yield return proj.Whisper(Token, w => { whi = w; whiOk = true; }, _ => { });
            detail.rows.Add(whiOk && whi != null ? new DetailRow("Citizen whisper (city)", whi.whisper_index) : Missing("Citizen whisper"));

            FinishDetail(detail);
        }

        private void FinishDetail(DistrictDetail detail)
        {
            CurrentDetail = detail;
            DetailLoaded = true;
            RefreshEnterInteractable(); // §3.2 — 3e point (nommé explicitement par le design)
            if (SelectedDistrictId == detail.districtId) RenderDetail(detail);
        }

        private void RenderDetail(DistrictDetail detail)
        {
            if (detailContent == null) return;
            for (int i = detailContent.childCount - 1; i >= 0; i--) Destroy(detailContent.GetChild(i).gameObject);

            foreach (DetailRow row in detail.rows)
            {
                GameObject rowGo = NewUI("Row", detailContent);
                HorizontalLayoutGroup hlg = rowGo.AddComponent<HorizontalLayoutGroup>();
                hlg.spacing = 8;
                hlg.childAlignment = TextAnchor.MiddleLeft;
                hlg.childControlWidth = true;
                hlg.childControlHeight = true;
                hlg.childForceExpandWidth = false;
                hlg.childForceExpandHeight = false;
                AddLayoutElement(rowGo, minHeight: 22, flexibleHeight: 0);

                TextMeshProUGUI l = NewText("Label", rowGo.transform, row.label, 14, TextAlignmentOptions.Left);
                l.color = DesignTokens.Current.mapLabelMuted;
                AddLayoutElement(l.gameObject, flexibleWidth: 1);

                TextMeshProUGUI v = NewText("Value", rowGo.transform, row.value, 14, TextAlignmentOptions.Right);
                v.fontStyle = row.available ? FontStyles.Bold : FontStyles.Italic;
                v.color = !row.available
                    ? DesignTokens.Current.mapConditionalGrey
                    : (row.useAccent ? row.accent : Color.white);
                AddLayoutElement(v.gameObject, minWidth: 130, flexibleWidth: 0);
            }
        }

        // -------------------------------------------------------------- helpers

        private void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() == null)
            {
                GameObject es = new GameObject("EventSystem", typeof(EventSystem));
                es.AddComponent<InputSystemUIInputModule>(); // project uses the Input System package
            }
        }

        private static GameObject NewUI(string name, Transform parent)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>Item 0.6 — les deux littéraux AFFICHÉS de cet écran passent par
        /// `carte.bloc.<slug>`, repli sur le littéral.
        /// ⚠️ Mon recensement en annonçait onze : les neuf autres sont des NOMS D'OBJET
        /// (« Title », « Label »…), premier argument de `NewText`, qui ne s'affichent nulle
        /// part. Le compteur lisait le mauvais argument — corrigé sur l'Accueil, revérifié ici.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("carte", "bloc", litteral);

        private TextMeshProUGUI NewText(string name, Transform parent, string value, int size, TextAlignmentOptions anchor)
        {
            GameObject go = NewUI(name, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = font;
            t.text = value;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = Color.white;
            t.textWrappingMode = TextWrappingModes.NoWrap;
            t.overflowMode = TextOverflowModes.Truncate;
            t.raycastTarget = false;
            return t;
        }

        private static void Stretch(RectTransform rt, Vector2 offMin, Vector2 offMax)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = offMin;
            rt.offsetMax = offMax;
        }

        private static void AddLayoutElement(GameObject go, float minHeight = -1, float preferredHeight = -1,
            float flexibleHeight = -1, float flexibleWidth = -1, float minWidth = -1, float preferredWidth = -1)
        {
            LayoutElement le = go.AddComponent<LayoutElement>();
            if (minHeight >= 0) le.minHeight = minHeight;
            if (preferredHeight >= 0) le.preferredHeight = preferredHeight;
            if (flexibleHeight >= 0) le.flexibleHeight = flexibleHeight;
            if (flexibleWidth >= 0) le.flexibleWidth = flexibleWidth;
            if (minWidth >= 0) le.minWidth = minWidth;
            if (preferredWidth >= 0) le.preferredWidth = preferredWidth;
        }
    }
}
