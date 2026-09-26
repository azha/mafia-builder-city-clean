namespace MafiaCleanCity.Shell
{
    /// <summary>LA PHASE DU JOUR que le shell PUBLIE pour ses locataires (classe « moment en dur », f2 26/09). `session/open` projette
    /// `day_phase` (DAWN | DAY | DUSK | NIGHT, null sans minute de jeu — back session-open-sequence.service.ts:353), figé à l'ouverture
    /// (F14, comme le bandeau hors district). Les écrans d'Operational ne voient pas `AppShell` (cycle d'assemblies) : ils lisent ICI.
    /// Rendu entre les classes de test par `EtatPublieParLeShell.RendrePourTest` (recensé dans `Couverts`).</summary>
    public static class PhaseDeSession
    {
        /// <summary>La phase servie à la dernière ouverture de session ; null si non servie ou pas encore ouverte.</summary>
        public static string DayPhase { get; private set; }

        public static void Publier(string dayPhase) => DayPhase = string.IsNullOrWhiteSpace(dayPhase) ? null : dayPhase.Trim();

        /// <summary>⛔ Réservé aux tests et à `EtatPublieParLeShell.RendrePourTest`.</summary>
        public static void Oublier() => DayPhase = null;
    }
}
