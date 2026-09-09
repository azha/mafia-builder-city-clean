using System.Collections;
using System.IO;
using System.Linq;
using MafiaCleanCity.CityMap;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    /// <summary>Le montage des icônes de bâtiment — la garde qui manquait à TOUT l'art de ce dépôt.
    ///
    /// ⛔⛔ LA CLASSE, PAS L'INSTANCE. Mesuré le 2026-09-07 par oracle indépendant sur les 576 PNG
    /// livrés comme assets de jeu : **524 n'ont AUCUN consommateur** — ni GUID cité dans un asset
    /// sérialisé, ni chemin C# qui les atteigne. De l'art produit, importé, conforme à la palette,
    /// et que personne ne peut voir. Rien ne compile en rouge quand un PNG n'a pas de lecteur :
    /// c'est la forme A (l'écrivain existe, l'appelant manque) appliquée à l'art, et elle est
    /// invisible à toute garde de code.
    ///
    /// ⇒ Ce fichier ferme la famille `icon_building_*`. Le détecteur porte sur la BIJECTION
    /// fichier ↔ résolveur, pas sur « le fichier existe » : un PNG déposé sous un nom que le
    /// résolveur ne calcule pas est exactement aussi mort qu'un PNG absent, et il est PIRE, parce
    /// qu'il a l'air monté.</summary>
    [Category("CarteIcones")]
    public class CarteIconesPlayModeTests
    {
        private const string DossierIcones = "Art/Icons/Resources/BuildingIcons";
        private const string SuffixeLivre = "_48";

        // Les 12 membres de `building_operational_type`, lus en base le 2026-09-07 (pg_enum) et
        // portés par `CarteActionResolver.TypesConnus` — source unique, jamais recopiée ici.
        private static string[] TousLesTypes =>
            MafiaCleanCity.Shell.CarteActionResolver.TypesConnus.OrderBy(t => t).ToArray();

        /// <summary>La cible du contrôle NÉGATIF, et elle est INERTE PAR CONSTRUCTION.
        ///
        /// ⛔⛔ CE CHAMP EXISTE PARCE QUE LA PREMIÈRE VERSION S'EST AVEUGLÉE EN UNE HEURE — et elle
        /// s'est aveuglée AU MOMENT PRÉCIS OÙ LE LOT RÉUSSISSAIT. Le contrôle négatif visait
        /// `specialized_lab`, le seul `operational_type` sans glyphe au moment de l'écrire. L'atelier
        /// a livré ce glyphe dans l'heure : la cellule en a porté un, l'assertion « aucun glyphe ici »
        /// a rougi, et elle accusait **le succès**. Mesuré au premier run — `passed=1 failed=1`.
        ///
        /// ⇒ *La cible d'un contrôle négatif ne doit dépendre d'AUCUNE propriété que quelqu'un a le
        /// droit de corriger.* Un type RÉELLEMENT non couvert est exactement ça : sa non-couverture
        /// est un manque, donc une chose que l'atelier va combler. En viser un, c'est écrire une
        /// garde dont la durée de vie est celle du défaut qu'elle décrit.
        ///
        /// ⇒ La forme qui tient : une valeur qui n'appartient PAS au domaine, donc pour laquelle
        /// aucun fichier ne sera jamais produit — le back ne projettera jamais ce type, et personne
        /// n'a de raison de lui dessiner une icône. La propriété testée est inchangée et elle est
        /// la bonne : *un type sans glyphe n'en reçoit AUCUN, jamais celui d'un voisin.*
        /// ⚠️ Et c'est bien un test de couverture, pas de validité : `BuildingIcons.Pour` ne connaît
        /// pas l'enum — il calcule un chemin et rend `null` s'il n'y a pas de fichier. Le chemin
        /// emprunté ici est donc EXACTEMENT celui d'un 13ᵉ type ajouté demain côté back.</summary>
        private const string TypeSansGlypheJamais = "type_absent_du_domaine_controle_negatif";

        private GameObject hote;

        [TearDown]
        public void TearDown()
        {
            if (hote == null) return;
            var d = hote.GetComponent<DistrictInteriorScreenController>();
            if (d != null && d.ScreenRoot != null)
            {
                Canvas c = d.ScreenRoot.GetComponentInParent<Canvas>();
                if (c != null) Object.Destroy(c.gameObject);
            }
            Object.Destroy(hote);
        }

        // ── 1. BIJECTION fichier ↔ résolveur ────────────────────────────────────────────────────

        [Test]
        public void Icones_ChaqueFichierLivreEstATTEIGNABLE_EtChaqueGlypheResoluAUnFichier()
        {
            string dir = Path.Combine(Application.dataPath, DossierIcones);
            Assert.IsTrue(Directory.Exists(dir),
                $"⛔ le dossier livré n'existe pas : {dir}. Sans dossier `Resources`, un PNG sous "
                + "`Assets/Art/` n'entre PAS dans le build — il n'est pas « presque monté », il est absent.");

            // Ce que l'ATELIER a déposé.
            string[] fichiers = Directory.GetFiles(dir, "*.png")
                .Select(Path.GetFileNameWithoutExtension).OrderBy(x => x).ToArray();

            // ⛔ PLANCHER ANTI-VACUITÉ AVANT TOUTE COMPARAISON D'ENSEMBLES : sur un dossier vide,
            //    « tout fichier est atteignable » est trivialement VRAI et le resterait pour
            //    toujours. Ce n'est pas « rien de cassé », c'est « rien mesuré ».
            Assert.Greater(fichiers.Length, 8,
                $"⛔ seulement {fichiers.Length} fichier(s) — la bijection serait vraie à vide.");

            // Ce que le RÉSOLVEUR atteint, en partant des types du back (jamais des noms de fichiers).
            string[] resolus = TousLesTypes.Where(t => BuildingIcons.Pour(t) != null).OrderBy(t => t).ToArray();
            string[] attendusDepuisFichiers = fichiers
                .Select(f => f.StartsWith("icon_building_") && f.EndsWith(SuffixeLivre)
                    ? f.Substring("icon_building_".Length, f.Length - "icon_building_".Length - SuffixeLivre.Length)
                    : "⛔HORS-CONVENTION:" + f)
                .OrderBy(x => x).ToArray();

            Debug.Log($"[CarteIcones] {fichiers.Length} fichier(s) livré(s) · {resolus.Length} glyphe(s) résolu(s) "
                      + $"sur {TousLesTypes.Length} types de l'enum · COUVERTURE {resolus.Length}/{TousLesTypes.Length}. "
                      + $"Non couverts : [{string.Join(", ", TousLesTypes.Except(resolus))}]");

            // (a) Aucun fichier orphelin — un PNG hors convention de nom est mort ET trompeur.
            var orphelins = attendusDepuisFichiers.Except(resolus).ToArray();
            Assert.IsEmpty(orphelins,
                $"⛔ {orphelins.Length} fichier(s) livré(s) que le résolveur n'atteint PAS : "
                + $"[{string.Join(", ", orphelins)}]. Ils pèsent dans le build (tout ce qui est sous un "
                + "`Resources` y entre sans élagage) et ne s'affichent jamais. Soit le nom sort de la "
                + "convention `icon_building_<operational_type>_48`, soit le type n'existe pas côté back.");

            // (b) Aucun glyphe résolu sans fichier — impossible par construction, donc c'est le
            //     CONTRÔLE de l'instrument : s'il rougit, c'est ma lecture du dossier qui est fausse.
            var fantomes = resolus.Except(attendusDepuisFichiers).ToArray();
            Assert.IsEmpty(fantomes,
                $"⛔ {fantomes.Length} glyphe(s) résolu(s) sans fichier correspondant : "
                + $"[{string.Join(", ", fantomes)}] — l'instrument lit le mauvais dossier.");

            // (c) ⚠️ LE DÉNOMINATEUR EST ASSERTÉ, pas seulement journalisé. Il borne ce que ce lot
            //     livre, et il ROUGIRA le jour où l'atelier produira le glyphe manquant — c'est
            //     l'épingle qui se retourne, pas une prose datée : le compte est une DONNÉE.
            Assert.AreEqual(12, resolus.Length,
                $"couverture attendue 12/{TousLesTypes.Length} depuis le 2026-09-07 soir — l'atelier a "
                + "livré `icon_building_specialized_lab` et l'épingle a fait EXACTEMENT ce pour quoi elle "
                + "existait : elle valait 11, elle a rougi à la livraison, on l'a montée à 12 en même temps "
                + "que le fichier. C'est une épingle sur une DONNÉE, pas une intention — elle rougira encore "
                + "au 13e type, dans l'autre sens si un glyphe disparaît.");
        }

        // ── 2. Le glyphe est réellement DESSINABLE, et l'absence MASQUE ──────────────────────────

        [UnityTest]
        public IEnumerator Icones_TypeCouvert_PorteUnGlypheDESSINABLE_TypeNonCouvert_NEnPortePAS()
        {
            hote = new GameObject("DistrictInteriorDiorama_Icones");
            var diorama = hote.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(Grille(new[] { "lab", TypeSansGlypheJamais }));

            RectTransform cellCouverte = Cellule(diorama, 0, 0);
            RectTransform cellNue = Cellule(diorama, 1, 0);

            // ── Contrôle POSITIF : le type couvert porte son glyphe ──
            Transform icone = cellCouverte.Find("TypeIcon");
            Assert.IsNotNull(icone, "⛔ `lab` a un glyphe livré et la cellule n'en porte aucun — le "
                + "consommateur ne lit pas le seam, ou le seam ne trouve pas le dossier `Resources`.");

            // ⛔ GARDES STRUCTURELLES AVANT TOUTE GARDE DE VALEUR — ce sont les seules qui aient
            //    fermé des classes ici. Un `Graphic` sans `CanvasRenderer` ne dessine RIEN, SANS
            //    erreur console ; et un `Graphic` nu sous un `Mask` n'est pas clippable. Les deux
            //    défauts sont muets : l'objet existe, il est référencé, il ne produit pas un pixel.
            Assert.IsNotNull(icone.GetComponent<CanvasRenderer>(),
                "⛔ `TypeIcon` sans `CanvasRenderer` : un Graphic n'y dessine RIEN et ne lève rien.");
            var img = icone.GetComponent<Image>();
            Assert.IsNotNull(img, "⛔ `TypeIcon` sans `Image`");
            Assert.IsInstanceOf<MaskableGraphic>(img,
                "⛔ `TypeIcon` doit être masquable — un jour il vivra sous un `Mask`, et être ENFANT "
                + "d'un masque ne rend pas masquable.");
            Assert.IsTrue(img.enabled, "⛔ `TypeIcon` désactivé — présent et invisible");
            Assert.IsNotNull(img.sprite, "⛔ `TypeIcon` sans sprite — l'asset n'a pas été chargé");

            // Géométrie : le glyphe est POSÉ SUR la bande du libellé, jamais dedans. Un glyphe qui
            // recouvre le libellé retire ce que le libellé apporte — et l'arbitrage de DA est que le
            // libellé NOMME, le glyphe fait seulement RECONNAÎTRE.
            var iconRt = (RectTransform)icone;
            var labelRt = (RectTransform)cellCouverte.Find("TypeLabel");
            Assert.IsNotNull(labelRt, "⛔ le libellé a disparu — jamais de glyphe SEUL");
            Assert.GreaterOrEqual(iconRt.anchoredPosition.y, labelRt.sizeDelta.y - 0.01f,
                $"⛔ le glyphe ({iconRt.anchoredPosition.y}) mord sur la bande du libellé "
                + $"({labelRt.sizeDelta.y}) — il en recouvrirait le texte.");
            Assert.Greater(iconRt.sizeDelta.x, 0f, "⛔ glyphe de largeur nulle — présent, invisible");
            Assert.AreEqual(iconRt.sizeDelta.x, iconRt.sizeDelta.y, 0.01f, "le glyphe est carré");

            // ── Contrôle NÉGATIF, et c'est LUI qui rend le positif probant : sans lui, un
            //    consommateur qui poserait un glyphe de REPLI sur TOUS les types passerait le test
            //    ci-dessus. Un glyphe faux est pire qu'un glyphe absent : il remet deux types sous
            //    la même image, le défaut exact que le libellé de type existe pour réparer.
            Assert.IsNull(cellNue.Find("TypeIcon"),
                $"⛔ « {TypeSansGlypheJamais} » n'a aucun glyphe produit — la cellule ne doit en porter "
                + "aucun, surtout pas celui d'un voisin.");
            Assert.IsNotNull(cellNue.Find("TypeLabel"),
                "⛔ et le libellé, lui, doit rester : c'est ce qui reste lisible quand le glyphe manque.");

            yield return null;
        }

        // ── fabrication (mêmes champs que le DTO réel — valeurs choisies par le test) ────────────

        private static RectTransform Cellule(DistrictInteriorScreenController d, int x, int y)
        {
            var candidats = d.ScreenRoot.GetComponentsInChildren<RectTransform>(true)
                .Where(rt => rt.name == $"Cell_{x}_{y}").ToArray();
            Assert.IsNotEmpty(candidats, $"Cell_{x}_{y} doit exister dans l'arbre rendu");
            // ⛔⛔ REFUSER DE CHOISIR PLUTÔT QUE PRENDRE LE PREMIER. Mesuré en jeu le 2026-09-07 :
            //    le monde réel porte **13 bâtiments sur 11 BLOCS DISTINCTS**, parce que la boucle de
            //    rendu itère sur les BÂTIMENTS et pose la cellule à `block.x, block.y`. Deux
            //    bâtiments d'un même bloc produisent donc **deux `GameObject` du même nom**, à la
            //    même position, au pixel près.
            //    ⇒ `Transform.Find` et `FirstOrDefault` rendent le PREMIER — donc cette garde
            //      mesurait la bonne propriété sur le MAUVAIS OBJET, en silence, une fois sur deux.
            //      *Une garde qui ne peut pas savoir laquelle des deux elle regarde doit le DIRE,
            //      pas trancher au hasard.* Le rouge ci-dessous est la seule réponse honnête : il
            //      nomme l'ambiguïté au lieu de la moyenner.
            Assert.AreEqual(1, candidats.Length,
                $"⛔ {candidats.Length} nœuds nommés `Cell_{x}_{y}` — l'appariement par NOM ne "
                + "distingue plus les deux, et le test mesurerait celui que l'arbre a mis en premier. "
                + "Apparier par bâtiment (ou rendre le nom unique) avant de rien conclure de ce bloc.");
            return candidats[0];
        }

        private static DistrictInteriorDto Grille(string[] types)
        {
            var blocks = new DistrictInteriorBlockDto[types.Length];
            var bats = new DistrictInteriorBuildingDto[types.Length];
            for (int i = 0; i < types.Length; i++)
            {
                blocks[i] = new DistrictInteriorBlockDto { block_id = i, x = i, y = 0 };
                bats[i] = new DistrictInteriorBuildingDto
                {
                    building = $"building-{i}", block_id = i, operational_type = types[i],
                    conversion_band = "OPERATIONAL", shell_state = "STANDING", condition_band = "SOUND",
                    revenue_band = "IDLE", revenue_chain = "UNWIRED", activity_band = "IDLE",
                    lapse_phase_bucket = "WITHIN_WINDOW", maintenance_in_progress = false,
                    lieutenant_ids = new string[0],
                };
            }
            return new DistrictInteriorDto
            {
                district = "district-1", district_id = 1, profile = "lattice",
                name_canonical = "Test", bank_side = "north",
                grid = new DistrictInteriorGridDto { width = types.Length, height = 1 },
                blocks = blocks, buildings = bats, day_phase = "NIGHT",
            };
        }
    }
}
