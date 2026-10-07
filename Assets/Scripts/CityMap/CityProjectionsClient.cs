using System;
using System.Collections;
using System.Text;
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
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = 10;

        private string D(int id, string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/city/district/{id}/{leaf}";
        private string P(int precinct, string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/city/precinct/{precinct}/{leaf}";

        /// <summary>The owning precinct for a district (3 districts/precinct, capped at 6) — mirrors the
        /// backend's rule client-side. FALLBACK ONLY (measured 2026-09-02): DistrictDto now carries a
        /// SERVED `precinct_id`, which coincides with this formula 18/18 today but is not guaranteed to
        /// forever — a business rule duplicated across two repos diverges silently the day the backend
        /// changes it. Belief/Patrol below prefer the served value whenever the caller has a DistrictDto;
        /// this formula remains for callers that only have a bare districtId.</summary>
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

        /// <summary>`precinctId`: pass the district's SERVED `precinct_id` (DistrictDto.precinct_id) when
        /// the caller holds the DTO — it is authoritative. Optional and defaulted to null so existing
        /// bare-districtId callers are unaffected; they fall back onto PrecinctForDistrict's client-side
        /// mirror of the backend rule (see its own doc comment for why that is a fallback, not the source
        /// of truth).</summary>
        public IEnumerator Belief(int districtId, string token, Action<BeliefDto> ok, Action<long> missing, int? precinctId = null) =>
            Get(P(precinctId ?? PrecinctForDistrict(districtId), "belief"), token, j => ok(JsonUtility.FromJson<BeliefEnvelope>(j)?.payload?.data), missing);

        /// <summary>Same `precinctId` contract as Belief above.</summary>
        public IEnumerator Patrol(int districtId, string token, Action<PatrolDto> ok, Action<long> missing, int? precinctId = null) =>
            Get(P(precinctId ?? PrecinctForDistrict(districtId), "patrol"), token, j => ok(JsonUtility.FromJson<PatrolEnvelope>(j)?.payload?.data), missing);

        public IEnumerator Whisper(string token, Action<WhisperDto> ok, Action<long> missing) =>
            Get($"{BaseUrl.TrimEnd('/')}/v1/city/citizens/whisper", token, j => ok(JsonUtility.FromJson<WhisperEnvelope>(j)?.payload?.data), missing);

        /// <summary>GET /v1/city/district/:id/interior — W3.U2 C7 (U-7, D1/D2): the district-interior
        /// diorama's own payload (grid + day_phase + per-building bands). onOk(dto) on 2xx via
        /// payload.data; onMissing(code) otherwise (e.g. an out-of-range district id → VALIDATION_FAILED).</summary>
        public IEnumerator Interior(int districtId, string token, Action<DistrictInteriorDto> ok, Action<long> missing) =>
            Get(D(districtId, "interior"), token, j => ok(JsonUtility.FromJson<DistrictInteriorEnvelope>(j)?.payload?.data), missing);

        /// <summary>Projection minimale des dealers pour relier la fiche du bâtiment au geste de
        /// collecte. `dealer_spot_id` est une identité de bâtiment possédé, jamais la tuile de lek.</summary>
        public IEnumerator Dealers(string token, Action<DistrictDealerDto[]> ok, Action<long> missing) =>
            Get($"{BaseUrl.TrimEnd('/')}/v1/operational/dealers", token,
                j => ok(JsonUtility.FromJson<DistrictDealerListEnvelope>(j)?.payload?.data?.dealers), missing);

        /// <summary>POST /v1/operational/dealer/:id/collect depuis le CTA de la fiche.</summary>
        public IEnumerator CollectDealer(string dealerId, string safehouseId, string token,
            Action<DistrictCollectOutcome> done, string prenomDuDealer = null)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/operational/dealer/{dealerId}/collect";
            string body = JsonUtility.ToJson(new DistrictCollectRequestDto { safehouse_id = safehouseId });
            var outcome = new DistrictCollectOutcome();
            // COLLECTE : le 409 GÉNÉRIQUE (`RESOURCE_STATE_CONFLICT`, un changement concurrent) se réessaie UNE fois, en silence (décision
            // du back, 26/09) ; les deux 409 spécifiques (`SELLING_CASH_EMPTY`, `SELLING_SAFEHOUSE_FULL`) se DISENT.
            for (int tentative = 0; tentative < 2; tentative++)
            {
                using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
                {
                    req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                    req.downloadHandler = new DownloadHandlerBuffer();
                    req.timeout = TimeoutSeconds;
                    req.SetRequestHeader("Content-Type", "application/json");
                    if (!string.IsNullOrEmpty(token)) req.SetRequestHeader("Authorization", "Bearer " + token);
                    req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
                    yield return req.SendWebRequest();

                    outcome.HttpStatus = req.responseCode;
                    outcome.Ok = req.result == UnityWebRequest.Result.Success;
                    string corps = req.downloadHandler != null ? req.downloadHandler.text : null;
                    if (outcome.Ok)
                    {
                        try
                        {
                            DistrictCollectResultDto lu = JsonUtility.FromJson<DistrictCollectEnvelope>(corps)?.payload?.data;
                            outcome.SafehouseId = lu?.safehouse_id;
                            outcome.CollectedBand = lu?.collected_band;
                            outcome.RemainingBand = lu?.remaining_band;
                            outcome.Prenom = lu?.dealer_name_i18n?.@params?.prenom;
                            outcome.Ok = !string.IsNullOrEmpty(outcome.SafehouseId);
                            outcome.Message = outcome.Ok ? "ok" : MafiaCleanCity.I18n.Libelle.Gabarit("vente.raison.reponse_vide", "La r\u00e9ponse est arriv\u00e9e vide.");
                        }
                        catch
                        {
                            outcome.Ok = false;
                            outcome.Message = MafiaCleanCity.I18n.Libelle.Gabarit("vente.raison.reponse_illisible", "La r\u00e9ponse est illisible.");
                        }
                    }
                    else
                    {
                        outcome.Code = MafiaCleanCity.I18n.RefusServi.Code(corps);
                        if (tentative == 0 && MafiaCleanCity.I18n.CollecteMots.ReessayerEnSilence(req.responseCode, outcome.Code)) continue;
                        // table 67 (26/09) : la phrase SERVIE du refus (R9, R10, R12…) avant les phrases par code — C3 : « les fonds ou la
                        // capacité » ne disait pas QUELS fonds. Table 85 (07/10) : les raisons sont des PHRASES (clés `vente.raison.*`),
                        // le 409 se dit PAR CODE (table 75 n° 3-4), et tout 409 sans code spécifique tombe sur « La collecte n'a pas abouti ».
                        // m1 : la phrase AVEC prénom (« La caisse de Dov est vide. ») gagne sur la servie, qui est sans nom
                        // n1 : sur le 409 générique (déjà réessayé) la n° 7 est FORCÉE, la phrase servie est sautée
                        outcome.Message = outcome.Code == MafiaCleanCity.I18n.CollecteMots.CodeConflitGenerique
                            ? MafiaCleanCity.I18n.CollecteMots.PhraseDeRefus(outcome.Code, null)
                            : MafiaCleanCity.I18n.CollecteMots.PhraseAvecPrenom(outcome.Code, prenomDuDealer) ?? MafiaCleanCity.I18n.RefusServi.Phrase(corps);
                        if (outcome.Message == null)
                        {
                            switch (req.responseCode)
                            {
                                case 401: outcome.Message = MafiaCleanCity.I18n.Libelle.Gabarit("vente.raison.connexion_expiree", "La connexion a expir\u00e9."); break;
                                case 409: outcome.Message = MafiaCleanCity.I18n.CollecteMots.PhraseDeRefus(outcome.Code, null); break;
                                case 422: outcome.Message = MafiaCleanCity.I18n.Libelle.Gabarit("vente.raison.collecte_non_acceptee", "Cette collecte n\u2019est pas accept\u00e9e."); break;
                                default: outcome.Message = MafiaCleanCity.I18n.Libelle.Gabarit("vente.raison.indisponible", "Le point de vente ne r\u00e9pond pas pour l\u2019instant."); break;
                            }
                        }
                    }
                    break;
                }
            }
            done?.Invoke(outcome);
        }

        /// <summary>Action portée par la fiche intégrée. Elle vit ici pour respecter le sens de
        /// dépendance CityMap ← Operational tout en utilisant le même endpoint serveur.</summary>
        public IEnumerator InjectLaundering(string frontShopId, string safehouseId,
            string token, Action<DistrictLaunderOutcome> done)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/operational/laundering/inject";
            string body = JsonUtility.ToJson(new DistrictLaunderRequestDto
            {
                front_shop_id = frontShopId,
                safehouse_id = safehouseId,
            });
            var outcome = new DistrictLaunderOutcome();
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = TimeoutSeconds;
                req.SetRequestHeader("Content-Type", "application/json");
                if (!string.IsNullOrEmpty(token)) req.SetRequestHeader("Authorization", "Bearer " + token);
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
                yield return req.SendWebRequest();

                outcome.HttpStatus = req.responseCode;
                outcome.Ok = req.result == UnityWebRequest.Result.Success;
                if (outcome.Ok)
                {
                    try
                    {
                        outcome.NodeId = JsonUtility.FromJson<DistrictLaunderEnvelope>(req.downloadHandler.text)
                            ?.payload?.data?.node_id;
                        outcome.Ok = !string.IsNullOrEmpty(outcome.NodeId);
                        outcome.Message = outcome.Ok ? "ok" : RaisonDInject(RaisonReponseVide);
                    }
                    catch
                    {
                        outcome.Ok = false;
                        outcome.Message = RaisonDInject(RaisonReponseIllisible);
                    }
                }
                else outcome.Message = PhraseDuRefusDInject(req.responseCode, req.downloadHandler != null ? req.downloadHandler.text : null);
            }
            done?.Invoke(outcome);
        }

        // ── BLANCHIR : les raisons d'un échec d'inject (table 84 @1ce62e18, f2 26/09) ─────────────────────────────────────────
        // Des PHRASES (majuscule, point) : ㊵ les affiche SEULES, ① derrière « Blanchiment refusé. ». Domaine neutre, lu par les deux.
        internal const string RaisonReponseVide = "reponse_vide";
        internal const string RaisonReponseIllisible = "reponse_illisible";

        private static string RaisonDInject(string raison)
        {
            switch (raison)
            {
                case RaisonReponseVide: return MafiaCleanCity.I18n.Libelle.Gabarit("blanchiment.raison.reponse_vide", "La r\u00e9ponse est arriv\u00e9e vide.");
                case RaisonReponseIllisible: return MafiaCleanCity.I18n.Libelle.Gabarit("blanchiment.raison.reponse_illisible", "La r\u00e9ponse est illisible.");
                default: throw new ArgumentOutOfRangeException(nameof(raison), raison, "raison d'inject non nommée");
            }
        }

        /// <summary>La phrase d'un REFUS d'inject : la phrase SERVIE spécifique d'abord (table 67 — C3 : « les fonds ou la capacité » ne
        /// disait pas QUELS fonds), sinon la phrase du client par code HTTP (table 84). Jamais le `message` de développeur. Pure.</summary>
        public static string PhraseDuRefusDInject(long codeHttp, string corps)
        {
            string servie = MafiaCleanCity.I18n.RefusServi.Phrase(corps);
            if (servie != null) return servie;
            switch (codeHttp)
            {
                case 401: return MafiaCleanCity.I18n.Libelle.Gabarit("blanchiment.raison.connexion_expiree", "La connexion a expir\u00e9.");
                case 409: return MafiaCleanCity.I18n.Libelle.Gabarit("blanchiment.raison.fonds_ou_place", "Il manque de l\u2019argent ou de la place.");
                case 422: return MafiaCleanCity.I18n.Libelle.Gabarit("blanchiment.raison.lot_refuse", "Ce lot n\u2019est pas accept\u00e9.");
                default: return MafiaCleanCity.I18n.Libelle.Gabarit("blanchiment.raison.indisponible", "La fili\u00e8re ne r\u00e9pond pas pour l\u2019instant.");
            }
        }
    }
}
