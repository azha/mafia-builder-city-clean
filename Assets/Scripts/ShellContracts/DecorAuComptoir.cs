using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Shell
{
    // LE DÉCOR D'UN ÉCRAN AU COMPTOIR — la scène, le dégradé, le zinc, les tabourets. GÉNÉRALISÉ depuis `RevueDuJourDecor`
    // (⑯-7) pour ⑨/⑩ (⑨-2) : même CSS de zinc dans la même maquette (`ecrans-brennar-4.html:203-212`), autre fond,
    // autre dégradé, autres hauteurs. Il vit dans ShellContracts parce que ⑨ (Operational) ne voit pas Shell.
    // Le détail de chaque bloc (sources CSS, opacités linéaires, jetons) est écrit à chaque site, ci-dessous ; les
    // paramètres de chaque comptoir sont écrits chez son écran (`RevueDuJourDecor`, `ExceptionQueueController`).
    //
    // LE ZINC — la forme CSS (`ecrans-brennar-4.html:203-212`) :
    //   `.zinc`            bas de l'écran, hauteur selon l'écran (64 / 66 / 52 / 15 %)
    //   `.zinc .dos`       l'étagère, #2a1c10→#1a1109, opacité .9, filet haut 1px #6b4a1266, 7 bouteilles
    //   `.zinc .plateau`   22 px sous l'étagère, #a8823a→#6b4a12 55 %→#3a2a12, filet haut 2px or à .53, débord 6 px
    //   `.zinc::after`     sous le plateau (+20 px), socle → nuit
    // Non repris : `perspective(200px) rotateX(8deg)` du plateau et les ombres portées.
    // ⚠️ Opacités CSS (sRGB) passées par `ProceduralUI.AlphaVoileSurFondQuelconque` (fond inconnu) ; teintes qui
    //    coïncident avec un jeton ⇒ le jeton (TD-612, garde Palette).
    public class DecorAuComptoir : MonoBehaviour
    {
        /// <summary>Ce qui distingue un comptoir d'un autre : le fond (chemin, dimensions, boîte, position verticale),
        /// le dégradé, et le zinc d'arrivée. La GÉOMÉTRIE est immuable ; les COULEURS du dégradé sont une FONCTION,
        /// évaluée à la construction : un champ statique qui lirait `DesignTokens.Current` s'évaluerait à l'initialisation
        /// du type, où `Resources.Load` jette (piège mesuré dans ce dépôt, voir `DailyReviewScreenController`).</summary>
        public sealed class Parametres
        {
            public string CheminScene;
            public float SourceLargeur, SourceHauteur;
            public Rect Boite;                 // pixels IMAGE, origine en haut à gauche
            public float PositionVerticale;    // `background-position: center <y>%`
            public string CleDegrade;          // clé du cache de sprites (un dégradé par comptoir)
            public System.Func<(float pos, Color c)[]> Degrade;
            public float HauteurZinc, HauteurDos;   // l'état d'arrivée du zinc
        }

        public Parametres Config { get; private set; }
        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        public RawImage Scene { get; private set; }
        public RectTransform Zinc { get; private set; }
        public bool Vide { get; protected set; }
        private RectTransform dos, plateau, bas;

        /// <summary>Pose le décor SOUS tout le contenu de l'écran : premier enfant, hors mise en page.</summary>
        public static T Construire<T>(Transform ecran, Parametres p) where T : DecorAuComptoir
        {
            GameObject racine = new GameObject("Decor", typeof(RectTransform));
            racine.transform.SetParent(ecran, false);
            racine.AddComponent<LayoutElement>().ignoreLayout = true;
            Etirer((RectTransform)racine.transform);
            racine.transform.SetAsFirstSibling();
            var decor = racine.AddComponent<T>();
            decor.Config = p;
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
            Sprite sp = Resources.Load<Sprite>(Config.CheminScene);
            Scene.texture = sp != null ? sp.texture : null;
            // Sans texture, la scène reste NOIRE plutôt que blanche : un RawImage vide rend du blanc,
            // ce qui ressemblerait à un fond voulu. Le noir, lui, dit « rien n'est monté ».
            Scene.color = Scene.texture != null ? Color.white : Color.black;

            // ── le dégradé sur la scène ──────────────────────────────────────────────────────────
            GameObject degrade = Enfant("Degrade", transform);
            Etirer((RectTransform)degrade.transform);
            Image deg = degrade.AddComponent<Image>();
            deg.raycastTarget = false;
            deg.sprite = DegradeVertical(Config.CleDegrade, Config.Degrade());

            // ── le zinc ──────────────────────────────────────────────────────────────────────────
            GameObject zincGo = Enfant("Zinc", transform);
            Zinc = (RectTransform)zincGo.transform;
            Zinc.anchorMin = Vector2.zero;
            Zinc.anchorMax = new Vector2(1f, Config.HauteurZinc);
            Zinc.offsetMin = Vector2.zero;
            Zinc.offsetMax = Vector2.zero;

            // le bas sombre d'abord : il est DESSOUS le plateau (`::after` sous un frère positionné)
            GameObject basGo = Enfant("Bas", zincGo.transform);
            bas = (RectTransform)basGo.transform;
            Image basImg = basGo.AddComponent<Image>();
            basImg.raycastTarget = false;
            basImg.sprite = DegradeVertical("zinc.bas", new[]
            {
                (0.00f, Opaque(Socle)),
                (0.60f, Opaque(Nuit)),
                (1.00f, Opaque(Nuit)),
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
            Trait(plateauGo.transform, "FiletHaut", Px(2f), Voile(Or, 0x88));

            AppliquerZinc(Config.HauteurZinc, Config.HauteurDos);
            MajUv();
        }

        /// <summary>Le zinc : sa hauteur (part de l'écran) et celle de l'étagère (part du zinc). Une étagère de 0 la
        /// cache — `.zinc.main-de-cartes` (⑩) pose le plateau en haut du zinc et le bas sombre 20px dessous.</summary>
        public void AppliquerZinc(float hauteurZinc, float hauteurDos)
        {
            Zinc.anchorMax = new Vector2(1f, hauteurZinc);
            dos.gameObject.SetActive(hauteurDos > 0f);

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
            Scene.uvRect = UvCouverture(r.width, r.height, Config);
        }

        /// <summary>`background-size: cover` de la BOÎTE dans un rectangle w×h, centré en x et posé à `PositionVerticale`
        /// en y — en UV de la texture entière (origine en BAS à gauche, convention Unity). Écran plus étroit que la boîte
        /// (tout téléphone en portrait) : la boîte couvre la hauteur, seule une bande centrale de sa largeur se voit.</summary>
        public static Rect UvCouverture(float largeur, float hauteur, Parametres p)
        {
            Rect b = p.Boite;
            float SourceLargeur = p.SourceLargeur, SourceHauteur = p.SourceHauteur, PositionVerticale = p.PositionVerticale;
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
        public static GameObject ConstruireTabourets(Transform parent) =>
            ConstruireTabourets(parent, Px, 34f, new RectOffset(0, 0, 0, (int)Px(4f)));

        /// <summary>⑨-6 — la même rangée à l'échelle de l'écran qui la pose (`px`), avec le pied et les marges de sa variante :
        /// `.tabourets.grands.vides` (cadre 16) = pied 38, `padding:0 6px`, `margin:2px 0 8px`.</summary>
        public static GameObject ConstruireTabourets(Transform parent, System.Func<float, float> px, float piedCss, RectOffset marges)
        {
            GameObject rangee = new GameObject("Tabourets", typeof(RectTransform));
            rangee.transform.SetParent(parent, false);
            HorizontalLayoutGroup h = rangee.AddComponent<HorizontalLayoutGroup>();
            h.childAlignment = TextAnchor.LowerCenter;
            h.childControlWidth = true;
            h.childControlHeight = true;
            h.childForceExpandWidth = true;
            h.childForceExpandHeight = false;
            h.padding = marges;
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
                v.spacing = -px(3f);   // `.pied{margin-top:-3px}`
                Ovale(tab.transform, "Siege", px(40f), px(22f), Hex("#6b4a12"), Hex("#2a1c10"));
                Ovale(tab.transform, "Pied", px(piedCss), px(9f), Hex("#a8823a"), Hex("#4a3520"));
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
                        { (0f, Voile(Braise, 0x55)), (0.4f, Voile(Or, 0x44)), (1f, Hex("#3a2a12")) })
                    : DegradeVertical("bouteille.paire", new[]
                        { (0f, Voile(Cyan, 0x55)), (0.4f, Voile(Or, 0x66)), (1f, Hex("#3a2a12")) });
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

        // ⛔ TD-612 (garde `LitterauxDeCouleurPlayModeTests`, catégorie Palette) : un littéral qui recopie la valeur d'un
        //    token NOMMÉ (distance ≤ 4) passe par le token. Mesuré par le créneau du 22/09 (23:41) : ce fichier en portait 14,
        //    tous des couleurs de la CSS du cadre qui coïncident avec la palette du projet. La CSS reste la source de la FORME
        //    (arrêts, opacités) ; la TEINTE vient du token, pour suivre la palette si elle bouge.
        //    ⚠️ `#0a0f18` (CSS) ↔ `lieutenantGlassBottom` #090e18 (d = 1,4) et `#13100b` ↔ `nightSocle` (d = 3,7) : la teinte
        //    bouge d'un cheveu, c'est le prix de la règle. Seul le RVB du token est pris : chaque site pose SON opacité.
        public static Color Nuit => DesignTokens.Current.lieutenantGlassBottom;
        private static Color Socle => DesignTokens.Current.nightSocle;
        private static Color Or => DesignTokens.Current.hudMoneyUnderlineGold;
        private static Color Braise => DesignTokens.Current.hudGaugeArcHot;
        private static Color Cyan => DesignTokens.Current.hudGaugeArcCold;

        private static Color Opaque(Color c) => new Color(c.r, c.g, c.b, 1f);

        /// <summary>Le RVB d'un token à l'opacité `aa` du NAVIGATEUR, même ajustement que `Voile(string, int)`.</summary>
        public static Color Voile(Color rgb, int alphaCss)
        {
            Color c = Opaque(rgb);
            c.a = ProceduralUI.AlphaVoileSurFondQuelconque(c, alphaCss / 255f, out _);
            return c;
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
