using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Operational.Exceptions;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨-0 — la forme G de ⑨/⑩ : des clés SERVIES que le DTO jetait en silence (JsonUtility ignore toute clé non déclarée).
    // Le corps ci-dessous est un EXTRAIT VERBATIM, généré depuis `Tools/juge-visuel/exceptions/corps-reels/GET_exceptions_queue.json`
    // (06/09, back fc944b62) : les cartes `f0f860c9` (la ville, chaleur, `source` HEAT_PRESSURE, dont une action `escalate`)
    // et `ee5e4798` (Lt. Rook, `suggested_disposition` ESCALATE, `script_complexity_band` ok), réenveloppées dans
    // `payload.data`. Désérialisé par le MÊME appel que `ExceptionsClient` (JsonUtility sur l'enveloppe), sans réseau.
    //   F0     lieutenant.name, method, source, suggested_disposition, script_complexity_band ARRIVENT dans le DTO
    //   F0bis  le locuteur : le nom servi ; la ville sans lieutenant ; « Votre lieutenant » seulement sans nom (pile pré-C3)
    [Category("EcranFile")]
    public class ExceptionsFormeGPlayModeTests
    {
        private const string Corps =
            "{\"payload\":{\"data\":{\"exceptions\":[{\"exception_id\":\"f0f860c9-70ef-4390-a9d4-40187587c962\",\"lieutenant_id\":null,\"lieutenant\":null,\"event_descr" +
            "iptor\":\"Citywide heat is high — your operations are under pressure.\",\"event_descriptor_i18n\":{\"key\":\"exception.heat_pressure.card.descriptor" +
            "\",\"params\":{}},\"candidate_actions\":[{\"id\":\"acknowledge\",\"label\":\"Acknowledge the pressure\",\"method\":\"ONE_TIME\",\"source\":\"HEAT_PRESSURE\",\"lab" +
            "el_i18n\":{\"key\":\"exception.heat_pressure.acknowledge.label\",\"params\":{}},\"add_rule_dsl\":null,\"projected_consequence\":\"You note the heat; no " +
            "automatic action is taken.\",\"projected_consequence_i18n\":{\"key\":\"exception.heat_pressure.acknowledge.consequence\",\"params\":{}}},{\"id\":\"escal" +
            "ate\",\"label\":\"Escalate for review\",\"method\":\"ESCALATE\",\"source\":\"HEAT_PRESSURE\",\"label_i18n\":{\"key\":\"exception.heat_pressure.escalate.label\"" +
            ",\"params\":{}},\"add_rule_dsl\":null,\"projected_consequence\":\"The card is archived for later review.\",\"projected_consequence_i18n\":{\"key\":\"exce" +
            "ption.heat_pressure.escalate.consequence\",\"params\":{}}},{\"id\":\"lay_low\",\"label\":\"Lay low across all operations\",\"method\":\"LAY_LOW\",\"source\":" +
            "\"HEAT_PRESSURE\",\"label_i18n\":{\"key\":\"exception.heat_pressure.lay_low.label\",\"params\":{}},\"add_rule_dsl\":null,\"projected_consequence\":\"You re" +
            "duce exposure across the board; a one-shot mitigation, no standing rule.\",\"projected_consequence_i18n\":{\"key\":\"exception.heat_pressure.lay_l" +
            "ow.consequence\",\"params\":{}}}],\"suggested_action\":{\"id\":\"acknowledge\",\"label\":\"Acknowledge the pressure\",\"method\":\"ONE_TIME\",\"source\":\"HEAT_" +
            "PRESSURE\",\"label_i18n\":{\"key\":\"exception.heat_pressure.acknowledge.label\",\"params\":{}},\"add_rule_dsl\":null,\"projected_consequence\":\"You note" +
            " the heat; no automatic action is taken.\",\"projected_consequence_i18n\":{\"key\":\"exception.heat_pressure.acknowledge.consequence\",\"params\":{}}" +
            "},\"confidence_band\":\"confident\",\"priority_band\":\"urgent\",\"severity_band\":\"SEVERE\",\"resolution_status\":\"pending\"},{\"exception_id\":\"ee5e4798-a" +
            "892-441a-9066-44574ed4bd6a\",\"lieutenant_id\":\"01a075d7-6aed-728e-8f0a-b5dbd5caedee\",\"lieutenant\":{\"id\":\"01a075d7-6aed-728e-8f0a-b5dbd5caedee\"" +
            ",\"name\":\"Lt. Rook\"},\"event_descriptor\":\"exc_demo_teach_idle\",\"event_descriptor_i18n\":null,\"candidate_actions\":[{\"id\":\"teach_idle\",\"label\":\"T" +
            "each: restart when idle\",\"add_rule_dsl\":\"WHEN STATE(cook_idle,==,true) THEN EXECUTE_DEFAULT @10;\",\"projected_consequence\":\"The cook restarts" +
            " when the lab sits idle\",\"method\":\"ONE_TIME\"},{\"id\":\"let_ride\",\"label\":\"Let it ride\",\"add_rule_dsl\":null,\"projected_consequence\":\"The risk s" +
            "tays\",\"method\":\"ONE_TIME\"}],\"suggested_action\":{\"id\":\"teach_idle\",\"label\":\"Teach: restart when idle\",\"add_rule_dsl\":\"WHEN STATE(cook_idle,==" +
            ",true) THEN EXECUTE_DEFAULT @10;\",\"projected_consequence\":\"The cook restarts when the lab sits idle\",\"method\":\"ONE_TIME\"},\"confidence_band\":" +
            "\"likely\",\"priority_band\":\"urgent\",\"severity_band\":\"MODERATE\",\"resolution_status\":\"pending\",\"suggested_disposition\":\"ESCALATE\",\"script_comple" +
            "xity_band\":\"ok\"}]}}}";

        private static ExceptionCardDto[] Cartes() =>
            JsonUtility.FromJson<ExceptionQueueEnvelope>(Corps).payload.data.exceptions;

        [Test]
        public void F0_LesClesServiesArriventDansLeDto()
        {
            ExceptionCardDto[] c = Cartes();
            Assert.AreEqual(2, c.Length);
            ExceptionCardDto ville = c[0], rook = c[1];
            Assert.AreEqual("Lt. Rook", rook.lieutenant.name, "le NOM servi depuis C3, jeté avant ⑨-0");
            Assert.AreEqual("ESCALATE", rook.suggested_disposition);
            Assert.AreEqual("ok", rook.script_complexity_band);
            Assert.AreEqual("ONE_TIME", rook.suggested_action.method, "`method` par action (Lot 0 D4) : L0.2 fermé côté back");
            Assert.AreEqual("ONE_TIME", ville.candidate_actions[0].method);
            Assert.AreEqual("ESCALATE", ville.candidate_actions[1].method, "l'escalade est SERVIE comme action candidate");
            Assert.AreEqual("LAY_LOW", ville.candidate_actions[2].method);
            Assert.AreEqual("HEAT_PRESSURE", ville.candidate_actions[0].source);
            Assert.IsTrue(string.IsNullOrEmpty(ville.suggested_disposition), "absent du corps ⇒ \"\"");
        }

        [Test]
        public void F0bis_LeLocuteur_EstLeNomServi()
        {
            ExceptionCardDto[] c = Cartes();
            Assert.AreEqual("Lt. Rook", ExceptionBandes.Locuteur(c[1]), "plus jamais « Votre lieutenant » quand le nom est servi (r1 M10)");
            Assert.AreEqual("La ville", ExceptionBandes.Locuteur(c[0]), "`lieutenant: null` ⇒ la ville");

            var sansNom = new ExceptionCardDto { lieutenant_id = "x", lieutenant = new ExceptionLieutenantDto { id = "x", name = "" } };
            Assert.AreEqual("Votre lieutenant", ExceptionBandes.Locuteur(sansNom), "pile antérieure à C3 : le repli qui ne nomme personne");
        }
    }
}
