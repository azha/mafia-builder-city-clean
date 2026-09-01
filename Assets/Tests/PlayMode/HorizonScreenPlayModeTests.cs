using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;   // REUSE AuthClient (signin)
using MafiaCleanCity.Operational;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>screen_c6 « Horizon » — squelette de suite généré par Tools/nouvel-ecran.py.
    ///
    /// ⛔ CE QUE CE SQUELETTE COUVRE : le montage structurel (CanvasRenderer, MaskableGraphic) et
    /// la capture pour le juge visuel. ⛔ CE QU'IL NE COUVRE PAS, et c'est // MÉTIER ICI partout
    /// où il manque : le PARCOURS joueur qui atteint cet écran (doctrine 4-couches, `CLAUDE.md`
    /// § « quatre couches ») — signup → `session/open` → la route, jamais un seed SQL sans le
    /// dire dans le nom du test. Le patron complet est `ReputationScreenPlayModeTests` (㊲,
    /// `pilote-B`) : `OuvrirJoueurFrais()` (signup + `session/close` défensif + lecture d'un
    /// lieutenant du kit de départ) — à adapter ici selon ce que `GetMetaHorizonFeed` exige
    /// réellement comme précondition.</summary>
    [Category("ScreenC6")]
    public class HorizonScreenPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            GameObject reste = GameObject.Find("HorizonRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("HorizonRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("HorizonRoot");
            Assert.IsNotNull(r, "HorizonRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private HorizonScreenController MonterEcran()
        {
            hostGo = new GameObject("HorizonScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<HorizonScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<HorizonScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest]
        public IEnumerator ScreenC6S1_ToutGraphic_PorteSonCanvasRenderer()
        {
            MonterEcran();
            yield return null;   // laisser Awake()/BuildLayout() s'exécuter

            var sansRenderer = new List<string>();
            var nonMaskable = new List<string>();
            int comptes = 0;
            foreach (Graphic g in RacineEcran().GetComponentsInChildren<Graphic>(true))
            {
                comptes++;
                if (g.GetComponent<CanvasRenderer>() == null) sansRenderer.Add(g.name);
                if (!(g is MaskableGraphic)) nonMaskable.Add(g.name);
            }

            Assert.Greater(comptes, 0,
                "0 Graphic dans l'arbre — l'écran n'a pas été construit, la garde suivante " +
                "serait vraie À VIDE");
            Assert.IsEmpty(sansRenderer,
                "des Graphic sans CanvasRenderer ne dessinent RIEN, en silence : " +
                string.Join(", ", sansRenderer));
            Assert.IsEmpty(nonMaskable,
                "des Graphic non-MaskableGraphic ignoreraient tout Mask parent (un `Graphic` nu " +
                "dérivé sur mesure, jamais `UnityEngine.UI.Image`/`TextMeshProUGUI`) : " +
                string.Join(", ", nonMaskable));
        }

        // ═══ 2. CAPTURE pour le juge visuel ⊥ — deux résolutions ══════════════════════════════

        /// <summary>Patron ㊲ (`CapturerA`) : bascule le Canvas en `ScreenSpaceCamera` sur une
        /// `RenderTexture` de la taille CIBLE (le batchmode reste bloqué à 640 de large — capturer
        /// une résolution qu'on n'a pas passe par la caméra, pas par `-screen-width`), reconstruit
        /// le layout APRÈS la bascule (sinon on photographie une géométrie calculée pour 640), et
        /// cadre l'ortho sur le rect RÉEL du canvas (pas sur la résolution demandée : le
        /// CanvasScaler change les unités).
        ///
        /// ⚠️ `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux, d'où
        /// les `yield return null` avant tout rendu.</summary>
        [UnityTest, Category("Capture")]
        public IEnumerator ScreenC6C1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {
            MonterEcran();
            yield return null;

            yield return CapturerA(1080, 1920, "Assets/Screenshots/screen_c6_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/screen_c6_1080x2400.png");
        }

        /// <summary>㊱ — capture de l'ÉTAT VIDE, chargé par le vrai chemin réseau.
        ///
        /// ⚠️ Le nom du fichier porte `_etat-vide_` et ce n'est pas décoratif : cet écran est un
        /// écran de LISTE et la liste est vide. Rangée sans ce mot, la capture serait relue plus
        /// tard comme « l'écran ㊱ », et son cadre vide passerait pour la mise en page voulue.
        ///
        /// ⛔ Pourquoi cet état n'est pas un accident du compte de démo — mesuré par la session
        /// back (sha `e8fce99f`, TD-408) : les 4 capacités vivantes du catalogue portent toutes
        /// `CURRENT_VOCAB_TIER_IS`, une ÉGALITÉ. Un joueur est à un seul palier à la fois, donc
        /// **au plus UNE carte** peut être surfacée — pour aucun joueur, jamais. La maquette
        /// dessine une liste que le back ne peut pas produire. Ça ne se corrige ni par un seed ni
        /// par un réglage : c'est un arbitrage produit, remonté avec l'écran.
        /// ⇒ Cette capture est donc la photo de ce que le jeu produit AUJOURD'HUI, et non celle
        ///   de l'écran qu'on vient voir. `predicate_regressed`, le champ qui porte ㊱, n'a ici
        ///   aucune carte où s'afficher.
        ///
        /// ⛔ On charge par `SignIn` + `Charger()` — PAS par `RendrePourTest`. Un corps fabriqué
        /// prouverait ce que l'écran fait d'un corps, jamais que le serveur l'émet : la capture
        /// perdrait exactement la propriété qui la rend opposable.</summary>
        [UnityTest, Category("Capture"), Category("CaptureHorizon")]
        public IEnumerator ScreenC6C2_CapturerEtatVide_ChargeParLeReseau()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string token = null, err = null;
            yield return auth.SignIn("operational_demo@example.test", "operational-demo-pw",
                                     t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion au compte de démo échouée : {err}");

            HorizonScreenController ecran = MonterEcran();
            ecran.SetToken(token);
            yield return null;
            yield return ecran.Charger();
            yield return null;

            // ⛔ Le vide RENDU et le vide SUBI ont la même image. Sans ces deux gardes, une panne
            // réseau produirait une capture identique et je la publierais comme un état du jeu.
            Assert.IsNull(ecran.DerniereErreur,
                $"la route a échoué (code {ecran.DernierCodeErreur}) : cette capture montrerait " +
                "un écran d'indisponibilité, pas l'état vide");
            Assert.IsNotNull(ecran.DernierChargement,
                "aucun corps reçu : le vide affiché ne serait pas celui du serveur");
            int cartes = ecran.DernierChargement.cards == null ? 0 : ecran.DernierChargement.cards.Length;
            Assert.AreEqual(0, cartes,
                $"le compte porte {cartes} carte(s) : ce n'est plus l'état vide, il faut renommer " +
                "la capture — une image nommée `_etat-vide_` qui montre des cartes ment deux fois.");

            yield return CapturerA(1080, 2400,
                "Assets/Screenshots/screen_c6_horizon_etat-vide_1080x2400.png");

            AucuneCouleurNeRecouvreTout("Assets/Screenshots/screen_c6_horizon_etat-vide_1080x2400.png");
        }

        /// <summary>Garde de RECOUVREMENT — la teinte qui domine l'écran doit être un FOND.
        ///
        /// Les gardes structurelles voyaient un `Contour` présent, de la bonne couleur, au bon
        /// endroit de l'arbre, pendant que ce même contour peignait 82,5 % de l'écran en or plein
        /// (un enfant plein cadre est rendu APRÈS le graphique de son parent, quel que soit son
        /// rang de fratrie). Existence et ordre étaient justes ; le rendu était faux.
        ///
        /// ⚠️ CE QUE CETTE GARDE NE MESURE PAS, et c'est ma première version qui se trompait :
        /// **la PART de la teinte dominante ne discrimine rien.** Mesuré des deux côtés —
        /// or fautif 82,5 %, écran correct 77,3 % : les deux mondes se touchent, et sur un écran
        /// de liste VIDE le fond est légitimement écrasant. Un plafond à 70 % refusait l'écran
        /// juste. *Un seuil qui ne sépare pas deux mesures réelles n'est pas une garde.*
        ///
        /// ⇒ Ce qui sépare vraiment les deux : la NATURE de la teinte dominante. Un fond est
        /// sombre (canal max 13 sur la capture juste) ; un accent qui déborde est clair (176 pour
        /// l'or). La garde plafonne donc la LUMINOSITÉ du dominant, pas sa surface — elle attrape
        /// n'importe quel accent qui recouvre, pas seulement cet or-ci, et laisse le fond dominer
        /// autant qu'il le doit.</summary>
        private void AucuneCouleurNeRecouvreTout(string chemin)
        {
            var tex = new Texture2D(2, 2);
            Assert.IsTrue(tex.LoadImage(System.IO.File.ReadAllBytes(chemin)),
                          $"capture illisible : {chemin}");
            var comptes = new Dictionary<Color32, int>();
            Color32[] px = tex.GetPixels32();
            foreach (Color32 c in px)
            {
                var k = new Color32(c.r, c.g, c.b, 255);
                comptes.TryGetValue(k, out int n); comptes[k] = n + 1;
            }
            KeyValuePair<Color32, int> dom = new KeyValuePair<Color32, int>(default, 0);
            foreach (var kv in comptes) if (kv.Value > dom.Value) dom = kv;
            float part = 100f * dom.Value / px.Length;
            int vif = Mathf.Max(dom.Key.r, Mathf.Max(dom.Key.g, dom.Key.b));
            Debug.Log($"[RECOUVREMENT] dominante rgb({dom.Key.r},{dom.Key.g},{dom.Key.b}) " +
                      $"= {part:0.0} % · canal max {vif} · {comptes.Count} teintes");

            // 13 (fond juste) contre 176 (or fautif) : le seuil se pose dans le vide entre les deux
            // mesures, pas au bord de l'une d'elles.
            Assert.Less(vif, 90,
                $"la teinte qui couvre {part:0.0} % de l'écran est rgb({dom.Key.r},{dom.Key.g}," +
                $"{dom.Key.b}), canal max {vif} : c'est un ACCENT, pas un fond — quelque chose " +
                "recouvre la mise en page au lieu de la border.");
            Assert.Greater(comptes.Count, 200,
                $"seulement {comptes.Count} teintes distinctes (1034 sur la capture de référence, " +
                "478 quand l'or recouvrait tout) : l'écran n'a probablement rien rendu.");
            Object.DestroyImmediate(tex);
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "HorizonRoot n'est sous aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamScreenC6");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;

            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;

            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)racine.transform);
            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;

            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;

            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            System.IO.File.WriteAllBytes(chemin, tex.EncodeToPNG());

            // Anti-vacuité de FORME (patron ㊲) : une capture ratée est UNIFORME, peu importe sa
            // couleur — on compte les pixels qui diffèrent du fond dominant, pas les pixels
            // "clairs" (le fond lui-même peut être clair).
            Color[] pixels = tex.GetPixels();
            var histo = new Dictionary<int, int>();
            foreach (Color c in pixels)
            {
                int k = (Mathf.RoundToInt(c.r * 31) << 10) | (Mathf.RoundToInt(c.g * 31) << 5) | Mathf.RoundToInt(c.b * 31);
                histo.TryGetValue(k, out int n); histo[k] = n + 1;
            }
            int dominant = 0;
            foreach (var kv in histo) if (kv.Value > dominant) dominant = kv.Value;
            int horsFond = pixels.Length - dominant;
            Assert.Greater(horsFond, 0,
                $"capture {largeur}x{hauteur} entièrement UNIFORME — l'écran n'a rien rendu " +
                "hors de son propre fond (plancher volontairement bas : le squelette n'a pas " +
                "encore de contenu MÉTIER ICI ; le durcir une fois BuildLayout() rempli)");

            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.Destroy(camGo);
            rt.Release();
            yield return null;
        }

        // MÉTIER ICI — ajouter ici les tests de PARCOURS (signup → session/open → la route) et
        // les tests d'état (AppliquerEtat sur un corps fabriqué via RendrePourTest), patron ㊲
        // §§ 1/3/5 de ReputationScreenPlayModeTests.
    }
}
