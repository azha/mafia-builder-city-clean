using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // La résolution PARTAGÉE du Canvas d'un écran (`CanvasRacine.Resoudre`) : « le mountParent, sinon le Canvas racine de MON parent, sinon j'en
    // crée un » — jamais « le premier Canvas de la scène » (B3H1 en test ; en jeu, un écran construit PAR-DESSUS le shell sur le chemin de repli).
    //   R1  GARDE DE CLASSE : 0 `FindFirstObjectByType<Canvas>` hors `AppShell.cs` (une seule fois) dans Assets/Scripts, ET dans le gabarit
    //       Tools/nouvel-ecran.py ; le contrôle positif voit un site qui l'oublie, et ignore un commentaire qui le nomme
    //   R2  le mountParent sous un canvas ⇒ le canvas RACINE de ce parent, même quand un AUTRE canvas est le premier de la scène
    //   R3  sans mountParent, l'hôte sous un canvas ⇒ le canvas racine de son parent (pas le premier de la scène)
    //   R4  sans mountParent et hôte à la racine ⇒ un canvas NEUF, jamais celui du voisin
    //   R5  monté (mountParent posé) : rien n'est créé, même sans canvas au-dessus
    [Category("CanvasRacine")]
    public class CanvasRacinePlayModeTests
    {
        private const string Motif = "FindFirstObjectByType<Canvas>";

        private static string SansCommentaires(string source) =>
            string.Join("\n", source.Split('\n').Select(l => { int i = l.IndexOf("//"); return i >= 0 ? l.Substring(0, i) : l; }));

        /// <summary>Les fichiers qui DÉCOUVRENT le premier canvas de la scène (hors commentaires), avec leur nombre de sites. Pure.</summary>
        internal static List<(string nom, int sites)> Decouvreurs(IEnumerable<(string nom, string source)> sources) =>
            sources.Select(s => (s.nom, sites: SansCommentaires(s.source).Split(new[] { Motif }, System.StringSplitOptions.None).Length - 1))
                   .Where(s => s.sites > 0).OrderBy(s => s.nom).ToList();

        [Test]
        public void R1_GardeDeClasse_ZeroDecouverteDuPremierCanvas_HorsAppShell()
        {
            var temoin = Decouvreurs(new[]
            {
                ("Oublie.cs", "Canvas c = FindFirstObjectByType<Canvas>();"),
                ("Commente.cs", "// jamais FindFirstObjectByType<Canvas>() ici\nvar c = CanvasRacine.Resoudre(transform, mountParent);"),
                ("Propre.cs", "var c = CanvasRacine.Resoudre(transform, mountParent);"),
            });
            CollectionAssert.AreEqual(new[] { "Oublie.cs" }, temoin.Select(t => t.nom).ToArray(),
                "contrôle positif : l'oubli est vu ; le commentaire et le site propre non");

            string racine = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            var sources = Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories)
                .Select(f => (Path.GetFileName(f), File.ReadAllText(f))).ToList();
            sources.Add(("nouvel-ecran.py", File.ReadAllText(Path.Combine(racine, "Tools", "nouvel-ecran.py"))));
            var trouves = Decouvreurs(sources);
            CollectionAssert.AreEqual(new[] { ("AppShell.cs", 1) }, trouves,
                "seul `AppShell.BuildLayout` découvre le canvas du shell (nommé, UNE fois) ; tout autre écran passe par CanvasRacine.Resoudre — " +
                "trouvés : " + string.Join(", ", trouves.Select(t => t.nom + "×" + t.sites)));
            StringAssert.Contains("CanvasRacine.Resoudre", File.ReadAllText(Path.Combine(racine, "Tools", "nouvel-ecran.py")),
                "le gabarit des écrans neufs appelle la résolution partagée");
        }

        private readonly List<GameObject> crees = new List<GameObject>();

        [TearDown]
        public void Nettoyer()
        {
            foreach (GameObject g in crees) if (g != null) Object.DestroyImmediate(g);
            crees.Clear();
        }

        private Canvas NouveauCanvas(string nom)
        {
            var go = new GameObject(nom, typeof(Canvas));
            crees.Add(go);
            return go.GetComponent<Canvas>();
        }

        private Transform Enfant(string nom, Transform parent)
        {
            var go = new GameObject(nom, typeof(RectTransform));
            crees.Add(go);
            go.transform.SetParent(parent, false);
            return go.transform;
        }

        private static int NombreDeCanvas() => Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include, FindObjectsSortMode.None).Length;

        [Test]
        public void R2_MountParentSousUnCanvas_DonneLeCanvasRacineDeCeParent_PasLePremierDeLaScene()
        {
            Canvas voisin = NouveauCanvas("Voisin");
            Canvas shell = NouveauCanvas("Shell");
            Transform slot = Enfant("Slot", Enfant("Contenu", shell.transform));
            Assert.AreSame(shell, CanvasRacine.Resoudre(null, slot));
            Assert.AreNotSame(voisin, CanvasRacine.Resoudre(null, slot));
        }

        [Test]
        public void R3_SansMountParent_HoteSousUnCanvas_DonneLeCanvasRacineDeSonParent()
        {
            Canvas voisin = NouveauCanvas("Voisin");
            Canvas mien = NouveauCanvas("Mien");
            Transform hote = Enfant("Hote", Enfant("Panneau", mien.transform));
            Assert.AreSame(mien, CanvasRacine.Resoudre(hote, null));
            Assert.AreNotSame(voisin, CanvasRacine.Resoudre(hote, null));
        }

        [Test]
        public void R4_SansMountParent_HoteALaRacine_CreeUnCanvasNeuf_JamaisCeluiDuVoisin()
        {
            Canvas voisin = NouveauCanvas("Voisin");
            Transform hote = new GameObject("Hote").transform;
            crees.Add(hote.gameObject);
            int avant = NombreDeCanvas();
            Canvas cree = CanvasRacine.Resoudre(hote, null);
            crees.Add(cree.gameObject);
            Assert.AreNotSame(voisin, cree, "le canvas du voisin n'est pas pris");
            Assert.AreEqual(avant + 1, NombreDeCanvas(), "un canvas neuf, un seul");
            Assert.AreEqual(RenderMode.ScreenSpaceOverlay, cree.renderMode);
            Assert.AreEqual(new Vector2(1280, 720), cree.GetComponent<CanvasScaler>().referenceResolution);
            Assert.IsNotNull(cree.GetComponent<GraphicRaycaster>());
        }

        [Test]
        public void R5_Monte_RienNEstCree_MemeSansCanvasAuDessus()
        {
            Transform slot = Enfant("SlotSansCanvas", null);
            int avant = NombreDeCanvas();
            Assert.IsNull(CanvasRacine.Resoudre(null, slot), "pas de canvas au-dessus du mountParent : null, l'appelant construit sous mountParent");
            Assert.AreEqual(avant, NombreDeCanvas(), "monté : aucun canvas créé");
        }
    }
}
