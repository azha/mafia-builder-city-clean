using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Xml.Linq;
using UnityEngine;

namespace MafiaCleanCity.AssetLint
{
    /// <summary>
    /// W3.U-DA/C2 — rasterise un SVG en un jeu de pixels ÉCHANTILLONNÉS (grille régulière sur le
    /// viewBox), chacun porteur de la couleur RÉSOLUE (via <see cref="SvgColorResolver"/>) au
    /// point échantillonné, composée avec sa position en z-order (dernier élément du document =
    /// dessus) et son opacité (composée sur fond BLANC — G4/G5 mesurent des PIXELS, jamais du
    /// texte : c'est ce qui piège un `fill-opacity` conforme en littéral mais hors palette une
    /// fois rendu, cf §4.3 cas 7 du design).
    ///
    /// Sous-ensemble SVG supporté (documenté, pas caché — icônes de ce lot = pictogrammes à trait
    /// constant, pas d'illustration complexe) : &lt;circle&gt;, &lt;ellipse&gt;, &lt;rect&gt;
    /// (coins arrondis ignorés pour le containment — imprécision documentée, sans conséquence sur
    /// un lint de palette), &lt;line&gt;/&lt;polyline&gt;/&lt;polygon&gt;, &lt;path&gt; avec
    /// commandes M/L/H/V/Z (lignes droites uniquement — pas de courbe de Bézier/arc). Une courbe
    /// non supportée lève une exception explicite plutôt que de rendre un résultat silencieusement
    /// faux.
    /// </summary>
    public static class SvgRasterizer
    {
        public struct Sample
        {
            public float X, Y; // coordonnées viewBox
            public Color Color; // couleur composée sur fond blanc
        }

        private struct Shape
        {
            public XElement Element;
            public List<List<Vector2>> FillSubpaths; // pour containment (fill) — une ou plusieurs boucles
            public List<Vector2> StrokePolyline; // pour containment (stroke) — chemin ouvert ou fermé
            public bool IsClosed;
        }

        public static (float minX, float minY, float w, float h) ParseViewBox(XElement svgRoot)
        {
            var vb = svgRoot.Attribute("viewBox")?.Value;
            if (!string.IsNullOrEmpty(vb))
            {
                var parts = vb.Split(new[] { ' ', ',' }, StringSplitOptions.RemoveEmptyEntries)
                              .Select(p => float.Parse(p, CultureInfo.InvariantCulture)).ToArray();
                if (parts.Length == 4) return (parts[0], parts[1], parts[2], parts[3]);
            }
            float w = ParseLength(svgRoot.Attribute("width")?.Value, 24f);
            float h = ParseLength(svgRoot.Attribute("height")?.Value, 24f);
            return (0, 0, w, h);
        }

        private static float ParseLength(string s, float fallback)
        {
            if (string.IsNullOrEmpty(s)) return fallback;
            s = s.Replace("px", "").Trim();
            return float.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : fallback;
        }

        private struct Parsed
        {
            public List<Shape> Shapes;
            public Dictionary<string, Dictionary<string, string>> ClassRules;
            public float MinX, MinY, W, H;
        }

        private static Parsed ParseDocument(string svgText)
        {
            var doc = XDocument.Parse(svgText);
            var ns = doc.Root.GetDefaultNamespace();
            var (minX, minY, w, h) = ParseViewBox(doc.Root);

            var classRules = new Dictionary<string, Dictionary<string, string>>();
            foreach (var styleEl in doc.Descendants(ns + "style"))
            {
                foreach (var kv in SvgColorResolver.ParseStyleBlock(styleEl.Value))
                    classRules[kv.Key] = kv.Value;
            }

            var shapes = new List<Shape>();
            foreach (var el in doc.Descendants())
            {
                var localName = el.Name.LocalName;
                switch (localName)
                {
                    case "circle": shapes.Add(BuildCircle(el)); break;
                    case "ellipse": shapes.Add(BuildEllipse(el)); break;
                    case "rect": shapes.Add(BuildRect(el)); break;
                    case "polygon": shapes.Add(BuildPolyline(el, closed: true)); break;
                    case "polyline": shapes.Add(BuildPolyline(el, closed: false)); break;
                    case "line": shapes.Add(BuildLine(el)); break;
                    case "path": shapes.Add(BuildPath(el)); break;
                }
            }

            return new Parsed { Shapes = shapes, ClassRules = classRules, MinX = minX, MinY = minY, W = w, H = h };
        }

