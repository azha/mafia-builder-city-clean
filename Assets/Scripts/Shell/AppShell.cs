using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational; // DashboardController + LaunderingController (both live here — see each file's own namespace)
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C1 — LE PATRON que les 11 lots d'écrans suivants imitent (design §3 C1).
    //
    // Possède : le Canvas racine, le TabBar (5 onglets persistants), un emplacement de contenu
    // (`ContentSlot`), un emplacement de TopBar réservé (`TopBarSlot`, construit ici VIDE — W3.U1 C2
    // le peuple) — design D2. AUCUNE route consommée : le shell est pur agencement (design §3.0).
    //
    // Mécanisme de confinement (BLOCKING-3 du design) : les 9 contrôleurs d'écran existants
    // DÉCOUVRENT un Canvas (`FindFirstObjectByType<Canvas>`) et étirent un fond plein écran à SA
    // racine. Monté nu dans un shell propriétaire du Canvas, ce comportement recouvre les deux
    // barres (ni détruites ni recréées — simplement cachées). `MountTenant<T>` appelle
    // `IShellTenant.SetMountParent(ContentSlot)` sur le locataire AVANT que son `Start()` (différé
    // d'une frame après `AddComponent`) ne construise sa mise en page — le locataire parente alors
    // sa racine dans `ContentSlot` au lieu de découvrir le Canvas.
    //
    // Ordre des enfants du Canvas (sibling order — c'est ce qui prouve la non-occlusion, design
    // C1-F2, "ordre de frères ou test de raycast") : ContentSlot (index 0, sous les barres) PUIS
    // TopBarSlot PUIS TabBarRoot (indices croissants = rendus AU-DESSUS en uGUI ScreenSpaceOverlay).
    // Un locataire qui étire un fond plein écran DANS ContentSlot reste donc toujours sous les deux
    // barres, quel que soit ce qu'il fait à l'intérieur de son propre parent.
    //
    // Les 5 onglets sont ceux du canon, recopiés verbatim (`docs/tech/08_ui_screens/
    // global_conventions_core.md:62-68` — Home/City/Org/Pipeline/More), PAS devinés : Home →
    // DashboardController (screen_1) ; City → CityMapController ("carte", City Map isométrique) ;
    // Org → LieutenantScreenController ("groupe", "Org chart + liste lieutenants") ; Pipeline →
    // LaunderingController ("tuyau", "Vue pipeline de blanchiment" — le MÊME contrôleur que
    // `DashboardController.OpenPipeline()` ouvre déjà, précédent existant REUSE) ; More → sheet
    // vide assumée (screen_12, hors périmètre du design §0 — ses 7 destinations ne sont PAS ce lot).
    public class AppShell : MonoBehaviour, IShellSessionSink
    {
        public enum Tab { Home, City, Org, Pipeline, More }

        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- test hooks --------------------------------------------------
        public Tab CurrentTab { get; private set; } = (Tab)(-1); // "no tab activated yet" — a named state, not a magic default
        public GameObject MountedTenantGameObject { get; private set; }
        public System.Type MountedTenantType { get; private set; }
        /// <summary>True only while the 5th tab (More) is current — the EMPTY destination is
        /// asserted BY THIS VALUE (design C1-F1), never by the absence of a mounted component
        /// (a shell that mounts nothing on every tab would otherwise pass vacuously).</summary>
        public bool OnEmptyMoreDestination { get; private set; }

        public RectTransform ContentSlot { get; private set; }
        public RectTransform TopBarSlot { get; private set; }
        public RectTransform TabBarRoot { get; private set; }
        public Canvas ShellCanvas { get; private set; }
        /// <summary>W3.U1 C2 — the persistent TopBar, built ONCE into `TopBarSlot` (never torn down
        /// on a tab switch, unlike a tenant screen). Null until `BuildLayout()` runs.</summary>
        public TopBarController TopBar { get; private set; }

        // nav-hud-design-v1.md §3.3 (chunk 2) — the state a single `MountedTenantGameObject` field
        // can't carry on its own: "are we inside a district, and which one". -1 = "sur la carte", a
        // NAMED state, never a magic default read as "district zero".
        public int CityTabDistrictId { get; private set; } = -1;

        // nav-hud-design-v1.md §6.1 (chunk 5) — LE MAILLON : deux locataires publient un jeton ici
        // (DashboardController après son SignIn, CityMapController après son auth) → session/open →
        // TopBar.Load. `AdoptToken` est idempotent SUR LE MÊME JETON (un second appel avec le même
        // jeton ne rejoue pas session/open) — un jeton DIFFÉRENT (l'autre locataire démo) rouvre bien
        // une session, par conception (deux comptes démo distincts, §6.1 ne prescrit rien de plus).
        public string SessionToken { get; private set; }
        public SessionOpenDto LastSessionOpen { get; private set; }

        // §6.2 — la valeur citywide_bucket, publiée par un tenant (Dashboard, REUSE de son propre
        // appel :225) OU sondée en repli par CE shell si aucun tenant ne l'a fait (voir
        // AdoptTokenSequence). Null tant qu'aucune des deux voies n'a résolu.
        public string CitywideHeatBucket { get; private set; }
        private bool heatPublishedByTenant;
        // Précédent maison DOUBLEMENT attesté (DashboardController.cs:54-55, "Any district id 1..18
        // returns the same citywide_bucket" ; OrgVitalsPanelController.cs:21) — jamais un nombre neuf.
        private const int HeatProbeDistrictId = 16;

        private readonly List<GameObject> tabButtons = new List<GameObject>();
        private bool initialized;

        private void Start()
        {
            EnsureInitialized();
            ActivateTab(Tab.Home);
        }

        // Defensive: whenever the SHELL itself is torn down (a test destroying its host GameObject,
        // a scene unload, …), the CURRENT tenant goes with it — regardless of whether the caller
        // remembered to call UnmountCurrentTenant first. The tenant host is ALSO parented under
        // ContentSlot (see MountTenant), so this is normally redundant with Unity's own cascade —
        // this handler is the explicit, no-doubt guarantee.
        private void OnDestroy() => UnmountCurrentTenant();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            BuildLayout();
            EnsureEventSystem();
        }

        /// <summary>Switch the shell to `tab`: unmount the current tenant (if any), then mount the
        /// new one INTO `ContentSlot` via `IShellTenant.SetMountParent`. Idempotent-ish: re-activating
        /// the SAME tab still remounts (mirrors a real nav-bar re-tap — no special-cased no-op).</summary>
        public void ActivateTab(Tab tab)
        {
            EnsureInitialized();
            UnmountCurrentTenant();
            CurrentTab = tab;
            OnEmptyMoreDestination = tab == Tab.More;

            // §3.3 — "re-tap City from a district brings back the map, by the ORDINARY remount
            // path — no special-cased no-op". CityTabDistrictId resets to -1 for EVERY tab
            // activation (not just City): the leading action is meaningless outside a district
            // view, so any tab switch clears it defensively — EnterDistrict is the ONLY path that
            // sets it back (§3.3 only names the City case explicitly; this chunk extends the SAME
            // reset to the other 4 tabs so "← Carte" can never survive a jump straight to e.g. Home
            // — an obvious-defect guard, not a design reinterpretation, consigned as a Deviation).
            CityTabDistrictId = -1;
            TopBar.SetLeadingAction(TopBarController.LeadingAction.None, null);
            // §6.3 — hors district, état NOMMÉ ("—"), jamais la dernière valeur d'un district
            // quitté (MÊME reset défensif que CityTabDistrictId ci-dessus, pour LA MÊME raison :
            // toute activation d'onglet doit effacer ce qui n'a de sens qu'EN district).
            TopBar.SetDayPhase(null);

            switch (tab)
            {
                case Tab.Home: MountTenant<DashboardController>(); break;
                case Tab.City:
                    MountTenant<CityMapController>();
                    CityMapController cityMap = MountedTenantGameObject.GetComponent<CityMapController>();
                    if (cityMap != null) cityMap.OnEnterDistrict += EnterDistrict; // §3.3 — subscribed at mount time
                    break;
                case Tab.Org: MountTenant<LieutenantScreenController>(); break;
                case Tab.Pipeline: MountTenant<LaunderingController>(); break;
                case Tab.More:
                    // Destination vide ASSUMÉE (design §0 hors périmètre / C1-F1) — rien à monter.
                    MountedTenantGameObject = null;
                    MountedTenantType = null;
                    break;
            }
            RefreshTabButtonVisuals();
        }

        /// <summary>nav-hud-design-v1.md §3.3 (chunk 2) — enters `districtId`, replacing whatever is
        /// currently mounted (only ever wired to fire while the City tab's CityMapController is
        /// mounted — its own OnEnterDistrict subscription, above). Reuses EXACTLY MountTenant&lt;T&gt;'s
        /// own body (§3.3 : ":111-129") for T = DistrictInteriorScreenController — NOT a second
        /// mounting mechanism. `UnmountCurrentTenant()` is called here for the SAME reason
        /// `ActivateTab` calls it before its own `MountTenant&lt;T&gt;` : `MountTenant&lt;T&gt;`'s body never
        /// unmounts on its own, that's always the CALLER's job — "un seul locataire à la fois —
        /// entrer dans un district DÉTRUIT CityMapController" (§3.3 preamble). The bearer token
        /// comes from the CityMapController tenant being replaced (its OWN demo-auth token, §3.2) —
        /// the design's own EnterDistrict(int) signature carries no token parameter and never says
        /// where one comes from; reading it off the outgoing tenant before destroying it is the
        /// only source available in this architecture at chunk 2 (Deviation, consigned).</summary>
        public void EnterDistrict(int districtId)
        {
            string token = null;
            if (MountedTenantType == typeof(CityMapController) && MountedTenantGameObject != null)
            {
                CityMapController cityMap = MountedTenantGameObject.GetComponent<CityMapController>();
                if (cityMap != null) token = cityMap.Token;
            }

            UnmountCurrentTenant();

            // ── EXACTLY MountTenant<T>'s body (:111-129), T = DistrictInteriorScreenController ──
            GameObject host = new GameObject($"Tenant_{typeof(DistrictInteriorScreenController).Name}");
            host.transform.SetParent(ContentSlot, false);
            DistrictInteriorScreenController tenant = host.AddComponent<DistrictInteriorScreenController>();
            tenant.SetMountParent(ContentSlot);
            MountedTenantGameObject = host;
            MountedTenantType = typeof(DistrictInteriorScreenController);
            // ── end MountTenant<T> body ──

            CityTabDistrictId = districtId;
            tenant.SetSafeInsets(TopBarSlot.rect.height, TabBarRoot.rect.height); // §3.4
            TopBar.SetLeadingAction(TopBarController.LeadingAction.BackToMap, ExitToCityMap);
            StartCoroutine(EnterDistrictSequence(tenant, token, districtId));
        }

        private IEnumerator EnterDistrictSequence(DistrictInteriorScreenController tenant, string token, int districtId)
        {
            yield return tenant.SetSession(token, districtId);
            if (tenant == null) yield break; // torn down mid-fetch (e.g. ExitToCityMap raced the request)
            tenant.Render(tenant.LastFetch);
            // §6.3 — le manomètre affiche day_phase SEULEMENT en district, valeur du DTO déjà
            // récupéré (JAMAIS dérivée côté client — §6.3 : "la donnée day_phase... est déjà
            // projetée par le back").
            TopBar.SetDayPhase(tenant.LastFetch?.day_phase);
        }

        /// <summary>§3.3 — "→ ActivateTab(Tab.City)" verbatim : no special branch, the ordinary
        /// remount path resets CityTabDistrictId to -1 and clears the leading action.</summary>
        public void ExitToCityMap() => ActivateTab(Tab.City);

        /// <summary>nav-hud-design-v1.md §6.1 — reçoit un jeton d'un locataire (DashboardController
        /// ou CityMapController) et ouvre la session côté shell si ce n'est pas déjà fait POUR CE
        /// JETON (idempotent — §6.1 : "un second appel avec le même jeton ne rejoue pas
        /// session/open").</summary>
        public void AdoptToken(string token)
        {
            EnsureInitialized();
            if (string.IsNullOrEmpty(token) || token == SessionToken) return;
            SessionToken = token;
            StartCoroutine(AdoptTokenSequence(token));
        }

        /// <summary>§6.2 — reçoit citywide_bucket d'un tenant qui vient de le récupérer lui-même
        /// (Dashboard, REUSE de son propre appel :225) et le pousse vers le TopBar.</summary>
        public void PublishCitywideHeat(string citywideBucket)
        {
            heatPublishedByTenant = true;
            CitywideHeatBucket = citywideBucket;
            if (TopBar != null) TopBar.SetCitywideHeatBucket(citywideBucket);
        }

        private IEnumerator AdoptTokenSequence(string token)
        {
            var sessionClient = new SessionClient { BaseUrl = baseUrl };
            SessionOpenDto dto = null;
            string err = null;
            yield return sessionClient.OpenSession(token, Application.version, d => dto = d, (c, m) => err = $"{c}: {m}");
            if (this == null) yield break; // shell torn down mid-fetch
            if (dto == null)
            {
                Debug.LogError($"[AppShell] AdoptToken: session/open failed: {err}");
                yield break;
            }
            LastSessionOpen = dto;
            yield return TopBar.Load(token, dto.backlog_badge, dto.opened_game_day);
            if (this == null) yield break;

            // §6.2 — ne sonde lui-même que si aucun locataire ne l'a fait : si le tenant MONTÉ à
            // l'instant où cette séquence se termine n'est PAS DashboardController, personne d'autre
            // ne publiera citywide_bucket (Dashboard est le SEUL publieur de heat, §6.2) — repli,
            // une fois, REUSE du même flux (probe district 16, best-effort).
            if (!heatPublishedByTenant && MountedTenantType != typeof(DashboardController))
            {
                var world = new WorldApiClient { BaseUrl = baseUrl };
                yield return world.GetDistrictHeat(HeatProbeDistrictId, token,
                    heat => PublishCitywideHeat(heat.citywide_bucket),
                    errMsg => Debug.LogWarning($"[AppShell] repli sonde heat (best-effort) échoué : {errMsg}"));
            }
        }

        private void MountTenant<T>() where T : MonoBehaviour, IShellTenant
        {
            GameObject host = new GameObject($"Tenant_{typeof(T).Name}");
            // Parent the HOST itself under ContentSlot (lifecycle only — the tenant's OWN UI is a
            // SEPARATE set of GameObjects it builds and parents there itself, see IShellTenant's own
            // header). Without this, the host was an independent scene-root object: destroying the
            // shell (or even calling UnmountCurrentTenant from outside a full shell teardown) never
            // reached it, and its background coroutines (a screen's own Boot()/Load(), e.g.
            // CityMapController's demo sign-in) kept running into LATER, unrelated tests/fixtures —
            // measured: an orphaned CityMapController's failed sign-in attributed a `Debug.LogError`
            // to an unconnected exceptions-panel test three fixtures later in the SAME PlayMode domain.
            host.transform.SetParent(ContentSlot, false);
            T tenant = host.AddComponent<T>();
            // Synchronous, same frame as AddComponent — Start() (and therefore BuildLayout()) is
            // deferred to the NEXT frame, so this is always visible in time (design D2).
            tenant.SetMountParent(ContentSlot);
            MountedTenantGameObject = host;
            MountedTenantType = typeof(T);
        }

        private void UnmountCurrentTenant()
        {
            // Two DISTINCT things to tear down: (a) the host GameObject carrying the tenant's
            // MonoBehaviour (its coroutines/state — e.g. DashboardController.Boot()), and (b)
            // whatever UI that tenant's BuildLayout() actually parented INTO ContentSlot (a
            // SEPARATE set of GameObjects — the host itself carries no visual children; every
            // controller creates fresh UI objects and parents them to the injected `root`). Clearing
            // only (a) would leave the previous tenant's screen visually stacked underneath the
            // next one forever — ContentSlot is the single source of truth for "what's shown now".
            if (MountedTenantGameObject != null) Object.Destroy(MountedTenantGameObject);
            MountedTenantGameObject = null;
            MountedTenantType = null;
            if (ContentSlot != null)
                for (int i = ContentSlot.childCount - 1; i >= 0; i--)
                    Object.Destroy(ContentSlot.GetChild(i).gameObject);
        }

        // --------------------------------------------------------------- UI build

        private void BuildLayout()
        {
            ShellCanvas = FindFirstObjectByType<Canvas>();
            if (ShellCanvas == null)
            {
                GameObject canvasGo = new GameObject("Canvas",
                    typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                ShellCanvas = canvasGo.GetComponent<Canvas>();
                ShellCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
                CanvasScaler scaler = canvasGo.GetComponent<CanvasScaler>();
                scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                scaler.referenceResolution = new Vector2(1280, 720);
            }

            // 1) ContentSlot FIRST (lowest sibling index → rendered BENEATH the two bars below,
            //    regardless of what a tenant stretches inside it — design C1-F2).
            GameObject contentGo = new GameObject("ContentSlot", typeof(RectTransform));
            contentGo.transform.SetParent(ShellCanvas.transform, false);
            ContentSlot = (RectTransform)contentGo.transform;
            Stretch(ContentSlot, Vector2.zero, Vector2.zero);

            // 2) TopBarSlot — a reserved top strip, built EMPTY here (W3.U1 C2 populates it via the
            //    SAME mount-point-injection idiom: it parents its own UI into this RectTransform).
            GameObject topBarGo = new GameObject("TopBarSlot", typeof(RectTransform));
            topBarGo.transform.SetParent(ShellCanvas.transform, false);
            TopBarSlot = (RectTransform)topBarGo.transform;
            TopBarSlot.anchorMin = new Vector2(0f, 1f);
            TopBarSlot.anchorMax = new Vector2(1f, 1f);
            TopBarSlot.pivot = new Vector2(0.5f, 1f);
            TopBarSlot.sizeDelta = new Vector2(0, 56);
            TopBarSlot.anchoredPosition = Vector2.zero;
            topBarGo.AddComponent<Image>().color = DesignTokens.Current.surfaceCard;
            // W3.U1 C2 — TopBarController lives on a CHILD GameObject (never directly on TopBarSlot
            // itself): its own BuildLayout() stretches ITS OWN RectTransform to fill its parent
            // (design: "no Canvas discovery, builds into whatever RectTransform it's parented under")
            // — attaching it straight to TopBarSlot would have that self-stretch OVERWRITE the
            // top-strip anchors/size just set above. Built ONCE here, never touched by
            // ActivateTab/UnmountCurrentTenant (it is NOT a tenant — it survives every tab switch).
            GameObject topBarContentGo = new GameObject("TopBarContent", typeof(RectTransform));
            topBarContentGo.transform.SetParent(TopBarSlot, false);
            TopBar = topBarContentGo.AddComponent<TopBarController>();

            // 3) TabBarRoot — the bottom nav strip, LAST sibling (topmost render order).
            BuildTabBar();
        }

        private void BuildTabBar()
        {
            GameObject tabBarGo = new GameObject("TabBarRoot", typeof(RectTransform));
            tabBarGo.transform.SetParent(ShellCanvas.transform, false);
            TabBarRoot = (RectTransform)tabBarGo.transform;
            TabBarRoot.anchorMin = new Vector2(0f, 0f);
            TabBarRoot.anchorMax = new Vector2(1f, 0f);
            TabBarRoot.pivot = new Vector2(0.5f, 0f);
            TabBarRoot.sizeDelta = new Vector2(0, 64);
            TabBarRoot.anchoredPosition = Vector2.zero;
            tabBarGo.AddComponent<Image>().color = DesignTokens.Current.surfaceCard;

            HorizontalLayoutGroup hlg = tabBarGo.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(8, 8, 6, 6);
            hlg.spacing = 4;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = true;
            hlg.childForceExpandHeight = true;

            AddTabButton(Tab.Home, "Home");
            AddTabButton(Tab.City, "City");
            AddTabButton(Tab.Org, "Org");
            AddTabButton(Tab.Pipeline, "Pipeline");
            AddTabButton(Tab.More, "More");
        }

        private void AddTabButton(Tab tab, string label)
        {
            GameObject btn = new GameObject($"Tab_{tab}", typeof(RectTransform));
            btn.transform.SetParent(TabBarRoot, false);
            Image img = btn.AddComponent<Image>();
            img.color = DesignTokens.Current.surfaceRow;
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(() => ActivateTab(tab));

            GameObject textGo = new GameObject("Label", typeof(RectTransform));
            textGo.transform.SetParent(btn.transform, false);
            RectTransform textRt = (RectTransform)textGo.transform;
            Stretch(textRt, new Vector2(4, 2), new Vector2(-4, -2));
            TextMeshProUGUI t = textGo.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = label;
            t.fontSize = 13;
            t.alignment = TextAlignmentOptions.Center;
            t.color = DesignTokens.Current.onSurfaceSecondary;
            t.raycastTarget = false;

            tabButtons.Add(btn);
        }

        private void RefreshTabButtonVisuals()
        {
            Tab[] order = { Tab.Home, Tab.City, Tab.Org, Tab.Pipeline, Tab.More };
            for (int i = 0; i < tabButtons.Count && i < order.Length; i++)
            {
                bool active = order[i] == CurrentTab;
                Image img = tabButtons[i].GetComponent<Image>();
                // W3.U2/C5 (D5, U-3) — l'or quitte le chrome : l'onglet actif est repointé sur
                // chromeTabActive (accentGold reste réservé aux CTA — détecteur d'allowlist :
                // ChromeTabAccentAllowlistPlayModeTests.C5F2, ensemble à 11 entrées, AppShell exclu).
                img.color = active ? DesignTokens.Current.chromeTabActive : DesignTokens.Current.surfaceRow;
                TextMeshProUGUI t = tabButtons[i].GetComponentInChildren<TextMeshProUGUI>();
                if (t != null) t.color = active ? DesignTokens.Current.surfaceBase : DesignTokens.Current.onSurfaceSecondary;
            }
        }

        private void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() == null)
            {
                GameObject es = new GameObject("EventSystem", typeof(EventSystem));
                es.AddComponent<InputSystemUIInputModule>();
            }
        }

        private static void Stretch(RectTransform rt, Vector2 offMin, Vector2 offMax)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = offMin;
            rt.offsetMax = offMax;
        }
    }
}
