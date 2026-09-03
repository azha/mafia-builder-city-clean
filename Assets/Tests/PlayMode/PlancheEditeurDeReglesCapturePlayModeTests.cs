using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Operational.Lieutenant;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑧ `screen_4a` L'ÉDITEUR DE RÈGLES — une SECTION de ⑦, pas un écran à part.
    //
    // ⛔ POURQUOI UNE CAPTURE DÉDIÉE. ⑦ et ⑧ sont deux entrées du canon et UN seul contrôleur :
    // `LieutenantScreenController` empile Statut (T2), Roster (B2) et Éditeur de règles (T3) dans
    // la même feuille. La capture existante de ⑦ (`Capture_EcranLieutenants_SousChromeV31`) montre
    // le haut de cette pile — ⑧ est SOUS LA LIGNE DE FLOTTAISON, et une image ne peut pas prouver
    // ce qu'elle ne cadre pas. Sans cette capture, ⑧ est « couvert » par une image où il n'est pas.
    //
    // ⚠️ CE QUE CETTE SUITE MESURE AVANT D'AFFIRMER. Je ne sais pas, en lisant, si
    // `BuilderSection` vit DANS la vue défilante (`Defilement`/`Contenu`) ou à côté d'elle : les
    // deux sont créés sous la même feuille (`card.transform`), et le code ne le dit pas d'un coup
    // d'œil. Le test l'IMPRIME (chaîne de parenté, rects) au lieu que je le devine, et son
    // assertion porte sur la propriété qui compte dans les deux cas : **la section est-elle
    // effectivement dans le cadre au moment du rendu ?**
    //
    // ⛔ Catégorie hors du filtre de `MafiaCI`, comme toutes les `Photo*` : cette suite écrit un
    // PNG à chaque exécution, et les faire tourner sous le juge salit l'arbre à chaque run.
    [Category("PhotoEditeurRegles")]
    public class PlancheEditeurDeReglesCapturePlayModeTests
    {
        private Scene scene;

        private IEnumerator ChargerLaSceneDeDemarrageDuBuild()
        {
            LogAssert.ignoreFailingMessages = true;
            Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1, "Build Settings vides");
            string chemin = SceneUtility.GetScenePathByBuildIndex(0);
            AsyncOperation op = SceneManager.LoadSceneAsync(chemin, LoadSceneMode.Single);
            while (op != null && !op.isDone) yield return null;
            yield return null;
            scene = SceneManager.GetActiveScene();
        }

        private static AppShell SondeShell(Scene s)
        {
            if (!s.IsValid() || !s.isLoaded) return null;
            foreach (GameObject r in s.GetRootGameObjects())
            {
                AppShell t = r.GetComponentInChildren<AppShell>(true);
                if (t != null) return t;
            }
            return null;
        }

        /// <summary>Le même monde vide qu'ailleurs : cette suite charge la scène de démarrage, donc
        /// un `AppShell` complet qui vit. Le laisser derrière soi casse la voisine qui crée puis
        /// détruit son propre shell dans la scène active — mesuré le 2026-09-03.</summary>
        [UnityTearDown]
        public IEnumerator RendreLeMondeVide()
        {
            Scene active = SceneManager.GetActiveScene();
            if (active.IsValid() && active.isLoaded)
                foreach (GameObject r in active.GetRootGameObjects())
                    if (r != null) Object.DestroyImmediate(r);
            yield return null;
        }

        private static RectTransform TrouverParNom(Transform racine, string nom)
        {
            foreach (RectTransform rt in racine.GetComponentsInChildren<RectTransform>(true))
                if (rt.name == nom) return rt;
            return null;
        }

        private static int TextesNonVides(Transform t)
        {
            int n = 0;
            foreach (var x in t.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                if (!string.IsNullOrWhiteSpace(x.text)) n++;
            return n;
        }

        /// <summary>Le rect d'un RectTransform en coordonnées d'écran du canvas — la seule forme
        /// comparable entre deux objets d'une même hiérarchie qui n'ont ni le même parent ni la
        /// même échelle.</summary>
        private static Rect RectMonde(RectTransform rt)
        {
            Vector3[] c = new Vector3[4];
            rt.GetWorldCorners(c);
            return new Rect(c[0].x, c[0].y, c[2].x - c[0].x, c[2].y - c[0].y);
        }

        [UnityTest]
        public IEnumerator Capture_EditeurDeRegles_1080x2400()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShell(scene);
            Assert.IsNotNull(shell, "aucun AppShell dans la scène de démarrage");

            var echecs = new List<string>();
            yield return CaptureSousShell.AttendreUnShellCalme(shell, echecs);
            Assert.IsEmpty(echecs, "shell non capturable :\n  · " + string.Join("\n  · ", echecs));

            RectTransform section = null, feuille = null;
            // ⛔⛔ MESURÉ À LA GÉOMÉTRIE DE CAPTURE, PAS APRÈS. Ma première version relevait le
            // recouvrement APRÈS le retour du helper — donc après que le canvas soit revenu à la
            // vue de jeu de l'éditeur (640×480), où cet écran rend `727 × -1` et la section sa
            // taille par défaut. Elle a rendu « visible 0 % » sur une capture qui, à 1080×2400,
            // valait `1248 × 2275` de feuille et `1248 × 3076` de contenu.
            // ★ C'est le défaut de ce matin, reproduit à l'autre bout : *juger l'écran dans une
            //   géométrie que l'image n'a pas.* On relève donc DANS `avantRendu`, au moment exact
            //   où l'image est prise, et on asserte après.
            float partVisible = -1f; int textesSection = -1;
            float hauteurSection = -1f, hauteurCadre = -1f;
            string geometrie = "(non relevée)";

            yield return CaptureSousShell.CapturerLocataire<LieutenantScreenController>(
                shell, "l_editeur_de_regles",
                // Chargé = la feuille porte du texte. Ce contrôleur n'expose pas de drapeau de
                // rendu ; on ne prétend donc pas mesurer plus que ce qu'on peut voir, et on le dit.
                (e, racine) => CaptureSousShell.PorteDuTexte(racine),
                echecs,
                monter: true,
                nomFeuille: "LieutenantSheet",
                avantRendu: e =>
                {
                    feuille = TrouverParNom(e.transform.parent, "LieutenantSheet");
                    section = feuille != null ? TrouverParNom(feuille, "BuilderSection") : null;
                    if (section == null) return;

                    // MESURE, PAS DÉDUCTION : d'où pend cette section, et est-elle dans une vue
                    // défilante ? Le code crée `BuilderSection` et `Defilement` sous la MÊME
                    // feuille, ce qui ne dit pas lequel contient l'autre.
                    var chaine = new System.Text.StringBuilder();
                    for (Transform t = section; t != null && t != feuille.parent; t = t.parent)
                        chaine.Append($" ← {t.name}");
                    ScrollRect defilement = section.GetComponentInParent<ScrollRect>();
                    Debug.Log($"[REGLES] BuilderSection{chaine} · dans un ScrollRect : "
                              + (defilement == null ? "NON" : "OUI (" + defilement.name + ")"));

                    // ⛔ LA MISE EN PAGE EST DÉGÉNÉRÉE AU MOMENT DE LA CAPTURE — mesuré au 1er run :
                    // `LieutenantSheet` rendait **727 × -1** et `BuilderSection` **50 × 50**, sa
                    // taille par défaut. Le contenu existe (81 textes dans la feuille, 30 dans la
                    // section) : ce n'est pas un écran vide, c'est un écran non MESURÉ.
                    // ⇒ On imprime les composants qui décident de cette hauteur avant de tenter
                    //   quoi que ce soit — un `ContentSizeFitter` ou une `VerticalLayoutGroup` qui
                    //   n'a pas été reconstruite explique un rect faux sans la moindre erreur.
                    var f2 = feuille; var c2 = defilement != null ? defilement.content : null;
                    Debug.Log($"[REGLES] feuille {f2.rect.width:F0}x{f2.rect.height:F0} "
                              + $"fitter={(f2.GetComponent<ContentSizeFitter>() == null ? "aucun" : "présent")} "
                              + $"vlg={(f2.GetComponent<VerticalLayoutGroup>() == null ? "aucune" : "présente")} "
                              + $"· contenu {(c2 == null ? "N/A" : $"{c2.rect.width:F0}x{c2.rect.height:F0}")} "
                              + $"fitter={(c2 != null && c2.GetComponent<ContentSizeFitter>() != null ? "présent" : "aucun")}");

                    // Reconstruire DE BAS EN HAUT avant de défiler : une `VerticalLayoutGroup`
                    // imbriquée ne recalcule pas ses parents, et défiler dans une géométrie fausse
                    // positionne dans le vide.
                    if (c2 != null) LayoutRebuilder.ForceRebuildLayoutImmediate(c2);
                    LayoutRebuilder.ForceRebuildLayoutImmediate(f2);
                    Canvas.ForceUpdateCanvases();
                    Debug.Log($"[REGLES] après reconstruction : feuille {f2.rect.width:F0}x{f2.rect.height:F0} "
                              + $"· section {section.rect.width:F0}x{section.rect.height:F0}");

                    if (defilement != null && defilement.content != null)
                    {
                        defilement.verticalNormalizedPosition = 0f;   // l'éditeur est la dernière section
                        Canvas.ForceUpdateCanvases();
                        LayoutRebuilder.ForceRebuildLayoutImmediate(defilement.content);
                        Canvas.ForceUpdateCanvases();
                    }

                    // Le relevé qui décide, pris ICI : la fenêtre du défilement est le cadre réel,
                    // pas la feuille — c'est elle qui découpe ce que l'image montre.
                    RectTransform cadre = defilement != null && defilement.viewport != null
                        ? defilement.viewport : f2;
                    Rect rs = RectMonde(section), rc = RectMonde(cadre);
                    float rec = Mathf.Max(0f, Mathf.Min(rs.yMax, rc.yMax) - Mathf.Max(rs.yMin, rc.yMin));
                    partVisible = rs.height > 0f ? rec / rs.height : 0f;
                    hauteurSection = rs.height; hauteurCadre = rc.height;
                    textesSection = TextesNonVides(section);
                    geometrie = $"section {rs.width:F0}x{rs.height:F0} @y[{rs.yMin:F0},{rs.yMax:F0}] · "
                                + $"cadre {cadre.name} @y[{rc.yMin:F0},{rc.yMax:F0}]";
                    Debug.Log($"[REGLES] À LA CAPTURE — {geometrie} · visible {partVisible * 100f:F0} % "
                              + $"· textes={textesSection}");

                    if (defilement != null && defilement.content != null)
                    {
                        // Amener la section dans la fenêtre. On vise le BAS : les trois sections
                        // sont empilées et l'éditeur est la dernière — mais on VÉRIFIE le résultat
                        // plus bas plutôt que de le supposer.
                        defilement.verticalNormalizedPosition = 0f;
                        Canvas.ForceUpdateCanvases();
                        LayoutRebuilder.ForceRebuildLayoutImmediate(defilement.content);
                    }
                });

            Assert.IsEmpty(echecs, "capture en défaut :\n  · " + string.Join("\n  · ", echecs));
            Assert.IsNotNull(feuille, "LieutenantSheet introuvable — l'écran n'a pas bâti sa feuille");
            Assert.IsNotNull(section,
                "`BuilderSection` introuvable sous `LieutenantSheet` : ⑧ n'est pas construit, ou "
                + "il a changé de nom. Dans les deux cas la capture de ⑦ ne le couvre pas.");

            // ⛔ LA GARDE QUI COMPTE : la section était-elle DANS LE CADRE au moment du rendu ?
            // Une capture qui ne la contient pas serait exactement le défaut qu'on répare — une
            // image où ⑧ n'est pas, présentée comme la preuve de ⑧.
            Assert.GreaterOrEqual(partVisible, 0f,
                "le relevé n'a pas eu lieu : `avantRendu` n'a pas été appelé, ou la section était "
                + "introuvable — dans les deux cas rien n'est prouvé sur l'image");
            // ⛔⛔ LE PLANCHER DE TAILLE VIENT AVANT LE RATIO — et sans lui cette suite a rendu VERT
            // sur `section 0x0 @y[1,2] … visible 100 %`. Un rectangle de hauteur nulle est
            // « entièrement dans le cadre » par arithmétique : *quelle est la version la plus
            // dégénérée du monde qui rend cette assertion vraie ?* — celle-là, et je l'ai livrée.
            // ⇒ Le ratio ne veut rien dire tant que le dénominateur n'est pas réel. Le plancher est
            //   exprimé dans la MÊME unité que le cadre (coordonnées monde), donc comparable :
            //   un quart de la hauteur du cadre au minimum pour une section qui porte 30 textes.
            Assert.Greater(hauteurSection, 0f,
                $"la section mesure {hauteurSection:F3} de haut au moment du rendu : le ratio de "
                + "recouvrement serait satisfait par construction, pas par l'image");
            Assert.Greater(hauteurSection, hauteurCadre * 0.25f,
                $"la section fait {hauteurSection:F3} pour un cadre de {hauteurCadre:F3} — elle "
                + "n'a pas été mise en page (taille par défaut), et le recouvrement ne prouve rien");
            Assert.Greater(partVisible, 0.5f,
                $"seulement {partVisible * 100f:F0} % de l'éditeur de règles était dans le cadre au "
                + $"moment du rendu ({geometrie}) : la capture ne le montre pas.");
            // ⚠️ Et l'encre : une section cadrée mais vide donnerait une image « correcte » et
            // muette. Le plancher est mesuré (libellé de section + badge de palier existent même
            // sans règle écrite), pas un `> 0`.
            Assert.GreaterOrEqual(textesSection, 2,
                $"l'éditeur de règles est cadré mais ne porte que {textesSection} texte(s) : "
                + "l'image serait vide");
        }
    }
}