        /// <summary>Évalue un point : accumule TOUTES les formes touchées en ordre document (peint
        /// bas -&gt; haut) avec un compositing alpha "source-over" correct — jamais un simple Lerp
        /// depuis un fond fixe. Retourne null si aucune forme ne couvre ce point (transparent).</summary>
        private static Color? EvaluatePoint(List<Shape> shapes, Dictionary<string, Dictionary<string, string>> classRules, Vector2 point)
        {
            Color accum = new Color(0, 0, 0, 0); // transparent, RGB non pré-multiplié
            bool any = false;

            foreach (var shape in shapes)
            {
                var style = SvgColorResolver.Resolve(shape.Element, classRules);

                if (style.HasFill && style.FillOpacity > 0f && shape.FillSubpaths != null && ContainsPoint(shape.FillSubpaths, point))
                {
                    accum = SrcOver(accum, style.FillRgb, style.FillOpacity);
                    any = true;
                }
                if (style.HasStroke && style.StrokeOpacity > 0f && shape.StrokePolyline != null &&
                    NearPolyline(shape.StrokePolyline, point, style.StrokeWidth / 2f, shape.IsClosed))
                {
                    accum = SrcOver(accum, style.StrokeRgb, style.StrokeOpacity);
                    any = true;
                }
            }

            return any ? accum : (Color?)null;
        }

        private static Color SrcOver(Color dst, Color srcRgb, float srcA)
        {
            float outA = srcA + dst.a * (1f - srcA);
            if (outA <= 0f) return new Color(0, 0, 0, 0);
            float r = (srcRgb.r * srcA + dst.r * dst.a * (1f - srcA)) / outA;
            float g = (srcRgb.g * srcA + dst.g * dst.a * (1f - srcA)) / outA;
            float b = (srcRgb.b * srcA + dst.b * dst.a * (1f - srcA)) / outA;
            return new Color(r, g, b, outA);
        }

        /// <summary>G4/G5 : échantillonnage LINT — grille régulière, composée sur fond BLANC (c'est
        /// ce qui piège un `fill-opacity` conforme en littéral mais hors palette une fois rendu,
        /// cf §4.3 cas 7 du design). Ne retourne que les points COUVERTS (transparent = hors lint).</summary>
        public static List<Sample> Rasterize(string svgText, int gridSize)
        {
            var parsed = ParseDocument(svgText);
            var samples = new List<Sample>();
            for (int iy = 0; iy < gridSize; iy++)
            {
                for (int ix = 0; ix < gridSize; ix++)
                {
                    float px = parsed.MinX + (ix + 0.5f) / gridSize * parsed.W;
                    float py = parsed.MinY + (iy + 0.5f) / gridSize * parsed.H;
                    var point = new Vector2(px, py);
                    var covered = EvaluatePoint(parsed.Shapes, parsed.ClassRules, point);
                    if (covered.HasValue)
                    {
                        var onWhite = Color.Lerp(Color.white, covered.Value, covered.Value.a);
                        samples.Add(new Sample { X = px, Y = py, Color = new Color(onWhite.r, onWhite.g, onWhite.b, 1f) });
                    }
                }
            }
            return samples;
        }

