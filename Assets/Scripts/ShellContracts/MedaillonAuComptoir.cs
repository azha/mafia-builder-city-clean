using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Shell
{
    /// <summary>LE MÉDAILLON D'UN PERSONNAGE AU COMPTOIR — `.medl` de `ecrans-brennar-4.html` : un carré ARRONDI (le rayon
    /// varie selon l'usage : 14 pour un attendant, 18 pour le premier de la file), face
    /// `radial-gradient(circle at 38% 30%, #243048, #0f1622 66%)` (jetons `lieutenantMedallionInner/Outer`) + rayons
    /// `rgba(255,255,255,.05)`, bord 1px laiton (`hudHairlineGold`), `overflow:hidden`, et le buste POSÉ sur le bord bas
    /// (`align-items:flex-end`, boîte 74 %).
    /// ⚠️ Aucun anneau or sur un lieutenant, même en tête de file : c'est la marque du Don (décision du 02/09, redite pour
    ///    ⑯ et ⑨ le 23/09). Le halo or du premier (`.attendant.premier .medl{box-shadow:… #d9ab4e55}`) n'est donc pas repris.
    /// ShellContracts ne voit pas TextMeshPro : un médaillon SANS buste (« La ville », un « B ») reçoit sa lettre de l'écran,
    /// dans le conteneur rendu (masqué).
    /// Premier lecteur : la file de ⑨ (⑨-3). ⑯-5 dessine le même médaillon avec son propre code (même CSS) : à faire
    /// converger ici au prochain lot qui touche ⑯.</summary>
    public static class MedaillonAuComptoir
    {
        public const string CheminBusteLieutenant = "Lieutenant/ui_element_buste_lieutenant";

        public static GameObject Construire(Transform parent, string nom, float taille, float rayon, float trait, Sprite buste)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredWidth = taille; le.preferredHeight = taille;
            le.minWidth = taille; le.minHeight = taille;
            le.flexibleWidth = 0f; le.flexibleHeight = 0f;

            // le masque arrondi, REMPLI de la couleur où le dégradé radial s'achève (#0f1622 dès 66 %) : les coins du carré
            Image forme = go.AddComponent<Image>();
            forme.sprite = ProceduralUI.RoundedRectMask(Mathf.Max(1, (int)rayon));
            forme.type = Image.Type.Sliced;
            forme.color = DesignTokens.Current.lieutenantMedallionOuter;
            forme.raycastTarget = false;
            go.AddComponent<Mask>().showMaskGraphic = true;

            Color rayons = Color.white; rayons.a = 0.05f;
            Image face = Enfant(go.transform, "Face").AddComponent<Image>();
            face.sprite = ProceduralUI.MedallionFace(Mathf.Max(8, (int)taille),
                DesignTokens.Current.lieutenantMedallionInner, DesignTokens.Current.lieutenantMedallionOuter, rayons);
            face.raycastTarget = false;
            Etirer((RectTransform)face.transform);

            if (buste != null)
            {
                GameObject bg = Enfant(go.transform, "Buste");
                RectTransform brt = (RectTransform)bg.transform;
                brt.anchorMin = brt.anchorMax = new Vector2(0.5f, 0f);
                brt.pivot = new Vector2(0.5f, 0f);
                brt.sizeDelta = new Vector2(taille * 0.74f, taille * 0.74f);   // `.medl svg{width:74%;height:74%}`
                brt.anchoredPosition = new Vector2(0f, trait);                   // posé sur le bord intérieur
                Image bi = bg.AddComponent<Image>();
                bi.sprite = buste;
                bi.color = Color.white;          // `#cfc4a6` est CUIT dans le PNG : ne pas teinter (⑥)
                bi.preserveAspect = true;
                bi.raycastTarget = false;
            }

            Image bord = Enfant(go.transform, "Bord").AddComponent<Image>();
            bord.sprite = ProceduralUI.RoundedRectOutline(Mathf.Max(1, (int)rayon), trait, DesignTokens.Current.hudHairlineGold);
            bord.type = Image.Type.Sliced;
            bord.raycastTarget = false;
            Etirer((RectTransform)bord.transform);
            return go;
        }

        private static GameObject Enfant(Transform parent, string nom)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            go.AddComponent<LayoutElement>().ignoreLayout = true;
            return go;
        }

        private static void Etirer(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
        }
    }
}
