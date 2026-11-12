using System.Collections.Generic;
using UnityEngine;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational.Selling
{
    /// <summary>㉟ LA VENTE — LES QUATRE PICTOGRAMMES DE SUBSTANCE (f2 12/11, écart A/B : le client dessinait un disque teinté, la substance ne
    /// se disait que par la COULEUR). RECOPIÉS des `svg.pas` des rangées de la maquette (`ecrans-brennar-6.html`, atelier @454f4b6b, viewBox
    /// 24 × 24, rendu 19 px CSS) : chaque substance a sa FORME, la teinte ne fait que l'accompagner.
    ///   · BRINDLE  un pain barré : rectangle (3,9) 18 × 11, bande (3,13) 18 × 2,6 ;
    ///   · CRICK    deux cristaux : losange de demi-diagonale 6 centré (12,9), losange de 4,5 centré (12,16,5) ;
    ///   · HUSH     une plaquette et son comprimé : rectangle (3,7) 18 × 12, disque de rayon 3,4 centré (12,13) ;
    ///   · ASH      un éclat taillé : cerf-volant (12,2) (17,7) (12,20) (7,7), facette (12,2) (17,7) (12,9).
    /// Une valeur hors de `DealerSubstanceLabel` (`selling.projection.service.ts:90`) rend un DISQUE : elle se voit comme inconnue, elle ne
    /// se déguise pas en l'une des quatre.
    ///
    /// Le dessin est RASTERISÉ en une texture (polygones pleins, trait centré sur le bord comme `stroke`, suréchantillonné) : un cerf-volant ne
    /// se compose pas de rectangles uGUI. Aplats OPAQUES seulement : la facette de l'ash (`#ffffff` à .5 sur `#efe9da`) est mélangée à la main
    /// en sRGB (`#f7f4ed`) — Unity compose en linéaire, recopier l'opacité changerait d'unité. Elle est posée EN APLAT par-dessus le trait du
    /// cerf-volant, dont elle recouvre la moitié intérieure sur deux arêtes (le SVG la mêlerait au trait à .5). Nuance consignée (C) : les `rx` de 1,5 et 2 des
    /// rectangles ne sont pas arrondis. Les deux teintes égales à un jeton passent par le jeton (`#f2c96b` hudMoneyGold, `#7fd4d9`
    /// hudGaugeArcCold).</summary>
    public static class SubstancePictogrammes
    {
        public const float ViewBox = 24f;

        /// <summary>Les quatre valeurs de `DealerSubstanceLabel`, recopiées du back.</summary>
        public static readonly System.Collections.ObjectModel.ReadOnlyCollection<string> Substances =
            System.Array.AsReadOnly(new[] { "BRINDLE", "CRICK", "HUSH", "ASH" });

        /// <summary>Un polygone du dessin, en unités du viewBox (y vers le bas, comme le SVG). `EpaisseurTrait` 0 = pas de trait.</summary>
        public sealed class Couche
        {
            public Vector2[] Points;
            public Color32 Fond;
            public Color32 Trait;
            public float EpaisseurTrait;
        }

        private static readonly Color32 BrindleTrait = new Color32(0xa8, 0x6f, 0x1e, 255);
        private static readonly Color32 CrickTrait = new Color32(0x1f, 0x6a, 0x72, 255);
        private static readonly Color32 HushFond = new Color32(0xc9, 0xa8, 0xe0, 255), HushTrait = new Color32(0x5a, 0x2f, 0x7a, 255);
        private static readonly Color32 AshFond = new Color32(0xef, 0xe9, 0xda, 255), AshTrait = new Color32(0x8a, 0x84, 0x74, 255);
        private static readonly Color32 AshFacette = new Color32(0xf7, 0xf4, 0xed, 255);
        private static readonly Color32 InconnueTrait = new Color32(0x7a, 0x5a, 0x14, 255);

        private static Vector2[] Rect(float x, float y, float w, float h) =>
            new[] { new Vector2(x, y), new Vector2(x + w, y), new Vector2(x + w, y + h), new Vector2(x, y + h) };

        private static Vector2[] Losange(float cx, float cy, float demi) =>
            new[] { new Vector2(cx, cy - demi), new Vector2(cx + demi, cy), new Vector2(cx, cy + demi), new Vector2(cx - demi, cy) };

        private static Vector2[] Disque(float cx, float cy, float r)
        {
            const int n = 24;
            Vector2[] p = new Vector2[n];
            for (int i = 0; i < n; i++)
                p[i] = new Vector2(cx + r * Mathf.Cos(2f * Mathf.PI * i / n), cy + r * Mathf.Sin(2f * Mathf.PI * i / n));
            return p;
        }

        /// <summary>Les couches du dessin d'une substance, de la plus basse à la plus haute. Jamais null.</summary>
        public static Couche[] Couches(string substance)
        {
            Color32 or = DesignTokens.Current.hudMoneyGold, cyan = DesignTokens.Current.hudGaugeArcCold;
            switch (substance)
            {
                case "BRINDLE":
                    return new[]
                    {
                        new Couche { Points = Rect(3f, 9f, 18f, 11f), Fond = or, Trait = BrindleTrait, EpaisseurTrait = 1.4f },
                        new Couche { Points = Rect(3f, 13f, 18f, 2.6f), Fond = BrindleTrait },
                    };
                case "CRICK":
                    return new[]
                    {
                        new Couche { Points = Losange(12f, 9f, 6f), Fond = cyan, Trait = CrickTrait, EpaisseurTrait = 1.4f },
                        new Couche { Points = Losange(12f, 16.5f, 4.5f), Fond = cyan, Trait = CrickTrait, EpaisseurTrait = 1.2f },
                    };
                case "HUSH":
                    return new[]
                    {
                        new Couche { Points = Rect(3f, 7f, 18f, 12f), Fond = HushFond, Trait = HushTrait, EpaisseurTrait = 1.4f },
                        new Couche { Points = Disque(12f, 13f, 3.4f), Fond = HushTrait },
                    };
                case "ASH":
                    return new[]
                    {
                        new Couche { Points = new[] { new Vector2(12f, 2f), new Vector2(17f, 7f), new Vector2(12f, 20f), new Vector2(7f, 7f) },
                                     Fond = AshFond, Trait = AshTrait, EpaisseurTrait = 1.3f },
                        new Couche { Points = new[] { new Vector2(12f, 2f), new Vector2(17f, 7f), new Vector2(12f, 9f) }, Fond = AshFacette },
                    };
                default:
                    return new[] { new Couche { Points = Disque(12f, 12f, 8f), Fond = DesignTokens.Current.hudMoneyUnderlineGold, Trait = InconnueTrait, EpaisseurTrait = 1.4f } };
            }
        }

        private static bool Dedans(Vector2[] poly, Vector2 p)
        {
            bool dedans = false;
            for (int i = 0, j = poly.Length - 1; i < poly.Length; j = i++)
                if ((poly[i].y > p.y) != (poly[j].y > p.y)
                    && p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
                    dedans = !dedans;
            return dedans;
        }

        private static float DistanceAuBord(Vector2[] poly, Vector2 p)
        {
            float min = float.MaxValue;
            for (int i = 0, j = poly.Length - 1; i < poly.Length; j = i++)
            {
                Vector2 a = poly[j], ab = poly[i] - poly[j];
                float t = ab.sqrMagnitude > 0f ? Mathf.Clamp01(Vector2.Dot(p - a, ab) / ab.sqrMagnitude) : 0f;
                min = Mathf.Min(min, Vector2.Distance(p, a + t * ab));
            }
            return min;
        }

        /// <summary>La FORME seule, sans aucune teinte : pour chaque pixel (lu en son centre), 0 = vide, sinon l'élément du dessin qui le
        /// couvre (`1 + 2 × rang de la couche`, `+ 1` si c'est son trait). C'est ce que la garde compare d'une substance à l'autre : deux
        /// dessins qui ne diffèrent que par leurs couleurs rendent la MÊME carte.</summary>
        public static int[] Forme(Couche[] couches, int taille)
        {
            int[] carte = new int[taille * taille];
            float unite = ViewBox / taille;
            for (int y = 0; y < taille; y++)
                for (int x = 0; x < taille; x++)
                {
                    Vector2 p = new Vector2((x + 0.5f) * unite, ViewBox - (y + 0.5f) * unite);
                    for (int i = 0; i < couches.Length; i++)
                    {
                        if (Dedans(couches[i].Points, p)) carte[y * taille + x] = 1 + 2 * i;
                        if (couches[i].EpaisseurTrait > 0f && DistanceAuBord(couches[i].Points, p) <= couches[i].EpaisseurTrait / 2f) carte[y * taille + x] = 2 + 2 * i;
                    }
                }
            return carte;
        }

        /// <summary>Le dessin rendu en `taille` × `taille` pixels (ligne 0 = le BAS, comme une texture Unity).</summary>
        public static Color32[] Rasteriser(Couche[] couches, int taille)
        {
            const int S = 3;   // suréchantillonnage 3 × 3
            Color32[] pixels = new Color32[taille * taille];
            float unite = ViewBox / taille;
            for (int y = 0; y < taille; y++)
                for (int x = 0; x < taille; x++)
                {
                    float r = 0f, g = 0f, b = 0f, couverts = 0f;
                    for (int sy = 0; sy < S; sy++)
                        for (int sx = 0; sx < S; sx++)
                        {
                            // le SVG a l'axe y vers le bas, la texture vers le haut
                            Vector2 p = new Vector2((x + (sx + 0.5f) / S) * unite, ViewBox - (y + (sy + 0.5f) / S) * unite);
                            bool peint = false;
                            Color32 c = default;
                            foreach (Couche couche in couches)
                            {
                                if (Dedans(couche.Points, p)) { c = couche.Fond; peint = true; }
                                if (couche.EpaisseurTrait > 0f && DistanceAuBord(couche.Points, p) <= couche.EpaisseurTrait / 2f) { c = couche.Trait; peint = true; }
                            }
                            if (!peint) continue;
                            couverts += 1f;
                            r += c.r; g += c.g; b += c.b;
                        }
                    if (couverts > 0f)
                        pixels[y * taille + x] = new Color32((byte)Mathf.RoundToInt(r / couverts), (byte)Mathf.RoundToInt(g / couverts),
                                                              (byte)Mathf.RoundToInt(b / couverts), (byte)Mathf.RoundToInt(255f * couverts / (S * S)));
                }
            return pixels;
        }

        private static readonly Dictionary<string, Sprite> cache = new Dictionary<string, Sprite>();

        /// <summary>Le sprite du pictogramme d'une substance, en `taille` pixels de côté, mis en cache.</summary>
        public static Sprite Dessin(string substance, int taille)
        {
            taille = Mathf.Max(8, taille);
            string cle = (Substances.Contains(substance) ? substance : "?") + ":" + taille;
            if (cache.TryGetValue(cle, out Sprite deja) && deja != null) return deja;
            Texture2D tex = new Texture2D(taille, taille, TextureFormat.RGBA32, false)
            {
                wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear, hideFlags = HideFlags.HideAndDontSave,
            };
            tex.SetPixels32(Rasteriser(Couches(substance), taille));
            tex.Apply(false, false);
            Sprite sprite = Sprite.Create(tex, new Rect(0, 0, taille, taille), new Vector2(0.5f, 0.5f), 100f);
            sprite.hideFlags = HideFlags.HideAndDontSave;   // comme sa texture : ni l'un ni l'autre ne part avec une scène
            cache[cle] = sprite;
            return sprite;
        }
    }
}
