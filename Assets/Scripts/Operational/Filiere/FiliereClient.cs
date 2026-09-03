using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // screen_c2 « Filiere » — squelette généré par Tools/nouvel-ecran.py, MÉTIER ICI partout où
    // le corps RÉEL n'a pas encore été mesuré. Idiome enveloppe/payload/data + Idempotency-Key
    // sur les mutations, patron `DailyReviewClient`/`ReputationClient` (㊲, la référence à deux
    // juges). Routes couvertes :
    // GET /v1/laundering/:nodeId
    // GET /v1/laundering/:nodeId/pipeline
    // POST /v1/laundering/inject
    // POST /v1/laundering/stage
    public class FiliereClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>`GET /v1/laundering/:nodeId` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré —
        /// dériver `GetLaunderingResponseDto` du CORPS RÉEL (juge-données), jamais de l'interface
        /// TypeScript back lue seule.</summary>
        public IEnumerator GetLaundering(string bearer, string nodeId,
                                     Action<GetLaunderingResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/laundering/" + UnityWebRequest.EscapeURL(nodeId)))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetLaunderingResponseDto dto =
                        JsonUtility.FromJson<GetLaunderingEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetLaundering)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/laundering/:nodeId a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`GET /v1/laundering/:nodeId/pipeline` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré —
        /// dériver `GetLaunderingPipelineResponseDto` du CORPS RÉEL (juge-données), jamais de l'interface
        /// TypeScript back lue seule.</summary>
        public IEnumerator GetLaunderingPipeline(string bearer, string nodeId,
                                     Action<GetLaunderingPipelineResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/laundering/" + UnityWebRequest.EscapeURL(nodeId) + "/pipeline"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetLaunderingPipelineResponseDto dto =
                        JsonUtility.FromJson<GetLaunderingPipelineEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetLaunderingPipeline)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/laundering/:nodeId/pipeline a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`POST /v1/laundering/inject` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré.
        /// Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du back l'honore,
        /// qu'un `@Idempotent` explicite soit présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostLaunderingInject(string bearer, PostLaunderingInjectBody corps,
                                     Action<PostLaunderingInjectResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/laundering/inject", "POST"))
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
                    PostLaunderingInjectResponseDto dto =
                        JsonUtility.FromJson<PostLaunderingInjectEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostLaunderingInject)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/laundering/inject a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
        /// <summary>`POST /v1/laundering/stage` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré.
        /// Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du back l'honore,
        /// qu'un `@Idempotent` explicite soit présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostLaunderingStage(string bearer, PostLaunderingStageBody corps,
                                     Action<PostLaunderingStageResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/laundering/stage", "POST"))
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
                    PostLaunderingStageResponseDto dto =
                        JsonUtility.FromJson<PostLaunderingStageEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostLaunderingStage)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/laundering/stage a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
    }
}
