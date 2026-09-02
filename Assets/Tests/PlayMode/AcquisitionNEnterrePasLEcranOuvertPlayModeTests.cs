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

        /// <summary>Rang du dernier frère ACTIF de `ContentSlot` occupé par cet objet, et ce qui se
        /// dessine par-dessus. Un seul calcul, employé par le scénario ET par son contrôle positif —
        /// jamais deux chemins qui pourraient diverger entre eux.</summary>
        private static (int rang, int total, string occultants) Fratrie(RectTransform slot, GameObject cible)
        {
            Transform[] freres = Enumerable.Range(0, slot.childCount).Select(slot.GetChild).ToArray();
            int rang = System.Array.FindIndex(freres, t => t.gameObject == cible);
            string apres = string.Join(", ", freres.Skip(rang + 1)
                .Where(t => t.gameObject.activeInHierarchy).Select(t => t.gameObject.name));
            return (rang, freres.Length, apres);
        }

        [UnityTest]
        public IEnumerator UnEcranOuvertPendantLAcquisitionResteAuDessusDeLAccueil()
        {
            shellGo = new GameObject("AppShell");
            AppShell shell = shellGo.AddComponent<AppShell>();

            // ⛔ LA FENÊTRE EST ICI, et c'est tout l'enjeu du scénario : `CurrentTab` devient
            //    `Empire` AVANT que les panneaux de l'Accueil soient montés (il y a une frame de
            //    marge entre les deux). Attendre `CurrentTab == Empire` puis monter IMMÉDIATEMENT,
            //    c'est exactement ce que fait un joueur qui touche l'écran dès qu'il le voit — et
            //    c'est ce que la capture de f1 a reproduit sans le chercher.
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

            // Laisser passer LARGEMENT la frame de marge : c'est après elle que les panneaux se
            // posaient. Une seule frame d'attente laisserait le test vert sans avoir traversé
            // l'événement — un scénario sous-dimensionné pour ce qu'il mesure.
            for (int i = 0; i < 10; i++) yield return null;

            (int rang, int total, string occultants) = Fratrie(shell.ContentSlot, ouvert.gameObject);
            Assert.GreaterOrEqual(rang, 0, "l'écran ouvert n'est plus un enfant de ContentSlot");
            Assert.IsEmpty(occultants,
                $"l'écran ouvert pendant l'acquisition est frère {rang + 1} sur {total} et se fait " +
                $"recouvrir par : [{occultants}]. Il est actif, dimensionné, sous le bon canvas — et " +
                "le joueur ne le voit pas.");
        }

        [UnityTest]
        public IEnumerator LaSondeDeFratrieSaitROUGIR()
        {
            // ⛔ SANS CE CONTRÔLE, le test ci-dessus serait vert sur un monde où RIEN ne peut se
            //    poser par-dessus — donc vert pour une raison sans rapport avec la garde. On prouve
            //    donc que la MESURE sait voir un occultant, en en fabriquant un : cible INERTE,
            //    créée ici, jamais une ligne de production que le prochain lot peut corriger.
            shellGo = new GameObject("AppShell");
            AppShell shell = shellGo.AddComponent<AppShell>();
            float t = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && t < 25f) { t += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab, "acquisition non aboutie");

            LaunderingController ouvert = shell.MonterLocataireEnSurimpression<LaunderingController>();
            for (int i = 0; i < 10; i++) yield return null;
            Assert.IsEmpty(Fratrie(shell.ContentSlot, ouvert.gameObject).occultants,
                "état de départ : rien ne doit encore recouvrir — sinon le contrôle ne prouve rien");

            var occultant = new GameObject("OccultantSynthetique", typeof(RectTransform));
            occultant.transform.SetParent(shell.ContentSlot, false);
            occultant.transform.SetAsLastSibling();
            yield return null;

            (int rang, int total, string occultants) = Fratrie(shell.ContentSlot, ouvert.gameObject);
            Assert.IsNotEmpty(occultants,
                $"la sonde ne VOIT PAS un frère posé délibérément par-dessus (frère {rang + 1}/{total}) : " +
                "elle ne peut donc pas rougir sur le défaut qu'elle surveille, et son vert ne vaut rien");
            StringAssert.Contains("OccultantSynthetique", occultants);
        }
    }
}
