using System.Collections;
using System.IO;
using System.Linq;
using MafiaCleanCity.Operational.Lieutenant;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Lieutenant.Tests
{
    /// <summary>Les glyphes DESSINÉS d'archétype — deuxième famille sortie de la forme A.
    ///
    /// ⛔⛔ CE LOT REMPLACE UN GLYPHE, IL N'EN AJOUTE PAS. La ligne de roster en portait déjà un, en
    /// TEXTE, posé pour l'a11y (la FORME porte le sens à côté de la couleur). Une substitution est
    /// une régression déguisée en montage si elle perd la propriété de ce qu'elle remplace — d'où
    /// les deux moitiés du contrôle ci-dessous, et surtout la seconde : *le cas NON couvert garde
    /// son glyphe texte*, sinon 4 archétypes sur 10 perdraient la propriété que le dessin apporte
    /// aux 6 autres.</summary>
    [Category("IconesArchetype")]
    public class IconesArchetypePlayModeTests
    {
        private const string DossierIcones = "Art/Icons/Resources/ArchetypeIcons";
        private const string SuffixeLivre = "_48";

        /// <summary>La cible du contrôle NÉGATIF, et elle est INERTE PAR CONSTRUCTION.
        /// ⛔ Mesuré une heure plus tôt sur la famille des bâtiments : un contrôle négatif visant un
        /// type RÉELLEMENT non couvert s'est aveuglé en une heure, quand l'atelier a comblé le trou.
        /// *Viser un manque, c'est écrire une garde dont la durée de vie est celle du défaut qu'elle
        /// décrit* — et un manque, quelqu'un ne peut pas seulement le corriger : il VA le combler.
        /// Une valeur hors domaine, elle, ne recevra jamais de dessin, et le chemin qu'elle emprunte
        /// est exactement celui d'un archétype ajouté demain côté back.</summary>
        private const string ArchetypeHorsDomaine = "ARCHETYPE_ABSENT_DU_DOMAINE_CONTROLE_NEGATIF";

        private GameObject hote;

        [TearDown]
        public void TearDown()
        {
            // ⛔ L'ÉCRAN BÂTIT SON UI SOUS UN CANVAS, PAS SOUS SON PROPRE GameObject —
            //    `BuildLayout` prend le premier `Canvas` de la scène ou en crée un. Détruire le
            //    seul hôte laisserait donc tout l'arbre d'interface derrière, et le test suivant
            //    trouverait les lignes du précédent. Même discipline que le diorama de district.
            var c = Object.FindFirstObjectByType<Canvas>();
            if (c != null) Object.Destroy(c.gameObject);
            if (hote != null) Object.Destroy(hote);
        }

        // ── 1. BIJECTION fichier ↔ résolveur, et le dessin porte vraiment de l'encre ─────────────

        [Test]
        public void Archetypes_ChaqueFichierEstATTEIGNABLE_EtChaqueGlypheRESOLU_PorteUnDessin()
        {
            string dir = Path.Combine(Application.dataPath, DossierIcones);
            Assert.IsTrue(Directory.Exists(dir),
                $"⛔ dossier livré absent : {dir}. Sans dossier `Resources`, un PNG sous `Assets/Art/` "
                + "n'entre PAS dans le build — il n'est pas « presque monté », il est absent.");

            string[] fichiers = Directory.GetFiles(dir, "*.png")
                .Select(Path.GetFileNameWithoutExtension).OrderBy(x => x).ToArray();
            // ⛔ Plancher AVANT toute comparaison d'ensembles : sur un dossier vide, « tout fichier
            //    est atteignable » est trivialement VRAI et le resterait pour toujours.
            Assert.Greater(fichiers.Length, 4,
                $"⛔ seulement {fichiers.Length} fichier(s) — la bijection serait vraie à vide.");

            string[] domaine = FamilleLabels.ArchetypesCanoniques;   // LU dans le code, jamais recopié
            string[] resolus = domaine.Where(a => ArchetypeIcons.Pour(a) != null).OrderBy(a => a).ToArray();
            string[] depuisFichiers = fichiers
                .Select(f => f.StartsWith("icon_archetype_") && f.EndsWith(SuffixeLivre)
                    ? f.Substring("icon_archetype_".Length, f.Length - "icon_archetype_".Length - SuffixeLivre.Length).ToUpperInvariant()
                    : "⛔HORS-CONVENTION:" + f)
                .OrderBy(x => x).ToArray();

            Debug.Log($"[IconesArchetype] {fichiers.Length} fichier(s) · {resolus.Length} glyphe(s) résolu(s) "
                      + $"sur {domaine.Length} archétypes du domaine · COUVERTURE {resolus.Length}/{domaine.Length}. "
                      + $"Non couverts : [{string.Join(", ", domaine.Except(resolus))}]");

            var orphelins = depuisFichiers.Except(resolus).ToArray();
            Assert.IsEmpty(orphelins,
                $"⛔ {orphelins.Length} fichier(s) que le résolveur n'atteint PAS : [{string.Join(", ", orphelins)}]. "
                + "Ils pèsent dans le build — tout ce qui est sous un `Resources` y entre sans élagage — "
                + "et ne s'affichent jamais.");
            var fantomes = resolus.Except(depuisFichiers).ToArray();
            Assert.IsEmpty(fantomes,
                $"⛔ {fantomes.Length} glyphe(s) résolu(s) sans fichier : [{string.Join(", ", fantomes)}] — "
                + "l'instrument lit le mauvais dossier.");

            // ⛔ CONTRÔLE NÉGATIF INERTE — voir `ArchetypeHorsDomaine`.
            Assert.IsNull(ArchetypeIcons.Pour(ArchetypeHorsDomaine),
                "⛔ une clé hors domaine ne doit RIEN rendre — surtout pas un repli partagé, qui "
                + "remettrait deux archétypes sous la même image.");
            Assert.IsNull(ArchetypeIcons.Pour(null), "⛔ une clé nulle ne doit rien rendre");

            // ⛔ ET LE DESSIN DOIT EXISTER, pas seulement l'asset. Ce dépôt a livré une police
            //    PRÉSENTE, RÉFÉRENCÉE et incapable de servir un glyphe, et trois silhouettes
            //    tronquées que `alpha_min/alpha_max` déclaraient bonnes. *Un asset peut être
            //    présent, de la bonne taille, aux bonnes couleurs — et ne porter aucun dessin.*
            foreach (string a in resolus)
            {
                Sprite sp = ArchetypeIcons.Pour(a);
                Assert.IsNotNull(sp.texture, $"⛔ « {a} » : sprite sans texture — rien à dessiner");
                Assert.Greater(sp.rect.width, 0f, $"⛔ « {a} » : rect de largeur nulle");
                Assert.Greater(sp.rect.height, 0f, $"⛔ « {a} » : rect de hauteur nulle");
            }

            // ⚠️ LE DÉNOMINATEUR EST ASSERTÉ, pas seulement journalisé — épingle sur une DONNÉE.
            //    Elle rougira le jour où l'atelier dessinera `MUSCLE`, `INTELLIGENCE` ou
            //    `FACILITY_MANAGER` : ajouter un PNG n'est pas un changement de type, et aucun
            //    résolveur exhaustif ne verrait cet événement.
            Assert.AreEqual(6, resolus.Length,
                $"couverture attendue 6/{domaine.Length} au 2026-09-07 — l'atelier a dessiné exactement "
                + "les six archétypes que `FamilleLabels` fait passer par le catalogue i18n. Si ce "
                + "compte a bougé : monter ce nombre ET la couverture annoncée dans `ArchetypeIcons`.");
        }

        // ── 2. La SUBSTITUTION : le dessin prend la place, le non-couvert garde son texte ────────

        [UnityTest]
        public IEnumerator Archetypes_LeDessinRemplaceLeTexte_EtLeNonCouvertGardeSonGlypheTexte()
        {
            hote = new GameObject("LieutenantScreenController_Icones");
            var ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;   // l'écran bâtit son arbre avant qu'on lui donne des données

            ecran.RendreRosterDepuis(new[]
            {
                new RosterRow { lieutenant_id = "lt-couvert", name = "Lt. Couvert", archetype = "COOK",
                    op_state_band = "ACTIVE", rule_count_band = "NONE", tenure_bucket = "FRESH" },
                new RosterRow { lieutenant_id = "lt-nu", name = "Lt. Nu", archetype = ArchetypeHorsDomaine,
                    op_state_band = "ACTIVE", rule_count_band = "NONE", tenure_bucket = "FRESH" },
            });
            // ⛔ AUCUN `yield` ENTRE LE RENDU ET LA MESURE, et c'est le correctif du deuxième run à
            //    zéro. `Start()` lance `Boot()`, qui signe puis charge le roster RÉEL et rappelle
            //    `RenderRoster()` — lequel commence par `ClearRosterRows()`. Une seule frame cédée
            //    après mon rendu suffisait à ce que la réponse réseau arrive et EFFACE mes deux
            //    lignes avant que je les compte. *Le rendu est synchrone ; c'est l'attente qui
            //    détruisait ce que je venais de produire.* Rendre puis mesurer dans la MÊME frame
            //    supprime la fenêtre entière plutôt que de parier sur sa largeur.
            //    ⚠️ Et ce n'est pas « fermer une course côté test » : la course de production
            //    n'existe pas ici — un joueur ne fournit jamais son propre roster. Ce test observe
            //    ce que le RENDU fait d'une donnée, et le chemin réseau reste couvert ailleurs.

            // ⛔ CHERCHER DANS LE BON ARBRE — `BuildLayout` monte l'interface sous un `Canvas`
            //    (trouvé ou créé), jamais sous le GameObject qui porte le contrôleur.
            var canvas = Object.FindFirstObjectByType<Canvas>();
            Assert.IsNotNull(canvas, "⛔ aucun Canvas : l'écran n'a pas bâti son interface");

            var metiers = canvas.GetComponentsInChildren<TextMeshProUGUI>(true)
                .Where(t => t.name == "Metier").ToArray();
            // ⛔ UN COMPTE NU NE DIT PAS CE QU'IL COMPTE — ce message a coûté trois créneaux de
            //    porte. « 0 » était compatible avec un rendu vide, un mauvais arbre de recherche, un
            //    nom de nœud différent ET un constructeur sans appelant. Il énumère donc ce qu'il a
            //    RÉELLEMENT trouvé, pour que le prochain zéro se diagnostique sans relancer.
            var tousTmp = canvas.GetComponentsInChildren<TextMeshProUGUI>(true);
            Assert.AreEqual(2, metiers.Length,
                $"⛔ {metiers.Length} ligne(s) de métier pour 2 lignes de roster — le rendu n'a pas "
                + "produit ce qu'on croit mesurer, et tout ce qui suit serait vide de sens.\n"
                + $"    {tousTmp.Length} TextMeshProUGUI sous le Canvas · noms distincts : "
                + $"[{string.Join(", ", tousTmp.Take(30).Select(t => t.name).Distinct())}]\n"
                + $"    roster vu par l'écran : {ecran.CurrentRoster.Length} ligne(s)");

            Transform ligneCouverte = metiers[0].transform.parent;   // le `puceLigne` du rang
            Transform ligneNue = metiers[1].transform.parent;

            // ── Le couvert : le dessin est là, et il peut DESSINER ──
            Transform dessin = ligneCouverte.Find("GlyphArchetype");
            Assert.IsNotNull(dessin,
                "⛔ « COOK » a un dessin livré et le rang n'en porte aucun. ⚠️ Vérifier d'abord que "
                + "le constructeur édité est bien celui que l'écran APPELLE : `BuildRosterRow` en est "
                + "un autre, et il a zéro appelant.");
            // ⛔ GARDES STRUCTURELLES AVANT LES GARDES DE VALEUR : un `Graphic` sans `CanvasRenderer`
            //    ne dessine RIEN, SANS erreur console ; un `Graphic` nu sous un `Mask` n'est pas
            //    clippable. Les deux défauts sont muets.
            Assert.IsNotNull(dessin.GetComponent<CanvasRenderer>(),
                "⛔ `GlyphArchetype` sans `CanvasRenderer` : un Graphic n'y dessine RIEN et ne lève rien");
            var img = dessin.GetComponent<Image>();
            Assert.IsNotNull(img, "⛔ `GlyphArchetype` sans `Image`");
            Assert.IsInstanceOf<MaskableGraphic>(img, "⛔ le dessin doit être masquable");
            Assert.IsTrue(img.enabled, "⛔ dessin désactivé — présent et invisible");
            Assert.IsNotNull(img.sprite, "⛔ dessin sans sprite — l'asset n'a pas été chargé");
            var le = dessin.GetComponent<LayoutElement>();
            Assert.IsNotNull(le, "⛔ pas de LayoutElement : dans un HorizontalLayoutGroup, le glyphe "
                + "prendrait une largeur non maîtrisée");
            Assert.Greater(le.preferredWidth, 0f, "⛔ largeur nulle — présent et invisible");

            // ── Le non couvert : AUCUN dessin, et le métier RESTE ──
            //    C'est la moitié qui empêche la substitution d'être une régression : sans elle, un
            //    rendu qui poserait un repli partout passerait la première moitié.
            Assert.IsNull(ligneNue.Find("GlyphArchetype"),
                $"⛔ « {ArchetypeHorsDomaine} » n'a aucun dessin — le rang ne doit en porter aucun, "
                + "surtout pas celui d'un voisin.");
            Assert.IsNotEmpty(metiers[1].text,
                "⛔ le libellé de métier doit RESTER quand aucun dessin n'existe : il portait seul "
                + "l'information avant ce lot, et 4 archétypes sur 10 n'ont pas de dessin.");

            Debug.Log($"[IconesArchetype] rang couvert : glyphe {le.preferredWidth:0.0} px devant "
                      + $"« {metiers[0].text} » · rang non couvert : aucun glyphe, « {metiers[1].text} » seul");
            yield return null;
        }
    }
}
