using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using UnityEngine;

namespace MafiaCleanCity.AssetLint
{
    /// <summary>
    /// W3.U-DA/C2 — résout la couleur EFFECTIVE d'un élément SVG à travers les 6 tournures que le
    /// design nomme (`fill=`, `style="fill:"`, `&lt;style&gt;` + classe, hex court `#rgb`,
    /// `rgb()`/`hsl()`, noms CSS, `currentColor` + héritage) + une 7ᵉ (`fill-opacity`/`opacity`,
    /// littéral en palette mais pixel rendu hors palette). Ce résolveur ne fait AUCUNE hypothèse
    /// sur la tournure utilisée dans le document — il implémente la cascade CSS/SVG minimale
    /// (style inline &gt; attribut de présentation &gt; règle de classe &gt; hérité &gt; défaut),
    /// pas un grep sur `fill=`.
    /// </summary>
    public static class SvgColorResolver
    {
        private static readonly Dictionary<string, Color> NamedColors = new Dictionary<string, Color>(StringComparer.OrdinalIgnoreCase)
        {
            {"black", new Color(0, 0, 0)},
            {"white", new Color(1, 1, 1)},
            {"red", new Color(1, 0, 0)},
            {"green", new Color(0, 0.5019608f, 0)},
            {"blue", new Color(0, 0, 1)},
            {"gray", new Color(0.5019608f, 0.5019608f, 0.5019608f)},
            {"grey", new Color(0.5019608f, 0.5019608f, 0.5019608f)},
            {"magenta", new Color(1, 0, 1)},
            {"cyan", new Color(0, 1, 1)},
            {"gold", new Color(1, 0.8431373f, 0)},
            {"orange", new Color(1, 0.6470588f, 0)},
        };

        public struct ResolvedStyle
        {
            public bool HasFill;
            public Color FillRgb;
            public float FillOpacity; // combine fill-opacity * opacity, 0..1
            public bool HasStroke;
            public Color StrokeRgb;
            public float StrokeOpacity;
            public float StrokeWidth;
        }

        /// <summary>
        /// Parse un bloc &lt;style&gt; CSS minimal : règles `.classname { key: value; ... }`.
        /// Retourne classname -> { key -> value }.
        /// </summary>
        public static Dictionary<string, Dictionary<string, string>> ParseStyleBlock(string css)
        {
            var result = new Dictionary<string, Dictionary<string, string>>();
            if (string.IsNullOrEmpty(css)) return result;
            foreach (Match m in Regex.Matches(css, @"\.([\w-]+)\s*\{([^}]*)\}"))
            {
                var className = m.Groups[1].Value;
                var body = m.Groups[2].Value;
                var props = ParseDeclarationList(body);
                result[className] = props;
            }
            return result;
        }

        public static Dictionary<string, string> ParseDeclarationList(string decl)
        {
            var props = new Dictionary<string, string>();
            if (string.IsNullOrEmpty(decl)) return props;
            foreach (var part in decl.Split(';'))
            {
                var kv = part.Split(new[] { ':' }, 2);
                if (kv.Length != 2) continue;
                var key = kv[0].Trim();
                var val = kv[1].Trim();
                if (key.Length > 0 && val.Length > 0) props[key] = val;
            }
            return props;
        }

        /// <summary>Parse une valeur de couleur CSS/SVG sous n'importe laquelle des tournures connues.</summary>
        public static bool TryParseColor(string raw, Color currentColor, out Color color)
        {
            color = Color.black;
            if (string.IsNullOrEmpty(raw)) return false;
            raw = raw.Trim();

            if (raw.Equals("none", StringComparison.OrdinalIgnoreCase)) return false;
            if (raw.Equals("transparent", StringComparison.OrdinalIgnoreCase)) { color = new Color(0, 0, 0, 0); return true; }
            if (raw.Equals("currentColor", StringComparison.OrdinalIgnoreCase)) { color = currentColor; return true; }

            if (raw.StartsWith("#"))
            {
                var hex = raw.Substring(1);
                if (hex.Length == 3)
                {
                    // hex court #rgb -> #rrggbb (chaque chiffre dupliqué)
                    hex = new string(new[] { hex[0], hex[0], hex[1], hex[1], hex[2], hex[2] });
                }
                if (hex.Length == 6 && int.TryParse(hex, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var rgb))
                {
                    int r = (rgb >> 16) & 0xFF, g = (rgb >> 8) & 0xFF, b = rgb & 0xFF;
                    color = new Color(r / 255f, g / 255f, b / 255f);
                    return true;
                }
                return false;
            }

            var rgbMatch = Regex.Match(raw, @"^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$", RegexOptions.IgnoreCase);
            if (rgbMatch.Success)
            {
                color = new Color(
                    int.Parse(rgbMatch.Groups[1].Value) / 255f,
                    int.Parse(rgbMatch.Groups[2].Value) / 255f,
                    int.Parse(rgbMatch.Groups[3].Value) / 255f);
                return true;
            }

            var hslMatch = Regex.Match(raw, @"^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$", RegexOptions.IgnoreCase);
            if (hslMatch.Success)
            {
                float h = float.Parse(hslMatch.Groups[1].Value, CultureInfo.InvariantCulture) / 360f;
                float s = float.Parse(hslMatch.Groups[2].Value, CultureInfo.InvariantCulture) / 100f;
                float l = float.Parse(hslMatch.Groups[3].Value, CultureInfo.InvariantCulture) / 100f;
                color = HslToRgb(h, s, l);
                return true;
            }

            if (NamedColors.TryGetValue(raw, out var named))
            {
                color = named;
                return true;
            }

            return false;
        }

