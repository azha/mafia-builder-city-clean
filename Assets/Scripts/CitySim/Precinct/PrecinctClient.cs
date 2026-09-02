using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.CitySim.Precinct
{
    // ⑰ — les 2 SEULES routes joueur d'un precinct, mesurées le 2026-09-02, toutes deux sous
    // `JwtAuthGuard` : `city/precinct/:id/belief` (`police_memory.controller.ts`) et
    // `city/precinct/:id/patrol` (`patrol.controller.ts`). La troisième trouvée par le balayage,
    // `_test/distribution/resolve-precincts`, est un seam de test et n'est pas câblée.
    //
    // ⛔ CE QUE LA MAQUETTE PROMETTAIT ET QUE LE BACK NE SERT PAS — écrit ici plutôt que découvert
    // à l'écran :
    // · **S12-c : aucun recrutement de clerc.** Il n'existe aucune route. L'écran ne le propose
    //   donc pas ; le proposer serait un bouton qui ne peut aboutir.
    // · **L'achat de renseignement existe mais vise un acteur d'AFFAIRES INTERNES**
    //   (`internal-affairs.controller.ts:76`), pas un precinct BPD. *Objet voisin, pas identique* —
    //   et c'est exactement le genre de ressemblance qui fait câbler la mauvaise route. Non câblé.
    //
    // ⛔⛔ S12-e — LA CORRESPONDANCE DISTRICT → PRECINCT EST CALCULÉE CÔTÉ CLIENT, et c'est un
    // défaut de contrat, pas une commodité : deux clients qui la calculent divergeront, et rien
    // ne les départagera. Cet écran ne la calcule PAS. Il prend un identifiant de precinct et
    // s'arrête là — l'inventer ici enterrerait le défaut sous une implémentation plausible.
    public class PrecinctClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/{leaf}";

        /// <summary>GET /v1/city/precinct/:id/belief — ce que la police CROIT. Deux champs.</summary>
        public IEnumerator LireCroyance(string precinctId, string bearer,
            Action<CroyanceData> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url($"city/precinct/{precinctId}/belief")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                { onErr?.Invoke(req.responseCode, req.error ?? "network error"); yield break; }
                CroyanceData dto = null;
                try { dto = JsonUtility.FromJson<CroyanceEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }

        /// <summary>GET /v1/city/precinct/:id/patrol — la pression de patrouille. Deux champs.</summary>
        public IEnumerator LirePatrouille(string precinctId, string bearer,
            Action<PatrouilleData> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url($"city/precinct/{precinctId}/patrol")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                { onErr?.Invoke(req.responseCode, req.error ?? "network error"); yield break; }
                PatrouilleData dto = null;
                try { dto = JsonUtility.FromJson<PatrouilleEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }
    }
}
