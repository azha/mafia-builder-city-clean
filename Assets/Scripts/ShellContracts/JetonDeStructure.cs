namespace MafiaCleanCity.Shell
{
    /// <summary>Le JETON DE STRUCTURE de la journée — « une seule décision de structure par
    /// journée », confier · reprendre · raser comprises.
    ///
    /// ⛔ POURQUOI CE FICHIER EXISTE, ET POURQUOI ICI. Trois écrans du canon partagent ce plafond
    /// (㉜ le tableau de service, ㉝ raser un site, et toute graduation) : une seconde action
    /// structurelle dans la même session rend `409 STRUCTURAL_CAP_EXHAUSTED`. *Une contrainte
    /// transverse doit se voir à l'identique partout où elle mord, sinon le joueur la découvre par
    /// un refus.* Il faut donc UNE source, lisible par les trois.
    ///
    /// La donnée existe : `POST /v1/session/open` rend `structural_budget:{used, cap_reached}`
    /// (mesuré sur la pile dev le 2026-09-03), et le shell la reçoit déjà. Mais `StructuralBudgetDto`
    /// vit dans l'assembly `Shell`, et **`Shell` référence `Operational`** : un écran qui lirait le
    /// DTO du shell créerait un cycle d'assemblies, qu'asmdef refuse.
    /// ⇒ Mesuré à l'euro près le 2026-09-03 : `CS0246 StructuralBudgetDto could not be found`, deux
    /// fois, sur un contrôleur d'écran qui portait pourtant `using MafiaCleanCity.Shell;`. Le
    /// `using` était juste ; c'est l'ASSEMBLY qui manquait, et rien dans le code ne le disait.
    /// ⚠️ Et le contrôle de compilation hors-Unity du dépôt ne peut PAS attraper ça : il rassemble
    /// `Assets/Scripts` entier dans UNE seule compilation (`find … -name '*.cs'`), donc il ignore
    /// les frontières d'assembly par construction. Son vert répond à « la syntaxe et les types
    /// tiennent-ils ? », jamais à « le découpage en assemblies l'autorise-t-il ? ». *Deux questions,
    /// un seul vert — et c'est le genre d'écart qui fait conclure trop vite.*
    ///
    /// PATRON : `ShellChrome` (même dossier, même raison, même sens shell→locataire). `ShellContracts`
    /// est la seule assembly que le shell ET ses locataires voient tous les deux.
    ///
    /// ⚠️ NON CONNU ≠ DISPONIBLE, et la distinction est le cœur de ce fichier. Hors shell (tout test
    /// isolé, tout écran monté seul) personne ne publie : <see cref="Connu"/> vaut alors `false`, et
    /// un écran doit se rendre comme si le jeton était disponible — c'est le comportement d'avant que
    /// ce champ existe. Replier « non publié » sur « plafond atteint » éteindrait tous les gestes de
    /// tous les écrans montés hors shell ; replier sur `used = 0` sans dire qu'on ne sait pas ferait
    /// AFFIRMER à l'écran une valeur que personne n'a mesurée. Les deux se distinguent donc.</summary>
    public static class JetonDeStructure
    {
        /// <summary>`true` dès qu'une ouverture de session a publié le budget. `false` signifie
        /// « personne n'a mesuré », jamais « zéro décision prise ».</summary>
        public static bool Connu { get; private set; }

        /// <summary>`structural_budget.used` — le nombre de décisions structurelles déjà prises
        /// dans la session. Vaut 0 tant que <see cref="Connu"/> est `false`.</summary>
        public static int Utilises { get; private set; }

        /// <summary>`structural_budget.cap_reached` — le serveur refusera la prochaine décision
        /// structurelle (409). Vaut `false` tant que <see cref="Connu"/> est `false`.</summary>
        public static bool PlafondAtteint { get; private set; }

        /// <summary>Écrit par le shell UNIQUEMENT, à chaque `session/open`. Les locataires lisent.</summary>
        public static void Publier(int utilises, bool plafondAtteint)
        {
            Utilises = utilises;
            PlafondAtteint = plafondAtteint;
            Connu = true;
        }

        /// <summary>Remet l'état « personne n'a mesuré » — réservé aux tests qui doivent prouver le
        /// comportement hors shell. ⛔ Sans ça, un test qui publie contamine tous les suivants du
        /// même processus : les suites PlayMode de ce dépôt tournent SÉRIELLES dans un seul
        /// processus, et un état statique laissé derrière soi est exactement le genre de dette qui
        /// fabrique un vert ou un rouge selon l'ordre des voisins.</summary>
        public static void OublierPourTest()
        {
            Utilises = 0;
            PlafondAtteint = false;
            Connu = false;
        }
    }
}
