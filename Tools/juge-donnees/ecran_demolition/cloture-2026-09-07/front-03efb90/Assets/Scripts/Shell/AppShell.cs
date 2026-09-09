using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational; // DashboardController + LaunderingController (both live here — see each file's own namespace)
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Operational.Selling;
// ⛔ LES QUATRE ASSEMBLIES AJOUTÉES À `Shell.asmdef` AVEC CES USINGS (chantier joignabilité).
//    Le shell est le point de composition : il monte, donc il dépend. Le sens est SÛR et vérifié
//    avant de l'écrire — `Economy`, `Account`, `CitySim` et `CoreLoops` ne référencent QUE
//    `ShellContracts` (jamais `Shell`), donc aucun cycle possible ; `ShellContracts` existe
//    précisément pour que les écrans parlent au shell sans en dépendre.
using MafiaCleanCity.Economy.Shop;
using MafiaCleanCity.Account.Profile;
using MafiaCleanCity.Account.Settings;
using MafiaCleanCity.Onboarding;
using MafiaCleanCity.CitySim.Inspection;
using MafiaCleanCity.CitySim.Precinct;
using MafiaCleanCity.CoreLoops.Compression;
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
    // `DashboardController` n'est plus monté par AUCUN onglet (débranché du DOCK, dit et non
    // masqué). Ceci ferme aussi le cycle fermé mesuré avant ce lot (`City` n'était atteignable QUE
    // depuis un district, lui-même atteignable QUE depuis `City` — `DistrictInteriorScreenController`
    // était donc injoignable depuis un shell en marche) : la première branche du cycle est
    // désormais ouverte par le démarrage lui-même.
    // AMENDÉ ROUND 3 (revue ⊥, BLOQUANT 2, Tools/charpente-item0-2-3-implementation-notes.md
    // § BLOQUANT 2) — débrancher `DashboardController` du dock l'avait aussi débranché de TOUTE
    // production : ses 4 seuls appelants (`BuildingCardController`/`ExceptionQueueController`/
    // `AutonomyInboxController` via `OpenNav`, `ExceptionDetailController` via
    // `ExceptionQueueController.OpenDetail`) devenaient injoignables (forme C du socle). Décision B
    // ratifiée (« l'Accueil devient l'ouverture de session, posée en surimpression au-dessus de
    // l'Empire », front.md §4) branchée MINIMALEMENT dans `AcquireSessionThenActivateHome` : le
    // shell monte désormais `DashboardController` EN SURIMPRESSION (`MonterLocataireEnSurimpression
    // <T>`, item 0.4 — aucun mécanisme nouveau) juste après avoir activé Empire, SEULEMENT sur le
    // chemin qui vient d'activer l'onglet par défaut (même sentinel `(Tab)(-1)` que ci-dessus —
    // jamais sur un joueur qui a déjà navigué ailleurs). Toujours PAS un onglet du dock. CORRIGÉ
    // (item 0.5 §2, C2) — l'énoncé précédent disait que son propre écran (les 4 panneaux orphelins)
    // restait ENTIÈREMENT hors périmètre : FAUX depuis ce chunk — voir `MonterPanneauxAccueil`.
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
        //
        // AMENDÉ (revue ⊥ B2, 2026-08-30) — `identityExplicitlySet` distingue « ce champ porte le
        // défaut sérialisé, personne n'a d'opinion » (rang 3 de la précédence documentée dans
        // `DemoIdentityResolver.cs`) de « ce champ porte un appel EXPLICITE » (rang 1). Sans cette
        // distinction, `DemoIdentityResolver.ResolveAndSignIn` ne pouvait pas voir la différence entre
        // les deux et la variable d'ENVIRONNEMENT (rang 2) battait toujours `SetIdentity` — exactement
        // l'inverse de l'intention : `CharpenteOuvertureSessionOverlayPlayModeTests.cs:492` et
        // `NavigationPlayModeTests.cs:225` posent une identité DÉLIBÉRÉMENT invalide pour exercer la
        // branche de repli-échec, et rougissaient dès qu'un éditeur voisin posait
        // `MAFIA_DEMO_IDENTIFIER` — la configuration même que ce lot existe pour permettre.
        [Header("Identité de session (B1 — le shell signe UNE fois)")]
        [SerializeField] private string demoIdentifier = "operational_demo@example.test";
        [SerializeField] private string demoPassword = "operational-demo-pw";
        private bool identityExplicitlySet;

        // ---- test hooks --------------------------------------------------
        public Tab CurrentTab { get; private set; } = (Tab)(-1); // "no tab activated yet" — a named state, not a magic default

        /// <summary>L'onglet que le DOCK signale — distinct de `CurrentTab`, et c'est le correctif.
        ///
        /// ⛔ MESURÉ le 2026-09-06 : sous l'intérieur de district, `CurrentTab` vaut la sentinelle
        /// `(Tab)(-1)` et **0 indicateur sur 4 est allumé** ; sous un autre écran, 1 sur 4 l'est.
        /// Un juge ⊥ l'avait vu par l'autre bout — « 0 pixel doré dans toute la bande du dock » —
        /// et les planches le confirment : ③ en porte 172, ⑥ 95, ① **zéro**. Les quatre objets
        /// EXISTENT ; c'est l'ÉTAT qui manque. *Avant de corriger un objet absent, vérifier qu'il
        /// est absent* : ici il ne l'était pas.
        /// ⇒ Cause : `EnterDistrict` ne touche pas `CurrentTab`, et le fichier le dit — mais on ne
        ///   peut PAS le lui faire toucher : la sentinelle `(Tab)(-1)` est lue par la garde
        ///   d'acquisition de session (trois sites), qui distingue « aucun onglet activé » de
        ///   « onglet activé ». Lui donner une valeur ici changerait un dispositif qui n'a rien à
        ///   voir avec le dock. *Une garde utile sur un domaine devient un défaut dès qu'on
        ///   l'applique à un autre* — on ne réutilise donc pas sa variable.
        /// ⇒ Deux questions, deux champs : `CurrentTab` reste « quel onglet a été activé », et
        ///   celui-ci répond « quel onglet le dock met en évidence ». Entrer dans un district
        ///   signale l'Empire, parce que le district S'ATTEINT depuis l'Empire.</summary>
        private Tab ongletSignale = (Tab)(-1);
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

        /// <summary>Le nombre de locataires déjà montés À L'INSTANT où le dictionnaire a été
        /// amorcé — `-1` s'il ne l'a pas été. La garde lit CECI, pas `I18nCatalog.Charge` : un
        /// booléen « chargé » est vrai aussi quand on l'a chargé TROP TARD, c'est-à-dire après
        /// qu'un écran a déjà rendu ses replis pour toute la session. *La propriété qui compte
        /// n'est pas « est-ce chargé ? » mais « était-ce chargé AVANT le premier montage ? ».*</summary>
        public int MontagesAuChargementDuCatalogue { get; private set; } = -1;

        // §6.2 — la valeur citywide_bucket, sondée par CE shell avec SON jeton (voir
        // AcquireSessionThenActivateHome — Deviation notée là : sonde inconditionnelle sous B1,
        // plus simple et sans fenêtre de course que le repli conditionnel du chunk 5). Null tant que
        // rien n'a résolu.
        public string CitywideHeatBucket { get; private set; }
        // Précédent maison DOUBLEMENT attesté (DashboardController.cs:54-55, "Any district id 1..18
        // returns the same citywide_bucket" ; OrgVitalsPanelController.cs:21) — jamais un nombre neuf.
        private const int HeatProbeDistrictId = 16;

        private readonly List<GameObject> tabButtons = new List<GameObject>();
        // Item 0.5 §C3 (Tools/charpente-item05-C3-implementation-notes.md) — la bande (yMin/yMax)
        // de CHAQUE panneau posé par `NouveauPanneauAccueil`, mémorisée pour que
        // `RebatirPanneauxAccueilPourResolutionCourante()` puisse la RECUIRE depuis
        // `ContentSlot.rect.height` COURANT plutôt que de rester figée sur celui du montage — voir
        // le docstring de cette méthode pour ce que « figée » a coûté, mesuré par la photo (C2).
        private readonly List<(RectTransform rt, float yMin, float yMax)> panneauxAccueilBandes =
            new List<(RectTransform rt, float yMin, float yMax)>();
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
        /// (ex. `NavigationPlayModeTests.cs`, identité citymap_demo). AMENDÉ (revue ⊥ B2) : marque
        /// aussi `identityExplicitlySet`, pour que le résolveur ignore une variable d'environnement
        /// concurrente — un appel explicite exprime une intention, il doit battre une configuration
        /// de poste (voir la précédence documentée dans `DemoIdentityResolver.cs`).</summary>
        public void SetIdentity(string identifier, string password)
        {
            demoIdentifier = identifier;
            demoPassword = password;
            identityExplicitlySet = true;
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
            ongletSignale = tab;
            // ⚠️ PLUS AUCUNE destination vide : `Tab.More` monte ㊲ (La réputation) depuis ce
            // commit. Le drapeau est CONSERVÉ plutôt que supprimé — il est la façon dont l'écran
            // vide s'affirme PAR VALEUR et non par l'absence d'un composant monté, et un futur
            // onglet sans destination en aura besoin. Le mettre à `false` ici dit « aucune
            // destination n'est vide aujourd'hui », ce qui est vrai et vérifiable ; le supprimer
            // dirait « la question ne se pose plus », ce qui est faux.
            OnEmptyMoreDestination = false;

            // §3.3 — "re-tap Empire from a district brings back the map, by the ORDINARY remount
            // path — no special-cased no-op" (Empire IS the old City branch, items 0.2/0.3).
            // CityTabDistrictId resets to -1 for EVERY tab activation (not just Empire): the
            // leading action is meaningless outside a district view, so any tab switch clears it
            // defensively — EnterDistrict is the ONLY path that sets it back (§3.3 only names the
            // City case explicitly, before the fusion; this chunk extends the SAME reset to the
            // other 3 tabs so the back-to-map leading action can never survive a jump straight to
            // e.g. Org (round 11, revue ⊥ MINEUR m1 — PARAPHRASÉ, jamais cité : `LabelFor` ne rend
            // qu'une flèche nue depuis round 8, aucun libellé à deux mots) — an obvious-defect
            // guard, not a design reinterpretation, consigned as a Deviation).
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
                    // ⇒ 2026-09-02 : `Tab.More` devient un MENU, et c'est une contrainte
                    // d'arithmétique, pas de goût — le dock n'a que QUATRE bulles, et il reste des
                    // écrans à atteindre (㊱ Horizon et la suite) qui n'ont aucune entrée. Un
                    // cinquième onglet n'existe pas ; une liste sous le quatrième, si.
                    // Historique : cet onglet était la destination VIDE assumée, puis ㊲ y a été
                    // monté en direct (premier écran atteignable du programme) — il est désormais
                    // la PREMIÈRE ENTRÉE du menu, joignable en un geste de plus, pas perdue.
                    MonterMenuPlus();
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

            // ⛔ LE DOCK DOIT DIRE OÙ L'ON EST, et un district s'atteint depuis l'Empire. Sans cette
            // ligne, entrer dans un district par ce chemin laisse le dock MUET : `CurrentTab` garde
            // sa sentinelle, aucun des quatre indicateurs ne s'allume, et le joueur perd le seul
            // repère qui lui dit dans quelle branche il se trouve. Mesuré : 0 indicateur allumé sur
            // 4 ici contre 1 sur 4 partout ailleurs — et un juge ⊥ l'avait vu par les pixels,
            // « 0 px doré dans toute la bande du dock ».
            // ⚠️ On ne touche PAS `CurrentTab` : sa sentinelle est lue par la garde d'acquisition de
            //   session à trois endroits. C'est `ongletSignale` qui bouge — voir sa déclaration
            //   pour pourquoi ce sont deux questions et non une.
            ongletSignale = Tab.Empire;
            RefreshTabButtonVisuals();

            // FUSIONNÉ (item 0.4, charpente-item0-4-design.md §1.6/§2.2) — n'est plus une copie
            // verbatim du corps de `MountTenant<T>` : les DEUX appellent désormais
            // `ConstruireLocataire<T>`, qui porte les 4 gestes une seule fois. Cette copie était
            // d'ailleurs restée EN RETARD sur son original — ni `PublierInsetsDuChrome()` ni
            // `SetToken` n'y avaient jamais été portés (mesuré : la version précédente de ce
            // fichier ne les appelait pas ici) — la fusion les apporte, sans effet observable :
            // `DistrictInteriorScreenController.SetToken` est un no-op (`IShellTenant.cs:24-28` —
            // ce contrôleur reçoit sa donnée par `SetSession`, via la variable locale `token`
            // ci-dessus, pas par ce canal).
            // ⛔⛔ CE CHEMIN DOIT SE DÉCLARER AU SENTINELLE D'ACQUISITION, EXACTEMENT COMME
            //    `MonterLocataireEnSurimpression` — mesuré le 2026-09-02 (chantier C), capture à
            //    l'appui. Le correctif du même jour a appris au sentinelle à voir les
            //    SURIMPRESSIONS, parce que ce chemin-là ne touche pas `CurrentTab`. Or
            //    `EnterDistrict` ne le touche pas non plus : il pose `CityTabDistrictId`. La garde
            //    `CurrentTab == (Tab)(-1) && !UneSurimpressionAEteMontee` (`:418`, `:523`) le lit
            //    donc encore comme « personne n'a navigué », force le montage d'`Empire` quelques
            //    frames plus tard, et `ActivateTab` remet `CityTabDistrictId` à -1 en détruisant
            //    l'écran. ⇒ Un joueur qui touche un district pendant les 2 à 4 allers-retours de
            //    l'acquisition est ramené sur la carte. Ce n'est pas un artefact de test : c'est le
            //    chemin joueur.
            //    ★ *Le correctif précédent a fermé l'INSTANCE (la surimpression) et pas la CLASSE
            //      (« quelque chose a-t-il été monté ? »).* Le sentinelle observe la bonne grandeur
            //      depuis ce matin ; il ne la recevait simplement pas de tous ceux qui montent.
            //    Mesuré ici : `Capture_VuePrincipale_DistrictAvecBatiments_SousChromeV31` échouait
            //    sur `Expected: 16 · But was: -1`.
            UneSurimpressionAEteMontee = true;
            SurimpressionsMontees++;
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
        /// jeton signe lui-même, comme avant ce chunk). AMENDÉ (revue ⊥ B2) : `allowEnvironmentOverride:
        /// !identityExplicitlySet` — quand `SetIdentity` a été appelé, la variable d'environnement de
        /// l'identité "operational" est IGNORÉE, l'appel explicite gagne toujours (rang 1 > rang 2 de
        /// la précédence documentée dans `DemoIdentityResolver.cs`).</summary>
        private IEnumerator AcquireSessionThenActivateHome()
        {
            var auth = new AuthClient { BaseUrl = baseUrl };
            string t = null, authErr = null;
            yield return DemoIdentityResolver.ResolveAndSignIn(auth,
                DemoIdentityResolver.OperationalIdentifierEnvVar, DemoIdentityResolver.OperationalPasswordEnvVar,
                demoIdentifier, demoPassword, x => t = x, e => authErr = e,
                allowEnvironmentOverride: !identityExplicitlySet);
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
                //
                // ROUND 3 (revue ⊥, BLOQUANT 2, Tools/charpente-item0-2-3-implementation-notes.md
                // § BLOQUANT 2) — décision B ratifiée (« l'Accueil devient l'ouverture de session,
                // posée en surimpression au-dessus de l'Empire », front.md §4) branchée MINIMALEMENT :
                // `DashboardController` était débranché de TOUT onglet par ce lot (§3.2 du design),
                // ce qui a rendu injoignables ses 4 seuls appelants de production
                // (`BuildingCardController`/`ExceptionQueueController`/`AutonomyInboxController` via
                // `OpenNav`, et `ExceptionDetailController` via `ExceptionQueueController.OpenDetail`)
                // — forme C du socle (les écrivains existent, l'APPELANT manque). Le mécanisme est
                // celui DÉJÀ livré par l'item 0.4 (`MonterLocataireEnSurimpression<T>`, ci-dessous) —
                // rien de plus. Gardé par LE MÊME sentinel que `ActivateTab(Tab.Empire)` (capturé
                // AVANT l'activation, puisqu'après ActivateTab CurrentTab n'est plus le sentinel) :
                // un joueur qui a DÉJÀ navigué pendant l'acquisition ne doit pas se voir recouvrir
                // d'un écran d'accueil qu'il n'a pas demandé — même raison motif 6/6 qu'au-dessus.
                // CORRIGÉ (item 0.5 §2, C2) — l'énoncé précédent ici disait que les 4 panneaux
                // orphelins de l'écran ④ restaient ENTIÈREMENT hors périmètre : FAUX depuis ce
                // chunk. `MonterPanneauxAccueil` (plus bas) les instancie désormais SANS donnée de
                // session (le sign-in lui-même a échoué ⇒ aucun `SessionOpenDto` n'a jamais été
                // obtenu) : chacun rend son état vide NOMMÉ (§2, point (c)) — jamais "atteint et
                // blanc". BuildingCard/ExceptionQueue(plein écran)/Autonomy/ExceptionDetail restent
                // hors périmètre (ce ne sont pas des panneaux de l'Accueil).
                bool pasEncoreActiveEchec = CurrentTab == (Tab)(-1) && MontagesEffectues == 0;
                if (pasEncoreActiveEchec)
                {
                    ActivateTab(Tab.Empire); // repli : le locataire signera lui-même
                    MonterLocataireEnSurimpression<DashboardController>();
                    int generationEchec = MontagesEffectues; // capturée APRÈS la nôtre — garde plus bas
                    // ROUND 7 (revue ⊥, BLOQUANT 2 — je change de décision, la mesure me le fait
                    // faire) — la seconde moitié du ruling (« puis on tombe sur la ville ») livrée
                    // avec le mécanisme DÉJÀ câblé pour le district (`EnterDistrict`, plus haut) :
                    // AUCUN mécanisme neuf. `ActivateTab` (ci-dessus) a DÉJÀ remis l'action de tête à
                    // `None` (son propre corps, § reset défensif) — cette ligne DOIT donc venir
                    // APRÈS `ActivateTab`, jamais avant, sur les DEUX branches (même ordre ici et
                    // ci-dessous). `ExitToCityMap` désigne EXACTEMENT la destination de cette action
                    // de tête — round 9 (revue ⊥, MAJEUR 2) : ce commentaire attribuait ici un
                    // libellé à deux mots au bandeau ; PARAPHRASÉ, jamais cité. Voir
                    // `TopBarController.LabelFor` (round 8) : la flèche rendue N'A PAS de texte de
                    // destination — la découvrabilité tient au fait que c'est le seul contrôle du
                    // coin gauche, pas à un mot affiché.
                    TopBar.SetLeadingAction(TopBarController.LeadingAction.BackToMap, ExitToCityMap);
                    // ITEM 0.5 §2 (C2) — CORRIGÉ (mesuré, pas supposé — garde de RAYCAST du
                    // C2_AccueilMonteLes4Panneaux..., rouge à sa première version) : `DashboardController.
                    // BuildLayout()` est différé d'une frame (`Start()`, IShellTenant) et parente SON
                    // PROPRE fond plein écran opaque (`DashboardBackdrop`) DIRECTEMENT sous `ContentSlot`
                    // (comme tout tenant hors confinement de son propre host). Monter les 4 panneaux
                    // AVANT cette frame les rend PLUS TÔT dans l'ordre de fratrie de `ContentSlot` —
                    // `DashboardBackdrop`, créé APRÈS eux, les recouvre TOUS au raycast ET au rendu, un
                    // défaut invisible à toute assertion qui ne lit que l'état C# (RenderedTexts, etc.),
                    // exactement le trou que §5 (la note Raycast) nomme. ⇒ Un seul frame de marge (même
                    // patron que `CharpenteOuvertureSessionOverlayPlayModeTests.cs` : "le montage EN
                    // SURIMPRESSION du Dashboard est SYNCHRONE ... un seul frame de marge suffit") suffit
                    // pour que `DashboardBackdrop`/`DashboardSheet` existent déjà quand les panneaux sont
                    // montés À LEUR TOUR — ils deviennent alors les frères CADETS, rendus PAR-DESSUS.
                    yield return null;
                    // I1 (revue ⊥ item05-C2, IMPORTANT-PRODUCTION) — des 5 reprises intérieures de
                    // cette coroutine, les 2 `yield return null;` neufs de ce chunk étaient les
                    // SEULES à n'avoir ni la garde de destruction ni une re-vérification de sentinel.
                    // (a) shell détruit pendant l'attente ⇒ `MonterPanneauxAccueil` parenterait sur un
                    // `ContentSlot` détruit — même invariant que `:330`/`:409`/`:415` ("shell torn
                    // down mid-fetch"). (b) joueur qui touche un AUTRE onglet PENDANT cette frame ⇒
                    // `ActivateTab` (ci-dessus) a déjà vidé `ContentSlot` et monté l'écran demandé ;
                    // sans re-vérification, les 4 panneaux de l'Accueil se poseraient PAR-DESSUS lui —
                    // nommément la classe "IMPORTANT-1 (verdict ⊥ HUD v3.1)" citée 24 lignes plus haut
                    // ("payée deux fois"), ici une TROISIÈME. La sentinelle `(Tab)(-1)` ne peut plus
                    // être relue telle quelle : `ActivateTab` vient de la remplacer par `Tab.Empire`.
                    // ⛔⛔ LA GÉNÉRATION, PAS SEULEMENT L'ONGLET — défaut de PRODUCTION mesuré le
                    //    2026-09-02 (vu sur une capture par la session f1, caractérisé ici sur le
                    //    code). `CurrentTab` ne change QUE dans `ActivateTab` : une SURIMPRESSION ne
                    //    le touche jamais. Or NEUF sites de production en montent une
                    //    (`DashboardController` ×5, `ExceptionQueueController`, `LaunderingController`,
                    //    `ExceptionQueuePanelController`, `HomeChromeController`). Un joueur qui en
                    //    ouvre une PENDANT la frame de marge ci-dessus laisse donc `CurrentTab ==
                    //    Empire` : la garde d'onglet PASSE, et les quatre panneaux de l'Accueil se
                    //    posent en DERNIERS FRÈRES — par-dessus l'écran qu'il vient d'ouvrir. Il
                    //    reste actif, à la bonne taille, sous le bon canvas, et INVISIBLE.
                    //    ⇒ La garde d'onglet demandait « le joueur a-t-il changé d'ONGLET ? ». La
                    //      question utile est « le monde a-t-il bougé sous moi ? ». Ce ne sont pas
                    //      les mêmes, et la première est VRAIE dans le cas exact qu'on veut exclure.
                    //    ⚠️ `UneSurimpressionAEteMontee` ne pouvait pas servir : le shell vient de le
                    //      mettre à vrai en montant l'Accueil. D'où la génération.
                    if (this == null) yield break; // shell torn down mid-fetch
                    if (CurrentTab != Tab.Empire) yield break; // parti vers un autre onglet pendant ce frame
                    if (MontagesEffectues != generationEchec) yield break; // a ouvert un écran : ne pas l'enterrer
                    MonterPanneauxAccueil(null); // aucune session obtenue — les 4 rendent leur état vide NOMMÉ
                }
                yield break;
            }

            Token = t;
            var sessionClient = new SessionClient { BaseUrl = baseUrl };
            SessionOpenDto dto = null;
            string sessionErr = null;
            yield return sessionClient.OpenSession(t, Application.version, d => dto = d, (c, m) => sessionErr = $"{c}: {m}");
            if (this == null) yield break;

            // ⛔⛔ LE DICTIONNAIRE S'AMORCE ICI, UNE FOIS, AVANT TOUT RENDU — et c'est une mesure du
            // chantier B, pas une préférence : sur SEPT écrans convertis à `Libelle`, **ZÉRO**
            // n'amorçait `I18nCatalog`. La conversion était donc INERTE, et invisible : le repli
            // rendu est le littéral, byte-identique à l'avant — la garantie qui rendait la
            // conversion sûre est exactement ce qui a caché qu'elle ne servait à rien.
            // ⇒ Le catalogue est un global de SESSION. L'amorcer par écran, c'est onze appels qui
            //   peuvent tous manquer ; l'amorcer ici, c'est un endroit qu'aucun écran ne contourne
            //   — les appels par écran deviennent des no-op (`Amorcer` sort si `Charge`).
            // ⚠️ AVANT `TopBar.Load` et avant le premier `MountTenant` : la barre haute rend du
            // texte elle aussi, et un écran monté avant l'amorçage afficherait ses replis pour
            // toute la session (le cache est par session, il ne se recharge pas).
            // ⚠️ Sur les DEUX branches, y compris quand `session/open` échoue : le jeton existe
            // dans les deux cas, et un écran d'erreur mérite d'être lisible.
            if (!string.IsNullOrEmpty(t))
            {
                yield return MafiaCleanCity.I18n.I18nCatalog.Amorcer(
                    new MafiaCleanCity.I18n.I18nClient { BaseUrl = baseUrl }, t);
                if (this == null) yield break;
                // La GÉNÉRATION au moment de l'amorçage — la grandeur qu'une garde peut lire pour
                // savoir si un écran a été monté AVANT. Un booléen « chargé » ne le dirait pas :
                // il est vrai aussi quand on l'amorce trop tard. Même patron que
                // `SurimpressionsMontees`, pour la même raison.
                MontagesAuChargementDuCatalogue = MontagesEffectues;
            }

            if (dto != null)
            {
                LastSessionOpen = dto;
                // ⛔ LE JETON DE STRUCTURE SE PUBLIE ICI, ET C'EST LE SEUL ENDROIT. Trois écrans du
                // canon (㉜ le tableau de service, ㉝ raser un site, et toute graduation) partagent
                // le plafond « une décision de structure par journée » : ils doivent en donner la
                // MÊME lecture, sinon le joueur croit avoir trois budgets et découvre la contrainte
                // par un 409. Ils ne peuvent pas lire `LastSessionOpen` — `StructuralBudgetDto` vit
                // dans CETTE assembly, et `Shell` référence déjà `Operational` : la lecture inverse
                // serait un cycle qu'asmdef refuse (mesuré, CS0246). `JetonDeStructure` vit donc
                // dans `ShellContracts`, la seule assembly que le shell et ses locataires voient
                // tous les deux — même patron et même raison que `ShellChrome.PublierInsets`.
                // ⚠️ Publié seulement quand le corps le porte : sans lui, `Connu` reste faux et les
                // écrans se rendent comme avant que ce champ existe, plutôt que de supposer un zéro.
                if (dto.structural_budget != null)
                    JetonDeStructure.Publier(dto.structural_budget.used, dto.structural_budget.cap_reached);
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
            //
            // ROUND 3 (BLOQUANT 2) — MÊME branchement que la branche d'échec ci-dessus, MÊME
            // garde : `DashboardController` monte EN SURIMPRESSION au-dessus d'Empire fraîchement
            // monté, uniquement si c'est CE montage-ci qui vient d'activer l'onglet par défaut
            // (jamais un joueur qui a déjà navigué ailleurs pendant l'acquisition). Capturé AVANT
            // `ActivateTab` : après lui, `CurrentTab` n'est plus le sentinel `(Tab)(-1)`.
            bool pasEncoreActive = CurrentTab == (Tab)(-1) && MontagesEffectues == 0;
            if (pasEncoreActive)
            {
                ActivateTab(Tab.Empire);
                MonterLocataireEnSurimpression<DashboardController>();
                int generation = MontagesEffectues; // capturée APRÈS la nôtre — garde plus bas
                // ROUND 7 (revue ⊥, BLOQUANT 2) — même geste, même ordre, même raison que la branche
                // d'échec ci-dessus : `ActivateTab` a déjà remis l'action de tête à `None`, cette
                // ligne vient donc APRÈS lui et après le montage de l'overlay.
                TopBar.SetLeadingAction(TopBarController.LeadingAction.BackToMap, ExitToCityMap);
                // ITEM 0.5 §2 (C2) — les 4 panneaux orphelins de l'Accueil, nourris de LA MÊME
                // réponse `session/open` que ce shell vient d'obtenir (`dto`, peut être null si
                // cette étape a échoué alors que le sign-in a réussi — `MonterPanneauxAccueil` gère
                // les deux : I5, revue ⊥ v4, "la source unique des quatre est CETTE réponse").
                // CORRIGÉ (mesuré, même défaut et même correctif que la branche d'échec ci-dessus,
                // voir son commentaire) : un frame de marge AVANT de monter les panneaux, pour qu'ils
                // deviennent les frères CADETS de `DashboardBackdrop`/`DashboardSheet` (différés d'une
                // frame par le cycle de vie `IShellTenant`), jamais recouverts par eux.
                yield return null;
                // I1 (revue ⊥ item05-C2, IMPORTANT-PRODUCTION) — mêmes DEUX modes d'échec que la
                // branche d'échec ci-dessus (shell détruit / joueur déjà parti vers un autre onglet
                // pendant cette frame), mais fermés ICI d'une forme légèrement différente et DÉLIBÉRÉE
                // (déviation consignée, implementation-notes) : la branche d'échec `yield break`
                // directement parce qu'un `yield break` inconditionnel la suit de toute façon (rien
                // à préserver après). ICI, la sonde heat citywide (juste en dessous, §6.2) est
                // délibérément INCONDITIONNELLE — elle ne doit PAS être sautée par un simple aléa de
                // navigation vers un autre onglet. `this == null` reste un `yield break` immédiat
                // (objet détruit ⇒ toucher `PublishCitywideHeat`/`t` plus bas serait unsafe) ; le
                // sentinel de navigation, lui, ne garde QUE le montage des panneaux.
                // ⛔⛔ LA GÉNÉRATION, PAS SEULEMENT L'ONGLET — défaut de PRODUCTION mesuré le
                //    2026-09-02 (vu sur une capture par la session f1, caractérisé ici sur le
                //    code). `CurrentTab` ne change QUE dans `ActivateTab` : une SURIMPRESSION ne
                //    le touche jamais. Or NEUF sites de production en montent une
                //    (`DashboardController` ×5, `ExceptionQueueController`, `LaunderingController`,
                //    `ExceptionQueuePanelController`, `HomeChromeController`). Un joueur qui en
                //    ouvre une PENDANT la frame de marge ci-dessus laisse donc `CurrentTab ==
                //    Empire` : la garde d'onglet PASSE, et les quatre panneaux de l'Accueil se
                //    posent en DERNIERS FRÈRES — par-dessus l'écran qu'il vient d'ouvrir. Il
                //    reste actif, à la bonne taille, sous le bon canvas, et INVISIBLE.
                //    ⇒ La garde d'onglet demandait « le joueur a-t-il changé d'ONGLET ? ». La
                //      question utile est « le monde a-t-il bougé sous moi ? ». Ce ne sont pas
                //      les mêmes, et la première est VRAIE dans le cas exact qu'on veut exclure.
                //    ⚠️ `UneSurimpressionAEteMontee` ne pouvait pas servir : le shell vient de le
                //      mettre à vrai en montant l'Accueil. D'où la génération.
                if (this == null) yield break; // shell torn down mid-fetch
                if (CurrentTab == Tab.Empire && MontagesEffectues == generation) MonterPanneauxAccueil(dto);
            }

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
            // ⛔⛔ LE COMPTEUR EST ICI, AU POINT DE PASSAGE OBLIGÉ — pas chez les appelants.
            //    Le 2026-09-02, trois chemins montent un locataire : `MountTenant`, `EnterDistrict`,
            //    `MonterLocataireEnSurimpression`. Mon correctif du matin a appris au sentinelle
            //    d'acquisition à voir les SURIMPRESSIONS ; la session C a mesuré ensuite qu'
            //    `EnterDistrict` ne se déclarait pas non plus, et un joueur qui touchait un district
            //    pendant l'acquisition était ramené sur la carte (`Expected: 16 · But was: -1`).
            //    ⇒ *J'avais fermé l'INSTANCE (la surimpression) et pas la CLASSE (« quelque chose
            //      a-t-il été monté ? »).* Le sentinelle observait déjà la bonne grandeur — il ne la
            //      RECEVAIT pas de tout le monde.
            //    ⇒ Corriger le troisième appelant aurait rouvert le trou au quatrième. Compter ici
            //      rend l'oubli IMPOSSIBLE : aucun locataire ne se construit sans passer par cette
            //      ligne. C'est la garde structurelle qui remplace trois gardes de discipline.
            MontagesEffectues++;
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

        /// <summary>Les destinations du menu « Plus » — libellé + le geste qui monte l'écran.
        ///
        /// ⚠️ UNE TABLE D'ACTIONS, PAS DE `Type` : `MountTenant&lt;T&gt;` est générique, donc une
        /// table de `System.Type` obligerait à passer par la réflexion et ferait perdre la
        /// vérification à la COMPILATION. Une entrée dont l'écran est renommé ou retiré doit être
        /// une erreur de build, pas un menu qui s'ouvre sur un bouton mort. *Un dispositif qui
        /// échoue au build vaut mieux qu'un dispositif qui échoue devant le joueur.*
        ///
        /// ⚠️ LIBELLÉS LITTÉRAUX, ET C'EST LA CONVENTION MESURÉE : ce dépôt n'a AUCUN helper i18n
        /// (balayage de `Assets/Scripts` : zéro `I18n.`/`Traduire`/`Localise`), tous les libellés
        /// d'interface sont des littéraux. Introduire ici un mécanisme de traduction serait une
        /// décision d'architecture, pas l'ajout d'un menu — consigné plutôt que pris.
        ///
        /// ⛔ N'Y ENTRE QU'UN ÉCRAN QUI EXISTE. ㊱ Horizon n'a pas encore de contrôleur : une entrée
        /// pour lui serait une destination morte, exactement ce que le dock a mis des semaines à
        /// cesser d'avoir. Il s'ajoute ici LE JOUR où son contrôleur existe, en une ligne.</summary>
        // ⛔⛔ CETTE TABLE SE FUSIONNE EN UNION — ET L'UNION A SON PROPRE MODE D'ÉCHEC, payé le
        // 2026-09-03 : deux branches ont ajouté la MÊME entrée (㉞ « LES ORDRES DU SOIR », que
        // j'avais posée après un rouge de la garde, et que `pilote-F` a posée de son côté). Une
        // union littérale des deux côtés d'un conflit produit alors DEUX lignes pour un écran, et
        // le joueur voit la destination en double. ㊳ l'était déjà, sans que personne le voie.
        // ⇒ La règle complète tient en deux temps : UNION des lignes, puis DÉDUPLICATION PAR
        //   CONTRÔLEUR (le libellé peut différer, l'écran non). *Une règle de fusion qui ne dit
        //   rien des doublons n'est pas une règle de fusion.*
        // ⚠️ La garde de joignabilité ne peut PAS le voir : elle demande « chaque locataire a-t-il
        //   un chemin ? », et deux chemins valent un. Le doublon est une propriété du MENU, et le
        //   contrôle qui mord est un compte de contrôleurs DISTINCTS.
        private (string libelle, System.Action monter)[] DestinationsPlus() => new (string, System.Action)[]
        {
            ("LA RÉPUTATION", () => MountTenant<ReputationScreenController>()),
            // ⑯ arrivée par `pilote-F`, qui la montait comme HANDLER de `Tab.More`. Ce contrat a
            // changé le 2026-09-02 (l'onglet est devenu un MENU) : elle descend donc d'un cran, en
            // ENTRÉE. Résoudre le conflit en gardant simplement le menu aurait supprimé en silence
            // le seul chemin joueur de cet écran — *un conflit se résout sur les deux INTENTIONS,
            // pas sur le côté le plus récent.*
            ("LA REVUE DU JOUR", () => MountTenant<DailyReviewScreenController>()),

            // ⛔⛔ LES NEUF SANS PORTE (chantier joignabilité, 2026-09-02). Mesuré sur la POPULATION
            // — les 22 `IShellTenant` du client, obtenus par réflexion, pas par une liste — puis
            // fermeture transitive du graphe de montage depuis ce fichier : NEUF locataires
            // n'étaient atteints par rien. Construits, testés, capturés, invisibles au joueur.
            // Le dock n'a que quatre bulles ; ce menu est le seul endroit qui ait de la place.
            //
            // ⚠️ Les libellés viennent des planches (`Assets/Screenshots/planche_*.png`), pas de mon
            // invention — sauf deux, signalés plus bas. Littéraux et non traduits : ce dépôt n'a
            // AUCUN helper i18n (balayage : zéro `I18n.`/`Traduire`/`Localise` dans les écrans), et
            // en introduire un ici serait une décision d'architecture déguisée en ajout de menu.
            ("LA VENTE",             () => MountTenant<SellingScreenController>()),      // ㉟
            ("LA VITRINE",           () => MountTenant<ShopScreenController>()),         // ㉓
            ("LES INSPECTIONS",      () => MountTenant<InspectionScreenController>()),   // ⑮
            ("LE COMMISSARIAT",      () => MountTenant<PrecinctScreenController>()),     // ⑰
            ("LA SEMAINE",           () => MountTenant<CompressionScreenController>()),  // ⑭
            ("LE DOSSIER",           () => MountTenant<ForensicScreenController>()),     // ㊴
            // ⚠️ Libellé pris de la maquette ratifiée (cadres 125-130, « Le journal — ce qui se
            // dit ce matin ») et non inventé. « & LA RUE » parce que l'écran porte DEUX flux que
            // le joueur ne distingue pas par leur route : la une (`news/feed`) et les brèves de
            // la rue (`ambient/feed`). Un libellé « LE JOURNAL » seul cacherait la moitié.
            ("LE JOURNAL & LA RUE",  () => MountTenant<JournalScreenController>()),      // ㊳
            // ⚠️ ADDITIF, pas un remplacement. L'onglet « FILIÈRE » du dock monte toujours ⑪
            // (`LaunderingController`, mono-nœud). ㊵ montre la filière ENTIÈRE et son état de
            // cassure ; savoir lequel des deux mérite la bulle du dock est une décision de DOCK,
            // pas un effet de bord d'un ajout de menu. Elle est CONSIGNÉE ici, pas prise.
            ("LA FILIÈRE",           () => MountTenant<FiliereScreenController>()),      // ㊵
            ("LA PREMIÈRE FOIS",     () => MountTenant<TutorialScreenController>()),     // ㉕

            // ⚠️ ㉒ — sa planche s'appelle `planche_le_coffre` et l'écran écrit « LE COFFRE » dans
            // son propre corps, MAIS `front.md` donne déjà ce nom à ⑪ Pipeline. Deux écrans pour un
            // nom : c'est une collision du CANON, pas un choix de menu, et je ne la tranche pas en
            // douce. Le menu dit donc « VOTRE PROFIL », sans ambiguïté ; l'arbitrage remonte.
            ("VOTRE PROFIL",         () => MountTenant<ProfileScreenController>()),      // ㉒

            // ⑲ — ARRIVÉ SANS PORTE PAR `pilote-F`, ET C'EST LA GARDE QUI L'A DIT. Le matin même,
            // `SettingsScreenController` n'existait pas : je l'avais compté parmi les trois écrans
            // du canon sans aucun contrôleur. Il est né dans la journée, mergé le soir, et
            // `LocataireJoignabilitePlayModeTests` l'a immédiatement classé orphelin — le DIXIÈME,
            // exactement le cas pour lequel elle a été écrite. *Une garde de classe ne prouve sa
            // valeur qu'en attrapant le membre qu'on n'a pas vu arriver.*
            ("LES RÉGLAGES",         () => MountTenant<SettingsScreenController>()),     // ⑲

            // ⚠️ ㊱ — sa liste est VIDE PAR CONSTRUCTION sur le compte de démo : TD-408 mesure
            // qu'au plus UNE carte peut être surfacée pour un joueur. Un écran vide ici n'est donc
            // pas un défaut de montage, et il ne faut pas partir le chercher comme tel.
            ("L'HORIZON DES POSSIBLES", () => MountTenant<HorizonScreenController>()),   // ㊱

            // ㉜ — le tableau de service. Le libellé est le TITRE DE LA PLANCHE (m-75), pas le
            // nom de la classe : c'est l'état que le joueur vient consulter (« ce que vous avez
            // confié »), et c'est aussi celui que l'écran affiche quand quelque chose est confié.
            // ⚠️ Cet écran partage son jeton — une décision de structure par journée — avec ㉝ et
            // ㉞ : les trois doivent en donner la MÊME lecture, sinon le joueur croit avoir trois
            // budgets. La source unique est `structural_budget` de `session/open`, que le shell
            // tient déjà (`LastSessionOpen`) ; aucun des trois ne rouvre de session pour le lire.
            ("CE QUE VOUS AVEZ CONFIÉ", () => MountTenant<DelegationScreenController>()), // ㉜

            ("LA CHAÎNE D'APPRO", () => MountTenant<ChaineDApproScreenController>()), // ㉚

            // ㊳ — AJOUTÉE AU MERGE DU 2026-09-03 PAR LA GARDE, PAS PAR LECTURE. `pilote-B` a livré
            // `JournalScreenController` sans sa ligne ici : `LocataireJoignabilitePlayModeTests` l'a
            // classé orphelin au premier run post-merge (« 1 locataire(s) sans AUCUN chemin :
            // [JournalScreenController] »). Vérifié avant d'accuser mon propre merge — la branche
            // `pilote-B` ne mentionne le type nulle part dans ce fichier (0 occurrence) : l'entrée
            // n'a jamais existé, elle n'a pas été perdue par une résolution de conflit.
            // ★ C'est le TROISIÈME écran que cette garde rattrape à l'arrivée (⑲, puis ㊳ ici) —
            //   *une garde de classe ne prouve sa valeur qu'en attrapant le membre qu'on n'a pas vu
            //   arriver*, et elle l'a fait sur un écran qui n'est pas de mon chantier.
            // ⚠️ Le libellé n'est pas de mon invention : c'est le titre que le chantier donne à cet
            // écran (« Le journal & la rue »), et le dossier de juge livré avec lui déclare déjà
            // « chemin joueur : onglet More » — l'intention était là, la ligne manquait.

            // ㉘ — « la ficelle sur le liège ». Aucune planche de menu ne nomme cet écran (il
            // n'existe pas encore au moment où les planches `Assets/Screenshots/planche_*.png`
            // ont été prises) : le libellé est le TITRE DU BANDEAU de la maquette de repos
            // (m-54, « L'envoi de ce soir » aurait été trop long pour une entrée de menu — REUSE
            // du nom court déjà porté par le brief et par `Tools/juge-visuel/ecran_distribution/`).
            ("LA DISTRIBUTION", () => MountTenant<DistributionScreenController>()), // ㉘

            // ㉛ — « le parloir ». Libellé en CAPITALES, patron des entrées voisines (aucune
            // planche de menu ne nomme cet écran — même situation que ㉘, ajoutée le même jour).
            ("LA LOI", () => MountTenant<LoiScreenController>()), // ㉛

            // ㉝ — raser un site. Deuxième des trois écrans qui partagent le jeton de structure,
            // et le seul qui le DÉPENSE de façon irréversible : une démolition ne se rejoue pas.
            // Mesuré le 2026-09-03 : après un `decommission` réussi, `structural_budget` passe à
            // `{used:1, cap_reached:true}` — donc ㉜ doit éteindre son geste dans la même session,
            // et il le fait, en lisant la même source (`JetonDeStructure`).
            ("RASER UN SITE", () => MountTenant<DemolitionScreenController>()),           // ㉝

            // ㉞ — « les ordres du soir ». AJOUTÉE PAR LA GARDE, deuxième fois de la journée après
            // ㊳ : `pilote-B` a livré `CarnetScreenController` sans sa ligne ici, et
            // `LocataireJoignabilitePlayModeTests` l'a classé orphelin au premier run post-merge
            // (« 1 locataire sans AUCUN chemin : [CarnetScreenController] », population 31).
            // ⚠️ L'écran est un SQUELETTE, et je ne l'inscris pas pour autant dans
            // `ExceptionsDeclarees` : cette allowlist dit d'elle-même qu'elle n'est PAS pour « un
            // écran qu'on n'a pas eu le temps de brancher », mais pour un locataire dont on AFFIRME
            // qu'il ne doit pas avoir de porte. Ce n'est pas le cas ici — il en aura une, autant
            // que ce soit maintenant. Un écran titré et vide est ce que ce régime livre déjà
            // (⑪ et ⑫ sont capturés sans données et consignés) ; un écran sans porte, non.
            ("LES ORDRES DU SOIR", () => MountTenant<CarnetScreenController>()),         // ㉞

            // ㉞ — les ordres du soir. ⚠️ CET ÉCRAN N'EST PAS DE MOI : il est arrivé par `main`
            // (session B, à qui ㉞ a été réattribué) SANS entrée, et la garde de joignabilité l'a
            // immédiatement classé orphelin — le seul des 31 locataires dans ce cas.
            // ⇒ Je pose la porte plutôt que de contourner la garde : un écran construit, testé et
            //   invisible au joueur est exactement ce que ce chantier a trouvé neuf fois, et
            //   l'inscrire en exception aurait demandé une raison que je n'ai pas. Le libellé vient
            //   de la planche (`front.md` ㉞) ; si B en veut un autre, c'est UNE chaîne à changer.

            // ㉙ — « la table du fond », version 2 dite lisible. Même situation que ㉘/㉛ : aucune
            // planche de menu ne nomme cet écran, le libellé vient du chantier lui-même.
            ("LE CONFLIT", () => MountTenant<ConflitScreenController>()), // ㉙
        };

        /// <summary>Monte le menu « Plus » : une entrée par destination, chacune montant son écran.
        /// Le retour au menu passe par le geste standard (`ActivateTab(Tab.More)`), donc aucun
        /// mécanisme de navigation neuf — le menu se reconstruit comme n'importe quel onglet.</summary>
        /// <summary>⛔⛔ DEUX DÉFAUTS ONT VÉCU ICI, ET ILS PRODUISAIENT LA MÊME IMAGE — un juge ⊥ à
        /// contexte vierge les a rapportés comme deux BLOQUANT distincts (2026-09-06), et aucun des
        /// deux ne se soignait en corrigeant l'autre.
        ///
        /// (1) L'INSET ÉTAIT LU, ET SA VALEUR ÉTAIT PÉRIMÉE. La ligne `offsetMax = -TopInsetPx`
        ///     existait déjà, et c'est exactement ce qui a fait passer le défaut : un relecteur qui
        ///     l'ouvre la trouve juste et va chercher ailleurs. *La ligne existe ; personne n'a
        ///     demandé si elle pouvait être VRAIE.* `Tab.More` est la SEULE branche d'`ActivateTab`
        ///     qui ne construit pas un locataire — donc la seule qui ne passe jamais par
        ///     `ConstruireLocataire`, donc jamais par `PublierInsetsDuChrome()` ni par le
        ///     `Canvas.ForceUpdateCanvases()` qui rend les hauteurs valides avant la mesure. Le menu
        ///     lisait donc l'inset publié par un montage PRÉCÉDENT — ou **0** si « Plus » est la
        ///     première destination, ce que `ShellChrome` documente comme le repli légitime du
        ///     hors-shell. *Un repli correct dans son contexte, appliqué dans un contexte où il ne
        ///     l'est pas : la valeur est plausible, et c'est pour ça qu'elle passe.*
        ///     ⇒ On publie AVANT de poser les offsets. Une ligne, et le menu revient sur le même
        ///       contrat que les quatre autres branches.
        ///
        /// (2) LA LISTE N'AVAIT AUCUNE FENÊTRE, et elle sortait par le bas SOUS le dock opaque.
        ///     Mesuré par le juge : rect libre 2 039 px pour un pas de 122,6 ⇒ 16,6 rangées, et le
        ///     menu en pose DIX-NEUF — la 19ᵉ à 45 % de sa hauteur, invisible et injoignable. Ce
        ///     défaut-ci **survit au correctif (1)** : dix-neuf bandes ne rentrent pas, quel que
        ///     soit l'inset. ⇒ REUSE du patron de ㉝ (`DemolitionScreenController.
        ///     ConstruireZoneCentrale`), qui a payé exactement cette classe : `RectMask2D` coupe ce
        ///     qui dépasse, `ScrollRect` rend joignable ce qui est coupé (sans lui, couper rend des
        ///     destinations INATTEIGNABLES — le contraire du but de ce menu), `ContentSizeFitter`
        ///     donne au défilement une course à parcourir.
        ///     ★ Et la docstring de ㉝ porte la leçon qui vaut ici mot pour mot : *« la maquette ne
        ///       le montre pas parce qu'elle n'a jamais eu que quatre rangées ; le monde réel en a
        ///       dix-sept. Une maquette dessine un CAS, pas une BORNE. »* Ce menu en a dix-neuf.
        ///
        /// ⚠️ LES DEUX SE VÉRIFIENT SÉPARÉMENT, et c'est délibéré : corriger (1) « remonte » la
        /// liste et donne l'illusion que le débordement est réglé. Le haut de la première bande se
        /// mesure contre le bandeau ; le nombre de rangées entièrement visibles se compte.</summary>
        private void MonterMenuPlus()
        {
            UnmountCurrentTenant();
            MenuPlusEntrees = 0;

            // (1) — AVANT tout calcul de géométrie. Voir la docstring : sans cet appel, la ligne
            // `-TopInsetPx` ci-dessous lit ce qu'un autre montage a laissé, ou zéro.
            PublierInsetsDuChrome();

            GameObject menu = new GameObject("MenuPlus", typeof(RectTransform));
            menu.transform.SetParent(ContentSlot, false);
            RectTransform rt = (RectTransform)menu.transform;
            // Le menu respecte ce que le chrome MANGE — même contrat que tout locataire, sinon la
            // première entrée passe sous le bandeau (défaut déjà payé sur « LA FAMILLE »).
            rt.anchorMin = new Vector2(0f, 0f); rt.anchorMax = new Vector2(1f, 1f);
            rt.offsetMin = new Vector2(0f, ShellChrome.BottomInsetPx);
            rt.offsetMax = new Vector2(0f, -ShellChrome.TopInsetPx);

            // (2) — `menu` devient la FENÊTRE (elle coupe et fait défiler) ; la pile d'entrées
            // descend d'un cran dans `MenuPlus_Contenu`, qui se dimensionne sur ses enfants.
            menu.AddComponent<RectMask2D>();
            ScrollRect defilement = menu.AddComponent<ScrollRect>();
            defilement.horizontal = false;
            defilement.vertical = true;
            defilement.movementType = ScrollRect.MovementType.Clamped;
            defilement.scrollSensitivity = 40f;

            GameObject contenu = new GameObject("MenuPlus_Contenu", typeof(RectTransform));
            contenu.transform.SetParent(menu.transform, false);
            RectTransform rtc = (RectTransform)contenu.transform;
            // Ancré en HAUT sur toute la largeur : la course de défilement se déploie vers le bas,
            // et la première entrée reste collée sous le bandeau quelle que soit la hauteur totale.
            rtc.anchorMin = new Vector2(0f, 1f);
            rtc.anchorMax = new Vector2(1f, 1f);
            rtc.pivot = new Vector2(0.5f, 1f);
            rtc.offsetMin = Vector2.zero;
            rtc.offsetMax = Vector2.zero;
            defilement.viewport = rt;
            defilement.content = rtc;

            VerticalLayoutGroup pile = contenu.AddComponent<VerticalLayoutGroup>();
            pile.childAlignment = TextAnchor.UpperCenter;
            pile.spacing = Px(TabDockGapCss);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;
            // Sans lui, la fenêtre couperait et il n'y aurait rien à faire défiler.
            ContentSizeFitter ajuste = contenu.AddComponent<ContentSizeFitter>();
            ajuste.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            foreach ((string libelle, System.Action monter) in DestinationsPlus())
            {
                GameObject entree = new GameObject($"MenuPlus_{libelle}", typeof(RectTransform));
                entree.transform.SetParent(contenu.transform, false);
                Image fond = entree.AddComponent<Image>();
                fond.color = DesignTokens.Current.surfaceRow;
                AddLayoutElementLocal(entree, Px(TabDockLabelHeightCss) * 3f);
                Button b = entree.AddComponent<Button>();
                b.targetGraphic = fond;
                System.Action geste = monter;   // capture par valeur : sinon les N entrées montent la DERNIÈRE
                b.onClick.AddListener(() => geste());

                GameObject textGo = new GameObject("Libelle", typeof(RectTransform));
                textGo.transform.SetParent(entree.transform, false);
                TextMeshProUGUI txt = textGo.AddComponent<TextMeshProUGUI>();
                txt.font = DesignTokens.Current.primaryFont;
                txt.text = libelle;
                txt.fontSize = Px(TabDockLabelSizeCss);
                txt.alignment = TextAlignmentOptions.Center;
                txt.color = DesignTokens.Current.hudCremeSecondary;
                txt.raycastTarget = false;
                RectTransform trt = (RectTransform)textGo.transform;
                trt.anchorMin = Vector2.zero; trt.anchorMax = Vector2.one;
                trt.offsetMin = Vector2.zero; trt.offsetMax = Vector2.zero;
                MenuPlusEntrees++;
            }
        }

        /// <summary>Nombre d'entrées réellement construites au dernier montage du menu « Plus ».
        /// Crochet de test : une garde qui ne lit que « le menu existe » resterait verte sur un
        /// menu VIDE — le monde dégénéré exact d'une table de destinations mal remplie.</summary>
        public int MenuPlusEntrees { get; private set; }

        private void MountTenant<T>() where T : MonoBehaviour, IShellTenant
        {
            // ⛔⛔⛔ MESURÉ SUR CAPTURE LE 2026-09-06 — LES VINGT-ET-UNE DESTINATIONS DU MENU
            //    « PLUS » SE DESSINAIENT PAR-DESSUS LE MENU. La planche de ⑯ montre l'écran rendu
            //    et, DERRIÈRE lui, la liste entière : LA RÉPUTATION, LA REVUE DU JOUR, LA VENTE…
            //    Cause : `ActivateTab` démonte AVANT d'appeler cette méthode, mais une entrée du
            //    menu l'appelle DIRECTEMENT (`() => MountTenant<X>()`), et rien ne démontait alors.
            //    ⇒ Le démontage vivait chez UN appelant sur deux. Le remettre ici le rend vrai pour
            //      TOUS — y compris le vingt-deuxième écran que personne n'a encore écrit.
            //    ⚠️ Et aucune garde ne pouvait le voir : le parcours du menu rouvre `Tab.More` entre
            //      deux clics (donc il passe par `ActivateTab`, qui démonte), `MountedTenantType`
            //      était correctement renseigné, l'ordre de fratrie était bon — le locataire EST le
            //      dernier enfant, il se dessine simplement sur un fond qui n'aurait pas dû exister.
            //      *Toutes les grandeurs mesurées étaient justes ; celle qui manquait est le NOMBRE
            //      d'enfants de `ContentSlot`.* C'est une capture regardée qui l'a trouvée, pas un
            //      test — d'où la falsifiable structurelle posée avec ce correctif.
            //    Appelé deux fois sur le chemin des onglets (`ActivateTab` puis ici) : le second
            //    passage est un no-op — `ContentSlot` est déjà vide et la référence déjà nulle.
            UnmountCurrentTenant();
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
        /// <summary>⛔ MESURÉ 2026-09-02 — LE SENTINELLE D'ACQUISITION OBSERVAIT LA MAUVAISE
        /// GRANDEUR. Les deux montages forcés d'`Empire` en fin d'acquisition asynchrone sont gardés
        /// par <c>CurrentTab == (Tab)(-1)</c> : « personne n'a encore navigué ». La garde est juste
        /// pour un joueur qui change d'ONGLET — et aveugle à un joueur qui ouvre une SURIMPRESSION,
        /// parce que ce chemin-ci ne touche jamais <c>CurrentTab</c>. Résultat : un écran ouvert par
        /// un geste (⑨ via « voir tout », ⑯ idem) pendant les 2 à 4 allers-retours de l'acquisition
        /// est écrasé par le montage d'`Empire` quelques frames plus tard — `UnmountCurrentTenant`
        /// vidant tout `ContentSlot`, ce qui est son contrat et n'est PAS le défaut.
        /// ⇒ *Durcir la garde n'aurait rien donné : elle mesurait la navigation par ONGLET quand la
        /// propriété en jeu est « quelque chose a-t-il été monté ». Une autre force sur la même
        /// grandeur ne peut pas atteindre un défaut qui vit dans une autre grandeur.*
        /// ⇒ Ce chemin déclare donc son propre montage, et le sentinel lit les DEUX.</summary>
        public T MonterLocataireEnSurimpression<T>() where T : MonoBehaviour, IShellTenant
        {
            UneSurimpressionAEteMontee = true;
            // ⛔⛔ UN COMPTEUR EN PLUS DU BOOLÉEN, et ce n'est pas une redondance (2026-09-02).
            //    Le booléen répond « une surimpression a-t-elle été montée DEPUIS LE DÉBUT ? ».
            //    `AcquireSessionThenActivateHome` a besoin d'une AUTRE question : « une surimpression
            //    a-t-elle été montée DEPUIS LA MIENNE ? » — et le booléen ne peut pas y répondre,
            //    puisque c'est le shell lui-même qui vient de le mettre à vrai en montant l'Accueil.
            //    *Un drapeau déjà armé ne discrimine plus rien ; seule une GÉNÉRATION le peut.*
            SurimpressionsMontees++;
            return ConstruireLocataire<T>(out _);
        }

        /// <summary>Vrai dès qu'une surimpression a été montée par un geste du joueur. Lu par le
        /// sentinel d'acquisition, qui sans lui ne voit que la navigation par onglet.</summary>
        public bool UneSurimpressionAEteMontee { get; private set; }

        /// <summary>Nombre de locataires montés EN SURIMPRESSION depuis le démarrage. Sert de
        /// GÉNÉRATION : un appelant capture la valeur, laisse passer des frames, et sait ensuite si
        /// quelqu'un d'autre a ouvert un écran entre-temps — ce qu'un booléen déjà armé ne peut pas
        /// dire. Crochet de test autant que garde de production : sans lui, « rien n'a bougé sous
        /// moi » n'est pas une propriété observable.</summary>
        public int SurimpressionsMontees { get; private set; }

        /// <summary>Nombre de locataires montés par N'IMPORTE QUEL chemin depuis le démarrage —
        /// incrémenté dans `ConstruireLocataire`, le point de passage obligé des trois monteurs.
        /// C'est la grandeur que le sentinelle d'acquisition doit lire : sa question n'est pas
        /// « une surimpression a-t-elle été montée ? » mais « quelque chose a-t-il été monté ? ».
        /// Les deux ne coïncident que tant que personne n'ajoute un quatrième chemin.</summary>
        public int MontagesEffectues { get; private set; }

        /// <summary>Item 0.5 §2 (Tools/charpente-item05-design.md) — les 4 panneaux orphelins de
        /// l'Accueil (`HighestLeverageCardController`/`ExceptionQueuePanelController`/
        /// `OrgVitalsPanelController`/`HomeChromeController`). Ce ne sont PAS des `IShellTenant`
        /// (des panneaux DANS un écran, pas des locataires) : `MountTenant<T>`/`ConstruireLocataire<T>`
        /// (tous deux `where T : IShellTenant`) ne s'appliquent pas — un `AddComponent<T>()` nu
        /// suffit, et ce shell peut le faire directement (les 4 panneaux vivent dans CET assembly,
        /// `Shell.asmdef` — mesuré, design §2 : aucun cycle).
        /// I5 (revue ⊥ v4) — 3 des 4 ne consomment AUCUNE route : la source unique est `dto`, LA
        /// réponse `session/open` que CE shell vient d'obtenir (ou `null` si l'acquisition a échoué
        /// — voir les DEUX appelants). Seul `OrgVitalsPanelController` fait ses deux propres
        /// requêtes (Heat + Cohesion, C6-F3/F4) — déclenchées ici avec le jeton du shell, jamais
        /// attendues (best-effort, comme la sonde heat de ce shell juste en dessous).
        /// Chaque panneau vit sur son PROPRE host GameObject (chacun pose sa propre
        /// `VerticalLayoutGroup` etc. directement sur `gameObject` — deux panneaux sur le même hôte
        /// entreraient en collision de composants), parenté directement sous `ContentSlot` — comme
        /// tout host de locataire, donc recyclé GRATUITEMENT par `UnmountCurrentTenant` (qui vide
        /// TOUT `ContentSlot` au prochain changement d'onglet) sans mécanisme de teardown dédié.</summary>
        private void MonterPanneauxAccueil(SessionOpenDto dto)
        {
            // Défensif (jamais exercé en production — `MonterPanneauxAccueil` n'est appelée
            // qu'UNE fois par vie de shell, gardée par le sentinel `(Tab)(-1)` des deux appelants) :
            // si jamais elle l'était deux fois sur LA MÊME instance, la liste ne doit pas
            // accumuler des bandes d'un montage précédent déjà détruit.
            panneauxAccueilBandes.Clear();

            // Sans anchors explicites, `new GameObject(nom, typeof(RectTransform))` pose un
            // RectTransform PAR DÉFAUT (anchorMin=anchorMax=(0,0), sizeDelta=(100,100)) — les 4
            // panneaux se superposeraient EXACTEMENT dans le même coin bas-gauche de `ContentSlot`,
            // le dernier monté (HomeChrome) recouvrant les trois autres au raycast. `NouveauPanneauAccueil`
            // reçoit donc une BANDE fractionnaire distincte par panneau — un empilement STRUCTUREL
            // (chacun occupe toute la largeur, un quart de la hauteur), pas une composition visuelle
            // finale (celle-ci reste un travail ultérieur, DA/juge-visuel — consigné en Deviation).
            HighestLeverageCardController hlCard = NouveauPanneauAccueil<HighestLeverageCardController>("AccueilHlCard", 0.75f, 1.00f);
            // ⑤ `screen_1a` — le DÉTAIL de la carte, en surimpression. L'écran existe (maquette
            // ratifiée « ok top on garde comme ça »), et sans ce fil il ne serait montable par
            // personne : les quatre onglets sont pris, et un écran de détail n'a pas vocation à en
            // occuper un. *Un écran construit que rien ne monte est un écran que le joueur ne voit
            // jamais* — c'est le défaut exact qui laissait la Revue du jour invisible depuis W3.U1.
            if (hlCard != null)
                hlCard.OnOuvrirDetail += () => MonterLocataireEnSurimpression<DecisionDetailScreenController>();

            hlCard.SetPayload(Token, dto?.hl_card, dto?.structural_budget);

            ExceptionQueuePanelController exceptions = NouveauPanneauAccueil<ExceptionQueuePanelController>("AccueilExceptionQueue", 0.50f, 0.75f);
            exceptions.SetQueue(Token, dto?.queue);

            OrgVitalsPanelController orgVitals = NouveauPanneauAccueil<OrgVitalsPanelController>("AccueilOrgVitals", 0.25f, 0.50f);
            orgVitals.SetFrictionStress(dto?.friction_glance, dto?.compression_glance);
            // m7 (revue ⊥ item05-C2, mineur — CONSIGNÉ, non fermé ici) : ce shell interroge DÉJÀ
            // `GET /v1/city/district/16/heat` plus bas (sonde citywide, §6.2) et `DashboardController`
            // aussi (`:232`) — celui-ci ferait un 3ᵉ appelant simultané au démarrage, alors que
            // `DashboardController.cs:236-238` s'interdit VERBATIM un "3e appelant" en réutilisant
            // CET appel-là plutôt que d'en refaire un. Non fermé ici (repointer `orgVitals` vers un
            // appel partagé changerait le contrat "chaque panneau pilote SA propre requête" — hors
            // périmètre C2) : ouvert pour un futur lot de partage de sonde citywide.
            if (!string.IsNullOrEmpty(Token)) orgVitals.FetchHeatAndCohesion(Token); // best-effort — voir le docstring de la méthode

            HomeChromeController homeChrome = NouveauPanneauAccueil<HomeChromeController>("AccueilHomeChrome", 0.00f, 0.25f);
            homeChrome.SetCompressionGlance(dto?.compression_glance);
            homeChrome.SetPressureBand(dto?.queue_pressure_band);
            // Le générique "5 états" (design §2, I6 — la revue ⊥ v4) : `hasAnyData` reflète ce que
            // CE MVP surface réellement sur l'Accueil (une carte à haut levier OU une file
            // d'exceptions) — jamais un flag inventé. ⚠️ MESURÉ (I6) : quand une session/open RÉELLE
            // porte l'un ou l'autre (le cas courant), cette ligne retombe dans la branche "tout est
            // chargé" de `SetLoadCircumstances` (`HomeChromeController.cs:56`), qui rend LA MÊME
            // valeur que son défaut jamais câblé (`:19`) — un défaut PRÉEXISTANT de ce contrôleur
            // (C7, hors périmètre de C2), pas quelque chose que ce chunk introduit ou peut réparer
            // par un choix de flag différent. ⇒ AUCUNE assertion de ce lot ne lit `CurrentState`
            // depuis CE chemin — seule la branche EmptyState (déclarée, mesurée séparément) est
            // testée (voir Tools/charpente-item05-design.md §2, I6).
            bool hasCard = dto?.hl_card != null && !string.IsNullOrEmpty(dto.hl_card.card_id);
            bool hasQueue = dto?.queue != null && dto.queue.Length > 0;
            bool hasAnyData = hasCard || hasQueue;
            // m1 (revue ⊥ item05-C2, mineur, frontière PRODUCTION/PREUVE — CONSIGNÉ, non fermé ici) —
            // `hasAllExpectedData` vaut toujours `hasAnyData` ⇒ dans `HomeChromeController.
            // SetLoadCircumstances` (`!hasAnyData → EmptyState`, sinon `!hasAllExpectedData` est
            // TOUJOURS faux) le 5ᵉ état canonique `PartialState` devient structurellement
            // INATTEIGNABLE depuis CE site — la machine à 5 états n'en produit que 3 (Empty/Error/
            // Offline + la branche "chargé" indiscriminante, I6). Aucun joueur ne perd de fonction
            // aujourd'hui (ce MVP ne surface qu'UNE carte OU une file, jamais un sous-ensemble
            // partiel des deux à distinguer) — mais un état du canon meurt en silence. Option
            // conservatrice : laissé tel quel (le fermer exigerait de définir ce que "partiel"
            // signifie pour CE panneau, hors périmètre C2) — ouvert pour l'écran/juge-donnees.
            homeChrome.SetLoadCircumstances(isLoading: false, hasError: dto == null, isOffline: false,
                hasAnyData: hasAnyData, hasAllExpectedData: hasAnyData);
        }

        private T NouveauPanneauAccueil<T>(string nom, float yMin, float yMax) where T : Component
        {
            GameObject host = new GameObject(nom, typeof(RectTransform));
            host.transform.SetParent(ContentSlot, false);
            RectTransform rt = (RectTransform)host.transform;
            PoserBandeAccueil(rt, yMin, yMax);
            // C3 (Tools/charpente-item05-C3-implementation-notes.md) — mémorisée pour que
            // `RebatirPanneauxAccueilPourResolutionCourante()` puisse rejouer CETTE formule quand
            // `ContentSlot.rect.height` a changé depuis ce montage (voir son docstring) — jamais
            // une seconde copie de `yMin`/`yMax`, la même paire que celle passée ci-dessus.
            panneauxAccueilBandes.Add((rt, yMin, yMax));
            return host.AddComponent<T>();
        }

        /// <summary>La géométrie d'UNE bande — PARTAGÉE entre le montage initial
        /// (`NouveauPanneauAccueil`) et la reconstruction (`RebatirPanneauxAccueilPourResolutionCourante`).
        /// UNE seule formule : c'est ce qui empêche les deux chemins de diverger silencieusement
        /// (même patron que `DockRatifie`, items 0.2/0.3 — « deux copies qui doivent rester
        /// parallèles sont une dette »).
        ///
        /// B2 (revue ⊥ item05-C2, BLOQUANT-PRODUCTION) — `ContentSlot` couvre TOUT le canvas PAR
        /// CONCEPTION (un fond plein écran de tenant doit s'y étirer, voir le commentaire de
        /// `ConstruireLocataire` plus haut). Un panneau qui pose du TEXTE doit au contraire
        /// respecter ce que le chrome MANGE — le MÊME contrat que `ConstruireLocataire` publie
        /// pour tout `IShellTenant` (`ShellChrome.TopInsetPx`/`BottomInsetPx`), déjà consommé par
        /// `LieutenantScreenController`/`DistrictInteriorScreenController`. AVANT ce correctif,
        /// les 4 bandes fractionnaires (yMin/yMax) étaient réparties sur TOUTE la hauteur de
        /// `ContentSlot`, barres comprises — mesuré (revue ⊥, arithmétique sur les constantes du
        /// dépôt) : jusqu'à 100 % de HomeChrome sous le dock en 640×480 (le batchmode du juge),
        /// 51,8 % en 1080×1920, 41,4 % en 1080×2400. Les insets SONT déjà publiés au moment où
        /// `NouveauPanneauAccueil` appelle ceci (les DEUX appelants de `MonterPanneauxAccueil`
        /// passent par `MonterLocataireEnSurimpression<DashboardController>()` → `ConstruireLocataire`
        /// → `PublierInsetsDuChrome()` avant le `yield return null;` qui précède ce montage), et à
        /// nouveau au moment où `RebatirPanneauxAccueilPourResolutionCourante()` la rappelle (elle
        /// n'est appelée qu'APRÈS `RebatirChromePourResolutionCourante()`, qui republie les deux
        /// insets à sa toute fin — voir son propre docstring). Hors shell (tenu par le repli
        /// documenté sur `ShellChrome`), les deux insets valent 0 : la bande retombe sur
        /// `ContentSlot` entier, comportement inchangé pour tout test qui construit ce panneau seul.</summary>
        private void PoserBandeAccueil(RectTransform rt, float yMin, float yMax)
        {
            float hauteurTotale = ContentSlot.rect.height;
            float zoneSureBas = ShellChrome.BottomInsetPx;
            float zoneSureHaut = Mathf.Max(zoneSureBas, hauteurTotale - ShellChrome.TopInsetPx);
            float zoneSureHauteur = zoneSureHaut - zoneSureBas;
            float yBas = zoneSureBas + yMin * zoneSureHauteur;
            float yHaut = zoneSureBas + yMax * zoneSureHauteur;
            rt.anchorMin = new Vector2(0f, 0f);
            rt.anchorMax = new Vector2(1f, 0f); // point-anchor en Y : offsetMin/offsetMax mesurent alors TOUS DEUX depuis le bas de ContentSlot
            rt.offsetMin = new Vector2(0f, yBas);
            rt.offsetMax = new Vector2(0f, yHaut);
        }

        /// <summary>Refait la géométrie des 4 panneaux de l'Accueil pour la résolution COURANTE —
        /// le PENDANT, pour ces panneaux, de
        /// `DistrictInteriorScreenController.RebatirPourResolutionCourante()` (lire SON docstring
        /// d'abord : même classe de défaut, même origine — un `rect` lu une seule fois au montage).
        ///
        /// ⛔⛔ POURQUOI ÇA EXISTE — un défaut de MESURE, pas un bug joueur d'aujourd'hui.
        /// `PoserBandeAccueil` cuit chaque bande comme un DÉCALAGE ABSOLU (`offsetMin`/`offsetMax`,
        /// point-anchor en Y) dérivé de `ContentSlot.rect.height` LU au moment de l'appel. En
        /// montage NATIF (le chemin joueur : le canvas est déjà à sa taille finale dès la frame 1,
        /// et ce montage a lieu à l'ouverture de session — `Screen.width` ne change plus jamais
        /// ensuite, portrait verrouillé), cette valeur est la bonne pour toujours : MESURÉ, 0,00 %
        /// de débordement aux deux résolutions natives testées
        /// (`Tools/charpente-item05-C2-photo-implementation-notes.md`). Le défaut ne mord QUE si
        /// `ContentSlot.rect.height` change APRÈS ce montage sans que rien ne recuise la bande —
        /// ce qu'aucun joueur ne provoque, mais ce que le patron de capture `CapturerA`/
        /// `MesurerEtCapturer` FAIT systématiquement (montage à 640×480 en batchmode, PUIS
        /// bascule du canvas vers la cible) : MESURÉ sur la même photo,
        /// `HighestLeverageCardController` **+18,8 %**, `ExceptionQueuePanelController` **+73,1 %**
        /// de débordement, texte superposé et illisible. Cette méthode répare l'INSTRUMENT et
        /// supprime un décalage LATENT ; elle ne ferme aucune régression jouée aujourd'hui.
        ///
        /// ⚠️ CE QUE ÇA NE FAIT PAS, ET POURQUOI PAS — option conservatrice, pas une omission.
        /// Le précédent du district DÉTRUIT et REBÂTIT tout son arbre, parce que `Render(dto)`
        /// relit `root.rect.width` à PLUSIEURS endroits de sa construction. Ici, la SEULE grandeur
        /// dépendante de la résolution est la bande externe de chaque panneau (yMin/yMax →
        /// offsets) : le CONTENU des 4 panneaux vient de setters (`SetPayload`/`SetQueue`/
        /// `SetFrictionStress`/`SetCompressionGlance`/`SetPressureBand`/`SetLoadCircumstances`) qui
        /// ne dépendent d'AUCUNE géométrie de canvas. Détruire/recréer rejouerait ces setters ET
        /// redéclencherait `OrgVitalsPanelController.FetchHeatAndCohesion` — un VRAI aller-retour
        /// réseau — pour un correctif qui n'a besoin de toucher QUE la position. ⇒ repositionnement
        /// SEUL (`PoserBandeAccueil`, la MÊME formule qu'au montage) : la `VerticalLayoutGroup`
        /// interne de chaque panneau se recale toute seule sur son nouveau `rect` via
        /// `Canvas.ForceUpdateCanvases()` — aucune destruction en jeu, donc pas besoin du double
        /// `yield` que la destruction DIFFÉRÉE impose côté district (son propre commentaire,
        /// « la destruction différée de l'ancienne racine »).
        ///
        /// ⚠️ ORDRE D'APPEL, OBLIGATOIRE — après `RebatirChromePourResolutionCourante()`, jamais
        /// avant : celui-ci republie `ShellChrome.Top/BottomInsetPx` (`PublierInsetsDuChrome()`, à
        /// sa toute fin) dont `PoserBandeAccueil` dépend — exactement le même ordre qu'au montage
        /// initial (`ConstruireLocataire` publie les insets AVANT que `MonterPanneauxAccueil` ne
        /// les lise).
        ///
        /// Sans appelant de production — comme son précédent district, et pour la MÊME raison :
        /// la production ne change jamais de résolution après montage (voir plus haut). Un hook
        /// sans appelant de production N'EST décoratif que s'il PRÉTEND fermer un défaut qui mord
        /// en production ; celui-ci ne le prétend pas (docstring ci-dessus) — il ferme un défaut
        /// de MESURE, et son seul consommateur légitime est le chemin qui refait cette mesure :
        /// `AccueilPanneauxGeometriePhotoPlayModeTests.MesurerEtCapturer` (MÊME patron que
        /// `VuePrincipaleCapturePlayModeTests.CapturerA`, qui n'a lui-même jamais mesuré l'Accueil
        /// — `EnterDistrict`/`ActivateTab` y détruisent ces panneaux avant toute capture).</summary>
        public void RebatirPanneauxAccueilPourResolutionCourante()
        {
            if (ContentSlot == null) return;
            for (int i = 0; i < panneauxAccueilBandes.Count; i++)
            {
                (RectTransform rt, float yMin, float yMax) bande = panneauxAccueilBandes[i];
                if (bande.rt == null) continue; // démonté depuis (changement d'onglet) — rien à refaire
                PoserBandeAccueil(bande.rt, bande.yMin, bande.yMax);
            }
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
            // ⛔⛔⛔ CORRIGÉ round 17 (revue ⊥ round 16, BLOQUANT) — cette ligne affirmait
            // « `EffectiveBottomOverhangPx` sort désormais en unités d'ÉCRAN » : FAUX, et c'était
            // l'énoncé qui a fait passer le défaut (le docstring de la propriété exige, lui, la
            // même unité que `rect.height` — les deux moitiés étaient vraies séparément et
            // incompatibles ensemble). `EffectiveBottomOverhangPx` sort en unités de CANVAS (la
            // conversion vit chez le bandeau, qui connaît son échelle ET divise par
            // `canvas.scaleFactor`) — donc additionnable tel quel avec `rect.height`, sans
            // qu'aucun appelant ait à s'en souvenir.
            float debord = TopBar != null ? TopBar.EffectiveBottomOverhangPx : 0f;
            ShellChrome.PublierInsets(topSafe + TopBarSlot.rect.height + debord,
                                      bottomSafe + TabBarRoot.rect.height);
        }

        /// <summary>R4 — le facteur d'échelle vient du CANVAS, plus de <c>Screen</c>.
        ///
        /// ⛔⛔ CE QUE CETTE MÉTHODE FAISAIT DE FAUX, ET POURQUOI C'ÉTAIT INVISIBLE (mesuré 2026-09-01).
        ///    Elle RECALCULAIT son propre facteur — <c>Screen.width / ReferenceResolutionWidth</c> —
        ///    au lieu de lire celui du canvas. Tant que le canvas suit l'écran, les deux coïncident
        ///    et rien ne se voit. Ils DIVERGENT dès que le canvas vise autre chose que l'écran :
        ///    c'est le cas de la seule voie de rendu multi-résolution que ce dépôt possède (caméra →
        ///    <c>RenderTexture</c> ; <c>Screen.SetResolution</c> = 0 occurrence, <c>GameViewSizes</c>
        ///    refusé par écrit dans les tests). Le canvas suit alors la texture cible pendant que
        ///    <c>Screen.width</c> reste celui du Game View — bloqué à 640 en batchmode. ⇒ **Le canvas
        ///    se redimensionne, le chrome NON**, et toute capture « à telle résolution » montre une
        ///    géométrie HYBRIDE que le joueur n'a jamais.
        ///
        /// ⚠️ POURQUOI <c>renderingDisplaySize</c> ET NON <c>scaleFactor</c> : <c>Canvas.scaleFactor</c>
        ///    lu dans la frame de création rend <b>1,000000</b> — une valeur PLAUSIBLE, pas une erreur,
        ///    et légitime à 1280 de large, donc aucune garde de seuil ne peut la distinguer du cas
        ///    juste (les 4 précédents maison gardent <c>&gt; 0.0001f</c> : 1,0 les satisfait tous).
        ///    <c>renderingDisplaySize</c> est la grandeur d'ENTRÉE du <c>CanvasScaler</c>, disponible
        ///    sans attendre une frame, et elle suit la RenderTexture. Sous
        ///    <c>matchWidthOrHeight = 0</c> — le réglage de ce shell — le scaler calcule exactement
        ///    <c>renderingDisplaySize.x / referenceResolution.x</c> : on lit donc la MÊME formule sur
        ///    la MÊME source, au lieu d'en recalculer une seconde depuis <c>Screen</c>.
        ///
        /// ⛔ AUCUN REPLI SILENCIEUX VERS <c>Screen</c> : un repli rétablirait le défaut exactement
        ///    dans le monde où il mord, et le rendrait invisible. Canvas absent ou dégénéré ⇒ (0,0),
        ///    la même issue que la garde d'anti-vacuité qui existait déjà pour un écran nul.</summary>
        private (float top, float bottom) SafeAreaInsetsLocal()
        {
            Rect safeArea = SafeAreaProvider();
            if (ShellCanvas == null) return (0f, 0f);
            float largeurRendu = ShellCanvas.renderingDisplaySize.x;
            float hauteurEcran = Screen.height; // la zone sûre est EXPRIMÉE en pixels d'écran : c'est
                                                // son propre référentiel, pas celui de la conversion
            if (largeurRendu <= 0f || hauteurEcran <= 0f) return (0f, 0f); // jamais une division par 0
            float scaleFactor = largeurRendu / ReferenceResolutionWidth;
            if (scaleFactor <= 0f) return (0f, 0f);
            float topPx = Mathf.Max(0f, hauteurEcran - safeArea.yMax);
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
            // déplacée telle quelle) ; l'écran de district porte déjà, dans le bandeau PARTAGÉ du
            // shell (round 7), une action de sortie dédiée — round 9 (revue ⊥, MAJEUR 2) : ce
            // commentaire attribuait ici un libellé à deux mots à ce bandeau ; PARAPHRASÉ, jamais
            // cité (`TopBarController.LabelFor`, round 8, ne rend qu'une flèche nue) — et F0.3
            // (Tools/charpente-item0-2-3-design.md) PROUVE cette porte atteignable par un
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

        /// <summary>Px CSS de la maquette → unités de canvas, POUR LE CHROME que ce shell construit
        /// lui-même (bandeau + dock).
        ///
        /// ⛔⛔ CORRIGÉ round 15 (revue ⊥ round 14, BLOQUANT — RÉEL EN PRODUCTION, mesuré, pas un
        /// artefact de batchmode). Cette méthode LISAIT `ShellCanvas.transform.rect.width` via
        /// `EchelleMaquette.Px` — MÊME DÉFAUT DE TIMING QUE `SafeAreaInsetsLocal` (docstring
        /// juste au-dessus d'elle dans ce fichier), et il MORDAIT : `BuildLayout()` CRÉE le Canvas
        /// (le bloc `if (ShellCanvas == null) { … new GameObject("Canvas", …) … }`) puis appelle
        /// CETTE méthode dans LE MÊME appel synchrone (la pose de `TopBarSlot.sizeDelta`,
        /// `FacteurEchelle()`, et tout `BuildTabBar`/`AddTabButton`) — AVANT tout `Canvas.
        /// ForceUpdateCanvases()` ou toute frame écoulée. Le `CanvasScaler` n'a donc pas encore
        /// tourné : `rect.width` rend `Screen.width` EN PIXELS D'ÉCRAN BRUTS, pas `1280`. Mesuré :
        /// `TopBarEchelle.localScale.x = Screen.width/392` à la 6ᵉ décimale, au lieu de `1280/392` —
        /// le chrome ENTIER (bandeau ET dock, tout passe par CETTE méthode) rendu à
        /// `Screen.width/1280` de sa taille sur TOUT appareil (56 % à 720, 84 % à 1080, DÉBORDE à
        /// 1440). La garde `> 100f` d'`EchelleMaquette.LargeurCanvas` ne l'attrape jamais : ces
        /// valeurs sont toutes PLAUSIBLES, pas un `0`.
        ///
        /// Ce shell CONFIGURE lui-même `referenceResolution = (ReferenceResolutionWidth, 720)`
        /// (dans `BuildLayout()`, sur le `CanvasScaler` neuf) sous `ScaleWithScreenSize` — la
        /// largeur LOCALE du canvas, une fois stabilisée,
        /// vaut donc TOUJOURS `ReferenceResolutionWidth`, quel que soit `Screen.width`
        /// (`ChromeMultiResolutionPlayModeTests` l'assert déjà comme invariant). ⇒ calculer le
        /// facteur DIRECTEMENT depuis cette constante — jamais lu sur le rect d'un Canvas qui peut
        /// ne pas être à jour dans LA MÊME frame que sa construction — supprime la dépendance de
        /// timing PLUTÔT que de la déplacer (un `Canvas.ForceUpdateCanvases()` isolé, sans frame
        /// écoulée, n'est PAS garanti de suffire : le chemin de capture, lui, en pose DEUX avec un
        /// `yield` entre les deux). Même patron que `SafeAreaInsetsLocal` — 3ᵉ fois sur ce lot que
        /// ce patron existait déjà, dans ce même fichier, avant d'être appliqué ici.
        ///
        /// Passer autre chose que cette référence fixe (un panneau, une barre) diviserait toute
        /// l'échelle par un facteur muet — c'est la faute du « spacing corrigé sur le mauvais
        /// conteneur » ; ce n'est plus possible ici, il n'y a plus de racine à se tromper.</summary>
        private float Px(float css) => css * (ReferenceResolutionWidth / TopBarLargeurCss);

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

            // ⛔ CINQUIÈME SITE DE LA MÊME CLASSE (voir `TopBarController.TeinteSurCadran`) : une
            // opacité CSS recopiée telle quelle rend PLUS CLAIR dans un projet en linéaire que dans
            // le navigateur, et l'écart croît avec le contraste. Ici le fond est CONNU — le jonc
            // longe le BORD du rond, et `RadialDisc` y vaut sa couleur de bord — donc la solution
            // est exacte : on garde l'opacité de la CSS et on déplace la couleur.
            // ⚠️ Si elle sort du gamut, on garde le blanc et le log le dit : un dispositif inerte
            // ressemble trait pour trait à un dispositif appliqué.
            bool joncAtteignable;
            Color jonc = MafiaCleanCity.Shell.ProceduralUI.CouleurPourMelangeLineaire(
                Color.white, DesignTokens.Current.dockRondOuter, 0.133f, out joncAtteignable);
            if (!joncAtteignable)
            {
                Debug.LogWarning("[DOCK-sRGB] le jonc du rond : aucune couleur ne reproduit le " +
                                 "mélange sRGB sur ce fond — blanc conservé, l'écart demeure.");
                jonc = Color.white;
            }
            jonc.a = 0.133f;                                           // #ffffff22
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
        ///     n'avaient pas été bâtis au même moment.
        ///
        /// ⛔⛔ ROUND 15 — CE QUE CETTE MÉTHODE FAIT ENCORE, ET CE QU'ELLE NE FAIT PLUS. `Px()` ne
        /// lit plus AUCUNE géométrie de Canvas (voir son docstring) : elle rend désormais la MÊME
        /// constante à CHAQUE appel, qu'on soit à la construction ou ici. ⇒ pour le CHROME
        /// (`TopBarSlot`/`TabBarRoot`.sizeDelta, `echelleRt.localScale`, tous les paddings/tailles
        /// du dock), cette méthode est devenue un NO-OP GÉOMÉTRIQUE — elle réécrit EXACTEMENT ce
        /// que `BuildLayout()`/`BuildTabBar()` avaient déjà posé, jamais autre chose. Ce qu'elle
        /// fait ENCORE réellement : republier `SafeAreaInsetsLocal()` (dépend de
        /// `Screen.safeArea`/`Screen.height`, PAS de `Px()` — légitimement différent si l'appelant a
        /// changé la cible de rendu depuis `BuildLayout()`) et RECONSTRUIRE les 4 bulles du dock
        /// (utile si `CurrentTab` a changé entre-temps, via `RefreshTabButtonVisuals`). Un appelant
        /// qui n'a besoin QUE de ça (le cas des deux sites de test connus, §0.4/`ce fichier`) peut
        /// continuer à l'appeler sans risque : elle ne peut plus DIVERGER de `BuildLayout()`, elle
        /// ne peut que la RÉPÉTER. ⇒ Se déclare à l'exécution (ligne ci-dessous) : un dispositif qui
        /// continue de tourner sans plus rien réparer doit le DIRE, pas rester silencieusement
        /// invoqué comme s'il réparait encore quelque chose (socle CLAUDE.md, « un dispositif
        /// conditionnel doit imprimer s'il s'est activé »).</summary>
        public void RebatirChromePourResolutionCourante()
        {
            if (ShellCanvas == null || TopBarSlot == null || TabBarRoot == null) return;
            Debug.Log("[Charpente] RebatirChromePourResolutionCourante() a tourné — depuis round 15, " +
                       "Px() ne lit plus la géométrie du Canvas : la re-pose du chrome (bandeau/dock) " +
                       "ci-dessous est un NO-OP géométrique (mêmes valeurs qu'à BuildLayout()). Ce qui " +
                       "change réellement ici : les insets de zone sûre et l'état visuel des onglets.");
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
                bool active = DockRatifie[i].onglet == ongletSignale;
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
