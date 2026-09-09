using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C8 — the 4 `flag-discipline.controller.ts` player routes. Mirrors every other
    // client's envelope/payload/data idiom + Idempotency-Key on mutations (the app-wide
    // `IdempotencyInterceptor` honours it regardless of an explicit `@Idempotent` marker — file
    // header of `flag-discipline.controller.ts`).
    public class DailyReviewClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        public IEnumerator GetFlagReview(string bearer, Action<FlagReviewResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/flag-review"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    FlagReviewResponseDto dto = JsonUtility.FromJson<FlagReviewEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "empty flag-review payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode, $"flag-review GET failed ({req.responseCode}) {req.error}");
            }
        }

        public IEnumerator Validate(string bearer, string flagId, Action<FlagVerdictResponseDto> onOk, Action<long, string> onErr) =>
            Verdict($"/v1/flag-review/{flagId}/validate", bearer, onOk, onErr);

        public IEnumerator Dismiss(string bearer, string flagId, Action<FlagVerdictResponseDto> onOk, Action<long, string> onErr) =>
            Verdict($"/v1/flag-review/{flagId}/dismiss", bearer, onOk, onErr);

        private IEnumerator Verdict(string path, string bearer, Action<FlagVerdictResponseDto> onOk, Action<long, string> onErr)
        {
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + path, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes("{}"));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.timeout = TimeoutSeconds;
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    FlagVerdictResponseDto dto = JsonUtility.FromJson<FlagVerdictEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "empty verdict payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode, $"{path} failed ({req.responseCode}) {req.error}");
            }
        }

        public IEnumerator BatchConfirm(string bearer, Action<BatchConfirmResponseDto> onOk, Action<long, string> onErr)
        {
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/flag-review/batch-confirm", UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes("{}"));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.timeout = TimeoutSeconds;
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    BatchConfirmResponseDto dto = JsonUtility.FromJson<BatchConfirmEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "empty batch-confirm payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode, $"batch-confirm failed ({req.responseCode}) {req.error}");
            }
        }
    }
}
