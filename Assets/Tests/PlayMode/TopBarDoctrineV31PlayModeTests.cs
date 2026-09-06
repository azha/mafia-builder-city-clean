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
                // ⛔⛔ L'ÉPAISSEUR, PAR LE MÊME CLASSIFIEUR — et c'est tout l'intérêt de la poser
                // ICI plutôt que dans un instrument voisin. J'en ai écrit un à côté (`DA9`) avec un
                // seuil de DISTANCE à la braise : il a mesuré l'arc FROID pendant trois tours, et
                // il a fallu éteindre la cible pour s'en apercevoir. La raison est écrite quinze
                // lignes plus haut, dans ce fichier, depuis le premier jour : *une distance absolue
                // à la couleur pure mesure l'OPACITÉ autant que la teinte*, et les deux arcs sont
                // composés à des opacités différentes. **Le classifieur juste existait déjà ; j'ai
                // écrit le mauvais à côté au lieu d'étendre le bon.**
                // ⇒ On balaie donc le RAYON à chaque degré, avec la direction de teinte, et on
                //   compte l'épaisseur peinte. Bande large (0,30 R à 0,70 R) : elle doit CONTENIR
                //   l'anneau, pas prétendre le border.
                int epFroidMin = 9999, epFroidMax = 0, epChaudMin = 9999, epChaudMax = 0;
                for (int deg = -95; deg <= 95; deg++)
                {
                    float a2 = (90f - deg) * Mathf.Deg2Rad;
                    int epF = 0, epC = 0;
                    for (float fr = 0.30f; fr <= 0.70f; fr += 0.005f)
                    {
                        int px2 = Mathf.RoundToInt(cx + Mathf.Cos(a2) * rPx * fr);
                        int py2 = Mathf.RoundToInt(cy + Mathf.Sin(a2) * rPx * fr);
                        if (px2 < 0 || py2 < 0 || px2 >= img.width || py2 >= img.height) continue;
                        Color c2 = img.GetPixel(px2, py2);
                        if (Mathf.Min(c2.g, c2.b) - c2.r > 0.06f) epF++;
                        else if (c2.r - Mathf.Max(c2.g, c2.b) > 0.06f) epC++;
                    }
                    if (epF > 0) { if (epF < epFroidMin) epFroidMin = epF; if (epF > epFroidMax) epFroidMax = epF; }
                    if (epC > 0) { if (epC < epChaudMin) epChaudMin = epC; if (epC > epChaudMax) epChaudMax = epC; }
                }
                // ⚠️ LE PAS EST L'UNITÉ DE LA MESURE, ET IL DOIT ÊTRE PETIT DEVANT L'OBJET.
                // Première version à 0,02 R : un pas de **1,11 px** pour un arc qui en fait ~4 —
                // l'épaisseur ne pouvait rendre que 1,11 · 2,22 · 3,33…, et le « ratio 8,00 » qu'elle
                // affichait était surtout de la quantification. Un instrument dont le pas est du
                // même ordre que la grandeur mesure son propre pas.
                float pasPx = rPx * 0.005f;
                // ⛔⛔ LA LUNETTE, EN GARDE D'EFFET — un juge ⊥ mesure « aucun maximum local à
                // l'endroit où le canon pose sa lunette (+18,5 L) : l'anneau n'existe pas à l'image
                // ou il est fondu ». La garde existante lit sa FORME (sprite présent, alpha non nul,
                // largeur inférieure au boîtier) : trois propriétés vraies que ZÉRO pixel satisfait
                // aussi bien. *Une garde sur les paramètres d'un effet n'est pas une garde sur son
                // effet* — le socle en porte déjà un cas, et c'en est un second.
                // ⇒ On lit donc le PROFIL RADIAL de luminance et on cherche le maximum local. Le
                //   rayon visé est une FRACTION du médaillon — (diamètre lunette / 2) / (diamètre
                //   médaillon / 2) — jamais une valeur en px ni en CSS : une fraction survit à la
                //   résolution, et ce fichier a déjà payé un ratio gelé qui échantillonnait 3 px à
                //   côté après un changement de taille.
                // ⚠️ L'échantillonnage évite les arcs et les libellés : on balaie la moitié BASSE
                //   (190°..350°), où le canon ne pose rien d'autre. Sans ça le profil mélangerait
                //   la lunette et les arcs, et le maximum trouvé serait celui de l'arc.
                {
                    // ⚠️ La fraction vient des DEUX RECTS, pas d'une constante recopiée : c'est
                    // la seule forme qui suive l'objet si le médaillon ou la lunette changent de
                    // taille. Ce fichier a déjà payé un ratio gelé (0,75f) dont le commentaire
                    // portait la division par un diamètre périmé.
                    // ⛔ LES TROIS CAUSES, MESURÉES PAR DES PROPRIÉTÉS STRUCTURELLES IMPRIMÉES —
                    // aucune hypothèse. La deuxième et la troisième sont des cas que ce dépôt a
                    // déjà payés : `AddComponent<T>()` à l'exécution n'honore PAS le
                    // `[RequireComponent(CanvasRenderer)]` d'une classe de base, et sans
                    // `CanvasRenderer` un `Graphic` ne dessine RIEN sans la moindre erreur console ;
                    // et un `Graphic` nu n'implémente ni `IMaskable` ni `IClippable`, donc aucun
                    // `Mask` ne peut l'atteindre — le dispositif d'encadrement devient décoratif.
                    Transform lunSonde = manoT.Find("Lunette");
                    if (lunSonde != null)
                    {
                        var lunImg = lunSonde.GetComponent<UnityEngine.UI.Image>();
                        var lunCr = lunSonde.GetComponent<CanvasRenderer>();
                        var masqueParent = lunSonde.GetComponentInParent<UnityEngine.UI.Mask>();
                        var masqueRect = lunSonde.GetComponentInParent<UnityEngine.UI.RectMask2D>();
                        var lunRt2 = (RectTransform)lunSonde;
                        float largeurPx = lunRt2.rect.width / Mathf.Max(1f, manoRect.rect.width) * rPx * 2f;
                        Debug.Log($"[CADRAN-LUNETTE-STRUCT] CanvasRenderer={(lunCr != null ? "PRÉSENT" : "ABSENT")}"
                                  + $" · Image={(lunImg != null ? "présente" : "ABSENTE")}"
                                  + $" · MaskableGraphic={(lunImg is UnityEngine.UI.MaskableGraphic ? "oui" : "NON")}"
                                  + $" · maskable={(lunImg != null && lunImg.maskable ? "oui" : "non")}"
                                  + $" · sous Mask={(masqueParent != null ? masqueParent.name : "aucun")}"
                                  + $" · sous RectMask2D={(masqueRect != null ? masqueRect.name : "aucun")}"
                                  + $" · enabled={(lunImg != null && lunImg.enabled ? "oui" : "NON")}"
                                  + $" · alpha={(lunImg != null ? lunImg.color.a : -1f):F3}"
                                  + $" · sprite={(lunImg != null && lunImg.sprite != null ? lunImg.sprite.texture.width + "px" : "ABSENT")}"
                                  + $" · anneau ≈ {lunRt2.rect.width / Mathf.Max(1f, manoRect.rect.width) * rPx * 2f * (2f / Mathf.Max(1f, lunRt2.rect.width)):F2} px d'épaisseur à l'image"
                                  + $" (diamètre {largeurPx:F1} px) · pas de sonde {rPx * 0.01f:F2} px");
                    }

                    Transform lunT = manoT.Find("Lunette");
                    float fracLunette = lunT != null
                        ? ((RectTransform)lunT).rect.width / Mathf.Max(1f, manoRect.rect.width)
                        : -1f;
                    if (fracLunette <= 0f) ecarts.Add("LUNETTE : absente de l'arbre — rien à mesurer");
                    var profil = new List<float>();
                    for (int i = 0; i <= 40; i++)
                    {
                        float fr = 0.60f + i * 0.01f;   // 0,60 R à 1,00 R
                        float somme = 0f; int n = 0;
                        for (int deg = 190; deg <= 350; deg += 2)
                        {
                            float aL = deg * Mathf.Deg2Rad;
                            int lx = Mathf.RoundToInt(cx + Mathf.Cos(aL) * rPx * fr);
                            int ly = Mathf.RoundToInt(cy + Mathf.Sin(aL) * rPx * fr);
                            if (lx < 0 || ly < 0 || lx >= img.width || ly >= img.height) continue;
                            Color cl = img.GetPixel(lx, ly);
                            somme += 0.2126f * cl.r + 0.7152f * cl.g + 0.0722f * cl.b; n++;
                        }
                        profil.Add(n > 0 ? somme / n : 0f);
                    }
                    // ⛔⛔ ÉTEINDRE LA CIBLE — le contrôle qui a démasqué un instrument aveugle il y
                    // a une heure, appliqué ici à l'objet lui-même. Si le profil est INCHANGÉ avec
                    // la lunette désactivée, elle ne contribue à aucun pixel : le débat « trop pâle
                    // ou mal placée » est clos, elle n'est pas dessinée du tout.
                    if (lunSonde != null)
                    {
                        var li = lunSonde.GetComponent<UnityEngine.UI.Image>();
                        bool gardeL = li.enabled;
                        li.enabled = false;
                        Canvas.ForceUpdateCanvases();
                        Texture2D sansLun = RendreLEcran();
                        float sommeS = 0f; int nS = 0;
                        for (int deg = 190; deg <= 350; deg += 2)
                        {
                            float aL = deg * Mathf.Deg2Rad;
                            int lx = Mathf.RoundToInt(cx + Mathf.Cos(aL) * rPx * fracLunette);
                            int ly = Mathf.RoundToInt(cy + Mathf.Sin(aL) * rPx * fracLunette);
                            if (lx < 0 || ly < 0 || lx >= sansLun.width || ly >= sansLun.height) continue;
                            Color cs = sansLun.GetPixel(lx, ly);
                            sommeS += 0.2126f * cs.r + 0.7152f * cs.g + 0.0722f * cs.b; nS++;
                        }
                        Object.DestroyImmediate(sansLun);
                        li.enabled = gardeL;
                        Canvas.ForceUpdateCanvases();
                        float lSans = nS > 0 ? sommeS / nS : -1f;
                        int idx = Mathf.RoundToInt((fracLunette - 0.60f) / 0.01f);
                        float lAvec = (idx >= 0 && idx < profil.Count) ? profil[idx] : -1f;
                        Debug.Log($"[CADRAN-LUNETTE-CIBLE] L avec={lAvec:F4} · L sans={lSans:F4} · "
                                  + $"delta={(lAvec - lSans) * 255f:+0.00;-0.00}/255 — si ~0, la lunette "
                                  + "ne contribue à AUCUN pixel et le débat « pâle ou mal placée » est clos");
                    }

                    int iAttendu = Mathf.RoundToInt((fracLunette - 0.60f) / 0.01f);
                    // ⛔⛔ LE CRITÈRE EST RÉÉCRIT — l'ancien cherchait un MAXIMUM LOCAL en comparant
                    // à ±0,01 R alors que l'anneau fait ~0,07 R : les deux « voisins » étaient sur
                    // l'anneau, et aucun plateau large ne présente de maximum local strict, si clair
                    // soit-il. Le critère juste était écrit dans ce fichier et volontairement non
                    // posé ; un juge ⊥ l'a tranché en mesurant la lunette au canon (rayon 25,9–26,4
                    // contre 26,4–26,7 CSS, amplitude (19,18,16) contre (23,19,12)) : **aucun
                    // écart**. La lunette n'était pas trop faible — c'était l'oracle qui regardait
                    // ailleurs. *Un instrument dont la fenêtre est plus étroite que l'objet accuse
                    // l'objet.*
                    // ⇒ Forme retenue : la luminance SUR l'anneau contre le FOND AU-DELÀ de sa
                    //   largeur, de part et d'autre. La demi-largeur vient du rect de la lunette
                    //   rapportée au médaillon, jamais d'une constante.
                    float demiLargeurR = lunSonde != null
                        ? 0.5f * (2f / Mathf.Max(1f, ((RectTransform)lunSonde).rect.width))
                            * ((RectTransform)lunSonde).rect.width / Mathf.Max(1f, manoRect.rect.width)
                        : 0.03f;
                    int pasAnneau = Mathf.Max(2, Mathf.CeilToInt(demiLargeurR / 0.01f) + 2);
                    int iAnneau = Mathf.RoundToInt((fracLunette - 0.60f) / 0.01f);
                    float lAnneau = (iAnneau >= 0 && iAnneau < profil.Count) ? profil[iAnneau] : -1f;
                    int iDedans = iAnneau - pasAnneau, iDehors = iAnneau + pasAnneau;
                    float lDedans = (iDedans >= 0 && iDedans < profil.Count) ? profil[iDedans] : -1f;
                    float lDehors = (iDehors >= 0 && iDehors < profil.Count) ? profil[iDehors] : -1f;
                    float fondHorsAnneau = (lDedans >= 0f && lDehors >= 0f) ? 0.5f * (lDedans + lDehors)
                                         : Mathf.Max(lDedans, lDehors);
                    float lift = (lAnneau - fondHorsAnneau) * 255f;
                    int iMax = (lift > 2f) ? iAnneau : -1;
                    string ou = iMax < 0
                        ? $"apport {lift:+0.0;-0.0}/255 au-dessus du fond hors anneau (± {pasAnneau} pas)"
                        : $"anneau visible : apport {lift:+0.0;-0.0}/255 au-dessus du fond hors anneau";
                    Debug.Log($"[CADRAN-LUNETTE] attendue à {fracLunette:F3} R (indice {iAttendu}) · "
                              + $"{ou} · L au rayon attendu={(iAttendu >= 0 && iAttendu < profil.Count ? profil[iAttendu] : -1f):F4} "
                              + $"· voisins {(iAttendu > 0 ? profil[iAttendu - 1] : -1f):F4}/"
                              + $"{(iAttendu + 1 < profil.Count ? profil[iAttendu + 1] : -1f):F4} — "
                              + "garde d'EFFET : un anneau qui ne fait pas de bosse n'existe pas à l'image");
                    // ⛔⛔⛔ CETTE GARDE A UN DÉFAUT DE CRITÈRE, MESURÉ — et c'est le cinquième
                    // instrument de la nuit pris en défaut, toujours de la même façon : par un
                    // contrôle, jamais par relecture.
                    // Le test cherche un MAXIMUM LOCAL en comparant chaque rayon à ses voisins à
                    // ±0,01 R. Or l'anneau fait **3,27 px** d'épaisseur pour un rayon de 44 px, soit
                    // **~0,07 R, c'est-à-dire SEPT pas** : les deux « voisins » sont EUX AUSSI sur
                    // l'anneau. Prouvé en montant l'opacité — l'apport passe de +6,35 à +32,65/255
                    // et **les voisins montent avec** (0,1636 → 0,3046) : un plateau large ne
                    // présente aucun maximum local strict, si clair soit-il.
                    // ⇒ *Un instrument dont le voisinage est plus étroit que l'objet ne peut pas
                    //   voir cet objet, quelle que soit son intensité.* Même famille que « le pas
                    //   est l'unité de la mesure », un cran plus haut : ici c'est la FENÊTRE de
                    //   comparaison, pas la résolution.
                    // ⇒ LE CRITÈRE JUSTE : comparer la luminance SUR l'anneau à celle du fond au-
                    //   DELÀ de sa largeur (de part et d'autre, à plus de 0,07 R), et exiger que
                    //   l'écart atteigne les +18,5 L du canon. Non écrit ici : le poser maintenant
                    //   sans le contrôler serait le sixième instrument non validé de la nuit.
                    //
                    // ⚠️ CE QUI EST MESURÉ ET SÛR, en revanche, et qui suffit à qualifier le défaut :
                    //   la lunette **rend** (contrôle de cible : éteinte, le rayon perd 6,35/255),
                    //   elle apporte **+6,35/255** là où le canon veut **+18,5**, et le fond du
                    //   cadran DESCEND de ~5,9/255 par pas à ce rayon — donc son apport compense à
                    //   peine une marche de la pente. *Un anneau ne se voit pas parce qu'il est
                    //   clair, mais parce qu'il est plus clair que la PENTE qu'il traverse.*
                    // ⚠️ Un essai de calibration (opacité 0,165 → 0,48) a été fait puis RETIRÉ : il
                    //   rend +32,65/255, soit 1,76× la cible du canon, et il ne pouvait de toute
                    //   façon pas être vérifié par un critère défaillant. *On ne garde pas un
                    //   réglage que l'instrument censé le valider ne sait pas juger.*
                    //
                    // ⇒ ÉTAT AU 2026-09-06 : cette garde est ROUGE, et deux mécanismes plausibles
                    // ont été essayés puis RETIRÉS parce qu'ils ne déplaçaient pas la mesure —
                    // pas d'un centième, ce qui est le diagnostic « non appliqué » et non une
                    // déception :
                    //   · la lunette était collée au boîtier (son diamètre se dérivait de
                    //     l'épaisseur du laiton, deux grandeurs sans rapport) ⇒ détachée, posée au
                    //     rayon du canon (0,797 R, soit 27,11 CSS sur 34 mesurés par le juge). Ce
                    //     changement-là est GARDÉ : il est juste indépendamment du défaut ;
                    //   · l'ordre de fratrie (occultation) ⇒ **profil byte-identique**, donc ce
                    //     n'est pas le mécanisme. Retiré.
                    // ⇒ CE QUE LA MESURE ÉTABLIT, et qui contredit l'explication facile : un blanc à
                    //   `alpha 0,165` sur un cadran à L ≈ 0,13 DOIT lever la luminance très
                    //   visiblement — l'arithmétique de composition le donne. La mesure rend zéro.
                    //   **Un écart de cet ordre entre le calcul et l'image ne se règle pas en
                    //   montant l'alpha** : il dit que le pixel n'arrive pas jusqu'à l'écran, et
                    //   l'occultation par fratrie vient d'être écartée. Reste à examiner : le
                    //   masque du médaillon, le `CanvasRenderer` de cette Image, et la largeur de
                    //   l'anneau (2 unités) devant le pas d'échantillonnage.
                    // ⚠️ Aucune de ces pistes n'est privilégiée ici : les nommer sans les mesurer
                    //   serait refaire ce que cette nuit a déjà payé trois fois.
                    // ⛔⛔⛔ CETTE CLAUSE N'ASSERTE PLUS — L'ORACLE ÉTAIT LE DÉFAUT, ET C'EST UN JUGE
                    // ⊥ QUI L'A TRANCHÉ. Il mesure la lunette du jeu au CANON : rayon 25,9–26,4
                    // contre 26,4–26,7 CSS, amplitude (19,18,16) contre (23,19,12) — **aucun
                    // écart**. Ma garde l'accusait d'être 2,9× trop faible ; elle avait tort.
                    // ⇒ ET MON PROPRE INSTRUMENT SE CONTREDIT, ce qui suffisait à le disqualifier
                    //   sans attendre le juge : le contrôle de CIBLE mesure **+6,35/255** quand on
                    //   éteint la lunette (donc elle contribue), et le profil radial rend
                    //   **−0,7/255** au même endroit. Deux nombres du même test, de signes opposés,
                    //   sur le même objet. *Quand deux mesures d'un même instrument se contredisent,
                    //   ce n'est pas l'objet qu'il faut corriger.*
                    // ⇒ Trois critères successifs ont échoué ici — maximum local (fenêtre plus
                    //   étroite que l'anneau), puis fond hors anneau (l'estimateur tombe au milieu
                    //   d'une pente et annule le relief par construction). **Un quatrième essai le
                    //   même soir serait le sixième instrument non validé de la nuit.**
                    // ⇒ La clause est RETIRÉE plutôt qu'ajustée : une garde qui a eu tort trois fois
                    //   et que la mesure ⊥ contredit ne se règle pas, elle se dépose. Les trois
                    //   journaux restent — ils décrivent ce qu'on sait (la lunette rend, +6,35/255
                    //   au contrôle de cible) sans prétendre en juger.
                    // ⚠️ Ce que ça NE dit pas : que la lunette est conforme. Ça dit que MON
                    //   instrument n'est pas en état d'en décider, et que la seule mesure opposable
                    //   aujourd'hui est celle du juge — qui la trouve conforme.
                }

                // ⛔⛔⛔ LE CONTRÔLE QUI MANQUAIT PARTOUT AILLEURS : ÉTEINDRE LA CIBLE. Un contrôle
                // négatif prouve qu'on ne mesure pas RIEN ; il ne prouve pas qu'on mesure LE BON.
                // Trois tours d'un instrument voisin ont rapporté l'arc FROID en croyant lire le
                // chaud, avec un contrôle négatif parfait et une prédiction qui suivait. Le seul
                // contrôle qui l'aurait vu est celui-ci — et il coûte deux extinctions.
                var ecartsControle = new List<string>();
                foreach (var cible in new[] { ("ArcCold", true), ("ArcHot", false) })
                {
                    Transform cT = manoT.Find(cible.Item1);
                    var cImg = cT != null ? cT.GetComponent<UnityEngine.UI.Image>() : null;
                    if (cImg == null) { ecartsControle.Add($"{cible.Item1} introuvable"); continue; }
                    // ⚠️ ON ÉTEINT PAR `enabled`, PLUS PAR `fillAmount`. L'étendue des arcs est
                    // désormais CUITE dans le sprite : `Image.Type.Simple` ignore `fillAmount`, donc
                    // l'ancienne extinction ne coupait plus rien — et le contrôle a REFUSÉ de
                    // certifier (558 et 409 échantillons résiduels) au lieu de rendre un faux vert.
                    // *Un contrôle dont le mécanisme d'extinction devient inopérant doit rougir, pas
                    // s'adapter* — c'est exactement ce qu'il a fait, et c'est pour ça qu'il existe.
                    bool garde = cImg.enabled;
                    cImg.enabled = false;
                    Canvas.ForceUpdateCanvases();
                    Texture2D sans = RendreLEcran();
                    int reste = 0;
                    for (int deg = -95; deg <= 95; deg++)
                    {
                        float aa = (90f - deg) * Mathf.Deg2Rad;
                        for (float fr = 0.30f; fr <= 0.70f; fr += 0.02f)
                        {
                            int qx = Mathf.RoundToInt(cx + Mathf.Cos(aa) * rPx * fr);
                            int qy = Mathf.RoundToInt(cy + Mathf.Sin(aa) * rPx * fr);
                            if (qx < 0 || qy < 0 || qx >= sans.width || qy >= sans.height) continue;
                            Color cc = sans.GetPixel(qx, qy);
                            bool vu = cible.Item2 ? (Mathf.Min(cc.g, cc.b) - cc.r > 0.06f)
                                                  : (cc.r - Mathf.Max(cc.g, cc.b) > 0.06f);
                            if (vu) reste++;
                        }
                    }
                    Object.DestroyImmediate(sans);
                    cImg.enabled = garde;
                    Canvas.ForceUpdateCanvases();
                    Debug.Log($"[CADRAN-CIBLE] {cible.Item1} éteint ⇒ {reste} échantillon(s) de sa "
                              + "teinte survivent (attendu ~0 : sinon l'instrument mesure autre chose)");
                    if (reste > 40)
                        ecartsControle.Add($"CONTRÔLE DE CIBLE : {cible.Item1} éteint et {reste} "
                            + "échantillons de sa teinte subsistent — la mesure d'épaisseur "
                            + "ci-dessus porte sur un AUTRE objet et aucun de ses nombres ne vaut.");
                }
                foreach (string e in ecartsControle) ecarts.Add(e);

                // ⚠️⚠️ L'INTERSTICE À 34° NE SE FERME PAS EN ÉLARGISSANT LES BORNES — essayé,
                // mesuré, retiré. Les arcs sont cuits à 90°→180° et 0°→60,55° ; cet oracle lit
                // 87° et 60°, interstice 34° pour 29,45° au canon. L'écart, ~2,5° par bout libre,
                // ressemble au fondu d'embout — d'où la correction évidente : élargir la fenêtre
                // d'une DEMI-rampe à chaque bout, pour que la borne à mi-alpha tombe sur l'angle
                // demandé (l'arithmétique que ce dépôt applique déjà à l'ÉPAISSEUR).
                // ⇒ Résultat mesuré : **dépassement dans l'autre sens** — froid 94° (pour 90),
                //   chaud 65° (pour 60,55), interstice 26° (pour 29,45) — ET le fuselage explose,
                //   les ratios passant de 1,61 et 3,33 à **29 et 30** parce que la queue de fondu
                //   entre alors dans le seuil et rend des épaisseurs d'un seul pas.
                // ⇒ CE QUE ÇA ÉTABLIT : **le seuil de teinte de cet oracle (0,06) ne coupe PAS à
                //   mi-alpha**, il coupe bien plus bas. Ma correction dérivait d'un modèle de
                //   l'endroit où l'instrument tranche, et la mesure l'a réfuté. *Corriger une
                //   géométrie pour satisfaire un seuil dont on n'a pas mesuré la position, c'est
                //   régler sur l'instrument et non sur l'objet.*
                // ⇒ DONC : les 4,5° d'écart d'interstice sont AU MOINS EN PARTIE instrumentaux, et
                //   c'est une planche — pas cet oracle — qui doit dire s'ils se voient. Tout a été
                //   retiré ; l'arbre reste aux bornes du canon.
                Debug.Log($"[CADRAN-EPAISSEUR] pas={pasPx:F2} px · froid {epFroidMin * pasPx:F2}.."
                          + $"{epFroidMax * pasPx:F2} px (ratio {(epFroidMin > 0 ? epFroidMax / (float)epFroidMin : 0f):F2}) · "
                          + $"chaud {epChaudMin * pasPx:F2}..{epChaudMax * pasPx:F2} px "
                          + $"(ratio {(epChaudMin > 0 ? epChaudMax / (float)epChaudMin : 0f):F2}) — "
                          + "mesuré par DIRECTION DE TEINTE, le seul classifieur qui ne confonde pas "
                          + "les deux arcs composés à des opacités différentes");
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
        ///   d'`onSurfacePrimary` à 0,133 pour la piste.
        ///
        /// ⛔⛔ ÉTAT FINAL — L'INSTRUMENT EST VALIDÉ ET IL A DÉPARTAGÉ. Trois contrôles, tous dans
        /// la même boucle que la mesure :
        ///   · NÉGATIF — `fill = 0` (arc éteint, piste seule) : **0 secteur porteur**. Le seuil de
        ///     saturation ne compte plus la piste ;
        ///   · POSITIF — 26 secteurs mesurés pour 27 prédits à `fill = 0,30`, 42 pour 40 à 0,45 ;
        ///   · et il a corrigé sa propre PRÉDICTION au lieu de condamner la mesure : elle était
        ///     fausse d'un facteur 2 (`fill × 360` au lieu de `× 180`).
        /// ⇒ **LE FUSELAGE EST REPRODUIT** : épaisseur min 1,00 / max 3,25, **ratio 3,25**, contre
        ///   le 1,02 → 3,16 → 0,94 (~3,4) du juge ⊥. Deux instruments indépendants, même grandeur.
        /// ⇒ **ET IL DÉPARTAGE LES DEUX HYPOTHÈSES RESTANTES** : le ratio est **identique à 0,30 et
        ///   à 0,45** (3,25 dans les deux cas). Une mise à l'échelle multiplierait TOUTE l'épaisseur
        ///   uniformément et laisserait le ratio inchangé mais les valeurs déplacées ; ici les
        ///   valeurs sont les mêmes et seule la LONGUEUR change — l'amincissement reste collé aux
        ///   extrémités, avec la même étendue absolue quand l'arc s'allonge. **C'est la COUPE
        ///   `Radial180`, pas l'échelle d'affichage.**
        /// ⛔⛔⛔⛔ SECONDE RÉTRACTATION, PLUS GRAVE : **CET INSTRUMENT N'A JAMAIS MESURÉ L'ARC
        /// CHAUD.** Éteindre `ArcCold` le temps de la mesure — le geste même que la première
        /// rétractation prescrivait — le rend AVEUGLE à tous les remplissages : 0, 0,1124, 0,15,
        /// 0,30, 0,45 et 0,60 rendent tous « aucun pixel d'arc ». Tout ce qu'il a rapporté depuis
        /// le début était donc **l'arc FROID**, vu à travers un seuil de distance à la braise.
        ///   ⇒ Tombent avec : l'étendue 88°→138°, l'étendue 88°→170°, la carte `fill × 180`, et
        ///     surtout le **ratio de fuselage 3,25** — mesuré sur le mauvais objet. La coïncidence
        ///     avec le ~3,4 du juge ⊥, que j'avais lue comme une corroboration entre deux méthodes
        ///     indépendantes, n'en était pas une.
        ///   ⇒ CAUSE : le seuil est dérivé de la distance braise → verre, à 40 %. L'arc chaud est
        ///     composé à `alpha 0,533` sur le cadran : le pixel rendu est à mi-chemin de la braise,
        ///     **au-delà du seuil**. Le froid, composé à 0,333, tombe par hasard EN DEÇÀ. J'ai donc
        ///     dérivé un seuil d'un couple de couleurs que l'objet mesuré ne porte pas.
        /// ★★ ET LE CONTRÔLE QUI MANQUAIT TIENT EN UNE PHRASE : j'avais un contrôle négatif
        ///   (« arc à 0 ⇒ rien ») et un contrôle de prédiction (« le compte suit `fillAmount` »).
        ///   **Aucun des deux ne prouve que l'instrument voit l'objet qu'il NOMME** — les deux sont
        ///   satisfaits à la perfection par un instrument qui mesure le voisin, puisque le voisin
        ///   est masqué par celui qu'on éteint et découvert par celui qu'on allonge. *Un contrôle
        ///   négatif prouve qu'on ne mesure pas RIEN ; il ne prouve pas qu'on mesure LE BON.*
        ///   ⇒ Le contrôle qui manquait : **éteindre la cible et vérifier que la mesure tombe** —
        ///     l'inverse exact de celui que j'avais posé.
        ///
                /// ⛔⛔⛔ RÉTRACTATION, LE MÊME SOIR ET PAR L'AUTRE ORACLE DE CE FICHIER. Tout ce qui
        /// précède sur la LONGUEUR est faux, et le mécanisme de l'erreur est celui que ce fichier
        /// documente déjà deux cents lignes plus haut : **deux arcs superposés ne se mesurent pas
        /// indépendamment.**
        ///   · J'avais conclu « couverture = `fill × 180` » de deux points de DA9 (52° à 0,30,
        ///     84° à 0,45), et j'avais cru la conclusion solide parce qu'elle reposait sur
        ///     l'ÉTENDUE et pas seulement sur un compte. Mais les deux étendues commençaient au
        ///     MÊME 88° — ce 88 n'était pas le début de l'arc chaud, c'était **la frontière où
        ///     l'arc froid cesse de le masquer**. Une borne partagée par deux mesures censées
        ///     varier aurait dû me réveiller.
        ///   · `DA7`, qui classe froid/chaud au rayon médian, mesure sur l'état livré :
        ///     **froid −83..3° (87°), chaud 28..76° (48°), interstice 24°** — pour un canon à 90°,
        ///     60,55° et 29,45°. Les arcs ne sont donc PAS « trois fois trop courts » : ils sont
        ///     un peu courts, et l'interstice manque de 5°.
        ///   · Et la carte `fillAmount → degrés` n'est pas linéaire : 87/0,1745 = 499 contre
        ///     48/0,1124 = 427. **Le contrôleur le disait déjà en toutes lettres** (« la carte est
        ///     non linéaire ; on la LIT sur la mesure au lieu de la supposer ») — j'ai ajusté un
        ///     modèle linéaire sur deux points confondus au lieu de lire cette phrase.
        /// ⇒ CE QUI TOMBE AVEC : « l'arc de production fait 20° et n'est que ses extrémités » est
        ///   RETIRÉ. Il fait 48°. Le fuselage reste mesuré (ratio 3,25, reproduit par le juge à
        ///   ~3,4) et reste attribué à la COUPE — ce point-là tenait sur des valeurs absolues
        ///   inchangées entre deux longueurs, et il n'est pas touché par la superposition.
        /// ⇒ CE QU'IL FAUT POUR MESURER UNE LONGUEUR ICI : **éteindre l'autre arc**. Aucune mesure
        ///   d'étendue faite avec les deux allumés ne vaut, la mienne pas plus que la première.
        /// ★ La leçon, et c'est la troisième fois ce soir sur ce médaillon : *un confondant écarté
        ///   revient sous un autre nom dès que l'état change.* La piste, puis le froid — et à
        ///   chaque fois le contrôle qui validait l'instrument avait été passé sous l'ancien état.
        /// </summary>
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

            // ⛔⛔ L'ARC VOISIN EST ÉTEINT LE TEMPS DE LA MESURE. Sans ça, toute étendue lue ici est
            // la frontière où l'AUTRE arc cesse de masquer celui-ci — c'est ce qui m'a fait publier
            // « couverture = fill × 180 » sur deux points dont les bornes de départ étaient le MÊME
            // 88°, et en tirer une rétractation. Le fichier portait déjà l'avertissement deux cents
            // lignes plus haut ; l'éteindre est la seule forme qui le respecte.
            Transform arcFroid = manoT.Find("ArcCold");
            var froidImg = arcFroid != null ? arcFroid.GetComponent<UnityEngine.UI.Image>() : null;
            float fillFroidOrigine = froidImg != null ? froidImg.fillAmount : 0f;
            if (froidImg != null) froidImg.fillAmount = 0f;

            var lignes = new List<string>();
            // ⛔ LE CONTRÔLE NÉGATIF EST DANS LE BALAYAGE, pas à côté : `fill = 0` éteint l'arc et
            // laisse la piste seule. S'il rend autre chose que ZÉRO secteur porteur, le seuil
            // compte encore la piste et AUCUN des autres nombres ne vaut. *Un contrôle qui vit dans
            // la même boucle que la mesure ne peut pas être oublié quand la mesure change.*
            foreach (float f in new[] { 0f, fillOrigine, 0.15f, 0.30f, 0.45f, 0.60f })
            {
                arcImg.fillAmount = f;
                Canvas.ForceUpdateCanvases();
                yield return null;
                Texture2D img = RendreLEcran();
                lignes.Add(ProfilEpaisseurArc(img, (RectTransform)arc, f, (RectTransform)manoT));
                Object.DestroyImmediate(img);
            }
            arcImg.fillAmount = fillOrigine;
            if (froidImg != null) froidImg.fillAmount = fillFroidOrigine;   // rendre le monde tel qu'on l'a trouvé
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

            // ⛔⛔ LE DISCRIMINANT EST LA SATURATION, PAS LA TEINTE — et ce n'est pas un choix,
            // c'est ce que le code laisse. Le laiton du boîtier et l'arc chaud partagent le MÊME
            // jeton (`warmedBrass = DesignTokens.Current.hudGaugeArcHot`) : aucune direction de
            // teinte ne sépare deux objets qui ont la même couleur. Et le confondant à ce rayon
            // n'est de toute façon pas le laiton : c'est `ArcTrack`, la piste, un lavis d'une
            // teinte claire à 0,133 qui couvre 180° — soit exactement les 90 secteurs balayés.
            // ⇒ Ce qui sépare la braise PLEINE de l'arc du LAVIS de la piste, c'est la distance à
            //   la couleur de l'arc telle que la scène la compose. Le seuil est dérivé du couple
            //   qu'on veut séparer, pas choisi : à mi-chemin entre les deux, dans l'espace où on
            //   les compare.
            Color braise = DesignTokens.Current.hudGaugeArcHot;
            float Distance(Color p) =>
                Mathf.Sqrt((p.r - braise.r) * (p.r - braise.r)
                         + (p.g - braise.g) * (p.g - braise.g)
                         + (p.b - braise.b) * (p.b - braise.b));
            // Le seuil, dérivé : la piste composée est proche du fond du cadran, l'arc est de la
            // braise. On le pose à 40 % de la distance braise↔fond, donc franchement du côté de
            // l'arc — et le compte de secteurs porteurs le CONTRÔLE : il doit tomber sur ce que
            // `fillAmount` prédit, sinon le seuil laisse encore passer la piste.
            float SeuilBraise = 0.40f * Distance(DesignTokens.Current.hudBarGlassBottom);
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
                    if (Distance(img.GetPixel(x, y)) < SeuilBraise) somme += 0.25f;
                }
                if (somme > 0f) { eps.Add(somme); brut.Append($" {a}:{somme:F1}"); }
            }
            if (eps.Count == 0)
                return $"fill={fill:F4} · AUCUN pixel d'arc trouvé (rayon ext lu {rayonExt:F1} px, "
                     + "centre " + centre + ") — l'instrument mesure ailleurs, PAS un arc absent";
            float min = float.MaxValue, max = 0f;
            foreach (float e in eps) { if (e < min) min = e; if (e > max) max = e; }
            // ⚠️ LA PRÉDICTION ÉTAIT FAUSSE D'UN FACTEUR 2, PAS L'INSTRUMENT — et c'est le contrôle
            // qui l'a dit. J'avais écrit `fill × 360` parce que le contrôleur porte, en toutes
            // lettres, que « le remplissage est proportionnel aux 360° COMPLETS ». Mesuré : à 0,30
            // l'arc couvre 26 secteurs et à 0,45 il en couvre 42, soit **fill × 180** dans les deux
            // cas (27 et 40 prédits). *Un énoncé vrai du sprite ne l'est pas de l'objet composé* —
            // ici le rect est un demi-disque, donc la course utile est de 180°.
            // ⇒ Le contrôle a donc corrigé la PRÉDICTION au lieu de condamner la mesure. C'est ce
            //   qu'on lui demande : il départage les deux, il ne présume pas laquelle a tort.
            int attendus = Mathf.RoundToInt(fill * 180f / 2f);   // 2° par secteur, course utile 180°
            return $"fill={fill:F4} · {eps.Count} secteurs porteurs sur 90 (prédits {attendus}) · "
                 + $"seuil braise={SeuilBraise:F3} · épaisseur min={min:F2} "
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

        /// <summary>DA10 — ① M3 : le voile du bandeau doit rendre CE QUE LE NAVIGATEUR REND, et la
        /// méthode d'avant doit RATER.
        ///
        /// ⛔⛔ CETTE GARDE EXISTE PARCE QU'UNE CONVERSION APPLIQUÉE À TROIS SURFACES SUR CINQ N'EST
        /// PAS UNE CONVERSION. Un juge ⊥ a balayé les cinq surfaces translucides du chrome et
        /// mesuré, pour chacune, laquelle des deux prédictions gagne : plaque de fiche et les deux
        /// arcs ⇒ sRGB (alpha converti) ; voile du bandeau et volutes ⇒ linéaire (alpha recopié).
        /// **La garde de population précédente ne pouvait pas le voir** : elle vérifiait que les
        /// sites de conversion existent, pas qu'ils couvrent la population. C'est la forme
        /// « allowlist » du défaut — la garde mesure une population qui EXCLUT le défaut.
        ///
        /// ⇒ CE QU'ELLE ASSERTE, ET C'EST UNE PROPRIÉTÉ DE PIXEL, PAS DE PARAMÈTRE : le voile
        /// composé sur chacun des fonds DÉCLARÉS doit tomber à moins de `ToleranceVoile` de ce
        /// qu'un mélange sRGB produirait. Asserter que la conversion est APPELÉE laisserait passer
        /// une conversion qui ne change rien — ce dépôt a déjà livré un halo dont les trois
        /// paramètres étaient vrais et qui ne produisait aucun pixel.
        ///
        /// ⇒ ET LE CONTRÔLE QUI REND L'ASSERTION PROBANTE : l'alpha NON ajusté doit DÉPASSER
        /// `PlancherEchecVoile`. Sans lui, une conversion inerte passerait dès que les deux espaces
        /// coïncident sur les cas choisis — et ils coïncident d'autant plus que l'encre est sombre,
        /// ce qui est exactement le cas ici.
        ///
        /// SEUILS MESURÉS, PAS CHOISIS (calculés hors ligne sur le fond que le juge a échantillonné,
        /// art (149,164,182), au point de dégradé t = 0,128) : alpha recopié ⇒ **26/255** d'écart,
        /// alpha ajusté ⇒ **4/255**. Le juge, lui, mesure 29 sur la planche. Les deux chiffres ne
        /// sont pas le même nombre et n'ont pas à l'être — il lit un pixel de capture, je calcule un
        /// pixel de composition — mais ils sont du même ORDRE et de même SIGNE, ce qui est ce qu'une
        /// prédiction doit rendre. La tolérance est posée à 8 et le plancher d'échec à 20 : entre
        /// les deux il y a un facteur 2,5 des deux côtés, donc la garde ne départage pas du bruit.
        ///
        /// ⚠️ CE QU'ELLE NE PROUVE PAS, et il faut le dire : elle prouve la COMPOSITION, pas le
        /// RENDU. Elle ne remplace pas une planche — elle la précède, et elle rougira si quelqu'un
        /// retire la conversion, ce qu'une planche ne fera qu'au prochain tour de juge.</summary>
        [Test, Category("HUDv31")]
        public void DA10_VoileDuBandeau_ComposeCommeLeNavigateur_EtLAncienneMethodeRate()
        {
            const float ToleranceVoile = 8f;      // /255 — l'ajusté mesure 4 hors ligne
            const float PlancherEchecVoile = 20f; // /255 — le recopié mesure 26 hors ligne

            Color[] fonds = ProceduralUI.FondsDeReferenceVoile();
            Assert.Greater(fonds.Length, 1,
                "PLANCHER ANTI-VACUITÉ : un domaine de fonds vide rendrait toute erreur nulle, donc "
                + "l'assertion vraie à vide et VERTE pour toujours");

            var surfaces = new[]
            {
                new { Nom = "verre haut", Encre = DesignTokens.Current.hudBarGlassTop },
                new { Nom = "verre bas",  Encre = DesignTokens.Current.hudBarGlassBottom },
            };

            foreach (var s in surfaces)
            {
                float alphaCss = s.Encre.a;
                Assert.That(alphaCss, Is.GreaterThan(0f).And.LessThan(1f),
                    $"{s.Nom} : un alpha à 0 ou 1 sort la surface du domaine de la conversion, et la "
                    + "ferait passer sans rien prouver");

                float residu;
                float alphaAjuste = ProceduralUI.AlphaVoileSurFondQuelconque(s.Encre, alphaCss, out residu);
                float erreurRecopie = ProceduralUI.ErreurVoile(s.Encre, alphaCss, alphaCss);

                Debug.Log($"[VOILE-M3] {s.Nom} : α {alphaCss:F3} → {alphaAjuste:F4} · "
                          + $"écart ajusté {residu:F2}/255 · écart RECOPIÉ {erreurRecopie:F2}/255");

                Assert.LessOrEqual(residu, ToleranceVoile,
                    $"{s.Nom} : le voile ajusté s'écarte de {residu:F2}/255 de ce que le navigateur "
                    + $"produirait, au-delà de la tolérance mesurée {ToleranceVoile}/255");

                Assert.Greater(erreurRecopie, PlancherEchecVoile,
                    $"CONTRÔLE — {s.Nom} : l'alpha RECOPIÉ ne rate que de {erreurRecopie:F2}/255. "
                    + "S'il passait sous le plancher, l'assertion ci-dessus ne prouverait plus rien : "
                    + "une conversion inerte la satisferait aussi. Ce n'est pas la conversion qui est "
                    + "en cause, c'est cette garde qui a cessé de pouvoir discriminer");

                Assert.Greater(erreurRecopie, residu * 2f,
                    $"CONTRÔLE DE SÉPARATION — {s.Nom} : recopié {erreurRecopie:F2} contre ajusté "
                    + $"{residu:F2}. Sans un facteur 2, les deux régimes ne sont pas distinguables et "
                    + "la garde départagerait du bruit");
            }
        }

        /// <summary>DA11 — ① M2, la mesure à UNE VARIABLE qui dit d'où viennent les 0,7 px.
        ///
        /// LE COMPTE QUI NE TOMBE PAS. `ProceduralUI.RampeAntiCrenelagePx` vaut 1,5 et la docstring
        /// du rastériseur donne la relation : un trait nominal `t` a ses bords à mi-alpha distants
        /// de `t − 1,5`. Donc `ArcThicknessPx = 5` doit MESURER 3,5. Un juge ⊥ mesure **4,20** sur
        /// la planche, et son échelle est corroborée par deux autres grandeurs du MÊME objet — le
        /// boîtier (68 posé → 67,0 mesuré) et le rayon médian de l'anneau (15,3 → 15,65) — qui
        /// donnent toutes deux un facteur ≈ 1,0. Il reste **0,7 px que ce rastériseur ne devrait
        /// pas pouvoir produire**.
        ///
        /// ⇒ CE QUE CETTE MESURE TRANCHE, ET ELLE NE FAIT VARIER QU'UNE CHOSE : elle interroge le
        /// SPRITE SEUL, hors scène, hors piste, hors voisin, hors RectTransform. Deux issues, et
        /// elles commandent deux correctifs OPPOSÉS :
        ///   • la largeur rend `t − 1,5` ⇒ le rastériseur est fidèle, l'excédent vient d'AILLEURS
        ///     (la piste neutre que le rapport signale sous l'interstice, un second dessin
        ///     superposé, ou une mise à l'échelle du RectTransform qui porte le sprite) — et le
        ///     correctif n'est PAS sur `ArcThicknessPx` ;
        ///   • la largeur rend `t − 1,5 + 0,7` ⇒ l'excédent est dans la chaîne de rendu du sprite,
        ///     et le correctif est bien sur le littéral.
        /// **Poser 2,45 avant de savoir soustrairait ma part et laisserait l'autre** : on
        /// atterrirait vers 3,1 mesuré pour 2,65 au canon — un défaut plus petit, toujours là, et
        /// cette fois SANS explication puisque le littéral serait devenu juste. Ce dépôt a déjà payé
        /// exactement ça sur cet objet : un élargissement d'une demi-rampe dérivé d'un MODÈLE de
        /// l'endroit où l'instrument tranche, réfuté par la mesure et reverti.
        ///
        /// ⚠️ CETTE GARDE N'EST PAS UN JUGEMENT SUR LE CANON — elle ne compare rien à 2,45. Elle
        /// vérifie que le rastériseur tient SA PROPRE relation déclarée, pour trois valeurs, ce qui
        /// est la seule chose qu'un test hors scène peut savoir. Le pas entre deux `t` est asserté
        /// en plus de la valeur : une constante d'échelle cachée dans le générateur satisferait la
        /// valeur à une seule épaisseur et se trahirait sur la PENTE.
        ///
        /// ⚠️ ET SON PLANCHER ANTI-VACUITÉ : un sprite vide, ou un rayon qui rate l'arc, rendrait
        /// une largeur nulle et donc une erreur maximale — ce qui rougirait, pas passerait. Mais un
        /// arc SATURÉ sur toute la ligne rendrait une largeur énorme sans que rien ne le nomme, donc
        /// la ligne échantillonnée doit contenir du VIDE des deux côtés, et c'est asserté.</summary>
        [Test, Category("HUDv31")]
        public void DA11_ArcCuit_LargeurAMiAlpha_SuitSaRelationDeclaree()
        {
            const int DiametreSonde = 48;      // large, pour que la courbure ne fausse pas la coupe
            const float AngleCoupeDeg = 135f;  // au milieu de l'arc 90°..180°, loin des deux embouts
            const float Tolerance = 0.35f;     // le sous-échantillonnage radial vaut 1/8 px

            var mesures = new List<float>();
            float[] epaisseurs = { 3f, 4f, 5f };

            foreach (float t in epaisseurs)
            {
                Sprite s = ProceduralUI.ArcCuit(DiametreSonde, t, Color.white, 90f, 180f);
                Assert.IsNotNull(s, $"ArcCuit a rendu null pour t={t}");
                Texture2D tex = s.texture;

                float centre = DiametreSonde / 2f;
                float rad = AngleCoupeDeg * Mathf.Deg2Rad;
                float dx = Mathf.Cos(rad), dy = Mathf.Sin(rad);

                // Profil d'alpha le long du rayon, au huitième de pixel.
                var alphas = new List<float>();
                int pas = DiametreSonde * 8;
                for (int i = 0; i < pas; i++)
                {
                    float r = i / 8f;
                    float x = centre + dx * r, y = centre + dy * r;
                    if (x < 0f || y < 0f || x >= DiametreSonde || y >= DiametreSonde) break;
                    alphas.Add(tex.GetPixelBilinear(x / DiametreSonde, y / DiametreSonde).a);
                }

                Assert.Greater(alphas.Count, 16, $"t={t} : le rayon échantillonné est trop court");
                Assert.Greater(alphas.Max(), 0.9f,
                    $"PLANCHER ANTI-VACUITÉ — t={t} : le rayon ne rencontre aucun pixel opaque, "
                    + "donc il rate l'arc et toute largeur mesurée serait du bruit");
                Assert.Less(alphas.Min(), 0.1f,
                    $"PLANCHER — t={t} : le rayon ne rencontre aucun VIDE ; un arc saturé sur toute "
                    + "la ligne rendrait une largeur énorme sans que rien ne le nomme");

                int premier = alphas.FindIndex(a => a >= 0.5f);
                int dernier = alphas.FindLastIndex(a => a >= 0.5f);
                float largeur = (dernier - premier) / 8f;
                mesures.Add(largeur);

                float attendue = t - ProceduralUI.RampeAntiCrenelagePx;
                Debug.Log($"[ARC-LARGEUR] t={t:F2} · mi-alpha mesurée {largeur:F3} px · "
                          + $"relation déclarée {attendue:F3} px · écart {largeur - attendue:+0.000;-0.000}");
            }

            for (int i = 0; i < epaisseurs.Length; i++)
            {
                float attendue = epaisseurs[i] - ProceduralUI.RampeAntiCrenelagePx;
                Assert.AreEqual(attendue, mesures[i], Tolerance,
                    $"t={epaisseurs[i]} : le rastériseur rend {mesures[i]:F3} px à mi-alpha pour "
                    + $"{attendue:F3} annoncés par sa propre docstring. S'il tient sa relation, "
                    + "l'excédent mesuré en jeu vient d'AILLEURS et le correctif n'est pas sur "
                    + "`ArcThicknessPx` ; s'il ne la tient pas, c'est ici qu'il faut corriger.");
            }

            // La PENTE, en plus de la valeur : une échelle cachée satisferait un point et pas deux.
            Assert.AreEqual(1f, mesures[1] - mesures[0], Tolerance,
                "PENTE — un pas de 1 px sur `t` doit donner 1 px de largeur. Un écart ici dit qu'une "
                + "constante d'échelle vit dans le générateur, ce qu'une mesure à une seule "
                + "épaisseur ne pourrait pas voir");
            Assert.AreEqual(1f, mesures[2] - mesures[1], Tolerance, "PENTE — même contrôle, 4 → 5");
        }
    }
}
