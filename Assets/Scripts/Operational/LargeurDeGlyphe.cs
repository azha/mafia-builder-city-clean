using TMPro;
using UnityEngine;

namespace MafiaCleanCity.Operational
{
    /// <summary>La largeur d'une colonne de glyphes, MESURÉE par TMP — jamais posée à la main.
    ///
    /// ⛔ POURQUOI CE FICHIER EXISTE. Le 2026-09-02, la garde de lisibilité a trouvé sur ②
    /// « [####] » posé à 4 caractères sur 6 : la colonne était figée à 46 px, choisie pour le
    /// glyphe le plus COURT du vocabulaire (« [#] »), et coupait les plus longs. À l'écran ça
    /// donne « [## », qui ressemble à un glyphe court et non à un glyphe coupé — j'avais
    /// photographié cet écran deux fois sans le voir.
    ///
    /// ⇒ ET LE MOTIF ÉTAIT RECOPIÉ CINQ FOIS. Un balayage a trouvé la même construction —
    ///   `NewText("Glyph", …, 16, Center)` + gras + largeur figée + `flexibleWidth: 0` — sur ②,
    ///   ⑤ Lieutenant (deux fois), Blanchiment, Pipeline et l'Accueil. Corriger ② seul aurait
    ///   laissé les quatre autres couper en silence.
    /// ★ C'est la leçon que planque a payée le même jour sur trois instruments : *une hypothèse
    ///   fausse recopiée ne se corrige pas là où on l'a trouvée, elle se corrige là où elle est
    ///   produite.* D'où un producteur unique, et cinq citations.
    ///
    /// ⚠️ CE QUI N'EST PAS PARTAGÉ : le VOCABULAIRE. Chaque écran a le sien, et c'est normal —
    /// l'Accueil compte en « [$$$$] », ⑤ en « [....] ». Ce qui se partage est la MESURE, pas la
    /// liste. Chaque appelant passe donc ses propres candidats les plus larges.
    ///
    /// ⚠️ Et la colonne DOIT rester à largeur fixe : elle existe pour ALIGNER les libellés d'une
    /// ligne à l'autre. La laisser se dimensionner par ligne supprimerait la troncature en
    /// détruisant ce à quoi elle sert. On élargit la colonne, on ne la libère pas.</summary>
    internal static class LargeurDeGlyphe
    {
        /// <summary>La largeur qu'il faut pour poser le plus large des <paramref name="candidats"/>
        /// sans le couper, mesurée avec la police et le corps réels de <paramref name="mesureur"/>.
        ///
        /// ⚠️ À appeler APRÈS avoir posé `fontStyle` et la taille : `GetPreferredValues` mesure
        /// l'état COURANT du composant. Mesurer avant de passer en gras rend une largeur trop
        /// petite — et le défaut réapparaît, plus discret qu'avant.</summary>
        internal static float PourLesPlusLarges(TMP_Text mesureur, params string[] candidats)
        {
            if (mesureur == null || candidats == null || candidats.Length == 0) return 0f;
            float large = 0f;
            foreach (string c in candidats)
            {
                if (string.IsNullOrEmpty(c)) continue;
                large = Mathf.Max(large, mesureur.GetPreferredValues(c).x);
            }
            // 2 px de garde : `GetPreferredValues` rend un flottant, le layout arrondit, et un
            // arrondi vers le bas recoupe le dernier caractère — la troncature qu'on corrige.
            return Mathf.Ceil(large) + 2f;
        }
    }
}
