using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;
using MafiaCleanCity.Shell;   // ProceduralUI (médaillon du marqueur), ShellChrome — assembly ShellContracts

namespace MafiaCleanCity.CityMap
{
    // W3.U2 C7 (design §3 C7, D9 — U-14 : le seam de jeton) + W3.U2 C8 (design §3 C8, D8 — U-9/U-15 :
    // l'écran). C7 a livré le point d'entrée data (SetSession + le fetch réel) ; CE chunk (C8) ajoute
    // IShellTenant + la construction visuelle (grille/socle/brume/hors-district/sol, §3.0 : "C7 ──> C8").
    //
    // Décision D9 (C7) : « le diorama expose SetSession(bearer, districtId), appelé par son montant —
    // le MÊME contrat que les 4 panneaux W3.U1 ». Cette classe n'appelle JAMAIS AuthClient.SignIn/
    // SignUp et ne porte AUCUN identifiant sérialisé — C7-F3 balaie CE fichier exact pour ça.
    //
    // Décision D8 (C8, U-15) : la donnée `day_phase` (4 quarts) est déjà projetée par le back (C2/B-6).
    // AMENDÉ JUGE-D1 (audit visuel, 2026-08-21 — Défaut 1, LE PLUS GRAVE : DAWN/DUSK = 50% du temps
    // de jeu sans aucun art, prouvé par `day-phase-quarter.ts` — 4 quarts ÉGAUX) : les 4 paliers
    // rendent DÉSORMAIS tous un fond héros — DAY/NIGHT sur leur fond dédié, DAWN/DUSK en PIS-ALLER
    // sur le fond du quart vers lequel ils MÈNENT (DAWN→jour, DUSK→nuit), dette consignée jusqu'à des
    // rendus DAWN/DUSK dédiés de l'atelier (implementation-notes.md § Deviations). Le repli DÉCLARÉ
    // ne couvre plus que `day_phase` INCONNU (5e valeur de fil, jamais un des 4 quarts nommés).
    //
    // SetSession et Render() sont DÉLIBÉRÉMENT NON couplés dans ce chunk — voir Tools/w3u2-c8-notes.md
    // § Deviations : aucune falsifiable C8 n'exige que le succès du fetch déclenche le rendu, et les
    // coupler aurait fait fuiter un Canvas orphelin dans le smoke test déjà fermé de C7 (dont le
    // TearDown ne nettoie que son propre host). Render() bâtit sa racine PARESSEUSEMENT, à son premier
    // appel — un futur chunk qui câble une navigation réelle vers cet écran appelle les deux
    // explicitement (SetSession puis Render, ou un petit wrapper), avec un TearDown pensé pour les deux.
    //
    // W3.U2 C9 (design §3 C9, §1.5 — U-10 : les 5 bindings lumineux) : chaque lumière est un FAIT du
    // back (engagement 3, "aucune lumière décorative"), jamais une décoration inconditionnelle. Les
    // noms de token portent leur binding dans leur PROPRE commentaire (DesignTokens.cs) :
    //   binding 1 (§1.5 ligne 1, "fenêtres ambre = possédé") : nightWindowLit, gardé par la PRÉSENCE de
    //     l'entrée (BuildBuildingCell n'est jamais appelée pour un bloc vide, C8/BuildEmptyCell) ;
    //   binding 2 (§1.5 ligne 2, "fenêtres éteintes = raid/saisie") : condition_band != SOUND ÉTEINT
    //     binding 1 — §1.1a/D3 : la colonne du raid est building_operational_state.structural_state
    //     (condition_band), JAMAIS shell_state (invariant en production, D2 v2 MINOR R9) ;
    //   binding 3 (§1.5 ligne 3, D3) : nightNeonGlow, la règle à 3 états EXACTE de D3 ;
    //   binding 4 (§1.5 ligne 4) : nightSmoke, gardé par activity_band == ACTIVE ;
    //   binding 5 (§1.5 ligne 5) : pas de token de nuit dédié (aucun n'a été ajouté en C5) — REUSE de
    //     accentWarning (token de base, déjà asset-backed, R2.3), gardé par lapse_phase_bucket ET
    //     maintenance_in_progress (mécanisme non prescrit par le design au-delà du nom du champ — voir
    //     Tools/w3u2-c9-notes.md § Deviations).
    //
    // W3.U2 C10 (design §3 C10, engagement 7 — U-12 : boucles ambiantes budgétées) : AU PLUS
    // MaxAmbientLoops (4) micro-animations actives simultanément, quel que soit le nombre de sources
    // qui les réclameraient. TryStartAmbientLoop est le SEUL point d'entrée qui attache
    // AmbientPulseLoop — les 3 bindings DYNAMIQUES déjà branchés à un fait du back (néon EARNING,
    // fumée ACTIVE, grésillement de maintenance) sont candidats, dans l'ORDRE où BuildBuildingCell
    // les construit déjà (déterministe — pas de tri ajouté). Binding 1+2 (fenêtre ambre, la
    // possession — l'état le plus commun et le moins événementiel) N'EST PAS candidat : l'intensité
    // du feedback doit être proportionnée à l'importance, pas uniforme (mécanisme non prescrit par le
    // design au-delà du nombre — voir Tools/w3u2-c10-notes.md § Deviations).
    //
    // U-11 (lieutenants visibles à leur affectation, C10-F1) — DÉBLOQUÉ par D10/§C2-bis (B-7, back
    // `mafia-w3u2` commit adf8d368) : `buildings[].lieutenant_ids: string[]` (poignées de ressources
    // possédées, R2.2 — jamais un scalaire brut ; `[]` si aucun, jamais `null`, trié par
    // lieutenant_id côté back). BuildLieutenantMarkers rend EXACTEMENT un marqueur par entrée, appariés
    // par bâtiment — AUCUN budget/plafond ne s'applique ici (contrairement à C10-F2/U-12 : le design
    // amendé (git show spec/w3.u2:…/2026-08-17-w3u2-district-nuit-design.md, section C10/C2-bis) ne
    // borne QUE les boucles ambiantes ; un marqueur de lieutenant est une PRÉSENCE, pas une boucle).
    // Le J0 (prémisse §3, re-mesuré par D10) affecte les 2 lieutenants COOK au MÊME bâtiment (le lab)
    // — le cas dégénéré que C10-F1 dimensionne : 2 marqueurs DISTINCTS sur 1 bâtiment, jamais 1.
    //
    // ══════════════════════════════════════════════════════════════════════════════════════════════
    // W3.U2 P3 — PIVOT « FOND PRÉ-RENDU » (Tools/pivot-fond-prerendu-design.md, §P3, gate ⊥ APPROVED
    // 2026-08-20). Remplace toute la grille procédurale par un fond pré-rendu 1:1 pixel-perfect + les
    // bâtiments joueur ancrés sur ce fond via une carte JSON produite par l'atelier (jamais dérivée en
    // C#, §4 : "Unity ne fait qu'une lecture ; il ne dérive rien").
    //
    // RETIRÉS (« plus aucune grille procédurale », §11 P3) — ambiant, rues, sol, socle-grille, bordure :
    // GridArea/GridFloors/GridBorder/Cell-comme-case-de-grille, FloorTint (3 tokens nightBackground/
    // nightFloorAlt/nightBase perdent leur SEUL consommateur — DÉLIBÉRÉMENT non supprimés du registre
    // DesignTokens, voir implementation-notes.md § Deviations), IsStreetCell/BuildAmbientCell/
    // BuildEmptyCell (l'ambiant est baqué dans le fond, §3 : "Ce que le fond porte : ... bâtiments
    // AMBIANTS ... Ce que le fond ne porte pas : aucun bâtiment sur une parcelle. Unity dessine
    // par-dessus, et RIEN D'AUTRE"), OutOfDistrictBackdrop + Haze (pp-F5 — le fond porte déjà sa ville
    // au loin et sa brume ; amendement NOMMÉ de DistrictInteriorDioramaPlayModeTests.cs:241,
    // childCount 4→2), `CellSize`/`MetresParBloc` et les 4 sites `k = CellSize/(MetresParBloc*56f)`
    // (§2.2 du design : l'échelle et la position viennent désormais du fond).
    //
    // AJOUTÉS : DistrictBackgroundSlots (registre profil→fond+ancre, REUSE du seam Resources.Load de
    // BuildingSpriteSlots/DesignTokens) ; DistrictBackgroundAnchorDto + DistrictBackgroundAnchor (DTO
    // JSON + helper PUR bloc→pixel→UI, DistrictBackgroundAnchorDto.cs) ; un fond Image en résolution
    // native compensée (pp-F1) ; chaque bâtiment joueur ancré sur SA parcelle via la carte JSON
    // (pp-F2/F-calage), sprite affiché à facteur 1,000 (pp-F3).
    //
    // DÉCISION NOMMÉE — le conteneur par bâtiment reste nommé `Cell_{x}_{y}` (inchangé) : ce n'est
    // plus une case de grille mais l'ancre du bâtiment sur le fond, MÊME rôle structurel (le support
    // qui porte Socle/BuildingSprite/les calques d'état/les marqueurs de lieutenant). Ce choix évite
    // tout changement à DistrictInteriorLightingPlayModeTests.cs, DistrictInteriorAmbientLoopsPlayModeTests.cs
    // et DistrictInteriorLieutenantMarkersPlayModeTests.cs (aucun des trois ne référence CellSize/
    // GridArea — seuls les COMPTES et l'appariement par nom `Cell_x_y` comptent) — l'option qui change
    // le moins de surface (règle du socle sur les imprévus non bloquants).
    //
    // Structure de root en art de nuit (pp-F5) : EXACTEMENT 3 enfants directs — DistrictSceneBackdrop,
    // DistrictTitle et DistrictScene (conteneur passe-plat qui porte le fond/placeholder + tous les
    // Cell_x_y). Le childCount de root reste donc FIXE à 3 quel que soit le nombre de bâtiments —
    // c'est ce qui rend l'amendement de :241 exact, pas 2+N. ⚠️ AMENDÉ 2026-08-21 : cette prose
    // annonçait encore « 2 » APRÈS que le backdrop a été sorti de la scène mobile — un texte laissé
    // intact dans un fichier corrigé devient faux dès que la correction déplace ce qu'il référence. AMENDÉ (nav-district) : l'ORDRE DE FRATRIE
    // n'est plus "Titre puis Scène" — DistrictTitle est repoussé en DERNIER sibling en fin de
    // RenderHeroDiorama (le titre est du chrome, il doit rester rendu AU-DESSUS d'un DistrictScene
    // que la navigation peut désormais paner/zoomer sous lui). Le COMPTE (2) est inchangé ; seul
    // l'ORDRE l'est — aucune falsifiable existante n'assertait l'ordre (childCount seul).
    public class DistrictInteriorScreenController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // nav-hud-design-v1.md §3.4 (chunk 2) — les insets de chrome (0/0 hors shell, la valeur par
        // défaut de ces champs — les 46 falsifiables convergées d'avant ce chunk n'appellent jamais
        // SetSafeInsets et restent donc byte-identiques). Dans le shell, le chrome SUBSTITUE la
        // respiration au lieu de s'y ajouter — voir RenderNightDiorama pour l'arithmétique exacte.
        private float safeInsetTop;
        private float safeInsetBottom;

        /// <summary>§3.4 — posé par l'appelant (AppShell.EnterDistrict) AVANT le premier Render(),
        /// persiste à travers tous les Render() suivants (day_phase change, etc.). Jamais appelé
        /// hors shell ⇒ 0/0, l'arithmétique retombe sur l'historique (byte-identique).</summary>
        public void SetSafeInsets(float top, float bottom)
        {
            safeInsetTop = Mathf.Max(0f, top);
            safeInsetBottom = Mathf.Max(0f, bottom);
        }

        // ---- test hooks : data (C7) --------------------------------------------------------
        public DistrictInteriorDto LastFetch { get; private set; }
        public long LastErrorCode { get; private set; }
        public bool LastFetchSucceeded { get; private set; }

