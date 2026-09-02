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
        /// <summary>⛔ LA GARDE QUI MANQUAIT : le texte est-il LISIBLE ?
        ///
        /// Mes gardes comptaient des nœuds, vérifiaient des insets, mesuraient une teinte
        /// dominante — et sont restées VERTES sur un ⑩ dont la carte suggérée était en texte
        /// sombre sur fond sombre et dont tous les libellés étaient coupés en plein mot
        /// (« Escalate for r », « The card is archived for »).
        /// ★ Ce qu'une garde structurelle ne voit jamais, c'est ce que l'écran DIT. Celle-ci
        ///   mesure les deux choses qui rendent un texte illisible sans rien casser :
        ///   · le CONTRASTE avec le fond que le texte a réellement derrière lui ;
        ///   · la TRONCATURE — TMP sait combien de caractères il a effectivement posés.
        /// ★★ LE MÉCANISME QU'ELLE ATTRAPE, ET QUI SE REPRODUIRA : **on répare le FOND et on
        /// laisse l'ENCRE dans une couleur pensée pour l'ancien fond.** Mesuré sur ⑩ le
        /// 2026-09-02 : la carte suggérée devait être CLAIRE (maquette) ; je l'ai éclaircie et
        /// laissé son libellé de rôle en OR, choisi quand elle était sombre. Or 0,82 sur crème
        /// 0,88 — écart 0,06. Le correctif d'un défaut de contraste en a créé un autre, au même
        /// endroit, en sens inverse.
        /// ⇒ *Un correctif de FOND change la contrainte de tout ce qui se pose dessus, et rien
        ///   ne le rappelle.* Même famille que des insets de chrome posés par analogie sur un
        ///   écran voisin : la valeur était juste dans son contexte d'origine, jamais revérifiée
        ///   dans le nouveau. Cette garde est le rappel qui manquait.
        ///
        /// ⚠️ Seuil de contraste à 0,18 de luminance : mesuré, le cas fautif était à ~0,02
        /// (crème sombre sur ardoise) et les cas justes au-dessus de 0,35. Le seuil est posé
        /// dans le vide entre les deux mesures, pas au bord de l'une d'elles.
        ///
        /// ⛔ 2026-09-02 — CETTE GARDE N'ÉTAIT APPELÉE QUE PAR ⑩, l'écran pour lequel je l'avais
        /// écrite. Pendant ce temps ⑨ portait le MÊME défaut, de la même famille : un sous-titre
        /// en `onSurfaceSecondary` posé sur l'aplat corail du tampon, à 0,096. Il a fallu que je
        /// mesure la capture à la main, hors du test, pour le voir.
        /// ★ Un instrument braqué sur le seul cas qui l'a fait naître continuera de rater
        ///   partout ailleurs. Une garde appelée par UN écran mesure un écran, pas une propriété :
        ///   elle a l'air d'exister, elle a même déjà mordu une fois, et sa population est de un.
        ///
        /// ⇒ LA POPULATION, NOMMÉE ET COMPTÉE — les 7 captures SOUS CHROME, toutes armées :
        ///     ㊱ horizon (état vide) · ② fiche · ⑨ file · ⑨ file vide (en attente auto-armée)
        ///     · ⑩ main de cartes · ⑩ après tampon · ㊲ réputation
        ///   Les 4 captures HORS chrome ne le sont pas : elles n'ont pas d'insets et leurs fonds
        ///   sont ceux d'avant le chrome — les y armer mesurerait autre chose sous le même nom.
        /// ⚠️ AJOUTER UNE CAPTURE SOUS CHROME = AJOUTER L'APPEL, et recompter cette liste. Je
        ///   m'étais arrêté à 3 sur 7 en croyant avoir fini, ce qui est la même faute d'un cran
        ///   plus haut que celle qui a laissé passer ⑨.</summary>
        private static void LisibiliteDuTexte(GameObject racine)
        {
            float Lum(Color c) => 0.2126f * c.r + 0.7152f * c.g + 0.0722f * c.b;
            int vus = 0;
            foreach (TMPro.TextMeshProUGUI t in racine.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
            {
                if (string.IsNullOrWhiteSpace(t.text) || t.text.Trim() == "—") continue;
                vus++;

                // — TRONCATURE : TMP a-t-il posé tous les caractères qu'on lui a donnés ? —
                t.ForceMeshUpdate();
                int poses = t.textInfo != null ? t.textInfo.characterCount : t.text.Length;
                int demandes = t.text.Replace("\u200B", string.Empty).Length;
                Assert.GreaterOrEqual(poses, demandes - 1,
                    $"texte TRONQUÉ dans « {t.name} » : {poses} caractères posés sur {demandes} " +
                    $"(« {t.text} »). Un libellé coupé ressemble à un libellé court — rien ne " +
                    "signale la coupe à celui qui lit.");

                // — CONTRASTE : contre le premier fond opaque au-dessus de lui —
                Color fond = Color.clear;
                for (Transform p = t.transform.parent; p != null; p = p.parent)
                {
                    var img = p.GetComponent<UnityEngine.UI.Image>();
                    if (img != null && img.color.a > 0.5f) { fond = img.color; break; }
                }
                if (fond.a <= 0.5f) continue;   // pas de fond opaque identifiable : on ne conclut pas
                float ecart = Mathf.Abs(Lum(t.color) - Lum(fond));
                Assert.Greater(ecart, 0.18f,
                    $"texte ILLISIBLE dans « {t.name} » : luminance {Lum(t.color):0.00} sur un " +
                    $"fond à {Lum(fond):0.00} (écart {ecart:0.00}). « {t.text} »");
            }
            Assert.Greater(vus, 3,
                $"seulement {vus} textes examinés : la garde ne mesure presque rien, elle " +
                "passerait sur un écran vide");
        }

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
        
        /// <summary>② Building Card, avec sa ligne d'entretien — la seule valeur numérique que
        /// cette fiche a le droit d'afficher. Capture hors shell : ② est « NAV-HORS-SHELL » comme
        /// ⑨, et le shell vide son slot à chaque changement d'onglet (défaut connu, routé).</summary>
        [Category("Capture")]
        [Category("CaptureFiche")]   // isole ② : la catégorie entière fait segfauter le pilote Mesa
        
        public IEnumerator Capture_FicheBatiment()
        {
            // ⛔ LE COMPTE DE DÉMO, PAS UN SIGNUP FRAIS. Mesuré au tour précédent :
            // `GET /v1/me/buildings` rend une liste VIDE sur un compte neuf — le kit octroyé par
            // `session/open` porte des lieutenants, pas des bâtiments. Une fiche de bâtiment n'a
            // alors rien à montrer, et la capture serait un cadre vide parfaitement valide.
            // ⚠️ On se CONNECTE au compte de démo, on ne le RESEEDE pas : le seeder remet son monde
            // à zéro et effacerait le travail des autres sessions qui s'y appuient.
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string token = null, err = null;
            yield return auth.SignIn("operational_demo@example.test", "operational-demo-pw",
                                     t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion au compte de démo échouée : {err}");
            Assert.IsFalse(string.IsNullOrEmpty(token), "le compte de démo doit rendre un jeton");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "capture-fiche", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open doit réussir");

            LogAssert.ignoreFailingMessages = true;

            // Canvas FOURNI, jamais découvert : dans une suite de captures, le « premier canvas »
            // trouvé par un repli est souvent celui d'une fixture précédente, déjà détruite.
            GameObject canvasGo = new GameObject("FicheCanvas",
                typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas cv = canvasGo.GetComponent<Canvas>();
            cv.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler sc = canvasGo.GetComponent<CanvasScaler>();
            sc.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            sc.referenceResolution = new Vector2(1080, 2400);

            GameObject host = new GameObject("FicheStandalone");
            var ecran = host.AddComponent<
                MafiaCleanCity.Operational.BuildingCardController>();
            ecran.SetMountParent(canvasGo.transform);
            ecran.SetToken(token);
            for (int i = 0; i < 60; i++) yield return null;

            // ⛔ IL FAUT LUI DONNER UN BÂTIMENT. `SetToken` ne déclenche aucun chargement : la
            // fiche attend un identifiant, et sans lui elle ne bâtit que sa charpente vide.
            // ⚠️ Mesuré : 7 nœuds sous le canvas — assez pour qu'un PNG sorte, pas assez pour
            // qu'il montre quoi que ce soit. C'est exactement ce que la garde anti-vacuité existe
            // pour attraper, et c'est la troisième fois qu'elle me sauve d'une capture vide.
            // ⛔ `/v1/me/buildings` N'EXISTE PAS — et j'en avais tiré la mauvaise conclusion.
            // La route rend 404, ce que ce test lisait comme une liste vide : il cherchait un
            // identifiant dans le CORPS sans regarder le CODE. Un corps d'erreur ressemble à une
            // réponse vide. ⚠️ Un rapport de juge données antérieur s'y est trompé de la même
            // façon, à une semaine d'écart, avec son propre instrument.
            // ★ Et j'ai aggravé la lecture : ayant essayé DEUX routes absentes, j'ai conclu
            //   « aucune route joueur ne fournit l'identifiant ». Faux — c'est la session back qui
            //   me l'a signalé. Deux échecs ne font pas une exhaustivité : la mesure juste était
            //   « les deux routes que j'ai essayées n'existent pas », et la différence n'est pas
            //   rhétorique — la première invite à chercher, la seconde fait ouvrir un lot back
            //   inutile.
            // ⇒ Le vrai chemin est celui du JOUEUR : il tape un bâtiment sur la carte, donc le
            //   district est toujours connu quand la fiche s'ouvre. `district/:id/interior` rend
            //   les bâtiments avec leur clé `building`, qui EST l'identifiant des routes `:id`.
            string batimentId = null;
            long codeVu = 0;
            foreach (int district in new[] { 16, 13, 11, 1 })
            {
                using (var req = UnityEngine.Networking.UnityWebRequest.Get(
                           BaseUrl + $"/v1/city/district/{district}/interior"))
                {
                    req.SetRequestHeader("Authorization", "Bearer " + token);
                    yield return req.SendWebRequest();
                    codeVu = req.responseCode;
                    // LE CODE D'ABORD, le corps ensuite — c'est toute la leçon ci-dessus.
                    if (codeVu != 200) continue;
                    string corps = req.downloadHandler.text;
                    int k = corps.IndexOf("\"building\"");
                    if (k >= 0)
                    {
                        int d = corps.IndexOf('"', corps.IndexOf(':', k) + 1) + 1;
                        int f = corps.IndexOf('"', d);
                        if (d > 0 && f > d) { batimentId = corps.Substring(d, f - d); break; }
                    }
                }
            }
            Assert.IsFalse(string.IsNullOrEmpty(batimentId),
                $"aucun bâtiment trouvé dans les districts essayés (dernier code HTTP {codeVu}) — " +
                "sans identifiant la fiche ne bâtit que sa charpente vide, et la capture serait " +
                "un cadre parfaitement valide qui ne montre rien.");

            yield return ecran.LoadBuilding(batimentId);
            for (int i = 0; i < 90; i++) yield return null;

            // Garde anti-vacuité : sous la racine CONSTRUITE, jamais sous le contrôleur — il ne
            // porte aucun enfant visuel, et compter ses enfants revient à le compter lui.
            int noeuds = canvasGo.GetComponentsInChildren<Transform>(true).Length;
            Assert.Greater(noeuds, 15,
                $"② doit avoir construit son contenu (mesuré {noeuds} noeuds sous son canvas)");

            // ⛔ PAS le `CapturerA` de ce fichier : il lit `shell.ShellCanvas`, nul ici — ② monte
            // sous SON canvas, hors shell. Mesuré sur ㊱, qui a rendu une `NullReferenceException`
            // sans pile utile pour exactement cette raison.
            // ⛔ UNE seule fiche. Une charpente bâtie deux fois se superpose exactement à
            // elle-même tant que sa hauteur est fixe : invisible sur toutes les captures
            // précédentes, révélée seulement quand la hauteur s'est mise à épouser le contenu.
            const string chemin = "Assets/Screenshots/screen_2a_fiche_1080x2400.png";
            yield return MafiaCleanCity.Tests.CaptureSupport.CapturerCanvas(
                cv, (RectTransform)canvasGo.transform, 1080, 2400, chemin);
            MafiaCleanCity.Tests.CaptureSupport.GarderLaCapture(chemin);
        }

        [UnityTest]
        
        /// <summary>⑨ EXCEPTIONS, refondu sur la maquette ratifiée (série 4 cadre 14) et monté
        /// dans le shell. L'écran s'ouvre EN SURIMPRESSION — ce n'est pas un onglet.</summary>
        [Category("Capture")]
        // ⛔ NEUTRALISÉ, avec sa raison et sa condition de retour — jamais supprimé.
        // ⚠️ Ce test lève une `MissingReferenceException` (un Canvas d'une fixture antérieure), et
        // une exception non gérée INTERROMPT LA SUITE : le run s'arrête sans produire sa ligne de
        // fin, et les tests suivants ne tournent jamais. Mesuré — la capture de ② n'a pas été
        // exécutée une seule fois tant que celui-ci levait, sans que rien ne le dise : son nom
        // n'apparaît nulle part dans le journal, ni en succès ni en échec.
        // ★ Un test défaillant ne coûte pas seulement son propre verdict : il peut emporter tous
        //   ceux qui le suivent, et leur absence ressemble à un run plus court, pas à une panne.
        // ⇒ Reprendre quand le shell ne videra plus son slot à chaque changement d'onglet
        //   (correctif routé) : ⑨ sera alors atteignable par le vrai geste joueur depuis l'Accueil,
        //   ce qui supprime le montage forcé ET le canvas emprunté.
        [Category("CaptureExceptions")]
        // ⛔ L'`[Ignore]` est LEVÉ. Sa raison — « Canvas d'une fixture antérieure » — ne tient
        // plus : ce test FOURNIT son canvas, et la capture passe désormais par
        // `CaptureSupport.CapturerCanvas`, qui prend le canvas en argument au lieu de lire
        // `shell.ShellCanvas` (nul hors shell). La catégorie dédiée l'isole en prime : la
        // catégorie `Capture` entière fait segfauter le pilote Mesa sur captures répétées.
        // ⚠️ CE QUE CETTE CAPTURE NE MONTRE TOUJOURS PAS : l'écran sous le bandeau et le dock.
        // Le vrai geste joueur reste hors d'atteinte tant que `UnmountCurrentTenant` vide tout
        // `ContentSlot` à chaque `ActivateTab`. Hors shell ≠ dans le parcours.
        public IEnumerator Capture_EcranExceptions()
        {
            // ⛔ LE COMPTE DE DÉMO, PAS UN SIGNUP FRAIS. Un compte neuf a une file VIDE : la
            // capture sortirait pleine, valide, et ne montrerait aucune exception — exactement
            // l'écran qu'on ne vient pas voir. Le compte de démo en porte six (mesuré par la
            // session back).
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string token = null, err = null;
            yield return auth.SignIn("operational_demo@example.test", "operational-demo-pw",
                                     t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion au compte de démo échouée : {err}");

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

            const string cheminExc = "Assets/Screenshots/screen_5_exceptions_1080x2400.png";
            yield return MafiaCleanCity.Tests.CaptureSupport.CapturerCanvas(
                cv, (RectTransform)canvasGo.transform, 1080, 2400, cheminExc);
            MafiaCleanCity.Tests.CaptureSupport.GarderLaCapture(cheminExc);
        }

        [UnityTest]
        /// <summary>㊱ SOUS LE CHROME — état vide, monté en surimpression.
        ///
        /// ⚠️ CE N'EST PAS L'ENTRÉE DANS LE MENU « PLUS », et il ne faut pas lire cette capture
        /// comme telle : le menu est le travail d'une autre session et `Tab.More` monte encore
        /// ㊲ en direct sur `main`. Ici ㊱ est monté de force en surimpression — le chrome est
        /// donc RÉEL, mais le chemin joueur ne l'est pas encore.
        /// ⇒ Ce que ça vaut : ça ferme la question du chrome (rien sous le bandeau, rien sous le
        ///   dock). Ce que ça ne vaut pas : « ㊱ est dans le parcours ».
        ///
        /// ㊱ est un écran PLEIN, pas un panneau bas — sa garde A4 porte donc sur les DEUX insets,
        /// pas seulement celui du dock.</summary>
        [Category("CaptureSousChrome")]
        public IEnumerator Capture_Horizon_SousChrome()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("HorizonShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");
            for (int i = 0; i < 30; i++) yield return null;

            var ecran = shell.MonterLocataireEnSurimpression<
                MafiaCleanCity.Operational.HorizonScreenController>();
            Assert.IsNotNull(ecran, "la surimpression doit avoir monté ㊱");
            yield return ecran.Charger();
            for (int i = 0; i < 60; i++) yield return null;

            Assert.IsNull(ecran.DerniereErreur,
                $"la route a échoué (code {ecran.DernierCodeErreur}) : la capture montrerait " +
                "l'écran d'indisponibilité, pas l'état vide");
            Assert.IsNotNull(ecran.DernierChargement, "aucun corps reçu");
            int cartes = ecran.DernierChargement.cards == null ? 0 : ecran.DernierChargement.cards.Length;
            Assert.AreEqual(0, cartes,
                $"le compte porte {cartes} carte(s) : ce n'est plus l'état vide, il faut renommer " +
                "la capture — une image nommée `_etat-vide_` qui montre des cartes ment deux fois.");

            Assert.IsNotNull(shell.TopBar, "le chrome haut doit exister");
            GameObject racineUI = GameObject.Find("HorizonRoot");
            Assert.IsNotNull(racineUI, "㊱ n'a construit aucune racine sous le chrome");

            // ⛔ MESURER L'ÉCRAN, PAS LE CHROME. Ma première version de cette garde n'assertait
            // que « les insets sont publiés » — elle est passée VERTE sur une capture où
            // l'enseigne de ㊱ était derrière la jauge de chaleur et son panneau derrière le dock.
            // ★ Vérifier qu'une contrainte EXISTE ne dit rien de son RESPECT. C'est la même faute
            //   que la garde qui comptait les nœuds du slot au lieu de ceux de l'écran : les deux
            //   mesurent le contexte et concluent sur le contenu.
            Assert.Greater(MafiaCleanCity.Shell.ShellChrome.BottomInsetPx, 0f,
                "sous le chrome les insets doivent être publiés, sinon la garde ci-dessous " +
                "passerait toujours et ne mesurerait rien");
            Assert.Greater(MafiaCleanCity.Shell.ShellChrome.TopInsetPx, 0f, "idem pour l'inset haut");

            var corpsRt = racineUI.transform.Find("Corps") as RectTransform;
            Assert.IsNotNull(corpsRt, "㊱ doit porter son corps");
            Assert.GreaterOrEqual(corpsRt.offsetMin.y, MafiaCleanCity.Shell.ShellChrome.BottomInsetPx,
                $"le corps de ㊱ démarre à {corpsRt.offsetMin.y:F0} et le dock occupe " +
                $"{MafiaCleanCity.Shell.ShellChrome.BottomInsetPx:F0} : il passe DESSOUS.");
            Assert.LessOrEqual(corpsRt.offsetMax.y, -MafiaCleanCity.Shell.ShellChrome.TopInsetPx,
                $"le corps de ㊱ monte à {corpsRt.offsetMax.y:F0} et le bandeau occupe " +
                $"{MafiaCleanCity.Shell.ShellChrome.TopInsetPx:F0} : il passe DESSOUS.");

            LisibiliteDuTexte(racineUI);

            yield return CapturerA(1080, 2400,
                "Assets/Screenshots/screen_c6_horizon_etat-vide_sous_chrome_1080x2400.png");
        }

        [UnityTest]
        
        /// <summary>② SOUS LE CHROME. Même question que ⑨ : la fiche est un panneau BAS, et le
        /// dock occupe le bas. La garde A4 est posée AVANT d'avoir regardé l'image — si elle
        /// échoue, c'est le même défaut, et je préfère l'apprendre d'une assertion que d'un
        /// coup d'œil sur une capture.</summary>
        [Category("CaptureSousChrome")]
        public IEnumerator Capture_FicheBatiment_SousChrome()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("FicheShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");
            for (int i = 0; i < 30; i++) yield return null;

            // Le chemin JOUEUR : la fiche s'ouvre depuis un district, donc on prend un bâtiment
            // par `district/:id/interior` — la route qui porte `building`.
            string batimentId = null; long codeVu = 0;
            foreach (int district in new[] { 16, 13, 11, 1 })
            {
                using (var req = UnityEngine.Networking.UnityWebRequest.Get(
                           BaseUrl + $"/v1/city/district/{district}/interior"))
                {
                    req.SetRequestHeader("Authorization", "Bearer " + shell.Token);
                    yield return req.SendWebRequest();
                    codeVu = req.responseCode;
                    if (codeVu != 200) continue;               // LE CODE D'ABORD
                    string corps = req.downloadHandler.text;
                    int k = corps.IndexOf("\"building\"");
                    if (k >= 0)
                    {
                        int d = corps.IndexOf('"', corps.IndexOf(':', k) + 1) + 1;
                        int f = corps.IndexOf('"', d);
                        if (d > 0 && f > d) { batimentId = corps.Substring(d, f - d); break; }
                    }
                }
            }
            Assert.IsFalse(string.IsNullOrEmpty(batimentId),
                $"aucun bâtiment trouvé (dernier code HTTP {codeVu})");

            var ecran = shell.MonterLocataireEnSurimpression<
                MafiaCleanCity.Operational.BuildingCardController>();
            Assert.IsNotNull(ecran, "la surimpression doit avoir monté ②");
            yield return ecran.LoadBuilding(batimentId);
            for (int i = 0; i < 60; i++) yield return null;

            Assert.IsNotNull(shell.TopBar, "le chrome haut doit exister");
            var feuille = GameObject.Find("BuildingCardSheet");
            Assert.IsNotNull(feuille, "② n'a construit aucune fiche sous le chrome");
            int noeuds = feuille.GetComponentsInChildren<Transform>(true).Length;
            Assert.Greater(noeuds, 15, $"② doit avoir du contenu (mesuré {noeuds} nœuds)");

            // GARDE A4 — écrite avant de regarder l'image.
            var rt = (RectTransform)feuille.transform;
            Assert.GreaterOrEqual(rt.offsetMin.y, MafiaCleanCity.Shell.ShellChrome.BottomInsetPx,
                $"la fiche démarre à {rt.offsetMin.y:F0} alors que le dock occupe " +
                $"{MafiaCleanCity.Shell.ShellChrome.BottomInsetPx:F0} : elle passe DESSOUS.");
            Assert.Greater(MafiaCleanCity.Shell.ShellChrome.BottomInsetPx, 0f,
                "sous le chrome l'inset bas doit être publié, sinon la garde ne mesure rien");

            LisibiliteDuTexte(feuille);

            yield return CapturerA(1080, 2400,
                "Assets/Screenshots/screen_2a_fiche_sous_chrome_1080x2400.png");
        }

        [UnityTest]
        /// <summary>⑨ — « personne ne fait la queue », SOUS CHROME. État RATIFIÉ par la maquette
        /// (cadre 16 : `exceptions []` · `escalations.total 0`) : tabourets vides, et la porte
        /// des escalades qui reste ouverte.
        ///
        /// ⚠️ CET ÉTAT N'EXISTE QUE PAR ACCIDENT AUJOURD'HUI. Le compte de démo s'est retrouvé
        /// vide (lieutenants et progression partis avec, cause inconnue de mon côté) et va être
        /// re-provisionné. Je le capture pendant qu'il est là : jusqu'ici la file a toujours eu
        /// des cartes, et cet état dessiné n'avait jamais été photographié.
        /// ★ J'ai d'abord lu « la file est à 0 » comme un blocage. C'est une OCCASION : un état
        ///   vide que la maquette dessine vaut une planche au même titre qu'un état plein.
        ///
        /// ⛔ Le nom du fichier porte `_personne-en-file_`. Sans ce mot, l'image serait relue plus
        /// tard comme « ⑨ » et son comptoir désert passerait pour la mise en page voulue — la
        /// leçon de `_etat-vide_` sur ㊱.</summary>
        [Category("CaptureSousChrome")]
        public IEnumerator Capture_EcranExceptions_FileVide_SousChrome()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("ExceptionsVideShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");
            for (int i = 0; i < 30; i++) yield return null;

            var ecran = shell.MonterLocataireEnSurimpression<
                MafiaCleanCity.Operational.Exceptions.ExceptionQueueController>();
            Assert.IsNotNull(ecran, "la surimpression doit avoir monté ⑨");

            // ⛔ ATTENDRE LE CHARGEMENT, PAS UN NOMBRE DE FRAMES — et ici l'attente ne peut pas
            // porter sur « des cartes arrivent » puisqu'il n'y en a aucune : on attend le DRAPEAU
            // de chargement. Sans ça, « pas encore chargé » et « chargé et vide » ont la même
            // image, et je publierais la première en croyant tenir la seconde.
            float tc = Time.realtimeSinceStartup;
            while (!ecran.QueueLoaded && Time.realtimeSinceStartup - tc < 30f) yield return null;
            Assert.IsTrue(ecran.QueueLoaded, $"⑨ n'a pas chargé sa file : {ecran.QueueError}");
            // ⛔ MESURÉ le 2026-09-02 13:21 : le compte porte de nouveau 3 cartes — le
            // re-provisionnement annoncé plus haut a eu lieu. L'état vide n'est plus atteignable.
            // ★ Ce n'est PAS une raison de supprimer ce test : la maquette RATIFIE cet état
            //   (cadre 16), et il n'a toujours jamais été photographié. Le test se met donc en
            //   attente au lieu d'échouer, et se rearme SEUL le jour où la file redevient vide.
            //   Un `[Ignore]` statique aurait, lui, exigé que quelqu'un se souvienne d'y revenir.
            // ⚠️ L'assertion d'origine reste la bonne DOCTRINE — une image nommée
            //   `_personne-en-file_` qui montre des attendants ment deux fois — mais elle punissait
            //   le run pour un état du serveur que ce test ne gouverne pas.
            if (ecran.Cards.Length != 0)
                Assert.Ignore($"la file porte {ecran.Cards.Length} carte(s) : l'état vide n'est pas " +
                    "là aujourd'hui. Rien à photographier — cette planche attend que le compte de " +
                    "démo se vide, et se prendra toute seule à ce moment.");
            for (int i = 0; i < 30; i++) yield return null;

            Assert.IsNotNull(shell.TopBar, "le chrome haut doit exister");
            GameObject racineUI = GameObject.Find("ExceptionQueueRoot");
            Assert.IsNotNull(racineUI, "⑨ n'a construit aucune racine sous le chrome");

            // GARDE A4 — même mesure que sur la file pleine : le contenu ne passe pas sous le dock.
            var comptoirRt = racineUI.transform.Find("Comptoir") as RectTransform;
            Assert.IsNotNull(comptoirRt, "⑨ doit porter son comptoir même vide");
            Assert.Greater(MafiaCleanCity.Shell.ShellChrome.BottomInsetPx, 0f,
                "sous le chrome l'inset bas doit être publié, sinon la garde ci-dessous ne mesure rien");
            Assert.GreaterOrEqual(comptoirRt.offsetMin.y, MafiaCleanCity.Shell.ShellChrome.BottomInsetPx,
                $"le comptoir démarre à {comptoirRt.offsetMin.y:F0} et le dock occupe " +
                $"{MafiaCleanCity.Shell.ShellChrome.BottomInsetPx:F0} : il passe DESSOUS.");

            LisibiliteDuTexte(racineUI);

            yield return CapturerA(1080, 2400,
                "Assets/Screenshots/screen_5_exceptions_personne-en-file_sous_chrome_1080x2400.png");
        }

        [UnityTest]
        /// <summary>⑩ APRÈS LE TAMPON — l'état que la maquette dessine avec son `outcome`.
        ///
        /// ⛔⛔ CE TEST MUTE, ET C'EST POUR ÇA QU'IL EST SÉPARÉ ET DANS SA PROPRE CATÉGORIE.
        /// Il résout une exception POUR DE BON (`POST /v1/exceptions/:id/resolve`) : la carte
        /// sort de la file et n'y revient pas. Le compte de démo est partagé — planque le
        /// restaure par `scripts/provision-demo-riche.mjs`, qui REMET LE COMPTE À ZÉRO. Il faut
        /// donc la prévenir AVANT de lancer ceci, et ne pas le lancer pendant qu'une autre
        /// session capture.
        /// ⇒ Le mélanger avec la capture de la main de cartes ferait d'une image rejouable une
        ///   image qui abîme le compte à chaque exécution.
        ///
        /// ⚠️ ON CONSOMME `exc_demo_one_time` ET PAS UNE AUTRE : elle n'a qu'une seule issue,
        /// donc c'est la moins intéressante pour la main de cartes de ⑨ — choix arrêté avec la
        /// session back plutôt que pris au hasard.
        ///
        /// ⚠️ ET L'`outcome` PEUT NE PAS ÊTRE REPRODUCTIBLE. Le back émet dix valeurs, dont
        /// `BRIBE_SUCCEEDED` / `BRIBE_FAILED` qui sont TIRÉES AU SORT dans le handler. Sur une
        /// carte `ONE_TIME` on attend `RESOLVED`, mais si un jour cette capture porte un
        /// `BRIBE_*`, son nom doit le dire — sinon quelqu'un la rejouera et lira une régression
        /// là où il n'y a qu'un tirage.</summary>
        [Category("MutationDeCarte")]
        // ⛔ NOM CHOISI POUR N'ÊTRE LE PRÉFIXE DE RIEN. Ce test s'appelait
        // `CaptureDetailMutant` et un lancement sur `CaptureDetail` l'a EMPORTÉ AVEC :
        // le filtre de catégories d'Unity correspond par PRÉFIXE, pas exactement. La carte a
        // été consommée alors que j'avais promis de prévenir avant.
        // ★ Une protection structurelle fondée sur une supposition non mesurée ne protège
        //   rien : deux noms distincts n'isolent pas si l'un commence par l'autre.
        public IEnumerator Capture_Detail_ApresTampon_SousChrome_MUTE()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("DetailMuteShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;
            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir sa session");
            for (int i = 0; i < 30; i++) yield return null;

            var file = shell.MonterLocataireEnSurimpression<
                MafiaCleanCity.Operational.Exceptions.ExceptionQueueController>();
            float tc = Time.realtimeSinceStartup;
            while ((file.Cards == null || file.Cards.Length == 0)
                   && Time.realtimeSinceStartup - tc < 30f) yield return null;
            Assert.Greater(file.Cards.Length, 0, "la file doit porter des cartes");

            // La carte CONVENUE, pas la première venue.
            MafiaCleanCity.Operational.Exceptions.ExceptionCardDto cible = null;
            foreach (var c in file.Cards)
                if (c != null && c.event_descriptor != null
                    && c.event_descriptor.Contains("one_time")) { cible = c; break; }
            Assert.IsNotNull(cible,
                "`exc_demo_one_time` est absente : le compte a peut-être déjà été consommé ou " +
                "reseedé. Ne PAS résoudre une autre carte à la place — relancer le provisionnement.");

            file.OpenDetail(cible);
            for (int i = 0; i < 30; i++) yield return null;
            var detail = file.LastDetail;
            Assert.IsNotNull(detail, "⑩ doit être ouvert");

            var action = cible.candidate_actions != null && cible.candidate_actions.Length > 0
                ? cible.candidate_actions[0] : cible.suggested_action;
            Assert.IsNotNull(action, "la carte doit porter une issue");

            yield return detail.ResolveWith(action);   // ⛔ MUTATION RÉELLE
            Assert.IsNull(detail.LastError, $"la résolution a échoué : {detail.LastError}");
            Assert.IsNotEmpty(detail.LastOutcome,
                "le back doit rendre un `outcome` — c'est TOUT l'objet de cette capture");
            Debug.Log($"[APRES-TAMPON] outcome = {detail.LastOutcome}");
            for (int i = 0; i < 45; i++) yield return null;

            LisibiliteDuTexte(detail.gameObject);

            yield return CapturerA(1080, 2400,
                "Assets/Screenshots/screen_5a_detail_apres-tampon_sous_chrome_1080x2400.png");
        }

        [UnityTest]
        
        /// <summary>⑩ SOUS LE CHROME — la main de cartes, état NON MUTANT.
        ///
        /// Ouvre le détail par le CHEMIN JOUEUR : on touche un attendant de ⑨, qui monte ⑩ en
        /// surimpression. Rien n'est résolu — cette capture ne consomme aucune carte et peut
        /// donc être rejouée autant de fois qu'on veut.
        /// ⚠️ L'état « après le tampon » est dans un test SÉPARÉ parce qu'il MUTE : il consomme
        /// une exception pour de bon. Les mélanger ferait d'une capture rejouable une capture
        /// qui abîme le compte à chaque exécution.</summary>
        [Category("CaptureDetail")]
        public IEnumerator Capture_Detail_MainDeCartes_SousChrome()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("DetailShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;
            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir sa session");
            for (int i = 0; i < 30; i++) yield return null;

            var file = shell.MonterLocataireEnSurimpression<
                MafiaCleanCity.Operational.Exceptions.ExceptionQueueController>();
            Assert.IsNotNull(file, "⑨ doit être monté");
            float tc = Time.realtimeSinceStartup;
            while ((file.Cards == null || file.Cards.Length == 0)
                   && Time.realtimeSinceStartup - tc < 30f) yield return null;
            Assert.Greater(file.Cards.Length, 0, "la file doit porter des cartes");

            // ⛔ LE GESTE JOUEUR, pas un montage forcé : on TOUCHE un attendant.
            var attendants = file.AttendantsPourTest();
            Assert.Greater(attendants.Count, 0, "⑨ doit porter des attendants touchables");
            attendants[0].onClick.Invoke();
            for (int i = 0; i < 60; i++) yield return null;

            Assert.IsNotNull(file.LastDetail, "toucher un attendant doit ouvrir ⑩");
            GameObject feuille = GameObject.Find("ExceptionDetailSheet");
            Assert.IsNotNull(feuille, "⑩ n'a pas construit sa feuille");
            int noeuds = feuille.GetComponentsInChildren<Transform>(true).Length;
            Assert.Greater(noeuds, 15, $"⑩ doit avoir du contenu (mesuré {noeuds} nœuds)");

            // GARDE A4 — écrite avant de regarder l'image, comme sur ② et ㊱.
            var rt = (RectTransform)feuille.transform;
            Assert.Greater(MafiaCleanCity.Shell.ShellChrome.BottomInsetPx, 0f,
                "sous le chrome les insets doivent être publiés, sinon la garde ne mesure rien");
            Assert.GreaterOrEqual(rt.offsetMin.y, MafiaCleanCity.Shell.ShellChrome.BottomInsetPx,
                $"⑩ démarre à {rt.offsetMin.y:F0} et le dock occupe " +
                $"{MafiaCleanCity.Shell.ShellChrome.BottomInsetPx:F0} : il passe DESSOUS.");
            Assert.LessOrEqual(rt.offsetMax.y, -MafiaCleanCity.Shell.ShellChrome.TopInsetPx,
                $"⑩ monte à {rt.offsetMax.y:F0} et le bandeau occupe " +
                $"{MafiaCleanCity.Shell.ShellChrome.TopInsetPx:F0} : il passe DESSOUS.");

            LisibiliteDuTexte(feuille);

            yield return CapturerA(1080, 2400,
                "Assets/Screenshots/screen_5a_detail_main-de-cartes_sous_chrome_1080x2400.png");
        }

        [UnityTest]
        
        
        
        /// <summary>⑨ SOUS LE CHROME — le bandeau et le dock, enfin dans l'image.
        ///
        /// ⛔ Ce que les captures hors shell ne pouvaient pas montrer, et que celle-ci tranche :
        /// que rien ne passe sous le bandeau haut, et que rien ne touche le dock. C'était l'angle
        /// mort déclaré de ⑨ ET de ㊲ pendant huit tours de juge.
        ///
        /// ⚠️ ⑨ s'ouvre EN SURIMPRESSION — ce n'est pas un onglet. Cinq tentatives antérieures ont
        /// échoué parce que `UnmountCurrentTenant()` vide tout `ContentSlot` et qu'il est appelé
        /// par CHAQUE `ActivateTab` : un écran monté en surimpression était emporté par n'importe
        /// quel geste d'onglet ultérieur, y compris ceux que le shell se donne à lui-même.
        /// ★ J'avais alors fait varier l'ATTENTE, en cherchant le bon moment. Il n'y en avait pas :
        ///   le risque ne décroissait pas avec le temps, il croissait. La question n'était pas
        ///   « quand monter » mais « qu'est-ce qui démonte ».
        ///
        /// Le compte de démo est l'identité PAR DÉFAUT du shell : on ne pose pas d'identité, et
        /// c'est voulu — un compte neuf aurait une file vide, et la capture sortirait pleine,
        /// valide, et sans une seule exception à montrer.</summary>
        [Category("CaptureSousChrome")]
        public IEnumerator Capture_EcranExceptions_SousChrome()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("ExceptionsShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");

            // On monte APRÈS avoir laissé le shell finir ses propres gestes d'onglet : c'est eux
            // qui emportaient la surimpression.
            for (int i = 0; i < 30; i++) yield return null;
            var ecran = shell.MonterLocataireEnSurimpression<
                MafiaCleanCity.Operational.Exceptions.ExceptionQueueController>();
            Assert.IsNotNull(ecran, "la surimpression doit avoir monté ⑨");

            // ⛔ ATTENDRE LA CONDITION, PAS UN NOMBRE DE FRAMES. Ma première version comptait 120
            // frames et a capturé une file VIDE : le shell signe sa session PUIS ⑨ signe la
            // sienne et charge, et 120 frames ne suffisaient pas. La garde anti-vacuité l'a
            // attrapée (7 nœuds), sinon je publiais un écran « calme » alors que le compte porte
            // trois exceptions en attente — mesuré à la même minute sur la route.
            // ★ Un nombre de frames est une SUPPOSITION sur la durée d'un travail asynchrone.
            //   Elle est juste jusqu'au jour où la machine est chargée, et ce jour-là elle produit
            //   une image plausible et fausse.
            float tCharge = Time.realtimeSinceStartup;
            while ((ecran.Cards == null || ecran.Cards.Length == 0)
                   && Time.realtimeSinceStartup - tCharge < 30f) yield return null;
            Assert.IsNotNull(ecran.Cards, "⑨ n'a jamais chargé sa file sous le chrome");
            Assert.Greater(ecran.Cards.Length, 0,
                "la file du compte de démo est VIDE ici alors que la route en rend trois : " +
                "la capture montrerait un état « calme » qui n'existe pas.");
            for (int i = 0; i < 30; i++) yield return null;   // laisser le rendu se poser

            Assert.IsNotNull(shell.TopBar, "le chrome haut doit exister — c'est TOUT l'objet de cette capture");
            Assert.IsTrue(shell.UneSurimpressionAEteMontee, "⑨ doit être monté en surimpression");

            // Anti-vacuité : sous la racine CONSTRUITE, jamais sous le contrôleur — il ne porte
            // aucun enfant visuel, et compter ses enfants revient à le compter lui.
            GameObject racineUI = GameObject.Find("ExceptionQueueRoot");
            Assert.IsNotNull(racineUI, "⑨ n'a construit aucune racine d'interface sous le chrome");
            int noeuds = racineUI.GetComponentsInChildren<Transform>(true).Length;
            Assert.Greater(noeuds, 15,
                $"⑨ doit avoir construit son contenu (mesuré {noeuds} noeuds sous sa racine)");

            // ⛔ GARDE A4 — le contenu ne passe PAS sous le dock.
            // La première capture sous chrome a montré « Escalades archivées » derrière les quatre
            // boutons de navigation. Une garde structurelle le dit maintenant en clair, au lieu
            // de dépendre de quelqu'un qui regarde l'image au bon moment.
            var comptoirRt = racineUI.transform.Find("Comptoir") as RectTransform;
            Assert.IsNotNull(comptoirRt, "⑨ doit porter son comptoir");
            Assert.GreaterOrEqual(comptoirRt.offsetMin.y, MafiaCleanCity.Shell.ShellChrome.BottomInsetPx,
                $"le comptoir de ⑨ démarre à {comptoirRt.offsetMin.y:F0} alors que le dock occupe " +
                $"{MafiaCleanCity.Shell.ShellChrome.BottomInsetPx:F0} : le contenu passe DESSOUS.");
            Assert.Greater(MafiaCleanCity.Shell.ShellChrome.BottomInsetPx, 0f,
                "sous le chrome, l'inset bas doit être publié — à zéro, la garde ci-dessus " +
                "passerait toujours et ne mesurerait rien");

            LisibiliteDuTexte(racineUI);

            yield return CapturerA(1080, 2400,
                "Assets/Screenshots/screen_5_exceptions_sous_chrome_1080x2400.png");
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
        /// ⛔ CATÉGORIE PROPRE, ajoutée le 2026-09-02 : cette capture ne portait que `Capture`,
        /// la catégorie de CLASSE que TOUS les tests de ce fichier portent. Elle était donc
        /// INJOIGNABLE seule — l'atteindre exigeait de demander `Capture` nu, qui emporte par
        /// PRÉFIXE les treize tests du fichier et fait SIGSEGV dans Mesa.
        /// ★ Je venais d'armer `LisibiliteDuTexte` ici en écrivant « les 7 captures sous chrome,
        ///   toutes armées ». Armée, elle l'était ; ATTEIGNABLE, non. Une garde qu'aucun run
        ///   praticable n'exécute est une garde qui n'existe pas — la même leçon que celle qui
        ///   m'a fait l'étendre, rencontrée un cran plus loin.
        /// ⇒ Ses cinq sœurs adressables s'appellent déjà CaptureDetail / CaptureFiche /
        ///   CaptureExceptions / CaptureHorizon / CaptureSousChrome ; celle-ci suit.
        [Category("CaptureReputation")]
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

            LisibiliteDuTexte(shell.ContentSlot.gameObject);

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
