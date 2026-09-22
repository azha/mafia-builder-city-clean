using System.Collections.Generic;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨-4 — celui qui parle, cadre 14 (juge r1 M4 : nom en or, ligne de rôle, pastilles, queue, liseré, coins perdus ; M5).
    //   R13     le contexte « · rôle · lieu » : le lieu seulement si une issue vise un bâtiment, « toute la ville » pour la
    //           ville, le rôle seulement après la jointure — rien d'inventé
    //   R13bis  la réplique : « Patron — ils… » (minuscule initiale) quand un lieutenant parle en prose ; la ville sans
    //           guillemets ni adresse ; un identifiant nu
    //   R13ter  la structure : médaillon 60 au buste, bulle masquée avec bord et QUEUE (juste avant elle, hors mise en page),
    //           nom en serif or-vif, deux pastilles « Grave » « Critique »
//   R13quater  la réplique du raid SERVIE en clé (back `back/s5-revue-du-jour` 1f54235c : `event_descriptor_i18n`
//           = { key: "exception.raid.card.descriptor", params: {} }) : la forme G porte `key` ET `params` ; la clé connue
//           du catalogue remplace la prose ; clé absente du catalogue ou champ absent ⇒ le repli actuel (la prose servie)
    [Category("EcranFile")]
    public class ExceptionsParleurPlayModeTests
    {
        private GameObject hostGo;
        private ExceptionQueueController ecran;

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            ecran = null; hostGo = null;
        }

        private static ExceptionCardDto Raid(string descripteur) => new ExceptionCardDto
        {
            exception_id = "r", lieutenant_id = "lt-kane",
            lieutenant = new ExceptionLieutenantDto { id = "lt-kane", name = "Lt. Kane" },
            event_descriptor = descripteur, severity_band = "SEVERE", priority_band = "critical", confidence_band = "confident",
            candidate_actions = new[]
            {
                new CandidateActionDto { id = "repair", label = "Repair", method = "REPAIR",
                                         effect = new ExceptionEffectDto { type = "REPAIR", target_building_id = "b-1" } },
            },
            suggested_action = new CandidateActionDto(),
        };

        private static ExceptionCardDto Ville() => new ExceptionCardDto
        {
            exception_id = "v", lieutenant_id = "", lieutenant = new ExceptionLieutenantDto(),
            event_descriptor = "Citywide heat is high — your operations are under pressure.",
            severity_band = "SEVERE", priority_band = "urgent", confidence_band = "confident",
            candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto(),
        };

        private void NouvelEcran(params ExceptionCardDto[] cartes)
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(cartes);
        }

        [Test]
        public void R13_LeContexte_RoleEtLieu_JamaisInventes()
        {
            NouvelEcran(Raid("They turned the building over last night."), Ville());
            Assert.AreEqual("· au bâtiment touché", ecran.ContexteDuPremier(ecran.Cards[0]), "avant la jointure : le lieu seul");
            Assert.AreEqual("· toute la ville", ecran.ContexteDuPremier(ecran.Cards[1]));
            ecran.PoserRosterPourTest(new[] { new RosterRow { lieutenant_id = "lt-kane", archetype = "COOK" } });
            Assert.AreEqual("· Cuisinier · au bâtiment touché", ecran.ContexteDuPremier(ecran.Cards[0]));

            ExceptionCardDto sansCible = Raid("x y");
            sansCible.candidate_actions = new CandidateActionDto[0];
            sansCible.lieutenant_id = "lt-inconnu";
            Assert.IsNull(ecran.ContexteDuPremier(sansCible), "ni rôle connu ni cible : pas de contexte du tout");
        }

        [Test]
        public void R13bis_LaReplique_PatronSeulementPourUnLieutenantQuiParle()
        {
            Assert.AreEqual("« Patron — they turned the building over last night. »",
                ExceptionQueueController.RepliqueDuPremier(Raid("They turned the building over last night.")));
            Assert.AreEqual("Citywide heat is high — your operations are under pressure.",
                ExceptionQueueController.RepliqueDuPremier(Ville()), "la ville : ni guillemets ni adresse");
            Assert.AreEqual("exc_demo_teach_idle", ExceptionQueueController.RepliqueDuPremier(Raid("exc_demo_teach_idle")),
                "un identifiant se montre nu, jamais dans la bouche d'un lieutenant");
        }

        [Test]
        public void R13ter_LaBulle_SaQueue_SonNom_SesPastilles()
        {
            NouvelEcran(Raid("They turned the building over last night."));
            GameObject parleur = null;
            foreach (Transform t in hostGo.GetComponentsInChildren<Transform>(true))
                if (t.name == "MedaillonParleur") parleur = t.gameObject;
            Assert.IsNotNull(parleur, "le médaillon de celui qui parle");
            Assert.IsNotNull(parleur.transform.Find("Buste"));
            Transform rangee = parleur.transform.parent;
            Transform b = rangee.Find("Bulle");
            Assert.IsNotNull(b.GetComponent<Mask>(), "coins arrondis (M5)");
            Assert.IsNotNull(b.Find("Bord"), "le liseré (M5)");
            Transform queue = rangee.Find("QueueBulle");
            Assert.IsNotNull(queue, "la queue de la bulle (M4)");
            Assert.AreEqual(b.GetSiblingIndex() - 1, queue.GetSiblingIndex(), "juste avant la bulle, donc dessous");
            Assert.IsTrue(queue.GetComponent<LayoutElement>().ignoreLayout);

            TextMeshProUGUI nom = b.Find("QuiNom").GetComponent<TextMeshProUGUI>();
            Assert.AreEqual("Lt. Kane", nom.text);
            Assert.AreSame(DesignTokens.Current.hudSerifFont, nom.font, "`.qui b{font-family:Georgia}`");
            Assert.AreEqual(DesignTokens.Current.hudMoneyGold, nom.color, "le nom en or-vif (M4)");
            Transform p = b.Find("Pastilles");
            Assert.AreEqual("Grave", p.Find("Gravite/Lib").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("Critique", p.Find("Priorite/Lib").GetComponent<TextMeshProUGUI>().text);
        }

        [Test]
        public void R13quater_LaRepliqueDuRaid_ServieEnCle_EtSonRepli()
        {
            const string cle = "exception.raid.card.descriptor";
            ExceptionCardDto lue = JsonUtility.FromJson<ExceptionCardDto>(
                "{\"exception_id\":\"r\",\"event_descriptor\":\"They turned the building over last night.\"," +
                "\"event_descriptor_i18n\":{\"key\":\"" + cle + "\",\"params\":{}}}");
            Assert.AreEqual(cle, lue.event_descriptor_i18n.key, "forme G : la clé est déclarée");
            Assert.IsNotNull(lue.event_descriptor_i18n.@params, "forme G : `params` est déclaré (objet vide)");

            ExceptionCardDto raid = Raid("They turned the building over last night.");
            raid.event_descriptor_i18n = lue.event_descriptor_i18n;
            Assert.AreEqual("« Patron — they turned the building over last night. »",
                ExceptionQueueController.RepliqueDuPremier(raid), "clé inconnue du catalogue ⇒ la prose servie");

            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { cle, "Ils ont retourné le bâtiment cette nuit. J’ai pas de consigne pour ça." },
            });
            Assert.AreEqual("« Patron — ils ont retourné le bâtiment cette nuit. J’ai pas de consigne pour ça. »",
                ExceptionQueueController.RepliqueDuPremier(raid), "la clé servie, résolue comme tout I18nRef");

            raid.event_descriptor_i18n = null;
            Assert.AreEqual("« Patron — they turned the building over last night. »",
                ExceptionQueueController.RepliqueDuPremier(raid), "sans le champ : le repli actuel");
        }
    }
}
