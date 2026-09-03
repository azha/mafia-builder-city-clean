using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signin → Bearer) + WorldApiClient/DistrictHeatDto (heat) + CityMapController (nav)
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Operational.Autonomy;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Operational
{
    // Drives the Home Dashboard screen (screen_1) — the cold-open landing screen and the
    // "encaisser" payoff of the M1 loop. It:
    //   1. signs in (POST /v1/auth/signin) to get a PLAYER Bearer — REUSE CityMap.AuthClient;
    //   2. fetches the HEADLINE wallet band  GET /v1/economy/wallet  (BROKE | LOW | MODERATE |
    //      HIGH | FLUSH) — the qualitative cash band, the loop's payoff;
    //   3. fetches the CITYWIDE heat band  GET /v1/city/district/:id/heat  (REUSE
    //      CityMap.WorldApiClient + DistrictHeatDto — the same client the City Map consumes)
    //      and renders citywide_bucket (COLD | WARM | HOT | BURNING) + the escalated flag;
    //   4. derives a minimal ALERTS line strictly from the projections it already fetched
    //      (heat escalating / citywide heat hot+ ) — it NEVER fabricates an alert from data it
    //      does not hold;
    //   5. offers NAV affordances (City Map / Building Card / Pipeline) — each nav button opens
    //      the target controller (they all self-build their Canvas in the same project).
    //
    // R2.2 / P5: every projection leaf the player sees is a qualitative band STRING or a
    // BOOLEAN — this screen renders exactly those; it NEVER shows a raw scalar (cents / heat
    // float / ticks) — except the intentional "Tier N" vocabulary chrome, excluded from the
    // scan corpus via AddStatusRow(trackValue: false) (see Render). a11y F2: every status line carries a text label AND a shape glyph (not
    // colour alone), mirroring the Building Card / Laundering band rows + the CityMap heat badge.
    //
    // The whole UI is built programmatically from a single Canvas (mirrors
    // BuildingCardController / LaunderingController / CityMapController) so a scene needs almost
    // no manual wiring.
    //
    // M1 scope note (honest deferral, amended Phase-20, RE-amended 2026-09-03): the rich blocks of the
    // screen_1 design are not assembled by THIS controller — it renders the wallet band, the citywide
    // heat band, an alerts line and the nav buttons. Since Phase-20 the exception queue is live as its
    // own screen (ExceptionQueueController — nav below); the inline top-3 panel and one_decision
    // (core_loops.*) remain deferred HERE.
    // ⛔ WHAT THIS NOTE USED TO LET A READER CONCLUDE, AND WHICH IS NOW FALSE: that the player never
    // sees those blocks at all. Item 0.5 §2 mounted the four of them — the leverage card, the exception
    // queue panel, the org-vitals panel and the home chrome — as four bands under the Empire tab
    // (AppShell.MonterPanneauxAccueil, called from the two session-acquisition paths), each fed from the
    // session/open payload the shell already holds. They live in Shell/, not here, and the shell owns
    // their geometry. A reader chasing "where did the screen_1 content go" must look there.
    // ★ The note stayed LITERALLY true while becoming misleading — the exact shape a dated statement
    //   takes when the work moves and nobody re-reads the sentence that describes its absence.
    public class DashboardController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        [Header("Demo sign-in (seeded by Tools/seed_operational_demo.mjs)")]
        [SerializeField] private string demoIdentifier = "operational_demo@example.test";
        [SerializeField] private string demoPassword = "operational-demo-pw";

        [Header("Citywide heat probe")]
        [Tooltip("Any district id 1..18 returns the same citywide_bucket; we probe the operational district (16 Verge).")]
        [SerializeField] private int heatProbeDistrictId = 16;

        // ---- Public state (test hooks) ---------------------------------------
        public bool IsAuthenticated { get; private set; }
        public string Token { get; private set; }
        public string AuthError { get; private set; }
        public bool DashboardLoaded { get; private set; }
        public string WalletError { get; private set; }
        public string HeatError { get; private set; }
        public WalletDto CurrentWallet { get; private set; }
        public DistrictHeatDto CurrentHeat { get; private set; }
        public MeDto CurrentMe { get; private set; }
        public ExceptionCardDto[] PendingExceptions { get; private set; } = System.Array.Empty<ExceptionCardDto>();
        public ProgressionDto CurrentProgression { get; private set; }
        public AutonomyReportDto[] PendingAutonomyReports { get; private set; } = System.Array.Empty<AutonomyReportDto>();

        /// <summary>The full set of text shown to the player (labels + values) — used by the
        /// E2E to prove no raw scalar leaks client-side.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;

        /// <summary>The most-recently opened nav target (test hook). NONE until a nav button fires.</summary>
        public NavTarget LastNavTarget { get; private set; } = NavTarget.None;
        /// <summary>The GameObject of the controller the last nav button opened (test hook for "clicking opens the target").</summary>
        public GameObject LastNavGameObject { get; private set; }

        // W3.U1 C1 (design D2) — optional parent-of-mount the AppShell renseigne BEFORE Start() runs
        // (AddComponent + SetMountParent happen synchronously, same frame; Start() is deferred to the
        // next frame — see AppShell.MountTenant). When set, BuildLayout() parents this screen's root
        // under it INSTEAD of the discovered Canvas — confining it to the shell's content slot rather
        // than the Canvas root (BLOCKING-3 of the design: an unconfined tenant recovers the shell's
        // Canvas and occludes both bars, which are neither destroyed nor recreated). Left null OUTSIDE
        // the shell (every existing PlayMode test, every nav-opened screen below) — behaviour there
        // stays EXACTLY today's Canvas discovery, byte-identical (C1-F3).
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        public enum NavTarget { None, CityMap, BuildingCard, Pipeline, Exceptions, Autonomy }

        private readonly List<string> renderedTexts = new List<string>();

        private TMP_FontAsset font;
        private TextMeshProUGUI walletGlyphText;
        private TextMeshProUGUI walletBandText;
        private TextMeshProUGUI walletCaptionText;
        private TextMeshProUGUI headerText;
        private RectTransform statusRows;
        private TextMeshProUGUI alertsText;
        private RectTransform navBar;

        private AuthClient auth;
        private DashboardClient client;
        private WorldApiClient world; // REUSE — citywide heat (GET /v1/city/district/:id/heat)
        private ExceptionsClient exceptions;   // Phase-20 — pending-exceptions alert note + the Exceptions nav
        private ProgressionClient progression; // Phase-20 — the vocab-tier funnel line
        private AutonomyClient autonomy;       // Phase-21 — pending autonomy reports alert note + the Autonomy nav

        // Slate palette (mirrors BuildingCard / Laundering / global_conventions_core direction).
        private static Color SurfaceBg => DesignTokens.Current.surfaceBase;   // #0d0f10 (screen_1 ardoise)
        private static Color CardBg => DesignTokens.Current.surfaceCard;      // #16191b
        private static Color RowBg => DesignTokens.Current.surfaceRow;       // #232a2d
        private static Color TextPrimary => DesignTokens.Current.onSurfacePrimary; // #eef1f2
        private static Color TextSecondary => DesignTokens.Current.onSurfaceSecondary; // #8a979c
        private static Color AccentMild => DesignTokens.Current.accentSuccess;   // #43e0c0 teal
        private static Color AccentModerate => DesignTokens.Current.accentWarning;    // #ff9e3d amber
        private static Color AccentSevere => DesignTokens.Current.accentDanger;     // #ff5a4d red
        private static Color CtaColor => DesignTokens.Current.accentGold;         // #ffd23f yellow

        private void Start()
        {
            EnsureInitialized();
            StartCoroutine(Boot());
        }

        // Lazily build clients + the UI so the controller is safe to drive (SignIn / Load) before
        // Start() has run — e.g. an E2E that calls SignIn() in the same frame as AddComponent.
        // Idempotent.
        private bool initialized;
        // Guards LoadDashboard re-entrancy (the self-started Boot() load racing an external test-driven load —
        // see the note in LoadDashboard). Cleared at every LoadDashboard exit.
        private bool isLoading;
        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            font = DesignTokens.Current.primaryFont;
            auth = new AuthClient { BaseUrl = baseUrl };
            client = new DashboardClient { BaseUrl = baseUrl };
            world = new WorldApiClient { BaseUrl = baseUrl };
            exceptions = new ExceptionsClient { BaseUrl = baseUrl };
            progression = new ProgressionClient { BaseUrl = baseUrl };
            autonomy = new AutonomyClient { BaseUrl = baseUrl };
            BuildLayout();
            EnsureEventSystem();
        }

        // AMENDÉ (hud-session-arbitrages-design.md §1.2, B1) — le publieur `AdoptToken` QUITTE ce
        // point : le shell possède désormais la session (il signe UNE fois, dans `AppShell.Start()`,
        // et DONNE son jeton via `SetToken` avant que `Start()` de CE contrôleur ne s'exécute — voir
        // `MountTenant<T>`). `SignIn()` reste (repli inchangé, `IShellTenant.cs`) : APPELÉ, il
        // NO-OP via son propre garde `if (IsAuthenticated) yield break;` quand un jeton a déjà été
        // injecté — aucun changement de structure nécessaire ici.
        private IEnumerator Boot()
        {
            yield return SignIn();
            if (!IsAuthenticated) yield break;
            yield return LoadDashboard();
        }

        /// <summary>Sign in and acquire a Bearer (REUSE AuthClient). Idempotent.</summary>
        public IEnumerator SignIn()
        {
            EnsureInitialized();
            if (IsAuthenticated) yield break;
            string token = null, err = null;
            yield return DemoIdentityResolver.ResolveAndSignIn(auth,
                DemoIdentityResolver.OperationalIdentifierEnvVar, DemoIdentityResolver.OperationalPasswordEnvVar,
                demoIdentifier, demoPassword, t => token = t, e => err = e);
            if (err != null || string.IsNullOrEmpty(token))
            {
                AuthError = err ?? "sign-in returned no token";
                Debug.LogError($"[Dashboard] auth failed: {AuthError}");
                yield break;
            }
            Token = token;
            IsAuthenticated = true;
        }

        /// <summary>Set the player Bearer directly (test convenience when already signed in elsewhere).</summary>
        public void SetToken(string token)
        {
            Token = token;
            IsAuthenticated = !string.IsNullOrEmpty(token);
        }

        /// <summary>Fetch + render the dashboard: wallet band (headline), citywide heat band +
        /// escalation, the optional /v1/me header, then the derived alerts line.</summary>
        public IEnumerator LoadDashboard()
        {
            EnsureInitialized();

            // Re-entrancy guard. Start() fires StartCoroutine(Boot()) which ALSO calls LoadDashboard(),
            // so the controller can be loading itself at the same time an external caller (a PlayMode E2E
            // that drives `yield return controller.LoadDashboard()` on its OWN runner object) drives a load.
            // Both share the mutable projection fields (CurrentWallet / WalletError / …): if the self-Boot
            // load resets CurrentWallet=null + WalletError=null between the external load's GET completing
            // (CurrentWallet set) and its null-check, the external load spuriously sees CurrentWallet==null
            // with an empty WalletError → "[Dashboard] wallet load failed: " (an intermittent ~1/3 flake).
            // Serialize the two: if a load is already in flight, WAIT for it to finish (so this call still
            // returns with a completed, consistent load — DashboardLoaded set — rather than clobbering it),
            // then return without re-fetching. Never no-op immediately (that could leave the caller asserting
            // DashboardLoaded before the in-flight load set it).
            if (isLoading)
            {
                while (isLoading && this != null) yield return null;
                yield break;
            }
            isLoading = true;

            DashboardLoaded = false;
            WalletError = null;
            HeatError = null;
            CurrentWallet = null;
            CurrentHeat = null;
            PendingExceptions = System.Array.Empty<ExceptionCardDto>();
            CurrentProgression = null;
            PendingAutonomyReports = System.Array.Empty<AutonomyReportDto>();

            // 1) headline wallet band.
            yield return client.GetWallet(Token,
                dto => CurrentWallet = dto,
                (code, msg) => WalletError = $"{code}: {msg}");

            // 2) optional /v1/me header (best-effort — a header miss never fails the dashboard).
            yield return client.GetMe(Token,
                dto => CurrentMe = dto,
                (code, msg) => { /* header is optional; ignore */ });

            // 3) citywide heat band + escalation (REUSE WorldApiClient — same client the City Map uses).
            yield return world.GetDistrictHeat(heatProbeDistrictId, Token,
                heat => CurrentHeat = heat,
                err => HeatError = err);

            // nav-hud-design-v1.md §6.2 (chunk 5) — publie citywide_bucket vers le shell : REUSE de
            // CET appel (probe district 16, ligne au-dessus), ne crée PAS un 3e appelant. Hors shell,
            // no-op. Seulement sur succès — un échec laisse la sonde propre de l'AppShell (§1.2 B1)
            // seule source. I2 (hud-session-arbitrages-design.md §3) : localisateur DÉDUPLIQUÉ dans
            // `ShellContracts.ShellSessionSinkLocator` — CityMapController n'a plus de copie (il ne
            // publie rien sous B1), et CE localisateur reste sur un chemin emprunté (cet appel).
            if (CurrentHeat != null)
            {
                MafiaCleanCity.Shell.IShellSessionSink shellSink = MafiaCleanCity.Shell.ShellSessionSinkLocator.Find();
                shellSink?.PublishCitywideHeat(CurrentHeat.citywide_bucket);
            }

            // 4) Phase-20: pending exceptions (drives the alerts note + proves the funnel surface) — best-effort.
            yield return exceptions.GetQueue(Token,
                cards => PendingExceptions = cards,
                (code, msg) => Debug.LogWarning($"[Dashboard] exceptions queue fetch failed (best-effort): {code}: {msg}"));

            // 5) Phase-20: the vocab-tier funnel line — best-effort.
            yield return progression.GetProgression(Token,
                dto => CurrentProgression = dto,
                (code, msg) => Debug.LogWarning($"[Dashboard] progression fetch failed (best-effort): {code}: {msg}"));

            // 6) Phase-21: open autonomy reports (drives the alerts note + the Autonomy nav) — best-effort.
            yield return autonomy.GetReports(Token,
                reports => PendingAutonomyReports = reports,
                (code, msg) => Debug.LogWarning($"[Dashboard] autonomy reports fetch failed (best-effort): {code}: {msg}"));

            // The GETs above are network round-trips; the controller's GameObject may have been torn down
            // by an inter-fixture teardown while we awaited them. Bail before touching any UI (Unity's
            // overloaded == reports a destroyed MonoBehaviour as null) — a continuation that wakes up on a
            // dead object must no-op, not dereference a destroyed serialized TextMeshProUGUI → NullReferenceException.
            if (this == null) { isLoading = false; yield break; }

            if (CurrentWallet == null)
            {
                Debug.LogError($"[Dashboard] wallet load failed: {WalletError}");
                RenderError();
                isLoading = false;
                yield break;
            }

            DashboardLoaded = true;
            Render();
            isLoading = false;
        }

        // ----------------------------------------------------------- nav API

        /// <summary>Open the City Map screen (REUSE CityMapController — it self-builds its Canvas).</summary>
        public void OpenCityMap() => OpenNav(NavTarget.CityMap);
        /// <summary>Open the Building Card screen (REUSE BuildingCardController).</summary>
        public void OpenBuildingCard() => OpenNav(NavTarget.BuildingCard);
        /// <summary>Open the Laundering Pipeline screen (REUSE LaunderingController).</summary>
        public void OpenPipeline() => OpenNav(NavTarget.Pipeline);
        /// <summary>Open the Exception Queue screen (Phase-20 — ExceptionQueueController self-builds its Canvas).</summary>
        public void OpenExceptions() => OpenNav(NavTarget.Exceptions);
        /// <summary>Open the Autonomy Inbox screen (Phase-21 — AutonomyInboxController self-builds its Canvas).</summary>
        public void OpenAutonomy() => OpenNav(NavTarget.Autonomy);

        // Repli (hors shell) : la cible est un MonoBehaviour de ce projet qui bâtit son propre
        // Canvas dès son Start() — un bouton de nav crée alors un hôte NU et y ajoute le
        // composant, le geste d'origine. CORRIGÉ (revue ⊥ round 2, C7) : ce paragraphe ne décrit
        // plus QUE cette branche de repli — sous un shell, c'est le navigateur qui monte (voir
        // le paragraphe AMENDÉ juste dessous), pas ce geste.
        // On enregistre la cible + son GameObject comme crochets de test (prouve que l'affordance est câblée).
        //
        // AMENDÉ (item 0.4 de `front.md`, Tools/charpente-item0-4-design.md §2.3) — un `AppShell`
        // (`IShellNavigator`) trouvé monte désormais le locataire LUI-MÊME, en surimpression :
        // confiné dans `ContentSlot`, jeton reçu — remplace la racine de scène nue d'avant (mesuré,
        // design §1.1-§1.2 : elle RECOUVRAIT TabBar+TopBar, faute de `SetMountParent`). SINON (tout
        // test PlayMode existant qui monte ce contrôleur SEUL, hors shell) : repli EXACT
        // d'aujourd'hui, inchangé (design §2.3 — la branche reste le régime légitime hors shell).
        private void OpenNav(NavTarget target)
        {
            LastNavTarget = target;
            if (target == NavTarget.None)
            {
                // C5 (revue ⊥ round 2, m4) — `NavTarget` compte 6 membres dont `None`
                // (Enum.GetValues, voir CharpenteMontageLocatairesPlayModeTests
                // .C5_ToutMembreDeNavTarget_AUnComportementNomme). AVANT ce garde, les deux
                // branches ci-dessous divergeaient EN SILENCE sur ce membre : un `switch`
                // STATEMENT C# sans `default` n'est PAS une erreur de compilation sur une méthode
                // `void` (CS0161 ne s'applique qu'à une méthode qui DOIT rendre une valeur) — la
                // branche shell ne montait rien SANS LE DIRE (LastNavGameObject inchangé),
                // pendant que la branche de repli créait quand même un hôte VIDE (`Nav_None`,
                // aucun composant) qui polluait la scène pour rien. `None` est maintenant un
                // membre NOMMÉ : « aucune destination », identique dans les DEUX branches,
                // jamais un hôte créé.
                return;
            }
            MafiaCleanCity.Shell.IShellNavigator nav = MafiaCleanCity.Shell.ShellNavigatorLocator.Find();
            if (nav != null)
            {
                switch (target)
                {
                    case NavTarget.CityMap: LastNavGameObject = nav.MonterLocataireEnSurimpression<CityMapController>().gameObject; break;
                    case NavTarget.BuildingCard: LastNavGameObject = nav.MonterLocataireEnSurimpression<BuildingCardController>().gameObject; break;
                    case NavTarget.Pipeline: LastNavGameObject = nav.MonterLocataireEnSurimpression<LaunderingController>().gameObject; break;
                    case NavTarget.Exceptions: LastNavGameObject = nav.MonterLocataireEnSurimpression<ExceptionQueueController>().gameObject; break;
                    case NavTarget.Autonomy: LastNavGameObject = nav.MonterLocataireEnSurimpression<AutonomyInboxController>().gameObject; break;
                }
                return;
            }
            GameObject host = new GameObject($"Nav_{target}");
            switch (target)
            {
                case NavTarget.CityMap: host.AddComponent<CityMapController>(); break;
                case NavTarget.BuildingCard: host.AddComponent<BuildingCardController>(); break;
                case NavTarget.Pipeline: host.AddComponent<LaunderingController>(); break;
                case NavTarget.Exceptions: host.AddComponent<ExceptionQueueController>(); break;
                case NavTarget.Autonomy: host.AddComponent<AutonomyInboxController>(); break;
            }
            LastNavGameObject = host;
        }

        // --------------------------------------------------------------- render

        private void Render()
        {
            ClearRows();

            // Optional header: handle (callsign) — identity only, never cash (R2.2).
            headerText.text = CurrentMe != null && !string.IsNullOrEmpty(CurrentMe.handle)
                ? $"Boss {CurrentMe.handle}"
                : "Patron";
            TrackText(headerText, headerText.text);

            // ---- HEADLINE: the wallet band (the "encaisser" payoff). Large glyph + band label
            //      + a caption — text+icon, never colour-only (F2). NEVER a raw cents figure (R2.2).
            string band = CurrentWallet.wallet_band;
            Color wAccent = WalletAccent(band);
            walletGlyphText.text = WalletGlyph(band);
            walletGlyphText.color = wAccent;
            walletBandText.text = WalletLabel(band);
            walletBandText.color = wAccent;
            walletCaptionText.text = "Portefeuille";
            TrackText(walletGlyphText, walletGlyphText.text);
            TrackText(walletBandText, walletBandText.text);
            TrackText(walletCaptionText, walletCaptionText.text);

            // ---- Citywide heat band + escalation flag (REUSE the heat projection).
            if (CurrentHeat != null)
            {
                AddStatusRow("Citywide heat", HeatLabel(CurrentHeat.citywide_bucket),
                    HeatGlyph(CurrentHeat.citywide_bucket), HeatAccent(CurrentHeat.citywide_bucket));
                AddStatusRow("Escalation", CurrentHeat.escalated ? "Escalating" : "Steady",
                    CurrentHeat.escalated ? "[!]" : "[=]",
                    CurrentHeat.escalated ? AccentSevere : AccentMild);
            }
            else
            {
                // Heat is JWT-gated + tick-gated; if it isn't available, say so honestly (no fabrication).
                AddStatusRow("Citywide heat", "Unavailable", "[?]", TextSecondary);
            }

            // ---- Phase-20: the vocabulary-tier funnel line (GET /v1/progression). The "Tier N" digit is
            //      intentional UI chrome (the locked-teaser technique) — the VALUE is kept out of the scan corpus.
            if (CurrentProgression != null)
            {
                AddStatusRow("Vocabulary",
                    $"Tier {CurrentProgression.vocabulary_tier} — {ProgressLabel(CurrentProgression.progress_to_next)}",
                    "[*]", AccentMild, trackValue: false);
            }

            // ---- Minimal alerts line — derived STRICTLY from the projections we fetched. No fabrication.
            BuildAlerts();

            // ---- Nav affordances.
            BuildNav();
        }

        private void RenderError()
        {
            ClearRows();
            headerText.text = "Patron";
            walletGlyphText.text = "[?]";
            walletGlyphText.color = TextSecondary;
            walletBandText.text = "Wallet unavailable";
            walletBandText.color = TextSecondary;
            walletCaptionText.text = "Check the seeder + stack.";
            TrackText(headerText, headerText.text);
            TrackText(walletGlyphText, walletGlyphText.text);
            TrackText(walletBandText, walletBandText.text);
            TrackText(walletCaptionText, walletCaptionText.text);
            BuildNav();
        }

        // Build a minimal alerts line strictly from the heat projection we already hold.
        // Honest deferral: the full screen_1 ExceptionQueue (audit pins per front-shop, lieutenant
        // suggestions, seam disputes) needs the core_loops.* endpoints — not part of M1. We surface
        // only what the live heat projection exposes: escalation + a hot/burning citywide band.
        private void BuildAlerts()
        {
            var notes = new List<string>();
            if (CurrentHeat != null)
            {
                if (CurrentHeat.escalated) notes.Add("Heat escalating citywide");
                string cb = CurrentHeat.citywide_bucket;
                if (cb == "BURNING") notes.Add("Citywide heat BURNING");
                else if (cb == "HOT") notes.Add("Citywide heat HOT");
            }
            if (PendingExceptions != null && PendingExceptions.Length > 0) notes.Add("Exceptions waiting");
            if (PendingAutonomyReports != null && PendingAutonomyReports.Length > 0) notes.Add("Autonomy reports waiting");

            string line = notes.Count > 0 ? string.Join("  •  ", notes) : "No active alerts";
            Color accent = notes.Count > 0 ? AccentSevere : AccentMild;
            string glyph = notes.Count > 0 ? "[!]" : "[ok]";

            string label = NewSectionLabel(statusRows, "ALERTES");
            TrackText(null, label);
            AddStatusRow("Alerts", line, glyph, accent);
        }

        private void BuildNav()
        {
            for (int i = navBar.childCount - 1; i >= 0; i--)
                Object.Destroy(navBar.GetChild(i).gameObject);

            string label = NewSectionLabel(navBar, "ALLER À");
            TrackText(null, label);

            AddNavButton(navBar, "City Map", OpenCityMap);
            AddNavButton(navBar, "Building Card", OpenBuildingCard);
            AddNavButton(navBar, "Filière", OpenPipeline);
            AddNavButton(navBar, "Exceptions", OpenExceptions);
            AddNavButton(navBar, "Autonomy", OpenAutonomy);
        }

        // ----------------------------------------------------- band → label/glyph

        // Wallet band (BROKE | LOW | MODERATE | HIGH | FLUSH). The glyph is a coin-stack ramp
        // (a11y: shape conveys the band independent of colour).
        private static string WalletLabel(string b)
        {
            // Repointé sur le lieu UNIQUE (`WalletBandResolver`, ShellContracts) — même geste que
            // `HeatLabel` sur `HeatBucketResolver`. La table vivait ici ET recopiée dans DEUX
            // suites de tests « kept in sync with the controller » : la traduction du 2026-09-03
            // aurait dû être faite à trois endroits.
            return MafiaCleanCity.Shell.WalletBandResolver.Label(b);
        }
        private static string WalletGlyph(string b)
        {
            switch (b)
            {
                case "FLUSH": return "[$$$$]";
                case "HIGH": return "[$$$.]";
                case "MODERATE": return "[$$..]";
                case "LOW": return "[$...]";
                case "BROKE": return "[....]";
                default: return "[????]";
            }
        }
        private static Color WalletAccent(string b)
        {
            switch (b)
            {
                case "FLUSH": return AccentMild;
                case "HIGH": return AccentMild;
                case "MODERATE": return AccentModerate;
                case "LOW": return AccentModerate;
                case "BROKE": return AccentSevere;
                default: return TextSecondary;
            }
        }

        // Citywide heat band (COLD | WARM | HOT | BURNING). The glyph is a fill-ramp.
        // REPOINTÉ (nav-hud-design-v1.md §6.4, chunk 5) — la résolution des 4 buckets vit désormais
        // dans `MafiaCleanCity.Shell.HeatBucketResolver` (lieu UNIQUE, aussi consommé par le
        // manomètre du HUD) ; signature et visibilité INCHANGÉES pour les appelants internes de
        // cette classe (`:322-323`) — seul le corps délègue, la valeur produite est byte-identique.
        private static string HeatLabel(string b) => MafiaCleanCity.Shell.HeatBucketResolver.Label(b);
        private static string HeatGlyph(string b) => MafiaCleanCity.Shell.HeatBucketResolver.Glyph(b);
        // CORRIGÉ (hud-session-arbitrages-design.md §2.2/§2.4, B2) — LA MAUVAISE PAIRE : cette
        // méthode fusionnait {HOT, BURNING} → AccentSevere (rouge). Le canon (screen_2_city_map.md
        // :148/:405 = gdd/15_glossary.md:2726, screen_2a_building_card.md:308/:182) dit
        // {WARM, HOT} → MODERATE (ambre) ; BURNING → SEVERE. HOT était rouge, il doit être ambre.
        // REPOINTÉE sur `HeatBucketResolver.SeverityColor` (lieu UNIQUE désormais partagé avec le
        // manomètre du HUD, `TopBarController.cs` — §2.4 : « aucun switch de bucket ne survit
        // ailleurs »). Signature/visibilité inchangées pour l'appelant interne (`:354`).
        private static Color HeatAccent(string b) =>
            MafiaCleanCity.Shell.HeatBucketResolver.SeverityColor(MafiaCleanCity.Shell.HeatBucketResolver.SeverityFor(b));

        // Phase-20: progress_to_next band (UNLOCKED | IN_PROGRESS | LOCKED).
        private static string ProgressLabel(string b)
        {
            switch (b)
            {
                case "UNLOCKED": return MafiaCleanCity.I18n.Libelle.De("accueil", "etat", "Ouvert");
                case "IN_PROGRESS": return MafiaCleanCity.I18n.Libelle.De("accueil", "etat", "En cours");
                case "LOCKED": return MafiaCleanCity.I18n.Libelle.De("accueil", "etat", "Verrouillé");
                default: return string.IsNullOrEmpty(b) ? MafiaCleanCity.I18n.Libelle.De("accueil", "etat", "Inconnu") : b;
            }
        }

        // --------------------------------------------------------------- UI build

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
            Transform root = mountParent != null ? mountParent : canvas.transform; // W3.U1 D2

            // Full-screen ardoise backdrop (screen_1 is the cold-open landing screen).
            GameObject backdrop = NewUI("DashboardBackdrop", root);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = SurfaceBg;

            // The dashboard card, anchored top-centre (portrait landing column).
            GameObject card = NewUI("DashboardSheet", root);
            RectTransform cardRt = (RectTransform)card.transform;
            cardRt.anchorMin = new Vector2(0.5f, 1f);
            cardRt.anchorMax = new Vector2(0.5f, 1f);
            cardRt.pivot = new Vector2(0.5f, 1f);
            cardRt.sizeDelta = new Vector2(560, 560);
            cardRt.anchoredPosition = new Vector2(0, -28);
            card.AddComponent<Image>().color = CardBg;
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(20, 20, 18, 18);
            vlg.spacing = 12;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            // Header (handle / callsign — identity only).
            headerText = NewText("Header", card.transform, "Patron", 16, TextAlignmentOptions.Left);
            headerText.color = TextSecondary;
            AddLayoutElement(headerText.gameObject, minHeight: 22, flexibleHeight: 0);

            TextMeshProUGUI title = NewText("Title", card.transform, "ACCUEIL", 24, TextAlignmentOptions.Left);
            title.fontStyle = FontStyles.Bold;
            AddLayoutElement(title.gameObject, minHeight: 32, flexibleHeight: 0);
            TrackText(title, title.text);

            // ---- HEADLINE wallet block: a big glyph + band label, with a caption beneath.
            GameObject walletBlock = NewUI("WalletHeadline", card.transform);
            walletBlock.AddComponent<Image>().color = RowBg;
            HorizontalLayoutGroup whlg = walletBlock.AddComponent<HorizontalLayoutGroup>();
            whlg.padding = new RectOffset(16, 16, 12, 12);
            whlg.spacing = 14;
            whlg.childAlignment = TextAnchor.MiddleLeft;
            whlg.childControlWidth = true;
            whlg.childControlHeight = true;
            whlg.childForceExpandWidth = false;
            whlg.childForceExpandHeight = true;
            AddLayoutElement(walletBlock, minHeight: 78, flexibleHeight: 0);

            walletGlyphText = NewText("WalletGlyph", walletBlock.transform, "[....]", 30, TextAlignmentOptions.Center);
            walletGlyphText.fontStyle = FontStyles.Bold;
            AddLayoutElement(walletGlyphText.gameObject, minWidth: 150, preferredWidth: 150, flexibleWidth: 0);

            GameObject walletText = NewUI("WalletText", walletBlock.transform);
            VerticalLayoutGroup wtv = walletText.AddComponent<VerticalLayoutGroup>();
            wtv.spacing = 2;
            wtv.childControlWidth = true;
            wtv.childControlHeight = true;
            wtv.childForceExpandWidth = true;
            wtv.childForceExpandHeight = false;
            AddLayoutElement(walletText, flexibleWidth: 1);

            walletCaptionText = NewText("WalletCaption", walletText.transform, "Portefeuille", 14, TextAlignmentOptions.BottomLeft);
            walletCaptionText.color = TextSecondary;
            AddLayoutElement(walletCaptionText.gameObject, minHeight: 18, flexibleHeight: 0);

            walletBandText = NewText("WalletBand", walletText.transform, "—", 30, TextAlignmentOptions.TopLeft);
            walletBandText.fontStyle = FontStyles.Bold;
            AddLayoutElement(walletBandText.gameObject, minHeight: 40, flexibleHeight: 0);

            // Status rows (citywide heat + escalation + alerts) live here.
            GameObject rows = NewUI("StatusRows", card.transform);
            VerticalLayoutGroup rvlg = rows.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = 6;
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            statusRows = (RectTransform)rows.transform;
            AddLayoutElement(rows, flexibleHeight: 0);

            // Nav bar (City Map / Building Card / Pipeline).
            GameObject nav = NewUI("NavBar", card.transform);
            VerticalLayoutGroup nvlg = nav.AddComponent<VerticalLayoutGroup>();
            nvlg.spacing = 6;
            nvlg.childControlWidth = true;
            nvlg.childControlHeight = true;
            nvlg.childForceExpandWidth = true;
            nvlg.childForceExpandHeight = false;
            navBar = (RectTransform)nav.transform;
            AddLayoutElement(nav, flexibleHeight: 1);
        }

        private void AddStatusRow(string label, string value, string glyph, Color accent, bool trackValue = true)
        {
            GameObject row = NewUI("Row_" + label.Replace(" ", ""), statusRows);
            row.AddComponent<Image>().color = RowBg;
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(10, 10, 6, 6);
            hlg.spacing = 10;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(row, minHeight: 32, flexibleHeight: 0);

            // Glyph (shape — a11y: colour is never the sole differentiator).
            TextMeshProUGUI g = NewText("Glyph", row.transform, glyph, 16, TextAlignmentOptions.Center);
            g.color = accent;
            g.fontStyle = FontStyles.Bold;
            // ⛔ La colonne était figée et COUPAIT les glyphes longs — même défaut que ②,
            // mesuré rouge le 2026-09-02 (« [####] » posé à 4 caractères sur 6 à 46 px/corps 16/gras).
            // La mesure vit dans `LargeurDeGlyphe` : un producteur, cinq citations.
            float largeurGlyphe = LargeurDeGlyphe.PourLesPlusLarges(g, "[$$$$]");
            AddLayoutElement(g.gameObject, minWidth: largeurGlyphe,
                preferredWidth: largeurGlyphe, flexibleWidth: 0);

            TextMeshProUGUI l = NewText("Label", row.transform, label, 15, TextAlignmentOptions.Left);
            l.color = TextSecondary;
            AddLayoutElement(l.gameObject, minWidth: 130, flexibleWidth: 0);

            TextMeshProUGUI v = NewText("Value", row.transform, value, 16, TextAlignmentOptions.Left);
            v.color = accent;
            v.fontStyle = FontStyles.Bold;
            AddLayoutElement(v.gameObject, minWidth: 180, flexibleWidth: 1);

            TrackText(g, glyph);
            TrackText(l, label);
            if (trackValue) TrackText(v, value); // opt-out = chrome (digit-bearing values stay out of the scan corpus)
        }

        private string NewSectionLabel(Transform parent, string text)
        {
            TextMeshProUGUI t = NewText("Section", parent, text, 13, TextAlignmentOptions.Left);
            t.color = DesignTokens.Current.dashboardIconDim;
            t.fontStyle = FontStyles.Bold;
            AddLayoutElement(t.gameObject, minHeight: 20, flexibleHeight: 0);
            return text;
        }

        private void AddNavButton(Transform parent, string label, UnityEngine.Events.UnityAction onClick)
        {
            GameObject btn = NewUI("Nav_" + label.Replace(" ", ""), parent);
            Image img = btn.AddComponent<Image>();
            img.color = DesignTokens.Current.surfaceRaised;
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(onClick);
            AddLayoutElement(btn, minHeight: 44, flexibleHeight: 0); // ≥ 44 dp tap target (F2)

            TextMeshProUGUI t = NewText("Label", btn.transform, label, 15, TextAlignmentOptions.Center);
            t.color = CtaColor;
            Stretch((RectTransform)t.transform, new Vector2(10, 2), new Vector2(-10, -2));
            TrackText(t, label);
        }

        // --------------------------------------------------------------- helpers

        private void ClearRows()
        {
            renderedTexts.Clear();
            if (statusRows != null)
                for (int i = statusRows.childCount - 1; i >= 0; i--)
                    Object.Destroy(statusRows.GetChild(i).gameObject);
        }

        private void TrackText(TextMeshProUGUI comp, string text)
        {
            if (!string.IsNullOrEmpty(text)) renderedTexts.Add(text);
        }

        private void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() == null)
            {
                GameObject es = new GameObject("EventSystem", typeof(EventSystem));
                es.AddComponent<InputSystemUIInputModule>();
            }
        }

        private static GameObject NewUI(string name, Transform parent)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        private TextMeshProUGUI NewText(string name, Transform parent, string value, int size, TextAlignmentOptions anchor)
        {
            GameObject go = NewUI(name, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = font;
            t.text = value;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = TextPrimary;
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
