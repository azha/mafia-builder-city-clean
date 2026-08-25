using System.Collections.Generic;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    // ⚠️ CE FICHIER A DÉMÉNAGÉ DE `Shell` VERS `ShellContracts` LE 2026-08-22, sans changer de
    // namespace — donc AUCUN des sites d'appel existants ne bouge (`AppShell`, `TopBarController`
    // et leurs deux fichiers de test continuent d'écrire `ProceduralUI.Ring(...)`).
    // Raison : les locataires du shell en ont besoin (le médaillon d'un marqueur de lieutenant,
    // `DistrictInteriorScreenController`) et `Shell` référence `CityMap`, jamais l'inverse — lire
    // ce type depuis `CityMap` donnait CS0234. `ShellContracts` est la seule assembly que les deux
    // côtés voient, comme pour `ShellChrome` et `HeatBucketResolver`.
    // Le fichier ne dépendait que de `UnityEngine` et `System.Collections.Generic` : le déplacement
    // n'ajoute aucune dépendance à `ShellContracts`.
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

        /// <summary>HUD v3.1 boucle ⊥ pixel-perfect (2026-08-21) — masque de coins arrondis,
        /// 9-slice (`Sprite.border`) pour rester correct à N'IMPORTE QUELLE largeur de barre sans
        /// régénérer de texture par résolution d'appareil (une bitmap pleine-largeur serait gaspillée
        /// et fausse dès que l'écran change). Utilisé comme graphique d'un `UnityEngine.UI.Mask`
        /// (`showMaskGraphic=false` — seul le canal ALPHA sert de stencil, jamais sa couleur) : le
        /// fond en dégradé (`VerticalGradientImage`, enfant de ce mask) se retrouve ainsi rogné aux 4
        /// coins. Blanc opaque partout SAUF les 4 quarts de cercle des coins (alpha 0 hors rayon).</summary>
        /// <summary>Un filet horizontal qui S'ESTOMPE aux deux extrémités.
        ///
        /// Relevé sur la maquette du bandeau (`Tools/hud-topbar-reference-2560.png`, y=102), en
        /// intensité relative par pas de 5 % de la largeur :
        ///     0 % → 0,11 · 5 % → 0,35 · 10 % → 0,60 · 15 % → 0,85 · 20 % → 1,00 · … puis miroir.
        /// C'est une **rampe linéaire sur les 20 % extrêmes de chaque côté**, partant de ~0,10.
        /// (Le creux à 50 % du relevé est le médaillon qui recouvre le filet, pas un pli du fondu.)
        ///
        /// Notre filet était à pleine intensité d'un bord à l'autre : il coupait l'écran d'un trait
        /// net au lieu de mourir dans les marges, et deux juges visuels l'ont relevé.
        ///
        /// La texture est générée LARGE (256) puis étirée : un ruban d'un pixel de haut interpolé
        /// horizontalement donne une rampe lisse à n'importe quelle largeur d'écran, là où une
        /// texture à la largeur exacte serait à refaire à chaque résolution.</summary>
        public static Sprite HorizontalFade(int widthPx, float fadeFraction, float alphaAuBord)
        {
            string cle = "fade:" + widthPx + ":" + fadeFraction.ToString("F3") + ":" + alphaAuBord.ToString("F3");
            if (cacheFade.TryGetValue(cle, out Sprite deja)) return deja;

            var tex = new Texture2D(widthPx, 1, TextureFormat.RGBA32, false)
            {
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.HideAndDontSave,
            };
            var pixels = new Color32[widthPx];
            float bordePx = Mathf.Max(1f, widthPx * fadeFraction);
            for (int x = 0; x < widthPx; x++)
            {
                float depuisBord = Mathf.Min(x + 0.5f, widthPx - 0.5f - x);
                float t = Mathf.Clamp01(depuisBord / bordePx);
                float a = Mathf.Lerp(alphaAuBord, 1f, t);
                // ⚠️ `Color.white` et NON un littéral (255,255,255) : la garde de provenance des
                // couleurs (`DA3_NoRawColorLiterals_InTopBarDoctrineFiles`) a rougi sur ce fichier,
                // et elle avait raison sur la FORME même si le fond est un masque — la teinte réelle
                // vient de `Image.color`, donc d'un token. Écrire un triplet ici, c'est ouvrir la
                // porte au prochain qui en écrira un vrai.
                Color32 masque = Color.white;
                masque.a = (byte)Mathf.RoundToInt(a * 255f);
                pixels[x] = masque;
            }
            tex.SetPixels32(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, widthPx, 1), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect);
            sp.hideFlags = HideFlags.HideAndDontSave;
            cacheFade[cle] = sp;
            return sp;
        }

        private static readonly Dictionary<string, Sprite> cacheFade = new Dictionary<string, Sprite>();

        public static Sprite RoundedRectMask(int cornerRadiusPx)
        {
            string key = $"roundmask:{cornerRadiusPx}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int r = Mathf.Max(1, cornerRadiusPx);
            int d = r * 2 + 3; // 1px de marge de chaque côté du centre pour l'anti-crénelage du rayon
            var tex = NewTexture(d);
            var pixels = new Color[d * d];
            var cornerCenter = new Vector2(r, r); // coin bas-gauche, en espace texture (0,0 = bas-gauche)
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    // Distance au coin de référence LE PLUS PROCHE — seuls les 4 quarts de cercle
                    // (un par coin, répliqués par symétrie du 9-slice) doivent être testés ; le reste
                    // du carré (bords/centre, hors zone d'influence d'un coin) reste opaque.
                    bool nearLeft = x < r, nearBottom = y < r;
                    bool nearRight = x >= d - r, nearTop = y >= d - r;
                    float alpha = 1f;
                    if (nearLeft && nearBottom)
                    {
                        float dist = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), cornerCenter);
                        alpha = Mathf.Clamp01((r - dist) + 0.5f);
                    }
                    else if (nearRight && nearBottom)
                    {
                        float dist = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(d - r, r));
                        alpha = Mathf.Clamp01((r - dist) + 0.5f);
                    }
                    else if (nearLeft && nearTop)
                    {
                        float dist = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(r, d - r));
                        alpha = Mathf.Clamp01((r - dist) + 0.5f);
                    }
                    else if (nearRight && nearTop)
                    {
                        float dist = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(d - r, d - r));
                        alpha = Mathf.Clamp01((r - dist) + 0.5f);
                    }
                    // R2.3/DA3 — le constructeur littéral à 4 arguments est le motif scanné par
                    // DA3_NoRawColorLiterals ; l'éviter en partant d'une couleur nommée puis en
                    // modifiant son canal alpha, même patron que Ring/RadialDisc ci-dessus. Piège du
                    // socle CLAUDE.md : NE JAMAIS citer verbatim la forme évitée dans ce commentaire —
                    // le scanner compte les COMMENTAIRES aussi bien que le code, la citer la
                    // réintroduirait dans le compte.
                    Color px = Color.white;
                    px.a = alpha;
                    pixels[y * d + x] = px;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);

            var border = new Vector4(r, r, r, r); // (left, bottom, right, top) — 9-slice
            Sprite sprite = Sprite.Create(tex, new Rect(0, 0, d, d), new Vector2(0.5f, 0.5f), 100f,
                0, SpriteMeshType.FullRect, border);
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
