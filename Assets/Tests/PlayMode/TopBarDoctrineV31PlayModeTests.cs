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
        // fond du badge Notification, non-or, fait 3024px² ; la zone tactile LeadingAction fait
        // 48×48=2304px² — ⚠️ CORRIGÉ round 11, revue ⊥ MINEUR m6 : citait 3600px², jamais vrai
        // (36×40=1440 avant round 9, 48×48=2304 depuis — sans effet, `leadingImg` est en
        // `surfaceRow` à alpha nul, jamais classé « or » par ce scan) — donc
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
            // AMENDÉ NOMMÉMENT (2026-08-22) — déménagé vers `ShellContracts` pour que l'écran des
            // lieutenants (assembly `Operational`) puisse utiliser le dégradé « verre gravé » de sa
            // maquette. Namespace inchangé, aucun site d'appel modifié ; seul le chemin bouge, et la
            // propriété assertée (ce fichier reste sous contrôle de provenance des couleurs) tient.
            "ShellContracts/VerticalGradientImage.cs",
            // AMENDÉ NOMMÉMENT (2026-08-22) — le fichier a DÉMÉNAGÉ vers `ShellContracts` (sans
            // changer de namespace, donc aucun site d'appel ne bouge) pour que `CityMap` puisse
            // s'en servir : le médaillon d'un marqueur de lieutenant en a besoin, et `Shell`
            // référence `CityMap`, jamais l'inverse (CS0234 mesuré). La PROPRIÉTÉ assertée ne
            // change pas — ce fichier reste sous contrôle de provenance des couleurs ; seul son
            // chemin bouge. ★ Et la garde a fait exactement son travail : elle a rougi sur
            // « fichier attendu introuvable », pas en silence.
            "ShellContracts/ProceduralUI.cs",
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
            // Les Color du canon (CanonPaletteComparator.ExpectedTokenCount, source UNIQUE) + 2
            // TMP_FontAsset (primaryFont, hudSerifFont — hors du périmètre couleur mais des champs
            // publics réels). AMENDÉ NOMMÉMENT — HUD v3.1 boucle ⊥ pixel-perfect (2026-08-21) : +1 →
            // +2, `hudSerifFont` ajouté (écart (5), DesignTokens.cs).
            //
            // ⛔⛔ AMENDÉ NOMMÉMENT (2026-09-06) : +2 → +3, `accentCalm` ajouté. Et ce compte-là
            //    NE SE BUMPE PAS SANS DIRE CE QU'IL COMPTE — un compte nu ne dit pas si le champ de
            //    plus est légitime. Il est donc NOMMÉ et asserté séparément juste en dessous.
            //    ⚠️ ET IL PORTE UNE QUESTION OUVERTE, plutôt que de la fermer en silence :
            //    `accentCalm` a été spécifié par l'atelier (le vert `#7db36a` vivait déjà comme
            //    littéral dans ⑥ et comme `--vert` documenté dans les résolveurs de réputation) —
            //    il devrait donc entrer dans l'EXTRAIT DU CANON, et non rester un token client
            //    hors extrait. Cet arbitrage appartient à la DA, pas à cet écran : tant qu'il n'est
            //    pas rendu, le champ est compté ici, à découvert. Le jour où le canon le porte,
            //    `ExpectedTokenCount` monte de 1 et ce `+3` redevient `+2`.
            const string TokenHorsCanon = "accentCalm";
            Assert.IsTrue(sealedFields.Contains(TokenHorsCanon),
                $"le champ hors canon nommé ici (`{TokenHorsCanon}`) n'existe plus sur DesignTokens : " +
                "cette exception a survécu à ce qu'elle excusait, et le `+3` ci-dessous est devenu faux. " +
                "Le retirer, ne pas relâcher le compte.");
            Assert.AreEqual(CanonPaletteComparator.ExpectedTokenCount + 3, sealedFields.Count,
                $"sanity du reflet lui-même — doit voir {CanonPaletteComparator.ExpectedTokenCount} " +
                $"Color du canon + primaryFont + hudSerifFont + `{TokenHorsCanon}` (hors canon, " +
                "voir le commentaire). Vu : [" + string.Join(", ", sealedFields.OrderBy(x => x)) + "]");

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
            Assert.IsTrue(shell.TopBar.RenderedTexts.Any(t => t == TopBarController.LibelleNotifActive || t == TopBarController.LibelleNotifCalme),
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
                // AMENDÉ NOMMÉMENT (2026-08-21, en fermant ce rouge) — MESURÉ (balayage 360° fin,
                // pas 0,25px, Debug.Log injecté puis retiré, co-tenance HUDv31 reproduite) : le PIRE
                // rayon de stabilisation de l'anti-crénelage du bord de `boitierRing` sur TOUT le
                // cercle est `radiusPx+1,75` (à ang=240°, un angle NON cardinal — la piste circulaire
                // rastérisée + le sur-échantillonnage bilinéaire de l'Image y prennent visiblement
                // plus de largeur qu'aux angles cardinaux 0/90/180/270, où c'est déjà stable par
                // r=radiusPx+0,5). L'ancien `+1,5f` tombait DANS cette fenêtre (0,25px de trop court)
                // — un vrai débordement d'un demi-pixel n'existe pas ; c'est la tolérance RADIALE qui
                // était trop serrée pour l'AA du ring lui-même. `+2,5f` retenu : 0,75px de marge de
                // sécurité au-dessus du pire cas MESURÉ, jamais relâché au point de couvrir le
                // `marginPx` de 14px qui doit rester sensible à un vrai contenu débordant. La couleur
                // (`colorEpsilon`) reste À 0,06 — c'est le RAYON de départ qui était mal calibré, pas
                // la tolérance de teinte (widen l'un OU l'autre suffisait ; le rayon est le plus
                // proche de la cause physique mesurée).
                for (float r = radiusPx + 2.5f; r <= radiusPx + marginPx; r += 2f)
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

        /// <summary>㊲/① — CE QUE LE CADRAN DESSINE, et non ce qu'il ne dépasse pas.
        ///
        /// ⛔ POURQUOI CET ORACLE EXISTE. Un juge ⊥ (r5 de ①) a relevé QUATRE défauts du cadran
        /// pendant que `HUDv31` rendait 26/27 — et le seul rouge était `DA6`, qui n'avait jamais
        /// tourné (API muette en batchmode). Réparé, `DA6` reste aveugle : sa propriété est le
        /// DÉBORDEMENT. Les vingt-six autres sont structurels ou géométriques.
        /// ⇒ **Aucun oracle de ce dépôt ne regardait ce que le cadran DESSINE.** Corriger le pivot
        ///   ou l'arc sans celui-ci produirait un vert de plus que personne ne peut opposer.
        ///
        /// Les quatre grandeurs, et leur valeur au CANON (`hud-topbar-reference-source.html`,
        /// mesures du r5) :
        ///   1. **pivot** : à ~0,15 R du centre, **EN DESSOUS** (0,147 R au r5, 0,150 au r6 — les
        ///      deux tours concordent en signe et en ordre, la tolérance les couvre tous les deux).
        ///      Le jeu le met 0,145 R au-dessus —
        ///      même distance, côté opposé : écart 0,29 R = 11,7 px CSS. *La distance ne discrimine
        ///      pas, seul le CÔTÉ le fait* — la leçon de l'aiguille inversée, appliquée au pivot.
        ///   2. **segment neutre** : **29,45°** de piste nue entre la zone froide et la zone
        ///      chaude. ⚠️ Cette valeur vient de la SOURCE, pas d'un rapport : le SVG fait courir le
        ///      froid de 180° à 90° et le chaud de 60,55° à 0°, donc l'intervalle vaut
        ///      90 − 60,55 = 29,45. Deux tours de juge en ont donné deux mesures différentes (27°
        ///      au r5, 39° au r6) — *un nombre repris d'un rapport sans être recompté est un fait
        ///      DÉDUIT*, y compris quand le rapport est rigoureux. On mesure contre la source.
        ///   3. **lunette intérieure** : un second anneau, en retrait de la jante.
        ///   4. **fond radial** : la face est un dégradé (`hudGaugeFaceInner` → `…Outer`), pas un
        ///      aplat.
        /// ⚠️ CE QUE CETTE QUATRIÈME MESURE NE COUVRE PAS, et il faut le dire : le juge écrit
        ///   « cadran plat, amplitude inter-secteurs 1,1 L contre 19,3 ». Sa grandeur est la
        ///   variation entre SECTEURS ANGULAIRES du cadran ; la mienne est la variation RADIALE du
        ///   fond, du centre vers le bord. Ce sont deux propriétés distinctes, et la mienne est
        ///   VERTE (écart 0,1267 mesuré) : le dégradé radial existe. **L'amplitude inter-secteurs
        ///   reste donc NON COUVERTE par cet oracle** — publier le dénominateur plutôt que laisser
        ///   croire que les quatre findings sont sous garde.
        /// ⚠️ MONDE DÉGÉNÉRÉ ÉCRIT : un cadran ENTIÈREMENT nu satisferait « pas de recouvrement des
        ///   deux zones » (il n'y a pas de zones) et « pas de pivot du mauvais côté » (il n'y a pas
        ///   de pivot). Chaque mesure porte donc son plancher : les deux arcs doivent EXISTER avant
        ///   qu'on mesure ce qui les sépare, et le pivot doit exister avant qu'on regarde son côté.
        /// ⚠️ Cet oracle est ROUGE au moment où il est écrit, sur les quatre — c'est sa raison
        ///   d'être. Le vert viendra du correctif, pas d'une tolérance.</summary>
        [UnityTest]
        public IEnumerator DA7_CompositionDuCadran_PivotSegmentNeutreLunetteEtFond()
        {
            yield return WaitTopBarLoaded(BootShell());
            yield return new WaitForEndOfFrame();

            Transform manoT = shell.TopBar.transform.Find("Manometre");
            Assert.IsNotNull(manoT, "Manometre doit exister");
            var manoRect = (RectTransform)manoT;
            float rayon = manoRect.rect.width / 2f;
            Assert.Greater(rayon, 5f, "anti-vacuité : le médaillon doit avoir une taille réelle");

            // ── 1. LE PIVOT — structurel, aucun pixel : sa position est un rect. ────────────────
            // ⛔ LES QUATRE ÉCARTS SE COLLECTENT, ILS NE SE LÈVENT PAS UN PAR UN. Première version :
            // quatre `Assert` successifs — NUnit s'arrête au premier `throw`, donc le run ne disait
            // que « le pivot est du mauvais côté » et les trois autres restaient invisibles. *Un
            // rouge en masque un autre dans le même test*, et corriger le premier ne révèle pas le
            // second : seul le balayage de la CLASSE les montre ensemble. Ici la classe fait quatre.
            var ecarts = new List<string>();

            Transform pivotT = manoT.Find("NeedleCenter");
            Assert.IsNotNull(pivotT, "le pivot de l'aiguille doit exister — sans lui, rien à situer");
            float pivotY = ((RectTransform)pivotT).anchoredPosition.y;
            float pivotFraction = pivotY / rayon;
            Debug.Log($"[CADRAN] pivot y={pivotY:F2} u · {pivotFraction:F3} R " +
                      $"({(pivotFraction < 0f ? "EN DESSOUS" : "AU-DESSUS")} du centre) · canon −0,147 R");
            if (pivotFraction >= 0f)
                ecarts.Add($"PIVOT : à {pivotFraction:F3} R, du MAUVAIS CÔTÉ du centre — le canon le " +
                           "pose EN DESSOUS (−0,147 R). La distance ne discrimine pas, seul le côté.");
            else if (Mathf.Abs(pivotFraction + 0.150f) > 0.02f)
                ecarts.Add($"PIVOT : à {pivotFraction:F3} R du centre au lieu de −0,150 R.");

            // ── 2. LA LUNETTE INTÉRIEURE — structurelle elle aussi. ────────────────────────────
            // ⚠️ PAS SEULEMENT « elle existe » : une lunette à alpha nul, sans sprite, ou aussi
            // large que le boîtier satisferait une garde de présence tout en ne rendant RIEN. Le
            // socle le dit sur le halo de titre : une garde sur les PARAMÈTRES n'est pas une garde
            // sur l'EFFET. Faute de pouvoir discriminer un liseré à α = 0,165 sur une face sombre
            // avec mon échantillonneur, celle-ci reste une garde de FORME — et je le déclare plutôt
            // que de la laisser passer pour une garde d'effet.
            Transform lunetteT = manoT.Find("Lunette");
            if (lunetteT == null)
                ecarts.Add("LUNETTE : absente — le canon pose un liseré clair à l'intérieur du bord " +
                           "(`box-shadow: inset …#ffffff2a`), et rien dans l'arbre ne le porte.");
            else
            {
                var img2 = lunetteT.GetComponent<Image>();
                var lrt = (RectTransform)lunetteT;
                if (img2 == null || img2.sprite == null || img2.color.a < 0.02f)
                    ecarts.Add("LUNETTE : présente dans l'arbre mais elle ne peut rien rendre " +
                               $"(sprite={(img2 != null && img2.sprite != null ? "oui" : "non")}, " +
                               $"alpha={(img2 != null ? img2.color.a : 0f):F3}).");
                else if (lrt.rect.width >= manoRect.rect.width)
                    ecarts.Add($"LUNETTE : large de {lrt.rect.width:F1} pour un boîtier de " +
                               $"{manoRect.rect.width:F1} — elle n'est pas À L'INTÉRIEUR du bord.");
            }

            // ── 3 et 4 — sur les PIXELS, par le chemin qui fonctionne ici. ─────────────────────
            var coins = new Vector3[4];
            manoRect.GetWorldCorners(coins);
            float cx = (coins[0].x + coins[2].x) / 2f;
            float cy = (coins[0].y + coins[1].y) / 2f;
            float rPx = (coins[2].x - coins[0].x) / 2f;
            Texture2D img = RendreLEcran();
            try
            {
                // 3. LE SEGMENT NEUTRE : on balaie l'arc à son rayon médian et on classe chaque
                //    degré en froid / chaud / ni l'un ni l'autre. Le segment est le plus long run
                //    de « ni l'un ni l'autre » ENTRE les deux zones.
                // ⛔ ON CLASSE PAR LA DIRECTION DE LA TEINTE, PAS PAR DISTANCE À LA COULEUR PURE.
                // Première version : `Proche(pixel, hudGaugeArcCold, 0,22)` ⇒ **0° froid** pour 82°
                // chaud, et le plancher anti-vacuité a tiré — correctement. Cause : les deux arcs
                // sont composés sur la face à des opacités DIFFÉRENTES (froid 0,333, chaud 0,533),
                // donc le froid s'éloigne bien plus de son jeton que le chaud. Une distance absolue
                // à la couleur pure mesure l'OPACITÉ autant que la teinte.
                // ⇒ Le mélange préserve la DIRECTION de la teinte quelle que soit l'opacité : un
                //   pixel de l'arc froid a ses canaux vert et bleu au-dessus du rouge, un pixel de
                //   l'arc chaud a son rouge au-dessus des deux autres. C'est ce signe qu'on lit.
                // ⚠️ Avec un plancher d'écart, sinon le fond bleu nuit — dont le bleu dépasse aussi
                //   le rouge — serait compté comme « froid » sur toute la circonférence.
                int nFroid = 0, nChaud = 0, neutreMax = 0, neutreCourant = 0;
                // ⚠️ Les BORNES, pas seulement les comptes : un compte dit combien de degrés sont
                // peints, jamais OÙ. Deux arcs qui se recouvrent et deux arcs séparés peuvent
                // rendre le même compte — et c'est la carte `fillAmount → angle` qu'il faut lire
                // pour corriger, le code déclarant lui-même cette relation non linéaire.
                int froidMin = 999, froidMax = -999, chaudMin = 999, chaudMax = -999;
                bool vuFroid = false;
                for (int deg = -95; deg <= 95; deg++)
                {
                    float a = (90f - deg) * Mathf.Deg2Rad;
                    int px = Mathf.RoundToInt(cx + Mathf.Cos(a) * rPx * 0.45f);
                    int py = Mathf.RoundToInt(cy + Mathf.Sin(a) * rPx * 0.45f);
                    if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
                    Color c = img.GetPixel(px, py);
                    float ecartFroid = Mathf.Min(c.g, c.b) - c.r;
                    float ecartChaud = c.r - Mathf.Max(c.g, c.b);
                    bool estFroid = ecartFroid > 0.06f;
                    bool estChaud = ecartChaud > 0.06f;
                    if (estFroid) { nFroid++; vuFroid = true; neutreCourant = 0;
                                    if (deg < froidMin) froidMin = deg; if (deg > froidMax) froidMax = deg; }
                    else if (estChaud) { nChaud++; neutreCourant = 0;
                                    if (deg < chaudMin) chaudMin = deg; if (deg > chaudMax) chaudMax = deg; }
                    else if (vuFroid && nChaud == 0)
                    {
                        neutreCourant++;
                        if (neutreCourant > neutreMax) neutreMax = neutreCourant;
                    }
                }
                Debug.Log($"[CADRAN] arc : froid {froidMin}..{froidMax}° ({nFroid}°) · " +
                          $"chaud {chaudMin}..{chaudMax}° ({nChaud}°) · " +
                          $"segment neutre le plus long entre les deux = {neutreMax}° (source SVG 29,45°)");
                // ⛔ PLANCHERS : sans eux, un cadran SANS arcs rendrait « 0 froid, 0 chaud, segment
                //    indéfini » et l'assertion suivante serait vraie ou fausse pour rien.
                Assert.Greater(nFroid, 30, "anti-vacuité : la zone froide doit exister pour qu'on " +
                                           "puisse mesurer ce qui la sépare de la chaude");
                Assert.Greater(nChaud, 30, "anti-vacuité : la zone chaude doit exister");
                if (neutreMax < 20)
                    ecarts.Add($"SEGMENT NEUTRE : {neutreMax}° au lieu de 29,45° (SVG : froid 180→90, " +
                               "chaud 60,55→0) — les deux zones se touchent ou se recouvrent, et le " +
                               "cadran passe de « froid | neutre | chaud » à un dégradé continu.");

                // 4. LE FOND RADIAL : la face doit s'assombrir du centre vers le bord.
                float lCentre = Luminance(EchantillonAnneau(img, cx, cy, rPx * 0.12f));
                float lBord = Luminance(EchantillonAnneau(img, cx, cy, rPx * 0.72f));
                Debug.Log($"[CADRAN] fond : L(0,12 R)={lCentre:F4} · L(0,72 R)={lBord:F4} · " +
                          $"écart={lCentre - lBord:F4} (canon : dégradé radial, donc écart > 0)");
                if (lCentre - lBord <= 0.02f)
                    ecarts.Add($"FOND : plat — écart de luminance {lCentre - lBord:F4} entre 0,12 R " +
                               "et 0,72 R, là où le canon en fait un dégradé radial.");
            }
            finally { Object.DestroyImmediate(img); }

            Assert.IsEmpty(ecarts,
                "le cadran ne compose pas ce que le canon dessine :\n  · " + string.Join("\n  · ", ecarts));
        }

        private static bool Proche(Color a, Color b, float tol) =>
            Mathf.Abs(a.r - b.r) < tol && Mathf.Abs(a.g - b.g) < tol && Mathf.Abs(a.b - b.b) < tol;

        private static float Luminance(Color c) => 0.2126f * c.r + 0.7152f * c.g + 0.0722f * c.b;

        /// <summary>La couleur MOYENNE d'un anneau — jamais un pixel unique : l'aiguille, le pivot
        /// et les deux libellés traversent le disque, et un échantillon isolé tomberait dessus une
        /// fois sur trois. La moyenne de 72 points les dilue sans les exclure, et c'est déclaré.</summary>
        private static Color EchantillonAnneau(Texture2D img, float cx, float cy, float r)
        {
            float sr = 0f, sg = 0f, sb = 0f; int n = 0;
            for (int i = 0; i < 72; i++)
            {
                float a = i * 5f * Mathf.Deg2Rad;
                int px = Mathf.RoundToInt(cx + Mathf.Cos(a) * r);
                int py = Mathf.RoundToInt(cy + Mathf.Sin(a) * r);
                if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
                Color c = img.GetPixel(px, py);
                sr += c.r; sg += c.g; sb += c.b; n++;
            }
            return n == 0 ? Color.black : new Color(sr / n, sg / n, sb / n);
        }

        /// <summary>Le filet de barre et le soulignement du montant ont des épaisseurs DIFFÉRENTES
        /// au canon — `.barre::after{height:1px}` contre `.ratio{height:2px}` — et le client les
        /// confondait sous une seule constante. Un juge ⊥ a mesuré le filet à 1,81 px CSS pour 1,00.
        /// ⚠️ La garde porte sur le RAPPORT des deux, pas sur leurs valeurs absolues : elle est donc
        /// vraie à toute résolution et ne casse pas si la maquette change d'échelle. Et elle exige
        /// que les deux EXISTENT — un soulignement absent rendrait le rapport indéfini, pas juste.</summary>
        [UnityTest]
        public IEnumerator DA8_FiletDeBarre_MoitieDuSoulignement()
        {
            yield return WaitTopBarLoaded(BootShell());
            yield return new WaitForEndOfFrame();

            RectTransform filet = null, souligne = null;
            foreach (RectTransform rt in shell.TopBar.GetComponentsInChildren<RectTransform>(true))
            {
                if (rt.name == "Hairline") filet = rt;
                if (rt.name == "Underline") souligne = rt;
            }
            Assert.IsNotNull(filet, "le filet de bas de barre doit exister");
            Assert.IsNotNull(souligne, "le soulignement du montant doit exister — sans lui le " +
                                       "rapport mesuré ci-dessous serait indéfini, pas juste");
            Assert.Greater(filet.rect.height, 0f, "anti-vacuité : le filet doit avoir une épaisseur");
            float rapport = filet.rect.height / souligne.rect.height;
            Debug.Log($"[FILET] barre={filet.rect.height:F2} u · soulignement={souligne.rect.height:F2} u " +
                      $"· rapport={rapport:F3} (canon 1/2 = 0,500)");
            Assert.AreEqual(0.5f, rapport, 0.05f,
                $"le filet de barre fait {rapport:F3} fois le soulignement au lieu de la moitié : le " +
                "canon donne 1 px CSS au filet et 2 au soulignement, et une constante unique pour " +
                "les deux est vraie pour l'un et fausse pour l'autre");
        }

        /// <summary>Rend le canvas du shell dans une texture AUX DIMENSIONS DE L'ÉCRAN, par le
        /// chemin qui fonctionne dans ce batchmode : une caméra hors-écran et une `RenderTexture`.
        ///
        /// ⚠️ La taille est celle de l'ÉCRAN et non un format choisi : cet oracle situe le
        /// médaillon par `GetWorldCorners`, qui rend des pixels d'écran sous un canvas
        /// `ScreenSpaceOverlay`. Une texture d'une autre taille décalerait toutes les sondes sans
        /// rien casser de visible — le pire des défauts d'instrument.
        /// ⚠️ Le mode du canvas est RÉTABLI dans tous les cas : le laisser en `ScreenSpaceCamera`
        /// changerait le monde du test suivant, et cette suite en compte vingt-six autres.</summary>
        /// <summary>⛔ D'OÙ VIENT LE FUSELAGE DES ARCS ? Une expérience à UNE variable.
        ///
        /// Un juge ⊥ mesure l'épaisseur de l'arc à **1,02 → 3,16 → 0,94** le long de sa course, là
        /// où le canon la garde constante (2,46–2,52) et coupée net. Trois étapes peuvent produire
        /// ça, et il faut savoir LAQUELLE avant de toucher au tracé :
        ///   (1) le RASTERISEUR (`ProceduralUI.Ring`) — **DÉJÀ RÉFUTÉ hors ligne** : reproduit à
        ///       l'identique, il rend un ratio max/min de **1,083** à la taille réelle (36 texels),
        ///       et son écart va dans l'autre sens (plus épais sur les axes, plus fin en diagonale)
        ///       quand le fuselage observé est fin aux DEUX bouts. Réfuté sur la magnitude ET sur
        ///       la forme ;
        ///   (2) la COUPE `Image.Type.Filled` en `Radial180` — elle taille un maillage, pas la
        ///       texture ; ses bords pourraient amincir les extrémités ;
        ///   (3) la MISE À L'ÉCHELLE d'affichage — un anneau de 36 texels rendu à une autre taille.
        ///
        /// ⇒ LE DISCRIMINANT, et c'est ce qui rend l'expérience utile : on rend le MÊME arc à deux
        ///   `fillAmount` très différents. Si l'amincissement reste collé aux EXTRÉMITÉS et garde la
        ///   même étendue absolue quand l'arc s'allonge, c'est la coupe (2). S'il se dilate avec
        ///   l'arc, ou si toute l'épaisseur bouge en bloc, c'est l'échelle (3).
        /// ⚠️ Le rayon et le centre sont LUS SUR L'OBJET (`ArcTrack`/`ArcHot`), jamais recalculés
        ///   depuis un ratio : le socle de ce dépôt porte déjà un oracle qui échantillonnait 3 px à
        ///   côté parce qu'il dérivait son rayon d'un nombre gelé.
        /// ⚠️ Ce test MESURE et n'asserte que l'anti-vacuité (il doit trouver de l'arc). Poser un
        ///   seuil avant de savoir d'où vient la grandeur serait choisir la réponse.
        ///
        /// ⛔⛔ ÉTAT AU 2026-09-06 : **CET INSTRUMENT N'EST PAS ENCORE VALIDE, ET C'EST LUI QUI LE
        /// DIT.** Son premier run rend trois résultats qui le réfutent tous les trois :
        ///   · à `fill=0,1124` (la valeur de production) il ne trouve **AUCUN** pixel d'arc et
        ///     l'annonce comme tel — sa bande ne couvre pas l'arc réel. *Il déclare son hors-sujet
        ///     au lieu de rendre un zéro qui passerait pour une mesure* ;
        ///   · à `fill=0,30` il compte **71 secteurs porteurs sur 90** là où 0,30 de tour n'en
        ///     couvre que ~54 : il ramasse plus large que l'arc ;
        ///   · son profil est **uniforme à 6–7** sur presque tous les secteurs, pour une épaisseur
        ///     nominale de 5 dont la rampe d'anti-crénelage ne laisse que 3,5 intégrés.
        ///   ⇒ Les trois disent la même chose : la bande radiale (0,55–1,05 R) et le discriminant
        ///     « chaleur » attrapent aussi le **LAITON du boîtier**, chaud lui aussi. *Un résultat
        ///     uniforme dit qu'on mesure autre chose* — troisième fois que ce piège attrape un
        ///     oracle de ce médaillon.
        /// ⇒ CE QU'IL LUI FAUT, et ce n'est pas un réglage : une bande radiale dérivée du rect
        ///   d'`ArcTrack` (pas du médaillon) et un discriminant de DIRECTION DE TEINTE séparant la
        ///   braise de l'arc du laiton du boîtier — deux chaudes voisines, donc pas un seuil de
        ///   chaleur. **Tant que ce n'est pas fait, aucun de ses nombres ne doit être cité** : ils
        ///   sont là pour être réfutés, pas pour servir de mesure.
        /// ★ Ce que le run a établi : rien de plus. L'hypothèse du rasteriseur reste réfutée hors
        ///   ligne (1,083 contre 3,4 observés) ; la coupe radiale et l'échelle d'affichage restent
        ///   DÉPARTAGÉES PAR PERSONNE, et aucun geste n'est posé sur le tracé.
        ///
        /// ⇒ TOUR SUIVANT — la GÉOMÉTRIE est réparée et vérifiée (centre au milieu de l'image, rayon
        ///   29,1 px pour 35,6 unités × 3,26 d'échelle de barre ÷ 2 : les nombres se referment), et le
        ///   confondant est NOMMÉ : ce n'est pas le laiton, c'est **`ArcTrack`**, la piste pâle —
        ///   même rayon, même épaisseur, et `fillAmount = 0,5` soit 180°, soit exactement les 90
        ///   secteurs balayés. D'où « 71 sur 90 » là où l'arc n'en couvre que 54.
        /// ⚠️ Et le discriminant de DIRECTION DE TEINTE est réfuté avant d'être écrit : le laiton du
        ///   boîtier n'est pas une chaude voisine de la braise, c'est **le même jeton**
        ///   (`warmedBrass = DesignTokens.Current.hudGaugeArcHot`). Deux objets qui partagent leur
        ///   couleur ne se séparent par aucune teinte.
        /// ⇒ Le séparateur restant est la SATURATION : braise pleine pour l'arc, lavis
        ///   d'`onSurfacePrimary` à 0,133 pour la piste. C'est la mesure suivante.</summary>
        [UnityTest, Category("HUDv31")]
        public IEnumerator DA9_Diagnostic_FuselageDesArcs_UneSeuleVariable()
        {
            yield return WaitTopBarLoaded(BootShell());
            yield return new WaitForEndOfFrame();

            Transform manoT = shell.TopBar.transform.Find("Manometre");
            Assert.IsNotNull(manoT, "Manometre doit exister");
            Transform arc = manoT.Find("ArcHot");
            Assert.IsNotNull(arc, "l'arc chaud doit exister pour être mesuré");
            var arcImg = arc.GetComponent<UnityEngine.UI.Image>();
            Assert.IsNotNull(arcImg, "l'arc doit être une Image remplie");
            float fillOrigine = arcImg.fillAmount;

            var lignes = new List<string>();
            foreach (float f in new[] { fillOrigine, 0.30f, 0.45f })
            {
                arcImg.fillAmount = f;
                Canvas.ForceUpdateCanvases();
                yield return null;
                Texture2D img = RendreLEcran();
                lignes.Add(ProfilEpaisseurArc(img, (RectTransform)arc, f, (RectTransform)manoT));
                Object.DestroyImmediate(img);
            }
            arcImg.fillAmount = fillOrigine;
            Canvas.ForceUpdateCanvases();
            yield return null;

            foreach (string l in lignes) Debug.Log("[DA9] " + l);
        }

        /// <summary>L'épaisseur de l'arc le long de sa course, intégrée sur la bande radiale, par
        /// pas de 2°. Le centre et le rayon viennent du RECT de l'arc — mesurés, pas dérivés.</summary>
        private string ProfilEpaisseurArc(Texture2D img, RectTransform arcRt, float fill,
            RectTransform medaillonRt)
        {
            // ⛔⛔ LA CONVERSION SE FAIT PAR LE CANVAS, PAS PAR `WorldToScreenPoint`. Ma version
            // précédente appelait ce dernier APRÈS que `RendreLEcran` a restauré le mode du canvas :
            // elle mélangeait donc unités de canvas et pixels d'écran et rendait un rayon de 29,1 px
            // là où l'arc en fait 8,9 — **plus grand que le médaillon qui le contient**, ce qui
            // aurait dû sauter aux yeux. C'est le défaut que ce même soir avait déjà produit sur ㊲
            // (`slot=1280x960, cadre v=-1334..637`), à l'identique. *Une conversion posée après la
            // restauration mesure un monde qui n'existe plus.*
            // ⇒ La forme juste, et elle n'a besoin d'aucune caméra : le canvas racine porte son rect
            //   en unités, l'image porte sa taille en pixels, et le rapport des deux EST l'échelle.
            RectTransform canvasRt = (RectTransform)arcRt.GetComponentInParent<Canvas>().rootCanvas.transform;
            var coinsArc = new Vector3[4];
            arcRt.GetWorldCorners(coinsArc);
            var coinsCanvas = new Vector3[4];
            canvasRt.GetWorldCorners(coinsCanvas);
            // ⚠️ L'ÉCHELLE SE PREND SUR LES MÊMES COINS QUE LES POSITIONS. Ma version précédente
            // divisait par `canvasRt.rect.width` (unités NON mises à l'échelle) tout en soustrayant
            // des coins MONDE (qui portent le `scaleFactor` du canvas) : deux repères mélangés dans
            // la même formule, et le centre atterrissait au quart de l'image au lieu du milieu.
            // *Le même mélange unités/pixels, réintroduit par le correctif qui le retirait* — la
            // troisième fois ce soir, et c'est pourquoi le contrôle de vraisemblance ci-dessous
            // reste, même maintenant qu'il passe.
            float parU = img.width / Mathf.Abs(coinsCanvas[2].x - coinsCanvas[0].x);
            var centre = new Vector2(
                ((coinsArc[0].x + coinsArc[2].x) * 0.5f - coinsCanvas[0].x) * parU,
                ((coinsArc[0].y + coinsArc[2].y) * 0.5f - coinsCanvas[0].y) * parU);
            float rayonExt = 0.5f * Mathf.Abs(coinsArc[2].x - coinsArc[0].x) * parU;
            float rayonMedaillon = 0.5f * Mathf.Abs(medaillonRt.rect.width) * parU;
            // ⇒ Le contrôle de vraisemblance qui aurait attrapé la version précédente en une ligne :
            //   un arc ne peut pas être plus large que le médaillon qui le porte.
            if (rayonExt >= rayonMedaillon)
                return $"fill={fill:F4} · INSTRUMENT INVALIDE — rayon d'arc lu {rayonExt:F1} px pour "
                     + $"un médaillon de {rayonMedaillon:F1} px : la conversion est fausse, aucune "
                     + "mesure n'est publiée.";
            float sx = parU, sy = parU;
            // ⛔ LA BANDE VIENT DU RECT DE L'ARC, ET ELLE EST ÉTROITE. Ma première version balayait
            // 0,55 à 1,05 R : elle ramassait tout ce qui vit entre le centre et la jante. La bande
            // juste est celle de l'anneau lui-même — du rayon intérieur au rayon extérieur, plus
            // une marge d'un pixel de chaque côté pour la rampe d'anti-crénelage, et rien de plus.
            float epaisseurPx = ArcEpaisseurEnPixels(arcRt, sx);
            float rIn = Mathf.Max(1f, rayonExt - epaisseurPx) - 1f;
            float rOut = rayonExt + 1f;

            float Chaleur(Color p) => p.r - 0.5f * (p.g + p.b);
            var eps = new List<float>();
            var brut = new System.Text.StringBuilder();
            for (int a = 0; a < 180; a += 2)
            {
                float th = a * Mathf.Deg2Rad, somme = 0f;
                for (float r = rIn; r <= rOut; r += 0.25f)
                {
                    int x = Mathf.RoundToInt(centre.x + r * Mathf.Cos(th));
                    int y = Mathf.RoundToInt(centre.y + r * Mathf.Sin(th));
                    if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
                    if (Chaleur(img.GetPixel(x, y)) > 0.12f) somme += 0.25f;
                }
                if (somme > 0f) { eps.Add(somme); brut.Append($" {a}:{somme:F1}"); }
            }
            if (eps.Count == 0)
                return $"fill={fill:F4} · AUCUN pixel d'arc trouvé (rayon ext lu {rayonExt:F1} px, "
                     + "centre " + centre + ") — l'instrument mesure ailleurs, PAS un arc absent";
            float min = float.MaxValue, max = 0f;
            foreach (float e in eps) { if (e < min) min = e; if (e > max) max = e; }
            return $"fill={fill:F4} · {eps.Count} secteurs porteurs sur 90 · épaisseur min={min:F2} "
                 + $"max={max:F2} ratio={max / Mathf.Max(min, 0.01f):F2} · bande radiale lue "
                 + $"{rIn:F1}..{rOut:F1} px (ext {rayonExt:F1}, épaisseur {epaisseurPx:F1})"
                 + $" · profil{brut}";
        }

        /// <summary>L'épaisseur de l'anneau en pixels d'image, dérivée du RECT de l'arc et de la
        /// proportion connue du sprite (l'anneau occupe `ArcThicknessPx` sur `ArcDiameterPx`), donc
        /// elle suit l'objet au lieu d'être recopiée. ⚠️ C'est l'épaisseur NOMINALE : la rampe
        /// d'anti-crénelage en retire ~30 % à l'image (mesuré hors ligne : 3,5 intégrés pour 5
        /// nominaux). On l'élargit d'un pixel de chaque côté plutôt que de corriger ce facteur ici —
        /// la bande doit CONTENIR l'arc, pas prétendre le mesurer.</summary>
        private static float ArcEpaisseurEnPixels(RectTransform arcRt, float echelle)
        {
            var coins = new Vector3[4];
            arcRt.GetWorldCorners(coins);
            Vector2 g = RectTransformUtility.WorldToScreenPoint(null, coins[0]);
            Vector2 d = RectTransformUtility.WorldToScreenPoint(null, coins[2]);
            float diametrePx = Mathf.Abs(d.x - g.x) * echelle;
            return diametrePx * (5f / 35.6f);   // ArcThicknessPx / ArcDiameterPx, la proportion du sprite
        }

        private Texture2D RendreLEcran()
        {
            Canvas canvas = shell.ShellCanvas;
            RenderMode modeAvant = canvas.renderMode;
            Camera camAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;
            int l = Screen.width, h = Screen.height;
            var rt = new RenderTexture(l, h, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("DA6Cam");
            try
            {
                var cam = camGo.AddComponent<Camera>();
                cam.targetTexture = rt;
                cam.clearFlags = CameraClearFlags.SolidColor;
                cam.backgroundColor = Color.black;
                cam.orthographic = true;
                canvas.renderMode = RenderMode.ScreenSpaceCamera;
                canvas.worldCamera = cam;
                canvas.planeDistance = 10f;
                Canvas.ForceUpdateCanvases();
                cam.Render();
                RenderTexture prev = RenderTexture.active;
                RenderTexture.active = rt;
                var tex = new Texture2D(l, h, TextureFormat.RGB24, false);
                tex.ReadPixels(new Rect(0, 0, l, h), 0, 0);
                tex.Apply();
                RenderTexture.active = prev;
                return tex;
            }
            finally
            {
                canvas.renderMode = modeAvant;
                canvas.worldCamera = camAvant;
                canvas.planeDistance = planAvant;
                Object.DestroyImmediate(camGo);
                rt.Release();
                Object.DestroyImmediate(rt);
            }
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

            // ⛔⛔ CET ORACLE COMPARAIT L'ANNEAU DE CONTRÔLE À **UN SEUL PIXEL DE FOND**, pris à
            // 60 px à gauche du médaillon, en supposant que tout l'anneau repose sur cette même
            // couleur. L'hypothèse a tenu tant que le médaillon faisait 68 unités : l'anneau à
            // 34+14 = 48 restait DANS une barre de 56, donc sur un aplat. Le bandeau est passé à
            // l'échelle de la maquette (médaillon 64 px CSS ⇒ ~196 px de diamètre) : l'anneau
            // sort maintenant très largement de la barre et croise le décor. Résultat : 127
            // « débordements » signalés, tous à 201-204° — c'est-à-dire SOUS la barre — et pas un
            // seul n'était du contenu de manomètre.
            //   Relever la tolérance ou allonger `knownGood` avec les couleurs du décor aurait été
            //   une rustine : la liste serait à rallonger à chaque écran, et l'oracle deviendrait
            //   aveugle à un vrai débordement de la même teinte.
            //   ⇒ LA PROPRIÉTÉ VOULUE NE PARLE PAS DU FOND : elle dit « aucun pixel HORS du cercle
            //     inscrit n'appartient au manomètre ». On la mesure donc par une EXPÉRIENCE À UNE
            //     VARIABLE — deux captures qui ne diffèrent QUE par la présence du médaillon.
            //     Tout pixel de l'anneau qui change entre les deux EST du manomètre, quel que soit
            //     ce qu'il y a derrière. Plus aucune hypothèse sur le décor, à aucune résolution.
            // ⛔⛔⛔ CET ORACLE N'AVAIT JAMAIS TOURNÉ ICI. Mesuré le 2026-09-06 : il lève une
            // `NullReferenceException` à cette ligne même, sur les DEUX captures (`:488` et `:494`),
            // parce que `ScreenCapture.CaptureScreenshotAsTexture()` ne rend RIEN dans ce batchmode.
            // C'est la classe que le runbook §4.8 documente déjà pour `ScreenCapture.CaptureScreenshot`
            // (« cette API n'écrit rien dans ce batchmode », TD-597, 0 passé sur 11) — et la ligne
            // de partage y est nommée : *les suites de capture qui marchent ici passent toutes par
            // `RenderTexture` + une caméra*.
            // ★ Ce que ça coûtait : c'est le SEUL oracle du dépôt qui regarde les pixels du
            //   manomètre. Les vingt-six autres de `HUDv31` mesurent des propriétés structurelles
            //   ou géométriques. Un juge ⊥ a donc pu relever quatre défauts du cadran — pivot du
            //   mauvais côté du centre (0,147 R en dessous → 0,145 R au-dessus), segment neutre de
            //   27° disparu, lunette intérieure absente, fond radial devenu plat — pendant que
            //   `HUDv31` rendait 26/27. *Une garde qui n'a jamais tourné n'est pas une garde ;
            //   c'est une prose datée avec un `[Test]` devant.*
            // ⚠️ Le rouge ne se lisait pas comme ça : `NullReferenceException` sur un oracle de
            //   pixels ressemble à un défaut de l'écran, pas à une API muette.
            Texture2D avec = RendreLEcran();
            Texture2D sans = null;
            try
            {
                manoT.gameObject.SetActive(false);
                yield return new WaitForEndOfFrame();
                sans = RendreLEcran();
                manoT.gameObject.SetActive(true);

                Assert.AreEqual(avec.width, sans.width, "les deux captures doivent avoir la MÊME taille");
                Assert.AreEqual(avec.height, sans.height, "les deux captures doivent avoir la MÊME taille");

                // ⛔ LA BANDE MORTE ÉTAIT ABSOLUE (2,5 px), ET ELLE AVAIT ÉTÉ CALIBRÉE POUR UN
                // MÉDAILLON DE 68 UNITÉS. Il en fait ~196 : son anneau, son ombre et son halo ont
                // triplé avec lui, mais pas la bande. L'oracle mesurait donc l'ANTI-CRÉNELAGE et le
                // halo de l'anneau lui-même — « le lissé entoure chaque forme, tout ce qui
                // interroge le voisin le rencontre d'abord ». Les deux bornes sont désormais des
                // FRACTIONS du rayon, donc vraies à toute échelle (2,5/34 = 7,4 % ; 14/34 = 41 %).
                float bandeMorte = radiusPx * 0.074f;
                float marginPx = radiusPx * 0.41f;
                const float colorEpsilon = 0.06f; // tolère l'anti-crénelage du bord du ring lui-même

                // ⛔ LE LOSANGE EST UNE EXCEPTION LÉGITIME, ET ELLE S'EXPRIME PAR SES BORNES, PAS
                // PAR SA COULEUR. Le canon (`.losange`) pose un losange de sceau ~7 px SOUS l'anneau
                // — deux juges visuels l'avaient signalé ABSENT avant qu'il soit construit. Il est
                // donc, par dessin, hors du cercle inscrit.
                //   L'ancien oracle ne le voyait pas : il mettait `hudHairlineGold` dans sa liste
                //   blanche, or le losange porte EXACTEMENT ce laiton. Une garde qui blanchit une
                //   COULEUR devient aveugle à tout ce qui la porte — y compris à un vrai débord.
                //   ⇒ On exclut donc le losange par son IDENTITÉ et son rectangle MESURÉ, jamais
                //     par sa teinte. Tout autre chrome hors du cercle reste un débord.
                Rect exclusion = RectDeLEnfant(manoRect, "BoitierLosange");
                var (offenders, sampled, examples) =
                    CountRingDifferences(avec, sans, cx, cy, radiusPx + bandeMorte, marginPx, colorEpsilon, exclusion);
                Assert.Greater(sampled, 100, "anti-vacuité : l'anneau de contrôle doit couvrir un nombre RÉEL de pixels");
                Assert.AreEqual(0, offenders,
                    $"du contenu du manomètre déborde du cercle inscrit ({offenders}/{sampled} pixels de l'anneau " +
                    "CHANGENT quand on masque le médaillon — donc ils lui appartiennent) — doctrine : un ARC dans " +
                    "le disque, rien ne dépasse. Exemples (jusqu'à 10) :\n" + string.Join("\n", examples));

                // Contrôle POSITIF — le détecteur DOIT voir une différence qu'on y plante. Sans lui,
                // un oracle qui comparerait deux fois la MÊME texture rendrait 0 pour toujours, et
                // le 0 ci-dessus ne prouverait rien. Un BLOC de 5×5 plutôt qu'un pixel : la grille
                // (ang,r) du balayage ne tombe pas forcément sur un point donné, et un contrôle qui
                // ne survit que par coïncidence d'arrondi a déjà été mesuré muet ici.
                int probeCx = Mathf.RoundToInt(cx + radiusPx + bandeMorte + 6f);
                int probeCy = Mathf.RoundToInt(cy);
                for (int dx = -2; dx <= 2; dx++)
                    for (int dy = -2; dy <= 2; dy++)
                        avec.SetPixel(probeCx + dx, probeCy + dy, Color.magenta);
                avec.Apply();
                var (probeOffenders, _, _) =
                    CountRingDifferences(avec, sans, cx, cy, radiusPx + bandeMorte, marginPx, colorEpsilon, exclusion);
                Assert.Greater(probeOffenders, 0,
                    "contrôle positif : un bloc magenta planté juste hors du cercle DOIT être détecté — sinon " +
                    "le balayage ne peut rien voir et le 0 ci-dessus ne prouve rien");
            }
            finally
            {
                if (manoT != null) manoT.gameObject.SetActive(true);
                Object.Destroy(avec);
                if (sans != null) Object.Destroy(sans);
            }
        }

        /// <summary>Compte, sur un anneau juste HORS du cercle inscrit du médaillon, les pixels qui
        /// DIFFÈRENT entre deux captures ne se distinguant que par la présence du médaillon.
        ///
        /// C'est la forme qui ne suppose RIEN du décor : un pixel qui change quand on masque le
        /// médaillon lui appartient, un pixel qui ne change pas ne lui appartient pas. L'ancienne
        /// forme comparait à une couleur de fond échantillonnée en UN point, et devenait fausse dès
        /// que l'anneau cessait de reposer sur un aplat.</summary>
        private static (int offenders, int sampled, System.Collections.Generic.List<string> examples)
            CountRingDifferences(Texture2D avec, Texture2D sans, float cx, float cy,
                                 float radiusPx, float marginPx, float epsilon, Rect exclusion)
        {
            int offenders = 0, sampled = 0;
            var examples = new System.Collections.Generic.List<string>();
            for (int angle = 0; angle < 360; angle += 3)
            {
                float rad = angle * Mathf.Deg2Rad;
                for (float r = radiusPx + 2.5f; r <= radiusPx + marginPx; r += 2f)
                {
                    int px = Mathf.RoundToInt(cx + Mathf.Cos(rad) * r);
                    int py = Mathf.RoundToInt(cy + Mathf.Sin(rad) * r);
                    if (px < 0 || py < 0 || px >= avec.width || py >= avec.height) continue;
                    if (exclusion.width > 0f && exclusion.Contains(new Vector2(px, py))) continue;
                    sampled++;
                    Color a = avec.GetPixel(px, py);
                    Color b = sans.GetPixel(px, py);
                    float d = Mathf.Abs(a.r - b.r) + Mathf.Abs(a.g - b.g) + Mathf.Abs(a.b - b.b);
                    // ⚠️ « CHANGE » NE SUFFIT PAS : la doctrine dit « un ARC dans le disque, rien ne
                    // dépasse » — elle interdit du CHROME DESSINÉ hors du cercle, pas l'ombre douce
                    // que tout élément projette. Un halo qui assombrit le décor change bien les
                    // pixels, et il est légitime. Le discriminant est donc la SATURATION : un arc,
                    // un anneau, une aiguille sont des couleurs franches (laiton, or, teal, braise) ;
                    // une ombre est un gris. Sans ce second terme, l'oracle comptait 19 « débords »
                    // dont pas un n'était de l'arc.
                    bool chromeDessine = EstChromeSature(a);
                    // ⚠️ ET IL FAUT LE SECOND TERME, sinon on accuse le FILET DE LA BARRE. Mesuré :
                    // 50 « débords », tous à 192-195° (donc à gauche, sur l'horizontale du filet
                    // laiton), tous avec la MÊME paire de couleurs — avec le médaillon (176,141,61)
                    // = `hudHairlineGold` exact, sans lui (200,126,66). Le filet TRAVERSE l'anneau
                    // de contrôle par construction (le médaillon pend sous la barre), et le
                    // médaillon ne fait qu'en retoucher la teinte là où il le recouvre.
                    //   ⇒ Un débordement, c'est du chrome saturé LÀ OÙ IL N'Y EN AVAIT PAS. Si la
                    //     capture SANS médaillon porte déjà du chrome au même pixel, la différence
                    //     est une retouche de teinte sur un élément légitime, pas une fuite.
                    //   ⇒ Le contrôle positif reste valide : le magenta est planté sur du fond
                    //     NON saturé, donc il continue d'être vu.
                    bool chromeDejaLa = EstChromeSature(b);
                    if (d > epsilon && chromeDessine && !chromeDejaLa)
                    {
                        offenders++;
                        if (examples.Count < 10)
                            examples.Add($"ang={angle} r={r - radiusPx:F1}px-hors-cercle avec={a} sans={b} d={d:F3}");
                    }
                }
            }
            return (offenders, sampled, examples);
        }

        /// <summary>Le rectangle ÉCRAN d'un enfant nommé, ou un Rect vide s'il n'existe pas.
        /// Mesuré sur l'objet réel — jamais recalculé depuis un ratio, qui suivrait la mémoire de
        /// celui qui l'a écrit plutôt que la scène.</summary>
        private static Rect RectDeLEnfant(RectTransform parent, string nom)
        {
            Transform t = parent.Find(nom);
            if (t == null) return new Rect(0f, 0f, 0f, 0f);
            var coins = new Vector3[4];
            ((RectTransform)t).GetWorldCorners(coins);
            // ⛔ LES QUATRE COINS, PAS DEUX. Prendre `coins[0]`/`coins[2]` en x et `coins[0]`/
            // `coins[1]` en y suppose un rectangle ALIGNÉ SUR LES AXES. Le losange est un carré
            // TOURNÉ À 45° — c'est ce qui en fait un losange —, et ses deux coins ignorés sont
            // précisément ceux qui dépassent. Mesuré : l'exclusion ainsi calculée laissait 8 pixels
            // du losange hors de sa propre boîte, et l'oracle les accusait.
            float x0 = coins[0].x, x1 = coins[0].x, y0 = coins[0].y, y1 = coins[0].y;
            for (int i = 1; i < 4; i++)
            {
                x0 = Mathf.Min(x0, coins[i].x); x1 = Mathf.Max(x1, coins[i].x);
                y0 = Mathf.Min(y0, coins[i].y); y1 = Mathf.Max(y1, coins[i].y);
            }
            const float marge = 3f; // la frange d'anti-crénelage du losange lui-même
            return new Rect(x0 - marge, y0 - marge, (x1 - x0) + 2f * marge, (y1 - y0) + 2f * marge);
        }

        /// <summary>Une couleur de CHROME DESSINÉ (laiton, or, teal, braise) par opposition à un
        /// gris de décor ou à une ombre douce. Le discriminant est la saturation : les couleurs de
        /// ce HUD sont franches, les ombres ne le sont jamais.</summary>
        private static bool EstChromeSature(Color c)
        {
            float mx = Mathf.Max(c.r, Mathf.Max(c.g, c.b));
            float mn = Mathf.Min(c.r, Mathf.Min(c.g, c.b));
            float saturation = mx <= 0.001f ? 0f : (mx - mn) / mx;
            return saturation > 0.35f && mx > 0.30f;
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (f) — retour user, défaut 1 (2026-08-21) : « le filet traverse le médaillon ». INVESTIGUÉ,
        // PAS REPRODUIT — mesure pixel-réelle, classification orange/sombre pixel par pixel de la
        // rangée du filet (bas de barre) sur QUATRE images indépendantes du même état (capture Play
        // Mode live re-testée ICI, `Assets/Screenshots/hud_v31_manometre_final_burning.png` committé,
        // le crop zoomé cité par la demande depuis un autre dépôt, ET `Tools/hud-topbar-reference-
        // 2560.png` lui-même) : LES QUATRE montrent le MÊME motif — le filet n'est visible QUE hors
        // du cercle du médaillon, jamais dedans (le disque occulte déjà correctement le filet, à la
        // fois en Unity ET dans la référence). Voir `Tools/hud-v31-topbar-multires-implementation-
        // notes.md` § Deviations pour le détail (RGB exacts, seuils, les 3 rangées scannées). Ce qui
        // crée l'illusion visuelle : l'anneau ET le filet partagent EXACTEMENT le même token
        // (`hudHairlineGold` calme, ou le même `warmedBrass` sous alarme) — leur frontière commune se
        // fond à l'œil en un seul trait continu, un artefact que LA RÉFÉRENCE ELLE-MÊME présente
        // (même classification appliquée à la maquette, même motif trouvé). PAS un bug d'ORDRE DE
        // DESSIN. Garde STRUCTURELLE posée quand même, telle que demandée — VERTE sur le code actuel
        // (résultat attendu : aucun défaut de cette classe), avec un CONTRÔLE POSITIF qui casse
        // délibérément l'ordre de fratrie et prouve que LE MÊME détecteur rougit dessus.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private static bool RectsOverlap(RectTransform a, RectTransform b)
        {
            var ca = new Vector3[4]; a.GetWorldCorners(ca);
            var cb = new Vector3[4]; b.GetWorldCorners(cb);
            float aMinX = ca[0].x, aMaxX = ca[2].x, aMinY = ca[0].y, aMaxY = ca[1].y;
            float bMinX = cb[0].x, bMaxX = cb[2].x, bMinY = cb[0].y, bMaxY = cb[1].y;
            return aMinX < bMaxX && aMaxX > bMinX && aMinY < bMaxY && aMaxY > bMinY;
        }

        /// <summary>Un frère ne peut dessiner "par-dessus" que s'il dessine RÉELLEMENT quelque chose —
        /// MESURÉ (ce lot) : `Notification` (hook de données headless, alpha 0 — design C2F2/C2F4/DA5)
        /// chevauche géométriquement le médaillon (ancré 0.5/0.5, comme lui) et le suit en sibling
        /// index, mais ne PEINT rien (0 pixel visible) — un premier jet de cette garde le signalait à
        /// tort, exactement le piège du socle CLAUDE.md ("une garde qui vérifie la mauvaise propriété
        /// est pire que pas de garde"). `Graphic.color.a` proche de 0, sur TOUS les Graphics du sous-
        /// arbre, ⇒ rien à occulter ⇒ pas un offenseur.</summary>
        private static bool HasAnyVisibleGraphic(Transform t)
        {
            foreach (Graphic g in t.GetComponentsInChildren<Graphic>(true))
                if (g.color.a > 0.01f) return true;
            return false;
        }

        /// <summary>Tout FRÈRE DIRECT de `target` (jamais un descendant — la garde porte sur
        /// l'agencement de la BARRE, pas sur le contenu interne du médaillon) dont le rect chevauche
        /// géométriquement le rect de `target`, dont le sibling index est SUPÉRIEUR (dessiné APRÈS,
        /// donc PAR-DESSUS en uGUI), ET qui peint RÉELLEMENT quelque chose de visible, est un
        /// offenseur structurel.</summary>
        private static List<string> FindSiblingsDrawnOverElement(Transform parent, Transform target)
        {
            var offenders = new List<string>();
            int targetIndex = target.GetSiblingIndex();
            var targetRect = (RectTransform)target;
            for (int i = 0; i < parent.childCount; i++)
            {
                Transform sib = parent.GetChild(i);
                if (sib == target) continue;
                var sibRect = sib as RectTransform;
                if (sibRect == null) continue;
                if (!RectsOverlap(sibRect, targetRect)) continue;
                if (sib.GetSiblingIndex() <= targetIndex) continue;
                if (!HasAnyVisibleGraphic(sib)) continue; // rien à occulter — voir docblock ci-dessus
                offenders.Add(sib.name);
            }
            return offenders;
        }

        [UnityTest]
        public IEnumerator DA7_NoBarSibling_EverDrawnOverTheMedallion_StructuralSiblingOrder()
        {
            yield return WaitTopBarLoaded(BootShell());

            Transform root = shell.TopBar.transform;
            Transform manoT = root.Find("Manometre");
            Assert.IsNotNull(manoT, "Manometre doit exister comme enfant DIRECT du TopBar");

            // Anti-vacuité — au moins un frère DOIT chevaucher géométriquement le médaillon, sinon
            // "aucun offenseur" serait vrai par ABSENCE de sujet testable, jamais par discipline
            // d'ordre. Le médaillon déborde sous la barre (`ManometreVerticalOffsetPx`) : `Hairline`
            // (bord bas de la barre) chevauche TOUJOURS son rect — c'est précisément le cas que le
            // retour user visait.
            Transform hairlineT = root.Find("Hairline");
            Assert.IsNotNull(hairlineT, "Hairline doit exister comme enfant DIRECT du TopBar");
            Assert.IsTrue(RectsOverlap((RectTransform)hairlineT, (RectTransform)manoT),
                "anti-vacuité : Hairline doit géométriquement chevaucher le médaillon (le débordement " +
                "bas du médaillon est le cas réel où un ordre de fratrie incorrect serait visible) — " +
                "sinon ce test ne peut rien prouver");

            List<string> offenders = FindSiblingsDrawnOverElement(root, manoT);
            Assert.IsEmpty(offenders,
                "aucun frère du médaillon ne doit être dessiné PAR-DESSUS lui (sibling index supérieur) " +
                "tout en chevauchant géométriquement son rect — coupables : " + string.Join(", ", offenders));

            // Contrôle positif OBLIGATOIRE (socle CLAUDE.md) — casse l'ordre de fratrie RÉEL (déplace
            // Hairline APRÈS Manometre) et prouve que LE MÊME détecteur rougit dessus.
            hairlineT.SetSiblingIndex(manoT.GetSiblingIndex() + 1);
            List<string> brokenOffenders = FindSiblingsDrawnOverElement(root, manoT);
            CollectionAssert.Contains(brokenOffenders, "Hairline",
                "CONTRÔLE POSITIF : après avoir déplacé Hairline APRÈS Manometre dans l'ordre de " +
                "fratrie, le détecteur DOIT le signaler — sinon le 0 ci-dessus ne prouve rien");
        }
    }
}
