using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.CitySim.Inspection
{
    // ⑮ — les 2 routes joueur d'`inspection.controller.ts`, toutes deux sous `JwtAuthGuard`
    // (mesuré 2026-09-02). `inspection-test.controller.ts` n'est pas câblé : c'est un seam.
    //
    // ⛔ S12-a — LE BACK EST SCOPÉ DISTRICT, PAS JOUEUR. Il n'existe AUCUNE route qui rende la
    // file de tous les districts : le canon en veut un agrégat, le back en sert un par district.
    // Un écran qui promettrait « votre file » ferait donc 18 appels, ou mentirait. Celui-ci
    // interroge UN district et le dit dans son titre — *mieux vaut un écran honnête sur un
    // district qu'un agrégat qu'aucune route ne peut fournir.*
    //
    // ⚠️ S12-d — `inspection` rend 404 sur compte neuf. Traité comme un état, pas comme une panne.
    public class InspectionClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/{leaf}";

        /// <summary>GET /v1/city/district/:id/inspection — la file d'UN district.
        /// ⚠️ L'identifiant est un ENTIER (`IntParam` côté back), pas un uuid : passer un uuid
        /// de joueur ici produit un 400. Les deux identifiants du domaine n'ont pas la même
        /// forme et le mélange est un défaut déjà relevé par le juge de données (D3).</summary>
        public IEnumerator LireFile(int districtId, string bearer,
            Action<FileData> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url($"city/district/{districtId}/inspection")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    onErr?.Invoke(req.responseCode, req.error ?? "network error");
                    yield break;
                }
                FileData dto = null;
                try { dto = JsonUtility.FromJson<FileEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }

        /// <summary>POST /v1/city/inspection/report — corps `{ building_id, entry_type }`.
        ///
        /// ★★ LE RETOUR DE BÂTON N'EST PAS UNE ROUTE : c'est `backlash_triggered` dans CETTE
        /// réponse (S12-b). Un écran qui chercherait un endpoint « backlash » n'en trouverait
        /// aucun et conclurait que le mécanisme n'existe pas. Il existe — il est un EFFET du
        /// dépôt de rapport, visible une seule fois, au moment où on le déclenche. C'est donc le
        /// seul instant où l'écran peut le montrer, et le rater c'est le perdre.
        ///
        /// ⚠️ `building_id` est un ENTIER, `entry_type` vaut FALSE_REPORT ou GENUINE_REPORT — les
        /// deux seules valeurs servies.</summary>
        public IEnumerator Deposer(int buildingId, string typeEntree, string bearer,
            Action<RapportData> onOk, Action<long, string> onErr)
        {
            string corps = "{\"building_id\":" + buildingId + ",\"entry_type\":\"" + typeEntree + "\"}";
            using (UnityWebRequest req = UnityWebRequest.Post(Url("city/inspection/report"), corps, "application/json"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    onErr?.Invoke(req.responseCode, req.error ?? "network error");
                    yield break;
                }
                RapportData dto = null;
                try { dto = JsonUtility.FromJson<RapportEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }
    }
}
