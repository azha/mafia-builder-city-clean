namespace MafiaCleanCity.Shell
{
    // Le lieu UNIQUE de résolution de la bande de portefeuille — le pendant, pour
    // `wallet.band`, de ce que `HeatBucketResolver` est pour `HeatBucket` (même
    // répertoire, même namespace, même raison de vivre dans `ShellContracts` : `Operational`
    // le référence, `Shell` non — dépendance circulaire sinon).
    //
    // ⛔ POURQUOI CE FICHIER EXISTE, et ce sont les TESTS qui l'ont demandé. La table
    // `FLUSH|HIGH|MODERATE|LOW|BROKE → libellé` vivait en TROIS exemplaires : dans
    // `DashboardController`, et recopiée dans `DashboardPlayModeTests.WalletLabelFor` et
    // `OperationalLoopPlayModeTests.WalletLabelFor` — les deux portant le commentaire
    // « kept in sync with the controller ». Deux copies qu'on doit garder parallèles sont une
    // dette, et celle-ci s'est présentée le jour où il a fallu TRADUIRE les libellés : le même
    // changement devait être fait à trois endroits, et un oubli aurait rendu le test vert sur
    // un écran faux — ou rouge sur un écran juste.
    // ★ Et le patron correct était déjà là, à deux lignes des copies : `HeatLabelFor` de ces
    //   mêmes tests délègue à `HeatBucketResolver.Label`. *Le bon outil à portée ne se choisit
    //   pas tout seul.*
    //
    // ⚠️ Les libellés passent par `Libelle.De` avec un repli FRANÇAIS : `Libelle` rend le
    // littéral quand la clé manque au bundle, donc un repli anglais resterait anglais à travers
    // la conversion (mesuré sur 107 replis le 2026-09-03, dont 81 anglais).
    //
    // Domaine FERMÉ à 5 valeurs (back : bande qualitative du portefeuille, R2.2/P5 — le joueur ne
    // voit jamais un scalaire). Le repli n'est PAS une des 5 : une 6e valeur back doit se voir,
    // pas se faire avaler par une branche connue.
    public static class WalletBandResolver
    {
        /// <summary>Le libellé affiché pour une bande servie. Rend la bande TELLE QUELLE si elle
        /// n'est pas des cinq — un `default` qui renverrait « Fauché » masquerait une valeur
        /// neuve du back derrière un mot plausible.</summary>
        public static string Label(string bande)
        {
            switch (bande)
            {
                case "FLUSH":    return MafiaCleanCity.I18n.Libelle.De("accueil", "etat", "À flot");
                case "HIGH":     return MafiaCleanCity.I18n.Libelle.De("accueil", "etat", "Confortable");
                case "MODERATE": return MafiaCleanCity.I18n.Libelle.De("accueil", "etat", "Correct");
                case "LOW":      return MafiaCleanCity.I18n.Libelle.De("accueil", "etat", "Juste");
                case "BROKE":    return MafiaCleanCity.I18n.Libelle.De("accueil", "etat", "Fauché");
                default:         return bande;
            }
        }
    }
}
