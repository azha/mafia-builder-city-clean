using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    /// <summary>⑤ en mode « APRÈS-GESTE » (cadres 6-7 de `ecrans-brennar-accueil.html`) : la MÊME table feutre, la carte tranchée (ou qui reste), le tampon `.tampon-diag`
    /// « TRANCHÉE », le mot-or, la ligne-or « Retour à l’accueil », le jeton à trois états sans chiffre. La vue est celle d'`ApresGesteHl.Vue` (pure, testée dans
    /// `CommitResponseDtoPlayModeTests`) : ici on la pose À LA MAIN, donc aucun catalogue ni réseau n'entre en jeu.
    ///
    /// ⛔ Une garde de PARAMÈTRES n'est pas une garde d'EFFET : le tampon se juge aussi sur les PIXELS rendus (le rouge brique `#93402c` du trait et des lettres apparaît dans la
    /// carte quand `Tampon` est vrai, et pas quand il est faux), pas seulement sur `activeSelf`.</summary>
    [Category("DecisionCarte")]
    public class ApresGesteDecisionPlayModeTests
    {
        private float hautAvant, basAvant;
        private GameObject ecranGo, camGo, canGo;
        private RenderTexture rt;

        [SetUp]
        public void SetUp()
        {
            hautAvant = ShellChrome.TopInsetPx; basAvant = ShellChrome.BottomInsetPx;
            ShellChrome.PublierInsets(200f, 300f);
        }

        [TearDown]
        public void TearDown()
        {
            ShellChrome.PublierInsets(hautAvant, basAvant);
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            if (ecranGo != null) Object.DestroyImmediate(ecranGo);
            if (canGo != null) Object.DestroyImmediate(canGo);
            if (camGo != null) Object.DestroyImmediate(camGo);
            if (rt != null) { rt.Release(); Object.DestroyImmediate(rt); }
            ecranGo = canGo = camGo = null; rt = null;
        }

        private const int W = 540, H = 960;
        private Camera cam;

        private DecisionDetailScreenController Monter()
        {
            rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
            camGo = new GameObject("ag_cam"); cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt; cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = Color.black; cam.orthographic = true; cam.enabled = false;
            canGo = new GameObject("ag_canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas c = canGo.GetComponent<Canvas>(); c.renderMode = RenderMode.ScreenSpaceCamera; c.worldCamera = cam;
            CanvasScaler sc = canGo.GetComponent<CanvasScaler>(); sc.uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize; sc.scaleFactor = W / 1280f;
            ecranGo = new GameObject("EcranDecision", typeof(RectTransform));
            ecranGo.transform.SetParent(canGo.transform, false);
            RectTransform r = (RectTransform)ecranGo.transform;
            r.anchorMin = Vector2.zero; r.anchorMax = Vector2.one; r.offsetMin = Vector2.zero; r.offsetMax = Vector2.zero;
            var e = ecranGo.AddComponent<DecisionDetailScreenController>();
            e.Afficher(Carte(), new StructuralBudgetDto { used = 0, cap_reached = false });
            return e;
        }

        private static HlCardDto Carte() => new HlCardDto
        {
            card_id = "c1", decision_type_key = "DAMAGED_BUILDING", impact_bucket = "major", urgency_bucket = "pressing", structural = false, target_count = 2,
        };

        private static IEnumerator Stabiliser()
        {
            for (int i = 0; i < 4; i++) { yield return null; Canvas.ForceUpdateCanvases(); }
        }

        private static ApresGesteHl.VueApres Tranchee(bool tampon = true) => new ApresGesteHl.VueApres
        {
            Issue = ApresGesteHl.Issue.Executee, Grave = "Vous avez tranché", Mot = "Les travaux sont lancés et payés pour 2 locaux.",
            CarteTranchee = true, Tampon = tampon, Action = "Retour à l’accueil", SousLigne = "Rien d’autre à trancher pour l’instant.", Jeton = ApresGesteHl.EtatDuJeton.Libre,
        };

        private static ApresGesteHl.VueApres CarteReste() => new ApresGesteHl.VueApres
        {
            Issue = ApresGesteHl.Issue.CarteReste, Grave = "La carte reste sur la table", Mot = "Votre décision du jour est déjà prise.", MotRouge = true,
            Action = "Retour à l’accueil", SousLigne = "La carte vous attend encore.", Jeton = ApresGesteHl.EtatDuJeton.Pris,
        };

        [UnityTest]
        public IEnumerator CadreSix_LaCarteTranchee_Tampon_MotOr_LigneOr_JetonSansChiffre()
        {
            DecisionDetailScreenController e = Monter();
            yield return Stabiliser();
            Assert.IsFalse(e.EnApres, "avant le geste");
            Assert.IsTrue(e.TamponLaitonVisible, "avant le geste : la plaque « LES LIRE MAINTENANT »");
            Assert.IsNull(e.MotOrRendu); Assert.IsNull(e.LigneOrRendue); Assert.IsFalse(e.TamponDiagVisible);

            e.AfficherApresGeste(Carte(), Tranchee());
            yield return Stabiliser();
            Assert.IsTrue(e.EnApres);
            Assert.AreEqual("Vous avez tranché", e.GraveRendu);
            Assert.AreEqual("Les travaux sont lancés et payés pour 2 locaux.", e.MotOrRendu);
            Assert.IsFalse(e.MotOrRouge);
            Assert.AreEqual("Retour à l’accueil", e.LigneOrRendue);
            Assert.AreEqual("Rien d’autre à trancher pour l’instant.", e.SousLigneRendue);
            Assert.IsTrue(e.TamponDiagVisible, "le tampon TRANCHÉE");
            Assert.IsFalse(e.DejaVisible);
            Assert.IsFalse(e.TamponLaitonVisible, "la plaque laiton s'efface : un geste irréversible déjà fait ne se re-propose pas");
            Assert.AreEqual("libre", e.JetonEtatRendu);
            Assert.IsFalse(e.JetonChiffreVisible, "le jeton n'a plus de chiffre (N6)");
            Assert.AreEqual("votre grande décision du jour", e.JetonSousRendu);
        }

        [UnityTest]
        public IEnumerator CadreSept_LaCarteReste_MotRouge_SansTampon()
        {
            DecisionDetailScreenController e = Monter();
            yield return Stabiliser();
            e.AfficherApresGeste(Carte(), CarteReste());
            yield return Stabiliser();
            Assert.AreEqual("La carte reste sur la table", e.GraveRendu);
            Assert.AreEqual("Votre décision du jour est déjà prise.", e.MotOrRendu);
            Assert.IsTrue(e.MotOrRouge, "`.mot-or.rouge`");
            Assert.IsFalse(e.TamponDiagVisible, "la carte n'est PAS tranchée : aucun tampon");
            Assert.AreEqual("La carte vous attend encore.", e.SousLigneRendue);
            Assert.AreEqual("pris", e.JetonEtatRendu);
        }

        [UnityTest]
        public IEnumerator DejaTranchee_LaPastille_AucunMotOr_PasDeTamponNeuf_Et404SansGrave()
        {
            DecisionDetailScreenController e = Monter();
            yield return Stabiliser();
            e.AfficherApresGeste(Carte(), new ApresGesteHl.VueApres
            {
                Issue = ApresGesteHl.Issue.DejaTranchee, Grave = "C’était déjà tranché", Mot = null, CarteTranchee = true, Tampon = false, Deja = true,
                Action = "Retour à l’accueil", SousLigne = "Plusieurs attendent encore", Jeton = ApresGesteHl.EtatDuJeton.Libre,
            });
            yield return Stabiliser();
            Assert.AreEqual("C’était déjà tranché", e.GraveRendu);
            Assert.IsNull(e.MotOrRendu, "rien n'a été exécuté : aucun mot-or");
            Assert.IsTrue(e.DejaVisible); Assert.IsFalse(e.TamponDiagVisible, "pas de tampon NEUF");

            e.AfficherApresGeste(Carte(), new ApresGesteHl.VueApres
            {
                Issue = ApresGesteHl.Issue.Disparue, Grave = null, Mot = "Cette carte n’est plus là.", Action = "Retour à l’accueil", SousLigne = "Rien d’autre à trancher pour l’instant.",
                Jeton = ApresGesteHl.EtatDuJeton.FermeeAujourdhui,
            });
            yield return Stabiliser();
            Assert.IsNull(e.GraveRendu, "404 : aucun grave");
            Assert.AreEqual("Cette carte n’est plus là.", e.MotOrRendu);
            Assert.IsFalse(e.DejaVisible, "la pastille ne survit pas à l'issue suivante");
            Assert.AreEqual("fermée aujourd’hui", e.JetonEtatRendu);
        }

        [UnityTest]
        public IEnumerator Retour_AnnonceAuShell_UneDecisionTranchee_SeulementSiLaCarteEstTranchee()
        {
            DecisionDetailScreenController e = Monter();
            int annonces = 0; e.OnDecisionTranchee += () => annonces++;
            yield return Stabiliser();
            Assert.IsNotNull(e.BoutonRetour);
            e.AfficherApresGeste(Carte(), CarteReste());
            yield return Stabiliser();
            e.BoutonRetour.onClick.Invoke();
            Assert.AreEqual(1, annonces, "« Retour » relit l'Accueil (OnDecisionTranchee) même quand la carte reste");
            Assert.AreEqual(0, e.DecisionsTranchees, "…mais ne compte PAS une décision tranchée");
            e.AfficherApresGeste(Carte(), Tranchee());
            yield return Stabiliser();
            e.BoutonRetour.onClick.Invoke();
            Assert.AreEqual(2, annonces);
            Assert.AreEqual(1, e.DecisionsTranchees);
        }

        [UnityTest]
        public IEnumerator LaRelectureALOuverture_NEcrasePasLApres_EtAfficherLeRepose()
        {
            DecisionDetailScreenController e = Monter();
            yield return Stabiliser();
            e.AfficherApresGeste(Carte(), Tranchee());
            e.SetToken("jeton");   // le shell appelle `SetToken` à chaque montage : l'après posé avant ne doit pas être écrasé
            yield return Stabiliser();
            Assert.IsTrue(e.EnApres, "SetToken n'écrase pas l'après-geste");
            Assert.AreEqual("Vous avez tranché", e.GraveRendu);

            e.Afficher(Carte(), new StructuralBudgetDto { used = 0, cap_reached = false });
            yield return Stabiliser();
            Assert.IsFalse(e.EnApres);
            Assert.IsTrue(e.TamponLaitonVisible, "l'écran « avant » est reposé");
            Assert.IsNull(e.MotOrRendu); Assert.IsNull(e.LigneOrRendue); Assert.IsFalse(e.TamponDiagVisible); Assert.IsFalse(e.DejaVisible);
            Assert.IsTrue(e.JetonChiffreVisible);
            Assert.AreEqual("libre", e.JetonEtatRendu);
        }

        [UnityTest]
        public IEnumerator Structure_ToutGraphicDeLApresPorteSonCanvasRenderer()
        {
            DecisionDetailScreenController e = Monter();
            yield return Stabiliser();
            e.AfficherApresGeste(Carte(), Tranchee());
            yield return Stabiliser();
            int graphics = 0;
            foreach (Graphic g in e.GetComponentsInChildren<Graphic>(true))
            {
                graphics++;
                Assert.IsNotNull(g.GetComponent<CanvasRenderer>(), "sans CanvasRenderer rien ne dessine et la console est muette : " + g.name);
            }
            Assert.Greater(graphics, 20, "garde non vacue : l'écran porte ses graphics");
        }

        /// <summary>L'EFFET, pas le paramètre : le tampon pose du rouge brique (`#93402c`) DANS la carte. Sans tampon, la carte rend (presque) moins de pixels de cette teinte
        /// qu'avec ; l'écart est compté, et le CONTRÔLE POSITIF (même vue, `Tampon` faux) ne le produit pas.</summary>
        [UnityTest]
        public IEnumerator Effet_LeTamponPoseDuRougeBriqueDansLaCarte()
        {
            DecisionDetailScreenController e = Monter();
            yield return Stabiliser();
            e.AfficherApresGeste(Carte(), Tranchee(tampon: false));
            yield return Stabiliser();
            int sans = Brique(e);
            e.AfficherApresGeste(Carte(), Tranchee(tampon: true));
            yield return Stabiliser();
            int avec = Brique(e);
            e.AfficherApresGeste(Carte(), Tranchee(tampon: false));
            yield return Stabiliser();
            int sansDeNouveau = Brique(e);
            Assert.Greater(avec, sans + 150, $"le tampon doit poser du rouge brique dans la carte (sans {sans}, avec {avec})");
            Assert.AreEqual(sans, sansDeNouveau, 5, "contrôle positif : retiré, l'écart disparaît");
        }

        /// <summary>Les pixels « brique » (`#93402c` = 147,64,44, à ±40) dans le rect de la carte.</summary>
        private int Brique(DecisionDetailScreenController e)
        {
            Canvas.ForceUpdateCanvases(); cam.Render();
            RenderTexture avant = RenderTexture.active; RenderTexture.active = rt;
            var t = new Texture2D(W, H, TextureFormat.RGB24, false);
            t.ReadPixels(new Rect(0, 0, W, H), 0, 0); t.Apply(); RenderTexture.active = avant;
            var c = (RectTransform)canGo.transform;
            var coins = new Vector3[4]; e.CarteRect.GetWorldCorners(coins);
            int x0 = int.MaxValue, y0 = int.MaxValue, x1 = int.MinValue, y1 = int.MinValue;
            foreach (Vector3 w in coins)
            {
                Vector3 p = c.InverseTransformPoint(w);
                int px = Mathf.FloorToInt((p.x - c.rect.xMin) / c.rect.width * W), py = Mathf.FloorToInt((p.y - c.rect.yMin) / c.rect.height * H);
                x0 = Mathf.Min(x0, px); x1 = Mathf.Max(x1, px); y0 = Mathf.Min(y0, py); y1 = Mathf.Max(y1, py);
            }
            x0 = Mathf.Clamp(x0, 0, W - 1); x1 = Mathf.Clamp(x1, 0, W - 1); y0 = Mathf.Clamp(y0, 0, H - 1); y1 = Mathf.Clamp(y1, 0, H - 1);
            int n = 0;
            for (int y = y0; y <= y1; y++)
                for (int x = x0; x <= x1; x++)
                {
                    Color32 p = t.GetPixel(x, y);
                    if (Mathf.Abs(p.r - 147) <= 40 && Mathf.Abs(p.g - 64) <= 40 && Mathf.Abs(p.b - 44) <= 40) n++;
                }
            Object.DestroyImmediate(t);
            return n;
        }
    }
}
