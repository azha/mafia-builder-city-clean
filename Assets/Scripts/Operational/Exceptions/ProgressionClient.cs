using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational.Exceptions
{
    // IMPLEMENTS: spec §4-T1 — GET /v1/progression (P17 backend): the player's vocab tier + a qualitative
    // progress band. Shared by the Dashboard (vocab line) and the rule editor (Tier-2 gating). House idiom.

    [Serializable] public class ProgressionDto { public int vocabulary_tier; public string progress_to_next; }
    [Serializable] public class ProgressionPayload { public ProgressionDto data; }
    [Serializable] public class ProgressionEnvelope { public ProgressionPayload payload; }

    public class ProgressionClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>GET /v1/progression — { vocabulary_tier: 1..6, progress_to_next: LOCKED|IN_PROGRESS|UNLOCKED }.</summary>
        public IEnumerator GetProgression(string bearer, Action<ProgressionDto> onOk, Action<long, string> onErr)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/progression";
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    ProgressionDto dto = null;
                    try { dto = JsonUtility.FromJson<ProgressionEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    if (dto == null || dto.vocabulary_tier <= 0) { onErr?.Invoke(req.responseCode, "empty progression payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, "progression request failed (" + req.responseCode + ") " + req.error);
                }
            }
        }
    }
}
