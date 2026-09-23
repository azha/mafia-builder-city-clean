namespace MafiaCleanCity.I18n
{
    /// <summary>LES REPLIS « INCONNU » DU CLIENT — atelier 28 (`26c8e265`, `28-mots-inconnus.md`) ; règle tranchée par f2 le 23/09 : un
    /// joueur ne voit JAMAIS une valeur machine brute, ni un littéral hors `Libelle`. Chaque résolveur rend, hors domaine, le mot de SA
    /// famille :
    ///   · une BANDE (un état, affiché après le titre de sa ligne) ⇒ « état inconnu » (le mot porte son nom, il ne s'accorde avec rien) ;
    ///   · une SORTE (type, substance, véhicule, rôle, jeton de règle, palier) ⇒ « type inconnu » ;
    ///   · un NOM de bâtiment absent ⇒ « le bâtiment » (Distribution, en cours de phrase) / « Un bâtiment » (Démolition, en tête).
    /// Les 12 formes déjà servies et accordées (« Catégorie inconnue », « Mode inconnu »…) restent où elles sont : ces deux formes
    /// neutres couvrent les familles qui n'avaient rien.
    /// ⚠️ Une valeur ABSENTE reste « — » (TD-644 : un tiret n'a pas de langue) : ces mots sont pour une valeur PRÉSENTE hors domaine.
    /// ⚠️ La dérive de domaine (une 5ᵉ bande) se voit par un TEST de couverture de domaine, jamais par l'œil du joueur.</summary>
    public static class Repli
    {
        public static string EtatInconnu => Libelle.De("commun", "repli", "état inconnu");
        public static string TypeInconnu => Libelle.De("commun", "repli", "type inconnu");
        public static string LeBatiment => Libelle.De("commun", "repli", "le bâtiment");
        public static string UnBatiment => Libelle.De("commun", "repli", "Un bâtiment");

        /// <summary>Le repli d'une BANDE : « — » si elle est absente, « état inconnu » si elle est présente hors domaine.</summary>
        public static string Etat(string valeurServie) => string.IsNullOrWhiteSpace(valeurServie) ? "—" : EtatInconnu;

        /// <summary>Le repli d'une SORTE : « — » si elle est absente, « type inconnu » si elle est présente hors domaine.</summary>
        public static string Type(string valeurServie) => string.IsNullOrWhiteSpace(valeurServie) ? "—" : TypeInconnu;
    }
}
