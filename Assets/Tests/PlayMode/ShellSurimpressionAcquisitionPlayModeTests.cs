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
    // ⛔ CATÉGORIE PROPRE, ET C'EST UNE CONTRAINTE D'ÉTAT, PAS DE GOÛT (2026-09-02). Ce test
    // n'appelle PAS le seeder — mais `Charpente` contient trois fixtures qui l'appellent en
    // `OneTimeSetUp` (`AccueilPanneauxGeometriePhoto…`, `CharpenteAccueilPanneaux…`,
    // `CharpenteOuvertureSessionOverlay…`), et le seeder remet le compte de démo À ZÉRO. Le lancer
    // effacerait les signalements posés par une autre session dans le même compte.
    // ⇒ Mesuré : 23 fichiers de test du dépôt appellent le seeder, dont 3 sous `Charpente`.
    // *Une catégorie n'est pas qu'une étiquette : c'est ce qu'on fait tourner AVEC.* Un test propre
    // rangé dans une catégorie qui seede est un test qu'on ne peut plus lancer seul.
    [Category("ShellSurimpression")]
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
            // ⛔⛔ ATTENDRE EN FRAMES CE QUI EST BORNÉ PAR LE RÉSEAU — mon erreur d'UNITÉ, mesurée
            //    au run réel (2026-09-02). J'attendais 240 FRAMES ; l'acquisition de session, elle,
            //    coûte deux à quatre allers-retours HTTP. En batchmode les frames sont quasi
            //    gratuites (aucun rendu), donc 240 d'entre elles s'écoulent en bien moins de temps
            //    qu'il n'en faut à trois requêtes. Le test rougissait donc en disant vrai —
            //    « l'événement n'a pas eu lieu » — pour une raison qui n'était pas celle que je
            //    croyais : ce n'est pas le shell qui ne publie pas, c'est moi qui ne l'attends pas.
            //    ⇒ *Une garde d'attente doit compter dans l'unité de ce qu'elle attend.* Le budget
            //    est désormais en SECONDES, et le temps écoulé est imprimé — un régime déclaré, pas
            //    supposé. Les frames restent comptées : elles disent si la boucle a tourné.
            // ⛔⛔⛔ MA GARDE ATTENDAIT L'ÉVÉNEMENT QUE MON PROPRE CORRECTIF EMPÊCHE — mesuré au
            //    run réel (30 s, 662 178 frames, `CurrentTab` immobile). J'attendais que
            //    `CurrentTab` quitte le sentinel pour prouver que « l'acquisition a eu lieu ». Or
            //    le correctif consiste PRÉCISÉMENT à ne PAS activer d'onglet quand une
            //    surimpression est montée : la condition d'attente était donc **rendue
            //    inatteignable par la propriété testée**. Un test qui ne peut pas finir n'est pas
            //    un test qui échoue — c'est un test dont la garde contredit son sujet.
            //    ⇒ *L'anti-vacuité doit observer une grandeur INDÉPENDANTE de l'effet qu'on
            //    mesure.* `LastSessionOpen`/`Token` sont posés par l'acquisition elle-même, sans
            //    passer par la navigation : ils disent « l'événement a eu lieu » sans rien
            //    présumer de ce que le shell en fait.
            const float budgetSecondes = 30f;
            float t0 = Time.realtimeSinceStartup;
            int frames = 0;
            // ⚠️ ON ATTEND `LastSessionOpen`, PAS `Token` — mesuré au run précédent : le jeton est
            //    posé en **0,03 s / 1 frame** (signin local), donc s'arrêter au premier des deux
            //    signaux faisait sortir la boucle AVANT que le shell n'ait atteint le moment où il
            //    activerait son onglet. Le test « passait » en assertant « il n'a pas navigué » à un
            //    instant où naviguer n'était pas encore possible. *Une garde qui s'arrête au premier
            //    signal venu mesure le signal le plus rapide, pas l'événement qu'on vise.*
            while (Time.realtimeSinceStartup - t0 < budgetSecondes && shell.LastSessionOpen == null)
            { frames++; yield return null; }
            float ecoule = Time.realtimeSinceStartup - t0;

            Debug.Log($"[surimpression] acquisition après {ecoule:F2} s / {frames} frame(s) · " +
                      $"jeton={(string.IsNullOrEmpty(shell.Token) ? "aucun" : "posé")} · " +
                      $"session={(shell.LastSessionOpen != null ? "reçue" : "aucune")} · " +
                      $"CurrentTab={shell.CurrentTab} · surimpression vivante={ouvert != null}");

            // ⛔⛔ GARDE ANTI-VACUITÉ SUR L'ÉVÉNEMENT, ajoutée après un PREMIER RUN VERT QUI NE
            //    PROUVAIT RIEN (mesuré 2026-09-02) : `CurrentTab` valait ENCORE le sentinel après
            //    240 frames — l'acquisition n'avait jamais abouti, donc la surimpression survivait
            //    parce que RIEN NE S'ÉTAIT PASSÉ. Ma première garde vérifiait l'état de DÉPART du
            //    scénario ; elle ne vérifiait pas que l'ÉVÉNEMENT dont on teste l'effet ait eu lieu.
            //    *Un scénario dimensionné pour produire l'effet et un scénario qui l'a produit sont
            //    deux propriétés distinctes.*
            Assert.IsNotNull(shell.LastSessionOpen,
                $"`session/open` n'a pas répondu en {ecoule:F1} s (jeton " +
                $"{(string.IsNullOrEmpty(shell.Token) ? "absent" : "pourtant posé")}) : le shell n'a donc " +
                "jamais atteint le point où il activerait son onglet, et ce test n'a rien exercé. " +
                "Ce n'est pas « la surimpression survit » — c'est « l'événement n'a pas eu lieu ».");

            // ⚠️ FRAMES DE DÉCANTATION — la boucle sort à l'INSTANT où `LastSessionOpen` est posé,
            //    or l'activation forcée d'onglet vit dans les lignes SUIVANTES de la même coroutine,
            //    possiblement la même frame. Asserter tout de suite reviendrait à constater qu'un
            //    geste n'a pas eu lieu avant de lui laisser la possibilité d'avoir lieu.
            // ⚠️ MÊME BUDGET QUE LE CONTRÔLE POSITIF, ET C'EST LA CONDITION POUR QUE LES DEUX SOIENT
            //    COMPARABLES : affirmer « il n'a pas navigué » n'a de sens qu'après avoir laissé au
            //    moins autant de temps que celui où l'on prouve qu'il navigue. Une assertion de
            //    NON-ÉVÉNEMENT doit accorder la même fenêtre que l'assertion d'ÉVÉNEMENT.
            //    On sort dès que le shell navigue (ce serait le défaut) — sinon on épuise la fenêtre.
            float t1 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t1 < 10f && shell.CurrentTab == (AppShell.Tab)(-1))
                yield return null;

            // ── LA PROPRIÉTÉ, positivement : le shell a fini son acquisition et n'a PAS navigué ──
            Assert.AreEqual((AppShell.Tab)(-1), shell.CurrentTab,
                $"le shell a activé {shell.CurrentTab} alors qu'une surimpression était montée : il " +
                "s'est donné une navigation que le joueur n'a pas demandée, par-dessus l'écran qu'il " +
                "venait d'ouvrir. C'est le défaut exact que le sentinel doit empêcher.");

            Assert.IsTrue(ouvert != null,
                "la surimpression ouverte par un geste a été DÉTRUITE par la fin de l'acquisition : " +
                "le shell s'est donné un ActivateTab que le joueur n'a pas demandé, par-dessus " +
                "l'écran qu'il venait d'ouvrir.");
        }

        /// <summary>⛔ CONTRÔLE POSITIF — sans lui, le test ci-dessus est satisfait par un shell qui
        /// ne navigue JAMAIS. Il prouve que le mécanisme d'activation forcée EXISTE et TIRE quand
        /// aucune surimpression n'est montée : c'est la seule façon de distinguer « le sentinel a
        /// protégé la surimpression » de « rien n'active jamais rien ». *Une garde qui ne peut pas
        /// observer le monde où le geste SE PRODUIT ne prouve rien du monde où il ne se produit
        /// pas.*</summary>
        [UnityTest]
        public IEnumerator SansSurimpression_LeShell_ACTIVE_BienSonOngletParDefaut()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("ShellSansSurimpression");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;

            Assert.AreEqual((AppShell.Tab)(-1), shell.CurrentTab, "état de départ attendu : sentinel");
            Assert.IsFalse(shell.UneSurimpressionAEteMontee, "aucune surimpression ne doit avoir été montée ici");

            const float budget = 30f;
            float t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < budget && shell.LastSessionOpen == null) yield return null;
            Assert.IsNotNull(shell.LastSessionOpen,
                $"`session/open` n'a pas répondu en {Time.realtimeSinceStartup - t0:F1} s — contrôle positif VIDE");
            // ⚠️ `session/open` n'est PAS le dernier aller-retour : `TopBar.Load` en est un autre, et
            //    l'activation d'onglet vient APRÈS lui. Attendre « 30 frames » ici valait ~1,4 ms à
            //    22 000 fps — la MÊME erreur d'unité que je venais de corriger un cran plus haut.
            //    ⇒ On attend le CHANGEMENT lui-même, en secondes.
            float t1 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t1 < 30f && shell.CurrentTab == (AppShell.Tab)(-1))
                yield return null;

            Debug.Log($"[surimpression/contrôle] sans surimpression -> CurrentTab={shell.CurrentTab}");
            Assert.AreNotEqual((AppShell.Tab)(-1), shell.CurrentTab,
                "sans surimpression, le shell DOIT activer son onglet par défaut. S'il ne le fait pas, " +
                "le test principal est vert pour la mauvaise raison : ce n'est pas le sentinel qui " +
                "protège la surimpression, c'est que rien n'active jamais rien.");
        }
    }
}