using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C3 (design §3 C3) — the FIRST client-side caller of `POST /v1/session/open`
    // (`session/session.controller.ts:56`) — the cold-open sequence that composes hl_card / queue /
    // backlog_badge / the 3 glances / onboarding / opened_game_day, and that NO client code called
    // before this chunk (design §1.3.b: `grep -rlF 'session/open' Assets/` -> 0). Mirrors
    // `DashboardClient`: a UnityWebRequest coroutine + concrete-envelope JsonUtility parsing, no mock.
    public class SessionClient
    {
        /// <summary>Garde de classe des refus (f2 2026-09-26) — la phrase SERVIE du DERNIER refus de ce client (clé + payload_vars
        /// résolues, `RefusServi`), posée après CHAQUE requête : null sur un 2xx, ou quand le corps ne porte pas de clé servie.
        /// ⛔ C'est la SEULE phrase de refus qu'un écran montre au joueur (sinon la sienne) ; le `message` d'onErr est TECHNIQUE.</summary>
        public string DernierePhraseDeRefus { get; private set; }

        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;

        public string OpenUrl => BaseUrl.TrimEnd('/') + "/v1/session/open";

        /// <summary>POST /v1/session/open — idempotent cold-open. `clientVersion` is REQUIRED
        /// server-side (schema NOT NULL, `session.controller.ts:38-42` — a blank value 422s).
        /// onOk(dto) on 2xx, read via payload.data (REUSE the envelope idiom every client in this
        /// project shares); onErr(code, message) otherwise.</summary>
        public IEnumerator OpenSession(string bearer, string clientVersion,
            Action<SessionOpenDto> onOk, Action<long, string> onErr)
        {
            string body = JsonUtility.ToJson(new OpenSessionRequestDto { client_version = clientVersion });

            using (var req = new UnityWebRequest(OpenUrl, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                MafiaCleanCity.ClientHttp.Json(req);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);

                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);

                if (req.result == UnityWebRequest.Result.Success)
                {
                    SessionOpenDto dto = null;
                    try { dto = JsonUtility.FromJson<SessionOpenEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }

                    if (dto == null || string.IsNullOrEmpty(dto.session_id))
                    {
                        onErr?.Invoke(req.responseCode, "empty session-open payload");
                        yield break;
                    }
                    dto.JourDeFamille = CycleDeSession.LireEntier(req.downloadHandler.text, CycleDeSession.ChampsServis.JourDeFamille);
                    dto.JourDeFamilleALOuverture =
                        CycleDeSession.LireEntier(req.downloadHandler.text, CycleDeSession.ChampsServis.JourDeFamilleALOuverture);
                    // « servi null » ≠ « absent » : la PRÉSENCE de la clé, lue dans le corps brut (M1)
                    dto.JourDeFamilleServi = HorlogeLegere.Brut(req.downloadHandler.text, CycleDeSession.ChampsServis.JourDeFamille) != null;
                    onOk?.Invoke(dto);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // Mirrors DashboardClient.ReadableError — surfaces the error envelope's human `message`.
        public string CloseUrl => BaseUrl.TrimEnd('/') + "/v1/session/close";

        /// <summary>B4 — `POST /v1/session/close` : sans corps côté back (`{}` envoyé), idempotent (aucune session active ⇒
        /// `{ closed: false }`, toujours 200). `onOk(closed)`.</summary>
        public IEnumerator CloseSession(string bearer, Action<bool> onOk, Action<long, string> onErr)
        {
            using (var req = new UnityWebRequest(CloseUrl, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes("{}"));
                req.downloadHandler = new DownloadHandlerBuffer();
                MafiaCleanCity.ClientHttp.Json(req);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);

                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);

                if (req.result == UnityWebRequest.Result.Success)
                    onOk?.Invoke(req.downloadHandler.text.Contains("\"closed\":true"));
                else
                    onErr?.Invoke(req.responseCode, ReadableError(req));
            }
        }

        private static string ReadableError(UnityWebRequest req)
        {
            string text = req.downloadHandler != null ? req.downloadHandler.text : null;
            if (!string.IsNullOrEmpty(text))
            {
                try
                {
                    var env = JsonUtility.FromJson<MafiaCleanCity.Operational.OpErrorEnvelope>(text);
                    string msg = env?.payload?.error?.message;
                    if (!string.IsNullOrEmpty(msg)) return msg;
                }
                catch { /* fall through */ }
            }
            return $"request failed ({req.responseCode}) {req.error}";
        }
    }
}
