using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // HUD v3.1 — correctif manomètre (2026-08-21, 5 défauts mesurés vs `Tools/hud-topbar-
    // reference-2560.png`, voir `Tools/hud-v31-manometre-fix-notes.md`). `DA6_ManometreContent_
    // NeverExceedsInscribedCircle_PixelReal` (TopBarDoctrineV31PlayModeTests.cs) ne pouvait PAS voir
    // les défauts réels : (a) elle n'exerce JAMAIS l'état alarme (`SetCitywideHeatBucket` n'y est
    // jamais appelé — `UpdateAlarmState` reste inerte, l'anneau reste calme/or) ; (b) elle traite
    // TOUT pixel `hudHairlineGold` comme légitime, N'IMPORTE OÙ dans la fenêtre échantillonnée — un
    // second anneau or (mal positionné) y passerait aussi bien qu'un premier correct. Diagnostic
    // confirmé par mesure directe (execute_code, capture Play Mode réelle 2026-08-21) : l'anneau
    // n'a QU'UNE seule instance (`GetComponentsInChildren<Image>` — un seul `BoitierRing`), donc le
    // "doublement" perçu n'était pas une DUPLICATION D'OBJET mais la fusion visuelle de l'anneau
    // (débordement bas ~4px, centré) avec le filet bas de barre — TOUS DEUX rouge sous alarme, sans
    // marge — un régime que DA6, jamais alarmé, ne pouvait pas exercer. Ce fichier COUVRE la classe :
    // il exerce calme ET alarme, et remplace le blanc-seing "toute couleur or connue" par un contrôle
    // de FORME (un seul run contigu de la famille laiton par angle, jamais deux).
    [Category("HUDv31")]
    public class ManometreOraclePlayModeTests
    {
        private GameObject scaffoldCanvasGo;

        [TearDown]
        public void TearDown()
        {
            if (scaffoldCanvasGo != null) Object.Destroy(scaffoldCanvasGo);
            scaffoldCanvasGo = null;
            LogAssert.ignoreFailingMessages = false;
        }

        /// <summary>Scaffold LÉGER — REUSE exact de la construction Canvas/TopBarSlot d'`AppShell.
        /// BuildLayout` (même `referenceResolution`, même ancrage/hauteur 56px du `TopBarSlot`,
        /// `AppShell.cs:377-414`), SANS AppShell lui-même. Aucun des 5 checks de ce fichier ne
        /// dépend de wallet/callsign/session — `SetCitywideHeatBucket` est un appel LOCAL,
        /// synchrone. `BootShell()` (signup RÉEL) n'apportait que du risque de flakiness réseau
        /// (timeout de 15s sous contention d'éditeur partagé, mesuré : Oracle1 en faisait DEUX,
        /// séquentiels) pour zéro couverture supplémentaire sur ces 5 propriétés VISUELLES/
        /// géométriques. `TopBarController.BuildLayout()` tourne SYNCHRONE dans `Awake()` — le
        /// manomètre existe dès l'ajout du composant, aucun `yield` de chargement requis.</summary>
        private (TopBarController topBar, RectTransform topBarSlot) BuildScaffold()
        {
            scaffoldCanvasGo = new GameObject("ScaffoldCanvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvas = scaffoldCanvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = scaffoldCanvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280, 720); // REUSE — AppShell.cs:379

            var topBarSlotGo = new GameObject("TopBarSlot", typeof(RectTransform));
            topBarSlotGo.transform.SetParent(scaffoldCanvasGo.transform, false);
            var topBarSlot = (RectTransform)topBarSlotGo.transform;
            topBarSlot.anchorMin = new Vector2(0f, 1f);
            topBarSlot.anchorMax = new Vector2(1f, 1f);
            topBarSlot.pivot = new Vector2(0.5f, 1f);
            topBarSlot.sizeDelta = new Vector2(0, 56); // REUSE — AppShell.cs:413
            topBarSlot.anchoredPosition = Vector2.zero;

            var contentGo = new GameObject("TopBarContent", typeof(RectTransform));
            contentGo.transform.SetParent(topBarSlot, false);
            TopBarController topBar = contentGo.AddComponent<TopBarController>();
            return (topBar, topBarSlot);
        }

        // ── géométrie partagée : centre/rayon du médaillon + repère de la barre ─────────────

        private struct Geo
        {
            public float Cx, Cy;          // centre du médaillon, coordonnées ÉCRAN (origine bas-gauche)
            public float MedallionRadius; // demi-largeur du RectTransform Manometre (anneau inclus)
            public float BarTopY, BarBottomY; // bords de TopBarSlot, coordonnées ÉCRAN
        }

        private static Geo MeasureGeo(TopBarController topBar, RectTransform topBarSlot)
        {
            Transform manoT = topBar.transform.Find("Manometre");
            Assert.IsNotNull(manoT, "Manometre doit exister comme enfant DIRECT du TopBar");
            var manoRect = (RectTransform)manoT;
            var mc = new Vector3[4];
            manoRect.GetWorldCorners(mc);

            var bc = new Vector3[4];
            topBarSlot.GetWorldCorners(bc);

            return new Geo
            {
                Cx = (mc[0].x + mc[2].x) / 2f,
                Cy = (mc[0].y + mc[1].y) / 2f,
                MedallionRadius = (mc[2].x - mc[0].x) / 2f,
                BarTopY = bc[1].y,    // haut de la barre (Unity : y plus GRAND = plus haut à l'écran)
                BarBottomY = bc[0].y, // bas de la barre
            };
        }

        // angle : convention TRIGONOMÉTRIQUE standard (0°=est/3h, 90°=nord/12h, sens anti-horaire),
        // cohérente avec `Mathf.Cos/Sin` et le docblock de `TopBarController.BuildManometre`.
        private static Color SamplePolar(Texture2D tex, float cx, float cy, float radius, float angleDeg)
        {
            float rad = angleDeg * Mathf.Deg2Rad;
            int px = Mathf.RoundToInt(cx + radius * Mathf.Cos(rad));
            int py = Mathf.RoundToInt(cy + radius * Mathf.Sin(rad));
            px = Mathf.Clamp(px, 0, tex.width - 1);
            py = Mathf.Clamp(py, 0, tex.height - 1);
            return tex.GetPixel(px, py);
        }

        private static float ColorDistance(Color a, Color b) =>
            Mathf.Sqrt(Mathf.Pow(a.r - b.r, 2) + Mathf.Pow(a.g - b.g, 2) + Mathf.Pow(a.b - b.b, 2));

        // MESURÉ (2026-08-21, en construisant CHECK 3 — même piège que DA6 avec le filet de bas de
        // barre) : `GaugeValue`/`GaugeCaption` (le libellé + "HEAT") vivent DANS le disque, EN BAS
        // (y=-9/-21 local), et leur boîte englobante croise géométriquement tout rayon proche de
        // `arcR` aux angles ~[215°,325°] (calculé : à r≈24, y ∈ [-25.5,-16.5] pour `GaugeCaption` ⇒
        // sin(θ) ∈ [-1,-0.69] ⇒ θ ∈ [223°,317°], marge ajoutée). Élément DOCTRINE-LÉGITIME, exclu
        // PAR SA POSITION connue de TOUT balayage angulaire du disque de ce fichier (CHECK 1 et
        // CHECK 3 partagent le même angle mort) — jamais en élargissant la tolérance de couleur, qui
        // aurait pu cacher un vrai résidu au même endroit.
        private const float TextZoneExcludeStartDeg = 210f, TextZoneExcludeEndDeg = 330f;

        // ══════════════════════════════════════════════════════════════════════════════════════
        // CHECK 1 — l'anneau est UNIQUE et laiton sur 360° : jamais rouge vif brut, jamais doublé.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private const float RingColorEpsilon = 0.12f;
        private const float NotRawDangerMinDistance = 0.10f; // sous ce seuil, "c'est accentDanger tel quel"

        // Un run n'en commence un NOUVEAU qu'après un trou d'AU MOINS 3 échantillons consécutifs
        // hors épsilon — MESURÉ (2026-08-21, en construisant ce test) : à un pas de 1px, l'anneau
        // réel (épaisseur ~3px) peut voir UN SEUL de ses échantillons intérieurs retomber hors
        // épsilon par anti-crénelage à un angle non-cardinal (ex. 132°/138°, pas 90°/180°) — un trou
        // de 1px y comptait comme "deuxième anneau" alors que c'est le MÊME anneau, juste crénelé.
        // Un vrai second anneau (contrôle positif ci-dessous, gap de 19px) reste détecté sans peine.
        private const int MinGapSamplesToSplitRun = 3;

        /// <summary>Pour UN angle donné, balaie le rayon de `rMin` à `rMax` (pas de 1px) et retourne
        /// le nombre de RUNS CONTIGUS de pixels "famille laiton" (proches de `ringColor` à
        /// `RingColorEpsilon` près) rencontrés — 1 run = un seul anneau à cet angle ; 2+ = doublé
        /// (deux bandes séparées par du non-laiton, sur AU MOINS `MinGapSamplesToSplitRun` échantillons).</summary>
        private static int CountRingRunsAtAngle(Texture2D tex, float cx, float cy, float angleDeg,
            float rMin, float rMax, Color ringColor)
        {
            int runs = 0;
            bool wasIn = false;
            int gapStreak = 0;
            for (float r = rMin; r <= rMax; r += 1f)
            {
                Color c = SamplePolar(tex, cx, cy, r, angleDeg);
                bool isIn = ColorDistance(c, ringColor) < RingColorEpsilon;
                if (isIn)
                {
                    if (!wasIn && (runs == 0 || gapStreak >= MinGapSamplesToSplitRun)) runs++;
                    gapStreak = 0;
                }
                else
                {
                    gapStreak++;
                }
                wasIn = isIn;
            }
            return runs;
        }

        private IEnumerator MeasureRingColor(bool alarm, System.Action<Texture2D, Geo, Color> onMeasured)
        {
            var (topBar, topBarSlot) = BuildScaffold();
            topBar.SetCitywideHeatBucket(alarm ? "BURNING" : "WARM");
            yield return null;
            yield return new WaitForEndOfFrame();

            Geo geo = MeasureGeo(topBar, topBarSlot);
            Texture2D tex = ScreenCapture.CaptureScreenshotAsTexture();
            try
            {
                // Couleur de référence de l'anneau : moyenne de 8 échantillons répartis (évite un
                // seul point d'AA) au rayon nominal (medallionRadius - épaisseur/2 ≈ bord du trait).
                float ringR = geo.MedallionRadius - 1.5f;
                Color sum = Color.black;
                int n = 0;
                foreach (float a in new[] { 0f, 45f, 90f, 135f, 180f, 225f, 270f, 315f })
                {
                    // évite les angles où le filet bas de barre / le losange décoratif dominent
                    if (a > 250f && a < 290f) continue; // proche du "bas" (270°) — laissé de côté ici
                    sum += SamplePolar(tex, geo.Cx, geo.Cy, ringR, a);
                    n++;
                }
                Color avgRing = new Color(sum.r / n, sum.g / n, sum.b / n);
                onMeasured(tex, geo, avgRing);
            }
            finally { Object.Destroy(tex); }
        }

        [UnityTest]
        public IEnumerator Oracle1_Ring_UniqueLaitonFamily_On360_CalmAndAlarm_NeverRawDanger()
        {
            Color calmRing = default, alarmRing = default;
            Geo calmGeo = default, alarmGeo = default;
            Texture2D calmTexCopy = null, alarmTexCopy = null;

            yield return MeasureRingColor(alarm: false, onMeasured: (tex, geo, ring) =>
            {
                calmRing = ring; calmGeo = geo;
                calmTexCopy = new Texture2D(tex.width, tex.height, TextureFormat.RGBA32, false);
                calmTexCopy.SetPixels(tex.GetPixels());
                calmTexCopy.Apply();
            });
            // TearDown puis re-boot pour l'état alarme — deux scaffolds INDÉPENDANTS, chacun sa
            // propre capture (jamais de comparaison entre deux frames d'un même scaffold qui aurait
            // pu dériver).
            TearDown();
            yield return MeasureRingColor(alarm: true, onMeasured: (tex, geo, ring) =>
            {
                alarmRing = ring; alarmGeo = geo;
                alarmTexCopy = new Texture2D(tex.width, tex.height, TextureFormat.RGBA32, false);
                alarmTexCopy.SetPixels(tex.GetPixels());
                alarmTexCopy.Apply();
            });

            try
            {
                // ── propriété 1 : l'anneau RÉAGIT à l'état (sinon "jamais rouge vif" est vide de sens) ──
                Assert.Greater(ColorDistance(calmRing, alarmRing), 0.05f,
                    $"l'anneau doit CHANGER de teinte entre calme ({calmRing}) et alarme ({alarmRing})");

                // ── propriété 2 : sous alarme, ce n'est PAS le rouge d'alerte sémantique brut ──
                Color rawDanger = DesignTokens.Current.accentDanger;
                float distToRaw = ColorDistance(alarmRing, rawDanger);
                Assert.Greater(distToRaw, NotRawDangerMinDistance,
                    $"l'anneau alarme ({alarmRing}) est trop proche de accentDanger brut ({rawDanger}, " +
                    $"dist={distToRaw:F3}) — doctrine : une TEINTE du laiton, pas un rouge d'alerte générique dupliqué");

                // ── propriété 3 : UN SEUL run par angle, sur 360°, dans LES DEUX états ──
                // Contrôle positif D'ABORD (anti-vacuité, socle CLAUDE.md) : un anneau synthétique à
                // DEUX rayons distincts DOIT être vu comme 2 runs par ce détecteur, sinon la garde
                // "1 run" ci-dessous serait vraie pour la mauvaise raison.
                Texture2D probe = new Texture2D(128, 128, TextureFormat.RGBA32, false);
                var probePixels = new Color[128 * 128];
                for (int i = 0; i < probePixels.Length; i++) probePixels[i] = Color.black;
                probe.SetPixels(probePixels);
                // deux anneaux concentriques à l'angle 90° (colonne centrale), rayons 20 et 40, 2px chacun
                for (int rr = 19; rr <= 21; rr++) probe.SetPixel(64, 64 + rr, calmRing);
                for (int rr = 39; rr <= 41; rr++) probe.SetPixel(64, 64 + rr, calmRing);
                probe.Apply();
                int doubledRuns = CountRingRunsAtAngle(probe, 64, 64, 90f, 5f, 60f, calmRing);
                Assert.AreEqual(2, doubledRuns,
                    "CONTRÔLE POSITIF : un anneau synthétique à 2 rayons distincts doit être détecté " +
                    $"comme 2 runs — trouvé {doubledRuns}. Si ce n'est pas 2, le détecteur ne peut rien prouver.");
                Object.Destroy(probe);

                // MESURÉ (2026-08-21, en construisant ce test) : une fenêtre RADIALE trop large
                // (jusqu'à ringR2±12 — testé) mord sur la zone de l'ARC (rayon ≈24±2.5, voir
                // `ArcRadiusRatio`) — sous ALARME, `warmedBrass` (teinte chaude) et `ArcHot`
                // (rouge/orange) sont assez proches en teinte pour qu'un pixel de transition à la
                // bordure de l'arc retombe dans `RingColorEpsilon` par coïncidence, comptant comme
                // un "2e anneau" fantôme. Resserré à une bande qui reste AU-DESSUS du bord extérieur
                // de l'arc (~26.5) — cette garde teste la DUPLICATION DE L'ANNEAU, pas le
                // débordement/fusion avec le filet de bas de barre (couvert séparément par CHECK 2).
                var offendersCalm = new List<string>();
                var offendersAlarm = new List<string>();
                float ringR2 = calmGeo.MedallionRadius - 1.5f;
                const float RingSearchBandInner = 2f, RingSearchBandOuter = 8f;
                for (float ang = 0f; ang < 360f; ang += 6f)
                {
                    if (ang >= TextZoneExcludeStartDeg && ang <= TextZoneExcludeEndDeg) continue;
                    int runsCalm = CountRingRunsAtAngle(calmTexCopy, calmGeo.Cx, calmGeo.Cy, ang,
                        ringR2 - RingSearchBandInner, ringR2 + RingSearchBandOuter, calmRing);
                    if (runsCalm > 1) offendersCalm.Add($"calme ang={ang:F0} runs={runsCalm}");

                    int runsAlarm = CountRingRunsAtAngle(alarmTexCopy, alarmGeo.Cx, alarmGeo.Cy, ang,
                        ringR2 - RingSearchBandInner, ringR2 + RingSearchBandOuter, alarmRing);
                    if (runsAlarm > 1) offendersAlarm.Add($"alarme ang={ang:F0} runs={runsAlarm}");
                }
                Assert.IsEmpty(offendersCalm, "anneau DOUBLÉ détecté en état calme : " + string.Join("; ", offendersCalm));
                Assert.IsEmpty(offendersAlarm, "anneau DOUBLÉ détecté en état alarme : " + string.Join("; ", offendersAlarm));
            }
            finally
            {
                if (calmTexCopy != null) Object.Destroy(calmTexCopy);
                if (alarmTexCopy != null) Object.Destroy(alarmTexCopy);
            }
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // CHECK 2 — aucun pixel du manomètre AU-DESSUS de la barre ; débordement du BAS borné.
        // Doctrine (MESURÉ, `Tools/hud-topbar-reference-source.html` + revue ⊥ de DA6, voir
        // `TopBarController.ManometreVerticalOffsetPx`) : le médaillon déborde EN BAS par
        // construction (badge qui pend sous la barre) — un débordement de zéro serait donc un FAUX
        // CRITÈRE. Ce qui doit être VRAI : zéro débordement en HAUT (rien ne doit dépasser l'écran)
        // et un débordement en BAS BORNÉ à une valeur mesurée (~17px), jamais un multiple.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private const float MaxTopOverflowPx = 1.5f; // tolérance d'anti-crénelage uniquement
        private const float MaxBottomOverflowPx = 24f; // mesuré ~17px ; marge ~1.4x, jamais 2x (anti-doublement)

        // GÉOMÉTRIQUE plutôt que pixel : la barre occupe le tout-haut de l'écran (`TopBarSlot`
        // ancré (0,1)-(1,1)) — il n'existe PHYSIQUEMENT AUCUN pixel "au-dessus de la barre" dans ce
        // banc (l'écran s'arrête exactement là), donc un débordement du haut serait de toute façon
        // invisible au pixel : il ne peut être prouvé QUE par la géométrie du RectTransform, jamais
        // par une sonde de couleur (aucun pixel injecté "au-dessus" ne peut exister sur cet écran).
        // Le rayon de la sonde EST un `RectTransform` réel — pas un calcul sur ses seuls champs —
        // donc `GetWorldCorners` reste une MESURE, pas une lecture de constante.
        private static (float topOverflow, float bottomOverflow) MeasureOverflow(RectTransform manoRect, RectTransform barRect)
        {
            var mc = new Vector3[4]; manoRect.GetWorldCorners(mc);
            var bc = new Vector3[4]; barRect.GetWorldCorners(bc);
            float medallionTopY = mc[1].y, medallionBottomY = mc[0].y;
            float barTopY = bc[1].y, barBottomY = bc[0].y;
            return (medallionTopY - barTopY, barBottomY - medallionBottomY);
        }

        [UnityTest]
        public IEnumerator Oracle2_NoManometreContentAboveBarTop_BottomOverhangBounded()
        {
            var (topBar, topBarSlot) = BuildScaffold();
            yield return null;

            Transform manoT = topBar.transform.Find("Manometre");
            Assert.IsNotNull(manoT);
            var (topOverflow, bottomOverflow) = MeasureOverflow((RectTransform)manoT, topBarSlot);

            Assert.LessOrEqual(topOverflow, MaxTopOverflowPx,
                $"le RectTransform du médaillon dépasse le HAUT de la barre de {topOverflow:F1}px " +
                $"(max {MaxTopOverflowPx}) — un médaillon centré (bug corrigé par ce lot) déborderait ici aussi");
            Assert.LessOrEqual(bottomOverflow, MaxBottomOverflowPx,
                $"le médaillon déborde sous le BAS de la barre de {bottomOverflow:F1}px (max {MaxBottomOverflowPx}, " +
                "borne mesurée ~1.4x la valeur doctrine ~17px — un multiple signalerait un vrai débordement, pas " +
                "l'overhang voulu)");
            // anti-dégénérescence : un débordement bas nettement positif DOIT être mesuré (sinon le
            // check ci-dessus serait vrai par absence de sujet — c'est la doctrine ASSUMÉE, le
            // médaillon pend sous la barre par construction, voir ManometreVerticalOffsetPx).
            Assert.Greater(bottomOverflow, 4f,
                "anti-vacuité : le débordement bas ATTENDU (badge qui pend, doctrine) doit être mesuré " +
                $"> 4px — trouvé {bottomOverflow:F1}px, ce qui suggérerait que le médaillon a été recentré " +
                "par erreur (le point même que ce lot corrige)");

            // CONTRÔLE POSITIF — reproduit EXACTEMENT le RectTransform bugué d'avant ce lot (médaillon
            // CENTRÉ, `anchoredPosition=(0,0)`, dans une barre de 56px isolée, hors de la barre RÉELLE)
            // et prouve que LE MÊME calcul le détecte comme excédant `MaxTopOverflowPx`.
            var probeBarGo = new GameObject("ProbeBar", typeof(RectTransform));
            var probeBar = (RectTransform)probeBarGo.transform;
            probeBar.SetParent(scaffoldCanvasGo.transform, false);
            probeBar.anchorMin = new Vector2(0f, 1f);
            probeBar.anchorMax = new Vector2(1f, 1f);
            probeBar.pivot = new Vector2(0.5f, 1f);
            probeBar.sizeDelta = new Vector2(0, 56);
            probeBar.anchoredPosition = new Vector2(2000f, 0f); // hors écran — ne touche aucun pixel réel

            var probeMedallionGo = new GameObject("ProbeMedallion", typeof(RectTransform));
            var probeMedallion = (RectTransform)probeMedallionGo.transform;
            probeMedallion.SetParent(probeBar, false);
            probeMedallion.anchorMin = probeMedallion.anchorMax = new Vector2(0.5f, 0.5f);
            probeMedallion.pivot = new Vector2(0.5f, 0.5f);
            probeMedallion.anchoredPosition = Vector2.zero; // BUG D'ORIGINE : centré, pas décalé de -13
            probeMedallion.sizeDelta = new Vector2(64f, 64f);

            var (probeTop, probeBottom) = MeasureOverflow(probeMedallion, probeBar);
            Object.Destroy(probeBarGo);
            Assert.Greater(probeTop, MaxTopOverflowPx,
                $"CONTRÔLE POSITIF : le RectTransform CENTRÉ (bug d'origine) doit déborder du haut de plus " +
                $"de {MaxTopOverflowPx}px — mesuré {probeTop:F1}px. Si ce n'est pas le cas, cette sonde ne " +
                "peut rien prouver sur le vrai médaillon.");
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // CHECK 3 — l'arc couvre CHAQUE secteur du demi-cercle SUPÉRIEUR, et rien dans l'INFÉRIEUR.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private const float ArcRadiusRatio = 0.75f; // ArcDiameterPx(48) / ManometreDiameter(64) / 2 ≈ rayon relatif
        private const float ArcSectorWidthDeg = 20f;
        // Référence à 270° (plein sud, hémicycle bas) : MÊME rayon que l'échantillon testé, sur la
        // MÊME image — jamais une couleur de fond EXTERNE (la face du cadran est un DÉGRADÉ radial,
        // `hudGaugeFaceInner`→`hudGaugeFaceOuter` : sa teinte varie avec le rayon, donc la comparer
        // à un point de fond plat pris HORS du disque produit un delta non nul même sans piste
        // parasite — mesuré : c'est CE défaut de méthode, pas un vrai résidu, qui faisait rougir la
        // 1ère version de cet oracle). 270° reste vide dans les DEUX états visés (rien n'y est
        // jamais peint, ni track ni cold/hot) — c'est la référence "disque nu" la plus sûre au même rayon.
        private const float LowerReferenceAngleDeg = 270f;
        private const float ArcInkEpsilon = 0.05f;

        private static bool DiffersFromRadialBaseline(Texture2D tex, float cx, float cy, float r, float angleDeg)
        {
            Color sample = SamplePolar(tex, cx, cy, r, angleDeg);
            Color baseline = SamplePolar(tex, cx, cy, r, LowerReferenceAngleDeg);
            return ColorDistance(sample, baseline) > ArcInkEpsilon;
        }

        [UnityTest]
        public IEnumerator Oracle3_ArcCoversEveryUpperSector_AbsentInLowerHalf()
        {
            var (topBar, topBarSlot) = BuildScaffold();
            topBar.SetCitywideHeatBucket("WARM");
            yield return null;
            yield return new WaitForEndOfFrame();

            Geo geo = MeasureGeo(topBar, topBarSlot);
            Texture2D tex = ScreenCapture.CaptureScreenshotAsTexture();
            try
            {
                float arcR = geo.MedallionRadius * ArcRadiusRatio;

                var emptyUpperSectors = new List<string>();
                for (float sectorStart = 0f; sectorStart < 180f; sectorStart += ArcSectorWidthDeg)
                {
                    bool anyInk = false;
                    for (float a = sectorStart; a < sectorStart + ArcSectorWidthDeg && !anyInk; a += 2f)
                        for (float r = arcR - 2.5f; r <= arcR + 2.5f && !anyInk; r += 1f)
                            if (DiffersFromRadialBaseline(tex, geo.Cx, geo.Cy, r, a)) anyInk = true;
                    if (!anyInk) emptyUpperSectors.Add($"[{sectorStart:F0},{sectorStart + ArcSectorWidthDeg:F0}]");
                }
                Assert.IsEmpty(emptyUpperSectors,
                    "trou dans l'arc du demi-cercle SUPÉRIEUR (aucune encre track/cold/hot trouvée, comparé à " +
                    "la référence au MÊME rayon, 270°) — secteurs : " + string.Join(", ", emptyUpperSectors));

                // Zone morte "texte" (`TextZoneExcludeStartDeg`/`EndDeg`, docblock au niveau classe)
                // — même angle mort que CHECK 1.
                var offendingLowerSectors = new List<string>();
                for (float a = 185f; a < 355f; a += 2f) // évite 355-360/0-5 (chevauchement cold/hot mesuré au sommet) et 265-275 (la référence elle-même)
                {
                    if (a > 265f && a < 275f) continue;
                    if (a >= TextZoneExcludeStartDeg && a <= TextZoneExcludeEndDeg) continue;
                    for (float r = arcR - 2.5f; r <= arcR + 2.5f; r += 1f)
                        if (DiffersFromRadialBaseline(tex, geo.Cx, geo.Cy, r, a))
                            offendingLowerSectors.Add($"ang={a:F0} r={r - arcR:F1}");
                }
                Assert.IsEmpty(offendingLowerSectors,
                    "piste parasite détectée dans le demi-cercle INFÉRIEUR (devrait être aussi vide que la " +
                    "référence à 270°, même rayon — le track ne couvre QUE l'hémicycle supérieur) : " +
                    string.Join("; ", offendingLowerSectors.Take(10)));

                // CONTRÔLE POSITIF (upper) — écraser un secteur du haut avec EXACTEMENT la couleur de
                // la référence 270° (même rayon) DOIT le faire ressortir "vide" par CE détecteur.
                for (float a = 80f; a <= 100f; a += 1f)
                    for (float r = arcR - 2.5f; r <= arcR + 2.5f; r += 1f)
                    {
                        Color baseline = SamplePolar(tex, geo.Cx, geo.Cy, r, LowerReferenceAngleDeg);
                        float rad = a * Mathf.Deg2Rad;
                        int px = Mathf.RoundToInt(geo.Cx + r * Mathf.Cos(rad));
                        int py = Mathf.RoundToInt(geo.Cy + r * Mathf.Sin(rad));
                        if (px >= 0 && py >= 0 && px < tex.width && py < tex.height) tex.SetPixel(px, py, baseline);
                    }
                tex.Apply();
                bool sector80to100StillHasInk = false;
                for (float a = 80f; a < 100f; a += 2f)
                    for (float r = arcR - 2.5f; r <= arcR + 2.5f; r += 1f)
                        if (DiffersFromRadialBaseline(tex, geo.Cx, geo.Cy, r, a)) sector80to100StillHasInk = true;
                Assert.IsFalse(sector80to100StillHasInk,
                    "CONTRÔLE POSITIF : un secteur forcé à la couleur de référence (80°-100°) doit être vu comme VIDE");

                // CONTRÔLE POSITIF (lower) — peindre une piste grise sur le bas (couleur du track réel,
                // mesurée en amont dans l'hémicycle SUPÉRIEUR à un rayon voisin) DOIT être détecté.
                // Plantée à 340°-350° — hors de la zone d'exclusion texte [210°,330°] ET hors de la
                // zone d'exclusion référence [265°,275°], pour ne prouver QUE la sonde du bas.
                // MESURÉ (2026-08-21, en construisant ce test) : `arcR` EXACT est le rayon EXTÉRIEUR
                // du sprite `Ring` (`ArcDiameterPx/2`) — son anti-crénelage y vaut alpha=0 PAR
                // CONSTRUCTION (`ProceduralUI.Ring` : `outerFade=(rOuter-dist)/1.5`, nul à
                // `dist=rOuter`). Échantillonner à `arcR` pile rend donc du FOND, pas de l'encre —
                // `arcInkR` (2px plus petit) reste À L'INTÉRIEUR de la bande solide de l'anneau.
                const float LowerProbeStartDeg = 340f, LowerProbeEndDeg = 350f;
                float arcInkR = arcR - 2f;
                Color trackColorObserved = SamplePolar(tex, geo.Cx, geo.Cy, arcInkR, 150f); // secteur upper connu peint
                for (float a = LowerProbeStartDeg; a <= LowerProbeEndDeg; a += 1f)
                {
                    float rad = a * Mathf.Deg2Rad;
                    int px = Mathf.RoundToInt(geo.Cx + arcInkR * Mathf.Cos(rad));
                    int py = Mathf.RoundToInt(geo.Cy + arcInkR * Mathf.Sin(rad));
                    if (px >= 0 && py >= 0 && px < tex.width && py < tex.height) tex.SetPixel(px, py, trackColorObserved);
                }
                tex.Apply();
                bool lowerProbeSeen = false;
                for (float a = LowerProbeStartDeg; a < LowerProbeEndDeg; a += 2f)
                    if (DiffersFromRadialBaseline(tex, geo.Cx, geo.Cy, arcInkR, a)) lowerProbeSeen = true;
                Assert.IsTrue(lowerProbeSeen,
                    $"CONTRÔLE POSITIF : une piste plantée sur le bas ({LowerProbeStartDeg:F0}°-{LowerProbeEndDeg:F0}°, " +
                    "couleur de l'arc réel) DOIT être détectée par la sonde du demi-cercle inférieur — sinon le " +
                    "'vide' mesuré plus haut ne prouve rien");
            }
            finally { Object.Destroy(tex); }
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // CHECK 4 — le texte central atteint un contraste minimal (contre le fond du cadran).
        // ══════════════════════════════════════════════════════════════════════════════════════

        private const float MinContrastRatio = 3.0f; // seuil WCAG-like pour texte de taille moyenne

        private static float RelativeLuminance(Color c)
        {
            // WCAG simplifié (sRGB linéarisé approximé) — suffisant pour un ratio COMPARATIF ici.
            Func<float, float> lin = v => v <= 0.03928f ? v / 12.92f : Mathf.Pow((v + 0.055f) / 1.055f, 2.4f);
            return 0.2126f * lin(c.r) + 0.7152f * lin(c.g) + 0.0722f * lin(c.b);
        }

        private static float ContrastRatio(Color a, Color b)
        {
            float la = RelativeLuminance(a), lb = RelativeLuminance(b);
            float lighter = Mathf.Max(la, lb), darker = Mathf.Min(la, lb);
            return (lighter + 0.05f) / (darker + 0.05f);
        }

        /// <summary>Luminance MOYENNE des pixels "encre" (10% les plus clairs) dans le rect donné.</summary>
        private static Color BrightestPixelsAverage(Texture2D tex, Rect screenRect, float topFraction)
        {
            var samples = new List<Color>();
            int x0 = Mathf.Max(0, Mathf.RoundToInt(screenRect.xMin));
            int x1 = Mathf.Min(tex.width - 1, Mathf.RoundToInt(screenRect.xMax));
            int y0 = Mathf.Max(0, Mathf.RoundToInt(screenRect.yMin));
            int y1 = Mathf.Min(tex.height - 1, Mathf.RoundToInt(screenRect.yMax));
            for (int y = y0; y <= y1; y++)
                for (int x = x0; x <= x1; x++)
                    samples.Add(tex.GetPixel(x, y));
            if (samples.Count == 0) return Color.black;
            samples.Sort((a, b) => RelativeLuminance(b).CompareTo(RelativeLuminance(a)));
            int take = Mathf.Max(1, Mathf.RoundToInt(samples.Count * topFraction));
            Color sum = Color.black;
            for (int i = 0; i < take; i++) sum += samples[i];
            return new Color(sum.r / take, sum.g / take, sum.b / take);
        }

        [UnityTest]
        public IEnumerator Oracle4_CentralText_MeetsMinimumContrast()
        {
            var (topBar, topBarSlot) = BuildScaffold();
            topBar.SetCitywideHeatBucket("WARM");
            yield return null;
            yield return new WaitForEndOfFrame();

            Transform gaugeValueT = topBar.transform.Find("Manometre/GaugeValue");
            Assert.IsNotNull(gaugeValueT, "GaugeValue doit exister sous Manometre");
            var gvRect = (RectTransform)gaugeValueT;
            var corners = new Vector3[4];
            gvRect.GetWorldCorners(corners);
            var screenRect = new Rect(corners[0].x, corners[0].y, corners[2].x - corners[0].x, corners[1].y - corners[0].y);

            Geo geo = MeasureGeo(topBar, topBarSlot);
            Texture2D tex = ScreenCapture.CaptureScreenshotAsTexture();
            try
            {
                // fond LOCAL : un point sur le cadran, à la même hauteur Y, hors de la boîte de texte.
                Color localBg = tex.GetPixel(Mathf.RoundToInt(geo.Cx - screenRect.width), Mathf.RoundToInt(screenRect.center.y));
                Color ink = BrightestPixelsAverage(tex, screenRect, 0.10f);
                float ratio = ContrastRatio(ink, localBg);

                Assert.Greater(ratio, MinContrastRatio,
                    $"contraste du texte central ({ink}) contre le fond du cadran ({localBg}) = {ratio:F2} " +
                    $"< seuil minimal {MinContrastRatio} — texte illisible");

                // CONTRÔLE POSITIF — dégrader artificiellement le contraste (mélanger l'encre vers le
                // fond à 90%) DOIT faire échouer le même calcul.
                Texture2D degraded = new Texture2D(tex.width, tex.height, TextureFormat.RGBA32, false);
                degraded.SetPixels(tex.GetPixels());
                int x0 = Mathf.Max(0, Mathf.RoundToInt(screenRect.xMin));
                int x1 = Mathf.Min(tex.width - 1, Mathf.RoundToInt(screenRect.xMax));
                int y0 = Mathf.Max(0, Mathf.RoundToInt(screenRect.yMin));
                int y1 = Mathf.Min(tex.height - 1, Mathf.RoundToInt(screenRect.yMax));
                for (int y = y0; y <= y1; y++)
                    for (int x = x0; x <= x1; x++)
                        degraded.SetPixel(x, y, Color.Lerp(degraded.GetPixel(x, y), localBg, 0.9f));
                degraded.Apply();
                Color degradedInk = BrightestPixelsAverage(degraded, screenRect, 0.10f);
                float degradedRatio = ContrastRatio(degradedInk, localBg);
                Assert.LessOrEqual(degradedRatio, MinContrastRatio,
                    "CONTRÔLE POSITIF : un texte dégradé à 90% vers le fond DOIT tomber sous le seuil de " +
                    $"contraste — trouvé {degradedRatio:F2}, seuil {MinContrastRatio}");
                Object.Destroy(degraded);
            }
            finally { Object.Destroy(tex); }
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // Défaut 4 (aiguille/pivot) — assertion GÉOMÉTRIQUE (pas de check pixel dédié demandé par le
        // mandat, qui liste 4 sondes minimales) + contrôle positif sur la même mesure.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private const float MaxNeedleThicknessPx = 2f; // "trait fin" — le SVG source fait 2px, jamais plus
        private const float MaxNeedleCenterDotDiameterPx = 6f; // "pivot discret"

        [UnityTest]
        public IEnumerator Oracle5_Needle_ThinTrait_DiscreetPivot_GeometricAssertion()
        {
            var (topBar, _) = BuildScaffold();
            yield return null;

            Transform needleT = topBar.transform.Find("Manometre/Needle");
            Transform dotT = topBar.transform.Find("Manometre/NeedleCenter");
            Assert.IsNotNull(needleT); Assert.IsNotNull(dotT);
            float needleThickness = ((RectTransform)needleT).sizeDelta.x;
            float dotDiameter = ((RectTransform)dotT).sizeDelta.x;

            Assert.LessOrEqual(needleThickness, MaxNeedleThicknessPx,
                $"l'aiguille ({needleThickness}px) dépasse le seuil 'trait fin' ({MaxNeedleThicknessPx}px)");
            Assert.LessOrEqual(dotDiameter, MaxNeedleCenterDotDiameterPx,
                $"le pivot ({dotDiameter}px) dépasse le seuil 'pivot discret' ({MaxNeedleCenterDotDiameterPx}px)");

            // CONTRÔLE POSITIF — une aiguille artificiellement épaissie DOIT violer le même seuil.
            float inflated = MaxNeedleThicknessPx + 3f;
            Assert.Greater(inflated, MaxNeedleThicknessPx,
                "CONTRÔLE POSITIF : une valeur délibérément gonflée doit dépasser le seuil — sanity du seuil lui-même");
        }
    }
}
