using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>
    /// L1 (design Tools/anim-l1/design-l1.md, ratifié f2 11/11) — la COURSE du curseur d'un interrupteur, partagée par ⑲ (`Bascule_Tutoriels`, `Bascule_Marche`) et ㉕.
    /// Les contrôleurs RECONSTRUISENT la ligne à chaque rendu : le curseur est déjà à sa position d'ARRIVÉE `xArr` (ancré à droite si allumé, à gauche sinon) ;
    /// le départ est le même décalage dans le repère d'arrivée, `xArr − sens·Dx` (`sens` = +1 s'il s'allume, −1 sinon). `Transitionner` `Absolu` de → vers :
    /// la régie n'applique pas `Reglage.Dx` (dette 15), et la piste est libérée d'elle-même à la fin (`vers == base == xArr`, `FinRejointLaBase`).
    /// La couleur de la piste n'est PAS animée (`Melange` ne porte pas l'alpha) : elle garde l'ancienne pendant la course, la nouvelle est posée à l'arrivée.
    /// Sans piste (pas de régie, refus de quota) : la couleur finale est posée aussitôt = le comportement d'avant.
    /// </summary>
    public static class CourseDeBascule
    {
        /// <summary>Lance la course. `dx` = la course du curseur en unités d'`anchoredPosition` (l'appelant : `Px(10f)` = piste `Px(22)` − curseur `Px(10)` − 2 × retrait `Px(1)`).
        /// Rend la piste (nulle ⇒ couleur finale déjà posée).</summary>
        public static Handle Lancer(RectTransform curseur, Image piste, bool allumee, Color couleurDepart, Color couleurFinale, float dx)
        {
            if (curseur == null || piste == null) return Handle.Nul;
            float xArr = curseur.anchoredPosition.x;
            float sens = allumee ? 1f : -1f;
            piste.color = couleurDepart;
            Handle h = RegieMouvement.Transitionner(CatalogueHud.BasculeCourse, curseur, xArr - sens * dx, xArr, _ =>
            {
                if (piste != null) piste.color = couleurFinale;   // la ligne a pu être reconstruite pendant la course : l'`Image` détruite est tolérée
            });
            if (h.EstNul) piste.color = couleurFinale;
            return h;
        }
    }
}
