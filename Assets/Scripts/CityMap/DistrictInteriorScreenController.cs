using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;

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
    // CET écran mappe EXPLICITEMENT les 3 paliers non-héros (DAWN/DAY/DUSK) sur un repli DÉCLARÉ, et
    // NIGHT seul sur l'art de nuit construit ci-dessous (C8-F5, §0 : l'art des 3 autres paliers est
    // DIFFÉRÉ, pas cet écran).
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
    public class DistrictInteriorScreenController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // Taille de cellule en px uGUI (mise en page, pas un tunable de jeu — R2.3 ne porte pas sur les
        // dimensions d'écran, cf. les tailles inline déjà partout dans AppShell/LaunderingController).
        private float CellSize = 48f;   // revue ⊥ 2026-08-20 (BLOCKING 4) : calculé par rendu, plus une const
        // revue ⊥ r2 (IMPORTANT 3) : l'échelle-monde d'un bloc n'a rien à faire en const C# — elle
        // vit dans BuildingSpriteSlots.asset (metresParBloc, défaut 22 : l'usine, 21,86 m d'opaque,
        // est le plus large sprite livré — à 14 elle faisait 1,56 bloc et se faisait couper).
        private static float MetresParBloc
        {
            get
            {
                BuildingSpriteSlots slots = BuildingSpriteSlots.Current;
                return slots != null && slots.metresParBloc > 0f ? slots.metresParBloc : 22f;
            }
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
        public int RenderedCellCount { get; private set; }
        public int RenderedBuildingCount { get; private set; }
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
            RenderedCellCount = 0;
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
            else
            {
                RenderNonHeroFallback();
            }
        }

        /// <summary>D8/C8-F5 — mapping EXPLICITE sur les 4 quarts connus : les 3 paliers non-héros
        /// (DAWN/DAY/DUSK) retombent TOUS sur le MÊME repli déclaré ; NIGHT seul obtient l'art de nuit.
        /// Toute valeur de fil qui n'est AUCUN des 4 quarts connus rend Unknown — jamais silencieusement
        /// confondue avec le repli des 3 quarts NOMMÉS (l'esprit du "résolveur exhaustif sans default"
        /// de D2/D8, transposé à un `switch` sur une chaîne de fil plutôt qu'un enum C#).</summary>
        private static DioramaArtPhase ResolveArtPhase(string dayPhase)
        {
            switch (dayPhase)
            {
                case "NIGHT": return DioramaArtPhase.NightHero;
                case "DAWN":
                case "DAY":
                case "DUSK": return DioramaArtPhase.NonHeroFallback;
                default: return DioramaArtPhase.Unknown; // 5e valeur inattendue — jamais avalée par le repli des 3 nommés
            }
        }

        /// <summary>Le repli DÉCLARÉ des 3 paliers non-héros (§0 : l'art de DAWN/DAY/DUSK est différé,
        /// pas cet écran). Un état NOMMÉ, jamais un rendu vide — sinon indiscernable d'un bug.</summary>
        private void RenderNonHeroFallback()
        {
            GameObject panel = NewUI("DayPhaseFallbackPanel", root);
            Stretch((RectTransform)panel.transform, Vector2.zero, Vector2.zero);
            panel.AddComponent<Image>().color = DesignTokens.Current.nightOutOfDistrictMuted;

            TextMeshProUGUI label = NewText("FallbackLabel", panel.transform,
                "Daylight scene not rendered yet for this district — check back at night.",
                16, TextAlignmentOptions.Center);
            Stretch((RectTransform)label.transform, new Vector2(24, 24), new Vector2(-24, -24));
            label.color = DesignTokens.Current.onSurfaceSecondary;
            TrackText(label);
        }

        /// <summary>L'art de nuit — le palier héros (D8, engagement 1). Grille depuis blocks[]
        /// (C8-F2), socle + sol (engagement 6) par cellule, hors-district sourd tout autour
        /// (engagement 5), brume par-dessus tout.</summary>
        private void RenderNightDiorama(DistrictInteriorDto dto)
        {
            // hors-district (engagement 5) — remplit toute la racine, sourd, sous tout le reste.
            GameObject backdrop = NewUI("OutOfDistrictBackdrop", root);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = DesignTokens.Current.nightOutOfDistrictMuted;

            // Titre — texte, jamais un nombre nu (C8-F3).
            TextMeshProUGUI title = NewText("DistrictTitle", root, dto.name_canonical, 20, TextAlignmentOptions.TopLeft);
            RectTransform titleRt = (RectTransform)title.transform;
            titleRt.anchorMin = new Vector2(0f, 1f);
            titleRt.anchorMax = new Vector2(1f, 1f);
            titleRt.pivot = new Vector2(0.5f, 1f);
            titleRt.sizeDelta = new Vector2(0, 32);
            titleRt.anchoredPosition = new Vector2(0, -8);
            title.color = DesignTokens.Current.onSurfacePrimary;
            TrackText(title);

            int width = Mathf.Max(1, dto.grid != null ? dto.grid.width : 1);
            int height = Mathf.Max(1, dto.grid != null ? dto.grid.height : 1);

            // Revue ⊥ (BLOCKING 4) : la grille plafonnait structurellement à 10 % de l'écran.
            RectTransform rootSizeRt = (RectTransform)root;
            float availW = rootSizeRt.rect.width  > 1f ? rootSizeRt.rect.width  - 100f : 1180f;
            float availH = rootSizeRt.rect.height > 1f ? rootSizeRt.rect.height - 160f : 560f;
            CellSize = Mathf.Max(48f, Mathf.Floor(Mathf.Min(availW / width, availH / height)));

            GameObject gridArea = NewUI("GridArea", root);
            RectTransform gridRt = (RectTransform)gridArea.transform;
            gridRt.anchorMin = gridRt.anchorMax = new Vector2(0.5f, 0.46f);
            gridRt.pivot = new Vector2(0.5f, 0.5f);
            gridRt.sizeDelta = new Vector2(width * CellSize, height * CellSize);
            gridRt.anchoredPosition = Vector2.zero;

            // C8-F2 : unité = le bloc, des deux côtés. block_id -> (x,y) pour situer chaque bâtiment
            // sur SA cellule ; le complément (D2 : blocks[] moins buildings[].block_id) donne les vides.
            var blockByBlockId = new Dictionary<int, DistrictInteriorBlockDto>();
            if (dto.blocks != null)
                foreach (DistrictInteriorBlockDto b in dto.blocks) blockByBlockId[b.block_id] = b;
            // Revue ⊥ (IMPORTANT 5) : dès que les sprites débordent de leur cellule, l'ordre de
            // fratrie EST l'ordre de profondeur — construction arrière → avant (y croissant),
            // bâtiments et vides confondus. Les comptes C8-F2/F4 sont inchangés.
            var buildingByBlockId = new Dictionary<int, DistrictInteriorBuildingDto>();
            if (dto.buildings != null)
                foreach (DistrictInteriorBuildingDto b in dto.buildings)
                    if (blockByBlockId.ContainsKey(b.block_id)) // D2 garantit l'appartenance ; défensif.
                        buildingByBlockId[b.block_id] = b;

            if (dto.blocks != null)
            {
                // Revue ⊥ r2 (BLOCKING 1) : DEUX passes. Passe 1 — les 40 sols (l'ordre des blocks[]
                // suffit : un sol ne déborde pas). Passe 2 — chaque cellule OCCUPÉE repasse en fin de
                // fratrie en (y,x) croissant : tout bâtiment passe devant TOUT sol (une seule passe
                // triée laissait le sol du voisin de DROITE manger le débordement — 44 lignes coupées
                // à x=144, mesuré). Noms, comptes, parents : inchangés pour les falsifiables.
                var ordered = new List<DistrictInteriorBlockDto>(dto.blocks);
                ordered.Sort((a, b) => a.y != b.y ? a.y.CompareTo(b.y) : a.x.CompareTo(b.x));
                var occupied = new List<(DistrictInteriorBlockDto block, GameObject cell)>();
                foreach (DistrictInteriorBlockDto block in ordered)
                {
                    if (buildingByBlockId.TryGetValue(block.block_id, out DistrictInteriorBuildingDto building))
                    {
                        GameObject cell = BuildBuildingCell(gridRt, block.x, block.y, building);
                        occupied.Add((block, cell));
                        RenderedBuildingCount++;
                    }
                    else
                        BuildEmptyCell(gridRt, block.x, block.y); // C8-F4 : "silhouette sourde" — juste le sol.
                }
                foreach (var (block, cell) in occupied) // déjà triés (y,x) par la passe 1
                    cell.transform.SetAsLastSibling();
                RenderedCellCount = dto.blocks.Length;
            }

            // Brume — par-dessus tout, translucide, jamais un obstacle au tap.
            GameObject haze = NewUI("Haze", root);
            Stretch((RectTransform)haze.transform, Vector2.zero, Vector2.zero);
            Image hazeImg = haze.AddComponent<Image>();
            hazeImg.color = DesignTokens.Current.nightHaze;
            hazeImg.raycastTarget = false;
        }

        private GameObject BuildBuildingCell(RectTransform gridRt, int x, int y, DistrictInteriorBuildingDto building)
        {
            GameObject cell = NewCell(gridRt, x, y);

            // Socle — plinthe sous le bâtiment.
            // Revue ⊥ r3 (BLOCKING 2) : plus jamais une plinthe pleine-cellule — les 4 socles
            // fusionnaient en une barre continue de 376 px, l'élément le plus clair de l'écran.
            // Largeur du BÂTIMENT, et plus sombre que les sols (l'ombre de contact, pas une étagère).
            GameObject socle = NewUI("Socle", cell.transform);
            RectTransform socleRt = (RectTransform)socle.transform;
            socleRt.anchorMin = socleRt.anchorMax = new Vector2(0.5f, 0f);
            socleRt.pivot = new Vector2(0.5f, 0f);
            float socleW = CellSize * 0.6f;
            {
                BuildingSpriteSlots slotsPourSocle = BuildingSpriteSlots.Current;
                Sprite spPourSocle = slotsPourSocle != null ? slotsPourSocle.Resolve(building.operational_type) : null;
                if (spPourSocle != null) socleW = spPourSocle.rect.width * (CellSize / (MetresParBloc * 56f));
            }
            socleRt.sizeDelta = new Vector2(socleW, CellSize * 0.2f);
            socleRt.anchoredPosition = Vector2.zero;
            socle.AddComponent<Image>().color = DesignTokens.Current.nightSocle; // revue ⊥ r2 : nightBase servait aussi de bucket 2 du sol

            // Sprite — D6/C6 : BuildingSpriteSlots, premier appelant de PRODUCTION (jusqu'ici son seul
            // consommateur était son propre test, C6-F4).
            // Revue ⊥ (IMPORTANT 5) : échelle COMMUNE ppm 56 (le contrat des manifestes de
            // l'atelier — l'épicerie s'affichait 3,55× plus grande par mètre que l'usine), pivot au
            // sol, débordement autorisé (l'ordre de fratrie porte la profondeur).
            GameObject spriteGo = NewUI("BuildingSprite", cell.transform);
            RectTransform spriteRt = (RectTransform)spriteGo.transform;
            Image spriteImg = spriteGo.AddComponent<Image>();
            BuildingSpriteSlots slots = BuildingSpriteSlots.Current;
            Sprite baseSprite = slots != null ? slots.Resolve(building.operational_type) : null;
            if (baseSprite != null)
            {
                spriteImg.sprite = baseSprite;
                float k = CellSize / (MetresParBloc * 56f);
                spriteRt.anchorMin = spriteRt.anchorMax = new Vector2(0.5f, 0f);
                spriteRt.pivot = new Vector2(0.5f, 0f);
                spriteRt.sizeDelta = new Vector2(baseSprite.rect.width, baseSprite.rect.height) * k;
                spriteRt.anchoredPosition = new Vector2(0, CellSize * 0.18f);
            }
            else
            {
                Stretch(spriteRt, new Vector2(3, CellSize * 0.22f), new Vector2(-3, -3));
                spriteImg.preserveAspect = true;
            }

            // Libellé de type — texte, jamais un nombre nu (C8-F3).
            TextMeshProUGUI label = NewText("TypeLabel", cell.transform, TypeLabel(building.operational_type),
                9, TextAlignmentOptions.Bottom);
            RectTransform labelRt = (RectTransform)label.transform;
            labelRt.anchorMin = new Vector2(0f, 0f);
            labelRt.anchorMax = new Vector2(1f, 0f);
            labelRt.pivot = new Vector2(0.5f, 0f);
            labelRt.sizeDelta = new Vector2(0, CellSize * 0.2f);
            labelRt.anchoredPosition = Vector2.zero;
            label.color = DesignTokens.Current.onSurfacePrimary;
            TrackText(label);

            // C9 (§3, §1.5 — U-10) : les 5 bindings lumineux. Chacun est GARDÉ par SA bande — l'absence
            // de GameObject EST le rendu "éteint/pas d'opération/pas de dette" (jamais un objet caché) :
            // c'est exactement ce que C9-F2 compte (source rendue == fait qui la commande).
            BuildWindowLight(cell.transform, building);       // bindings 1+2 — possédé / raid-saisie
            BuildRevenueSign(cell.transform, building);       // binding 3 — néon "ça rapporte" (D3)
            BuildActivitySmoke(cell.transform, building);     // binding 4 — fumée "op active"
            BuildMaintenanceFlicker(cell.transform, building); // binding 5 — grésillement "maintenance en retard"
            BuildLieutenantMarkers(cell.transform, building);  // U-11 (C10-F1, D10) — affectation lieutenant
            return cell;
        }

        /// <summary>Bindings 1+2 (§1.5 lignes 1-2) — la fenêtre ambre. Binding 1 (possédé) : TOUT
        /// bâtiment reçu EST possédé (prémisse §2 — `buildings[]` ne porte que les bâtiments du
        /// joueur), donc le fait qui commande cette lumière est la simple PRÉSENCE de l'entrée —
        /// déjà garantie par l'appelant (`BuildBuildingCell` n'est jamais invoquée pour une cellule
        /// vide, `BuildEmptyCell`). Binding 2 (raid/saisie, "fenêtres éteintes") : `condition_band !=
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
        /// rendu de repli (rectangle token), jamais un trou silencieux.</summary>
        private Image TryBuildOverlay(Transform cell, string name, string opType, string couche, Color tint)
        {
            BuildingSpriteSlots slots = BuildingSpriteSlots.Current;
            Sprite ov = slots != null ? slots.ResolveOverlay(opType, couche) : null;
            if (ov == null || AdditiveMat == null) return null;
            GameObject go = NewUI(name, cell);
            RectTransform rt = (RectTransform)go.transform;
            float k = CellSize / (MetresParBloc * 56f);
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0f);
            rt.pivot = new Vector2(0.5f, 0f);
            rt.sizeDelta = new Vector2(ov.rect.width, ov.rect.height) * k;
            rt.anchoredPosition = new Vector2(0, CellSize * 0.18f);
            Image img = go.AddComponent<Image>();
            img.sprite = ov;
            img.material = AdditiveMat;
            img.color = tint;
            img.raycastTarget = false;
            return img;
        }

        private void BuildWindowLight(Transform cell, DistrictInteriorBuildingDto building)
        {
            if (building.condition_band != "SOUND") return; // éteinte — aucune lumière décorative (C9-F2)
            Image ov = TryBuildOverlay(cell, "WindowLight", building.operational_type, "fen", Color.white);
            if (ov == null)
            {
                GameObject light = NewUI("WindowLight", cell);
                RectTransform rt = (RectTransform)light.transform;
                rt.anchorMin = new Vector2(0.2f, 0.55f);
                rt.anchorMax = new Vector2(0.8f, 0.75f);
                rt.offsetMin = rt.offsetMax = Vector2.zero;
                light.AddComponent<Image>().color = DesignTokens.Current.nightWindowLit;
            }
            RenderedWindowLightCount++;
        }

        /// <summary>Binding 3 (§1.5 ligne 3, D3) — l'enseigne "ça rapporte". Les TROIS états prescrits
        /// par D3, exactement : néon allumé (`revenue_band == EARNING`) ; enseigne présente mais
        /// SOMBRE (`revenue_chain == WIRED` et `revenue_band == IDLE`) ; pas d'enseigne du tout
        /// (`revenue_chain == UNWIRED` — "le bâtiment lit comme un local occupé, pas comme un commerce
        /// éteint", D3). Seul le premier état compte comme une SOURCE lumineuse (C9-F2/F3 : "néon
        /// rendu" == binding 3 qui commande une lumière, pas une enseigne simplement présente).</summary>
        private void BuildRevenueSign(Transform cell, DistrictInteriorBuildingDto building)
        {
            if (building.revenue_chain != "WIRED") return; // pas d'enseigne du tout (D3)
            bool earning = building.revenue_band == "EARNING";
            // Revue ⊥ (BLOCKING 3 + IMPORTANT 9) : le calque neon de l'atelier porte la vraie lumière
            // (blanc chaud + halo) ; la teinte n'est plus qu'une INTENSITÉ — pleine si EARNING, blend
            // vers nightBase si IDLE (REUSE du patron FloorTint, R2.3).
            Color tint = earning ? Color.white : Color.Lerp(Color.white, DesignTokens.Current.nightBase, 0.75f);
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
        private void BuildActivitySmoke(Transform cell, DistrictInteriorBuildingDto building)
        {
            if (building.activity_band != "ACTIVE") return;
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
        private void BuildMaintenanceFlicker(Transform cell, DistrictInteriorBuildingDto building)
        {
            bool overdue = building.lapse_phase_bucket != "WITHIN_WINDOW";
            if (!overdue || building.maintenance_in_progress) return;
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
        private void BuildLieutenantMarkers(Transform cell, DistrictInteriorBuildingDto building)
        {
            if (building.lieutenant_ids == null) return;
            for (int i = 0; i < building.lieutenant_ids.Length; i++)
            {
                GameObject marker = NewUI($"LieutenantMarker_{i}", cell);
                RectTransform rt = (RectTransform)marker.transform;
                // Petits marqueurs en rangée, bande basse de la cellule (au-dessus du socle) —
                // décalés par index pour rester des objets VISUELLEMENT distincts (2 marqueurs sur le
                // MÊME bâtiment, C10-F1, ne doivent jamais se confondre en un seul).
                const float slotWidth = 0.12f, slotGap = 0.02f, xStart = 0.04f;
                float xMin = xStart + i * (slotWidth + slotGap);
                rt.anchorMin = new Vector2(xMin, 0.02f);
                rt.anchorMax = new Vector2(xMin + slotWidth, 0.18f);
                rt.offsetMin = rt.offsetMax = Vector2.zero;
                // REUSE d'un token déjà asset-backed (R2.3) — `lieutenantMutedDeep`, "Par-écran" §1.2
                // de la mesure du territoire, jamais un tunable/token neuf pour ce chunk.
                marker.AddComponent<Image>().color = DesignTokens.Current.nightLieutenantMarker; // revue ⊥ r1+r2 : 1,055:1 contre le socle — invisible deux rounds de suite
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

        private void BuildEmptyCell(RectTransform gridRt, int x, int y)
        {
            // C8-F4 : "36 en silhouette sourde" — juste le sol (engagement 6), jamais de sprite/socle/libellé.
            NewCell(gridRt, x, y);
        }

        private GameObject NewCell(RectTransform gridRt, int x, int y)
        {
            GameObject cell = NewUI($"Cell_{x}_{y}", gridRt);
            RectTransform cellRt = (RectTransform)cell.transform;
            cellRt.anchorMin = cellRt.anchorMax = new Vector2(0f, 1f);
            cellRt.pivot = new Vector2(0f, 1f);
            cellRt.sizeDelta = new Vector2(CellSize, CellSize);
            cellRt.anchoredPosition = new Vector2(x * CellSize, -y * CellSize);
            cell.AddComponent<Image>().color = FloorTint(x, y); // sol — engagement 6
            return cell;
        }

        // ----------------------------------------------------- sol : ≥3 textures, usure PLACÉE (engagement 6)

        /// <summary>3 rendus de sol distincts, choisis par une fonction DÉTERMINISTE de la position —
        /// jamais un tirage aléatoire ("usure PLACÉE", pas procédurale — l'énoncé du chunk l'oppose
        /// explicitement à un bruit non contrôlé). Composés à partir des DEUX tokens déjà provisionnés
        /// par C5 pour ce diorama (nightBackground/nightBase) plutôt que d'en ajouter de nouveaux
        /// qu'aucune falsifiable de ce chunk ne réclame — choix documenté, voir
        /// Tools/w3u2-c8-notes.md § Deviations.</summary>
        private static Color FloorTint(int x, int y)
        {
            int bucket = ((x + y) % 3 + 3) % 3;
            switch (bucket)
            {
                case 0: return DesignTokens.Current.nightBackground;
                case 1: return DesignTokens.Current.nightFloorAlt; // revue ⊥ r3 : le Lerp RGB de teintes opposées fabriquait un gris
                default: return DesignTokens.Current.nightBase;
            }
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
    }

    /// <summary>W3.U2/C8 (D8) — le résultat du mapping day_phase -> art. 3 des 4 quarts retombent sur
    /// le repli déclaré (art différé, §0) ; NIGHT seul obtient l'art héros. "Unknown" couvre toute
    /// valeur de fil qui n'est AUCUN des 4 quarts connus — jamais silencieusement confondue avec le
    /// repli des 3 quarts NOMMÉS (C8-F5 : le mapping doit être EXPLICITE).</summary>
    public enum DioramaArtPhase { NightHero, NonHeroFallback, Unknown }
}
