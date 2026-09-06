using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Shell.Tests
{
    /// <summary>LES DEUX ÉCRANS QUI MONTRENT LA CARTE DE DÉCISION DOIVENT LA NOMMER PAREIL.
    ///
    /// Deux propriétés, et elles sont de natures différentes — c'est pour ça qu'il y a deux tests :
    ///   · de VALEUR : chaque bande réellement servie reçoit un libellé français distinct et un
    ///     rang de jauge cohérent. C'est ce que le défaut d'origine violait — quatre des six
    ///     valeurs servies rendaient « — » et ZÉRO pastille sur l'écran dont c'est le sujet ;
    ///   · de STRUCTURE : personne d'autre ne nomme ces grandeurs. Sans elle, la première est
    ///     satisfaite pendant qu'un second producteur ressuscite ailleurs — exactement ce qui
    ///     s'était passé ici (l'Accueil en anglais, ⑤ en français, sur le même champ).
    ///
    /// ⚠️ « Les deux écrans rendent la même chaîne » ne s'asserte PAS directement : depuis qu'un
    /// seul code la produit, ce serait une tautologie du correctif. La propriété qui garde sa
    /// force est l'UNICITÉ du producteur, et elle se lit dans les sources.</summary>
    [Category("Charpente")]
    public class LibellesDecisionPlayModeTests
    {
        [Test]
        public void ChaqueBandeServieRecoitUnLibelleEtUnRang()
        {
            // ANTI-VACUITÉ : un domaine vidé rendrait tout le reste vrai sans rien parcourir.
            Assert.AreEqual(3, LibellesDecision.PorteesServies.Length, "le domaine de la portée a changé de taille — le back sert 3 valeurs");
            Assert.AreEqual(3, LibellesDecision.UrgencesServies.Length, "le domaine de l'urgence a changé de taille — le back sert 3 valeurs");

            foreach ((string[] domaine, bool urgence, string nom) in new[]
                     {
                         (LibellesDecision.PorteesServies, false, "portée"),
                         (LibellesDecision.UrgencesServies, true, "urgence"),
                     })
            {
                var vus = new List<string>();
                for (int i = 0; i < domaine.Length; i++)
                {
                    string v = domaine[i];
                    string lib = urgence ? LibellesDecision.Urgence(v) : LibellesDecision.Portee(v);
                    Assert.IsNotEmpty(lib, $"{nom} « {v} » ne rend rien");
                    Assert.AreNotEqual("—", lib,
                        $"{nom} « {v} » rend le tiret, qui est réservé à l'ABSENCE : le back sert " +
                        "cette valeur, l'écran doit la dire. C'est le défaut d'origine — quatre des " +
                        "six valeurs servies tombaient sur le repli.");
                    Assert.AreNotEqual(v, lib,
                        $"{nom} « {v} » rend la valeur BRUTE : le joueur lit l'enum du back.");
                    vus.Add(lib);

                    // Le rang suit la POSITION dans le domaine — une jauge à zéro sur une valeur
                    // servie dirait « rien » là où le back dit « majeure ».
                    Assert.AreEqual(i + 1, LibellesDecision.Rang(v, urgence),
                        $"{nom} « {v} » : rang {LibellesDecision.Rang(v, urgence)} au lieu de {i + 1}");
                }
                // ANTI-DÉGÉNÉRESCENCE : trois libellés identiques satisferaient tout ce qui précède
                // et ne diraient plus rien au joueur.
                Assert.AreEqual(vus.Count, vus.Distinct().Count(),
                    $"les libellés de {nom} ne sont pas distincts : [{string.Join(" · ", vus)}]");
            }

            // L'ABSENCE, elle, garde le tiret — et c'est une propriété séparée : le monde « pas de
            // donnée » et le monde « valeur inattendue » ne se répondent pas pareil.
            Assert.AreEqual("—", LibellesDecision.Portee(null));
            Assert.AreEqual("—", LibellesDecision.Urgence(""));
            Assert.AreEqual(0, LibellesDecision.Rang("", false), "aucune pastille sur une absence");
            // Et une valeur INCONNUE sort brute : la voir est un signal, la fondre n'en est pas un.
            Assert.AreEqual("zzz_hors_domaine", LibellesDecision.Portee("zzz_hors_domaine"));
            Assert.AreEqual(0, LibellesDecision.Rang("zzz_hors_domaine", false),
                "on n'allume pas une pastille sur une valeur qu'on n'a pas comprise");
        }

        [Test]
        public void AucunAutreCodeNeNommeCesGrandeurs()
        {
            string racine = Path.Combine(Application.dataPath, "Scripts");
            var commentaire = new Regex(@"^\s*(///|//|\*|/\*)");
            // Les mots ANGLAIS que les deux résolveurs supprimés rendaient. Les revoir en littéral
            // signifie qu'un second producteur est revenu.
            var anglais = new Regex("\"(Minor|Moderate|Major|Elevated|Pressing)\"");
            // Et la clé de type posée BRUTE dans un texte rendu — l'autre moitié du défaut.
            var bruteDansTexte = new Regex(@"\.text\s*=\s*[^;]*decision_type_key\s*;");

            // ⛔⛔ LA POPULATION EST LA BONNE, ET MA PREMIÈRE VERSION NE L'ÉTAIT PAS. Elle balayait
            //    TOUT `Assets/Scripts` pour les mots « Major », « Moderate », « Elevated » — et
            //    accusait quatre lignes de `BuildingCardController`, qui parlent d'un domaine SANS
            //    RAPPORT (`raid_risk`, en MAJUSCULES, `ELEVATED`/`MAJOR`). Quatre fautifs, zéro
            //    défaut. *Un motif qui rend PLUS que ce qu'on cherchait est un signal aussi fort
            //    qu'un motif qui rend moins — dans les deux cas il ne mesure pas ce qu'on croit.*
            //    ⇒ La population est celle des fichiers qui CONSOMMENT la carte de décision — ceux
            //      qui lisent `impact_bucket`, `urgency_bucket` ou `decision_type_key`. Elle se
            //      calcule, elle ne s'énumère pas : un troisième écran qui consommerait la carte
            //      demain y entrerait tout seul, ce qu'une allowlist de noms n'aurait pas fait.
            var consommateurs = new Regex(@"impact_bucket|urgency_bucket|decision_type_key");
            var fautifs = new List<string>();
            int lignesLues = 0, fichiersDansLaPopulation = 0;
            foreach (string chemin in Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories))
            {
                string rel = chemin.Substring(racine.Length).TrimStart(Path.DirectorySeparatorChar).Replace('\\', '/');
                string[] lignes = File.ReadAllLines(chemin);
                string[] actives = lignes.Where(l => !commentaire.IsMatch(l)).ToArray();
                // Le producteur lui-même est évidemment dans la population : c'est LUI qui nomme.
                if (rel.EndsWith("LibellesDecision.cs")) continue;
                if (!actives.Any(l => consommateurs.IsMatch(l))) continue;
                fichiersDansLaPopulation++;
                for (int i = 0; i < lignes.Length; i++)
                {
                    if (commentaire.IsMatch(lignes[i])) continue;
                    lignesLues++;
                    if (anglais.IsMatch(lignes[i])) fautifs.Add($"{rel}:{i + 1} — mot anglais de bande : {lignes[i].Trim()}");
                    if (bruteDansTexte.IsMatch(lignes[i])) fautifs.Add($"{rel}:{i + 1} — clé de type posée BRUTE : {lignes[i].Trim()}");
                }
            }
            // ANTI-VACUITÉ SUR LA POPULATION ELLE-MÊME : si plus aucun fichier ne consomme la carte,
            // le verdict est vide pour la mauvaise raison. Les deux écrans connus la consomment.
            Assert.GreaterOrEqual(fichiersDansLaPopulation, 2,
                $"seulement {fichiersDansLaPopulation} fichier(s) consomment la carte de décision : " +
                "la population s'est effondrée, et « aucun fautif » ne voudrait plus rien dire.");

            // ANTI-VACUITÉ : « aucun fautif » et « rien lu » ont la même sortie sinon.
            Assert.Greater(lignesLues, 200,
                $"seulement {lignesLues} lignes lues dans les {fichiersDansLaPopulation} fichier(s) " +
                "de la population : le balayage n'a rien lu, et son zéro ne vaudrait rien.");

            Assert.IsEmpty(fautifs,
                $"{fautifs.Count} site(s) nomment ces grandeurs hors de `LibellesDecision` :\n    " +
                string.Join("\n    ", fautifs) +
                "\nDeux écrans montrent la même carte de la même réponse ; un seul code doit la " +
                "nommer, sinon le prochain qui change un mot n'en change qu'un — c'est comme ça " +
                "que l'Accueil disait « Moderate » quand son détail disait « modérée ».");
        }
    }
}
