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
    // ⚠️ AUCUN `nomFeuille` DANS CETTE PLANCHE, et il faut savoir pourquoi avant d'en ajouter un.
    // Le défaut d'origine : le gabarit faisait bâtir la racine sous `mountParent`, donc en FRÈRE
    // de l'hôte, et toute garde en `GetComponentsInChildren` sur le composant mesurait un
    // sous-arbre VIDE — quatre écrans rapportés « chargement non abouti » alors qu'ils étaient
    // affichés, avec quatre messages précis, chiffrés et faux. `nomFeuille` était le contournement.
    // Le gabarit corrigé (merge du 2026-09-03) bâtit sous `transform` : la racine est ENFANT de
    // l'hôte, les gardes la voient, et passer `nomFeuille` ferait au contraire échouer la capture
    // sur « feuille introuvable parmi les frères ». ⇒ Un écran aligné sur le gabarit n'en veut pas ;
    // un écran ancien qui bâtit encore sous `mountParent` en a besoin. Le paramètre décrit une
    // STRUCTURE, jamais une préférence : le choisir demande de regarder où l'écran pose sa racine.
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
                (e, _) => e.DernierChargement != null || e.DerniereErreur != null, echecs);
            // ⚠️ PAS de `nomFeuille` — et c'est le contraire de ce que je croyais ce matin.
            // Le gabarit corrigé (merge du 2026-09-03) fait bâtir la racine sous `transform`,
            // donc sous l'HÔTE : elle est son ENFANT, et les gardes en `GetComponentsInChildren`
            // la trouvent. `nomFeuille` cherche parmi les FRÈRES de l'hôte — le passer ici ferait
            // désormais échouer la capture sur « feuille introuvable ». *Le paramètre qui sauvait
            // hier casse aujourd'hui : il décrit une structure, pas une préférence.*

            // ㉘ LA DISTRIBUTION — « la ficelle sur le liège ».
            // ⚠️ CE QUE CETTE CAPTURE NE PROUVE PAS, et il faut le savoir en la regardant : un
            // compte FRAÎCHEMENT signé n'a AUCUN `distribution_hub` (mesuré : le kit de départ
            // donne lab, stash, front_shop et cash_safehouse, jamais de hub). La prémisse de cet
            // écran ne tient donc pas au jour 1 — seul le compte de démo, qui en possède un,
            // permet de le photographier peuplé. L'image montre l'écran d'un joueur avancé.
            yield return CaptureSousShell.CapturerLocataire<DistributionScreenController>(
                shell, "la_distribution",
                (e, _) => (e.DernierChargementCouriers != null && e.DernierChargementProjection != null)
                          || e.DerniereErreur != null, echecs);

            // ㉛ LA LOI — « le parloir ».
            // ⚠️ CE QUE CETTE CAPTURE MONTRE, et il faut le savoir : `GET /v1/me/legal` rend
            // `{activeCases: [], lawyerRoster: []}` — LES DEUX VIDES sur le compte de démo, mesuré
            // en direct. Le joueur peut recruter un avocat, mais il ne peut PAS se créer une
            // affaire : elles naissent d'une descente. Les trois routes `cases/:id/*` sont donc
            // inatteignables, et l'écran le DÉCLARE au lieu de le simuler. L'image montre un
            // parloir sans affaire — l'état réel, pas un état d'échec.
            yield return CaptureSousShell.CapturerLocataire<LoiScreenController>(
                shell, "la_loi",
                (e, _) => e.DernierChargement != null || e.DerniereErreur != null, echecs);

            // ㉙ — ajouté ici au fil du chantier, un appel, jamais un test de plus.

            Assert.IsEmpty(echecs,
                "captures du chantier C en échec :\n  · " + string.Join("\n  · ", echecs));
        }
    }
}