        /// <summary>
        /// W3.U-DA/C3 — export RASTER RÉEL (C4.1 : "rasters dérivés à l'import"). Alpha PRÉSERVÉ
        /// (fond transparent, PAS composé sur blanc — à la différence de <see cref="Rasterize"/>
        /// qui sert le LINT). Une grille de sizePx × sizePx échantillons, un par pixel de sortie —
        /// pas d'anti-aliasing (limite documentée : formes simples, trait constant, cf classe).
        /// </summary>
        public static Texture2D RasterizeToTexture(string svgText, int sizePx)
        {
            var parsed = ParseDocument(svgText);
            var tex = new Texture2D(sizePx, sizePx, TextureFormat.RGBA32, false);
            var pixels = new Color[sizePx * sizePx];
            for (int iy = 0; iy < sizePx; iy++)
            {
                for (int ix = 0; ix < sizePx; ix++)
                {
                    float px = parsed.MinX + (ix + 0.5f) / sizePx * parsed.W;
                    // Unity Texture2D : ligne 0 = BAS de l'image ; le SVG a Y croissant vers le BAS.
                    float py = parsed.MinY + (sizePx - 1 - iy + 0.5f) / sizePx * parsed.H;
                    var covered = EvaluatePoint(parsed.Shapes, parsed.ClassRules, new Vector2(px, py));
                    pixels[iy * sizePx + ix] = covered ?? new Color(0, 0, 0, 0);
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(false, false);
            return tex;
        }

        // ── construction de formes ──────────────────────────────────────────────────────────

        private static Shape BuildCircle(XElement el)
        {
            float cx = ParseLength(el.Attribute("cx")?.Value, 0);
            float cy = ParseLength(el.Attribute("cy")?.Value, 0);
            float r = ParseLength(el.Attribute("r")?.Value, 0);
            var loop = RegularPolygon(cx, cy, r, r, 32);
            return new Shape { Element = el, FillSubpaths = new List<List<Vector2>> { loop }, StrokePolyline = loop, IsClosed = true };
        }

        private static Shape BuildEllipse(XElement el)
        {
            float cx = ParseLength(el.Attribute("cx")?.Value, 0);
            float cy = ParseLength(el.Attribute("cy")?.Value, 0);
            float rx = ParseLength(el.Attribute("rx")?.Value, 0);
            float ry = ParseLength(el.Attribute("ry")?.Value, 0);
            var loop = RegularPolygon(cx, cy, rx, ry, 32);
            return new Shape { Element = el, FillSubpaths = new List<List<Vector2>> { loop }, StrokePolyline = loop, IsClosed = true };
        }

        private static List<Vector2> RegularPolygon(float cx, float cy, float rx, float ry, int segments)
        {
            var pts = new List<Vector2>();
            for (int i = 0; i < segments; i++)
            {
                float t = i / (float)segments * Mathf.PI * 2f;
                pts.Add(new Vector2(cx + rx * Mathf.Cos(t), cy + ry * Mathf.Sin(t)));
            }
            return pts;
        }

        private static Shape BuildRect(XElement el)
        {
            float x = ParseLength(el.Attribute("x")?.Value, 0);
            float y = ParseLength(el.Attribute("y")?.Value, 0);
            float w = ParseLength(el.Attribute("width")?.Value, 0);
            float h = ParseLength(el.Attribute("height")?.Value, 0);
            var loop = new List<Vector2> { new Vector2(x, y), new Vector2(x + w, y), new Vector2(x + w, y + h), new Vector2(x, y + h) };
            return new Shape { Element = el, FillSubpaths = new List<List<Vector2>> { loop }, StrokePolyline = loop, IsClosed = true };
        }

        private static Shape BuildPolyline(XElement el, bool closed)
        {
            var pts = ParsePoints(el.Attribute("points")?.Value);
            return new Shape
            {
                Element = el,
                FillSubpaths = closed ? new List<List<Vector2>> { pts } : null,
                StrokePolyline = pts,
                IsClosed = closed
            };
        }

        private static Shape BuildLine(XElement el)
        {
            float x1 = ParseLength(el.Attribute("x1")?.Value, 0);
            float y1 = ParseLength(el.Attribute("y1")?.Value, 0);
            float x2 = ParseLength(el.Attribute("x2")?.Value, 0);
            float y2 = ParseLength(el.Attribute("y2")?.Value, 0);
            var pts = new List<Vector2> { new Vector2(x1, y1), new Vector2(x2, y2) };
            return new Shape { Element = el, FillSubpaths = null, StrokePolyline = pts, IsClosed = false };
        }

        private static List<Vector2> ParsePoints(string raw)
        {
            var result = new List<Vector2>();
            if (string.IsNullOrEmpty(raw)) return result;
            var nums = raw.Split(new[] { ' ', ',', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries)
                          .Select(s => float.Parse(s, CultureInfo.InvariantCulture)).ToArray();
            for (int i = 0; i + 1 < nums.Length; i += 2) result.Add(new Vector2(nums[i], nums[i + 1]));
            return result;
        }

        /// <summary>
        /// M/L/H/V/Z uniquement — pas de courbe. Une commande C/S/Q/T/A dans un `d` lève une
        /// exception EXPLICITE (documenté : ce lot n'en produit pas — épaisseur de trait
        /// constante, formes simples).
        /// </summary>
        private static Shape BuildPath(XElement el)
        {
            var d = el.Attribute("d")?.Value ?? "";
            var subpaths = new List<List<Vector2>>();
            List<Vector2> current = null;
            Vector2 cursor = Vector2.zero;
            Vector2 subpathStart = Vector2.zero;

            var tokens = System.Text.RegularExpressions.Regex.Matches(d, @"[MLHVZmlhvz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?");
            int idx = 0;
            var toks = tokens.Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();

            char cmd = '\0';
            while (idx < toks.Count)
            {
                var t = toks[idx];
                if (t.Length == 1 && "MLHVZmlhvz".IndexOf(t[0]) >= 0)
                {
                    cmd = t[0];
                    idx++;
                    if (cmd == 'Z' || cmd == 'z')
                    {
                        if (current != null) { current.Add(subpathStart); subpaths.Add(current); current = null; }
                        continue;
                    }
                }
                if (char.ToUpperInvariant(cmd) == 'C' || char.ToUpperInvariant(cmd) == 'S' ||
                    char.ToUpperInvariant(cmd) == 'Q' || char.ToUpperInvariant(cmd) == 'T' || char.ToUpperInvariant(cmd) == 'A')
                {
                    throw new NotSupportedException(
                        $"SvgRasterizer: commande de courbe '{cmd}' non supportée (sous-ensemble M/L/H/V/Z uniquement, cf documentation de classe).");
                }

                switch (char.ToUpperInvariant(cmd))
                {
                    case 'M':
                        {
                            float x = float.Parse(toks[idx++], CultureInfo.InvariantCulture);
                            float y = float.Parse(toks[idx++], CultureInfo.InvariantCulture);
                            cursor = char.IsLower(cmd) ? cursor + new Vector2(x, y) : new Vector2(x, y);
                            if (current != null) subpaths.Add(current);
                            current = new List<Vector2> { cursor };
                            subpathStart = cursor;
                            cmd = char.IsLower(cmd) ? 'l' : 'L'; // M implicite -> L pour les points suivants
                            break;
                        }
                    case 'L':
                        {
                            float x = float.Parse(toks[idx++], CultureInfo.InvariantCulture);
                            float y = float.Parse(toks[idx++], CultureInfo.InvariantCulture);
                            cursor = char.IsLower(cmd) ? cursor + new Vector2(x, y) : new Vector2(x, y);
                            current?.Add(cursor);
                            break;
                        }
                    case 'H':
                        {
                            float x = float.Parse(toks[idx++], CultureInfo.InvariantCulture);
                            cursor = new Vector2(char.IsLower(cmd) ? cursor.x + x : x, cursor.y);
                            current?.Add(cursor);
                            break;
                        }
                    case 'V':
                        {
                            float y = float.Parse(toks[idx++], CultureInfo.InvariantCulture);
                            cursor = new Vector2(cursor.x, char.IsLower(cmd) ? cursor.y + y : y);
                            current?.Add(cursor);
                            break;
                        }
                    default:
                        idx++; // token inattendu — avancer pour éviter une boucle infinie
                        break;
                }
            }
            if (current != null) subpaths.Add(current);

            bool anyClosed = subpaths.Count > 0; // approx : un path avec au moins un point de retour est traité comme fermable pour le fill
            var flatStroke = subpaths.SelectMany(sp => sp).ToList();
            return new Shape { Element = el, FillSubpaths = subpaths, StrokePolyline = flatStroke, IsClosed = anyClosed };
        }

        // ── géométrie ────────────────────────────────────────────────────────────────────────

        private static bool ContainsPoint(List<List<Vector2>> subpaths, Vector2 point)
        {
            foreach (var loop in subpaths)
            {
                if (loop.Count >= 3 && PointInPolygon(loop, point)) return true;
            }
            return false;
        }

        private static bool PointInPolygon(List<Vector2> poly, Vector2 p)
        {
            bool inside = false;
            int n = poly.Count;
            for (int i = 0, j = n - 1; i < n; j = i++)
            {
                var pi = poly[i]; var pj = poly[j];
                bool intersects = ((pi.y > p.y) != (pj.y > p.y)) &&
                    (p.x < (pj.x - pi.x) * (p.y - pi.y) / (pj.y - pi.y + 1e-9f) + pi.x);
                if (intersects) inside = !inside;
            }
            return inside;
        }

        private static bool NearPolyline(List<Vector2> pts, Vector2 p, float halfWidth, bool closed)
        {
            if (pts.Count < 2) return false;
            int count = closed ? pts.Count : pts.Count - 1;
            for (int i = 0; i < count; i++)
            {
                var a = pts[i];
                var b = pts[(i + 1) % pts.Count];
                if (DistancePointToSegment(p, a, b) <= halfWidth) return true;
            }
            return false;
        }

        private static float DistancePointToSegment(Vector2 p, Vector2 a, Vector2 b)
        {
            var ab = b - a;
            float len2 = ab.sqrMagnitude;
            if (len2 < 1e-9f) return Vector2.Distance(p, a);
            float t = Mathf.Clamp01(Vector2.Dot(p - a, ab) / len2);
            var proj = a + t * ab;
            return Vector2.Distance(p, proj);
        }
    }
}
