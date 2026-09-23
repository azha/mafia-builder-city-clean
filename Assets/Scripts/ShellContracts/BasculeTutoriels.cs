namespace MafiaCleanCity.Shell
{
    /// <summary>LA bascule des tutoriels, dans le sens du JOUEUR — le seul lieu de l'inversion (23/09).
    /// Le mot RATIFIÉ (Profil, série 6, cadres 95-96) : « On vous explique encore ». Le back sert un opt-OUT (`tutorials_opt_out`,
    /// `GET /v1/ui/tutorial-state`, `PATCH /v1/ui/tutorial-opt-out`). La bascule est donc ALLUMÉE quand l'opt-out est FAUX.
    /// ⛔ Deux écrans la dessinent — ㉕ (la première fois) et ⑲ (les réglages) — et tous deux passent ICI : une copie de l'inversion
    ///    dans chaque écran est exactement la façon dont l'un des deux finit par l'écrire à l'envers.</summary>
    public static class BasculeTutoriels
    {
        /// <summary>Allumée ⇔ on explique encore au joueur ⇔ `tutorials_opt_out` FAUX.</summary>
        public static bool Allumee(bool tutorialsOptOut) => !tutorialsOptOut;

        /// <summary>La valeur à envoyer à `tutorials_opt_out` pour une bascule mise à `allumee`.</summary>
        public static bool OptOutPour(bool allumee) => !allumee;
    }
}
