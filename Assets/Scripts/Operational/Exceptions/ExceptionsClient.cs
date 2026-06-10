using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.Operational.Exceptions
{
    // IMPLEMENTS: spec §4-T1 — the Exception Queue API client (P14/P16 backend). Mirrors BuildingCardClient:
    // UnityWebRequest coroutine + concrete-envelope JsonUtility parsing, Bearer auth, UUID-v4 Idempotency-Key on
    // the mutation, readable error mapping (F2 — never a raw HTTP code to the player).
    public class ExceptionsClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>GET /v1/exceptions/queue — the player's PENDING cards, R2.2 band-projected.
        /// onOk(cards) on 2xx (empty array when none); onErr(code, message) otherwise.</summary>
        public IEnumerator GetQueue(string bearer, Action<ExceptionCardDto[]> onOk, Action<long, string> onErr)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/exceptions/queue";
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    ExceptionCardDto[] cards = null;
                    try { cards = JsonUtility.FromJson<ExceptionQueueEnvelope>(req.downloadHandler.text)?.payload?.data?.exceptions; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    onOk?.Invoke(cards ?? Array.Empty<ExceptionCardDto>());
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        /// <summary>POST /v1/exceptions/:id/resolve { method, chosen_action_id } — resolve ONE owned pending card.
        /// onOk(dto) with the qualitative outcome on 200; onErr(code, readable) on 404 not-owned / 409 not-pending /
        /// 422 bad method or un-addable candidate.</summary>
        public IEnumerator Resolve(string exceptionId, string method, string chosenActionId, string bearer,
            Action<ResolveResponse> onOk, Action<long, string> onErr)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/exceptions/{exceptionId}/resolve";
            string body = JsonUtility.ToJson(new ResolveRequest { method = method, chosen_action_id = chosenActionId });
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
                    ResolveResponse dto = null;
                    try { dto = JsonUtility.FromJson<ResolveEnvelope>(req.downloadHandler.text)?.payload?.data; }
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
