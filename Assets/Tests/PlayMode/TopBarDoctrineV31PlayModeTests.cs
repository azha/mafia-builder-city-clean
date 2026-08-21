using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Theme;
using MafiaCleanCity.Theme.Tests; // CanonPaletteComparator.ExpectedTokenCount — source unique des 62 tokens (HUD v3.1 boucle ⊥, 51->61->62)
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // HUD v3.1 (doctrine DA, 2026-08-21 — hud-brennar.html/palettes-ecrans.html, verdicts user
    // successifs) — falsifiables NEUVES du restyle du TopBar. Ne redouble PAS les falsifiables
    // fonctionnelles existantes (TopBarControllerPlayModeTests C2F1-F4, HudPlayModeTests hud-F1..F7/
    // F2/F6/M1/M2) : celles-ci restent la preuve de non-régression (a). Ce fichier prouve les 4
    // livrables DOCTRINE : (DA1) le manomètre est CENTRÉ, (DA2) l'or n'est jamais un aplat, (DA3/
    // DA4) toute couleur du TopBar vient des 62 tokens scellés, (DA5) le restyle ne fait fuir aucune
    // légende décorative dans le corpus R2.2 scanné.
    [Category("HUDv31")]
    public class TopBarDoctrineV31PlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        // Mirrors AppShellPlayModeTests/HudPlayModeTests/NavigationPlayModeTests exactement (même
        // raison : AppShell découvre/crée SON PROPRE Canvas, jamais parenté sous shellGo).
        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null;
            LogAssert.ignoreFailingMessages = false; // ne jamais fuiter dans un test LATER, sans rapport
        }

        // Mounting a real AppShell triggers ITS OWN demo sign-in + Home mount (DashboardController's
        // own auth attempt) — même bruit toléré que AppShellPlayModeTests.ExpectTenantOwnDemoAuthNoise.
        private static void ExpectShellOwnAuthNoise() => LogAssert.ignoreFailingMessages = true;

        private static IEnumerator WaitTopBarLoaded(AppShell s)
        {
            float elapsed = 0f;
            while ((s.TopBar == null || !s.TopBar.Loaded) && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.IsTrue(s.TopBar != null && s.TopBar.Loaded, "acquisition de session propre du shell terminée (TopBar chargé)");
        }

        private AppShell BootShell()
        {
            ExpectShellOwnAuthNoise();
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            return shell;
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (a) — le manomètre est CENTRÉ, geste le plus visible corrigé par ce lot (verdict user).
        // ══════════════════════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator DA1_Manometre_ExactlyCentered_OnBar_IndependentOfLeadingActionVisibility()
        {
            yield return WaitTopBarLoaded(BootShell());

            RectTransform barRect = shell.TopBarSlot;
            // Anti-vacuité — la barre doit avoir une largeur RÉELLE mesurée, pas un rect jamais
            // layout (sinon "centré" serait vrai par dégénérescence, tout à x=0).
            Assert.Greater(barRect.rect.width, 200f,
                "anti-vacuité : TopBarSlot doit avoir une largeur réelle mesurée avant de juger un centrage");

            // "Manometre" enfant DIRECT du TopBar — même patron de `Find` à UN segment que
            // HudPlayModeTests.cs:333 (`Find("Manometre/ZoneRow")`), donc AUCUN sous-conteneur
            // intermédiaire n'a pu être introduit par le restyle.
            Transform manoT = shell.TopBar.transform.Find("Manometre");
            Assert.IsNotNull(manoT, "Manometre doit exister comme enfant DIRECT du TopBar");
            var manoRect = (RectTransform)manoT;

            Assert.AreEqual(0.5f, manoRect.anchorMin.x, 0.001f, "ancrage X gauche à 0.5");
            Assert.AreEqual(0.5f, manoRect.anchorMax.x, 0.001f, "ancrage X droit à 0.5");
            Assert.AreEqual(0f, manoRect.anchoredPosition.x, 0.05f,
                "le manomètre doit être exactement au centre horizontal de la barre — indépendant des largeurs des groupes voisins");

            // Double témoin — coins WORLD (un anchor correct pourrait coexister avec un offset/pivot
            // qui le contredit ; les deux doivent s'accorder).
            float barCenterX = WorldCenterX(barRect);
            float manoCenterXBefore = WorldCenterX(manoRect);
            Assert.AreEqual(barCenterX, manoCenterXBefore, 1.0f,
                "le CENTRE MONDE du manomètre coïncide avec le centre monde de la barre");

            // Garde de RÉGRESSION STRUCTURELLE (pas seulement numérique) — bascule le bouton leading
            // (élargit le cluster gauche) : si demain un HorizontalLayoutGroup séquentiel revenait
            // sur la racine, le centre du manomètre BOUGERAIT et CE test rougirait — c'est le
            // détecteur qu'une simple lecture d'anchor==0.5 ne donne pas seule.
            shell.TopBar.SetLeadingAction(TopBarController.LeadingAction.BackToMap, null);
            yield return null;
            float manoCenterXAfter = WorldCenterX(manoRect);
            Assert.AreEqual(manoCenterXBefore, manoCenterXAfter, 1.0f,
                "le centre du manomètre est INDÉPENDANT de la visibilité du bouton leading — sinon " +
                "la garde de centrage serait vraie par coïncidence de contenu, pas par ancrage");
        }

        private static float WorldCenterX(RectTransform rt)
        {
            var corners = new Vector3[4];
            rt.GetWorldCorners(corners);
            return (corners[0].x + corners[2].x) / 2f;
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (b) — l'or n'est JAMAIS un aplat : mesure la COUVERTURE réelle (texture échantillonnée),
        // pas la boîte englobante — un anneau/disque troué a une boîte englobante carrée mais une
        // couverture réelle beaucoup plus faible ; un raisonnement en aire seule s'y ferait piéger.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private const float GoldHueEpsilon = 0.02f;
        private const float ThinDimensionMaxPx = 4f; // mesuré : les filets de ce restyle font 2px
        // MESURÉ (execute_code, TopBarController.BuildLayout() réel, 2026-08-21) : l'anneau du
        // médaillon (BoitierRing, sprite `ProceduralUI.Ring`, boîte englobante 64x64=4096px²) a une
        // couverture RÉELLE échantillonnée de 500.0px² — le trou central le rend structurellement
        // non-aplat malgré sa boîte englobante carrée. Seuil posé à 900 : ~1.8x de marge au-dessus
        // du 500 mesuré, largement sous tout remplissage de badge/bouton réel de cette barre (le
        // fond du badge Notification, non-or, fait 3024px² ; le bouton LeadingAction 3600px²) — donc
        // aucun élément non-filet/non-anneau de la doctrine ne pourrait se glisser sous ce seuil par
        // accident. Contrôle négatif (ci-dessous) : un aplat or 80x40=3200px² DOIT être classé aplat.
        private const float FlatCoverageAreaMaxPx2 = 900f;

        // AMENDÉ NOMMÉMENT — HUD v3.1 boucle ⊥ pixel-perfect (2026-08-21) : comparait contre
        // `accentGold` (#ffd23f, jaune vif — c'était PRÉCISÉMENT la root cause du ruling user, le
        // round précédent composait le filet/anneau par alpha depuis ce token trop vif). Le filet et
        // l'anneau viennent maintenant de `hudHairlineGold` (#b08d3e, laiton mat — REUSE exact de la
        // maquette, gdd/14 @e171c594) — la PROPRIÉTÉ testée (l'or structurel n'est jamais un aplat)
        // est inchangée, seul le token qui EST "l'or" pour ce scan est corrigé.
        private static bool IsGoldHue(Color c)
        {
            Color gold = DesignTokens.Current.hudHairlineGold;
            return Mathf.Abs(c.r - gold.r) < GoldHueEpsilon
                && Mathf.Abs(c.g - gold.g) < GoldHueEpsilon
                && Mathf.Abs(c.b - gold.b) < GoldHueEpsilon;
        }

        private static float CoverageAreaPx2(Image img)
        {
            Rect r = img.rectTransform.rect;
            float boundingArea = Mathf.Abs(r.width * r.height);
            Sprite sprite = img.sprite;
            if (sprite == null || sprite.texture == null) return boundingArea; // aplat SANS sprite — la boîte EST la surface

            Texture2D tex = sprite.texture;
            const int sampleN = 32;
            int opaque = 0;
            for (int yi = 0; yi < sampleN; yi++)
            {
                for (int xi = 0; xi < sampleN; xi++)
                {
                    float u = (xi + 0.5f) / sampleN;
                    float v = (yi + 0.5f) / sampleN;
                    if (tex.GetPixelBilinear(u, v).a > 0.15f) opaque++;
                }
            }
            return boundingArea * (opaque / (float)(sampleN * sampleN));
        }

        private static bool IsFlatSurface(Image img)
        {
            Rect r = img.rectTransform.rect;
            float minDim = Mathf.Min(Mathf.Abs(r.width), Mathf.Abs(r.height));
            if (minDim <= ThinDimensionMaxPx) return false; // un FILET — jamais un aplat, quelle que soit sa longueur
            return CoverageAreaPx2(img) > FlatCoverageAreaMaxPx2;
        }

        [UnityTest]
        public IEnumerator DA2_Gold_NeverAFlatSurface_OnlyHairlinesAndRing()
        {
            yield return WaitTopBarLoaded(BootShell());

            Image[] allImages = shell.TopBar.GetComponentsInChildren<Image>(true);
            List<Image> goldImages = allImages.Where(img => IsGoldHue(img.color)).ToList();

            // Contrôle positif / anti-vacuité — le scan doit VOIR de l'or (filet de barre + anneau
            // du médaillon [+ soulignement du badge]) : sinon "aucun aplat" serait vrai par ABSENCE
            // de sujet, pas par discipline.
            Assert.GreaterOrEqual(goldImages.Count, 2,
                $"au moins 2 Images or attendues (filet de barre + anneau du médaillon), trouvé {goldImages.Count}");

            var offenders = new List<string>();
            foreach (Image img in goldImages)
            {
                if (IsFlatSurface(img))
                {
                    Rect r = img.rectTransform.rect;
                    offenders.Add($"{PathOf(img.transform)} ({r.width:F1}x{r.height:F1}, couverture={CoverageAreaPx2(img):F1}px²)");
                }
            }
            Assert.IsEmpty(offenders,
                "l'or ne doit JAMAIS remplir une surface (doctrine : \"jamais en aplat\") — coupables : " + string.Join("; ", offenders));

            // Contrôle NÉGATIF — le détecteur doit pouvoir ROUGIR : un aplat or 80x40, SANS sprite,
            // sur un GameObject isolé (jamais attaché à la vraie barre), doit être classé "aplat".
            var probeGo = new GameObject("GoldFlatnessNegativeControl", typeof(RectTransform));
            try
            {
                ((RectTransform)probeGo.transform).sizeDelta = new Vector2(80, 40); // 3200px², non-thin
                Image probe = probeGo.AddComponent<Image>();
                probe.color = DesignTokens.Current.hudHairlineGold;
                Assert.IsTrue(IsFlatSurface(probe),
                    "contrôle négatif : un aplat or 80x40 DOIT être classé comme aplat — sinon le détecteur ne peut rien voir");
            }
            finally { Object.Destroy(probeGo); }
        }

        private static string PathOf(Transform t)
        {
            var parts = new List<string>();
            while (t != null) { parts.Add(t.name); t = t.parent; }
            parts.Reverse();
            return string.Join("/", parts);
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (c) — toute couleur du TopBar vient des 62 tokens scellés (REUSE le patron
        // ChromeTabAccentAllowlistPlayModeTests : contrôle de FORME avant contrôle de contenu,
        // y compris la forme ALIASÉE/indirection par variable).
        // ══════════════════════════════════════════════════════════════════════════════════════

        private static readonly string[] ProvenanceScopedFiles =
        {
            "Shell/TopBarController.cs",
            "Shell/VerticalGradientImage.cs",
            "Shell/ProceduralUI.cs",
        };

        // Les 3 façons de fabriquer une Color SANS passer par un token DesignTokens.
        private static readonly string[] RawColorCtorLiterals =
            { "new Color(", "new Color32(", "ColorUtility.TryParseHtmlString(" };

        private static int CountRawColorLiterals(string text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            int total = 0;
            foreach (string lit in RawColorCtorLiterals)
            {
                int idx = 0;
                while ((idx = text.IndexOf(lit, idx, StringComparison.Ordinal)) != -1) { total++; idx += lit.Length; }
            }
            return total;
        }

        // Contrôle positif (socle : un motif non prouvé peut rendre 0 pour la mauvaise raison).
        [TestCase("var c = new Color(0.1f, 0.2f, 0.3f);", 1, TestName = "Forme littérale — new Color(...)")]
        [TestCase("var c = new Color32(10, 20, 30, 255);", 1, TestName = "Forme littérale — new Color32(...)")]
        [TestCase("ColorUtility.TryParseHtmlString(\"#d9ab4e\", out var c);", 1, TestName = "Forme littérale — hex parsé")]
        [TestCase("var c = DesignTokens.Current.accentGold;", 0, TestName = "Forme légitime — aucun littéral, 0 attendu")]
        public void Scan_DetectsRawColorLiteral_PositiveControl(string sourceLine, int expectedHits)
        {
            Assert.AreEqual(expectedHits, CountRawColorLiterals(sourceLine),
                $"le motif doit détecter '{sourceLine}' exactement {expectedHits} fois — sinon DA3 peut rendre 0 pour la mauvaise raison");
        }

        [Test]
        public void DA3_NoRawColorLiterals_InTopBarDoctrineFiles()
        {
            string scriptsRoot = Path.Combine(Application.dataPath, "Scripts");
            var offenders = new List<string>();
            foreach (string rel in ProvenanceScopedFiles)
            {
                string path = Path.Combine(scriptsRoot, rel.Replace('/', Path.DirectorySeparatorChar));
                Assert.IsTrue(File.Exists(path), $"fichier attendu introuvable : {rel}");
                int hits = CountRawColorLiterals(File.ReadAllText(path));
                if (hits > 0) offenders.Add($"{rel} ({hits})");
            }
            Assert.IsEmpty(offenders,
                "aucun de ces fichiers ne doit construire une Color à partir d'un littéral (R2.3 — " +
                "toute couleur vient de DesignTokens.Current.*) : " + string.Join("; ", offenders));
        }

        // Reprend EXACTEMENT les 3 formes syntaxiques de ChromeTabAccentAllowlistPlayModeTests.
        // Scan_DetectsAllThreeSyntacticForms — prouve que le motif d'ACCÈS (pas d'affectation) voit
        // les 3 formes, y compris l'indirection par variable (la forme que `InitPalette` utilise
        // réellement pour `accentGold`).
        [TestCase("private static readonly Color Foo = DesignTokens.Current.nightBackground;", "nightBackground",
            TestName = "Forme (i) — champ statique nommé")]
        [TestCase("img.color = DesignTokens.Current.surfaceRaised;", "surfaceRaised",
            TestName = "Forme (ii) — affectation directe")]
        [TestCase("var x = DesignTokens.Current.accentGold; img.color = x;", "accentGold",
            TestName = "Forme (iii) — indirection par variable")]
        public void Scan_DetectsTokenAccess_AllThreeSyntacticForms(string sourceLine, string expectedField)
        {
            MatchCollection matches = Regex.Matches(sourceLine, @"DesignTokens\.Current\.(\w+)");
            Assert.AreEqual(1, matches.Count, $"'{sourceLine}' aurait dû être détecté exactement une fois");
            Assert.AreEqual(expectedField, matches[0].Groups[1].Value);
        }

        [Test]
        public void DA4_EveryDesignTokensAccess_InTopBarController_IsASealedField()
        {
            string path = Path.Combine(Application.dataPath, "Scripts", "Shell", "TopBarController.cs");
            Assert.IsTrue(File.Exists(path));
            string text = File.ReadAllText(path);

            var sealedFields = new HashSet<string>();
            foreach (FieldInfo field in typeof(DesignTokens).GetFields(BindingFlags.Public | BindingFlags.Instance))
                sealedFields.Add(field.Name);
            // 62 Color scellés (CanonPaletteComparator.ExpectedTokenCount, source UNIQUE) + 2
            // TMP_FontAsset (primaryFont, hudSerifFont — hors du périmètre couleur mais des champs
            // publics réels). AMENDÉ NOMMÉMENT — HUD v3.1 boucle ⊥ pixel-perfect (2026-08-21) : +1 →
            // +2, `hudSerifFont` ajouté (écart (5), DesignTokens.cs).
            Assert.AreEqual(CanonPaletteComparator.ExpectedTokenCount + 2, sealedFields.Count,
                "sanity du reflet lui-même — doit voir 62 Color + primaryFont + hudSerifFont");

            MatchCollection matches = Regex.Matches(text, @"DesignTokens\.Current\.(\w+)");
            Assert.GreaterOrEqual(matches.Count, 5,
                "anti-vacuité : TopBarController.cs doit VRAIMENT accéder plusieurs tokens (sinon cette garde ne prouve rien)");

            List<string> invalid = matches.Cast<Match>()
                .Select(m => m.Groups[1].Value)
                .Where(name => !sealedFields.Contains(name))
                .Distinct().ToList();
            Assert.IsEmpty(invalid,
                "accès à un champ qui n'existe PAS sur DesignTokens (typo, ou fuite hors des 62 tokens scellés) : " +
                string.Join(", ", invalid));
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (d) — non-régression : le restyle ne change AUCUN compteur/valeur du câblage existant.
        // ══════════════════════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator DA5_RestyleDoesNotLeakDecorativeCaptionsIntoScanCorpus_ExistingCountersUnchanged()
        {
            yield return WaitTopBarLoaded(BootShell());

            Assert.IsTrue(shell.TopBar.Loaded);
            Assert.IsTrue(shell.TopBar.RenderedTexts.Any(t => t == "[!] New" || t == "[ ] Clear"),
                "le corpus scanné contient toujours EXACTEMENT une des 2 formes canoniques du badge — inchangé par le restyle");

            // Resserrement NOMMÉ de C2F4 (qui épingle `>= 2`, "la tempting degenerate case" étant
            // zéro) : ce restyle ajoute des légendes VISUELLES (caption jour/phase, soulignement du
            // badge) qui ne doivent JAMAIS entrer dans le corpus R2.2 — callsign + badge restent les
            // 2 SEULES entrées trackées.
            Assert.AreEqual(2, shell.TopBar.RenderedTexts.Count,
                "le corpus R2.2 doit contenir EXACTEMENT 2 entrées (callsign + badge) — un 3e élément " +
                "signalerait qu'une légende décorative du restyle a été trackée par erreur");

            foreach (string t in shell.TopBar.RenderedTexts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"aucun scalaire brut dans le corpus scanné : '{t}'");
            }
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (e) — HUD v3.1 boucle ⊥ pixel-perfect, tour 2 (revue ⊥ sur capture r5, 2026-08-21) : le
        // cadran est un ARC tracé DANS le disque — RIEN ne doit dépasser le cercle inscrit de la
        // face du médaillon (le défaut mesuré : `ZoneRow`, 3 carrés ancrés au bord bas, débordait
        // visiblement). Falsifiable de FORME, pixel-réelle (pas géométrique sur les RectTransform —
        // un texte centré a une boîte englobante plus large que son encre, un contrôle sur les
        // COINS du RectTransform aurait un faux positif systématique sur `GaugeValue`/`GaugeCaption`).
        // ══════════════════════════════════════════════════════════════════════════════════════

        private static float ColorDistance(Color a, Color b) =>
            Mathf.Sqrt(Mathf.Pow(a.r - b.r, 2) + Mathf.Pow(a.g - b.g, 2) + Mathf.Pow(a.b - b.b, 2));

        /// <summary>Échantillonne un ANNEAU de rayons [radius, radius+marginPx] autour de (cx,cy)
        /// dans `tex` (coordonnées ÉCRAN, origine bas-gauche comme `Texture2D.GetPixel`) et compte
        /// les pixels qui s'écartent de TOUTES les couleurs de `knownGood` de plus de `colorEpsilon`
        /// — "quelque chose est dessiné ici qui ne devrait pas l'être". `knownGood` porte le fond de
        /// barre ET le filet or du bas de barre (`hudHairlineGold`, REUSE `DesignTokens.Current` —
        /// MESURÉ, revue ⊥ 2026-08-21 : le médaillon (rayon 32) déborde légèrement sous le bas de
        /// la barre par construction, donc une partie de l'anneau de contrôle croise le filet — un
        /// élément DOCTRINE-LÉGITIME, permanent, sans rapport avec le contenu du médaillon ; l'exclure
        /// PAR SA COULEUR CONNUE plutôt que par une zone d'angle exclue à la main garde la sonde
        /// capable de voir un VRAI débordement à cet endroit précis (une teinte différente du filet,
        /// même proche de lui, resterait détectée). Retourne (offenderCount, sampleCount, exemples
        /// pour diagnostic — jamais lus par la logique, seulement par le message d'assertion).</summary>
        private static (int offenders, int sampled, List<string> examples) CountOffendersOutsideCircle(
            Texture2D tex, float cx, float cy, float radiusPx, float marginPx, Color[] knownGood, float colorEpsilon)
        {
            int offenders = 0, sampled = 0;
            var examples = new List<string>();
            for (float ang = 0f; ang < 360f; ang += 3f)
            {
                float rad = ang * Mathf.Deg2Rad;
                for (float r = radiusPx + 1.5f; r <= radiusPx + marginPx; r += 2f)
                {
                    int px = Mathf.RoundToInt(cx + r * Mathf.Cos(rad));
                    int py = Mathf.RoundToInt(cy + r * Mathf.Sin(rad));
                    if (px < 0 || py < 0 || px >= tex.width || py >= tex.height) continue;
                    sampled++;
                    Color c = tex.GetPixel(px, py);
                    float minDist = float.MaxValue;
                    foreach (Color known in knownGood)
                        minDist = Mathf.Min(minDist, ColorDistance(c, known));
                    if (minDist > colorEpsilon)
                    {
                        offenders++;
                        if (examples.Count < 10)
                            examples.Add($"ang={ang:F0} r={r - radiusPx:F1}px-hors-cercle color={c} minDist={minDist:F3}");
                    }
                }
            }
            return (offenders, sampled, examples);
        }

        [UnityTest]
        public IEnumerator DA6_ManometreContent_NeverExceedsInscribedCircle_PixelReal()
        {
            yield return WaitTopBarLoaded(BootShell());
            yield return new WaitForEndOfFrame();

            Transform manoT = shell.TopBar.transform.Find("Manometre");
            Assert.IsNotNull(manoT, "Manometre doit exister comme enfant DIRECT du TopBar");
            var manoRect = (RectTransform)manoT;
            var corners = new Vector3[4];
            manoRect.GetWorldCorners(corners); // ScreenSpaceOverlay : coïncide avec l'écran, origine bas-gauche

            float cx = (corners[0].x + corners[2].x) / 2f;
            float cy = (corners[0].y + corners[1].y) / 2f;
            float radiusPx = (corners[2].x - corners[0].x) / 2f; // le médaillon (ring inclus) est carré
            Assert.Greater(radiusPx, 5f, "anti-vacuité : le médaillon doit avoir une taille réelle mesurée");

            Texture2D tex = ScreenCapture.CaptureScreenshotAsTexture();
            try
            {
                // Fond de référence : un point sur la barre, à bonne distance du médaillon (hors
                // de tout halo/dégradé local), même hauteur Y. `knownGood` porte AUSSI le filet or
                // du bas de barre (`hudHairlineGold`, REUSE le token — MESURÉ, revue ⊥ 2026-08-21 :
                // le médaillon déborde légèrement sous la barre par construction, une partie de
                // l'anneau de contrôle croise donc le filet, un élément DOCTRINE-LÉGITIME sans
                // rapport avec le médaillon — voir le docblock de `CountOffendersOutsideCircle`).
                Color bg = tex.GetPixel(Mathf.RoundToInt(cx - radiusPx - 60f), Mathf.RoundToInt(cy));
                Color[] knownGood = { bg, DesignTokens.Current.hudHairlineGold };
                const float colorEpsilon = 0.06f; // tolère l'anti-crénelage du bord du ring lui-même
                const float marginPx = 14f; // fenêtre juste hors du médaillon où un débordement serait visible

                var (offenders, sampled, examples) = CountOffendersOutsideCircle(tex, cx, cy, radiusPx, marginPx, knownGood, colorEpsilon);
                Assert.Greater(sampled, 100, "anti-vacuité : l'anneau de contrôle doit couvrir un nombre RÉEL de pixels");
                Assert.AreEqual(0, offenders,
                    $"du contenu du manomètre déborde du cercle inscrit ({offenders}/{sampled} pixels de l'anneau de " +
                    "contrôle diffèrent du fond ET du filet, bg=" + bg + ") — doctrine : un ARC dans le disque, rien " +
                    "ne dépasse. Exemples (jusqu'à 10) :\n" + string.Join("\n", examples));

                // Contrôle POSITIF (socle : un détecteur qui rend toujours 0 peut le faire pour la
                // mauvaise raison) — une sonde synthétique DEHORS du cercle, sur la MÊME texture,
                // DOIT être vue par le même balayage — MÊME avec le filet dans `knownGood` (magenta
                // est loin des DEUX couleurs connues).
                int probeX = Mathf.RoundToInt(cx + radiusPx + 6f);
                int probeY = Mathf.RoundToInt(cy);
                Color probeOriginal = tex.GetPixel(probeX, probeY);
                tex.SetPixel(probeX, probeY, Color.magenta);
                tex.Apply();
                var (probeOffenders, _, _) = CountOffendersOutsideCircle(tex, cx, cy, radiusPx, marginPx, knownGood, colorEpsilon);
                Assert.Greater(probeOffenders, 0,
                    "contrôle positif : un pixel magenta planté juste hors du cercle DOIT être détecté — sinon " +
                    "le balayage ne peut rien voir et le 0 ci-dessus ne prouve rien");
            }
            finally
            {
                Object.Destroy(tex);
            }
        }
    }
}
