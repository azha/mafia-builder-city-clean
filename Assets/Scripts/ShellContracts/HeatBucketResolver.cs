using System;
using UnityEngine;
using MafiaCleanCity.Theme;

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
    // PAS `Shell` (référence circulaire sinon). AMENDÉ (hud-session-arbitrages-design.md §2.4) : ce
    // fichier a maintenant une dépendance UnityEngine/Theme (`Severity`→`Color`) — le commentaire
    // "sans dépendance UnityEngine" ci-dessus n'est plus vrai depuis §2.4 et est corrigé ici plutôt
    // que laissé daté ; `ShellContracts.asmdef` référence `Theme` pour cette raison exacte.
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

        // hud-session-arbitrages-design.md §2.1 — canon `SeverityEnum`
        // (`global_conventions_core.md:205`) : EXACTEMENT 3 membres, point. Une 4e couleur serait un
        // token de plus et casserait `ExpectedTokenCount` (62 depuis HUD v3.1 boucle ⊥, 2026-08-21 —
        // le nombre bouge avec des additions légitimes ailleurs, la règle "3 membres, point" ne bouge pas) — STOP confirmé, §2.1.
        public enum Severity
        {
            Mild = 0,
            Moderate = 1,
            Severe = 2,
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

        // §2.2/§2.4 — LA bonne paire, canon (screen_2_city_map.md:148/:405 = gdd/15_glossary.md:2726,
        // screen_2a_building_card.md:308/:182) : {WARM, HOT} → MODERATE (ambre) ; BURNING → SEVERE ;
        // COLD → MILD (Deviation consignée §2.4 : le canon dit "COLD = aucun halo" — un halo absent
        // n'est pas une teinte de bande ; COLD prend Mild, seul membre non alarmant des 3).
        // Résolveur EXHAUSTIF sur `Rank` (enum fermé POSSÉDÉ par ce fichier) — M2 (hud-session-
        // arbitrages-design.md §3) : la « forme exhaustive sans default » n'existe pas pour un
        // `switch` STATEMENT en C# (un `switch` sans `default`, dans une méthode qui retourne, est
        // un CS0161 — donc AUCUN switch statement de ce dépôt n'est syntaxiquement "sans default" ;
        // c'est un `switch` EXPRESSION qui accepterait ça, avec un simple AVERTISSEMENT CS8509,
        // jamais une erreur — et 0 switch expression n'existe dans tout `Assets/Scripts`, aucun
        // précédent maison). Forme correcte : `case Rank.Unknown` EXPLICITE + `default: throw` — un
        // 5e membre futur devient BRUYANT (exception) au lieu de collisionner en silence avec le
        // repli d'`Unknown`. Le détecteur n'est PAS le compilateur ici : c'est un test qui énumère
        // `Enum.GetValues(typeof(Rank))` (voir `HudPlayModeTests.cs`, M2).
        public static Severity SeverityFor(Rank rank)
        {
            switch (rank)
            {
                case Rank.Cold: return Severity.Mild;
                case Rank.Warm: return Severity.Moderate;
                case Rank.Hot: return Severity.Moderate;
                case Rank.Burning: return Severity.Severe;
                case Rank.Unknown: return Severity.Mild; // repli EXPLICITE — le moins alarmant des 3
                default: throw new ArgumentOutOfRangeException(nameof(rank), rank,
                    "HeatBucketResolver.SeverityFor : membre de Rank non résolu — un 5e membre doit " +
                    "être traité explicitement ici, jamais collisionner en silence avec Unknown.");
            }
        }

        public static Severity SeverityFor(string bucket) => SeverityFor(ResolveRank(bucket));

        // Les 3 hex canon EXACTS (`global_conventions_core.md:50-52`), via `DesignTokens` — jamais un
        // hex en dur ici (R2.3 : tunables/couleurs jamais inline). Résolveur EXHAUSTIF sur `Severity`
        // (enum fermé POSSÉDÉ par ce fichier) — même forme que `SeverityFor` ci-dessus (M2).
        public static Color SeverityColor(Severity severity)
        {
            switch (severity)
            {
                case Severity.Mild: return DesignTokens.Current.accentSuccess;    // #43e0c0
                case Severity.Moderate: return DesignTokens.Current.accentWarning; // #ff9e3d
                case Severity.Severe: return DesignTokens.Current.accentDanger;    // #ff5a4d
                default: throw new ArgumentOutOfRangeException(nameof(severity), severity,
                    "HeatBucketResolver.SeverityColor : membre de Severity non résolu.");
            }
        }

        // §6.4 / hud-F2 — l'angle de rotation Z de l'aiguille, par rang.
        //
        // ⛔⛔ SIGNE CORRIGÉ LE 2026-08-21 — L'AIGUILLE ÉTAIT INVERSÉE ET LE HUD MENTAIT.
        // Les valeurs étaient `Cold=-60 … Burning=+60`, et la prose de ce bloc affirmait
        // « COLD à gauche, BURNING à droite ». La MESURE dit l'inverse : l'aiguille a son pivot en
        // bas (`TopBarController.cs:838`, `pivot=(0.5,0)`) et pointe vers le HAUT au repos ; sous la
        // rotation Z d'Unity (positif = ANTIHORAIRE à l'écran), le bout se retrouve à
        //     Z=-60 → 30° (DROITE) · Z=-20 → 70° (DROITE) · Z=+20 → 110° (GAUCHE) · Z=+60 → 150° (GAUCHE)
        // (mesuré sur un RectTransform réel aux dimensions de production, `GetWorldCorners`).
        // Or l'arc CHAUD est peint à DROITE : `TopBarController.cs:768-769` pose `ArcHot` en
        // `Origin180.Right`, et le commentaire qui l'accompagne a mesuré sa couverture réelle à
        // ≈[7°,91°]. ⇒ `Cold` pointait dans le rouge et `Burning` dans le teal, sur les quatre rangs.
        //
        // ★★ ET AUCUNE GARDE NE POUVAIT LE VOIR, parce que les deux qui existaient portaient sur les
        // NOMBRES et non sur l'ÉCRAN : `M2` vérifie que les 4 valeurs sont distinctes (une inversion
        // les garde distinctes) et `hud-F2` qu'elles sont strictement croissantes (`-60 < -20 < 20 <
        // 60` l'est autant que l'inverse). Le fichier de test le dit lui-même : il avait DÉJÀ été
        // durci une fois, de « distinctes » vers « croissantes », en nommant exactement le monde
        // dégénéré « une aiguille INVERSÉE » — et le durcissement a raté sa cible, parce que
        // « croissant » est une propriété de la SUITE, pas du CÔTÉ. La garde qui mord est celle qui
        // mesure la position du BOUT à l'écran (hud-F2 réécrite) et celle qui échantillonne la
        // COULEUR DE L'ARC sous ce bout (hud-F2b) — voir `HudPlayModeTests.cs`.
        //
        // Fonction PURE, hors réseau. Balayage +60°..-60° : COLD À GAUCHE, BURNING À DROITE — et
        // c'est désormais MESURÉ, pas affirmé.
        //
        // M2 — scindée en `(Rank)` + surcharge `(string)` : le détecteur (`HudPlayModeTests.cs`)
        // énumère `Enum.GetValues(typeof(Rank))` et appelle la forme `(Rank)` directement, pour que
        // tester 4 CHAÎNES écrites à la main ne laisse pas `Unknown` (ni un membre futur) hors champ.
        public static float NeedleAngleDegrees(Rank rank)
        {
            switch (rank)
            {
                case Rank.Cold: return 60f;      // Z=+60 ⇒ bout à 150° ⇒ GAUCHE (teal)
                case Rank.Warm: return 20f;      // Z=+20 ⇒ 110° ⇒ gauche du vertical
                case Rank.Hot: return -20f;      // Z=-20 ⇒  70° ⇒ droite du vertical
                case Rank.Burning: return -60f;  // Z=-60 ⇒  30° ⇒ DROITE (rouge/ambre)
                case Rank.Unknown: return 0f; // repli EXPLICITE — distinct des 4 valeurs réelles (aucune n'est nulle)
                default: throw new ArgumentOutOfRangeException(nameof(rank), rank,
                    "HeatBucketResolver.NeedleAngleDegrees : membre de Rank non résolu — un 5e membre " +
                    "doit être traité explicitement ici, jamais collisionner en silence avec Unknown.");
            }
        }

        public static float NeedleAngleDegrees(string bucket) => NeedleAngleDegrees(ResolveRank(bucket));
    }
}
