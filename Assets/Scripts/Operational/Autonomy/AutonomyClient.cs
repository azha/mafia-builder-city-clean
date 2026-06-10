using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.Networking;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.Operational.Autonomy
{
    // IMPLEMENTS: spec §4-T3 — the Autonomy Inbox API client (P21 backend). Mirrors ExceptionsClient:
    // UnityWebRequest coroutine + concrete-envelope JsonUtility parsing, Bearer auth, UUID-v4 Idempotency-Key on
    // mutations, readable error mapping (F2 — never a raw HTTP code to the player).
    public class AutonomyClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>GET /v1/autonomy-reports — the pending autonomy reports (one per lieutenant with issues).
        /// onOk(reports) on 2xx (empty array when none); onErr(code, message) otherwise.</summary>
        public IEnumerator GetReports(string bearer, Action<AutonomyReportDto[]> onOk, Action<long, string> onErr)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/autonomy-reports";
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    AutonomyReportDto[] reports = null;
                    try { reports = JsonUtility.FromJson<AutonomyReportsEnvelope>(req.downloadHandler.text)?.payload?.data?.reports; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    onOk?.Invoke(reports ?? Array.Empty<AutonomyReportDto>());
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        /// <summary>POST /v1/autonomy-reports/{reportId}/issues/{issueId}/resolve { chosen: "A"|"B" }.
        /// onOk(dto) with the qualitative outcome on 200; onErr(code, readable) on 404/409/422.</summary>
        public IEnumerator ResolveIssue(string reportId, string issueId, string chosen, string bearer,
            Action<ResolveIssueResponse> onOk, Action<long, string> onErr)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/autonomy-reports/{reportId}/issues/{issueId}/resolve";
            string body = JsonUtility.ToJson(new ResolveIssueRequest { chosen = chosen });
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = TimeoutSeconds;
                req.SetRequestHeader("Content-Type", "application/json");
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString()); // UUID v4 — backend mandate
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    ResolveIssueResponse dto = null;
                    try { dto = JsonUtility.FromJson<ResolveIssueEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    if (dto == null || !dto.resolved) { onErr?.Invoke(req.responseCode, "empty resolve payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        /// <summary>POST /v1/lieutenants/{id}/autonomy/decision { kind: "reset_budget"|"raise_ceiling"|"override_one_shot" }.
        /// onOk() on 200 applied; onErr(code, readable) on 422/404/409-cooldown.</summary>
        public IEnumerator SendDecision(string lieutenantId, string kind, string bearer,
            Action onOk, Action<long, string> onErr)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/lieutenants/{lieutenantId}/autonomy/decision";
            string body = JsonUtility.ToJson(new DecisionRequest { kind = kind });
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = TimeoutSeconds;
                req.SetRequestHeader("Content-Type", "application/json");
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString()); // UUID v4 — backend mandate
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    DecisionResponse dto = null;
                    try { dto = JsonUtility.FromJson<DecisionEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    if (dto == null || !dto.applied) { onErr?.Invoke(req.responseCode, "empty decision payload"); yield break; }
                    onOk?.Invoke();
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        /// <summary>GET /v1/lieutenants/{id} — extract budget_bands from raw body.
        /// budget_bands is a JSON map (JsonUtility-unparseable). The key set AND the band values are CLOSED
        /// domains, so per-key regex extraction is exact. onOk(bands) always on 2xx (empty list if absent).</summary>
        public IEnumerator GetBudgetBands(string lieutenantId, string bearer,
            Action<List<KeyValuePair<string, string>>> onOk, Action<long, string> onErr)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/lieutenants/{lieutenantId}";
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    onOk?.Invoke(ExtractBudgetBands(req.downloadHandler.text));
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        private static readonly string[] Categories = {
            "PRODUCTION_OPS", "LOGISTICS_ROUTING", "DISTRIBUTION_DISPATCH", "LAUNDERING_FLOW",
            "SECURITY_RESPONSE", "BOOKKEEPING_AUDIT", "CROSS_CATEGORY_INCIDENT" };
        // budget_bands is a JSON map (JsonUtility-unparseable). The key set AND the band values are CLOSED
        // domains, so a per-key regex extraction over the raw body is exact: "<CAT>":"<band>".
        internal static List<KeyValuePair<string, string>> ExtractBudgetBands(string json)
        {
            var bands = new List<KeyValuePair<string, string>>();
            foreach (string cat in Categories)
            {
                Match m = Regex.Match(json ?? "", "\"" + cat + "\"\\s*:\\s*\"(depleted|low|nominal|full)\"");
                if (m.Success) bands.Add(new KeyValuePair<string, string>(cat, m.Groups[1].Value));
            }
            return bands;
        }

        // Map a non-2xx to the human error-envelope message (F2) — verbatim the BuildingCardClient helper.
        private static string ReadableError(UnityWebRequest req)
        {
            string text = req.downloadHandler != null ? req.downloadHandler.text : null;
            if (!string.IsNullOrEmpty(text))
            {
                try
                {
                    OpErrorEnvelope env = JsonUtility.FromJson<OpErrorEnvelope>(text);
                    string msg = env?.payload?.error?.message;
                    if (!string.IsNullOrEmpty(msg)) return msg;
                }
                catch { /* fall through to a generic message */ }
            }
            return $"request failed ({req.responseCode}) {req.error}";
        }
    }
}
