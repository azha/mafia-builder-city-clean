using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace MafiaCleanCity.Shell
{
    /// <summary>LA RÈGLE DE SÉLECTION DES TESTS PAR CATÉGORIE, telle qu'Unity l'applique — pour que `MafiaCI` COMPTE ce qu'Unity EXÉCUTE.
    ///
    /// ⛔ Le défaut (créneau du 08/10 nuit, mesuré par CLIENT-2) : un filtre ancré (`^EcranVitrine$`) exécutait les bons tests, mais le
    ///    compteur de « déclarés » de `MafiaCI` comparait par ÉGALITÉ — « déclarés 0 », donc FILTRE VIDE et VERDICT code=1 sur un run vert.
    ///    Il ne lisait aussi que les catégories PROPRES d'un test, quand Unity lit celles de ses ancêtres.
    /// La règle, lue dans la source du paquet (com.unity.test-framework, `RuntimeTestRunnerFilter.cs:31` :
    /// `new CategoryFilterExtended(s) { IsRegex = true }` ; `TestExtensions.GetAllCategoriesFromTest`) : un test est PRIS si UNE de ses
    /// catégories — les siennes ET celles de TOUS ses ancêtres ; aucune ⇒ « Uncategorized » — vérifie `Regex.IsMatch(catégorie, filtre)`
    /// pour UN des filtres (regex NON ANCRÉE : `Vitrine` prend `PhotoVitrine` ; `^Vitrine$` ne prend que `Vitrine`). Pure.</summary>
    public static class FiltreDeCategories
    {
        /// <summary>La catégorie qu'Unity donne à un test sans aucune catégorie sur son chemin (`CategoryFilterExtended.k_DefaultCategory`).</summary>
        public const string SansCategorie = "Uncategorized";

        /// <summary>Un test dont le CHEMIN (lui et ses ancêtres) porte `categoriesDuChemin` est-il pris par `filtre` ? Filtre vide ⇒ tout est pris.</summary>
        public static bool Pris(IEnumerable<string> categoriesDuChemin, string[] filtre)
        {
            if (filtre == null || filtre.Length == 0) return true;
            var cats = new List<string>();
            if (categoriesDuChemin != null) foreach (string c in categoriesDuChemin) if (c != null) cats.Add(c);
            if (cats.Count == 0) cats.Add(SansCategorie);
            foreach (string c in cats)
                foreach (string f in filtre)
                    if (!string.IsNullOrEmpty(f) && Regex.IsMatch(c, f)) return true;
            return false;
        }

        /// <summary>Le NOM qu'un élément du filtre demande : `^X$` ⇒ `X` ; un nom nu se demande lui-même. Sert à nommer les catégories
        /// exécutées SANS avoir été demandées (une regex nue en emporte d'autres). Pure.</summary>
        public static string NomDemande(string f) =>
            f != null && f.Length >= 2 && f[0] == '^' && f[f.Length - 1] == '$' ? f.Substring(1, f.Length - 2) : f;

        /// <summary>Une catégorie exécutée était-elle DEMANDÉE (par son nom exact, nu ou ancré) ? Pure.</summary>
        public static bool Demandee(string categorie, string[] filtre)
        {
            if (filtre == null) return false;
            foreach (string f in filtre) if (NomDemande(f) == categorie) return true;
            return false;
        }
    }
}
