using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap
{
    /// <summary>①-4 (2026-09-23, écart ① `e2bd7681` M9/D5) — LE GYROPHARE du flic en planque : la descente se voit DANS LA VILLE.
    /// Source (`hud-brennar.html:72-76`), recopiée :
    ///   `.gyro{position:absolute;left:23%;top:56.5%;width:60px;height:36px;opacity:0;transition:opacity .5s;
    ///    background:radial-gradient(closest-side,#ff5a3cbb,#ff5a3c00 70%);animation:gyroflip 0.9s infinite}`
    ///   `.tel.descente .gyro{opacity:1}` · `.tel.jour .gyro{opacity:0}`
    ///   `@keyframes gyroflip{0%,100%{filter:hue-rotate(0deg)}50%{filter:hue-rotate(-140deg)}}`
    /// POSITION — mesurée par l'atelier (`22-…` §7.2, `c59ed038`) sur le fond de D : la lueur CENTRÉE sur le gyrophare de la
    /// voiture de police peinte dans l'art, (410, 975) ± 5 px de l'art 1080×1920, à la taille du canon (165 × 99 px d'art).
    /// Reporter le décalage du canon (fond ZO) tomberait sur un toit dans D.
    /// ⚠️ La position est une propriété de l'ART, pas du district : un fond absent de la table n'a PAS de gyrophare. Deviner
    /// où serait la voiture d'un autre fond serait poser une lueur au hasard.
    /// ⚠️ Le jour, pas de lueur (`.tel.jour .gyro{opacity:0}`) : le canon, tel quel. L'atelier laisse la question ouverte
    /// (« garder le canon, ou l'allumer aussi le jour : à trancher avec le rendu »).
    /// Écarts DÉCLARÉS :
    ///   · l'extinction est en cosinus (`ProceduralUI.VoileRadial`), pas linéaire jusqu'à 70 % : la rampe linéaire se quantifie
    ///     en paliers visibles (mesuré par un juge sur le voile d'en-tête) ; même centre, même fin ;
    ///   · `hue-rotate` est calculé par la matrice CSS (espace sRGB, comme le rendent les navigateurs pour la fonction
    ///     raccourcie).
    /// E2a (design-couche-mouvement.md §9) : la lueur ne tourne plus dans un `Update` — c'est une piste `Alerte` `Hue` de la régie
    /// (`chrome.gyrophare`, `ease` à chaque image clé, `CouleurA` = `#ff5a3c`). `TeinteA` et `HueRotate` restent comme ENVELOPPES de
    /// la même courbe et de `Couleurs.HueRotate`.</summary>
    public sealed class Gyrophare : MonoBehaviour
    {
        /// <summary>Le centre de la lueur, en px de l'art (origine en haut à gauche), par texture de fond.</summary>
        private static readonly Dictionary<string, Vector2> CentreParArt = new Dictionary<string, Vector2>
        {
            { "VERGE_D_NUIT_FINAL", new Vector2(410f, 975f) },
            { "VERGE_D_JOUR_FINAL", new Vector2(410f, 975f) },   // même caméra : la voiture ne bouge pas
        };

        public static readonly Vector2 TailleArtPx = new Vector2(165f, 99f);
        private const float AlphaCentre = 0xbb / 255f;   // `#ff5a3cbb`
        private const float FinEnFraction = 0.70f;        // `#ff5a3c00 70%`

        /// <summary>La teinte du canon, `#ff5a3c` — la lueur n'a pas de jeton (aucun autre élément ne la porte).</summary>
        public static Color Teinte
        {
            get { ColorUtility.TryParseHtmlString("#ff5a3c", out Color c); return c; }
        }

        private Image image;
        private Handle piste = Handle.Nul;
        private RectTransform cibleDeLaPiste;

        /// <summary>Le centre de la lueur pour ce fond, ou faux s'il n'est pas dans la table.</summary>
        public static bool CentreDansLArt(Texture2D art, out Vector2 centrePx)
        {
            centrePx = default;
            return art != null && CentreParArt.TryGetValue(art.name, out centrePx);
        }

        /// <summary>Allumé la NUIT, pendant une descente, sur un fond dont la voiture est connue.</summary>
        public static bool DoitSAllumer(bool descente, string mode, Texture2D art) =>
            descente && mode == "nuit" && CentreDansLArt(art, out _);

        /// <summary>Pose la lueur sous `scene`, sur le rect du fond (`fondRt`, ancré au centre) : même transformation que le fond,
        /// donc elle suit le pan et le zoom. Rend null si elle ne doit pas s'allumer.</summary>
        public static Gyrophare Poser(RectTransform scene, RectTransform fondRt, Texture2D art, float scaleFactor)
        {
            if (!CentreDansLArt(art, out Vector2 c)) return null;
            var go = new GameObject("Gyrophare", typeof(RectTransform));
            go.transform.SetParent(scene, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = rt.pivot = new Vector2(0.5f, 0.5f);
            float sf = scaleFactor > 0f ? scaleFactor : 1f;
            rt.anchoredPosition = fondRt.anchoredPosition
                                  + new Vector2(c.x - art.width * 0.5f, art.height * 0.5f - c.y) / sf;
            rt.sizeDelta = TailleArtPx / sf;
            var g = go.AddComponent<Gyrophare>();
            g.image = go.AddComponent<Image>();
            Color blanc = Color.white;
            blanc.a = AlphaCentre;
            // Texture BLANCHE teinte par `Image.color` : la teinte tourne à chaque image sans refaire la texture.
            g.image.sprite = ProceduralUI.VoileRadial(128, blanc, new Vector2(0.5f, 0.5f), 0.5f, 0.5f, FinEnFraction);
            g.image.type = Image.Type.Simple;
            g.image.raycastTarget = false;
            g.image.color = TeinteA(0f);
            g.cibleDeLaPiste = rt;
            g.piste = RegieMouvement.Attacher(CatalogueHud.Gyrophare, rt, Reglage.Defaut);
            return g;
        }

        /// <summary>La teinte à l'instant `t` (s) : `hue-rotate` de 0 à −140° et retour, sur 0,9 s. ENVELOPPE : la courbe du catalogue
        /// (`chrome.gyrophare`), `ease` à chaque image clé ; aux bornes (0 / 0,45 / 0,9 s) ce sont les images clés.</summary>
        public static Color TeinteA(float t)
        {
            MouvementDefini m = CatalogueHud.Gyrophare.Mouvement;
            float phase = Mathf.Repeat(t, m.PeriodeS) / m.PeriodeS;              // 0..1
            return Couleurs.HueRotate(Teinte, Courbes.EvaluerCanal(m.Canaux[0], phase));
        }

        /// <summary>La matrice `hue-rotate` du CSS (Filter Effects §feColorMatrix), sur les composantes telles qu'écrites. ENVELOPPE
        /// de `Couleurs.HueRotate` (design §1 : elle est descendue dans `ShellContracts`) ; un seul appelant externe, un test.</summary>
        public static Color HueRotate(Color c, float deg) => Couleurs.HueRotate(c, deg);

        /// <summary>La régie libère une piste dont la cible est restée inactive plus de 30 s (design §4) : à la réactivation du district,
        /// la lueur se ré-attache (revue de code E2a, M2) — sinon elle resterait figée sur sa teinte de base à vie.</summary>
        private void OnEnable()
        {
            if (cibleDeLaPiste != null && RegieMouvement.Courante != null && !RegieMouvement.EstVivant(piste))
                piste = RegieMouvement.Attacher(CatalogueHud.Gyrophare, cibleDeLaPiste, Reglage.Defaut);
        }

        private void OnDestroy()
        {
            RegieMouvement.Detacher(piste);
        }
    }
}
