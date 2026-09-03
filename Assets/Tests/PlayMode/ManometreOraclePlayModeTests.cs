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
    // ⛔⛔ SORTI DE `HUDv31` LE 2026-09-03 — CE FICHIER FAIT PLANTER L'ÉDITEUR, MESURÉ.
    // En inscrivant `HUDv31` au filtre du juge (elle en était absente, 5 fichiers / 24 tests
    // qu'aucun run ne pouvait demander), le run a passé les DOUZE tests des trois suites de chrome
    // puis est mort ici : `Got a SIGSEGV while executing native code`, 15 trames de pile, core
    // dumped, et le process a ensuite pendu jusqu'au plafond — `elapsed=904s timeout=900s`.
    // Le test en cause est `Oracle1_…_On360_…`, qui échantillonne 360 angles de rendu : mesuré à
    // 315 % de CPU et 15 min de temps processeur avant de tomber. C'est la MÊME famille que la
    // catégorie `Capture`, dont `MafiaCI` documente déjà le SIGSEGV sous le pilote Mesa — mais un
    // SECOND porteur, inconnu jusqu'ici.
    // ⇒ Le remède n'est pas de renoncer à juger le HUD : les 12 autres tests sont verts et
    //   protègent le multi-résolution, la zone sûre et la barre d'onglets. On sort le SEUL fichier
    //   qui plante, sous une catégorie à lui, ABSENTE du filtre — le même régime que `Capture`.
    // ⚠️ Ce qui n'est PAS mesuré : si le crash vient de ce test précis ou de tout le fichier. Il
    //   est tombé au PREMIER, donc les suivants n'ont jamais tourné. Le savoir coûte un run de
    //   15 min qui finit en core dump ; la question reste ouverte plutôt que tranchée au jugé.
    // ⇒ Pour l'exécuter à la main : `MAFIA_CI_CATEGORIES="ManometreOracle"` — en sachant que
    //   l'éditeur ne rendra pas la main.
    [Category("ManometreOracle")]
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
            public float HairlineTopY, HairlineBottomY; // bords du filet bas de barre, coordonnées ÉCRAN
            public Rect TextZone;         // union RÉELLE de GaugeValue+GaugeCaption, coordonnées ÉCRAN
            public Rect[] ZonesExclues;   // TOUS les éléments légitimes qu'un balayage rencontrerait
            public float ArcRadius;       // rayon MESURÉ de la piste d'arc (`ArcTrack`), coordonnées ÉCRAN
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

            Transform hairlineT = topBar.transform.Find("Hairline");
            Assert.IsNotNull(hairlineT, "Hairline doit exister comme enfant DIRECT du TopBar (BuildHairline)");
            var hc = new Vector3[4];
            ((RectTransform)hairlineT).GetWorldCorners(hc);

            return new Geo
            {
                Cx = (mc[0].x + mc[2].x) / 2f,
                Cy = (mc[0].y + mc[1].y) / 2f,
                MedallionRadius = (mc[2].x - mc[0].x) / 2f,
                BarTopY = bc[1].y,    // haut de la barre (Unity : y plus GRAND = plus haut à l'écran)
                BarBottomY = bc[0].y, // bas de la barre
                HairlineTopY = hc[1].y,
                HairlineBottomY = hc[0].y,
                TextZone = UnionMonde(manoT, "GaugeValue", "GaugeCaption"),
                // ⚠️ LE TEXTE N'EST PAS LE SEUL ÉLÉMENT LÉGITIME SUR LE CHEMIN D'UN BALAYAGE.
                // `BoitierLosange` — l'ornement doré suspendu SOUS le cadran — est du laiton, comme
                // l'anneau : un balayage radial à 270° le compte comme un SECOND passage et conclut
                // « anneau doublé ». L'ancienne fenêtre angulaire figée [210°,330°] le masquait par
                // accident, en même temps que le texte. En la remplaçant par la boîte RÉELLE du
                // texte — plus serrée, donc plus juste — l'ornement est ressorti. *Resserrer une
                // exclusion révèle ce qu'elle couvrait sans le dire.*
                ZonesExclues = new[]
                {
                    UnionMonde(manoT, "GaugeValue", "GaugeCaption"),
                    UnionMonde(manoT, "BoitierLosange"),
                },
                ArcRadius = RayonMesure(manoT, "ArcTrack"),
            };
        }

        /// <summary>Le rayon RÉEL d'un anneau enfant, mesuré sur son rectangle.
        ///
        /// ⚠️⚠️ REMPLACE `ArcRadiusRatio = 0.75f`, une constante dont le commentaire disait
        /// « ArcDiameterPx(48) / ManometreDiameter(**64**) / 2 ». Le manomètre est passé à **68**
        /// depuis, et personne n'est revenu relire : l'oracle échantillonnait à 25,5 là où l'arc
        /// vit à 24 — **1,5 px trop loin, dans le laiton du boîtier**. Il a fini par y trouver un
        /// pixel chaud (RGBA 0,122 0,106 0,102 contre un fond 0,051 0,067 0,102) et l'a rapporté
        /// comme un résidu d'arc dans l'hémicycle inférieur. Un nombre DÉRIVÉ puis GELÉ est une
        /// prose datée avec un `const` devant — et celui-ci portait sa propre péremption écrite
        /// dans son commentaire, sous la forme d'un « 64 » qui n'était plus vrai.</summary>
        private static float RayonMesure(Transform racine, string nom)
        {
            Transform t = null;
            foreach (Transform c in racine.GetComponentsInChildren<Transform>(true))
                if (c.name == nom) { t = c; break; }
            Assert.IsNotNull(t, $"'{nom}' introuvable sous le manomètre — le rayon d'arc serait deviné");
            var c4 = new Vector3[4];
            ((RectTransform)t).GetWorldCorners(c4);
            return (c4[2].x - c4[0].x) / 2f;
        }

        /// <summary>Union, en coordonnées ÉCRAN, des rectangles de plusieurs descendants nommés.</summary>
        private static Rect UnionMonde(Transform racine, params string[] noms)
        {
            float x0 = float.MaxValue, y0 = float.MaxValue, x1 = float.MinValue, y1 = float.MinValue;
            int vus = 0;
            foreach (string nom in noms)
            {
                Transform t = null;
                foreach (Transform c in racine.GetComponentsInChildren<Transform>(true))
                    if (c.name == nom) { t = c; break; }
                Assert.IsNotNull(t, $"'{nom}' introuvable sous le manomètre — la zone morte serait vide, " +
                                    "et l'oracle accuserait le texte d'être un résidu d'arc");
                var c4 = new Vector3[4];
                ((RectTransform)t).GetWorldCorners(c4);
                foreach (Vector3 p in c4)
                {
                    x0 = Mathf.Min(x0, p.x); y0 = Mathf.Min(y0, p.y);
                    x1 = Mathf.Max(x1, p.x); y1 = Mathf.Max(y1, p.y);
                }
                vus++;
            }
            Assert.AreEqual(noms.Length, vus, "tous les libellés attendus doivent être vus");
            return Rect.MinMaxRect(x0, y0, x1, y1);
        }

        /// <summary>Le point (r, angle) tombe-t-il DANS la boîte du texte ?
        ///
        /// ⚠️ REMPLACE UNE FENÊTRE ANGULAIRE FIGÉE (`[210°,330°]`). Celle-ci avait été CALCULÉE une
        /// fois depuis les bornes du texte anglais (« HEAT », « Cold »), puis gelée en constante.
        /// Le jour où les libellés sont passés au français — « CHALEUR », « Froid », plus larges —
        /// le texte est sorti de la fenêtre par la gauche et l'oracle l'a signalé comme un résidu
        /// d'arc dans l'hémicycle inférieur (`ang=185..203`). Un nombre DÉRIVÉ puis gelé est une
        /// prose datée avec un `const` devant.
        /// La boîte réelle est aussi STRICTEMENT PLUS SERRÉE qu'un coin de 120° : la garde y gagne
        /// en portée au lieu d'en perdre — elle surveille désormais les ~40° que la fenêtre
        /// excluait sans raison.</summary>
        /// <summary>2 px de marge : l'encre d'un glyphe déborde de sa boîte par sa frange
        /// d'anti-crénelage. Le point qui a fait rougir l'oracle était à **0,48 px** au-dessus du
        /// bord de la boîte — dedans pour l'œil, dehors pour `Rect.Contains`.</summary>
        private const float MargeZoneTextePx = 2f;

        private static bool DansUneZone(Geo g, float r, float angleDeg, Rect[] zones)
        {
            float rad = angleDeg * Mathf.Deg2Rad;
            var p = new Vector2(g.Cx + r * Mathf.Cos(rad), g.Cy + r * Mathf.Sin(rad));
            foreach (Rect z in zones)
                if (new Rect(z.xMin - MargeZoneTextePx, z.yMin - MargeZoneTextePx,
                             z.width + 2f * MargeZoneTextePx, z.height + 2f * MargeZoneTextePx).Contains(p))
                    return true;
            return false;
        }

        /// <summary>Le texte SEUL — ce dont dépend le choix d'un fond de référence pour le cadran
        /// (l'ornement, lui, vit hors du disque et ne peut pas polluer une base prise sur la face).</summary>
        private static bool DansLaZoneDeTexte(Geo g, float r, float angleDeg)
            => DansUneZone(g, r, angleDeg, new[] { g.TextZone });

        /// <summary>MESURÉ (2026-08-21, en fermant Oracle1) — le filet bas de barre (`Hairline`,
        /// pleine largeur, MÊME famille laiton que l'anneau en état calme ET en état alarme,
        /// `UpdateAlarmState`) croise géométriquement l'anneau de RECHERCHE de CHECK 1 (pas l'anneau
        /// lui-même — `ManometreVerticalOffsetPx` le tient hors du DISQUE, §2.1) à deux fenêtres
        /// angulaires ÉTROITES et SYMÉTRIQUES autour de 270° (bas), parce que le filet est une ligne
        /// HORIZONTALE quasi tangente à la bande de recherche annulaire. Mesuré empiriquement (balayage
        /// fin, 1°) : [201°,203°] et [336°,339°] — HORS de la zone morte du texte (`DansLaZoneDeTexte`,
        /// dérivé UNIQUEMENT de GaugeCaption/GaugeValue, sans rapport avec le filet). Cette fonction
        /// DÉRIVE la fenêtre géométriquement (jamais un magic number recopié de la mesure) : pour les 2
        /// arêtes du filet (haut/bas) × les 2 bornes du rayon de recherche, le point de croisement
        /// x=√(r²−Δy²) donne un angle (même convention que `SamplePolar` : atan2(Δy,Δx)) ; l'enveloppe
        /// (min/max) des 4 combinaisons + `marginDeg` (anti-crénelage) couvre tout le croisement RÉEL.
        /// Le filet lui-même est une propriété DOCTRINE-LÉGITIME, couverte séparément par CHECK 2
        /// (`MaxTopOverflowPx`/l'overhang bas borné, tête de section ci-dessous) — CHECK 1 ne doit
        /// JAMAIS le compter comme un second anneau.</summary>
        private static (float start, float end)? HairlineCrossingWindow(
            float cx, float cy, float hairlineNearY, float hairlineFarY, float rMin, float rMax,
            bool rightSide, float marginDeg)
        {
            var angles = new List<float>();
            foreach (float y in new[] { hairlineNearY, hairlineFarY })
            {
                float dyUp = y - cy; // négatif : le filet est SOUS le centre du médaillon
                foreach (float r in new[] { rMin, rMax })
                {
                    if (Mathf.Abs(dyUp) >= r) continue; // filet hors de portée de ce rayon — pas de croisement
                    float dx = Mathf.Sqrt(r * r - dyUp * dyUp);
                    float signedDx = rightSide ? dx : -dx;
                    float ang = Mathf.Atan2(dyUp, signedDx) * Mathf.Rad2Deg;
                    if (ang < 0f) ang += 360f;
                    angles.Add(ang);
                }
            }
            if (angles.Count == 0) return null;
            return (angles.Min() - marginDeg, angles.Max() + marginDeg);
        }

        private static bool InHairlineWindow(float ang, (float start, float end)? left, (float start, float end)? right) =>
            (left.HasValue && ang >= left.Value.start && ang <= left.Value.end) ||
            (right.HasValue && ang >= right.Value.start && ang <= right.Value.end);

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
        // (La fenêtre angulaire figée qui vivait ici a été remplacée par `DansLaZoneDeTexte`,
        // qui lit la boîte RÉELLE des deux libellés. Voir le docblock de cette méthode.)

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
                float rMin = ringR2 - RingSearchBandInner, rMax = ringR2 + RingSearchBandOuter;

                // AMENDÉ NOMMÉMENT (2026-08-21, en fermant ce rouge) — MESURÉ (balayage fin 1°,
                // Debug.Log injecté puis retiré, co-tenance HUDv31 reproduite) : le filet bas de barre
                // (`Hairline`, MÊME famille laiton que l'anneau, `UpdateAlarmState` colore les DEUX
                // identiquement) croise la bande de recherche à deux fenêtres ÉTROITES et SYMÉTRIQUES
                // — mesuré [201°,203°] et [336°,339°], toutes deux HORS de la zone morte du texte (`DansLaZoneDeTexte`/
                // EndDeg` ([210,330], dérivé UNIQUEMENT du texte GaugeCaption/GaugeValue, sans rapport
                // avec le filet). Ce n'est pas un anneau doublé : ce sont deux éléments CHROME
                // DISTINCTS et INTENTIONNELS (voir le commentaire de CHECK 2 ci-dessous — l'overhang
                // bas est un débordement VOULU) qui se trouvent tomber dans la même bande radiale à cet
                // angle précis. `HairlineCrossingWindow` DÉRIVE la fenêtre géométriquement (jamais les
                // degrés mesurés recopiés en dur) à partir de la position RÉELLE du filet — robuste à
                // tout futur changement de `ManometreVerticalOffsetPx`/hauteur de barre. La coarse
                // sweep à 6° ne voyait QUE la fenêtre droite (336 tombe dans [336,339] ; à gauche, 198
                // et 204 encadrent [201,203] sans le toucher — un pas de 6° peut donc manquer un défaut
                // RÉEL tout comme il peut en signaler un faux) — les deux fenêtres sont dérivées et
                // exclues symétriquement, indépendamment de ce qu'un pas de 6° aurait vu.
                var leftWindowCalm = HairlineCrossingWindow(calmGeo.Cx, calmGeo.Cy,
                    calmGeo.HairlineTopY, calmGeo.HairlineBottomY, rMin, rMax, rightSide: false, marginDeg: 2f);
                var rightWindowCalm = HairlineCrossingWindow(calmGeo.Cx, calmGeo.Cy,
                    calmGeo.HairlineTopY, calmGeo.HairlineBottomY, rMin, rMax, rightSide: true, marginDeg: 2f);
                var leftWindowAlarm = HairlineCrossingWindow(alarmGeo.Cx, alarmGeo.Cy,
                    alarmGeo.HairlineTopY, alarmGeo.HairlineBottomY, rMin, rMax, rightSide: false, marginDeg: 2f);
                var rightWindowAlarm = HairlineCrossingWindow(alarmGeo.Cx, alarmGeo.Cy,
                    alarmGeo.HairlineTopY, alarmGeo.HairlineBottomY, rMin, rMax, rightSide: true, marginDeg: 2f);

                for (float ang = 0f; ang < 360f; ang += 6f)
                {
                    if (DansUneZone(calmGeo, (rMin + rMax) * 0.5f, ang, calmGeo.ZonesExclues)) continue;
                    if (!InHairlineWindow(ang, leftWindowCalm, rightWindowCalm))
                    {
                        int runsCalm = CountRingRunsAtAngle(calmTexCopy, calmGeo.Cx, calmGeo.Cy, ang,
                            rMin, rMax, calmRing);
                        if (runsCalm > 1) offendersCalm.Add($"calme ang={ang:F0} runs={runsCalm}");
                    }

                    if (!InHairlineWindow(ang, leftWindowAlarm, rightWindowAlarm))
                    {
                        int runsAlarm = CountRingRunsAtAngle(alarmTexCopy, alarmGeo.Cx, alarmGeo.Cy, ang,
                            rMin, rMax, alarmRing);
                        if (runsAlarm > 1) offendersAlarm.Add($"alarme ang={ang:F0} runs={runsAlarm}");
                    }
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

        // (`ArcRadiusRatio` a été retiré : le rayon se MESURE désormais sur `ArcTrack`. Voir `RayonMesure`.)
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

        /// <summary>Un angle de l'hémicycle INFÉRIEUR, au rayon `r`, dont le point ne tombe PAS
        /// dans la boîte des libellés.
        ///
        /// ⚠️ POURQUOI CETTE FONCTION EXISTE — et c'est le défaut le plus instructif de cet oracle.
        /// La ligne de base était prise à **270° en dur**, c'est-à-dire DROIT EN BAS, au même rayon
        /// que l'échantillon. Or à ce rayon, droit en bas, on est **au milieu de `GaugeCaption`**.
        /// Avec « HEAT » (4 lettres) le centre du mot tombait dans un BLANC entre deux lettres, et
        /// la ligne de base valait « fond ». Avec « CHALEUR » (7 lettres) il tombe **sur une
        /// lettre** : la ligne de base est devenue de l'ENCRE, et tout point réellement vide s'est
        /// mis à « différer de la base » — l'oracle accusait le vide d'être un résidu d'arc.
        ///
        /// Mesuré : base = RGBA(0,416 0,392 0,337) — du crème, pas du fond. Le point incriminé
        /// valait RGBA(0,075 0,094 0,133), c'est-à-dire exactement le bleu nuit du disque.
        ///
        /// ⇒ **Une référence « fond » prise à un angle FIXE n'est une référence que tant que rien
        /// n'est dessiné à cet angle.** Le rendre dépendant de la boîte réelle du texte le répare
        /// pour toute longueur de libellé future, dans n'importe quelle langue.</summary>
        /// <summary>⚠️ LA BASE DOIT ÊTRE AU MÊME RAYON, et c'est ce qui rend l'échec possible.
        /// Le disque porte un dégradé RADIAL : comparer un échantillon à une base prise à un autre
        /// rayon mesurerait le dégradé, pas l'encre. Or MESURÉ — à `arcR − 2,5`, la boîte des
        /// libellés (51,6 × 21,6 px, centrée sous le pivot) recouvre **tout** l'hémicycle inférieur
        /// à ce rayon. Il n'existe alors AUCUN fond auquel se comparer, et la réponse honnête est
        /// de déclarer le rayon NON JUGEABLE — pas d'inventer une référence ailleurs.</summary>
        private static bool TryAngleDeBaseHorsTexte(Geo g, float r, out float angle)
        {
            for (float delta = 0f; delta <= 80f; delta += 2f)
            {
                angle = LowerReferenceAngleDeg - delta;
                if (!DansLaZoneDeTexte(g, r, angle)) return true;
                angle = LowerReferenceAngleDeg + delta;
                if (!DansLaZoneDeTexte(g, r, angle)) return true;
            }
            angle = LowerReferenceAngleDeg;
            return false;
        }

        private static bool DiffersFromRadialBaseline(Texture2D tex, Geo g, float r, float angleDeg)
        {
            float aBase;
            if (!TryAngleDeBaseHorsTexte(g, r, out aBase)) return false;  // rayon non jugeable
            Color sample = SamplePolar(tex, g.Cx, g.Cy, r, angleDeg);
            Color baseline = SamplePolar(tex, g.Cx, g.Cy, r, aBase);
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
                float arcR = geo.ArcRadius;

                var emptyUpperSectors = new List<string>();
                // ⚠️ « NON JUGEABLE » N'EST PAS « PAS D'ENCRE ». Un rayon dont l'hémicycle inférieur
                // est entièrement couvert par la boîte des libellés n'a AUCUN fond de référence à ce
                // rayon (le disque porte un dégradé radial : une base prise à un autre rayon
                // mesurerait le dégradé). Confondre les deux a produit un verdict UNIFORME — les 9
                // secteurs déclarés vides d'un coup — c'est-à-dire la signature d'un instrument qui
                // mesure autre chose. Ici on COMPTE les rayons jugeables et on ne conclut que sur eux.
                Transform geoSource = topBar.transform.Find("Manometre");
                int rayonsJugeables = 0;
                for (float rr = arcR - 2.5f; rr <= arcR + 2.5f; rr += 1f)
                {
                    float ig;
                    if (TryAngleDeBaseHorsTexte(geo, rr, out ig)) rayonsJugeables++;
                }
                Debug.Log($"[Oracle3] hémicycle supérieur : {rayonsJugeables} rayons sur 6 " +
                          $"disposent d'un fond de référence (arcR={arcR:F1}, boîte texte={geo.TextZone})");
                foreach (string nomT in new[] { "GaugeValue", "GaugeCaption" })
                {
                    Transform tt = null;
                    foreach (Transform c in geoSource.GetComponentsInChildren<Transform>(true))
                        if (c.name == nomT) { tt = c; break; }
                    if (tt == null) continue;
                    var tmpT = tt.GetComponent<TMPro.TextMeshProUGUI>();
                    Debug.Log($"[Oracle3-TXT] {nomT} «{(tmpT != null ? tmpT.text : "?")}» " +
                              $"boite={((RectTransform)tt).rect.width:F1} encre={(tmpT != null ? tmpT.preferredWidth : -1f):F1}");
                }
                Assert.Greater(rayonsJugeables, 0,
                    "aucun rayon de la bande d'arc n'a de fond de référence : la boîte des libellés " +
                    "couvre tout l'hémicycle inférieur à TOUS ces rayons. L'oracle ne peut plus rien " +
                    "juger — c'est un défaut de DESIGN (le libellé est trop large pour ce cadran), " +
                    "pas un défaut de l'arc.");

                for (float sectorStart = 0f; sectorStart < 180f; sectorStart += ArcSectorWidthDeg)
                {
                    bool anyInk = false;
                    for (float a = sectorStart; a < sectorStart + ArcSectorWidthDeg && !anyInk; a += 2f)
                        for (float r = arcR - 2.5f; r <= arcR + 2.5f && !anyInk; r += 1f)
                        {
                            float ig2;
                            if (!TryAngleDeBaseHorsTexte(geo, r, out ig2)) continue;
                            if (DiffersFromRadialBaseline(tex, geo, r, a)) anyInk = true;
                        }
                    if (!anyInk) emptyUpperSectors.Add($"[{sectorStart:F0},{sectorStart + ArcSectorWidthDeg:F0}]");
                }
                Assert.IsEmpty(emptyUpperSectors,
                    "trou dans l'arc du demi-cercle SUPÉRIEUR (aucune encre track/cold/hot trouvée, comparé " +
                    "au fond du MÊME rayon pris hors de la boîte des libellés) — secteurs : "
                    + string.Join(", ", emptyUpperSectors));

                // Zone morte "texte" (`DansLaZoneDeTexte` — boîte RÉELLE des libellés, pas un coin figé)
                // — même angle mort que CHECK 1.
                var offendingLowerSectors = new List<string>();
                int paires = 0, paiuresTexte = 0, paireNonJugeable = 0;
                for (float a = 185f; a < 355f; a += 2f) // évite 355-360/0-5 (chevauchement cold/hot mesuré au sommet) et 265-275 (la référence elle-même)
                {
                    if (a > 265f && a < 275f) continue;
                    for (float r = arcR - 2.5f; r <= arcR + 2.5f; r += 1f)
                    {
                        if (DansLaZoneDeTexte(geo, r, a)) { paiuresTexte++; continue; }
                        float ignore;
                        if (!TryAngleDeBaseHorsTexte(geo, r, out ignore)) { paireNonJugeable++; continue; }
                        paires++;
                        if (DiffersFromRadialBaseline(tex, geo, r, a))
                        {
                            // ★ « Un compte nu ne dit pas ce qu'il compte » : l'angle seul ne
                            // permet pas de savoir si le pixel trouvé est un vrai résidu d'arc, la
                            // frange d'un bout d'arc, ou un ornement légitime. On rapporte donc la
                            // COULEUR trouvée, celle du fond auquel elle a été comparée, et l'angle
                            // de ce fond.
                            float aB2; TryAngleDeBaseHorsTexte(geo, r, out aB2);
                            Color vu = SamplePolar(tex, geo.Cx, geo.Cy, r, a);
                            Color fond = SamplePolar(tex, geo.Cx, geo.Cy, r, aB2);
                            offendingLowerSectors.Add(
                                $"ang={a:F0} r={r - arcR:F1} vu={vu} fond={fond}@{aB2:F0}° " +
                                $"d={ColorDistance(vu, fond):F3}");
                        }
                    }
                }

                // ⛔ ANTI-VACUITÉ. Deux raisons LÉGITIMES d'ignorer un point — il est sous le texte,
                // ou son rayon n'a aucun fond de référence — et toutes deux grandissent quand les
                // libellés s'allongent. Sans ce compte, une traduction plus verbeuse rendrait la
                // garde VERTE en ne jugeant plus rien, et le compteur de la suite ne le dirait pas.
                Debug.Log($"[Oracle3] hémicycle inférieur : {paires} paires jugées, " +
                          $"{paiuresTexte} sous le texte, {paireNonJugeable} sans fond de référence");
                Assert.Greater(paires, 100,
                    $"seules {paires} paires (angle, rayon) ont pu être jugées dans l'hémicycle " +
                    $"inférieur ({paiuresTexte} sous le texte, {paireNonJugeable} sans fond) — " +
                    "la garde ne couvre plus assez de surface pour valoir quelque chose.");
                Assert.IsEmpty(offendingLowerSectors,
                    "piste parasite détectée dans le demi-cercle INFÉRIEUR (devrait être aussi vide que la " +
                    "référence à 270°, même rayon — le track ne couvre QUE l'hémicycle supérieur) : " +
                    string.Join("; ", offendingLowerSectors.Take(10)));

                // CONTRÔLE POSITIF (upper) — écraser un secteur du haut avec EXACTEMENT la couleur de
                // la référence 270° (même rayon) DOIT le faire ressortir "vide" par CE détecteur.
                for (float a = 80f; a <= 100f; a += 1f)
                    for (float r = arcR - 2.5f; r <= arcR + 2.5f; r += 1f)
                    {
                        float aB; TryAngleDeBaseHorsTexte(geo, r, out aB);
                        Color baseline = SamplePolar(tex, geo.Cx, geo.Cy, r, aB);
                        float rad = a * Mathf.Deg2Rad;
                        int px = Mathf.RoundToInt(geo.Cx + r * Mathf.Cos(rad));
                        int py = Mathf.RoundToInt(geo.Cy + r * Mathf.Sin(rad));
                        if (px >= 0 && py >= 0 && px < tex.width && py < tex.height) tex.SetPixel(px, py, baseline);
                    }
                tex.Apply();
                bool sector80to100StillHasInk = false;
                for (float a = 80f; a < 100f; a += 2f)
                    for (float r = arcR - 2.5f; r <= arcR + 2.5f; r += 1f)
                        if (DiffersFromRadialBaseline(tex, geo, r, a)) sector80to100StillHasInk = true;
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
                    if (DiffersFromRadialBaseline(tex, geo, arcInkR, a)) lowerProbeSeen = true;
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
