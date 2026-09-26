namespace MafiaCleanCity.Shell
{
    /// <summary>La CHARGE servie d'une planque (`load_bucket` de `GET /v1/city/district/:id/stash`, StashLoadBucket) — UNE fonction pour
    /// tout le client (f2 26/09) : l'Accueil (« La suite », CLIENT-1) et ㊵ (la filière) choisissent la planque la plus chargée par
    /// la MÊME règle. Ici, dans ShellContracts, pour être joignable d'Operational comme de Shell. Pur.</summary>
    public static class ChargeDePlanque
    {
        /// <summary>Le rang d'une charge servie (EMPTY 0 … FULL 4), -1 hors domaine.</summary>
        public static int Rang(string charge)
        {
            switch (charge)
            {
                case "EMPTY": return 0;
                case "LOW": return 1;
                case "NOMINAL": return 2;
                case "HIGH": return 3;
                case "FULL": return 4;
                default: return -1;
            }
        }

        /// <summary>Vrai si la planque tient de quoi blanchir (rang ≥ 1). Hors domaine ⇒ faux (on ne promet rien).</summary>
        public static bool TientDeQuoiBlanchir(string charge) => Rang(charge) >= 1;
    }
}
