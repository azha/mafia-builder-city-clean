using System.Collections;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
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

        // ── ⑥ (L2 client, 07/10) — la phrase SUIT le stock du labo servi au roster : `precursor_stock_band` ───────────────────────────
        //   S1  M3 (revue ⊥, f2) : aucune phrase ratifiée par l'atelier ⇒ TOUTES les bandes disent la phrase d'avant (jamais « pleine » pour HIGH)
        //   S2  GARDE épinglée sur la valeur SERVIE : MEDIUM, pas MODERATE (≠ `DealerCashBand`) — un MODERATE servi n'est pas un stock moyen
        //   S3  la clé se lit dans le corps du roster (type fermé, jamais null) ; le DTO la déclare AVANT qu'elle soit servie (forme G)

        private static string Texte(string bande) =>
            LieutenantScreenController.TexteDuCuisinierAuRepos(new RosterRow { archetype = "COOK", op_state_band = "IDLE", precursor_stock_band = bande });

        [Test]
        public void S1_TantQueLAtelierNAPasRatifie_ToutesLesBandesDisentLaPhraseDAvant()
        {
            Libelle.RemettreLesCompteurs();
            string avant = Texte(null);
            StringAssert.Contains("rien \u00e0 cuire", avant);
            StringAssert.Contains("d\u2019appro", avant, "« rien à cuire » et le renvoi à ㉚");
            foreach (string bande in new[] { "NONE", "LOW", "MEDIUM", "HIGH", "", "INCONNUE" })
                Assert.AreEqual(avant, Texte(bande), $"bande « {bande} » : aucune phrase ratifiée, donc celle d'avant — jamais une phrase inventée");
            StringAssert.DoesNotContain("pleine", string.Join("|", new[] { "LOW", "MEDIUM", "HIGH" }.Select(Texte)),
                "HIGH = plus de 50 unités en ABSOLU, pas une réserve pleine (la faute de ㉟)");
            Assert.IsEmpty(Libelle.ClesEnRepli.Where(k => k.StartsWith("famille.vide.au_repos_stock.")), "aucune clé neuve n'est demandée au back");
            Assert.IsNull(LieutenantScreenController.PhraseDeLAtelier("LOW"), "le mécanisme attend les mots de l'atelier (TD-759)");
        }

        [Test]
        public void S2_Garde_LaValeurServieEstMedium_PasModerate()
        {
            CollectionAssert.AreEqual(new[] { "NONE", "LOW", "MEDIUM", "HIGH" }, LieutenantScreenController.BandesDeStock,
                "`StockBand` du back (precursor-stock-band.ts:16), recopié : MEDIUM, pas MODERATE");
            string avant = Texte(null);
            Assert.AreEqual(avant, Texte("MODERATE"), "MODERATE est une valeur de `DealerCashBand` : pour un stock, une valeur INCONNUE ⇒ la phrase d'avant");
            Assert.AreEqual(avant, Texte("FULL"));
            Assert.AreEqual(avant, LieutenantScreenController.TexteDuCuisinierAuRepos(null));
        }

        [Test]
        public void S3_LaCleSeLitDansLeRoster_CleDeRosterSeulement()
        {
            const string corps = "{\"payload\":{\"data\":{\"lieutenants\":[{\"lieutenant_id\":\"lt\",\"name\":\"Lt. Tull\",\"archetype\":\"COOK\"," +
                                 "\"op_state_band\":\"IDLE\",\"rule_count_band\":\"NONE\",\"precursor_stock_band\":\"MEDIUM\",\"tenure_bucket\":\"FRESH\"}]}}}";
            RosterRow r = JsonUtility.FromJson<RosterListEnvelope>(corps).payload.data.lieutenants[0];
            Assert.AreEqual("MEDIUM", r.precursor_stock_band);
            Assert.AreEqual("FRESH", r.tenure_bucket, "les autres clés passent toujours");
            Assert.IsNull(JsonUtility.FromJson<RosterListEnvelope>(corps.Replace("\"precursor_stock_band\":\"MEDIUM\",", ""))
                .payload.data.lieutenants[0].precursor_stock_band, "un back antérieur au lot ne la sert pas : null ⇒ la phrase d'avant");
        }
    }
}
