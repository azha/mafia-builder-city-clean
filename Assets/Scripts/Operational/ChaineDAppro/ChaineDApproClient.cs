using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // ecran_appro « La chaîne d'appro » — mesuré en direct sur la pile de dev le 2026-09-03 (compte
    // `operational_demo@example.test`) — voir ChaineDApproDtos.cs pour le détail des corps.
    // Idiome enveloppe/payload/data + Idempotency-Key sur les mutations, patron
    // `DailyReviewClient`/`ReputationClient` (㊲, la référence à deux juges). Routes couvertes :
    // GET /v1/operational/precursors?building_id=<uuid>   (⚠️ le paramètre est OBLIGATOIRE : sans
    //                                                       lui, 422 "building_id query param is required")
    // POST /v1/operational/precursors/order
    // GET /v1/supply-chain/graph                          (⚠️ SANS le préfixe operational/)
    // POST /v1/supply-chain/legs/:id/maintain              (non câblée cette passe — voir DTOs)
    public class ChaineDApproClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>`GET /v1/operational/precursors?building_id=<uuid>` — mesuré (2026-09-03) : 9
        /// clés (voir `GetOperationalPrecursorsResponseDto`). `buildingId` est OBLIGATOIRE — la
        /// route rend 422 « building_id query param is required » sans lui ; ce client ne devine
        /// jamais un identifiant, l'appelant doit l'avoir découvert (voir
        /// `ChaineDApproScreenController.DecouvrirBuildingId`).</summary>
        public IEnumerator GetOperationalPrecursors(string bearer, string buildingId,
                                     Action<GetOperationalPrecursorsResponseDto> onOk, Action<long, string> onErr)
        {
            string url = BaseUrl.TrimEnd('/') + "/v1/operational/precursors?building_id="
                         + UnityWebRequest.EscapeURL(buildingId ?? string.Empty);
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetOperationalPrecursorsResponseDto dto =
                        JsonUtility.FromJson<GetOperationalPrecursorsEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetOperationalPrecursors)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/operational/precursors?building_id={buildingId} a échoué " +
                                   $"({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`POST /v1/operational/precursors/order` — corps `{building_id, precursor_type,
        /// quantity_units}`, réponse mesurée `{order_id}` (voir `PostOperationalPrecursorsOrderBody`/
        /// `ResponseDto`). Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du back l'honore,
        /// qu'un `@Idempotent` explicite soit présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostOperationalPrecursorsOrder(string bearer, PostOperationalPrecursorsOrderBody corps,
                                     Action<PostOperationalPrecursorsOrderResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/operational/precursors/order", "POST"))
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
                    PostOperationalPrecursorsOrderResponseDto dto =
                        JsonUtility.FromJson<PostOperationalPrecursorsOrderEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostOperationalPrecursorsOrder)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/operational/precursors/order a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
        /// <summary>`GET /v1/supply-chain/graph` — mesuré (2026-09-03) : `{nodes, legs, routes}`
        /// (voir `GetSupplyChainGraphResponseDto`). ⛔ `nodes` est VIDE sur le compte de démo —
        /// c'est le fait porteur de cet écran, voir `ChaineDApproScreenController.AppliquerChaine`.
        /// ⚠️ SANS le préfixe `operational/` dans l'URL (avec, 404 — mesuré).</summary>
        public IEnumerator GetSupplyChainGraph(string bearer,
                                     Action<GetSupplyChainGraphResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/supply-chain/graph"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetSupplyChainGraphResponseDto dto =
                        JsonUtility.FromJson<GetSupplyChainGraphEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetSupplyChainGraph)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/supply-chain/graph a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`POST /v1/supply-chain/legs/:id/maintain` — NON CÂBLÉE cette passe : elle prend
        /// un `leg_id`, et aucun n'est connu depuis un chemin joueur (même famille que
        /// `backpressure`/`trace-step`/`resolve`, écartées par le brief — voir
        /// `PostSupplyChainLegsMaintainBody`/`ResponseDto`). Le corps/la réponse ne sont donc PAS
        /// mesurés ; ce squelette reste tel quel pour qu'un futur lot le remplisse SUR MESURE plutôt
        /// que de deviner un contrat inatteignable aujourd'hui. Idempotency-Key posée par défaut
        /// (l'`IdempotencyInterceptor` global du back l'honore, qu'un `@Idempotent` explicite soit
        /// présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostSupplyChainLegsMaintain(string bearer, string id, PostSupplyChainLegsMaintainBody corps,
                                     Action<PostSupplyChainLegsMaintainResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/supply-chain/legs/" + UnityWebRequest.EscapeURL(id) + "/maintain", "POST"))
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
                    PostSupplyChainLegsMaintainResponseDto dto =
                        JsonUtility.FromJson<PostSupplyChainLegsMaintainEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostSupplyChainLegsMaintain)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/supply-chain/legs/:id/maintain a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
    }
}
