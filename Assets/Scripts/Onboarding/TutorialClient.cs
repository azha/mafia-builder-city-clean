using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Onboarding
{
    // ㉕ — les 3 routes joueur de `tutorial-overlay.controller.ts`, sous `JwtAuthGuard`
    // (mesuré 2026-09-02). Le MOTEUR existe et il est complet : W1.1-b a livré `tutorial_state`
    // et le résolveur d'éligibilité. Ce qui manquait était uniquement l'écran.
    //
    // ⚠️ `PATCH`, pas `POST` — pour les deux mutations. `UnityWebRequest.Post` enverrait un verbe
    // que le contrôleur ne sert pas, et le 404 qui en résulterait ressemblerait à une route
    // absente. On construit donc la requête à la main avec son verbe.
    public class TutorialClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/{leaf}";

        private UnityWebRequest Patch(string leaf, string corps, string bearer)
        {
            var req = new UnityWebRequest(Url(leaf), "PATCH");
            req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(corps));
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");
            req.timeout = TimeoutSeconds;
            if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
            return req;
        }

        /// <summary>GET /v1/ui/tutorial-state — l'intersection des trois projections : ce qui a
        /// été montré, ce qui est éligible, et lequel vient ensuite.</summary>
        public IEnumerator LireEtat(string bearer, Action<TutorielData> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("ui/tutorial-state")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                { onErr?.Invoke(req.responseCode, req.error ?? "network error"); yield break; }
                TutorielData dto = null;
                try { dto = JsonUtility.FromJson<TutorielEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }

        /// <summary>PATCH /v1/ui/tutorial — corps `{ tutorial_id }`. Marque un overlay comme vu.
        /// ⚠️ C'est le SEUL écrivain de `shown_tutorial_ids` : ne pas l'appeler ferait revoir le
        /// même overlay à chaque session, indéfiniment.</summary>
        public IEnumerator MarquerVu(string tutorialId, string bearer, Action onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = Patch("ui/tutorial", "{\"tutorial_id\":\"" + tutorialId + "\"}", bearer))
            {
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                { onErr?.Invoke(req.responseCode, req.error ?? "network error"); yield break; }
                onOk?.Invoke();
            }
        }

        /// <summary>PATCH /v1/ui/tutorial-opt-out — corps `{ tutorials_opt_out }`.</summary>
        public IEnumerator DefinirRefus(bool refus, string bearer, Action<bool> onOk, Action<long, string> onErr)
        {
            string corps = "{\"tutorials_opt_out\":" + (refus ? "true" : "false") + "}";
            using (UnityWebRequest req = Patch("ui/tutorial-opt-out", corps, bearer))
            {
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                { onErr?.Invoke(req.responseCode, req.error ?? "network error"); yield break; }
                OptOutData dto = null;
                try { dto = JsonUtility.FromJson<OptOutEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto.tutorials_opt_out);
            }
        }
    }
}
