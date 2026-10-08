using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Shell
{
    /// <summary>Porté par le conteneur `Filets` d'un bloc : la géométrie des filets à l'échelle de l'écran, recalculée à
    /// CHAQUE changement de rect (l'échelle n'est connue qu'une fois la racine résolue). Les sprites sont tracés en unités
    /// de canvas (1 texel = 1 unité) : l'épaisseur rendue est EXACTEMENT `PxTrait`, pas une approximation étirée.
    ///
    /// Traduction CSS → uGUI (consignée, classe C si un juge la voit) : coins à onglet des côtés de couleurs différentes ⇒
    /// côtés droits superposés ; `border-radius` sur moins de 4 côtés ⇒ côtés droits ; pointillé ⇒ points CARRÉS ; tireté ⇒
    /// trait = vide = 3 épaisseurs (longueur non mesurée) ; `double` ⇒ deux traits d'un tiers de l'épaisseur.</summary>
    public sealed class FiletsPoses : MonoBehaviour
    {
        private SpecFilet[] recette;
        private Color? fondConnu;
        private readonly Dictionary<string, Image> images = new Dictionary<string, Image>();

        public IReadOnlyList<SpecFilet> Recette => recette;

        internal void Initialiser(SpecFilet[] r, Color? fond) { recette = r; fondConnu = fond; }

        // ⚠️ Un bloc de taille FIXE ne change jamais de rect : si le canvas n'était pas résolu au montage (l'échelle retombe
        //    alors sur le repli 1280), seul le rattachement à son canvas définitif corrige l'épaisseur. D'où les trois appels.
        private void OnRectTransformDimensionsChange() => Maj();
        private void OnTransformParentChanged() => Maj();
        private void OnCanvasHierarchyChanged() => Maj();

        private RectTransform RacinePleinEcran()
        {
            Canvas c = GetComponentInParent<Canvas>();
            return c != null ? (RectTransform)c.rootCanvas.transform : null;
        }

        public void Maj()
        {
            if (recette == null) return;
            RectTransform racine = RacinePleinEcran();
            Rect r = ((RectTransform)transform).rect;
            // Les côtés déjà posés par une spec PRÉCÉDENTE de cette recette : la seconde bande d'un même côté (le liseré d'une
            // enseigne sur son bord haut, l'or d'une fenêtre sur son bord bas) a son PROPRE nœud — sans quoi elle écraserait la
            // première (㊴, DESIGN v5.2 §5). Recalculé à chaque `Maj()` : les noms sont stables d'un appel à l'autre.
            var poses = new HashSet<string>();
            for (int i = 0; i < recette.Length; i++)
            {
                SpecFilet f = recette[i];
                Color c = DecorDeScene.Ajuster(f.Couleur.Resoudre(), fondConnu);
                int t = EchelleMaquette.PxTrait(f.EpaisseurCss, racine, EchelleMaquette.LargeurEcransBrennar6);
                float inset = f.Inset > 0f ? EchelleMaquette.Px(f.Inset, racine, EchelleMaquette.LargeurEcransBrennar6) : 0f;
                bool arrondi = (f.Rayon > 0f || f.RayonPct > 0f) && f.Cotes == Cotes.Tous;
                if (arrondi) Contour(i, f, c, t, inset, r, racine);
                else
                {
                    if ((f.Cotes & Cotes.Haut) != 0) Cote(Noeud("Haut", i, poses), "Haut", f, c, t, inset);
                    if ((f.Cotes & Cotes.Droite) != 0) Cote(Noeud("Droite", i, poses), "Droite", f, c, t, inset);
                    if ((f.Cotes & Cotes.Bas) != 0) Cote(Noeud("Bas", i, poses), "Bas", f, c, t, inset);
                    if ((f.Cotes & Cotes.Gauche) != 0) Cote(Noeud("Gauche", i, poses), "Gauche", f, c, t, inset);
                }
            }
        }

        // ───────────────────────────────────────────────────────────────────────────── côtés droits

        /// <summary>Le NŒUD d'un côté : son nom seul pour la première spec qui le pose (les noms existants, lus par des gardes,
        /// ne bougent pas), `<Côté><rang de la spec>` pour une suivante. ⚠️ Le nœud n'est qu'un nom : la GÉOMÉTRIE vient du `cote`
        /// (`Bande`), jamais du nœud — `Bas1` est ancré en bas. `Contour` suffixe, lui, dès que la recette a plusieurs specs.</summary>
        private static string Noeud(string cote, int rang, HashSet<string> poses) => poses.Add(cote) ? cote : cote + rang;

        private void Cote(string noeud, string cote, SpecFilet f, Color c, int t, float d)
        {
            if (f.Style == StyleFilet.Double)
            {
                int un = Mathf.Max(1, Mathf.RoundToInt(t / 3f));
                Bande(ImageDe(noeud, transform), cote, d, un, c, f, false);
                Bande(ImageDe("Interieur", images[noeud].transform), cote, 0f, un, c, f, true, t - un);
                return;
            }
            Bande(ImageDe(noeud, transform), cote, d, t, c, f, false);
        }

        /// <summary>Une bande sur le côté `cote`, à `d` du bord, d'épaisseur `t`. `interieur` : relative à la bande
        /// extérieure du `double`, décalée de `decalage` vers l'intérieur.</summary>
        private void Bande(Image img, string cote, float d, int t, Color c, SpecFilet f, bool interieur, int decalage = 0)
        {
            RectTransform rt = img.rectTransform;
            bool vertical = cote == "Gauche" || cote == "Droite";
            if (interieur)
            {
                // Relatif à la bande extérieure : même longueur, décalée vers le centre du bloc.
                rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
                float dx = cote == "Gauche" ? decalage : cote == "Droite" ? -decalage : 0f;
                float dy = cote == "Bas" ? decalage : cote == "Haut" ? -decalage : 0f;
                rt.offsetMin = new Vector2(dx, dy); rt.offsetMax = new Vector2(dx, dy);
            }
            else
            {
                switch (cote)
                {
                    case "Haut": rt.anchorMin = new Vector2(0f, 1f); rt.anchorMax = Vector2.one;
                        rt.offsetMin = new Vector2(d, -d - t); rt.offsetMax = new Vector2(-d, -d); break;
                    case "Bas": rt.anchorMin = Vector2.zero; rt.anchorMax = new Vector2(1f, 0f);
                        rt.offsetMin = new Vector2(d, d); rt.offsetMax = new Vector2(-d, d + t); break;
                    case "Gauche": rt.anchorMin = Vector2.zero; rt.anchorMax = new Vector2(0f, 1f);
                        rt.offsetMin = new Vector2(d, d); rt.offsetMax = new Vector2(d + t, -d); break;
                    default: rt.anchorMin = new Vector2(1f, 0f); rt.anchorMax = Vector2.one;
                        rt.offsetMin = new Vector2(-d - t, d); rt.offsetMax = new Vector2(-d, -d); break;
                }
            }
            if (f.Style == StyleFilet.Pointille || f.Style == StyleFilet.Tirete)
            {
                int trait = f.Style == StyleFilet.Pointille ? t : 3 * t;
                img.sprite = ProceduralUI.TuileTirets(trait, trait, t, c, vertical);
                img.type = UnityEngine.UI.Image.Type.Tiled;
                img.color = Color.white;
                UnTexelUneUnite(img);
            }
            else
            {
                img.sprite = null;
                img.type = UnityEngine.UI.Image.Type.Simple;
                img.color = c;
            }
        }

        // ───────────────────────────────────────────────────────────────────────────── contour arrondi

        private void Contour(int i, SpecFilet f, Color c, int t, float d, Rect r, RectTransform racine)
        {
            string nom = "Contour";   // un nom de NŒUD, pas un texte affiché (garde N3)
            if (recette.Length > 1) nom += i;
            float w = Mathf.Max(0f, r.width - 2f * d), h = Mathf.Max(0f, r.height - 2f * d);
            float rayon = f.RayonPct > 0f ? f.RayonPct * Mathf.Min(w, h)
                                          : EchelleMaquette.Px(f.Rayon, racine, EchelleMaquette.LargeurEcransBrennar6);
            int ri = Mathf.Max(2, Mathf.RoundToInt(Mathf.Min(rayon, 0.5f * Mathf.Min(w, h))));
            Image img = ImageDe(nom, transform);
            Placer(img.rectTransform, d);
            if (f.Style == StyleFilet.Double)
            {
                int un = Mathf.Max(1, Mathf.RoundToInt(t / 3f));
                Trace(img, ri, un, c, f);
                Image dedans = ImageDe("Interieur", img.transform);
                Placer(dedans.rectTransform, t - un);
                Trace(dedans, Mathf.Max(2, ri - (t - un)), un, c, f);
                return;
            }
            Trace(img, ri, t, c, f);
        }

        private static void Trace(Image img, int rayon, int t, Color c, SpecFilet f)
        {
            if (f.Style == StyleFilet.Pointille || f.Style == StyleFilet.Tirete)
            {
                int trait = f.Style == StyleFilet.Pointille ? t : 3 * t;
                img.sprite = ProceduralUI.RoundedRectDashedOutline(rayon, t, trait, trait, c);
                img.type = UnityEngine.UI.Image.Type.Tiled;
            }
            else
            {
                img.sprite = ProceduralUI.RoundedRectOutline(rayon, t, c);
                img.type = UnityEngine.UI.Image.Type.Sliced;
            }
            img.color = Color.white;
            UnTexelUneUnite(img);
        }

        private static void Placer(RectTransform rt, float d)
        {
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(d, d); rt.offsetMax = new Vector2(-d, -d);
        }

        /// <summary>1 texel du sprite = 1 unité de canvas : multiplicateur = refPPU / spritePPU.</summary>
        private static void UnTexelUneUnite(Image img)
        {
            Canvas cv = img.canvas;
            float refPpu = cv != null ? cv.referencePixelsPerUnit : 100f;
            float spritePpu = img.sprite != null ? img.sprite.pixelsPerUnit : 100f;
            img.pixelsPerUnitMultiplier = refPpu / spritePpu;
        }

        private Image ImageDe(string nom, Transform parent)
        {
            string cle = parent == transform ? nom : parent.name + "/" + nom;
            if (images.TryGetValue(cle, out Image img) && img != null) return img;
            var go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            go.transform.SetParent(parent, false);
            img = go.AddComponent<Image>();
            img.raycastTarget = false;
            images[cle] = img;
            if (parent == transform) images[nom] = img;
            return img;
        }
    }
}
