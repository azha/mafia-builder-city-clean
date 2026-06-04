using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // Reads the JWT-gated Home-Dashboard projections (the wallet band — the
    // "encaisser" payoff of the M1 loop — and the optional /v1/me player header).
    // Mirrors BuildingCardClient: a UnityWebRequest coroutine + concrete-envelope
    // JsonUtility parsing. No mock — every call hits the live dockerized stack
    // (Traefik at http://localhost).
    //
    // Auth: both endpoints need a PLAYER Bearer (AuthClient.SignIn). These are
    // read-only GETs — no Idempotency-Key (that header is mandated only on the
    // mutating operational actions; see BuildingCardClient.Post).
    //
    // The citywide heat band is NOT fetched here — the dashboard REUSES
    // CityMap.WorldApiClient.GetDistrictHeat (the same client the City Map uses);
    // this client owns only the economy + identity surfaces.
    //
    // The OpErrorEnvelope / OpError types + the readable-error mapping are declared
    // once in BuildingCardClient.cs (same assembly) and REUSED here.
    public class DashboardClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        public string WalletUrl => BaseUrl.TrimEnd('/') + "/v1/economy/wallet";
        public string MeUrl => BaseUrl.TrimEnd('/') + "/v1/me";

        /// <summary>
        /// GET /v1/economy/wallet — the player's qualitative wallet band.
        /// onOk(dto) on 2xx; onErr(code, message) on anything else (401 unauth / 404 no player).
        /// </summary>
        public IEnumerator GetWallet(string bearer, Action<WalletDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(WalletUrl))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    WalletDto dto = null;
                    try { dto = JsonUtility.FromJson<WalletEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }

                    if (dto == null || string.IsNullOrEmpty(dto.wallet_band))
                    {
                        onErr?.Invoke(req.responseCode, "empty wallet payload");
                        yield break;
                    }
                    onOk?.Invoke(dto);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        /// <summary>
        /// GET /v1/me — the projected player (handle / locale / lifecycle). Optional header.
        /// onOk(dto) on 2xx; onErr(code, message) otherwise.
        /// </summary>
        public IEnumerator GetMe(string bearer, Action<MeDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(MeUrl))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    MeDto dto = null;
                    try { dto = JsonUtility.FromJson<MeEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }

                    if (dto == null) { onErr?.Invoke(req.responseCode, "empty /v1/me payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // Map a non-2xx into a readable string — surfaces the error envelope's human `message`
        // rather than a raw HTTP code to the player (F2). REUSE OpErrorEnvelope declared in
        // BuildingCardClient.cs (same assembly).
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
}
