using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Tests;   // ProductionClickSupport — le geste de PRODUCTION, pas onClick.Invoke()
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⛔⛔ COUCHE 3 DU CHANTIER JOIGNABILITÉ — « un chemin EXISTE » ≠ « un joueur y ARRIVE ».
    //
    // `LocataireJoignabilitePlayModeTests` prouve la première propriété en balayant le code : tout
    // `IShellTenant` est atteint depuis `AppShell`. Elle ne peut rien dire de la seconde — un bouton
    // peut être non interactif, inactif, ou monter le mauvais écran, et le balayage restera vert.
    // C'est exactement la distinction qu'une session voisine a formulée le même jour à propos de sa
    // planche de captures : *elle prouve qu'ils RENDENT, jamais qu'un joueur y arrive.*
    //
    // Ce test-ci fait le geste : il entre par le shell, ouvre `Tab.More`, et CLIQUE chaque entrée
    // comme un doigt le ferait — via `ProductionClickSupport`, jamais `onClick.Invoke()`, qui
    // court-circuite les deux gardes de `Button.Press()` (`IsActive()`, `IsInteractable()`). Ce
    // dépôt a déjà mesuré une garde restée VERTE sur un dock rendu non-interactif exprès.
    //
    // ⚠️ LA POPULATION EST LUE SUR LE MENU CONSTRUIT, jamais écrite à la main. Une liste de onze
    // libellés se périmerait au douzième écran — et c'est précisément le mode d'échec que tout ce
    // chantier existe pour fermer.
    [Category("Joignabilite")]
    public class MenuPlusParcoursJoueurPlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        [SetUp] public void Avant() { LogAssert.ignoreFailingMessages = true; }

        [TearDown]
        public void Apres()
        {
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            LogAssert.ignoreFailingMessages = false;
        }

        private static IEnumerator AttendreEmpire(AppShell s)
        {
            // Le shell acquiert SA session en tâche de fond et termine par son propre
            // `ActivateTab(Empire)` : un seul `yield return null` ne le garantit pas (mesuré en lot,
            // sous contention réseau). `CurrentTab` est le signal robuste — vrai sur les DEUX
            // branches, succès et repli-échec.
            float t = 0f;
            while (s.CurrentTab != AppShell.Tab.Empire && t < 15f) { t += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, s.CurrentTab, "le shell n'a pas fini son acquisition de session");
        }

        [UnityTest]
        public IEnumerator ChaqueEntreeDuMenuPlusMonteUnEcranDISTINCT_AuGesteDeProduction()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreEmpire(shell);

            shell.ActivateTab(AppShell.Tab.More);
            yield return null;

            // ⚠️ PLANCHER ANTI-VACUITÉ, ET IL PORTE SUR LES DEUX CÔTÉS. Sans lui, un menu qui ne se
            // construit pas rendrait « 0 entrée cliquée, 0 échec » — VERT pour n'avoir rien fait,
            // le vert de non-exécution que ce dépôt connaît par cœur. 11 est le compte mesuré au
            // 2026-09-02 (2 + les 9 écrans qui n'avaient aucune porte) ; le `>=` laisse passer les
            // ajouts légitimes et rougit sur une TABLE QUI RÉTRÉCIT — une régression silencieuse.
            Assert.GreaterOrEqual(shell.MenuPlusEntrees, 11,
                $"le menu ne porte que {shell.MenuPlusEntrees} entrée(s) : soit il ne se construit pas, " +
                "soit la table des destinations a rétréci — dans les deux cas ce test ne prouverait rien.");

            List<Button> entrees = Object.FindObjectsByType<Button>(FindObjectsSortMode.None)
                .Where(b => b.gameObject.name.StartsWith("MenuPlus_"))
                .OrderBy(b => b.gameObject.name, System.StringComparer.Ordinal)
                .ToList();
            Assert.AreEqual(shell.MenuPlusEntrees, entrees.Count,
                $"{shell.MenuPlusEntrees} entrées comptées par le shell mais {entrees.Count} boutons trouvés : " +
                "l'un des deux ment, et aucune conclusion n'est possible tant qu'ils divergent.");

            var montes = new Dictionary<string, System.Type>();
            var echecs = new List<string>();

            foreach (Button entree in entrees)
            {
                string nom = entree.gameObject.name;

                // Re-ouvrir le menu : le clic précédent a monté un locataire À SA PLACE, donc les
                // boutons de la passe précédente sont détruits. On relit la liste à chaque tour
                // plutôt que de garder des références mortes.
                shell.ActivateTab(AppShell.Tab.More);
                yield return null;
                Button courant = Object.FindObjectsByType<Button>(FindObjectsSortMode.None)
                    .FirstOrDefault(b => b.gameObject.name == nom);
                if (courant == null) { echecs.Add($"{nom} : introuvable après réouverture du menu"); continue; }

                if (!ProductionClickSupport.Click(courant))
                {
                    // `Click` rend faux quand le bouton est inactif ou non interactif — c'est-à-dire
                    // quand un DOIGT ne pourrait pas l'actionner. Une entrée visible et morte est
                    // pire qu'une absente : elle promet une destination.
                    echecs.Add($"{nom} : le bouton refuse le clic de production (inactif ou non interactif)");
                    continue;
                }
                yield return null;

                if (shell.MountedTenantType == null) { echecs.Add($"{nom} : cliqué, aucun locataire monté"); continue; }
                montes[nom] = shell.MountedTenantType;
            }

            Assert.IsEmpty(echecs,
                "des entrées du menu ne mènent nulle part :\n  " + string.Join("\n  ", echecs) +
                "\nUne entrée qui ne monte rien est une porte peinte sur un mur.");

            // ⛔⛔ LE MONDE DÉGÉNÉRÉ QU'IL FAUT NOMMER, parce que le code le nomme lui-même : la table
            //    des destinations construit ses N boutons dans une boucle et capture le geste dans
            //    une variable. Une capture par RÉFÉRENCE au lieu d'une capture par VALEUR ferait
            //    monter LA DERNIÈRE destination aux onze entrées — et TOUTES les assertions
            //    ci-dessus resteraient vertes : onze clics acceptés, onze locataires montés.
            //    ⇒ La propriété qui dégénère n'est pas « ça monte », c'est la VARIÉTÉ de ce qui
            //      monte. On asserte donc la CARDINALITÉ, pas l'occupation. *Même famille que
            //      l'anneau à « N entrées distinctes en POSITION » satisfait par des valeurs
            //      identiques — la garde qui certifie le défaut.*
            int distincts = montes.Values.Distinct().Count();
            Assert.AreEqual(montes.Count, distincts,
                $"{montes.Count} entrées cliquées ne montent que {distincts} écran(s) DISTINCT(s) : " +
                "plusieurs entrées mènent au même endroit — le symptôme exact d'une capture de " +
                "variable de boucle par référence.\n" +
                string.Join("\n", montes.Select(kv => $"  {kv.Key} -> {kv.Value.Name}")));
        }
    }
}
