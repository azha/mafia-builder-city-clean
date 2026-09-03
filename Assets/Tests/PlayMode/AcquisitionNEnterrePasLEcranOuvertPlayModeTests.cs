using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⛔⛔ DÉFAUT DE PRODUCTION — un écran ouvert PENDANT l'acquisition de session se faisait
    //    ENTERRER sous les quatre panneaux de l'Accueil. Vu d'abord sur une capture par la session
    //    f1 (`frère 6 sur 11`, avec `AccueilHlCard`/`AccueilExceptionQueue`/`AccueilOrgVitals`/
    //    `AccueilHomeChrome` au-dessus), puis caractérisé sur le code.
    //
    //    LE MÉCANISME, et il tient à une distinction de deux mots : `CurrentTab` ne change QUE dans
    //    `ActivateTab`. Une SURIMPRESSION ne le touche jamais — et il y a NEUF sites de production
    //    qui en montent une. La garde existante (`CurrentTab == Tab.Empire`) demandait donc « le
    //    joueur a-t-il changé d'ONGLET ? », alors que la question utile est « le monde a-t-il bougé
    //    sous moi ? ». Dans le cas exact qu'on veut exclure, la première est VRAIE.
    //    ⇒ La fenêtre est la frame de marge entre le montage de l'Accueil et celui de ses panneaux.
    //      Un joueur qui touche une carte de l'Accueil pendant les 2-4 allers-retours réseau voit
    //      son écran s'ouvrir puis disparaître sous l'Accueil : actif, à la bonne taille, sous le
    //      bon canvas, et INVISIBLE. Sans un second geste, il n'a aucun moyen de savoir qu'il est là.
    //
    // ⚠️ ET LE DISCRIMINANT NE POUVAIT PAS ÊTRE `UneSurimpressionAEteMontee` : le shell vient de le
    //    mettre à vrai en montant l'Accueil lui-même. *Un drapeau déjà armé ne discrimine plus rien.*
    //    D'où `SurimpressionsMontees`, une GÉNÉRATION — capturée après la nôtre, exigée inchangée.
    [Category("Joignabilite")]
    public class AcquisitionNEnterrePasLEcranOuvertPlayModeTests
    {
        private GameObject shellGo;

        [SetUp] public void Avant() { LogAssert.ignoreFailingMessages = true; }

        [TearDown]
        public void Apres()
        {
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            LogAssert.ignoreFailingMessages = false;
        }

        // ⛔⛔ LA GRANDEUR A CHANGÉ APRÈS LE PREMIER RUN RÉEL, et c'est le contrôle positif qui
        //    l'a imposé. Ma v1 mesurait « quels frères de ContentSlot viennent APRÈS mon écran ».
        //    Rouge au premier run : `[LaunderingBackdrop, LaunderingSheet]` — **les propres parties
        //    de l'écran mesuré**. Un locataire parente son fond et sa feuille DIRECTEMENT sous
        //    `ContentSlot` (le shell le documente pour le Dashboard), donc ils sont ses FRÈRES et
        //    naissent après lui. La sonde comptait l'écran comme son propre occultant.
        //    ⇒ *La grandeur qui discrimine n'est presque jamais celle qu'on regarde.* « Ce qui est
        //      après moi dans la fratrie » n'est pas « ce qui m'enterre » : la propriété qui compte
        //      est *les panneaux de l'Accueil ont-ils été montés alors que j'avais ouvert un écran ?*
        //    ⇒ Et durcir la v1 (exclure les frères au nom du locataire) aurait visé la FORME et
        //      laissé passer tout occultant portant un autre nom. On change de mesure, pas de seuil.
        //    ★ Le contrôle positif a refusé sa propre ligne de base ("rien ne doit encore recouvrir")
        //      — il a donc réfuté le choix de grandeur AVANT que le test principal ne le fasse.

        /// <summary>Les panneaux de l'Accueil présents sous `ContentSlot`. C'est la seule chose que
        /// la garde de génération empêche : leur montage. Les nommer plutôt que compter — un compte
        /// nu fait deviner, il ne fait pas chercher (leçon f1, quatre runs sur `frère 6 sur 11`).</summary>
        private static string[] PanneauxAccueil(RectTransform slot)
        {
            return Enumerable.Range(0, slot.childCount).Select(slot.GetChild)
                .Where(t => t.gameObject.name.StartsWith("Accueil", System.StringComparison.Ordinal))
                .Select(t => t.gameObject.name).ToArray();
        }

        [UnityTest]
        public IEnumerator UnEcranOuvertPendantLAcquisitionEmpecheLeMontageDeLAccueil()
        {
            shellGo = new GameObject("AppShell");
            AppShell shell = shellGo.AddComponent<AppShell>();

            // LA FENÊTRE : `CurrentTab` devient `Empire` AVANT que les panneaux soient montés (une
            // frame de marge les sépare). Attendre puis monter IMMÉDIATEMENT, c'est ce que fait un
            // joueur qui touche l'écran dès qu'il le voit — et ce que la capture de f1 a reproduit.
            float t = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && t < 25f) { t += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab,
                "l'acquisition n'a pas abouti : ce test n'aurait pas exercé la fenêtre qu'il vise");

            int generationAvant = shell.SurimpressionsMontees;
            LaunderingController ouvert = shell.MonterLocataireEnSurimpression<LaunderingController>();
            Assert.IsNotNull(ouvert, "rien n'a été monté — le scénario ne prouverait rien");
            Assert.AreEqual(generationAvant + 1, shell.SurimpressionsMontees,
                "la génération n'a pas bougé alors qu'une surimpression vient d'être montée : le " +
                "discriminant de la garde ne compte pas ce qu'il prétend compter");

            // DIX frames, pas une : les panneaux se posaient APRÈS la marge, et une seule frame
            // laisserait ce test vert sans avoir traversé l'événement qu'il prétend détecter.
            for (int i = 0; i < 10; i++) yield return null;

            string[] poses = PanneauxAccueil(shell.ContentSlot);
            Assert.IsEmpty(poses,
                $"l'Accueil s'est monté PAR-DESSUS l'écran ouvert pendant l'acquisition : [{string.Join(", ", poses)}]. " +
                "L'écran reste actif, dimensionné, sous le bon canvas — et le joueur ne le voit pas.");
        }

        [UnityTest]
        public IEnumerator LaSondeVOITLesPanneauxQuandRienNEstOuvert()
        {
            // ⛔ GARDE DE CAPACITÉ — sans elle, le test ci-dessus serait vert dans un monde où les
            //    panneaux ne se montent JAMAIS (nom changé, montage supprimé, shell qui n'aboutit
            //    pas) : un zéro rendu pour la mauvaise raison. Ici, personne n'ouvre rien, donc la
            //    garde de génération laisse passer et les quatre DOIVENT apparaître. C'est la même
            //    sonde, sur le chemin où elle doit trouver.
            shellGo = new GameObject("AppShell");
            AppShell shell = shellGo.AddComponent<AppShell>();
            float t = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && t < 25f) { t += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab, "acquisition non aboutie");

            for (int i = 0; i < 10; i++) yield return null;

            string[] poses = PanneauxAccueil(shell.ContentSlot);
            Assert.IsNotEmpty(poses,
                "la sonde ne trouve AUCUN panneau de l'Accueil sur le chemin où ils doivent être là : " +
                "elle ne peut donc pas non plus prouver leur absence, et le test voisin serait vert à vide.");
        }
    }
}
