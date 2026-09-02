using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Economy.Shop;
using MafiaCleanCity.CoreLoops.Compression;
using MafiaCleanCity.CitySim.Inspection;
using MafiaCleanCity.CitySim.Precinct;
using MafiaCleanCity.Account.Profile;
using MafiaCleanCity.Onboarding;
using MafiaCleanCity.Operational.Selling;
using MafiaCleanCity.Account.Settings;

namespace MafiaCleanCity.Shell.Tests
{
    // PLANCHE DE CAPTURES — les HUIT écrans du chantier F en UN SEUL run d'éditeur.
    //
    // ⛔⛔ POURQUOI GROUPER, ET C'EST UNE MESURE, PAS UN CONFORT. Le rechargement de domaine de
    // cet éditeur coûte **674 à 677 secondes MESURÉES** (`Finished resetting the current domain,
    // in 676.994 seconds`), et il est payé UNE FOIS PAR LANCEMENT, avant toute compilation.
    // Huit tests séparés = sept rechargements = **~80 min de porte Unity**. Un seul test qui monte
    // les huit à la suite = un rechargement = **~13 min**. Sur une machine où quatre sessions se
    // partagent un éditeur unique par un système de file, ce n'est pas une optimisation : c'est la
    // différence entre bloquer les autres une heure et les bloquer un quart d'heure.
    //
    // ⚠️ CE QUE CE TEST PROUVE ET CE QU'IL NE PROUVE PAS. Il prouve que chaque écran REND — monté,
    // dimensionné, au premier plan, avec de l'encre. Il ne prouve PAS qu'un joueur peut y arriver :
    // AUCUN de ces huit écrans n'a d'entrée de navigation, les quatre onglets étant pris. Ce sont
    // deux propriétés distinctes, et c'est la seconde qui manque au chantier. Le test les monte
    // donc directement en surimpression, et le dit ici plutôt que de laisser la capture le taire.
    // ⚠️ RÉSERVE MESURÉE SUR ⑰ LE COMMISSARIAT, à porter avec la capture — sinon l'image ment
    // par omission. Le compte que le shell monte (`operational_demo`, dit « riche ») a ses cartes
    // de suspicion SATURÉES : **6 precincts sur 6 en HUNTING**, une seule bande distincte, pics
    // 235-255 pour un seuil à 180 (mesuré par la session qui provisionne, 2026-09-02).
    // ⇒ La capture de ⑰ prouvera donc que l'écran REND, et pas qu'il sait DISTINGUER — ce qui est
    // pourtant tout son sujet, puisqu'il ne montre que deux paliers. *Six fiches identiques ne
    // valident pas une correspondance palier → apparence : elles n'en exercent qu'un point.*
    // ⇒ Le contraste existe sur `demo_precincts@example.test` (HUNTING · SUSPICIOUS · HUNTING ·
    // HUNTING · WATCHFUL · HUNTING, 3 bandes sur 4), mais il coûte un SECOND run d'éditeur, donc
    // ~13 min de porte partagée entre quatre sessions. Arbitrage assumé : on prend le plat
    // maintenant, et le contraste fait l'objet d'un passage dédié SI l'user veut juger la
    // correspondance des paliers. ⚠️ Ce compte-là est une FENÊTRE : ses tuiles montent de façon
    // monotone et il se saturera comme le riche — le capturer tard revient à ne rien capturer.
    public class PlancheEcransCapturePlayModeTests
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
        public IEnumerator Capture_PlancheDesHuitEcrans_1080x2400()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, "aucun AppShell dans la scène de démarrage du build");

            // L'acquisition de session du shell rappelle l'onglet par défaut quand elle aboutit :
            // capturer avant qu'elle soit résolue montrerait un autre écran (course mesurée le
            // 2026-08-21 sur ce shell).
            float attente = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && attente < 25f)
            {
                attente += Time.deltaTime;
                yield return null;
            }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab,
                "acquisition de session non résolue — toute capture prise ici serait celle d'un autre écran");

            var echecs = new List<string>();
            // ⚠️ On n'arrête PAS au premier échec : un rouge en masque un autre, et sur sept écrans
            // ça coûterait sept rechargements de domaine pour les découvrir un par un. On collecte,
            // puis on rend le verdict complet.
            yield return Capturer<ShopScreenController>(shell, "la_vitrine", e => e.Catalogue != null || e.EtatVide, echecs);
            yield return Capturer<CompressionScreenController>(shell, "la_semaine", e => e.Tableau != null || e.EtatVide, echecs);
            yield return Capturer<InspectionScreenController>(shell, "les_inspections", e => e.File != null || e.EtatVide, echecs);
            yield return Capturer<PrecinctScreenController>(shell, "le_commissariat", e => e.Croyance != null || e.EtatVide, echecs);
            yield return Capturer<ProfileScreenController>(shell, "le_coffre", e => e.Profil != null || e.EtatVide, echecs);
            yield return Capturer<TutorialScreenController>(shell, "la_premiere_fois", e => e.Etat != null || e.EtatVide, echecs);
            yield return Capturer<SellingScreenController>(shell, "la_vente", e => e.Dealers != null || e.EtatVide, echecs);
            // ⑲ a rejoint la liste APRÈS avoir été déclaré bloqué ce matin : son écrivain de
            // `locale` a été livré dans la journée. *Un « bloqué » est une mesure datée.*
            yield return Capturer<SettingsScreenController>(shell, "les_reglages", e => e.Profil != null || e.EtatVide, echecs);

            Assert.IsEmpty(echecs, "écrans en défaut :\n  · " + string.Join("\n  · ", echecs));
        }

        /// <summary>Monte un écran, attend son chargement, le capture, et vérifie les TROIS
        /// propriétés qui rendraient l'image mensongère — dans cet ordre, du structurel au pixel.
        /// Chacune a été payée par une capture fausse le 2026-09-02.</summary>
        private IEnumerator Capturer<T>(AppShell shell, string nom, System.Func<T, bool> charge,
                                        List<string> echecs) where T : MonoBehaviour, IShellTenant
        {
            const int Largeur = 1080, Hauteur = 2400;
            string chemin = $"Assets/Screenshots/planche_{nom}_1080x2400.png";

            shell.MonterLocataireEnSurimpression<T>();
            T ecran = null;
            float montage = 0f;
            while (montage < 15f && ecran == null)
            {
                ecran = shell.ContentSlot.GetComponentInChildren<T>(true);
                montage += Time.deltaTime;
                yield return null;
            }
            if (ecran == null) { echecs.Add($"{nom} : non monté sous le shell"); yield break; }

            float attente = 0f;
            while (attente < 20f && !charge(ecran)) { attente += Time.deltaTime; yield return null; }

            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;

            // (1) ORDRE DE FRATRIE — la propriété la plus structurelle, et celle qui a menti le
            // plus longtemps. Deux écrans avaient `rect=1280x960` (bonne taille), bon canvas, bon
            // parent, et `frere=1/8` : six frères se dessinaient par dessus, la capture montrait la
            // carte de la ville et l'écran nulle part. Une mesure sur un objet occlus mesure LE
            // VOISIN — et rend un verdict d'autant plus rassurant qu'il est faux.
            Transform parent = ecran.transform.parent;
            if (parent != null && ecran.transform.GetSiblingIndex() != parent.childCount - 1)
            {
                echecs.Add($"{nom} : frère {ecran.transform.GetSiblingIndex()} sur {parent.childCount} — "
                           + "les suivants se dessinent PAR DESSUS, la capture montrerait les écrans du dessous");
                yield break;
            }

            // (2) TAILLE — un RectTransform neuf fait 100x100 et ne dessine rien de VISIBLE, sans
            // la moindre erreur console.
            RectTransform rt = (RectTransform)ecran.transform;
            if (rt.rect.width < 200f)
            {
                echecs.Add($"{nom} : rect {rt.rect.width:F0}x{rt.rect.height:F0} — taille par défaut, "
                           + "l'écran ne dessine rien");
                yield break;
            }

            Canvas canvas = ecran.GetComponentInParent<Canvas>();
            if (canvas != null) canvas = canvas.rootCanvas;
            if (canvas == null) { echecs.Add($"{nom} : sous AUCUN canvas"); yield break; }

            // ⛔ Un canvas en Screen Space OVERLAY n'est pas rendu par une caméra : une capture par
            // `targetTexture` rendrait le fond de la caméra. On bascule en Screen Space Camera le
            // temps du rendu, puis on rétablit.
            RenderMode modePrecedent = canvas.renderMode;
            Camera cameraPrecedente = canvas.worldCamera;
            float planPrecedent = canvas.planeDistance;

            GameObject camGo = new GameObject("CapturePlancheCam");
            Camera cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;
            var rtex = new RenderTexture(Largeur, Hauteur, 24, RenderTextureFormat.ARGB32);
            cam.targetTexture = rtex;

            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;

            // ⚠️ La demi-hauteur se mesure sur le rect RÉEL du canvas, jamais depuis la résolution
            // demandée : le canvas porte un CanvasScaler, ses unités ne sont pas les pixels cible.
            // La valeur par défaut d'`orthographicSize` (5) cadrerait 0,4 % de l'écran.
            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;
            cam.Render();

            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rtex;
            var tex = new Texture2D(Largeur, Hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, Largeur, Hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            canvas.renderMode = modePrecedent;
            canvas.worldCamera = cameraPrecedente;
            canvas.planeDistance = planPrecedent;

            System.IO.File.WriteAllBytes(chemin, tex.EncodeToPNG());

            // (3) VARIÉTÉ — dernière et la plus faible des trois : « pas noire » est satisfait par
            // un gris uniforme, et le compte de teintes de TOUTE l'image est satisfait par les
            // écrans du dessous. Elle ne vaut qu'APRÈS les deux gardes structurelles.
            var teintes = new HashSet<int>();
            foreach (Color c in tex.GetPixels())
                teintes.Add((Mathf.RoundToInt(c.r * 31) << 10) | (Mathf.RoundToInt(c.g * 31) << 5) | Mathf.RoundToInt(c.b * 31));
            Debug.Log($"[PLANCHE] {chemin} — {teintes.Count} teintes · rect={rt.rect.width:F0}x{rt.rect.height:F0} "
                      + $"· frere={ecran.transform.GetSiblingIndex()}/{(parent != null ? parent.childCount : 0)} "
                      + $"· graphics={ecran.GetComponentsInChildren<Graphic>(true).Length}");
            if (teintes.Count <= 12) echecs.Add($"{nom} : {teintes.Count} teintes — c'est un fond, pas un écran");

            if (camGo != null) Object.Destroy(camGo);
            Object.Destroy(rtex);
            yield return null;
        }
    }
}