        // ---- test hooks : render (C8) -------------------------------------------------------
        /// <summary>La racine de l'écran (C8-F1) — un enfant EFFECTIF du parent de montage, jamais de
        /// la racine du Canvas. Null tant que Render() n'a pas été appelé une première fois.</summary>
        public Transform ScreenRoot => root;
        public DioramaArtPhase LastArtPhase { get; private set; } = DioramaArtPhase.Unknown;
        public int RenderedBuildingCount { get; private set; }
        // ---- test hooks : nav-district (pan+zoom) ---------------------------------------------
        /// <summary>Null pour un palier héros SANS fond réel (repli confiné, rien à borner/faire
        /// suivre) — sinon le composant attaché à DistrictScene pour CE rendu (recréé à chaque
        /// Render(), comme le reste de la scène).</summary>
        public DistrictMapNavigation MapNavigation { get; private set; }
        // ---- test hooks : les 5 bindings lumineux (C9) ---------------------------------------
        /// <summary>Binding 1+2 (§1.5 lignes 1-2) — fenêtres ambre allumées (condition_band == SOUND).</summary>
        public int RenderedWindowLightCount { get; private set; }
        /// <summary>Binding 3 (§1.5 ligne 3) — néons RÉELLEMENT allumés (revenue_band == EARNING) ;
        /// n'inclut PAS l'enseigne "présente mais sombre" (D3) — celle-ci n'émet aucune lumière.</summary>
        public int RenderedNeonGlowCount { get; private set; }
        /// <summary>Binding 4 (§1.5 ligne 4) — fumée d'opération active (activity_band == ACTIVE).</summary>
        public int RenderedSmokeCount { get; private set; }
        /// <summary>Binding 5 (§1.5 ligne 5) — enseigne de maintenance qui grésille.</summary>
        public int RenderedMaintenanceFlickerCount { get; private set; }
        /// <summary>Chaque texte rendu (C8-F3 — le corpus que le garde R2.2 scanne).</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();
        // ---- test hooks : les boucles ambiantes budgétées (C10) ------------------------------
        /// <summary>U-12 (C10-F2, engagement 7) — le nombre de boucles ambiantes RÉELLEMENT
        /// démarrées ce rendu (jamais plus de <see cref="MaxAmbientLoops"/>, quel que soit le
        /// nombre de sources candidates). "cible : le compte à l'exécution" (C10-F2) — un compteur
        /// d'intention ne suffirait pas ; TryStartAmbientLoop attache un composant RÉEL par unité
        /// comptée ici.</summary>
        public int ActiveAmbientLoopCount { get; private set; }
        /// <summary>Le budget lui-même — une PROPRIÉTÉ que le code fait tenir (C10-F2), pas une
        /// intention en prose. Exposé pour que le test ne duplique pas le nombre "4" en dur.</summary>
        public const int MaxAmbientLoops = 4;
        // ---- test hooks : U-11, les marqueurs de lieutenant (C10, D10/§C2-bis) ----------------
        /// <summary>C10-F1 — le nombre de marqueurs de lieutenant RENDUS ce rendu, sommé sur tous les
        /// bâtiments (compte total, pas par bâtiment — les falsifiables qui exigent une répartition
        /// par bâtiment lisent le DTO source directement, comme C9-F2 le fait pour les 5 bindings).
        /// AUCUN budget ne s'applique ici — un marqueur par entrée de `lieutenant_ids`, toujours.</summary>
        public int RenderedLieutenantMarkerCount { get; private set; }

        private CityProjectionsClient projections;
        private bool initialized;
        private Transform mountParent;
        private RectTransform root;

        // W3.U1 C1 (design D2) — le parent de montage que l'AppShell renseigne AVANT Start() (voir
        // CityMapController.mountParent pour le mécanisme byte-identique).
        public void SetMountParent(Transform parent) => mountParent = parent;

        // IShellTenant conformance (B1, hud-session-arbitrages-design.md §1.2) — NO-OP ici : ce
        // contrôleur reçoit son jeton via `SetSession(bearer, districtId)`, appelé par
        // `AppShell.EnterDistrict` (mécanisme PRÉEXISTANT, inchangé) — pas via cette injection
        // générique de `MountTenant<T>` (`EnterDistrict` duplique le corps de `MountTenant<T>` sans
        // appeler la méthode générique elle-même). Rien à sauter ici.
        public void SetToken(string token) { }

