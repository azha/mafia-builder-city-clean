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

        // TD-884 (design v2, D1) — SOURCE DES PIXELS : une caméra + une RenderTexture FIXE, qui
        // PERSISTENT pour tout le test (la projection `Px` en a besoin tant qu'on mesure) et que
        // `TearDown` détruit. Plus d'attente de fin de trame ni de capture d'écran : elles ne rendent rien
        // en batchmode (« not evoked in batchmode », « failed to generate texture » : TD-884).
        private const int RtLargeur = 1280, RtHauteur = 720;
        private GameObject rendCamGo;
        private Camera rendCam;
        private RenderTexture rendRt;

        [TearDown]
        public void TearDown()
        {
            // DestroyImmediate comme V31 : un `Destroy` différé laisserait la caméra viser une RT déjà
            // relâchée jusqu'à la fin de la trame (Oracle1 démonte et reconstruit en plein test).
            if (rendCamGo != null) Object.DestroyImmediate(rendCamGo);
            rendCamGo = null; rendCam = null;
            if (rendRt != null) { rendRt.Release(); Object.DestroyImmediate(rendRt); }
            rendRt = null;
            if (scaffoldCanvasGo != null) Object.Destroy(scaffoldCanvasGo);
            scaffoldCanvasGo = null;
            LogAssert.ignoreFailingMessages = false;
        }

        /// <summary>D1 — le canvas du scaffold passe en `ScreenSpaceCamera`, vers une RT 1280×720
        /// FIXE : l'hôte batchmode rend à 640×480 (`scaleFactor` 0,5, mesuré), donc toutes les
        /// constantes en px de ce fichier (anneau ~3 px, bande ±2,5, gap de 19 px…) y étaient
        /// fausses d'un facteur 2. Une RT fixe rend l'oracle indépendant de l'hôte et ramène
        /// `scaleFactor` à 1, où elles sont vraies. `orthographicSize` n'est PAS posé (V31 non
        /// plus : en `ScreenSpaceCamera` le canvas épouse le frustum, `Px` annule échelle et cadrage).</summary>
        private void BuildRendu()
        {
            var canvas = scaffoldCanvasGo.GetComponent<Canvas>();
            rendRt = new RenderTexture(RtLargeur, RtHauteur, 24, RenderTextureFormat.ARGB32);
            rendRt.Create();
            rendCamGo = new GameObject("OracleCam");
            rendCam = rendCamGo.AddComponent<Camera>();
            rendCam.targetTexture = rendRt;
            rendCam.clearFlags = CameraClearFlags.SolidColor;
            rendCam.backgroundColor = Color.black;
            rendCam.orthographic = true;
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = rendCam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
        }

        /// <summary>Rend la scène dans la RT et la lit — À CHAQUE FOIS qu'un état change.</summary>
        private Texture2D Capturer()
        {
            Canvas.ForceUpdateCanvases();
            rendCam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rendRt;
            var tex = new Texture2D(RtLargeur, RtHauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, RtLargeur, RtHauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            return tex;
        }

        /// <summary>D2 — projection monde → pixel de la RT (origine bas-gauche, comme `ReadPixels`).
        /// Valable parce que `targetTexture` fixe le `pixelRect` de la caméra à la RT.</summary>
        private static Vector2 Px(Camera cam, Vector3 monde) => cam.WorldToScreenPoint(monde);

        /// <summary>Les 4 coins d'un rect, PROJETÉS en pixels (même ordre que `GetWorldCorners` :
        /// bas-gauche, haut-gauche, haut-droit, bas-droit).</summary>
        private static Vector2[] CoinsPx(Camera cam, RectTransform rt)
        {
            var w = new Vector3[4];
            rt.GetWorldCorners(w);
            return new[] { Px(cam, w[0]), Px(cam, w[1]), Px(cam, w[2]), Px(cam, w[3]) };
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

        private static Geo MeasureGeo(Camera cam, TopBarController topBar, RectTransform topBarSlot)
        {
            Transform manoT = topBar.transform.Find("Manometre");
            Assert.IsNotNull(manoT, "Manometre doit exister comme enfant DIRECT du TopBar");
            var manoRect = (RectTransform)manoT;
            Vector2[] mc = CoinsPx(cam, manoRect);   // D2 : coins PROJETÉS en pixels de la RT

            Vector2[] bc = CoinsPx(cam, topBarSlot);

            Transform hairlineT = topBar.transform.Find("Hairline");
            Assert.IsNotNull(hairlineT, "Hairline doit exister comme enfant DIRECT du TopBar (BuildHairline)");
            Vector2[] hc = CoinsPx(cam, (RectTransform)hairlineT);

            return new Geo
            {
                Cx = (mc[0].x + mc[2].x) / 2f,
                Cy = (mc[0].y + mc[1].y) / 2f,
                MedallionRadius = (mc[2].x - mc[0].x) / 2f,
                BarTopY = bc[1].y,    // haut de la barre (Unity : y plus GRAND = plus haut à l'écran)
                BarBottomY = bc[0].y, // bas de la barre
                HairlineTopY = hc[1].y,
                HairlineBottomY = hc[0].y,
                TextZone = UnionMonde(cam, manoT, "GaugeValue", "GaugeCaption"),
                // ⚠️ LE TEXTE N'EST PAS LE SEUL ÉLÉMENT LÉGITIME SUR LE CHEMIN D'UN BALAYAGE.
                // `BoitierLosange` — l'ornement doré suspendu SOUS le cadran — est du laiton, comme
                // l'anneau : un balayage radial à 270° le compte comme un SECOND passage et conclut
                // « anneau doublé ». L'ancienne fenêtre angulaire figée [210°,330°] le masquait par
                // accident, en même temps que le texte. En la remplaçant par la boîte RÉELLE du
                // texte — plus serrée, donc plus juste — l'ornement est ressorti. *Resserrer une
                // exclusion révèle ce qu'elle couvrait sans le dire.*
                ZonesExclues = new[]
                {
                    UnionMonde(cam, manoT, "GaugeValue", "GaugeCaption"),
                    UnionMonde(cam, manoT, "BoitierLosange"),
                },
                ArcRadius = RayonMesure(cam, manoT, "ArcTrack"),
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
        private static float RayonMesure(Camera cam, Transform racine, string nom)
        {
            Transform t = null;
            foreach (Transform c in racine.GetComponentsInChildren<Transform>(true))
                if (c.name == nom) { t = c; break; }
            Assert.IsNotNull(t, $"'{nom}' introuvable sous le manomètre — le rayon d'arc serait deviné");
            Vector2[] c4 = CoinsPx(cam, (RectTransform)t);   // D2 : les DEUX coins projetés, puis soustraits
            return (c4[2].x - c4[0].x) / 2f;
        }

        /// <summary>Union, en coordonnées ÉCRAN, des rectangles de plusieurs descendants nommés.</summary>
        private static Rect UnionMonde(Camera cam, Transform racine, params string[] noms)
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
                Vector2[] c4 = CoinsPx(cam, (RectTransform)t);
                foreach (Vector2 p in c4)
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
        /// <summary>L'INDEX du pixel qui CONTIENT le point (cx + r·cos, cy + r·sin), coordonnées continues
        /// de `WorldToScreenPoint` (le pixel i couvre [i, i+1[). TD-884 : l'ancien `RoundToInt` lisait le
        /// pixel dont le CENTRE est à +0,5, soit un biais d'un demi-pixel vers le haut et la droite — sans
        /// effet tant que l'instrument était aveugle, mais à r = 21 px il déplaçait l'échantillon du haut
        /// de la piste hors de son encre (Oracle3, secteur [80,100]). Même index pour la LECTURE et pour
        /// l'ÉCRITURE des contrôles positifs.</summary>
        private static (int px, int py) IndexPx(float cx, float cy, float radius, float angleDeg)
        {
            float rad = angleDeg * Mathf.Deg2Rad;
            return (Mathf.FloorToInt(cx + radius * Mathf.Cos(rad)), Mathf.FloorToInt(cy + radius * Mathf.Sin(rad)));
        }

        private static Color SamplePolar(Texture2D tex, float cx, float cy, float radius, float angleDeg)
        {
            var (px, py) = IndexPx(cx, cy, radius, angleDeg);
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
        // D3 — GARDES D'EFFET, en TÊTE de chaque oracle de pixels. Un instrument aveugle doit
        // rougir « INSTRUMENT », jamais rendre un vert sur du noir. On ne lit pas le PARAMÈTRE
        // (`scaleFactor`) : on mesure son RÉSULTAT.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private const float RayonMedaillonAttenduPx = 34f;   // 68 / 2 à l'échelle 1 (`TopBarController.ManometreDiameter` = 68)
        private const float RayonMedaillonTolerancePx = 0.5f;
        // Seuil CHOISI (pas hérité) : le disque fait ≈ 3 600 px ; V31 compte `sampled > 100` pour
        // son patron avant/sans. En deçà, le manomètre n'est pas dans l'image rendue.
        private const int MinPixelsTemoin = 100;
        private const float TemoinEpsilon = 0.02f;

        /// <summary>Le manomètre rendu, sans lui : deux rendus qui ne diffèrent QUE par
        /// `Manometre.SetActive(false)` (témoin à un facteur).</summary>
        private Texture2D CapturerSansManometre(TopBarController topBar)
        {
            GameObject mano = topBar.transform.Find("Manometre").gameObject;
            mano.SetActive(false);
            Texture2D sans = Capturer();
            mano.SetActive(true);
            return sans;
        }

        private void GardesInstrument(string oracle, Geo g, Texture2D avec, Texture2D sans)
        {
            Debug.Log($"[{oracle}] RT={rendRt.width}x{rendRt.height} (texture {avec.width}x{avec.height}) " +
                      $"rayon du médaillon projeté={g.MedallionRadius:F2} px (attendu {RayonMedaillonAttenduPx} ± {RayonMedaillonTolerancePx}) centre=({g.Cx:F2},{g.Cy:F2})");
            // (a) EFFET de l'échelle — le rayon PROJETÉ, pas `scaleFactor`.
            Assert.AreEqual(RayonMedaillonAttenduPx, g.MedallionRadius, RayonMedaillonTolerancePx,
                $"INSTRUMENT : le rayon du médaillon projeté vaut {g.MedallionRadius:F2} px, pas {RayonMedaillonAttenduPx} — " +
                "l'échelle de la RT n'est pas 1 : toutes les constantes en px de ce fichier sont fausses.");
            // (b) le centre et le disque sont dans la texture (le haut peut mordre de 2 px : MaxTopOverflowPx).
            float r = g.MedallionRadius;
            Assert.IsTrue(g.Cx - r >= 0f && g.Cx + r <= avec.width && g.Cy - r >= 0f && g.Cy >= 0f && g.Cy <= avec.height,
                $"INSTRUMENT : le médaillon (centre {g.Cx:F1},{g.Cy:F1} rayon {r:F1}) n'est pas dans la texture {avec.width}x{avec.height}.");
            // (c) témoin à un facteur : le manomètre est dans l'image (≥ MinPixelsTemoin pixels du disque changent sans lui).
            int diffs = 0;
            int x0 = Mathf.Max(0, Mathf.FloorToInt(g.Cx - r)), x1 = Mathf.Min(avec.width - 1, Mathf.CeilToInt(g.Cx + r));
            int y0 = Mathf.Max(0, Mathf.FloorToInt(g.Cy - r)), y1 = Mathf.Min(avec.height - 1, Mathf.CeilToInt(g.Cy + r));
            for (int y = y0; y <= y1; y++)
                for (int x = x0; x <= x1; x++)
                {
                    float dx = x + 0.5f - g.Cx, dy = y + 0.5f - g.Cy;
                    if (dx * dx + dy * dy > r * r) continue;
                    if (ColorDistance(avec.GetPixel(x, y), sans.GetPixel(x, y)) > TemoinEpsilon) diffs++;
                }
            Debug.Log($"[{oracle}] témoin : {diffs} pixels du disque diffèrent sans Manometre (minimum {MinPixelsTemoin})");
            Assert.GreaterOrEqual(diffs, MinPixelsTemoin,
                $"INSTRUMENT : seuls {diffs} pixels du disque diffèrent quand on retire le manomètre (minimum {MinPixelsTemoin}) — " +
                "le rendu est aveugle (noir ou fond seul) : aucun verdict de pixels ne vaut quoi que ce soit.");
        }

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

        private IEnumerator MeasureRingColor(bool alarm, System.Action<Texture2D, Geo, Color> onMeasured,
            System.Action<TopBarController> mutation = null)
        {
            var (topBar, topBarSlot) = BuildScaffold();
            BuildRendu();
            topBar.SetCitywideHeatBucket(alarm ? "BURNING" : "WARM");
            yield return null;
            mutation?.Invoke(topBar);   // D4 : la faute vit sur la SCÈNE, avant la capture

            Geo geo = MeasureGeo(rendCam, topBar, topBarSlot);
            Texture2D tex = Capturer();
            Texture2D sans = CapturerSansManometre(topBar);
            try
            {
                GardesInstrument("Oracle1", geo, tex, sans);
                // Couleur de référence de l'anneau : moyenne de 8 échantillons répartis (évite un
                // seul point d'AA) au rayon nominal (medallionRadius - épaisseur/2 ≈ bord du trait).
                float ringR = geo.MedallionRadius - 1.5f;
                Color sum = Color.black;
                int n = 0;
                foreach (float a in new[] { 0f, 45f, 90f, 135f, 180f, 225f, 270f, 315f })
                {
                    // évite les angles où le filet bas de barre / le losange décoratif dominent
                    if (a > 250f && a < 290f) continue; // proche du "bas" (270°) — laissé de côté ici
                    // TD-884 : le PIC, pas un point. L'anneau fait 3 px avec 1,5 px d'anti-crénelage de
                    // chaque côté : un échantillon à `ringR` lit une couleur mêlée au fond (mesuré : un anneau
                    // forcé à accentDanger ressortait à 0,143 de lui-même, donc au-dessus du seuil 0,10 de la
                    // propriété 2 — qui ne pouvait pas voir ce qu'elle garde). On prend, sur la bande de
                    // l'anneau, le pixel LE PLUS ÉLOIGNÉ du fond du cadran (pris 6 px plus à l'intérieur).
                    Color fondCadran = SamplePolar(tex, geo.Cx, geo.Cy, geo.MedallionRadius - 6f, a);
                    Color pic = SamplePolar(tex, geo.Cx, geo.Cy, ringR, a);
                    float dPic = ColorDistance(pic, fondCadran);
                    for (float rr = geo.MedallionRadius - 3f; rr <= geo.MedallionRadius; rr += 0.5f)
                    {
                        Color c = SamplePolar(tex, geo.Cx, geo.Cy, rr, a);
                        float d = ColorDistance(c, fondCadran);
                        if (d > dPic) { dPic = d; pic = c; }
                    }
                    sum += pic;
                    n++;
                }
                Color avgRing = new Color(sum.r / n, sum.g / n, sum.b / n);
                onMeasured(tex, geo, avgRing);
            }
            finally { Object.Destroy(tex); Object.Destroy(sans); }
        }

        /// <summary>Les deux prises d'Oracle1 (calme, alarme) : des COPIES de texture, détruites par l'appelant.</summary>
        private class PriseRing
        {
            public Texture2D CalmTex, AlarmTex;
            public Geo CalmGeo, AlarmGeo;
            public Color CalmRing, AlarmRing;
            public Color RawRing;   // TÉMOIN d'étalonnage : l'anneau forcé à `accentDanger`, rendu par le même sprite
            public void Detruire()
            {
                if (CalmTex != null) Object.Destroy(CalmTex);
                if (AlarmTex != null) Object.Destroy(AlarmTex);
            }
        }

        private static Texture2D Copie(Texture2D tex)
        {
            var copie = new Texture2D(tex.width, tex.height, TextureFormat.RGBA32, false);
            copie.SetPixels(tex.GetPixels());
            copie.Apply();
            return copie;
        }

        /// <summary>Capture : calme PUIS alarme (deux scaffolds INDÉPENDANTS, chacun sa propre prise —
        /// jamais de comparaison entre deux trames d'un même scaffold qui aurait pu dériver).
        /// `mutationAlarme` ≠ null : la faute n'est posée que sur la scène d'alarme (D4).</summary>
        private IEnumerator PrendreLesDeuxEtats(PriseRing prise, System.Action<TopBarController> mutationAlarme)
        {
            yield return MeasureRingColor(alarm: false, onMeasured: (tex, geo, ring) =>
            {
                prise.CalmRing = ring; prise.CalmGeo = geo; prise.CalmTex = Copie(tex);
            });
            TearDown();   // caméra, RT et scaffold du calme démontés (la géométrie est déjà en pixels)
            yield return MeasureRingColor(alarm: true, onMeasured: (tex, geo, ring) =>
            {
                prise.AlarmRing = ring; prise.AlarmGeo = geo; prise.AlarmTex = Copie(tex);
            }, mutationAlarme);
            TearDown();
            // TÉMOIN D'ÉTALONNAGE (TD-884, ruling f2 11/11) : `accentDanger` BRUT, tel que CET instrument le
            // voit. Le sprite `Ring` (3 px, anti-crénelage de 1,5 px de chaque côté) plafonne à ~0,86 d'alpha :
            // un anneau forcé à `accentDanger` ressort à 0,86 × sa couleur. Comparer l'alarme à la valeur du
            // jeton non atténuée gonflait la distance (0,246 mesuré) et rendait la propriété 2 incapable de
            // voir ce qu'elle garde (M1 : 0,151 > 0,10). On compare donc deux rendus par le même chemin.
            yield return MeasureRingColor(alarm: true, onMeasured: (tex, geo, ring) => { prise.RawRing = ring; },
                mutation: ForcerAnneauEnDangerBrut);
        }

        /// <summary>La faute de M1, et le rendu du témoin : `BoitierRing` à `accentDanger` brut.</summary>
        private static void ForcerAnneauEnDangerBrut(TopBarController topBar)
        {
            Transform ringT = topBar.transform.Find("Manometre/BoitierRing");
            Assert.IsNotNull(ringT, "BoitierRing doit exister sous Manometre");
            ringT.GetComponent<Image>().color = DesignTokens.Current.accentDanger;
        }

        [UnityTest]
        public IEnumerator Oracle1_Ring_UniqueLaitonFamily_On360_CalmAndAlarm_NeverRawDanger()
        {
            var prise = new PriseRing();
            yield return PrendreLesDeuxEtats(prise, mutationAlarme: null);
            try { VerdictRing(prise); }
            finally { prise.Detruire(); }
        }

        /// <summary>Le VERDICT d'Oracle1 : SYNCHRONE, sur des données déjà capturées (un `yield` dans un
        /// `Assert.Throws` donnerait « aucune exception »). Les mutations l'appellent sur une scène fautive.</summary>
        private static void VerdictRing(PriseRing prise)
        {
            Color calmRing = prise.CalmRing, alarmRing = prise.AlarmRing;
            Geo calmGeo = prise.CalmGeo, alarmGeo = prise.AlarmGeo;
            Texture2D calmTexCopy = prise.CalmTex, alarmTexCopy = prise.AlarmTex;
            try
            {
                // ── propriété 1 : l'anneau RÉAGIT à l'état (sinon "jamais rouge vif" est vide de sens) ──
                Assert.Greater(ColorDistance(calmRing, alarmRing), 0.05f,
                    $"l'anneau doit CHANGER de teinte entre calme ({calmRing}) et alarme ({alarmRing})");

                // ── propriété 2 : sous alarme, ce n'est PAS le rouge d'alerte sémantique brut ──
                // Référence = le TÉMOIN d'étalonnage (`prise.RawRing`), pas la couleur du jeton : voir `PrendreLesDeuxEtats`.
                Color rawDanger = prise.RawRing;
                float distToRaw = ColorDistance(alarmRing, rawDanger);
                Debug.Log($"[VerdictRing] calme={calmRing} alarme={alarmRing} accentDanger rendu={rawDanger} (jeton {DesignTokens.Current.accentDanger}) dist(calme,alarme)={ColorDistance(calmRing, alarmRing):F3} dist(alarme,danger)={distToRaw:F3}");
                Assert.Greater(distToRaw, NotRawDangerMinDistance,
                    $"l'anneau alarme ({alarmRing}) est trop proche de accentDanger brut ({rawDanger}, " +
                    $"dist={distToRaw:F3}) — doctrine : une TEINTE du laiton, pas un rouge d'alerte générique dupliqué. " +
                    "MARGE RÉELLE ÉTROITE (mesurée le 11/11/2026, mesurée : alarme à 0,113 du rouge brut rendu, mutation à 0,000, pour un seuil de 0,10) : la teinte d'alarme n'est qu'à ~0,11 du rouge " +
                    $"brut rendu pour un seuil de {NotRawDangerMinDistance}. Un rouge ici, sans changement d'instrument " +
                    "(rayon projeté 34, témoin de disque), se lit comme un CHANGEMENT DE PALETTE (warmedBrass ou accentDanger), pas comme un flake.");

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
        // TD-951 — la BANDE est CENTRÉE sur la piste mesurée, et le fond de référence est un SECOND RENDU.
        // La piste occupe [arcR − 5, arcR] (`ArcThicknessPx` = 5, bord extérieur à `arcR`, frange d'anti-crénelage de
        // 1,5 px à l'extérieur) : la bande [arcR − 4, arcR − 1] en est le cœur plein. L'ancienne bande `arcR ± 2,5`
        // recouvrait [arcR, arcR + 2,5], où vit l'encre qui n'est PAS la piste (lunette) : MESURÉ run4, l'écart maximal
        // des secteurs restait à 0,10-0,33 piste masquée — l'absence ne se voyait pas.
        // Le fond n'est plus lu « ailleurs sur la même image » : la boîte des libellés (36,5 × 23 px) couvre le bas du
        // cadran jusqu'à r ≈ 20,4 (MESURÉ : 4 rayons sur 6 avaient un fond, 76 paires jugeables pour un plancher de 100) —
        // une bande centrée sur la piste (r < 20,4) n'a donc AUCUN fond hors du texte. Le fond est le MÊME point du MÊME
        // rendu, pris sans les trois arcs (`CapturerSansArcs`) : texte, lunette, filet et dégradé radial s'annulent, il ne
        // reste que l'encre des arcs. Les seuils (`ArcInkEpsilon`, secteurs de 20°, plancher de 100) sont INCHANGÉS.
        private const float ArcInkEpsilon = 0.05f;
        private const float ArcBandInnerBelowOuterPx = 4f;
        private const float ArcBandOuterBelowOuterPx = 1f;

        /// <summary>L'écart de couleur entre le rendu complet et le rendu SANS les trois arcs, au même point polaire :
        /// 0 s'il n'y a pas d'encre d'arc là, la distance de l'encre au fond sinon.</summary>
        private static float EncreDArc(Texture2D avec, Texture2D sansArcs, Geo g, float r, float angleDeg)
            => ColorDistance(SamplePolar(avec, g.Cx, g.Cy, r, angleDeg), SamplePolar(sansArcs, g.Cx, g.Cy, r, angleDeg));

        /// <summary>Le rendu sans `ArcTrack`, `ArcCold`, `ArcHot` (témoin à un facteur de l'ENCRE d'arc). Chaque arc
        /// retrouve l'état qu'il avait : un arc déjà masqué par une mutation reste masqué.</summary>
        private Texture2D CapturerSansArcs(TopBarController topBar)
        {
            var arcs = new List<GameObject>();
            foreach (string nom in new[] { "ArcTrack", "ArcCold", "ArcHot" })
            {
                Transform t = topBar.transform.Find("Manometre/" + nom);
                Assert.IsNotNull(t, $"{nom} doit exister sous Manometre");
                arcs.Add(t.gameObject);
            }
            var etats = arcs.Select(g => g.activeSelf).ToList();
            foreach (var g in arcs) g.SetActive(false);
            Texture2D sans = Capturer();
            for (int i = 0; i < arcs.Count; i++) arcs[i].SetActive(etats[i]);
            return sans;
        }

        // TD-951 (11/11) — les deux [Ignore] sont retirés : voir `VerdictArc` (bande centrée sur la piste, fond = rendu sans
        // arcs) et `Mutation_M2` / `Mutation_M4` (la piste masquée, puis décalée, rougissent POUR LA BONNE RAISON).
        [UnityTest]
        public IEnumerator Oracle3_ArcCoversEveryUpperSector_AbsentInLowerHalf()
        {
            var (topBar, topBarSlot) = BuildScaffold();
            BuildRendu();
            topBar.SetCitywideHeatBucket("WARM");
            yield return null;

            Geo geo = MeasureGeo(rendCam, topBar, topBarSlot);
            Texture2D tex = Capturer();
            Texture2D sans = CapturerSansManometre(topBar);
            Texture2D sansArcs = CapturerSansArcs(topBar);
            try
            {
                GardesInstrument("Oracle3", geo, tex, sans);
                VerdictArc(geo, tex, sansArcs);
            }
            finally { Object.Destroy(tex); Object.Destroy(sans); Object.Destroy(sansArcs); }
        }

        /// <summary>Le VERDICT d'Oracle3 : SYNCHRONE (voir `VerdictRing`). `tex` = le rendu complet, `sansArcs` = le MÊME
        /// rendu sans `ArcTrack`/`ArcCold`/`ArcHot` : l'encre d'arc en un point est leur écart (voir `EncreDArc`).</summary>
        private static void VerdictArc(Geo geo, Texture2D tex, Texture2D sansArcs)
        {
            float arcR = geo.ArcRadius;
            float rMin = arcR - ArcBandInnerBelowOuterPx, rMax = arcR - ArcBandOuterBelowOuterPx;

            // D3 — garde d'EFFET de l'instrument : le rendu sans arcs doit DIFFÉRER du rendu complet sur le demi-cercle
            // supérieur (sinon les arcs n'ont pas été retirés, ou rien ne se dessine : aucun verdict ne vaut quoi que ce soit).
            // ⚠️ Phrase DISTINCTE de celle du verdict : un instrument aveugle ne doit jamais passer pour « un trou dans l'arc ».
            int echantillonsEncre = 0;
            for (float a = 0f; a < 180f; a += 2f)
                for (float r = rMin; r <= rMax; r += 0.5f)
                    if (EncreDArc(tex, sansArcs, geo, r, a) > ArcInkEpsilon) echantillonsEncre++;
            Debug.Log($"[Oracle3] bande [{rMin:F1},{rMax:F1}] (arcR={arcR:F1}) : {echantillonsEncre} échantillons du demi-cercle " +
                      $"supérieur diffèrent sans les arcs (minimum {MinPixelsTemoin})");
            Assert.GreaterOrEqual(echantillonsEncre, MinPixelsTemoin,
                $"INSTRUMENT : seuls {echantillonsEncre} échantillons de la bande d'arc diffèrent quand on retire les trois arcs " +
                $"(minimum {MinPixelsTemoin}) — le rendu sans arcs est identique au rendu complet : l'oracle est aveugle.");

            // Marge collée : le PROFIL angulaire (max sur la bande, ×100, pas de 2°) — un trou étroit ne se voit pas dans un max de secteur.
            var profil = new System.Text.StringBuilder();
            for (float a = 0f; a < 180f; a += 2f)
            {
                float m = 0f;
                for (float r = rMin; r <= rMax; r += 0.5f) m = Mathf.Max(m, EncreDArc(tex, sansArcs, geo, r, a));
                profil.Append(Mathf.RoundToInt(m * 100f)).Append(' ');
            }
            Debug.Log($"[Oracle3-PROFIL] 0..178° pas 2° (encre ×100) : {profil}");
            var emptyUpperSectors = new List<string>();
            for (float sectorStart = 0f; sectorStart < 180f; sectorStart += ArcSectorWidthDeg)
            {
                // « L'arc COUVRE le secteur » = CHAQUE angle échantillonné du secteur porte de l'encre dans la bande (le plus faible
                // des angles, chacun pris à son meilleur rayon). Le MAX du secteur laissait passer un trou de 28° (64°-90°, piste
                // masquée ou décalée) dès qu'un seul angle du secteur de 20° était couvert par cold/hot — MESURÉ run2, profil ci-dessus.
                float meilleure = float.MaxValue;
                for (float a = sectorStart; a < sectorStart + ArcSectorWidthDeg; a += 2f)
                {
                    float m = 0f;
                    for (float r = rMin; r <= rMax; r += 0.5f) m = Mathf.Max(m, EncreDArc(tex, sansArcs, geo, r, a));
                    meilleure = Mathf.Min(meilleure, m);
                }
                Debug.Log($"[Oracle3] secteur [{sectorStart:F0},{sectorStart + ArcSectorWidthDeg:F0}] : encre d'arc au plus faible des angles {meilleure:F3} (seuil {ArcInkEpsilon})");
                if (!(meilleure > ArcInkEpsilon)) emptyUpperSectors.Add($"[{sectorStart:F0},{sectorStart + ArcSectorWidthDeg:F0}]");
            }
            Assert.IsEmpty(emptyUpperSectors,
                "trou dans l'arc du demi-cercle SUPÉRIEUR (aucune encre track/cold/hot dans la bande centrée sur la piste, " +
                $"comparé au MÊME rendu sans les trois arcs, r ∈ [{rMin:F1},{rMax:F1}]) — secteurs : "
                + string.Join(", ", emptyUpperSectors));

            // Hémicycle INFÉRIEUR : aucune encre d'arc (le track ne couvre QUE l'hémicycle supérieur). On évite 355-360/0-5
            // (chevauchement cold/hot mesuré au sommet). Le texte et la lunette s'annulent dans la différence : plus de zone
            // « sous le texte », donc plus de paires perdues sous la boîte des libellés.
            var offendingLowerSectors = new List<string>();
            int paires = 0;
            for (float a = 185f; a < 355f; a += 2f)
                for (float r = rMin; r <= rMax; r += 1f)
                {
                    paires++;
                    float d = EncreDArc(tex, sansArcs, geo, r, a);
                    if (d > ArcInkEpsilon) offendingLowerSectors.Add($"ang={a:F0} r={r - arcR:F1} d={d:F3}");
                }
            // ⛔ ANTI-VACUITÉ (plancher INCHANGÉ : 100).
            Debug.Log($"[Oracle3] hémicycle inférieur : {paires} paires jugées (plancher 100), {offendingLowerSectors.Count} avec de l'encre d'arc");
            Assert.Greater(paires, 100,
                $"seules {paires} paires (angle, rayon) ont pu être jugées dans l'hémicycle inférieur — la garde ne couvre plus assez de surface.");
            Assert.IsEmpty(offendingLowerSectors,
                "piste parasite détectée dans le demi-cercle INFÉRIEUR (le track ne couvre QUE l'hémicycle supérieur) : "
                + string.Join("; ", offendingLowerSectors.Take(10)));

            // CONTRÔLE POSITIF (upper) — remplacer un secteur du haut par le pixel du rendu SANS arcs DOIT le faire voir vide.
            for (float a = 80f; a <= 100f; a += 1f)
                for (float r = rMin; r <= rMax; r += 1f)
                {
                    var (px, py) = IndexPx(geo.Cx, geo.Cy, r, a);
                    if (px >= 0 && py >= 0 && px < tex.width && py < tex.height) tex.SetPixel(px, py, sansArcs.GetPixel(px, py));
                }
            tex.Apply();
            bool sector80to100StillHasInk = false;
            for (float a = 80f; a < 100f; a += 2f)
                for (float r = rMin; r <= rMax; r += 1f)
                    if (EncreDArc(tex, sansArcs, geo, r, a) > ArcInkEpsilon) sector80to100StillHasInk = true;
            Assert.IsFalse(sector80to100StillHasInk,
                "CONTRÔLE POSITIF : un secteur remplacé par le rendu sans arcs (80°-100°) doit être vu comme VIDE");

            // CONTRÔLE POSITIF (lower) — peindre l'encre de l'arc (couleur observée à 150°, hémicycle supérieur) sur 340°-350°
            // DOIT être détecté par la sonde du demi-cercle inférieur. `arcInkR` reste dans la bande solide de la piste.
            const float LowerProbeStartDeg = 340f, LowerProbeEndDeg = 350f;
            float arcInkR = arcR - 2f;
            Color trackColorObserved = SamplePolar(tex, geo.Cx, geo.Cy, arcInkR, 150f);
            for (float a = LowerProbeStartDeg; a <= LowerProbeEndDeg; a += 1f)
            {
                var (px, py) = IndexPx(geo.Cx, geo.Cy, arcInkR, a);
                if (px >= 0 && py >= 0 && px < tex.width && py < tex.height) tex.SetPixel(px, py, trackColorObserved);
            }
            tex.Apply();
            bool lowerProbeSeen = false;
            for (float a = LowerProbeStartDeg; a < LowerProbeEndDeg; a += 2f)
                if (EncreDArc(tex, sansArcs, geo, arcInkR, a) > ArcInkEpsilon) lowerProbeSeen = true;
            Assert.IsTrue(lowerProbeSeen,
                $"CONTRÔLE POSITIF : une encre d'arc plantée sur le bas ({LowerProbeStartDeg:F0}°-{LowerProbeEndDeg:F0}°) DOIT être " +
                "détectée par la sonde du demi-cercle inférieur — sinon le 'vide' mesuré plus haut ne prouve rien");
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

        /// <summary>Le rect de `GaugeValue` en PIXELS de la RT (coins projetés — D2).</summary>
        private static Rect EcranDeGaugeValue(Camera cam, TopBarController topBar)
        {
            Transform gaugeValueT = topBar.transform.Find("Manometre/GaugeValue");
            Assert.IsNotNull(gaugeValueT, "GaugeValue doit exister sous Manometre");
            Vector2[] corners = CoinsPx(cam, (RectTransform)gaugeValueT);
            return new Rect(corners[0].x, corners[0].y, corners[2].x - corners[0].x, corners[1].y - corners[0].y);
        }

        /// <summary>fond LOCAL : un point sur le cadran, à la même hauteur Y, hors de la boîte de texte.</summary>
        private static Color FondLocal(Texture2D tex, Geo geo, Rect screenRect)
            => tex.GetPixel(Mathf.RoundToInt(geo.Cx - screenRect.width), Mathf.RoundToInt(screenRect.center.y));

        [UnityTest]
        public IEnumerator Oracle4_CentralText_MeetsMinimumContrast()
        {
            var (topBar, topBarSlot) = BuildScaffold();
            BuildRendu();
            topBar.SetCitywideHeatBucket("WARM");
            yield return null;

            Rect screenRect = EcranDeGaugeValue(rendCam, topBar);
            Geo geo = MeasureGeo(rendCam, topBar, topBarSlot);
            Texture2D tex = Capturer();
            Texture2D sans = CapturerSansManometre(topBar);
            try
            {
                GardesInstrument("Oracle4", geo, tex, sans);
                VerdictContraste(tex, screenRect, FondLocal(tex, geo, screenRect));
            }
            finally { Object.Destroy(tex); Object.Destroy(sans); }
        }

        /// <summary>Le VERDICT d'Oracle4 : SYNCHRONE (voir `VerdictRing`).</summary>
        private static void VerdictContraste(Texture2D tex, Rect screenRect, Color localBg)
        {
            {
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
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // D4 — CONTRÔLES DE MUTATION SUR LA SCÈNE. Les contrôles positifs ci-dessus dégradent la
        // TEXTURE après capture : ils ne voient pas une scène qui rend faux. Ici la FAUTE est posée
        // sur la scène, capturée, puis le verdict SYNCHRONE doit la refuser — et le MESSAGE de
        // l'assertion qui rougit doit être celui de l'assertion VISÉE : sinon un autre garde (D3,
        // anti-vacuité, contrôle positif) aurait rougi pour une autre raison, et le test serait
        // « rouge pour la mauvaise raison » (ou, pire, vert).
        // Ces tests PASSENT quand l'assertion visée tombe.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private static void ExigerRougeParCetteAssertion(System.Action verdict, string phraseVisee, params string[] aussi)
        {
            var ex = Assert.Throws<AssertionException>(() => verdict(),
                "la scène fautive doit être REFUSÉE par le verdict — il l'a laissée passer");
            StringAssert.Contains(phraseVisee, ex.Message,
                "le verdict a rougi, mais PAS par l'assertion visée (« rouge pour la mauvaise raison »)");
            foreach (string p in aussi)
                StringAssert.Contains(p, ex.Message, $"le verdict a rougi par la bonne assertion, mais PAS sur le secteur visé « {p} »");
        }

        /// <summary>M1 — `BoitierRing` forcé à `accentDanger` BRUT sous alarme : la propriété 1 (l'anneau
        /// réagit à l'état) doit PASSER, la propriété 2 (« pas le rouge d'alerte brut ») doit tomber.</summary>
        [UnityTest]
        public IEnumerator Mutation_M1_AnneauAlarmeEnDangerBrut_RougitLaProprieteDeux()
        {
            var prise = new PriseRing();
            yield return PrendreLesDeuxEtats(prise, mutationAlarme: ForcerAnneauEnDangerBrut);
            try { ExigerRougeParCetteAssertion(() => VerdictRing(prise), "trop proche de accentDanger brut"); }
            finally { prise.Detruire(); }
        }

        /// <summary>M2 — `ArcTrack` masqué : le fond radial reste, l'ABSENCE de la piste rougit les secteurs
        /// du demi-cercle supérieur.</summary>
        [UnityTest]
        public IEnumerator Mutation_M2_ArcTrackMasque_RougitLesSecteursSuperieurs()
        {
            var (topBar, topBarSlot) = BuildScaffold();
            BuildRendu();
            topBar.SetCitywideHeatBucket("WARM");
            yield return null;

            Geo geo = MeasureGeo(rendCam, topBar, topBarSlot);   // mesuré AVANT la faute
            Transform trackT = topBar.transform.Find("Manometre/ArcTrack");
            Assert.IsNotNull(trackT, "ArcTrack doit exister sous Manometre");
            trackT.gameObject.SetActive(false);
            Texture2D tex = Capturer();
            Texture2D sans = CapturerSansManometre(topBar);
            Texture2D sansArcs = CapturerSansArcs(topBar);   // ArcTrack reste masqué : la référence ne le rétablit pas
            try
            {
                GardesInstrument("Mutation_M2", geo, tex, sans);
                ExigerRougeParCetteAssertion(() => VerdictArc(geo, tex, sansArcs),
                    "trou dans l'arc du demi-cercle SUPÉRIEUR", "[60,80]", "[80,100]");   // le trou mesuré : 64°-90°
            }
            finally { Object.Destroy(tex); Object.Destroy(sans); Object.Destroy(sansArcs); }
        }

        /// <summary>M4 — `ArcTrack` DÉCALÉ de 6 px vers le haut (le pivot de la piste n'est plus celui du médaillon) : sa
        /// piste existe encore, mais plus dans la bande centrée sur la piste mesurée. Le verdict doit tomber par le trou
        /// dans l'arc (jamais par la garde d'instrument : cold/hot sont toujours là).</summary>
        [UnityTest]
        public IEnumerator Mutation_M4_ArcTrackDecale_RougitLesSecteursSuperieurs()
        {
            var (topBar, topBarSlot) = BuildScaffold();
            BuildRendu();
            topBar.SetCitywideHeatBucket("WARM");
            yield return null;

            Geo geo = MeasureGeo(rendCam, topBar, topBarSlot);   // mesuré AVANT la faute
            var trackRect = (RectTransform)topBar.transform.Find("Manometre/ArcTrack");
            Assert.IsNotNull(trackRect, "ArcTrack doit exister sous Manometre");
            trackRect.anchoredPosition += new Vector2(0f, ArcTrackDecalagePx);
            Texture2D tex = Capturer();
            Texture2D sans = CapturerSansManometre(topBar);
            Texture2D sansArcs = CapturerSansArcs(topBar);
            try
            {
                GardesInstrument("Mutation_M4", geo, tex, sans);
                ExigerRougeParCetteAssertion(() => VerdictArc(geo, tex, sansArcs),
                    "trou dans l'arc du demi-cercle SUPÉRIEUR", "[60,80]", "[80,100]");   // le trou mesuré : 64°-90°
            }
            finally { Object.Destroy(tex); Object.Destroy(sans); Object.Destroy(sansArcs); }
        }
        private const float ArcTrackDecalagePx = 6f;

        /// <summary>M3 — `GaugeValue` à la couleur du fond local : DEUX passes (le fond local n'est connu
        /// qu'après une 1ʳᵉ capture). Le contraste minimum doit tomber.</summary>
        [UnityTest]
        public IEnumerator Mutation_M3_ValeurALaCouleurDuFond_RougitLeContraste()
        {
            var (topBar, topBarSlot) = BuildScaffold();
            BuildRendu();
            topBar.SetCitywideHeatBucket("WARM");
            yield return null;

            Rect screenRect = EcranDeGaugeValue(rendCam, topBar);
            Geo geo = MeasureGeo(rendCam, topBar, topBarSlot);
            Texture2D premiere = Capturer();
            Texture2D sans = CapturerSansManometre(topBar);
            Texture2D seconde = null;
            try
            {
                GardesInstrument("Mutation_M3", geo, premiere, sans);
                Color localBg = FondLocal(premiere, geo, screenRect);
                var texte = topBar.transform.Find("Manometre/GaugeValue").GetComponent<TMPro.TMP_Text>();
                Assert.IsNotNull(texte, "GaugeValue doit porter un TMP_Text");
                texte.color = localBg;
                seconde = Capturer();
                ExigerRougeParCetteAssertion(() => VerdictContraste(seconde, screenRect, localBg),
                    "texte illisible");
            }
            finally
            {
                Object.Destroy(premiere); Object.Destroy(sans);
                if (seconde != null) Object.Destroy(seconde);
            }
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
