using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // ecran_loi « La loi » (㉛) — « le parloir » — mesuré en direct sur la pile de dev le
    // 2026-09-03 (compte `operational_demo@example.test` ET un compte fraîchement signé, via
    // `rtk proxy curl` — un `curl` nu sur cet arbre rend un SCHÉMA DE TYPES au lieu du corps réel,
    // voir Tools/loi-implementation-notes.md § Deviations). Idiome enveloppe/payload/data +
    // Idempotency-Key sur les mutations, patron `DailyReviewClient`/`ReputationClient` (㊲, la
    // référence à deux juges). Routes couvertes :
    // GET /v1/me/legal                                (aucun paramètre)
    // POST /v1/me/legal/lawyers                         {tier: boutique|corruption_pipeline}
    // PUT /v1/me/legal/lawyers/:id/retainer              {active: bool} — MESURÉE PAR CE LOT, absente du brief
    // POST /v1/me/legal/cases/:id/plea                   ⛔ jamais mesurée, jamais câblée (0 affaire sur les 2 comptes sondés)
    // POST /v1/me/legal/cases/:id/payoff                 ⛔ jamais mesurée, jamais câblée (idem)
    public class LoiClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>`GET /v1/me/legal` — mesuré (2026-09-03) : `{activeCases: [], lawyerRoster: [...]}`
        /// — l'état complet du parloir. `activeCases` mesuré VIDE sur les deux comptes sondés
        /// (démo ET frais).</summary>
        public IEnumerator GetLegal(string bearer,
                                     Action<GetLegalResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/me/legal"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetLegalResponseDto dto =
                        JsonUtility.FromJson<GetLegalEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetLegal)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/me/legal a échoué ({req.responseCode}) {req.error}");
            }
        }

        /// <summary>`POST /v1/me/legal/lawyers` — corps mesuré par 422 (`tier must be 'boutique'
        /// or 'corruption_pipeline'.`) puis succès réel (201, compte de démo ET compte frais) :
        /// `{tier}`. Réponse = l'état COMPLET du parloir (même forme que `GetLegal`), pas un
        /// accusé. ⚠️ `corruption_pipeline` mesuré coûter 4 000 000 cents (402 PAYMENT_REQUIRED
        /// observé sur un compte frais) — `onErr` porte cette classe d'échec au même titre qu'un
        /// échec réseau. Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du
        /// back l'honore).</summary>
        public IEnumerator PostLegalLawyers(string bearer, PostLegalLawyersBody corps,
                                     Action<PostLegalLawyersResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/me/legal/lawyers", "POST"))
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
                    PostLegalLawyersResponseDto dto =
                        JsonUtility.FromJson<PostLegalLawyersEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostLegalLawyers)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/me/legal/lawyers a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }

        /// <summary>`PUT /v1/me/legal/lawyers/:id/retainer` — ⛔⛔ MESURÉE PAR CE LOT, le brief
        /// demandait explicitement cette mesure (« je ne l'ai pas appelé »). Corps mesuré par 422
        /// (corps vide → "active must be a boolean.") puis succès réel ALLER-RETOUR sur le
        /// compte de démo (`true` PUIS `false`, pour ne pas laisser l'état modifié) : `{active}`.
        /// Réponse = l'état COMPLET du parloir (même forme que `GetLegal`), avec
        /// `lawyerRoster[].retainer` mis à jour. C'est le SEUL geste qui reste au joueur une fois
        /// un avocat recruté (brief) — il porte donc l'écran.</summary>
        public IEnumerator PutLegalLawyersRetainer(string bearer, string id, PutLegalLawyersRetainerBody corps,
                                     Action<PutLegalLawyersRetainerResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(
                BaseUrl.TrimEnd('/') + "/v1/me/legal/lawyers/" + UnityWebRequest.EscapeURL(id) + "/retainer", "PUT"))
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
                    PutLegalLawyersRetainerResponseDto dto =
                        JsonUtility.FromJson<PutLegalLawyersRetainerEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PutLegalLawyersRetainer)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"PUT /v1/me/legal/lawyers/:id/retainer a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }

        /// <summary>`POST /v1/me/legal/cases/:id/plea` → ⛔ JAMAIS MESURÉE, JAMAIS APPELÉE PAR
        /// L'ÉCRAN. `activeCases` mesuré VIDE sur les deux comptes sondés — aucune affaire
        /// n'existe pour exercer cette route (elle exige un `:id` d'affaire). Portée ici pour
        /// que le client couvre les 4 routes du domaine (demande du brief au squelette), mais
        /// `LoiScreenController` ne l'invoque nulle part — voir la section « affaires » (état
        /// vide honnête).</summary>
        public IEnumerator PostLegalCasesPlea(string bearer, string id, PostLegalCasesPleaBody corps,
                                     Action<PostLegalCasesPleaResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/me/legal/cases/" + UnityWebRequest.EscapeURL(id) + "/plea", "POST"))
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
                    PostLegalCasesPleaResponseDto dto =
                        JsonUtility.FromJson<PostLegalCasesPleaEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostLegalCasesPlea)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/me/legal/cases/:id/plea a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }

        /// <summary>`POST /v1/me/legal/cases/:id/payoff` → ⛔ JAMAIS MESURÉE, JAMAIS APPELÉE PAR
        /// L'ÉCRAN — même raison que `PostLegalCasesPlea` ci-dessus.</summary>
        public IEnumerator PostLegalCasesPayoff(string bearer, string id, PostLegalCasesPayoffBody corps,
                                     Action<PostLegalCasesPayoffResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/me/legal/cases/" + UnityWebRequest.EscapeURL(id) + "/payoff", "POST"))
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
                    PostLegalCasesPayoffResponseDto dto =
                        JsonUtility.FromJson<PostLegalCasesPayoffEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostLegalCasesPayoff)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/me/legal/cases/:id/payoff a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
    }
}
