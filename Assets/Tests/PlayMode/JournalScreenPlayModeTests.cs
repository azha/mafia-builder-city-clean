using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
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
            MonterEcran();
            yield return null;

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
    
        // ═══ SONDE DE DONNÉES — mesurer les corps AVANT d'écrire les DTO ═══════════════════

        /// <summary>⛔ CETTE SONDE N'ASSERTE PRESQUE RIEN : elle IMPRIME les corps réels des trois
        /// routes de lecture de ㊳, pour que les DTO soient écrits d'après ce que le serveur
        /// ENVOIE et non d'après ce qu'une interface TypeScript dit qu'il envoie. La doctrine du
        /// dépôt l'exige, et la fiche ② a coûté une demi-journée le 2026-09-02 pour l'avoir
        /// contournée — quatre paramètres documentés qu'aucune route n'émettait plus.
        /// ★ Trois hypothèses plausibles valent moins qu'une mesure. Un run, et les formes sont
        ///   connues.
        /// ⚠️ À SUPPRIMER une fois les DTO écrits : une sonde qui reste devient un test qui
        /// n'affirme rien et qu'on croit protecteur.</summary>
        [UnityTest, Category("JournalSonde")]
        public IEnumerator SondeC1_ImprimerLesCorpsReels()
        {
            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = "http://localhost" };
            string callsign = "sonde-journal-" + System.DateTime.UtcNow.Ticks;
            string token = null, err = null;
            yield return auth.SignUp(callsign, "sonde-journal-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var session = new MafiaCleanCity.Shell.SessionClient { BaseUrl = "http://localhost" };
            yield return session.OpenSession(token, "sonde-journal", _ => { },
                (c, m) => Debug.LogWarning($"[C1-SONDE] session/open {c}: {m}"));

            foreach (string route in new[] { "/v1/news/feed", "/v1/ambient/feed",
                                             "/v1/random-world/active",
                                             "/v1/random-world/known-couplings" })
            {
                using (var req = UnityEngine.Networking.UnityWebRequest.Get("http://localhost" + route))
                {
                    req.timeout = 10;
                    req.SetRequestHeader("Authorization", "Bearer " + token);
                    yield return req.SendWebRequest();
                    string corps = req.downloadHandler != null ? req.downloadHandler.text : "(vide)";
                    if (corps != null && corps.Length > 1800) corps = corps.Substring(0, 1800) + " …TRONQUÉ";
                    Debug.Log($"[C1-SONDE] {route} -> {req.responseCode}\n{corps}");
                }
            }
        }

}
}