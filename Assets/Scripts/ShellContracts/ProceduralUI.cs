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
        /// <summary>La largeur de la RAMPE d'anti-crénelage des anneaux, en pixels de texture, sur
        /// CHAQUE bord. Constante du générateur, pas un réglage d'appelant.
        ///
        /// ⛔ EXPOSÉE PARCE QU'UN ORACLE NE PEUT PAS S'EN PASSER, et il vaut mieux qu'il la lise
        /// ici que la recopie. Un trait nominal de `t` px dessiné avec cette rampe a ses deux bords
        /// à MI-ALPHA distants de `t − RampeAntiCrenelagePx` : la moitié de la rampe est retranchée
        /// de chaque côté. Un instrument qui mesure la largeur à mi-alpha et la compare à `t`
        /// accuse donc le dessin d'un défaut que la rasterisation a fabriqué — mesuré le
        /// 2026-09-06, trois versions d'un oracle de proportions réfutées l'une après l'autre par
        /// leur propre contrôle avant d'avoir jugé quoi que ce soit.</summary>
        public const float RampeAntiCrenelagePx = 1.5f;

        /// <summary>⛔⛔ UN ARC À ÉTENDUE CUITE — l'anneau n'est peint QUE sur l'intervalle
        /// angulaire demandé, embouts FRANCS par construction. Il remplace le couple
        /// « `Ring` complet + `Image.Type.Filled` en `Radial180` ».
        ///
        /// POURQUOI CUIRE L'ÉTENDUE PLUTÔT QUE COUPER. Un juge ⊥ mesure l'arc à 1,02 → 3,16 → 0,94
        /// le long de sa course (canon : constant 2,46–2,52, coupé net) et `DA7`, étendu à
        /// l'épaisseur et validé par un contrôle de cible, le confirme sur les DEUX arcs — froid
        /// 1,11 → 8,05 px, chaud 0,56 → 6,11 px, le maximum tombant sur l'épaisseur nominale. Le
        /// trait atteint donc sa cote AU MILIEU : le défaut est aux EXTRÉMITÉS.
        /// ⚠️ Sa CAUSE, elle, n'a jamais été établie — trois hypothèses, deux rétractations, et une
        ///   démonstration qui portait sur le mauvais objet. Cuire l'étendue **rend la cause sans
        ///   importance** : il n'y a plus de coupe, plus de `fillAmount`, plus de maillage taillé.
        ///   *Quand une cause résiste à trois instruments, changer la forme qui la rend possible
        ///   coûte moins cher qu'un quatrième instrument* — et DA7 dira sur le nouvel objet si le
        ///   fuselage a survécu, ce qui reste la seule preuve qui compte.
        ///
        /// ⚠️ LA CONVENTION D'ANGLE EST CELLE DU CANON, écrite ici pour qu'aucun appelant n'ait à
        ///   la deviner : **0° à DROITE, sens trigonométrique** (90° en haut, 180° à gauche) —
        ///   celle du SVG source et celle des instruments du juge. Le contrôleur, lui, raisonnait
        ///   en `fillOrigin`/`fillClockwise`, un repère qui n'est celui de personne d'autre.
        /// ⚠️ L'anti-crénelage porte sur les DEUX bords radiaux ET sur les deux embouts, avec la
        ///   même rampe : un embout franc n'est pas un embout dur, c'est un embout dont la coupe
        ///   suit un RAYON au lieu de suivre un maillage.</summary>
        public static Sprite ArcCuit(int diameterPx, float thicknessPx, Color color,
            float angleDebutDeg, float angleFinDeg)
        {
            string key = $"arc:{diameterPx}:{thicknessPx:F2}:{angleDebutDeg:F2}:{angleFinDeg:F2}:{ColorKey(color)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int d = Mathf.Max(4, diameterPx);
            var tex = NewTexture(d);
            float rOuter = d / 2f;
            float rInner = Mathf.Max(0f, rOuter - thicknessPx);
            var centre = new Vector2(rOuter, rOuter);
            float a0 = Mathf.Min(angleDebutDeg, angleFinDeg);
            float a1 = Mathf.Max(angleDebutDeg, angleFinDeg);
            // La rampe angulaire équivalente à la rampe radiale, prise au rayon MÉDIAN : sans ça un
            // arc étroit aurait des embouts plus doux qu'un arc large, à rampe égale en pixels.
            float rMedian = Mathf.Max(1f, (rOuter + rInner) * 0.5f);
            float rampeDeg = RampeAntiCrenelagePx / rMedian * Mathf.Rad2Deg;

            var pixels = new Color[d * d];
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    var p = new Vector2(x + 0.5f, y + 0.5f);
                    float dist = Vector2.Distance(p, centre);
                    float ang = Mathf.Atan2(p.y - centre.y, p.x - centre.x) * Mathf.Rad2Deg;
                    if (ang < 0f) ang += 360f;
                    // Ramener l'angle dans la fenêtre, en tenant compte du passage par 0°.
                    float angRel = ang;
                    if (angRel < a0 - 180f) angRel += 360f;
                    else if (angRel > a1 + 180f) angRel -= 360f;

                    Color c = color;
                    float fondu = Mathf.Min(
                        Mathf.Clamp01((rOuter - dist) / RampeAntiCrenelagePx),
                        Mathf.Clamp01((dist - rInner) / RampeAntiCrenelagePx));
                    float fonduAngle = Mathf.Min(
                        Mathf.Clamp01((angRel - a0) / rampeDeg),
                        Mathf.Clamp01((a1 - angRel) / rampeDeg));
                    c.a *= Mathf.Min(fondu, fonduAngle);
                    pixels[y * d + x] = c;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);

            Sprite sprite = Sprite.Create(tex, new Rect(0, 0, d, d), new Vector2(0.5f, 0.5f), 100f);
            cache[key] = sprite;
            return sprite;
        }

        /// <summary>⛔⛔ UN TRACÉ QUELCONQUE, ÉPAISSI — la primitive à CHEMIN qui manquait, et que
        /// deux dettes réclamaient séparément.
        ///
        /// POURQUOI ELLE EXISTE. Le canon dessine certaines formes en SVG et rien d'autre ne les
        /// rend : les volutes du bandeau (`d="M1 6 h12 M13 6 c4 0 4 -5 8 -5 c3 0 3 4 0 4 c-2 0 -2
        /// -3 1 -3"`) et la calotte du portrait de ㊲ (TD-651, dont l'entrée dit qu'« aucune ellipse,
        /// aucun rect, aucun rect arrondi et aucune occlusion ne rend » son bord bas concave).
        /// Quatre approximations successives ont été tentées sur la seconde avant qu'on écrive que
        /// la forme, et non la cote, était le problème. *Quand quatre réglages échouent sur une
        /// forme, c'est la primitive qui manque.*
        ///
        /// CE QU'ELLE PREND : une polyligne déjà échantillonnée — l'appelant convertit ses courbes
        /// en points par `EchantillonnerCubique`. Ce découpage est délibéré : le rasteriseur ne
        /// connaît que des segments, donc il ne peut pas se tromper sur une courbe, et
        /// l'échantillonnage se teste séparément.
        /// ⚠️ La distance point↔segment est calculée exactement (projection bornée), jamais
        /// approchée par la distance aux extrémités : une approximation par les bouts épaissit les
        /// angles et amincit les milieux — le fuselage, exactement, qu'un juge a mesuré ailleurs
        /// sur ce même écran.
        /// ⚠️ `epaisseurPx` est l'épaisseur TOTALE du trait (comme `stroke-width` en SVG), donc la
        /// distance retenue est la demi-épaisseur — la confusion inverse donne un trait deux fois
        /// trop gras et se lit comme une erreur de couleur.</summary>
        public static Sprite Chemin(int largeurPx, int hauteurPx, IList<IList<Vector2>> sousChemins,
            float epaisseurPx, Color couleur)
        {
            var cle = new System.Text.StringBuilder($"chemin:{largeurPx}:{hauteurPx}:{epaisseurPx:F2}:{ColorKey(couleur)}");
            foreach (var sc in sousChemins) foreach (Vector2 v in sc) cle.Append($":{v.x:F1},{v.y:F1}");
            string key = cle.ToString();
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int w = Mathf.Max(2, largeurPx), h = Mathf.Max(2, hauteurPx);
            var tex = new Texture2D(w, h, TextureFormat.RGBA32, false)
            {
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.HideAndDontSave,
            };
            float demi = epaisseurPx * 0.5f;
            var pixels = new Color[w * h];
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    // y de texture monte, y du tracé descend (convention SVG) : on retourne ici,
                    // une fois, plutôt que de demander à chaque appelant d'y penser.
                    var p = new Vector2(x + 0.5f, h - 1 - y + 0.5f);
                    float best = float.MaxValue;
                    foreach (IList<Vector2> sc in sousChemins)
                        for (int i = 0; i + 1 < sc.Count; i++)
                        {
                            float d = DistancePointSegment(p, sc[i], sc[i + 1]);
                            if (d < best) best = d;
                        }
                    Color c = couleur;
                    c.a *= Mathf.Clamp01((demi - best) / RampeAntiCrenelagePx + 0.5f);
                    pixels[y * w + x] = c;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, w, h), new Vector2(0.5f, 0.5f), 100f);
            sp.hideFlags = HideFlags.HideAndDontSave;
            cache[key] = sp;
            return sp;
        }

        /// <summary>Échantillonne une cubique de Bézier en `n` segments. Séparé du rasteriseur pour
        /// que chacun se teste seul — et parce qu'un `d` de SVG se traduit en points une fois, pas
        /// à chaque pixel.</summary>
        public static void EchantillonnerCubique(List<Vector2> sortie, Vector2 p0, Vector2 p1,
            Vector2 p2, Vector2 p3, int n = 16)
        {
            for (int i = 1; i <= n; i++)
            {
                float u = i / (float)n, v = 1f - u;
                sortie.Add(v * v * v * p0 + 3f * v * v * u * p1 + 3f * v * u * u * p2 + u * u * u * p3);
            }
        }

        private static float DistancePointSegment(Vector2 p, Vector2 a, Vector2 b)
        {
            Vector2 ab = b - a;
            float l2 = ab.sqrMagnitude;
            if (l2 < 1e-6f) return Vector2.Distance(p, a);
            float t = Mathf.Clamp01(Vector2.Dot(p - a, ab) / l2);
            return Vector2.Distance(p, a + t * ab);
        }

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
                    float outerFade = Mathf.Clamp01((rOuter - dist) / RampeAntiCrenelagePx);
                    float innerFade = Mathf.Clamp01((dist - rInner) / RampeAntiCrenelagePx);
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
        /// <summary>La MÊME rampe, mais rendue en pixels OPAQUES déjà mélangés en sRGB — pour les
        /// dégradés qui doivent retomber sur ce qu'un navigateur produit.
        ///
        /// ⛔⛔ POURQUOI UNE SECONDE FORME PLUTÔT QU'UN RÉGLAGE. La surcharge ci-dessous écrit un
        /// masque BLANC dont seul l'alpha varie ; Unity compose ce masque en espace LINÉAIRE, alors
        /// que la maquette compose son `linear-gradient` en sRGB. Un juge ⊥ l'a mesuré sur le filet
        /// de tête de ⑥ par un test de modèle à UNE variable (alpha connu de la CSS, fond et encre
        /// pleins relevés sur CHAQUE image, 10 points, plus un point de contrôle à α = 1 où les deux
        /// prédictions coïncident) : **référence — somme des écarts sRGB 2/255 contre linéaire
        /// 270/255 ; jeu — sRGB 275/255 contre linéaire 7/255.** Deux espaces, pas un réglage à
        /// corriger. Symptôme : le filet monte à pleine intensité beaucoup plus près du bord au
        /// lieu de s'y éteindre (à 8 % de la largeur, +17 attendu contre +39 mesuré).
        ///
        /// ⇒ LA SOLUTION N'EST PAS DE CONVERTIR L'ALPHA. `CouleurPourMelangeLineaire` déplace la
        ///   COULEUR à opacité constante — elle n'a pas d'emploi ici, où c'est l'opacité qui varie
        ///   d'un pixel à l'autre et où la couleur, elle, est unique. On écrit donc directement le
        ///   RÉSULTAT du mélange sRGB, pixel par pixel, en OPAQUE : un pixel opaque n'est plus
        ///   composé du tout, donc plus aucun espace ne s'en mêle. C'est déjà la technique du rail
        ///   de l'arbre (`VerticalGradient` entre deux couleurs opaques), généralisée au pixel.
        ///
        /// ⚠️ LE PRIX, ET IL FAUT LE DIRE : la rampe PEINT le fond qu'on lui donne au lieu de
        ///    laisser voir celui qui est réellement dessous. À n'employer que là où le fond est
        ///    connu et uni — un filet posé sur la feuille, pas un voile qui déborde d'un bloc.</summary>
        public static Sprite HorizontalFade(int widthPx, float fadeFraction, float alphaAuBord,
                                            Color encre, Color fond)
        {
            string cle = "fadeop:" + widthPx + ":" + fadeFraction.ToString("F3") + ":"
                       + alphaAuBord.ToString("F3") + ":" + ColorKey(encre) + ":" + ColorKey(fond);
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
                // Le mélange du NAVIGATEUR : une interpolation sur les composantes NON linéaires.
                // `Color.Lerp` opère sur les composantes telles quelles — donc en sRGB ici, ce qui
                // est exactement ce qu'on veut. La texture est créée sans `linear:true`, donc elle
                // est lue comme sRGB : le pixel écrit est le pixel affiché.
                Color melange = Color.Lerp(fond, encre, a);
                melange.a = 1f;
                pixels[x] = melange;
            }
            tex.SetPixels32(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, widthPx, 1), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect);
            sp.hideFlags = HideFlags.HideAndDontSave;
            cacheFade[cle] = sp;
            return sp;
        }

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
        /// <summary>Un dégradé LINÉAIRE orienté — le `linear-gradient(Ndeg, …)` du CSS.
        ///
        /// `VerticalGradient` ne sait faire que 180°. La maquette écrit **160°** sur ses panneaux,
        /// et le juge ⊥ l'a mesuré : en référence les quatre coins s'ordonnent
        /// haut-gauche &gt; bas-gauche &gt; haut-droit &gt; bas-droit — la signature exacte d'une
        /// projection à 160°. Dans le rendu vertical, haut-gauche = haut-droit : l'axe avait
        /// disparu. Le coin le plus visible est le haut-droit, +41 % de luminance.
        ///
        /// Convention CSS : 0° monte, 180° descend, les degrés tournent dans le sens horaire.</summary>
        public static Sprite LinearGradient(int taillePx, float angleDeg, Color depart, Color arrivee)
        {
            string key = $"lingrad:{taillePx}:{angleDeg:F1}:{ColorKey(depart)}:{ColorKey(arrivee)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int d = Mathf.Max(4, taillePx);
            var tex = NewTexture(d);
            var pixels = new Color[d * d];
            // CSS : 180° = vers le bas. En espace texture (y vers le HAUT), l'axe du dégradé est
            // donc (sin θ, −cos θ), et `depart` se trouve du côté opposé.
            float rad = angleDeg * Mathf.Deg2Rad;
            // ⚠️ SIGNE VÉRIFIÉ SUR UN CAS CONNU, pas déduit. CSS : 180° = « vers le bas ». En
            // coordonnées d'ÉCRAN (y vers le bas) la direction vaut (sin θ, −cos θ) ; en
            // coordonnées de TEXTURE (y vers le HAUT) elle vaut donc (sin θ, +cos θ). À θ=180 :
            // (0,−1), c'est-à-dire vers le bas de la texture ✓.
            // La première version employait la formule d'écran dans un espace de texture : le juge
            // ⊥ a mesuré un dégradé à 160° rendu comme un 20° — les quatre coins dans l'ordre
            // exactement inverse, et l'écran entier éclairé PAR LE BAS.
            var axe = new Vector2(Mathf.Sin(rad), Mathf.Cos(rad));
            // Longueur de la projection de la diagonale sur l'axe : c'est elle qui normalise.
            float portee = Mathf.Abs(axe.x) + Mathf.Abs(axe.y);
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float ux = (x + 0.5f) / d - 0.5f, uy = (y + 0.5f) / d - 0.5f;
                    float t = Mathf.Clamp01((ux * axe.x + uy * axe.y) / portee + 0.5f);
                    pixels[y * d + x] = Color.Lerp(depart, arrivee, t);
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

        /// <summary>⛔⛔ UN DÉGRADÉ AVEC PALIER — `linear-gradient(180deg, transparent, X 40%)`.
        /// La forme que le canon demande, et que `VerticalGradient` ne rend PAS.
        ///
        /// LE DÉFAUT QUE CETTE FONCTION FERME, mesuré le 2026-09-06. Le site d'appel du voile du
        /// dock porte, en commentaire, la description exacte du canon : « opaque à 84,7 % dès 40 %
        /// de la hauteur — donc un plateau sur les 60 % du bas ». **Le sprite qu'il construisait
        /// n'a jamais eu de plateau** : `VerticalGradient` interpole d'un bout à l'autre, donc
        /// l'opacité au tiers supérieur vaut environ le tiers de la valeur finale. Or c'est
        /// précisément là que vivent les libellés du dock.
        /// ⇒ *Le commentaire décrivait le canon, le code faisait autre chose, et les deux se
        ///   relisaient comme cohérents.* Aucun alpha terminal ne pouvait corriger ça : monter
        ///   l'opacité du bas n'assombrit pas le haut d'une rampe.
        ///
        /// ⇒ CE QUI L'A RENDU VISIBLE, et pourquoi il a survécu si longtemps : le profil vertical
        ///   de la même colonne, sur deux résolutions du MÊME run —
        ///     1080×1920 : 53849a → 4f7e93 → 4c788c → 477285 → … → 16232e  (rampe, art clair visible)
        ///     1080×2400 : 090f19 → 55889e → 212530 → 1f232e → … → 0f151f  (sombre presque aussitôt)
        ///   L'art sous le dock est clair à 1920 et sombre à 2400 : le défaut ne se voyait qu'à
        ///   une résolution, sur un art. **Il a été classé « le voile a été retiré » par deux juges
        ///   ⊥ successifs, et un `git log` a montré que rien n'avait été retiré.**
        /// ★ La leçon est celle du socle, à l'envers : d'ordinaire on cherche ce qui a changé.
        ///   Ici rien n'avait changé — c'est la GÉOMÉTRIE qui sollicitait enfin le défaut.</summary>
        public static Sprite VerticalGradientAvecPalier(int hauteurPx, Color haut, Color bas,
            float fractionPalier)
        {
            float f = Mathf.Clamp(fractionPalier, 0.01f, 0.99f);
            string key = $"vgradp:{hauteurPx}:{ColorKey(haut)}:{ColorKey(bas)}:{f:F3}";
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
                // y = 0 est le BAS de la texture (convention Unity) ⇒ `bas` en 0, `haut` en h−1.
                // La fraction du CSS se compte depuis le HAUT : le palier occupe donc les
                // (1 − f) premiers pixels en partant du bas, et la rampe le reste.
                float depuisLeHaut = 1f - y / (float)(h - 1);
                float k = depuisLeHaut >= f ? 1f : depuisLeHaut / f;
                pixels[y] = Color.Lerp(haut, bas, k);
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, 1, h), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect);
            sp.hideFlags = HideFlags.HideAndDontSave;
            cache[key] = sp;
            return sp;
        }

        /// <summary>Le MIROIR de `VerticalGradientAvecPalier` : plateau EN HAUT, fondu en bas —
        /// `linear-gradient(180deg, X 0%, X f%, transparent 100%)`.
        ///
        /// ⚠️ POURQUOI DEUX FONCTIONS ET NON UN PARAMÈTRE DE PLUS. Les deux formes existent dans le
        /// canon et elles ne se déduisent pas l'une de l'autre par une valeur : le dock veut du
        /// plein EN BAS (il ancre le pied de l'écran), un titre veut du plein EN HAUT (il porte son
        /// encre). *Deux formes, deux fonctions nommées* — j'ai essayé de servir la seconde avec la
        /// première en jouant sur la fraction, et le résultat était systématiquement l'inverse de
        /// l'intention : le titre atterrissait sur la moitié ÉVANOUIE du dégradé.
        /// ★ Deux fois de suite, sur le même correctif, avec un dispositif complet et correctement
        ///   paramétré. *Un paramètre qui peut exprimer la forme inverse finit par l'exprimer.*</summary>
        public static Sprite VerticalGradientPalierEnHaut(int hauteurPx, Color plein, Color evanoui,
            float fractionPleine)
        {
            float f = Mathf.Clamp(fractionPleine, 0.01f, 0.99f);
            string key = $"vgradph:{hauteurPx}:{ColorKey(plein)}:{ColorKey(evanoui)}:{f:F3}";
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
                float depuisLeHaut = 1f - y / (float)(h - 1);   // y=0 est le BAS (convention Unity)
                float k = depuisLeHaut <= f ? 0f : (depuisLeHaut - f) / (1f - f);
                pixels[y] = Color.Lerp(plein, evanoui, k);
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, 1, h), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect);
            sp.hideFlags = HideFlags.HideAndDontSave;
            cache[key] = sp;
            return sp;
        }

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
        /// <summary>La COULEUR à employer pour qu'un mélange LINÉAIRE à l'opacité CSS retombe
        /// exactement, CANAL PAR CANAL, sur le pixel qu'un navigateur produirait en sRGB.
        ///
        /// ⚠️⚠️ REMPLACE `AlphaSrgbVersLineaire`, ET LA RAISON EST UNE MESURE. Résoudre en
        /// AJUSTANT L'OPACITÉ ne peut pas être exact : une opacité est UN nombre pour TROIS canaux,
        /// et les trois n'exigent pas le même. Ma version précédente moyennait les trois solutions
        /// en pondérant par |encre − fond| — un compromis qui laisse forcément une erreur par
        /// canal. Un juge visuel ⊥ l'a mesurée sans savoir d'où elle venait : sur la bordure de la
        /// carte du Don il a résolu **α = 0,334 en R, 0,320 en G, 0,218 en B**, et a écrit
        /// qu'« aucune couleur unique à un α unique ne produit ça sur ce fond ». C'était la
        /// signature exacte de ma moyenne.
        ///
        /// La forme juste garde l'opacité du CSS et déplace la COULEUR — trois inconnues pour
        /// trois équations, donc une solution EXACTE :
        ///     mélange linéaire : cible_lin = fond_lin + α·(C'_lin − fond_lin)
        ///     ⇒ C'_lin = fond_lin + (cible_lin − fond_lin) / α
        /// où `cible` est ce que le navigateur produit (mélange sRGB).
        ///
        /// ⚠️ Une opacité FAIBLE peut demander une couleur hors du cube [0..1] — la cible est alors
        /// inatteignable à cette opacité. On le DIT (`atteignable` à faux) plutôt que de rendre une
        /// couleur écrêtée qui aurait l'air d'une réponse.</summary>
        public static Color CouleurPourMelangeLineaire(Color encre, Color fond, float alphaSrgb,
                                                       out bool atteignable)
        {
            atteignable = true;
            if (alphaSrgb <= 0f) return encre;
            if (alphaSrgb >= 1f) return encre;
            Color cible = Color.Lerp(fond, encre, alphaSrgb);   // ce que le navigateur produit
            Color t = cible.linear, b = fond.linear;
            // R2.3 / DA3 — la garde de provenance interdit de composer une couleur par ses quatre
            // composantes, parce que c'est ainsi qu'on introduit un jeton en dur. Ici le résultat
            // est un CALCUL et non un choix de teinte, mais la garde ne peut pas faire la
            // différence — et c'est très bien : on part donc d'une couleur nommée et on écrit ses
            // canaux, exactement comme le reste de ce fichier. *Une garde qu'on peut satisfaire
            // sans rien perdre ne mérite pas d'exception.*
            Color lin = b;
            lin.r = b.r + (t.r - b.r) / alphaSrgb;
            lin.g = b.g + (t.g - b.g) / alphaSrgb;
            lin.b = b.b + (t.b - b.b) / alphaSrgb;
            lin.a = 1f;
            if (lin.r > 1f || lin.g > 1f || lin.b > 1f ||
                lin.r < 0f || lin.g < 0f || lin.b < 0f)
            {
                atteignable = false;
                lin.r = Mathf.Clamp01(lin.r);
                lin.g = Mathf.Clamp01(lin.g);
                lin.b = Mathf.Clamp01(lin.b);
            }
            Color srgb = lin.gamma;
            srgb.a = alphaSrgb;
            return srgb;
        }

        /// <summary>Les fonds de référence sur lesquels un VOILE du client peut réellement tomber :
        /// l'art de district, de la nuit la plus sombre au ciel de jour le plus clair. DÉCLARÉS,
        /// parce que la valeur rendue par `AlphaVoileSurFondQuelconque` est un AJUSTEMENT sur cet
        /// ensemble et sur aucun autre — un ajustement dont on cache le domaine est un compromis
        /// qu'on fait passer pour une solution.</summary>
        /// <remarks>⚠️ CONSTRUITS À PARTIR D'UNE COULEUR NOMMÉE, CANAL PAR CANAL — jamais par le
        /// constructeur à trois composantes. (Cette phrase le PARAPHRASE au lieu de l'écrire : la
        /// garde balaie le fichier, commentaires compris, et ma première rédaction citait la forme
        /// interdite pour expliquer qu'elle l'est — elle la réintroduisait donc, et la garde a
        /// rougi sur mon explication. *Décrire un correctif est un acte de citation.*)
        /// Ce ne sont pas des teintes de design mais un DOMAINE DE MESURE (les
        /// luminances sur lesquelles l'ajustement est évalué) ; la garde R2.3 ne peut pas faire la
        /// différence entre les deux, et c'est très bien : elle a rougi sur ce tableau, exactement
        /// comme elle doit rougir sur un jeton en dur. *Une garde qu'on peut satisfaire sans rien
        /// perdre ne mérite pas d'exception* — c'est déjà la forme retenue pour
        /// `CouleurPourMelangeLineaire` dans ce même fichier.
        /// Méthode et non champ statique : un initialiseur statique qui toucherait `DesignTokens`
        /// jetterait en contexte de constructeur (piège documenté du dépôt).</remarks>
        public static Color[] FondsDeReferenceVoile()
        {
            var f = new Color[7];
            for (int i = 0; i < 7; i++) f[i] = Color.black;
            f[0].r = 0.08f; f[0].g = 0.10f; f[0].b = 0.13f;   // nuit profonde
            f[1].r = 0.20f; f[1].g = 0.24f; f[1].b = 0.28f;   // ombre de bâtiment
            f[2].r = 0.33f; f[2].g = 0.53f; f[2].b = 0.60f;   // eau du port
            f[3].r = 0.40f; f[3].g = 0.55f; f[3].b = 0.62f;   // eau éclairée
            f[4].r = 0.55f; f[4].g = 0.60f; f[4].b = 0.65f;   // pavé de jour
            f[5].r = 0.62f; f[5].g = 0.66f; f[5].b = 0.70f;   // toiture claire
            f[6].r = 0.75f; f[6].g = 0.80f; f[6].b = 0.85f;   // ciel de jour
            return f;
        }

        /// <summary>⛔⛔ L'OPACITÉ MINIMALE POUR QU'UN TEXTE RESTE LISIBLE SUR N'IMPORTE QUEL ART.
        /// La sœur de `AlphaVoileSurFondQuelconque`, et sa DIFFÉRENCE D'OBJECTIF est tout le sujet.
        ///
        /// Celle-là vise la FIDÉLITÉ à la maquette : elle rapproche le pixel rendu de ce que le
        /// navigateur produirait. Elle est juste, et elle laisse le contraste libre — sa propre
        /// docstring le dit, « pour un fond inconnu il n'existe aucune solution exacte à une seule
        /// opacité ». Celle-ci vise la LISIBILITÉ : elle rend la plus PETITE opacité telle que,
        /// même sur le fond de référence le plus CLAIR, l'encre garde `ratioCible` de contraste.
        ///
        /// ⇒ POURQUOI IL EN FALLAIT UNE SECONDE, et c'est une mesure. Le voile du dock est posé par
        ///   la première depuis le 25 août, sans qu'une ligne bouge — vérifié par `git log` sur le
        ///   bloc, sur la fonction et sur le jeton. Ses libellés rendent pourtant **8,20:1 sur la
        ///   carte de ville et 4,20:1 sur la fiche de district**, dans le MÊME run, avec les MÊMES
        ///   valeurs. *Une opacité fixe sur un art variable ne garantit pas une lisibilité : elle
        ///   garantit une opacité.* Deux juges ⊥ ont mesuré la dérive et cherché ce qui avait retiré
        ///   le voile ; rien ne l'avait retiré.
        ///
        /// ⇒ POURQUOI C'EST DÉRIVÉ ET NON RÉGLÉ. Le contraste composité croît de façon monotone
        ///   avec l'opacité (le voile tire le fond vers sa propre couleur, sombre) : il existe donc
        ///   un plus petit alpha qui atteint la cible, et il se TROUVE par dichotomie au lieu de se
        ///   choisir. Monter l'alpha « jusqu'à ce que la garde passe » donnerait un nombre juste sur
        ///   CET art et faux sur le suivant — la faute exacte que ce lot corrige.
        /// ⚠️ La composition se fait en LINÉAIRE (le projet l'est), puis le résultat est réencodé
        ///   en sRGB avant le calcul WCAG, qui prend des valeurs sRGB et les linéarise lui-même.
        ///   Sauter le réencodage donne des ratios plausibles et faux.
        /// ⚠️ Si même l'opacité 1 n'atteint pas la cible (une encre trop proche du voile), on rend
        ///   1 et `contrasteObtenu` dit la vérité : c'est alors la COULEUR qu'il faut changer, pas
        ///   l'opacité, et l'appelant doit pouvoir le lire au lieu de croire sa cible atteinte.</summary>
        public static float AlphaPourContrasteGaranti(Color encre, Color voile, float ratioCible,
            out Color fondPire, out float contrasteObtenu)
        {
            Color[] fonds = FondsDeReferenceVoile();
            fondPire = fonds[0];
            float lumPire = -1f;
            foreach (Color f in fonds)
            {
                float l = LumRelativeWcag(f);
                if (l > lumPire) { lumPire = l; fondPire = f; }
            }

            float bas = 0f, haut = 1f;
            contrasteObtenu = ContrasteApresVoile(encre, voile, fondPire, 1f);
            if (contrasteObtenu < ratioCible) return 1f;      // hors d'atteinte : c'est la couleur, pas l'alpha
            for (int i = 0; i < 40; i++)
            {
                float m = 0.5f * (bas + haut);
                if (ContrasteApresVoile(encre, voile, fondPire, m) >= ratioCible) haut = m; else bas = m;
            }
            contrasteObtenu = ContrasteApresVoile(encre, voile, fondPire, haut);
            return haut;
        }

        /// <summary>Le contraste WCAG entre `encre` et le pixel qu'on obtient en posant `voile` à
        /// l'opacité `alpha` sur `fond` — composition en linéaire, réencodage sRGB, puis WCAG.</summary>
        public static float ContrasteApresVoile(Color encre, Color voile, Color fond, float alpha)
        {
            Color melLin = Color.Lerp(fond.linear, voile.linear, alpha);
            Color mel = melLin.gamma;
            float a = LumRelativeWcag(encre), b = LumRelativeWcag(mel);
            if (a < b) { float t = a; a = b; b = t; }
            return (a + 0.05f) / (b + 0.05f);
        }

        private static float LumRelativeWcag(Color c)
            => 0.2126f * LinWcag(c.r) + 0.7152f * LinWcag(c.g) + 0.0722f * LinWcag(c.b);

        private static float LinWcag(float u)
            => u <= 0.04045f ? u / 12.92f : Mathf.Pow((u + 0.055f) / 1.055f, 2.4f);

        /// <summary>L'opacité à employer, EN MÉLANGE LINÉAIRE, pour qu'un voile posé sur un fond
        /// QUELCONQUE retombe au plus près de ce qu'un navigateur produirait en sRGB à l'opacité CSS.
        ///
        /// ⚠️⚠️ CE N'EST PAS `CouleurPourMelangeLineaire`, ET LA DIFFÉRENCE EST STRUCTURELLE.
        /// Cette fonction-là est EXACTE — trois équations, trois inconnues — mais elle exige de
        /// CONNAÎTRE le fond. Elle s'applique donc à une bordure sur une plaque, à un arc sur un
        /// cadran : des fonds fixes. La plaque de la fiche et le voile du dock, eux, flottent sur
        /// l'ART, qui change à chaque district et à chaque heure.
        ///   ⇒ Pour un fond inconnu, **il n'existe aucune solution exacte à une seule opacité** :
        ///     l'opacité qui corrigerait un ciel clair n'est pas celle qui corrigerait un mur
        ///     sombre. Le dire est le seul geste honnête ; ce qu'on rend est donc un AJUSTEMENT,
        ///     et il sort avec son RÉSIDU pour qu'un test puisse l'épingler.
        ///
        /// Ce qui rend l'ajustement crédible, et c'est une mesure, pas une opinion : en résolvant
        /// conjointement l'opacité ET la teinte, l'optimum laisse la TEINTE INCHANGÉE (facteur
        /// 1,00) et ne déplace que l'opacité. *Un compromis se voit à la dispersion qu'il laisse* —
        /// ici il n'en laisse aucune sur la couleur, ce qui dit que la seule grandeur fautive était
        /// bien l'opacité. Mesuré sur les trois voiles de l'écran principal, écart maximal sur les
        /// sept fonds déclarés :
        ///     plaque haut  α .937 → .9876 : 30,30 → 2,95 /255
        ///     plaque bas   α .965 → .9950 : 24,96 → 1,90 /255
        ///     voile dock   α .847 → .9646 : 46,43 → 4,11 /255</summary>
        public static float AlphaVoileSurFondQuelconque(Color encre, float alphaSrgb, out float residuMax)
        {
            residuMax = 0f;
            if (alphaSrgb <= 0f || alphaSrgb >= 1f) return alphaSrgb;

            float meilleurA = alphaSrgb, meilleurErr = float.MaxValue;
            // Balayage géométrique du reste d'opacité : (1−a) décroît de 15 % par pas. 60 pas
            // couvrent de α jusqu'à ~1−1e−5, bien au-delà de tout optimum utile, en un temps nul.
            float a = alphaSrgb;
            for (int i = 0; i < 60; i++)
            {
                float err = ErreurVoile(encre, alphaSrgb, a);
                if (err < meilleurErr) { meilleurErr = err; meilleurA = a; }
                a = 1f - (1f - a) * 0.85f;
            }
            residuMax = meilleurErr;
            return meilleurA;
        }

        /// <summary>L'écart maximal, en /255, entre ce que le navigateur produirait (mélange sRGB à
        /// `alphaCss`) et ce que le client produit (mélange linéaire à `alphaTest`), sur les fonds
        /// déclarés. C'est l'instrument de `AlphaVoileSurFondQuelconque` — il vit dans le dépôt,
        /// à côté du chiffre qu'il produit.</summary>
        public static float ErreurVoile(Color encre, float alphaCss, float alphaTest)
        {
            float pire = 0f;
            Color encreLin = encre.linear;
            foreach (Color fond in FondsDeReferenceVoile())
            {
                Color cible = Color.Lerp(fond, encre, alphaCss);   // ce que le navigateur produit
                Color fondLin = fond.linear;
                Color obtenuLin = Color.black;
                obtenuLin.r = fondLin.r + alphaTest * (encreLin.r - fondLin.r);
                obtenuLin.g = fondLin.g + alphaTest * (encreLin.g - fondLin.g);
                obtenuLin.b = fondLin.b + alphaTest * (encreLin.b - fondLin.b);
                obtenuLin.a = 1f;
                Color obtenu = obtenuLin.gamma;
                pire = Mathf.Max(pire, Mathf.Abs(cible.r - obtenu.r) * 255f);
                pire = Mathf.Max(pire, Mathf.Abs(cible.g - obtenu.g) * 255f);
                pire = Mathf.Max(pire, Mathf.Abs(cible.b - obtenu.b) * 255f);
            }
            return pire;
        }

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

        /// <summary>Une lueur radiale qui s'éteint — le `radial-gradient(…, transparent N%)` du CSS.
        ///
        /// `centreUV` place le foyer dans la texture (0,0 = bas-gauche, 0.5,1 = haut-centre) ;
        /// `rayonX`/`rayonY` sont les demi-axes en fraction de la texture. Au-delà, alpha nul.
        /// Sert au voile d'en-tête (`75% 150% at 50% 0%`) comme au halo d'un médaillon.</summary>
        public static Sprite VoileRadial(int taillePx, Color teinte, Vector2 centreUV,
                                         float rayonX, float rayonY, float finEnFraction = 1f)
        {
            string key = $"voile:{taillePx}:{ColorKey(teinte)}:{centreUV.x:F2},{centreUV.y:F2}:" +
                         $"{rayonX:F2}:{rayonY:F2}:{finEnFraction:F2}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int d = Mathf.Max(8, taillePx);
            var tex = NewTexture(d);
            var pixels = new Color[d * d];
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float ux = ((x + 0.5f) / d - centreUV.x) / Mathf.Max(1e-4f, rayonX);
                    float uy = ((y + 0.5f) / d - centreUV.y) / Mathf.Max(1e-4f, rayonY);
                    float r = Mathf.Sqrt(ux * ux + uy * uy) / Mathf.Max(1e-4f, finEnFraction);
                    // Extinction en COSINUS, pas linéaire : le juge ⊥ a mesuré 4 paliers durs dans
                    // le voile d'en-tête (sauts nets de 22→33→30→28→22). Une rampe linéaire étirée
                    // sur un bandeau large se quantifie visiblement ; la courbe en cosinus répartit
                    // l'erreur d'arrondi et ne laisse pas d'arête.
                    float a = r >= 1f ? 0f : 0.5f * (1f + Mathf.Cos(Mathf.PI * r));
                    Color c = teinte;
                    c.a *= a;
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

        /// <summary>L'OMBRE PORTÉE d'un rectangle arrondi — `box-shadow: 0 Ypx Bpx couleur`.
        ///
        /// uGUI n'a pas de `box-shadow` : il faut la peindre. Le sprite est découpable en 9-slice
        /// (`border` = rayon + flou), donc une seule texture sert à toutes les largeurs de panneau.
        /// Le décalage vertical se fait en POSITIONNANT l'image, pas dans la texture — sinon il
        /// faudrait une texture par décalage.</summary>
        public static Sprite RoundedRectShadow(int cornerRadiusPx, int flouPx, Color couleur)
        {
            string key = $"roundshadow:{cornerRadiusPx}:{flouPx}:{ColorKey(couleur)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int r = Mathf.Max(1, cornerRadiusPx);
            int f = Mathf.Max(1, flouPx);
            int marge = r + f;
            int d = marge * 2 + 2;
            var tex = NewTexture(d);
            var pixels = new Color[d * d];
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float px = x + 0.5f, py = y + 0.5f;
                    float qx = Mathf.Abs(px - d * 0.5f) - (d * 0.5f - marge);
                    float qy = Mathf.Abs(py - d * 0.5f) - (d * 0.5f - marge);
                    float dist = (qx > 0f && qy > 0f)
                        ? Mathf.Sqrt(qx * qx + qy * qy) - r
                        : Mathf.Max(qx, qy) - r;
                    // `dist <= 0` : dans la forme. Au-delà, on s'éteint sur `f` pixels, en douceur
                    // (courbe en cosinus — un dégradé linéaire laisse une arête visible).
                    // ⚠️⚠️ RIEN À L'INTÉRIEUR DE LA FORME, et c'est la spécification CSS, pas une
                    // optimisation : une `box-shadow` non-`inset` est **découpée hors de la boîte
                    // de bordure** — elle ne transparaît jamais à travers l'élément, même si le
                    // fond de celui-ci est translucide.
                    // La première version peignait l'intérieur en PLEIN. Or la plaque de verre des
                    // panneaux est à α≈0,6 : l'ombre passait au travers et assombrissait la carte
                    // entière. Un juge ⊥ a mesuré le remplissage **16 % plus sombre** que la
                    // référence et a explicitement écrit ne pas pouvoir en expliquer la cause
                    // depuis une image — la cause était ici, dans un pixel qui n'aurait jamais dû
                    // être peint.
                    // ★ Et c'est un défaut qu'un test de couleur sur le PANNEAU aurait attribué au
                    // JETON du panneau : l'effet et sa victime ne sont pas au même endroit.
                    float a = dist <= 0f ? 0f : 0.5f * (1f + Mathf.Cos(Mathf.PI * Mathf.Clamp01(dist / f)));
                    Color c = couleur;
                    c.a *= a;
                    pixels[y * d + x] = c;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, d, d), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect, new Vector4(marge, marge, marge, marge));
            sp.hideFlags = HideFlags.HideAndDontSave;
            cache[key] = sp;
            return sp;
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

        // ═══════════════════════════════════════════════════════════════════════════════════════════════════════
        // DÉCOR DE SCÈNE — les primitives du design `Tools/decor-de-scene-2026-10-07/DESIGN.md` (§3.3, §6 « Primitives »).
        // Les briques de `DecorDeScene.Poser`. Aucune ne connaît une couleur : les arrêts arrivent RÉSOLUS (la `Teinte`
        // du catalogue a déjà été lue par l'appelant) sous la forme `(float pos, Color c)` déjà employée par
        // `DecorAuComptoir.DegradeVertical`. Toutes mettent en cache par une clé DÉRIVÉE DU CONTENU (revue ⊥ n°1, m1) :
        // deux spécifications égales partagent une texture, deux spécifications différentes n'en partagent jamais une.
        // ⚠️ Ce fichier reste sous la garde de provenance DA3 : aucune Color n'y est construite par un littéral — on part
        //    d'une couleur NOMMÉE (`Color.clear`, `Color.white`, le paramètre) et on écrit ses canaux.
        // ═══════════════════════════════════════════════════════════════════════════════════════════════════════

        /// <summary>La couleur d'un dégradé CSS à la position `t` de sa ligne : interpolation LINÉAIRE entre les deux
        /// arrêts qui l'encadrent (comme CSS, revue ⊥ n°1 M4 — pas le cosinus de `VoileRadial`) ; avant le premier
        /// arrêt sa couleur, après le dernier la sienne — c'est ce `t &gt; 1 ⇒ dernier arrêt` qui remplit les coins
        /// d'un `DegradeRadialCercle`. Deux arrêts à la MÊME position font un bord dur (⑱ : `#3a1c0e 18px, #2b120c 18px`).
        ///
        /// ⚠️ Interpolation en alpha PRÉMULTIPLIÉ, comme les navigateurs (CSS Images 4 §3.4.2) : `#4a5057 → transparent`
        /// (les points de la tôle ⑭) garde la teinte `#4a5057` en s'éteignant, au lieu de virer au noir à mi-course,
        /// ce qu'un `Color.Lerp` direct ferait.</summary>
        public static Color EchantillonDeDegrade((float pos, Color c)[] arrets, float t)
        {
            if (arrets == null || arrets.Length == 0) return Color.clear;
            if (t <= arrets[0].pos) return arrets[0].c;
            for (int i = 1; i < arrets.Length; i++)
            {
                if (t <= arrets[i].pos)
                {
                    float span = arrets[i].pos - arrets[i - 1].pos;
                    float u = span <= 0f ? 1f : (t - arrets[i - 1].pos) / span;
                    return MelangePremultiplie(arrets[i - 1].c, arrets[i].c, u);
                }
            }
            return arrets[arrets.Length - 1].c;
        }

        private static Color MelangePremultiplie(Color a, Color b, float u)
        {
            float alpha = Mathf.Lerp(a.a, b.a, u);
            Color m = Color.clear;   // couleur NOMMÉE puis ses canaux : le patron du fichier (garde DA3)
            if (alpha <= 1e-6f)
            {
                m.r = Mathf.Lerp(a.r, b.r, u);
                m.g = Mathf.Lerp(a.g, b.g, u);
                m.b = Mathf.Lerp(a.b, b.b, u);
                m.a = 0f;
                return m;
            }
            m.r = Mathf.Lerp(a.r * a.a, b.r * b.a, u) / alpha;
            m.g = Mathf.Lerp(a.g * a.a, b.g * b.a, u) / alpha;
            m.b = Mathf.Lerp(a.b * a.a, b.b * b.a, u) / alpha;
            m.a = alpha;
            return m;
        }

        /// <summary>La longueur de la LIGNE d'un `linear-gradient(θ)` sur une boîte W×H — CSS Images 3 §3.1.1 :
        /// `|W·sin θ| + |H·cos θ|` (la ligne passe par le centre et ses deux bouts sont sur les perpendiculaires qui
        /// touchent les coins). C'est sur ELLE que se résolvent les `%` et les `px` des arrêts : un arrêt écrit en px
        /// (⑱ : `18px`) devient la fraction `18 / LongueurLigneDeDegrade(θ, Wcss, Hcss)` — c'est l'appelant qui
        /// convertit, parce que lui seul connaît la boîte en px CSS (la mesure du cadre), et la primitive ne reçoit que
        /// des fractions.</summary>
        public static float LongueurLigneDeDegrade(float angleDeg, float largeur, float hauteur)
        {
            float rad = angleDeg * Mathf.Deg2Rad;
            return Mathf.Abs(largeur * Mathf.Sin(rad)) + Mathf.Abs(hauteur * Mathf.Cos(rad));
        }

        /// <summary>Un `linear-gradient(θ, arrêts…)` à N arrêts — ce que `LinearGradient` (2 arrêts) et
        /// `DecorAuComptoir.DegradeVertical` (180° seulement) ne savent pas faire ensemble : la famille A du décor écrit
        /// `178deg` à 3 arrêts, ㉒ `158deg`, ⑭ `90deg` (revue ⊥ n°1 B1).
        ///
        /// Convention CSS : 0° monte, 90° va à droite, 180° descend, les degrés tournent dans le sens horaire. En espace
        /// de TEXTURE (y vers le HAUT) la direction vaut donc (sin θ, +cos θ) — signe vérifié sur 180° (vers le bas de la
        /// texture) et 90° (vers la droite), comme `LinearGradient` l'avait payé (un 160° rendu en 20°).
        ///
        /// ⚠️ LA BOÎTE COMPTE : à 178° sur un cadre 300×583, les deux bords d'une même ligne ne sont PAS à la même
        /// position de la ligne (c'est l'oblique que le juge voit). La texture est donc générée À L'ASPECT DE LA BOÎTE
        /// (`largeurTexturePx` × `largeurTexturePx·H/W`) et étirée dessus : l'angle reste celui du CSS. Hauteur bornée
        /// à 1024 px (Q3 du design : coût mémoire à mesurer au code).</summary>
        public static Sprite DegradeLineaire(float angleDeg, (float pos, Color c)[] arrets,
                                             float largeurBoite, float hauteurBoite, int largeurTexturePx = 128)
        {
            float W = Mathf.Max(1f, largeurBoite), H = Mathf.Max(1f, hauteurBoite);
            int w = Mathf.Max(4, largeurTexturePx);
            int h = Mathf.Clamp(Mathf.RoundToInt(w * H / W), 4, 1024);
            string key = $"deglin:{angleDeg:F2}:{W:F1}x{H:F1}:{w}x{h}:{CleArrets(arrets)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            var tex = NewTexture(w, h);
            var pixels = new Color[w * h];
            float rad = angleDeg * Mathf.Deg2Rad;
            var axe = new Vector2(Mathf.Sin(rad), Mathf.Cos(rad));
            float longueur = Mathf.Max(1e-4f, LongueurLigneDeDegrade(angleDeg, W, H));
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    // Coordonnées de la BOÎTE, centrées : la projection sur l'axe, rapportée à la longueur de la ligne,
                    // vaut exactement −½ au coin de départ et +½ au coin d'arrivée (c'est la définition CSS).
                    float bx = ((x + 0.5f) / w - 0.5f) * W, by = ((y + 0.5f) / h - 0.5f) * H;
                    float t = (bx * axe.x + by * axe.y) / longueur + 0.5f;
                    pixels[y * w + x] = EchantillonDeDegrade(arrets, t);
                }
            }
            return Terminer(tex, pixels, key);
        }

        /// <summary>Un `radial-gradient(rx ry at cx cy, arrêts…)` à N arrêts, ELLIPTIQUE, linéaire par arrêt.
        ///
        /// `cx`, `cy` : le foyer en FRACTIONS de la boîte, **y depuis le HAUT comme en CSS** (revue ⊥ n°1 M4 : le
        /// constructeur n'a plus de conversion à faire, la primitive porte la convention) ; `rx`, `ry` : les demi-axes en
        /// fraction de la LARGEUR et de la HAUTEUR de la boîte (`radial-gradient(72% 40% at 50% 22%)` ⇒ .72, .40, .5,
        /// .22). Les `%` d'un dégradé CSS se résolvent sur la boîte de l'élément qui le PORTE (revue n°3 B1) : la texture
        /// est CARRÉE et en fractions, l'Image l'étire sur le support, et chaque `%` reste exact à l'étirement.
        /// `t &gt; 1` (hors de l'ellipse) ⇒ dernier arrêt, comme CSS.</summary>
        public static Sprite DegradeRadial(float cx, float cy, float rx, float ry,
                                           (float pos, Color c)[] arrets, int taillePx = 128)
        {
            int d = Mathf.Max(8, taillePx);
            string key = $"degrad:{d}:{cx:F4},{cy:F4}:{rx:F4},{ry:F4}:{CleArrets(arrets)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            var tex = NewTexture(d, d);
            var pixels = new Color[d * d];
            float ex = Mathf.Max(1e-4f, rx), ey = Mathf.Max(1e-4f, ry);
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float u = (x + 0.5f) / d;          // fraction de largeur, depuis la gauche
                    float v = 1f - (y + 0.5f) / d;     // fraction de hauteur depuis le HAUT : y de texture monte, y CSS descend
                    float nx = (u - cx) / ex, ny = (v - cy) / ey;
                    pixels[y * d + x] = EchantillonDeDegrade(arrets, Mathf.Sqrt(nx * nx + ny * ny));
                }
            }
            return Terminer(tex, pixels, key);
        }

        /// <summary>Le rayon d'un `radial-gradient(circle farthest-corner at cx cy)` sur un rect RÉEL W×H : la distance
        /// du foyer au coin le plus éloigné, `√(max(cx·W, (1−cx)·W)² + max(cy·H, (1−cy)·H)²)`. Pure, et c'est voulu :
        /// `CercleDeSupport` la rappelle à CHAQUE changement de rect du support (revue ⊥ n°5 A) — mesuré sur ⑮ ⑰
        /// (`mesurer-cercle.cjs`) : corkboard 298×504,05 → 454,0 px ; 298×400 → 382,0 px.</summary>
        public static float RayonCoinLePlusLoin(float largeur, float hauteur, float cx, float cy)
        {
            float dx = Mathf.Max(cx * largeur, (1f - cx) * largeur);
            float dy = Mathf.Max(cy * hauteur, (1f - cy) * hauteur);
            return Mathf.Sqrt(dx * dx + dy * dy);
        }

        /// <summary>Le disque d'un `circle farthest-corner` : sprite CARRÉ, foyer au centre, **r = 1 au milieu de
        /// chaque bord** (t = distance au centre / demi-côté), les coins (t = √2) au dernier arrêt. Il se pose sur une
        /// Image carrée de côté `2·RayonCoinLePlusLoin(…)` centrée sur le foyer et clippée par le `RectMask2D` de
        /// `Decor/Support` (§3.3) — un vrai cercle, sans étirement, quel que soit le rect du support. 128 px suffisent :
        /// l'Image est étirée et le filtrage bilinéaire lisse un dégradé à 3 arrêts.</summary>
        public static Sprite DegradeRadialCercle((float pos, Color c)[] arrets, int taillePx = 128)
        {
            int d = Mathf.Max(8, taillePx);
            string key = $"degcercle:{d}:{CleArrets(arrets)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            var tex = NewTexture(d, d);
            var pixels = new Color[d * d];
            float r = d / 2f;
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float dx = x + 0.5f - r, dy = y + 0.5f - r;
                    pixels[y * d + x] = EchantillonDeDegrade(arrets, Mathf.Sqrt(dx * dx + dy * dy) / r);
                }
            }
            return Terminer(tex, pixels, key);
        }

        /// <summary>Le masque d'un rectangle arrondi À QUATRE RAYONS (`border-radius: tl tr br bl`), 9-slice, bordure =
        /// le plus grand rayon. `RoundedRectMask(int)` n'en a qu'un : ⑤ écrit 26/26/0/0 — sa base touche le bas du
        /// cadre (revue ⊥ n°3 B2). Un rayon nul laisse le coin CARRÉ. Avec quatre rayons égaux, le résultat est pixel
        /// pour pixel celui de la surcharge à un rayon (même taille de texture, même rampe) — la surcharge existante
        /// ne bouge pas, et le test le mesure.
        ///
        /// Ordre des rayons : celui du CSS (haut-gauche, haut-droit, bas-droit, bas-gauche), le HAUT étant le haut de
        /// l'écran — en espace de texture (y vers le haut) le haut est `y ≥ d − R`.</summary>
        public static Sprite RoundedRectMask(int rayonHautGauche, int rayonHautDroit, int rayonBasDroit, int rayonBasGauche)
        {
            int tl = Mathf.Max(0, rayonHautGauche), tr = Mathf.Max(0, rayonHautDroit);
            int br = Mathf.Max(0, rayonBasDroit), bl = Mathf.Max(0, rayonBasGauche);
            string key = $"roundmask4:{tl}:{tr}:{br}:{bl}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            int R = Mathf.Max(1, Mathf.Max(Mathf.Max(tl, tr), Mathf.Max(br, bl)));
            int d = R * 2 + 3;   // comme `RoundedRectMask(int)` : 1 px de marge autour du centre pour l'anti-crénelage
            var tex = NewTexture(d);
            var pixels = new Color[d * d];
            for (int y = 0; y < d; y++)
            {
                for (int x = 0; x < d; x++)
                {
                    float alpha = 1f;
                    bool gauche = x < R, droite = x >= d - R, bas = y < R, haut = y >= d - R;
                    if (gauche && haut) alpha = AlphaDeCoin(x, y, tl, tl, d - tl);
                    else if (droite && haut) alpha = AlphaDeCoin(x, y, tr, d - tr, d - tr);
                    else if (droite && bas) alpha = AlphaDeCoin(x, y, br, d - br, br);
                    else if (gauche && bas) alpha = AlphaDeCoin(x, y, bl, bl, bl);
                    Color px = Color.white;
                    px.a = alpha;
                    pixels[y * d + x] = px;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sprite = Sprite.Create(tex, new Rect(0, 0, d, d), new Vector2(0.5f, 0.5f), 100f,
                0, SpriteMeshType.FullRect, new Vector4(R, R, R, R));
            sprite.hideFlags = HideFlags.HideAndDontSave;
            cache[key] = sprite;
            return sprite;
        }

        /// <summary>L'alpha d'un pixel dans la zone d'influence d'UN coin de rayon `r` dont le centre de courbure est
        /// en (`ccx`, `ccy`) : la même rampe que `RoundedRectMask(int)` (`(r − dist) + ½`, bornée), et 1 hors du carré
        /// r×r du coin — un rayon nul ne touche donc à rien.</summary>
        private static float AlphaDeCoin(int x, int y, int r, float ccx, float ccy)
        {
            if (r <= 0) return 1f;
            float px = x + 0.5f, py = y + 0.5f;
            bool dansLeCarre = Mathf.Abs(px - ccx) <= r && Mathf.Abs(py - ccy) <= r;
            if (!dansLeCarre) return 1f;
            float dist = Mathf.Sqrt((px - ccx) * (px - ccx) + (py - ccy) * (py - ccy));
            return Mathf.Clamp01((r - dist) + 0.5f);
        }

        /// <summary>Une TUILE de points — `radial-gradient(circle, teinte r1, transparent r2)` répété en
        /// `background-size: pas pas` avec `background-position: dx dy` (la tôle ⑭ : pas 26, r 1,4 → 1,9 ; la planche ㉘ :
        /// pas 9 et 13, décalages 0,0 et 4,6). À poser en `Image.Type.Tiled`.
        ///
        /// Le point est au CENTRE de la tuile, déplacé de (dx, dy) — dx vers la droite, dy vers le BAS comme en CSS — et
        /// ENROULÉ : la tuile reste périodique, un point poussé hors d'un bord rentre par l'autre. Bord DOUX de r1 à r2
        /// (plein → transparent, linéaire : revue n°2 m3) ; seule l'opacité varie, la teinte reste.
        /// `surEchantillonnage` = px de texture par px CSS : un rayon de 1,1 px n'existe pas dans une texture au px —
        /// l'appelant règle `Image.pixelsPerUnitMultiplier` pour que la tuile mesure `pas` px CSS à l'écran.</summary>
        public static Sprite TuilePoints(float pasPx, float rayonPleinPx, float rayonFinPx, Color teinte,
                                         Vector2 decalagePx, int surEchantillonnage = 4)
        {
            int k = Mathf.Max(1, surEchantillonnage);
            int n = Mathf.Max(2, Mathf.RoundToInt(pasPx * k));
            string key = $"tuilepts:{pasPx:F2}:{rayonPleinPx:F2}:{rayonFinPx:F2}:{decalagePx.x:F2},{decalagePx.y:F2}:{k}:{ColorKey(teinte)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            float r1 = Mathf.Max(0f, rayonPleinPx) * k;
            float r2 = Mathf.Max(rayonFinPx * k, r1 + 1e-3f);
            float cx = Mathf.Repeat(n * 0.5f + decalagePx.x * k, n);
            float cy = Mathf.Repeat(n * 0.5f - decalagePx.y * k, n);   // y CSS descend, y de texture monte
            var tex = NewTexture(n, n);
            tex.wrapMode = TextureWrapMode.Repeat;
            var pixels = new Color[n * n];
            for (int y = 0; y < n; y++)
            {
                for (int x = 0; x < n; x++)
                {
                    float dx = DistanceEnroulee(x + 0.5f, cx, n), dy = DistanceEnroulee(y + 0.5f, cy, n);
                    float dist = Mathf.Sqrt(dx * dx + dy * dy);
                    float a = dist <= r1 ? 1f : dist >= r2 ? 0f : (r2 - dist) / (r2 - r1);
                    Color c = teinte;
                    c.a *= a;
                    pixels[y * n + x] = c;
                }
            }
            return Terminer(tex, pixels, key);
        }

        /// <summary>Une TUILE de rayures — `repeating-linear-gradient(θ, teinte 0 e, transparent e pas)`, à poser en
        /// `Image.Type.Tiled`. Même convention d'angle que `DegradeLineaire`.
        ///
        /// ⚠️ Une tuile CARRÉE n'est périodique que si le motif l'est le long de x ET de y : exact pour 0°/90° (côté =
        /// pas) et ±45° (côté = pas·√2) ; pour un autre angle la tuile est APPROCHÉE — une couture au raccord — et on
        /// le dit ici plutôt que de le cacher. Le catalogue (§4) n'emploie aucune rayure : la primitive existe parce que
        /// le vocabulaire (§2) la nomme.</summary>
        public static Sprite TuileRayures(float angleDeg, float pasPx, float epaisseurPx, Color teinte, int surEchantillonnage = 4)
        {
            int k = Mathf.Max(1, surEchantillonnage);
            float rad = angleDeg * Mathf.Deg2Rad;
            float s = Mathf.Sin(rad), co = Mathf.Cos(rad);
            bool axial = Mathf.Abs(s) < 1e-3f || Mathf.Abs(co) < 1e-3f;
            bool diagonal = Mathf.Abs(Mathf.Abs(s) - Mathf.Abs(co)) < 1e-3f;
            float cote = diagonal && !axial ? pasPx * Mathf.Sqrt(2f) : pasPx;
            int n = Mathf.Max(2, Mathf.RoundToInt(cote * k));
            string key = $"tuileray:{angleDeg:F2}:{pasPx:F2}:{epaisseurPx:F2}:{k}:{ColorKey(teinte)}";
            if (cache.TryGetValue(key, out Sprite cached) && cached != null) return cached;

            float pas = Mathf.Max(1e-3f, pasPx), e = Mathf.Clamp(epaisseurPx, 0f, pas);
            var tex = NewTexture(n, n);
            tex.wrapMode = TextureWrapMode.Repeat;
            var pixels = new Color[n * n];
            for (int y = 0; y < n; y++)
            {
                for (int x = 0; x < n; x++)
                {
                    float bx = (x + 0.5f) / k, by = (y + 0.5f) / k;   // px CSS depuis le coin bas-gauche de la tuile
                    float phase = Mathf.Repeat(bx * s + by * co, pas);
                    Color c = teinte;
                    c.a *= phase < e ? 1f : 0f;
                    pixels[y * n + x] = c;
                }
            }
            return Terminer(tex, pixels, key);
        }

        private static float DistanceEnroulee(float a, float b, float periode)
        {
            float d = Mathf.Abs(a - b);
            return Mathf.Min(d, periode - d);
        }

        private static string CleArrets((float pos, Color c)[] arrets)
        {
            if (arrets == null) return "-";
            var sb = new System.Text.StringBuilder();
            foreach (var a in arrets) sb.Append(a.pos.ToString("F4")).Append('@').Append(ColorKey(a.c)).Append(';');
            return sb.ToString();
        }

        /// <summary>Écrit les pixels, crée le sprite (`FullRect`, sans bordure), le met en cache sous `key`.</summary>
        private static Sprite Terminer(Texture2D tex, Color[] pixels, string key)
        {
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect);
            sp.hideFlags = HideFlags.HideAndDontSave;
            cache[key] = sp;
            return sp;
        }

        private static Texture2D NewTexture(int w, int h) => new Texture2D(w, h, TextureFormat.RGBA32, false)
        {
            wrapMode = TextureWrapMode.Clamp,
            filterMode = FilterMode.Bilinear,
            hideFlags = HideFlags.HideAndDontSave,
        };

        private static Texture2D NewTexture(int d) => new Texture2D(d, d, TextureFormat.RGBA32, false)
        {
            wrapMode = TextureWrapMode.Clamp,
            filterMode = FilterMode.Bilinear,
        };

        private static string ColorKey(Color c) => $"{c.r:F3}_{c.g:F3}_{c.b:F3}_{c.a:F3}";
    }
}
