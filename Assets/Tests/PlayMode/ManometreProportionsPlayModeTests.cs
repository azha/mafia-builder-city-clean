using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    /// <summary>LES PROPORTIONS DU MANOMÈTRE, MESURÉES SUR L'OBJET RENDU.
    ///
    /// ⛔⛔⛔ POURQUOI CET ORACLE EXISTE ALORS QUE `HUDv31` EST VERTE. Un juge ⊥ a mesuré, sur la
    /// capture, que l'anneau du médaillon pèse **2,18×** l'épaisseur du canon et l'arc **2,49×**,
    /// pour un rayon d'arc **+43 %**. Au même instant les 29 autres tests de `HUDv31` passent : ils
    /// mesurent l'angle de l'aiguille, le cercle inscrit, les liaisons de tokens — **aucun ne
    /// regarde l'épaisseur d'un trait ni le rayon de l'arc**. C'est la forme que ce médaillon a
    /// déjà produite TROIS fois dans ce dépôt : *la garde vérifie la mauvaise propriété*, et un
    /// tableau vert la certifie.
    ///
    /// ★★ CE QUI SE MESURE ICI, ET POURQUOI EN FRACTION DU RAYON. Trois unités coexistent sur cet
    /// objet — les unités de la `viewBox` du SVG source (60×40, rayon 26), les px CSS de la
    /// maquette, et les unités de canvas du jeu. Comparer une épaisseur absolue d'un repère à
    /// l'autre demande un facteur, et un facteur faux produit exactement le genre de verdict
    /// « ×2,5 » qu'on ne sait plus interpréter. **Une fraction du rayon n'a pas d'unité** : elle se
    /// compare directement, quelle que soit la taille à laquelle le médaillon est rendu.
    /// ⇒ Et le RATIO anneau/arc est asserté À PART parce qu'il est la seule grandeur sur laquelle
    ///   les DEUX références s'accordent déjà : le SVG source donne 2/3,5 = **0,571**, le canon du
    ///   juge 1,33/2,33 = **0,571**. Une distorsion qui préserverait ce ratio serait un simple
    ///   changement de taille ; une qui le casse déforme les deux traits INÉGALEMENT, et c'est un
    ///   défaut d'une autre nature.
    ///
    /// ⛔ LE MONDE DÉGÉNÉRÉ QUE CET ORACLE TUE, nommé avant d'écrire l'assertion : **un manomètre
    /// agrandi dont les traits suivent l'agrandissement**. Il satisferait n'importe quelle garde
    /// exprimée en pixels absolus (« l'anneau fait 3 px »), et c'est précisément ce que fait le
    /// jeu — le médaillon est passé de 64 à 68 sans que les grandeurs dérivées suivent. Tout est
    /// donc en fraction du rayon MESURÉ sur l'objet, jamais en valeur absolue.
    ///
    /// ⚠️ CE QU'IL NE MESURE PAS, écrit plutôt que sous-entendu : la couleur, l'angle, la position.
    /// Et il lit la TEXTURE du sprite plus la taille du rect — c'est-à-dire ce que l'écran affiche
    /// — mais pas les pixels de l'écran lui-même. Un effet appliqué APRÈS (un `localScale` sur un
    /// parent, un matériau) lui échapperait. C'est la limite de l'instrument, et elle est déclarée.</summary>
    [Category("HUDv31")]
    public class ManometreProportionsPlayModeTests
    {
        private GameObject shellGo;

        [SetUp] public void Avant() { LogAssert.ignoreFailingMessages = true; }
        [TearDown] public void Apres()
        {
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            LogAssert.ignoreFailingMessages = false;
        }

        /// <summary>L'épaisseur du trait d'un anneau, EN UNITÉS DE CANVAS, lue sur la texture du
        /// sprite puis portée à la taille du rect. `t` px de texture sur `N` px de large rendus
        /// dans `W` unités valent `t · W / N` unités — c'est la définition même de ce qu'on voit.
        /// La lecture part du bord EXTÉRIEUR vers le centre, sur la ligne médiane horizontale.</summary>
        /// <summary>L'épaisseur du trait, en unités de canvas, par les DEUX BORDS À MI-ALPHA.
        ///
        /// ⛔⛔⛔ TROISIÈME VERSION, ET LES DEUX PREMIÈRES ONT ÉTÉ RÉFUTÉES PAR LEUR PROPRE CONTRÔLE
        /// AVANT DE JUGER QUOI QUE CE SOIT — c'est le seul dispositif qui pouvait les attraper :
        ///   · v1, seuil `alpha > 0,5` sur les CENTRES de pixels : lit **1** pour un trait de 3 et
        ///     **3** pour un trait de 5. La frange d'anti-crénelage, un pixel de chaque côté, tombe
        ///     sous le seuil. Le pire n'est pas l'erreur : elle retire la MÊME quantité absolue aux
        ///     deux traits, donc elle laisse les épaisseurs plausibles et **détruit le rapport**
        ///     (1/3 = 0,333 au lieu de 0,600). J'aurais accusé le rendu d'une déformation inégale
        ///     que mon instrument venait de fabriquer. *Deux nombres RONDS sur une mesure continue :
        ///     l'instrument mesurait sa propre grille.*
        ///   · v2, intégrale d'alpha le long du rayon : lit **1,66** pour 3. Une intégrale ne rend
        ///     l'épaisseur nominale que si le noyau de lissage conserve l'aire — celui-ci ne le
        ///     fait pas. *Une correction qui semble « plus continue » n'est pas pour autant juste.*
        ///   · v3, celle-ci : les deux bords estimés au SOUS-PIXEL, là où l'alpha croise 0,5, par
        ///     interpolation linéaire entre les deux pixels qui encadrent la traversée. Pour un
        ///     noyau symétrique — et celui d'un cercle rasterisé l'est — cette position est non
        ///     biaisée, quelle que soit la largeur de la frange.
        ///
        /// La lecture se fait sur la ligne médiane horizontale, à gauche du centre : c'est là que la
        /// normale au cercle est horizontale, donc que l'épaisseur lue EST l'épaisseur radiale.</summary>
        private static float EpaisseurRendue(Image img, out float rayonRendu, out int larg)
        {
            Texture2D tex = img.sprite.texture;
            larg = tex.width;
            int cy = tex.height / 2;
            int demi = tex.width / 2;
            float Alpha(int x) => tex.GetPixel(Mathf.Clamp(x, 0, tex.width - 1), cy).a;

            // Bord EXTÉRIEUR : première traversée montante de 0,5 en venant du vide.
            float bordExt = -1f, bordInt = -1f;
            for (int x = 0; x < demi; x++)
            {
                float a0 = Alpha(x), a1 = Alpha(x + 1);
                if (bordExt < 0f && a0 < 0.5f && a1 >= 0.5f)
                    bordExt = x + (0.5f - a0) / Mathf.Max(1e-4f, a1 - a0);
                else if (bordExt >= 0f && a0 >= 0.5f && a1 < 0.5f)
                {
                    bordInt = x + (a0 - 0.5f) / Mathf.Max(1e-4f, a0 - a1);
                    break;
                }
            }
            float w = ((RectTransform)img.transform).rect.width;
            rayonRendu = w / 2f;
            if (bordExt < 0f || bordInt < 0f) return 0f;
            // ⛔⛔ LA RAMPE SE RAJOUTE, ET C'EST LA CLÉ DES TROIS RÉFUTATIONS. Les deux bords à
            //    mi-alpha d'un trait nominal `t` sont distants de `t − rampe` : la moitié de la
            //    rampe est retranchée de CHAQUE côté. Mesuré 1,50 pour un trait de 3, et
            //    3 − 1,5 = 1,5 — l'instrument lisait juste, c'est mon ATTENTE qui était fausse.
            //    ★ *Trois versions réfutées, et la troisième l'a été par sa propre exactitude* :
            //      la v3 rendait la bonne grandeur, comparée à la mauvaise référence. La rampe est
            //      lue chez le générateur, jamais recopiée — sinon elle dérive le jour où il change.
            float nominalTex = (bordInt - bordExt) + MafiaCleanCity.Shell.ProceduralUI.RampeAntiCrenelagePx;
            return nominalTex * w / tex.width;
        }

        [UnityTest]
        public IEnumerator LAnneauEtLArcGardentLeursPROPORTIONS_PasLeursPixels()
        {
            shellGo = new GameObject("AppShell");
            var shell = shellGo.AddComponent<AppShell>();
            float t = 0f;
            while (shell.TopBar == null && t < 15f) { t += Time.deltaTime; yield return null; }
            Assert.IsNotNull(shell.TopBar, "le bandeau ne s'est pas construit");
            yield return null;
            Canvas.ForceUpdateCanvases();

            Transform mano = shell.TopBar.transform.Find("Manometre");
            Assert.IsNotNull(mano, "pas de Manometre sous le bandeau");
            Image anneau = mano.Find("BoitierRing")?.GetComponent<Image>();
            Image arc = mano.Find("ArcTrack")?.GetComponent<Image>();
            Assert.IsNotNull(anneau, "BoitierRing absent — l'oracle ne mesurerait rien");
            Assert.IsNotNull(arc, "ArcTrack absent — l'oracle ne mesurerait rien");

            float rAnneau, rArc; int texAnneau, texArc;
            float epAnneau = EpaisseurRendue(anneau, out rAnneau, out texAnneau);
            float epArc = EpaisseurRendue(arc, out rArc, out texArc);

            // ANTI-VACUITÉ : une texture vide ou un rect nul rendraient 0, et toute fraction
            // deviendrait 0 — donc « conforme » par effondrement.
            Assert.Greater(rAnneau, 4f, "rayon de l'anneau dégénéré — rien à mesurer");
            Assert.Greater(epAnneau, 0.1f, "épaisseur d'anneau nulle : la texture ne porte aucun trait");
            Assert.Greater(epArc, 0.1f, "épaisseur d'arc nulle : la texture ne porte aucun trait");

            // ⛔ L'INSTRUMENT SE VALIDE AVANT DE JUGER. Les deux sprites sont générés par
            //    `ProceduralUI.Ring(diamètre, épaisseur)` avec des épaisseurs que le code DÉCLARE
            //    (3 et 5 unités de texture). Si la lecture ne les retrouve pas, tout ce qui suit
            //    mesure l'instrument et non l'objet — c'est ce qui est arrivé à sa v1.
            //    ⚠️ La tolérance est large (±0,6) parce qu'un trait lissé sur une grille entière ne
            //      rend pas exactement sa valeur nominale ; elle reste très en dessous des 2 px
            //      d'erreur que la v1 commettait.
            float epTexAnneau = epAnneau * texAnneau / (rAnneau * 2f);
            float epTexArc = epArc * texArc / (rArc * 2f);
            Assert.AreEqual(3f, epTexAnneau, 0.6f,
                $"contrôle de l'instrument : il lit {epTexAnneau:F2} px de trait sur la texture de " +
                "l'anneau, que le code génère à 3. La lecture est fausse, donc tout verdict en aval " +
                "porterait sur elle et non sur le manomètre.");
            Assert.AreEqual(5f, epTexArc, 0.6f,
                $"contrôle de l'instrument : il lit {epTexArc:F2} px de trait sur la texture de " +
                "l'arc, que le code génère à 5.");

            float fracAnneau = epAnneau / rAnneau;
            float fracArc = epArc / rAnneau;          // les DEUX rapportées au rayon du MÉDAILLON
            float fracRayonArc = rArc / rAnneau;
            float ratio = epAnneau / epArc;

            // Les deux références, recopiées de leurs sources et non de mémoire :
            //   SVG source du client (`Tools/hud-topbar-reference-source.html`, rayon 26) :
            //     anneau 2 ⇒ 0,0769 R · arc 3,5 ⇒ 0,1346 R · ratio 0,571
            //   canon du juge (r3 de ①) : anneau 1,33 · arc 2,33 CSS ⇒ ratio 0,571 · rayon d'arc 0,45 R
            const float RatioReference = 2f / 3.5f;
            const float RayonArcCanon = 0.45f;

            Debug.Log($"[① manomètre] rayon médaillon {rAnneau:F2} u (texture {texAnneau} px) · " +
                      $"anneau {epAnneau:F2} u = {fracAnneau:F4} R · arc {epArc:F2} u = {fracArc:F4} R " +
                      $"(texture {texArc} px, rayon {rArc:F2} u = {fracRayonArc:F4} R) · " +
                      $"ratio anneau/arc {ratio:F4} (références : {RatioReference:F4})");

            // ── (1) LE RATIO, la seule grandeur SANS unité, et la seule sur laquelle les deux
            //    références s'accordent déjà. Une taille qui change le préserve ; seule une
            //    déformation INÉGALE des deux traits le casse.
            Assert.AreEqual(RatioReference, ratio, 0.06f,
                $"le ratio anneau/arc rendu vaut {ratio:F3} pour {RatioReference:F3} aux DEUX références " +
                "(SVG source 2/3,5 · canon du juge 1,33/2,33). Les deux traits ne subissent donc pas la " +
                "même transformation — ce n'est pas un changement de taille, c'est une déformation.");

            // ── (2) LE RAYON DE L'ARC, en fraction du rayon du médaillon. C'est la grandeur que le
            //    juge mesure à +43 %, et celle dont le socle a déjà nommé la cause sur cet objet :
            //    un ratio dérivé d'un diamètre de 64 et jamais repris quand il est passé à 68.
            Assert.AreEqual(RayonArcCanon, fracRayonArc, 0.05f,
                $"le rayon de l'arc vaut {fracRayonArc:F3} R pour {RayonArcCanon:F2} R au canon " +
                $"(+{(fracRayonArc / RayonArcCanon - 1f) * 100f:F0} %). L'arc frôle la jante au lieu " +
                "d'être un liseré discret. ⚠️ Cette valeur se DÉRIVE du rayon du médaillon, elle ne " +
                "se recopie pas : un diamètre d'arc figé pendant que le médaillon grandit est " +
                "exactement le défaut que ce dépôt a déjà mesuré ici (48 dérivé d'un médaillon de 64, " +
                "jamais repris à 68).");
        }
    }
}
