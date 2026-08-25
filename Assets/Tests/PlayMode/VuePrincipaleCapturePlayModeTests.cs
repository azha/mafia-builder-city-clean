using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Tests;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Capture.Tests
{
    // Capture de LIVRAISON, demandée par l'user : la vue principale telle qu'il la verra —
    // le district avec SES bâtiments (compte frais ⇒ kit de départ J0) SOUS le chrome v3.1
    // (barre haute laiton + manomètre centré, barre d'onglets en verre).
    // ⚠️ Ce n'est PAS une falsifiable : elle n'asserte que ce qui rendrait la capture MENSONGÈRE
    // (shell monté, district entré, bâtiments réellement rendus). Le pilotage manuel de l'éditeur
    // s'étant révélé peu fiable (une commande sur deux sans réponse), tout est scripté ici.
    [Category("Capture")]
    public class VuePrincipaleCapturePlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int seq;
        private GameObject shellGo;
        private AppShell shell;

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            LogAssert.ignoreFailingMessages = false;
        }

        [UnityTest]
        public IEnumerator Capture_VuePrincipale_DistrictAvecBatiments_SousChromeV31()
        {
            // 1. compte FRAIS : session/open octroie le kit de départ (4 bâtiments J0).
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("vue", ref seq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "vue-capture-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "capture-vue", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open doit réussir — c'est lui qui octroie le kit de départ");

            // 2. le shell REEL, avec cette identité (fenêtre synchrone avant Start()).
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("VuePrincipaleShell");
            shell = shellGo.AddComponent<AppShell>();
            // MESURÉ : AuthClient.SignUp n'envoie QUE { callsign, password } — l'identifiant de
            // connexion est donc le PSEUDONYME, jamais un e-mail dérivé (mon premier jet supposait
            // "callsign@example.test" et le shell n'a jamais pu se connecter).
            shell.SetIdentity(callsign, "vue-capture-pw");
            yield return null;

            // 3. attendre que l'acquisition asynchrone du shell soit terminée (sinon son
            //    ActivateTab(Home) tardif écraserait le district — course mesurée au lot HUD).
            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");
            for (int i = 0; i < 30; i++) yield return null;

            // 4. entrer dans le district par le vrai chemin.
            shell.EnterDistrict(16);
            var district = Object.FindFirstObjectByType<DistrictInteriorScreenController>();
            t0 = Time.realtimeSinceStartup;
            while (district == null && Time.realtimeSinceStartup - t0 < 20f)
            {
                yield return null;
                district = Object.FindFirstObjectByType<DistrictInteriorScreenController>();
            }
            Assert.IsNotNull(district, "l'écran district doit être monté");

            t0 = Time.realtimeSinceStartup;
            while (district.LastFetch == null && district.LastErrorCode == 0
                   && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsNotNull(district.LastFetch,
                $"le payload district doit être arrivé (code d'erreur observé = {district.LastErrorCode})");
            for (int i = 0; i < 20; i++) yield return null;

            // 5. anti-mensonge : la capture ne vaut que si des bâtiments sont VRAIMENT rendus
            //    et si le chrome est là (une capture d'écran vide passerait sinon).
            int batiments = district.LastFetch.buildings == null ? 0 : district.LastFetch.buildings.Length;
            Assert.Greater(batiments, 0, "le kit de départ doit porter des bâtiments — sinon la capture ne montre rien");
            Assert.IsNotNull(shell.TopBar, "le chrome haut doit exister sur la capture");
            Assert.AreEqual(16, shell.CityTabDistrictId, "on doit être DANS le district au moment de la capture");

            ScreenCapture.CaptureScreenshot("Assets/Screenshots/vue_principale_batiments_hud.png");
            for (int i = 0; i < 12; i++) yield return null;
            Debug.Log($"[CAPTURE] vue principale — batiments={batiments} district={shell.CityTabDistrictId} " +
                      $"ecran={Screen.width}x{Screen.height}");
        }

        // ── Capture de la CARTE DE VILLE (l'écran des 18 districts) ───────────────────────────────
        // L'user parle de « l'interface avec la ville », et la carte en fait partie autant que
        // l'intérieur d'un district. La seule capture que le dépôt en portait datait de « JOUR 4 » —
        // une mesure DATÉE, sur laquelle je refuse de conclure. Celle-ci est prise sur le chemin de
        // production, au même compte frais, et s'arrête AVANT d'entrer dans un district.
        // Mêmes gardes anti-mensonge que la capture précédente : sans elles, un écran vide passerait
        // pour une réussite.
        [UnityTest]
        public IEnumerator Capture_CarteDeVille_SousChromeV31()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("carte", ref seq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "carte-capture-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "capture-carte", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open doit réussir");

            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("CarteDeVilleShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, "carte-capture-pw");
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");

            shell.ActivateTab(AppShell.Tab.City);
            var carte = Object.FindFirstObjectByType<CityMapController>();
            t0 = Time.realtimeSinceStartup;
            while (carte == null && Time.realtimeSinceStartup - t0 < 20f)
            {
                yield return null;
                carte = Object.FindFirstObjectByType<CityMapController>();
            }
            Assert.IsNotNull(carte, "l'écran carte doit être monté");

            // MESURÉ (ma première version l'ignorait et la garde anti-mensonge l'a attrapée : « 1
            // noeud ») : monter le contrôleur ne charge RIEN. La carte expose `IsLoaded` et se
            // remplit par sa propre requête — on attend donc l'ÉTAT, jamais un nombre de frames.
            float tAttente = Time.realtimeSinceStartup;
            while (!carte.IsLoaded && Time.realtimeSinceStartup - tAttente < 30f) yield return null;
            Assert.IsTrue(carte.IsLoaded,
                "la carte doit avoir chargé ses districts — sans ça la capture montre un écran vide");
            for (int i = 0; i < 30; i++) yield return null;

            // Anti-mensonge : la carte ne vaut que si elle a VRAIMENT reçu ses districts.
            Assert.IsNotNull(shell.TopBar, "le chrome haut doit exister sur la capture");

            // ⚠️ MA SONDE ÉTAIT FAUSSE et elle a rendu « 1 noeud » deux fois : la carte ne construit
            // PAS sous son propre transform, elle monte un `CityMapRoot` dans le slot de contenu du
            // shell (`CityMapController.cs:232,251`) — exactement comme l'écran district. Compter
            // les enfants du contrôleur, c'était compter le contrôleur.
            // ★ La garde a quand même fait son travail : elle a refusé de produire une image tant que
            // je ne savais pas ce que je mesurais. Une sonde fausse qui aurait rendu « beaucoup »
            // m'aurait laissé publier une capture sans savoir ce qu'elle montre.
            Transform racineCarte = shell.ContentSlot.Find("CityMapRoot");
            Assert.IsNotNull(racineCarte,
                "la carte monte son `CityMapRoot` dans le slot de contenu du shell");
            int noeuds = racineCarte.GetComponentsInChildren<Transform>(true).Length;
            Assert.Greater(noeuds, 20,
                $"la carte doit avoir construit son contenu (mesuré {noeuds} noeuds) — une carte vide " +
                "produirait une image qui ment sur l'état de l'écran");

            ScreenCapture.CaptureScreenshot("Assets/Screenshots/carte_de_ville_hud.png");
            for (int i = 0; i < 12; i++) yield return null;
            Debug.Log($"[CAPTURE] carte de ville — noeuds={noeuds} ecran={Screen.width}x{Screen.height}");
        }

        // ── Capture de NUIT ───────────────────────────────────────────────────────────────────────
        // Le quart du jour d'un fetch RÉEL dépend de `city_sim_clock.game_minute`, seedé au signup
        // depuis `city_epoch` : il n'est PAS déterministe d'une exécution à l'autre. Forcer NIGHT
        // après le fetch est le MÊME geste que font déjà C8F5 et C10F1 pour la même raison — isoler
        // la propriété qu'on regarde. Ici on ne teste rien : on veut simplement pouvoir REGARDER
        // l'écran dans son éclairage de nuit, que personne n'avait encore vu en jeu.
        [UnityTest]
        public IEnumerator Capture_VuePrincipale_Nuit()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("nuit", ref seq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "nuit-capture-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "capture-nuit", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open doit réussir — il octroie le kit de départ");

            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("VueNuitShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, "nuit-capture-pw");
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");
            for (int i = 0; i < 30; i++) yield return null;

            shell.EnterDistrict(16);
            var district = Object.FindFirstObjectByType<DistrictInteriorScreenController>();
            t0 = Time.realtimeSinceStartup;
            while (district == null && Time.realtimeSinceStartup - t0 < 20f)
            {
                yield return null;
                district = Object.FindFirstObjectByType<DistrictInteriorScreenController>();
            }
            Assert.IsNotNull(district, "l'écran district doit être monté");
            t0 = Time.realtimeSinceStartup;
            while (district.LastFetch == null && district.LastErrorCode == 0
                   && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsNotNull(district.LastFetch, "le payload district doit être arrivé");

            district.LastFetch.day_phase = "NIGHT";
            district.Render(district.LastFetch);
            for (int i = 0; i < 20; i++) yield return null;

            // Anti-mensonge : sans ces deux faits, l'image ne montrerait pas ce qu'elle prétend.
            int batiments = district.LastFetch.buildings == null ? 0 : district.LastFetch.buildings.Length;
            Assert.Greater(batiments, 0, "le kit de départ doit porter des bâtiments");
            Transform fondT = district.ScreenRoot.Find("DistrictScene/DistrictBackgroundImage");
            Assert.IsNotNull(fondT, "un fond de NUIT doit être monté — sinon la capture n'est pas de nuit");

            ScreenCapture.CaptureScreenshot("Assets/Screenshots/vue_principale_nuit.png");
            for (int i = 0; i < 12; i++) yield return null;
            Debug.Log($"[CAPTURE] vue de nuit — batiments={batiments} ecran={Screen.width}x{Screen.height}");
        }

        /// <summary>Rend le shell dans une cible hors écran d'une taille donnée et l'enregistre.
        ///
        /// Le canvas passe temporairement en `ScreenSpaceCamera` sur une caméra qui vise une
        /// `RenderTexture` : le `CanvasScaler` recalcule alors son facteur d'échelle depuis la
        /// taille de la CIBLE, et toute la mise en page reflue pour de bon. On rend l'état
        /// d'origine ensuite — un test qui laisse le shell dans un autre mode contaminerait tous
        /// ses voisins du même processus.</summary>
        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            Canvas canvas = shell.ShellCanvas;
            Assert.IsNotNull(canvas, "le shell doit avoir un canvas pour être rendu hors écran");
            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCam");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;

            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;               // laisser la passe de layout s'appliquer
            Canvas.ForceUpdateCanvases();
            yield return null;

            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            System.IO.File.WriteAllBytes(chemin, tex.EncodeToPNG());

            // ⛔ ANTI-MENSONGE : une cible noire produirait un PNG parfaitement valide et vide.
            int clairs = 0;
            foreach (Color c in tex.GetPixels())
                if (c.r + c.g + c.b > 0.15f) clairs++;
            Debug.Log($"[CAPTURE] {largeur}x{hauteur} — {clairs} pixels non noirs sur {largeur * hauteur}");
            Assert.Greater(clairs, largeur * hauteur / 20,
                $"la capture {largeur}x{hauteur} est quasi NOIRE ({clairs} pixels) : le shell n'a pas " +
                "été rendu dans la cible, et le fichier passerait pourtant pour une réussite.");

            UnityEngine.Object.DestroyImmediate(tex);
            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            UnityEngine.Object.DestroyImmediate(camGo);
            rt.Release();
            UnityEngine.Object.DestroyImmediate(rt);
            Canvas.ForceUpdateCanvases();
            yield return null;
        }

        /// <summary>Cherche un descendant par nom, inactifs compris. `Transform.Find` ne
        /// descend que d'un niveau par segment de chemin et exige le chemin exact ; ici on veut le
        /// nom, où qu'il soit dans l'arbre du shell.</summary>
        private static Transform TrouverEnfant(Transform racine, string nom)
        {
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true))
                if (t.name == nom) return t;
            return null;
        }

        // ── Capture de l'écran des LIEUTENANTS (onglet Org) ───────────────────────────────────────
        // Cible : `Tools/family-organigramme-reference-1120.png` (« LA FAMILLE — l'organigramme »,
        // maquette ratifiée user). Cette capture existe pour MESURER l'écart, pas pour le certifier.
        [UnityTest]
        public IEnumerator Capture_EcranLieutenants_SousChromeV31()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("lieut", ref seq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "lieut-capture-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "capture-lieut", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open doit réussir — il octroie le kit de départ (2 lieutenants)");

            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("LieutenantsShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, "lieut-capture-pw");
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");

            shell.ActivateTab(AppShell.Tab.Org);
            for (int i = 0; i < 90; i++) yield return null;

            // Anti-mensonge : l'écran doit avoir monté SA racine dans le slot de contenu ET porté
            // du contenu. La leçon de la carte de ville : compter les enfants du CONTRÔLEUR revient
            // à compter le contrôleur — les écrans de ce shell montent leur propre racine.
            Assert.IsNotNull(shell.TopBar, "le chrome haut doit exister sur la capture");
            int noeuds = shell.ContentSlot.GetComponentsInChildren<Transform>(true).Length;
            Assert.Greater(noeuds, 20,
                $"l'écran lieutenants doit avoir construit son contenu (mesuré {noeuds} noeuds) — " +
                "une capture d'un slot vide passerait sinon pour une réussite");

            // ⛔ GARDE DE CLASSE : tout `VerticalGradientImage` de la scène porte un
            // `CanvasRenderer`. `Graphic` le déclare en `[RequireComponent]`, mais un
            // `AddComponent` à l'exécution ne l'ajoute PAS — et le Graphic ne dessine alors RIEN,
            // SANS erreur console. Mesuré le 2026-08-22 sur cet écran : les plaques de verre des
            // rangs (Don compris) rendaient exactement la couleur de la feuille, (22,22,28) des
            // deux côtés — la plaque n'a jamais existé, seul le trait de bordure la simulait.
            // Une garde qui aurait lu « le composant est là et SetColors a été appelé » aurait été
            // VERTE : c'est une garde de PARAMÈTRE sur un défaut d'EFFET.
            // Elle est ici, dans la capture, parce que c'est le seul point du dépôt où le shell
            // ENTIER est monté — donc où les trois sites d'appel (bandeau, onglets, panneaux de la
            // famille) sont tous vivants dans la même scène.
            var degrades = Object.FindObjectsByType<MafiaCleanCity.Shell.VerticalGradientImage>(
                FindObjectsInactive.Include, FindObjectsSortMode.None);
            Assert.Greater(degrades.Length, 0,
                "aucun VerticalGradientImage dans la scène : la garde ne mesure rien, et un écran " +
                "sans plaque de verre la satisferait à vide");
            foreach (var g in degrades)
            {
                Assert.IsNotNull(g.GetComponent<CanvasRenderer>(),
                    $"'{g.name}' porte un VerticalGradientImage SANS CanvasRenderer : il ne dessine " +
                    "aucun pixel, en silence. Construire son GameObject avec typeof(CanvasRenderer).");
            }
            Debug.Log($"[CAPTURE] lieutenants — {degrades.Length} plaques de verre, toutes rendues");

            // ⛔ GARDE DE CLASSE, un cran au-dessus : TOUT `Graphic` vivant sous un `Mask` doit
            // être MASQUABLE. `Graphic` nu n'implémente ni `IMaskable` ni `IClippable` : un masque
            // posé autour de lui est un décor. Mesuré le 2026-08-22 — les deux barres du shell
            // construisent un masque en rectangle arrondi (leur docstring l'appelle « écart (6) »)
            // autour d'un `VerticalGradientImage` qui dérivait de `Graphic` : le masque existait,
            // le sprite arrondi existait, aucun pixel n'était clippé. Le défaut était INVISIBLE
            // là-bas (des barres pleine largeur n'ont pas de coin qui dépasse) et n'est apparu que
            // sur un panneau étroit d'un autre écran.
            // C'est la garde STRUCTURELLE de la famille : elle ne dépend d'aucune valeur de pixel,
            // et elle couvre tout masque futur.
            var masques = Object.FindObjectsByType<Mask>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            Assert.Greater(masques.Length, 0,
                "aucun Mask dans la scène : la garde serait vraie à vide");
            int graphiquesSousMasque = 0;
            foreach (Mask mq in masques)
            {
                foreach (Graphic g in mq.GetComponentsInChildren<Graphic>(true))
                {
                    if (g.gameObject == mq.gameObject) continue;   // le graphique du masque lui-même
                    graphiquesSousMasque++;
                    Assert.IsInstanceOf<MaskableGraphic>(g,
                        $"'{g.name}' ({g.GetType().Name}) vit sous le masque '{mq.name}' mais dérive " +
                        "de Graphic nu : aucun masque ne peut le clipper. Dériver de MaskableGraphic.");
                }
            }
            Assert.Greater(graphiquesSousMasque, 0,
                "aucun graphique sous un masque : la garde ne mesure rien");
            Debug.Log($"[CAPTURE] lieutenants — {masques.Length} masques, " +
                      $"{graphiquesSousMasque} graphiques dessous, tous masquables");

            // ⛔ GARDE D'I18N : aucun libellé de la CHROME À LARGEUR FIXE ne déborde de sa boîte.
            //
            // C'est le mode d'échec propre à une traduction : le texte grandit, la boîte non. Le
            // dépôt portait le bon chiffre — « Burning tient à 41,06 px, largement sous ~49 » — mais
            // comme une MESURE FAITE UNE FOIS, dans un commentaire. Un commentaire ne rougit jamais.
            // « Brûlant », « Filière », « CHALEUR » sont passés depuis ; rien ne les surveillait.
            //
            // Scopée à la chrome à largeur CONTRAINTE (manomètre + onglets) : y étendre tout le
            // texte de l'écran produirait des faux positifs sur ce qui a le droit de revenir à la
            // ligne ou de s'auto-dimensionner.
            int libellesVerifies = 0;
            foreach (string nom in new[] { "GaugeValue", "GaugeCaption" })
            {
                // ⚠️ La racine est le BANDEAU, pas le shell : le bandeau se monte dans
                // `TopBarSlot`, enfant du canvas du shell, pas du GameObject qui porte `AppShell`.
                // La première version cherchait depuis `shell.transform` et ne trouvait rien — la
                // garde a rougi au lieu de se déclarer verte à vide, ce pour quoi elle porte cette
                // assertion de présence.
                Transform t = TrouverEnfant(shell.TopBar.transform, nom);
                Assert.IsNotNull(t, $"'{nom}' introuvable — la garde ne mesurerait rien");
                var tmp = t.GetComponent<TMPro.TextMeshProUGUI>();
                Assert.IsNotNull(tmp, $"'{nom}' ne porte pas de texte");
                float boite = ((RectTransform)t).rect.width;
                Assert.LessOrEqual(tmp.preferredWidth, boite + 0.5f,
                    $"'{nom}' = «{tmp.text}» mesure {tmp.preferredWidth:F1} px pour une boîte de " +
                    $"{boite:F1} px : le libellé déborde. Une traduction a allongé le texte sans " +
                    "que la boîte suive.");
                libellesVerifies++;
            }
            Assert.AreEqual(2, libellesVerifies, "les deux libellés du manomètre doivent être vus");
            Debug.Log($"[CAPTURE] lieutenants — {libellesVerifies} libellés de chrome tiennent dans leur boîte");

            // ⛔ CE QUI DÉPASSE DOIT RESTER ATTEIGNABLE. Une capture ne montre que le haut : elle
            // est donc incapable, par construction, de dire si le bas existe. Mesuré — à l'échelle
            // du panneau, l'organigramme dépasse la hauteur d'écran dès DEUX lieutenants, et le
            // bouton de recrutement se retrouvait sous la ligne de flottaison, définitivement hors
            // de portée. La garde ne demande pas « y a-t-il un ScrollRect » (une garde de
            // paramètre) : elle compare la HAUTEUR DU CONTENU à celle de la fenêtre, et n'exige un
            // défilement que lorsqu'il y a effectivement quelque chose à atteindre.
            var defilement = shell.ContentSlot.GetComponentInChildren<ScrollRect>(true);
            Assert.IsNotNull(defilement, "l'écran lieutenants doit porter un ScrollRect");
            Assert.IsNotNull(defilement.content, "le ScrollRect doit avoir un contenu");
            Assert.IsNotNull(defilement.viewport, "le ScrollRect doit avoir une fenêtre");
            float hContenu = defilement.content.rect.height;
            float hFenetre = defilement.viewport.rect.height;
            Debug.Log($"[CAPTURE] lieutenants — contenu {hContenu:F0} u dans une fenêtre {hFenetre:F0} u");
            Assert.Greater(hContenu, 0f, "contenu de hauteur nulle : le ScrollRect ne défilerait rien");
            if (hContenu > hFenetre)
            {
                Assert.IsTrue(defilement.vertical,
                    $"le contenu ({hContenu:F0} u) dépasse la fenêtre ({hFenetre:F0} u) mais le " +
                    "défilement vertical est désactivé : le bas de l'écran est inatteignable.");
            }

            ScreenCapture.CaptureScreenshot("Assets/Screenshots/ecran_lieutenants.png");
            for (int i = 0; i < 12; i++) yield return null;
            Debug.Log($"[CAPTURE] lieutenants — noeuds={noeuds} ecran={Screen.width}x{Screen.height}");

            // ⛔ UNE SECONDE RÉSOLUTION, ET C'EST UNE DETTE QUE TROIS JUGES ⊥ ONT NOMMÉE.
            // Chacun a classé « une seule résolution » en TÊTE de ce qu'il n'avait pas pu vérifier,
            // et le socle l'exige explicitement — le trou trouvé le 2026-08-21 était que 0 test du
            // dépôt ne fixait de résolution. Une capture d'écran est prisonnière de la fenêtre de
            // jeu ; on rend donc le MÊME shell dans une cible hors écran d'un autre format, ce qui
            // force une VRAIE refonte de la mise en page (le `CanvasScaler` suit la taille de rendu
            // du canvas, pas celle de l'écran).
            // 1080×2400 = le format téléphone que le projet vise (19,5:9), très éloigné du 3:4 de
            // la fenêtre d'éditeur : c'est là que les grandeurs qui dépendent du ratio se trahissent.
            yield return CapturerA(1080, 2400, "Assets/Screenshots/ecran_lieutenants_1080x2400.png");
        }
    }
}
