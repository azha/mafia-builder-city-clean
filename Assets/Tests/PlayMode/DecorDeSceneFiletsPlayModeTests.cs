using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Tests.PlayMode
{
    /// <summary>D6 — la couche L5 « filets et bords d'état » (`Tools/decor-de-scene-2026-10-07/DESIGN.md`, §3.4) :
    /// (a) DONNÉES : les recettes générées de chaque écran (`DecorsDeScene.Filets.&lt;Ecran&gt;`) sont exactement les recettes
    ///     distinctes de `mesure-filets.json` sur TOUS ses cadres (nominaux et d'état) ; contrôle positif ;
    /// (c) COMPORTEMENT : `Filets.Poser` sur un rect de test — pixel de bord = couleur déclarée ET ≠ fond (le défaut mesuré
    ///     par le juge : « bord = fond »), épaisseur = `PxTrait` ± 1 px, pointillé : transitions &gt; 0 et remplissage 50 % ± 10 %
    ///     pour `#c3b79e` (㉚, mesure du juge), `Etat` refuse un bord égal au fond.
    /// (b) — tout contrôleur `Posé` référence chaque recette de son écran — vient avec la pose écran par écran (étape 4).
    /// ⚠️ Aucun littéral de couleur : les attendus se lisent dans les recettes générées.</summary>
    [Category("DecorDeScene")]
    public class DecorDeSceneFiletsPlayModeTests
    {
        // ════════════════════════════════════════════════════════════════════════════ (a) données

        [Serializable] private class Cote { public string c; public float w; public string st; public string col; }
        [Serializable] private class El { public string cls; public Cote[] cotes; public string rayon; }
        [Serializable] private class Cadre { public int i; public int n; public El[] el; }
        [Serializable] private class Mesure { public Cadre[] r; }

        private static readonly Dictionary<StyleFilet, string> StyleCss = new Dictionary<StyleFilet, string>
        {
            { StyleFilet.Plein, "solid" }, { StyleFilet.Pointille, "dotted" }, { StyleFilet.Tirete, "dashed" }, { StyleFilet.Double, "double" },
        };

        private static string F(float v) => v.ToString("0.####", CultureInfo.InvariantCulture);

        private static string Lettres(Cotes c)
        {
            string s = "";
            if ((c & Cotes.Haut) != 0) s += "T";
            if ((c & Cotes.Droite) != 0) s += "R";
            if ((c & Cotes.Bas) != 0) s += "B";
            if ((c & Cotes.Gauche) != 0) s += "L";
            return s;
        }

        /// <summary>La clé d'une recette MESURÉE : groupes (côtés, épaisseur, style, couleur) triés + rayon.</summary>
        internal static string CleMesuree(IEnumerable<(string c, float w, string st, string col)> cotes, string rayon)
        {
            var groupes = cotes.GroupBy(x => (x.w, x.st, x.col))
                .Select(g => $"{string.Concat(g.Select(x => x.c).OrderBy(c => "TRBL".IndexOf(c, StringComparison.Ordinal)))}/{F(g.Key.w)}/{g.Key.st}/{g.Key.col}")
                .OrderBy(s => s, StringComparer.Ordinal);
            return string.Join("+", groupes) + "|" + rayon;
        }

        /// <summary>La clé d'une recette GÉNÉRÉE, reconstruite depuis ses `SpecFilet` (jamais depuis le texte du fichier).</summary>
        internal static string CleGeneree(SpecFilet[] recette)
        {
            var cotes = new List<(string, float, string, string)>();
            foreach (SpecFilet f in recette)
                foreach (char c in Lettres(f.Cotes)) cotes.Add((c.ToString(), f.EpaisseurCss, StyleCss[f.Style], "#" + f.CouleurCss));   // stockée sans « # » (TD-612)
            SpecFilet p = recette[0];
            string rayon = p.RayonPct > 0f ? F(p.RayonPct * 100f) + "%" : F(p.Rayon) + "px";
            return CleMesuree(cotes, rayon);
        }

        internal static List<string> Ecarts(IEnumerable<string> mesurees, IEnumerable<string> generees)
        {
            var m = new HashSet<string>(mesurees); var g = new HashSet<string>(generees);
            return m.Except(g).Select(k => "non générée : " + k).Concat(g.Except(m).Select(k => "hors mesure : " + k)).OrderBy(s => s).ToList();
        }

        private static Mesure LireMesure()
        {
            string chemin = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "Tools", "decor-de-scene-2026-10-07", "mesure-filets.json"));
            Assert.IsTrue(File.Exists(chemin), $"mesure introuvable : {chemin}");
            return JsonUtility.FromJson<Mesure>("{\"r\":" + File.ReadAllText(chemin) + "}");
        }

        private static IEnumerable<Type> ClassesDEcran() =>
            typeof(DecorsDeScene.Filets).GetNestedTypes(BindingFlags.Public | BindingFlags.Static);

        private static IEnumerable<(string nom, SpecFilet[] recette)> Recettes(Type ecran) =>
            ecran.GetFields(BindingFlags.Public | BindingFlags.Static)
                 .Where(f => f.FieldType == typeof(SpecFilet[]))
                 .Select(f => (f.Name, (SpecFilet[])f.GetValue(null)));

        [Test]
        public void D6a_RecettesGenerees_EgalesALaMesure_ParEcran_SurTousSesCadres()
        {
            Mesure m = LireMesure();
            Assert.AreEqual(128, m.r.Length, "anti-vacuité : les 128 cadres mesurés");
            Assert.AreEqual(1560, m.r.Sum(c => c.el.Length), "anti-vacuité : les 1560 éléments bordés du design (§3.4)");
            Dictionary<int, Cadre> parCadre = m.r.ToDictionary(c => c.i);

            var noms = new HashSet<string>(DecorsDeScene.Tous.Select(s =>
                typeof(DecorsDeScene).GetFields(BindingFlags.Public | BindingFlags.Static).First(f => f.GetValue(null) == s).Name));
            CollectionAssert.AreEquivalent(noms, ClassesDEcran().Select(t => t.Name), "une classe de recettes par entrée du catalogue");

            var echecs = new List<string>();
            int total = 0;
            foreach (Type ecran in ClassesDEcran())
            {
                var cadres = (int[])ecran.GetField("Cadres").GetValue(null);
                Assert.IsNotEmpty(cadres, $"{ecran.Name} : aucun cadre");
                var mesurees = new HashSet<string>();
                foreach (int c in cadres)
                {
                    Assert.IsTrue(parCadre.ContainsKey(c), $"{ecran.Name} : cadre {c} absent de la mesure");
                    foreach (El e in parCadre[c].el)
                        mesurees.Add(e.cls + "§" + CleMesuree(e.cotes.Select(x => (x.c, x.w, x.st, x.col)), e.rayon));
                }
                var generees = new HashSet<string>();
                foreach (var (nom, r) in Recettes(ecran))
                {
                    Assert.IsNotEmpty(r, $"{ecran.Name}.{nom} : recette vide");
                    generees.Add(CleGeneree(r));
                    total++;
                }
                // La mesure se compare SANS la classe CSS (le nom du champ en dérive) : mêmes recettes des deux côtés.
                List<string> e2 = Ecarts(mesurees.Select(k => k.Substring(k.IndexOf('§') + 1)), generees);
                if (e2.Count > 0) echecs.Add($"{ecran.Name} : {string.Join(" ; ", e2.Take(4))}");
                int attendu = mesurees.Count;
                int vus = Recettes(ecran).Count();
                if (vus != attendu) echecs.Add($"{ecran.Name} : {vus} champ(s) pour {attendu} couple(s) (classe, recette) mesurés");
            }
            Assert.IsEmpty(echecs, string.Join("\n", echecs));
            Assert.Greater(total, 137, $"anti-vacuité : {total} recettes (≥ les 137 recettes grossières du design)");
        }

        [Test]
        public void D6a_ControlePositif_UneRecetteRetireeOuAjouteeEstVue()
        {
            string a = CleMesuree(new[] { ("T", 1f, "solid", "#x"), ("B", 2f, "solid", "#y") }, "0px");
            string b = CleMesuree(new[] { ("B", 2f, "solid", "#y"), ("T", 1f, "solid", "#x") }, "0px");
            Assert.AreEqual(a, b, "l'ordre des côtés ne compte pas");
            Assert.AreNotEqual(a, CleMesuree(new[] { ("T", 1f, "solid", "#x"), ("B", 2f, "solid", "#y") }, "3px"), "le rayon compte");
            CollectionAssert.AreEqual(new[] { "non générée : " + a }, Ecarts(new[] { a }, new string[0]));
            CollectionAssert.AreEqual(new[] { "hors mesure : " + a }, Ecarts(new string[0], new[] { a }));
            // Et la clé GÉNÉRÉE d'une recette réelle retombe sur sa clé mesurée : ㊲ `.enseigne` = 1 px #2a3648 sur 3 côtés + 2 px laiton en bas.
            string ens = CleGeneree(DecorsDeScene.Filets.Reputation.Enseigne);
            StringAssert.Contains("B/2/solid/#b08d3e", ens);
            StringAssert.Contains("TRL/1/solid/#2a3648", ens);
        }

        // ════════════════════════════════════════════════════════════════════════════ (c) comportement

        private const int W = 540, H = 960;

        private sealed class Banc : IDisposable
        {
            public readonly RenderTexture Rt; public readonly Camera Cam; public readonly RectTransform Bloc; public readonly Image Fond;
            private readonly GameObject camGo, canGo;
            public Banc(Vector2 taille)
            {
                Rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
                camGo = new GameObject("fil_cam"); Cam = camGo.AddComponent<Camera>();
                Cam.targetTexture = Rt; Cam.clearFlags = CameraClearFlags.SolidColor; Cam.backgroundColor = Color.black;
                Cam.orthographic = true; Cam.enabled = false;
                canGo = new GameObject("fil_canvas", typeof(Canvas), typeof(CanvasScaler));
                Canvas cv = canGo.GetComponent<Canvas>(); cv.renderMode = RenderMode.ScreenSpaceCamera; cv.worldCamera = Cam;
                canGo.GetComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize;
                var b = new GameObject("Bloc", typeof(RectTransform), typeof(CanvasRenderer));
                b.transform.SetParent(canGo.transform, false);
                Bloc = (RectTransform)b.transform; Bloc.sizeDelta = taille;
                Fond = b.AddComponent<Image>(); Fond.color = DesignTokens.Current.surfaceCard;
            }
            public RectTransform Racine => (RectTransform)canGo.transform;
            public Texture2D Rendre()
            {
                Canvas.ForceUpdateCanvases(); Cam.Render();
                RenderTexture avant = RenderTexture.active; RenderTexture.active = Rt;
                var t = new Texture2D(W, H, TextureFormat.RGB24, false);
                t.ReadPixels(new Rect(0, 0, W, H), 0, 0); t.Apply(); RenderTexture.active = avant;
                return t;
            }
            public void Dispose()
            {
                UnityEngine.Object.DestroyImmediate(canGo); UnityEngine.Object.DestroyImmediate(camGo);
                Rt.Release(); UnityEngine.Object.DestroyImmediate(Rt);
            }
        }

        private static float Ecart255(Color a, Color b) =>
            Mathf.Max(Mathf.Abs(a.r - b.r), Mathf.Max(Mathf.Abs(a.g - b.g), Mathf.Abs(a.b - b.b))) * 255f;

        private static SpecFilet[] Trouver(Type ecran, Func<SpecFilet[], bool> critere, string quoi)
        {
            foreach (var (_, r) in Recettes(ecran)) if (critere(r)) return r;
            Assert.Fail($"{ecran.Name} : aucune recette {quoi}");
            return null;
        }

        private static void VerifierStructure(GameObject conteneur)
        {
            Assert.AreEqual(Filets.NomConteneur, conteneur.name);
            Assert.AreEqual(0, conteneur.transform.GetSiblingIndex(), "premier enfant : au-dessus du fond du bloc, sous son contenu");
            Assert.IsTrue(conteneur.GetComponent<LayoutElement>().ignoreLayout, "hors mise en page");
            Assert.IsEmpty(conteneur.GetComponentsInChildren<Canvas>(true), "aucun Canvas");
            Assert.IsEmpty(conteneur.GetComponentsInChildren<CanvasGroup>(true), "aucun CanvasGroup");
            foreach (Graphic g in conteneur.GetComponentsInChildren<Graphic>(true))
            {
                Assert.IsNotNull(g.GetComponent<CanvasRenderer>(), $"{g.name} sans CanvasRenderer");
                Assert.IsFalse(g.raycastTarget, $"{g.name} ne prend pas le raycast");
            }
        }

        [UnityTest]
        public IEnumerator D6c_Plein_Journal_BordVisible_DifferentDuFond_EpaisseurPxTrait()
        {
            // ㊳ : le juge a mesuré 0 bord `#2a3648` sur 9 blocs. Recette 4 côtés, 1 px, plein, sans rayon.
            SpecFilet[] r = Trouver(typeof(DecorsDeScene.Filets.Journal),
                x => x.Length == 1 && x[0].Cotes == Cotes.Tous && x[0].Style == StyleFilet.Plein && x[0].Rayon == 0f
                     && x[0].RayonPct == 0f && x[0].EpaisseurCss == 1f && x[0].Couleur.Opacite >= 0.999f, "pleine 1 px opaque");
            var banc = new Banc(new Vector2(400f, 200f));
            Texture2D t = null;
            try
            {
                yield return null;
                GameObject c = Filets.Poser(banc.Bloc, r);
                VerifierStructure(c);
                CollectionAssert.AreEquivalent(new[] { "Haut", "Droite", "Bas", "Gauche" }, c.transform.Cast<Transform>().Select(x => x.name));
                yield return null;
                t = banc.Rendre();
                Color bord = r[0].Couleur.Resoudre(), fond = DesignTokens.Current.surfaceCard;
                Assert.Greater(Ecart255(bord, fond), 4f, "prémisse : la couleur déclarée se distingue du fond");
                int ep = EchelleMaquette.PxTrait(1f, banc.Racine, EchelleMaquette.LargeurEcransBrennar6);
                Assert.AreEqual(2, ep, "prémisse : 540 / 300 ⇒ 1 px CSS = 2 px");
                // Colonne centrale, du haut du bloc (y = 480 + 100) vers l'intérieur : combien de pixels à la couleur du bord ?
                int haut = H / 2 + 100 - 1, n = 0;
                for (int y = haut; y > haut - 10; y--) if (Ecart255(t.GetPixel(W / 2, y), bord) <= 6f) n++;
                Assert.That(n, Is.InRange(ep - 1, ep + 1), $"épaisseur rendue {n} px pour PxTrait = {ep}");
                Assert.LessOrEqual(Ecart255(t.GetPixel(W / 2, haut), bord), 6f, "le pixel de bord a la couleur DÉCLARÉE");
                Assert.LessOrEqual(Ecart255(t.GetPixel(W / 2, haut - 6), fond), 3f, "à l'intérieur, le fond du bloc");
                Assert.LessOrEqual(Ecart255(t.GetPixel(W / 2 - 200, H / 2), bord), 6f, "le côté gauche aussi");
            }
            finally { if (t != null) UnityEngine.Object.DestroyImmediate(t); banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D6c_Pointille_ChaineDAppro_TransitionsEtRemplissage50()
        {
            // ㉚ : 4 filets pointillés `#c3b79e` 1 px en haut → 0 rendu. Le juge mesure 50 % de remplissage.
            SpecFilet[] r = Trouver(typeof(DecorsDeScene.Filets.ChaineDAppro),
                x => x.Length == 1 && x[0].Style == StyleFilet.Pointille && x[0].Cotes == Cotes.Haut && x[0].CouleurCss == "c3b79e",
                "pointillée #c3b79e en haut");
            var banc = new Banc(new Vector2(400f, 100f));
            Texture2D t = null;
            try
            {
                yield return null;
                VerifierStructure(Filets.Poser(banc.Bloc, r));
                yield return null;
                t = banc.Rendre();
                Color c = r[0].Couleur.Resoudre();
                int y = H / 2 + 50 - 1, pleins = 0, transitions = 0, total = 0;
                bool avant = false;
                for (int x = W / 2 - 190; x < W / 2 + 190; x++)
                {
                    bool p = Ecart255(t.GetPixel(x, y), c) <= 10f;
                    if (total > 0 && p != avant) transitions++;
                    avant = p; total++; if (p) pleins++;
                }
                Assert.Greater(transitions, 20, $"un POINTILLÉ : {transitions} transition(s) sur la ligne (le juge : 4 filets → 0)");
                Assert.AreEqual(0.5f, pleins / (float)total, 0.1f, $"remplissage {pleins}/{total} (le juge : 50 %)");
            }
            finally { if (t != null) UnityEngine.Object.DestroyImmediate(t); banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D6c_Etat_RefuseUnBordEgalAuFond_EtPoseUnBordVisible()
        {
            Teinte carte = Teinte.Jeton("surfaceCard", x => x.surfaceCard);
            var banc = new Banc(new Vector2(400f, 200f));
            Texture2D t = null;
            try
            {
                yield return null;
                var egal = new EtatDeBloc(carte, new SpecFilet(Cotes.Tous, 1f, StyleFilet.Plein, carte));
                Assert.Throws<InvalidOperationException>(() => Filets.Etat(banc.Bloc, banc.Fond, egal), "« bord = fond » refusé (㉛)");
                Assert.IsNull(banc.Bloc.Find(Filets.NomConteneur), "rien n'est posé quand l'état est refusé");

                // Contrôle : un état au bord distinct passe, pose le fond ET le bord.
                Teinte laiton = Teinte.Jeton("hudHairlineGold", x => x.hudHairlineGold);
                var pris = new EtatDeBloc(Teinte.Jeton("surfaceRaised", x => x.surfaceRaised), new SpecFilet(Cotes.Tous, 1f, StyleFilet.Plein, laiton));
                Filets.Etat(banc.Bloc, banc.Fond, pris);
                Assert.LessOrEqual(Ecart255(DesignTokens.Current.surfaceRaised, banc.Fond.color), 0.5f, "le fond de l'état est posé");
                yield return null;
                t = banc.Rendre();
                Color bordVu = t.GetPixel(W / 2, H / 2 + 100 - 1), fondVu = t.GetPixel(W / 2, H / 2);
                Assert.Greater(Ecart255(bordVu, fondVu), 20f, $"bord {bordVu} ≠ fond {fondVu}");
                Assert.LessOrEqual(Ecart255(bordVu, DesignTokens.Current.hudHairlineGold), 6f, "le bord est laiton");
            }
            finally { if (t != null) UnityEngine.Object.DestroyImmediate(t); banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D6c_Contour_Arrondi_UnSeulNoeud_BordAuMilieuDuCote()
        {
            SpecFilet[] r = Trouver(typeof(DecorsDeScene.Filets.Reputation),
                x => x.Length == 1 && x[0].Cotes == Cotes.Tous && x[0].Rayon > 0f && x[0].Style == StyleFilet.Plein
                     && x[0].Couleur.Opacite >= 0.999f, "arrondie pleine opaque");
            var banc = new Banc(new Vector2(400f, 200f));
            Texture2D t = null;
            try
            {
                yield return null;
                GameObject c = Filets.Poser(banc.Bloc, r);
                VerifierStructure(c);
                CollectionAssert.AreEqual(new[] { "Contour" }, c.transform.Cast<Transform>().Select(x => x.name));
                yield return null;
                t = banc.Rendre();
                Assert.LessOrEqual(Ecart255(t.GetPixel(W / 2, H / 2 + 100 - 1), r[0].Couleur.Resoudre()), 8f, "milieu du côté haut : le trait");
                Assert.Greater(Ecart255(t.GetPixel(W / 2 - 200, H / 2 + 100 - 1), r[0].Couleur.Resoudre()), 8f, "le coin est ÉVIDÉ (rayon)");
            }
            finally { if (t != null) UnityEngine.Object.DestroyImmediate(t); banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D6c_Enseigne_PlaqueSousLesFilets_FiletBasLaiton2px()
        {
            var banc = new Banc(new Vector2(480f, 80f));
            Texture2D t = null;
            try
            {
                yield return null;
                Image plaque = DecorDeScene.HabillerEnseigne(banc.Bloc, DecorsDeScene.Filets.Reputation.Enseigne, DecorsDeScene.Reputation);
                Assert.AreEqual(0, plaque.transform.GetSiblingIndex(), "la plaque est sous les filets");
                Assert.AreEqual(1, banc.Bloc.Find(Filets.NomConteneur).GetSiblingIndex());
                Assert.Throws<ArgumentException>(() => DecorDeScene.HabillerEnseigne(banc.Bloc, DecorsDeScene.Filets.Reputation.Enseigne, DecorsDeScene.Loi),
                    "pas d'enseigne hors famille A");
                yield return null;
                t = banc.Rendre();
                int bas = H / 2 - 40, n = 0;
                Color laiton = DesignTokens.Current.hudHairlineGold;
                for (int y = bas; y < bas + 8; y++) if (Ecart255(t.GetPixel(W / 2, y), laiton) <= 6f) n++;
                Assert.That(n, Is.InRange(3, 5), $"filet bas laiton : {n} px pour 2 px CSS (= 4)");
            }
            finally { if (t != null) UnityEngine.Object.DestroyImmediate(t); banc.Dispose(); }
        }
    }
}
