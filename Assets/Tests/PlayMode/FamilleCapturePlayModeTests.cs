using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Lieutenant;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯ LA REVUE DU JOUR — capture du chemin de PRODUCTION, régime « full prod » du 2026-09-01.
    //
    // Ce n'est pas une suite : c'est le « test simple » que le ruling autorise — compile + UNE
    // capture, et le critère de fini est « c'est bien ce qu'on veut », montré à l'user.
    //
    // ⚠️ Une capture est un chemin d'intégration exécuté de bout en bout (signup, session,
    // montage, rendu). À ce titre elle porte les gardes qui rendraient l'image MENSONGÈRE, et
    // elles seulement : l'onglet est réellement entré, le contrôleur est réellement monté, et
    // l'image n'est pas noire. Sans elles, une capture d'écran vide passe pour une réussite.
    // `[Category]` ajoutée le 2026-09-02 : sans elle, ce test n'était atteignable par AUCUN run
    // `MafiaCI.RunPlayModeTests` (filtre par catégorie, MAFIA_CI_CATEGORIES compris) — la capture
    // du 2026-09-01 avait été prise par un autre chemin, non consigné. Même patron que
    // `CaptureDistrict` / `CaptureReputation`.
    [Category("CaptureFamille")]
    public class FamilleCapturePlayModeTests
    {
        private Scene sceneDeDemarrage;

        private IEnumerator ChargerLaSceneDeDemarrageDuBuild()
        {
            LogAssert.ignoreFailingMessages = true;
            Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1,
                "Build Settings vides : aucune scène de démarrage ⇒ un build ne montrerait AUCUN écran.");
            string chemin = SceneUtility.GetScenePathByBuildIndex(0);
            Assert.IsNotEmpty(chemin, "la scène d'index de build 0 n'a pas de chemin");
            AsyncOperation chargement = SceneManager.LoadSceneAsync(chemin, LoadSceneMode.Single);
            while (chargement != null && !chargement.isDone) yield return null;
            yield return null;
            sceneDeDemarrage = SceneManager.GetActiveScene();
        }

        private static AppShell SondeShellDansLaScene(Scene scene)
        {
            if (!scene.IsValid() || !scene.isLoaded) return null;
            foreach (GameObject racine in scene.GetRootGameObjects())
            {
                AppShell trouve = racine.GetComponentInChildren<AppShell>(true);
                if (trouve != null) return trouve;
            }
            return null;
        }

        [UnityTest]
        public IEnumerator Capture_Famille_1080x2400()
        {
            const int Largeur = 1080, Hauteur = 2400;
            const string Chemin = "Assets/Screenshots/famille_1080x2400.png";

            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, "aucun AppShell dans la scène de démarrage du build");

            // L'acquisition de session du shell doit être RÉSOLUE avant de changer d'onglet :
            // elle rappelle l'onglet par défaut quand elle aboutit, et ramènerait de force la vue
            // ailleurs au milieu de la capture (course mesurée sur ce shell le 2026-08-21).
            float attente = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && attente < 20f)
            {
                attente += Time.deltaTime;
                yield return null;
            }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab,
                "acquisition de session du shell non résolue — toute capture prise ici serait celle d'un autre écran");

            // ⛔ 2026-09-02 (capture DA silhouettes, 1er run : « frère 0 sur 3 ») : `CurrentTab`
            //    passe à Empire UNE FRAME AVANT que l'acquisition monte les panneaux d'Accueil
            //    (AcquisitionNEnterrePasLEcranOuvertPlayModeTests l'établit pour les surimpressions ;
            //    un ONGLET activé dans la même fenêtre subit le même recouvrement). On attend donc
            //    que le ContentSlot soit STABLE — même nombre d'enfants sur 10 frames consécutives —
            //    avant de changer d'onglet : c'est l'événement (les panneaux posés), pas son proxy.
            //    ⚠️ Cette attente rend la CAPTURE fiable ; elle ne répare rien en production, où
            //    personne n'attend dix frames stables avant de toucher l'écran (remarque de 98).
            //    Et elle n'était PAS la cause des deux premiers rouges — voir la garde de fratrie.
            {
                int stable = 0, dernier = -1; float ts = 0f;
                while (stable < 10 && ts < 10f)
                {
                    int n = shell.ContentSlot.childCount;
                    stable = (n == dernier) ? stable + 1 : 0; dernier = n;
                    ts += Time.deltaTime; yield return null;
                }
            }

            shell.ActivateTab(AppShell.Tab.Org);
            LieutenantScreenController famille = null;
            float montage = 0f;
            while (montage < 15f && famille == null)
            {
                famille = shell.ContentSlot.GetComponentInChildren<LieutenantScreenController>(false);
                montage += Time.deltaTime;
                yield return null;
            }
            Assert.IsNotNull(famille,
                "LieutenantScreenController non monté sous l'onglet Org — la capture montrerait une destination vide");

            // Laisser le chargement (signin → review → roster) aboutir : une capture prise avant
            // rendrait un comptoir vide et l'écran aurait l'air correct.
            float charge = 0f;
            while (charge < 20f && famille.CurrentRoster == null || famille.CurrentRoster.Length == 0)
            {
                charge += Time.deltaTime;
                yield return null;
            }
            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;

            // ⚠️ `FindFirstObjectByType<Canvas>` rend le PREMIER canvas de la scène, pas celui qui
            // porte l'écran : basculer celui-là en mode caméra ne rendrait rien de ce qu'on veut
            // capturer. On remonte donc depuis l'écran monté jusqu'à SON canvas racine — la seule
            // relation qui garantit qu'on bascule le bon.
            Canvas canvas = famille.GetComponentInParent<Canvas>();
            if (canvas != null) canvas = canvas.rootCanvas;
            Assert.IsNotNull(canvas, "l'écran monté n'est sous AUCUN canvas — rien ne serait rendu");
            Debug.Log($"[CAPTURE diag] canvas={canvas.name} mode={canvas.renderMode} " +
                      $"contentSlot.parentCanvas={(shell.ContentSlot.GetComponentInParent<Canvas>() != null ? shell.ContentSlot.GetComponentInParent<Canvas>().name : "AUCUN")} " +
                      $"famille.parent={(famille.transform.parent != null ? famille.transform.parent.name : "AUCUN")}");

            // ⛔ UN CANVAS EN *SCREEN SPACE OVERLAY* N'EST PAS RENDU PAR UNE CAMÉRA — il est composé
            // directement sur l'écran, APRÈS toutes les caméras. Une capture par `targetTexture`
            // rend donc le fond de la caméra, et rien d'autre : ma première image était un GRIS
            // UNIFORME, et ma garde « pas noire » l'a laissée passer sans broncher.
            // ⇒ On bascule le canvas en *Screen Space Camera* le temps du rendu, puis on rétablit.
            RenderMode modePrecedent = canvas.renderMode;
            Camera cameraPrecedente = canvas.worldCamera;
            float planPrecedent = canvas.planeDistance;

            GameObject camGo = new GameObject("CaptureRevueCam");
            Camera cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;
            var rt = new RenderTexture(Largeur, Hauteur, 24, RenderTextureFormat.ARGB32);
            cam.targetTexture = rt;

            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;

            // ⛔⛔ LA CAUSE DE L'IMAGE VIDE, ET ELLE N'EST PAS DEVINÉE — elle est reprise du
            // diagnostic déjà écrit dans `ReputationScreenPlayModeTests` (chercher qui exerce déjà
            // la même couture AVANT d'écrire un instrument : cette couture-là était résolue depuis
            // une heure, et je l'ai réinventée pour rien).
            // Une caméra orthographique voit 2 × `orthographicSize` unités de haut : la valeur par
            // DÉFAUT est 5, donc DIX unités — pour un canvas qui en fait plus de deux mille. Elle
            // cadrait 0,4 % de l'écran, dans une zone vide. D'où l'aplat.
            // ⚠️ Et la demi-hauteur se mesure sur le rect RÉEL après reconstruction, jamais depuis
            // la résolution demandée : le canvas porte un `CanvasScaler`, donc ses unités ne sont
            // PAS les pixels de la cible.
            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;
            Debug.Log($"[CAPTURE diag] canvas.rect={crt.rect.width:F0}x{crt.rect.height:F0} " +
                      $"orthoSize={cam.orthographicSize:F1} scaleFactor={canvas.scaleFactor:F3}");
            cam.Render();

            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(Largeur, Hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, Largeur, Hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            canvas.renderMode = modePrecedent;
            canvas.worldCamera = cameraPrecedente;
            canvas.planeDistance = planPrecedent;

            System.IO.File.WriteAllBytes(Chemin, tex.EncodeToPNG());
            // ⛔ « PAS NOIRE » EST LA MAUVAISE PROPRIÉTÉ, et un gris uniforme la satisfait — c'est
            // exactement ce qui est arrivé au premier essai : 2 592 000 pixels sur 2 592 000
            // déclarés « non noirs », pour une image ENTIÈREMENT VIDE. La propriété qui discrimine
            // est la VARIÉTÉ : un écran rendu porte des dizaines de teintes, un fond de caméra une
            // seule. On compte donc les couleurs DISTINCTES, pas la luminosité.
            var teintes = new System.Collections.Generic.HashSet<int>();
            Color[] pixels = tex.GetPixels();
            foreach (Color c in pixels)
            {
                teintes.Add((Mathf.RoundToInt(c.r * 31) << 10) | (Mathf.RoundToInt(c.g * 31) << 5) | Mathf.RoundToInt(c.b * 31));
            }
            Debug.Log($"[CAPTURE] {Chemin} {Largeur}x{Hauteur} — {teintes.Count} teintes distinctes · " +
                      $"roster={(famille.CurrentRoster != null ? famille.CurrentRoster.Length : -1)}");
            // ⛔⛔ CETTE GARDE A CERTIFIÉ UN ÉCRAN ABSENT — mesuré le 2026-09-02 sur ㉟. Elle
            // comptait les teintes de TOUTE l'image, donc elle passait au vert dès que N'IMPORTE
            // QUEL écran rendait : la capture montrait la carte de la ville, l'autonomie et le
            // dock empilés, 616 teintes, et le locataire nulle part. La grandeur qui discrimine
            // n'est pas la variété du CADRE, c'est la taille du LOCATAIRE : un RectTransform neuf
            // fait 100x100, et un écran de cette taille ne dessine rien de visible.
            // ⇒ Contrôle de FORME, indépendant de tout pixel, posé AVANT le compte de teintes —
            // c'est le seul qui pouvait voir ce défaut, et il coûte deux lignes.
            // ⛔⛔ ET L'OCCLUSION SE VÉRIFIE AVANT LA TAILLE — c'est le défaut que la garde de
            // taille a laissé passer le 2026-09-02, sur DEUX écrans. `rect=1280x960`, bonne
            // taille, bon canvas, bon parent : et `frere=1/8`, donc six frères dessinés par
            // dessus. La capture montrait la carte de la ville ; l'écran, nulle part.
            // ⇒ Propriété STRUCTURELLE, sans un seul pixel : le locataire doit être le DERNIER
            // enfant de son parent. *Une mesure de fidélité sur un objet occlus mesure le
            // VOISIN* — et rend un verdict d'autant plus rassurant qu'il est faux.
            Transform parentDuFamille = famille.transform.parent;
            // ⛔ 2026-09-02, capture DA silhouettes, deux runs rouges « frère 0 sur 3 » : la garde
            //    d'origine comparait un RANG (`childCount - 1 == GetSiblingIndex()`), et les deux
            //    frères d'après étaient `LieutenantBackdrop` et `LieutenantSheet` — les PROPRES
            //    parties de l'écran, que `LieutenantScreenController` crée sous `mountParent`
            //    (= ContentSlot) APRÈS s'y être placé dernier. « Ce qui vient après moi dans la
            //    fratrie » n'est pas « ce qui m'enterre » (98 a payé le même angle mort sur
            //    Laundering le même jour). ⇒ On NOMME les frères d'après et on exclut ceux que
            //    l'écran a fabriqués lui-même ; ce qui reste est un occultant, et il est cité.
            {
                var occultants = new System.Collections.Generic.List<string>();
                for (int k = famille.transform.GetSiblingIndex() + 1; k < parentDuFamille.childCount; k++)
                {
                    Transform f = parentDuFamille.GetChild(k);
                    if (!f.gameObject.activeInHierarchy) continue;
                    if (f.name == "LieutenantBackdrop" || f.name == "LieutenantSheet") continue; // parties de l'écran
                    occultants.Add(f.name);
                }
                Assert.IsEmpty(occultants,
                    $"le locataire est le frère {famille.transform.GetSiblingIndex()} sur {parentDuFamille.childCount} "
                    + $"et se fait recouvrir par : [{string.Join(", ", occultants)}] — la capture montrerait ces "
                    + "écrans-là, pas la Famille");
            }
            // ⛔ 2026-09-02 (run 3) : `(RectTransform)famille.transform` jetait InvalidCastException —
            //    le shell crée l'hôte du locataire par `new GameObject("Tenant_…")`, un Transform NU
            //    (AppShell.ConstruireLocataire). Ce qui a une taille, c'est la FEUILLE que l'écran
            //    construit à côté de lui sous ContentSlot : c'est elle qu'on mesure.
            Transform feuille = parentDuFamille.Find("LieutenantSheet");
            Assert.IsNotNull(feuille, "LieutenantSheet absente sous ContentSlot — l'écran n'a rien construit");
            RectTransform locataireRt = (RectTransform)feuille;
            Assert.Greater(locataireRt.rect.width, 200f,
                $"le locataire fait {locataireRt.rect.width:F0}x{locataireRt.rect.height:F0} — c'est la "
                + "taille par défaut d'un RectTransform, donc il ne dessine rien et la capture montre "
                + "les écrans du DESSOUS. Le compte de teintes serait vert quand même.");
            Assert.Greater(teintes.Count, 12,
                $"{Chemin} ne porte que {teintes.Count} teintes — c'est un fond, pas un écran rendu.");

            if (camGo != null) Object.Destroy(camGo);
            Object.Destroy(rt);
        }
    }
}