        private void Start() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            projections = new CityProjectionsClient { BaseUrl = baseUrl };
        }

        /// <summary>U-14 (D9) — le seam d'injection : le montant fournit le porteur + le district
        /// cible ; cette méthode déclenche le VRAI fetch et ne se signe jamais elle-même.</summary>
        public IEnumerator SetSession(string bearer, int districtId)
        {
            EnsureInitialized();
            LastFetchSucceeded = false;
            LastErrorCode = 0;
            yield return projections.Interior(districtId, bearer,
                dto => { LastFetch = dto; LastFetchSucceeded = true; },
                code => LastErrorCode = code);
        }

        // ============================================================== C8 : le rendu

        /// <summary>U-9/U-15 — construit (ou reconstruit) l'écran pour un payload donné. Public et
        /// indépendant du fetch de SetSession : les falsifiables C8-F2..F5 pilotent des payloads soit
        /// FABRIQUÉS soit RÉ-ÉCRITS sur `day_phase` après un fetch réel — le design le dit lui-même
        /// pour C8-F5 (« nourrie par des payloads fabriqués par le test »). Bâtit sa racine
        /// PARESSEUSEMENT (au premier appel) plutôt qu'à Start()/EnsureInitialized — voir le
        /// commentaire de tête de fichier.</summary>
        public void Render(DistrictInteriorDto dto)
        {
            EnsureInitialized();
            if (root == null) BuildRoot();
            ClearContent();
            renderedTexts.Clear();
            RenderedBuildingCount = 0;
            RenderedWindowLightCount = 0;
            RenderedNeonGlowCount = 0;
            RenderedSmokeCount = 0;
            RenderedMaintenanceFlickerCount = 0;
            ActiveAmbientLoopCount = 0;
            RenderedLieutenantMarkerCount = 0;

            LastArtPhase = ResolveArtPhase(dto.day_phase);
            if (LastArtPhase == DioramaArtPhase.NightHero)
            {
                RenderNightDiorama(dto);
            }
            else if (LastArtPhase == DioramaArtPhase.DayHero)
            {
                RenderDayDiorama(dto);
            }
            else
            {
                RenderNonHeroFallback();
            }
        }

        /// <summary>D8/C8-F5, AMENDÉ (P4 puis JUGE-D1, périmètre écrit par le ⊥/le juge visuel) —
        /// mapping EXPLICITE sur les 4 quarts connus, LES 4 SUR UN PALIER HÉROS : NIGHT et DAY
        /// portent chacun un fond dédié (verge-a, vague 1) ; DAWN et DUSK — 50% du temps de jeu —
        /// N'ONT AUCUN ART DÉDIÉ produit par l'atelier, et REPRENDRE le repli confiné les aurait
        /// laissés sans fond réel la moitié du temps (JUGE Défaut 1, mesuré : `day-phase-quarter.ts`
        /// découpe le jour en 4 quarts ÉGAUX, DAWN et DUSK ne sont PAS des états rares). PIS-ALLER
        /// consigné (implementation-notes.md § Deviations, dette 2 rendus dédiés × N profils) :
        /// DAWN emprunte le fond JOUR (l'aube est le quart qui MÈNE au jour) et DUSK emprunte le
        /// fond NUIT (le crépuscule est le quart qui MÈNE à la nuit) — le rattachement chronologique
        /// le plus défendable entre les deux seuls fonds livrés, jamais un choix arbitraire. Toute
        /// valeur de fil qui n'est AUCUN des 4 quarts connus rend Unknown — jamais silencieusement
        /// confondue avec l'un des 4 quarts NOMMÉS (l'esprit du "résolveur exhaustif sans default"
        /// de D2/D8, transposé à un `switch` sur une chaîne de fil plutôt qu'un enum C#).</summary>
        private static DioramaArtPhase ResolveArtPhase(string dayPhase)
        {
            switch (dayPhase)
            {
                case "NIGHT": return DioramaArtPhase.NightHero;
                case "DUSK": return DioramaArtPhase.NightHero; // pis-aller — pas de fond DUSK dédié (JUGE D1)
                case "DAY": return DioramaArtPhase.DayHero;
                case "DAWN": return DioramaArtPhase.DayHero;   // pis-aller — pas de fond DAWN dédié (JUGE D1)
                default: return DioramaArtPhase.Unknown; // 5e valeur inattendue — jamais avalée par un des 4 quarts nommés
            }
        }

        /// <summary>Le repli DÉCLARÉ d'un `day_phase` INCONNU (aucun des 4 quarts nommés — donnée de
        /// fil malformée ou future 5e valeur, §0/JUGE-D1). Un état NOMMÉ, jamais un rendu vide —
        /// sinon indiscernable d'un bug. Depuis JUGE-D1, les 4 quarts connus rendent TOUS un palier
        /// héros (voir <see cref="ResolveArtPhase"/>) ; ce repli ne couvre plus que l'inconnu.</summary>
        private void RenderNonHeroFallback()
        {
            GameObject panel = NewUI("DayPhaseFallbackPanel", root);
            Stretch((RectTransform)panel.transform, Vector2.zero, Vector2.zero);
            panel.AddComponent<Image>().color = DesignTokens.Current.nightOutOfDistrictMuted;

            // JUGE-D5 (audit visuel, 2026-08-21) — chaîne traduite (était en anglais dans une
            // surface autrement française — ← Carte / ARGENT / JOUR N). Reformulée pour son nouveau
            // périmètre JUGE-D1 : ce repli ne couvre plus DAWN/DAY/DUSK (tous rendent un fond héros
            // désormais), seulement un `day_phase` inconnu.
            TextMeshProUGUI label = NewText("FallbackLabel", panel.transform,
                "Scène indisponible pour ce quart horaire — réessayez plus tard.",
                16, TextAlignmentOptions.Center);
            Stretch((RectTransform)label.transform, new Vector2(24, 24), new Vector2(-24, -24));
            label.color = DesignTokens.Current.onSurfaceSecondary;
            TrackText(label);
        }

        /// <summary>Palier héros NIGHT (D8, engagement 1) — délègue à <see cref="RenderHeroDiorama"/>
        /// avec le mode "nuit". Nom conservé pour ne pas toucher les commentaires/appelants
        /// existants qui le citent (P3, avant que "jour" n'existe).</summary>
        private void RenderNightDiorama(DistrictInteriorDto dto) => RenderHeroDiorama(dto, "nuit");

        /// <summary>Palier héros DAY (P4, périmètre ⊥) — même construction que NIGHT, fond `jour`
        /// à la place du fond `nuit`. Aucun sprite d'état "jour" n'existe (l'atelier n'a livré que
        /// des sprites `_nuit` — vague 1) : les bâtiments restent rendus avec leurs sprites de nuit,
        /// seul le FOND change. Consigné en Deviation (implementation-notes.md § ROUND P4).</summary>
        private void RenderDayDiorama(DistrictInteriorDto dto) => RenderHeroDiorama(dto, "jour");

        /// <summary>L'art héros, PARAMÉTRÉ par mode ("nuit" ou "jour") — P3 : un fond pré-rendu
        /// (DistrictBackgroundSlots, résolution native compensée — pp-F1) porte le sol/rues/ambiant/
        /// ville au loin/brume ; Unity ne dessine plus QUE les bâtiments joueur, ancrés sur le fond
        /// via la carte JSON (pp-F2/F-calage), et leurs calques d'état (C9/C10, inchangés — INDÉPENDANTS
        /// du mode, ils suivent les FAITS du bâtiment, pas l'heure du jour).</summary>
        private void RenderHeroDiorama(DistrictInteriorDto dto, string mode)
        {
            // Titre — construit en PREMIER (inchangé par P3, nav-F5 : le pivot ne touche ni la
            // position ni le mécanisme) mais repoussé en DERNIER sibling de `root` en fin de méthode
            // (nav-district) : la navigation panne/zoome DistrictScene, dont le fond/les bâtiments
            // peuvent désormais visuellement atteindre la bande du titre — repéré par mesure sur
            // `district_v2_starter_kit_4buildings.png` (le "Ver" tronqué). Le titre est du CHROME
            // (comme TopBar/TabBar), il ne doit JAMAIS pouvoir être recouvert par un geste de carte —
            // même mécanisme que la garde "TabBar/TopBar jamais traversés", étendu ici au titre parce
            // que lui seul, contrairement aux deux barres, vit DANS `root`/ContentSlot plutôt que dans
            // le shell (donc PAS protégé par l'ordre de fratrie du shell, AppShell.cs:29-33).
            var playerBuildingLocalPositions = new List<Vector2>();
            // ── Titre du district — cartouche de chrome (2026-08-21) ──────────────────────────────
            // Trois défauts MESURÉS sur la capture de livraison (Assets/Screenshots/
            // vue_principale_batiments_hud.png, 1200×1600), pas trois questions de goût :
            //
            //  (a) ROGNAGE — le titre commençait au pixel 1 : le « V » de « Verge-A » était coupé par
            //      le bord de l'écran. Cause mécanique : ancres étirées 0→1 avec `sizeDelta.x` NUL,
            //      donc la boîte de texte touchait littéralement les deux bords. Le bouton de retour
            //      du chrome, lui, commence à 15px sur la même capture. La marge reprend LA constante
            //      du chrome (`ShellChrome.GutterX`) au lieu d'un 16 recopié : si la
            //      gouttière du HUD bouge, le titre suit — les deux ne peuvent pas diverger en silence.
            //
            //  (b) FONTE — le titre était en sans-serif alors que la DA de ce corpus met les TITRES
            //      d'écran en serif (l'en-tête « LA FAMILLE » du même programme). `hudSerifFont` est
            //      déjà un token, déjà consommé par le HUD, chaîne de repli non vide.
            //
            //  (c) LISIBILITÉ — et c'est le seul des trois qui soit un vrai défaut fonctionnel.
            //      Contraste mesuré du glyphe (238,241,242) contre ce qui passe derrière lui :
            //        · silhouette sombre (34,38,49)  → 13,31:1   (confortable)
            //        · ciel pâle        (150,164,183) →  2,23:1   (SOUS le seuil de 3:1 des grands textes)
            //      Le fond est PEINT et il DÉFILE (pan/zoom/quart du jour/district) : aucune couleur de
            //      texte fixe n'est lisible sur les deux extrêmes — ce n'est pas réglable en changeant
            //      la teinte. L'ombre portée sombre résout la classe entière : elle place autour du
            //      glyphe un halo à 8,29:1 contre ce même ciel pâle, donc le voisinage EFFECTIF du
            //      glyphe cesse de dépendre de l'art. ⚠️ Elle est posée sur un matériau d'INSTANCE
            //      (`fontMaterial`, jamais `fontSharedMaterial`) : sur le partagé, elle contaminerait
            //      TOUS les textes serif du HUD (argent, heure-phase, valeur du manomètre).
            //
            // Aucun nœud ajouté : `DistrictTitle` reste le TextMeshProUGUI lui-même, donc le compte de
            // 3 enfants de root et l'ordre de fratrie (titre en DERNIER, nav-district-F8) sont
            // inchangés, et `anchoredPosition.y` reste byte-identique (nav-F5 le mesure).
            TextMeshProUGUI title = NewText("DistrictTitle", root, dto.name_canonical, 20, TextAlignmentOptions.TopLeft);
            title.font = DesignTokens.Current.hudSerifFont;
            title.characterSpacing = DistrictTitleCharacterSpacing;
            RectTransform titleRt = (RectTransform)title.transform;
            titleRt.anchorMin = new Vector2(0f, 1f);
            titleRt.anchorMax = new Vector2(1f, 1f);
            titleRt.pivot = new Vector2(0.5f, 1f);
            titleRt.sizeDelta = new Vector2(-2f * MafiaCleanCity.Shell.ShellChrome.GutterX, 32);
            titleRt.anchoredPosition = new Vector2(0, -(8f + safeInsetTop));
            title.color = DesignTokens.Current.onSurfacePrimary;
            ApplyTitleShadow(title);
            TrackText(title);

            // scaleFactor LU AU RUNTIME (design §2.1 : "la valeur 0,859375 n'est vraie qu'à 1100×577,
            // jamais en dur") — le MÊME facteur compense le fond ET chaque sprite joueur.
            Canvas canvas = root.GetComponentInParent<Canvas>();
            float scaleFactor = (canvas != null && canvas.scaleFactor > 0f) ? canvas.scaleFactor : 1f;

            // DistrictScene — le SEUL second enfant direct de root (pp-F5 : root.childCount == 2,
            // fixe, quel que soit le nombre de bâtiments — voir le commentaire de tête de fichier).
            GameObject sceneGo = NewUI("DistrictScene", root);
            RectTransform sceneRt = (RectTransform)sceneGo.transform;
            Stretch(sceneRt, Vector2.zero, Vector2.zero);

            GameObject cellsGo;          // le calque des cellules — voir les deux branches ci-dessous
            RectTransform cellsRt;
            DistrictBackgroundSlots bgSlots = DistrictBackgroundSlots.Current;
            DistrictBackgroundSlots.BackgroundEntry bg = bgSlots != null ? bgSlots.Resolve(dto.profile, mode) : null;
            DistrictBackgroundAnchorDto anchorMap = (bg != null && bg.ancre != null)
                ? JsonUtility.FromJson<DistrictBackgroundAnchorDto>(bg.ancre.text)
                : null;

            // nav-district (pan+zoom) — hissé hors du bloc `if` ci-dessous : DistrictMapNavigation a
            // besoin du RectTransform du fond APRÈS la construction des bâtiments (bornes de pan).
            // Reste `null` dans la branche repli (aucun fond réel, §Deviations nav-district #1) —
            // c'est ce qui décide, plus bas, de NE PAS attacher de navigation à un profil sans fond.
            RectTransform fondRt = null;

            if (bg != null && bg.fond != null)
            {
                // JUGE-D2 (audit visuel, 2026-08-21, Défaut 2 — le portrait n'a jamais été exercé) —
                // le fond est TOUJOURS dessiné en pixels écran NATIFS (pp-F1, ci-dessous) : sur tout
                // viewport dont les dimensions dépassent celles du fond (1080×1920), des bandes
                // NUES apparaissaient — mesuré : 0px à 1080×1920 (correspondance exacte), ~379px de
                // hauteur à 1080×2400 (20:9), ~360px de largeur à 1440×3200, TOUJOURS présentes à
                // 1280×720 (historique, ~100px de chaque côté — jamais remarqué faute de backdrop).
                // Un `ClampAxis` qui centre un contenu plus petit que le viewport (déjà le
                // comportement voulu, DistrictMapNavigation.ClampAxis) ne peut PAS, à lui seul,
                // empêcher un vide visible — il fallait un FOND à cette zone, pas un mécanisme de
                // pan de plus. Choix retenu (implementation-notes.md § Deviations, option
                // "complété" plutôt que "mis à l'échelle" — la bit-exactité du fond, certifiée à
                // 1080×1920/1280×720, reste donc INTACTE à TOUTE résolution, aucun état à
                // recertifier) : un backdrop plein-`DistrictScene`, couleur DÉCLARÉE (REUSE du
                // token du repli confiné ci-dessous, R2.3 — jamais une nouvelle couleur inventée),
                // posé EN PREMIER enfant (donc SOUS le fond et tout le reste — ordre de fratrie,
                // jamais un z-index). "Jamais de bandes nues sur du skybox brut" (JUGE) devient
                // "bandes remplies par un panneau désigné", à toute résolution, y compris au(x)
                // palier(s) de dézoom "district entier" (JUGE-D3, DistrictMapNavigation) qui peut
                // laisser voir au-delà du fond sur l'axe non contraignant.
                // ⚠️ CORRIGÉ 2026-08-21 (nav-district-F1 rouge à 1200×1600 : 160 px découverts) :
                // ce panneau était enfant de `sceneRt` — LA MÊME transformation que le pan/zoom
                // déplace. Il partait donc AVEC la scène et cessait de couvrir dès le premier
                // déplacement, ce qui est précisément ce qu'il existe pour empêcher. Il est
                // désormais enfant de `root` (immobile), posé EN PREMIER donc sous la scène :
                // sa couverture devient une propriété STRUCTURELLE, indépendante du pan, du zoom
                // et de la résolution.
                GameObject backdropGo = NewUI("DistrictSceneBackdrop", root);
                backdropGo.transform.SetAsFirstSibling();
                Stretch((RectTransform)backdropGo.transform, Vector2.zero, Vector2.zero);
                Image backdropImg = backdropGo.AddComponent<Image>();
                backdropImg.color = DesignTokens.Current.nightOutOfDistrictMuted;
                backdropImg.raycastTarget = false;

                // pp-F1 — résolution native : sizeDelta = texture/scaleFactor (JAMAIS `rect == tex`
                // — §2.1 : "pp-F1 vérifie rect × scaleFactor == tex, c'était le piège"). Ancré au
                // centre (F-cadre, §2.1 : "il n'y a pas de rescale... le fond est ancré au centre").
                GameObject fondGo = NewUI("DistrictBackgroundImage", sceneRt);
                fondRt = (RectTransform)fondGo.transform;
                fondRt.anchorMin = fondRt.anchorMax = fondRt.pivot = new Vector2(0.5f, 0.5f);
                fondRt.anchoredPosition = Vector2.zero;
                Texture2D tex = bg.fond.texture;
                fondRt.sizeDelta = new Vector2(tex.width, tex.height) / scaleFactor;
                // round 4 (verdict ⊥) — snap explicite au pixel écran entier, voir SnapToScreenPixel.
                SnapToScreenPixel(fondRt);
                Image fondImg = fondGo.AddComponent<Image>();
                fondImg.sprite = bg.fond;
                fondImg.raycastTarget = false; // pp-F6 — le fond est inerte : ni Button ni état.
                // pp-F6 : le fond ne porte AUCUN enfant — bâtiments et calques d'état sont des
                // FRÈRES sous DistrictScene (construits ci-dessous), jamais des enfants de fondGo.

                // ── DistrictCells — le calque des bâtiments, CALQUÉ SUR LE FOND (2026-08-22) ──────
                // Défaut qui l'a rendu nécessaire : le fond fait 1080 de large dans un viewport de
                // 1200, donc deux bandes de 60 px, et du contenu de district y était DESSINÉ —
                // 427 lignes mesurées jusqu'à x=0, dont un marqueur de lieutenant entièrement hors
                // cadre. La garde qui existait (`JugeD2`) est structurellement AVEUGLE à ça : elle
                // prouve que le backdrop est DERRIÈRE et COUVRE, jamais que le premier plan reste
                // DEDANS.
                //
                // Ce nœud recopie EXACTEMENT le rect du fond — y compris son `anchoredPosition` LU
                // APRÈS `SnapToScreenPixel`, jamais un delta recalculé. Le nœud du fond, lui, n'est
                // pas touché : la bit-exactitude du transport est préservée par construction.
                // Le `RectMask2D` est posé plus bas (chunk C3), après que les cellules existent.
                cellsGo = NewUI("DistrictCells", sceneRt);
                cellsRt = (RectTransform)cellsGo.transform;
                cellsRt.anchorMin = cellsRt.anchorMax = cellsRt.pivot = new Vector2(0.5f, 0.5f);
                cellsRt.sizeDelta = fondRt.sizeDelta;
                cellsRt.anchoredPosition = fondRt.anchoredPosition;
            }
            else
            {
                // Repli déclaré — AUCUN fond rendu pour ce profil en vague 1 (§6 : seul verge-a a
                // une scène). PAS de taille native (rien à ancrer au centre) : confiné entre les
                // deux barres, EXACTEMENT comme le titre évite le TopBar (mêmes insets) — jamais un
                // Stretch(0,0) plein-root, qui chevaucherait TopBarSlot/TabBarRoot en bornes brutes
                // (mesuré : root/ContentSlot couvre le MÊME espace que les barres, la non-occlusion
                // du shell tient par l'ORDRE DE FRATRIE, pas par un ContentSlot rétréci —
                // AppShell.cs:29-33). C'est ce qui rend nav-F4 (extension district 3, profil
                // "tidewater", sans fond) VERTE — voir NavigationPlayModeTests.cs.
                // +2px de marge sous l'inset : `safeInsetBottom` seul plaçait le bord bas du repli
                // PILE sur le bord haut de TabBarRoot (mesuré : les deux bornes coïncidaient à
                // -271.71) — un contact exact que Bounds.Intersects() compte comme un chevauchement
                // (intervalle fermé). La marge garantit un écart STRICT, pas un artefact de bord.
                GameObject placeholderGo = NewUI("DistrictBackgroundPlaceholder", sceneRt);
                Stretch((RectTransform)placeholderGo.transform,
                    new Vector2(0f, safeInsetBottom + 2f), new Vector2(0f, -(8f + safeInsetTop + 32f)));
                Image placeholderImg = placeholderGo.AddComponent<Image>();
                placeholderImg.color = DesignTokens.Current.nightOutOfDistrictMuted;
                placeholderImg.raycastTarget = false;

                // Repli : `DistrictCells` existe quand même (le site de construction des cellules
                // n'a pas à connaître de branche), mais en CLONE de DistrictScene et SANS masque —
                // il n'y a aucun rect de fond à découper, donc rien à promettre. Conséquence voulue :
                // son `anchoredPosition` y vaut (0,0), ce qui fait retomber la correction du cadrage
                // ci-dessous sur sa valeur historique PAR LA FORMULE, sans branche.
                cellsGo = NewUI("DistrictCells", sceneRt);
                cellsRt = (RectTransform)cellsGo.transform;
                Stretch(cellsRt, Vector2.zero, Vector2.zero);
            }

            // C8-F2 (amendée, §Deviations) : unité = le bloc, jointure bâtiment→bloc pour situer
            // chaque bâtiment sur SA parcelle. §3 du design : Unity ne dessine plus QUE les
            // bâtiments — plus de silhouette pour les blocs vides (baqués dans le fond).
            var blockByBlockId = new Dictionary<int, DistrictInteriorBlockDto>();
            if (dto.blocks != null)
                foreach (DistrictInteriorBlockDto b in dto.blocks) blockByBlockId[b.block_id] = b;

            if (dto.buildings != null)
            {
                // Tri (y,x) conservé par précaution de profondeur visuelle (héritage de la revue ⊥
                // r4/r5 — deux bâtiments dont les sprites déborderaient l'un sur l'autre restent
                // dessinés arrière→avant) ; aucune falsifiable de ce chunk ne l'exige (les parcelles
                // sont espacées de 6,5 m, §3 — un chevauchement entre DEUX bâtiments joueur est un
                // cas non observé au J0), donc c'est un choix conservateur, pas une propriété testée.
                var ordered = new List<DistrictInteriorBuildingDto>(dto.buildings);
                var blockOf = new Dictionary<DistrictInteriorBuildingDto, DistrictInteriorBlockDto>();
                foreach (DistrictInteriorBuildingDto b in ordered)
                    if (blockByBlockId.TryGetValue(b.block_id, out DistrictInteriorBlockDto blk)) blockOf[b] = blk;
                ordered.Sort((a, b) =>
                {
                    bool ha = blockOf.TryGetValue(a, out DistrictInteriorBlockDto ba);
                    bool hb = blockOf.TryGetValue(b, out DistrictInteriorBlockDto bb);
                    if (!ha || !hb) return 0;
                    return ba.y != bb.y ? ba.y.CompareTo(bb.y) : ba.x.CompareTo(bb.x);
                });

                foreach (DistrictInteriorBuildingDto building in ordered)
                {
                    if (!blockByBlockId.TryGetValue(building.block_id, out DistrictInteriorBlockDto block))
                        continue; // D2 garantit l'appartenance ; défensif.
                    GameObject cell = BuildBuildingCell(cellsRt, block.x, block.y, building, anchorMap, scaleFactor);
                    RenderedBuildingCount++;
                    // `DistrictMapNavigation.Configure` attend ce point dans l'espace de DistrictScene ;
                    // la cellule est désormais relative au centre de `DistrictCells`, c'est-à-dire au
                    // centre du FOND. L'offset entre les deux repères est lu VIVANT sur `cellsRt` —
                    // jamais recopié, jamais une constante. Dans la branche de repli il vaut (0,0) et
                    // la somme retombe sur la valeur historique sans qu'aucune branche ne l'écrive.
                    playerBuildingLocalPositions.Add(
                        cellsRt.anchoredPosition + ((RectTransform)cell.transform).anchoredPosition);
                }
            }

            // nav-district — pièce manquante mesurée (le fond fait 1920px de haut, la fenêtre n'en
            // montre que 720, sans aucun mécanisme de défilement — Tools/district-v2-reimport-
            // implementation-notes.md §6 Défaut 2). Attaché sur DistrictScene lui-même : fond ET
            // bâtiments sont ses enfants directs/indirects, donc "suivent le fond" est une propriété
            // de la HIÉRARCHIE (une similitude 2D appliquée au parent commun), jamais une
            // synchronisation ajoutée après coup — voir DistrictMapNavigation.cs. AUCUNE navigation
            // n'est attachée si ce profil n'a pas de fond réel (fondRt == null, repli confiné,
            // §Deviations nav-district #1) : rien à borner, rien à faire suivre.
            MapNavigation = null;
            if (fondRt != null)
            {
                MapNavigation = sceneGo.AddComponent<DistrictMapNavigation>();
                // Cadrage initial (§ livrable 4) : barycentre des bâtiments du joueur s'il en a,
                // sinon le centre du fond (0,0 local — repli byte-identique à l'historique
                // pré-navigation, jamais un cadrage inventé sans donnée).
                Vector2 initialFocus = Vector2.zero;
                if (playerBuildingLocalPositions.Count > 0)
                {
                    Vector2 sum = Vector2.zero;
                    foreach (Vector2 p in playerBuildingLocalPositions) sum += p;
                    initialFocus = sum / playerBuildingLocalPositions.Count;
                }
                MapNavigation.Configure(fondRt, initialFocus);
            }

            // nav-district — le titre est du CHROME (voir le commentaire au début de cette méthode) :
            // toujours DERNIER sibling de `root`, donc rendu AU-DESSUS de DistrictScene quel que soit
            // ce que la navigation lui fait faire visuellement. root.childCount reste 2 (pp-F5) — cet
            // appel réordonne, ne recompte pas.
            title.transform.SetAsLastSibling();
        }

        // Alphas de COMPOSITE de l'ombre de contact (revue ⊥ r5 (a)) — publics : R2F2 mesure la
        // couleur COMPOSÉE Lerp(sol, socle, SocleCoreAlpha), jamais le token nu (une ombre
        // translucide rendrait sinon la garde verte sur une ombre invisible). Inchangés par P3.
        public const float SocleCoreAlpha = 0.45f;
        public const float SocleMidAlpha = 0.28f;
        public const float SocleOuterAlpha = 0.15f;

        /// <summary>P3 — construit l'ancre d'un bâtiment joueur : un conteneur `Cell_{x}_{y}` (nom
        /// INCHANGÉ, voir le commentaire de tête de fichier) dimensionné sur la taille NATIVE
        /// compensée du sprite lui-même (plus de grille uniforme — l'échelle et la position viennent
        /// du fond, §2.2) et positionné au pixel `pivot_px` lu dans <paramref name="anchorMap"/>
        /// (pp-F2/F-calage) — ou une grille de secours déterministe si ce bloc n'a pas d'ancre
        /// (profil sans fond en vague 1 : voir RenderNightDiorama et implementation-notes.md).</summary>
        private GameObject BuildBuildingCell(RectTransform sceneRt, int x, int y, DistrictInteriorBuildingDto building,
            DistrictBackgroundAnchorDto anchorMap, float scaleFactor)
        {
            BuildingSpriteSlots slots = BuildingSpriteSlots.Current;
            Sprite baseSprite = slots != null ? slots.Resolve(building.operational_type) : null;

            // Taille de l'ancre = taille NATIVE compensée du sprite (pp-F3 : facteur 1,000, le sceau
            // "échelle" r5-r6 transféré ici). Repli défensif à 64px SI Resolve() ne rend rien — table
            // TOTALE (C6-F4) donc en pratique jamais atteint tant que l'asset est chargé.
            Vector2 cellSize = baseSprite != null
                ? new Vector2(baseSprite.rect.width, baseSprite.rect.height) / scaleFactor
                : new Vector2(64f, 64f) / scaleFactor;

            Vector2? pivotLocal = DistrictBackgroundAnchor.PivotLocalForBlock(anchorMap, x, y, scaleFactor);
            // Repli déclaré si ce bloc n'a pas d'ancre — grille de secours DÉTERMINISTE, jamais
            // testée au pixel près (seul verge/district 16 porte pp-F2 — voir implementation-notes.md
            // § Deviations). Elle garde néanmoins C9/C10/lieutenant-markers vivants pour tout profil
            // synthétique de test (ex. "lattice") qui n'a pas de fond en vague 1.
            Vector2 localPos = pivotLocal ?? new Vector2(x * 100f, -y * 100f);

            GameObject cell = NewUI($"Cell_{x}_{y}", sceneRt);
            RectTransform cellRt = (RectTransform)cell.transform;
            cellRt.anchorMin = cellRt.anchorMax = new Vector2(0.5f, 0.5f);
            cellRt.pivot = new Vector2(0.5f, 0f); // bas-centre — §4 : "le pivot bas-centre du sprite s'y pose"
            cellRt.sizeDelta = cellSize;
            cellRt.anchoredPosition = localPos;
            // I2 (round 4, verdict ⊥) — `pivot_px` est fractionnaire (ex. 150.87, 547.45) et
            // PixelToFondLocal divise par scaleFactor sans arrondir : snap explicite au pixel écran
            // entier, MÊME mécanisme que le fond (SnapToScreenPixel), pour que l'ancrage du bâtiment
            // ne réintroduise pas la phase sous-pixel que le fond vient de corriger.
            SnapToScreenPixel(cellRt);

            float cellW = cellSize.x, cellH = cellSize.y;

            // Socle — plinthe/ombre de contact sous le bâtiment (survit au pivot — seul le facteur
            // `k` est retiré, §2.2). Largeur = 70% du FOOTPRINT réel (JUGE-D4, audit visuel
            // 2026-08-21, Défaut 4 — AMENDÉ : était 70% de cellW, la largeur du FICHIER. Pour un
            // sprite dont le contenu opaque ne couvre PAS toute cette largeur (annexe détachée avec
            // un grand vide entre les deux — mesuré sur "usine"/lab — ou une marge basse qui dépasse
            // la bande que Socle occupe — mesuré sur "residentiel3"/cash_safehouse, AUCUNE couverture
            // du tout), le Socle débordait dans le vide et devenait une plaque semi-transparente
            // flottante, screen-aligned, sans rapport avec aucune parcelle — voir
            // BuildingSpriteSlots.FootprintOverride pour les 4 mesures et implementation-notes.md.
            // `footprint.widthPx==0` (type non mesuré) retombe EXACTEMENT sur le calcul historique —
            // cellW porte déjà le repli défensif ci-dessus, offset/marge restent (0,0).
            BuildingSpriteSlots.FootprintOverride footprint = slots != null
                ? slots.ResolveFootprint(building.operational_type)
                : new BuildingSpriteSlots.FootprintOverride();
            float footprintW = footprint.widthPx > 0f ? footprint.widthPx / scaleFactor : cellW;
            float footprintOffsetX = footprint.centerOffsetPx / scaleFactor;
            float footprintBottomMargin = footprint.bottomMarginPx / scaleFactor;

            // Même raison que le sprite ci-dessous : une ombre de contact sous un bâtiment que le
            // fond peint déjà (avec SA propre ombre, cohérente avec la lumière du rendu) ne serait
            // qu'une tache posée à côté de la vraie.
            GameObject socle = NewUI("Socle", cell.transform);
            RectTransform socleRt = (RectTransform)socle.transform;
            socleRt.anchorMin = socleRt.anchorMax = new Vector2(0.5f, 0f);
            socleRt.pivot = new Vector2(0.5f, 0f);
            float socleW = footprintW * 0.7f;
            socleRt.sizeDelta = new Vector2(socleW, cellH * 0.2f);
            // Recentré sur le contenu opaque (footprintOffsetX) et remonté au-dessus de la marge
            // basse vide du fichier (footprintBottomMargin) — les deux valent 0 pour un type non
            // mesuré, byte-identique au Vector2.zero historique.
            socleRt.anchoredPosition = new Vector2(footprintOffsetX, footprintBottomMargin);
            Color socleTeinte = DesignTokens.Current.nightSocle;
            float aCouche1 = SocleOuterAlpha;
            float aCouche2 = 1f - (1f - SocleMidAlpha) / (1f - SocleOuterAlpha);
            float aCouche3 = 1f - (1f - SocleCoreAlpha) / (1f - SocleMidAlpha);
            var bandes = new (string nom, float wFrac, float hFrac, float aCouche)[]
            {
                ("SocleOuter", 1.00f, 1.00f, aCouche1),
                ("SocleMid",   0.72f, 0.80f, aCouche2),
                ("SocleCore",  0.45f, 0.60f, aCouche3),
            };
            foreach (var bande in bandes)
            {
                GameObject go = NewUI(bande.nom, socle.transform);
                RectTransform brt = (RectTransform)go.transform;
                brt.anchorMin = brt.anchorMax = new Vector2(0.5f, 0f);
                brt.pivot = new Vector2(0.5f, 0f);
                brt.sizeDelta = new Vector2(socleW * bande.wFrac, cellH * 0.2f * bande.hFrac);
                brt.anchoredPosition = Vector2.zero;
                Image bimg = go.AddComponent<Image>();
                bimg.color = new Color(socleTeinte.r, socleTeinte.g, socleTeinte.b, bande.aCouche);
                bimg.raycastTarget = false;
                bimg.enabled = !FondPorteDejaLesBatiments;  // le fond peint déjà SON ombre
            }

            // Sprite — pp-F3 : ZÉRO rescale, remplit SA propre ancre exactement (Cell est
            // dimensionnée sur le sprite lui-même) : le pivot bas-centre du sprite tombe donc PILE
            // sur pivot_px (§4), sans le décalage vertical `CellSize*0.18f` de l'ancien k.
            GameObject spriteGo = NewUI("BuildingSprite", cell.transform);
            RectTransform spriteRt = (RectTransform)spriteGo.transform;
            Image spriteImg = spriteGo.AddComponent<Image>();
            // ⛔ ARBITRAGE USER (2026-08-22) — « tout doit être construit, on n'est pas un city
            // builder », et plus tôt dans le même chantier : « garder la ville intacte, le sprite du
            // joueur se pose PAR-DESSUS le bâtiment existant ».
            //
            // Le fond livré porte désormais le rendu COMPLET du district (bâtiments présents), et non
            // plus la « plaque » dont `parcelles.py` avait retiré tout volume couvrant une parcelle.
            // Le bâtiment d'une parcelle est donc DÉJÀ peint, avec la bonne lumière, la bonne ombre
            // et le bon point de vue. Redessiner par-dessus un sprite re-rendu produisait deux
            // bâtiments au même endroit — mesuré : 7,26 % de la zone de jeu différait du fond, tout
            // entier concentré sur les 4 bâtiments du kit de départ.
            //
            // Ce que Unity dessine ici n'est donc plus le BÂTIMENT mais ce qui le qualifie :
            // possession, état, affectation de lieutenant. Le nœud reste en place (les gardes
            // structurelles le cherchent, et les calques d'état s'y accrochent) ; c'est son IMAGE
            // qui s'efface.
            spriteImg.enabled = !FondPorteDejaLesBatiments;
            if (baseSprite != null)
            {
                spriteImg.sprite = baseSprite;
                Stretch(spriteRt, Vector2.zero, Vector2.zero); // == Cell exactement (facteur 1,000, pp-F3)
            }
            else
            {
                Stretch(spriteRt, new Vector2(3, 3), new Vector2(-3, -3));
                spriteImg.preserveAspect = true;
            }

            // Libellé — quand l'art manque OU quand le sprite est le REPLI partagé (revue ⊥ r5,
            // IMPORTANT) : Resolve ne rend JAMAIS null (table totale C6-F4), donc la branche null
            // seule était morte, et 6 types tombant sur fallback rendaient le même sprite sans
            // aucun discriminant. Le libellé est le discriminant du repli. Inchangé par P3.
            if (baseSprite == null || (slots != null && baseSprite == slots.fallback))
            {
                TextMeshProUGUI label = NewText("TypeLabel", cell.transform, TypeLabel(building.operational_type),
                    9, TextAlignmentOptions.Bottom);
                RectTransform labelRt = (RectTransform)label.transform;
                labelRt.anchorMin = new Vector2(0f, 0f);
                labelRt.anchorMax = new Vector2(1f, 0f);
                labelRt.pivot = new Vector2(0.5f, 0f);
                labelRt.sizeDelta = new Vector2(0, cellH * 0.2f);
                labelRt.anchoredPosition = Vector2.zero;
                label.color = DesignTokens.Current.onSurfacePrimary;
                TrackText(label);
            }

            // C9 (§3, §1.5 — U-10) : les 5 bindings lumineux. C10 (D10/§C2-bis) : les marqueurs de
            // lieutenant. INCHANGÉS par P3 — aucune des deux familles de falsifiables ne référence
            // CellSize/GridArea, seuls les comptes et l'appariement par nom `Cell_x_y` comptent.
            // Les 4 mesures d'empreinte suivent : depuis que le fond porte les bâtiments, ces
            // bindings ne peignent plus SUR le bâtiment, ils posent une pastille sur son badge — et
            // un badge s'aligne sur le BÂTIMENT, pas sur le rectangle de son fichier de sprite.
            BuildWindowLight(cell.transform, building, footprintW, footprintOffsetX, footprintBottomMargin, cellH);
            BuildRevenueSign(cell.transform, building, footprintW, footprintOffsetX, footprintBottomMargin, cellH);
            BuildActivitySmoke(cell.transform, building, footprintW, footprintOffsetX, footprintBottomMargin, cellH);
            BuildMaintenanceFlicker(cell.transform, building, footprintW, footprintOffsetX, footprintBottomMargin, cellH);
            // Les 4 mesures d'empreinte sont passées : un marqueur s'aligne sur le BÂTIMENT, pas sur
            // le rectangle de son fichier de sprite (voir BuildLieutenantMarkers).
            BuildLieutenantMarkers(cell.transform, building,
                footprintW, footprintOffsetX, footprintBottomMargin, cellH);  // U-11 (C10-F1, D10)
            return cell;
        }

        /// <summary>Bindings 1+2 (§1.5 lignes 1-2) — la fenêtre ambre. Binding 1 (possédé) : TOUT
        /// bâtiment reçu EST possédé (prémisse §2 — `buildings[]` ne porte que les bâtiments du
        /// joueur), donc le fait qui commande cette lumière est la simple PRÉSENCE de l'entrée —
        /// déjà garantie par l'appelant (`BuildBuildingCell` n'est jamais invoquée pour un bloc non
        /// possédé). Binding 2 (raid/saisie, "fenêtres éteintes") : `condition_band !=
        /// SOUND` ÉTEINT la lumière — §1.1a/D3 : la colonne qui porte le raid est
        /// `building_operational_state.structural_state` (`condition_band`), JAMAIS `shell_state`
        /// (invariant en production aujourd'hui, D2 v2 MINOR R9).</summary>
        private static Material additiveMat;
        private static Material AdditiveMat
        {
            get
            {
                if (additiveMat == null) additiveMat = Resources.Load<Material>("UIAdditive");
                return additiveMat;
            }
        }

        /// <summary>Revue ⊥ 2026-08-20 (BLOCKING 3) — un calque lumineux de l'atelier, aligné pixel à
        /// pixel sur le rect du sprite de base (les couches sont recadrées ENSEMBLE par sprites_post),
        /// en blend additif. Rend null si le calque manque pour ce type — l'appelant garde alors son
        /// rendu de repli (rectangle token), jamais un trou silencieux. P3 : remplit SA cellule
        /// exactement (plus de `k` — la cellule EST déjà la taille native compensée du sprite de
        /// base, et les calques sont recadrés pixel-à-pixel sur ce même sprite).</summary>
        // ── Le badge de possession et ses pastilles d'état (2026-08-22) ───────────────────────────
        //
        // POURQUOI ce dispositif remplace les couches d'art. Le fond porte désormais les bâtiments
        // (`FondPorteDejaLesBatiments`). Les quatre bindings d'état étaient des calques recadrés
        // PIXEL À PIXEL sur le sprite de base : sans ce sprite, le calque additif pose un VOILE BLANC
        // sur le bâtiment que le rendu a peint (+38/+33/+29 de R/G/B, mesuré), et sa branche de repli
        // pose un APLAT ORANGE en plein ciel — j'ai vu les deux sur la capture.
        //
        // ★ Ce qui NE change PAS, et c'est le point : le FAIT reste compté. Le commentaire de
        // `BuildWindowLight` l'avait écrit d'avance — « C9-F2 mesure l'ÉGALITÉ fait↔compte, jamais la
        // présence d'un objet précis ». Les compteurs (`RenderedWindowLightCount`, `RenderedNeonGlow
        // Count`, `RenderedSmokeCount`…) sont la propriété ; le dessin est libre. Ces bindings
        // changent donc de SUPPORT, pas de sémantique.
        //
        // ★★ Et le badge comble un manque que l'ancien dispositif masquait : un bâtiment POSSÉDÉ
        // n'était identifiable que par sa lumière, donc un bâtiment possédé, en mauvais état et
        // inactif était indiscernable des 55 bâtiments d'ambiance du rendu. Le badge est posé pour
        // TOUT bâtiment reçu — `buildings[]` ne porte que ceux du joueur (prémisse §2).
        private const float BadgeDiametreMinPx = 12f;
        private const float BadgeDiametreMaxPx = 22f;
        private const int BadgeTextureResPx = 64;

        /// <summary>Le badge de la cellule, créé au premier besoin. Placé sur l'EMPREINTE mesurée du
        /// bâtiment (mêmes valeurs que le socle et les marqueurs de lieutenant), au-dessus de la
        /// rangée de lieutenants pour ne pas la recouvrir.</summary>
        private RectTransform EnsureOwnershipBadge(Transform cell, float footprintW, float footprintOffsetX,
            float footprintBottomMargin, float cellH)
        {
            Transform deja = cell.Find("OwnershipBadge");
            if (deja != null) return (RectTransform)deja;

            float d = Mathf.Clamp(footprintW * 0.10f, BadgeDiametreMinPx, BadgeDiametreMaxPx);
            GameObject go = NewUI("OwnershipBadge", cell);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0f);
            rt.pivot = new Vector2(0.5f, 0f);
            rt.sizeDelta = new Vector2(d, d);
            // Au-dessus de la rangée de lieutenants (elle occupe `socleH` + son propre diamètre).
            rt.anchoredPosition = new Vector2(footprintOffsetX,
                footprintBottomMargin + cellH * 0.2f + MarqueurDiametreMaxPx * 1.15f);

            // Même composition que le médaillon de lieutenant et que celui du bandeau : disque
            // sombre, anneau laiton. Texture générée GRANDE et affichée petite — un disque généré à
            // sa taille d'affichage rend un blob anguleux (défaut payé par le manomètre,
            // `TopBarController.cs:829-833`).
            Image disque = go.AddComponent<Image>();
            disque.sprite = ProceduralUI.RadialDisc(BadgeTextureResPx,
                DesignTokens.Current.hudGaugeFaceInner, DesignTokens.Current.hudGaugeFaceOuter);
            disque.color = Color.white;
            disque.raycastTarget = false;

            GameObject anneauGo = NewUI("BadgeAnneau", go.transform);
            Stretch((RectTransform)anneauGo.transform, Vector2.zero, Vector2.zero);
            Image anneau = anneauGo.AddComponent<Image>();
            anneau.sprite = ProceduralUI.Ring(BadgeTextureResPx, BadgeTextureResPx * 0.11f,
                DesignTokens.Current.hudHairlineGold);
            anneau.color = Color.white;
            anneau.raycastTarget = false;
            return rt;
        }

        /// <summary>Une pastille d'état sur le badge. `rang` la place sur un petit arc autour du
        /// disque, pour que deux états simultanés restent DEUX objets distincts — même exigence que
        /// les marqueurs de lieutenant (C10-F1 : jamais confondus en un seul).</summary>
        private void BuildStatePip(Transform cell, string nom, int rang, Color teinte,
            float footprintW, float footprintOffsetX, float footprintBottomMargin, float cellH)
        {
            RectTransform badge = EnsureOwnershipBadge(cell, footprintW, footprintOffsetX,
                footprintBottomMargin, cellH);
            float d = badge.sizeDelta.x;
            GameObject go = NewUI(nom, badge);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = rt.pivot = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(d * 0.30f, d * 0.30f);
            // 4 positions cardinales : haut, droite, bas, gauche — déterministes par rang.
            float r = d * 0.42f;
            float a = Mathf.PI * 0.5f * rang + Mathf.PI * 0.5f;
            rt.anchoredPosition = new Vector2(Mathf.Cos(a) * r, Mathf.Sin(a) * r);
            Image img = go.AddComponent<Image>();
            img.sprite = ProceduralUI.RadialDisc(BadgeTextureResPx, teinte, teinte);
            img.color = Color.white;
            img.raycastTarget = false;
        }

        private Image TryBuildOverlay(Transform cell, string name, string opType, string couche, Color tint)
        {
            BuildingSpriteSlots slots = BuildingSpriteSlots.Current;
            Sprite ov = slots != null ? slots.ResolveOverlay(opType, couche) : null;
            if (ov == null || AdditiveMat == null) return null;
            GameObject go = NewUI(name, cell);
            RectTransform rt = (RectTransform)go.transform;
            Stretch(rt, Vector2.zero, Vector2.zero);
            Image img = go.AddComponent<Image>();
            img.sprite = ov;
            img.material = AdditiveMat;
            img.color = tint;
            img.raycastTarget = false;
            return img;
        }

        // nav-district (mesure demandée, artefact de la capture starter kit) — deux gabarits
        // (`lab`←usine, `stash`←entrepot) n'ont JAMAIS eu de calque "fen" produit par l'atelier :
        // leurs seuls états livrés sont `base`/`actif` (0 fichier `_fen` dans
        // Assets/Art/District/Sprites/, mesuré). Leur art de BASE bake déjà l'éclairage (vérifié
        // visuellement — le rez-de-chaussée d'`usine_nuit_base` est chaud/éclairé dans le fichier
        // lui-même). Le repli générique ci-dessous (rectangle plein `nightWindowLit`) viole la
        // doctrine ratifiée (l'or jamais en aplat) ET double une information déjà portée par l'art
        // — décision prise (correctif dont la bonne réponse est lisible dans le code/l'art/la
        // doctrine, ne remonte pas à l'user). Un ancien câblage aliasait `fen := actif` pour ces
        // deux gabarits (un contournement déjà consigné comme défaut latent) ; le nuller
        // (BuildingSpriteSlots.asset, correctif du fantôme dupliqué) a démasqué ce repli plutôt que
        // de le créer. Dette consignée : un vrai état "fenêtres" pour ces deux gabarits se RENDRAIT
        // à l'atelier (sprites_batch.py n'a pas d'état `fen` pour eux), jamais bricolé ici — même
        // famille que le précédent `laverie` de ce dépôt.
        private static readonly HashSet<string> BakedLightingTemplates = new HashSet<string> { "lab", "stash" };

        private void BuildWindowLight(Transform cell, DistrictInteriorBuildingDto building,
            float footprintW, float footprintOffsetX, float footprintBottomMargin, float cellH)
        {
            if (building.condition_band != "SOUND") return; // éteinte — aucune lumière décorative (C9-F2)
            if (FondPorteDejaLesBatiments)
            {
                BuildStatePip(cell, "WindowLight", 0, DesignTokens.Current.nightWindowLit,
                    footprintW, footprintOffsetX, footprintBottomMargin, cellH);
                RenderedWindowLightCount++;
                return;
            }
            Image ov = TryBuildOverlay(cell, "WindowLight", building.operational_type, "fen", Color.white);
            if (ov == null && !BakedLightingTemplates.Contains(building.operational_type))
            {
                GameObject light = NewUI("WindowLight", cell);
                RectTransform rt = (RectTransform)light.transform;
                rt.anchorMin = new Vector2(0.2f, 0.55f);
                rt.anchorMax = new Vector2(0.8f, 0.75f);
                rt.offsetMin = rt.offsetMax = Vector2.zero;
                light.AddComponent<Image>().color = DesignTokens.Current.nightWindowLit;
            }
            // Le FAIT (binding 1+2 : possédé, condition SOUND) reste compté que la représentation
            // soit un calque texturé, le repli rectangle, OU l'art de base déjà éclairé — C9-F2
            // (DistrictInteriorLightingPlayModeTests) mesure l'ÉGALITÉ fait↔compte, jamais la
            // présence d'un objet précis ; changer ÇA romprait 3 falsifiables scellées pour un motif
            // sans rapport (comment le fait est DESSINÉ, pas s'il est VRAI).
            RenderedWindowLightCount++;
        }

        /// <summary>Binding 3 (§1.5 ligne 3, D3) — l'enseigne "ça rapporte". Les TROIS états prescrits
        /// par D3, exactement : néon allumé (`revenue_band == EARNING`) ; enseigne présente mais
        /// SOMBRE (`revenue_chain == WIRED` et `revenue_band == IDLE`) ; pas d'enseigne du tout
        /// (`revenue_chain == UNWIRED` — "le bâtiment lit comme un local occupé, pas comme un commerce
        /// éteint", D3). Seul le premier état compte comme une SOURCE lumineuse (C9-F2/F3 : "néon
        /// rendu" == binding 3 qui commande une lumière, pas une enseigne simplement présente).</summary>
        private void BuildRevenueSign(Transform cell, DistrictInteriorBuildingDto building,
            float footprintW, float footprintOffsetX, float footprintBottomMargin, float cellH)
        {
            if (building.revenue_chain != "WIRED") return; // pas d'enseigne du tout (D3)
            bool earning = building.revenue_band == "EARNING";
            // Revue ⊥ (BLOCKING 3 + IMPORTANT 9) : le calque neon de l'atelier porte la vraie lumière
            // (blanc chaud + halo) ; la teinte n'est plus qu'une INTENSITÉ — pleine si EARNING, blend
            // vers nightBase si IDLE (REUSE du patron FloorTint historique, R2.3).
            Color tint = earning ? Color.white : Color.Lerp(Color.white, DesignTokens.Current.nightBase, 0.75f);
            if (FondPorteDejaLesBatiments)
            {
                // La pastille n'existe QUE pour l'enseigne allumée : une enseigne présente mais sombre
                // est une ABSENCE de signal, et un badge n'a pas de place pour dire « rien ». Le
                // compteur suit la même règle qu'avant (seul EARNING est une source, C9-F2/F3).
                if (earning)
                {
                    BuildStatePip(cell, "RevenueSign", 1, DesignTokens.Current.nightNeonGlow,
                        footprintW, footprintOffsetX, footprintBottomMargin, cellH);
                    RenderedNeonGlowCount++;
                    TryStartAmbientLoop(cell.Find("OwnershipBadge/RevenueSign").gameObject);
                }
                return;
            }
            Image ov = TryBuildOverlay(cell, "RevenueSign", building.operational_type, "neon", tint);
            GameObject signGo;
            if (ov != null) signGo = ov.gameObject;
            else
            {
                signGo = NewUI("RevenueSign", cell);
                RectTransform rt = (RectTransform)signGo.transform;
                rt.anchorMin = new Vector2(0.05f, 0.78f);
                rt.anchorMax = new Vector2(0.35f, 0.92f);
                rt.offsetMin = rt.offsetMax = Vector2.zero;
                signGo.AddComponent<Image>().color = earning
                    ? DesignTokens.Current.nightNeonGlow
                    : Color.Lerp(DesignTokens.Current.nightNeonGlow, DesignTokens.Current.nightBase, 0.7f);
            }
            if (earning)
            {
                RenderedNeonGlowCount++;
                TryStartAmbientLoop(signGo); // C10-F2 — candidat : néon RÉELLEMENT allumé, pas l'enseigne sombre
            }
        }

        /// <summary>Binding 4 (§1.5 ligne 4) — la fumée "op active". `activity_band == ACTIVE` seul
        /// commande cette lumière (D2 v2 MAJOR R4 : `IDLE` est le défaut honnête pour tout bâtiment, y
        /// compris les 6 types qui ne peuvent JAMAIS opérer).</summary>
        private void BuildActivitySmoke(Transform cell, DistrictInteriorBuildingDto building,
            float footprintW, float footprintOffsetX, float footprintBottomMargin, float cellH)
        {
            if (building.activity_band != "ACTIVE") return;
            if (FondPorteDejaLesBatiments)
            {
                BuildStatePip(cell, "ActivitySmoke", 2, DesignTokens.Current.nightSmoke,
                    footprintW, footprintOffsetX, footprintBottomMargin, cellH);
                RenderedSmokeCount++;
                TryStartAmbientLoop(cell.Find("OwnershipBadge/ActivitySmoke").gameObject);
                return;
            }
            Image ov = TryBuildOverlay(cell, "ActivitySmoke", building.operational_type, "actif", Color.white);
            GameObject smoke;
            if (ov != null) smoke = ov.gameObject;
            else
            {
                smoke = NewUI("ActivitySmoke", cell);
                RectTransform rt = (RectTransform)smoke.transform;
                rt.anchorMin = new Vector2(0.35f, 0.82f);
                rt.anchorMax = new Vector2(0.65f, 1.05f);
                rt.offsetMin = rt.offsetMax = Vector2.zero;
                Image img = smoke.AddComponent<Image>();
                img.color = DesignTokens.Current.nightSmoke;
                img.raycastTarget = false;
            }
            RenderedSmokeCount++;
            TryStartAmbientLoop(smoke); // C10-F2 — candidat : opération active
        }

        /// <summary>Binding 5 (§1.5 ligne 5) — l'enseigne qui grésille, "maintenance en retard".
        /// Combine les DEUX clés que le DTO porte pour "binding 5" (D2 — `lapse_phase_bucket` ET
        /// `maintenance_in_progress`) plutôt que de laisser la seconde sans consommateur (socle : un
        /// champ sans consommateur ne survit pas) : le grésillement signale une dette EN RETARD ET NON
        /// PRISE EN CHARGE — dès qu'une réparation est en cours, l'alarme s'éteint, même si la phase
        /// n'a pas encore rattrapé son retard. Mécanisme non prescrit par le design au-delà du nom du
        /// champ — voir Tools/w3u2-c9-notes.md § Deviations pour la mesure qui fonde ce choix (imprévu
        /// non bloquant, option conservatrice : un seul état binaire, jamais un 3ᵉ palier inventé sans
        /// token pour le porter).</summary>
        private void BuildMaintenanceFlicker(Transform cell, DistrictInteriorBuildingDto building,
            float footprintW, float footprintOffsetX, float footprintBottomMargin, float cellH)
        {
            bool overdue = building.lapse_phase_bucket != "WITHIN_WINDOW";
            if (!overdue || building.maintenance_in_progress) return;
            if (FondPorteDejaLesBatiments)
            {
                BuildStatePip(cell, "MaintenanceFlicker", 3, DesignTokens.Current.accentWarning,
                    footprintW, footprintOffsetX, footprintBottomMargin, cellH);
                RenderedMaintenanceFlickerCount++;   // le FAIT se compte, quelle que soit sa forme
                TryStartAmbientLoop(cell.Find("OwnershipBadge/MaintenanceFlicker").gameObject);
                return;
            }
            GameObject flicker = NewUI("MaintenanceFlicker", cell);
            RectTransform rt = (RectTransform)flicker.transform;
            rt.anchorMin = new Vector2(0.7f, 0.78f);
            rt.anchorMax = new Vector2(0.95f, 0.92f);
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            // REUSE d'un token de base déjà asset-backed (R2.3) — aucun token de nuit dédié n'a été
            // ajouté pour ce binding en C5 (DesignTokens.cs "District Night" n'en porte que 4).
            flicker.AddComponent<Image>().color = DesignTokens.Current.accentWarning;
            RenderedMaintenanceFlickerCount++;
            TryStartAmbientLoop(flicker); // C10-F2 — candidat : dette de maintenance en retard
        }

        /// <summary>U-11 (C10-F1, D10/§C2-bis) — un marqueur PAR ENTRÉE de `lieutenant_ids`, jamais un
        /// marqueur par bâtiment : le J0 affecte 2 lieutenants au MÊME bâtiment (prémisse §3, re-mesurée
        /// par D10) — c'est le cas dégénéré que la falsifiable dimensionne, et un rendu "1 marqueur si
        /// au moins 1 affecté" y échouerait. AUCUN budget (contrairement à TryStartAmbientLoop) — la
        /// clé porte déjà l'exhaustivité de l'affectation (D10 : `[]` jamais `null`), donc le compte
        /// rendu doit égaler EXACTEMENT `lieutenant_ids.Length`, pour chaque bâtiment. Défensif contre
        /// un null (JsonUtility peut laisser le champ à sa valeur par défaut C# si absent du JSON, même
        /// si le back garantit `[]` — jamais planter sur un payload malformé).</summary>
        /// <summary>Bornes du médaillon d'un marqueur. Un marqueur est une AFFORDANCE : il dit
        /// « un lieutenant est affecté ici ». Sa taille suit donc la lisibilité, pas la taille du
        /// bâtiment — sans borne, un gros bâtiment en obtenait un pavé et un petit un confetti.</summary>
        /// <summary>Le fond pré-rendu porte-t-il DÉJÀ les bâtiments de parcelle ?
        ///
        /// Depuis le 2026-08-22 : OUI. Le fond livré est le rendu COMPLET du district, plus la
        /// « plaque » dont l'atelier retirait tout volume couvrant une parcelle. Conséquence directe
        /// du ruling user « tout doit être construit, on n'est pas un city builder » — et de
        /// l'arbitrage plus ancien du même chantier, « garder la ville intacte, le sprite du joueur
        /// se pose par-dessus le bâtiment existant ».
        ///
        /// Ce drapeau est une CONSTANTE et pas un réglage : il décrit une propriété de l'art livré,
        /// pas un choix d'exécution. Le jour où un profil de district reviendrait à une plaque, c'est
        /// l'art qui changerait, et cette constante avec — délibérément visible, à un seul endroit,
        /// plutôt que dispersée en `if` dans le corps du rendu.</summary>
        private const bool FondPorteDejaLesBatiments = true;

        private const float MarqueurDiametreMinPx = 14f;
        private const float MarqueurDiametreMaxPx = 26f;
        /// <summary>Résolution INTERNE des textures du médaillon — délibérément supérieure au
        /// diamètre affiché (14 à 26 px). Voir le commentaire au site d'usage : générer à la taille
        /// affichée rend un blob anguleux, défaut déjà payé par le manomètre du bandeau.</summary>
        private const int MarqueurTextureResPx = 64;

        /// <summary>La silhouette du médaillon (le fedora de la maquette « LA FAMILLE »), chargée
        /// PARESSEUSEMENT et mise en cache.
        ///
        /// ⚠️ Le chargement ne doit JAMAIS partir d'un initialiseur statique : `Resources.Load` jette
        /// en contexte de constructeur, et ce dépôt a déjà payé ce défaut (65 `static readonly Color`
        /// convertis en propriétés le 2026-08-20 — VERTS en run complet parce qu'un test antérieur
        /// chauffait le cache, ROUGES en run scopé à froid). Ici : appel depuis une méthode d'instance,
        /// et un ABSENT est traité comme un absent, pas comme une erreur.</summary>
        private static Sprite busteLieutenantCache;
        private static bool busteLieutenantCherche;
        private static Sprite BusteLieutenant()
        {
            if (busteLieutenantCherche) return busteLieutenantCache;
            busteLieutenantCherche = true;
            busteLieutenantCache = Resources.Load<Sprite>("Lieutenant/ui_element_buste_fedora");
            return busteLieutenantCache;
        }

        private void BuildLieutenantMarkers(Transform cell, DistrictInteriorBuildingDto building,
            float footprintW, float footprintOffsetX, float footprintBottomMargin, float cellH)
        {
            if (building.lieutenant_ids == null) return;
            int n = building.lieutenant_ids.Length;
            if (n == 0) return;

            // ⛔ RÉÉCRIT LE 2026-08-22 — LES MARQUEURS SORTAIENT DE L'ÉCRAN.
            //
            // L'ancienne mise en page les posait en fractions de la CELLULE, alignés à GAUCHE :
            // `xMin = 0,04 + i × 0,14`. Or la cellule fait la largeur du FICHIER de sprite, pas celle
            // du bâtiment : pour le lab (un sprite de 29,7 m sur une parcelle de 6,5 m), l'origine à
            // 4 % de la cellule tombe très à gauche de la parcelle. Sur un bâtiment au bord ouest du
            // district, ça met le premier marqueur ENTIÈREMENT hors du fond. Mesuré par C10-F3 sur le
            // monde J0 réel : `LieutenantMarker_0` à **165,5 px** au-delà du bord gauche du fond, et
            // le second rogné — un juge visuel n'en voyait qu'UN, large de 68 px là où il en fait 85.
            //
            // ★ Et les trois falsifiables qui existaient étaient VERTES pendant ce temps : elles
            // comptent des nœuds (« 2 affectations ⇒ 2 marqueurs »), aucune ne regardait OÙ ils
            // atterrissent. Même famille que l'aiguille inversée corrigée la veille.
            //
            // La correction ne consiste pas à recentrer sur la cellule : c'est de s'aligner sur
            // l'EMPREINTE RÉELLE du bâtiment — `footprintW`/`footprintOffsetX`, les mêmes valeurs
            // MESURÉES par type que le socle utilise déjà (`BuildingSpriteSlots.FootprintOverride`).
            // Un marqueur appartient au bâtiment, pas au rectangle de son fichier.
            const float largeurRelative = 0.12f, ecartRelatif = 0.02f;
            float marqueurW = footprintW * largeurRelative;
            float ecart = footprintW * ecartRelatif;
            float rangeeW = n * marqueurW + (n - 1) * ecart;
            // Un bâtiment très peuplé ne doit pas voir sa rangée déborder de sa PROPRE empreinte :
            // on rétrécit plutôt que de sortir. Sans ce garde-fou, le défaut reviendrait à
            // `n >= 8` — un cran plus bas, comme un correctif qui reproduit son défaut.
            if (rangeeW > footprintW && rangeeW > 0f)
            {
                float k = footprintW / rangeeW;
                marqueurW *= k; ecart *= k; rangeeW = footprintW;
            }
            // Un marqueur est une AFFORDANCE, pas de l'art : sa taille ne doit pas suivre celle du
            // bâtiment. Sans borne, le lab (empreinte large) en obtenait deux pavés de ~65px, ce que
            // la capture montrait comme deux rectangles flottants. Bornes choisies pour rester
            // lisibles au zoom ×1 sans écraser un petit bâtiment.
            marqueurW = Mathf.Clamp(marqueurW, MarqueurDiametreMinPx, MarqueurDiametreMaxPx);
            ecart = marqueurW * 0.25f;
            rangeeW = n * marqueurW + (n - 1) * ecart;
            float socleH = cellH * 0.2f;   // REUSE — la hauteur que `Socle` occupe juste en dessous

            for (int i = 0; i < n; i++)
            {
                GameObject marker = NewUI($"LieutenantMarker_{i}", cell);
                RectTransform rt = (RectTransform)marker.transform;
                // Rangée CENTRÉE sur l'empreinte, posée juste au-dessus de l'ombre de contact.
                // Décalés par index pour rester VISUELLEMENT distincts (2 marqueurs sur le MÊME
                // bâtiment, C10-F1, ne doivent jamais se confondre en un seul).
                rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0f);
                rt.pivot = new Vector2(0.5f, 0f);
                rt.sizeDelta = new Vector2(marqueurW, marqueurW);   // CARRÉ : c'est un médaillon
                float xCentre = footprintOffsetX - rangeeW * 0.5f + i * (marqueurW + ecart) + marqueurW * 0.5f;
                rt.anchoredPosition = new Vector2(xCentre, footprintBottomMargin + socleH);
                // ── L'APPARENCE (ruling user « fais mieux », 2026-08-22) ──────────────────────────
                // C'était un APLAT rectangulaire opaque. Deux d'entre eux, posés sur un bâtiment
                // peint, lisaient comme un défaut d'affichage — et ne disaient rien de ce qu'ils
                // signifient. La DA de ce programme a déjà son signe pour « un lieutenant est ici » :
                // le médaillon à silhouette de fedora de la maquette « LA FAMILLE », dont les bustes
                // sont DÉJÀ importés et vérifiés dans le dépôt (`Assets/Resources/Lieutenant/`).
                // Composition, du fond vers l'avant, exactement celle du médaillon du bandeau :
                // disque sombre → anneau laiton → silhouette. REUSE de `ProceduralUI` (descendu dans
                // ShellContracts pour ça) et des tokens existants — aucun token neuf.
                // ⚠️ La texture est générée à `MarqueurTextureResPx`, PAS au diamètre affiché.
                // `ProceduralUI.RadialDisc` produit une texture à la résolution EXACTE qu'on lui
                // demande : un disque de 20 texels n'a quasiment aucune marge d'anti-crénelage et
                // rend un blob anguleux. Le manomètre du bandeau a payé ce défaut et le contourne de
                // la même façon (`TopBarController.cs:829-833`, `NeedleCenterDotTextureResPx = 32`) —
                // générer GRAND, afficher petit. Le `RectTransform` garde la taille affichée.
                Image disque = marker.AddComponent<Image>();
                disque.sprite = ProceduralUI.RadialDisc(MarqueurTextureResPx,
                    DesignTokens.Current.hudGaugeFaceInner,   // REUSE — la face de médaillon de la
                    DesignTokens.Current.hudGaugeFaceOuter);  // doctrine (#2c3242 → #0a0e16), SOMBRE
                disque.color = Color.white;   // la teinte vit dans le sprite, pas dans un multiply
                disque.raycastTarget = false;

                // ★ Pourquoi une face SOMBRE et pas la teinte historique du marqueur : la silhouette
                // se pose DESSUS. Une face claire (l'ancien `nightLieutenantMarker`, beige) sous une
                // silhouette crème ne laisse rien voir — mesuré sur la capture, le médaillon rendait
                // un halo sans forme. Le signe distinctif est porté par l'ANNEAU laiton, pas par le
                // fond ; c'est exactement la composition du médaillon du bandeau.
                GameObject anneauGo = NewUI("Anneau", marker.transform);
                Stretch((RectTransform)anneauGo.transform, Vector2.zero, Vector2.zero);
                Image anneau = anneauGo.AddComponent<Image>();
                anneau.sprite = ProceduralUI.Ring(MarqueurTextureResPx,
                    MarqueurTextureResPx * 0.10f, DesignTokens.Current.hudHairlineGold);
                anneau.color = Color.white;
                anneau.raycastTarget = false;

                // La silhouette est un CONFORT, jamais une condition : si la ressource manque, le
                // médaillon reste un disque cerclé et le marqueur garde tout son sens. C'est pour ça
                // que le chargement est gardé et non asserté ici — la falsifiable porte sur la
                // PRÉSENCE et la POSITION du marqueur, pas sur son ornement.
                Sprite buste = BusteLieutenant();
                if (buste != null)
                {
                    GameObject busteGo = NewUI("Buste", marker.transform);
                    RectTransform brt = (RectTransform)busteGo.transform;
                    brt.anchorMin = brt.anchorMax = brt.pivot = new Vector2(0.5f, 0.5f);
                    brt.anchoredPosition = Vector2.zero;
                    brt.sizeDelta = new Vector2(marqueurW * 0.60f, marqueurW * 0.60f);
                    Image bi = busteGo.AddComponent<Image>();
                    bi.sprite = buste;
                    bi.color = DesignTokens.Current.hudCreme;
                    bi.preserveAspect = true;
                    bi.raycastTarget = false;
                }
                RenderedLieutenantMarkerCount++;
            }
        }

        /// <summary>U-12 (C10-F2, engagement 7) — le budget d'ambiances : au plus MaxAmbientLoops
        /// boucles ACTIVES simultanément, quel que soit le nombre de sources qui la réclament (les 3
        /// bindings dynamiques déjà gardés par un fait du back — néon EARNING, fumée ACTIVE,
        /// grésillement de maintenance). Au-delà du budget, la source reste RENDUE (C9-F2 n'est pas
        /// dégradée — sa présence reste un fait) mais SANS micro-motion : ce que C10-F2 vérifie porte
        /// sur le compte de boucles ACTIVES, jamais sur le compte de lumières rendues. Ordre d'appel
        /// = ordre de construction (déterministe, pas de tri ajouté) : les 4 premiers candidats
        /// rencontrés gagnent le budget.</summary>
        private void TryStartAmbientLoop(GameObject source)
        {
            if (ActiveAmbientLoopCount >= MaxAmbientLoops) return;
            source.AddComponent<AmbientPulseLoop>();
            ActiveAmbientLoopCount++;
        }

        // ----------------------------------------------------- operational_type -> libellé
        // REUSE du PATRON de BuildingCardController.TypeLabel (copie locale à ce fichier — chaque écran
        // porte les siennes dans ce dépôt, cf. LaunderingController.CleanlinessLabel : jamais une
        // dépendance croisée CityMap -> Operational.BuildingCard pour une chaîne d'affichage).

        private static string TypeLabel(string t)
        {
            switch (t)
            {
                case "lab": return "Lab";
                case "stash": return "Stash";
                case "front_shop": return "Front shop";
                case "cash_safehouse": return "Cash safehouse";
                case "dealer_spot_front": return "Dealer-spot front";
                case "specialized_lab": return "Specialized lab";
                case "refinery": return "Refinery";
                case "grow_house": return "Grow house";
                case "distribution_hub": return "Distribution hub";
                case "money_holding": return "Money holding";
                case "office": return "Office";
                case "press_house": return "Press house";
                case "": case null: return "Vacant lot";
                default: return t;
            }
        }

        // --------------------------------------------------------------- UI build (racine)

        private void BuildRoot()
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
            // Pivot fond pré-rendu — DÉVIATION AMENDÉE (round 4, verdict ⊥ sur
            // Tools/pivot-fond-prerendu-p3-implementation-notes.md § ROUND 4). Un essai antérieur
            // avait ajouté ici un réglage Canvas au niveau de l'objet entier, dans l'espoir de
            // résorber un écart mesuré par la sonde de ressemblance. Mesuré AVANT/APRÈS cet essai :
            // aucune amélioration (l'écart a même légèrement augmenté). Root cause identifiée
            // ensuite par le ⊥ : une PHASE SOUS-PIXEL dépendante de la PARITÉ du viewport (une
            // hauteur d'écran impaire déplace le centrage vertical d'un demi-pixel) — confirmée par
            // une preuve à coût nul (viewport pair ⇒ écart nul immédiatement) et RÉFUTÉE pour ce
            // réglage Canvas précis (VERT/ROUGE ne suit pas son état ON/OFF, §ROUND 4 du fichier de
            // notes). Le correctif retenu est EXPLICITE, pas un réglage global : chaque position
            // écran calculée par ce contrôleur (fond ET ancres de bâtiment) est arrondie au pixel
            // entier APRÈS multiplication par `scaleFactor` — voir `SnapToScreenPixel` ci-dessous.
            Transform parent = mountParent != null ? mountParent : canvas.transform; // W3.U1 D2

            GameObject rootGo = NewUI("DistrictInteriorRoot", parent);
            root = (RectTransform)rootGo.transform;
            Stretch(root, Vector2.zero, Vector2.zero);
        }

        private void ClearContent()
        {
            if (root == null) return;
            for (int i = root.childCount - 1; i >= 0; i--)
                Destroy(root.GetChild(i).gameObject);
        }

        // --------------------------------------------------------------- helpers

        private void TrackText(TextMeshProUGUI t)
        {
            if (t != null && !string.IsNullOrEmpty(t.text)) renderedTexts.Add(t.text);
        }

        private static GameObject NewUI(string name, Transform parent)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        // ── Titre de district : espacement et ombre portée (2026-08-21) ───────────────────────────
        // Constantes PUBLIQUES parce que les falsifiables les LISENT au lieu d'en recopier les
        // valeurs : un test qui redéclare 0,75 chez lui reste vert le jour où le code passe à 0.
        /// <summary>« titre serif ESPACÉ » — l'interlettrage de l'en-tête de la DA maison.</summary>
        public const float DistrictTitleCharacterSpacing = 6f;
        /// <summary>Opacité du halo. Ce qui commande la valeur : le glyphe tombe à 2,19:1 contre le
        /// ciel pâle de l'art de jour (mesuré sur la capture de livraison). À 0 l'ombre est ACTIVE
        /// et ne fait rien — premier monde dégénéré.</summary>
        public const float DistrictTitleShadowAlpha = 1.0f;
        /// <summary>Épaississement du halo AU-DELÀ du glyphe — et c'est la constante qui porte TOUTE
        /// la propriété.
        ///
        /// ⚠️ Elle valait 0,2 dans la première version de ce correctif, et à 0,2 le halo NE PRODUIT
        /// AUCUN PIXEL. Mesuré deux fois, indépendamment : (a) deux captures identiques à la ligne
        /// d'appel près donnent une luminance d'anneau de 0,2709 sans halo contre 0,2712 avec — soit
        /// 0,0003 d'écart ; (b) balayage en rendu hors-écran sur fond du ciel pâle mesuré (150,164,
        /// 183), en comptant les pixels plus sombres que le fond :
        ///     dilate 0,0 → 0 px · 0,2 → 0 px · 0,4 → 94 · 0,6 → 204 · 0,8 → 299 · 1,0 → 340.
        /// À pleine opacité, le halo n'atteint le vrai noir qu'à 1,0 (luminance minimale : 0,481 à
        /// 0,4 · 0,369 à 0,6 · 0,187 à 0,8 · 0,000 à 1,0), en laissant 188 des 238 pixels clairs du
        /// glyphe — il protège sans manger la lettre.
        ///
        /// La leçon, elle, est plus large que le nombre : la version à 0,2 passait une falsifiable qui
        /// vérifiait les PARAMÈTRES du halo (activé ? opaque ? dilaté ?) — tous vrais — alors que le
        /// halo n'avait aucun EFFET. Un dispositif décoratif qui nomme un mécanisme réel est pire
        /// qu'aucun dispositif : un lecteur vérifie qu'il existe, le trouve, et conclut.</summary>
        public const float DistrictTitleShadowDilate = 1.0f;
        /// <summary>Adoucissement des bords — esthétique (un halo dur lit comme un contour de
        /// contrefaçon). Gardé BAS : la mesure ci-dessus est faite à 0, et adoucir éclaircit.
        ///
        /// ⚠️ Le CONTOUR (`_OutlineWidth`) a été essayé comme mécanisme concurrent et RÉFUTÉ par la
        /// même sonde : il est tracé À L'INTÉRIEUR du bord SDF, donc il ronge la lettre sans jamais
        /// devenir sombre — 195 puis 90 puis 28 pixels clairs restants pour des largeurs de 0,10 /
        /// 0,20 / 0,30, avec une luminance minimale qui ne descend qu'à 0,371. Le halo passe DERRIÈRE,
        /// c'est ce qui le rend seul capable de la propriété.</summary>
        // ⚠️ Le décalage est NUL sur les deux axes, délibérément : une ombre DIRECTIONNELLE ne protège
        // qu'un côté du glyphe, et l'art défile sous le titre — le côté non protégé finit par tomber
        // sur du clair. C'est le `dilate` (halo SYMÉTRIQUE) qui porte toute la propriété, pas l'offset.
        public const float DistrictTitleShadowSoftness = 0.05f;

        /// <summary>Pose l'ombre portée du titre sur un matériau D'INSTANCE. `fontMaterial` (par
        /// opposition à `fontSharedMaterial`) fait cloner le matériau par TMP au premier accès : sans
        /// ce clonage, activer l'ombre ici l'activerait sur l'asset de fonte serif lui-même, donc sur
        /// l'argent, l'heure-phase et la valeur du manomètre du HUD — un défaut à distance, dans un
        /// autre écran, que rien dans ce fichier ne laisserait soupçonner.</summary>
        private static void ApplyTitleShadow(TextMeshProUGUI title)
        {
            // Les `ID_*` sont des `Shader.PropertyToID` remplis PARESSEUSEMENT (TMP_ShaderUtilities.cs
            // :178-183, gardés par `isInitialized`). Les lire avant l'initialisation rendrait 0 —
            // c'est-à-dire un identifiant de propriété VALIDE qui désigne autre chose : l'ombre serait
            // « posée » en silence sur rien. L'appel est idempotent ; c'est le prix d'une ligne pour
            // ne pas dépendre de l'ordre d'éveil d'un autre composant.
            ShaderUtilities.GetShaderPropertyIDs();

            Material instance = title.fontMaterial;   // clone implicite — NE PAS remplacer par fontSharedMaterial
            instance.EnableKeyword(ShaderUtilities.Keyword_Underlay);
            instance.SetColor(ShaderUtilities.ID_UnderlayColor, new Color(0f, 0f, 0f, DistrictTitleShadowAlpha));
            instance.SetFloat(ShaderUtilities.ID_UnderlayOffsetX, 0f);
            instance.SetFloat(ShaderUtilities.ID_UnderlayOffsetY, 0f);
            instance.SetFloat(ShaderUtilities.ID_UnderlayDilate, DistrictTitleShadowDilate);
            instance.SetFloat(ShaderUtilities.ID_UnderlaySoftness, DistrictTitleShadowSoftness);
        }

        private static TextMeshProUGUI NewText(string name, Transform parent, string value, int size, TextAlignmentOptions anchor)
        {
            GameObject go = NewUI(name, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = value;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = DesignTokens.Current.onSurfacePrimary;
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

        /// <summary>Round 4 (verdict ⊥, Tools/pivot-fond-prerendu-p3-implementation-notes.md
        /// § ROUND 4) — corrige la PHASE SOUS-PIXEL d'un point déjà positionné. Cause mesurée : une
        /// hauteur d'écran réelle IMPAIRE (ex. 577) déplace le centre du canvas d'un demi-pixel
        /// (577/2 = 288,5) ; ce demi-pixel se propage à tout ce qui est ancré relativement à ce
        /// centre, y compris quand `anchoredPosition` lui-même est un entier exact en unités canvas
        /// — le décalage apparaît à la PROJECTION écran, pas dans les unités locales. Preuve à coût
        /// nul (§ ROUND 4) : à hauteur PAIRE, l'écart mesuré tombe à 0,000 sans aucun autre
        /// changement de code. `RectTransform.position` (Canvas ScreenSpaceOverlay ⇒ coïncide avec
        /// les coordonnées écran) est arrondi au pixel entier, et la correction est réinjectée en
        /// unités LOCALES via `lossyScale` (qui vaut `scaleFactor` sur cette hiérarchie, §ROUND 1) —
        /// jamais un réglage global de Canvas (réfuté, voir le commentaire de `BuildRoot`).</summary>
        // nav-district (pan+zoom) — REUSE explicite : élargi de `private` à `internal` pour que
        // DistrictMapNavigation.cs (même assembly CityMap) puisse re-snapper le pan à l'échelle de
        // référence après chaque déplacement, plutôt que de dupliquer ce mécanisme (R9.3, généralisé
        // à "un mécanisme se réutilise, jamais ne se recopie"). Comportement INCHANGÉ.
        internal static void SnapToScreenPixel(RectTransform rt)
        {
            Vector3 pos = rt.position;
            Vector3 snapped = new Vector3(Mathf.Round(pos.x), Mathf.Round(pos.y), pos.z);
            if (snapped == pos) return;
            Vector3 lossyScale = rt.lossyScale;
            Vector3 deltaWorld = snapped - pos;
            Vector2 localDelta = new Vector2(
                Mathf.Abs(lossyScale.x) > 1e-6f ? deltaWorld.x / lossyScale.x : 0f,
                Mathf.Abs(lossyScale.y) > 1e-6f ? deltaWorld.y / lossyScale.y : 0f);
            rt.anchoredPosition += localDelta;
        }
    }

    /// <summary>W3.U2/C8 (D8), AMENDÉ P4 puis JUGE-D1 — le résultat du mapping day_phase -> art. LES
    /// 4 quarts (NIGHT/DAY/DUSK/DAWN) obtiennent désormais un palier HÉROS — DUSK/DAWN en pis-aller
    /// sur NightHero/DayHero (aucun fond dédié livré, voir ResolveArtPhase). "Unknown" couvre toute
    /// valeur de fil qui n'est AUCUN des 4 quarts connus — jamais silencieusement confondue avec l'un
    /// des 4 quarts NOMMÉS (C8-F5/JUGE-D1 : le mapping doit être EXPLICITE). `NonHeroFallback` retiré
    /// (JUGE-D1) : plus aucun `day_phase` nommé n'y mène, un enum-membre inatteignable serait un
    /// dispositif décoratif — voir RenderNonHeroFallback (méthode conservée pour Unknown).</summary>
    public enum DioramaArtPhase { NightHero, DayHero, Unknown }
}
