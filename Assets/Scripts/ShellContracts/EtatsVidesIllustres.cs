using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>L'illustration d'un état vide — quatrième consommateur du seam partagé
    /// <see cref="FamilleDIcones"/>, et le premier dont la clé est un ÉCRAN, pas une valeur de domaine.
    ///
    /// ⛔⛔ POURQUOI SEULEMENT DEUX SUJETS SUR VINGT-DEUX, ET POURQUOI C'EST LA BONNE QUANTITÉ.
    /// L'atelier a produit 22 illustrations ; le critère de montage n'en retient que ce qui répare
    /// un défaut RÉEL : *une illustration va là où l'état vide EST L'ÉCRAN ENTIER*, pas là où c'est
    /// une section vide dans un écran qui a du contenu autour. **Six écrans passent ce critère**
    /// (Selling · Profile · Settings · Tutorial · Inspection · Precinct) — et l'appariement
    /// sujet→écran, qui n'existait que dans une IMAGE, en couvre deux :
    ///   `vente  → ㉟`      · `police → ⑮ ET ⑰`   (`Tools/fal/TABLE-SUJET-ECRAN.md`)
    /// ⇒ Les vingt autres sujets restent en archive **sans être une dette** : ils ont un remède
    /// connu et aucune urgence, ce qui est la définition d'un différé légitime.
    ///
    /// ⚠️ UN SUJET PEUT SERVIR DEUX ÉCRANS — `police` couvre ⑮ (les inspections) ET ⑰ (le
    /// commissariat). *Monter sur un seul serait la moitié du travail avec l'apparence de la
    /// totalité*, et c'est ce que mon appariement « évident » allait faire avant de lire la table.
    ///
    /// ⚠️ POIDS : ces images font ~1,9 Mo chacune, en 1072×1072. **Tout ce qui est sous un dossier
    /// `Resources` entre dans le build SANS élagage**, donc chaque sujet monté se paie à chaque
    /// installation. Deux sujets ⇒ ~3,8 Mo. C'est supportable ici et ça ne le serait pas à vingt —
    /// une raison de plus pour que le critère décide, pas l'inventaire.</summary>
    public static class EtatsVidesIllustres
    {
        private static readonly FamilleDIcones Famille =
            new FamilleDIcones("EtatsVides", "vide-", "");

        /// <summary>L'illustration d'un sujet d'état vide, ou `null` si l'atelier n'en a pas produit
        /// — auquel cas l'appelant n'affiche RIEN et garde son message. Le message NOMME (« la
        /// vitrine est vide »), l'illustration lève seulement le doute « vide ou cassé ? » : un
        /// écran sans image reste lisible, un écran sans message ne l'est pas.</summary>
        public static Sprite Pour(string sujet) => Famille.Pour(sujet);

        /// <summary>Monte l'illustration d'un sujet sous `parent`, ou rend `null` si l'atelier n'en
        /// a pas produit. **Un seul montage pour les trois écrans** : recopier ces quinze lignes
        /// trois fois donnerait trois producteurs qui s'accordent aujourd'hui — *et deux producteurs
        /// qui s'accordent ne rougissent jamais, donc la divergence future serait invisible.*
        ///
        /// ⛔ GARDES STRUCTURELLES, POSÉES ICI UNE FOIS POUR TOUTES. `AddComponent&lt;Image&gt;()`
        /// crée son `CanvasRenderer` (l'attribut vit sur `Image`), mais ce dépôt a déjà livré un
        /// `Graphic` qui **ne dessinait RIEN, sans erreur console**, parce que le
        /// `[RequireComponent]` d'une classe de BASE n'est pas honoré à l'exécution. On le pose donc
        /// explicitement plutôt que de compter dessus, et `Image` est un `MaskableGraphic`, donc
        /// clippable si un `Mask` arrive un jour au-dessus.</summary>
        public static UnityEngine.UI.Image Monter(Transform parent, string sujet, float cotePx)
        {
            Sprite dessin = Pour(sujet);
            if (dessin == null) return null;   // ⇒ l'appelant garde son message, et n'affiche rien
            var go = new GameObject("VideIllustration", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            var img = go.AddComponent<UnityEngine.UI.Image>();
            img.sprite = dessin;
            img.preserveAspect = true;
            img.raycastTarget = false;
            var le = go.AddComponent<UnityEngine.UI.LayoutElement>();
            le.preferredWidth = cotePx; le.minWidth = cotePx;
            le.preferredHeight = cotePx; le.minHeight = cotePx;
            le.flexibleWidth = 0f; le.flexibleHeight = 0f;
            return img;
        }
    }
}
