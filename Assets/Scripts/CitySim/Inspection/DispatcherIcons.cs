using UnityEngine;

namespace MafiaCleanCity.CitySim.Inspection
{
    /// <summary>Le glyphe dessiné du régime de dispatcher — troisième consommateur du seam partagé
    /// <see cref="MafiaCleanCity.Shell.FamilleDIcones"/>.
    ///
    /// ⚠️ COUVERTURE 4/4, et c'est la première famille PLEINE. Le domaine est déclaré à l'ancre
    /// `InspectionDtos.cs:55` — `dispatcher_regime // NOMINAL | BACKLOGGED | BUDGET_CUT | SURGE` —
    /// et l'atelier a dessiné exactement ces quatre-là. Le contrat `null ⇒ masquer` reste, pour le
    /// jour où le back en ajoute un cinquième : *une couverture pleine aujourd'hui n'est pas une
    /// garantie demain, et c'est un changement de DONNÉE qu'aucun compilateur ne verra.*
    ///
    /// ⛔ CE QUI A FAILLI ÊTRE MONTÉ AVEC, ET POURQUOI IL NE L'EST PAS. Mon critère de sélection —
    /// « un écran cite-t-il les sujets de la famille comme VALEUR DE DOMAINE CITÉE » — a classé
    /// `icon_sandpile` mûre à 3/3. **C'était un faux positif de mon propre instrument** : il a
    /// matché `"CRITICAL"` dans `LapseGlyph` (un palier de dérive : CRITICAL/HARD/SOFT) et
    /// `"STABLE"` dans une tendance de prix explicitement documentée comme une *hypothèse de clé*.
    /// Aucun des deux n'est un domaine de pile de sable, et le mot `sandpile` n'existe dans le code
    /// que comme sous-chaîne testée sur une cause d'exception.
    /// ⇒ *Un critère qui apparie des MOTS apparie les homonymes.* `critical` et `stable` sont assez
    /// communs pour matcher n'importe quel domaine — c'est le même piège du mot partagé qui a déjà
    /// coûté trois confusions ce soir (ancre/badge, disque/anneau, écran/canvas). La parade n'est
    /// pas un motif plus fin : c'est d'exiger que les sujets couvrent un domaine **déclaré à une
    /// ancre**, comme celui-ci l'est.</summary>
    public static class DispatcherIcons
    {
        private static readonly MafiaCleanCity.Shell.FamilleDIcones Famille =
            new MafiaCleanCity.Shell.FamilleDIcones("DispatcherIcons", "icon_dispatcher_", "_48");

        /// <summary>Les quatre régimes, LUS à l'ancre du DTO et non recopiés d'un document.</summary>
        public static readonly string[] RegimesCanoniques =
            { "NOMINAL", "BACKLOGGED", "BUDGET_CUT", "SURGE" };

        /// <summary>Le glyphe d'un régime, ou `null` si l'atelier n'en a pas produit.
        /// ⚠️ La clé du back est en MAJUSCULES, les fichiers en minuscules : la conversion vit ICI,
        /// à l'unique frontière entre les deux conventions.</summary>
        public static Sprite Pour(string regime) =>
            string.IsNullOrEmpty(regime) ? null : Famille.Pour(regime.ToLowerInvariant());
    }
}
