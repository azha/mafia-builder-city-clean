using System.Collections.Generic;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    // HUD v3.1 (doctrine DA — hud-brennar.html `.medaillon .boitier`, un boîtier CIRCULAIRE avec
    // dégradé radial + anneau laiton) — uGUI n'a pas de sprite rond builtin accessible en BUILD
    // (les sprites internes de l'éditeur type "UI/Skin/Knob" passent par AssetDatabase, éditeur-
    // only ; en ajouter un comme asset importé engage un pipeline d'import qu'aucune spec ne
    // demande). Génération PROCÉDURALE au runtime : une Texture2D créée en mémoire (jamais
    // AssetDatabase), mise en cache par clé (taille+couleurs) pour n'être calculée qu'une fois.
    //
    // R2.3 — AUCUNE couleur n'est câblée ici : les deux méthodes reçoivent leurs teintes en
    // PARAMÈTRE depuis l'appelant (qui, lui, les lit sur DesignTokens.Current). Ce fichier ne
    // contient donc, par construction, aucun accès DesignTokens ni aucun littéral de couleur autre
    // que les defaults neutres (Color.white/alpha) utilisés pour le canal de couverture.
    public static class ProceduralUI
    {
        private static readonly Dictionary<string, Sprite> cache = new Dictionary<string, Sprite>();

        /// <summary>Disque plein, dégradé RADIAL centre→bord (reproduit
        /// `radial-gradient(circle at 38% 30%, ...)` du médaillon de référence en une texture
        /// pré-calculée). Bord anti-crénelé sur ~1.5px.</summary>
        public static Sprite RadialDisc(int diameterPx, Color centerColor, Color edgeColor)
        {
            string key = $"disc:{diameterPx}:{ColorKey(centerColor)}:{ColorKey(edgeColor)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int d = Mathf.Max(4, diameterPx);
            var tex = NewTexture(d);
            float r = d / 2f;
            var center = new Vector2(r, r);
            var pixels = new Color[d * d];
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float dist = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), center);
                    float t = Mathf.Clamp01(dist / r);
                    Color c = Color.Lerp(centerColor, edgeColor, t);
                    c.a *= Mathf.Clamp01((r - dist) / 1.5f); // anti-crénelage du bord du disque
                    pixels[y * d + x] = c;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);

            Sprite sprite = Sprite.Create(tex, new Rect(0, 0, d, d), new Vector2(0.5f, 0.5f), 100f);
            cache[key] = sprite;
            return sprite;
        }

        /// <summary>Anneau (disque troué) — le "filet" laiton du boîtier. `thicknessPx` est
        /// l'épaisseur de la bande visible ; le CENTRE reste transparent (alpha 0), ce qui rend
        /// ce sprite structurellement NON-aplat quel que soit son diamètre de RectTransform — la
        /// falsifiable "l'or jamais en aplat" mesure la couverture RÉELLE (échantillonnage de la
        /// texture), pas la boîte englobante.</summary>
        public static Sprite Ring(int diameterPx, float thicknessPx, Color color)
        {
            string key = $"ring:{diameterPx}:{thicknessPx:F2}:{ColorKey(color)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int d = Mathf.Max(4, diameterPx);
            var tex = NewTexture(d);
            float rOuter = d / 2f;
            float rInner = Mathf.Max(0f, rOuter - thicknessPx);
            var center = new Vector2(rOuter, rOuter);
            var pixels = new Color[d * d];
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float dist = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), center);
                    Color c = color;
                    float outerFade = Mathf.Clamp01((rOuter - dist) / 1.5f);
                    float innerFade = Mathf.Clamp01((dist - rInner) / 1.5f);
                    c.a *= Mathf.Min(outerFade, innerFade);
                    pixels[y * d + x] = c;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);

            Sprite sprite = Sprite.Create(tex, new Rect(0, 0, d, d), new Vector2(0.5f, 0.5f), 100f);
            cache[key] = sprite;
            return sprite;
        }

        private static Texture2D NewTexture(int d) => new Texture2D(d, d, TextureFormat.RGBA32, false)
        {
            wrapMode = TextureWrapMode.Clamp,
            filterMode = FilterMode.Bilinear,
        };

        private static string ColorKey(Color c) => $"{c.r:F3}_{c.g:F3}_{c.b:F3}_{c.a:F3}";
    }
}
