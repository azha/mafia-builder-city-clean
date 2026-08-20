namespace MafiaCleanCity.Shell
{
    // nav-hud-design-v1.md §6.4 (chunk 5, HUD v3.1) — lieu UNIQUE de résolution des 4 membres de
    // `HeatBucket` (back : `city-event-bus.ts:484`, `'COLD' | 'WARM' | 'HOT' | 'BURNING'` — un
    // domaine FERMÉ à 4 valeurs). Avant ce chunk, `DashboardController.HeatGlyph`/`HeatLabel`
    // (`DashboardController.cs:449-458`/`:460-469`, tous deux `private static`) portaient DÉJÀ cette
    // résolution en un `switch` à 4 branches ; le manomètre du HUD en aurait ajouté un SECOND,
    // séparé — exactement la dérive que ce dépôt a déjà payée sur un type homonyme
    // (`CombatOutcomeBucket`, CLAUDE.md). Ce fichier est le lieu unique ; `DashboardController`
    // est REPOINTÉ dessus (ses méthodes gardent leur signature/visibilité — seul le corps délègue).
    //
    // Vit dans `ShellContracts` (pas `Shell`, malgré le nom) — même raison qu'`IShellSessionSink`
    // dans ce même répertoire : `Operational` (DashboardController) référence `ShellContracts` mais
    // PAS `Shell` (référence circulaire sinon). Résolveur pur/statique, sans dépendance UnityEngine —
    // à sa place dans la frontière partagée, pas dans l'assembly UI complète.
    //
    // Résolveur EXHAUSTIF sur une entrée STRING (patron `DistrictInteriorScreenController.
    // ResolveArtPhase`) : un `default` qui renvoie silencieusement une valeur connue avalerait une
    // 5e valeur back — ici le repli est un membre NOMMÉ (`Rank.Unknown`), jamais une des 4 valeurs
    // réelles.
    public static class HeatBucketResolver
    {
        public enum Rank
        {
            Unknown = -1,
            Cold = 0,
            Warm = 1,
            Hot = 2,
            Burning = 3,
        }

        public static Rank ResolveRank(string bucket)
        {
            switch (bucket)
            {
                case "COLD": return Rank.Cold;
                case "WARM": return Rank.Warm;
                case "HOT": return Rank.Hot;
                case "BURNING": return Rank.Burning;
                default: return Rank.Unknown; // 5e valeur inattendue — jamais avalée par un repli connu
            }
        }

        // Byte-identique au `HeatLabel`/`HeatGlyph` pré-existants de DashboardController — la
        // valeur ne change pas, seul le LIEU où elle vit change (repointage, pas réécriture).
        public static string Label(string bucket)
        {
            switch (bucket)
            {
                case "COLD": return "Cold";
                case "WARM": return "Warm";
                case "HOT": return "Hot";
                case "BURNING": return "Burning";
                default: return string.IsNullOrEmpty(bucket) ? "Unknown" : bucket;
            }
        }

        public static string Glyph(string bucket)
        {
            switch (bucket)
            {
                case "COLD": return "[#...]";
                case "WARM": return "[##..]";
                case "HOT": return "[###.]";
                case "BURNING": return "[####]";
                default: return "[....]";
            }
        }

        // §6.4 / hud-F2 — 4 angles DISTINCTS, une par valeur RÉELLE de `Rank` (fonction PURE, hors
        // réseau — directement testable sans UI ni requête). Un balayage -60°..+60° (COLD à gauche,
        // BURNING à droite) — le juge de ce chunk est fonctionnel (§0 : le pixel-perfect du HUD vient
        // avec les écrans doctrine, #24) : seule la DISTINCTION des 4 arrêts compte ici, pas leur
        // valeur absolue. `Rank.Unknown` rend 0° — distinct des 4 valeurs réelles (aucune n'est nulle).
        public static float NeedleAngleDegrees(string bucket)
        {
            switch (ResolveRank(bucket))
            {
                case Rank.Cold: return -60f;
                case Rank.Warm: return -20f;
                case Rank.Hot: return 20f;
                case Rank.Burning: return 60f;
                default: return 0f;
            }
        }
    }
}
