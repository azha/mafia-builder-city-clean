using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // ecran_distribution « La distribution » — mesuré en direct sur la pile de dev le 2026-09-03
    // (compte `operational_demo@example.test`, via `rtk proxy curl` — un `curl` nu sur cet arbre
    // rend un SCHÉMA DE TYPES au lieu du corps réel, voir implementation-notes.md § Deviations).
    // Idiome enveloppe/payload/data + Idempotency-Key sur les mutations, patron
    // `DailyReviewClient`/`ReputationClient` (㊲, la référence à deux juges). Routes couvertes :
    // GET /v1/operational/couriers                    (aucun paramètre)
    // GET /v1/operational/distribution/projection      (aucun paramètre)
    // POST /v1/operational/distribution/dispatch        {from_building_id, to_building_id, cargo_grams}
    // POST /v1/operational/vehicles/purchase             {vehicle_type: foot|bike|car|refrigerated_van}
    public class DistributionClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>`GET /v1/operational/couriers` — mesuré (2026-09-03) : `{couriers: [...]}`,
        /// 3 courriers, 5 clés chacun (voir `CourierDto`).</summary>
        public IEnumerator GetOperationalCouriers(string bearer,
                                     Action<GetOperationalCouriersResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/operational/couriers"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetOperationalCouriersResponseDto dto =
                        JsonUtility.FromJson<GetOperationalCouriersEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetOperationalCouriers)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/operational/couriers a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`GET /v1/operational/distribution/projection` — mesuré (2026-09-03) :
        /// `{routes: [...]}`, 3 routes, 5 clés chacune (voir `DistributionRouteDto`). ⛔ Ni
        /// `severed` ni `saturated` n'existent dans ce corps.</summary>
        public IEnumerator GetOperationalDistributionProjection(string bearer,
                                     Action<GetOperationalDistributionProjectionResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/operational/distribution/projection"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetOperationalDistributionProjectionResponseDto dto =
                        JsonUtility.FromJson<GetOperationalDistributionProjectionEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetOperationalDistributionProjection)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/operational/distribution/projection a échoué ({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`POST /v1/operational/distribution/dispatch` — corps mesuré (422 successifs,
        /// 2026-09-03) : `{from_building_id, to_building_id, cargo_grams}`. Réponse de succès
        /// JAMAIS atteinte sur le compte de démo (stock source à zéro — voir
        /// `PostOperationalDistributionDispatchResponseDto`). Idempotency-Key posée par défaut
        /// (l'`IdempotencyInterceptor` global du back l'honore, qu'un `@Idempotent` explicite
        /// soit présent ou non côté contrôleur — patron `DailyReviewClient`) : à RETIRER si la
        /// route back ne le supporte pas.</summary>
        public IEnumerator PostOperationalDistributionDispatch(string bearer, PostOperationalDistributionDispatchBody corps,
                                     Action<PostOperationalDistributionDispatchResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/operational/distribution/dispatch", "POST"))
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
                    PostOperationalDistributionDispatchResponseDto dto =
                        JsonUtility.FromJson<PostOperationalDistributionDispatchEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostOperationalDistributionDispatch)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/operational/distribution/dispatch a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
        /// <summary>`POST /v1/operational/vehicles/purchase` — corps mesuré : `{vehicle_type}`
        /// (domaine foot|bike|car|refrigerated_van, minuscules, via le message 422). Réponse
        /// mesurée en SUCCÈS RÉEL (`vehicle_type: "bike"`) : `{ok: true}`. Idempotency-Key posée
        /// par défaut (l'`IdempotencyInterceptor` global du back l'honore, qu'un `@Idempotent`
        /// explicite soit présent ou non côté contrôleur — patron `DailyReviewClient`) : à
        /// RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostOperationalVehiclesPurchase(string bearer, PostOperationalVehiclesPurchaseBody corps,
                                     Action<PostOperationalVehiclesPurchaseResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/operational/vehicles/purchase", "POST"))
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
                    PostOperationalVehiclesPurchaseResponseDto dto =
                        JsonUtility.FromJson<PostOperationalVehiclesPurchaseEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostOperationalVehiclesPurchase)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/operational/vehicles/purchase a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
    }
}
