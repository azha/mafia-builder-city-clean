using System.Collections.Generic;
using UnityEngine;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>㊲ La réputation — les correspondances « valeur du domaine → apparence » de
    /// l'écran, chacune en FONCTION NOMMÉE prenant la valeur du domaine.
    ///
    /// ⛔ POURQUOI DES FONCTIONS ET PAS DES TABLEAUX NI DES TERNAIRES. Mesuré sur ce dépôt : une
    /// correspondance portée par l'ordre d'un tableau, par un commentaire, ou par une chaîne de
    /// ternaires **n'a aucune forme exécutable à asserter**. Un balayage écrit pour la traquer
    /// rend zéro sur le fichier fautif lui-même — contrôle négatif mesuré, 0/4 sur le cas qui
    /// motivait la question. La séquence qui marche est : (1) transformer la correspondance en
    /// fonction nommée, (2) ALORS la garde mord. Poser la garde d'abord, c'est écrire un test
    /// qui ne peut pas voir sa cible.
    /// ⇒ Toute garde de cet écran s'écrit contre CE fichier. Et elle vise la PROPRIÉTÉ (« aucune
    /// correspondance domaine→apparence hors d'ici »), jamais une forme syntaxique : une
    /// prescription qui interdit `switch` laisse passer la chaîne de ternaires.</summary>
    public static class ReputationResolvers
    {
        // ── La palette LOCALE — et pourquoi elle est locale ──────────────────────────────────
        //
        // Quatre couleurs de la maquette v6 n'existent pas dans `DesignTokens.asset` (mesuré sur
        // l'ASSET SÉRIALISÉ, la source que le pont de palette compare — pas sur les commentaires
        // du `.cs` — avec trois contrôles positifs qui sortent PRESENT).
        //
        // ⛔ ELLES NE PEUVENT PAS Y ÊTRE AJOUTÉES ICI, et ce n'est pas une question de périmètre :
        // `CanonPaletteBridgePlayModeTests` exige une BIJECTION dans les deux sens (aujourd'hui
        // 74 tokens canon = 74 champs runtime, 0 orphelin) et épingle l'arité en dur. Ajouter 4
        // champs au runtime seul produit 4 erreurs « orphelin RUNTIME » et fait rougir le test —
        // qui tourne sous le juge. Le geste complet toucherait QUATRE endroits, dont le canon
        // d'un autre dépôt (`gdd/14_tunable_constants.md §Asset pipeline — palette & DA`) :
        // c'est un arbitrage de direction artistique, remonté à l'user le 2026-08-30.
        //
        // ⚠️⚠️ ET VOICI LE PIÈGE QUI COÛTERA UN ROUND À QUI LIRA CE FICHIER TROP VITE — le
        // voisinage, pas l'absence. Trois des quatre ont un jeton canon À MOINS DE 6/255 :
        //
        //     --encre   #0b1016  ←  hudGaugeFaceOuter          à  2,0/255
        //     --panneau #111823  ←  lieutenantMedallionOuter   à  2,1/255
        //     --lisere  #2a3648  ←  hudGaugeFaceInner          à  6,0/255
        //     --vert    #7db36a  ←  controlUncontested         à 41,9/255
        //
        // Assez proche pour qu'on les substitue de bonne foi (« c'est la même »), assez loin
        // qu'un juge visuel le mesure. Et le plus proche voisin d'`--encre` est le fond d'un
        // CADRAN DE MANOMÈTRE : le « jeton pris pour ce qu'il n'est pas » sous sa forme la plus
        // littérale. ⇒ NE PAS SUBSTITUER. Une couleur locale assumée vaut mieux qu'un jeton canon
        // employé pour autre chose que son rôle. Seul `--vert`, isolé à 41,9, ne trompera
        // personne — c'est donc sur les trois autres que ce garde-fou porte, pas sur lui.
        //
        // DETTE : quand l'arbitrage DA sera rendu, ces quatre-là remontent au canon et ce bloc
        // disparaît au profit de `DesignTokens.Current.*`. Rien d'autre à changer : tout l'écran
        // passe par les accesseurs ci-dessous.

        /// <summary>`--encre` #0b1016 — le fond de l'écran. ⚠️ DISTINCT de `surfaceBase`
        /// (#0d0f10) et de `hudGaugeFaceOuter` (#0a0e16, à 2,0/255).</summary>
        public static readonly Color Encre = Hex(0x0b, 0x10, 0x16);

        /// <summary>`--panneau` #111823 — le fond des cartes et panneaux. ⚠️ DISTINCT de
        /// `surfaceCard` (#16191b) et de `lieutenantMedallionOuter` (à 2,1/255).</summary>
        public static readonly Color Panneau = Hex(0x11, 0x18, 0x23);

        /// <summary>`--lisere` #2a3648 — la bordure au repos. ⚠️ DISTINCT de `hudGaugeFaceInner`
        /// (à 6,0/255).</summary>
        public static readonly Color Lisere = Hex(0x2a, 0x36, 0x48);

        /// <summary>`--vert` #7db36a — la règle tenue, la cohérence « aligned ». Le seul des
        /// quatre sans voisin trompeur (41,9/255 du plus proche).</summary>
        public static readonly Color Vert = Hex(0x7d, 0xb3, 0x6a);

        private static Color Hex(int r, int g, int b) => new Color(r / 255f, g / 255f, b / 255f, 1f);

        // ── Les 15 jetons qui, eux, SONT au canon — lus, jamais recopiés ─────────────────────
        // Correspondance établie sur `DesignTokens.asset` (hex → champ), pas devinée par le nom.
        public static Color Creme        => DesignTokens.Current.hudCreme;              // #eae0c8
        public static Color Creme2       => DesignTokens.Current.hudCremeSecondary;     // #b9ad92
        public static Color Muet         => DesignTokens.Current.onSurfaceSecondary;    // #8a979c
        public static Color Eteint       => DesignTokens.Current.onSurfaceDisabled;     // #6b737d
        public static Color Or           => DesignTokens.Current.hudMoneyUnderlineGold; // #d9ab4e
        public static Color OrVif        => DesignTokens.Current.hudMoneyGold;          // #f2c96b
        public static Color OrFilet      => DesignTokens.Current.hudHairlineGold;       // #b08d3e
        public static Color Carte2       => DesignTokens.Current.surfaceCard;           // #16191b
        public static Color Fond2        => DesignTokens.Current.surfaceBase;           // #0d0f10
        public static Color Creux        => DesignTokens.Current.hudGaugeFaceOuter;     // #0a0e16
        public static Color Rang         => DesignTokens.Current.surfaceRow;            // #232a2d
        public static Color Cyan         => DesignTokens.Current.hudGaugeArcCold;       // #7fd4d9
        public static Color Ambre        => DesignTokens.Current.accentWarning;         // #ff9e3d
        public static Color Danger       => DesignTokens.Current.accentDanger;          // #ff5a4d

        // ── Posture du lieutenant ────────────────────────────────────────────────────────────

        /// <summary>La phrase que porte le portrait, par `boss_mirror.portrait_posture`.
        /// ⚠️ Aucun de ces libellés ne vient du serveur : le bundle i18n mesuré rend 67 clés,
        /// 63 `error.*` et 4 `game.*`, **zéro du domaine réputation**. Ils sont donc écrits ici,
        /// et c'est assumé — mais ils sont écrits UNE fois, à un endroit nommé.</summary>
        public static string PosturePhrase(string posture)
        {
            switch (posture)
            {
                case "attentive": return "Il vous écoute";
                case "cautious":  return "Il se tient à carreau";
                case "withdrawn": return "Il se ferme";
                case "hostile":   return "Il vous en veut";
                default:          return "Posture inconnue";
            }
        }

        public static Color PostureCouleur(string posture)
        {
            switch (posture)
            {
                case "attentive": return Vert;
                case "cautious":  return OrVif;
                case "withdrawn": return Ambre;
                case "hostile":   return Danger;
                default:          return Muet;
            }
        }

        /// <summary>L'inclinaison du buste, en degrés — la posture est DESSINÉE, pas seulement
        /// écrite (c'est le sens de « le back rend des instructions de dessin »). Valeurs de la
        /// maquette v2 (`generateur-reputation.py`, table POSTURE).</summary>
        public static float PostureInclinaisonDeg(string posture)
        {
            switch (posture)
            {
                case "attentive": return 0f;
                case "cautious":  return 6f;
                case "withdrawn": return 14f;
                case "hostile":   return 20f;
                default:          return 0f;
            }
        }

        // ── Cohérence ────────────────────────────────────────────────────────────────────────

        /// <summary>⛔⛔ `indeterminate` N'EST PAS « moyen », et ce résolveur est l'endroit où
        /// cette règle se tient ou se perd. C'est « pas encore assez de matière pour juger » —
        /// un ÉTAT À PART, jamais un cran médian. Toute jauge à trois positions qui le placerait
        /// au milieu mentirait sur ce que le serveur a dit. Mesuré : c'est la valeur rendue sur
        /// compte frais, donc le PREMIER état que tout joueur rencontre — pas un cas limite.</summary>
        public static string CoherencePhrase(string cue)
        {
            switch (cue)
            {
                case "aligned":       return "Vous vous y tenez";
                case "drifting":      return "Vous vous en écartez";
                case "indeterminate": return "Pas encore jugeable";
                default:              return "Cohérence inconnue";
            }
        }

        public static Color CoherenceCouleur(string cue)
        {
            switch (cue)
            {
                case "aligned":       return Vert;
                case "drifting":      return Ambre;
                case "indeterminate": return Muet;   // ni bon ni mauvais : ÉTEINT, pas médian
                default:              return Muet;
            }
        }

        /// <summary>`true` seulement pour `indeterminate` — l'écran change de cadre, il ne
        /// change pas de couleur sur une échelle. Isolé en prédicat nommé pour qu'un site
        /// d'appel ne puisse pas le traiter comme « la valeur du milieu ».</summary>
        public static bool CoherenceEstIndeterminee(string cue) => cue == "indeterminate";

        // ── Les quatre poses de tenue ────────────────────────────────────────────────────────

        /// <summary>Le libellé de la pose, SELON son état. Deux textes par pose : celui de
        /// l'état neutre et celui de l'état absorbé — « col ouvert » / « col boutonné ».
        /// ⚠️ L'appelant NE choisit PAS lequel : il passe l'état lu sur le DTO
        /// (`UniformTellsDto.ActifEstAbsorbe`). C'est ce qui rend impossible de réinverser la
        /// polarité ici sans qu'une garde de sortie le voie.</summary>
        public static string PoseLibelle(UniformTellsDto.Pose pose, bool absorbe)
        {
            switch (pose)
            {
                case UniformTellsDto.Pose.Collar:  return absorbe ? "col boutonné"   : "col ouvert";
                case UniformTellsDto.Pose.Sleeves: return absorbe ? "manches roulées" : "manches basses";
                case UniformTellsDto.Pose.Watch:   return absorbe ? "montre visible"  : "montre cachée";
                case UniformTellsDto.Pose.Gloves:  return absorbe ? "gants propres"   : "gants sales";
                default: return "";
            }
        }

        /// <summary>Ce que la pose VEUT DIRE — la vertu que le lieutenant a absorbée (ou non).
        /// C'est ce qui empêche l'écran d'être un décor : chaque voyant nomme sa règle.</summary>
        public static string PoseSens(UniformTellsDto.Pose pose)
        {
            switch (pose)
            {
                case UniformTellsDto.Pose.Collar:  return "la comptabilité tenue";
                case UniformTellsDto.Pose.Sleeves: return "la justice envers les siens";
                case UniformTellsDto.Pose.Watch:   return "la ponctualité";
                case UniformTellsDto.Pose.Gloves:  return "la discrétion devant les civils";
                default: return "";
            }
        }

        /// <summary>Les quatre poses dans l'ordre de lecture de la maquette. Exposé pour que
        /// personne ne réécrive l'ordre à la main sur un site d'appel.</summary>
        public static IEnumerable<UniformTellsDto.Pose> PosesDansLOrdre()
        {
            yield return UniformTellsDto.Pose.Collar;
            yield return UniformTellsDto.Pose.Sleeves;
            yield return UniformTellsDto.Pose.Watch;
            yield return UniformTellsDto.Pose.Gloves;
        }

        // ── Contreparties ────────────────────────────────────────────────────────────────────

        /// <summary>⚠️ `marginalia` rend des ÉTIQUETTES POSITIONNELLES, pas des noms : mesuré
        /// `["settlement-1","settlement-2","settlement-3"]` (`restraint-index.service.ts:330-336`
        /// — « counterparty entity is deferred (no name table) »). Le canon (:95) demande des
        /// noms ; le code n'y répond pas encore, et la table est consignée en lot back (S13-j).
        ///
        /// ⇒ Ce résolveur affiche l'étiquette telle quelle, en la rendant LISIBLE sans prétendre
        /// qu'elle est un nom. Il ne fabrique aucun patronyme : un écran qui inventerait
        /// « Ferrante » mentirait — c'est l'écart É3, celui qui a fait retirer la v1 de la
        /// maquette, et il se reproduirait ici au premier qui trouve les étiquettes moches.</summary>
        public static string ReglementLibelle(string marginale, int rang)
        {
            if (string.IsNullOrEmpty(marginale)) return $"règlement n°{rang + 1}";
            return marginale.StartsWith("settlement-")
                ? "règlement n°" + marginale.Substring("settlement-".Length)
                : marginale;
        }

        // ── Offre ────────────────────────────────────────────────────────────────────────────

        public static string OffrePhrase(string posture)
        {
            switch (posture)
            {
                case "standard": return "On vient sans garantie";
                case "wary":     return "On demande des gages";
                default:         return "Offre inconnue";
            }
        }

        public static Color OffreCouleur(string posture)
        {
            switch (posture)
            {
                case "standard": return Vert;
                case "wary":     return Ambre;
                default:         return Muet;
            }
        }
    }
}
