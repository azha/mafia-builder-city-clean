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
        // ⛔ CATÉGORIE PROPRE, EN PLUS de celle de la classe (NUnit les CUMULE, il n'y a rien à
        //    retirer) — et c'est une contrainte de STABILITÉ, pas de rangement. Mesuré par une
        //    session voisine : SIGSEGV reproduit DEUX fois dans le pilote graphique
        //    (`RenderManager::RenderOffscreenCameras` -> `GfxDeviceGLES::DrawBufferRanges`, Mesa
        //    Intel 25.2.8) en lançant la catégorie `Capture` ENTIÈRE, et JAMAIS en lançant une
        //    capture seule (3 verts). ⇒ *Une catégorie par capture* : sans elle, cette capture-ci
        //    n'est pas lançable du tout, puisque ses voisines emportent l'éditeur avant son tour.
        //    ⚠️ Et un run qui MEURT réécrit les PNG déjà produits — d'où le `git checkout` des
        //    captures non voulues après tout run interrompu, avant tout commit.
        [Category("CaptureDistrict")]
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
            //    ActivateTab(Empire) tardif écraserait le district — course mesurée au lot HUD ;
            //    items 0.2/0.3, Empire fusionne l'ancien Home et l'ancien City).
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

            // ── L'ÉCRAN PRINCIPAL AVEC SA FICHE OUVERTE ────────────────────────────────────────
            // Ruling user : « tant que tu n'as pas un screenshot 100% conforme avec les 3 actions
            // quand on clique sur un bâtiment … tu continues l'écran principal ». Une capture au
            // repos ne PROUVE pas l'interaction : elle montre exactement ce que montrait l'écran
            // quand aucun bâtiment n'était cliquable. Celle-ci ouvre la fiche par le même chemin
            // qu'un joueur — `OuvrirFiche`, ce que le `Button` de la cellule appelle.
            DistrictInteriorBuildingDto premier = district.LastFetch.buildings[0];
            district.OuvrirFiche(premier);
            for (int i = 0; i < 8; i++) yield return null;

            // ⛔ ANTI-MENSONGE : la fiche doit être OUVERTE, sur CE bâtiment, et porter ses TROIS
            // actions. Sans ces trois assertions, une fiche restée masquée — ou vidée de ses
            // boutons — produirait une capture parfaitement valide de l'écran d'avant.
            Assert.IsTrue(district.FicheOuverte, "la fiche doit être ouverte au moment de la capture");
            Assert.AreEqual(premier.building, district.FicheBuildingId,
                "la fiche doit porter le bâtiment sur lequel on a cliqué, pas un autre");
            Transform ficheT = TrouverEnfant(shell.ContentSlot, "FicheBatiment");
            Assert.IsNotNull(ficheT, "la fiche doit exister dans l'arbre de l'écran");
            int actions = 0;
            foreach (Transform enf in ficheT.GetComponentsInChildren<Transform>(true))
                if (enf.name.StartsWith("Btn_")) actions++;
            Assert.AreEqual(3, actions,
                $"la fiche doit porter les TROIS actions du canon (COLLECTER · BLANCHIR · AMÉLIORER) — trouvé {actions}");

            // ⛔ LA RÉSOLUTION N'EST PAS UN DÉTAIL DE CAPTURE — ELLE FABRIQUE UN FAUX DÉFAUT.
            // À 1200×1600 (le 3:4 de l'éditeur), le fond de district — posé à sa taille NATIVE et
            // aligné au pixel, propriété certifiée bit-exacte — ne peut pas remplir l'écran :
            // 1080 de large sur 1200 laisse 60 px de noir de chaque côté. J'ai failli traiter ces
            // marges comme un défaut de mise en page et « corriger » en étirant l'art, ce qui
            // aurait détruit exactement l'invariant que ce dépôt a payé le plus cher.
            //   ⇒ Les fonds livrés sont en 1080×1920 (`Assets/Art/District/Backgrounds/`), et le
            //     projet vise le portrait. On capture DANS ce repère.
            // Et on capture à DEUX formats, parce qu'un seul ne prouve rien sur l'autre : 1080×1920
            // (résolution native de l'art) et 1080×2400 (le téléphone 19,5:9 réellement visé).
            yield return CapturerA(1080, 1920, "Assets/Screenshots/vue_principale_fiche.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/vue_principale_fiche_1080x2400.png");
            Debug.Log($"[CAPTURE] fiche bâtiment — type={premier.operational_type} " +
                      $"conversion={premier.conversion_band} actions={actions}");
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

            // Re-tap (idempotent-ish remount) : items 0.2/0.3 ont fusionné Tab.Home/Tab.City en
            // Tab.Empire — c'est déjà l'onglet par défaut, ce second appel remonte un
            // CityMapController FRAIS, exactement comme le faisait la bascule Home -> City.
            // ⛔ CORRIGÉ (revue ⊥ round 2, m2) — `ActivateTab` détruit l'ancien tenant en DIFFÉRÉ
            // (`Object.Destroy`, pas `DestroyImmediate`) : sans ce `yield`, l'ancien locataire
            // marqué-pour-destruction coexiste UNE frame avec le neuf, et `FindFirstObjectByType`
            // n'a AUCUN ordre garanti entre les deux — un `yield return null` laisse la frame de
            // destruction s'exécuter avant que la sonde ne cherche le CityMapController survivant.
            shell.ActivateTab(AppShell.Tab.Empire);
            yield return null;
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

            // ⛔⛔ SANS CECI, LA CAPTURE MESURE L'ÉCRAN D'UNE AUTRE RÉSOLUTION.
            // Le fond de district est posé à `taille_native / scaleFactor` — c'est ce qui garantit
            // ses pixels natifs, propriété certifiée bit-exacte. Mais `scaleFactor` est lu à la
            // CONSTRUCTION. Basculer ensuite le canvas sur une cible d'une autre taille change le
            // facteur sans refaire la mise en page : le fond garde sa `sizeDelta` d'avant.
            //   Mesuré : un juge visuel ⊥ a relevé l'art à **972 px sur 1080**, soit 0,9000 pile,
            //   et l'a classé MAJEUR (« la ville n'est plus plein cadre »). Ce 0,9 n'était pas un
            //   cadrage : c'est **0,84375 / 0,9375**, le rapport des `scaleFactor` entre la cible
            //   (1080) et la vue de jeu (1200) où la mise en page avait été faite.
            //   *Une capture est une mesure DATÉE : « sous quel état a-t-elle été prise ? », jamais
            //   « qu'est-ce que le commit déclare ? ».*
            // Le CHROME d'abord : les insets qu'il publie décident où le district se pose.
            shell.RebatirChromePourResolutionCourante();
            Canvas.ForceUpdateCanvases();
            yield return null;

            var districtCourant = Object.FindFirstObjectByType<DistrictInteriorScreenController>();
            if (districtCourant != null && districtCourant.LastFetch != null)
            {
                districtCourant.RebatirPourResolutionCourante();
                Canvas.ForceUpdateCanvases();
                yield return null;
                yield return null;           // la destruction différée de l'ancienne racine
                Canvas.ForceUpdateCanvases();
                yield return null;
            }

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

            // ⛔⛔ GARDE DE MISE À L'ÉCHELLE — LA CLASSE DE DÉFAUT QUI A PRODUIT QUATRE FINDINGS.
            // Toute la mise en page est posée à partir du `scaleFactor` lu à la CONSTRUCTION.
            // Capturer à une autre résolution sans la refaire laisse chaque élément à l'échelle
            // d'avant, dans un rapport parfaitement uniforme — et c'est ce qui rend le défaut
            // indétectable à l'œil : rien n'a l'air cassé, tout est juste 6,25 % trop petit.
            // Un juge visuel ⊥ l'a relevé quatre fois sans pouvoir nommer la cause (art à 0,9000 ·
            // barre 0,938 · rond du dock 0,930 · chasse −16 %) ; les quatre valaient 0,84375/0,9375.
            //   ⇒ La propriété qui les couvre TOUTES est structurelle et sans unité : **une bande
            //     pleine largeur doit occuper toute la largeur**. Elle est vraie à toute résolution,
            //     ne dépend d'aucune valeur de pixel, et rougit dès qu'un reflux est oublié.
            //   ⇒ On la mesure sur la LIGNE DU BANDEAU, qui est la seule dont on sait qu'elle doit
            //     aller d'un bord à l'autre (`.barre` du canon n'a ni marge ni arrondi).
            Color fondNu = MafiaCleanCity.Theme.DesignTokens.Current.nightOutOfDistrictMuted;
            int ligneBandeau = hauteur - 1 - Mathf.RoundToInt(hauteur * 0.03f); // ReadPixels : origine EN BAS
            // ⚠️ ON MESURE LA PLAGE CONTIGUË À CHAQUE BORD, PAS UN COMPTE TOTAL. Écrite en compte,
            // la garde a rougi à **2 pixels sur 1080** — l'anti-crénelage des deux colonnes
            // extrêmes, sur une barre qui va réellement d'un bord à l'autre. *Le lissé entoure
            // chaque forme ; tout ce qui interroge le bord le rencontre d'abord.* Et le défaut
            // qu'on traque, lui, ne produit pas 2 pixels : à 0,9375 il découvre **34 px de chaque
            // côté** à 1080. Les deux mondes sont donc séparés par deux ordres de grandeur — la
            // grandeur qui discrimine est la PLAGE, le seuil se lit sur l'écart, il ne se choisit pas.
            bool EstNu(int x)
            {
                Color c = tex.GetPixel(x, ligneBandeau);
                return Mathf.Abs(c.r - fondNu.r) < 0.02f && Mathf.Abs(c.g - fondNu.g) < 0.02f
                    && Mathf.Abs(c.b - fondNu.b) < 0.02f;
            }
            int nuGauche = 0; while (nuGauche < largeur && EstNu(nuGauche)) nuGauche++;
            int nuDroite = 0; while (nuDroite < largeur && EstNu(largeur - 1 - nuDroite)) nuDroite++;
            const int MargeAntiCrenelage = 4;
            Debug.Log($"[ECHELLE] {largeur}x{hauteur} — fond nu au bord : {nuGauche} px à gauche, {nuDroite} px à droite");
            Assert.LessOrEqual(Mathf.Max(nuGauche, nuDroite), MargeAntiCrenelage,
                $"le chrome laisse {nuGauche}/{nuDroite} px de fond NU aux bords à {largeur}x{hauteur} : " +
                "il ne va pas d'un bord à l'autre. Cause de loin la plus probable — la mise en page " +
                "n'a pas été refaite pour cette résolution, et TOUT est alors à l'échelle d'une autre.");

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
        /// <summary>⑨ EXCEPTIONS, refondu sur la maquette ratifiée (série 4 cadre 14) et monté
        /// dans le shell. L'écran s'ouvre EN SURIMPRESSION — ce n'est pas un onglet.</summary>
        [Category("Capture")]
        public IEnumerator Capture_EcranExceptions()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("excep", ref seq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "excep-capture-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "capture-excep", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open doit réussir");

            LogAssert.ignoreFailingMessages = true;

            // ⛔ CAPTURE HORS SHELL, ET C'EST DÉCLARÉ PLUTÔT QUE SUBI.
            // Cinq tentatives sous chrome ont échoué, et la cause est comprise :
            // `AppShell.UnmountCurrentTenant()` ne détruit pas seulement l'hôte du locataire — il
            // VIDE tout `ContentSlot` (son commentaire dit « la source unique de vérité de ce qui
            // est montré »), et il est appelé par CHAQUE `ActivateTab`. Un écran monté en
            // surimpression est donc emporté par n'importe quel geste d'onglet ultérieur, y compris
            // ceux que le shell se donne à lui-même — mesuré : détruit même 8 frames après son
            // montage.
            // ★ J'ai d'abord fait varier l'ATTENTE, en cherchant le bon moment. Il n'y en a pas :
            //   le risque ne décroît pas avec le temps, il croît. La question n'était pas « quand
            //   monter » mais « qu'est-ce qui démonte ».
            // ⇒ Ce que cette capture NE montre pas : l'écran sous le bandeau et le dock. C'est le
            //   même angle mort que ㊲ a porté pendant huit tours, et il se ferme le jour où ⑨ est
            //   atteint par un vrai geste joueur depuis l'Accueil plutôt que monté de force.
            // ⚠️ CANVAS FOURNI, jamais découvert. `BuildLayout` fait `FindFirstObjectByType<Canvas>()`
            // en repli, et dans une suite de captures ce « premier canvas » est souvent celui d'une
            // fixture PRÉCÉDENTE, déjà détruite — mesuré : MissingReferenceException sur un Canvas
            // mort. Un test qui laisse un écran chercher son parent hérite de ce que les tests
            // d'avant ont laissé dans la scène.
            GameObject canvasGo = new GameObject("ExceptionsCanvas",
                typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas cv = canvasGo.GetComponent<Canvas>();
            cv.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler sc = canvasGo.GetComponent<CanvasScaler>();
            sc.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            sc.referenceResolution = new Vector2(1080, 2400);

            GameObject host = new GameObject("ExceptionsStandalone");
            var ecran = host.AddComponent<
                MafiaCleanCity.Operational.Exceptions.ExceptionQueueController>();
            ecran.SetMountParent(canvasGo.transform);
            ecran.SetToken(token);
            for (int i = 0; i < 120; i++) yield return null;

            // ⛔ COMPTER SOUS LA RACINE CONSTRUITE, PAS SOUS LE CONTRÔLEUR.
            // ⚠️ Ma première version comptait sous `ecran` et rendait 1 : le contrôleur ne porte
            // aucun enfant visuel, il bâtit son interface sous le CANVAS. C'est mot pour mot le
            // défaut que ㊲ m'a appris il y a deux jours — « compter les enfants du contrôleur
            // revient à compter le contrôleur » — et je viens de le refaire à l'identique.
            // ★ Connaître un piège ne protège pas de lui : il se présente sous une autre forme,
            //   et c'est la même mesure qui le rattrape.
            GameObject racineUI = GameObject.Find("ExceptionQueueRoot");
            Assert.IsNotNull(racineUI, "⑨ n'a construit aucune racine d'interface");
            int noeuds = racineUI.GetComponentsInChildren<Transform>(true).Length;
            Assert.Greater(noeuds, 15,
                $"⑨ doit avoir construit son contenu (mesuré {noeuds} noeuds sous sa racine) — "
                + "une capture d'un écran vide passerait sinon pour une réussite");

            yield return CapturerA(1080, 2400, "Assets/Screenshots/screen_5_exceptions_1080x2400.png");
        }

        [UnityTest]
        
        /// <summary>㊲ LA RÉPUTATION, montée dans le shell — la seule chose qu'aucun des huit tours
        /// de juge n'a pu vérifier : l'écran sous le bandeau et le dock.
        ///
        /// ⚠️ L'arithmétique du dossier de clôture annonce un risque PRÉCIS, et c'est lui qu'on
        /// vient voir : 122 px CSS de chrome + 462 de cadre = 584, pour 533 disponibles en 16:9 —
        /// 51 manquants, soit la hauteur du bouton d'action. En 20:9, la cible, le compte passe.
        /// C'est pourquoi la capture est prise à 1080×2400 et pas ailleurs.
        /// ⇒ Si le bouton est coupé ou passe sous le dock, ça se verra ICI et nulle part ailleurs.
        ///
        /// Les gardes anti-mensonge sont celles du patron voisin : un slot vide produit un PNG
        /// parfaitement valide, et une capture d'écran vide ressemble à une capture.</summary>
        [Category("Capture")]
        public IEnumerator Capture_EcranReputation_SousChrome()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("reput", ref seq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "reput-capture-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "capture-reput", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open doit réussir — il octroie le kit de départ");

            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("ReputationShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, "reput-capture-pw");
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");

            // ㊲ vit sous l'onglet More depuis le 2026-09-02 — il y était la destination VIDE.
            shell.ActivateTab(AppShell.Tab.More);
            for (int i = 0; i < 90; i++) yield return null;

            Assert.IsNotNull(shell.TopBar, "le chrome haut doit exister — c'est TOUT l'objet de cette capture");
            Assert.AreEqual(typeof(MafiaCleanCity.Operational.ReputationScreenController),
                shell.MountedTenantType, "l'onglet More doit avoir monté ㊲");
            int noeuds = shell.ContentSlot.GetComponentsInChildren<Transform>(true).Length;
            Assert.Greater(noeuds, 20,
                $"㊲ doit avoir construit son contenu dans le slot (mesuré {noeuds} noeuds) — " +
                "une capture d'un slot vide passerait sinon pour une réussite");

            yield return CapturerA(1080, 2400, "Assets/Screenshots/screen_b3_reputation_sous_chrome_1080x2400.png");
        }

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
