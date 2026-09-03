using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.Shell.Tests
{
    // PLANCHE DU CHANTIER C — « la marchandise sort, et ce que ça coûte ».
    // Les quatre écrans du chantier §C, photographiés SOUS LE CHROME à la résolution du
    // téléphone visé, au fur et à mesure qu'ils sont livrés : ㉚ la chaîne d'appro ·
    // ㉘ la distribution · ㉛ la loi · ㉙ le conflit.
    //
    // ⛔⛔ UN SEUL TEST POUR TOUS, et c'est une mesure, pas du rangement : le rechargement de
    // domaine de cet éditeur coûte 674-677 s, payé UNE FOIS par lancement. Un test par écran =
    // trois rechargements de plus = ~34 min de porte Unity prises aux quatre autres sessions qui
    // attendent derrière moi dans la file. On ajoute donc un appel ici, jamais un test.
    //
    // ⚠️ CE QUE CETTE PLANCHE PROUVE, et rien de plus : que ces écrans RENDENT sous le chrome, à
    // 1080×2400. Elle ne prouve pas qu'ils sont JUSTES — aucun juge cette semaine (régime user du
    // 2026-09-01, jalon 09-05) — ni que leur contenu est complet. Ce qui est capturé sans données
    // est déclaré ci-dessous, plutôt que laissé à l'image de le taire.
    //
    // ⚠️ `nomFeuille` N'EST PAS FACULTATIF ICI. Ces écrans bâtissent leur racine sous
    // `mountParent`, c'est-à-dire en FRÈRE de l'hôte que `ConstruireLocataire` leur crée, et non
    // en enfant. Toute garde écrite en `GetComponentsInChildren` sur le composant mesure donc un
    // sous-arbre VIDE et rapporte « chargement non abouti » sur un écran parfaitement affiché.
    // Le défaut a été payé le 2026-09-03 sur quatre écrans d'un coup, avec quatre messages
    // précis, chiffrés et faux. On NOMME la feuille.
    [Category("PhotoChantierC")]
    public class PlancheChantierCCapturePlayModeTests
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
        public IEnumerator Capture_PlancheChantierC_1080x2400()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, "aucun AppShell dans la scène de démarrage du build");

            // ⚠️ On n'arrête PAS au premier échec : un rouge en masque un autre, et chaque
            // découverte séparée coûterait un rechargement de domaine entier.
            var echecs = new List<string>();
            yield return CaptureSousShell.AttendreUnShellCalme(shell, echecs);
            Assert.IsEmpty(echecs, "shell non capturable :\n  · " + string.Join("\n  · ", echecs));

            // ㉚ LA CHAÎNE D'APPRO — « le bon de commande ».
            // Le prédicat de charge est `DernierChargement != null` : l'écran a REÇU le corps de
            // `GET /v1/operational/precursors`. Il ne dit pas que la chaîne est peuplée, et c'est
            // voulu — `GET /v1/supply-chain/graph` rend `nodes: []` sur le compte de démo (mesuré
            // en direct le 2026-09-03), donc la liste « LA CHAÎNE, EN REMONTANT » de la maquette
            // n'a AUCUNE SOURCE et l'écran affiche un état vide honnête à sa place. Photographier
            // cet état-là est le but : c'est ce que le joueur a.
            // ⚠️ `DerniereErreur` est admis comme fin de charge, sinon un back muet ferait
            // expirer la capture au lieu de montrer l'écran d'erreur — qui est un écran réel.
            yield return CaptureSousShell.CapturerLocataire<ChaineDApproScreenController>(
                shell, "la_chaine_d_appro",
                (e, _) => e.DernierChargement != null || e.DerniereErreur != null, echecs,
                nomFeuille: "ChaineDApproRoot");

            // ㉘ ㉛ ㉙ — ajoutés ici au fil du chantier, un appel chacun, jamais un test de plus.

            Assert.IsEmpty(echecs,
                "captures du chantier C en échec :\n  · " + string.Join("\n  · ", echecs));
        }
    }
}
