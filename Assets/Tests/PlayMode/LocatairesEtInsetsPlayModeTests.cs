using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Shell.Tests
{
    /// <summary>LA POPULATION DES LOCATAIRES QUI IGNORENT CE QUE LE CHROME MANGE.
    ///
    /// ⛔⛔ POURQUOI UNE GARDE D'ENSEMBLE ET PAS QUATRE CORRECTIFS. `ContentSlot` couvre TOUT le
    /// canvas par conception — pour qu'un fond plein écran passe sous les barres. Un locataire qui
    /// s'y ancre sans lire `ShellChrome` pose donc son contenu DERRIÈRE le bandeau, et le défaut
    /// est invisible partout où le contenu commence assez bas. Mesuré le 2026-09-06 : **32
    /// locataires, 28 lisent `ShellChrome`, QUATRE non**. Corriger celui qu'on regardait aurait
    /// laissé les trois autres, et surtout n'aurait rien dit du CINQUIÈME écrit demain.
    ///
    /// ★★ CE QUE CETTE GARDE N'EST PAS : une interdiction. Le contrat dit explicitement qu'un
    /// locataire qui étire un FOND plein écran doit ignorer les insets — ㉔ en a un, et il le
    /// garde. La propriété n'est donc pas « tout le monde lit », c'est **« la liste de ceux qui ne
    /// lisent pas est CONNUE et ne grandit pas en silence »**. C'est la forme « publier le
    /// dénominateur » : un « 3 » déclaré est une mesure due, pas une tache.
    ///
    /// ⚠️ ET CE QU'ELLE NE PEUT PAS VOIR, écrit plutôt que sous-entendu : lire `ShellChrome` ne
    /// prouve pas qu'on le lit BIEN. Un locataire de la liste des 28 peut très bien réserver la
    /// mauvaise hauteur — c'est arrivé sur cet écran-là, deux sites d'appel de la même valeur, un
    /// seul converti. La garde de VALEUR correspondante est géométrique et vit avec chaque écran
    /// (le titre ne chevauche pas le bandeau) ; celle-ci est structurelle et ne coûte rien.
    [Category("Charpente")]
    public class LocatairesEtInsetsPlayModeTests
    {
        /// <summary>Les trois qui ne lisent pas `ShellChrome`, NOMMÉS. ㉔ en est sorti le
        /// 2026-09-06. Ce n'est PAS une liste d'exemptions justifiées : c'est un état des lieux
        /// mesuré. Chacun doit être ouvert, mesuré et soit corrigé, soit documenté comme un fond.
        /// *Une allowlist sans raison écrite est une garde qui certifie le défaut* — celle-ci ne
        /// prétend donc pas excuser, elle prétend seulement empêcher la liste de grandir.</summary>
        private static readonly string[] SansInsetConnus =
        {
            "DashboardController",
            "LaunderingController",
            "PipelineOverviewController",
        };

        private static readonly Regex Commentaire = new Regex(@"^\s*(///|//|\*|/\*)", RegexOptions.Compiled);
        private static readonly Regex Locataire = new Regex(@"class\s+(\w+)\s*:[^{]*IShellTenant", RegexOptions.Compiled);

        [Test]
        public void LesLocatairesQuiIgnorentLeChromeSontUneListeCONNUE()
        {
            string racine = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(racine), $"Assets/Scripts introuvable à {racine}");

            var tous = new List<string>();
            var sans = new List<string>();
            foreach (string chemin in Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories))
            {
                // Les commentaires sont exclus : ce fichier-ci, et plusieurs contrôleurs, PARLENT
                // de `ShellChrome` dans leur docstring. Compter la mention comme une lecture
                // rendrait la garde verte sur un écran qui explique l'inset sans le lire — le
                // défaut exact qu'elle cherche, certifié par son propre motif.
                string actif = string.Join("\n", File.ReadAllLines(chemin).Where(l => !Commentaire.IsMatch(l)));
                Match m = Locataire.Match(actif);
                if (!m.Success) continue;
                tous.Add(m.Groups[1].Value);
                if (!actif.Contains("ShellChrome.")) sans.Add(m.Groups[1].Value);
            }

            // ANTI-VACUITÉ : un motif qui ne trouve plus aucun locataire rendrait « la liste n'a
            // pas grandi » vrai à vide — le zéro le plus crédible qui soit.
            Assert.Greater(tous.Count, 20,
                $"seulement {tous.Count} locataire(s) reconnu(s) : le motif ne mord plus (une " +
                "déclaration sur plusieurs lignes, un renommage d'interface), et le verdict qui " +
                "suit ne vaudrait rien. Vus : [" + string.Join(", ", tous.OrderBy(x => x)) + "]");

            var attendus = new HashSet<string>(SansInsetConnus);
            var neufs = sans.Where(n => !attendus.Contains(n)).OrderBy(x => x).ToList();
            var partis = attendus.Where(n => !sans.Contains(n)).OrderBy(x => x).ToList();

            Assert.IsEmpty(neufs,
                $"{neufs.Count} locataire(s) NEUF(S) n'appellent jamais `ShellChrome` : [" +
                string.Join(", ", neufs) + "].\n`ContentSlot` couvre tout le canvas par conception " +
                "— un locataire qui s'y ancre sans lire l'inset pose son contenu DERRIÈRE le " +
                "bandeau, et ça ne se voit que sur une capture. Soit il lit l'inset, soit c'est un " +
                "FOND plein écran et il rejoint la liste ci-dessus AVEC sa raison écrite. " +
                $"Population : {tous.Count} locataires, {sans.Count} sans inset.");

            // ★ L'AUTRE SENS, et il compte autant : une entrée qui n'a plus de porteur est une
            //   exception qui a survécu à ce qu'elle excusait. Le dépôt en porte déjà deux dans
            //   d'autres allowlists, découvertes des semaines plus tard.
            Assert.IsEmpty(partis,
                $"{partis.Count} entrée(s) de la liste n'ont plus de porteur : [" +
                string.Join(", ", partis) + "]. Elles lisent désormais `ShellChrome` — les retirer " +
                "d'ici, sinon la liste protège un défaut qui n'existe plus et masque le prochain.");
        }
    }
}
