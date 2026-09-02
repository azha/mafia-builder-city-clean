using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.CoreLoops.Compression
{
    // ⑭ — les 5 routes joueur de la compression, toutes sous `JwtAuthGuard` (mesuré 2026-09-02) :
    // `compression/state` (projection) · `compression/board` · `compression/board/problems/:id/decide`
    // · `compression/engage` · `compression/defer`. Elles vivent dans QUATRE contrôleurs distincts
    // — `compression-projection`, `compression-board`, `compression` — et le préfixe est le même
    // pour les cinq : c'est mesuré, pas supposé.
    //
    // ⛔ Les 7 routes de `demolition-compression-admin.controller.ts` et les 3 de
    // `compression-test.controller.ts` ne sont PAS ici, et pas par oubli : les premières sont
    // ADMIN, les secondes sont des seams de test. Les compter comme atteignables serait la faute
    // que ce dépôt a déjà payée — 683 routes `_test` sur 1017 comptées comme surface.
    public class CompressionClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/{leaf}";

        private static bool Recu(UnityWebRequest req, Action<long, string> onErr)
        {
            if (req.result == UnityWebRequest.Result.Success) return true;
            onErr?.Invoke(req.responseCode, req.error ?? "network error");
            return false;
        }

        /// <summary>GET /v1/compression/state — la pression, l'état de la semaine, le report.</summary>
        public IEnumerator LireEtat(string bearer, Action<EtatData> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("compression/state")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (!Recu(req, onErr)) yield break;
                EtatData dto = null;
                try { dto = JsonUtility.FromJson<EtatEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }

        /// <summary>GET /v1/compression/board — les problèmes de la semaine et le budget de décisions.</summary>
        public IEnumerator LireTableau(string bearer, Action<BoardData> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("compression/board")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (!Recu(req, onErr)) yield break;
                BoardData dto = null;
                try { dto = JsonUtility.FromJson<BoardEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }

        /// <summary>POST /v1/compression/board/problems/:id/decide — corps `{ choice }`.
        /// Les TROIS seuls choix servis sont `skip` | `resolve` | `dismiss` (`DecideChoice`).
        /// La réponse porte `revealed_secondary` (un problème en révèle un autre) et `finalized`
        /// (la semaine se ferme) — deux événements que l'écran doit MONTRER, pas avaler.</summary>
        public IEnumerator Decider(string problemeId, string choix, string bearer,
            Action<DecisionData> onOk, Action<long, string> onErr)
        {
            string corps = "{\"choice\":\"" + choix + "\"}";
            using (UnityWebRequest req = UnityWebRequest.Post(
                Url($"compression/board/problems/{problemeId}/decide"), corps, "application/json"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (!Recu(req, onErr)) yield break;
                DecisionData dto = null;
                try { dto = JsonUtility.FromJson<DecisionEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }

        /// <summary>POST /v1/compression/engage — ouvrir la semaine.</summary>
        public IEnumerator Engager(string bearer, Action onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Post(Url("compression/engage"), "{}", "application/json"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (!Recu(req, onErr)) yield break;
                onOk?.Invoke();
            }
        }

        /// <summary>POST /v1/compression/defer — reporter le cycle. Le back décide s'il l'accorde ;
        /// `deferral_available` de la projection dit seulement si le geste vaut la peine d'être
        /// PROPOSÉ, jamais s'il aboutira.</summary>
        public IEnumerator Reporter(string bearer, Action onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Post(Url("compression/defer"), "{}", "application/json"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (!Recu(req, onErr)) yield break;
                onOk?.Invoke();
            }
        }
    }
}
