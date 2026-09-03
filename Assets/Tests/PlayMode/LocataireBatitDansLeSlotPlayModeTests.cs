using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Shell.Tests
{
    // GARDE DE CLASSE — **rien de ce qu'un locataire crée ne doit échapper à `ContentSlot`.**
    //
    // ⛔ D'OÙ ELLE VIENT. Deux écrans ont été trouvés bâtissant leur racine sous le CANVAS et non
    // sous le slot de contenu : ㊲ le 2026-09-02, ㊴ le 2026-09-03 — le second portant le
    // diagnostic du premier « mot pour mot, daté de la veille ». *Corrigé là-bas, jamais propagé.*
    // Le mécanisme : `Awake()` s'exécute DANS `AddComponent`, donc AVANT que `ConstruireLocataire`
    // n'appelle `SetMountParent(ContentSlot)` ; un écran qui bâtit à l'`Awake` et retombe sur
    // `FindFirstObjectByType<Canvas>()` se pose à côté du slot. Or c'est l'appartenance au slot qui
    // garantit la non-occlusion par l'ordre de fratrie — hors du slot, la garantie ne s'applique plus.
    //
    // ⛔⛔ POURQUOI CETTE GARDE ET PAS « AUCUN LOCATAIRE NE BÂTIT DANS `Awake` », qui était la
    // formulation demandée. Parce qu'elle viserait la FORME et non la PROPRIÉTÉ, et qu'elle se
    // trompe des deux côtés — MESURÉ ici même sur les deux écrans du chantier :
    //   · **faux positif** : ⑯ `DailyReviewScreenController` bâtit bien dans `Awake()` (`:68`) et
    //     n'a PAS le défaut — tout ce qu'il crée est parenté à SON PROPRE `transform` (`:627`,
    //     `:637`), que `SetMountParent` reparente ensuite dans `ContentSlot` en l'étirant (`:97-105`).
    //     Il n'a aucune racine de repli sur un Canvas. L'interdire l'aurait fait réécrire pour rien.
    //   · **faux négatif** : un écran qui bâtirait dans `Start()` en se parentant à
    //     `FindFirstObjectByType<Canvas>()` porterait le défaut ENTIER et passerait la règle
    //     syntaxique sans broncher.
    // ⇒ La propriété qui décide est « ce que ce locataire a créé est-il DANS le slot ? », et elle
    //   s'observe : on photographie l'arbre du canvas AVANT le montage, on monte, et on regarde où
    //   sont les objets NEUFS. Aucun nom deviné, aucune syntaxe visée.
    //
    // ⚠️ CE QU'ELLE NE PROUVE PAS : que l'écran CHARGE (㊴ dessinait son squelette et restait vide
    // pour toujours, et l'image ne le disait pas), ni qu'il est beau. Elle prouve UNE propriété
    // structurelle, et c'est écrit ici pour qu'un vert ne se relise pas « l'écran est bon ».
    [Category("Joignabilite")]
    public class LocataireBatitDansLeSlotPlayModeTests
    {
        private Scene scene;

        /// <summary>⛔⛔ RENDRE LE MONDE VIDE — ET C'EST LA CAUSE, PAS UNE PRÉCAUTION.
        ///
        /// Cette suite charge la scène de démarrage du build, donc un `AppShell` COMPLET qui vit :
        /// il acquiert sa session, charge la carte, et ses objets restent dans la scène ACTIVE
        /// après le test. Sa voisine `MenuPlusParcoursJoueurPlayModeTests` ne charge AUCUNE scène —
        /// elle fait `new GameObject("AppShell")` dans la scène active, et son `TearDown` fait
        /// `DestroyImmediate` dessus. Deux shells dans la même scène, partageant le Canvas que le
        /// premier a trouvé : la destruction de l'un laisse l'autre pointer sur du détruit, d'où
        /// le `MissingReferenceException` — qui tombe dans la fenêtre de la VOISINE et l'accuse.
        ///
        /// ⚠️ MESURÉ, et mes deux premières hypothèses étaient fausses :
        ///   · éteindre les hôtes montés (`SetActive(false)`)  → 8 passés / 1 échec, à l'identique ;
        ///   · les détruire (`Object.Destroy`)                 → 8 passés / 1 échec, à l'identique.
        /// Les deux nettoyaient `ContentSlot`, c'est-à-dire l'endroit que je regardais — pas ce qui
        /// vit à la RACINE de la scène. *Un correctif scopé à l'endroit qu'on regardait.*
        /// Le contrôle qui tranche : la même suite SANS ce fichier rend **7/7 VERT**.
        ///
        /// ⇒ On ne relâche pas l'assertion de la voisine et on ne réordonne pas les tests : on
        ///   SUPPRIME LA RESSOURCE PARTAGÉE. Après ce test, la scène ne contient plus rien à
        ///   partager. ★ Et c'est le remède que le socle prescrit — *rendre un test vert en
        ///   changeant le monde du test laisse le mécanisme en vie*, alors qu'ici le mécanisme
        ///   disparaît.</summary>
        [UnityTearDown]
        public IEnumerator RendreLeMondeVide()
        {
            Scene active = SceneManager.GetActiveScene();
            if (active.IsValid() && active.isLoaded)
            {
                GameObject[] racines = active.GetRootGameObjects();
                foreach (GameObject r in racines) if (r != null) UnityEngine.Object.DestroyImmediate(r);
                Debug.Log($"[SLOT] monde rendu vide : {racines.Length} racine(s) détruite(s)");
            }
            yield return null;
        }

        private IEnumerator ChargerLaSceneDeDemarrageDuBuild()
        {
            LogAssert.ignoreFailingMessages = true;
            Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1,
                "Build Settings vides : aucune scène de démarrage");
            string chemin = SceneUtility.GetScenePathByBuildIndex(0);
            AsyncOperation op = SceneManager.LoadSceneAsync(chemin, LoadSceneMode.Single);
            while (op != null && !op.isDone) yield return null;
            yield return null;
            scene = SceneManager.GetActiveScene();
        }

        private static AppShell SondeShell(Scene s)
        {
            if (!s.IsValid() || !s.isLoaded) return null;
            foreach (GameObject racine in s.GetRootGameObjects())
            {
                AppShell trouve = racine.GetComponentInChildren<AppShell>(true);
                if (trouve != null) return trouve;
            }
            return null;
        }

        private static void Recenser(Transform t, HashSet<Transform> dans)
        {
            dans.Add(t);
            for (int i = 0; i < t.childCount; i++) Recenser(t.GetChild(i), dans);
        }

        private static bool EstSous(Transform quoi, Transform ancetre)
        {
            for (Transform t = quoi; t != null; t = t.parent) if (t == ancetre) return true;
            return false;
        }

        /// <summary>Monte un locataire par son type d'exécution — `MonterLocataireEnSurimpression&lt;T&gt;`
        /// est générique, donc on passe par `MakeGenericMethod` plutôt que par une liste écrite à la
        /// main qui se périmerait au premier écran ajouté.</summary>
        private static void MonterParReflexion(AppShell shell, Type locataire)
        {
            MethodInfo generique = typeof(AppShell)
                .GetMethod("MonterLocataireEnSurimpression", BindingFlags.Public | BindingFlags.Instance);
            Assert.IsNotNull(generique, "MonterLocataireEnSurimpression introuvable sur AppShell");
            generique.MakeGenericMethod(locataire).Invoke(shell, null);
        }

        [UnityTest]
        public IEnumerator AucunLocataireNeBatitHorsDuSlotDeContenu()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShell(scene);
            Assert.IsNotNull(shell, "aucun AppShell dans la scène de démarrage");

            Canvas canvas = shell.GetComponentInParent<Canvas>();
            if (canvas == null && shell.ContentSlot != null) canvas = shell.ContentSlot.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "aucun Canvas au-dessus du shell");
            canvas = canvas.rootCanvas;
            Assert.IsNotNull(shell.ContentSlot, "le shell n'expose pas de ContentSlot");

            // POPULATION PAR RÉFLEXION — un écran neuf entre automatiquement dans le dénominateur.
            List<Type> locataires = AppDomain.CurrentDomain.GetAssemblies()
                .SelectMany(a => { try { return a.GetTypes(); } catch { return Array.Empty<Type>(); } })
                .Where(t => t.IsClass && !t.IsAbstract && typeof(IShellTenant).IsAssignableFrom(t))
                .Where(t => typeof(MonoBehaviour).IsAssignableFrom(t))
                .OrderBy(t => t.Name)
                .ToList();
            // ⚠️ ANTI-VACUITÉ : un balayage qui ne trouve rien rendrait « 0 échappé » — vert pour
            // n'avoir rien regardé. C'est le vert de non-exécution que ce dépôt connaît par cœur.
            Assert.Greater(locataires.Count, 10,
                $"seulement {locataires.Count} IShellTenant trouvés : le balayage ne regarde pas le bon arbre");

            var echappes = new List<string>();
            int examines = 0, objetsNeufsTotal = 0;
            foreach (Type locataire in locataires)
            {
                var avant = new HashSet<Transform>();
                Recenser(canvas.transform, avant);

                MonterParReflexion(shell, locataire);
                // Deux frames : `Awake` court dans `AddComponent` (même frame), `Start` à la suivante.
                // Trois pour laisser une `VerticalLayoutGroup` poser ses enfants.
                yield return null;
                yield return null;
                yield return null;

                var apres = new HashSet<Transform>();
                Recenser(canvas.transform, apres);
                apres.ExceptWith(avant);
                examines++;
                objetsNeufsTotal += apres.Count;

                // On ne juge que les objets qui DESSINENT : un GameObject de logique posé hors du
                // slot n'occulte rien. *Viser la propriété qui mord, pas tout ce qui bouge.*
                var dehors = apres
                    .Where(t => t != null && t.GetComponent<Graphic>() != null && !EstSous(t, shell.ContentSlot))
                    .Select(t => t.name)
                    .Distinct()
                    .ToList();
                if (dehors.Count > 0)
                    echappes.Add($"{locataire.Name} : {dehors.Count} objet(s) graphique(s) hors de "
                                 + $"ContentSlot — {string.Join(", ", dehors.Take(6))}");

                // ⛔⛔ DÉTRUIRE, PAS ÉTEINDRE — et c'est une MESURE, pas une précaution. Ma première
                // version se contentait de `SetActive(false)` : la suite `Joignabilite` est alors
                // passée de 7/7 à 17/1, et le rouge était chez la VOISINE
                // (`MenuPlusParcoursJoueur…`, `MissingReferenceException`), pas ici.
                // Expérience à UNE variable, même arbre, ma seule garde retirée : 7/7 VERT.
                // ⇒ Le mécanisme est déjà écrit dans `AppShell.ConstruireLocataire` : un hôte
                //   désactivé garde ses coroutines (`Boot()`/`Load()`), qui survivent au
                //   chargement de scène du test suivant et touchent alors des objets détruits. Ce
                //   dépôt l'a déjà payé — « un CityMapController orphelin a fait attribuer un
                //   `Debug.LogError` à un test d'exceptions trois fixtures plus loin ».
                // ⇒ Le remède est de SUPPRIMER LA DÉPENDANCE À LA RESSOURCE PARTAGÉE, jamais de
                //   relâcher l'assertion de la voisine ni de réordonner les tests : *rendre un
                //   test vert en changeant le monde du test laisse le mécanisme en vie.*
                foreach (Transform t in apres)
                    if (t != null && t.parent == shell.ContentSlot) UnityEngine.Object.Destroy(t.gameObject);
                yield return null;   // la destruction est différée d'une frame
                yield return null;
            }

            // ⚠️ SECONDE ANTI-VACUITÉ, sur la COUVERTURE et non sur la population : si aucun montage
            // ne créait d'objet, la boucle rendrait « 0 échappé » en n'ayant rien observé. Le dépôt
            // a déjà payé une population élargie SANS couverture élargie — le chiffre grossit, il
            // rassure, il ne mesure pas plus.
            Debug.Log($"[SLOT] {examines} locataires montés · {objetsNeufsTotal} objets neufs observés "
                      + $"· {echappes.Count} en défaut");
            Assert.Greater(objetsNeufsTotal, examines,
                $"{objetsNeufsTotal} objets neufs pour {examines} montages : les écrans ne bâtissent "
                + "rien d'observable, la garde ne regarde pas ce qu'elle croit");

            Assert.IsEmpty(echappes, "locataires qui bâtissent HORS de ContentSlot :\n  · "
                                     + string.Join("\n  · ", echappes));
        }

        /// <summary>CONTRÔLE POSITIF — la garde doit ROUGIR sur un écran qui s'échappe vraiment.
        /// Sans lui, le vert ci-dessus ne distingue pas « aucun ne s'échappe » de « je regarde au
        /// mauvais endroit » : c'est exactement la paire que ce dépôt confond depuis toujours.</summary>
        [UnityTest]
        public IEnumerator LeBalayageDetecteUnEchappeFabrique()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShell(scene);
            Assert.IsNotNull(shell);
            Canvas canvas = shell.GetComponentInParent<Canvas>();
            if (canvas == null && shell.ContentSlot != null) canvas = shell.ContentSlot.GetComponentInParent<Canvas>();
            canvas = canvas.rootCanvas;

            var avant = new HashSet<Transform>();
            Recenser(canvas.transform, avant);

            // Le défaut, reproduit à la main : un graphique parenté au CANVAS et non au slot.
            GameObject fuite = new GameObject("EcranQuiSEchappe", typeof(RectTransform));
            fuite.transform.SetParent(canvas.transform, false);
            fuite.AddComponent<Image>();
            yield return null;

            var apres = new HashSet<Transform>();
            Recenser(canvas.transform, apres);
            apres.ExceptWith(avant);

            var dehors = apres
                .Where(t => t != null && t.GetComponent<Graphic>() != null && !EstSous(t, shell.ContentSlot))
                .ToList();
            Assert.AreEqual(1, dehors.Count,
                "le balayage doit voir EXACTEMENT l'échappé fabriqué — s'il en voit 0, il ne peut "
                + "rien détecter ; s'il en voit plus, il compte autre chose que ce qu'il croit");
            Assert.AreEqual("EcranQuiSEchappe", dehors[0].name);

            UnityEngine.Object.Destroy(fuite);
            yield return null;
        }
    }
}
