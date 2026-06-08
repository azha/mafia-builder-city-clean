using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.CityMap
{
    // ---------------------------------------------------------------------
    // Thin HTTP client for the City Map's world data.
    //
    // Talks to the live game-back service through Traefik (default
    // https://cleancity.erutheone.eu). The editor runs on the same host as the docker
    // stack, so the PlayMode E2E hits the real endpoint — no mock (charter 27).
    // ---------------------------------------------------------------------

    public class WorldApiClient
    {
        // Public game API base. /v1 is part of the route (URI versioning),
        // not a global prefix. GET /v1/world/districts needs no auth.
        public string BaseUrl = "https://cleancity.erutheone.eu";

        public int TimeoutSeconds = 10;

        public string DistrictsUrl => BaseUrl.TrimEnd('/') + "/v1/world/districts";

        /// <summary>
        /// Coroutine: GET the world districts. Invokes onSuccess with the parsed
        /// list on a 2xx, or onError with a human-readable reason otherwise.
        /// </summary>
        public IEnumerator GetDistricts(Action<List<DistrictDto>> onSuccess, Action<string> onError)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(DistrictsUrl))
            {
                req.timeout = TimeoutSeconds;
                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    onError?.Invoke($"GET {DistrictsUrl} failed: {req.result} ({req.responseCode}) {req.error}");
                    yield break;
                }

                List<DistrictDto> districts;
                try
                {
                    districts = ParseDistricts(req.downloadHandler.text);
                }
                catch (Exception ex)
                {
                    onError?.Invoke($"Failed to parse districts response: {ex.Message}");
                    yield break;
                }

                onSuccess?.Invoke(districts);
            }
        }

        public string DistrictHeatUrl(int districtId) =>
            BaseUrl.TrimEnd('/') + $"/v1/city/district/{districtId}/heat";

        /// <summary>
        /// Coroutine: GET the heat projection for one district (JWT-gated). Pass the
        /// Bearer token from a prior sign-in. onSuccess gets the parsed projection.
        /// </summary>
        public IEnumerator GetDistrictHeat(int districtId, string bearerToken,
            Action<DistrictHeatDto> onSuccess, Action<string> onError)
        {
            string url = DistrictHeatUrl(districtId);
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearerToken))
                {
                    req.SetRequestHeader("Authorization", "Bearer " + bearerToken);
                }

                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    onError?.Invoke($"GET {url} failed: {req.result} ({req.responseCode}) {req.error}");
                    yield break;
                }

                DistrictHeatDto heat;
                try
                {
                    HeatEnvelope env = JsonUtility.FromJson<HeatEnvelope>(req.downloadHandler.text);
                    heat = env?.payload?.data;
                }
                catch (Exception ex)
                {
                    onError?.Invoke($"Failed to parse heat response: {ex.Message}");
                    yield break;
                }

                if (heat == null)
                {
                    onError?.Invoke($"Heat response for district {districtId} had no data");
                    yield break;
                }

                onSuccess?.Invoke(heat);
            }
        }

        /// <summary>
        /// Pure parse of the ResponseEnvelope JSON into the district list.
        /// Exposed (and static) so tests can exercise parsing independently of HTTP.
        /// </summary>
        public static List<DistrictDto> ParseDistricts(string json)
        {
            if (string.IsNullOrEmpty(json))
            {
                return new List<DistrictDto>();
            }

            DistrictsEnvelope env = JsonUtility.FromJson<DistrictsEnvelope>(json);
            return env?.payload?.data?.districts ?? new List<DistrictDto>();
        }
    }
}
