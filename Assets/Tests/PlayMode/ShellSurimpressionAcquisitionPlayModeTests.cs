using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⛔ LE DÉFAUT VISÉ (signalé 2026-09-02) : un écran ouvert par un GESTE (« voir tout » → ⑨,
    // ⑯ idem) disparaît quelques frames après son montage.
    //
    // ⚠️ CE QUE CE FICHIER N'ASSERTE PAS, ET POURQUOI — la proposition reçue était « monter une
    // surimpression, `ActivateTab` deux fois, elle est encore là ». **Cette propriété-là serait
    // FAUSSE à asserter** : `UnmountCurrentTenant` vide tout `ContentSlot` par CONTRAT, et son
    // en-tête dit pourquoi — les locataires parentent leur UI dans le slot, pas sur leur hôte, donc
    // n'effacer que l'hôte empilerait l'écran précédent sous le suivant pour toujours. Un joueur qui
    // change d'ONGLET DOIT perdre sa surimpression. ⇒ Asserter sa survie à travers `ActivateTab`
    // reviendrait à graver le défaut inverse.
    //
    // ⇒ LA PROPRIÉTÉ JUSTE : une surimpression survit à la FIN DE L'ACQUISITION DE SESSION — ce
    // moment où le shell se donne à lui-même un `ActivateTab(Empire)` que le joueur n'a pas demandé.
    // Les deux sites sont gardés par un sentinel `CurrentTab == (Tab)(-1)` (« personne n'a encore
    // navigué »), et ce sentinel est AVEUGLE aux surimpressions : ce chemin ne touche jamais
    // `CurrentTab`. *La garde mesurait la navigation par ONGLET quand la propriété en jeu est
    // « quelque chose a-t-il été monté » — une autre force sur la même grandeur ne pouvait pas
    // l'atteindre.*
    [Category("Charpente")]
    public class ShellSurimpressionAcquisitionPlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            shell = null;
            LogAssert.ignoreFailingMessages = false;
        }

        [UnityTest]
        public IEnumerator LeSentinelDAcquisition_VOIT_UneSurimpression_EtNeLaDetruitPas()
        {
            LogAssert.ignoreFailingMessages = true; // le shell tente sa propre auth : bruit attendu
            shellGo = new GameObject("ShellSurimpression");
            shell = shellGo.AddComponent<AppShell>();
            yield return null; // BuildLayout() synchrone dans Start()

            // ── ANTI-VACUITÉ : sans ces deux gardes, tout ce qui suit passerait à vide ────────────
            Assert.IsNotNull(shell.ContentSlot, "aucun ContentSlot : rien n'a été monté, le test serait vide");
            Assert.AreEqual((AppShell.Tab)(-1), shell.CurrentTab,
                "le sentinel doit encore valoir sa valeur INITIALE au moment où on ouvre la " +
                "surimpression — sinon le scénario ne reproduit pas la fenêtre du défaut et " +
                "passerait pour une raison sans rapport");

            // Le geste du joueur : ouvrir un écran en surimpression PENDANT l'acquisition.
            var ouvert = shell.MonterLocataireEnSurimpression<CityMap.CityMapController>();
            Assert.IsNotNull(ouvert, "la surimpression n'a pas été montée — le scénario est vide");
            Assert.IsTrue(shell.UneSurimpressionAEteMontee,
                "le montage en surimpression doit se DÉCLARER, sinon le sentinel ne peut pas le voir");

            // ── LA PROPRIÉTÉ ─────────────────────────────────────────────────────────────────────
            // On laisse l'acquisition asynchrone aller jusqu'à son terme. Le monde dégénéré à tuer :
            // un test qui passe parce que l'acquisition n'a jamais abouti dans la fenêtre observée.
            int frames = 0;
            while (frames < 240 && shell.CurrentTab == (AppShell.Tab)(-1)) { frames++; yield return null; }

            Debug.Log($"[surimpression] acquisition observée après {frames} frame(s) · " +
                      $"CurrentTab={shell.CurrentTab} · surimpression vivante={ouvert != null}");

            // ⛔⛔ GARDE ANTI-VACUITÉ SUR L'ÉVÉNEMENT, ajoutée après un PREMIER RUN VERT QUI NE
            //    PROUVAIT RIEN (mesuré 2026-09-02) : `CurrentTab` valait ENCORE le sentinel après
            //    240 frames — l'acquisition n'avait jamais abouti, donc la surimpression survivait
            //    parce que RIEN NE S'ÉTAIT PASSÉ. Ma première garde vérifiait l'état de DÉPART du
            //    scénario ; elle ne vérifiait pas que l'ÉVÉNEMENT dont on teste l'effet ait eu lieu.
            //    *Un scénario dimensionné pour produire l'effet et un scénario qui l'a produit sont
            //    deux propriétés distinctes.*
            Assert.AreNotEqual((AppShell.Tab)(-1), shell.CurrentTab,
                $"l'acquisition de session n'a PAS abouti en {frames} frames (CurrentTab est resté au " +
                "sentinel) : ce test n'a donc jamais exercé le montage forcé d'Empire, et sa réussite " +
                "ne dirait RIEN de la propriété visée. Ce n'est pas « la surimpression survit » — " +
                "c'est « l'événement n'a pas eu lieu ».");

            Assert.IsTrue(ouvert != null,
                "la surimpression ouverte par un geste a été DÉTRUITE par la fin de l'acquisition : " +
                "le shell s'est donné un ActivateTab que le joueur n'a pas demandé, par-dessus " +
                "l'écran qu'il venait d'ouvrir.");
        }
    }
}
