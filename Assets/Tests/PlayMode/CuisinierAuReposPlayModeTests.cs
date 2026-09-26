using System.Collections;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Lieutenant;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ⑦ — ÉTAT VIDE FAUX (passe UX 2026-09-26, table 63 v2) : « Aucune équipe rattachée » s'écrivait sans donnée. Un cuisinier AU REPOS
    // (servi : COOK + IDLE — les deux cuisiniers du kit mesuré, corps/007) dit « au repos : rien à cuire » et renvoie à ㉚. Hors réseau.
    //   C2  ⑥ (§G, planche F1) GARDE GÉOMÉTRIQUE : le panneau du cuisinier au repos CONTIENT son texte (hauteur ET largeur) et le
    //       métier « Cuisinier » n'est pas tronqué (« …depuis la chaî », « Cuisinie » sur la planche de 1fba6954)
    [Category("CuisinierAuRepos")]
    public class CuisinierAuReposPlayModeTests
    {
        private GameObject hote;

        [TearDown]
        public void TearDown()
        {
            var c = Object.FindFirstObjectByType<Canvas>();
            if (c != null) Object.Destroy(c.gameObject);
            if (hote != null) Object.Destroy(hote);
        }

        [UnityTest]
        public IEnumerator C2_LePanneauContientSonTexte_EtLeMetierNEstPasCoupe()
        {
            hote = new GameObject("LieutenantScreenController_Repos");
            var ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;   // l'écran bâtit son arbre avant qu'on lui donne des données
            ecran.RendreRosterDepuis(new[]
            {
                new RosterRow { lieutenant_id = "lt-tull", name = "Lt. Tull", archetype = "COOK",
                    op_state_band = "IDLE", rule_count_band = "NONE", tenure_bucket = "FRESH" },
            });
            // mesurer dans la MÊME frame (patron IconesArchetype : une frame cédée laisse le roster réel effacer celui-ci)
            var canvas = Object.FindFirstObjectByType<Canvas>();
            Assert.IsNotNull(canvas, "aucun Canvas : l'écran n'a pas bâti son interface");
            Canvas.ForceUpdateCanvases();
            foreach (var g in canvas.GetComponentsInChildren<LayoutGroup>(true).Reverse())
                LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)g.transform);
            Canvas.ForceUpdateCanvases();

            TextMeshProUGUI texte = canvas.GetComponentsInChildren<TextMeshProUGUI>(true)
                .FirstOrDefault(t => t.name == "Texte" && t.transform.parent.name.StartsWith("EquipeSlot_"));
            Assert.IsNotNull(texte, "le panneau du cuisinier au repos n'est pas rendu");
            StringAssert.Contains("d’appro", texte.text, "la seconde phrase est bien là");
            texte.ForceMeshUpdate();
            RectTransform cadre = (RectTransform)texte.transform.parent;
            Assert.LessOrEqual(texte.preferredHeight, texte.rectTransform.rect.height + 0.5f,
                $"le texte ({texte.preferredHeight:0.#}) déborde la hauteur de son rect ({texte.rectTransform.rect.height:0.#})");
            Assert.LessOrEqual(texte.textBounds.size.x, cadre.rect.width + 0.5f, "le texte déborde la largeur du cadre");
            Assert.LessOrEqual(texte.rectTransform.rect.height, cadre.rect.height + 0.5f, "le rect du texte sort du cadre");
            Assert.IsFalse(texte.isTextTruncated, "jamais tronqué");

            TextMeshProUGUI metier = canvas.GetComponentsInChildren<TextMeshProUGUI>(true).FirstOrDefault(t => t.name == "Metier");
            Assert.IsNotNull(metier);
            metier.ForceMeshUpdate();
            Assert.IsFalse(metier.isTextTruncated, $"« {metier.text} » tronqué");
            Assert.LessOrEqual(metier.preferredWidth, metier.rectTransform.rect.width + 0.5f,
                $"« {metier.text} » : {metier.preferredWidth:0.#} pour un rect de {metier.rectTransform.rect.width:0.#}");
        }

        [Test]
        public void C1_CuisinierAuRepos_SeulementCookEtIdle()
        {
            Assert.IsTrue(LieutenantScreenController.EstCuisinierAuRepos(new RosterRow { archetype = "COOK", op_state_band = "IDLE" }), "le kit mesuré");
            Assert.IsFalse(LieutenantScreenController.EstCuisinierAuRepos(new RosterRow { archetype = "COOK", op_state_band = "ACTIVE" }));
            Assert.IsFalse(LieutenantScreenController.EstCuisinierAuRepos(new RosterRow { archetype = "MUSCLE", op_state_band = "IDLE" }));
            Assert.IsFalse(LieutenantScreenController.EstCuisinierAuRepos(null));
        }
    }
}
