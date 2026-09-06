using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.CityMap.Tests
{
    // E2E (charter 27: no mock). Drives the real CityMapController, which builds
    // its own Canvas + UI and fetches the live backend. Asserts the rendered
    // cells match the contract: 18 districts, grouped by bank, coloured by state.
    [Category("ScreenCarte")]
    public class CityMapRenderPlayModeTests
    {
        private GameObject controllerGo;

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        [UnityTest]
        public IEnumerator CityMap_BuildsAndRenders_18Cells_GroupedByBank_ColouredByState()
        {
            controllerGo = new GameObject("CityMapController");
            CityMapController controller = controllerGo.AddComponent<CityMapController>();

            // Start() runs next frame; wait for the live fetch to finish (or error).
            float elapsed = 0f;
            while (!controller.IsLoaded && controller.LastError == null && elapsed < 15f)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }

            Assert.IsNull(controller.LastError, $"Load errored: {controller.LastError}");
            Assert.IsTrue(controller.IsLoaded, "Controller never finished loading");

            // 18 districts, split across the two banks with nothing dropped.
            Assert.AreEqual(18, controller.Cells.Count, "Expected 18 district cells");
            Assert.AreEqual(18, controller.NorthCount + controller.SouthCount,
                "Every cell must be assigned to a bank");
            Assert.Greater(controller.NorthCount, 0, "North bank should have districts");
            Assert.Greater(controller.SouthCount, 0, "South bank should have districts");

            // ⛔ UN DISPOSITIF CONDITIONNEL DOIT IMPRIMER S'IL S'EST ACTIVÉ : sans cette ligne,
            // le montage « liste en deux colonnes » et le montage « ville peinte » rendent le même
            // vert, et rien ne dit lequel des deux jeux d'assertions a réellement tourné.
            Debug.Log($"[CARTE-RENDU] régime={(controller.VillePeinteMontee ? "ville peinte" : "liste 2 colonnes")} " +
                      $"cellules={controller.Cells.Count} plafond_halo={CityMapController.AlphaHaloMax:F2}");

            foreach (DistrictCellView cell in controller.Cells)
            {
                Assert.IsNotNull(cell.Background, "cell missing Image");
                Assert.IsNotNull(cell.Label, "cell missing Text");

                // Bank parsed, and the cell lives under the matching column.
                Assert.AreNotEqual(BankSide.Unknown, cell.Bank,
                    $"district {cell.Model.name_canonical} unparsed bank_side");

                // ⛔⛔ CETTE GARDE A ÉTÉ REMPLACÉE, PAS ASSOUPLIE — et la distinction est le sujet.
                // Elle assertait `Background.color == ColorFor(State)`, opacité comprise. C'était
                // exact, et c'était la propriété d'une TUILE PLEINE. Le jour où un juge ⊥ a mesuré
                // que cette plaque opaque produisait cinq des dix écarts de ③ (masse visuelle ×3 à
                // ×7,85, contraste du nom 2,80:1 sous le plancher 4,5:1, la rose des vents
                // recouverte sur 21 %, 73 % de plaque sans lettre sur le nom le plus court, arête
                // à rayon 0), elle est devenue **impossible à satisfaire autrement qu'en
                // rétablissant le défaut**. Le socle donne trois issues et une seule est bonne :
                // ni l'assouplir (elle ne protégerait plus rien), ni l'ignorer (elle pourrirait),
                // mais la remplacer par la propriété que le NOUVEAU dispositif garantit.
                // ⇒ Ce que le halo garantit, et que la plaque ne garantissait PAS : la teinte porte
                //   toujours l'état de contrôle CANAL PAR CANAL, **et** son opacité est bornée sous
                //   le seuil de l'instrument du juge. La garde est donc strictement plus FORTE
                //   qu'avant : elle a gagné une inégalité, elle n'a rien perdu.
                // ⚠️ Et elle DÉCLARE son régime : les deux montages de cet écran (ville peinte /
                //   liste en deux colonnes) n'ont pas la même forme, et une garde muette sur lequel
                //   des deux elle a jugé se lit plus large qu'elle n'est.
                Assert.AreNotEqual(ControlState.Unknown, cell.State,
                    $"district {cell.Model.name_canonical} unparsed control_state");
                Color attendue = CityMapEnums.ColorFor(cell.State);
                Color obtenue = cell.Background.color;
                Assert.AreEqual(attendue.r, obtenue.r, 1f / 255f,
                    $"district {cell.Model.name_canonical} — canal R de l'état de contrôle");
                Assert.AreEqual(attendue.g, obtenue.g, 1f / 255f,
                    $"district {cell.Model.name_canonical} — canal G de l'état de contrôle");
                Assert.AreEqual(attendue.b, obtenue.b, 1f / 255f,
                    $"district {cell.Model.name_canonical} — canal B de l'état de contrôle");
                if (controller.VillePeinteMontee)
                {
                    Assert.LessOrEqual(obtenue.a, CityMapController.AlphaHaloMax + 1e-4f,
                        $"district {cell.Model.name_canonical} — le halo posé sur la peinture est " +
                        $"opaque à {obtenue.a:F3} : au-delà de {CityMapController.AlphaHaloMax:F2} il " +
                        "redevient la plaque qui masquait la ville");
                    // Anti-dégénérescence : un halo à alpha NUL satisferait le plafond ci-dessus
                    // tout en ne portant plus aucun état — l'inverse exact du défaut, et tout aussi
                    // muet. La borne est un intervalle, jamais un seul côté.
                    Assert.Greater(obtenue.a, 0.02f,
                        $"district {cell.Model.name_canonical} — halo à alpha {obtenue.a:F3} : " +
                        "l'état de contrôle a cessé d'être visible");

                    // ⛔⛔ AUCUNE TRONCATURE — ET LA PREMIÈRE VERSION DE CETTE GARDE ÉTAIT VIDE.
                    // Elle comparait `textInfo.characterCount` à `GetParsedText().Length`. Contrôle
                    // positif (défaut réarmé : `overflowMode = Truncate`) : **VERTE**. Mesuré
                    // pourquoi, en imprimant les grandeurs candidates sous le défaut armé :
                    //     « HAUTES-MARC » poses=11 attendus=11 visibles=10 debord=-1 prefere=269,2 boite=198,0
                    // `GetParsedText()` rend le texte **DÉJÀ COUPÉ** : mes deux termes étaient tous
                    // les deux en AVAL de la troncature, donc égaux par construction. *Le contrôle
                    // et son sujet partageaient le support*, et `firstOverflowCharacterIndex` rend
                    // −1 sur le cas même qui a motivé la garde.
                    // ⇒ La grandeur qui discrimine est le texte ASSIGNÉ contre le texte POSÉ — le
                    //   seul couple dont un terme est en amont de la coupe. 14 contre 11 sous le
                    //   défaut, égal après le correctif.
                    // ⚠️ Pas `prefere <= boite` : la largeur préférée dépasse la boîte aussi APRÈS
                    //   le correctif (c'est le principe de `Overflow`), donc cette garde-là serait
                    //   rouge sur le monde qu'on veut.
                    cell.Label.ForceMeshUpdate();
                    string assigne = cell.Label.text;
                    string pose = cell.Label.GetParsedText();
                    Assert.AreEqual(assigne.Length, pose.Length,
                        $"district {cell.Model.name_canonical} — nom TRONQUÉ : « {pose} » " +
                        $"({pose.Length} caractères posés) pour « {assigne} » ({assigne.Length} servis)");
                }
                else
                {
                    Assert.AreEqual(1f, obtenue.a, 1e-4f,
                        $"district {cell.Model.name_canonical} — hors ville peinte, la tuile EST un " +
                        "pavé plein et doit le rester");
                }

                // Label carries the district's DISPLAY name — 2026-09-02: the tile now shows the
                // fiction name (`name`, e.g. "La Lisière") in front of the code name, explicit
                // fallback onto `name_canonical` (CityMapEnums.DisplayName — same rule the detail
                // panel title uses). The live backend serves `name` for all 18 districts, so this
                // also exercises the "name present" branch; the fallback branch itself is a pure
                // unit test (CityMapFetchPlayModeTests.DisplayName_FallsBackToNameCanonical...).
                StringAssert.Contains(CityMapEnums.DisplayName(cell.Model), cell.Label.text,
                    "cell label must show the district's display name");
            }

            // ⛔ LA LÉGENDE À PASTILLES N'EXISTE QUE SUR LE REPLI (F6). Garde STRUCTURELLE — elle ne
            // lit aucun pixel : elle compte des objets nommés dans l'arbre, donc elle survit à un
            // changement de palette, de taille et de résolution. Et elle est BILATÉRALE : « zéro sur
            // la ville peinte » seul serait satisfait par une légende supprimée PARTOUT, ce qui
            // retirerait du repli un élément qui lui appartient. Deux régimes, deux comptes.
            int itemsLegende = 0;
            foreach (Transform t in controller.GetComponentsInChildren<Transform>(true))
                if (t.name == "LegendItem") itemsLegende++;
            if (controller.VillePeinteMontee)
                Assert.AreEqual(0, itemsLegende,
                    $"{itemsLegende} pastilles de légende sur la ville peinte : la maquette n'en " +
                    "porte aucune, et ce sont les seuls aplats saturés de l'écran");
            else
                Assert.AreEqual(4, itemsLegende,
                    $"{itemsLegende} pastilles sur le repli en deux colonnes : la légende de contrôle " +
                    "y appartient, elle n'a pas été retirée du dépôt mais d'UN montage");
        }
    }
}
