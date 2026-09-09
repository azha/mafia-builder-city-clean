using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // screen_c1 « Journal » — squelette généré par Tools/nouvel-ecran.py, MÉTIER ICI partout où
    // le corps RÉEL n'a pas encore été mesuré. Idiome enveloppe/payload/data + Idempotency-Key
    // sur les mutations, patron `DailyReviewClient`/`ReputationClient` (㊲, la référence à deux
    // juges). Routes couvertes :
    // GET /v1/news/feed
    // GET /v1/news/beats/:id
    // GET /v1/ambient/feed
    // POST /v1/ambient/attend/:id
    // GET /v1/random-world/active
    // GET /v1/random-world/known-couplings
    // POST /v1/random-world/hollow/:eventId/attend-funeral
    public class JournalClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>`GET /v1/news/feed` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré —
        /// dériver `GetNewsFeedResponseDto` du CORPS RÉEL (juge-données), jamais de l'interface
        /// TypeScript back lue seule.</summary>
        public IEnumerator GetNewsFeed(string bearer,
                                     Action<GetNewsFeedResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/news/feed"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetNewsFeedResponseDto dto =
                        JsonUtility.FromJson<GetNewsFeedEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetNewsFeed)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/news/feed a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`GET /v1/news/beats/:id` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré —
        /// dériver `GetNewsBeatsResponseDto` du CORPS RÉEL (juge-données), jamais de l'interface
        /// TypeScript back lue seule.</summary>
        public IEnumerator GetNewsBeats(string bearer, string id,
                                     Action<GetNewsBeatsResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/news/beats/" + UnityWebRequest.EscapeURL(id)))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetNewsBeatsResponseDto dto =
                        JsonUtility.FromJson<GetNewsBeatsEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetNewsBeats)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/news/beats/:id a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`GET /v1/ambient/feed` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré —
        /// dériver `GetAmbientFeedResponseDto` du CORPS RÉEL (juge-données), jamais de l'interface
        /// TypeScript back lue seule.</summary>
        public IEnumerator GetAmbientFeed(string bearer,
                                     Action<GetAmbientFeedResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/ambient/feed"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetAmbientFeedResponseDto dto =
                        JsonUtility.FromJson<GetAmbientFeedEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetAmbientFeed)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/ambient/feed a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`POST /v1/ambient/attend/:id` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré.
        /// Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du back l'honore,
        /// qu'un `@Idempotent` explicite soit présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostAmbientAttend(string bearer, string id, PostAmbientAttendBody corps,
                                     Action<PostAmbientAttendResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/ambient/attend/" + UnityWebRequest.EscapeURL(id), "POST"))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(json));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.timeout = TimeoutSeconds;
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    PostAmbientAttendResponseDto dto =
                        JsonUtility.FromJson<PostAmbientAttendEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostAmbientAttend)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/ambient/attend/:id a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
        /// <summary>`GET /v1/random-world/active` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré —
        /// dériver `GetRandomWorldActiveResponseDto` du CORPS RÉEL (juge-données), jamais de l'interface
        /// TypeScript back lue seule.</summary>
        public IEnumerator GetRandomWorldActive(string bearer,
                                     Action<GetRandomWorldActiveResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/random-world/active"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetRandomWorldActiveResponseDto dto =
                        JsonUtility.FromJson<GetRandomWorldActiveEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetRandomWorldActive)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/random-world/active a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`GET /v1/random-world/known-couplings` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré —
        /// dériver `GetRandomWorldKnownCouplingsResponseDto` du CORPS RÉEL (juge-données), jamais de l'interface
        /// TypeScript back lue seule.</summary>
        public IEnumerator GetRandomWorldKnownCouplings(string bearer,
                                     Action<GetRandomWorldKnownCouplingsResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/random-world/known-couplings"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetRandomWorldKnownCouplingsResponseDto dto =
                        JsonUtility.FromJson<GetRandomWorldKnownCouplingsEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetRandomWorldKnownCouplings)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/random-world/known-couplings a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`POST /v1/random-world/hollow/:eventId/attend-funeral` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré.
        /// Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du back l'honore,
        /// qu'un `@Idempotent` explicite soit présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostRandomWorldHollowAttendFuneral(string bearer, string eventId, PostRandomWorldHollowAttendFuneralBody corps,
                                     Action<PostRandomWorldHollowAttendFuneralResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/random-world/hollow/" + UnityWebRequest.EscapeURL(eventId) + "/attend-funeral", "POST"))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(json));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.timeout = TimeoutSeconds;
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    PostRandomWorldHollowAttendFuneralResponseDto dto =
                        JsonUtility.FromJson<PostRandomWorldHollowAttendFuneralEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostRandomWorldHollowAttendFuneral)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/random-world/hollow/:eventId/attend-funeral a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
    }
}