        private static Color HslToRgb(float h, float s, float l)
        {
            if (s <= 0f) return new Color(l, l, l);
            float q = l < 0.5f ? l * (1 + s) : l + s - l * s;
            float p = 2 * l - q;
            float r = HueToRgb(p, q, h + 1f / 3f);
            float g = HueToRgb(p, q, h);
            float b = HueToRgb(p, q, h - 1f / 3f);
            return new Color(r, g, b);
        }

        private static float HueToRgb(float p, float q, float t)
        {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1f / 6f) return p + (q - p) * 6f * t;
            if (t < 1f / 2f) return q;
            if (t < 2f / 3f) return p + (q - p) * (2f / 3f - t) * 6f;
            return p;
        }

        private static float ParseOpacity(string raw, float fallback)
        {
            if (string.IsNullOrEmpty(raw)) return fallback;
            raw = raw.Trim();
            if (raw.EndsWith("%") && float.TryParse(raw.TrimEnd('%'), NumberStyles.Float, CultureInfo.InvariantCulture, out var pct))
                return Mathf.Clamp01(pct / 100f);
            if (float.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var v))
                return Mathf.Clamp01(v);
            return fallback;
        }

        /// <summary>
        /// Résout le style effectif d'un élément, en remontant la chaîne d'ancêtres pour
        /// l'héritage (fill/stroke/color/opacity héritent en SVG si non fixés localement).
        /// </summary>
        public static ResolvedStyle Resolve(XElement element, Dictionary<string, Dictionary<string, string>> classRules)
        {
            // Empile la chaîne racine -> élément pour appliquer l'héritage dans l'ordre.
            var chain = new List<XElement>();
            for (var e = element; e != null; e = e.Parent) chain.Insert(0, e);

            Color currentColorProp = Color.black; // "color" CSS — support minimal pour currentColor
            string fillStr = null, strokeStr = null;
            float fillOpacity = 1f, strokeOpacity = 1f, elementOpacity = 1f;
            string strokeWidthStr = null;

            foreach (var el in chain)
            {
                var declared = new Dictionary<string, string>();

                var classAttr = el.Attribute("class")?.Value;
                if (!string.IsNullOrEmpty(classAttr))
                {
                    foreach (var cls in classAttr.Split(' '))
                    {
                        if (classRules.TryGetValue(cls.Trim(), out var rules))
                        {
                            foreach (var kv in rules) declared[kv.Key] = kv.Value;
                        }
                    }
                }

                foreach (var attrName in new[] { "fill", "stroke", "fill-opacity", "stroke-opacity", "opacity", "stroke-width", "color" })
                {
                    var a = el.Attribute(attrName)?.Value;
                    if (!string.IsNullOrEmpty(a)) declared[attrName] = a;
                }

                var styleAttr = el.Attribute("style")?.Value;
                if (!string.IsNullOrEmpty(styleAttr))
                {
                    foreach (var kv in ParseDeclarationList(styleAttr)) declared[kv.Key] = kv.Value;
                }

                if (declared.TryGetValue("color", out var colorRaw) && TryParseColor(colorRaw, currentColorProp, out var cc))
                    currentColorProp = cc;
                if (declared.TryGetValue("fill", out var f)) fillStr = f;
                if (declared.TryGetValue("stroke", out var s)) strokeStr = s;
                if (declared.TryGetValue("fill-opacity", out var fo)) fillOpacity = ParseOpacity(fo, fillOpacity);
                if (declared.TryGetValue("stroke-opacity", out var so)) strokeOpacity = ParseOpacity(so, strokeOpacity);
                if (declared.TryGetValue("opacity", out var op)) elementOpacity = ParseOpacity(op, 1f); // opacity NE s'hérite PAS en SVG — reset à chaque niveau qui le déclare
                if (declared.TryGetValue("stroke-width", out var sw)) strokeWidthStr = sw;
            }

            var result = new ResolvedStyle { StrokeWidth = 1f };
            if (strokeWidthStr != null && float.TryParse(strokeWidthStr, NumberStyles.Float, CultureInfo.InvariantCulture, out var swv))
                result.StrokeWidth = swv;

            if (fillStr == null)
            {
                // défaut SVG : fill noir si rien n'est déclaré nulle part dans la chaîne
                result.HasFill = true;
                result.FillRgb = Color.black;
                result.FillOpacity = Mathf.Clamp01(fillOpacity * elementOpacity);
            }
            else if (TryParseColor(fillStr, currentColorProp, out var fillColor))
            {
                result.HasFill = true;
                result.FillRgb = fillColor;
                result.FillOpacity = Mathf.Clamp01(fillOpacity * elementOpacity);
            }

            if (strokeStr != null && TryParseColor(strokeStr, currentColorProp, out var strokeColor))
            {
                result.HasStroke = true;
                result.StrokeRgb = strokeColor;
                result.StrokeOpacity = Mathf.Clamp01(strokeOpacity * elementOpacity);
            }

            return result;
        }
    }
}
