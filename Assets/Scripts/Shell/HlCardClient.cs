using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Shell
{
    [Serializable] public class CommitResponseDto { public bool committed; public bool structural; }
    [Serializable] public class CommitPayload { public CommitResponseDto data; }
    [Serializable] public class CommitEnvelope { public CommitPayload payload; }

    [Serializable] public class SkipResponseDto { public bool skipped; }
    [Serializable] public class SkipPayload { public SkipResponseDto data; }
    [Serializable] public class SkipEnvelope { public SkipPayload payload; }

    // W3.U1 C4 — `POST /v1/session/hl-card/:id/commit` + `.../skip` (`hl-card.controller.ts:40,50`).
    // Empty POST body (no DTO to send — the id is in the URL). Mirrors every other client's
    // envelope/payload/data idiom.
    public class HlCardClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        public IEnumerator Commit(string bearer, string cardId, Action<CommitResponseDto> onOk, Action<long, string> onErr)
        {
            yield return Post($"/v1/session/hl-card/{cardId}/commit", bearer,
                text =>
                {
                    CommitResponseDto dto = JsonUtility.FromJson<CommitEnvelope>(text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "empty commit payload"); return; }
                    onOk?.Invoke(dto);
                },
                onErr);
        }

        public IEnumerator Skip(string bearer, string cardId, Action<SkipResponseDto> onOk, Action<long, string> onErr)
        {
            yield return Post($"/v1/session/hl-card/{cardId}/skip", bearer,
                text =>
                {
                    SkipResponseDto dto = JsonUtility.FromJson<SkipEnvelope>(text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "empty skip payload"); return; }
                    onOk?.Invoke(dto);
                },
                onErr);
        }

        private IEnumerator Post(string path, string bearer, Action<string> onOk, Action<long, string> onErr)
        {
            string url = BaseUrl.TrimEnd('/') + path;
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes("{}"));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.timeout = TimeoutSeconds;
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success) onOk?.Invoke(req.downloadHandler.text);
                else onErr?.Invoke(req.responseCode, $"{path} failed ({req.responseCode}) {req.error}");
            }
        }
    }
}
