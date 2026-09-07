using System.Collections.Generic;
using UnityEngine;

namespace MafiaCleanCity.Operational.Lieutenant
{
    /// <summary>Le glyphe DESSINÉ d'un archétype de lieutenant — deuxième consommateur du seam
    /// partagé <see cref="MafiaCleanCity.Shell.FamilleDIcones"/>.
    ///
    /// ⛔⛔ CE LOT N'AJOUTE PAS UN GLYPHE : IL EN REMPLACE UN. La ligne de roster portait déjà un
    /// glyphe, en TEXTE (`[C]`, `[S]`, `[B]`…), posé pour une raison qui n'a pas changé — a11y F2,
    /// la FORME porte le sens à côté de la couleur. Le remplacer par un dessin n'est donc légitime
    /// que si le dessin porte la même propriété **au moins aussi bien**, et si le cas non couvert
    /// garde l'ancien glyphe plutôt que rien. Les deux tiennent ici, et c'est ce qui distingue une
    /// substitution d'une régression déguisée en montage.
    ///
    /// ⚠️ COUVERTURE 6/10 — et le dénominateur est publié parce qu'un compte qui n'explique pas ce
    /// qu'il ne couvre pas se lit plus large qu'il n'est. Le domaine est
    /// `FamilleLabels.ArchetypesCanoniques` (10 valeurs, LU dans le code et non recopié). L'atelier
    /// a dessiné `BOOKKEEPER, COOK, DISTRIBUTION, LAUNDERING, LOGISTICS, SECURITY` — c'est-à-dire
    /// EXACTEMENT les six que `FamilleLabels` fait passer par le catalogue i18n. Les quatre sans
    /// dessin sont `MUSCLE`, `INTELLIGENCE`, `FACILITY_MANAGER` (les trois que `FamilleLabels`
    /// refuse délibérément de router, faute de clés servies) et le repli `UNKNOWN`.
    /// ★ *L'atelier et le résolveur de libellés se sont arrêtés à la même frontière sans se parler.*
    /// Ce n'est donc pas un reste inexpliqué : c'est la frontière du contenu ratifié.
    ///
    /// ⛔ CONTRAT : `null` ⇒ l'appelant garde le glyphe TEXTE. Jamais un dessin de repli partagé —
    /// il remettrait deux archétypes sous la même image, et un glyphe faux est pire qu'un glyphe
    /// absent. C'est la même règle que pour les bâtiments, avec un repli meilleur : ici il existe
    /// déjà quelque chose qui porte la forme.</summary>
    public static class ArchetypeIcons
    {
        private static readonly MafiaCleanCity.Shell.FamilleDIcones Famille =
            new MafiaCleanCity.Shell.FamilleDIcones("ArchetypeIcons", "icon_archetype_", "_48");

        /// <summary>Le glyphe dessiné d'un archétype, ou `null` si l'atelier n'en a pas produit.
        /// ⚠️ La clé du back est en MAJUSCULES (`COOK`) et les fichiers de l'atelier en minuscules
        /// (`icon_archetype_cook_48`) : la conversion vit ICI, à l'unique frontière entre les deux
        /// conventions, plutôt que d'être recopiée chez chaque appelant.</summary>
        public static Sprite Pour(string archetype) =>
            string.IsNullOrEmpty(archetype) ? null : Famille.Pour(archetype.ToLowerInvariant());

        /// <summary>Pour les détecteurs — recalculé, jamais mémorisé.</summary>
        public static int CompteCouverts(IEnumerable<string> archetypes)
        {
            int n = 0;
            foreach (var a in archetypes) if (Pour(a) != null) n++;
            return n;
        }
    }
}
