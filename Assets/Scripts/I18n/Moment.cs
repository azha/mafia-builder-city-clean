using System.Collections.Generic;

namespace MafiaCleanCity.I18n
{
    /// <summary>UN MOMENT DIT PAR LA PHASE SERVIE (classe « moment en dur », f2 26/09 ; tables 77 et 78). Un en-tête qui dit l'heure
    /// présente (« ce matin », « ce soir ») se lit par la VALEUR de `day_phase` : clé `<prefixe>.<phase en minuscules>`, repli = le mot de
    /// l'atelier pour cette phase ; phase absente ou hors domaine ⇒ `<prefixe>.inconnu`. Jamais un moment écrit en dur. Pur (repli compté
    /// par `Libelle`).</summary>
    public static class Moment
    {
        public static readonly string[] Phases = { "DAWN", "DAY", "DUSK", "NIGHT" };

        /// <param name="replis">Le mot de l'atelier par phase servie (DAWN, DAY, DUSK, NIGHT), à l'octet de sa table.</param>
        public static string Dire(string prefixe, string phase, IDictionary<string, string> replis, string repliInconnu)
        {
            if (!string.IsNullOrEmpty(phase) && replis != null && replis.TryGetValue(phase, out string repli))
                return Libelle.Gabarit(prefixe + "." + phase.ToLowerInvariant(), repli);
            return Libelle.Gabarit(prefixe + ".inconnu", repliInconnu);
        }
    }
}
