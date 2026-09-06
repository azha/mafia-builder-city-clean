using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Tests;   // SeederSupport.SafeCallsign
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>screen_c1 « Journal » — squelette de suite généré par Tools/nouvel-ecran.py.
    ///
    /// ⛔ CE QUE CE SQUELETTE COUVRE : le montage structurel (CanvasRenderer, MaskableGraphic) et
    /// la capture pour le juge visuel. ⛔ CE QU'IL NE COUVRE PAS, et c'est // MÉTIER ICI partout
    /// où il manque : le PARCOURS joueur qui atteint cet écran (doctrine 4-couches, `CLAUDE.md`
    /// § « quatre couches ») — signup → `session/open` → la route, jamais un seed SQL sans le
    /// dire dans le nom du test. Le patron complet est `ReputationScreenPlayModeTests` (㊲,
    /// `pilote-B`) : `OuvrirJoueurFrais()` (signup + `session/close` défensif + lecture d'un
    /// lieutenant du kit de départ) — à adapter ici selon ce que `GetNewsFeed` exige
    /// réellement comme précondition.</summary>
    [Category("ScreenC1")]
    public class JournalScreenPlayModeTests
    {
        private GameObject hostGo;
        private int seq;

        [TearDown]
        public void TearDown()
        {
            GameObject reste = GameObject.Find("JournalRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("JournalRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("JournalRoot");
            Assert.IsNotNull(r, "JournalRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private JournalScreenController MonterEcran()
        {
            hostGo = new GameObject("JournalScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<JournalScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<JournalScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest]
        public IEnumerator ScreenC1S1_ToutGraphic_PorteSonCanvasRenderer()
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
        // ⛔⛔ LA CATÉGORIE GÉNÉRIQUE DES CAPTURES ÉTAIT CODÉE EN DUR ICI, et ce gabarit produit les 46
        /// écrans restants. Deux défauts d'un coup, à chaque écran généré :
        /// (a) la capture n'était adressable QUE par `Capture`, donc pas isolable de ses soeurs ;
        /// (b) `Capture` fait SIGSEGV dans le pilote Mesa (mesuré dans ce dépôt), donc la seule
        ///     demande qui l'atteignait est aussi celle qui tue le run.
        /// ⇒ Une capture livrée par ce gabarit était **armée et injoignable** — exactement le
        ///   défaut que le chantier joignabilité ferme côté ÉCRANS, ici côté TESTS.
        /// ⚠️ Et le préfixe est `Photo`, pas `Capture` : le filtre d'Unity matche par PRÉFIXE, donc
        ///   `Capture<Ecran>` serait emporté par une demande de `Capture` — le piège qui a mordu
        ///   trois sessions le 2026-09-02 (`["HUD"]`→`HUDv31`, `["CaptureDetail"]`→
        ///   `CaptureDetailMutant`, et ma propre série de noms, refusée par ma propre garde).
        [UnityTest, Category("PhotoScreenC1")]
        public IEnumerator ScreenC1C1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {
            // ⛔⛔ ON SE CONNECTE AU COMPTE SERVI. Cette suite ne s'authentifiait PAS : l'écran
            // était monté sans jeton, `Amorcer()` sortait aussitôt, et la capture photographiait
            // un écran JAMAIS CHARGÉ. Mesuré le 2026-09-04 : 12 des 17 suites de capture de ce
            // dépôt étaient dans ce cas.
            // ★ *Une capture ne mesure pas l'écran : elle mesure l'écran ET le monde qu'on lui a
            //   donné.* Sans données, « cassé » et « correctement vide » rendent la MÊME image.
            // ⚠️ La garde anti-vacuité ci-dessous restait donc satisfaite par la coquille : elle
            //    vérifiait qu'il Y A du texte, sur un écran qui n'avait rien à dire.
            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = "http://localhost" };
            string token = null, err = null;
            yield return auth.SignIn("operational_demo@example.test", "operational-demo-pw",
                                     t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion au compte de démo échouée : {err}");

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return null;
            yield return ecran.Charger();
            yield return null;

            // Le vide RENDU et le vide SUBI ont la même image (patron ㊴).
            Assert.IsNull(ecran.DerniereErreur,
                // ⛔ LE CODE SEUL NE SUFFIT PAS. Première version : elle imprimait « code 422 »
                // et rien d'autre — j'ai dû relancer un run entier pour apprendre POURQUOI.
                // *Une garde qui nomme le symptôme sans le motif coûte un aller-retour à chaque
                // fois qu'elle mord*, et c'est justement quand elle mord qu'on est pressé.
                $"la route a échoué (code {ecran.DernierCodeErreur} — {ecran.DerniereErreur}) : " +
                "la capture montrerait l'état d'indisponibilité, pas le journal");
            Assert.IsNotNull(ecran.DernierChargement, "aucun corps reçu — rien à photographier");

            // ⛔ GARDE ANTI-VACUITÉ — elle manquait, et la PREMIÈRE capture de ㊳ est partie MUETTE :
            // enseigne sans sous-titre, trois « 00 » sans libellé, panneau vide, test VERT.
            // ★ Un PNG d'une coquille est un PNG parfaitement valide. Rien dans le verdict ne
            //   distingue « l'écran s'est dessiné » de « l'écran s'est dessiné et n'a rien à
            //   dire » — seule une garde sur le CONTENU les sépare.
            // ⚠️ On n'exige PAS de données : cet écran est monté sans session, et son état
            //   « pas encore chargé » est légitime. On exige qu'il le DISE.
            var textes = new List<string>();
            foreach (TMPro.TextMeshProUGUI t in RacineEcran()
                         .GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                if (!string.IsNullOrWhiteSpace(t.text)) textes.Add(t.name);
            Assert.GreaterOrEqual(textes.Count, 8,
                "㊳ ne pose que " + textes.Count + " texte(s) non vides — la capture montrerait " +
                "une coquille : enseigne, trois compteurs avec leurs libellés et le panneau font " +
                "au moins huit. Vus : [" + string.Join(", ", textes) + "]");

            yield return CapturerA(1080, 1920, "Assets/Screenshots/screen_c1_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/screen_c1_1080x2400.png");
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "JournalRoot n'est sous aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamScreenC1");
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
            // ⛔ TD-554 : ce plancher était `horsFond > 0` — il n'exigeait QUE que l'image ne
            // soit pas d'une seule couleur, donc un écran VIDE le franchissait. Il venait du
            // gabarit de `Tools/nouvel-ecran.py`, avec son excuse « plancher volontairement bas,
            // à durcir une fois BuildLayout() rempli » : aucun écran n'est jamais revenu le
            // durcir. *Une dette écrite dans un gabarit n'est pas une dette, c'est une politique.*
            // La PROPORTION de pixels hors dominante est de toute façon la mauvaise grandeur —
            // l'anticrénelage d'un titre en produit autant qu'une mise en page. Le NOMBRE DE
            // TEINTES tranche. Seuils repris de `CaptureSousShell`.
            // ⛔ AVERTISSEMENT, PAS ASSERTION (2026-09-04) : cet écran est capturé SEUL, sur un
            // compte souvent frais. Son état vide rend légitimement 8 à 9 teintes, et asserter
            // ici ferait rougir un écran CORRECT — mesuré sur ㉜ et ㉝, à qui je l'ai failli.
            // *Une garde chromatique ne distingue pas « cassé » de « correctement vide ».*
            if (histo.Count <= 12)
                Debug.LogWarning($"[CAPTURE] {largeur}x{hauteur} — {histo.Count} teintes : un FOND " +
                    "avec un titre. Vérifier QUEL COMPTE la suite ouvre avant de conclure.");
            Assert.IsTrue(largeur >= 200 && hauteur >= 200,
                $"capture {largeur}x{hauteur} : une dimension sous 200 px — un RectTransform resté " +
                "à sa taille par défaut (100x100) ne leve AUCUNE erreur console et rend une image plausible");

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