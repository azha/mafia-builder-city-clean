using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using TMPro;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ITEM 0.1 de `front.md` — LA CHARPENTE. Ce n'est pas un écran : c'est la falsifiable qui rend
    // vraie (ou fausse) la colonne « monté » des 49 écrans du document.
    //
    // CE QUI ÉTAIT MESURÉ AVANT CE LOT (front.md §0, re-vérifié le 2026-08-25 sur `fe00b0a`) :
    //   0 `AddComponent<AppShell>` dans `Assets/Scripts` · 24 dans `Assets/Tests` (8 fichiers) ·
    //   le GUID d'`AppShell.cs` absent de tout fichier hors son propre `.meta` · 0 prefab ·
    //   les Build Settings ne portaient que `SampleScene` (une caméra, une lumière, un Volume).
    //   ⇒ un build lancé n'aurait montré AUCUN écran, y compris les 13 déjà construits.
    //
    // ⛔ LE PIÈGE QUE CETTE CLASSE EXISTE POUR NE PAS TOMBER DEDANS, nommé dans `front.md` :
    //   « une garde qui construit son propre `AppShell` teste le test ». Les 24 montages d'`Assets/
    //   Tests` prouvent que le shell FONCTIONNE ; aucun ne prouve qu'un JOUEUR le rencontre. La
    //   grandeur qui discrimine n'est donc pas « un AppShell existe » mais **« la scène enregistrée
    //   à l'index 0 des Build Settings en porte un »** — et c'est la seule que ces tests lisent :
    //   la scène est chargée PAR SON INDEX DE BUILD, jamais par son chemin écrit à la main, et le
    //   shell trouvé doit APPARTENIR à cette scène (`gameObject.scene`), jamais au domaine PlayMode.
    //
    // Pourquoi additif et non `Single` : `Single` détruit la scène du runner et rend impossible tout
    // déchargement propre en fin de test — la scène de démarrage (et ses coroutines réseau) resterait
    // vivante dans les tests SUIVANTS. Le précédent maison est explicite là-dessus (`AppShell.cs`,
    // `MountTenant<T>` : un locataire orphelin a déjà attribué son `Debug.LogError` à un test sans
    // rapport trois fixtures plus loin). L'index de build reste la grandeur lue dans les deux modes.
    [Category("Charpente")]
    public class CharpenteBootScenePlayModeTests
    {
        private Scene sceneDeDemarrage;

        // Le shell DÉCOUVRE un Canvas (`FindFirstObjectByType<Canvas>`) au lieu d'en créer un quand
        // il en trouve un : un Canvas laissé par un test antérieur du MÊME domaine PlayMode ferait
        // donc bâtir la barre du shell de la scène de démarrage DANS la scène du voisin. Ce n'est
        // pas une précaution de style — c'est la co-tenance que ce dépôt a déjà payée deux fois.
        // ⇒ On nettoie AVANT, et on IMPRIME ce qu'on a nettoyé : un dispositif conditionnel qui ne
        // déclare pas son régime est indiscernable d'un dispositif inerte.
        [UnitySetUp]
        public IEnumerator SetUp()
        {
            int shellsTues = 0, canvasTues = 0, locatairesTues = 0;
            foreach (AppShell reste in Object.FindObjectsByType<AppShell>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (reste.ShellCanvas != null) { Object.DestroyImmediate(reste.ShellCanvas.gameObject); canvasTues++; }
                Object.DestroyImmediate(reste.gameObject);
                shellsTues++;
            }
            foreach (Canvas reste in Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                Object.DestroyImmediate(reste.gameObject);
                canvasTues++;
            }
            // ⛔ C6 (revue ⊥ round 2) — CLASSE ENTIÈRE, pas seulement l'instance nommée : un
            // AppShell/Canvas résiduel n'est pas la SEULE pollution possible. La branche de repli
            // d'`OpenNav`/`OpenDetail` (item 0.4) crée une racine `Nav_*` NUE, jamais parentée sous
            // un AppShell — donc jamais atteinte par les deux boucles ci-dessus — qui survivrait
            // dans le domaine PlayMode et entrerait dans un balayage `IShellTenant` d'un test
            // SUIVANT (rouge à tort, dépendant de l'ordre). On détruit donc TOUT GameObject portant
            // un `IShellTenant`, quelle que soit sa racine, et on IMPRIME le compte (un dispositif
            // conditionnel qui ne déclare pas son régime est indiscernable d'un dispositif inerte).
            foreach (MonoBehaviour comportement in Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (comportement != null && comportement is IShellTenant)
                {
                    Object.DestroyImmediate(comportement.gameObject);
                    locatairesTues++;
                }
            }
            Debug.Log($"[Charpente] SetUp — régime déclaré : {shellsTues} AppShell, {canvasTues} Canvas et " +
                      $"{locatairesTues} IShellTenant résiduels détruits avant le chargement.");
            yield return null;
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            LogAssert.ignoreFailingMessages = false; // jamais laissé fuiter vers un test SANS RAPPORT
            if (sceneDeDemarrage.IsValid() && sceneDeDemarrage.isLoaded)
            {
                AsyncOperation dechargement = SceneManager.UnloadSceneAsync(sceneDeDemarrage);
                while (dechargement != null && !dechargement.isDone) yield return null;
            }
            sceneDeDemarrage = default;
            foreach (Canvas reste in Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                Object.Destroy(reste.gameObject);
            yield return null;
        }

        /// <summary>L'INSTRUMENT, et il est scopé à UNE scène par construction. Un `FindFirstObjectByType
        /// &lt;AppShell&gt;()` nu répondrait « oui » pour un shell construit par un test, pour un objet
        /// `DontDestroyOnLoad`, ou pour n'importe quelle scène additive — c'est-à-dire pour tout SAUF
        /// la propriété qu'on mesure.</summary>
        /// ⛔⛔ CETTE SONDE FUSIONNAIT DEUX CAUSES SOUS UN SEUL VERDICT — TD-682, 2026-09-07.
        /// Elle rend `null` aussi bien quand la scène est INUTILISABLE que quand elle ne PORTE PAS
        /// de shell, et l'assertion appelante attribue ce `null` à la seconde : « aucun AppShell
        /// dans la scène de démarrage du build ». **Dix-sept gardes de charpente rougissent sur ce
        /// message, et la mesure INNOCENTE la scène** — le journal montre `AppShell:Start()` →
        /// `EnsureInitialized()` → `BuildLayout()` → `TopBarController:Awake()`, le chrome
        /// entièrement construit, `Boot.unity` propre, une seule classe `AppShell`, zéro
        /// `DontDestroyOnLoad`.
        /// ⇒ *Un message d'échec qui fusionne deux causes envoie l'enquête dans une seule
        ///   direction, et celle qu'il nomme est fausse dans un cas sur deux.* Le premier geste
        ///   n'est donc pas d'ouvrir la scène : c'est de SÉPARER LES DEUX VERDICTS.
        /// ⚠️ Et le contrôle positif de cette sonde rougit AVEC elle (« la sonde ne trouve pas le
        ///   shell là où il est ») : *quand un instrument ET son contrôle tombent ensemble, c'est
        ///   le monde du run qui est faux, pas la cible.* D'où le journal ci-dessous — il imprime
        ///   ce que la sonde A VU, pas ce qu'on suppose qu'elle voit.
        private static string diagnosticSonde;

        /// <summary>L'INSTRUMENT, et il est scopé à UNE scène par construction. Un `FindFirstObjectByType
        /// &lt;AppShell&gt;()` nu répondrait « oui » pour un shell construit par un test, pour un objet
        /// `DontDestroyOnLoad`, ou pour n'importe quelle scène additive — c'est-à-dire pour tout SAUF
        /// la propriété qu'on mesure.</summary>
        private static AppShell SondeShellDansLaScene(Scene scene)
        {
            if (!scene.IsValid() || !scene.isLoaded)
            {
                diagnosticSonde = $"la scène est INUTILISABLE (IsValid={scene.IsValid()}, "
                                + $"isLoaded={scene.isLoaded}) — ce n'est PAS « pas d'AppShell »";
                Debug.Log($"[SONDE-SHELL] {diagnosticSonde}");
                return null;
            }
            GameObject[] racines = scene.GetRootGameObjects();
            foreach (GameObject racine in racines)
            {
                AppShell trouve = racine.GetComponentInChildren<AppShell>(true);
                if (trouve != null)
                {
                    diagnosticSonde = null;
                    return trouve;
                }
            }
            // ⚠️ LE SECOND VERDICT, et il porte ses FAITS : combien de racines, lesquelles, et si
            //    un `AppShell` existe AILLEURS dans le processus. Ce dernier point départage
            //    « la scène n'en a pas » de « il y en a un, mais pas dans cette scène-ci » — deux
            //    mondes que le message d'origine confondait aussi.
            var noms = new System.Text.StringBuilder();
            for (int i = 0; i < racines.Length && i < 12; i++)
                noms.Append(i == 0 ? "" : ", ").Append(racines[i].name);
            AppShell ailleurs = UnityEngine.Object.FindFirstObjectByType<AppShell>(FindObjectsInactive.Include);
            diagnosticSonde = $"scène chargée ({scene.path}) mais AUCUN AppShell parmi ses "
                            + $"{racines.Length} racine(s) [{noms}] · un AppShell existe ailleurs "
                            + $"dans le processus : {(ailleurs != null ? "OUI, scène « " + ailleurs.gameObject.scene.path + " »" : "NON")}";
            Debug.Log($"[SONDE-SHELL] {diagnosticSonde}");
            return null;
        }

        private IEnumerator ChargerLaSceneDeDemarrageDuBuild()
        {
            // Le shell signe sa session au `Start()` (signin + `session/open` + sonde heat) : sur une
            // stack absente ou non semée, il logue ses propres `Debug.LogError`, qu'`UnityTestFramework`
            // compte comme des échecs. CES falsifiables-ci sont STRUCTURELLES — elles n'assertent RIEN
            // sur le réseau — donc ce bruit est orthogonal, et le taire ici n'avale aucun défaut
            // produit : aucune assertion de ce fichier ne porte sur l'authentification. (Même patron,
            // même justification, que `AppShellPlayModeTests.ExpectTenantOwnDemoAuthNoise`.)
            LogAssert.ignoreFailingMessages = true;

            // ⛔ GARDE ANTI-VACUITÉ n°1 — sans elle, un projet dont les Build Settings sont VIDES
            // ferait passer tout ce qui suit « à vide » : `GetScenePathByBuildIndex(0)` rend la chaîne
            // vide, et une comparaison entre deux chaînes vides est VRAIE.
            Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1,
                "Build Settings vides : aucune scène de démarrage ⇒ un build ne montrerait AUCUN écran.");

            string chemin = SceneUtility.GetScenePathByBuildIndex(0);
            Assert.IsNotEmpty(chemin, "la scène d'index de build 0 n'a pas de chemin");

            AsyncOperation chargement = SceneManager.LoadSceneAsync(0, LoadSceneMode.Additive);
            Assert.IsNotNull(chargement, "LoadSceneAsync(0) a refusé l'index de build 0");
            while (!chargement.isDone) yield return null;

            sceneDeDemarrage = SceneManager.GetSceneByBuildIndex(0);
            Assert.IsTrue(sceneDeDemarrage.IsValid() && sceneDeDemarrage.isLoaded,
                "la scène d'index de build 0 n'est pas chargée");
            // ⛔ GARDE ANTI-VACUITÉ n°2 — la scène chargée est bien CELLE que les Build Settings
            // désignent, pas une scène homonyme ni celle du runner de tests.
            Assert.AreEqual(chemin, sceneDeDemarrage.path,
                "la scène chargée n'est pas celle de l'index de build 0");

            yield return null; // `Start()` d'`AppShell` : `EnsureInitialized()` y bâtit tout le chrome, synchrone.
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.1-a — LA GARDE. Structurelle : aucun pixel, aucune couleur, aucune valeur de réponse.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator F0_1a_LaSceneDeDemarrageDuBuild_PorteAppShellTopBarEtLaBarreDOnglets()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();

            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell,
                $"la sonde n'a pas rendu de shell — DIAGNOSTIC : {diagnosticSonde}\n" +
                "les 24 montages d'Assets/Tests prouvent que le shell marche, jamais qu'un joueur le rencontre.");

            // Le shell trouvé APPARTIENT à la scène du build. C'est cette égalité, et elle seule, qui
            // distingue « la charpente existe » de « un test a fait un AddComponent ».
            Assert.AreEqual(sceneDeDemarrage.path, shell.gameObject.scene.path,
                "l'AppShell trouvé n'appartient pas à la scène de démarrage du build");

            Assert.IsNotNull(shell.TopBar, "le shell de la scène de démarrage n'a pas de TopBarController");
            Assert.IsNotNull(shell.TabBarRoot, "le shell de la scène de démarrage n'a pas de barre d'onglets");
            Assert.IsNotNull(shell.ContentSlot, "le shell de la scène de démarrage n'a pas d'emplacement de contenu");

            // La barre d'onglets est PEUPLÉE — et EXACTEMENT de ce qu'elle doit porter.
            // ⛔ CORRIGÉ (revue ⊥ round 2, C2) : un PLANCHER (`onglets.Length > 0`) reste VERT
            // même si 3 des 4 boutons disparaissent demain — un monde où « Famille », « Filière »
            // et « Plus » ont tous disparu et où seul « Empire » survit satisfait encore
            // `Length > 0`, sans qu'aucune de leurs destinations ne soit atteignable. `front.md`
            // (item 0.2) le dit pour ce même défaut : « Pas un compte. Asserter QUELS, pas
            // seulement combien. » `AppShell.BuildTabBar` en construit EXACTEMENT 4 (canon §6 —
            // Empire/Famille/Filière/Plus, PAS de bulle Carte séparée : « on est déjà sur la carte,
            // elle sort du dock » — items 0.2/0.3, décision A TRANCHÉE le 2026-08-25).
            // Ce test-ci n'asserte que le NOM du GameObject de chaque bouton (`$"Tab_{tab}"`, posé
            // par `AddTabButton`, indépendant du libellé) — une clé stable. Les LIBELLÉS RÉELLEMENT
            // affichés (le texte, désormais ratifié) sont la charge de F0.2 ci-dessous.
            Button[] onglets = shell.TabBarRoot.GetComponentsInChildren<Button>(true);
            var nomsOnglets = new List<string>();
            foreach (Button b in onglets) nomsOnglets.Add(b.gameObject.name);
            var ongletsAttendus = new List<string>
            {
                $"Tab_{AppShell.Tab.Empire}", $"Tab_{AppShell.Tab.Org}", $"Tab_{AppShell.Tab.Pipeline}", $"Tab_{AppShell.Tab.More}",
            };
            CollectionAssert.AreEquivalent(ongletsAttendus, nomsOnglets,
                $"la barre d'onglets de la scène de démarrage doit porter EXACTEMENT {{{string.Join(", ", ongletsAttendus)}}} " +
                $"(un de chaque, ni plus ni moins) — trouvé {{{string.Join(", ", nomsOnglets)}}}.");

            Debug.Log($"[Charpente] F0.1-a — scène « {sceneDeDemarrage.path} » · AppShell présent · " +
                      $"TopBar présent · {onglets.Length} bouton(s) d'onglet : {string.Join(", ", nomsOnglets)}.");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.1-b — CONTRÔLE POSITIF DE L'INSTRUMENT.
        //
        // Une sonde qui répond « oui » partout ne prouve rien : ce dépôt a déjà livré trois sondes
        // successives dont le verdict était UNIFORME et entièrement faux. On exige donc, du MÊME
        // instrument et dans le MÊME test, deux réponses DIFFÉRENTES — sur la scène du build, et sur
        // une scène témoin dont on sait qu'elle ne porte pas de shell.
        // ⇒ Ce test rougirait si `SondeShellDansLaScene` se mettait à répondre « oui » sans regarder.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator F0_1b_ControlePositif_LaSondeSaitDireNonSurUneSceneSansShell()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();

            Scene temoin = SceneManager.CreateScene("charpente-temoin-sans-shell");
            yield return null;

            AppShell dansLeBuild = SondeShellDansLaScene(sceneDeDemarrage);
            AppShell dansLeTemoin = SondeShellDansLaScene(temoin);

            Assert.IsNotNull(dansLeBuild, "la sonde ne trouve pas le shell là où il est");
            Assert.IsNull(dansLeTemoin, "la sonde trouve un shell dans une scène qui n'en contient aucun ⇒ elle répond sans regarder");

            Debug.Log($"[Charpente] F0.1-b — instrument DISCRIMINANT : scène du build → trouvé ; " +
                      $"scène témoin « {temoin.name} » (0 racine) → non trouvé.");

            AsyncOperation dechargement = SceneManager.UnloadSceneAsync(temoin);
            while (dechargement != null && !dechargement.isDone) yield return null;
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.2 — ITEM 0.2 de `front.md` (Tools/charpente-item0-2-3-design.md). Décision A TRANCHÉE
        // le 2026-08-25 : le dock ratifié est l'ENSEMBLE {Empire, Famille, Filière, Plus}.
        //
        // ⛔⛔ CORRIGÉ (revue ⊥ round 2 du lot 0.2/0.3, M2 — EXÉCUTÉ, pas seulement argumenté) :
        // la version précédente asserte l'ENSEMBLE des LIBELLÉS seuls (`CollectionAssert.
        // AreEquivalent` sur une `List<string>`). La revue a permuté LES LIBELLÉS de deux entrées
        // de `DockRatifie` (Empire ↔ Org) dans le code de production — F0.1-a (noms d'objets),
        // F0.2 (ensemble de libellés) ET F0.2-c (ordre des membres d'enum dans le littéral) sont
        // TOUS restés VERTS, parce qu'aucun des trois ne lit la PAIRE (quel bouton porte quel
        // libellé) : un dock affichant « FAMILLE » sous la bulle Empire passait la garde. La
        // grandeur qui discrimine n'est ni le NOM seul ni l'ENSEMBLE seul : c'est la PAIRE
        // (nom du bouton, libellé rendu SOUS CE MÊME bouton) — le libellé (`Label`, enfant de
        // `AddTabButton`) est lu SOUS le bouton `Tab_{tab}` qui le porte, jamais dans une liste à
        // plat de tous les `TextMeshProUGUI` de la barre (cette dernière forme est exactement ce
        // qui rendait la permutation invisible : un ensemble ne sait plus qui portait quoi).
        //
        // ⛔ Anti-tautologie (design §3.1, INCHANGÉ par ce correctif) : cette garde ne lit PAS
        // `AppShell.DockRatifie` puis ne l'asserte pas contre elle-même (ce serait tester le test)
        // — la cible (`pairesAttendues` ci-dessous) est écrite indépendamment du code de
        // production, comme `ongletsAttendus` de F0.1-a (même idiome : `$"Tab_{AppShell.Tab.X}"`).
        // ⛔ Les DEUX chemins de construction sont couverts (design §4) : `BuildTabBar` (au premier
        // montage) ET `RebatirChromePourResolutionCourante` (la reconstruction) — sinon on corrige
        // l'un et l'autre survit, exactement le défaut que ce lot ferme (C-a).
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator F0_2_LEnsembleDesLibellesDuDock_EgaleLEnsembleRatifie_SurLesDeuxCheminsDeConstruction()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");

            // Cible ÉCRITE ICI, indépendamment de `AppShell.DockRatifie` — `AddTabButton` majuscule
            // le libellé (`label.ToUpperInvariant()`), donc la cible le fait aussi, sinon un écart de
            // CASSE serait lu comme un écart de PAIRE. Le nom de bouton (`$"Tab_{tab}"`) est la MÊME
            // clé stable que F0.1-a — jamais un index de tableau, jamais `DockRatifie` recopié.
            // ⚠️ Chaque PAIRE est formatée en UNE chaîne (`"{nomBouton}={libelle}"`), pas un
            // `ValueTuple` comparé par `CollectionAssert` : `com.unity.ext.nunit` embarqué ici est
            // basé sur NUnit 3.5 (`package.json`), antérieur au support ValueTuple de
            // `NUnitEqualityComparer` — une chaîne composite est le format que CETTE version sait
            // comparer sans ambiguïté, et le message d'échec reste tout aussi lisible.
            var pairesAttendues = new List<string>
            {
                $"Tab_{AppShell.Tab.Empire}=EMPIRE",
                $"Tab_{AppShell.Tab.Org}=FAMILLE",
                $"Tab_{AppShell.Tab.Pipeline}=FILIÈRE",
                $"Tab_{AppShell.Tab.More}=PLUS",
            };

            List<string> LirePairesReellementAffichees()
            {
                var paires = new List<string>();
                foreach (Transform enfant in shell.TabBarRoot)
                {
                    // Filtre sur le PRÉFIXE de nom que `AddTabButton` pose (`$"Tab_{tab}"`) — exclut
                    // `DockFondu`, seul autre enfant direct de `TabBarRoot` (le dégradé de fond).
                    if (!enfant.name.StartsWith("Tab_")) continue;
                    TextMeshProUGUI label = enfant.GetComponentInChildren<TextMeshProUGUI>(true);
                    paires.Add($"{enfant.name}={(label != null ? label.text : "<AUCUN LABEL>")}");
                }
                return paires;
            }

            // ── chemin 1 : construction initiale (BuildTabBar, dans Start()/BuildLayout). ──
            List<string> construction = LirePairesReellementAffichees();
            CollectionAssert.AreEquivalent(pairesAttendues, construction,
                $"la barre d'onglets de la scène de démarrage doit apparier EXACTEMENT " +
                $"{{{string.Join(", ", pairesAttendues)}}} (construction initiale) — trouvé " +
                $"{{{string.Join(", ", construction)}}}. Un libellé au mauvais bouton (deux entrées " +
                "ÉCHANGÉES) doit ROUGIR ici en nommant la paire fautive, même si l'ENSEMBLE des " +
                "libellés reste inchangé (M2, revue ⊥ round 2).");

            // ── chemin 2 : reconstruction (RebatirChromePourResolutionCourante) — le second chemin
            // que le design exige couvert, sinon corriger l'un laisse l'autre survivre. ──
            shell.RebatirChromePourResolutionCourante();
            yield return null;
            List<string> reconstruction = LirePairesReellementAffichees();
            CollectionAssert.AreEquivalent(pairesAttendues, reconstruction,
                $"la barre d'onglets doit apparier EXACTEMENT {{{string.Join(", ", pairesAttendues)}}} " +
                $"APRÈS reconstruction — trouvé {{{string.Join(", ", reconstruction)}}}.");

            Debug.Log($"[Charpente] F0.2 — paires (bouton=libellé) du dock (construction) : " +
                      $"{string.Join(", ", construction)} ; (reconstruction) : {string.Join(", ", reconstruction)}.");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // MAJEUR 3 (revue ⊥ round 16, classe PREUVE) — `RebatirChromePourResolutionCourante()` se
        // DÉCLARE désormais par un `Debug.Log` (round 15) : « je suis devenue un NO-OP GÉOMÉTRIQUE
        // depuis que Px() ne lit plus le Canvas ». C'est VRAI et VÉRIFIÉ (revue round 16, § « ce qui
        // tient ») — mais un `Debug.Log` ne rougit JAMAIS : le jour où quelqu'un remet un geste
        // géométrique divergent dans cette méthode (le mode d'échec qui a produit 15 rounds sur ce
        // lot), rien ne le dit. Cette garde transforme « par construction » en propriété SURVEILLÉE :
        // relever les 3 grandeurs géométriques que `Px()` alimente ici, appeler la méthode, asserter
        // l'égalité. Classe EFFET (le résultat géométrique), pas PARAMÈTRE (une valeur de `Px()` en
        // isolation) — le socle CLAUDE.md distingue les deux et seule la première mord.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator MAJEUR3_RebatirChromePourResolutionCourante_EstUnNoOpGeometrique_Asserte()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");

            Transform echelleT = shell.TopBarSlot.Find("TopBarEchelle");
            Assert.IsNotNull(echelleT, "`TopBarEchelle` doit exister sous `TopBarSlot` — c'est le nœud que " +
                "cette garde surveille (round 17, revue ⊥ round 16, BLOQUANT, même nœud).");
            var echelleRt = (RectTransform)echelleT;

            // ── relevé AVANT — les 3 grandeurs géométriques que `Px()`/`FacteurEchelle()` posent ──
            Vector2 topBarSizeAvant = shell.TopBarSlot.sizeDelta;
            Vector3 echelleScaleAvant = echelleRt.localScale;
            Vector2 tabBarSizeAvant = shell.TabBarRoot.sizeDelta;

            shell.RebatirChromePourResolutionCourante();
            yield return null;

            Assert.AreEqual(topBarSizeAvant, shell.TopBarSlot.sizeDelta,
                "`TopBarSlot.sizeDelta` doit être IDENTIQUE avant/après `RebatirChromePourResolutionCourante()` " +
                "— un écart signale qu'un geste géométrique divergent est revenu dans cette méthode (le " +
                "docstring round 15 la déclare NO-OP géométrique ; cette garde le VÉRIFIE, le `Debug.Log` " +
                "voisin ne le fait pas).");
            Assert.AreEqual(echelleScaleAvant, echelleRt.localScale,
                "`TopBarEchelle.localScale` doit être IDENTIQUE avant/après — c'est le nœud `k` du " +
                "BLOQUANT round 16 ; une divergence ici referait courir la même classe de défaut.");
            Assert.AreEqual(tabBarSizeAvant, shell.TabBarRoot.sizeDelta,
                "`TabBarRoot.sizeDelta` doit être IDENTIQUE avant/après.");
        }

        [UnityTest]
        public IEnumerator MAJEUR3_RebatirChromePourResolutionCourante_PositiveControl_MethodeDoitReellementEcrire()
        {
            // CONTRÔLE POSITIF : sans lui, le NO-OP mesuré ci-dessus pourrait être vrai parce que la
            // méthode ne fait RIEN (un early-return silencieux, une exception avalée) plutôt que parce
            // qu'elle recalcule authentiquement la MÊME géométrie. On sabote délibérément une valeur
            // AVANT l'appel — si la méthode écrit réellement, la valeur sabotée ne doit PAS survivre.
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");

            const float valeurSabotee = 999f;
            shell.TopBarSlot.sizeDelta = new Vector2(0f, valeurSabotee);

            shell.RebatirChromePourResolutionCourante();
            yield return null;

            Assert.AreNotEqual(valeurSabotee, shell.TopBarSlot.sizeDelta.y,
                "CONTRÔLE POSITIF : `RebatirChromePourResolutionCourante()` DOIT réellement RÉÉCRIRE " +
                "`TopBarSlot.sizeDelta` (pas un early-return silencieux) — sinon le NO-OP mesuré par la " +
                "garde ci-dessus serait vrai par ABSENCE D'EXÉCUTION, pas par la propriété qu'elle " +
                "prétend surveiller (même famille que le contrôle positif du BLOQUANT round 16).");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // BLOQUANT (revue ⊥ round 16, CLASSE PRODUCTION) — `TopBarController.EffectiveBottomOverhangPx`
        // rendait des PIXELS D'ÉCRAN (`k × canvas.scaleFactor`) là où ses consommateurs de production
        // (`AppShell.EnterDistrict`, `AppShell.PublierInsetsDuChrome` → `ShellChrome.TopInsetPx`) et
        // son propre docstring exigent des UNITÉS DE CANVAS (`k` seul). La PROPRIÉTÉ que cette garde
        // observe est l'UNITÉ, pas la valeur (socle CLAUDE.md, « durcir sur une autre grandeur que
        // celle où vit le défaut ne l'atteint jamais ») : une grandeur en unités de CANVAS ne dépend
        // PAS de `canvas.scaleFactor` — un écran plus ou moins dense ne change rien à une géométrie
        // exprimée en unités de référence. Une garde de VALEUR (« > 0 », « proche de X ») resterait
        // verte à travers ce défaut exactement comme le round 13 l'a montré pour la magnitude de
        // `TopBarEchelle.localScale` (`Assert.Greater(…, 0f)`, satisfaite par la valeur FAUTIVE
        // elle-même). ⇒ cette garde lit la MÊME propriété à DEUX `canvas.scaleFactor` différents et
        // exige l'ÉGALITÉ : aucune valeur exprimée en pixels d'écran ne peut la satisfaire, quel que
        // soit le nombre mesuré à la première lecture.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        /// <summary>⛔⛔⛔ LE DÉBORD DOIT SURVIVRE À UNE REPUBLICATION — et la garde d'à côté ne le
        /// voyait pas, parce qu'elle ne LIT QU'UNE FOIS.
        ///
        /// MESURÉ le 2026-09-07 en instrumentant le getter : sur cinq publications d'un même run,
        ///     `debordLocal` (MAQUETTE) = **32,21 aux cinq**, `barre.yMin` et `mano.min.y`
        ///     identiques — la géométrie ne bouge pas d'un centième ;
        ///     `lossyScale` = **1,633** à la première, **0,011** aux suivantes — facteur 148 ;
        ///     sortie = **105,17** puis **0,44**.
        /// ⇒ Le débord n'est pas mal MESURÉ : il est bien mesuré, puis multiplié par une échelle qui
        ///   n'existe pas encore. Une échelle de 0,011 sur un objet visible est absurde — le bandeau
        ///   est lu pendant que son nœud d'échelle n'est pas appliqué.
        /// ⇒ ET CE SONT LES PUBLICATIONS SUIVANTES QUI GOUVERNENT ce que le locataire lit : l'inset
        ///   publié perd donc tout son débord après le premier montage, sur TOUS les écrans.
        ///
        /// ⛔ POURQUOI LA GARDE D'À CÔTÉ NE POUVAIT PAS L'ATTRAPER, alors qu'elle porte le bon
        /// plancher (`> 4f`) : elle lit la propriété **une seule fois**, au premier montage, là où
        /// elle vaut 105. *Une garde qui échantillonne une fois ne voit pas une grandeur qui se
        /// dégrade à la deuxième.* Ce n'est pas un seuil à durcir, c'est un échantillon à ajouter.
        ///
        /// ⚠️ ET CE N'EST PAS UNE INVARIANCE SUR LA SORTIE, délibérément. Une garde « la seconde
        /// publication doit égaler la première » serait satisfaite en **gelant une échelle fausse** :
        /// les deux côtés d'un rapport faux, figés ensemble, ne rougissent jamais. C'est pourquoi le
        /// plancher `> 4f` est réasserté APRÈS la republication — il porte sur la VALEUR, que seule
        /// une échelle réelle peut produire, et pas sur l'égalité de deux lectures.
        /// ★ *Une invariance posée sans savoir ce qui la casse se satisfait en gelant la mauvaise
        ///   moitié* — et je l'aurais écrite ainsi si la mesure n'était pas venue avant.</summary>
        /// ⛔⛔⛔ CONTRÔLE POSITIF EXÉCUTÉ LE 2026-09-07 01:40 — **ELLE NE ROUGIT PAS, DONC ELLE
        /// N'EST PAS ENCORE UNE GARDE.** Sortie : `débord AVANT republication 105,1738 · APRÈS
        /// 105,1738 (rapport 1,000)` ; suite `Charpente` **40/40**.
        /// ⇒ Le défaut existe pourtant : le MÊME journal, dans un run `CaptureReputation` lancé cinq
        ///   minutes plus tard, rend `lossyScale 1,633 → 0,011` et la sortie `105,17 → 0,44`.
        /// ⇒ **C'est donc le DÉCLENCHEUR qui est faux, pas la propriété.** `RebatirChromePourResolution
        ///   Courante()` ne reproduit pas l'effondrement : il rebâtit le chrome **sans que `Screen`
        ///   change**, alors que la capture BASCULE la résolution après le montage — et c'est la
        ///   bascule qui laisse lire un `lossyScale` non appliqué.
        /// ★ *La question n'était pas « la propriété est-elle la bonne » mais « le scénario est-il
        ///   DIMENSIONNÉ pour produire ce que je mesure ».* Je l'avais posée pour le halo et pas pour
        ///   ma propre garde — le dispositif de sécurité neuf est le texte le moins relu du lot.
        /// ⇒ `[Ignore]` PLUTÔT QUE SUPPRIMÉE : verte, elle CERTIFIERAIT l'absence d'un défaut mesuré
        ///   ailleurs — pire que rien. Ignorée, elle reste visible avec sa cause et son correctif.
        /// ⇒ CE QU'IL LUI FAUT : un déclencheur qui change réellement la résolution (le chemin de
        ///   `MesurerEtCapturer`), donc une garde de catégorie CAPTURE et non `Charpente`.
        [UnityTest]
        [Ignore("Contrôle positif ÉCHOUÉ : ne rougit pas sur le défaut mesuré (105,17 → 105,17 ici, " +
                "105,17 → 0,44 dans un run de capture). Le déclencheur — rebâtir le chrome sans " +
                "changer Screen — ne reproduit pas l'effondrement. À réarmer avec une bascule de " +
                "résolution ; verte, elle certifierait le défaut. TD-659.")]
        public IEnumerator BLOQUANT_EffectiveBottomOverhangPx_SurvitAUneRepublication()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage ({sceneDeDemarrage.path})");
            Assert.IsNotNull(shell.TopBar, "le shell doit porter un TopBarController");

            float avant = shell.TopBar.EffectiveBottomOverhangPx;
            Assert.Greater(avant, 4f,
                "ANTI-VACUITÉ, et c'est la PRÉCONDITION du test : le médaillon doit réellement " +
                "déborder au premier montage, sinon la republication n'a rien à dégrader et ce test " +
                "serait vert à vide.");

            // La republication, c'est-à-dire le geste qui a produit l'effondrement : le chrome se
            // rebâtit et republie ses insets à sa toute fin.
            shell.RebatirChromePourResolutionCourante();
            yield return null;

            float apres = shell.TopBar.EffectiveBottomOverhangPx;

            // INCONDITIONNEL — un dispositif doit imprimer qu'il se soit activé ou non.
            Debug.Log($"[Charpente] débord AVANT republication {avant:F4} · APRÈS {apres:F4} " +
                      $"(rapport {(avant > 0.0001f ? apres / avant : 0f):F3})");

            Assert.Greater(apres, 4f,
                $"LE DÉBORD S'EST EFFONDRÉ À LA REPUBLICATION : {avant:F4} → {apres:F4}. La " +
                "géométrie ne bouge pas (mesuré : `debordLocal` constant à 32,21 sur cinq passes) ; " +
                "c'est `lossyScale` qui est lu avant que le nœud d'échelle du bandeau ne soit " +
                "appliqué (1,633 → 0,011). Tout locataire monté après le premier lit alors un inset " +
                "amputé de son débord, et pose son contenu sous le chrome.");
        }

        [UnityTest]
        public IEnumerator BLOQUANT_EffectiveBottomOverhangPx_EstEnUnitesDeCanvas_InvariantAuScaleFactor()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            Assert.IsNotNull(shell.ShellCanvas, "le shell doit porter un Canvas pour que ce test ait un sujet");
            Assert.IsNotNull(shell.TopBar, "le shell doit porter un TopBarController");

            float scaleFactorOriginal = shell.ShellCanvas.scaleFactor;

            // ── sf1 : le `scaleFactor` RÉEL de la scène de test ──
            float overhangSf1 = shell.TopBar.EffectiveBottomOverhangPx;
            Assert.Greater(overhangSf1, 4f,
                "anti-vacuité : le médaillon doit réellement déborder sous la barre pour que ce test " +
                "prouve quelque chose (même seuil que NavF4/NavF5).");

            // ── sf2 : un `scaleFactor` DIFFÉRENT — SEULE variable qui change (expérience à UNE
            // variable, socle CLAUDE.md — même patron que le run controlvar/final du round 15). ──
            float scaleFactorAlternatif = scaleFactorOriginal * 2f;
            shell.ShellCanvas.scaleFactor = scaleFactorAlternatif;
            Assert.AreNotEqual(scaleFactorOriginal, shell.ShellCanvas.scaleFactor,
                "PRÉCONDITION : le `scaleFactor` du Canvas doit avoir RÉELLEMENT changé — sinon ce " +
                "test ne prouve rien.");
            float overhangSf2 = shell.TopBar.EffectiveBottomOverhangPx;

            // Restauration AVANT toute assertion qui pourrait lever — le Canvas est partagé par
            // toute la scène de test le temps qu'elle reste chargée.
            shell.ShellCanvas.scaleFactor = scaleFactorOriginal;

            Debug.Log($"[Charpente] BLOQUANT round 16/17 — EffectiveBottomOverhangPx = {overhangSf1:F4} " +
                      $"à scaleFactor={scaleFactorOriginal:F4} ; {overhangSf2:F4} à " +
                      $"scaleFactor={scaleFactorAlternatif:F4} (INCONDITIONNEL — imprimé que le test " +
                      "passe ou non, socle CLAUDE.md « un dispositif conditionnel doit imprimer s'il " +
                      "s'est activé »).");

            Assert.AreEqual(overhangSf1, overhangSf2, 0.05f,
                $"EffectiveBottomOverhangPx doit être INVARIANT à `canvas.scaleFactor` (c'est une " +
                $"unité de CANVAS) — trouvé {overhangSf1:F4} à scaleFactor={scaleFactorOriginal:F4} " +
                $"puis {overhangSf2:F4} à scaleFactor={scaleFactorAlternatif:F4}. Un écart signale que " +
                "la propriété est retombée en unités d'ÉCRAN (revue ⊥ round 16, BLOQUANT 1).");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.2-c — UNE SEULE liste énumère l'ordre du dock dans AppShell.cs (design §3.1/§4).
        //
        // Population : tout endroit d'AppShell.cs qui écrit littéralement, dans cet ORDRE, la
        // séquence Empire → Org → Pipeline → More (peu importe ce qui les sépare — labels, sauts de
        // ligne, espaces). Motif n°1 (voir Tools/charpente-item0-2-3-implementation-notes.md pour le
        // compte AVANT/APRÈS collé) : `Regex` plutôt qu'un `IndexOf` littéral, PARCE QUE la forme
        // AVANT (2 blocs `AddTabButton` + un `Tab[] order`) et la forme APRÈS (une seule déclaration
        // `DockRatifie`) n'ont pas la même syntaxe — seule la PROPRIÉTÉ (les 4 enum, dans cet ordre,
        // à portée l'un de l'autre) est stable entre les deux.
        //
        // Mesuré sur le fichier INTACT (af9893b, avant ce lot, motif réécrit avec Tab.Home au lieu
        // de Tab.Empire pour matcher l'ancien nom) : 3 correspondances, aux anciennes ancres
        // `:717` (BuildTabBar), `:938` (RebatirChromePourResolutionCourante), `:956` (Tab[] order de
        // RefreshTabButtonVisuals) — exactement les 3 sites que ce lot devait unifier.
        // Attendu APRÈS (ce test, exécuté sur le fichier ÉDITÉ) : 1 — la seule déclaration restante,
        // `DockRatifie` ; les trois sites qui en dépendaient la LISENT désormais au lieu de la
        // recopier.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        private static readonly Regex MotifOrdreDuDock = new Regex(
            @"Tab\.Empire\W[\s\S]{0,200}?Tab\.Org\W[\s\S]{0,200}?Tab\.Pipeline\W[\s\S]{0,200}?Tab\.More\b");

        [Test]
        public void F0_2c_UneSeuleListeEnumereLOrdreDuDock_LesTroisSitesLaLisentDesormais()
        {
            string chemin = Path.Combine(Application.dataPath, "Scripts", "Shell", "AppShell.cs");
            Assert.IsTrue(File.Exists(chemin), $"AppShell.cs introuvable à {chemin}");
            string texte = File.ReadAllText(chemin);

            int count = MotifOrdreDuDock.Matches(texte).Count;
            Assert.AreEqual(1, count,
                $"AppShell.cs doit énumérer l'ordre du dock (Empire→Org→Pipeline→More) à UN SEUL " +
                $"endroit (DockRatifie) — trouvé {count} fois. AVANT ce lot (mesuré sur le fichier " +
                "intact, motif réécrit avec l'ancien nom Tab.Home) : 3 (2 blocs AddTabButton + " +
                "Tab[] order) — un compte de 3 signalerait une régression vers les listes parallèles ; " +
                "un compte de 0 signalerait un motif devenu FAUX (DockRatifie renommé ou absent), pas " +
                "un motif satisfait.");
        }
    }
}
