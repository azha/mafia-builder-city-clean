using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // screen_c6 « Horizon » — squelette généré par Tools/nouvel-ecran.py, MÉTIER ICI partout où
    // le corps RÉEL n'a pas encore été mesuré. Idiome enveloppe/payload/data + Idempotency-Key
    // sur les mutations, patron `DailyReviewClient`/`ReputationClient` (㊲, la référence à deux
    // juges). Routes couvertes :
    // GET /v1/meta/horizon-feed
    // POST /v1/meta/horizon/adopt
    // POST /v1/meta/horizon-feed/:cardId/defer
    // POST /v1/meta/horizon-feed/:cardId/dismiss
    public class HorizonClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>`GET /v1/meta/horizon-feed` → `{ cards: [...] }`.
        /// MESURÉ le 2026-09-02 sur le compte de démo : la route rend 200 avec `cards` — vide sur ce
        /// compte, ce qui est un ÉTAT et non une panne (l'écran a son cadre « rien à l'horizon »).
        /// La forme d'une carte est lue à la source (`horizon-feed.service.ts:74-84`), 9 clés.
        /// ⚠️ Le corps mesuré étant vide, la forme des cartes n'est PAS confirmée par un corps réel
        /// non vide — elle l'est par la source. Différence à garder en tête : une interface
        /// TypeScript dit ce que le back CROIT envoyer, un corps dit ce qu'il envoie.</summary>
        public IEnumerator GetMetaHorizonFeed(string bearer,
                                     Action<GetMetaHorizonFeedResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/meta/horizon-feed"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetMetaHorizonFeedResponseDto dto =
                        JsonUtility.FromJson<GetMetaHorizonFeedEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetMetaHorizonFeed)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/meta/horizon-feed a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`POST /v1/meta/horizon/adopt` → réponse non consommée : l'écran RECHARGE le flux après l'action.
        /// Mesure du 2026-09-02 : non exercée (le compte de démo n'a aucune carte à adopter,
        /// différer ou écarter). La route est écrite d'après son contrôleur, pas d'après un
        /// appel réussi — et c'est dit ici plutôt que supposé acquis.
        /// Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du back l'honore,
        /// qu'un `@Idempotent` explicite soit présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostMetaHorizonAdopt(string bearer, PostMetaHorizonAdoptBody corps,
                                     Action<PostMetaHorizonAdoptResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/meta/horizon/adopt", "POST"))
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
                    PostMetaHorizonAdoptResponseDto dto =
                        JsonUtility.FromJson<PostMetaHorizonAdoptEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostMetaHorizonAdopt)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/meta/horizon/adopt a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
        /// <summary>`POST /v1/meta/horizon-feed/:cardId/defer` → réponse non consommée : l'écran RECHARGE le flux après l'action.
        /// Mesure du 2026-09-02 : non exercée (le compte de démo n'a aucune carte à adopter,
        /// différer ou écarter). La route est écrite d'après son contrôleur, pas d'après un
        /// appel réussi — et c'est dit ici plutôt que supposé acquis.
        /// Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du back l'honore,
        /// qu'un `@Idempotent` explicite soit présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostMetaHorizonFeedDefer(string bearer, string cardId, PostMetaHorizonFeedDeferBody corps,
                                     Action<PostMetaHorizonFeedDeferResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/meta/horizon-feed/" + UnityWebRequest.EscapeURL(cardId) + "/defer", "POST"))
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
                    PostMetaHorizonFeedDeferResponseDto dto =
                        JsonUtility.FromJson<PostMetaHorizonFeedDeferEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostMetaHorizonFeedDefer)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/meta/horizon-feed/:cardId/defer a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
        /// <summary>`POST /v1/meta/horizon-feed/:cardId/dismiss` → réponse non consommée : l'écran RECHARGE le flux après l'action.
        /// Mesure du 2026-09-02 : non exercée (le compte de démo n'a aucune carte à adopter,
        /// différer ou écarter). La route est écrite d'après son contrôleur, pas d'après un
        /// appel réussi — et c'est dit ici plutôt que supposé acquis.
        /// Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du back l'honore,
        /// qu'un `@Idempotent` explicite soit présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostMetaHorizonFeedDismiss(string bearer, string cardId, PostMetaHorizonFeedDismissBody corps,
                                     Action<PostMetaHorizonFeedDismissResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/meta/horizon-feed/" + UnityWebRequest.EscapeURL(cardId) + "/dismiss", "POST"))
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
                    PostMetaHorizonFeedDismissResponseDto dto =
                        JsonUtility.FromJson<PostMetaHorizonFeedDismissEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostMetaHorizonFeedDismiss)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/meta/horizon-feed/:cardId/dismiss a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
    }
}
