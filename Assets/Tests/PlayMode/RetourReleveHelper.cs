using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.Rendering;
using UnityEngine.UI;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    /// <summary>Ce que `MesurerAppui` rend : la zone mesurée (pixels de l'image), les trois photos (repos, sous le doigt, relâché) et les
    /// deux comptes. Les photos sont gardées pour que l'appelant mesure une AUTRE zone sur les mêmes rendus (GP, B2 du design).</summary>
    public readonly struct MesureAppui
    {
        public readonly RectInt Zone;
        public readonly Color32[] Repos, SousLeDoigt, Relache;
        /// <summary>Pixels de la zone dont le plus grand écart de canal, repos → sous le doigt, atteint 3/255.</summary>
        public readonly int Effet;
        /// <summary>Pixels de la zone qui diffèrent encore (d'un seul octet) du repos après le relâchement.</summary>
        public readonly int Residus;

        public MesureAppui(RectInt zone, Color32[] repos, Color32[] sousLeDoigt, Color32[] relache, int effet, int residus)
        {
            Zone = zone; Repos = repos; SousLeDoigt = sousLeDoigt; Relache = relache; Effet = effet; Residus = residus;
        }
    }

    /// <summary>
    /// Design retour d'appui v5 §4 — le RELEVÉ, réutilisable par GP (R6.2) : on RENDU et on COMPTE (une garde sur les paramètres d'un effet
    /// n'est pas une garde sur son effet), puis des JUGES PURS qui rendent null si vert, sinon le MESSAGE EXIGÉ de la colonne « message exigé ».
    /// Aucune dépendance à NUnit : un juge rend un texte, le test l'asserte. Le rendu passe par une `RenderTexture` et une caméra
    /// orthographique (recette de `CaptureTeteFichePlayModeTests`) : il exige un périphérique graphique (pas `-nographics`).
    /// </summary>
    public static class RetourReleveHelper
    {
        /// <summary>Petite taille de rendu (la vitesse prime : l'effet se compte en pixels, pas en finesse).</summary>
        public const int Largeur = 270, Hauteur = 480;

        /// <summary>Le fond de rendu : gris sombre, pour que toute matière claire s'en détache.</summary>
        public static readonly Color Fond = new Color(0.1f, 0.1f, 0.1f, 1f);

        /// <summary>3/255 en octets : le seuil de couleur rendue (`MouvementTunables.SeuilCouleurRendue`) lu sur une image 8 bits.</summary>
        public static readonly int SeuilOctets = Mathf.RoundToInt(MouvementTunables.SeuilCouleurRendue * 255f);

        /// <summary>Résidu après relâchement : le moindre octet d'écart compte (le retour est « aux pixels du repos », pas « sous le seuil »).</summary>
        public const int SeuilResiduOctets = 1;

        /// <summary>Durée de l'appui, lue dans le catalogue (jamais recopiée) : la piste est évaluée à cet instant, c'est l'écart maximal.</summary>
        public static readonly float DureeAppuiS = DureeDe(CatalogueHud.IdRetourAppui);

        private static float DureeDe(string id)
        {
            IReadOnlyList<Entree> hud = CatalogueHud.Entrees;
            for (int i = 0; i < hud.Count; i++) if (hud[i].Id == id) return hud[i].Mouvement.DureeTotaleS;
            throw new InvalidOperationException("Entree absente du catalogue : " + id);
        }

        // ------------------------------------------------------------------------------ le rendu
        /// <summary>Le canvas passé en `ScreenSpaceCamera` devant une caméra orthographique qui rend dans une `RenderTexture` l × h ; tout est
        /// RESTAURÉ et détruit à la fin. Le canvas remplit l'image (planeDistance 1, sans `CanvasScaler` : `scaleFactor` 1).</summary>
        private sealed class Cadrage : IDisposable
        {
            public readonly Camera Camera;
            private readonly Canvas canvas;
            private readonly GameObject camGo;
            private readonly RenderTexture rtex;
            private readonly RenderMode modePrecedent;
            private readonly Camera cameraPrecedente;
            private readonly float planPrecedent;

            public Cadrage(Canvas canvas, int largeur, int hauteur)
            {
                if (canvas == null) throw new ArgumentNullException(nameof(canvas));
                if (SystemInfo.graphicsDeviceType == GraphicsDeviceType.Null)
                    throw new InvalidOperationException("rendu impossible : périphérique graphique Null (-nographics) — la garde d'effet exige un rendu");
                this.canvas = canvas;
                modePrecedent = canvas.renderMode;
                cameraPrecedente = canvas.worldCamera;
                planPrecedent = canvas.planeDistance;

                camGo = new GameObject("CamReleveRetour");
                Camera = camGo.AddComponent<Camera>();
                Camera.clearFlags = CameraClearFlags.SolidColor;
                Camera.backgroundColor = Fond;
                Camera.orthographic = true;
                Camera.orthographicSize = 5f;
                Camera.nearClipPlane = 0.1f; Camera.farClipPlane = 100f;
                rtex = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
                Camera.targetTexture = rtex;
                canvas.renderMode = RenderMode.ScreenSpaceCamera;
                canvas.worldCamera = Camera;
                canvas.planeDistance = 1f;
                Canvas.ForceUpdateCanvases();
                Camera.Render();   // le canvas est dimensionné et ses géométries rebâties APRÈS ce rendu : les coins du monde sont justes
            }

            public Color32[] Lire(int largeur, int hauteur)
            {
                Canvas.ForceUpdateCanvases();
                Camera.Render();
                RenderTexture prev = RenderTexture.active;
                RenderTexture.active = rtex;
                var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
                try
                {
                    tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
                    return tex.GetPixels32();   // rangée 0 = le BAS de l'image, comme `WorldToScreenPoint`
                }
                finally
                {
                    RenderTexture.active = prev;
                    Object.DestroyImmediate(tex);
                }
            }

            public void Dispose()
            {
                canvas.renderMode = modePrecedent;
                canvas.worldCamera = cameraPrecedente;
                canvas.planeDistance = planPrecedent;
                Camera.targetTexture = null;
                rtex.Release();
                Object.DestroyImmediate(rtex);
                Object.DestroyImmediate(camGo);
            }
        }

        /// <summary>Une photo du canvas, l × h, rangée 0 en bas : `pixels[y * l + x]`. Le canvas racine est restauré à l'identique.</summary>
        public static Color32[] Photographier(Canvas canvas, int largeur, int hauteur)
        {
            using (var cadre = new Cadrage(canvas, largeur, hauteur)) return cadre.Lire(largeur, hauteur);
        }

        /// <summary>La zone du rect de `cible` dans l'image de `Photographier` (mêmes l, h), bornée à l'image. Méthode : le canvas est mis dans
        /// le même cadrage que la photo, les 4 coins du monde passent par `WorldToScreenPoint` de la caméra de rendu, puis sont ARRONDIS au
        /// pixel. Exacte quand le rect tombe sur la grille de pixels (vérifié contre un rect connu par `RectPixels_RectConnu_EpouseLaSurfaceRendue`).</summary>
        public static RectInt RectPixels(RectTransform cible, Canvas canvas, int largeur, int hauteur)
        {
            if (cible == null) throw new ArgumentNullException(nameof(cible));
            using (var cadre = new Cadrage(canvas, largeur, hauteur))
            {
                var coins = new Vector3[4];
                cible.GetWorldCorners(coins);
                float xMin = float.MaxValue, yMin = float.MaxValue, xMax = float.MinValue, yMax = float.MinValue;
                for (int i = 0; i < coins.Length; i++)
                {
                    Vector3 p = cadre.Camera.WorldToScreenPoint(coins[i]);
                    xMin = Mathf.Min(xMin, p.x); xMax = Mathf.Max(xMax, p.x);
                    yMin = Mathf.Min(yMin, p.y); yMax = Mathf.Max(yMax, p.y);
                }
                int x0 = Mathf.Clamp(Mathf.RoundToInt(xMin), 0, largeur), x1 = Mathf.Clamp(Mathf.RoundToInt(xMax), 0, largeur);
                int y0 = Mathf.Clamp(Mathf.RoundToInt(yMin), 0, hauteur), y1 = Mathf.Clamp(Mathf.RoundToInt(yMax), 0, hauteur);
                return new RectInt(x0, y0, x1 - x0, y1 - y0);
            }
        }

        /// <summary>Tolérance (unités locales du viewport) de « entièrement visible » : un rect qui déborde de moins d'un demi-pixel n'est pas défilé.</summary>
        private const float EpsilonVisible = 0.5f;

        /// <summary>Le relevé FAIT DÉFILER (ruling f2 11/11 : le joueur ferait défiler aussi). Pour chaque `ScrollRect` ancêtre de `b` (le plus
        /// proche d'abord) dont le viewport ne montre pas tout le rect du bouton : le centre du bouton est amené au centre du viewport, par la
        /// position normalisée CLAMPÉE à 0..1 (jamais hors bornes, donc sans élasticité), sur l'axe vertical et/ou horizontal que le `ScrollRect`
        /// permet et que le content autorise. Tout se passe dans le MÊME cadrage que la photo (le canvas est à la taille de l'image : en overlay,
        /// la taille de l'écran donnerait une autre géométrie). Rend vrai si le content a bougé : les photos de repos prises avant ne valent plus.
        /// Un bouton sans `ScrollRect` ancêtre, ou déjà entièrement visible, ne provoque aucun défilement (et le premier cas ne rend rien).</summary>
        /// <summary>Évalue `mesure` DANS le cadre de la photo (canvas en `ScreenSpaceCamera` à la taille l × h, tout restauré ensuite) : la géométrie d'un
        /// canvas en overlay est celle de l'ÉCRAN du banc, pas celle de l'image (les mises en page diffèrent). Toute mesure de position qui doit
        /// s'accorder avec les photos passe par ici.</summary>
        public static T DansLeCadre<T>(Canvas canvas, int largeur, int hauteur, Func<T> mesure)
        {
            if (canvas == null) throw new ArgumentNullException(nameof(canvas));
            using (new Cadrage(canvas, largeur, hauteur))
            {
                Canvas.ForceUpdateCanvases();
                return mesure();
            }
        }

        public static bool AmenerDansLeCadre(Button b, Canvas canvas, int largeur, int hauteur)
        {
            if (b == null) throw new ArgumentNullException(nameof(b));
            if (canvas == null) throw new ArgumentNullException(nameof(canvas));
            var cible = b.transform as RectTransform;
            if (cible == null || b.GetComponentInParent<ScrollRect>() == null) return false;
            bool bouge = false;
            using (new Cadrage(canvas, largeur, hauteur))
            {
                Canvas.ForceUpdateCanvases();
                for (ScrollRect sr = b.GetComponentInParent<ScrollRect>(); sr != null;
                     sr = sr.transform.parent != null ? sr.transform.parent.GetComponentInParent<ScrollRect>() : null)
                    bouge |= CentrerDansLeViewport(sr, cible);
                Canvas.ForceUpdateCanvases();
            }
            return bouge;
        }

        private static bool CentrerDansLeViewport(ScrollRect sr, RectTransform cible)
        {
            RectTransform viewport = sr.viewport != null ? sr.viewport : (RectTransform)sr.transform;
            RectTransform content = sr.content;
            if (content == null) return false;
            Vector2 avant = content.anchoredPosition;

            var coins = new Vector3[4];
            cible.GetWorldCorners(coins);
            float xMin = float.MaxValue, yMin = float.MaxValue, xMax = float.MinValue, yMax = float.MinValue;
            for (int i = 0; i < coins.Length; i++)
            {
                Vector3 p = viewport.InverseTransformPoint(coins[i]);
                xMin = Mathf.Min(xMin, p.x); xMax = Mathf.Max(xMax, p.x);
                yMin = Mathf.Min(yMin, p.y); yMax = Mathf.Max(yMax, p.y);
            }
            Rect vue = viewport.rect;
            if (xMin >= vue.xMin - EpsilonVisible && xMax <= vue.xMax + EpsilonVisible
                && yMin >= vue.yMin - EpsilonVisible && yMax <= vue.yMax + EpsilonVisible) return false;

            Bounds corps = RectTransformUtility.CalculateRelativeRectTransformBounds(viewport, content);
            Vector2 ecart = new Vector2((xMin + xMax) * 0.5f, (yMin + yMax) * 0.5f) - vue.center;   // du centre du viewport au centre du bouton
            float cacheV = corps.size.y - vue.height, cacheH = corps.size.x - vue.width;            // ce que le content cache, par axe
            sr.StopMovement();
            // 1 = haut / 0 = gauche : un bouton sous le centre (ecart.y < 0) fait descendre la position, un bouton à droite (ecart.x > 0) la fait monter
            if (sr.vertical && cacheV > 0f) sr.verticalNormalizedPosition = Mathf.Clamp01(sr.verticalNormalizedPosition + ecart.y / cacheV);
            if (sr.horizontal && cacheH > 0f) sr.horizontalNormalizedPosition = Mathf.Clamp01(sr.horizontalNormalizedPosition + ecart.x / cacheH);
            return (content.anchoredPosition - avant).sqrMagnitude > 1e-6f;
        }

        /// <summary>Le nombre de pixels de `zone` dont le plus grand écart de canal R/G/B (octets) entre `a` et `b` atteint `seuilCanal`.</summary>
        public static int CompterEcart(Color32[] a, Color32[] b, int largeur, RectInt zone, int seuilCanal)
        {
            if (a == null || b == null) throw new ArgumentNullException(a == null ? nameof(a) : nameof(b));
            if (a.Length != b.Length) throw new ArgumentException("deux photos de tailles différentes : " + a.Length + " ≠ " + b.Length);
            int hauteur = a.Length / largeur;
            int n = 0;
            for (int y = Mathf.Max(0, zone.yMin); y < Mathf.Min(hauteur, zone.yMax); y++)
                for (int x = Mathf.Max(0, zone.xMin); x < Mathf.Min(largeur, zone.xMax); x++)
                {
                    Color32 p = a[y * largeur + x], q = b[y * largeur + x];
                    int ecart = Mathf.Max(Mathf.Abs(p.r - q.r), Mathf.Max(Mathf.Abs(p.g - q.g), Mathf.Abs(p.b - q.b)));
                    if (ecart >= seuilCanal) n++;
                }
            return n;
        }

        /// <summary>`CompterEcart` au seuil de perception : 3/255.</summary>
        public static int CompterEcart(Color32[] a, Color32[] b, int largeur, RectInt zone)
        {
            return CompterEcart(a, b, largeur, zone, SeuilOctets);
        }

        // ------------------------------------------------------------------------------ l'appui
        public static PointerEventData Doigt()
        {
            return new PointerEventData(EventSystem.current) { button = PointerEventData.InputButton.Left };
        }

        /// <summary>Un `PointerDown` livré à tous les gestionnaires du GameObject (le `Button`, le `RetourAppui`), comme le ferait l'EventSystem.</summary>
        public static void Appuyer(GameObject cible)
        {
            ExecuteEvents.Execute(cible, Doigt(), ExecuteEvents.pointerDownHandler);
        }

        public static void Relacher(GameObject cible)
        {
            ExecuteEvents.Execute(cible, Doigt(), ExecuteEvents.pointerUpHandler);
        }

        // horloge de relevé : strictement croissante d'un appel à l'autre. La régie de test est à horloge `Figee` (son `Update` est inerte) et
        // ses pistes ne prennent pas d'âge au premier `Tick` : un `Tick(0)` répété sur la MÊME régie sauterait l'évaluation du suivant.
        private static float tReleve;

        /// <summary>Repos → appui → `Tick(t)` puis `Tick(t + durée)` (la piste est à sa fin) → photo « sous le doigt » → relâchement → `Tick` →
        /// photo « relâché ». `appuyer` et `relacher` posent et retirent l'appui (l'EventSystem ou un `Attacher` direct) ; la zone est le rect
        /// de `zoneRect` (la cible de l'effet : le `Graphic` du `Melange`, le GameObject du `CanvasGroup` du voile). La `regie` est celle de
        /// `RegieMouvement.PourTest()` ; son horloge n'est pas consultée, les `Tick` sont posés à la main.</summary>
        public static MesureAppui MesurerAppui(Canvas canvas, int largeur, int hauteur, RectTransform zoneRect, Regie regie,
            Action appuyer, Action relacher)
        {
            if (regie == null) throw new ArgumentNullException(nameof(regie));
            RectInt zone = RectPixels(zoneRect, canvas, largeur, hauteur);
            Color32[] repos = Photographier(canvas, largeur, hauteur);

            appuyer();
            tReleve += 1f;
            regie.Tick(tReleve);
            regie.Tick(tReleve + DureeAppuiS);
            Color32[] sousLeDoigt = Photographier(canvas, largeur, hauteur);

            relacher();
            regie.Tick(tReleve + 2f * DureeAppuiS);
            Color32[] relache = Photographier(canvas, largeur, hauteur);

            return new MesureAppui(zone, repos, sousLeDoigt, relache,
                CompterEcart(repos, sousLeDoigt, largeur, zone),
                CompterEcart(repos, relache, largeur, zone, SeuilResiduOctets));
        }

        // ------------------------------------------------------------------------------ les chemins
        /// <summary>Le chemin hiérarchique « Racine/Enfant/… » d'un Transform.</summary>
        public static string Chemin(Transform t)
        {
            if (t == null) return "<nul>";
            var noms = new List<string>();
            for (Transform x = t; x != null; x = x.parent) noms.Add(x.name);
            noms.Reverse();
            return string.Join("/", noms);
        }

        // ------------------------------------------------------------------------------ les juges PURS (null = vert)
        private static string SeuilTexte => SeuilOctets + "/255";

        /// <summary>GE1 — l'effet du `Melange` franchit le plancher (≥ 12 pixels à ≥ 3/255).</summary>
        public static string JugerGE1(string chemin, int n)
        {
            if (n >= Retour.PlancherPixels) return null;
            return "GE1 : " + chemin + " — " + n + " pixels franchissent " + SeuilTexte + ", attendu ≥ " + Retour.PlancherPixels
                   + " : réglage valide, effet nul";
        }

        /// <summary>GE2 — l'effet du voile franchit le plancher, mesuré sur le rect du GameObject qui porte le `CanvasGroup`. Le message exigé
        /// dit « 0 pixel » : la forme singulière suit `n` (0 ou 1), le pluriel au-delà, pour ne jamais mentir sur un voile à 5 pixels.</summary>
        public static string JugerGE2(string chemin, int n, string nomCibleVoile)
        {
            if (n >= Retour.PlancherPixels) return null;
            return "GE2 : " + chemin + " — voile sans encre sur " + nomCibleVoile + " : " + n + (n > 1 ? " pixels" : " pixel");
        }

        /// <summary>GE4 — l'appui sous un `ContentSizeFitter` ancêtre rend un handle ; nul ⇒ rouge, avec la raison de la régie (le texte exigé
        /// n'a pas de chemin : ce montage est synthétique, jamais compté).</summary>
        public static string JugerGE4(bool handleNul, string raison)
        {
            if (!handleNul) return null;
            return "GE4 : handle nul sous un ContentSizeFitter ancêtre — " + raison;
        }

        /// <summary>GS0 — structurelle uGUI : la cible porte son `CanvasRenderer` (lu par `GetComponent`, JAMAIS par `Graphic.canvasRenderer`, qui
        /// le POSE s'il manque : un relevé ne répare rien) ; sous un `Mask` actif, elle est un `MaskableGraphic` à `maskable` vrai.</summary>
        public static string JugerGS0(Component cible, string chemin)
        {
            if (cible == null) throw new ArgumentNullException(nameof(cible));
            if (cible.GetComponent<CanvasRenderer>() == null)
                return "GS0 : " + chemin + " — surface sans CanvasRenderer : rien ne sera dessiné";
            Transform parent = cible.transform.parent;
            Mask masque = null;
            if (parent != null)
            {
                Mask[] masques = parent.GetComponentsInParent<Mask>(false);
                for (int i = 0; i < masques.Length && masque == null; i++) if (masques[i].enabled) masque = masques[i];
            }
            if (masque != null)
            {
                var maskable = cible as MaskableGraphic;
                if (maskable == null || !maskable.maskable)
                    return "GS0 : " + chemin + " — surface non maskable sous le Mask " + masque.name + " : le masque ne la découpera pas";
            }
            return null;
        }

        /// <summary>GS2 — un `Button` porte EXACTEMENT un `RetourAppui`.</summary>
        public static string JugerGS2(string chemin, int nRetourAppui)
        {
            if (nRetourAppui == 1) return null;
            return "GS2 : " + chemin + " porte " + nRetourAppui + " RetourAppui, attendu 1";
        }

        /// <summary>GS2 sur un écran monté : chaque `Button` de `GetComponentsInChildren&lt;Button&gt;(true)` (actif ou non, pressable ou non —
        /// un bouton désactivé garde son composant) est jugé. Une ligne par bouton fautif ; vide = vert. Ne pose rien.</summary>
        public static List<string> ReleverGS2(GameObject racine)
        {
            if (racine == null) throw new ArgumentNullException(nameof(racine));
            var rouges = new List<string>();
            foreach (Button b in racine.GetComponentsInChildren<Button>(true))
            {
                string verdict = JugerGS2(Chemin(b.transform), b.GetComponents<RetourAppui>().Length);
                if (verdict != null) rouges.Add(verdict);
            }
            return rouges;
        }
    }
}
