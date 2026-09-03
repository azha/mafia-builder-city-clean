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
    // TD-490 — SANS catégorie, ce fichier était invisible à TOUT filtre : ni le juge ni
    // personne ne pouvait le demander. Onze fichiers, 29 tests dans ce cas au 2026-09-02.
    // *Un test qui n'a jamais tourné et un test qui passe rendent la même absence d'erreur.*
    // ⚠️ Pas de préfixe `Capture` : cette catégorie EXISTE, le filtre d'Unity matche par
    // PRÉFIXE, et la demander emporterait celle-ci — or `Capture` fait SIGSEGV (Mesa).
    [Category("PhotoPlanche")]
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

            // ⛔ Les deux attentes (acquisition de session RÉSOLUE, puis nombre d'enfants du slot
            // STABLE) vivent dans `CaptureSousShell.AttendreUnShellCalme` — c'est là qu'est écrit
            // POURQUOI chacune existe, et c'est ce qui empêche cette planche et la suivante de
            // diverger sur la même course.
            var echecs = new List<string>();
            // ⚠️ On n'arrête PAS au premier échec : un rouge en masque un autre, et sur huit écrans
            // ça coûterait huit rechargements de domaine pour les découvrir un par un. On collecte,
            // puis on rend le verdict complet.
            yield return CaptureSousShell.AttendreUnShellCalme(shell, echecs);
            Assert.IsEmpty(echecs, "shell non capturable :\n  · " + string.Join("\n  · ", echecs));

            // ⛔⛔ LES PRÉDICATS ATTENDENT LE RENDU, PLUS UN CHAMP. Guetter l'arrivée d'un champ
            // est satisfait AU MILIEU de la coroutine : ㉓ enchaîne trois requêtes et j'attendais
            // la première — la capture partait deux requêtes trop tôt, image vide, test VERT.
            // ⑰ battait entre 23 et 3 éléments d'un run à l'autre pour la même raison.
            // ⇒ `RendusEffectues` monte à la fin de `Rendre()`. Propriété STRUCTURELLE : elle ne
            // dépend ni du nombre de requêtes ni de leur ordre, et elle reste juste le jour où
            // un écran en ajoute une. *Un proxy qui marche sur sept écrans sur huit ne marche pas.*
            yield return Capturer<CompressionScreenController>(shell, "la_semaine", (e, _) => e.RendusEffectues > 0, echecs);
            yield return Capturer<InspectionScreenController>(shell, "les_inspections", (e, _) => e.RendusEffectues > 0, echecs);
            yield return Capturer<PrecinctScreenController>(shell, "le_commissariat", (e, _) => e.RendusEffectues > 0, echecs);
            yield return Capturer<ProfileScreenController>(shell, "le_coffre", (e, _) => e.RendusEffectues > 0, echecs);
            yield return Capturer<TutorialScreenController>(shell, "la_premiere_fois", (e, _) => e.RendusEffectues > 0, echecs);
            yield return Capturer<SellingScreenController>(shell, "la_vente", (e, _) => e.RendusEffectues > 0, echecs);
            // ⑲ a rejoint la liste APRÈS avoir été déclaré bloqué ce matin : son écrivain de
            // `locale` a été livré dans la journée. *Un « bloqué » est une mesure datée.*
            yield return Capturer<SettingsScreenController>(shell, "les_reglages", (e, _) => e.RendusEffectues > 0, echecs);
            // ⛔⛔ ㉓ EST CAPTURÉE EN DERNIER, ET CE N'EST PAS UN CONFORT : elle a échoué
            // QUATRE runs de suite en première position, toujours « frère 6 sur 11 », et j'ai
            // corrigé trois fois le mauvais objet avant que la garde ne NOMME les occultants :
            //   [7] AccueilHlCard  [8] AccueilExceptionQueue  [9] AccueilOrgVitals  [10] AccueilHomeChrome
            // Ce sont les quatre blocs de l'onglet Accueil, que le shell REMONTE quand son
            // acquisition de session aboutit — la course décrite dans l'en-tête de ce fichier.
            // Le premier écran monté est donc le seul à se faire recouvrir ; les suivants
            // arrivent après la course et sont derniers sans rien faire.
            // ⇒ Changer l'ordre ne CORRIGE pas la course : elle reste un défaut de PRODUCTION
            // (un joueur qui ouvre un écran pendant l'acquisition se le fait recouvrir), et
            // elle est signalée comme telle à la session qui tient le shell. Ce test n'a pas
            // à la reproduire pour prouver que les huit écrans RENDENT — c'est une autre
            // propriété, et la confondre ferait passer un défaut de shell pour un défaut d'écran.
            yield return Capturer<ShopScreenController>(shell, "la_vitrine", (e, _) => e.RendusEffectues > 0, echecs);

            Assert.IsEmpty(echecs, "écrans en défaut :\n  · " + string.Join("\n  · ", echecs));
        }

        /// <summary>Délègue à `CaptureSousShell.CapturerLocataire` — les trois gardes (ordre de
        /// fratrie, taille, variété) et l'attente de chargement vivent désormais LÀ-BAS, partagées
        /// avec les autres planches. Ce qui reste ici est la seule chose propre à cette planche :
        /// la sonde de géométrie de ㉓ la vitrine.
        /// ⛔ Elles ont été extraites parce qu'une seconde planche allait en faire une QUATRIÈME
        /// copie — et `CaptureSupport` porte déjà la leçon en tête de son fichier : *une garde
        /// recopiée n'est pas une garde partagée.*</summary>
        private IEnumerator Capturer<T>(AppShell shell, string nom,
                                        System.Func<T, RectTransform, bool> charge,
                                        List<string> echecs) where T : MonoBehaviour, IShellTenant
        {
            System.Action<T> sonde = null;
            if (nom == "la_vitrine") sonde = e => SonderLaVitrine(e);
            yield return CaptureSousShell.CapturerLocataire<T>(shell, nom, charge, echecs,
                                                               monter: true, sonde: sonde);
        }

        /// <summary>⛔ MESURE, PAS DÉDUCTION. ㉓ dessine tous les textes d'une rangée au même
        /// endroit. J'ai émis TROIS hypothèses (hauteur des textes, hauteur du bloc de tête,
        /// imbrication) et posé un correctif sur la deuxième : l'image est revenue IDENTIQUE. Et
        /// le regard la réfute — le COMPTOIR superpose aussi ses deux textes, alors qu'il ne
        /// contient aucun bloc imbriqué. *Trois hypothèses plausibles valent moins qu'une mesure.*
        /// ⚠️ La LARGEUR aussi : le défaut résiduel est un débordement HORIZONTAL, et une sonde
        /// qui ne mesure que la hauteur ne peut pas le voir.</summary>
        private static void SonderLaVitrine(MonoBehaviour ecran)
        {
            Transform etageres = null;
            foreach (var rt2 in ecran.GetComponentsInChildren<RectTransform>(true))
                if (rt2.name == "Etageres") { etageres = rt2; break; }
            if (etageres == null || etageres.childCount == 0)
            {
                Debug.Log("[GEOM] Etageres introuvable ou vide");
                return;
            }
            Transform rang = etageres.GetChild(0);
            var vlg = rang.GetComponent<VerticalLayoutGroup>();
            var vueRt = etageres.parent as RectTransform;
            var listeRt = (RectTransform)etageres;
            Debug.Log($"[GEOM] vue w={(vueRt == null ? -1f : vueRt.rect.width):F1} "
                      + $"· liste w={listeRt.rect.width:F1} x={listeRt.anchoredPosition.x:F1} "
                      + $"pivot={listeRt.pivot.x:F2} ancres=[{listeRt.anchorMin.x:F1},{listeRt.anchorMax.x:F1}]");
            Debug.Log($"[GEOM] rangée '{rang.name}' rect={((RectTransform)rang).rect.height:F1} "
                      + $"vlg={(vlg == null ? "ABSENT" : $"ctrlH={vlg.childControlHeight} expH={vlg.childForceExpandHeight} spacing={vlg.spacing:F1}")}");
            for (int k = 0; k < rang.childCount; k++)
            {
                var e = (RectTransform)rang.GetChild(k);
                var le2 = e.GetComponent<LayoutElement>();
                Debug.Log($"[GEOM]   [{k}] {e.name,-10} y={e.anchoredPosition.y,8:F1} h={e.rect.height,7:F1} "
                          + $"prefH={(le2 == null ? -1f : le2.preferredHeight),7:F1} ignore={(le2 != null && le2.ignoreLayout)}");
            }
        }
    }
}
