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

        /// <summary>Un CONTOUR de rectangle arrondi, découpable en 9-slice.
        ///
        /// POURQUOI il fallait l'écrire : `Ring` produit un CERCLE. Découpé en 9-slice sur un
        /// panneau large, il s'étire en **ELLIPSE** — c'est exactement ce que la première version
        /// des panneaux de l'écran « LA FAMILLE » a rendu, et ça se voit au premier coup d'œil.
        /// Un contour arrondi a besoin de bordures de découpe : le centre s'étire, les quatre coins
        /// gardent leur rayon. `RoundedRectMask` fait ça pour une surface PLEINE ; ceci le fait pour
        /// un TRAIT.
        ///
        /// Le sprite porte son `border` (r,r,r,r) : c'est lui qui dit à uGUI où découper. Sans lui,
        /// `Image.Type.Sliced` se rabat silencieusement sur `Simple` et déforme.</summary>
        public static Sprite RoundedRectOutline(int cornerRadiusPx, float thicknessPx, Color color)
        {
            string key = $"roundoutline:{cornerRadiusPx}:{thicknessPx:F2}:{ColorKey(color)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int r = Mathf.Max(2, cornerRadiusPx);
            int d = r * 2 + 3;
            float t = Mathf.Max(1f, thicknessPx);
            var tex = NewTexture(d);
            var pixels = new Color[d * d];
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float px = x + 0.5f, py = y + 0.5f;
                    // Distance SIGNÉE au bord du rectangle arrondi : négative dedans, nulle sur le
                    // bord. On garde une bande d'épaisseur `t` juste à l'intérieur.
                    float qx = Mathf.Abs(px - d * 0.5f) - (d * 0.5f - r);
                    float qy = Mathf.Abs(py - d * 0.5f) - (d * 0.5f - r);
                    float dist = (qx > 0f && qy > 0f)
                        ? Mathf.Sqrt(qx * qx + qy * qy) - r
                        : Mathf.Max(qx, qy) - r;
                    // |dist + t/2| <= t/2  ⇔  la bande [-t, 0] autour du bord
                    float bande = Mathf.Abs(dist + t * 0.5f);
                    float alpha = Mathf.Clamp01(t * 0.5f - bande + 0.5f);
                    Color c = color;
                    c.a *= alpha;
                    pixels[y * d + x] = c;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, d, d), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect, new Vector4(r, r, r, r));
            sp.hideFlags = HideFlags.HideAndDontSave;
            cache[key] = sp;
            return sp;
        }

        /// <summary>Un dégradé vertical à deux arrêts, sous forme de SPRITE (1 px de large,
        /// `hauteurPx` de haut, étiré horizontalement par uGUI).
        ///
        /// POURQUOI PAS `VerticalGradientImage` : celui-ci dérive de `Graphic`, pas de
        /// `MaskableGraphic` — il n'implémente donc **ni `IMaskable` ni `IClippable`**, et **aucun
        /// masque ne l'atteint**. Mesuré le 2026-08-22 : la plaque d'un rang de l'organigramme,
        /// posée sous un masque en rectangle arrondi, rendait des coins parfaitement CARRÉS.
        /// (Le même point vaut pour les `maskGo` du bandeau et de la barre d'onglets — leur masque
        /// ne mord pas non plus sur le dégradé ; c'est sans effet VISIBLE là-bas, les deux barres
        /// étant des rectangles pleine largeur, mais le dispositif y est décoratif.)
        /// Un `Image` porte le dégradé dans sa TEXTURE, est un `MaskableGraphic`, et se fait
        /// clipper normalement.</summary>
        public static Sprite VerticalGradient(int hauteurPx, Color haut, Color bas)
        {
            string key = $"vgrad:{hauteurPx}:{ColorKey(haut)}:{ColorKey(bas)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int h = Mathf.Max(2, hauteurPx);
            var tex = new Texture2D(1, h, TextureFormat.RGBA32, false)
            {
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.HideAndDontSave,
            };
            var pixels = new Color[h];
            for (int y = 0; y < h; y++)
            {
                // y = 0 est le BAS de la texture (convention Unity).
                pixels[y] = Color.Lerp(bas, haut, y / (float)(h - 1));
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, 1, h), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect);
            sp.hideFlags = HideFlags.HideAndDontSave;
            cache[key] = sp;
            return sp;
        }

        /// <summary>Un contour de rectangle arrondi en POINTILLÉS, à utiliser en `Image.Type.Tiled`.
        ///
        /// La bascule qui rend ça possible est `Tiled` plutôt que `Sliced` : les deux respectent
        /// le `border` du sprite et gardent les coins intacts, mais `Sliced` ÉTIRE la section
        /// centrale — ce qui transformerait un tiret en une longue barre — tandis que `Tiled` la
        /// RÉPÈTE. La section centrale porte donc exactement UNE période de pointillé, et la
        /// répétition produit le tiret sur toute la longueur, à pas constant quelle que soit la
        /// largeur du panneau.
        ///
        /// La référence l'écrit sur ses deux panneaux vides : `.vide{border:1px dashed #ffffff22}`.</summary>
        public static Sprite RoundedRectDashedOutline(int cornerRadiusPx, float thicknessPx,
                                                      int traitPx, int videPx, Color color)
        {
            int periode = Mathf.Max(2, traitPx + videPx);
            string key = $"rounddash:{cornerRadiusPx}:{thicknessPx:F2}:{traitPx}:{videPx}:{ColorKey(color)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int r = Mathf.Max(2, cornerRadiusPx);
            int d = r * 2 + periode;          // centre = exactement une période
            float t = Mathf.Max(1f, thicknessPx);
            var tex = NewTexture(d);
            var pixels = new Color[d * d];
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float px = x + 0.5f, py = y + 0.5f;
                    float qx = Mathf.Abs(px - d * 0.5f) - (d * 0.5f - r);
                    float qy = Mathf.Abs(py - d * 0.5f) - (d * 0.5f - r);
                    float dist = (qx > 0f && qy > 0f)
                        ? Mathf.Sqrt(qx * qx + qy * qy) - r
                        : Mathf.Max(qx, qy) - r;
                    float bande = Mathf.Abs(dist + t * 0.5f);
                    float alpha = Mathf.Clamp01(t * 0.5f - bande + 0.5f);

                    // Le pointillé ne s'applique QUE dans les sections répétées (le centre des
                    // bords). Les coins restent pleins : c'est ce que fait un `dashed` CSS sur un
                    // rayon, et ça évite un tiret coupé en plein virage.
                    bool centreX = x >= r && x < d - r;
                    bool centreY = y >= r && y < d - r;
                    if (centreX && !centreY) alpha *= ((x - r) % periode) < traitPx ? 1f : 0f;
                    else if (centreY && !centreX) alpha *= ((y - r) % periode) < traitPx ? 1f : 0f;

                    Color c = color;
                    c.a *= alpha;
                    pixels[y * d + x] = c;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, d, d), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect, new Vector4(r, r, r, r));
            sp.hideFlags = HideFlags.HideAndDontSave;
            cache[key] = sp;
            return sp;
        }

        /// <summary>La face d'un médaillon : dégradé radial DÉCENTRÉ + rayons en éventail.
        ///
        /// REUSE littéral de la maquette (`.medl`) :
        ///   `repeating-conic-gradient(from 0deg, rgba(255,255,255,.05) 0deg 4deg, transparent 4deg 9deg)`
        ///   sur `radial-gradient(circle at 38% 30%, #243048, #0f1622 66%)`.
        ///
        /// POURQUOI PAS `RadialDisc` : il produit un dégradé CENTRÉ et sans rayons. Un juge visuel ⊥
        /// l'a chiffré sur un arc du médaillon — écart-type de luminance **7,41 en référence contre
        /// 0,55 dans le rendu**, amplitude 26,5 contre 2,6 : la texture angulaire était **10× plus
        /// plate**, c'est-à-dire absente. Ce n'est pas un détail de finition : c'est ce qui fait
        /// qu'un médaillon se lit comme une frappe de métal et non comme une pastille.</summary>
        public static Sprite MedallionFace(int diameterPx, Color centre, Color bord, Color rayon,
                                           float periodeDeg = 9f, float largeurRayonDeg = 4f)
        {
            string key = $"medface:{diameterPx}:{ColorKey(centre)}:{ColorKey(bord)}:{ColorKey(rayon)}:" +
                         $"{periodeDeg:F1}:{largeurRayonDeg:F1}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int d = Mathf.Max(8, diameterPx);
            var tex = NewTexture(d);
            var pixels = new Color[d * d];
            float r = d * 0.5f;
            // `circle at 38% 30%` — en espace texture, l'origine est en BAS à gauche, donc 30 %
            // depuis le HAUT devient 70 % depuis le bas.
            var foyer = new Vector2(d * 0.38f, d * 0.70f);
            // `#0f1622 66%` : le dégradé atteint sa couleur de bord à 66 % du rayon.
            float portee = r * 0.66f;
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float px = x + 0.5f, py = y + 0.5f;
                    float dCentre = Vector2.Distance(new Vector2(px, py), new Vector2(r, r));
                    // Bord du disque, avec un pixel d'anti-crénelage.
                    float couvert = Mathf.Clamp01(r - dCentre + 0.5f);
                    if (couvert <= 0f) { pixels[y * d + x] = Color.clear; continue; }

                    float t = Mathf.Clamp01(Vector2.Distance(new Vector2(px, py), foyer) / portee);
                    Color c = Color.Lerp(centre, bord, t);

                    // Les rayons : une bande claire tous les `periodeDeg`, large de `largeurRayonDeg`.
                    float ang = Mathf.Atan2(py - r, px - r) * Mathf.Rad2Deg;
                    if (ang < 0f) ang += 360f;
                    if (ang % periodeDeg < largeurRayonDeg)
                        c = Color.Lerp(c, rayon, rayon.a);

                    c.a = couvert;
                    pixels[y * d + x] = c;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, d, d), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect);
            sp.hideFlags = HideFlags.HideAndDontSave;
            cache[key] = sp;
            return sp;
        }

        /// <summary>Convertit une opacité CSS en l'opacité à EMPLOYER pour que le mélange
        /// LINÉAIRE d'Unity retombe sur le pixel qu'un navigateur produirait en sRGB.
        ///
        /// ⚠️⚠️ CE N'EST PAS UN AJUSTEMENT À L'ŒIL — c'est une conversion, et elle est MESURÉE.
        /// Un juge visuel ⊥ a constaté que les CINQ opacités translucides de l'écran « LA FAMILLE »
        /// rendaient 1,7× à 4× trop fort, systématiquement. La tentation était de corriger les
        /// nombres un par un. La cause est ailleurs : la maquette de référence est rendue par un
        /// NAVIGATEUR, qui compose en sRGB ; ce projet est en espace **linéaire**
        /// (`m_ActiveColorSpace: 1`), où le mélange favorise la couleur claire.
        ///
        /// Tranché par une expérience à UNE variable (`W3U2_F30`) : or `#d9ab4e` à α=0,267 sur
        /// `(21,28,43)` rend **(121,96,54)**. Prédiction sRGB (73,66,52) — distance 0,22.
        /// Prédiction linéaire (121,96,55) — distance **0,0035**. Le modèle linéaire gagne à
        /// 1/255 près.
        ///
        /// ★ Et le corollaire explique pourquoi tout n'était pas faux : l'écart CROÎT avec le
        /// contraste entre l'encre et son fond. La plaque de verre (bleu très sombre sur fond très
        /// sombre) tombait juste sans conversion — le juge l'a mesurée exacte. L'or sur bleu nuit,
        /// lui, est le cas extrême.
        ///
        /// La résolution se fait par canal puis est moyennée en pondérant par |encre − fond| :
        /// un canal où l'encre et le fond se confondent ne contraint rien et ne doit pas peser.</summary>
        public static float AlphaSrgbVersLineaire(Color encre, Color fond, float alphaSrgb)
        {
            if (alphaSrgb <= 0f) return 0f;
            if (alphaSrgb >= 1f) return 1f;
            Color cible = Color.Lerp(fond, encre, alphaSrgb);   // ce que le navigateur produit
            Color t = cible.linear, b = fond.linear, c = encre.linear;
            float[] dc = { c.r - b.r, c.g - b.g, c.b - b.b };
            float[] dt = { t.r - b.r, t.g - b.g, t.b - b.b };
            float somme = 0f, poids = 0f;
            for (int i = 0; i < 3; i++)
            {
                float w = Mathf.Abs(dc[i]);
                if (w < 1e-4f) continue;
                somme += (dt[i] / dc[i]) * w;
                poids += w;
            }
            // Aucun canal ne contraint : l'encre EST le fond, n'importe quel alpha convient.
            if (poids < 1e-4f) return alphaSrgb;
            return Mathf.Clamp01(somme / poids);
        }

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
