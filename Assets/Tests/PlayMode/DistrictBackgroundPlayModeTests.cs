using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;  // AuthClient, CityProjectionsClient, DistrictInterior* DTOs, DistrictBackground*
using MafiaCleanCity.Shell;    // SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;    // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // Pivot « fond pré-rendu » (Tools/pivot-fond-prerendu-design.md, §8/§11 P3, gate ⊥ APPROVED
    // 2026-08-20) — les falsifiables NEUVES du chunk P3 : pp-F1 (résolution native du fond),
    // pp-F2/F-calage (calage bâtiment↔JSON), pp-F3 (zéro rescale, POUR CHACUN des 54 sprites),
    // pp-F6 (le fond est inerte). pp-F5 (le compte childCount 4→2) vit DANS
    // DistrictInteriorDioramaPlayModeTests.cs — c'est un AMENDEMENT d'une falsifiable existante,
    // pas une falsifiable neuve (§8 : « amendement explicite d'une falsifiable SCELLÉE »).
    //
    // ── RETRAIT DE DistrictAmbientFillPlayModeTests.cs (amb-F1..amb-F8) — raison NOMMÉE ──────────
    // Le design §7 du pivot (« ce qui survit du design nav-hud, ce qui meurt ») statue sur les 8 :
    //   amb-F1 (déterminisme/variété des templates)  RETIRÉE — porte sur BuildAmbientCell, qui
    //     n'existe plus (l'ambiant est baqué dans le fond, §3).
    //   amb-F2 (priorité joueur)                     TRANSFORMÉE → pp-F2 (le calage remplace
    //     "aucun ambiant sur une parcelle possédée" — il n'y a plus d'ambiant du tout côté Unity).
    //   amb-F3 (ambiant inerte)                      TRANSFORMÉE → pp-F6 (même propriété, portée
    //     par le FOND désormais, pas par des façades ambiantes qui n'existent plus).
    //   amb-F4 (clôture de la table de templates)    RETIRÉE — la table `AmbientSet.templates`
    //     n'a plus de consommateur runtime (voir implementation-notes.md § Deviations).
    //   amb-F5 (recouvrement réel des façades)        RETIRÉE — porte sur des façades qui n'existent plus.
    //   amb-F6 (parcellaire réel : cellules-rue)      TRANSFORMÉE → pp-F7 (design §8 : "le
    //     parcellaire vit dans le JSON, il s'y vérifie") — HORS PÉRIMÈTRE de ce chunk (pp-F7/pp-F8
    //     valident les artefacts P0, produits par l'atelier ; non redemandées par le mandat de ce
    //     chunk Unity — voir implementation-notes.md).
    //   amb-F7 (51 tokens scellés)                    SURVIT TEL QUEL — RELOCALISÉE ci-dessous,
    //     corps byte-identique, seul le fichier change.
    //   amb-F8 (aire opaque par parcelle)             RETIRÉE — mesure une aire de façades
    //     ambiantes Unity qui n'existent plus (l'aire opaque du fond, elle, est la propriété que
    //     F-transport/F-nocalque (sonde ⊥ Tools/resemblance-probe.py) mesurent désormais).
    //
    // ── RETRAIT DE DistrictInteriorFloorOrderPlayModeTests.cs (R4F1, R4F2) — raison NOMMÉE ───────
    // R4F1 (aucune Image de sol au-dessus d'un BuildingSprite) et R4F2 (l'indice de contour
    // GridBorder existe et est en premier) gardaient l'ORDRE DE FRATRIE entre `GridFloors`/
    // `GridBorder` et les cellules occupées — un mécanisme de la grille procédurale (§P3 :
    // « plus aucune grille procédurale »). Ni les sols ni la bordure ne sont plus rendus par
    // Unity (baqués dans le fond, §3) : il n'y a plus d'objet de fratrie à ordonner, et donc plus
    // de défaut d'occlusion possible de cette classe. Retirées sans transformation — aucune
    // falsifiable pp-F* ne les remplace, la propriété qu'elles gardaient n'a plus d'objet.
    [Category("W3U2")]
    public class DistrictBackgroundPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const int VergeADistrictId = 16; // onboarding-grant.service.ts:112 — starter kit, profile "verge"
        private static int callsignSeq;

        private GameObject bareHostGo;

        [TearDown]
        public void TearDown()
        {
            if (bareHostGo != null)
            {
                var diorama = bareHostGo.GetComponent<DistrictInteriorScreenController>();
                if (diorama != null && diorama.ScreenRoot != null)
                {
                    Canvas c = diorama.ScreenRoot.GetComponentInParent<Canvas>();
                    if (c != null) Object.Destroy(c.gameObject); // a bare (no-shell) diorama builds its OWN Canvas
                }
                Object.Destroy(bareHostGo);
            }
        }

        private static IEnumerator SignUpAndOpenSession(string tag, Action<string> onToken)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign(tag, ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u2-pp-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u2-pp", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onToken(token);
        }

        /// <summary>Own precondition, no shared state (charter 27) — a FRESH account per test, real
        /// district-16 (verge-a) payload — the only district with a real fond in vague 1.</summary>
        private static IEnumerator FetchInterior(string tag, Action<DistrictInteriorDto> onDto)
        {
            string token = null;
            yield return SignUpAndOpenSession(tag, t => token = t);
            var client = new CityProjectionsClient { BaseUrl = BaseUrl };
            DistrictInteriorDto dto = null;
            long errCode = -1;
            yield return client.Interior(VergeADistrictId, token, d => dto = d, code => errCode = code);
            Assert.AreEqual(-1, errCode, $"interior fetch must succeed, got code {errCode}");
            Assert.IsNotNull(dto, "parsed via payload.data");
            onDto(dto);
        }

        // ── pp-F1 — résolution native du fond ─────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator PpF1_BackgroundImage_NativeResolutionCompensatedByScaleFactor()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ppf1", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictBackground_PpF1");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Assert.IsNotNull(scene, "pp-F5 — le conteneur fond+bâtiments existe");
            Transform fondT = scene.Find("DistrictBackgroundImage");
            Assert.IsNotNull(fondT, "pp-F1 — verge-a (district 16) a un fond réel en vague 1");
            Image fondImg = fondT.GetComponent<Image>();
            Assert.IsNotNull(fondImg?.sprite, "le fond porte bien un sprite");
            Texture2D tex = fondImg.sprite.texture;
            Assert.AreEqual(1080, tex.width, "pp-F1 — texture.width == 1080");
            Assert.AreEqual(1920, tex.height, "pp-F1 — texture.height == 1920");

            Canvas canvas = diorama.ScreenRoot.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas);
            float scaleFactor = canvas.scaleFactor;
            Assert.Greater(scaleFactor, 0f, "anti-vacuité — un scaleFactor nul rendrait toute comparaison triviale");

            var rt = (RectTransform)fondT;
            // §2.1 : « pp-F1 vérifie rect × scaleFactor == tex, JAMAIS rect == tex — c'était le
            // piège ». La valeur 0,859375 (1100×577) n'est PAS supposée ici — scaleFactor est LU.
            Assert.AreEqual(tex.width, rt.rect.width * scaleFactor, 0.5f, "pp-F1 — largeur native compensée");
            Assert.AreEqual(tex.height, rt.rect.height * scaleFactor, 0.5f, "pp-F1 — hauteur native compensée");

            Assert.IsFalse(fondImg.preserveAspect, "pp-F1 — pas de preserveAspect qui redimensionnerait");
            Assert.IsNull(fondT.GetComponent<LayoutGroup>(), "pp-F1 — le fond lui-même n'est pas un LayoutGroup");
            Assert.IsNull(scene.GetComponent<LayoutGroup>(), "pp-F1 — pas de LayoutGroup parent qui redimensionnerait le fond");
        }

        // ── pp-F2 / F-calage — POUR CHAQUE bâtiment du payload, son pivot tombe sur pivot_px LU
        // dans le JSON (quantificateur vérifié par le geste 4 du round 2 ⊥ : ni pp-F2 ni pp-F3 ne
        // portent un singulier — la boucle ci-dessous couvre TOUS les `dto.buildings` du J0, avec
        // anti-vacuité sur le compte exact (checkedBuildings == 4), jamais un seul bloc de test. ──

        [UnityTest]
        public IEnumerator PpF2_BuildingPivot_MatchesJsonPivotPx_WithinTwoPixels_AndGridSpacingIsUniform()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ppf2", d => dto = d);
            dto.day_phase = "NIGHT";

            DistrictBackgroundSlots bgSlots = DistrictBackgroundSlots.Current;
            Assert.IsNotNull(bgSlots, "l'asset DistrictBackgroundSlots doit être chargé");
            DistrictBackgroundSlots.BackgroundEntry entry = bgSlots.ResolveNight(dto.profile);
            Assert.IsNotNull(entry?.ancre, "anti-vacuité — verge-a doit avoir une carte d'ancrage réelle");
            var map = JsonUtility.FromJson<DistrictBackgroundAnchorDto>(entry.ancre.text);
            Assert.IsNotNull(map?.parcelles);
            Assert.Greater(map.parcelles.Length, 0, "anti-vacuité — la carte n'est pas vide");

            bareHostGo = new GameObject("DistrictBackground_PpF2");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Canvas canvas = diorama.ScreenRoot.GetComponentInParent<Canvas>();
            float scaleFactor = canvas.scaleFactor;
            Assert.Greater(scaleFactor, 0f);

            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Assert.Greater(dto.buildings.Length, 0, "anti-vacuité — au moins un bâtiment à calibrer");
            int checkedBuildings = 0;
            foreach (DistrictInteriorBuildingDto building in dto.buildings)
            {
                DistrictInteriorBlockDto block = Array.Find(dto.blocks, b => b.block_id == building.block_id);
                Assert.IsNotNull(block, $"building {building.building} references a real block (D2)");
                Transform cell = scene.Find($"DistrictCells/Cell_{block.x}_{block.y}");
                Assert.IsNotNull(cell, $"bâtiment sur bloc ({block.x},{block.y}) doit être ancré");
                DistrictBackgroundParcelDto parcel = DistrictBackgroundAnchor.FindParcel(map, block.x, block.y);
                // pp-F2 mondes dégénérés (§9) : comparé à une valeur LUE dans le JSON produit par
                // Blender, JAMAIS recalculée côté Unity — sinon l'assertion serait une tautologie.
                Assert.IsNotNull(parcel, $"la carte porte une ancre pour ({block.x},{block.y})");
                Vector2 expected = DistrictBackgroundAnchor.PixelToFondLocal(
                    new Vector2(parcel.pivot_px[0], parcel.pivot_px[1]), map.image.w, map.image.h, scaleFactor);
                Vector2 actual = ((RectTransform)cell).anchoredPosition;
                float distPx = Vector2.Distance(expected, actual) * scaleFactor;
                Assert.LessOrEqual(distPx, 2f,
                    $"pp-F2/F-calage — bâtiment sur ({block.x},{block.y}) : écart au pivot JSON = {distPx:F2}px (≤2px exigé)");
                checkedBuildings++;
            }
            Assert.AreEqual(4, checkedBuildings, "starter kit J0 — scénario dimensionné, les 4 bâtiments calibrés");

            // ⛔⛔ F-calage, SECOND VOLET — RETIRÉ ET REMPLACÉ LE 2026-08-22, avec sa raison.
            //
            // Ce qu'il assertait : que les ancres forment un MAILLAGE RÉGULIER de pas 6,5 m,
            // vérifié sur les 104 pas adjacents, décomposé dans la base (ex,ey). C'était rigoureux
            // — trois versions successives, la première tautologique, la deuxième aveugle hors d'un
            // seul pas — et c'était la propriété exacte d'une grille de parcelles.
            //
            // La carte d'ancrage n'est plus une grille. Elle désigne des BÂTIMENTS RÉELS de la
            // scène Blender, et des bâtiments réels ne sont pas alignés au cordeau. Le raisonnement
            // qui a conduit là est mesuré et tient en deux nombres : sur les 60 ancres de la grille,
            // 47 (78 %) tombaient bien sur un bâtiment, mais **les blocs (0,0) et (1,0) — que le kit
            // de départ occupe — étaient sur du sol nu** (écart-type de luminance 0,5 contre 24,9 et
            // 17,0 pour leurs voisins). La carte livrée aujourd'hui est mesurée **51/51 sur un
            // bâtiment**, minimum 9,8.
            // ⇒ Garder cette assertion aurait exigé de revenir à une grille, c'est-à-dire de
            // rétablir le défaut. Une garde qu'on ne peut satisfaire qu'en cassant ce qu'elle
            // protège doit être remplacée, pas assouplie.
            //
            // CE QUI LA REMPLACE est la propriété que la nouvelle carte garantit ET qui répond à un
            // défaut MESURÉ par le juge visuel : deux badges se posaient à **6,5 px de bord à bord**,
            // indiscernables. Deux ancres trop proches désignent le même bâtiment.
            // ⚠️ La propriété « chaque ancre est sur un bâtiment » ne peut PAS être assertée ici :
            // la texture du fond est importée `isReadable: 0`, donc illisible à l'exécution. Elle
            // est mesurée hors ligne par `Tools/mesure-ancres-sur-batiments.py`, commité, dont la
            // sortie est collée dans le message de commit. Dire ici « les ancres sont sur des
            // bâtiments » sans pouvoir le vérifier serait exactement la garde décorative que ce
            // dépôt a déjà payée deux fois.
            Vector2 exVec = new Vector2(map.base_px_par_m.ex[0], map.base_px_par_m.ex[1]);
            Vector2 eyVec = new Vector2(map.base_px_par_m.ey[0], map.base_px_par_m.ey[1]);
            float det = exVec.x * eyVec.y - eyVec.x * exVec.y;
            Assert.AreNotEqual(0f, det, "anti-vacuité — la base (ex,ey) ne doit pas être dégénérée (colinéaire)");

            Assert.Greater(map.parcelles.Length, 30,
                $"anti-vacuité — la carte doit porter assez d'ancres pour les blocs du district " +
                $"(mesuré {map.parcelles.Length}) ; sinon les comparaisons deux à deux ci-dessous " +
                "seraient vraies sur un jeu trop petit pour rien prouver");

            const float ecartMinPx = 40f;
            int pairesVerifiees = 0;
            float pireEcart = float.MaxValue;
            string pireCouple = "";
            for (int i = 0; i < map.parcelles.Length; i++)
            {
                for (int j = i + 1; j < map.parcelles.Length; j++)
                {
                    DistrictBackgroundParcelDto a = map.parcelles[i], b = map.parcelles[j];
                    float d = Vector2.Distance(new Vector2(a.pivot_px[0], a.pivot_px[1]),
                                               new Vector2(b.pivot_px[0], b.pivot_px[1]));
                    pairesVerifiees++;
                    if (d < pireEcart)
                    {
                        pireEcart = d;
                        pireCouple = $"({a.x},{a.y})↔({b.x},{b.y})";
                    }
                }
            }
            Assert.Greater(pairesVerifiees, 400,
                $"anti-vacuité — {pairesVerifiees} paires comparées, le scénario doit être dimensionné");
            Assert.GreaterOrEqual(pireEcart, ecartMinPx,
                $"F-calage — deux ancres à moins de {ecartMinPx}px désignent le même bâtiment et " +
                $"produisent deux marqueurs indiscernables : le juge visuel en a mesuré deux à 6,5px " +
                $"de bord à bord. Pire couple mesuré ici : {pireCouple} à {pireEcart:F1}px.");
        }

        /// <summary>Décompose le pas PIXEL entre deux parcelles adjacentes dans la base (ex,ey) et
        /// vérifie que sa norme EN MÈTRES égale `pasParcelleM` à ±0,01m (§9 : anti-dégénérescence —
        /// un maillage irrégulier sur N'IMPORTE LEQUEL des 104 pas doit rougir CE pas précis, pas
        /// un pas voisin qui serait resté correct). Retourne 1 (pour le compte anti-vacuité).</summary>
        private static int CheckStepMeters(DistrictBackgroundParcelDto from, DistrictBackgroundParcelDto to,
            Vector2 exVec, Vector2 eyVec, float det, float pasParcelleM, string axisLabel)
        {
            Vector2 stepPx = new Vector2(to.pivot_px[0] - from.pivot_px[0], to.pivot_px[1] - from.pivot_px[1]);
            Assert.Greater(stepPx.magnitude, 1f,
                $"anti-vacuité — le pas ({from.x},{from.y})->({to.x},{to.y}) [{axisLabel}] n'est pas dégénéré (quasi-nul)");
            float a = (stepPx.x * eyVec.y - eyVec.x * stepPx.y) / det;
            float b = (exVec.x * stepPx.y - stepPx.x * exVec.y) / det;
            float stepMeters = Mathf.Sqrt(a * a + b * b);
            Assert.AreEqual(pasParcelleM, stepMeters, 0.01f,
                $"F-calage — pas ({from.x},{from.y})->({to.x},{to.y}) [{axisLabel}], décomposé dans (ex,ey), " +
                $"vaut {stepMeters:F4}m (pas_parcelle_m déclaré {pasParcelleM:F4}m)");
            return 1;
        }

        // ── pp-F3 — zéro rescale, POUR CHACUN des sprites livrés ─────────────────────────────────
        // Deux volets (implementation-notes.md § Deviations explique la coupe) : (1) le facteur
        // 1,000 d'affichage n'est vérifiable QUE sur les sprites que le contrôleur rend RÉELLEMENT
        // (une RectTransform n'existe que pour un sprite affiché) — les 4 bâtiments du J0, un par
        // operational_type WIRED ; (2) le ratio px/m déclaré (ppm_plan) est une propriété de la
        // PAIRE de fichiers livrés (ppm24.0 vs ppm56.471 du MÊME template) — vérifiable pour les
        // 54 sprites SANS rendu, en lisant les PNG bruts sur disque (§9 : « un sprite rendu au
        // mauvais PPM satisfait encore "rect==natif" ⇒ tué par le contrôle px/m==ppm_plan±1% »).

        [UnityTest]
        public IEnumerator PpF3_Part1_RenderedBuildingSprites_DisplayFactorIsExactlyOne()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ppf3", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictBackground_PpF3");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            Canvas canvas = diorama.ScreenRoot.GetComponentInParent<Canvas>();
            float scaleFactor = canvas.scaleFactor;
            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Assert.Greater(dto.buildings.Length, 0, "anti-vacuité");

            int checkedSprites = 0;
            foreach (DistrictInteriorBuildingDto building in dto.buildings)
            {
                DistrictInteriorBlockDto block = Array.Find(dto.blocks, b => b.block_id == building.block_id);
                Transform cell = scene.Find($"DistrictCells/Cell_{block.x}_{block.y}");
                Transform spriteT = cell.Find("BuildingSprite");
                Assert.IsNotNull(spriteT);
                Image img = spriteT.GetComponent<Image>();
                Assert.IsNotNull(img?.sprite, $"building {building.operational_type} doit porter un vrai sprite importé");
                var rt = (RectTransform)spriteT;
                float dispW = rt.rect.width * scaleFactor;
                float dispH = rt.rect.height * scaleFactor;
                Assert.AreEqual(img.sprite.rect.width, dispW, 0.5f,
                    $"pp-F3 — {building.operational_type} : largeur affichée == largeur native (facteur 1,000)");
                Assert.AreEqual(img.sprite.rect.height, dispH, 0.5f,
                    $"pp-F3 — {building.operational_type} : hauteur affichée == hauteur native (facteur 1,000)");
                checkedSprites++;
            }
            Assert.AreEqual(4, checkedSprites, "starter kit J0 — scénario dimensionné, les 4 bâtiments vérifiés");
        }

        // ⚠️ AMENDÉ (round 6, verdict ⊥) — la méthode précédente comparait les DIMENSIONS DE FICHIER
        // (largeur/hauteur du PNG). C'était une « forme E » (§ CLAUDE.md, « argument et prédicat en
        // unités différentes ») : la marge de canevas autour du contenu utile diverge, de fichier à
        // fichier, INDÉPENDAMMENT du rendu (mesuré : marges ~13/3/6/4 px vs ~18/26/3/29 px selon les
        // couples) — le ratio de FICHIER porte donc à la fois le rendu ET une marge de canevas sans
        // rapport avec le PPM. La mesure qui compte est le ratio du CONTENU RÉEL, c-à-d la bbox alpha
        // (les pixels non-transparents) : le contenu, mesuré ainsi, était déjà correct sur les 27
        // couples AVANT tout re-cadrage (max 0,85% d'écart, `laverie_nuit_base` compris) — la panne
        // vivait entièrement dans la marge, jamais dans le rendu Blender.
        // Correctif : (a) le contrôle porte maintenant sur la bbox alpha, pas sur la taille fichier ;
        // (b) `laverie_nuit_base` (les deux PPM) a été RE-CADRÉE à marge constante (2px, script Python
        // sur l'atelier, commit `fd5a5ee`) pour que sa taille de FICHIER cesse de porter un bruit de
        // marge disproportionné — un geste de propreté, pas le correctif de fond (le correctif de fond
        // est le changement de PROXY ci-dessus, qui rendait déjà `laverie_nuit_base` VERTE avant même
        // le re-cadrage). Tolérance élargie 1% → 1,5% (mesure : max 0,85% observé sur les 27 couples,
        // marge de sécurité conservée sans être arbitrairement large).
        // ⚠️ Note de péremption retirée : le rouge `laverie_nuit_base` qu'elle documentait n'existe
        // plus (§ ci-dessus) — la garder aurait été une prose datée décrivant un état révolu.
        [Test]
        public void PpF3_Part2_AllFiftyFourDeliveredSprites_CrossPpmContentRatioMatchesDeclaredPpm_WithinOnePointFivePercent()
        {
            string dir = Path.Combine(Application.dataPath, "Art/District/Sprites");
            Assert.IsTrue(Directory.Exists(dir), $"sprites dir not found at {dir}");
            string[] files = Directory.GetFiles(dir, "*.png");
            Assert.AreEqual(54, files.Length, "anti-vacuité — les 54 sprites livrés (27 template×état × 2 PPM) sont tous importés");

            var byBase = new Dictionary<string, Dictionary<string, string>>(); // base -> ppmTag -> path
            var rx = new Regex(@"^(?<base>.+)_ppm(?<ppm>[0-9.]+)\.png$");
            foreach (string f in files)
            {
                string name = Path.GetFileName(f);
                Match m = rx.Match(name);
                Assert.IsTrue(m.Success, $"nom de fichier inattendu, ne matche pas le patron <base>_ppm<N>.png : {name}");
                string bse = m.Groups["base"].Value;
                string ppm = m.Groups["ppm"].Value;
                if (!byBase.TryGetValue(bse, out Dictionary<string, string> d)) { d = new Dictionary<string, string>(); byBase[bse] = d; }
                d[ppm] = f;
            }
            Assert.AreEqual(27, byBase.Count, "anti-vacuité — 27 couples (template, état)");

            const float declaredPpmD = 24.0f;   // camera D — ppm_plan des fonds verge (§2 du design)
            const float declaredPpmZo = 56.471f; // camera ZO — non consommée par cet écran, cross-check seulement
            float expectedRatio = declaredPpmD / declaredPpmZo;
            const float tolerance = 0.015f; // 1,5% — re-dérivée du max mesuré (0,85%) sur les 27 couples, bbox alpha

            int checkedPairs = 0;
            foreach (KeyValuePair<string, Dictionary<string, string>> kv in byBase)
            {
                Assert.IsTrue(kv.Value.ContainsKey("24.0") && kv.Value.ContainsKey("56.471"),
                    $"{kv.Key} — les DEUX PPM livrés (24.0 et 56.471) doivent exister");
                (int w24, int h24) = ReadAlphaBboxSize(kv.Value["24.0"]);
                (int w56, int h56) = ReadAlphaBboxSize(kv.Value["56.471"]);
                float ratioW = (float)w24 / w56;
                float ratioH = (float)h24 / h56;
                Assert.LessOrEqual(Mathf.Abs(ratioW - expectedRatio) / expectedRatio, tolerance,
                    $"pp-F3 — {kv.Key} : ratio largeur (bbox alpha) ppm24/ppm56.471 ({ratioW:F4}) doit être à ±1,5% de {expectedRatio:F4}");
                Assert.LessOrEqual(Mathf.Abs(ratioH - expectedRatio) / expectedRatio, tolerance,
                    $"pp-F3 — {kv.Key} : ratio hauteur (bbox alpha) ppm24/ppm56.471 ({ratioH:F4}) doit être à ±1,5% de {expectedRatio:F4}");
                checkedPairs++;
            }
            Assert.AreEqual(27, checkedPairs, "pp-F3 — les 27 couples (54 sprites livrés) sont TOUS vérifiés");
        }

        // bbox du contenu non-transparent (alpha >= 128) — c'est le CONTENU réel, indépendant de la
        // marge de canevas autour de lui (§ note d'amendement round 6 ci-dessus).
        private static (int w, int h) ReadAlphaBboxSize(string path)
        {
            byte[] bytes = File.ReadAllBytes(path);
            var tex = new Texture2D(2, 2, TextureFormat.RGBA32, false);
            bool ok = ImageConversion.LoadImage(tex, bytes);
            Assert.IsTrue(ok, $"PNG illisible : {path}");
            Color32[] pixels = tex.GetPixels32();
            int texW = tex.width, texH = tex.height;
            int minX = texW, minY = texH, maxX = -1, maxY = -1;
            for (int y = 0; y < texH; y++)
            {
                for (int x = 0; x < texW; x++)
                {
                    Color32 p = pixels[y * texW + x];
                    if (p.a >= 128)
                    {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            Object.DestroyImmediate(tex);
            Assert.GreaterOrEqual(maxX, minX, $"anti-vacuité — bbox alpha non-vide : {path}");
            int w = maxX - minX + 1;
            int h = maxY - minY + 1;
            return (w, h);
        }

        // ── pp-F6 — le fond est inerte ────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator PpF6_BackgroundImage_IsInert_RaycastOffNoButtonNoChildren()
        {
            DistrictInteriorDto dto = null;
            yield return FetchInterior("ppf6", d => dto = d);
            dto.day_phase = "NIGHT";

            bareHostGo = new GameObject("DistrictBackground_PpF6");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(dto);

            // pp-F6 mondes dégénérés (§9) : un fond ABSENT satisferait trivialement "ne porte ni
            // bouton ni état" ⇒ on exige D'ABORD que pp-F1 passe sur la MÊME instance (le fond existe
            // réellement) avant de vérifier son inertie.
            Transform scene = diorama.ScreenRoot.Find("DistrictScene");
            Transform fondT = scene.Find("DistrictBackgroundImage");
            Assert.IsNotNull(fondT, "pp-F6 exige D'ABORD que le fond existe (pp-F1) — sinon l'inertie est vraie à vide");
            Image fondImg = fondT.GetComponent<Image>();
            Assert.IsNotNull(fondImg?.sprite);

            Assert.IsFalse(fondImg.raycastTarget, "pp-F6 — raycastTarget == false");
            Assert.IsNull(fondT.GetComponent<Button>(), "pp-F6 — le fond ne porte aucun Button");
            Assert.AreEqual(0, fondT.childCount,
                "pp-F6 — le fond est un LEAF : aucun enfant (*Ov/LieutenantMarker/tout état) n'est parenté sous lui " +
                "(les bâtiments sont des FRÈRES du fond sous DistrictScene, pas ses enfants)");
        }

        // ── amb-F7 (nav-hud-design-v1.md §2.7) — RELOCALISÉE ici tel quel (design pivot §7 :
        // « SURVIT tel quel — les 4 axes scellés restent la loi pour ce qu'Unity dessine »). Corps
        // byte-identique à DistrictAmbientFillPlayModeTests.cs (retiré, voir tête de ce fichier) —
        // seul le fichier change.

        // AMENDÉ NOMMÉMENT — HUD v3.1 boucle ⊥ pixel-perfect (2026-08-21) : 51 -> 61 -> 62. La propriété
        // que cette falsifiable épingle (« le pivot fond pré-rendu n'ajoute AUCUNE teinte ») reste
        // VRAIE — ce lot ne touche NI DistrictBackgroundController NI le pivot, il ajoute 10 tokens
        // `hud*` scopés au TopBar (gdd/14 @e171c594). L'assertion pin le compte GLOBAL scellé, donc
        // toute addition légitime ailleurs la fait bouger par construction — ce n'est pas une
        // régression du pivot, c'est le mécanisme attendu d'un compteur partagé.
        //
        // AMENDÉ NOMMÉMENT (2) — La Famille — l'organigramme (2026-08-21) : 62 -> 64. Même raison
        // que ci-dessus, un cran plus loin : +2 tokens `lieutenantGlassTop`/`lieutenantGlassBottom`
        // (verre gravé des panneaux Don/lieutenant), propagation canon-first complète et vérifiée
        // aux 4 sources (gdd/14 note dédiée = 64 · `DesignTokens.cs`/`.asset` = 64 champs Color ·
        // `canon_palette_extract.json` = 64 tokens, `lieutenantGlassTop/Bottom` présents aux 3).
        // AMENDÉ (2026-08-25) : 64 -> 66, +2 tokens `lieutenantMedallionInner`/`Outer` — le DISQUE
        // du médaillon de « LA FAMILLE ». Il empruntait `hudGaugeFace*`, la face du MANOMÈTRE ; un
        // juge visuel ⊥ a mesuré le disque 32 % plus sombre et son bleu (b−r) DIVISÉ PAR DEUX.
        // Deux surfaces distinctes, deux tokens — « un token par consommateur mesuré » (gdd/14).
        // Propagation aux 4 sources vérifiée, comme les deux amendements précédents.
        //
        // ⚠️ CE QUE CETTE GARDE ÉPINGLE N'EST PAS LE NOMBRE, C'EST UNE PROPRIÉTÉ : *le pivot fond
        // pré-rendu n'ajoute aucune teinte*. Le nombre en est le témoin, et il bouge chaque fois
        // qu'un AUTRE lot ajoute légitimement un token. La monter est donc l'entretien normal de
        // cette garde, à condition de NOMMER ce qui s'ajoute — sans quoi le compte devient une
        // constante que l'on relève sans réfléchir, et la garde ne surveille plus rien.
        [Test]
        public void AmbF7_SealedTokenCountUnchanged()
        {
            Assert.AreEqual(66, MafiaCleanCity.Theme.Tests.CanonPaletteComparator.ExpectedTokenCount,
                "amb-F7 — le pivot fond pré-rendu n'ajoute AUCUNE teinte : les 66 clés de DesignTokens " +
                "restent fermées (51 + 11 hud* HUD v3.1 + 2 lieutenantGlass* + 2 lieutenantMedallion*, " +
                "ces quatre derniers venant de l'écran La Famille, jamais du pivot)");
        }
    }
}
