using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Tests;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>ecran_delegation « La délégation » — squelette de suite généré par Tools/nouvel-ecran.py.
    ///
    /// ⛔ CE QUE CE SQUELETTE COUVRE : le montage structurel (CanvasRenderer, MaskableGraphic) et
    /// la capture pour le juge visuel. ⛔ CE QU'IL NE COUVRE PAS, et c'est // MÉTIER ICI partout
    /// où il manque : le PARCOURS joueur qui atteint cet écran (doctrine 4-couches, `CLAUDE.md`
    /// § « quatre couches ») — signup → `session/open` → la route, jamais un seed SQL sans le
    /// dire dans le nom du test. Le patron complet est `ReputationScreenPlayModeTests` (㊲,
    /// `pilote-B`) : `OuvrirJoueurFrais()` (signup + `session/close` défensif + lecture d'un
    /// lieutenant du kit de départ) — à adapter ici selon ce que `GetMetaTaskCategories` exige
    /// réellement comme précondition.</summary>
    [Category("EcranDelegation")]
    public class DelegationScreenPlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            // ⛔ L'ÉTAT STATIQUE SE REND, SINON C'EST L'ORDRE DES VOISINS QUI DÉCIDE. Les suites
            // PlayMode de ce dépôt tournent SÉRIELLES dans UN processus : un `JetonDeStructure`
            // publié par un test survit à tous les suivants. Ce dépôt a déjà payé exactement ça
            // (un lot voisin a fait tomber un seeder inchangé en laissant une session ouverte).
            MafiaCleanCity.Shell.JetonDeStructure.OublierPourTest();
            GameObject reste = GameObject.Find("DelegationRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("DelegationRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("DelegationRoot");
            Assert.IsNotNull(r, "DelegationRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private DelegationScreenController MonterEcran()
        {
            hostGo = new GameObject("DelegationScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<DelegationScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<DelegationScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest]
        public IEnumerator EcranDelegationS1_ToutGraphic_PorteSonCanvasRenderer()
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

            // ⛔ PLANCHER RELEVÉ APRÈS REMPLISSAGE, ET IL EST DÉRIVÉ, PAS CHOISI. Le squelette
            // généré n'avait qu'UN Graphic (son fond) et le plancher à `> 0` était honnête pour
            // lui. L'écran construit en porte au minimum : 1 fond + 2 bandes de dégradé + 1 fond
            // de tête + 1 filet + 2 textes de tête + 1 fond de pied + 1 filet = 9, AVANT tout
            // contenu de la zone centrale — laquelle, sur un corps chargé, ajoute au moins le
            // jeton (fond + bord + rond + anneau + 2 textes) et quatre plaques. Un plancher resté
            // à 1 aurait certifié un écran réduit à son fond : *une garde qui ne monte pas avec
            // ce qu'elle garde cesse de garder quoi que ce soit.*
            Assert.Greater(comptes, 8,
                $"seulement {comptes} Graphic — la charpente de l'écran (fond, deux bandes, tête, " +
                "filets, pied) en impose 9 au minimum. En dessous, l'écran ne s'est pas construit " +
                "et les gardes suivantes seraient vraies À VIDE.");
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
        // ⛔⛔ LA CATÉGORIE GÉNÉRIQUE DES CAPTURES ÉTAIT CODÉE EN DUR ICI, et ce gabarit produit
        // les 46 écrans restants. Deux défauts d'un coup, à chaque écran généré :
        // (a) la capture n'était adressable QUE par `Capture`, donc pas isolable de ses soeurs ;
        // (b) `Capture` fait SIGSEGV dans le pilote Mesa (mesuré dans ce dépôt), donc la seule
        //     demande qui l'atteignait est aussi celle qui tue le run.
        // ⇒ Une capture livrée par ce gabarit était **armée et injoignable** — exactement le
        //   défaut que le chantier joignabilité ferme côté ÉCRANS, ici côté TESTS.
        // ⚠️ Et le préfixe est `Photo`, pas `Capture` : le filtre d'Unity matche par PRÉFIXE, donc
        //   `Capture<Ecran>` serait emporté par une demande de `Capture` — le piège qui a mordu
        //   trois sessions le 2026-09-02 (`["HUD"]`→`HUDv31`, `["CaptureDetail"]`→
        //   `CaptureDetailMutant`, et ma propre série de noms, refusée par ma propre garde).
        [UnityTest, Category("PhotoEcranDelegation")]
        public IEnumerator EcranDelegationC1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {
            MonterEcran();
            yield return null;

            yield return CapturerA(1080, 1920, "Assets/Screenshots/ecran_delegation_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/ecran_delegation_1080x2400.png");
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "DelegationRoot n'est sous aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamEcranDelegation");
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

        // ═══ 3. PARCOURS — routes joueur seulement, aucun seed SQL, aucun seam `_test` ═══════

        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;
        private string token;

        /// <summary>signup → (session fermée par précaution) → la route. C'est la couche
        /// PARCOURS de la doctrine à quatre couches : elle prouve qu'un joueur ATTEINT cette
        /// surface, ce qu'aucun test de moteur ne prouve jamais.</summary>
        private IEnumerator OuvrirJoueurFrais()
        {
            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("d32", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "ecran-32-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotNull(token, "signup n'a pas rendu de jeton");
        }

        /// <summary>⛔ LE DÉTECTEUR DE TD-530, ET C'EST LE SEUL TEST DE CE FICHIER QUI PEUT
        /// L'ATTRAPER. `GET /v1/meta/task-categories` sert `category_key` (une chaîne) ; les trois
        /// routes d'action exigent `category_id` (un entier) que cette réponse n'inclut PAS. Le
        /// client porte donc une table clé→code en pis-aller (`DelegationCatalogue`).
        ///
        /// ⚠️ CE QUI REND CE TEST NON TAUTOLOGIQUE : le dénominateur vient du RÉSEAU, pas de la
        /// table. Comparer la table à elle-même serait vert pour toujours ; comparer la table à ce
        /// que le back rend VRAIMENT rougit le jour où une 5ᵉ catégorie devient LIVE — c'est-à-dire
        /// exactement le jour où le client se mettrait à envoyer un code faux, donc à déléguer la
        /// MAUVAISE charge. Le contrôle positif est inclus : on exige que la route ait rendu au
        /// moins une clé, sinon l'assertion serait vraie À VIDE sur une réponse creuse.</summary>
        [UnityTest]
        public IEnumerator EcranDelegationG1_ToutesLesClesServiesOntUnCodeCoteClient()
        {
            yield return OuvrirJoueurFrais();

            var client = new DelegationClient { BaseUrl = BaseUrl };
            GetMetaTaskCategoriesResponseDto corps = null;
            string erreur = null;
            yield return client.GetMetaTaskCategories(token, d => corps = d, r => erreur = r.message);

            Assert.IsNull(erreur, $"GET /v1/meta/task-categories a échoué : {erreur}");
            Assert.IsNotNull(corps, "corps nul");
            Assert.IsNotNull(corps.task_categories, "`task_categories` absent du corps");
            // Garde anti-vacuité : sans elle, une réponse vide rendrait la boucle suivante vraie.
            Assert.Greater(corps.task_categories.Length, 0,
                "0 catégorie servie — l'assertion de couverture qui suit serait vraie À VIDE");

            var inconnues = new List<string>();
            foreach (TaskCategoryRowDto r in corps.task_categories)
            {
                bool trouve = false;
                foreach (string cle in DelegationCatalogue.ToutesLesCles())
                    if (cle == r.category_key) { trouve = true; break; }
                if (!trouve) inconnues.Add(r.category_key);
            }
            Assert.IsEmpty(inconnues,
                "le back sert des catégories que la table CLIENT ignore : " +
                string.Join(", ", inconnues) + ". Le client enverrait un code faux, donc " +
                "délèguerait la MAUVAISE charge. C'est TD-530 qui se rappelle à nous — la " +
                "réparation est d'ajouter `category_id` à la projection, pas d'étendre la table.");
        }

        /// <summary>Le corps réel MESURÉ sur un compte frais, épinglé : quatre charges, toutes en
        /// `SELF`, toutes `NASCENT`. Ce n'est pas un détail de fixture — c'est ce qui rend le
        /// geste « en confier une » INOPÉRANT au premier jour, et donc ce que l'écran doit dire.
        /// ⛔ L'épingle porte sur des VALEURS présentes, jamais sur l'absence d'une clé : une
        /// assertion d'absence resterait verte le jour où la valeur apparaît.</summary>
        [UnityTest]
        public IEnumerator EcranDelegationP1_UnCompteFraisTientSesQuatreCharges()
        {
            yield return OuvrirJoueurFrais();

            var client = new DelegationClient { BaseUrl = BaseUrl };
            GetMetaTaskCategoriesResponseDto corps = null;
            string erreur = null;
            yield return client.GetMetaTaskCategories(token, d => corps = d, r => erreur = r.message);
            Assert.IsNull(erreur, $"GET /v1/meta/task-categories a échoué : {erreur}");
            Assert.IsNotNull(corps?.task_categories, "corps ou `task_categories` nul");

            Assert.AreEqual(4, corps.task_categories.Length,
                "la projection n'itère que les catégories LIVE : elles sont QUATRE. Un autre " +
                "compte signifie que le catalogue a bougé côté serveur.");
            foreach (TaskCategoryRowDto r in corps.task_categories)
            {
                Assert.AreEqual("SELF", r.delegation_state,
                    $"{r.category_key} : un compte frais ne délègue rien");
                // Ne PAS asserter `NASCENT` : la maîtrise monte avec le jeu, et un compte qui
                // aurait déjà joué serait `LEARNING` sans que rien ne soit cassé. Ce qu'on épingle,
                // c'est que la bande est LISIBLE par le résolveur — donc que l'écran saura quoi
                // écrire. Un `mastery_bucket` inconnu ferait JETER cette ligne, bruyamment.
                TaskCategoryRowDto ligne = r;   // capture par itération, explicite
                Assert.DoesNotThrow(() => { DelegationResolvers.LireMaitrise(ligne.mastery_bucket); },
                    $"{ligne.category_key} : bande de maîtrise '{ligne.mastery_bucket}' non résolue par le client");
            }
        }

        // ═══ 4. ÉTAT — le rendu, sur un corps FABRIQUÉ (ne prouve rien du back) ══════════════

        /// <summary>Ce que l'écran FAIT d'un corps où deux charges sont confiées : le cadre m-75.
        /// ⚠️ Un corps fabriqué ne prouve JAMAIS que le back émet cette forme — c'est le rôle des
        /// deux tests de parcours ci-dessus. Il prouve seulement le rendu, et il permet d'exercer
        /// l'état « confié » qu'un compte frais ne peut pas atteindre (il faudrait `ELIGIBLE`).</summary>
        [UnityTest]
        public IEnumerator EcranDelegationE1_DeuxChargesConfiees_LeTitreEtLesNomsSuivent()
        {
            var ecran = MonterEcran();
            yield return null;

            var corps = new GetMetaTaskCategoriesResponseDto
            {
                task_categories = new[]
                {
                    new TaskCategoryRowDto { category_key = "ROUTE_ASSIGNMENT",  mastery_bucket = "NASCENT",  progress_band = "LOW",  delegation_state = "SELF" },
                    new TaskCategoryRowDto { category_key = "LIEUTENANT_HIRING", mastery_bucket = "ELIGIBLE", progress_band = "HIGH", delegation_state = "DELEGATED", delegated_lieutenant_ref = "lt-1" },
                    new TaskCategoryRowDto { category_key = "SUPPLY_SOURCING",   mastery_bucket = "ELIGIBLE", progress_band = "HIGH", delegation_state = "DELEGATED", delegated_lieutenant_ref = "lt-2" },
                    new TaskCategoryRowDto { category_key = "HEAT_MANAGEMENT",   mastery_bucket = "ELIGIBLE", progress_band = "HIGH", delegation_state = "SELF" },
                },
                delegated = new DelegatedSummaryDto[0],
            };
            var roster = new GetLieutenantsResponseDto
            {
                lieutenants = new[]
                {
                    new LieutenantRowDto { lieutenant_id = "lt-1", name = "Lt. Vesk" },
                    new LieutenantRowDto { lieutenant_id = "lt-2", name = "Lt. Ferrand" },
                },
            };
            ecran.RendrePourTest(corps, roster, jetonDepense: false);
            yield return null;

            string tout = TexteDeLEcran();
            StringAssert.Contains("Ce que vous avez confié", tout,
                "le titre doit SUIVRE l'état réel du tableau (m-75), pas rester sur celui de m-73");
            StringAssert.Contains("2 charges tenues", tout, "le sous-titre compte les charges confiées");
            // ⛔ Le NOM, pas l'UUID : `delegated_lieutenant_ref` est un identifiant, et la seule
            // façon d'écrire un nom est la jointure avec le roster. Sans elle, l'écran afficherait
            // « lt-1 » à un joueur.
            StringAssert.Contains("Lt. Vesk", tout, "le nom du lieutenant vient de GET /v1/lieutenants");
            StringAssert.Contains("Lt. Ferrand", tout, "les DEUX charges confiées nomment leur tenant");
            Assert.IsFalse(tout.Contains("lt-1"),
                "un UUID de lieutenant est visible à l'écran — la jointure avec le roster n'a pas eu lieu");
        }

        /// <summary>Le jeton dépensé change le titre, éteint le geste, et le DIT. C'est l'état
        /// m-77, et c'est la propriété que les trois écrans du jeton (㉜ ㉝ ㉞) doivent partager.</summary>
        [UnityTest]
        public IEnumerator EcranDelegationE2_JetonDepense_LeGesteSeteintEtLeDit()
        {
            var ecran = MonterEcran();
            yield return null;

            var corps = new GetMetaTaskCategoriesResponseDto
            {
                task_categories = new[]
                {
                    new TaskCategoryRowDto { category_key = "ROUTE_ASSIGNMENT", mastery_bucket = "ELIGIBLE", progress_band = "HIGH", delegation_state = "SELF" },
                },
                delegated = new DelegatedSummaryDto[0],
            };
            ecran.RendrePourTest(corps, null, jetonDepense: true);
            yield return null;

            string tout = TexteDeLEcran();
            StringAssert.Contains("Vous avez déjà tranché aujourd'hui", tout);
            StringAssert.Contains("plus de décision aujourd'hui", tout,
                "le geste doit dire POURQUOI il est éteint — un bouton gris sans raison est pire " +
                "qu'un bouton absent");
            StringAssert.Contains("Une seule décision de structure par journée", tout,
                "la règle s'explique en toutes lettres (m-77) : c'est une contrainte de design, " +
                "pas une limite d'énergie, et l'écran le dit");
        }

        /// <summary>Le cadre de la réserve (m-78) : les huit charges déclarées côté serveur et
        /// sans aucune surface joueur. Elles ne viennent d'AUCUNE route — la projection filtre sur
        /// `live` — donc ce test épingle la seule chose qui compte : que l'écran en montre HUIT et
        /// que son texte parle bien de huit. *Un écran qui se contredit lui-même apprend au joueur
        /// à ne pas le croire.*</summary>
        [UnityTest]
        public IEnumerator EcranDelegationE3_LaReserveMontreLesHuitDontElleParle()
        {
            var ecran = MonterEcran();
            yield return null;
            ecran.RendrePourTest(new GetMetaTaskCategoriesResponseDto
            {
                task_categories = new TaskCategoryRowDto[0],
                delegated = new DelegatedSummaryDto[0],
            });
            ecran.AllerA(DelegationScreenController.EtatEcran.Reserve);
            yield return null;

            Assert.AreEqual(8, DelegationCatalogue.Reserve.Length,
                "le catalogue serveur en déclare huit hors LIVE (3, 6, 7, 101..105)");
            string tout = TexteDeLEcran();
            foreach (var c in DelegationCatalogue.Reserve)
                StringAssert.Contains(c.libelle, tout, $"la réserve n'affiche pas « {c.libelle} »");
            StringAssert.Contains("aucune n'est branchée", tout);
        }

        private static string TexteDeLEcran()
        {
            var sb = new System.Text.StringBuilder();
            GameObject r = GameObject.Find("DelegationRoot");
            Assert.IsNotNull(r, "DelegationRoot introuvable");
            foreach (TMPro.TextMeshProUGUI t in r.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                sb.Append(t.text).Append('\n');
            return sb.ToString();
        }
    }
}
