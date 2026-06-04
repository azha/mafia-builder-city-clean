using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // Reads the JWT-gated Phase-2 operational Building Card projection and drives
    // the per-building-type action endpoints. Mirrors CityMap.CityProjectionsClient:
    // a UnityWebRequest coroutine + concrete-envelope JsonUtility parsing. No mock —
    // every call hits the live dockerized stack (Traefik at https://cleancity.erutheone.eu).
    //
    // Auth: every operational endpoint needs a PLAYER Bearer (AuthClient.SignIn).
    // Mutations additionally need an Idempotency-Key header that MUST be a UUID v4
    // (the backend rejects any other shape with 400 IDEMPOTENCY_KEY_FORMAT_INVALID).
    public class BuildingCardClient
    {
        public string BaseUrl = "https://cleancity.erutheone.eu";
        public int TimeoutSeconds = 10;

        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/operational/{leaf}";

        // ------------------------------------------------------------- projection

        /// <summary>
        /// GET /v1/operational/building/:id — the Building Card projection.
        /// onOk(dto) on 2xx; onErr(code, message) on anything else.
        /// </summary>
        public IEnumerator GetBuildingCard(string buildingId, string bearer,
            Action<BuildingCardDto> onOk, Action<long, string> onErr)
        {
            string url = Url($"building/{buildingId}");
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    BuildingCardDto dto = null;
                    try { dto = JsonUtility.FromJson<BuildingCardEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }

                    if (dto == null) { onErr?.Invoke(req.responseCode, "empty building-card payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // --------------------------------------------------------------- actions

        // POST helper. Body is JSON; an idempotency UUID-v4 is attached for mutations.
        // The outcome is uniform: Ok on 2xx (with the parsed id when present), else a
        // well-formed error (status + a readable message — never a raw code to the UI).
        private IEnumerator Post(string url, string body, string bearer,
            Func<string, string> parseId, Action<ActionOutcome> done)
        {
            var outcome = new ActionOutcome { Endpoint = url };
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body ?? "{}"));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = TimeoutSeconds;
                req.SetRequestHeader("Content-Type", "application/json");
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString()); // UUID v4 — backend mandate

                yield return req.SendWebRequest();
                outcome.HttpStatus = req.responseCode;

                if (req.result == UnityWebRequest.Result.Success)
                {
                    outcome.Ok = true;
                    try { outcome.ResultId = parseId != null ? parseId(req.downloadHandler.text) : null; }
                    catch { /* a 2xx with an unexpected body still counts as wired-ok */ }
                    outcome.Message = "ok";
                }
                else
                {
                    outcome.Ok = false;
                    outcome.Message = ReadableError(req);
                }
            }
            done?.Invoke(outcome);
        }

        /// <summary>POST /v1/operational/building/:id/convert — convert a building to an M1 operational type.</summary>
        public IEnumerator Convert(string buildingId, string operationalType, string coverQuality,
            string bearer, Action<ActionOutcome> done)
        {
            string body = JsonUtility.ToJson(new ConvertRequestDto
            {
                operational_type = operationalType,
                cover_quality = coverQuality,
            });
            return Post(Url($"building/{buildingId}/convert"), body, bearer,
                json => JsonUtility.FromJson<ConvertEnvelope>(json)?.payload?.data?.converted == true ? "converted" : null,
                done);
        }

        /// <summary>POST /v1/operational/precursors/order — order Pyralin into a lab (the lab's first action).</summary>
        public IEnumerator OrderPrecursors(string labBuildingId, int quantityUnits,
            string bearer, Action<ActionOutcome> done)
        {
            string body = JsonUtility.ToJson(new OrderPrecursorRequestDto
            {
                building_id = labBuildingId,
                precursor_type = "PYRALIN",
                quantity_units = quantityUnits,
            });
            return Post(Url("precursors/order"), body, bearer,
                json => JsonUtility.FromJson<OrderEnvelope>(json)?.payload?.data?.order_id,
                done);
        }

        /// <summary>POST /v1/operational/lab/:id/cook — start a Brindle cook (empty body; lab id is the path param).</summary>
        public IEnumerator StartCook(string labBuildingId, string bearer, Action<ActionOutcome> done)
        {
            return Post(Url($"lab/{labBuildingId}/cook"), "{}", bearer,
                json => JsonUtility.FromJson<CookEnvelope>(json)?.payload?.data?.cook_session_id,
                done);
        }

        /// <summary>POST /v1/operational/laundering/inject — inject dirty cash through a front-shop into a Stage-1 node.</summary>
        public IEnumerator Inject(string frontShopId, string safehouseId, int amountCents,
            string bearer, Action<ActionOutcome> done)
        {
            string body = JsonUtility.ToJson(new InjectRequestDto
            {
                front_shop_id = frontShopId,
                safehouse_id = safehouseId,
                amount_cents = amountCents,
            });
            return Post(Url("laundering/inject"), body, bearer,
                json => JsonUtility.FromJson<InjectEnvelope>(json)?.payload?.data?.node_id,
                done);
        }

        /// <summary>
        /// POST /v1/operational/building/:id/repair (Phase-2b) — repair a DAMAGED building (empty body; the building id
        /// is the path param). Debits the wallet by the grounded repair cost → structural_state='repairing'. 200
        /// { repairing: true }. Not DAMAGED / insufficient cash → 409 (a well-formed error, mapped to a readable msg).
        /// </summary>
        public IEnumerator Repair(string buildingId, string bearer, Action<ActionOutcome> done)
        {
            return Post(Url($"building/{buildingId}/repair"), "{}", bearer,
                json => JsonUtility.FromJson<RepairEnvelope>(json)?.payload?.data?.repairing == true ? "repairing" : null,
                done);
        }

        // ----------------------------------------------------------- wallet (affordability gate)

        /// <summary>
        /// GET /v1/economy/wallet — the player's qualitative wallet band (REUSE the economy projection; §11). Read only
        /// to gate the Repair button's affordability (repair_cost band vs wallet band — never raw cents; R2.2). onOk
        /// with the band string on 2xx; onErr otherwise (a wallet read failure leaves the gate conservative).
        /// </summary>
        public IEnumerator GetWalletBand(string bearer, Action<string> onOk, Action<long, string> onErr)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/economy/wallet";
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    string band = null;
                    try { band = JsonUtility.FromJson<WalletEnvelope>(req.downloadHandler.text)?.payload?.data?.wallet_band; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    if (string.IsNullOrEmpty(band)) { onErr?.Invoke(req.responseCode, "empty wallet payload"); yield break; }
                    onOk?.Invoke(band);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // --------------------------------------------------------------- helpers

        // Map a non-2xx into a readable string. We deliberately surface the operational
        // error envelope's `message` (a human sentence) rather than a raw HTTP code to
        // the player (F2: never a bare 503/ERR_NETWORK). The status is kept separately
        // on the outcome for the wiring assertion / logs.
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

    // Minimal mirror of the non-success envelope (Tools/OPERATIONAL_CONTRACTS.md §9)
    // so the client can render the human `message` instead of a raw code (F2).
    [Serializable] public class OpErrorEnvelope { public OpErrorPayload payload; }
    [Serializable] public class OpErrorPayload { public OpError error; }
    [Serializable] public class OpError { public string code; public int http_status; public string message; public string user_facing_i18n_key; }
}
