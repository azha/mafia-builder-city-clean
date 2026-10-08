namespace MafiaCleanCity.Mouvements
{
    /// <summary>
    /// Design §5 — le niveau de mouvement. `Aucun` : tests et contrôle négatif seulement (tout est figé, exceptions
    /// comprises — la planche anti-vacuité DOIT alors donner 0 %).
    /// </summary>
    public enum PolitiqueMouvement { Plein, Reduit, Aucun }

    /// <summary>Design §4 — l'état de délestage de la cadence (relatif à la cadence mesurée).</summary>
    public enum EtatDelestage { Normal, DemiCadence, Fige }

    /// <summary>
    /// Design §5 — la règle de gel, une fonction pure.
    /// `Reduit` : tout est figé à `PoseDeReposS` (évalué SANS `PhaseS`), y compris `Alerte`. Exceptions : (i) `Retour` garde
    /// le MÉLANGE de couleur — ou, pour un bouton sans `Graphic` qui rende, son voile `Alpha` (§17) —, sans échelle ;
    /// (ii) une entrée `Fonctionnelle` ne se gèle pas.
    /// Le voile se distingue de l'`Alpha` d'un autre `Retour` (le marqueur `carnet.en-main`) par la pose : un mouvement qui
    /// DÉCLARE une `PoseDeReposS` est figé et non sauté (§I.4), celui qui n'en déclare pas est gardé.
    /// </summary>
    public static class GelDeMouvement
    {
        public static bool Gele(PolitiqueMouvement politique, MouvementDefini m, Canal c)
        {
            switch (politique)
            {
                case PolitiqueMouvement.Aucun:
                    return true;
                case PolitiqueMouvement.Reduit:
                    if (m.Fonctionnelle) return false;
                    if (m.G == Genre.Retour && (c.P == Propriete.Melange || (c.P == Propriete.Alpha && !m.PoseDefinie))) return false;
                    return true;
                default:
                    return false;
            }
        }

        /// <summary>Le délestage « figé » ne touche que les `Ambiance` : une `Alerte` reste vivante, c'est sa raison d'être.</summary>
        public static bool GeleParDelestage(EtatDelestage etat, Genre g)
        {
            return etat == EtatDelestage.Fige && g == Genre.Ambiance;
        }
    }
}
