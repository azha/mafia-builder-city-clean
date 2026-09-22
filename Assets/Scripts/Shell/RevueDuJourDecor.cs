using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Shell
{
    // ⑯-7 — LE DÉCOR DU VERGE D'OR : la scène, le dégradé, le zinc (B01 + B02 de l'écart 06cc21d6).
    //
    // ⛔ Le juge ⊥ r1 (2026-09-06) : F1 BLOQUANT, « le décor du Verge d'Or n'est pas rendu », 92,3 % de
    //    la zone libre en noir pur. Sans ce décor, « jugé » est inatteignable pour ⑯.
    //
    // LA SCÈNE (B01) — l'atelier l'a retrouvée par les PIXELS, pas par le nom
    // (`Tools/atelier-2026-09-22/08-revue-du-jour-phrases-et-decor.md`, `b95dd8c7` sur `da/2026-09-22`) :
    // le fond de v4-0 est la boîte (300, 60)–(1500, 1080) de `VERGE3_JOUR_FINAL.png` (atelier `e826c53`,
    // 1728×1080, sha256 e918a575…), réduite à ×0,75 et ré-encodée en JPEG dans la maquette. Écart RVB
    // 2,12/255, voisins décalés de 4 px pires, contrôle négatif (la nuit) à 37,51.
    // ⇒ Le fichier est monté TEL QUEL (même sha256), sous le nom canonique `sprite_environment_*`, et la
    //   boîte est découpée par UV : le fichier monté reste l'original de l'atelier.
    // CSS : `.scene{inset:0; background-size:cover}` · `.scene.verge-jour{background-position:center 22%}`.
    //
    // LE DÉGRADÉ — `.degrade.jour` : 5 arrêts de #0a0f18 à opacités b8·30·40·e8·ff (0, 16, 44, 60, 74 %).
    //
    // LE ZINC (B02) — ce n'est PAS de l'art, c'est la forme CSS (`ecrans-brennar-4.html:203-212`) :
    //   `.zinc`            bas de l'écran, hauteur 64 % (`.revue`, billets) · 66 % (`.haut`, v4-1)
    //   `.zinc .dos`       l'étagère, 11 % (revue) · 15 % (haut) du zinc, #2a1c10→#1a1109, opacité .9,
    //                      filet haut 1px #6b4a1266, 7 bouteilles 9 px (26 px, les impaires 32 px)
    //   `.zinc .plateau`   22 px sous l'étagère, #a8823a→#6b4a12 55 %→#3a2a12, filet haut 2px #d9ab4e88,
    //                      débord de 6 px de chaque côté
    //   `.zinc::after`     sous le plateau (+20 px), #13100b→#0a0f18 60 %
    // Non repris : `perspective(200px) rotateX(8deg)` du plateau et les ombres portées.
    //
    // ⚠️ Toute opacité CSS est une opacité de NAVIGATEUR (sRGB) ; ce projet mélange en LINÉAIRE. Le
    //    dégradé et le zinc flottent sur la scène, donc sur un fond INCONNU : leurs opacités passent par
    //    l'ajustement déclaré de ① (`ProceduralUI.AlphaVoileSurFondQuelconque`), jamais recopiées.
    public class RevueDuJourDecor : MonoBehaviour
    {
        /// <summary>Chemin `Resources` — le consommateur que le montage exige (M2 de la mémoire
        /// « art orphelin ») : `Assets/Art/Scenes/Resources/Scenes/sprite_environment_verge_d_or_jour.png`.</summary>
        public const string CheminScene = "Scenes/sprite_environment_verge_d_or_jour";

        public const float SourceLargeur = 1728f;
        public const float SourceHauteur = 1080f;
        /// <summary>La boîte de v4-0 dans la source, en pixels IMAGE (origine en haut à gauche).</summary>
        public static readonly Rect BoiteSource = new Rect(300f, 60f, 1200f, 1020f);
        /// <summary>`background-position: center 22%`.</summary>
        public const float PositionVerticale = 0.22f;

        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        public RawImage Scene { get; private set; }
        public RectTransform Zinc { get; private set; }
        public bool Vide { get; private set; }
        private RectTransform dos, plateau, bas;

        /// <summary>Pose le décor SOUS tout le contenu de l'écran : premier enfant, hors mise en page.</summary>
        public static RevueDuJourDecor Construire(Transform ecran)
        {
            GameObject racine = new GameObject("Decor", typeof(RectTransform));
            racine.transform.SetParent(ecran, false);
            racine.AddComponent<LayoutElement>().ignoreLayout = true;
            Etirer((RectTransform)racine.transform);
            racine.transform.SetAsFirstSibling();
            var decor = racine.AddComponent<RevueDuJourDecor>();
            decor.Batir();
            return decor;
        }

        private void Batir()
        {
            // ── la scène ─────────────────────────────────────────────────────────────────────────
            GameObject sceneGo = Enfant("Scene", transform);
            Etirer((RectTransform)sceneGo.transform);
            Scene = sceneGo.AddComponent<RawImage>();
            Scene.raycastTarget = false;
            Sprite sp = Resources.Load<Sprite>(CheminScene);
            Scene.texture = sp != null ? sp.texture : null;
            // Sans texture, la scène reste NOIRE plutôt que blanche : un RawImage vide rend du blanc,
            // ce qui ressemblerait à un fond voulu. Le noir, lui, dit « rien n'est monté ».
            Scene.color = Scene.texture != null ? Color.white : Color.black;

            // ── le dégradé sur la scène ──────────────────────────────────────────────────────────
            GameObject degrade = Enfant("Degrade", transform);
            Etirer((RectTransform)degrade.transform);
            Image deg = degrade.AddComponent<Image>();
            deg.raycastTarget = false;
            deg.sprite = DegradeVertical("degrade.jour", new[]
            {
                (0.00f, Voile("#0a0f18", 0xb8)),
                (0.16f, Voile("#0a0f18", 0x30)),
                (0.44f, Voile("#0a0f18", 0x40)),
                (0.60f, Voile("#0a0f18", 0xe8)),
                (0.74f, Voile("#0a0f18", 0xff)),
                (1.00f, Voile("#0a0f18", 0xff)),
            });

            // ── le zinc ──────────────────────────────────────────────────────────────────────────
            GameObject zincGo = Enfant("Zinc", transform);
            Zinc = (RectTransform)zincGo.transform;
            Zinc.anchorMin = Vector2.zero;
            Zinc.anchorMax = new Vector2(1f, 0.64f);
            Zinc.offsetMin = Vector2.zero;
            Zinc.offsetMax = Vector2.zero;

            // le bas sombre d'abord : il est DESSOUS le plateau (`::after` sous un frère positionné)
            GameObject basGo = Enfant("Bas", zincGo.transform);
            bas = (RectTransform)basGo.transform;
            Image basImg = basGo.AddComponent<Image>();
            basImg.raycastTarget = false;
            basImg.sprite = DegradeVertical("zinc.bas", new[]
            {
                (0.00f, Hex("#13100b")),
                (0.60f, Hex("#0a0f18")),
                (1.00f, Hex("#0a0f18")),
            });

            GameObject dosGo = Enfant("Dos", zincGo.transform);
            dos = (RectTransform)dosGo.transform;
            Image dosImg = dosGo.AddComponent<Image>();
            dosImg.raycastTarget = false;
            dosImg.sprite = DegradeVertical("zinc.dos", new[]
            {
                (0.00f, Voile("#2a1c10", 0xe6)),   // opacité .9 de `.dos`
                (1.00f, Voile("#1a1109", 0xe6)),
            });
            Trait(dosGo.transform, "FiletHaut", Px(1f), Voile("#6b4a12", 0x66));
            Bouteilles(dosGo.transform);

            GameObject plateauGo = Enfant("Plateau", zincGo.transform);
            plateau = (RectTransform)plateauGo.transform;
            Image plateauImg = plateauGo.AddComponent<Image>();
            plateauImg.raycastTarget = false;
            plateauImg.sprite = DegradeVertical("zinc.plateau", new[]
            {
                (0.00f, Hex("#a8823a")),
                (0.55f, Hex("#6b4a12")),
                (1.00f, Hex("#3a2a12")),
            });
            Trait(plateauGo.transform, "FiletHaut", Px(2f), Voile("#d9ab4e", 0x88));

            AppliquerEtat(vide: false);
            MajUv();
        }

        /// <summary>`.zinc.revue` (billets : 64 %, étagère 11 %) ou `.zinc.haut` (v4-1, personne au
        /// comptoir : 66 %, étagère 15 %).</summary>
        public void AppliquerEtat(bool vide)
        {
            Vide = vide;
            float hauteurZinc = vide ? 0.66f : 0.64f;
            float hauteurDos = vide ? 0.15f : 0.11f;
            Zinc.anchorMax = new Vector2(1f, hauteurZinc);

            dos.anchorMin = new Vector2(0f, 1f - hauteurDos);
            dos.anchorMax = Vector2.one;
            dos.offsetMin = Vector2.zero;
            dos.offsetMax = Vector2.zero;

            plateau.anchorMin = new Vector2(0f, 1f - hauteurDos);
            plateau.anchorMax = new Vector2(1f, 1f - hauteurDos);
            plateau.pivot = new Vector2(0.5f, 1f);
            plateau.offsetMin = new Vector2(-Px(6f), -Px(22f));
            plateau.offsetMax = new Vector2(Px(6f), 0f);

            bas.anchorMin = Vector2.zero;
            bas.anchorMax = new Vector2(1f, 1f - hauteurDos);
            bas.offsetMin = Vector2.zero;
            bas.offsetMax = new Vector2(0f, -Px(20f));
        }

        private void OnRectTransformDimensionsChange() => MajUv();

        private void MajUv()
        {
            if (Scene == null) return;
            Rect r = ((RectTransform)transform).rect;
            Scene.uvRect = UvCouverture(r.width, r.height);
        }

        /// <summary>`background-size: cover` de la BOÎTE de v4-0 dans un rectangle w×h, centré en x et
        /// posé à 22 % en y — en UV de la texture entière (origine en BAS à gauche, convention Unity).
        /// Écran plus étroit que la boîte (tout téléphone en portrait) : la boîte couvre la hauteur,
        /// seule une bande centrale de sa largeur se voit.</summary>
        public static Rect UvCouverture(float largeur, float hauteur)
        {
            Rect b = BoiteSource;
            if (largeur <= 0f || hauteur <= 0f)
                return new Rect(b.x / SourceLargeur, 1f - (b.y + b.height) / SourceHauteur,
                                b.width / SourceLargeur, b.height / SourceHauteur);
            float aspectEcran = largeur / hauteur;
            float aspectBoite = b.width / b.height;
            float x0, y0, w, h;
            if (aspectEcran < aspectBoite)
            {
                h = b.height;
                w = b.height * aspectEcran;
                x0 = b.x + (b.width - w) * 0.5f;
                y0 = b.y;
            }
            else
            {
                w = b.width;
                h = b.width / aspectEcran;
                x0 = b.x;
                y0 = b.y + (b.height - h) * PositionVerticale;
            }
            return new Rect(x0 / SourceLargeur, 1f - (y0 + h) / SourceHauteur,
                            w / SourceLargeur, h / SourceHauteur);
        }

        /// <summary>v4-1 — `.tabourets.vides` : trois tabourets vides au comptoir, opacité .85.
        /// Posés par l'écran DANS sa mise en page (ils appartiennent au `.comptoir`, pas au décor).</summary>
        public static GameObject ConstruireTabourets(Transform parent)
        {
            GameObject rangee = new GameObject("Tabourets", typeof(RectTransform));
            rangee.transform.SetParent(parent, false);
            HorizontalLayoutGroup h = rangee.AddComponent<HorizontalLayoutGroup>();
            h.childAlignment = TextAnchor.LowerCenter;
            h.childControlWidth = true;
            h.childControlHeight = true;
            h.childForceExpandWidth = true;
            h.childForceExpandHeight = false;
            h.padding = new RectOffset(0, 0, 0, (int)Px(4f));
            CanvasGroup g = rangee.AddComponent<CanvasGroup>();
            g.alpha = 0.85f;
            g.blocksRaycasts = false;
            for (int i = 0; i < 3; i++)
            {
                GameObject tab = new GameObject("Tabouret" + i, typeof(RectTransform));
                tab.transform.SetParent(rangee.transform, false);
                VerticalLayoutGroup v = tab.AddComponent<VerticalLayoutGroup>();
                v.childAlignment = TextAnchor.LowerCenter;
                v.childControlWidth = true;
                v.childControlHeight = true;
                v.childForceExpandWidth = false;
                v.childForceExpandHeight = false;
                v.spacing = -Px(3f);   // `.pied{margin-top:-3px}`
                Ovale(tab.transform, "Siege", Px(40f), Px(22f), Hex("#6b4a12"), Hex("#2a1c10"));
                Ovale(tab.transform, "Pied", Px(34f), Px(9f), Hex("#a8823a"), Hex("#4a3520"));
            }
            return rangee;
        }

        // ------------------------------------------------------------------------------ outils

        private void Bouteilles(Transform dosT)
        {
            GameObject rangee = Enfant("Bouteilles", dosT);
            RectTransform rt = (RectTransform)rangee.transform;
            Etirer(rt);
            HorizontalLayoutGroup h = rangee.AddComponent<HorizontalLayoutGroup>();
            // `display:flex; justify-content:space-around; align-items:flex-end; padding:0 24px 6px`
            h.padding = new RectOffset((int)Px(24f), (int)Px(24f), 0, (int)Px(6f));
            h.childAlignment = TextAnchor.LowerCenter;
            h.childControlWidth = false;
            h.childControlHeight = false;
            h.childForceExpandWidth = true;
            h.childForceExpandHeight = false;
            for (int i = 0; i < 7; i++)
            {
                bool impaire = i % 2 == 0;   // `:nth-child(odd)` compte à partir de 1
                GameObject b = Enfant("Bouteille" + i, rangee.transform);
                RectTransform brt = (RectTransform)b.transform;
                brt.sizeDelta = new Vector2(Px(9f), Px(impaire ? 32f : 26f));
                Image img = b.AddComponent<Image>();
                img.raycastTarget = false;
                img.sprite = impaire
                    ? DegradeVertical("bouteille.impaire", new[]
                        { (0f, Voile("#e0664a", 0x55)), (0.4f, Voile("#d9ab4e", 0x44)), (1f, Hex("#3a2a12")) })
                    : DegradeVertical("bouteille.paire", new[]
                        { (0f, Voile("#7fd4d9", 0x55)), (0.4f, Voile("#d9ab4e", 0x66)), (1f, Hex("#3a2a12")) });
                img.color = new Color(1f, 1f, 1f, 0.8f);   // `opacity:.8`
            }
        }

        private static void Ovale(Transform parent, string nom, float largeur, float hauteur, Color centre, Color bord)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            Image img = go.AddComponent<Image>();
            img.sprite = ProceduralUI.RadialDisc((int)largeur, centre, bord);
            img.raycastTarget = false;
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredWidth = largeur;
            le.preferredHeight = hauteur;
            le.minWidth = largeur;
            le.minHeight = hauteur;
        }

        private static void Trait(Transform parent, string nom, float epaisseur, Color couleur)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = Vector2.one;
            rt.pivot = new Vector2(0.5f, 1f);
            rt.offsetMin = new Vector2(0f, -epaisseur);
            rt.offsetMax = Vector2.zero;
            Image img = go.AddComponent<Image>();
            img.color = couleur;
            img.raycastTarget = false;
            go.AddComponent<LayoutElement>().ignoreLayout = true;
        }

        private static GameObject Enfant(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        private static void Etirer(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        /// <summary>Une couleur CSS `#rrggbb` à l'opacité `aa` du NAVIGATEUR, ajustée pour un mélange
        /// linéaire sur fond inconnu (même ajustement déclaré que les plaques de ①).</summary>
        private static Color Voile(string rgb, int alphaCss)
        {
            Color c = Hex(rgb);
            c.a = ProceduralUI.AlphaVoileSurFondQuelconque(c, alphaCss / 255f, out _);
            return c;
        }

        private static readonly Dictionary<string, Sprite> cache = new Dictionary<string, Sprite>();

        /// <summary>Un dégradé vertical à N arrêts (`linear-gradient(180deg, …)` : le premier arrêt en
        /// HAUT). `ProceduralUI.VerticalGradient` n'en sait que deux ; même texture 1×h, même
        /// convention (y = 0 en bas), mêmes réglages.</summary>
        public static Sprite DegradeVertical(string cle, (float pos, Color c)[] arrets, int hauteurPx = 256)
        {
            if (cache.TryGetValue(cle, out Sprite deja) && deja != null) return deja;
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
                float t = 1f - y / (float)(h - 1);   // t = 0 en haut
                pixels[y] = Echantillon(arrets, t);
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            Sprite sp = Sprite.Create(tex, new Rect(0, 0, 1, h), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect);
            sp.hideFlags = HideFlags.HideAndDontSave;
            cache[cle] = sp;
            return sp;
        }

        public static Color Echantillon((float pos, Color c)[] arrets, float t)
        {
            if (t <= arrets[0].pos) return arrets[0].c;
            for (int i = 1; i < arrets.Length; i++)
            {
                if (t <= arrets[i].pos)
                {
                    float span = arrets[i].pos - arrets[i - 1].pos;
                    float u = span <= 0f ? 1f : (t - arrets[i - 1].pos) / span;
                    return Color.Lerp(arrets[i - 1].c, arrets[i].c, u);
                }
            }
            return arrets[arrets.Length - 1].c;
        }
    }
}
