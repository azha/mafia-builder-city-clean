using System;
using System.Collections;
using System.Reflection;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;      // AuthClient
using MafiaCleanCity.Operational;  // BuildingCardDto, BuildingCardClient
using MafiaCleanCity.Shell;        // SessionClient, SessionOpenDto (starter-kit grant)
using MafiaCleanCity.Tests;        // SeederSupport

namespace MafiaCleanCity.Operational.Tests
{
    // W3.U2 C7 (design §3 C7, D7 — U-8) — C7-F2 : les 3 clés de maintenance
    // (lapse_phase_bucket / days_until_maintenance_due / maintenance_in_progress) sont PARSÉES
    // depuis une vraie réponse de GET /v1/operational/building/:id.
    //
    // ⚠️ Exécutée AVANT l'ajout des champs à BuildingCardDto (D7 mesuré : `JsonUtility` les ignore
    // EN SILENCE, sans erreur — « c'est exactement pourquoi le trou a survécu à 04f-A »), cette
    // assertion DOIT ÉCHOUER. La vérification passe par RÉFLEXION (jamais un accès de champ direct)
    // précisément pour que CE FICHIER COMPILE dans les DEUX états (avant/après le correctif) : avant,
    // `typeof(BuildingCardDto).GetField("lapse_phase_bucket")` rend `null` — Assert.IsNotNull rougit
    // ici. Après, le champ existe ET porte la valeur reçue sur le fil (comparée à la valeur EXTRAITE
    // du JSON brut, jamais un simple "non-null" qui confondrait une vraie valeur et un défaut C#).
    //
    // Ordre de rejeu à la fenêtre groupée (Tools/w3u2-c7-notes.md § RUNS DIFFÉRÉS) : checkout du
    // commit qui introduit CE fichier SEUL (avant le correctif BuildingCardDtos.cs) → run → ROUGE
    // attendu sur les 3 `Assert.IsNotNull` de FieldInfo → checkout du tip (après le correctif
    // séparé) → run → VERT.
    [Category("W3U2")]
    public class BuildingCardMaintenanceKeysPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;

        private static IEnumerator SignUpAndOpenSession(Action<string, string> onTokenAndCallsign)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("c7m", ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u2-c7m-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");

            var sessionClient = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto payload = null;
            yield return sessionClient.OpenSession(token, "e2e-w3u2-c7m", dto => payload = dto,
                (c, m) => Assert.Fail($"session/open failed: {c}: {m}"));
            Assert.IsNotNull(payload, "session/open must succeed — it grants the starter kit");

            onTokenAndCallsign(token, callsign);
        }

        [UnityTest]
        public IEnumerator C7F2_MaintenanceKeys_ParsedFromRealResponse_TypedValueEqualsWireValue()
        {
            string token = null, callsign = null;
            yield return SignUpAndOpenSession((t, c) => { token = t; callsign = c; });
            string playerId = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsign}';");
            Assert.IsTrue(SeederSupport.IsUuid(playerId), $"resolved a real player_id: '{playerId}'");

            // Le LAB du starter kit — grant déterministe (onboarding-grant.service.ts, GRANT_BUILDINGS[0]
            // = 'lab'). Table réelle vérifiée dans le schéma (city_state.ts:143-144 : pgTable('buildings',
            // ...) — le symbole Drizzle est singulier ('building') mais la table SQL est PLURIELLE).
            string buildingId = SeederSupport.RunDevPsql(
                "SELECT b.building_id FROM buildings b " +
                "JOIN building_operational_state bos ON bos.building_id = b.building_id " +
                $"WHERE b.player_id = '{playerId}' AND bos.operational_type = 'lab' LIMIT 1;");
            Assert.IsTrue(SeederSupport.IsUuid(buildingId), $"resolved a real lab building_id: '{buildingId}'");

            // Ground truth — le TEXTE BRUT du fil, indépendant de tout champ déclaré sur BuildingCardDto.
            string rawJson = null;
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + $"/v1/operational/building/{buildingId}"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result, $"ground-truth building-card GET failed: {req.error}");
                rawJson = req.downloadHandler.text;
            }
            Assert.IsTrue(rawJson.Contains("\"lapse_phase_bucket\""), "le serveur envoie déjà 'lapse_phase_bucket' (D7 mesuré) — ground truth");
            Assert.IsTrue(rawJson.Contains("\"days_until_maintenance_due\""), "le serveur envoie déjà 'days_until_maintenance_due' (D7 mesuré) — ground truth");
            Assert.IsTrue(rawJson.Contains("\"maintenance_in_progress\""), "le serveur envoie déjà 'maintenance_in_progress' (D7 mesuré) — ground truth");

            string wireLapse = Regex.Match(rawJson, "\"lapse_phase_bucket\"\\s*:\\s*\"([^\"]*)\"").Groups[1].Value;
            string wireDays = Regex.Match(rawJson, "\"days_until_maintenance_due\"\\s*:\\s*(-?\\d+)").Groups[1].Value;
            string wireInProgress = Regex.Match(rawJson, "\"maintenance_in_progress\"\\s*:\\s*(true|false)").Groups[1].Value;
            Assert.IsFalse(string.IsNullOrEmpty(wireLapse), "wire lapse_phase_bucket extrait");
            Assert.IsFalse(string.IsNullOrEmpty(wireDays), "wire days_until_maintenance_due extrait");
            Assert.IsFalse(string.IsNullOrEmpty(wireInProgress), "wire maintenance_in_progress extrait");

            // Le client TYPÉ — lu par RÉFLEXION pour que ce fichier compile AVANT le correctif aussi.
            var client = new BuildingCardClient { BaseUrl = BaseUrl };
            BuildingCardDto dto = null;
            long errCode = -1;
            string errMsg = null;
            yield return client.GetBuildingCard(buildingId, token, d => dto = d, (c, m) => { errCode = c; errMsg = m; });
            Assert.AreEqual(-1, errCode, $"building-card fetch must succeed: {errMsg}");
            Assert.IsNotNull(dto, "building-card parsed through payload.data");

            Type dtoType = typeof(BuildingCardDto);
            FieldInfo lapseField = dtoType.GetField("lapse_phase_bucket");
            FieldInfo daysField = dtoType.GetField("days_until_maintenance_due");
            FieldInfo progressField = dtoType.GetField("maintenance_in_progress");

            Assert.IsNotNull(lapseField,
                "BuildingCardDto doit déclarer 'lapse_phase_bucket' (D7) — AVANT le correctif c'est le trou " +
                "silencieux exact que ce test épingle (JsonUtility ignore une clé non déclarée SANS erreur).");
            Assert.IsNotNull(daysField, "BuildingCardDto doit déclarer 'days_until_maintenance_due' (D7)");
            Assert.IsNotNull(progressField, "BuildingCardDto doit déclarer 'maintenance_in_progress' (D7)");

            Assert.AreEqual(wireLapse, (string)lapseField.GetValue(dto), "lapse_phase_bucket typé == valeur du fil");
            Assert.AreEqual(wireDays, ((int)daysField.GetValue(dto)).ToString(), "days_until_maintenance_due typé == valeur du fil");
            Assert.AreEqual(wireInProgress, ((bool)progressField.GetValue(dto)).ToString().ToLowerInvariant(),
                "maintenance_in_progress typé == valeur du fil");
        }
    }
}
