using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Tests;   // ProductionClickSupport — le GESTE, jamais la propriété
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑱ — LES DEUX FALSIFIABLES DU MENU « PLUS », ET ELLES SONT SÉPARÉES EXPRÈS.
    //
    // Le correctif (`AppShell.MonterMenuPlus`, d240ab9) a fermé DEUX causes inverses dans le même
    // geste, et sa docstring le dit : « corriger (1) “remonte” la liste et donne l'illusion que le
    // débordement est réglé ». Un seul test qui les couvrirait toutes les deux hériterait de cette
    // illusion — il rougirait une fois et on ne saurait pas laquelle des deux causes est revenue.
    // ⇒ Deux tests, deux grandeurs, deux messages d'échec qui nomment leur propre cause.
    //
    // ⚠️ ET LE CODE A ÉTÉ COMMITÉ SANS EUX. C'est le trou que ce fichier ferme, et il vaut d'être
    //    écrit : le commit portait un correctif juste, deux mécanismes correctement identifiés, une
    //    docstring qui explique tout — et **aucune garde**. « Une garde qui n'a jamais tourné n'est
    //    pas une garde ; c'est une prose datée avec un [Test] devant » — ici il n'y avait même pas
    //    le [Test]. Rien n'aurait rougi le jour où quelqu'un retire l'appel ou la fenêtre.
    //
    // ⛔ LE REPÈRE, ET LA DISTINCTION QUI A DÉJÀ COÛTÉ UN ROUND SUR CE DÉPÔT (nav-F4). Les deux
    //    mesures vivent dans l'espace LOCAL DU CANVAS, une seule fois, jamais mélangé au monde.
    //    Mais elles n'y construisent pas leurs bornes de la même façon, et c'est délibéré :
    //      · `BornesAvecDescendants` (= `CalculateRelativeRectTransformBounds`) AGRÈGE
    //        récursivement les enfants. C'est ce qu'il faut pour le bandeau — le médaillon du
    //        manomètre PEND sous la barre, et une garde qui ne mesure que le rect nominal laisse
    //        passer un chevauchement de tout le débord (mesuré ailleurs : 56 px nominaux contre
    //        98 occupés).
    //      · `BornesPropres` ne prend QUE le rect de l'objet. C'est ce qu'il faut pour la fenêtre
    //        de défilement — agréger ses descendants y ramènerait le contenu qui DÉBORDE, et la
    //        fenêtre paraîtrait aussi haute que ce qu'elle est justement censée couper. La garde
    //        (2) mesurerait alors « le contenu tient dans le contenu », vraie pour toujours.
    [Category("Joignabilite")]
    [Category("MenuPlus")]
    public class MenuPlusGeometriePlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;
        private float topSauve, basSauve;

        [SetUp]
        public void Avant()
        {
            LogAssert.ignoreFailingMessages = true;
            // Les insets sont un état STATIQUE, donc partagé par tous les tests du domaine. Ce test
            // en pose un faux exprès (voir plus bas) : on garde la valeur d'entrée pour la rendre,
            // sinon on empoisonne un voisin sans rapport — le dépôt a déjà payé un contrôle positif
            // qui laissait fuiter son état vers l'extérieur.
            topSauve = ShellChrome.TopInsetPx;
            basSauve = ShellChrome.BottomInsetPx;
        }

        [TearDown]
        public void Apres()
        {
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            ShellChrome.PublierInsets(topSauve, basSauve);
            LogAssert.ignoreFailingMessages = false;
        }

        private static IEnumerator AttendreEmpire(AppShell s)
        {
            float t = 0f;
            while (s.CurrentTab != AppShell.Tab.Empire && t < 15f) { t += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, s.CurrentTab, "le shell n'a pas fini son acquisition de session");
        }

        /// <summary>Attend que l'inertie du défilement soit retombée. `ScrollRect` continue de
        /// déplacer son contenu en `LateUpdate` APRÈS `OnEndDrag` (`inertia` est vrai par défaut) :
        /// mesurer à la frame suivante lirait une position encore en mouvement — une valeur
        /// plausible, jamais la position d'arrêt que le joueur voit.</summary>
        private static IEnumerator AttendreArret(ScrollRect defilement)
        {
            Vector2 precedente = defilement.content.anchoredPosition;
            for (int i = 0; i < 120; i++)
            {
                yield return null;
                Vector2 courante = defilement.content.anchoredPosition;
                if ((courante - precedente).sqrMagnitude < 0.0001f) { Canvas.ForceUpdateCanvases(); yield break; }
                precedente = courante;
            }
            Canvas.ForceUpdateCanvases();
            Assert.Fail("le défilement ne s'arrête pas : 120 frames après le glissé, le contenu bouge encore");
        }

        /// <summary>Bornes du rect PROPRE de `rt`, exprimées dans l'espace local de `reference`.
        /// Ne descend PAS dans les enfants — voir l'en-tête de classe.</summary>
        private static Bounds BornesPropres(Transform reference, RectTransform rt)
        {
            var coins = new Vector3[4];
            rt.GetWorldCorners(coins);
            var b = new Bounds(reference.InverseTransformPoint(coins[0]), Vector3.zero);
            for (int i = 1; i < 4; i++) b.Encapsulate(reference.InverseTransformPoint(coins[i]));
            return b;
        }

        /// <summary>Bornes de `rt` ET DE TOUS SES DESCENDANTS, dans l'espace local de `reference`.</summary>
        private static Bounds BornesAvecDescendants(Transform reference, RectTransform rt)
            => RectTransformUtility.CalculateRelativeRectTransformBounds(reference, rt);

        private (Transform menu, Transform contenu, List<RectTransform> entrees) LireLeMenu()
        {
            Transform menu = shell.ContentSlot.Find("MenuPlus");
            Assert.IsNotNull(menu, "le menu « Plus » ne s'est pas construit — aucune des deux propriétés " +
                                   "ci-dessous n'est mesurable, et un vert ici serait un vert de non-exécution");
            Transform contenu = menu.Find("MenuPlus_Contenu");
            Assert.IsNotNull(contenu, "la pile d'entrées n'est plus dans une fenêtre : `MenuPlus_Contenu` a " +
                                      "disparu, donc la fenêtre de défilement du correctif (2) aussi");
            var entrees = new List<RectTransform>();
            for (int i = 0; i < contenu.childCount; i++) entrees.Add((RectTransform)contenu.GetChild(i));
            return (menu, contenu, entrees);
        }

        // ── (1) L'INSET ────────────────────────────────────────────────────────────────────────
        //
        // LA GRANDEUR : la distance verticale entre le bas EFFECTIF du chrome et le haut de la
        // première entrée. Pas « `PublierInsetsDuChrome` est-il appelé » — ça, c'est une garde sur
        // le PARAMÈTRE d'un effet, et ce dépôt en a livré une qui certifiait son défaut.
        //
        // LE SCÉNARIO EST DIMENSIONNÉ, ET IL EST CELUI QUE LA DOCSTRING NOMME. Le défaut ne peut
        // pas s'observer sur un shell qui vient de monter l'Empire : cet écran a publié des insets
        // JUSTES, et le menu les relit — la même valeur, juste pour la mauvaise raison. Le monde où
        // il mord est celui où l'inset publié est PÉRIMÉ, dont la docstring donne le cas extrême :
        // « ou **0** si “Plus” est la première destination ». On le construit donc littéralement,
        // en reposant l'inset à zéro juste avant d'ouvrir le menu.
        //   ⇒ Sans le correctif, le menu s'étire alors sur tout `ContentSlot` (qui couvre le canvas
        //     ENTIER par conception, pour qu'un fond plein écran passe sous les barres) et sa
        //     première bande démarre derrière le bandeau.
        //
        // LE MONDE DÉGÉNÉRÉ À TUER : un chrome de hauteur nulle. Alors « la première entrée est
        // sous le bandeau » devient vraie sans que rien ne soit réservé, et la garde est verte pour
        // n'avoir rien mesuré. D'où le plancher : l'amplitude du défaut — ce que le menu
        // GAGNERAIT à ignorer l'inset — doit être franchement positive.
        [UnityTest]
        public IEnumerator MenuPlus_PremiereEntree_SousLeChromeEffectif_MemeSurUnInsetPerime()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreEmpire(shell);

            ShellChrome.PublierInsets(0f, 0f);   // le monde nommé par la docstring, construit et non supposé
            shell.ActivateTab(AppShell.Tab.More);
            yield return null;
            Canvas.ForceUpdateCanvases();

            var (menu, _, entrees) = LireLeMenu();
            Assert.Greater(entrees.Count, 0, "le menu n'a aucune entrée : rien à situer sous le bandeau");

            Transform racine = shell.ShellCanvas.transform;
            Bounds chrome = BornesAvecDescendants(racine, shell.TopBarSlot);   // médaillon inclus
            Bounds fenetre = BornesPropres(racine, (RectTransform)menu);
            Bounds premiere = BornesAvecDescendants(racine, entrees[0]);       // l'encre, libellé compris
            Bounds slot = BornesPropres(racine, shell.ContentSlot);

            // Dimensionnement : de combien le menu remonterait-il s'il ignorait l'inset ? C'est
            // exactement l'amplitude du défaut, et c'est la seule chose qui rende ce test capable
            // de distinguer les deux mondes.
            float amplitude = slot.max.y - chrome.min.y;
            float debord = shell.TopBar != null ? shell.TopBar.EffectiveBottomOverhangPx : 0f;
            Debug.Log($"[⑱-1] chrome bas={chrome.min.y:F1} (débord médaillon {debord:F1}) · " +
                      $"ContentSlot haut={slot.max.y:F1} · fenêtre haut={fenetre.max.y:F1} · " +
                      $"1ʳᵉ entrée haut={premiere.max.y:F1} · amplitude du défaut={amplitude:F1} · " +
                      $"TopInsetPx republié={ShellChrome.TopInsetPx:F1}");

            Assert.Greater(amplitude, 20f,
                $"anti-dégénérescence : le chrome ne mange que {amplitude:F1} unité(s) sous le haut de " +
                "`ContentSlot`. En dessous de ce plancher, « la première entrée passe sous le bandeau » " +
                "est vraie qu'on publie l'inset ou non — la garde serait verte pour n'avoir rien mesuré. " +
                "Un bandeau ramené à ~0 (ou un médaillon recentré) rend ce test aveugle : le réparer, " +
                "pas relâcher ce plancher.");

            Assert.LessOrEqual(premiere.max.y, chrome.min.y + 0.5f,
                $"la première entrée du menu monte à {premiere.max.y:F1} alors que le chrome descend " +
                $"jusqu'à {chrome.min.y:F1} — elle passe DERRIÈRE le bandeau sur {premiere.max.y - chrome.min.y:F1} " +
                "unité(s).\nCause (1) de ⑱ : `Tab.More` est la seule branche d'`ActivateTab` qui ne " +
                "construit pas de locataire, donc la seule qui ne passe pas par `ConstruireLocataire` — " +
                "si `MonterMenuPlus` ne republie pas les insets AVANT de poser ses offsets, il lit ce " +
                "qu'un montage précédent a laissé (ici : zéro, posé exprès par ce test).");
        }

        // ── (2) LE DÉBORDEMENT ─────────────────────────────────────────────────────────────────
        //
        // LA GRANDEUR : est-ce qu'un DOIGT peut amener chaque entrée entièrement dans la fenêtre ?
        // Pas « un `ScrollRect` existe-t-il » — trois précédents de ce dépôt disent qu'une garde de
        // forme reste verte pendant que l'effet ne produit rien. On déplace donc réellement le
        // défilement à ses deux extrémités et on relit les rects.
        //
        // CE DÉFAUT SURVIT AU CORRECTIF (1), et c'est pour ça qu'il a son propre test : remonter la
        // liste sous le bandeau ne fait pas rentrer dix-neuf bandes dans seize places.
        //
        // LE MONDE DÉGÉNÉRÉ À TUER : une liste qui TIENT. Si le contenu ne déborde pas, « la
        // dernière entrée est visible » est vraie sans fenêtre, sans masque et sans défilement —
        // et le jour où une vingtième destination arrive, plus rien ne rougit. D'où le plancher sur
        // le débordement lui-même, avec ses deux nombres dans le message.
        [UnityTest]
        public IEnumerator MenuPlus_ToutesLesEntreesAtteignables_QuandLaListeDeborde()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreEmpire(shell);

            shell.ActivateTab(AppShell.Tab.More);
            yield return null;
            Canvas.ForceUpdateCanvases();

            var (menu, contenu, entrees) = LireLeMenu();
            Assert.AreEqual(shell.MenuPlusEntrees, entrees.Count,
                $"{shell.MenuPlusEntrees} entrées comptées par le shell, {entrees.Count} enfants dans la " +
                "pile : l'un des deux ment, aucune conclusion n'est possible");

            var fenetreRt = (RectTransform)menu;
            var contenuRt = (RectTransform)contenu;
            Transform racine = shell.ShellCanvas.transform;

            float hFenetre = fenetreRt.rect.height;
            float hContenu = contenuRt.rect.height;
            Debug.Log($"[⑱-2] {entrees.Count} entrées · contenu {hContenu:F1} · fenêtre {hFenetre:F1} · " +
                      $"débordement {hContenu - hFenetre:F1}");

            Assert.Greater(hContenu, hFenetre + 1f,
                $"anti-dégénérescence : la pile ({hContenu:F1}) TIENT dans la fenêtre ({hFenetre:F1}). " +
                "Ce test ne prouve alors rien — couper et faire défiler sont indifférents quand tout " +
                "est déjà visible, et il resterait vert le jour où une destination de plus fait " +
                "déborder. Si la résolution du harnais devient assez haute pour que la liste tienne, " +
                "c'est le HARNAIS qu'il faut contraindre, pas cette assertion.");

            ScrollRect defilement = menu.GetComponent<ScrollRect>();
            Assert.IsNotNull(defilement, "la fenêtre ne défile pas : ce qui dépasse est COUPÉ et ses " +
                                         "destinations deviennent injoignables — le contraire du but de ce menu");

            // Aucune entrée ne peut être entièrement visible si elle est plus haute que la fenêtre :
            // la condition complète de joignabilité, pas seulement les deux extrémités.
            var trop = entrees.Where(e => BornesAvecDescendants(racine, e).size.y > hFenetre).ToList();
            Assert.IsEmpty(trop.Select(e => e.name).ToList(),
                $"des bandes sont plus hautes ({hFenetre:F1}) que la fenêtre elle-même : aucune position " +
                "de défilement ne peut les montrer en entier");

            // Extrémité HAUTE — la première entrée est joignable SANS défiler : la liste s'ouvre
            // dessus. On ne repositionne rien ici, justement : c'est l'état d'arrivée du joueur.
            Bounds fHaut = BornesPropres(racine, fenetreRt);
            Bounds premiere = BornesAvecDescendants(racine, entrees[0]);
            Assert.IsTrue(premiere.min.y >= fHaut.min.y - 0.5f && premiere.max.y <= fHaut.max.y + 0.5f,
                $"défilement en haut : la première entrée [{premiere.min.y:F1};{premiere.max.y:F1}] sort de " +
                $"la fenêtre [{fHaut.min.y:F1};{fHaut.max.y:F1}]");

            // Extrémité BASSE — la DERNIÈRE entrée, celle que le juge a mesurée à 45 % de sa hauteur.
            // ⛔ PAR LE GESTE, PAS PAR LA PROPRIÉTÉ. Écrire `verticalNormalizedPosition` produirait le
            //    déplacement en contournant `OnBeginDrag`/`OnDrag` — donc `IsActive()` et l'axe
            //    vertical éteint. Une liste rendue INDÉFILABLE AU DOIGT laisserait ce test vert,
            //    exactement comme `onClick.Invoke()` laissait vert un dock non interactif.
            //    Le glissé demandé dépasse largement la course : `MovementType.Clamped` s'arrête au
            //    bout, et c'est le bout qu'on veut mesurer.
            Vector2 deplace = ProductionClickSupport.Glisser(defilement, new Vector2(0f, 4000f));
            yield return AttendreArret(defilement);
            Assert.Greater(deplace.magnitude, 1f,
                $"le glissé de production n'a déplacé le contenu que de {deplace.magnitude:F2} unité(s) : " +
                "le doigt passe et rien ne bouge. Une fenêtre qui coupe sans défiler rend ses dernières " +
                "destinations INJOIGNABLES — le contraire du but de ce menu.");
            Bounds fBas = BornesPropres(racine, fenetreRt);
            RectTransform derniereRt = entrees[entrees.Count - 1];
            Bounds derniere = BornesAvecDescendants(racine, derniereRt);
            Debug.Log($"[⑱-2] en bas de course (glissé {deplace.y:F1}) : fenêtre [{fBas.min.y:F1};{fBas.max.y:F1}] · " +
                      $"{derniereRt.name} [{derniere.min.y:F1};{derniere.max.y:F1}]");
            Assert.IsTrue(derniere.min.y >= fBas.min.y - 0.5f && derniere.max.y <= fBas.max.y + 0.5f,
                $"la dernière entrée ({derniereRt.name}) reste hors de la fenêtre même en bout de course : " +
                $"elle occupe [{derniere.min.y:F1};{derniere.max.y:F1}] pour une fenêtre " +
                $"[{fBas.min.y:F1};{fBas.max.y:F1}].\nCause (2) de ⑱ : sans `RectMask2D` + `ScrollRect` " +
                "+ `ContentSizeFitter`, la pile sort par le bas SOUS le dock opaque et ses dernières " +
                "destinations sont visibles à moitié, ou pas du tout — et injoignables dans les deux cas.");
        }
    }
}
