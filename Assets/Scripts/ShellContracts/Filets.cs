using System;
using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Shell
{
    /// <summary>« Bord d'état » (§3.4) : le fond ET le bord d'un bloc, posés ENSEMBLE (㉛ : `.pris` fond `#22301f` bord
    /// `#4f7f3f`, `.risque`, neutre). C'est ce couplage qui rend « bord = fond » impossible : `Filets.Etat` le refuse.</summary>
    public sealed class EtatDeBloc
    {
        public readonly Teinte Fond;
        public readonly SpecFilet[] Bord;
        public EtatDeBloc(Teinte fond, params SpecFilet[] bord) { Fond = fond; Bord = bord ?? Array.Empty<SpecFilet>(); }
    }

    /// <summary>L5 du décor de scène (§3.4) : les FILETS d'un bloc. Le constat du juge groupé (07/10) : les filets du canon
    /// n'étaient pas tracés (㊳ : 0 bord `#2a3648` sur 9 blocs ; ㉛ : bords d'état égaux au fond ; ㉚ : 4 filets pointillés
    /// → 0). Un contrôleur ne porte ni couleur ni épaisseur de bord : il appelle
    /// `Filets.Poser(bloc, DecorsDeScene.Filets.&lt;Ecran&gt;.&lt;Nom&gt;)` (recettes GÉNÉRÉES de la mesure).
    ///
    /// Sous le bloc : un conteneur `Filets` (nom figé, DISTINCT du `Cerne` de `PiedDEcran.Cerner`), hors mise en page,
    /// premier enfant (au-dessus du fond du bloc, sous son contenu), qui porte `Haut|Droite|Bas|Gauche` (côtés droits) ou
    /// `Contour` (4 côtés arrondis). Une 2ᵉ bande sur un côté déjà posé par une spec précédente a son nœud `<Côté><rang>` (`Bas1`, `Haut2`) ; la première garde son nom. Ni `Canvas` ni `CanvasGroup` ; chaque `Graphic` naît avec son `CanvasRenderer`.
    /// Épaisseur = `EchelleMaquette.PxTrait(css, racine plein écran, LargeurEcransBrennar6)` — jamais une constante K —,
    /// recalculée à chaque changement de rect (`FiletsPoses`).</summary>
    public static class Filets
    {
        public const string NomConteneur = "Filets";

        public static GameObject Poser(RectTransform bloc, SpecFilet spec) => Poser(bloc, new[] { spec }, null);

        public static GameObject Poser(RectTransform bloc, SpecFilet[] recette) => Poser(bloc, recette, null);

        /// <summary>`fondConnu` : la couleur sur laquelle le bord se mélange, si on la connaît (un état) — une opacité CSS
        /// se traduit alors EXACTEMENT par la couleur ; sinon par l'ajustement pour fond quelconque.</summary>
        public static GameObject Poser(RectTransform bloc, SpecFilet[] recette, Color? fondConnu)
        {
            if (bloc == null) throw new ArgumentNullException(nameof(bloc));
            if (recette == null || recette.Length == 0) throw new ArgumentException("recette vide", nameof(recette));

            Transform deja = bloc.Find(NomConteneur);
            if (deja != null && deja.GetComponent<FiletsPoses>() != null)
            {
                deja.SetParent(null, false);
                if (Application.isPlaying) UnityEngine.Object.Destroy(deja.gameObject);
                else UnityEngine.Object.DestroyImmediate(deja.gameObject);
            }

            var go = new GameObject(NomConteneur, typeof(RectTransform));
            go.transform.SetParent(bloc, false);
            go.AddComponent<LayoutElement>().ignoreLayout = true;
            var rt = (RectTransform)go.transform;
            DecorDeScene.Etirer(rt);
            rt.SetAsFirstSibling();
            FiletsPoses poses = go.AddComponent<FiletsPoses>();
            poses.Initialiser(recette, fondConnu);
            poses.Maj();
            return go;
        }

        /// <summary>Pose le fond ET le bord d'un état. Refuse un bord indiscernable du fond (d ≤ 4 sur 255, la mesure de
        /// TD-612) : c'était le défaut mesuré sur ㉛.</summary>
        public static void Etat(RectTransform bloc, Image fond, EtatDeBloc etat)
        {
            if (fond == null) throw new ArgumentNullException(nameof(fond));
            if (etat == null) throw new ArgumentNullException(nameof(etat));
            Color f = etat.Fond.Resoudre();
            foreach (SpecFilet b in etat.Bord)
            {
                float d = Distance255(b.Couleur.Resoudre(), f);
                if (d <= 4f)
                    throw new InvalidOperationException(
                        $"bord d'état {b.Couleur} à {d:F1}/255 du fond {etat.Fond} : un bord égal au fond ne se voit pas (㉛)");
            }
            fond.color = f;
            Poser(bloc, etat.Bord, f);
        }

        /// <summary>Distance euclidienne sRGB en unités 0-255 sur les trois canaux (celle de la garde TD-612).</summary>
        public static float Distance255(Color a, Color b)
        {
            float dr = (a.r - b.r) * 255f, dg = (a.g - b.g) * 255f, db = (a.b - b.b) * 255f;
            return Mathf.Sqrt(dr * dr + dg * dg + db * db);
        }
    }
}
