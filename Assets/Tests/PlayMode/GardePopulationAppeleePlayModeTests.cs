using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>⛔ LE SECOND GUETTEUR DE LA GARDE DE POPULATION (12/11/2026). `Tools/garde-population-cles.py` ne protège que si quelqu'un la LANCE :
    /// côté back, une garde que personne n'invoquait depuis des semaines avait installé 5 erreurs. Son appelant réel est
    /// `Tools/typecheck-hors-porte.py --tout` (que chaque session lance avant une fusion) ; ce test, qui tourne dans tout run PlayMode
    /// (catégorie inscrite dans `MafiaCI.cs`, garde I1), ROUGIT si cet appel disparaît — et la garde rougit à son tour si ce test ou son
    /// inscription disparaissent (`verifier_appelants`). Deux guetteurs qui se surveillent : en supprimer un seul se voit.
    /// Pur texte : aucun objet Unity, aucun réseau.</summary>
    [Category("GardePopulation")]
    public class GardePopulationAppeleePlayModeTests
    {
        private const string Garde = "garde-population-cles.py";

        private static string Depot => Path.GetFullPath(Path.Combine(Application.dataPath, ".."));

        /// <summary>Le typecheck APPELLE-t-il la garde ? (un `subprocess` ou une ligne de commande qui nomme le script)</summary>
        internal static bool AppelleLaGarde(string sourceDuTypecheck) =>
            sourceDuTypecheck != null && sourceDuTypecheck.Contains(Garde) && sourceDuTypecheck.Contains("subprocess");

        [Test]
        public void TypecheckHorsPorte_AppelleLaGardeDePopulation()
        {
            string chemin = Path.Combine(Depot, "Tools", "typecheck-hors-porte.py");
            Assert.IsTrue(File.Exists(chemin), "Tools/typecheck-hors-porte.py introuvable : l'appelant de la garde a disparu");
            Assert.IsTrue(AppelleLaGarde(File.ReadAllText(chemin)),
                "typecheck-hors-porte.py n'appelle plus Tools/" + Garde + " : la garde de population ne tourne plus nulle part (le rétablir dans `--tout`)");
        }

        [Test]
        public void ControlePositif_UnTypecheckSansAppelEstRefuse()
        {
            Assert.IsFalse(AppelleLaGarde("import subprocess\n# rien\n"), "un typecheck qui ne nomme pas la garde doit être refusé");
            Assert.IsFalse(AppelleLaGarde("python3 Tools/" + Garde), "le nom seul, sans lancement (subprocess), ne vaut pas appel");
            Assert.IsFalse(AppelleLaGarde(null));
            Assert.IsTrue(AppelleLaGarde("subprocess.run(['python3', 'Tools/" + Garde + "'])"));
        }

        [Test]
        public void LaGardeEtSonInstantane_ExistentEtSontNommesParLaTable()
        {
            Assert.IsTrue(File.Exists(Path.Combine(Depot, "Tools", Garde)), "Tools/" + Garde + " absent");
            Assert.IsTrue(File.Exists(Path.Combine(Depot, "Tools", "garde-population-cles", "sites-non-litteraux.tsv")), "la table des sites non littéraux est absente");
            Assert.IsNotEmpty(Directory.GetFiles(Path.Combine(Depot, "Tools", "juge-donnees", "i18n"), "cles-servies-*.txt"), "aucun instantané « servi » : la garde rendrait rc 2");
        }
    }
}
