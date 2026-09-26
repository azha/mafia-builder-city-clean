using System.Collections.Generic;

namespace MafiaCleanCity.Shell
{
    /// <summary>L'ÉTAT STATIQUE QUE LE SHELL PUBLIE pour ses locataires — recensé en UN endroit, et rendu en UN endroit (2026-09-24).
    ///
    /// ⛔ POURQUOI (mesuré au créneau du 24/09) : un test qui monte le vrai shell laisse derrière lui les marges du chrome
    /// (`ShellChrome.PublierInsets`) ; l'écran ㉙ monté HORS shell par la classe suivante bâtit son corps entre ces marges d'un shell
    /// détruit — `EcranConflitE12` vert seul, rouge après `AdresseDuBack`. 23 classes de test montent le vrai shell ; aucune ne
    /// rendait ses statiques. *Un état global laissé derrière soi fabrique un vert ou un rouge selon l'ordre des voisins.*
    ///
    /// **Le point unique** : `MafiaCI` appelle <see cref="RendrePourTest"/> à la sortie de CHAQUE classe (même crochet que le
    /// catalogue i18n), et nomme la classe qui sortait avec un état publié. La garde `EtatDuShellPlayModeTests` tient la liste
    /// <see cref="Couverts"/> ÉGALE aux statiques mutables réels de `ShellContracts` et de `Shell` (par réflexion) : un statique neuf
    /// publié par le shell rougit tant qu'il n'est pas rendu ici.</summary>
    public static class EtatPublieParLeShell
    {
        /// <summary>Les statiques mutables publiés par le shell, sous la forme `Type.Membre` — ce que <see cref="RendrePourTest"/> rend.</summary>
        public static readonly IReadOnlyList<string> Couverts = new[]
        {
            "ShellChrome.TopInsetPx",
            "ShellChrome.BottomInsetPx",
            "JetonDeStructure.Connu",
            "JetonDeStructure.Utilises",
            "JetonDeStructure.PlafondAtteint",
            "PhaseDeSession.DayPhase",   // classe « moment en dur » (26/09) : la phase servie à l'ouverture
        };

        /// <summary>Les statiques mutables de `Shell` que cette assembly NE PEUT PAS rendre (`ShellContracts` ne voit pas `AppShell` :
        /// ce serait un cycle) — des SEAMS d'entrée que les tests posent, rendus par `MafiaCI.TestFinished` à la sortie de CHAQUE
        /// classe (garde `EtatDuShellPlayModeTests.S2`). Trouvé par S1 au créneau du 26/09 : `AppShell.SafeAreaProvider` (21/08),
        /// posé par ChromeSafeArea et RedimensionnementSondeSeam, qui le rendent à leur TearDown — une classe qui oublierait fuirait.</summary>
        public static readonly IReadOnlyList<string> RendusParMafiaCI = new[]
        {
            "AppShell.SafeAreaProvider",
        };

        /// <summary>Vrai quand rien n'a été publié : l'état d'un processus où aucun shell n'a tourné.</summary>
        public static bool Vierge =>
            ShellChrome.TopInsetPx == 0f && ShellChrome.BottomInsetPx == 0f
            && !JetonDeStructure.Connu && JetonDeStructure.Utilises == 0 && !JetonDeStructure.PlafondAtteint
            && PhaseDeSession.DayPhase == null;

        /// <summary>Ce qui est publié, pour qu'un journal NOMME l'état laissé (vide si <see cref="Vierge"/>).</summary>
        public static string Decrire()
        {
            if (Vierge) return string.Empty;
            return $"insets haut={ShellChrome.TopInsetPx} bas={ShellChrome.BottomInsetPx} · jeton connu={JetonDeStructure.Connu} " +
                   $"utilisés={JetonDeStructure.Utilises} plafond={JetonDeStructure.PlafondAtteint} phase={PhaseDeSession.DayPhase}";
        }

        /// <summary>⛔ Réservé aux tests et à `MafiaCI` : l'état « aucun shell n'a tourné ».</summary>
        public static void RendrePourTest()
        {
            ShellChrome.PublierInsets(0f, 0f);
            JetonDeStructure.OublierPourTest();
            PhaseDeSession.Oublier();
        }
    }
}
