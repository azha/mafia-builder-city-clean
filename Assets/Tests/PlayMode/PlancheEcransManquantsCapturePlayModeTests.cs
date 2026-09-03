using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Autonomy;

namespace MafiaCleanCity.Shell.Tests
{
    // PLANCHE 2 — les écrans `monté` que rien n'avait jamais photographiés SOUS LE CHROME.
    //
    // ⛔ LA LISTE EST MESURÉE, PAS RECOPIÉE. Le chantier du jour demandait « ⑦ ⑧ ⑩ ⑫ ⑯ ④ ».
    // Un balayage des 86 fichiers de tests PlayMode, croisant les 23 `IShellTenant` avec les
    // chemins `Assets/Screenshots/*.png` qu'ils écrivent, dit autre chose :
    //   · ⑦ lieutenants  → DÉJÀ capturé sous chrome (`Capture_EcranLieutenants_SousChromeV31`)
    //   · ⑩ exception detail → DÉJÀ capturé sous chrome, DEUX fois (après-tampon, main-de-cartes)
    //   · ⑯ revue du jour   → DÉJÀ capturé sous chrome (seuil forcé, le nom le porte)
    // ⇒ trois des six étaient faits. Restaient QUATRE locataires sans aucune image 1080×2400 :
    // ④ l'Accueil · ㉔ l'autonomie · ⑪ la filière · ⑫ le pipeline. C'est cette liste-là.
    // ★ Et le balayage a d'abord MENTI dans l'autre sens : il déclarait « SANS CAPTURE » les huit
    //   écrans de la planche 1, parce que leur chemin est INTERPOLÉ (`planche_{nom}_…`) et qu'un
    //   motif sur littéral ne le voit pas. *Un zéro rendu par un motif trop étroit est le zéro le
    //   plus crédible qui soit* — il a fallu regarder le disque pour le réfuter.
    //
    // ⛔⛔ UN SEUL TEST POUR LES QUATRE, et c'est une mesure : le rechargement de domaine de cet
    // éditeur coûte 674-677 s, payé UNE FOIS par lancement. Quatre tests = trois rechargements de
    // plus = ~34 min de porte Unity prise aux quatre autres sessions.
    //
    // ⚠️ CE QUE CETTE PLANCHE PROUVE. Que ces quatre écrans RENDENT sous le chrome, à la
    // résolution du téléphone visé. Elle ne prouve ni qu'ils sont JUSTES (pas de juge cette
    // semaine — régime user du 2026-09-01, jalon 09-05) ni que leur contenu est complet : deux
    // d'entre eux sont capturés SANS DONNÉES, et c'est écrit ci-dessous plutôt que laissé à
    // l'image de le taire.
    //
    // ⛔⛔ LE PREMIER RUN A ÉCHOUÉ SUR LES QUATRE, ET LES QUATRE AVAIENT LA MÊME CAUSE — c'est
    // elle qui vaut, pas les captures. Sept des vingt-trois locataires bâtissent leur feuille en
    // FRÈRE de leur hôte et non en enfant : toute garde écrite en `GetComponentsInChildren` sur
    // le composant mesurait donc un sous-arbre VIDE. Deux écrans étaient rapportés « recouverts »
    // par leur PROPRE feuille, deux autres « chargement non abouti » alors que leur titre était
    // affiché depuis le premier frame. Le correctif vit dans `CaptureSousShell` (la racine
    // visible est NOMMÉE par l'appelant), donc il vaut pour les deux planches et pour la
    // prochaine. ★ Aucune relecture ne l'aurait trouvé : les quatre messages accusaient l'écran,
    // et ils étaient précis, chiffrés et faux.
    [Category("PhotoManquants")]
    public class PlancheEcransManquantsCapturePlayModeTests
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
        public IEnumerator Capture_PlancheDesQuatreEcransSansImage_1080x2400()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, "aucun AppShell dans la scène de démarrage du build");

            var echecs = new List<string>();
            // ⚠️ On n'arrête PAS au premier échec : un rouge en masque un autre, et chaque
            // découverte séparée coûterait un rechargement de domaine.
            yield return CaptureSousShell.AttendreUnShellCalme(shell, echecs);
            Assert.IsEmpty(echecs, "shell non capturable :\n  · " + string.Join("\n  · ", echecs));

            // ④ L'ACCUEIL — `monter: false`, et c'est le point. Ce shell pose lui-même
            // `DashboardController` EN SURIMPRESSION à l'ouverture de session (`AppShell.cs:441`
            // et `:546`, décision B) : après `AttendreUnShellCalme`, il est DÉJÀ à l'écran. En
            // monter un second exemplaire photographierait une copie que le joueur ne voit jamais,
            // pendant que l'original resterait dessous. *On capture ce que le joueur a, pas ce
            // qu'on sait fabriquer.*
            // ⚠️ `nomFeuille` : ces sept-là dessinent dans un FRÈRE de leur hôte, pas sous eux —
            // sans ce nom, les gardes mesureraient un hôte sans un pixel (mesuré le 2026-09-03).
            // ⚠️ `freresAttendusAuDessus` : les quatre panneaux de l'Accueil recouvrent
            // `DashboardSheet` DÉLIBÉRÉMENT — `AppShell.AcquireSessionThenActivateHome` attend une
            // frame avant de les monter précisément pour qu'ils soient cadets. C'est donc l'écran
            // livré, et on le DÉCLARE au lieu de le subir. La capture montre les deux couches, ce
            // que le joueur a effectivement sous les yeux à l'ouverture de session.
            yield return CaptureSousShell.CapturerLocataire<DashboardController>(
                shell, "l_accueil", (e, _) => e.DashboardLoaded, echecs, monter: false,
                nomFeuille: "DashboardSheet",
                freresAttendusAuDessus: new[] { "AccueilHlCard", "AccueilExceptionQueue",
                                                "AccueilOrgVitals", "AccueilHomeChrome" });

            // ㉔ L'AUTONOMIE — se charge seule (signin + rapports).
            yield return CaptureSousShell.CapturerLocataire<AutonomyInboxController>(
                shell, "l_autonomie", (e, _) => e.ReportsLoaded, echecs,
                nomFeuille: "AutonomyInboxSheet");

            // ⑪ LA FILIÈRE et ⑫ LE PIPELINE — capturés DANS LEUR ÉTAT NON CHARGÉ, sciemment.
            // ⛔ Les deux contrôleurs ne montrent de DONNÉES qu'avec un `nodeId`, et il n'existe
            // AUCUNE ROUTE AMONT qui en donne un (`back.md` §S8-a ; `front.md` le dit aussi pour
            // ⑫). `AppShell.cs:238` monte donc `LaunderingController` sur l'onglet Filière SANS
            // lui en fournir : `nodeId` reste vide, `Boot()` s'arrête après le sign-in, et
            // `NodeLoaded` ne devient jamais vrai.
            // ⚠️ MAIS L'ÉCRAN N'EST PAS BLANC, et ma première rédaction le disait à tort : leur
            // `BuildLayout()` pose un titre et un sous-titre AVANT tout chargement — ils sont à
            // l'écran dès le premier frame. Ce que le joueur voit est un cadre correctement
            // titré et vide de données, pas une absence d'écran. *La différence décide de ce
            // qu'on écrit dans la dette, donc elle se mesure.*
            // ⇒ Attendre `NodeLoaded` ferait échouer la capture en 20 s en accusant l'ÉCRAN, alors
            // que le maillon manquant est côté BACK. On prend donc l'image que le joueur a
            // réellement sous les yeux aujourd'hui, avec un prédicat plus faible NOMMÉ, et on
            // épingle l'état juste après.
            yield return CaptureSousShell.CapturerLocataire<LaunderingController>(
                shell, "la_filiere", (e, racine) => CaptureSousShell.PorteDuTexte(racine), echecs,
                nomFeuille: "LaunderingSheet");
            yield return CaptureSousShell.CapturerLocataire<PipelineOverviewController>(
                shell, "le_pipeline", (e, racine) => CaptureSousShell.PorteDuTexte(racine), echecs,
                nomFeuille: "PipelineSheet");

            // ⛔ L'ÉPINGLE QUI SE RETOURNE — un `toBe(404)` dans le bon sens, AVEC son mode
            // d'emploi de péremption. Elle n'asserte pas une ABSENCE (une clé qui manque est
            // satisfaite par n'importe quel échec) : elle asserte la VALEUR d'un booléen que le
            // chemin de chargement PRODUIT. Le jour où une route amont donne un `nodeId` et où le
            // shell le passe, `NodeLoaded` devient vrai et CETTE LIGNE ROUGIT.
            // ⇒ CE QU'IL FAUT FAIRE CE JOUR-LÀ : supprimer ces deux épingles, rendre aux deux
            // écrans le prédicat `e => e.NodeLoaded` / `e => e.PipelineLoaded`, et reprendre la
            // capture — l'image d'aujourd'hui montre un écran vide, pas un écran fini.
            // ⚠️ Sans cette épingle, la capture d'un écran vide se relit dans six mois comme la
            // preuve que l'écran est livré.
            var filiere = shell.ContentSlot.GetComponentInChildren<LaunderingController>(true);
            var pipeline = shell.ContentSlot.GetComponentInChildren<PipelineOverviewController>(true);
            if (filiere != null && filiere.NodeLoaded)
                echecs.Add("ÉPINGLE PÉRIMÉE : LaunderingController.NodeLoaded est VRAI — une route "
                           + "amont donne enfin un nodeId. Rends-lui le prédicat `e => e.NodeLoaded`, "
                           + "retire cette épingle, et REFAIS la capture : celle du jour montre un vide.");
            if (pipeline != null && pipeline.PipelineLoaded)
                echecs.Add("ÉPINGLE PÉRIMÉE : PipelineOverviewController.PipelineLoaded est VRAI — "
                           + "même geste que ci-dessus pour `le_pipeline`.");
            Debug.Log($"[PLANCHE2] état épinglé — NodeLoaded={(filiere == null ? "N/A" : filiere.NodeLoaded.ToString())} "
                      + $"· PipelineLoaded={(pipeline == null ? "N/A" : pipeline.PipelineLoaded.ToString())}");

            Assert.IsEmpty(echecs, "écrans en défaut :\n  · " + string.Join("\n  · ", echecs));
        }
    }
}
