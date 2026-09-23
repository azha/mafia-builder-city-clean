using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // ecran_conflit « Le conflit » (㉙) — mesuré en direct sur la pile de dev le 2026-09-03
    // (comptes `operational_demo@example.test` ET un signup frais, via `rtk proxy curl` — un
    // `curl` nu sur cet arbre rend un SCHÉMA DE TYPES au lieu du corps réel). Idiome
    // enveloppe/payload/data + Idempotency-Key sur les mutations, patron
    // `DailyReviewClient`/`ReputationClient` (㊲, la référence à deux juges). Routes couvertes :
    // GET /v1/me/engagements                (aucun paramètre)
    // GET /v1/lieutenants                    (aucun paramètre — pas dans le brief, ajoutée : SEULE
    //                                          route qui porte `archetype`, voir ConflitScreenController)
    // POST /v1/me/engagements                {lieutenant_id, target_rival_key, target_holding_id?} ⇒ {engagement_id}
    public class ConflitClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>`GET /v1/me/engagements` — `{engagements: EngagementView[]}` (7 clés, voir `EngagementDto`) ; mesuré
        /// VIDE sur les comptes sondés le 2026-09-03.</summary>
        public IEnumerator GetEngagements(string bearer,
                                     Action<GetEngagementsResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/me/engagements"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetEngagementsResponseDto dto =
                        JsonUtility.FromJson<GetEngagementsEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetEngagements)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/me/engagements a échoué ({req.responseCode}) {req.error}");
            }
        }

        /// <summary>`GET /v1/lieutenants` — mesuré (2026-09-03) : `{lieutenants: [...]}`, 6 clés
        /// chacun, dont `archetype` — le SEUL endroit qui le rend (`interior.lieutenants[]` ne
        /// rend que `{lieutenant_id, name}`, sans archétype — voir `ConflitScreenController`).</summary>
        public IEnumerator GetLieutenants(string bearer,
                                     Action<GetLieutenantsResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/lieutenants"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetLieutenantsResponseDto dto =
                        JsonUtility.FromJson<GetLieutenantsEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetLieutenants)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/lieutenants a échoué ({req.responseCode}) {req.error}");
            }
        }

        /// <summary>Le corps EXACT que `PostEngagements` envoie : `target_holding_id` est OMIS quand aucun axe n'est choisi
        /// (le back refuse `""` en 422 : un axe présent doit être un des 5). Public pour que le test lise le corps envoyé,
        /// pas une copie de sa construction.</summary>
        public static string CorpsEnvoye(PostEngagementsBody corps)
        {
            if (corps == null) return "{}";
            if (!string.IsNullOrEmpty(corps.target_holding_id)) return JsonUtility.ToJson(corps);
            return JsonUtility.ToJson(new PostEngagementsBodySansAxe
            {
                lieutenant_id = corps.lieutenant_id,
                target_rival_key = corps.target_rival_key,
            });
        }

        /// <summary>`POST /v1/me/engagements` — `{lieutenant_id, target_rival_key, target_holding_id?}` ⇒ `{engagement_id}`
        /// (voir `PostEngagementsResponseDto` pour les erreurs). Idempotency-Key posée : l'`IdempotencyInterceptor` global
        /// du back l'honore (`engagements.controller.ts:115`).</summary>
        public IEnumerator PostEngagements(string bearer, PostEngagementsBody corps,
                                     Action<PostEngagementsResponseDto> onOk, Action<long, string> onErr)
        {
            string json = CorpsEnvoye(corps);
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/me/engagements", "POST"))
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
                    PostEngagementsResponseDto dto =
                        JsonUtility.FromJson<PostEngagementsEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostEngagements)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/me/engagements a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
    }
}
