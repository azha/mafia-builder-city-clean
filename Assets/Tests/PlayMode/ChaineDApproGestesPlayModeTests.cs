using System;
using System.Collections;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using UnityEngine.TestTools;
using TMPro;
using MafiaCleanCity.CityMap;   // AuthClient (signup) — patron P1
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Tests;     // SeederSupport.SafeCallsign, ValeurAttendue
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>㉚ « Les deux gestes » — entretenir une liaison, reconstruire une route (design `Tools/gestes-30/DESIGN.md`, 11/11), puis V15 « coûts par mode » (design `Tools/couts-30-v15/DESIGN.md`, gardes G-V1..G-V6,
    /// contrat BACK-1 `lot/couts-30` @87820327). ÉCRITES SANS ÊTRE JOUÉES (aucun Unity) : seule la COMPILATION est prouvée (`Tools/couts-30-v15/preuves.txt`) ; elles se jouent au prochain créneau, catégorie
    /// `EcranAppro` (déjà au filtre de MafiaCI : aucun changement).
    ///
    /// ⚠️ CE QUE LE LOT LIVRE : « coût absent ⇒ mode éteint » (règle (3) de f2). Les coûts viennent de `GET /v1/supply-chain/upkeep-costs` (BACK-1, PAS ENCORE SERVI sur la pile : 404 ⇒ `CoutsNonServis` ⇒ les cinq modes
    /// (3 + 2) restent éteints). Le chemin ACTIF est prouvé par un point d'injection (`ChaineDApproScreenController.Couts`) qui PORTE des coûts de test, et par `LireCouts` sur des corps fabriqués — jamais par l'écran monté sur la pile.
    ///
    /// Ordre : les gardes STRUCTURELLES d'abord (S1, S2), puis les gardes de valeur (D1-D6), puis les routes (R), puis le fil (W), les coûts par mode (V1-V6), et deux parcours contre le vrai back (E).
    /// Chaque garde porte son CONTRÔLE POSITIF (il DOIT rougir) dans le même test.</summary>
    [Category("EcranAppro")]
    public class ChaineDApproGestesPlayModeTests
    {
        private GameObject hostGo;
        private HashSet<int> ecransAvant = new HashSet<int>();
        private Camera camPixels;
        private RenderTexture rtPixels;

        // ⛔ TD-576 (patron `ChaineDApproScreenPlayModeTests`) : le catalogue et le jeton sont des GLOBAUX statiques — rendus à chaque test, sinon ils passent au voisin.
        [SetUp]
        public void Relever()
        {
            ecransAvant = new HashSet<int>();
            foreach (var e in EcransVivants()) ecransAvant.Add(e.GetInstanceID());
            JetonDeStructure.OublierPourTest();
            Libelle.RemettreLesCompteurs();
        }

        [TearDown]
        public void TearDown()
        {
            GameObject reste = GameObject.Find("ChaineDApproRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("ChaineDApproRoot"); }
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            hostGo = null;
            if (camPixels != null) Object.DestroyImmediate(camPixels.gameObject);
            if (rtPixels != null) { rtPixels.Release(); Object.DestroyImmediate(rtPixels); }
            camPixels = null; rtPixels = null;
            JetonDeStructure.OublierPourTest();
            ShellChrome.PublierInsets(0f, 0f);   // le chrome est un global statique (TD-576)
            I18nCatalog.Oublier();
            var survivants = new List<string>();
            foreach (var e in EcransVivants()) if (!ecransAvant.Contains(e.GetInstanceID())) survivants.Add(e.gameObject.name);
            Assert.IsEmpty(survivants, "TD-576 : écran(s) orphelin(s) en sortie de test — " + string.Join(", ", survivants));
        }

        private static IEnumerable<ChaineDApproScreenController> EcransVivants() =>
            Object.FindObjectsByType<ChaineDApproScreenController>(FindObjectsInactive.Include, FindObjectsSortMode.None);

        // ═══ Fixtures ═══════════════════════════════════════════════════════════════════════

        private const string GabaritNom = "{enseigne} — {district}, îlot {block}";
        private const string CleCap = ChaineDApproGestes.CleRefusDuCap;
        private const string PhraseDuCap = "Votre décision de structure d’aujourd’hui est prise. Reprenez demain.";

        private ChaineDApproScreenController MonterEcran()
        {
            hostGo = new GameObject("ChaineDApproScreen", typeof(RectTransform));
            return hostGo.AddComponent<ChaineDApproScreenController>();
        }

        private static GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("ChaineDApproRoot");
            Assert.IsNotNull(r, "ChaineDApproRoot introuvable : le contrôleur n'a pas construit sa mise en page");
            return r;
        }

        private static Transform Trouver(Transform racine, string nom)
        {
            if (racine == null) return null;
            foreach (Transform x in racine.GetComponentsInChildren<Transform>(true))
                if (x.name == nom) return x;
            return null;
        }

        private static List<Transform> Enfants(Transform parent, string nom)
        {
            var l = new List<Transform>();
            if (parent == null) return l;
            foreach (Transform t in parent) if (t.name == nom) l.Add(t);
            return l;
        }

        private static string TexteDe(Transform racine, string nom)
        {
            Transform t = Trouver(racine, nom);
            return t != null ? t.GetComponent<TextMeshProUGUI>().text : null;
        }

        private static Transform Contenu() => Trouver(RacineEcran().transform, "ContenuChaine");

        private static BatimentPossedeDto Batiment(string id, string enseigne, string block) => new BatimentPossedeDto
        {
            building = id,
            name_i18n = new NomDeBatimentI18nDto
            {
                key = "game.fiction.building.name",
                @params = new NomDeBatimentParamsDto { enseigne = enseigne, district = "La Lisière", block = block },
            },
        };

        private static BatimentPossedeDto[] Batiments() => new[]
        {
            Batiment("b1501", "Soudure Varne", "1501"), Batiment("b1502", "Réserve Nock", "1502"), Batiment("b1503", "Clés-Minute Rook", "1503"),
            Batiment("b1504", "Consigne de la Threnny", "1504"), Batiment("b1505", "Billard Marr", "1505"),
        };

        private static string Nom(string enseigne, string block) =>
            ValeurAttendue.Cle("game.fiction.building.name", GabaritNom,
                new Dictionary<string, string> { { "enseigne", enseigne }, { "district", "La Lisière" }, { "block", block } });

        /// <summary>Le catalogue de test : le gabarit des noms de bâtiments + ce que le test SERT en plus (une clé servie remplace son repli).</summary>
        private static void Servir(params (string cle, string valeur)[] en_plus)
        {
            var d = new Dictionary<string, string> { { "game.fiction.building.name", GabaritNom } };
            foreach (var (cle, valeur) in en_plus) d[cle] = valeur;
            I18nCatalog.ChargerPourTest("fr", d);
        }

        private static SupplyChainRouteDto Route(string id, string de, string vers, string etat, string sin, string eff, bool reconstruction = false) =>
            new SupplyChainRouteDto
            {
                route_id = id, origin_building_id = de, destination_building_id = vers, state = etat,
                sinuosity_stress_bucket = sin, time_to_collapse_bucket = eff, rebuilding = reconstruction,
            };

        private static SupplyChainLegDto Lien(string id, string de, string vers, string dette, bool contournee = false, bool entretien = false) =>
            new SupplyChainLegDto
            {
                leg_id = id, origin_building_id = de, destination_building_id = vers, debt_bucket = dette, bypassed = contournee,
                maintaining = entretien, MaintainingServi = true,
            };

        /// <summary>Les routes du cadre 159 (`poser-chaine-routes.py` `ROUTES`), dans le DÉSORDRE, plus une `draft` que rien n'écrit (E1) — à ne PAS dessiner.</summary>
        private static SupplyChainRouteDto[] RoutesDuCadre() => new[]
        {
            Route("r5", "b1505", "b1503", "active", "pristine", "na"),
            Route("r3", "b1504", "b1501", "active", "stressed", "approaching"),
            Route("r1", "b1501", "b1505", "severed", "severed", "na", reconstruction: true),
            Route("r4", "b1502", "b1504", "active", "pristine", "distant"),
            Route("r2", "b1503", "b1502", "saturated", "critical", "imminent"),
            Route("r-brouillon", "b1502", "b1501", "draft", "pristine", "na"),
        };

        private static GetSupplyChainGraphResponseDto Graphe(SupplyChainLegDto[] legs = null, SupplyChainRouteDto[] routes = null) =>
            new GetSupplyChainGraphResponseDto
            {
                nodes = new SupplyChainNodeDto[0],
                legs = legs ?? new[] { Lien("l1", "b1503", "b1501", "fractured"), Lien("l2", "b1505", "b1503", "stressed", contournee: true), Lien("l3", "b1504", "b1502", "accruing") },
                routes = routes ?? RoutesDuCadre(),
            };

        /// <summary>Des coûts de TEST (jamais ceux du poseur : ce sont des défauts de tunables du back) — le chemin ACTIF, injecté.</summary>
        private sealed class CoutsDeTest : ICoutsParMode
        {
            private readonly Dictionary<string, string> parMode = new Dictionary<string, string>();
            private readonly Dictionary<string, string> bandes = new Dictionary<string, string>();
            public CoutsDeTest ToutServi(string centimes)
            {
                foreach (ModeDeGeste m in ChaineDApproGestes.Entretien.Modes) parMode[m.Id] = centimes;
                foreach (ModeDeGeste m in ChaineDApproGestes.Reconstruction.Modes) parMode[m.Id] = centimes;
                return this;
            }
            public CoutsDeTest Servi(string modeId, string centimes) { parMode[modeId] = centimes; return this; }
            public CoutsDeTest Bande(string modeId, string bande) { bandes[modeId] = bande; return this; }
            public string CentimesServis(string modeId) => parMode.TryGetValue(modeId, out string c) ? c : null;
            public string BandeServie(string modeId) => bandes.TryGetValue(modeId, out string b) ? b : null;
        }

        /// <summary>Des coûts de TEST AVEC leurs bandes (maintenance : brief / extended / immediate ; reconstruction : extended partout, comme le contrat) — pour voir les mots de bande dans la feuille.</summary>
        private static CoutsDeTest CoutsEtBandes() => new CoutsDeTest().ToutServi("12300")
            .Bande("quick_patch", "brief").Bande("structural_reinforce", "extended").Bande("reroute_bypass", "immediate")
            .Bande("MINIMAL_REROUTE", "extended").Bande("FULL_GEOMETRIC_RESET", "extended");

        private ChaineDApproScreenController Monte(GetSupplyChainGraphResponseDto g = null)
        {
            ChaineDApproScreenController ecran = MonterEcran();
            ecran.RendrePourTestChaine(g ?? Graphe(), Batiments());
            return ecran;
        }

        private static CibleDeGeste CibleLiaison() => new CibleDeGeste { Id = "l1", Origine = Nom("Clés-Minute Rook", "1503"), Destination = Nom("Soudure Varne", "1501") };
        private static CibleDeGeste CibleRoute() => new CibleDeGeste { Id = "r2", Origine = Nom("Clés-Minute Rook", "1503"), Destination = Nom("Réserve Nock", "1502") };

        // ═══ S1 — STRUCTURE : la feuille ne se dessine pas, ou est rognée ═════════════════════════

        /// <summary>Les défauts STRUCTURELS d'une feuille ouverte : un `Graphic` sans `CanvasRenderer` (rien ne dessine, console muette), un `Graphic` qui n'est pas `MaskableGraphic`, la feuille qui n'est pas
        /// les DEUX DERNIERS enfants de la racine d'écran, ou qui vit sous un masque (la fenêtre `RectMask2D` de la chaîne la rognerait).</summary>
        private sealed class GraphicNuDeTest : Graphic { }

        private static List<string> DefautsDeStructure(RectTransform racine, RectTransform voile, RectTransform panneau, Func<Graphic, bool> aSonRenderer = null)
        {
            if (aSonRenderer == null) aSonRenderer = g => g.GetComponent<CanvasRenderer>() != null;
            var d = new List<string>();
            foreach (RectTransform part in new[] { voile, panneau })
            {
                if (part == null) { d.Add("pièce absente"); continue; }
                foreach (Graphic g in part.GetComponentsInChildren<Graphic>(true))
                {
                    if (!aSonRenderer(g)) d.Add(g.name + " : sans CanvasRenderer");
                    if (!(g is MaskableGraphic)) d.Add(g.name + " : pas MaskableGraphic");
                }
                if (part.GetComponentInParent<RectMask2D>() != null || part.GetComponentInParent<Mask>() != null) d.Add(part.name + " : sous un masque");
            }
            if (voile != null && panneau != null)
            {
                int n = racine.childCount;
                if (panneau.GetSiblingIndex() != n - 1) d.Add("le panneau n'est pas le DERNIER enfant de la racine");
                if (voile.GetSiblingIndex() != n - 2) d.Add("le voile n'est pas l'avant-dernier enfant de la racine");
            }
            return d;
        }

        [UnityTest]
        public IEnumerator GestesS1_Feuille_CanvasRenderer_Maskable_DerniersEnfants_HorsDuMasque()
        {
            var ecran = Monte();
            yield return null;
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            ChaineDApproFeuille f = ecran.Feuille;
            Assert.IsNotNull(f, "la feuille est montée");
            Assert.IsTrue(f.EstOuverte);
            var racine = (RectTransform)RacineEcran().transform;
            Assert.IsNotNull(Trouver(racine, "FenetreChaine").GetComponent<RectMask2D>(), "anti-vacuité : la fenêtre masquée existe — c'est elle que la feuille ne doit pas habiter");

            int graphiques = f.Voile.GetComponentsInChildren<Graphic>(true).Length + f.Panneau.GetComponentsInChildren<Graphic>(true).Length;
            Assert.Greater(graphiques, 8, "anti-vacuité : la feuille a construit ses graphiques (voile, fond, filets, 3 modes, annuler…)");
            Assert.IsEmpty(DefautsDeStructure(racine, f.Voile, f.Panneau), "la feuille ouverte est structurellement juste");

            // CONTRÔLE POSITIF 1 : le voile SANS son CanvasRenderer est NOMMÉ. (Un CanvasRenderer ne se retire pas d'une `Image` vivante — Unity refuse et journalise : le contrôle passe par le prédicat
            // de la garde, qui lit `GetComponent<CanvasRenderer>()` en temps normal ; le Graphic du voile y est déclaré « sans ».)
            Graphic fondDuVoile = f.Voile.GetComponent<Graphic>();
            Assert.IsNotNull(fondDuVoile, "le voile est un Graphic (il dessine, et il barre le clic)");
            Assert.IsNotNull(fondDuVoile.GetComponent<CanvasRenderer>(), "prémisse : le vrai voile porte son CanvasRenderer");
            CollectionAssert.Contains(DefautsDeStructure(racine, f.Voile, f.Panneau, g => g != fondDuVoile && g.GetComponent<CanvasRenderer>() != null),
                f.Voile.name + " : sans CanvasRenderer", "CONTRÔLE POSITIF : la garde ne voit pas un voile sans CanvasRenderer");
            // …et un `Graphic` NU (pas `MaskableGraphic`) sous le panneau est NOMMÉ
            var nu = new GameObject("GraphicNu", typeof(RectTransform), typeof(CanvasRenderer));
            nu.transform.SetParent(f.Panneau, false);
            nu.AddComponent<GraphicNuDeTest>();
            CollectionAssert.Contains(DefautsDeStructure(racine, f.Voile, f.Panneau), "GraphicNu : pas MaskableGraphic", "CONTRÔLE POSITIF : un Graphic qui n'est pas MaskableGraphic ignorerait un masque parent");
            Object.DestroyImmediate(nu);
            Assert.IsEmpty(DefautsDeStructure(racine, f.Voile, f.Panneau), "les contrôles retirés, la feuille redevient juste");

            // CONTRÔLE POSITIF 2 : la feuille reparentée SOUS la fenêtre (rognée) et n'étant plus le dernier enfant est NOMMÉE.
            Transform fenetre = Trouver(racine, "FenetreChaine");
            f.Panneau.SetParent(fenetre, false);
            List<string> rognee = DefautsDeStructure(racine, f.Voile, f.Panneau);
            CollectionAssert.Contains(rognee, f.Panneau.name + " : sous un masque", "CONTRÔLE POSITIF : sous la fenêtre, la feuille est rognée — la garde le voit");
            CollectionAssert.Contains(rognee, "le panneau n'est pas le DERNIER enfant de la racine");
        }

        // ═══ S2 — RENDU ET COMPTAGE DE PIXELS : le voile assombrit la liste sous lui ══════════════════

        private sealed class Prise { public Color32[] Px; public int L, H; public RectInt Bande; }

        /// <summary>Rend le canvas de l'écran en 1080×2400 (patron `CaptureSupport.CapturerCanvas`, qui écrit un PNG ; ici on garde les PIXELS) et mesure la BANDE de liste visible AU-DESSUS du panneau.</summary>
        private IEnumerator Photographier(Prise sortie)
        {
            const int L = 1080, H = 2400;
            Canvas canvas = RacineEcran().GetComponentInParent<Canvas>().rootCanvas;
            if (camPixels == null)
            {
                rtPixels = new RenderTexture(L, H, 24, RenderTextureFormat.ARGB32);
                camPixels = new GameObject("CamPixelsGestes").AddComponent<Camera>();
                camPixels.targetTexture = rtPixels;
                camPixels.clearFlags = CameraClearFlags.SolidColor;
                camPixels.backgroundColor = Color.black;
                camPixels.orthographic = true;
            }
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = camPixels;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;
            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)RacineEcran().transform);
            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;
            camPixels.orthographicSize = ((RectTransform)canvas.transform).rect.height / 2f;
            camPixels.Render();
            RenderTexture avant = RenderTexture.active;
            RenderTexture.active = rtPixels;
            var tex = new Texture2D(L, H, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, L, H), 0, 0);
            tex.Apply();
            RenderTexture.active = avant;
            sortie.Px = tex.GetPixels32(); sortie.L = L; sortie.H = H;
            Object.DestroyImmediate(tex);

            // la bande : la fenêtre de la chaîne, au-dessus du haut du panneau quand il est ouvert
            Rect fenetre = EnPixels((RectTransform)Trouver(RacineEcran().transform, "FenetreChaine"));
            float bas = fenetre.yMin;
            ChaineDApproFeuille f = hostGo.GetComponent<ChaineDApproScreenController>().Feuille;
            if (f != null && f.EstOuverte) bas = Mathf.Max(bas, EnPixels(f.Panneau).yMax);
            int x0 = Mathf.Clamp(Mathf.RoundToInt(fenetre.xMin), 0, L - 1), x1 = Mathf.Clamp(Mathf.RoundToInt(fenetre.xMax), 1, L);
            int y0 = Mathf.Clamp(Mathf.RoundToInt(bas), 0, H - 1), y1 = Mathf.Clamp(Mathf.RoundToInt(fenetre.yMax), 1, H);
            sortie.Bande = new RectInt(x0, y0, Mathf.Max(0, x1 - x0), Mathf.Max(0, y1 - y0));
        }

        private Rect EnPixels(RectTransform rt)
        {
            var c = new Vector3[4];
            rt.GetWorldCorners(c);
            Vector3 a = camPixels.WorldToScreenPoint(c[0]), b = camPixels.WorldToScreenPoint(c[2]);
            return Rect.MinMaxRect(Mathf.Min(a.x, b.x), Mathf.Min(a.y, b.y), Mathf.Max(a.x, b.x), Mathf.Max(a.y, b.y));
        }

        /// <summary>Le comptage : les pixels de la bande dont le canal le plus vif dépasse 100 (l'encre claire de la liste : `#d8cfbb`, `#efe6d4`, les mots colorés), et le canal le plus vif de la bande.</summary>
        private static (int claires, int plusVif) Mesurer(Prise p)
        {
            int claires = 0, plusVif = 0;
            for (int y = p.Bande.yMin; y < p.Bande.yMax; y++)
                for (int x = p.Bande.xMin; x < p.Bande.xMax; x++)
                {
                    Color32 c = p.Px[y * p.L + x];
                    int v = Mathf.Max(c.r, Mathf.Max(c.g, c.b));
                    if (v >= 100) claires++;
                    if (v > plusVif) plusVif = v;
                }
            return (claires, plusVif);
        }

        /// <summary>Le verdict du voile, null = juste. `#0b1016b3` posé en linéaire (`1 − (1−a)^2,2`) fait tomber l'encre `#efe6d4` (239) vers ~71 — la maquette (sRGB) la fait tomber à ~72. Recopier l'opacité 0,70 TELLE
        /// QUELLE (alpha 0,70 en linéaire) la laisserait à ~126 : le voile paraîtrait moitié moins sombre. Un réglage VALIDE ET NON NUL peut ne rien assombrir du tout (alpha 0) : on COMPTE les pixels.</summary>
        private static string DefautDuVoile(Prise avant, Prise apres)
        {
            (int claires0, int vif0) = Mesurer(avant);
            (int claires1, int vif1) = Mesurer(apres);
            if (claires0 < 300) return "anti-vacuité : la liste n'a que " + claires0 + " pixels clairs avant l'ouverture (bande " + avant.Bande + ") — rien à assombrir, la garde ne prouverait rien";
            if (claires1 > claires0 * 0.05f) return "le voile n'assombrit pas la liste : " + claires0 + " pixels clairs avant, " + claires1 + " après (≤ 5 % attendus)";
            if (vif1 < 40 || vif1 > 100) return "le canal le plus vif sous le voile vaut " + vif1 + " (attendu 40-100 : 72 en maquette, la liste reste lisible sous un voile qui assombrit) — avant : " + vif0;
            return null;
        }

        [UnityTest]
        public IEnumerator GestesS2_LeVoile_AssombritLaBandeDeListe_PixelsComptesAvantApres()
        {
            Servir();
            var ecran = Monte();
            yield return null;
            var avant = new Prise();
            yield return Photographier(avant);
            Assert.Greater(avant.Bande.height, 40, "anti-vacuité : la bande de liste visible mesure " + avant.Bande);

            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            var apres = new Prise();
            yield return Photographier(apres);
            Assert.AreEqual(avant.Bande.xMin, apres.Bande.xMin, "même bande avant et après (sinon on compare deux zones)");
            Assert.IsNull(DefautDuVoile(avant, apres), "le voile de la feuille assombrit la bande de liste (comptage de pixels)");

            // CONTRÔLE POSITIF 1 : alpha du voile à 0 — un réglage VALIDE, zéro pixel assombri — ROUGIT
            Image voile = ecran.Feuille.Voile.GetComponent<Image>();
            Color teinte = voile.color;
            voile.color = new Color(teinte.r, teinte.g, teinte.b, 0f);
            var sansVoile = new Prise();
            yield return Photographier(sansVoile);
            Assert.IsNotNull(DefautDuVoile(avant, sansVoile), "CONTRÔLE POSITIF : un voile d'alpha 0 n'assombrit rien — la garde doit le voir");

            // CONTRÔLE POSITIF 2 : l'opacité CSS recopiée TELLE QUELLE (0,70) en linéaire — la couleur de la maquette en sRGB, un voile moitié moins sombre — ROUGIT
            voile.color = new Color(teinte.r, teinte.g, teinte.b, ChaineDApproGestes.AlphaCssDuVoile);
            var recopie = new Prise();
            yield return Photographier(recopie);
            Assert.IsNotNull(DefautDuVoile(avant, recopie), "CONTRÔLE POSITIF : l'alpha CSS recopié tel quel (changement d'unité silencieux) n'est pas le rendu de la maquette — la garde doit le voir");
        }

        // ═══ D1 — coût absent ⇒ mode éteint ═══════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator GestesD1_CoutAbsent_ModeEteint_CoutServi_ModeActionnable()
        {
            // la règle, PURE : sans coût servi, aucun des cinq modes n'agit ; avec un coût servi, il agit (le structurel : seulement jeton libre)
            foreach (SpecDeGeste spec in new[] { ChaineDApproGestes.Entretien, ChaineDApproGestes.Reconstruction })
                foreach (ModeDeGeste m in spec.Modes)
                {
                    Assert.IsFalse(ChaineDApproGestes.Actionnable(m, null, true), m.Id + " : coût absent ⇒ éteint, même jeton libre");
                    Assert.IsFalse(ChaineDApproGestes.Actionnable(m, "", true), m.Id + " : coût vide ⇒ éteint");
                    Assert.IsTrue(ChaineDApproGestes.Actionnable(m, "12300", true), "CONTRÔLE POSITIF : " + m.Id + " avec son coût servi ⇒ actionnable");
                }

            // l'écran, tel qu'il tourne AUJOURD'HUI (CoutsNonServis : la route des coûts n'est pas servie) : cinq modes éteints, le mot « On ne sait pas encore combien. », aucun montant
            Servir();
            var ecran = Monte();
            yield return null;
            Assert.IsInstanceOf<CoutsNonServis>(ecran.Couts, "le régime d'aujourd'hui : aucun coût lu du fil (la route n'est pas servie)");
            string absent = ValeurAttendue.Cle("appro.cout.on_ne_sait_pas_encore_combien", "On ne sait pas encore combien.");
            foreach (SpecDeGeste spec in new[] { ChaineDApproGestes.Entretien, ChaineDApproGestes.Reconstruction })
            {
                ecran.OuvrirLaFeuillePourTest(spec, spec == ChaineDApproGestes.Entretien ? CibleLiaison() : CibleRoute());
                yield return null;
                foreach (ModeDeGeste m in spec.Modes)
                {
                    Button b = ecran.Feuille.BoutonDuMode(m.Id);
                    Assert.IsNotNull(b, m.Id + " : la feuille propose le mode");
                    Assert.IsFalse(b.interactable, m.Id + " : coût absent ⇒ le bouton est éteint");
                }
                Assert.AreEqual(spec.Modes.Length, Regex.Matches(string.Join("|", ecran.Feuille.Textes), Regex.Escape(absent)).Count, "chaque mode de la feuille (3 pour entretenir, 2 pour reconstruire) dit « On ne sait pas encore combien. »");
                StringAssert.DoesNotContain("€", string.Join("|", ecran.Feuille.Textes), "aucun montant n'est inventé (ni celui du poseur)");
            }

            // CONTRÔLE POSITIF : le MÊME écran, les MÊMES modes, AVEC des coûts injectés ⇒ actionnables, et le montant servi est formaté par `Argent`
            ecran.Couts = new CoutsDeTest().ToutServi("12300");
            foreach (SpecDeGeste spec in new[] { ChaineDApproGestes.Entretien, ChaineDApproGestes.Reconstruction })
            {
                ecran.OuvrirLaFeuillePourTest(spec, spec == ChaineDApproGestes.Entretien ? CibleLiaison() : CibleRoute());
                yield return null;
                foreach (ModeDeGeste m in spec.Modes)
                    Assert.IsTrue(ecran.Feuille.BoutonDuMode(m.Id).interactable, "CONTRÔLE POSITIF : " + m.Id + " avec son coût servi est actionnable (jeton libre)");
                CollectionAssert.Contains(ecran.Feuille.Textes, Argent.DepuisCentimes("12300", "fr"), "le coût servi est dit par `Argent` (le seul formateur d'argent du client)");
                CollectionAssert.DoesNotContain(ecran.Feuille.Textes, absent, "CONTRÔLE POSITIF : avec les coûts, plus de « On ne sait pas encore combien. »");
            }

            // un coût servi illisible vaut « non servi » (jamais « — » dans un bouton allumé)
            ecran.Couts = new CoutsDeTest().ToutServi("pas-un-nombre");
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            Assert.IsFalse(ecran.Feuille.BoutonDuMode("quick_patch").interactable, "un coût illisible n'allume pas le mode");
        }

        // ═══ D2 — jeton pris ⇒ mode structurel éteint, avec la phrase SERVIE du cap ═══════════════

        [UnityTest]
        public IEnumerator GestesD2_JetonPris_ModeStructurelEteint_PhraseServieDuCap_ControleOublierLeJeton()
        {
            string grande = ValeurAttendue.De("accueil", "jeton", "votre grande décision du jour");
            Servir((CleCap, PhraseDuCap));
            var ecran = Monte();
            ecran.Couts = new CoutsDeTest().ToutServi("12300");
            yield return null;

            foreach (var (spec, cible, structurel, autres) in new[]
            {
                (ChaineDApproGestes.Entretien, CibleLiaison(), "structural_reinforce", new[] { "quick_patch", "reroute_bypass" }),
                (ChaineDApproGestes.Reconstruction, CibleRoute(), "FULL_GEOMETRIC_RESET", new[] { "MINIMAL_REROUTE" }),
            })
            {
                // jeton PRIS : le mode structurel est éteint et DIT la phrase servie du cap ; les autres modes agissent ; la marque du jeton n'est pas là
                JetonDeStructure.Publier(1, true);
                ecran.OuvrirLaFeuillePourTest(spec, cible);
                yield return null;
                Assert.IsFalse(ecran.Feuille.BoutonDuMode(structurel).interactable, structurel + " : jeton pris ⇒ éteint");
                foreach (string a in autres) Assert.IsTrue(ecran.Feuille.BoutonDuMode(a).interactable, a + " : un mode non structurel ne dépend pas du jeton");
                CollectionAssert.Contains(ecran.Feuille.Textes, PhraseDuCap, "le mode éteint porte la phrase SERVIE du cap");
                CollectionAssert.DoesNotContain(ecran.Feuille.Textes, grande, "jeton pris : la marque « votre grande décision du jour » ne s'affiche pas");

                // CONTRÔLE POSITIF : le jeton OUBLIÉ (libre) ⇒ le mode structurel agit et la marque REVIENT, la phrase du cap s'en va
                JetonDeStructure.OublierPourTest();
                ecran.OuvrirLaFeuillePourTest(spec, cible);
                yield return null;
                Assert.IsTrue(ecran.Feuille.BoutonDuMode(structurel).interactable, "CONTRÔLE POSITIF : " + structurel + " jeton libre ⇒ actionnable");
                CollectionAssert.Contains(ecran.Feuille.Textes, grande, "CONTRÔLE POSITIF : la marque « votre grande décision du jour » revient");
                CollectionAssert.DoesNotContain(ecran.Feuille.Textes, PhraseDuCap);
            }

            // jeton non PUBLIÉ (hors shell) ⇒ DISPONIBLE (`!Connu`) — jamais « plafond atteint » par défaut
            Assert.IsFalse(JetonDeStructure.Connu, "prémisse : rien n'est publié");
            Assert.IsTrue(ChaineDApproGestes.JetonDisponible, "non publié ⇒ disponible");
            JetonDeStructure.Publier(1, true);
            Assert.IsFalse(ChaineDApproGestes.JetonDisponible, "CONTRÔLE POSITIF : plafond atteint ⇒ indisponible");
        }

        // ═══ D3 — aucun tick (R2.2) ═══════════════════════════════════════════════════════════

        private static readonly Regex UnTick = new Regex(@"\btick|\d+\s*ticks?\b", RegexOptions.IgnoreCase);

        private static List<string> TextesAvecUnTick(IEnumerable<string> textes)
        {
            var l = new List<string>();
            foreach (string t in textes) if (t != null && UnTick.IsMatch(t)) l.Add(t);
            return l;
        }

        [UnityTest]
        public IEnumerator GestesD3_AucunTexteNePorteUnTick_ControleLeTickInjecte()
        {
            // le corps MESURÉ de `rebuild` porte un tick BRUT (1512) : il est LU (JsonUtility ne le jette pas) et n'est JAMAIS affiché
            const string corpsMesure = "{\"response_meta\":{},\"payload\":{\"data\":{\"routeId\":\"a35ba468\",\"mode\":\"MINIMAL_REROUTE\",\"version\":2,\"rebuildCompletesAtTick\":1512}}}";
            PostOperationalRoutesRebuildResponseDto rep = JsonUtility.FromJson<PostOperationalRoutesRebuildEnvelope>(corpsMesure).payload.data;
            Assert.AreEqual(1512, rep.rebuildCompletesAtTick, "prémisse : le tick brut est lu");

            Servir((CleCap, PhraseDuCap));
            var ecran = Monte();
            ecran.Couts = CoutsEtBandes();   // V15 : les MOTS de bande (« quelques minutes »…) sont dans les textes balayés — la durée est dite en mots, jamais en ticks
            yield return null;
            var tout = new List<string>(ecran.RenderedTexts);
            foreach (SpecDeGeste spec in new[] { ChaineDApproGestes.Entretien, ChaineDApproGestes.Reconstruction })
            {
                ecran.OuvrirLaFeuillePourTest(spec, spec == ChaineDApproGestes.Entretien ? CibleLiaison() : CibleRoute());
                ecran.RefuserPourTest(409, "{\"payload\":{\"error\":{\"code\":\"X\",\"user_facing_i18n_key\":\"" + CleCap + "\"}}}");
                yield return null;
                tout.AddRange(ecran.Feuille.Textes);
            }
            Assert.Greater(tout.Count, 20, "anti-vacuité : les textes de la chaîne ET des deux feuilles sont relevés");
            Assert.IsEmpty(TextesAvecUnTick(tout), "aucun texte ne porte un tick ni un nombre de ticks (R2.2) : la durée est dite en MOTS");
            CollectionAssert.DoesNotContain(tout, "1512", "le tick brut de la réponse n'est jamais affiché");
            foreach (string t in tout) StringAssert.DoesNotContain("1512", t, "ni dans une phrase");

            // CONTRÔLE POSITIF : « 12 ticks » servi dans un sous-titre PASSE dans la feuille — et la garde le NOMME
            Servir((CleCap, PhraseDuCap), ("appro.consequence.rafistoler", "12 ticks d’arrêt"));
            ecran.Couts = new CoutsDeTest().ToutServi("12300");   // sans bande : le sous-titre est la conséquence servie, seule
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            CollectionAssert.Contains(TextesAvecUnTick(ecran.Feuille.Textes), "12 ticks d’arrêt", "CONTRÔLE POSITIF : un tick injecté dans un sous-titre est vu dans les textes de la feuille");
        }

        // ═══ D4 — zéro repli : les clés neuves sont toutes en DetteDatee ═════════════════════════

        /// <summary>Les 24 clés NEUVES de ㉚ (les gestes + V15 : DESIGN `couts-30-v15` §2), écrites ICI à la main (anti-tautologie) : les 17 du lot BACK-1 (noms SERVIS, `lot/couts-30` @87820327) et les 7 du lot précédent.</summary>
        private static readonly string[] ClesNeuves =
        {
            "appro.titre.entretenir_la_liaison", "appro.titre.reconstruire_la_route",
            "appro.etiquette.rafistoler", "appro.etiquette.renforcer", "appro.etiquette.contourner", "appro.etiquette.petit_detour", "appro.etiquette.remise_a_plat",
            "appro.etiquette.quelques_minutes", "appro.etiquette.plus_longtemps", "appro.etiquette.tout_de_suite",
            "appro.consequence.rafistoler", "appro.consequence.renforcer", "appro.consequence.contourner", "appro.consequence.petit_detour", "appro.consequence.remise_a_plat",
            "appro.sous_titre.pendant_les_travaux_plus_rien_ne_passe_sur_cette_route", "accueil.jeton.votre_grande_decision_du_jour",
            "appro.cout.on_ne_sait_pas_encore_combien",
            "appro.etiquette.en_entretien", "appro.titre.les_routes",
            "appro.etat.active", "appro.etat.saturated", "appro.etat.severed", "appro.etat.en_reconstruction",
        };

        /// <summary>Les REUSE : servis (hors DetteDatee). Un repli y est compté mais jamais une dette de ce lot ; `appro.sinuosite.*` / `appro.effondrement.*` sont servis au cumul `74c5a0b0`, pas sur la pile.
        /// ⚠️ `accueil.jeton.votre_grande_decision_du_jour` n'en est PLUS un : elle n'est pas servie (0 à back main 51cece7d et au cumul 74c5a0b0 ; le lot BACK-1 l'ajoute) — elle est en DetteDatee.</summary>
        private static bool EstUnReuse(string cle) =>
            cle == "appro.bouton.ca_part_du_compte_tout_de_suite" || cle == "game.ui_common.cancel_button"
            || cle.StartsWith("appro.sinuosite.", StringComparison.Ordinal) || cle.StartsWith("appro.effondrement.", StringComparison.Ordinal)
            || cle == CleCap;

        private static List<string> HorsDette(IEnumerable<string> observees)
        {
            var l = new List<string>();
            foreach (string k in observees)
                if (!I18nCatalog.Connait(k) && !EstUnReuse(k) && !ZeroRepliDesLocatairesPlayModeTests.DetteDatee.Contains(k)) l.Add(k);
            return l;
        }

        [UnityTest]
        public IEnumerator GestesD4_LesClesNeuves_SontToutesEnDetteDatee()
        {
            Servir();
            var ecran = MonterEcran();
            // un premier rendu construit la mise en page (en-tête d'écran…) : ses clés sont servies en vrai, pas dans ce catalogue de test
            ecran.RendrePourTestChaine(new GetSupplyChainGraphResponseDto { nodes = new SupplyChainNodeDto[0], legs = new SupplyChainLegDto[0], routes = new SupplyChainRouteDto[0] });
            yield return null;
            Libelle.RemettreLesCompteurs();

            // une liaison « en entretien » (servi), les trois états de route dont une en reconstruction, les deux feuilles
            ecran.RendrePourTestChaine(Graphe(new[] { Lien("l1", "b1503", "b1501", "fractured", entretien: true) }), Batiments());
            ecran.Couts = CoutsNonServis.Instance;
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Reconstruction, CibleRoute());
            yield return null;
            // V15 : les trois MOTS de bande (`quelques minutes` · `plus longtemps` · `tout de suite`) ne sont demandés que quand une bande est SERVIE — une feuille d'entretien avec ses bandes
            ecran.Couts = CoutsEtBandes();
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            var observees = new List<string>(Libelle.ClesEnRepli);
            foreach (string k in ClesNeuves) CollectionAssert.Contains(observees, k, "anti-vacuité : la clé neuve " + k + " est bien demandée par l'écran (sinon la garde ne la voit pas)");
            Assert.IsEmpty(HorsDette(observees), "clé non servie hors de la DetteDatee : " + string.Join(" · ", HorsDette(observees)));
            foreach (string k in ClesNeuves)
                Assert.IsTrue(ZeroRepliDesLocatairesPlayModeTests.DetteDatee.Contains(k) || I18nCatalog.Connait(k), k + " : ni servie ni inscrite à la DetteDatee");

            // CONTRÔLE POSITIF : une clé du lot qui ne serait PAS inscrite est NOMMÉE (et la règle (2) de ZeroRepli rougit dès qu'une clé inscrite est servie)
            CollectionAssert.Contains(HorsDette(new[] { "appro.geste.oubliee_de_la_dette" }), "appro.geste.oubliee_de_la_dette", "CONTRÔLE POSITIF : une clé neuve hors dette est vue");
            CollectionAssert.Contains(HorsDette(new[] { "appro.mode.rafistoler" }), "appro.mode.rafistoler", "CONTRÔLE POSITIF : un NOM DISPARU du code (`appro.mode.*`, renommé `appro.etiquette.*`) n'est plus en dette — il est vu");
            Servir(("appro.etiquette.rafistoler", "Rafistoler"));
            Assert.IsEmpty(HorsDette(new[] { "appro.etiquette.rafistoler" }), "une clé SERVIE n'est plus une dette (la DetteDatee ne peut que rétrécir)");
        }

        // ═══ D5 — un échec réseau n'est PAS un refus ══════════════════════════════════════════════

        private const string CorpsRefusServi = "{\"payload\":{\"error\":{\"code\":\"REBUILD_IN_PROGRESS\",\"user_facing_i18n_key\":\"error.sinuosity.rebuild_in_progress\"}}}";
        private const string PhraseEnCours = "Une reconstruction est déjà en cours. Attendez qu’elle s’achève.";

        [UnityTest]
        public IEnumerator GestesD5_EchecReseau_AucunePhraseDeRefus_UnRefusServi_LaPhraseServie()
        {
            Servir(("error.sinuosity.rebuild_in_progress", PhraseEnCours), ("error.resource.state_conflict", "La situation a changé. Rechargez."));
            var ecran = Monte();
            ecran.Couts = new CoutsDeTest().ToutServi("12300");
            yield return null;
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Reconstruction, CibleRoute());
            yield return null;

            // échec RÉSEAU : `responseCode == 0`, même si un corps traîne — la feuille reste ouverte, SANS phrase
            ecran.RefuserPourTest(0, CorpsRefusServi);
            Assert.IsTrue(ecran.Feuille.EstOuverte, "un échec réseau ne ferme pas la feuille");
            Assert.IsNull(ecran.Feuille.DernierePhraseMontree, "G-D5 : échec réseau ⇒ aucune phrase de refus");
            CollectionAssert.DoesNotContain(ecran.Feuille.Textes, PhraseEnCours);
            Assert.IsNull(ChaineDApproScreenController.PhraseDeRefusAMontrer(0, PhraseEnCours), "la règle, pure : le code 0 n'est pas un refus");

            // un refus GÉNÉRIQUE (`error.resource.state_conflict` : « la situation a changé ») ne dit rien de plus que l'écran ⇒ aucune phrase (le manque d'argent a SA clé, `error.funds.insufficient` — G-V4 ; rien n'est inventé)
            ecran.RefuserPourTest(409, "{\"payload\":{\"error\":{\"code\":\"RESOURCE_STATE_CONFLICT\",\"user_facing_i18n_key\":\"error.resource.state_conflict\"}}}");
            Assert.IsNull(ecran.Feuille.DernierePhraseMontree, "une clé générique n'est pas une phrase de refus (RefusServi)");

            // CONTRÔLE POSITIF : un 409 SERVI ⇒ la phrase servie apparaît, la feuille reste ouverte
            ecran.RefuserPourTest(409, CorpsRefusServi);
            Assert.IsTrue(ecran.Feuille.EstOuverte, "un refus ne ferme pas la feuille");
            Assert.AreEqual(PhraseEnCours, ecran.Feuille.DernierePhraseMontree, "CONTRÔLE POSITIF : le 409 servi dit sa phrase servie");
            CollectionAssert.Contains(ecran.Feuille.Textes, PhraseEnCours);
            Assert.IsTrue(Trouver(ecran.Feuille.Panneau, "Refus").gameObject.activeSelf, "la zone du refus est visible");
            Assert.AreEqual(PhraseEnCours, TexteDe(ecran.Feuille.Panneau, "Phrase"), "la phrase est DANS la feuille");

            // une phrase ne survit pas à l'échec suivant : un échec réseau efface la précédente
            ecran.RefuserPourTest(0, null);
            Assert.IsNull(ecran.Feuille.DernierePhraseMontree, "le refus d'avant ne reste pas affiché sous un échec réseau");

            // un échec réseau RÉEL, sans simulacre : un port fermé ⇒ `responseCode == 0`, et AUCUNE phrase servie côté client
            var client = new ChaineDApproClient { BaseUrl = "http://127.0.0.1:9", TimeoutSeconds = 3 };
            long code = -1; string message = null; bool ok = false;
            yield return client.PostOperationalRoutesRebuild("jeton", "r2", new PostOperationalRoutesRebuildBody { mode = "MINIMAL_REROUTE" }, _ => ok = true, (c, m) => { code = c; message = m; });
            Assert.IsFalse(ok, "un port fermé n'est pas un succès");
            Assert.AreEqual(0, code, "un échec de connexion rend `responseCode == 0` : " + message);
            Assert.IsNull(client.DernierePhraseDeRefus, "pas de corps ⇒ pas de phrase");
            Assert.IsNull(ChaineDApproScreenController.PhraseDeRefusAMontrer(code, client.DernierePhraseDeRefus));
        }

        // ═══ D6 — « en entretien » et « contournée » jamais ensemble ═══════════════════════════════

        private static bool LesDeuxEtiquettes(Transform ligne) => Trouver(ligne, "Contournee") != null && Trouver(ligne, "EnEntretien") != null;

        private static Transform LigneDOrigine(Transform contenu, string origine)
        {
            foreach (Transform t in contenu)
                if ((t.name == "Liaison" || t.name == "LiaisonContournee") && TexteDe(t, "Origine") == origine) return t;
            return null;
        }

        private const string CorpsDesLiaisons =
            "{\"payload\":{\"data\":{\"nodes\":[],\"routes\":[],\"legs\":["
            + "{\"leg_id\":\"l-a\",\"origin_building_id\":\"b1503\",\"destination_building_id\":\"b1501\",\"debt_bucket\":\"fractured\",\"bypassed\":true,\"maintaining\":true},"      // les DEUX : la contournée garde la place
            + "{\"leg_id\":\"l-b\",\"origin_building_id\":\"b1505\",\"destination_building_id\":\"b1503\",\"debt_bucket\":\"stressed\",\"bypassed\":false,\"maintaining\":true},"      // en entretien SEUL
            + "{\"leg_id\":\"l-c\",\"origin_building_id\":\"b1504\",\"destination_building_id\":\"b1502\",\"debt_bucket\":\"accruing\",\"bypassed\":false},"                     // clé ABSENTE : rien
            + "{\"leg_id\":\"l-d\",\"origin_building_id\":\"b1502\",\"destination_building_id\":\"b1505\",\"debt_bucket\":\"fresh\",\"bypassed\":false,\"maintaining\":false},"      // servie ET fausse : rien
            + "{\"leg_id\":\"l-e\",\"origin_building_id\":\"b1501\",\"destination_building_id\":\"b1504\",\"debt_bucket\":\"fresh\",\"bypassed\":true}"                          // contournée SEULE
            + "]}}}";

        [Test]
        public void GestesD6b_LireGraphe_LaPresenceDeMaintaining_SeLitDansLeCorpsBrut_LiaisonParLiaison()
        {
            GetSupplyChainGraphResponseDto g = ChaineDApproClient.LireGraphe(CorpsDesLiaisons);
            Assert.IsNotNull(g);
            Assert.AreEqual(5, g.legs.Length);
            CollectionAssert.AreEqual(new[] { true, true, false, true, false }, Array.ConvertAll(g.legs, l => l.MaintainingServi), "la clé est PRÉSENTE sur a, b, d ; ABSENTE sur c, e");
            CollectionAssert.AreEqual(new[] { true, true, false, false, false }, Array.ConvertAll(g.legs, l => l.maintaining), "la valeur servie");
            // CONTRÔLE POSITIF : un corps SANS la clé (le régime d'aujourd'hui) ne pose rien
            GetSupplyChainGraphResponseDto sans = ChaineDApproClient.LireGraphe(
                "{\"payload\":{\"data\":{\"nodes\":[],\"routes\":[],\"legs\":[{\"leg_id\":\"x\",\"debt_bucket\":\"fresh\",\"bypassed\":false}]}}}");
            Assert.IsFalse(sans.legs[0].MaintainingServi, "absent ⇒ non servi (règle (3) : on ne devine pas)");
            // un autre nom (`maintenance`) n'est pas servi ; le mot dans une chaîne ne compte pas
            GetSupplyChainGraphResponseDto autre = ChaineDApproClient.LireGraphe(
                "{\"payload\":{\"data\":{\"nodes\":[],\"routes\":[],\"legs\":[{\"leg_id\":\"maintaining\",\"maintenance\":true,\"note\":\"{\\\"maintaining\\\": true}\"}]}}}");
            Assert.IsFalse(autre.legs[0].MaintainingServi, "ni un autre nom, ni le mot dans une valeur ou dans une chaîne");
            // revue ⊥ m4 : un `maintaining` d'un SOUS-OBJET (bon nom, mauvaise profondeur) ne compte pas ; au premier niveau, oui
            GetSupplyChainGraphResponseDto imbrique = ChaineDApproClient.LireGraphe(
                "{\"payload\":{\"data\":{\"nodes\":[],\"routes\":[],\"legs\":[{\"leg_id\":\"n\",\"detail\":{\"maintaining\":true},\"liste\":[{\"maintaining\":false}]},"
                + "{\"leg_id\":\"p\",\"detail\":{\"x\":1},\"maintaining\":true}]}}}");
            CollectionAssert.AreEqual(new[] { false, true }, Array.ConvertAll(imbrique.legs, l => l.MaintainingServi), "seule la clé du PREMIER niveau est lue");
            Assert.IsNull(ChaineDApproClient.LireGraphe("{\"payload\":{}}"), "un corps sans payload.data ⇒ null (comme avant)");
            Assert.IsNull(ChaineDApproClient.LireGraphe("pas du json"), "un corps illisible ⇒ null, jamais une exception");
        }

        [UnityTest]
        public IEnumerator GestesD6_EnEntretienEtContournee_JamaisEnsembleSurUneLigne()
        {
            Servir();
            var ecran = MonterEcran();
            ecran.RendrePourTestChaine(ChaineDApproClient.LireGraphe(CorpsDesLiaisons), Batiments());
            yield return null;
            Transform contenu = Contenu();
            string enEntretien = ValeurAttendue.Cle("appro.etiquette.en_entretien", "en entretien");
            string contournee = ValeurAttendue.Cle("appro.etiquette.contournee", "contournée");

            Transform a = LigneDOrigine(contenu, Nom("Clés-Minute Rook", "1503")), b = LigneDOrigine(contenu, Nom("Billard Marr", "1505")),
                      c = LigneDOrigine(contenu, Nom("Consigne de la Threnny", "1504")), d = LigneDOrigine(contenu, Nom("Réserve Nock", "1502")),
                      e = LigneDOrigine(contenu, Nom("Soudure Varne", "1501"));
            foreach (Transform t in new[] { a, b, c, d, e }) Assert.IsNotNull(t, "anti-vacuité : les cinq liaisons sont rendues");

            Assert.AreEqual(contournee, TexteDe(a, "Contournee"), "les DEUX servis : « contournée » garde la place");
            Assert.IsNull(Trouver(a, "EnEntretien"), "…et « en entretien » ne s'y ajoute pas (E3)");
            Assert.AreEqual(enEntretien, TexteDe(b, "EnEntretien"), "maintaining servi et vrai, non contournée ⇒ « en entretien »");
            Assert.IsNull(Trouver(b, "Contournee"));
            Assert.IsNull(Trouver(c, "EnEntretien"), "clé absente ⇒ rien");
            Assert.IsNull(Trouver(d, "EnEntretien"), "servie et fausse ⇒ rien");
            Assert.IsNotNull(Trouver(e, "Contournee"), "contournée seule");
            Assert.IsNull(Trouver(e, "EnEntretien"));
            foreach (Transform t in new[] { a, b, c, d, e }) Assert.IsFalse(LesDeuxEtiquettes(t), "une ligne ne porte jamais les deux : " + TexteDe(t, "Origine"));

            // le modèle, pur : le même verdict sans rendu
            GetSupplyChainGraphResponseDto g = ChaineDApproClient.LireGraphe(CorpsDesLiaisons);
            var liaisons = ChaineDApproGraphe.Liaisons(g.legs, ChaineDApproGraphe.ParId(Batiments()));
            Assert.IsFalse(liaisons.Exists(l => l.Contournee && l.EnEntretien), "aucune liaison du modèle n'est à la fois contournée et en entretien");

            // CONTRÔLE POSITIF : une ligne qui porterait les deux (la faute qu'on garde) est NOMMÉE — le détecteur voit un « EnEntretien » ajouté à une contournée
            var faux = new GameObject("EnEntretien", typeof(RectTransform));
            faux.transform.SetParent(a, false);
            Assert.IsTrue(LesDeuxEtiquettes(a), "CONTRÔLE POSITIF : une contournée à laquelle on ajoute « en entretien » est rouge");
            Object.DestroyImmediate(faux);
            Assert.IsFalse(LesDeuxEtiquettes(a), "le faux retiré, elle redevient juste");
        }

        // ═══ R — les routes (cadre 159) : le point d'entrée de « Reconstruire » ═══════════════════════

        [UnityTest]
        public IEnumerator GestesR1_LesRoutes_OrdreDuCadre159_SansDraft_EtLEtatEnReconstruction()
        {
            Servir();
            var ecran = Monte();
            yield return null;
            Transform contenu = Contenu();
            Assert.IsNotNull(Trouver(contenu, "TitronRoutes"), "la section « Les routes » est rendue");
            Assert.AreEqual(ValeurAttendue.Cle("appro.titre.les_routes", "Les routes"), TexteDe(Trouver(contenu, "TitronRoutes"), "Texte"), "le titron (rendu en capitales par le style, pas par le texte)");

            var lignes = new List<Transform>();
            foreach (Transform t in contenu) if (t.name == "Route" || t.name == "RouteEnReconstruction") lignes.Add(t);
            Assert.AreEqual(5, lignes.Count, "cinq routes rendues : la `draft` n'est JAMAIS dessinée (E1 : aucun écrivain)");
            // state (coupée → saturée → ouverte), puis effondrement (imminent → na), puis nom de l'origine : r1 · r2 · r3 · r4 · r5 (poser-chaine-routes.py:52-54)
            CollectionAssert.AreEqual(
                new[] { Nom("Soudure Varne", "1501"), Nom("Clés-Minute Rook", "1503"), Nom("Consigne de la Threnny", "1504"), Nom("Réserve Nock", "1502"), Nom("Billard Marr", "1505") },
                lignes.ConvertAll(l => TexteDe(l, "Origine")), "l'ordre ratifié : state, puis effondrement, puis origine");
            CollectionAssert.AreEqual(
                new[] { ValeurAttendue.Cle("appro.etat.severed", "Coupée"), ValeurAttendue.Cle("appro.etat.saturated", "Saturée"), ValeurAttendue.Cle("appro.etat.active", "Ouverte"),
                        ValeurAttendue.Cle("appro.etat.active", "Ouverte"), ValeurAttendue.Cle("appro.etat.active", "Ouverte") },
                lignes.ConvertAll(l => TexteDe(l, "Mot")), "chaque route dit son état, par la clé de sa VALEUR servie");

            // « En reconstruction » = `rebuilding` SERVI, sur la seule route qui l'est ; la ligne n'est pas interactable (la seule extinction côté ligne)
            Assert.AreEqual("RouteEnReconstruction", lignes[0].name);
            Assert.AreEqual(ValeurAttendue.Cle("appro.etat.en_reconstruction", "En reconstruction"), TexteDe(lignes[0], "EnReconstruction"));
            for (int i = 1; i < lignes.Count; i++) Assert.IsNull(Trouver(lignes[i], "EnReconstruction"), "seule la route qui reconstruit le dit");
            Assert.IsFalse(lignes[0].GetComponent<Button>().interactable, "une route en reconstruction : pas de second geste");
            for (int i = 1; i < lignes.Count; i++) Assert.IsTrue(lignes[i].GetComponent<Button>().interactable, "les autres routes s'ouvrent");

            // les deux bandes de chaque route, dans le texte rendu
            CollectionAssert.Contains(ecran.RenderedTexts, ValeurAttendue.Cle("appro.sinuosite.critical", "Que des détours"));
            CollectionAssert.Contains(ecran.RenderedTexts, ValeurAttendue.Cle("appro.effondrement.imminent", "Ça va lâcher"));
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "draft", "jamais la valeur brute");
            foreach (string t in ecran.RenderedTexts) StringAssert.DoesNotContain("r-brouillon", t);

            // CONTRÔLE : sans route servie, ni titre ni ligne (la chaîne vide garde son message honnête)
            ecran.RendrePourTestChaine(new GetSupplyChainGraphResponseDto { nodes = new SupplyChainNodeDto[0], legs = new SupplyChainLegDto[0], routes = new SupplyChainRouteDto[0] });
            yield return null;
            Assert.IsNull(Trouver(RacineEcran().transform, "TitronRoutes"), "aucune route ⇒ pas de section");
            // …et une `draft` SEULE ne dessine rien
            ecran.RendrePourTestChaine(new GetSupplyChainGraphResponseDto { nodes = new SupplyChainNodeDto[0], legs = new SupplyChainLegDto[0],
                routes = new[] { Route("r-b", "b1501", "b1502", "draft", "pristine", "na") } }, Batiments());
            yield return null;
            Assert.IsNull(Trouver(RacineEcran().transform, "TitronRoutes"), "une route `draft` seule ne rend ni titre ni ligne (E1)");
        }

        private static IEnumerator Cliquer(GameObject go)
        {
            var donnee = new PointerEventData(EventSystem.current) { button = PointerEventData.InputButton.Left };
            ExecuteEvents.Execute(go, donnee, ExecuteEvents.pointerClickHandler);
            yield return null;
        }

        [UnityTest]
        public IEnumerator GestesR2_LeClicSurUneLigne_OuvreLaFeuilleDeSonGeste_SurSaCible()
        {
            Servir();
            var ecran = Monte();
            yield return null;
            Transform contenu = Contenu();

            // une liaison → « Entretenir la liaison », sur le `leg_id` servi (jamais dessiné)
            Transform liaison = LigneDOrigine(contenu, Nom("Clés-Minute Rook", "1503"));
            Assert.IsNotNull(liaison);
            yield return Cliquer(liaison.gameObject);
            Assert.IsTrue(ecran.Feuille != null && ecran.Feuille.EstOuverte, "le clic sur une liaison ouvre la feuille");
            Assert.AreSame(ChaineDApproGestes.Entretien, ecran.Feuille.SpecOuverte);
            Assert.AreEqual("l1", ecran.Feuille.CibleOuverte.Id);
            Assert.AreEqual(Nom("Clés-Minute Rook", "1503"), ecran.Feuille.CibleOuverte.Origine);
            CollectionAssert.DoesNotContain(ecran.Feuille.Textes, "l1", "l'identifiant servi n'est jamais dessiné");

            // une route → « Reconstruire la route », sur le `route_id` servi
            ecran.Feuille.Fermer();
            Transform route = null;
            foreach (Transform t in contenu) if (t.name == "Route" && TexteDe(t, "Origine") == Nom("Clés-Minute Rook", "1503")) route = t;
            Assert.IsNotNull(route);
            yield return Cliquer(route.gameObject);
            Assert.IsTrue(ecran.Feuille.EstOuverte);
            Assert.AreSame(ChaineDApproGestes.Reconstruction, ecran.Feuille.SpecOuverte);
            Assert.AreEqual("r2", ecran.Feuille.CibleOuverte.Id);
            CollectionAssert.Contains(ecran.Feuille.Textes, ValeurAttendue.Cle("appro.sous_titre.pendant_les_travaux_plus_rien_ne_passe_sur_cette_route", "Pendant les travaux, plus rien ne passe sur cette route."),
                "la phrase commune de la reconstruction");

            // CONTRÔLE POSITIF : une route EN RECONSTRUCTION ne s'ouvre pas (le clic d'une ligne non interactable est sans effet)
            ecran.Feuille.Fermer();
            yield return null;
            Transform enTravaux = Trouver(contenu, "RouteEnReconstruction");
            yield return Cliquer(enTravaux.gameObject);
            Assert.IsFalse(ecran.Feuille.EstOuverte, "CONTRÔLE POSITIF : la route qui se reconstruit n'ouvre aucune feuille");

            // Annuler ferme ; un choix éteint (coût absent) n'envoie RIEN
            yield return Cliquer(route.gameObject);
            Assert.IsTrue(ecran.Feuille.EstOuverte);
            yield return Cliquer(Trouver(ecran.Feuille.Panneau, "Annuler").gameObject);
            yield return null;
            Assert.IsFalse(ecran.Feuille.EstOuverte, "« Annuler » ferme la feuille");
            Assert.IsNull(Trouver(RacineEcran().transform, ChaineDApproFeuille.NomPanneau), "…et le panneau n'est plus dans l'arbre");
            yield return Cliquer(route.gameObject);
            Button eteint = ecran.Feuille.BoutonDuMode("MINIMAL_REROUTE");
            Assert.IsNotNull(eteint, "prémisse : le mode est dans la feuille");
            Assert.IsFalse(eteint.interactable, "prémisse : coût absent ⇒ le bouton est éteint (sinon le clic ci-dessous ne prouverait rien)");
            long codeAvant = ecran.DernierCodeErreur; string erreurAvant = ecran.DerniereErreur;
            yield return Cliquer(eteint.gameObject);
            Assert.IsFalse(ecran.GesteEnCours, "un mode éteint (coût absent) ne part pas");
            // le témoin que RIEN n'est parti : un POST, même refusé, poserait un code et un message d'erreur
            Assert.AreEqual(codeAvant, ecran.DernierCodeErreur, "aucune requête n'est partie (aucun code d'erreur posé)");
            Assert.AreEqual(erreurAvant, ecran.DerniereErreur, "…ni aucun message d'erreur");
            Assert.IsTrue(ecran.Feuille.EstOuverte, "la feuille n'a pas bougé");
        }

        private static double Luminance(Color c)
        {
            double Lin(float v) => v <= 0.03928f ? v / 12.92 : Math.Pow((v + 0.055) / 1.055, 2.4);
            return 0.2126 * Lin(c.r) + 0.7152 * Lin(c.g) + 0.0722 * Lin(c.b);
        }

        private static double Contraste(Color a, Color b)
        {
            double la = Luminance(a), lb = Luminance(b);
            return (Math.Max(la, lb) + 0.05) / (Math.Min(la, lb) + 0.05);
        }

        [UnityTest]
        public IEnumerator GestesR3_Contraste_LesMotsDesRoutesEtDeLaFeuille_AuMoins4_5Pour1()
        {
            Servir((CleCap, PhraseDuCap));
            var ecran = Monte();
            ecran.Couts = new CoutsDeTest().ToutServi("12300");
            yield return null;
            // les mots colorés des routes (balises calculées) sur le fond de ligne : aucune couleur neuve, l'échelle du cadre 154
            Color fond = ChaineDApproScreenController.FondLiaison;
            foreach (string b in new[] { "pristine", "stressed", "critical", "severed" })
                Assert.GreaterOrEqual(Contraste(ChaineDApproGraphe.TeinteDeSinuosite(b).Resoudre(), fond), 4.5, "sinuosité " + b);
            foreach (string b in new[] { "distant", "approaching", "imminent", "na" })
                Assert.GreaterOrEqual(Contraste(ChaineDApproGraphe.TeinteDEffondrement(b).Resoudre(), fond), 4.5, "effondrement " + b);
            foreach (int r in new[] { 0, 1, 2, 3 }) Assert.GreaterOrEqual(Contraste(ChaineDApproGraphe.TeinteDeRang(r).Resoudre(), fond), 4.5, "état, rang " + r);
            Assert.GreaterOrEqual(Contraste(ChaineDApproScreenController.EncreFleche, fond), 4.5, "« En reconstruction » / « en entretien »");

            // chaque texte de la feuille ouverte sur le fond opaque de son PREMIER ancêtre qui en porte un (jeton pris : le mode éteint inclus)
            JetonDeStructure.Publier(1, true);
            foreach (SpecDeGeste spec in new[] { ChaineDApproGestes.Entretien, ChaineDApproGestes.Reconstruction })
            {
                ecran.OuvrirLaFeuillePourTest(spec, spec == ChaineDApproGestes.Entretien ? CibleLiaison() : CibleRoute());
                ecran.RefuserPourTest(409, "{\"payload\":{\"error\":{\"user_facing_i18n_key\":\"" + CleCap + "\"}}}");
                yield return null;
                int mesures = 0;
                foreach (TextMeshProUGUI t in ecran.Feuille.Panneau.GetComponentsInChildren<TextMeshProUGUI>(false))
                {
                    Color? sous = null;
                    for (Transform p = t.transform.parent; p != null && sous == null; p = p.parent)
                    {
                        Image im = p.GetComponent<Image>();
                        if (im != null && im.color.a > 0.9f) sous = im.color;
                    }
                    if (sous == null) continue;
                    mesures++;
                    Assert.GreaterOrEqual(Contraste(t.color, sous.Value), 4.5, "« " + t.text + " » sur son fond (" + t.name + ")");
                }
                Assert.Greater(mesures, 6, "anti-vacuité : les textes de la feuille ont été mesurés");
            }
            // CONTRÔLE POSITIF : une encre trop proche du fond est NOMMÉE (`#8a8069` sur `#1d1a16` : 4,43:1 — la valeur que le poseur a écartée)
            Assert.Less(Contraste(new Color32(0x8a, 0x80, 0x69, 255), fond), 4.5, "CONTRÔLE POSITIF : la mesure rougit sur 4,43:1");
        }

        // ═══ W — le fil : les corps envoyés ════════════════════════════════════════════════════════

        [Test]
        public void GestesW1_LesCorpsDesDeuxPOST_PortentLeModeServi_EtLesModesSontLesValeursDuBack()
        {
            Assert.AreEqual("{\"mode\":\"quick_patch\"}", JsonUtility.ToJson(new PostSupplyChainLegsMaintainBody { mode = "quick_patch" }));
            Assert.AreEqual("{\"mode\":\"MINIMAL_REROUTE\"}", JsonUtility.ToJson(new PostOperationalRoutesRebuildBody { mode = "MINIMAL_REROUTE" }),
                "mesures/08-rebuild-MINIMAL_REROUTE.json : le corps est `{mode}`");
            // les identifiants de mode sont ceux du back (V15 @74c5a0b0), écrits ICI à la main (anti-tautologie)
            CollectionAssert.AreEqual(new[] { "quick_patch", "structural_reinforce", "reroute_bypass" }, Array.ConvertAll(ChaineDApproGestes.Entretien.Modes, m => m.Id));
            CollectionAssert.AreEqual(new[] { "MINIMAL_REROUTE", "FULL_GEOMETRIC_RESET" }, Array.ConvertAll(ChaineDApproGestes.Reconstruction.Modes, m => m.Id), "DEUX modes : « Remaniement » est RETIRÉ (ruling f2 11/11, B1)");
            // seuls Renforcer et Remise à plat sont des décisions STRUCTURELLES (le jeton)
            Assert.AreEqual(new[] { false, true, false }, Array.ConvertAll(ChaineDApproGestes.Entretien.Modes, m => m.Structurel));
            Assert.AreEqual(new[] { false, true }, Array.ConvertAll(ChaineDApproGestes.Reconstruction.Modes, m => m.Structurel));
            // la réponse de rebuild est en camelCase (mesuré) : un snake_case n'arriverait nulle part
            var r = JsonUtility.FromJson<PostOperationalRoutesRebuildEnvelope>("{\"payload\":{\"data\":{\"routeId\":\"a35b\",\"mode\":\"MINIMAL_REROUTE\",\"version\":2,\"rebuildCompletesAtTick\":1512}}}").payload.data;
            Assert.AreEqual("a35b", r.routeId); Assert.AreEqual("MINIMAL_REROUTE", r.mode); Assert.AreEqual(2, r.version);
            // CONTRÔLE POSITIF : le GRAPHE ne porte aucun coût (le coût ne dépend QUE du mode : `GET /v1/supply-chain/upkeep-costs`, G-V1) — un corps de graphe qui en porterait une n'arme aucun mode
            GetSupplyChainGraphResponseDto g = ChaineDApproClient.LireGraphe(
                "{\"payload\":{\"data\":{\"nodes\":[],\"routes\":[],\"legs\":[{\"leg_id\":\"x\",\"debt_bucket\":\"fresh\",\"bypassed\":false,\"cost\":5000,\"costs\":{\"quick_patch\":5000}}]}}}");
            Assert.IsNotNull(g.legs[0]);
            Assert.IsNull(CoutsNonServis.Instance.CentimesServis("quick_patch"), "le régime sans lecture : aucun coût servi, aucun nom de clé inventé");
            Assert.IsNull(CoutsNonServis.Instance.BandeServie("quick_patch"), "…ni aucune bande");
        }

        // ═══ V — ㉚ V15 : les coûts par mode, lus du fil (design `Tools/couts-30-v15/DESIGN.md` §3, contrat BACK-1 @87820327) ═══════════════════

        private static string LigneDeCout(string mode, string centimes, string bande) =>
            "{\"mode\":\"" + mode + "\"" + (centimes != null ? ",\"cost_cents\":" + centimes : "") + (bande != null ? ",\"duration_band\":\"" + bande + "\"" : "") + "}";

        private static string CorpsDeCouts(string[] maintenance, string[] rebuild) =>
            "{\"response_meta\":{},\"payload\":{\"data\":{\"maintenance\":[" + string.Join(",", maintenance) + "],\"rebuild\":[" + string.Join(",", rebuild) + "]}}}";

        /// <summary>Le corps du CONTRAT §1.1 (`GET /v1/supply-chain/upkeep-costs`), recopié tel quel. ⚠️ Ses 6 `cost_cents` sont des valeurs d'ILLUSTRATION (store-backed, R2.3) : le client lit ce qui est servi, n'en code AUCUNE.</summary>
        private static readonly string CorpsDuContrat = CorpsDeCouts(
            new[] { LigneDeCout("quick_patch", "5000", "brief"), LigneDeCout("structural_reinforce", "30000", "extended"), LigneDeCout("reroute_bypass", "5000", "immediate") },
            new[] { LigneDeCout("MINIMAL_REROUTE", "10000", "extended"), LigneDeCout("MODERATE_RESTRUCTURE", "40000", "extended"), LigneDeCout("FULL_GEOMETRIC_RESET", "100000", "extended") });

        /// <summary>Un corps de TEST : les MÊMES modes et bandes que le contrat, les valeurs ×7 (35000 · 210000 · 35000 · 70000 · 280000 · 700000) — aucun montant du contrat n'y figure.</summary>
        private static string CorpsDeTest() => CorpsDeCouts(
            new[] { LigneDeCout("quick_patch", "35000", "brief"), LigneDeCout("structural_reinforce", "210000", "extended"), LigneDeCout("reroute_bypass", "35000", "immediate") },
            new[] { LigneDeCout("MINIMAL_REROUTE", "70000", "extended"), LigneDeCout("MODERATE_RESTRUCTURE", "280000", "extended"), LigneDeCout("FULL_GEOMETRIC_RESET", "700000", "extended") });

        private static Transform LigneDuMode(ChaineDApproFeuille f, string modeId) => Trouver(f.Panneau, "Mode_" + modeId);

        private const string Sep = " · ";   // espace, U+00B7, espace — le séparateur du poseur (`poser-chaine-gestes.py:50-52`), écrit ICI à la main

        // ── G-V1 — LireCouts : le contrat lu, ligne par ligne ─────────────────────────────────────

        [Test]
        public void GestesV1a_LireCouts_LeCorpsDuContrat_SixCoutsSixBandes_CinqModesActionnables()
        {
            CoutsServis c = ChaineDApproClient.LireCouts(CorpsDuContrat);
            Assert.IsNotNull(c, "le corps du contrat est lisible");
            // les 6 lignes, valeurs écrites ICI à la main (anti-tautologie)
            var attendu = new[]
            {
                ("quick_patch", "5000", "brief"), ("structural_reinforce", "30000", "extended"), ("reroute_bypass", "5000", "immediate"),
                ("MINIMAL_REROUTE", "10000", "extended"), ("MODERATE_RESTRUCTURE", "40000", "extended"), ("FULL_GEOMETRIC_RESET", "100000", "extended"),
            };
            foreach (var (mode, centimes, bande) in attendu)
            {
                Assert.AreEqual(centimes, c.CentimesServis(mode), mode + " : les centimes SERVIS");
                Assert.AreEqual(bande, c.BandeServie(mode), mode + " : la bande SERVIE");
            }
            Assert.IsNull(c.CentimesServis("INCONNU")); Assert.IsNull(c.CentimesServis(null)); Assert.IsNull(c.BandeServie("INCONNU"));
            // les CINQ modes de la feuille sont actionnables (jeton libre) ; `MODERATE_RESTRUCTURE` est LU, jamais demandé (la feuille n'a pas ce mode)
            int n = 0;
            foreach (SpecDeGeste spec in new[] { ChaineDApproGestes.Entretien, ChaineDApproGestes.Reconstruction })
                foreach (ModeDeGeste m in spec.Modes)
                {
                    n++;
                    Assert.IsTrue(ChaineDApproGestes.Actionnable(m, ChaineDApproGestes.CentimesLisibles(c, m.Id), true), m.Id + " : coût servi ⇒ actionnable");
                }
            Assert.AreEqual(5, n);
            // CONTRÔLE POSITIF : `cost_cents` retiré d'UNE ligne ⇒ CE mode seul n'a plus de coût servi
            CoutsServis sans = ChaineDApproClient.LireCouts(CorpsDeCouts(
                new[] { LigneDeCout("quick_patch", "5000", "brief"), LigneDeCout("structural_reinforce", "30000", "extended"), LigneDeCout("reroute_bypass", null, "immediate") },
                new[] { LigneDeCout("MINIMAL_REROUTE", "10000", "extended"), LigneDeCout("MODERATE_RESTRUCTURE", "40000", "extended"), LigneDeCout("FULL_GEOMETRIC_RESET", "100000", "extended") }));
            Assert.IsNull(sans.CentimesServis("reroute_bypass"), "CONTRÔLE POSITIF : `cost_cents` absent ⇒ ce mode n'est PAS servi (JsonUtility l'aurait lu 0)");
            Assert.IsFalse(ChaineDApproGestes.Actionnable(ChaineDApproGestes.Entretien.Modes[2], ChaineDApproGestes.CentimesLisibles(sans, "reroute_bypass"), true), "…donc éteint");
            Assert.AreEqual("5000", sans.CentimesServis("quick_patch"), "…et les autres modes restent servis");
            Assert.AreEqual("immediate", sans.BandeServie("reroute_bypass"), "la bande de la ligne reste LUE (c'est `SousTitreDuMode` qui ne la dit pas sans coût : G-V1c)");
        }

        [Test]
        public void GestesV1b_LireCouts_PresenceLueDansLeCorpsBrut_AbsentNonEntierDoubleCorpsIllisible()
        {
            // `cost_cents` : un ENTIER JSON non négatif, rien d'autre
            foreach (string faux in new[] { "5000.5", "\"5000\"", "null", "1e3", "-5", "true", "[5000]", "{\"v\":5000}" })
            {
                CoutsServis c = ChaineDApproClient.LireCouts("{\"payload\":{\"data\":{\"maintenance\":[{\"mode\":\"quick_patch\",\"cost_cents\":" + faux + ",\"duration_band\":\"brief\"}],\"rebuild\":[]}}}");
                Assert.IsNotNull(c, faux);
                Assert.IsNull(c.CentimesServis("quick_patch"), "cost_cents = " + faux + " ⇒ non servi");
            }
            // un montant au-delà d'un int64 survit, en chaîne (BigInt) : `JsonUtility` l'aurait tronqué
            CoutsServis gros = ChaineDApproClient.LireCouts(CorpsDeCouts(new[] { LigneDeCout("quick_patch", "12345678901234567890", "brief") }, new string[0]));
            Assert.AreEqual("12345678901234567890", gros.CentimesServis("quick_patch"));
            Assert.AreEqual(Argent.DepuisCentimes("12345678901234567890", "fr"), Argent.DepuisCentimes(gros.CentimesServis("quick_patch"), "fr"));
            // un `cost_cents` d'un SOUS-OBJET (bon nom, mauvaise profondeur) ne compte pas ; un mot dans une chaîne non plus
            CoutsServis imbrique = ChaineDApproClient.LireCouts("{\"payload\":{\"data\":{\"maintenance\":[{\"mode\":\"quick_patch\",\"detail\":{\"cost_cents\":5000},\"note\":\"\\\"cost_cents\\\":5000\"}],\"rebuild\":[]}}}");
            Assert.IsNull(imbrique.CentimesServis("quick_patch"), "seule la clé du PREMIER niveau est lue");
            // un `mode` servi DEUX FOIS n'est pas servi (coût ET bande) : on ne choisit pas ; les autres modes le restent
            CoutsServis doublon = ChaineDApproClient.LireCouts(CorpsDeCouts(
                new[] { LigneDeCout("quick_patch", "5000", "brief"), LigneDeCout("quick_patch", "9000", "extended"), LigneDeCout("reroute_bypass", "5000", "immediate") },
                new[] { LigneDeCout("MINIMAL_REROUTE", "10000", "extended") }));
            Assert.IsNull(doublon.CentimesServis("quick_patch")); Assert.IsNull(doublon.BandeServie("quick_patch"));
            Assert.AreEqual("5000", doublon.CentimesServis("reroute_bypass")); Assert.AreEqual("10000", doublon.CentimesServis("MINIMAL_REROUTE"));
            // `duration_band` hors de l'union (absent, autre mot, pas une chaîne) ⇒ bande nulle, le coût reste servi
            CoutsServis bandes = ChaineDApproClient.LireCouts(CorpsDeCouts(
                new[] { LigneDeCout("quick_patch", "5000", "weekly"), LigneDeCout("structural_reinforce", "30000", null), LigneDeCout("reroute_bypass", "5000", "immediate") },
                new[] { "{\"mode\":\"MINIMAL_REROUTE\",\"cost_cents\":10000,\"duration_band\":3}" }));
            Assert.IsNull(bandes.BandeServie("quick_patch")); Assert.IsNull(bandes.BandeServie("structural_reinforce")); Assert.IsNull(bandes.BandeServie("MINIMAL_REROUTE"));
            Assert.AreEqual("5000", bandes.CentimesServis("quick_patch")); Assert.AreEqual("30000", bandes.CentimesServis("structural_reinforce"));
            Assert.AreEqual("immediate", bandes.BandeServie("reroute_bypass"), "CONTRÔLE POSITIF : une bande de l'union est lue");
            // une ligne illisible est ignorée, les autres sont lues — ANALYSE STRICTE : entre deux membres, exactement UNE virgule (blancs permis)
            string voisine = LigneDeCout("reroute_bypass", "5000", "immediate");
            foreach (string abime in new[]
            {
                "{\"mode\":\"quick_patch\" \"cost_cents\":1}",                                           // deux membres SANS virgule
                "{\"mode\":\"quick_patch\",\"cost_cents\":1 \"duration_band\":\"brief\"}",              // sans virgule, après un nombre
                "{,\"mode\":\"quick_patch\",\"cost_cents\":1}",                                          // virgule de TÊTE
                "{\"mode\":\"quick_patch\",\"cost_cents\":1,}",                                          // virgule FINALE
                "{\"mode\":\"quick_patch\",,\"cost_cents\":1}",                                          // DEUX virgules de suite
                "{\"mode\":\"quick_patch\",\"cost_cents\":1 2}",                                         // littéral nu mal formé
            })
            {
                CoutsServis c = ChaineDApproClient.LireCouts(CorpsDeCouts(new[] { abime, voisine }, new string[0]));
                Assert.IsNotNull(c, abime);
                Assert.IsNull(c.CentimesServis("quick_patch"), "ligne illisible ⇒ ignorée : " + abime);
                Assert.AreEqual("5000", c.CentimesServis("reroute_bypass"), "…et la ligne voisine est lue : " + abime);
            }
            // une ligne TRONQUÉE emporte son tableau (l'objet ne se referme jamais) : aucun coût servi, jamais un coût lu dans un corps qui n'en est pas un
            CoutsServis tronque = ChaineDApproClient.LireCouts("{\"payload\":{\"data\":{\"maintenance\":[{\"mode\":\"quick_patch\",\"cost_cents\":1");
            Assert.IsNull(tronque.CentimesServis("quick_patch"), "corps tronqué ⇒ rien de servi");
            // CONTRÔLE POSITIF : la même ligne BIEN formée, avec des blancs partout autour des virgules et des deux-points, est lue
            CoutsServis blancs = ChaineDApproClient.LireCouts(CorpsDeCouts(new[] { "{ \"mode\" : \"quick_patch\" ,\n \"cost_cents\" : 1 , \"duration_band\" : \"brief\" }", voisine }, new string[0]));
            Assert.AreEqual("1", blancs.CentimesServis("quick_patch"), "CONTRÔLE POSITIF : une virgule et des blancs permis ⇒ lue"); Assert.AreEqual("brief", blancs.BandeServie("quick_patch"));
            // un champ RÉPÉTÉ dans UNE MÊME ligne (≠ un mode sur deux lignes) : CE champ n'est pas servi, les autres le restent
            CoutsServis cDouble = ChaineDApproClient.LireCouts(CorpsDeCouts(new[] { "{\"mode\":\"quick_patch\",\"cost_cents\":1,\"cost_cents\":2,\"duration_band\":\"brief\"}", voisine }, new string[0]));
            Assert.IsNull(cDouble.CentimesServis("quick_patch"), "`cost_cents` répété dans la ligne ⇒ non servi"); Assert.AreEqual("brief", cDouble.BandeServie("quick_patch"), "…la bande, non répétée, l'est");
            CoutsServis bDouble = ChaineDApproClient.LireCouts(CorpsDeCouts(new[] { "{\"mode\":\"quick_patch\",\"cost_cents\":5000,\"duration_band\":\"brief\",\"duration_band\":\"extended\"}", voisine }, new string[0]));
            Assert.AreEqual("5000", bDouble.CentimesServis("quick_patch")); Assert.IsNull(bDouble.BandeServie("quick_patch"), "`duration_band` répétée dans la ligne ⇒ pas de bande");
            CoutsServis mDouble = ChaineDApproClient.LireCouts(CorpsDeCouts(new[] { "{\"mode\":\"quick_patch\",\"mode\":\"reroute_bypass\",\"cost_cents\":7}", voisine }, new string[0]));
            Assert.IsNull(mDouble.CentimesServis("quick_patch"), "`mode` répété dans la ligne ⇒ la ligne ne sert aucun mode"); Assert.AreEqual("5000", mDouble.CentimesServis("reroute_bypass"), "…et ne prend pas la place de la ligne voisine");
            // un corps sans `payload.data`, vide ou illisible ⇒ null (comme `LireGraphe`), jamais une exception
            Assert.IsNull(ChaineDApproClient.LireCouts("{\"payload\":{}}"));
            Assert.IsNull(ChaineDApproClient.LireCouts("pas du json"));
            Assert.IsNull(ChaineDApproClient.LireCouts(null));
            // un `data` sans tableau ne sert aucun coût, sans être illisible
            CoutsServis vide = ChaineDApproClient.LireCouts("{\"payload\":{\"data\":{}}}");
            Assert.IsNotNull(vide); Assert.IsNull(vide.CentimesServis("quick_patch"));
        }

        [UnityTest]
        public IEnumerator GestesV1c_LaFeuille_CoutRetire_ModeEteint_OnNeSaitPasEncoreCombien_ControleLeCorpsComplet()
        {
            Servir();
            var ecran = Monte();
            yield return null;
            string absent = ValeurAttendue.Cle("appro.cout.on_ne_sait_pas_encore_combien", "On ne sait pas encore combien.");

            // `cost_cents` retiré de `reroute_bypass` : CE mode est éteint et le dit ; les deux autres agissent
            ecran.Couts = ChaineDApproClient.LireCouts(CorpsDeCouts(
                new[] { LigneDeCout("quick_patch", "5000", "brief"), LigneDeCout("structural_reinforce", "30000", "extended"), LigneDeCout("reroute_bypass", null, "immediate") },
                new[] { LigneDeCout("MINIMAL_REROUTE", "10000", "extended"), LigneDeCout("MODERATE_RESTRUCTURE", "40000", "extended"), LigneDeCout("FULL_GEOMETRIC_RESET", "100000", "extended") }));
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            Assert.IsFalse(ecran.Feuille.BoutonDuMode("reroute_bypass").interactable, "coût retiré ⇒ ce mode est éteint");
            Assert.IsTrue(ecran.Feuille.BoutonDuMode("quick_patch").interactable); Assert.IsTrue(ecran.Feuille.BoutonDuMode("structural_reinforce").interactable);
            Assert.AreEqual(absent, TexteDe(LigneDuMode(ecran.Feuille, "reroute_bypass"), "Cout"), "…et dit « On ne sait pas encore combien. »");
            Assert.AreEqual(1, Regex.Matches(string.Join("|", ecran.Feuille.Textes), Regex.Escape(absent)).Count, "UN seul mode est sans coût");
            // M1 (revue ⊥ 1) : un mode dont le coût n'est PAS servi n'annonce pas de durée — sa bande (`immediate`, servie) n'est PAS dite : la conséquence SEULE
            Assert.AreEqual("la liaison se repose : plus rien n’y passe tant qu’elle n’a pas récupéré", TexteDe(LigneDuMode(ecran.Feuille, "reroute_bypass"), "Sous"), "coût non servi (bande servie) ⇒ conséquence seule, ni « tout de suite » ni séparateur");
            Assert.AreEqual("quelques minutes" + Sep + "l’usure retombe, sans disparaître", TexteDe(LigneDuMode(ecran.Feuille, "quick_patch"), "Sous"), "…alors qu'un mode dont le coût ET la bande sont servis la dit");

            // CONTRÔLE POSITIF : le corps COMPLET ⇒ les trois modes agissent, plus aucun « On ne sait pas encore combien. »
            ecran.Couts = ChaineDApproClient.LireCouts(CorpsDuContrat);
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            foreach (ModeDeGeste m in ChaineDApproGestes.Entretien.Modes) Assert.IsTrue(ecran.Feuille.BoutonDuMode(m.Id).interactable, "CONTRÔLE POSITIF : " + m.Id + " servi ⇒ actionnable (jeton libre)");
            CollectionAssert.DoesNotContain(ecran.Feuille.Textes, absent, "CONTRÔLE POSITIF : le corps complet ne laisse aucun mode sans coût");
            Assert.AreEqual("tout de suite" + Sep + "la liaison se repose : plus rien n’y passe tant qu’elle n’a pas récupéré", TexteDe(LigneDuMode(ecran.Feuille, "reroute_bypass"), "Sous"), "CONTRÔLE POSITIF (M1) : `cost_cents` servi ⇒ la bande `immediate` est dite — la garde ci-dessus pouvait rougir");
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Reconstruction, CibleRoute());
            yield return null;
            foreach (ModeDeGeste m in ChaineDApproGestes.Reconstruction.Modes) Assert.IsTrue(ecran.Feuille.BoutonDuMode(m.Id).interactable, "CONTRÔLE POSITIF : " + m.Id + " servi ⇒ actionnable");
        }

        // ── G-V2 — les montants sont ceux du CORPS, jamais ceux du contrat ───────────────────────────

        [UnityTest]
        public IEnumerator GestesV2_LaFeuille_MontreLesMontantsDuCorps_AucunMontantDuContrat()
        {
            Servir();
            var ecran = Monte();
            yield return null;
            ecran.Couts = ChaineDApproClient.LireCouts(CorpsDeTest());
            string[] duContrat = { "5000", "30000", "10000", "40000", "100000" };   // les montants du contrat §1.1 : des ILLUSTRATIONS, jamais codés

            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            Assert.AreEqual(Argent.DepuisCentimes("35000", "fr"), TexteDe(LigneDuMode(ecran.Feuille, "quick_patch"), "Cout"));
            Assert.AreEqual(Argent.DepuisCentimes("210000", "fr"), TexteDe(LigneDuMode(ecran.Feuille, "structural_reinforce"), "Cout"));
            Assert.AreEqual(Argent.DepuisCentimes("35000", "fr"), TexteDe(LigneDuMode(ecran.Feuille, "reroute_bypass"), "Cout"));
            foreach (string c in duContrat) CollectionAssert.DoesNotContain(ecran.Feuille.Textes, Argent.DepuisCentimes(c, "fr"), "le montant du contrat " + c + " n'est pas codé en dur");

            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Reconstruction, CibleRoute());
            yield return null;
            Assert.AreEqual(Argent.DepuisCentimes("70000", "fr"), TexteDe(LigneDuMode(ecran.Feuille, "MINIMAL_REROUTE"), "Cout"));
            Assert.AreEqual(Argent.DepuisCentimes("700000", "fr"), TexteDe(LigneDuMode(ecran.Feuille, "FULL_GEOMETRIC_RESET"), "Cout"));
            CollectionAssert.DoesNotContain(ecran.Feuille.Textes, Argent.DepuisCentimes("280000", "fr"), "le coût de `MODERATE_RESTRUCTURE` (lu) n'est pas dit : la feuille n'a pas ce mode");
            foreach (string c in duContrat) CollectionAssert.DoesNotContain(ecran.Feuille.Textes, Argent.DepuisCentimes(c, "fr"), "le montant du contrat " + c + " n'est pas codé en dur");

            // CONTRÔLE : avec le corps du CONTRAT, ses montants SONT dits — la vérification ci-dessus a donc des dents
            ecran.Couts = ChaineDApproClient.LireCouts(CorpsDuContrat);
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            CollectionAssert.Contains(ecran.Feuille.Textes, Argent.DepuisCentimes("5000", "fr"), "CONTRÔLE : le corps du contrat montre « 50 € » — le test de 'aucun montant du contrat' pouvait donc rougir");
            CollectionAssert.DoesNotContain(ecran.Feuille.Textes, Argent.DepuisCentimes("35000", "fr"), "…et les montants du corps de test s'en vont");
        }

        // ── G-V3 — le sous-titre d'un mode d'entretien dit la bande SERVIE ───────────────────────────

        [UnityTest]
        public IEnumerator GestesV3_SousTitreDEntretien_LeMotDeLaBandeServie_AbsenteConsequenceSeule_Reconstruction_ConsequenceSeule()
        {
            Servir();
            var ecran = Monte();
            yield return null;

            // `brief` servie pour `structural_reinforce` ⇒ « quelques minutes · l’usure est effacée »
            ecran.Couts = ChaineDApproClient.LireCouts(CorpsDeCouts(
                new[] { LigneDeCout("quick_patch", "5000", "immediate"), LigneDeCout("structural_reinforce", "30000", "brief"), LigneDeCout("reroute_bypass", "5000", null) }, new string[0]));
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            Assert.AreEqual("quelques minutes" + Sep + "l’usure est effacée", TexteDe(LigneDuMode(ecran.Feuille, "structural_reinforce"), "Sous"));
            Assert.AreEqual("tout de suite" + Sep + "l’usure retombe, sans disparaître", TexteDe(LigneDuMode(ecran.Feuille, "quick_patch"), "Sous"), "`immediate` ⇒ « tout de suite »");
            // bande ABSENTE ⇒ la conséquence seule (on ne devine pas une durée)
            Assert.AreEqual("la liaison se repose : plus rien n’y passe tant qu’elle n’a pas récupéré", TexteDe(LigneDuMode(ecran.Feuille, "reroute_bypass"), "Sous"), "bande absente ⇒ conséquence seule, sans mot ni séparateur");

            // CONTRÔLE POSITIF : `extended` ⇒ « plus longtemps · … »
            ecran.Couts = ChaineDApproClient.LireCouts(CorpsDeCouts(
                new[] { LigneDeCout("quick_patch", "5000", "brief"), LigneDeCout("structural_reinforce", "30000", "extended"), LigneDeCout("reroute_bypass", "5000", "immediate") }, new string[0]));
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            Assert.AreEqual("plus longtemps" + Sep + "l’usure est effacée", TexteDe(LigneDuMode(ecran.Feuille, "structural_reinforce"), "Sous"), "CONTRÔLE POSITIF : `extended` ⇒ « plus longtemps »");
            Assert.AreEqual("quelques minutes" + Sep + "l’usure retombe, sans disparaître", TexteDe(LigneDuMode(ecran.Feuille, "quick_patch"), "Sous"));

            // la bande n'entre JAMAIS dans l'espace i18n : le MOT est une clé (`appro.etiquette.quelques_minutes`), la valeur servie `brief` n'en est pas une
            Servir(("appro.etiquette.quelques_minutes", "a few minutes"));
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            Assert.AreEqual("a few minutes" + Sep + "l’usure retombe, sans disparaître", TexteDe(LigneDuMode(ecran.Feuille, "quick_patch"), "Sous"), "le mot de la bande est servi par le catalogue (clé dérivée du MOT)");
            Servir();

            // RECONSTRUCTION : la conséquence seule, quelle que soit la bande lue (`rebuild[].duration_band` ne discrimine rien ; la durée est dite par la phrase commune)
            ecran.Couts = ChaineDApproClient.LireCouts(CorpsDuContrat);
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Reconstruction, CibleRoute());
            yield return null;
            Assert.AreEqual("on contourne ce qui gêne, au plus près", TexteDe(LigneDuMode(ecran.Feuille, "MINIMAL_REROUTE"), "Sous"));
            Assert.AreEqual("on repart d’un trajet droit, sans tenir compte de l’usure", TexteDe(LigneDuMode(ecran.Feuille, "FULL_GEOMETRIC_RESET"), "Sous"));
            foreach (string t in ecran.Feuille.Textes) StringAssert.DoesNotContain("plus longtemps", t, "la bande de `rebuild` est lue, jamais affichée");
        }

        // ── G-V4 — le refus d'argent : la phrase de la clé SERVIE du corps ──────────────────────────

        private const string CleFonds = "error.funds.insufficient";
        private const string PhraseFonds = "Pas assez d’argent pour ça.";
        private const string CorpsFonds = "{\"payload\":{\"error\":{\"code\":\"INSUFFICIENT_FUNDS\",\"http_status\":409,\"user_facing_i18n_key\":\"error.funds.insufficient\",\"payload_vars\":null,\"details\":null}}}";

        [UnityTest]
        public IEnumerator GestesV4_UnRefusDArgent_409_LaPhraseServie_ControleCleNonServie_AucunePhrase()
        {
            Servir((CleFonds, PhraseFonds));
            var ecran = Monte();
            ecran.Couts = new CoutsDeTest().ToutServi("12300");
            yield return null;
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            ecran.RefuserPourTest(409, CorpsFonds);
            Assert.IsTrue(ecran.Feuille.EstOuverte, "un refus ne ferme pas la feuille");
            Assert.AreEqual(PhraseFonds, ecran.Feuille.DernierePhraseMontree, "la phrase SERVIE de `error.funds.insufficient` est dite par la feuille");
            Assert.AreEqual(PhraseFonds, TexteDe(ecran.Feuille.Panneau, "Phrase"));
            Assert.IsTrue(Trouver(ecran.Feuille.Panneau, "Refus").gameObject.activeSelf, "la zone du refus est visible");

            // CONTRÔLE POSITIF : la clé n'est pas servie (la pile d'aujourd'hui) ⇒ AUCUNE phrase — jamais une phrase du client à la place
            Servir();
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            ecran.RefuserPourTest(409, CorpsFonds);
            Assert.IsNull(ecran.Feuille.DernierePhraseMontree, "CONTRÔLE POSITIF : clé non servie ⇒ aucune phrase");
            CollectionAssert.DoesNotContain(ecran.Feuille.Textes, PhraseFonds);
        }

        // ── G-V5 — la lecture des coûts : n'écrase pas une injection, échoue en silence ──────────────

        [Test]
        public void GestesV5a_CoutsApresLecture_UneInjectionDeTestSurvit_UnEchecRendCoutsNonServis()
        {
            var injecte = new CoutsDeTest().ToutServi("12300");
            CoutsServis lus = ChaineDApproClient.LireCouts(CorpsDuContrat);
            Assert.AreSame(injecte, ChaineDApproScreenController.CoutsApresLecture(injecte, lus), "un Couts INJECTÉ n'est pas écrasé par une lecture réussie…");
            Assert.AreSame(injecte, ChaineDApproScreenController.CoutsApresLecture(injecte, null), "…ni par un échec");
            Assert.AreSame(lus, ChaineDApproScreenController.CoutsApresLecture(CoutsNonServis.Instance, lus), "2xx lisible ⇒ CoutsServis");
            Assert.AreSame(lus, ChaineDApproScreenController.CoutsApresLecture(null, lus));
            Assert.AreSame(lus, ChaineDApproScreenController.CoutsApresLecture(ChaineDApproClient.LireCouts(CorpsDeTest()), lus), "un CoutsServis est remplacé par la lecture suivante");
            Assert.AreSame(CoutsNonServis.Instance, ChaineDApproScreenController.CoutsApresLecture(lus, null), "tout échec (404, réseau, corps illisible) ⇒ CoutsNonServis");
            Assert.AreSame(CoutsNonServis.Instance, ChaineDApproScreenController.CoutsApresLecture(CoutsNonServis.Instance, null));
            // CONTRÔLE POSITIF : la règle fautive « toujours écraser » rendrait `lus` pour l'injection — la garde le voit
            Assert.AreNotSame(lus, ChaineDApproScreenController.CoutsApresLecture(injecte, lus), "CONTRÔLE POSITIF : écraser l'injection serait rendre `lus`");
        }

        [UnityTest]
        public IEnumerator GestesV5b_PortFerme_LaLectureDesCouts_EstSilencieuse_CoutsNonServis_ErreurInchangee()
        {
            Servir();
            var ecran = Monte();
            yield return null;
            ecran.PoserLAdresseDuBackPourTest("http://127.0.0.1:9");   // un port fermé ⇒ `responseCode == 0` : l'échec du GET, sans simulacre
            long codeAvant = ecran.DernierCodeErreur; string erreurAvant = ecran.DerniereErreur, phraseAvant = ecran.PhraseDuRefus;

            // une injection de test n'est ni écrasée ni lue
            var injecte = new CoutsDeTest().ToutServi("12300");
            ecran.Couts = injecte;
            yield return ecran.RelireLesCoutsPourTest();
            Assert.AreSame(injecte, ecran.Couts, "un Couts injecté n'est pas écrasé par `RechargerChaine`");

            // des coûts LUS (CoutsServis) + un GET qui échoue ⇒ CoutsNonServis, en silence
            ecran.Couts = ChaineDApproClient.LireCouts(CorpsDuContrat);
            Assert.IsInstanceOf<CoutsServis>(ecran.Couts, "prémisse : des coûts lus");
            yield return ecran.RelireLesCoutsPourTest();
            Assert.AreSame(CoutsNonServis.Instance, ecran.Couts, "échec du GET ⇒ CoutsNonServis");
            Assert.AreEqual(erreurAvant, ecran.DerniereErreur, "…`DerniereErreur` inchangée");
            Assert.AreEqual(phraseAvant, ecran.PhraseDuRefus, "…`PhraseDuRefus` inchangée");
            Assert.AreEqual(codeAvant, ecran.DernierCodeErreur, "…aucun code d'erreur posé");
            Assert.IsNull(ecran.DerniereErreur, "une route absente n'est pas une panne de l'écran");
        }

        [UnityTest]
        public IEnumerator GestesV5c_SurLaPile_LaLectureDesCouts_EstSilencieuse_NonServis_OuServiComplet()
        {
            // ⚠️ Écrite pour le jour où BACK-1 est sur la pile : aujourd'hui la route répond 404 (`CoutsNonServis`) ; servie, elle doit rendre 3 + 3 lignes complètes (contrat §1.1)
            yield return OuvrirJoueurFrais();
            Servir();
            var ecran = MonterEcran();
            ecran.SetToken(token);
            ecran.RendrePourTestChaine(Graphe(), Batiments());
            yield return null;
            yield return ecran.RelireLesCoutsPourTest();
            Assert.IsNull(ecran.DerniereErreur, "la lecture des coûts est silencieuse : " + ecran.DerniereErreur);
            Assert.IsNull(ecran.PhraseDuRefus);
            Assert.AreEqual(0, ecran.DernierCodeErreur);
            if (ecran.Couts is CoutsServis)
                foreach (string mode in new[] { "quick_patch", "structural_reinforce", "reroute_bypass", "MINIMAL_REROUTE", "MODERATE_RESTRUCTURE", "FULL_GEOMETRIC_RESET" })
                {
                    Assert.IsNotNull(ecran.Couts.CentimesServis(mode), mode + " : `cost_cents` servi");
                    Assert.Greater(decimal.Parse(ecran.Couts.CentimesServis(mode), System.Globalization.CultureInfo.InvariantCulture), 0m, mode + " : un coût > 0");
                    Assert.IsNotNull(ecran.Couts.BandeServie(mode), mode + " : `duration_band` ∈ {immediate, brief, extended}");
                }
            else Assert.IsInstanceOf<CoutsNonServis>(ecran.Couts, "la route n'est pas (encore) servie : les modes sont éteints");
        }

        // ── G-V6 — les clés : celles du contrat, le repli est le FR servi À L'OCTET ─────────────────

        /// <summary>Les 22 clés du contrat ㉚ §1.5 et leur FR, écrits ICI à la main (anti-tautologie), À L'OCTET : U+00A0 devant « : » de `consequence.contourner` (EN CLAIR), apostrophes U+2019.</summary>
        private static readonly (string cle, string fr)[] FrDuContrat =
        {
            ("appro.titre.entretenir_la_liaison", "Entretenir la liaison"),
            ("appro.titre.reconstruire_la_route", "Reconstruire la route"),
            ("appro.etiquette.rafistoler", "Rafistoler"),
            ("appro.etiquette.renforcer", "Renforcer"),
            ("appro.etiquette.contourner", "Contourner"),
            ("appro.etiquette.petit_detour", "Petit détour"),
            ("appro.etiquette.remaniement", "Remaniement"),
            ("appro.etiquette.remise_a_plat", "Remise à plat"),
            ("appro.etiquette.quelques_minutes", "quelques minutes"),
            ("appro.etiquette.plus_longtemps", "plus longtemps"),
            ("appro.etiquette.tout_de_suite", "tout de suite"),
            ("appro.etiquette.en_entretien", "en entretien"),
            ("appro.consequence.rafistoler", "l’usure retombe, sans disparaître"),
            ("appro.consequence.renforcer", "l’usure est effacée"),
            ("appro.consequence.contourner", "la liaison se repose : plus rien n’y passe tant qu’elle n’a pas récupéré"),
            ("appro.consequence.petit_detour", "on contourne ce qui gêne, au plus près"),
            ("appro.consequence.remaniement", "on redessine une bonne partie du trajet"),
            ("appro.consequence.remise_a_plat", "on repart d’un trajet droit, sans tenir compte de l’usure"),
            ("appro.sous_titre.pendant_les_travaux_plus_rien_ne_passe_sur_cette_route", "Pendant les travaux, plus rien ne passe sur cette route."),
            ("appro.cout.on_ne_sait_pas_encore_combien", "On ne sait pas encore combien."),
            ("accueil.jeton.votre_grande_decision_du_jour", "votre grande décision du jour"),
            ("error.funds.insufficient", "Pas assez d’argent pour ça."),
        };

        /// <summary>Les clés du contrat que la feuille ne lit PAS : `remaniement` ×2 (le mode est retiré de la feuille), `en_entretien` (la ligne de la chaîne), `error.funds.insufficient` (par la clé du corps du refus).</summary>
        private static readonly string[] ClesDuContratNonLuesParLaFeuille =
        {
            "appro.etiquette.remaniement", "appro.consequence.remaniement", "appro.etiquette.en_entretien", "error.funds.insufficient",
        };

        /// <summary>Le texte rendu par la feuille pour `cle` porte-t-il `fr` À L'OCTET ? Une conséquence est la fin d'un sous-titre (derrière le mot de bande et son séparateur, ou seule) ; un mot de bande en est le début.</summary>
        private static bool LeRepliPorte(List<string> textes, string cle, string fr)
        {
            if (cle.StartsWith("appro.consequence.", StringComparison.Ordinal))
                return textes.Exists(t => string.Equals(t, fr, StringComparison.Ordinal) || t.EndsWith(Sep + fr, StringComparison.Ordinal));
            if (cle == "appro.etiquette.quelques_minutes" || cle == "appro.etiquette.plus_longtemps" || cle == "appro.etiquette.tout_de_suite")
                return textes.Exists(t => t.StartsWith(fr + Sep, StringComparison.Ordinal));
            return textes.Exists(t => string.Equals(t, fr, StringComparison.Ordinal));
        }

        [UnityTest]
        public IEnumerator GestesV6_LesClesLuesParLaFeuille_SontCellesDuContrat_LeRepliEstLeFrServiALOctet_ControleLeU00A0()
        {
            var contrat = new Dictionary<string, string>();
            foreach (var (cle, fr) in FrDuContrat) contrat[cle] = fr;
            Assert.AreEqual(22, contrat.Count, "le contrat ㉚ §1.5 : 22 clés");
            // la table elle-même, au point de code : U+00A0 devant « : » de `contourner`, aucune apostrophe U+0027, aucun espace insécable ailleurs
            string contourner = contrat["appro.consequence.contourner"];
            int deuxPoints = contourner.IndexOf(':');
            Assert.AreEqual(0x00A0, (int)contourner[deuxPoints - 1], "prémisse : U+00A0 devant « : »");
            foreach (var (cle, fr) in FrDuContrat)
            {
                Assert.AreEqual(-1, fr.IndexOf('\''), cle + " : aucune apostrophe U+0027 (toutes U+2019)");
                if (cle != "appro.consequence.contourner") Assert.AreEqual(-1, fr.IndexOf((char)0x00A0), cle + " : pas d'U+00A0 hors `contourner`");
            }

            Servir();   // un catalogue SANS ces clés : on mesure les REPLIS
            var ecran = Monte();
            yield return null;
            Libelle.RemettreLesCompteurs();   // après la chaîne, AVANT les feuilles : on ne compte que ce que la feuille lit
            ecran.Couts = CoutsEtBandes();
            var textes = new List<string>();
            foreach (SpecDeGeste spec in new[] { ChaineDApproGestes.Entretien, ChaineDApproGestes.Reconstruction })
            {
                ecran.OuvrirLaFeuillePourTest(spec, spec == ChaineDApproGestes.Entretien ? CibleLiaison() : CibleRoute());
                yield return null;
                textes.AddRange(ecran.Feuille.Textes);
            }
            // un coût absent : « On ne sait pas encore combien. »
            ecran.Couts = CoutsNonServis.Instance;
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            textes.AddRange(ecran.Feuille.Textes);
            var observees = new List<string>(Libelle.ClesEnRepli);
            Assert.Greater(observees.Count, 15, "anti-vacuité : la feuille a demandé ses clés");

            // (1) chaque clé lue ∈ (22 du contrat ∪ REUSE servis ∪ dérivées restantes — aucune)
            string[] reuse = { "appro.bouton.ca_part_du_compte_tout_de_suite", "game.ui_common.cancel_button" };
            var inconnues = observees.FindAll(k => !contrat.ContainsKey(k) && Array.IndexOf(reuse, k) < 0);
            Assert.IsEmpty(inconnues, "clé(s) lue(s) par la feuille hors du contrat ㉚ et des REUSE : " + string.Join(" · ", inconnues));
            // (2) les 18 clés du contrat que la feuille lit le sont TOUTES ; les 4 autres ne le sont pas
            var lues = new List<string>(contrat.Keys);
            lues.RemoveAll(k => Array.IndexOf(ClesDuContratNonLuesParLaFeuille, k) >= 0);
            Assert.AreEqual(18, lues.Count);
            foreach (string k in lues) CollectionAssert.Contains(observees, k, "la feuille doit lire " + k);
            foreach (string k in ClesDuContratNonLuesParLaFeuille) CollectionAssert.DoesNotContain(observees, k, "la feuille ne lit pas " + k);
            // (3) le repli de chaque clé lue == le FR du contrat À L'OCTET (ordinal), tel que RENDU
            foreach (string k in lues) Assert.IsTrue(LeRepliPorte(textes, k, contrat[k]), "le repli de " + k + " n'est pas le FR du contrat à l'octet : « " + contrat[k] + " »");

            // CONTRÔLE POSITIF : l'U+00A0 de `consequence.contourner` remplacé par une espace ordinaire (le défaut d'avant) ⇒ la garde rougit ; U+202F (espace fine) aussi
            Assert.IsTrue(LeRepliPorte(textes, "appro.consequence.contourner", contourner), "prémisse : le vrai repli porte U+00A0");
            Assert.IsFalse(LeRepliPorte(textes, "appro.consequence.contourner", contourner.Replace((char)0x00A0, ' ')), "CONTRÔLE POSITIF : U+0020 à la place de U+00A0 est refusé");
            Assert.IsFalse(LeRepliPorte(textes, "appro.consequence.contourner", contourner.Replace((char)0x00A0, (char)0x202F)), "CONTRÔLE POSITIF : U+202F à la place de U+00A0 est refusé");
            // …et une apostrophe U+0027 à la place d'U+2019 aussi
            Assert.IsFalse(LeRepliPorte(textes, "appro.consequence.renforcer", contrat["appro.consequence.renforcer"].Replace((char)0x2019, '\'')), "CONTRÔLE POSITIF : U+0027 à la place d'U+2019 est refusé");
        }

        // ═══ B1 — « Remaniement » est RETIRÉ de la feuille « Reconstruire » ═════════════════════════

        [UnityTest]
        public IEnumerator GestesB1_LaFeuilleReconstruire_NeProposeQueDeuxModes_UnCorpsDeCoutsATroisLignesNeLEnRajoutePas()
        {
            Servir();
            var ecran = Monte();
            // le back continue de servir `MODERATE_RESTRUCTURE` dans `rebuild[]` (contrat ㉚ §1.1 : toujours 3 lignes) : trois lignes de coût LUES du corps, deux modes à la feuille
            CoutsServis lus = ChaineDApproClient.LireCouts(CorpsDeTest());
            Assert.AreEqual("280000", lus.CentimesServis("MODERATE_RESTRUCTURE"), "prémisse : la troisième ligne est LUE");
            ecran.Couts = lus;
            yield return null;
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Reconstruction, CibleRoute());
            yield return null;
            var lignes = new List<string>();
            foreach (Transform t in ecran.Feuille.Panneau) if (t.name.StartsWith("Mode_", StringComparison.Ordinal)) lignes.Add(t.name);
            CollectionAssert.AreEquivalent(new[] { "Mode_MINIMAL_REROUTE", "Mode_FULL_GEOMETRIC_RESET" }, lignes, "DEUX lignes de mode seulement : la troisième ligne de coût est IGNORÉE, sans exception");
            Assert.IsNull(ecran.Feuille.BoutonDuMode("MODERATE_RESTRUCTURE"), "aucun bouton pour le mode retiré");
            CollectionAssert.DoesNotContain(ecran.Feuille.Textes, Argent.DepuisCentimes("280000", "fr"), "le coût du mode retiré n'est pas dit");
            CollectionAssert.DoesNotContain(ecran.Feuille.Textes, ValeurAttendue.Cle("appro.etiquette.remaniement", "Remaniement"), "ni son mot");
            Assert.AreEqual(2, ChaineDApproGestes.Reconstruction.Modes.Length);
            // CONTRÔLE POSITIF : l'entretien garde ses TROIS modes (le compte n'est pas écrasé partout)
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            int n = 0;
            foreach (Transform t in ecran.Feuille.Panneau) if (t.name.StartsWith("Mode_", StringComparison.Ordinal)) n++;
            Assert.AreEqual(3, n, "CONTRÔLE POSITIF : entretenir propose trois modes");
        }

        // ═══ M1 — la feuille s'ancre AU-DESSUS du chrome du shell ══════════════════════════════════

        [UnityTest]
        public IEnumerator GestesM1_LePanneau_SAncreAuDessusDeLInsetBasDuShell_ControleInsetIgnore()
        {
            const float inset = 120f;
            ShellChrome.PublierInsets(0f, inset);
            try
            {
                Servir();
                var ecran = Monte();
                yield return null;
                ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
                yield return null;
                Canvas.ForceUpdateCanvases();
                var racine = (RectTransform)RacineEcran().transform;
                float Bas() { var c = new Vector3[4]; ecran.Feuille.Panneau.GetWorldCorners(c); return racine.InverseTransformPoint(c[0]).y - racine.rect.yMin; }
                Assert.GreaterOrEqual(Bas(), inset - 0.5f, "le BAS du panneau (et « Annuler ») est au-dessus de l'inset publié par le shell");
                // le voile, lui, reste plein écran : il barre tout le clic
                var vc = new Vector3[4]; ecran.Feuille.Voile.GetWorldCorners(vc);
                Assert.LessOrEqual(racine.InverseTransformPoint(vc[0]).y - racine.rect.yMin, 0.5f, "le voile couvre aussi le bas de l'écran");

                // CONTRÔLE POSITIF : un panneau ancré à 0 (l'inset ignoré) est MESURÉ sous la barre — la garde rougit
                ecran.Feuille.Panneau.anchoredPosition = Vector2.zero;
                Canvas.ForceUpdateCanvases();
                Assert.Less(Bas(), inset - 0.5f, "CONTRÔLE POSITIF : sans l'inset, le bas du panneau passe sous le chrome");
            }
            finally { ShellChrome.PublierInsets(0f, 0f); }   // global statique (TD-576) : rendu, jamais laissé au voisin
        }

        // ═══ M2 — le jeton se dépense LOCALEMENT, sans fabriquer un cap ═══════════════════════════════

        [UnityTest]
        public IEnumerator GestesM2_ApresUnGesteStructurel_LaMarqueDisparait_LeModeResteActionnable_LeCapNEstPasFabrique()
        {
            string grande = ValeurAttendue.De("accueil", "jeton", "votre grande décision du jour");
            Servir();
            var ecran = Monte();
            ecran.Couts = new CoutsDeTest().ToutServi("12300");
            yield return null;

            // avant : jeton libre, aucune dépense ⇒ la marque est là
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            CollectionAssert.Contains(ecran.Feuille.Textes, grande, "prémisse : jeton libre, rien de dépensé ⇒ la marque");

            // un geste structurel RÉUSSIT : `Utilises` seul bouge — ni `Connu` ni `PlafondAtteint` (aucun cap n'est affirmé)
            Assert.IsFalse(JetonDeStructure.Connu);
            ecran.ReussirPourTest(Graphe(), ChaineDApproGestes.Entretien.Modes[1]);
            Assert.AreEqual(1, JetonDeStructure.Utilises, "une décision structurelle dépensée");
            Assert.IsFalse(JetonDeStructure.Connu, "`Connu` ne bouge pas : personne n'a mesuré");
            Assert.IsFalse(JetonDeStructure.PlafondAtteint, "aucun cap fabriqué (`Publier(1, true)` affirmerait une valeur que le back ne sert jamais)");
            Assert.IsFalse(ecran.Feuille.EstOuverte, "le succès ferme la feuille");
            Assert.IsTrue(ChaineDApproGestes.JetonDisponible, "le jeton reste « disponible » : le back arbitre");

            // après : la marque (une PROMESSE) a disparu des DEUX gestes, mais le mode reste actionnable (son 409 servi est la source de vérité)
            foreach (SpecDeGeste spec in new[] { ChaineDApproGestes.Entretien, ChaineDApproGestes.Reconstruction })
            {
                ecran.OuvrirLaFeuillePourTest(spec, spec == ChaineDApproGestes.Entretien ? CibleLiaison() : CibleRoute());
                yield return null;
                CollectionAssert.DoesNotContain(ecran.Feuille.Textes, grande, "après une décision dépensée, « votre grande décision du jour » est une promesse fausse");
                foreach (ModeDeGeste m in spec.Modes) Assert.IsTrue(ecran.Feuille.BoutonDuMode(m.Id).interactable, m.Id + " : reste actionnable");
            }

            // CONTRÔLE POSITIF 1 : un geste NON structurel ne dépense rien
            JetonDeStructure.OublierPourTest();
            ecran.ReussirPourTest(Graphe(), ChaineDApproGestes.Entretien.Modes[0]);
            Assert.AreEqual(0, JetonDeStructure.Utilises, "CONTRÔLE POSITIF : Rafistoler ne dépense pas la grande décision");
            // CONTRÔLE POSITIF 2 : le jeton oublié ⇒ la marque REVIENT
            ecran.OuvrirLaFeuillePourTest(ChaineDApproGestes.Entretien, CibleLiaison());
            yield return null;
            CollectionAssert.Contains(ecran.Feuille.Textes, grande, "CONTRÔLE POSITIF : Utilises == 0 ⇒ la marque revient");
            // le jeton PUBLIÉ par le shell puis dépensé : `Publier` reprend la main (l'état du shell fait foi)
            JetonDeStructure.Publier(0, false);
            JetonDeStructure.DepenseLocalement();
            Assert.IsTrue(JetonDeStructure.Connu); Assert.IsFalse(JetonDeStructure.PlafondAtteint); Assert.AreEqual(1, JetonDeStructure.Utilises);
            JetonDeStructure.Publier(0, false);
            Assert.AreEqual(0, JetonDeStructure.Utilises, "la prochaine ouverture de session republie : la dépense locale est remplacée");
        }

        // ═══ E — deux parcours contre le VRAI back : la cible n'existe pas ⇒ 4xx servi, la feuille reste ═════════

        private static int callsignSeq;
        private string token;

        private IEnumerator OuvrirJoueurFrais()
        {
            var auth = new AuthClient { BaseUrl = MafiaCleanCity.AdresseDuBack.Url };
            string callsign = SeederSupport.SafeCallsign("gestes", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "screen-appro-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotNull(token, "signup n'a pas rendu de jeton");
        }

        private IEnumerator UnGesteSurUneCibleInexistante(SpecDeGeste spec, string modeId)
        {
            yield return OuvrirJoueurFrais();
            Servir();
            var ecran = MonterEcran();
            ecran.SetToken(token);
            ecran.Couts = new CoutsDeTest().ToutServi("12300");   // le chemin ACTIF : sans coût injecté, le mode est éteint et rien ne part
            ecran.RendrePourTestChaine(Graphe(), Batiments());
            yield return null;
            var cible = new CibleDeGeste { Id = Guid.NewGuid().ToString(), Origine = "o", Destination = "d" };   // un identifiant qui n'est à personne
            ecran.OuvrirLaFeuillePourTest(spec, cible);
            yield return null;
            ModeDeGeste mode = Array.Find(spec.Modes, m => m.Id == modeId);
            yield return ecran.ChoisirPourTest(mode);
            Assert.IsFalse(ecran.GesteEnCours, "le geste est terminé");
            Assert.GreaterOrEqual(ecran.DernierCodeErreur, 400, "une cible inexistante est REFUSÉE par le back : " + ecran.DerniereErreur);
            Assert.Less(ecran.DernierCodeErreur, 500, "un refus 4xx, pas une panne : " + ecran.DerniereErreur);
            Assert.IsTrue(ecran.Feuille.EstOuverte, "un refus ne ferme pas la feuille (seul un 2xx la ferme)");
            // ce qui s'affiche est la phrase SERVIE, ou rien — jamais le message technique
            foreach (string t in ecran.Feuille.Textes) StringAssert.DoesNotContain("POST /v1/", t, "le message technique n'est jamais affiché");
        }

        [UnityTest]
        public IEnumerator GestesE1_Maintain_UneLiaisonInexistante_EstRefusee_LaFeuilleResteOuverte() =>
            UnGesteSurUneCibleInexistante(ChaineDApproGestes.Entretien, "quick_patch");

        [UnityTest]
        public IEnumerator GestesE2_Rebuild_UneRouteInexistante_EstRefusee_LaFeuilleResteOuverte() =>
            UnGesteSurUneCibleInexistante(ChaineDApproGestes.Reconstruction, "MINIMAL_REROUTE");
    }
}
