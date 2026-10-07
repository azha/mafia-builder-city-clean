using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // CAUSE 7 (CLIENT-3, 07/10 : « listes coupées au pixel sans défilement ni indice » — ㊳ B2, ㉝ B1, ㉓ m3) : `ListeDefilante`, le mécanisme commun. HORS RÉSEAU.
    //   L1  le calcul est PUR : tout tient ⇒ ni fondu ni ascenseur ; sinon un fondu qui s'éteint en bas de course et un pouce proportionnel
    //   L2  l'EFFET : une fenêtre de 400 u sur un contenu de 1 000 u — fondu plein en haut, éteint en bas, pouce du haut au bas ; un contenu qui tient ne dessine RIEN
    //   L3  GARDE DE CLASSE : tout écran qui pose un `RectMask2D` passe par `ListeDefilante.` — ou figure dans une exception NOMMÉE avec sa raison (un masque de DÉCOR n'est pas une liste)
    [Category("ListeDefilante")]
    public class ListeDefilantePlayModeTests
    {
        [Test]
        public void L1_LeCalcul_ToutTient_RienNeSeDessine_SinonFonduEtPouce()
        {
            Assert.IsFalse(ListeDefilante.Depasse(400f, 400f));
            Assert.IsFalse(ListeDefilante.Depasse(400.9f, 400f), "un arrondi de mise en page n'est pas une suite");
            Assert.IsTrue(ListeDefilante.Depasse(1000f, 400f));
            Assert.AreEqual(0f, ListeDefilante.OpaciteDuFondu(300f, 400f, 0f), "tout tient : pas de fondu");
            Assert.AreEqual(1f, ListeDefilante.OpaciteDuFondu(1000f, 400f, 0f), "en haut de course : fondu plein");
            Assert.AreEqual(1f, ListeDefilante.OpaciteDuFondu(1000f, 400f, 500f), "il reste 100 u ≥ 72 : encore plein");
            Assert.AreEqual(0.5f, ListeDefilante.OpaciteDuFondu(1000f, 400f, 564f), 1e-4f, "il reste 36 u : la moitié de la rampe");
            Assert.AreEqual(0f, ListeDefilante.OpaciteDuFondu(1000f, 400f, 600f), "tout en bas : le fondu s'éteint");
            Assert.AreEqual(0f, ListeDefilante.OpaciteDuFondu(1000f, 400f, 900f), "un décalage au-delà de la course (élastique) ne rend rien de négatif");
            Assert.AreEqual(600f, ListeDefilante.ResteEnBas(1000f, 400f, 0f));
            Assert.AreEqual(0f, ListeDefilante.ResteEnBas(300f, 400f, 0f));
            Assert.AreEqual(0f, ListeDefilante.HauteurDuPouce(300f, 400f, 380f), "tout tient : pas de pouce");
            Assert.AreEqual(152f, ListeDefilante.HauteurDuPouce(1000f, 400f, 380f), 1e-3f, "le pouce est la part visible : 400/1000 de la piste");
            Assert.AreEqual(ListeDefilante.PouceMinimal, ListeDefilante.HauteurDuPouce(100000f, 400f, 380f), "jamais plus petit que le minimum saisissable");
            Assert.AreEqual(0f, ListeDefilante.DecalageDuPouce(1000f, 400f, 0f, 380f, 152f), "en haut : collé en haut");
            Assert.AreEqual(380f - 152f, ListeDefilante.DecalageDuPouce(1000f, 400f, 600f, 380f, 152f), 1e-3f, "en bas : collé en bas");
            Assert.AreEqual((380f - 152f) / 2f, ListeDefilante.DecalageDuPouce(1000f, 400f, 300f, 380f, 152f), 1e-3f, "à mi-course : au milieu");
        }

        private static (GameObject racine, RectTransform contenu, ListeDefilante liste) Fenetre(float hauteurContenu)
        {
            var racine = new GameObject("Fenetre", typeof(RectTransform));
            var cadre = (RectTransform)racine.transform;
            cadre.sizeDelta = new Vector2(600f, 400f);
            racine.AddComponent<RectMask2D>();
            var go = new GameObject("Contenu", typeof(RectTransform));
            go.transform.SetParent(cadre, false);
            var contenu = (RectTransform)go.transform;
            contenu.anchorMin = new Vector2(0f, 1f); contenu.anchorMax = new Vector2(1f, 1f); contenu.pivot = new Vector2(0.5f, 1f);
            contenu.sizeDelta = new Vector2(0f, hauteurContenu); contenu.anchoredPosition = Vector2.zero;
            ListeDefilante l = ListeDefilante.Equiper(cadre, contenu, new Color(0.05f, 0.06f, 0.07f));
            return (racine, contenu, l);
        }

        [Test]
        public void L2_L_Effet_FonduPleinEnHaut_EteintEnBas_PouceDuHautAuBas_RienQuandToutTient()
        {
            var (racine, contenu, l) = Fenetre(1000f);
            try
            {
                Assert.IsNotNull(racine.GetComponent<ScrollRect>(), "une fenêtre qui ne défilait pas défile maintenant");
                Assert.IsTrue(racine.GetComponent<ScrollRect>().vertical && !racine.GetComponent<ScrollRect>().horizontal);
                Assert.IsNotNull(racine.GetComponent<RectMask2D>(), "le masque est gardé : rien ne déborde sur le dock");
                Assert.IsNotNull(racine.GetComponent<Image>(), "un graphique transparent reçoit le geste (un ScrollRect sans graphique n'en reçoit aucun)");
                l.Rafraichir();
                Assert.IsTrue(l.ContenuDepasse);
                Assert.AreEqual(1f, l.OpaciteCourante, "en haut : le fondu dit « il y a une suite »");
                Assert.IsTrue(l.Pouce.parent.gameObject.activeSelf, "l'ascenseur est là");
                float piste = ((RectTransform)l.Pouce.parent).rect.height;
                Assert.AreEqual(piste * 400f / 1000f, l.Pouce.rect.height, 1f, "le pouce = la part visible");
                Assert.AreEqual(0f, l.Pouce.anchoredPosition.y, 1e-3f, "en haut de course");
                contenu.anchoredPosition = new Vector2(0f, 600f);   // tout en bas
                l.Rafraichir();
                Assert.AreEqual(0f, l.OpaciteCourante, "en bas : le fondu s'éteint");
                Assert.AreEqual(-(piste - l.Pouce.rect.height), l.Pouce.anchoredPosition.y, 1f, "le pouce est en bas de la piste");
            }
            finally { Object.DestroyImmediate(racine); }

            var (court, _, lc) = Fenetre(300f);
            try
            {
                lc.Rafraichir();
                Assert.IsFalse(lc.ContenuDepasse);
                Assert.AreEqual(0f, lc.OpaciteCourante, "tout tient : aucun fondu");
                Assert.IsFalse(lc.Pouce.parent.gameObject.activeSelf, "tout tient : aucun ascenseur");
            }
            finally { Object.DestroyImmediate(court); }
        }

        [Test]
        public void L2b_Indiquer_EstIdempotent_UnScrollRectExistantGardeSesReglages()
        {
            var racine = new GameObject("F", typeof(RectTransform));
            try
            {
                ((RectTransform)racine.transform).sizeDelta = new Vector2(600f, 400f);
                racine.AddComponent<RectMask2D>();
                var contenu = new GameObject("C", typeof(RectTransform)); contenu.transform.SetParent(racine.transform, false);
                var sr = racine.AddComponent<ScrollRect>();
                sr.horizontal = false; sr.vertical = true; sr.scrollSensitivity = 17f;
                sr.viewport = (RectTransform)racine.transform; sr.content = (RectTransform)contenu.transform;
                ListeDefilante a = ListeDefilante.Indiquer(sr, Color.black);
                ListeDefilante b = ListeDefilante.Indiquer(sr, Color.black);
                Assert.AreSame(a, b, "un second appel ne double rien");
                Assert.AreEqual(1, racine.GetComponentsInChildren<Transform>(true).Count(t => t.name == "FonduDeFin"));
                Assert.AreEqual(1, racine.GetComponentsInChildren<Transform>(true).Count(t => t.name == "Ascenseur"));
                Assert.AreEqual(17f, sr.scrollSensitivity, "les réglages de l'écran ne sont pas touchés");
            }
            finally { Object.DestroyImmediate(racine); }
        }

        // ── L3 — la garde de classe ─────────────────────────────────────────────────────────────────────────────────────────────────────

        /// <summary>Les écrans qui posent un `RectMask2D` SANS `ListeDefilante`, chacun avec sa RAISON. Un masque de DÉCOR n'est pas une liste ; un `ScrollRect` interactif sans indice reste à équiper
        /// quand un juge le relève (cause 7 : trois écrans nommés par CLIENT-3 + ㊵ et ㉞ qui portaient le même cadre-masque).</summary>
        internal static readonly Dictionary<string, string> MasquesSansIndice = new Dictionary<string, string>
        {
            { "DashboardController.cs", "décor : la zone du fond de ville de l'Accueil, pas une liste" },
            { "ReputationPortrait.cs", "décor : la zone du portrait de ㊲, pas une liste" },
            { "DelegationScreenController.cs", "ScrollRect INTERACTIF (㉜) sans indice : à équiper si un juge le relève (aucun écart A/B ouvert à ce jour)" },
            { "ConflitScreenController.cs", "ScrollRect INTERACTIF (㉙) sans indice : idem" },
            { "LieutenantScreenController.cs", "ScrollRect INTERACTIF (⑥ / liste de ⑦) sans indice : idem" },
            { "ReputationScreenController.cs", "ScrollRect INTERACTIF (㊲, corps) sans indice : idem" },
            { "AppShell.cs", "ScrollRect INTERACTIF (le menu PLUS ⑱) sans indice : idem" },
        };

        private static readonly Regex Masque = new Regex(@"AddComponent<RectMask2D>\(\)");

        /// <summary>(fichier, posé sans ListeDefilante) pour chaque source qui pose un RectMask2D. Pure.</summary>
        internal static List<string> SansIndice(IEnumerable<(string nom, string source)> sources) =>
            sources.Where(s => Masque.IsMatch(s.source) && !s.source.Contains("ListeDefilante.")).Select(s => s.nom).OrderBy(n => n).ToList();

        [Test]
        public void L3_GardeDeClasse_ToutMasqueDeListe_PasseParListeDefilante_OuEstUneExceptionNommee()
        {
            CollectionAssert.AreEqual(new[] { "Brut.cs" }, SansIndice(new[]
            {
                ("Brut.cs", "var m = go.AddComponent<RectMask2D>();"),
                ("Equipe.cs", "var m = go.AddComponent<RectMask2D>(); ListeDefilante.Equiper(r, c, f);"),
                ("Rien.cs", "var x = 1;"),
            }), "contrôle positif : un masque sans le mécanisme est vu ; un masque équipé et un fichier sans masque non");

            var sources = Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories)
                .Where(f => !f.EndsWith("ListeDefilante.cs"))
                .Select(f => (Path.GetFileName(f), File.ReadAllText(f))).ToList();
            Assert.Greater(sources.Count, 100, "anti-vacuité : l'arbre des scripts est lu");
            List<string> sans = SansIndice(sources);
            List<string> nonNommes = sans.Where(n => !MasquesSansIndice.ContainsKey(n)).ToList();
            Assert.IsEmpty(nonNommes, "ces écrans posent un RectMask2D SANS ListeDefilante ni exception nommée — une liste coupée sans défilement ni indice (cause 7) : " + string.Join(", ", nonNommes));
            List<string> perimees = MasquesSansIndice.Keys.Where(n => !sans.Contains(n)).ToList();
            Assert.IsEmpty(perimees, "exception(s) devenue(s) inutile(s) (le fichier est équipé, ou n'a plus de masque) — les retirer : " + string.Join(", ", perimees));
            foreach (string equipe in new[] { "JournalScreenController.cs", "FiliereScreenController.cs", "CarnetScreenController.cs" })
                Assert.IsTrue(sources.Any(s => s.Item1 == equipe && s.Item2.Contains("ListeDefilante.Equiper(")), equipe + " : la liste de l'écran est équipée");
            foreach (string indique in new[] { "DemolitionScreenController.cs", "ShopScreenController.cs" })
                Assert.IsTrue(sources.Any(s => s.Item1 == indique && s.Item2.Contains("ListeDefilante.Indiquer(")), indique + " : le ScrollRect existant porte l'indice");
        }
    }
}
