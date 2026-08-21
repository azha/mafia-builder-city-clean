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

        // hud-session-arbitrages-design.md §1.2 (B1) — « le SHELL possède la session » : une
        // identité, portée par un [SerializeField] — LA migration déjà payée (un futur écran de
        // login l'écrit, rien d'autre). Défaut = le compte démo Home (operational_demo), premier
        // onglet activé par `Start()`. `SetIdentity` permet à un appelant (un test, un futur écran
        // de login) de la remplacer AVANT `Start()` — même fenêtre synchrone que `SetToken`/
        // `SetMountParent` reçus par un locataire.
        [Header("Identité de session (B1 — le shell signe UNE fois)")]
        [SerializeField] private string demoIdentifier = "operational_demo@example.test";
        [SerializeField] private string demoPassword = "operational-demo-pw";

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

        // hud-session-arbitrages-design.md §1.2 (B1, AMENDE nav-hud-design-v1.md §6.1) — LE
        // MAILLON, refondu : le shell acquiert SON PROPRE jeton UNE FOIS dans `Start()` (plus
        // d'`AdoptToken` reçu d'un locataire — cette direction meurt avec la course qu'elle portait,
        // §1.1 : « le sujet n'est pas la course, c'est l'identité »). `Token` est ensuite DONNÉ à
        // chaque locataire monté, dans la fenêtre synchrone de `MountTenant<T>`.
        public string Token { get; private set; }
        public SessionOpenDto LastSessionOpen { get; private set; }

        // §6.2 — la valeur citywide_bucket, sondée par CE shell avec SON jeton (voir
        // AcquireSessionThenActivateHome — Deviation notée là : sonde inconditionnelle sous B1,
        // plus simple et sans fenêtre de course que le repli conditionnel du chunk 5). Null tant que
        // rien n'a résolu.
        public string CitywideHeatBucket { get; private set; }
        // Précédent maison DOUBLEMENT attesté (DashboardController.cs:54-55, "Any district id 1..18
        // returns the same citywide_bucket" ; OrgVitalsPanelController.cs:21) — jamais un nombre neuf.
        private const int HeatProbeDistrictId = 16;

        private readonly List<GameObject> tabButtons = new List<GameObject>();
        private bool initialized;

        private void Start()
        {
            EnsureInitialized();
            StartCoroutine(AcquireSessionThenActivateHome());
        }

        /// <summary>B1 — remplace `SetIdentity` sérialisé par une valeur d'appel AVANT `Start()`.
        /// Fenêtre synchrone identique à `SetToken`/`SetMountParent` : appelé même-frame que
        /// `AddComponent&lt;AppShell&gt;()`, avant que `Start()` (différé d'une frame) ne lise ces
        /// champs. §1.3 : « le champ sérialisé est la migration déjà payée » — ce setter est son
        /// point d'entrée pour un appelant qui doit poser une AUTRE identité que le défaut Home
        /// (ex. `NavigationPlayModeTests.cs`, identité citymap_demo).</summary>
        public void SetIdentity(string identifier, string password)
        {
            demoIdentifier = identifier;
            demoPassword = password;
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
            // §3.4 — AMENDÉ (2026-08-21, frontière avec le lot manomètre) : `TopBarSlot.rect.
            // height` seul est la hauteur NOMINALE (56px) — le médaillon pend sous cette hauteur
            // par construction (doctrine, voir `TopBarController.ManometreVerticalOffsetPx`) et
            // `EffectiveBottomOverhangPx` MESURE en live de combien. Sans lui, un titre positionné
            // pour juste dégager 56px se retrouve chevauché par l'anneau/le filet — c'est le rouge
            // que ce correctif ferme (nav-F4).
            float topInset = TopBarSlot.rect.height + TopBar.EffectiveBottomOverhangPx;
            tenant.SetSafeInsets(topInset, TabBarRoot.rect.height); // §3.4
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
        /// <summary>§6.2 — reçoit citywide_bucket d'un tenant qui vient de le récupérer lui-même
        /// (Dashboard, REUSE de son propre appel :225) et le pousse vers le TopBar. Sous B1 le shell
        /// sonde aussi lui-même (voir `AcquireSessionThenActivateHome`) — Dashboard qui publie
        /// ENSUITE la même donnée écrase sans dommage (même compte, même valeur).</summary>
        public void PublishCitywideHeat(string citywideBucket)
        {
            CitywideHeatBucket = citywideBucket;
            if (TopBar != null) TopBar.SetCitywideHeatBucket(citywideBucket);
        }

        /// <summary>B1 (hud-session-arbitrages-design.md §1.2) — LE shell signe UNE fois (son
        /// identité, `demoIdentifier`/`demoPassword`, remplaçable via `SetIdentity` avant `Start()`),
        /// ouvre SA session (`SessionClient.OpenSession` → `TopBar.Load`), sonde citywide_bucket avec
        /// SON jeton, PUIS active Home — dans cet ordre, pour que le premier montage trouve déjà
        /// `Token` renseigné (`MountTenant<T>` l'injecte dans la MÊME fenêtre que `SetMountParent`).
        /// Échec à N'IMPORTE quelle étape ⇒ Home est monté quand même : repli inchangé
        /// (`IShellTenant.cs` — un locataire sans jeton signe lui-même, comme avant ce chunk).</summary>
        private IEnumerator AcquireSessionThenActivateHome()
        {
            var auth = new AuthClient { BaseUrl = baseUrl };
            string t = null, authErr = null;
            yield return auth.SignIn(demoIdentifier, demoPassword, x => t = x, e => authErr = e);
            if (this == null) yield break; // shell torn down mid-fetch

            if (string.IsNullOrEmpty(t))
            {
                Debug.LogError($"[AppShell] sign-in failed: {authErr}");
                // IMPORTANT-1 (verdict ⊥ HUD v3.1) — fermé en PRODUCTION, pas seulement côté tests :
                // la TabBar est cliquable dès EnsureInitialized (Start()), donc un joueur peut avoir
                // DÉJÀ touché un autre onglet pendant les 2-4 allers-retours réseau de cette
                // acquisition. Un `ActivateTab(Tab.Home)` inconditionnel ici le RAMÈNERAIT de force,
                // détruisant le locataire qu'il vient d'ouvrir — motif 6/6 pour la 2e fois dans ce
                // chunk (round 1 : course à 2 comptes fermée par isolation ; round 2 : montage tardif
                // fermé par attente ; les deux fois le mécanisme restait vivant EN PRODUCTION, fermé
                // seulement côté test). Le remède est le sentinel `(Tab)(-1)` (`CurrentTab`, "a named
                // state, not a magic default") : ne forcer Home que si RIEN n'a encore été activé.
                if (CurrentTab == (Tab)(-1)) ActivateTab(Tab.Home); // repli : le locataire signera lui-même
                yield break;
            }

            Token = t;
            var sessionClient = new SessionClient { BaseUrl = baseUrl };
            SessionOpenDto dto = null;
            string sessionErr = null;
            yield return sessionClient.OpenSession(t, Application.version, d => dto = d, (c, m) => sessionErr = $"{c}: {m}");
            if (this == null) yield break;

            if (dto != null)
            {
                LastSessionOpen = dto;
                yield return TopBar.Load(t, dto.backlog_badge, dto.opened_game_day);
                if (this == null) yield break;
            }
            else
            {
                Debug.LogError($"[AppShell] session/open failed: {sessionErr}");
            }

            // ActivateTab(Home) juste APRÈS TopBar.Load — mesuré (pas supposé) : un appelant qui
            // attend `TopBar.Loaded` (poll par frame) doit trouver `MountedTenantGameObject` déjà
            // renseigné dès que `Loaded` devient vrai ; la sonde heat ci-dessous est un aller-retour
            // réseau SUPPLÉMENTAIRE — la placer AVANT ce montage aurait laissé une fenêtre où
            // `TopBar.Loaded==true` mais `MountedTenantGameObject==null` (rougi une première fois,
            // corrigé ici).
            // IMPORTANT-1 (verdict ⊥ HUD v3.1) — MÊME garde que la branche d'échec ci-dessus : la
            // TabBar est cliquable dès `Start()` (`EnsureInitialized`), donc les 2-4 allers-retours
            // réseau de CETTE branche (signin + session/open + TopBar.Load) laissent, EN
            // PRODUCTION, une fenêtre réelle où un joueur peut avoir déjà touché un AUTRE onglet.
            // `ActivateTab(Tab.Home)` inconditionnel le ramènerait de force et détruirait le
            // locataire qu'il vient d'ouvrir. `TopBar.Load` ci-dessus reste inconditionnel (le
            // TopBar est persistant, affiche l'identité du shell quel que soit l'onglet actif) —
            // seul le MONTAGE forcé de Home est gardé par le sentinel.
            if (CurrentTab == (Tab)(-1)) ActivateTab(Tab.Home);

            // §6.2, AMENDÉ (B1, Deviation) — le chunk 5 sondait CONDITIONNELLEMENT ("seulement si le
            // tenant monté n'est pas Dashboard"), un mécanisme conçu pour départager DEUX locataires
            // qui publiaient chacun à un moment ARBITRAIRE (la course que B1 supprime). Sous B1 il
            // n'y a plus qu'UNE identité, acquise ICI avant tout montage : la sonder directement,
            // inconditionnellement, est plus SIMPLE et sans fenêtre de course. Best-effort, APRÈS le
            // montage de Home — ne bloque pas l'affichage du TopBar/onglet sur ce round-trip de plus.
            var world = new WorldApiClient { BaseUrl = baseUrl };
            yield return world.GetDistrictHeat(HeatProbeDistrictId, t,
                heat => PublishCitywideHeat(heat.citywide_bucket),
                errMsg => Debug.LogWarning($"[AppShell] sonde heat (best-effort) échouée : {errMsg}"));
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
            // B1 (hud-session-arbitrages-design.md §1.2) — le shell DONNE son jeton, MÊME fenêtre
            // synchrone que `SetMountParent` (vérifiée par le ⊥ : AVANT tout Boot()/SignIn() du
            // locataire, différé d'une frame). Distinction à retenir : cette fenêtre même-frame est
            // SÛRE EN ÉCRITURE sur les champs du composant qu'on vient de créer (ce qu'on fait ici) —
            // elle serait DANGEREUSE EN LECTURE d'un état initialisé par Unity (ex. Canvas.scaleFactor
            // avant un premier layout pass, round P3 du pivot fond). Rien à donner (le signin du
            // shell n'a pas encore résolu, ou a échoué) ⇒ repli inchangé — le locataire signe
            // lui-même (`IShellTenant.cs`).
            if (!string.IsNullOrEmpty(Token)) tenant.SetToken(Token);
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
            else
            {
                // Défensif — MESURÉ (Tools/district-v2-reimport-implementation-notes.md § FILE
                // D'ATTENTE, défaut 1) : un Canvas trouvé peut déjà porter les 3 slots d'un AppShell
                // ANTÉRIEUR dont le host n'a jamais été détruit (test/capture qui a omis son
                // teardown — cf. le commentaire de TearDown d'AppShellPlayModeTests.cs, « silently
                // DOUBLING its slot count »). Sans ce nettoyage, le code ci-dessous empilait un
                // second jeu de ContentSlot/TopBarSlot/TabBarRoot en SIBLING des anciens — jamais
                // atteints par UnmountCurrentTenant (qui ne connaît que L'INSTANCE COURANTE de
                // ContentSlot) — laissant le contenu de l'ANCIEN locataire visible pour toujours
                // sous ce Canvas. Un seul shell possède un Canvas donné à la fois (design C1) : on
                // détruit tout jeu de slots préexistant avant d'y bâtir le sien.
                DestroyExistingSlot(ShellCanvas.transform, "ContentSlot");
                DestroyExistingSlot(ShellCanvas.transform, "TopBarSlot");
                DestroyExistingSlot(ShellCanvas.transform, "TabBarRoot");
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

        // HUD v3.1 cohérence de chrome (2026-08-21, demandé NOMMÉMENT par le contrôleur — la
        // TabBar n'avait jamais été touchée par la doctrine du restyle TopBar : verre gris plat,
        // aucun filet, onglet actif signalé par un APLAT `chromeTabActive` = `accentGold` #ffd23f,
        // « l'ancien or vif » que le restyle TopBar avait précisément quitté). ⚠️ AUCUNE référence
        // pixel n'existe pour cette barre — vérifié : 0 mention d'une barre d'onglets dans les
        // maquettes DA disponibles à ce lot (elles montrent un téléphone SANS chrome de navigation
        // bas). Cette section est donc dérivée par COHÉRENCE avec `TopBarController` (même verre
        // fumé bleu nuit `hudBarGlassTop/Bottom`, même laiton `hudHairlineGold` — UN SEUL or dans
        // tout le chrome, les deux barres partagent le token), jamais comparée à un artefact pixel
        // fabriqué — un juge inventé serait pire que pas de juge (leçon payée ailleurs dans ce
        // dépôt). `chromeTabActive` reste un champ scellé de `DesignTokens` (canon gdd/14, ne pas
        // retirer — un token sans consommateur peut redevenir un consommateur légitime demain) mais
        // n'est plus RÉFÉRENCÉ ici : l'onglet actif se signale par le laiton (filet haut + libellé
        // teinté), jamais par un pavé de couleur pleine (doctrine « l'or jamais en aplat »).
        private const float TabBarCornerRadiusPx = 10f; // REUSE — même rayon que TopBarController.BarCornerRadiusPx
        private const float TabBarHairlineThicknessPx = 2f; // REUSE — même épaisseur que le filet du TopBar
        private const float TabActiveIndicatorThicknessPx = 3f;

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

            // Verre fumé bleu nuit, coins arrondis — REUSE exact du patron
            // `TopBarController.BuildBarBackground` (Mask+RoundedRectMask+VerticalGradientImage).
            // `TabBarMask` PREMIER enfant (rendu SOUS tout le reste) et exclu du HorizontalLayoutGroup
            // ci-dessous (`LayoutElement.ignoreLayout` — sinon le HLG le traiterait comme un 6e
            // bouton et lui disputerait de la largeur).
            GameObject maskGo = new GameObject("TabBarMask", typeof(RectTransform), typeof(CanvasRenderer));
            maskGo.transform.SetParent(tabBarGo.transform, false);
            Stretch((RectTransform)maskGo.transform, Vector2.zero, Vector2.zero);
            Image maskImg = maskGo.AddComponent<Image>();
            maskImg.sprite = ProceduralUI.RoundedRectMask((int)TabBarCornerRadiusPx);
            maskImg.type = Image.Type.Sliced;
            maskImg.color = Color.white;
            maskImg.raycastTarget = false;
            maskGo.AddComponent<LayoutElement>().ignoreLayout = true;
            Mask mask = maskGo.AddComponent<Mask>();
            mask.showMaskGraphic = false;
            maskGo.transform.SetAsFirstSibling();

            GameObject bgGo = new GameObject("TabBarBackground", typeof(RectTransform), typeof(CanvasRenderer));
            bgGo.transform.SetParent(maskGo.transform, false);
            Stretch((RectTransform)bgGo.transform, Vector2.zero, Vector2.zero);
            VerticalGradientImage barBackground = bgGo.AddComponent<VerticalGradientImage>();
            barBackground.raycastTarget = false;
            barBackground.SetColors(DesignTokens.Current.hudBarGlassTop, DesignTokens.Current.hudBarGlassBottom);

            // Filet laiton — bord HAUT de la TabBar (la couture qui la sépare du contenu, symétrique
            // du filet BAS du TopBar ; même token `hudHairlineGold`, jamais un second or).
            GameObject hlGo = new GameObject("Hairline", typeof(RectTransform));
            hlGo.transform.SetParent(tabBarGo.transform, false);
            RectTransform hlRect = (RectTransform)hlGo.transform;
            hlRect.anchorMin = new Vector2(0f, 1f);
            hlRect.anchorMax = new Vector2(1f, 1f);
            hlRect.pivot = new Vector2(0.5f, 1f);
            hlRect.sizeDelta = new Vector2(0f, TabBarHairlineThicknessPx);
            hlRect.anchoredPosition = Vector2.zero;
            Image tabBarHairlineImg = hlGo.AddComponent<Image>();
            tabBarHairlineImg.color = DesignTokens.Current.hudHairlineGold;
            tabBarHairlineImg.raycastTarget = false;
            hlGo.AddComponent<LayoutElement>().ignoreLayout = true;

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

            // HUD v3.1 cohérence — l'indicateur d'onglet actif : un FILET laiton (3px, bord HAUT du
            // bouton), jamais un pavé de couleur pleine (voir BuildTabBar pour la doctrine complète).
            // Enfant DIRECT du bouton (jamais nommé "Label" — `Find("ActiveIndicator")` en dépend,
            // RefreshTabButtonVisuals ci-dessous). Masqué par défaut (SetActive) — mêmes idiome que
            // `leadingGo`/`TopBarController.LeadingAction` : présence/absence NOMMÉE, jamais déduite
            // d'une couleur.
            GameObject indicatorGo = new GameObject("ActiveIndicator", typeof(RectTransform));
            indicatorGo.transform.SetParent(btn.transform, false);
            RectTransform indicatorRect = (RectTransform)indicatorGo.transform;
            indicatorRect.anchorMin = new Vector2(0f, 1f);
            indicatorRect.anchorMax = new Vector2(1f, 1f);
            indicatorRect.pivot = new Vector2(0.5f, 1f);
            indicatorRect.sizeDelta = new Vector2(0f, TabActiveIndicatorThicknessPx);
            indicatorRect.anchoredPosition = Vector2.zero;
            Image indicatorImg = indicatorGo.AddComponent<Image>();
            indicatorImg.color = DesignTokens.Current.hudHairlineGold;
            indicatorImg.raycastTarget = false;
            indicatorGo.SetActive(false);

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
                // HUD v3.1 cohérence (2026-08-21, demandé par le contrôleur — voir BuildTabBar) :
                // le fond du bouton reste `surfaceRow` dans LES DEUX états (jamais d'aplat coloré
                // pour signaler l'actif — doctrine « l'or jamais en aplat », W3.U2/C5). L'actif se
                // signale par le filet `ActiveIndicator` (laiton, `hudHairlineGold` — MÊME token que
                // TopBarController, un seul or dans tout le chrome) + le libellé teinté. Remplace le
                // repointage sur `chromeTabActive` (W3.U2/C5, D5) : ce token reste défini (canon
                // gdd/14, scellé) mais n'est plus référencé ici — ChromeTabAccentAllowlistPlayModeTests
                // .C5F2 ne le trackait de toute façon jamais (son motif porte sur l'accès au token DE
                // L'AUTRE nom — PARAPHRASE délibérée, socle CLAUDE.md : citer verbatim ce littéral ici
                // le compterait dans le SCAN LUI-MÊME que cette phrase décrit, faussant l'allowlist de
                // C5F2 — vu 2026-08-21, régression mesurée puis retirée dans le même lot).
                Transform indicator = tabButtons[i].transform.Find("ActiveIndicator");
                if (indicator != null) indicator.gameObject.SetActive(active);
                TextMeshProUGUI t = tabButtons[i].GetComponentInChildren<TextMeshProUGUI>();
                if (t != null) t.color = active ? DesignTokens.Current.hudHairlineGold : DesignTokens.Current.onSurfaceSecondary;
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

        // BuildLayout (Canvas réutilisé) — détruit un slot NOMMÉ laissé par un AppShell antérieur
        // jamais démonté, s'il existe. `Find` ne cherche que les enfants DIRECTS de `canvasTransform`
        // (les 3 slots sont toujours des enfants directs du Canvas, jamais nichés) — suffisant ici,
        // contrairement à la garde de test qui doit rester insensible à la profondeur pour le
        // CONTENU d'un locataire (elle balaie par type de composant, pas par nom direct).
        private static void DestroyExistingSlot(Transform canvasTransform, string childName)
        {
            Transform existing = canvasTransform.Find(childName);
            if (existing != null) Object.Destroy(existing.gameObject);
        }
    }
}
