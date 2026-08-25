using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>L'UNIQUE conversion « px CSS de la maquette » → « unités de canvas » du client.
    ///
    /// ⛔ LE DÉFAUT QUE CE FICHIER EXISTE POUR SUPPRIMER, ET IL ÉTAIT SYSTÉMATIQUE.
    /// Chaque écran inventait sa propre référence, et deux d'entre elles étaient fausses :
    ///   · le shell (bandeau haut + dock) recopiait les valeurs CSS TELLES QUELLES en unités de
    ///     canvas — c'est-à-dire comme si le téléphone de la maquette faisait 1280 px de large.
    ///     Il en fait 392. Tout le shell était donc rendu à 392/1280 = 30,6 % de sa taille, soit
    ///     3,27× TROP PETIT : les « bulles » du dock sortaient en pastilles de 2,8 % de la
    ///     largeur là où le canon les donne à 11,7 %.
    ///   · la fiche bâtiment prenait 300 comme largeur du téléphone — une SUPPOSITION, jamais
    ///     lue dans la maquette — donc 1,31× trop grande, en sens INVERSE du shell.
    /// Deux écrans côte à côte, deux échelles fausses, dans deux directions différentes : c'est
    /// ce qui rendait l'écart invisible à une revue qui compare un élément à son homologue et
    /// jamais l'écran ENTIER à l'écran entier.
    ///
    /// ⇒ La valeur ci-dessous est MESURÉE dans la maquette, pas choisie :
    ///   `hud-brennar.html` → `.tel{position:relative;width:min(392px,92vw);aspect-ratio:9/16;…}`
    /// C'est la largeur du téléphone, donc la largeur d'écran que TOUTE valeur en px de cette
    /// maquette suppose. Si la maquette change de largeur, c'est ICI que ça se corrige — et le
    /// test `EchelleF1` rougit si les deux cessent de coïncider.
    /// </summary>
    public static class EchelleMaquette
    {
        // ⛔⛔ IL N'Y A PAS UNE MAQUETTE, IL Y EN A TROIS — ET ELLES N'ONT PAS LA MÊME LARGEUR
        // DE TÉLÉPHONE. C'est mesuré, pas supposé (`.tel{width:min(Npx,…)}` de chaque fichier) :
        //
        //     hud-brennar.html      392 px   1 écran   — l'écran principal (district + fiche + dock)
        //     ecrans-brennar.html   300 px   4 écrans  — La Famille · Salvatore · Le Coffre · Le Marché
        //     palettes-ecrans.html  252 px   1 écran   — la planche de palettes
        //
        // Une constante GLOBALE unique était donc fausse dès le deuxième écran : elle aurait rendu
        // les quatre écrans de `ecrans-brennar` à 300/392 = 76,5 % de leur taille. J'ai posé cette
        // constante unique en corrigeant l'écran principal, et je l'ai vue en allant mesurer les
        // autres maquettes — PAS en relisant mon propre code.
        //   ★ Et c'est exactement d'où venait le `300` trouvé en dur dans la fiche bâtiment : il
        //     n'était pas inventé, il était RECOPIÉ DE LA MAUVAISE MAQUETTE. Un nombre juste, pour
        //     un autre écran.
        // ⇒ La référence est une propriété de la MAQUETTE dont l'écran est issu. Chaque écran
        //   déclare la sienne ; aucun ne peut plus hériter en silence de celle du voisin.

        /// <summary>`hud-brennar.html` — `.tel{width:min(392px,92vw)}`. L'écran principal.</summary>
        public const float LargeurHudBrennar = 392f;

        /// <summary>`ecrans-brennar.html` — `.tel{width:min(300px,88vw)}`. La Famille, Salvatore,
        /// Le Coffre, Le Marché.</summary>
        public const float LargeurEcransBrennar = 300f;

        /// <summary>`palettes-ecrans.html` — `.tel{width:min(252px,86vw)}`.</summary>
        public const float LargeurPalettesEcrans = 252f;

        /// <summary>Repli historique — la maquette de l'écran principal. Conservé pour que les
        /// appelants qui ne précisent pas leur maquette gardent le comportement d'aujourd'hui,
        /// JAMAIS comme valeur par défaut recommandée : un écran qui ne déclare pas sa maquette
        /// est un écran dont l'échelle est une supposition.</summary>
        public const float LargeurMaquetteCss = LargeurHudBrennar;

        /// <summary>Largeur de repli, en unités de canvas, quand aucune racine n'est fournie ou
        /// que sa géométrie n'est pas encore résolue. C'est le `referenceResolution.x` des
        /// `CanvasScaler` du client — REUSE, pas une constante indépendante.</summary>
        public const float LargeurCanvasParDefaut = 1280f;

        /// <summary>Convertit une valeur en px CSS de la maquette en unités de canvas, à partir
        /// de la largeur RÉELLE de la racine plein écran.
        ///
        /// ⚠️ `racinePleinEcran` doit être la racine qui COUVRE l'écran, jamais un panneau
        /// intermédiaire : passer un conteneur plus étroit divise toute la mise à l'échelle par
        /// un facteur muet. (Déjà payé ici sur un espacement corrigé sur un groupe à un seul
        /// enfant : le défaut SÉLECTIF désigne son conteneur.)</summary>
        public static float Px(float valeurCss, RectTransform racinePleinEcran)
        {
            return Px(valeurCss, racinePleinEcran, LargeurMaquetteCss);
        }

        /// <summary>La même conversion, en DÉCLARANT de quelle maquette la valeur est issue.
        /// C'est la forme à préférer : elle rend impossible qu'un écran hérite en silence de la
        /// largeur de téléphone d'une autre maquette.</summary>
        public static float Px(float valeurCss, RectTransform racinePleinEcran, float largeurMaquetteCss)
        {
            if (largeurMaquetteCss <= 1f) largeurMaquetteCss = LargeurMaquetteCss; // anti-vacuité
            return valeurCss * (LargeurCanvas(racinePleinEcran) / largeurMaquetteCss);
        }

        /// <summary>Comme `Px`, mais rendu à l'entier le plus proche et PLANCHÉ À 1 — réservé aux
        /// grandeurs dont un zéro est un défaut de rendu (épaisseur de trait, corps de texte).
        ///
        /// ⛔ NE JAMAIS l'employer sur une grandeur qui peut légitimement être NÉGATIVE (un
        /// retrait, un débord, un décalage) : le plancher retournerait le signe et transformerait
        /// « déborde de 11 vers le haut » en « commence 1 en dessous ». Un plancher est une
        /// hypothèse sur le DOMAINE de ce qui le traverse — mesuré ici même sur les rails de
        /// l'organigramme. Pour ces grandeurs-là : `Px` tel quel.</summary>
        public static int PxTrait(float valeurCss, RectTransform racinePleinEcran)
        {
            return Mathf.Max(1, Mathf.RoundToInt(Px(valeurCss, racinePleinEcran)));
        }

        /// <summary>`PxTrait` en déclarant sa maquette.</summary>
        public static int PxTrait(float valeurCss, RectTransform racinePleinEcran, float largeurMaquetteCss)
        {
            return Mathf.Max(1, Mathf.RoundToInt(Px(valeurCss, racinePleinEcran, largeurMaquetteCss)));
        }

        /// <summary>La largeur de la racine en unités de canvas, mesurée quand elle est
        /// disponible, repliée sur la référence sinon. Le seuil écarte les rects non encore
        /// résolus (0, ou une valeur de frame de création) — voir la leçon
        /// « `Canvas.scaleFactor` lu la même frame qu'`AddComponent` rend 1,000000 » :
        /// une valeur PLAUSIBLE mais non initialisée est la famille la plus dangereuse.</summary>
        public static float LargeurCanvas(RectTransform racinePleinEcran)
        {
            if (racinePleinEcran == null) return LargeurCanvasParDefaut;
            float l = racinePleinEcran.rect.width;
            return l > 100f ? l : LargeurCanvasParDefaut;
        }
    }
}
