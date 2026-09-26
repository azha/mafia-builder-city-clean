namespace MafiaCleanCity
{
    /// <summary>B5 point 7 (f2 26/09) — LA SEULE source des paires de démo, et elle n'existe QU'EN ÉDITEUR. Avant, sept contrôleurs et
    /// AppShell portaient `operational_demo@example.test` / `operational-demo-pw` en initialiseur, et Boot.unity les sérialisait : la
    /// paire, mot de passe compris, était dans CHAQUE APK distribué (global-metadata.dat, mesuré par `strings` au 26/09 : ×2). Dans un
    /// build joueur, ces constantes sont VIDES : le joueur a son compte d'appareil (`CompteDeLAppareil`), jamais le compte de démo.
    /// `VerifierLApk` refuse un APK qui porterait encore la paire.</summary>
    public static class IdentiteDeDemo
    {
#if UNITY_EDITOR
        public const string Operationnelle = "operational_demo@example.test";
        public const string MotDePasseOperationnel = "operational-demo-pw";
        public const string Carte = "citymap_demo@example.test";
        public const string MotDePasseCarte = "citymap-demo-pw";
#else
        public const string Operationnelle = "";
        public const string MotDePasseOperationnel = "";
        public const string Carte = "";
        public const string MotDePasseCarte = "";
#endif
    }
}
