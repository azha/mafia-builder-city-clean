using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.Operational.Exceptions
{
    // IMPLEMENTS: spec §4-T1 — the Exception Queue API client (P14/P16 backend). Mirrors BuildingCardClient:
    // UnityWebRequest coroutine + concrete-envelope JsonUtility parsing, Bearer auth, UUID-v4 Idempotency-Key on
    // the mutation, readable error mapping (F2 — never a raw HTTP code to the player).
    public class ExceptionsClient
    {
        /// <summary>Garde de classe des refus (f2 2026-09-26) — la phrase SERVIE du DERNIER refus de ce client (clé + payload_vars
        /// résolues, `RefusServi`), posée après CHAQUE requête : null sur un 2xx, ou quand le corps ne porte pas de clé servie.
        /// ⛔ C'est la SEULE phrase de refus qu'un écran montre au joueur (sinon la sienne) ; le `message` d'onErr est TECHNIQUE.</summary>
        public string DernierePhraseDeRefus { get; private set; }

        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = 10;

        /// <summary>⑨-1 — une requête de résolution TELLE QU'ELLE PART : la route et le corps. Construite par UNE fonction
        /// (`ConstruireResolve`), celle que l'envoi réel emploie — une garde qui la lit lit donc ce qui part sur le fil.</summary>
        public struct RequeteResolve { public string Url; public string Corps; }

        public static RequeteResolve ConstruireResolve(string baseUrl, string exceptionId, string method, string chosenActionId) =>
            new RequeteResolve
            {
                Url = $"{(baseUrl ?? string.Empty).TrimEnd('/')}/v1/exceptions/{exceptionId}/resolve",
                Corps = JsonUtility.ToJson(new ResolveRequest { method = method, chosen_action_id = chosenActionId }),
            };

        /// <summary>La dernière requête de résolution construite — posée AVANT l'envoi (réel ou substitué).</summary>
        public RequeteResolve? DerniereRequeteResolve { get; private set; }

        /// <summary>⛔ COUTURES DE TEST, jamais posées en production : quand elles sont posées, la requête est construite
        /// EXACTEMENT comme pour le réseau, enregistrée, puis la réponse vient de la couture au lieu du fil. Elles existent
        /// pour qu'une garde porte sur la requête ÉMISE (route + corps) sans consommer la pile dev (règle du 22/09 :
        /// un consommateur de la pile à la fois, tour donné par l'orchestrateur).</summary>
        public Func<RequeteResolve, ResolveResponse> SubstitutResolvePourTest;
        public Func<ExceptionCardDto[]> SubstitutFilePourTest;
        /// <summary>⑨-6 — le `total` des escalades ; `null` = la route a échoué.</summary>
        public Func<int?> SubstitutEscalationsPourTest;

        /// <summary>⛔ UNE COUTURE POSÉE = AUCUNE REQUÊTE. Un test qui substitue la file ou la résolution ne doit pas, par la
        /// porte d'à côté (le compte des escalades, rechargé avec la file), toucher la pile dev.</summary>
        private bool Substitue =>
            SubstitutResolvePourTest != null || SubstitutFilePourTest != null || SubstitutEscalationsPourTest != null;

        public static string ConstruireEscalations(string baseUrl) =>
            $"{(baseUrl ?? string.Empty).TrimEnd('/')}/v1/exceptions/escalations?limit=1&offset=0";

        /// <summary>⑨-6 — `GET /v1/exceptions/escalations` : seul le `total` sert (`limit=1`, le compte ne dépend pas de la
        /// page). onOk(total) ; onErr sinon.
        /// ⚠️ `JsonUtility` rend 0 pour un `total` ABSENT (un objet imbriqué manquant devient une instance par défaut) : sans
        /// la clé dans le corps, on dirait « rien à relire » sans le savoir. Le corps doit donc PORTER `"total"`.</summary>
        public IEnumerator GetEscalationsTotal(string bearer, Action<int> onOk, Action<long, string> onErr)
        {
            if (Substitue)
            {
                int? t = SubstitutEscalationsPourTest?.Invoke();
                if (t.HasValue) onOk?.Invoke(t.Value);
                else onErr?.Invoke(0, "escalations : substitué, sans total");
                yield break;
            }
            using (UnityWebRequest req = UnityWebRequest.Get(ConstruireEscalations(BaseUrl)))
            {
                req.timeout = TimeoutSeconds;
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);

                if (req.result != UnityWebRequest.Result.Success) { onErr?.Invoke(req.responseCode, ReadableError(req)); yield break; }
                string texte = req.downloadHandler.text ?? string.Empty;
                EscalationsResponseDto dto = null;
                try { dto = JsonUtility.FromJson<EscalationsEnvelope>(texte)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null || !texte.Contains("\"total\"")) { onErr?.Invoke(req.responseCode, "escalations : pas de total servi"); yield break; }
                onOk?.Invoke(dto.total);
            }
        }

        /// <summary>GET /v1/exceptions/queue — the player's PENDING cards, R2.2 band-projected.
        /// onOk(cards) on 2xx (empty array when none); onErr(code, message) otherwise.</summary>
        public IEnumerator GetQueue(string bearer, Action<ExceptionCardDto[]> onOk, Action<long, string> onErr)
        {
            if (SubstitutFilePourTest != null)
            {
                onOk?.Invoke(SubstitutFilePourTest() ?? Array.Empty<ExceptionCardDto>());
                yield break;
            }
            string url = $"{BaseUrl.TrimEnd('/')}/v1/exceptions/queue";
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);

                if (req.result == UnityWebRequest.Result.Success)
                {
                    ExceptionCardDto[] cards = null;
                    try { cards = JsonUtility.FromJson<ExceptionQueueEnvelope>(req.downloadHandler.text)?.payload?.data?.exceptions; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    onOk?.Invoke(cards ?? Array.Empty<ExceptionCardDto>());
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        /// <summary>POST /v1/exceptions/:id/resolve { method, chosen_action_id } — resolve ONE owned pending card.
        /// onOk(dto) with the qualitative outcome on 200; onErr(code, readable) on 404 not-owned / 409 not-pending /
        /// 422 bad method or un-addable candidate.</summary>
        public IEnumerator Resolve(string exceptionId, string method, string chosenActionId, string bearer,
            Action<ResolveResponse> onOk, Action<long, string> onErr)
        {
            RequeteResolve requete = ConstruireResolve(BaseUrl, exceptionId, method, chosenActionId);
            DerniereRequeteResolve = requete;
            if (SubstitutResolvePourTest != null)
            {
                ResolveResponse r = SubstitutResolvePourTest(requete);
                if (r == null || !r.resolved) onErr?.Invoke(0, "empty resolve payload");
                else onOk?.Invoke(r);
                yield break;
            }
            string url = requete.Url;
            string body = requete.Corps;
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = TimeoutSeconds;
                req.SetRequestHeader("Content-Type", "application/json");
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                MafiaCleanCity.ClientHttp.Idempotent(req); // UUID v4 — backend mandate
                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);

                if (req.result == UnityWebRequest.Result.Success)
                {
                    ResolveResponse dto = null;
                    try { dto = JsonUtility.FromJson<ResolveEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    if (dto == null || !dto.resolved) { onErr?.Invoke(req.responseCode, "empty resolve payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // Map a non-2xx to the human error-envelope message (F2) — verbatim the BuildingCardClient helper.
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
