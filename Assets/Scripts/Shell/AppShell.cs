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
    // Les onglets étaient ceux du canon, recopiés verbatim (`docs/tech/08_ui_screens/
    // global_conventions_core.md:62-68` — Home/City/Org/Pipeline/More) : Home → DashboardController
    // (screen_1) ; City → CityMapController ("carte") ; Org → LieutenantScreenController ; Pipeline
    // → LaunderingController (le MÊME contrôleur que `DashboardController.OpenPipeline()` ouvre déjà,
    // précédent existant REUSE) ; More → sheet vide assumée (screen_12, hors périmètre).
    // AMENDÉ (item 0.4 de `front.md`, Tools/charpente-item0-4-design.md) — implémente désormais
    // AUSSI `IShellNavigator` : les deux sites qui ouvraient un écran en créant une racine de
    // scène nue (`DashboardController.OpenNav`, `ExceptionQueueController.OpenDetail`) montent
    // maintenant PAR CE SHELL, en surimpression, confinés dans `ContentSlot` — voir
    // `MonterLocataireEnSurimpression<T>` plus bas.
    // AMENDÉ DE NOUVEAU (items 0.2/0.3/0.3-bis, ruling user 2026-08-25, Tools/charpente-item0-2-3-
    // design.md) — le dock ratifié est **Empire · Famille · Filière · Plus** : « on est déjà sur la
    // carte, elle sort du dock ». `Tab.Home` et `Tab.City` FUSIONNENT en **`Tab.Empire`**, qui monte
    // `CityMapController` — la branche City d'hier, déplacée, pas réécrite : Empire EST la carte.
    // `DashboardController` n'est plus monté par AUCUN onglet (débranché, dit et non masqué — sa
    // destination future est l'ouverture de session, item 0.5). Ceci ferme aussi le cycle fermé
    // mesuré avant ce lot (`City` n'était atteignable QUE depuis un district, lui-même atteignable
    // QUE depuis `City` — `DistrictInteriorScreenController` était donc injoignable depuis un shell
    // en marche) : la première branche du cycle est désormais ouverte par le démarrage lui-même.
    public class AppShell : MonoBehaviour, IShellSessionSink, IShellNavigator
    {
        public enum Tab { Empire, Org, Pipeline, More }

        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // hud-session-arbitrages-design.md §1.2 (B1) — « le SHELL possède la session » : une
        // identité, portée par un [SerializeField] — LA migration déjà payée (un futur écran de
        // login l'écrit, rien d'autre). Défaut = le compte démo operational_demo, celui du premier
        // onglet (Empire) activé par `Start()`. `SetIdentity` permet à un appelant (un test, un futur écran
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

            // §3.3 — "re-tap Empire from a district brings back the map, by the ORDINARY remount
            // path — no special-cased no-op" (Empire IS the old City branch, items 0.2/0.3).
            // CityTabDistrictId resets to -1 for EVERY tab activation (not just Empire): the
            // leading action is meaningless outside a district view, so any tab switch clears it
            // defensively — EnterDistrict is the ONLY path that sets it back (§3.3 only names the
            // City case explicitly, before the fusion; this chunk extends the SAME reset to the
            // other 3 tabs so "← Carte" can never survive a jump straight to e.g. Org — an
            // obvious-defect guard, not a design reinterpretation, consigned as a Deviation).
            CityTabDistrictId = -1;
            TopBar.SetLeadingAction(TopBarController.LeadingAction.None, null);
            // §6.3 — hors district, état NOMMÉ ("—"), jamais la dernière valeur d'un district
            // quitté (MÊME reset défensif que CityTabDistrictId ci-dessus, pour LA MÊME raison :
            // toute activation d'onglet doit effacer ce qui n'a de sens qu'EN district).
            TopBar.SetDayPhase(null);

            switch (tab)
            {
                // Empire EST la carte (items 0.2/0.3, ruling 2026-08-25) — fusion de Tab.Home et
                // Tab.City : la branche City d'hier, déplacée telle quelle, pas réécrite.
                // DashboardController n'est plus monté par aucun onglet (débranché, item 0.5).
                case Tab.Empire:
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
        /// currently mounted (only ever wired to fire while the Empire tab's CityMapController is
        /// mounted — its own OnEnterDistrict subscription, above; Empire is the old City branch,
        /// items 0.2/0.3). CORRIGÉ (revue ⊥ round 2, C7 —
        /// l'énoncé précédent citait un corps et une plage de lignes qui n'existaient déjà plus
        /// après la fusion ci-dessous) : passe désormais par le MÊME corps privé partagé que
        /// `MountTenant&lt;T&gt;` et `MonterLocataireEnSurimpression&lt;T&gt;` — `ConstruireLocataire&lt;T&gt;`,
        /// plus bas — ni une copie ni un second mécanisme de montage. `UnmountCurrentTenant()` is
        /// called here for the SAME reason `ActivateTab` calls it before its own `MountTenant&lt;T&gt;` :
        /// `ConstruireLocataire&lt;T&gt;`'s body never unmounts on its own, that's always the CALLER's
        /// job — "un seul locataire à la fois —
        /// entrer dans un district DÉTRUIT CityMapController" (§3.3 preamble). The bearer token
        /// comes from the CityMapController tenant being replaced (its OWN demo-auth token, §3.2) —
        /// the design's own EnterDistrict(int) signature carries no token parameter and never says
        /// where one comes from; reading it off the outgoing tenant before destroying it is the
        /// only source available in this architecture at chunk 2 (Deviation, consigned).</summary>
        public void EnterDistrict(int districtId)
        {
            // MESURÉ 2026-08-21 : ce jeton était pris UNIQUEMENT sur le locataire carte — donc
            // `null` dès qu'on entre dans un district sans venir de l'onglet Ville, et la requête
            // partait sans authentification (401 observé, écran vide sans message). Or B1 a
            // justement établi que LE SHELL possède la session : `Token` est la source, le jeton
            // du locataire n'est qu'un repli pour le cas où le shell n'a pas encore acquis la
            // sienne. La décision n'était appliquée qu'à moitié.
            string token = Token;
            if (string.IsNullOrEmpty(token)
                && MountedTenantType == typeof(CityMapController) && MountedTenantGameObject != null)
            {
                CityMapController cityMap = MountedTenantGameObject.GetComponent<CityMapController>();
                if (cityMap != null) token = cityMap.Token;
            }

            UnmountCurrentTenant();

            // FUSIONNÉ (item 0.4, charpente-item0-4-design.md §1.6/§2.2) — n'est plus une copie
            // verbatim du corps de `MountTenant<T>` : les DEUX appellent désormais
            // `ConstruireLocataire<T>`, qui porte les 4 gestes une seule fois. Cette copie était
            // d'ailleurs restée EN RETARD sur son original — ni `PublierInsetsDuChrome()` ni
            // `SetToken` n'y avaient jamais été portés (mesuré : la version précédente de ce
            // fichier ne les appelait pas ici) — la fusion les apporte, sans effet observable :
            // `DistrictInteriorScreenController.SetToken` est un no-op (`IShellTenant.cs:24-28` —
            // ce contrôleur reçoit sa donnée par `SetSession`, via la variable locale `token`
            // ci-dessus, pas par ce canal).
            DistrictInteriorScreenController tenant = ConstruireLocataire<DistrictInteriorScreenController>(out GameObject host);
            MountedTenantGameObject = host;
            MountedTenantType = typeof(DistrictInteriorScreenController);

            CityTabDistrictId = districtId;
            // §3.4 — AMENDÉ (2026-08-21, frontière avec le lot manomètre) : `TopBarSlot.rect.
            // height` seul est la hauteur NOMINALE (56px) — le médaillon pend sous cette hauteur
            // par construction (doctrine, voir `TopBarController.ManometreVerticalOffsetPx`) et
            // `EffectiveBottomOverhangPx` MESURE en live de combien. Sans lui, un titre positionné
            // pour juste dégager 56px se retrouve chevauché par l'anneau/le filet — c'est le rouge
            // que ce correctif ferme (nav-F4).
            // RE-AMENDÉ (2026-08-21, `Screen.safeArea`) : `TopBarSlot`/`TabBarRoot` sont maintenant
            // TRANSLATÉS par leur inset de zone sûre respectif (`BuildLayout`/`BuildTabBar`) — le
            // titre du district doit dégager la MÊME distance depuis le bord du canvas, insets
            // inclus, sinon un appareil à encoche/barre de gestes le chevaucherait quand même.
            (float topSafeInset, float bottomSafeInset) = SafeAreaInsetsLocal();
            float topInset = topSafeInset + TopBarSlot.rect.height + TopBar.EffectiveBottomOverhangPx;
            float bottomInset = bottomSafeInset + TabBarRoot.rect.height;
            tenant.SetSafeInsets(topInset, bottomInset); // §3.4
            TopBar.SetLeadingAction(TopBarController.LeadingAction.BackToMap, ExitToCityMap);
            StartCoroutine(EnterDistrictSequence(tenant, token, districtId));
        }

        private IEnumerator EnterDistrictSequence(DistrictInteriorScreenController tenant, string token, int districtId)
        {
            yield return tenant.SetSession(token, districtId);
            if (tenant == null) yield break; // torn down mid-fetch (e.g. ExitToCityMap raced the request)
            // MESURÉ 2026-08-21 (capture de la vue principale) : `Render(null)` lève une
            // NullReferenceException à la première ligne qui lit le payload — l'écran principal
            // plantait dès que la récupération échouait (réseau, 404, session expirée). Le défaut
            // était visible dans le code même : la ligne SUIVANTE se protège déjà d'un payload
            // absent, celle-ci non. Un échec de fetch doit donner un état NOMMÉ, jamais une
            // exception : le contrôleur porte déjà ce repli déclaré pour un palier inconnu.
            if (tenant.LastFetch == null)
            {
                Debug.LogWarning($"[AppShell] district {districtId} : payload absent " +
                                 $"(code={tenant.LastErrorCode}) — repli déclaré affiché.");
                tenant.Render(new DistrictInteriorDto { day_phase = "UNAVAILABLE" });
                TopBar.SetDayPhase(null);
                yield break;
            }
            tenant.Render(tenant.LastFetch);
            // §6.3 — le manomètre affiche day_phase SEULEMENT en district, valeur du DTO déjà
            // récupéré (JAMAIS dérivée côté client — §6.3 : "la donnée day_phase... est déjà
            // projetée par le back").
            TopBar.SetDayPhase(tenant.LastFetch?.day_phase);
        }

        /// <summary>§3.3 — "→ ActivateTab(Tab.Empire)" verbatim (Empire is the old City branch,
        /// items 0.2/0.3) : no special branch, the ordinary remount path resets CityTabDistrictId
        /// to -1 and clears the leading action.</summary>
        public void ExitToCityMap() => ActivateTab(Tab.Empire);

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
        /// SON jeton, PUIS active Empire (items 0.2/0.3 — l'ancien Home, fusionné avec City) — dans
        /// cet ordre, pour que le premier montage trouve déjà `Token` renseigné (`MountTenant<T>`
        /// l'injecte dans la MÊME fenêtre que `SetMountParent`). Échec à N'IMPORTE quelle étape ⇒
        /// Empire est monté quand même : repli inchangé (`IShellTenant.cs` — un locataire sans
        /// jeton signe lui-même, comme avant ce chunk).</summary>
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
                // acquisition. Un `ActivateTab(Tab.Empire)` inconditionnel ici le RAMÈNERAIT de force,
                // détruisant le locataire qu'il vient d'ouvrir — motif 6/6 pour la 2e fois dans ce
                // chunk (round 1 : course à 2 comptes fermée par isolation ; round 2 : montage tardif
                // fermé par attente ; les deux fois le mécanisme restait vivant EN PRODUCTION, fermé
                // seulement côté test). Le remède est le sentinel `(Tab)(-1)` (`CurrentTab`, "a named
                // state, not a magic default") : ne forcer Empire que si RIEN n'a encore été activé —
                // CETTE GARDE NE DOIT PAS SE PERDRE en changeant l'onglet par défaut (items 0.2/0.3) :
                // payée deux fois, elle reste posée sur les DEUX branches, ici et ci-dessous.
                if (CurrentTab == (Tab)(-1)) ActivateTab(Tab.Empire); // repli : le locataire signera lui-même
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

            // ActivateTab(Empire) juste APRÈS TopBar.Load — mesuré (pas supposé) : un appelant qui
            // attend `TopBar.Loaded` (poll par frame) doit trouver `MountedTenantGameObject` déjà
            // renseigné dès que `Loaded` devient vrai ; la sonde heat ci-dessous est un aller-retour
            // réseau SUPPLÉMENTAIRE — la placer AVANT ce montage aurait laissé une fenêtre où
            // `TopBar.Loaded==true` mais `MountedTenantGameObject==null` (rougi une première fois,
            // corrigé ici).
            // IMPORTANT-1 (verdict ⊥ HUD v3.1) — MÊME garde que la branche d'échec ci-dessus : la
            // TabBar est cliquable dès `Start()` (`EnsureInitialized`), donc les 2-4 allers-retours
            // réseau de CETTE branche (signin + session/open + TopBar.Load) laissent, EN
            // PRODUCTION, une fenêtre réelle où un joueur peut avoir déjà touché un AUTRE onglet.
            // `ActivateTab(Tab.Empire)` inconditionnel le ramènerait de force et détruirait le
            // locataire qu'il vient d'ouvrir. `TopBar.Load` ci-dessus reste inconditionnel (le
            // TopBar est persistant, affiche l'identité du shell quel que soit l'onglet actif) —
            // seul le MONTAGE forcé d'Empire est gardé par le sentinel.
            if (CurrentTab == (Tab)(-1)) ActivateTab(Tab.Empire);

            // §6.2, AMENDÉ (B1, Deviation) — le chunk 5 sondait CONDITIONNELLEMENT ("seulement si le
            // tenant monté n'est pas Dashboard"), un mécanisme conçu pour départager DEUX locataires
            // qui publiaient chacun à un moment ARBITRAIRE (la course que B1 supprime). Sous B1 il
            // n'y a plus qu'UNE identité, acquise ICI avant tout montage : la sonder directement,
            // inconditionnellement, est plus SIMPLE et sans fenêtre de course. Best-effort, APRÈS le
            // montage d'Empire — ne bloque pas l'affichage du TopBar/onglet sur ce round-trip de plus.
            var world = new WorldApiClient { BaseUrl = baseUrl };
            yield return world.GetDistrictHeat(HeatProbeDistrictId, t,
                heat => PublishCitywideHeat(heat.citywide_bucket),
                errMsg => Debug.LogWarning($"[AppShell] sonde heat (best-effort) échouée : {errMsg}"));
        }

        /// <summary>LES QUATRE GESTES DE MONTAGE D'UN LOCATAIRE (design D2 ; item 0.4,
        /// charpente-item0-4-design.md §1.6/§2.2), en un SEUL corps désormais partagé par les
        /// TROIS appelants — `MountTenant<T>` (onglets), `EnterDistrict` (qui en portait une copie
        /// verbatim, EN RETARD sur celle-ci), et `MonterLocataireEnSurimpression<T>`
        /// (`IShellNavigator`, item 0.4 — un troisième site qui serait sinon né avec sa propre
        /// copie). Ne s'occupe PAS de `MountedTenantGameObject`/`MountedTenantType` : ces deux
        /// champs désignent l'écran de l'ONGLET courant, et seuls les appelants pour qui c'est vrai
        /// les renseignent — un locataire monté EN SURIMPRESSION ne remplace pas l'onglet actif.</summary>
        private T ConstruireLocataire<T>(out GameObject host) where T : MonoBehaviour, IShellTenant
        {
            host = new GameObject($"Tenant_{typeof(T).Name}");
            // Parent the HOST itself under ContentSlot (lifecycle only — the tenant's OWN UI is a
            // SEPARATE set of GameObjects it builds and parents there itself, see IShellTenant's own
            // header). Without this, the host was an independent scene-root object: destroying the
            // shell (or even calling UnmountCurrentTenant from outside a full shell teardown) never
            // reached it, and its background coroutines (a screen's own Boot()/Load(), e.g.
            // CityMapController's demo sign-in) kept running into LATER, unrelated tests/fixtures —
            // measured: an orphaned CityMapController's failed sign-in attributed a `Debug.LogError`
            // to an unconnected exceptions-panel test three fixtures later in the SAME PlayMode domain.
            host.transform.SetParent(ContentSlot, false);
            // Le chrome publie ce qu'il MANGE avant que le locataire ne construise quoi que ce
            // soit. Sans ça, un locataire qui veut poser du texte lisible n'a aucun moyen de savoir
            // où commence la zone libre : `ContentSlot` couvre tout le canvas par conception (pour
            // qu'un fond plein écran passe SOUS les barres), donc s'y étirer met le titre derrière
            // le bandeau. Mesuré sur capture : « LA FAMILLE » chevauchait le filet du bandeau.
            PublierInsetsDuChrome();
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
            return tenant;
        }

        private void MountTenant<T>() where T : MonoBehaviour, IShellTenant
        {
            T tenant = ConstruireLocataire<T>(out GameObject host);
            MountedTenantGameObject = host;
            MountedTenantType = typeof(T);
        }

        /// <summary>`IShellNavigator` (item 0.4, charpente-item0-4-design.md §2.1/§2.2) — monte `T`
        /// en surimpression, PAR CE SHELL : mêmes 4 gestes que `MountTenant<T>`/`EnterDistrict`, via
        /// `ConstruireLocataire`, rien de plus. « En surimpression » n'est pas de la décoration :
        /// c'est la sémantique EXACTE d'aujourd'hui pour les deux appelants visés
        /// (`DashboardController.OpenNav`, `ExceptionQueueController.OpenDetail`) — un écran ouvert
        /// PAR-DESSUS le locataire courant, SANS le détruire (le détail d'exception doit retrouver
        /// sa file encore vivante au retour). `MountedTenantGameObject`/`MountedTenantType` restent
        /// donc INTOUCHÉS ici : 6 assertions existantes d'`AppShellPlayModeTests` les lisent avec
        /// le sens précis « ce que l'ONGLET courant a monté ».</summary>
        public T MonterLocataireEnSurimpression<T>() where T : MonoBehaviour, IShellTenant
        {
            return ConstruireLocataire<T>(out _);
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

        // Retour user relayé par le contrôleur (2026-08-21) : « `Screen.safeArea`, ta trouvaille…
        // traite-la maintenant ». MESURÉ (ce même lot) : 0 occurrence de `safeArea` dans tout
        // `Assets/Scripts/` avant ce correctif — le chrome (TopBar en haut, TabBar en bas) était
        // ancré ABSOLUMENT aux bords du canvas, sans réserver l'espace d'une encoche caméra ou
        // d'une barre de gestes système sur un téléphone réel.
        //
        // `Screen.safeArea` est EN LECTURE SEULE sur un vrai appareil/build — un test PlayMode ne
        // peut PAS le forcer directement. Seam testable : ce délégué, par défaut la valeur réelle,
        // qu'un test peut remplacer AVANT que le shell ne construise son layout pour prouver que
        // les marges s'appliquent MÉCANIQUEMENT, sans dépendre d'un simulateur/appareil physique
        // (voir `ChromeSafeAreaPlayModeTests.cs`, contrôle positif — monde dégénéré à tuer : un
        // test qui passe seulement parce que la zone sûre vaut zéro dans l'éditeur). Remis à son
        // défaut par le `TearDown` de CE test — jamais laissé fuiter vers un test SANS RAPPORT.
        public static System.Func<Rect> SafeAreaProvider = () => Screen.safeArea;

        /// <summary>Insets HAUT/BAS de `Screen.safeArea`, convertis en unités CANVAS LOCALES.
        /// `CanvasScaler.ScaleWithScreenSize` + `matchWidthOrHeight=0` (défaut Unity, JAMAIS changé
        /// dans ce dépôt — vérifié `execute_code` sur un `CanvasScaler` frais) ⇒ le facteur
        /// d'échelle est TOUJOURS `Screen.width / referenceResolution.x`, calculé DIRECTEMENT
        /// plutôt que lu sur `canvas.scaleFactor` (qui peut ne pas être encore à jour dans LA MÊME
        /// frame que la construction du Canvas — pas de dépendance de timing implicite).</summary>
        /// <summary>Recalcule et publie les insets du chrome dans `ShellChrome`.
        ///
        /// ⚠️ LES HAUTEURS DE `rect` NE SONT VALIDES QU'APRÈS UNE PASSE DE LAYOUT. On force donc la
        /// passe avant de lire — une valeur lue dans la frame de création rendrait un zéro
        /// parfaitement plausible, exactement le piège du `Canvas.scaleFactor` lu trop tôt.</summary>
        private void PublierInsetsDuChrome()
        {
            if (TopBarSlot == null || TabBarRoot == null) return;
            Canvas.ForceUpdateCanvases();
            (float topSafe, float bottomSafe) = SafeAreaInsetsLocal();
            // `EffectiveBottomOverhangPx` sort désormais en unités d'ÉCRAN (la conversion vit
            // chez le bandeau, qui connaît son échelle) — donc additionnable tel quel avec
            // `rect.height`, sans qu'aucun appelant ait à s'en souvenir.
            float debord = TopBar != null ? TopBar.EffectiveBottomOverhangPx : 0f;
            ShellChrome.PublierInsets(topSafe + TopBarSlot.rect.height + debord,
                                      bottomSafe + TabBarRoot.rect.height);
        }

        private static (float top, float bottom) SafeAreaInsetsLocal()
        {
            Rect safeArea = SafeAreaProvider();
            float screenW = Screen.width, screenH = Screen.height;
            if (screenW <= 0f || screenH <= 0f) return (0f, 0f); // anti-vacuité — jamais une division par 0
            float scaleFactor = screenW / ReferenceResolutionWidth;
            float topPx = Mathf.Max(0f, screenH - safeArea.yMax);
            float bottomPx = Mathf.Max(0f, safeArea.yMin);
            return (topPx / scaleFactor, bottomPx / scaleFactor);
        }

        private const float ReferenceResolutionWidth = 1280f; // REUSE — CanvasScaler.referenceResolution.x ci-dessous

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
                scaler.referenceResolution = new Vector2(ReferenceResolutionWidth, 720);
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
            // ⛔⛔ LE BANDEAU ÉTAIT 3,27× TROP PETIT, POUR LA MÊME RAISON QUE LE DOCK : ses ~40
            // constantes sont des px CSS de la maquette, posées telles quelles en unités de canvas.
            // Mesuré au canon : `.medaillon` fait 64 px CSS sur un téléphone de 392 — soit 16,3 %
            // de la largeur. Le manomètre livré en faisait 68 unités sur 1280, soit 5,3 %.
            //
            // ⇒ LE CORRECTIF N'ÉDITE AUCUNE DE CES 40 CONSTANTES, et c'est délibéré. Les retoucher
            // une à une, c'est quarante occasions de casser un rapport interne — et le manomètre
            // en porte plusieurs, déjà payés (l'arc échantillonné à un ratio périmé, la ligne de
            // base sous le libellé). La forme retenue est STRUCTURELLE : le bandeau continue de
            // vivre en COORDONNÉES DE MAQUETTE (392 de large), et un seul `localScale` le porte à
            // l'écran. Toutes ses proportions internes sont préservées PAR CONSTRUCTION, et une
            // seule variable change.
            TopBarSlot.sizeDelta = new Vector2(0, Px(TopBarHauteurCss));
            // Zone sûre — décale la barre SOUS une encoche/caméra perforée (Screen.safeArea.yMax <
            // Screen.height). 0 sur tout appareil/éditeur SANS encoche (safeArea == plein écran) —
            // additif, jamais une refonte d'ancrage.
            (float topSafeInset, _) = SafeAreaInsetsLocal();
            TopBarSlot.anchoredPosition = new Vector2(0f, -topSafeInset);
            // ⛔ TRANSPARENT. `surfaceCard` posait un aplat OPAQUE sous le bandeau, et il
            // annulait exactement ce que le bandeau est : `.barre{background:linear-gradient(
            // 180deg,#0b111be8,#0d131ed8)}` — un VERRE à 0,91/0,85 d'opacité, à travers lequel
            // l'art se devine. Les tokens `hudBarGlassTop/Bottom` portaient déjà les bonnes
            // valeurs : c'est l'aplat du dessous qui les rendait inopérantes.
            // *Un dispositif correct peut être annulé par un voisin qui n'a rien à voir avec lui.*
            Color fondBandeau = DesignTokens.Current.surfaceCard; fondBandeau.a = 0f;
            topBarGo.AddComponent<Image>().color = fondBandeau;
            // W3.U1 C2 — TopBarController lives on a CHILD GameObject (never directly on TopBarSlot
            // itself): its own BuildLayout() stretches ITS OWN RectTransform to fill its parent
            // (design: "no Canvas discovery, builds into whatever RectTransform it's parented under")
            // — attaching it straight to TopBarSlot would have that self-stretch OVERWRITE the
            // top-strip anchors/size just set above. Built ONCE here, never touched by
            // ActivateTab/UnmountCurrentTenant (it is NOT a tenant — it survives every tab switch).
            // Le nœud d'échelle : large de `TopBarLargeurCss` unités (la largeur du téléphone de la
            // maquette), donc `TopBarController` — qui étire SA PROPRE rect pour remplir son parent
            // — se retrouve à bâtir dans le repère exact où ses constantes ont un sens.
            GameObject echelleGo = new GameObject("TopBarEchelle", typeof(RectTransform));
            echelleGo.transform.SetParent(TopBarSlot, false);
            RectTransform echelleRt = (RectTransform)echelleGo.transform;
            echelleRt.anchorMin = new Vector2(0.5f, 0.5f);
            echelleRt.anchorMax = new Vector2(0.5f, 0.5f);
            echelleRt.pivot = new Vector2(0.5f, 0.5f);
            echelleRt.sizeDelta = new Vector2(TopBarLargeurCss, TopBarHauteurCss);
            echelleRt.anchoredPosition = Vector2.zero;
            float k = FacteurEchelle();
            echelleRt.localScale = new Vector3(k, k, 1f);

            GameObject topBarContentGo = new GameObject("TopBarContent", typeof(RectTransform));
            topBarContentGo.transform.SetParent(echelleGo.transform, false);
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
        /// <summary>Largeur du repère dans lequel `TopBarController` est autoré : la largeur du
        /// téléphone de la maquette. REUSE — c'est la même référence que `EchelleMaquette`.</summary>
        private const float TopBarLargeurCss = EchelleMaquette.LargeurMaquetteCss;

        /// <summary>Hauteur du bandeau, MESURÉE au canon : le filet laiton tombe à 51,0 px CSS
        /// (`Tools/juge-visuel/ecran-principal/`, détection du laiton sur le rendu de référence).
        /// Le manomètre DÉBORDE sous cette limite — c'est voulu, et c'est ce que
        /// `EffectiveBottomOverhangPx` mesure.</summary>
        private const float TopBarHauteurCss = 52f;   // `.barre{height:52px}` (mon relevé du filet : 51,0 — d'accord à 1 px près)

        /// <summary>Le facteur unique px CSS de maquette → unités de canvas.</summary>
        private float FacteurEchelle() => Px(1f);

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
            // 76 et non 64 : le dock de la maquette empile un ROND et son libellé, là où l'ancien
            // bouton n'avait qu'un texte centré. Les insets du chrome suivent tout seuls — ils sont
            // dérivés de `TabBarRoot.rect.height`, jamais d'une constante recopiée.
            TabBarRoot.sizeDelta = new Vector2(0, Px(TabDockHauteurCss));
            // Zone sûre — décale la barre AU-DESSUS d'une barre de gestes système (Screen.safeArea
            // .yMin > 0). Même mécanisme que TopBarSlot ci-dessus, même provider.
            (_, float bottomSafeInset) = SafeAreaInsetsLocal();
            TabBarRoot.anchoredPosition = new Vector2(0f, bottomSafeInset);

            // ⚠️⚠️ CE N'EST PLUS UNE BARRE — RULING USER (2026-08-25) : « tu vois bien que ce sont
            // des BULLES et pas une barre ». Le canon le dit aussi, et je ne l'avais pas lu :
            // `hud-brennar.html` l.107-108 donne au dock `background: linear-gradient(180deg,
            // transparent, #070b12d8 40%)` — un simple assombrissement vers le bas. **Pas d'assise
            // opaque, pas de verre à coins arrondis, pas de filet laiton.** Les ronds FLOTTENT
            // au-dessus de la ville.
            //
            // Ce qui part, et pourquoi c'est justifié de le retirer :
            //   · `TabBarAssise` — un panneau opaque posé après qu'un juge a mesuré l'art du
            //     district fuyant par les 6 dernières lignes. Le dégradé du canon règle le même
            //     problème autrement : il ne CACHE pas la ville, il l'assombrit. La fuite était un
            //     liseré teal dont la couleur changeait selon le décor ; sous un dégradé qui va
            //     jusqu'au bord, il n'y a plus d'interstice à faire fuir.
            //   · `TabBarMask` + `TabBarBackground` + `Hairline` — la « symétrie avec le bandeau
            //     haut » était NOTRE doctrine, écrite quand nous croyions que la maquette n'avait
            //     aucune barre d'onglets. Elle en a une, et ce n'est pas une barre.
            // *Un choix pris faute de canon se rouvre le jour où le canon apparaît.*
            GameObject fonduGo = new GameObject("DockFondu", typeof(RectTransform), typeof(CanvasRenderer));
            fonduGo.transform.SetParent(tabBarGo.transform, false);
            RectTransform fonduRt = (RectTransform)fonduGo.transform;
            fonduRt.anchorMin = new Vector2(0f, 0f);
            fonduRt.anchorMax = new Vector2(1f, 1f);
            // Jusqu'au bord BAS de l'écran, zone sûre comprise : un dégradé qui s'arrête avant le
            // bord rouvrirait exactement l'interstice que l'assise fermait.
            fonduRt.offsetMin = new Vector2(0f, -(bottomSafeInset + 2f));
            fonduRt.offsetMax = Vector2.zero;
            Image fonduImg = fonduGo.AddComponent<Image>();
            // `linear-gradient(180deg, transparent, #070b12d8 40%)` : transparent en haut, opaque à
            // 84,7 % dès 40 % de la hauteur — donc un plateau sur les 60 % du bas.
            // ⛔⛔ CE VOILE ÉTAIT DEUX FOIS TROP FAIBLE, ET C'EST UN BLOQUANT DE LISIBILITÉ.
            // Mesuré par un juge visuel ⊥ à 1080×1920 : les libellés du dock tombaient à
            // **3,49:1** de contraste, sous le plancher de 4,5:1 (le canon en donne 8,48:1), et
            // le dock — bande la PLUS SOMBRE de la maquette — devenait la plus CLAIRE de la moitié
            // basse de l'écran (L moyenne 29,7 → 82,1). Hiérarchie de valeurs verticale inversée.
            //   Même cause que les voiles de la fiche : le navigateur compose en sRGB, le client en
            //   linéaire, et l'écart croît avec le contraste encre/fond — ici une encre quasi noire
            //   sur l'eau claire du port, donc le pire cas.
            //   Le dock flotte sur l'ART ⇒ fond inconnu ⇒ ajustement d'opacité déclaré, avec son
            //   résidu (mesuré 46,43 → 4,11 /255 sur les sept fonds de référence).
            Color sombre = DesignTokens.Current.hudBarGlassBottom;
            float residuDock;
            sombre.a = ProceduralUI.AlphaVoileSurFondQuelconque(sombre, sombre.a, out residuDock);
            Color clair = sombre; clair.a = 0f;
            fonduImg.sprite = ProceduralUI.VerticalGradient(64, clair, sombre);
            fonduImg.type = Image.Type.Simple;
            fonduImg.color = Color.white;
            fonduImg.raycastTarget = false;
            fonduGo.AddComponent<LayoutElement>().ignoreLayout = true;
            fonduGo.transform.SetAsFirstSibling();

            HorizontalLayoutGroup hlg = tabBarGo.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(0, 0,
                Mathf.RoundToInt(Px(TabDockPadHautCss)), Mathf.RoundToInt(Px(TabDockPadBasCss)));
            hlg.spacing = Px(TabDockEcartCss);            // `.dock{gap:22px}`
            hlg.childAlignment = TextAnchor.UpperCenter;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            // `.dock{justify-content:center}` — les bulles se GROUPENT au centre, elles ne se
            // partagent pas la largeur. Étirées, ce ne sont plus des bulles mais des colonnes.
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;

            // ⚠️ QUATRE BULLES, PAS CINQ — canon §6 : « Dock — 4 ronds gravés, SANS la Carte. On est
            // déjà sur la carte : elle sort du dock. » `Tab.Empire` EST cette carte (items 0.2/0.3,
            // ruling 2026-08-25 — fusion de l'ancien `Home` et de l'ancien `City`, la branche City
            // déplacée telle quelle) ; l'écran de district porte déjà « ← Carte » dans son bandeau,
            // et F0.3 (Tools/charpente-item0-2-3-design.md) PROUVE cette porte atteignable par un
            // geste de production plutôt que de l'affirmer en prose.
            // Les libellés sont désormais ceux du canon EXACTEMENT (décision A tranchée) : Empire ·
            // Famille · Filière · Plus (« Marché » au jalon 4 — pas avant que screen_b1 existe, un
            // bouton qui ment étant pire qu'un bouton absent).
            //
            // UNE seule liste ordonnée (`DockRatifie`, design §3.1) : les TROIS sites qui en
            // dépendaient — cette construction, `RebatirChromePourResolutionCourante`, et l'ordre
            // que lit `RefreshTabButtonVisuals` — la LISENT désormais au lieu de la recopier chacun.
            // « Deux listes qui doivent rester parallèles sont une dette » : il y en avait TROIS, et
            // c'est ce qui rendait la 3e (`RefreshTabButtonVisuals`) capable de décaler tous les
            // indices et de poser l'indicateur d'actif sur la mauvaise bulle si on en oubliait une.
            foreach ((Tab onglet, string libelle) in DockRatifie) AddTabButton(onglet, libelle);
        }

        /// <summary>L'ORDRE du dock, défini UNE FOIS (items 0.2/0.3, design §3.1). Les TROIS sites
        /// qui en dépendaient — `BuildTabBar`, `RebatirChromePourResolutionCourante`, et l'ordre que
        /// lit `RefreshTabButtonVisuals` — le LISENT, ils ne le recopient plus.</summary>
        private static readonly (Tab onglet, string libelle)[] DockRatifie =
        {
            (Tab.Empire,   "Empire"),
            (Tab.Org,      "Famille"),
            (Tab.Pipeline, "Filière"),   // « Marché » au jalon 4 — pas avant que screen_b1 existe
            (Tab.More,     "Plus"),
        };

        // Le dock de `hud-brennar.html` (l.107-117), ramené à la hauteur de barre de ce client.
        // La maquette donne rond 46 · gap 5 · libellé 8,5 · paddings 10/16, soit ~88 de haut ; la
        // barre d'onglets d'ici en fait 76. Facteur unique 76/88 = 0,864, appliqué à TOUT.
        // ⚠️ LA SOMME DOIT TENIR DANS LA BARRE, sinon le layout COMPRIME et le rond devient une
        // ellipse — mesuré sur capture, deux fois de suite. Le compte est explicite :
        //   7 (padding haut) + 36 (rond) + 7 (écart) + 11 (libellé) + 10 (padding bas) = 71 ≤ 72.
        // Un rond n'est un cercle que si RIEN ne le comprime : sa hauteur est la première victime
        // d'un conteneur trop court, et le défaut se lit comme un choix de forme.
        // ⛔⛔ CES VALEURS SONT EN PX CSS DE LA MAQUETTE, ET ELLES NE SONT PLUS RECOPIÉES
        // TELLES QUELLES EN UNITÉS DE CANVAS. C'était le défaut, et il était systématique :
        // `36f` était posé comme unité de canvas, donc rendu sur un écran de 1280 unités — soit
        // 2,8 % de la largeur, là où le canon donne 46/392 = 11,7 %. **Le dock sortait 4,2× trop
        // petit**, et c'est ce que l'user a vu (« ce sont des bulles et pas une barre » : à cette
        // taille, une bulle est une pastille). Les valeurs ci-dessous sont désormais les valeurs
        // EXACTES du canon, converties par `EchelleMaquette.Px` au moment de bâtir.
        //   `hud-brennar.html` : `.dockb .rond{width:46px;height:46px}` · `.dockb{gap:5px;
        //   font-size:8.5px}` · `.dockb .pointe{width:14px;height:2px;bottom:-4px}` ·
        //   `.dock{gap:22px;padding:10px 0 16px}` · `.dockb .rond img{width:20px;height:20px}`
        private const float TabDockRondCss = 46f;
        private const float TabDockGapCss = 5f;            // `.dockb{gap:5px}` — rond → libellé
        private const float TabDockLabelSizeCss = 8.5f;
        // 13,17 et non 11 : la SOMME des termes doit rendre la hauteur MESURÉE du dock
        // (`.dock` = 390 × 90,17 px CSS au navigateur). 90,17 − 10 − 46 − 5 − 16 = 13,17.
        private const float TabDockLabelHeightCss = 13.17f;
        private const float TabDockPointeWidthCss = 14f;
        private const float TabDockPointeHeightCss = 2f;
        private const float TabDockPointeBasCss = 4f;      // `bottom:-4px`
        private const float TabDockEcartCss = 22f;         // `.dock{gap:22px}`
        private const float TabDockPadHautCss = 10f;
        private const float TabDockPadBasCss = 16f;
        /// <summary>10 + 46 + 5 + 11 + 16 = 88 px CSS. Écrit comme une SOMME de ses termes plutôt
        /// que comme un nombre : un rond comprimé devient une ellipse, et le premier symptôme
        /// d'un conteneur trop court est une forme, pas une erreur.</summary>
        private const float TabDockHauteurCss =
            TabDockPadHautCss + TabDockRondCss + TabDockGapCss + TabDockLabelHeightCss + TabDockPadBasCss;

        /// <summary>Px CSS de la maquette → unités de canvas, sur la racine PLEIN ÉCRAN du shell.
        /// Passer autre chose que le canvas (un panneau, une barre) diviserait toute l'échelle
        /// par un facteur muet — c'est la faute du « spacing corrigé sur le mauvais conteneur ».</summary>
        private float Px(float css) =>
            EchelleMaquette.Px(css, ShellCanvas != null ? (RectTransform)ShellCanvas.transform : null);

        /// <summary>Un `LayoutElement` de hauteur fixe — le pendant local de l'helper des écrans
        /// opérationnels, que le shell ne peut pas atteindre (il ne référence pas leurs assemblies).</summary>
        private static void AddLayoutElementLocal(GameObject go, float hauteur)
        {
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.minHeight = hauteur;
            le.preferredHeight = hauteur;
            le.flexibleHeight = 0f;
        }

        private void AddTabButton(Tab tab, string label)
        {
            GameObject btn = new GameObject($"Tab_{tab}", typeof(RectTransform));
            btn.transform.SetParent(TabBarRoot, false);
            // ⚠️ FOND TRANSPARENT, PAS UN PAVÉ. La maquette (`hud-brennar.html` l.107-117) ne
            // dessine AUCUN rectangle d'onglet : chaque bouton est un ROND de 46 sur un dégradé
            // radial bleu nuit, avec son libellé DESSOUS. J'avais construit cinq rectangles pleine
            // largeur en `surfaceRow` — un gris-vert plat, mesuré (34,42,46) sur capture — et un
            // soulignement doré. L'user l'a relevé : « les menus sont toujours mal faits, ils
            // devraient être bleus ».
            // L'Image reste (transparente) parce que c'est elle qui reçoit les clics et que la
            // garde `ActiveTab_NeverFlatFill` lit sa couleur : un bouton sans Image la ferait
            // tomber sur un null au lieu de mesurer.
            Image img = btn.AddComponent<Image>();
            Color invisible = DesignTokens.Current.surfaceRow;
            invisible.a = 0f;
            img.color = invisible;
            VerticalLayoutGroup pile = btn.AddComponent<VerticalLayoutGroup>();
            pile.spacing = Px(TabDockGapCss);
            pile.padding = new RectOffset(0, 0, 0, 0);
            pile.childAlignment = TextAnchor.UpperCenter;
            // ⚠️ PAS D'EXPANSION HORIZONTALE — sinon le rond devient une ELLIPSE. Mesuré sur
            // capture : les cinq « ronds » s'étiraient sur toute la largeur de leur onglet.
            // `.dockb{align-items:center}` : les enfants gardent leur largeur et se centrent.
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = false; pile.childForceExpandHeight = false;

            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(() => ActivateTab(tab));

            // ⚠️ L'INDICATEUR N'EST PLUS UN SOULIGNEMENT PLEINE LARGEUR. Il l'était, déplacé du
            // bord haut au bord bas du bouton après un verdict de juge visuel — mais c'était encore
            // notre invention : la maquette du HUD ne contenait AUCUNE barre d'onglets quand ce
            // choix a été fait, et je l'avais écrit ici même. Elle en contient une (`hud-brennar.html`
            // l.107-117, `.dock`), et elle désigne l'actif par un TIRET de 14×2 sous le rond.
            // *Un choix pris faute de canon doit être rouvert le jour où le canon apparaît.*

            // ── LE ROND (`.dockb .rond`) ────────────────────────────────────────────────────
            // `width:46;border-radius:50%;background:radial-gradient(circle at 38% 30%,#1d2635,#0d1420 65%);
            //  border:1px solid #ffffff22; box-shadow: inset 0 1px 0 #ffffff1c, 0 4px 10px #000a`
            GameObject rondGo = new GameObject("Rond", typeof(RectTransform));
            rondGo.transform.SetParent(btn.transform, false);
            LayoutElement leRond = rondGo.AddComponent<LayoutElement>();
            float rondPx = Px(TabDockRondCss);
            leRond.preferredWidth = rondPx;
            leRond.preferredHeight = rondPx;
            leRond.flexibleWidth = 0f;
            Image rondImg = rondGo.AddComponent<Image>();
            rondImg.sprite = ProceduralUI.RadialDisc(128,
                DesignTokens.Current.dockRondInner, DesignTokens.Current.dockRondOuter);
            rondImg.color = Color.white;
            rondImg.raycastTarget = false;

            Color jonc = Color.white; jonc.a = 0.133f;                 // #ffffff22
            GameObject joncGo = new GameObject("Jonc", typeof(RectTransform));
            joncGo.transform.SetParent(rondGo.transform, false);
            Stretch((RectTransform)joncGo.transform, Vector2.zero, Vector2.zero);
            Image joncImg = joncGo.AddComponent<Image>();
            // `border:1px solid #ffffff22` — UN px CSS, donc mis à l'échelle comme le reste.
            joncImg.sprite = ProceduralUI.Ring(128, 128f * (Px(1f) / rondPx), jonc);
            joncImg.color = Color.white;
            joncImg.raycastTarget = false;

            // ── L'INDICATEUR D'ACTIF (`.dockb .pointe`) ─────────────────────────────────────
            // `width:14px;height:2px;background:var(--laiton);bottom:-4px` — un TIRET sous le rond,
            // pas un soulignement pleine largeur. Enfant du ROND (donc centré sur lui), hors layout.
            // ⚠️ Le nom `ActiveIndicator` est un CONTRAT : `RefreshTabButtonVisuals` et la garde
            // `ActiveTab_NeverFlatFill_OnlyThinIndicator` le cherchent par ce nom sur le BOUTON.
            GameObject indicatorGo = new GameObject("ActiveIndicator", typeof(RectTransform));
            indicatorGo.transform.SetParent(btn.transform, false);
            indicatorGo.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform indicatorRect = (RectTransform)indicatorGo.transform;
            indicatorRect.anchorMin = new Vector2(0.5f, 1f);
            indicatorRect.anchorMax = new Vector2(0.5f, 1f);
            indicatorRect.pivot = new Vector2(0.5f, 1f);
            indicatorRect.sizeDelta = new Vector2(Px(TabDockPointeWidthCss), Px(TabDockPointeHeightCss));
            // `.pointe{bottom:-4px}` — 3 sous le rond, DANS l'écart qui le sépare du libellé.
            // À 4 avec un écart de 4, il traversait le texte (mesuré sur capture : une barre d'or
            // au milieu de « ACCUEIL »).
            // `.pointe{position:absolute;bottom:-4px}` est posé sur `.rond` (qui est
            // `position:relative`) : « bottom:-4 » veut dire que le BAS du tiret est 4 px sous le
            // bas du rond, donc le tiret occupe [rond+2 ; rond+4]. Le libellé, lui, commence à
            // rond+5 (`.dockb{gap:5px}`) — les deux ne se touchent pas.
            // ⛔ En posant le HAUT du tiret à rond+4, il empiétait sur le libellé : mesuré sur
            // capture, une barre d'or au travers de « ACCUEIL ». C'est la même faute que le filet
            // qui traversait le disque et coupait le texte en deux.
            indicatorRect.anchoredPosition = new Vector2(0f,
                -(rondPx + Px(TabDockPointeBasCss - TabDockPointeHeightCss)));
            Image indicatorImg = indicatorGo.AddComponent<Image>();
            indicatorImg.color = DesignTokens.Current.hudHairlineGold;
            indicatorImg.raycastTarget = false;
            indicatorGo.SetActive(false);

            // ── LE LIBELLÉ, SOUS LE ROND (`.dockb`) ────────────────────────────────────────
            // `font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--creme-2)`
            GameObject textGo = new GameObject("Label", typeof(RectTransform));
            textGo.transform.SetParent(btn.transform, false);
            AddLayoutElementLocal(textGo, Px(TabDockLabelHeightCss));
            TextMeshProUGUI t = textGo.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = label.ToUpperInvariant();
            t.fontSize = Px(TabDockLabelSizeCss);
            t.characterSpacing = 16f;                                  // .16em
            t.alignment = TextAlignmentOptions.Top;
            t.color = DesignTokens.Current.hudCremeSecondary;           // --creme-2 #b9ad92
            t.raycastTarget = false;

            tabButtons.Add(btn);
        }

        /// <summary>Refait la mise à l'échelle du CHROME (bandeau + dock) pour la taille de canvas
        /// courante, et reconstruit les bulles.
        ///
        /// ⛔⛔ MÊME DÉFAUT QUE LE FOND DE DISTRICT, ET IL A PRODUIT QUATRE FINDINGS POUR UNE SEULE
        /// CAUSE. `Px()` lit la largeur du canvas au moment de BÂTIR. Une capture hors écran qui
        /// bascule ensuite sur une cible d'une autre taille laisse tout le chrome à l'échelle
        /// d'avant. Un juge visuel ⊥ a mesuré, sans savoir d'où ça venait : barre 367,7 pour 392
        /// (0,938) · rond du dock 42,8 pour 46,0 (0,930) · chasse de « ARGENT » −16 % · position de
        /// l'aile gauche. **0,9375 = 1080/1152**, le rapport des `scaleFactor` entre la cible et la
        /// vue de jeu — pas quatre défauts de dessin, un seul défaut de MESURE.
        ///   ★ Et le juge avait donné le signe qui le désigne : l'écart de chasse était SÉLECTIF —
        ///     −16 % sur « ARGENT » dans le bandeau, −2 % sur « FAMILLE » dans le dock, même fonte,
        ///     même écran. *Un défaut sélectif désigne son conteneur*, et les deux conteneurs
        ///     n'avaient pas été bâtis au même moment.</summary>
        public void RebatirChromePourResolutionCourante()
        {
            if (ShellCanvas == null || TopBarSlot == null || TabBarRoot == null) return;
            Canvas.ForceUpdateCanvases();

            float k = FacteurEchelle();
            TopBarSlot.sizeDelta = new Vector2(0, Px(TopBarHauteurCss));
            Transform echelle = TopBarSlot.Find("TopBarEchelle");
            if (echelle != null)
            {
                var echelleRt = (RectTransform)echelle;
                echelleRt.sizeDelta = new Vector2(TopBarLargeurCss, TopBarHauteurCss);
                echelleRt.localScale = new Vector3(k, k, 1f);
            }

            (float topSafe, float bottomSafe) = SafeAreaInsetsLocal();
            TopBarSlot.anchoredPosition = new Vector2(0f, -topSafe);
            TabBarRoot.sizeDelta = new Vector2(0, Px(TabDockHauteurCss));
            TabBarRoot.anchoredPosition = new Vector2(0f, bottomSafe);

            HorizontalLayoutGroup hlg = TabBarRoot.GetComponent<HorizontalLayoutGroup>();
            if (hlg != null)
            {
                hlg.padding = new RectOffset(0, 0,
                    Mathf.RoundToInt(Px(TabDockPadHautCss)), Mathf.RoundToInt(Px(TabDockPadBasCss)));
                hlg.spacing = Px(TabDockEcartCss);
            }

            // Les bulles se reconstruisent : leurs tailles sont posées à la construction (rond,
            // écart, corps du libellé, tiret) et aucune ne se recalcule toute seule.
            Transform fondu = TabBarRoot.Find("DockFondu");
            for (int i = TabBarRoot.childCount - 1; i >= 0; i--)
            {
                Transform enf = TabBarRoot.GetChild(i);
                if (fondu != null && enf == fondu) continue;
                DestroyImmediate(enf.gameObject);
            }
            tabButtons.Clear();
            // MÊME source que `BuildTabBar` (design §3.1) — jamais recopiée : c'est ce chemin de
            // reconstruction (le second des deux que F0.2 doit couvrir) qui, avant la fusion en
            // liste unique, pouvait diverger silencieusement de la construction initiale.
            foreach ((Tab onglet, string libelle) in DockRatifie) AddTabButton(onglet, libelle);
            if (fondu != null) fondu.SetAsFirstSibling();
            RefreshTabButtonVisuals();

            Canvas.ForceUpdateCanvases();
            PublierInsetsDuChrome();
        }

        private void RefreshTabButtonVisuals()
        {
            // ⚠️ MÊME ORDRE QUE `BuildTabBar`, LU À LA MÊME SOURCE (`DockRatifie`, design §3.1) —
            // plus recopié. C'était la 3e des trois listes parallèles que ce fichier dénonçait
            // lui-même comme une dette : un membre laissé ici décalait tous les indices et posait
            // l'indicateur d'actif sur la mauvaise bulle. Une seule liste, trois lecteurs.
            for (int i = 0; i < tabButtons.Count && i < DockRatifie.Length; i++)
            {
                bool active = DockRatifie[i].onglet == CurrentTab;
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
                // ⚠️ LE LIBELLÉ NE CHANGE PLUS DE COULEUR. La maquette (`hud-brennar.html` l.109-116)
                // met TOUS les libellés en `--creme-2` et ne distingue l'actif QUE par `.pointe` —
                // le tiret laiton sous le rond. Je teintais le libellé en plus : deux signaux d'or
                // pour une seule information, et la doctrine « un seul or dans le chrome » s'en
                // trouvait diluée.
                // ★ Et c'est le bon choix d'accessibilité : l'état est porté par une FORME qui
                // apparaît, pas par une teinte — un daltonien lit le tiret, pas la nuance.
                TextMeshProUGUI t = tabButtons[i].GetComponentInChildren<TextMeshProUGUI>();
                if (t != null) t.color = DesignTokens.Current.hudCremeSecondary;   // --creme-2
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
