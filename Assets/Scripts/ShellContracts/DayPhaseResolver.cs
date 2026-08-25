using System;

namespace MafiaCleanCity.Shell
{
    /// <summary>
    /// Le libellé affichable d'un quart du jour.
    ///
    /// POURQUOI ce fichier existe : `TopBarController.SetDayPhase` posait la valeur du back
    /// TELLE QUELLE dans le bandeau. Le joueur lisait donc `DAWN` — une valeur d'enum de la base
    /// de données, en capitales, au milieu d'un bandeau qui écrit `JOUR 1` juste à côté. La
    /// chaleur, elle, a son résolveur depuis toujours (`HeatBucketResolver.Label` : COLD → « Cold »).
    /// C'était une asymétrie, pas une décision : deux valeurs d'enum voisines dans le même widget,
    /// l'une traduite, l'autre brute.
    ///
    /// ⚠️ CE FICHIER NE TRANCHE PAS LA LANGUE DE L'INTERFACE. Le registre retenu est celui du
    /// résolveur voisin (titre anglais capitalisé), parce que c'est ce que le programme SHIPPE
    /// aujourd'hui — le canon nomme les onglets en anglais (`global_conventions_core.md:197`,
    /// « Home / City / Org / Pipeline / More ») et les deux locales GA sont `en-US` et `fr-FR`.
    /// Que le bandeau mélange aujourd'hui du français (`ARGENT`, `JOUR`, `← Carte`, venus de la
    /// maquette ratifiée) et de l'anglais est une INCOHÉRENCE RÉELLE, mais c'est un arbitrage
    /// produit — pas un correctif lisible dans le code. Elle est remontée, pas tranchée ici.
    /// </summary>
    public static class DayPhaseResolver
    {
        /// <summary>Les quatre quarts que le back peut émettre (`DistrictInteriorDto.day_phase`,
        /// `CityProjectionDtos.cs:120`). Exposés pour que le détecteur d'un 5ᵉ membre soit un TEST
        /// qui les ÉNUMÈRE — côté C#, sur une valeur qui arrive en `string`, le compilateur ne peut
        /// rien voir : il n'y a pas d'enum à rendre exhaustif.</summary>
        public static readonly string[] CanonicalPhases = { "DAWN", "DAY", "DUSK", "NIGHT" };

        /// <summary>Le libellé lisible. Un quart inconnu est rendu TEL QUEL plutôt que masqué :
        /// voir passer une valeur brute est un signal, la voir disparaître n'en est pas un — même
        /// posture que `HeatBucketResolver.Label`.</summary>
        public static string Label(string dayPhase)
        {
            if (string.IsNullOrEmpty(dayPhase)) return "—";
            switch (dayPhase)
            {
                // ⛔ CES QUATRE LIBELLÉS ÉTAIENT EN ANGLAIS, ET C'EST UN JUGE VISUEL ⊥ QUI L'A
                // CLASSÉ BLOQUANT — pas une relecture. « Dawn » s'affichait en grand, à la place
                // de l'heure du canon, dans un écran dont TOUT le reste est français : REVENU ·
                // CHAÎNE · ÉTAT · Au repos · Coupée · Sain · COLLECTER · BLANCHIR · AMÉLIORER ·
                // ACCUEIL · FAMILLE · FILIÈRE · PLUS · Froid · CHALEUR · JOUR 1.
                //   Le test qui gardait ce résolveur exigeait explicitement « LE MÊME MOT », au
                //   motif que « la langue de l'interface est un arbitrage produit OUVERT ». Il ne
                //   l'était plus : il avait été tranché **en pratique, partout ailleurs**, sans que
                //   personne ne revienne ici. *Un énoncé daté qui se déclare ouvert n'est pas plus
                //   fiable qu'un autre : il vieillit exactement pareil.*
                // ⇒ « Plein jour » et non « Jour » : le libellé voisin est « JOUR 1 » (le compteur
                //   de jours), et deux « JOUR » côte à côte se lisent comme une répétition.
                //   « Soirée » est le mot du canon lui-même (`JOUR 12 · SOIRÉE`).
                case "DAWN": return "Aube";
                case "DAY": return "Plein jour";
                case "DUSK": return "Soirée";
                case "NIGHT": return "Nuit";
                default: return dayPhase;
            }
        }
    }
}
