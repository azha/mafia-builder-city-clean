using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.CityMap
{
    // Reads the JWT-gated per-district system projections for the detail panel.
    // Every call is authenticated (Bearer). A non-2xx (e.g. 404 "sim has not
    // ticked nightly/12h") is surfaced via onMissing(responseCode) so the panel
    // can show the projection as not-yet-available rather than failing.
    public class CityProjectionsClient
    {
        public string BaseUrl = "https://cleancity.erutheone.eu";
        public int TimeoutSeconds = 10;

        private string D(int id, string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/city/district/{id}/{leaf}";
        private string P(int precinct, string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/city/precinct/{precinct}/{leaf}";

        /// <summary>The owning precinct for a district (3 districts/precinct, capped at 6) — mirrors the backend.</summary>
        public static int PrecinctForDistrict(int districtId) => Mathf.Min(6, (districtId - 1) / 3 + 1);

        // Raw authenticated GET. onJson on 2xx; onMissing(code) on anything else.
        private IEnumerator Get(string url, string token, Action<string> onJson, Action<long> onMissing)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(token)) req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    onJson(req.downloadHandler.text);
                }
                else
                {
                    onMissing(req.responseCode);
                }
            }
        }

        public IEnumerator Flow(int districtId, string token, Action<FlowDto> ok, Action<long> missing) =>
            Get(D(districtId, "flow"), token, j => ok(JsonUtility.FromJson<FlowEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Throughput(int districtId, string token, Action<ThroughputDto> ok, Action<long> missing) =>
            Get(D(districtId, "throughput"), token, j => ok(JsonUtility.FromJson<ThroughputEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Stash(int districtId, string token, Action<StashDto> ok, Action<long> missing) =>
            Get(D(districtId, "stash"), token, j => ok(JsonUtility.FromJson<StashEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Buffer(int districtId, string token, Action<BufferDto> ok, Action<long> missing) =>
            Get(D(districtId, "buffer"), token, j => ok(JsonUtility.FromJson<BufferEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Unconformity(int districtId, string token, Action<UnconformityDto> ok, Action<long> missing) =>
            Get(D(districtId, "unconformity"), token, j => ok(JsonUtility.FromJson<UnconformityEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Leks(int districtId, string token, Action<LeksDto> ok, Action<long> missing) =>
            Get(D(districtId, "leks"), token, j => ok(JsonUtility.FromJson<LeksEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Cohesion(int districtId, string token, Action<CohesionDto> ok, Action<long> missing) =>
            Get(D(districtId, "cohesion"), token, j => ok(JsonUtility.FromJson<CohesionEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Inspection(int districtId, string token, Action<InspectionDto> ok, Action<long> missing) =>
            Get(D(districtId, "inspection"), token, j => ok(JsonUtility.FromJson<InspectionEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Belief(int districtId, string token, Action<BeliefDto> ok, Action<long> missing) =>
            Get(P(PrecinctForDistrict(districtId), "belief"), token, j => ok(JsonUtility.FromJson<BeliefEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Patrol(int districtId, string token, Action<PatrolDto> ok, Action<long> missing) =>
            Get(P(PrecinctForDistrict(districtId), "patrol"), token, j => ok(JsonUtility.FromJson<PatrolEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Whisper(string token, Action<WhisperDto> ok, Action<long> missing) =>
            Get($"{BaseUrl.TrimEnd('/')}/v1/city/citizens/whisper", token, j => ok(JsonUtility.FromJson<WhisperEnvelope>(j)?.payload?.data), missing);
    }
}
