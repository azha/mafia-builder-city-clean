using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational.Selling
{
    // ㉟ LA VENTE — les 4 routes joueur de `selling.controller.ts` (toutes sous `JwtAuthGuard`).
    // Même idiome enveloppe/payload/data que les 13 clients existants du dépôt : on ne centralise
    // pas, on REPRODUIT — une base partagée serait une décision d'architecture, pas un écran.
    public class SellingClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/operational/{leaf}";

        /// <summary>GET /v1/operational/dealers — la liste des points de vente.</summary>
        public IEnumerator ListDealers(string bearer, Action<DealerDto[]> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("dealers")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    onErr?.Invoke(req.responseCode, req.error ?? "network error");
                    yield break;
                }
                DealerDto[] dto = null;
                // ⚠️ `JsonUtility` NE LÈVE PAS quand la forme ne correspond pas : il rend un champ
                // NUL, en silence. Un écran bâti dessus a l'air correct et affiche du vide. On teste
                // donc explicitement le null plutôt que de faire confiance à l'absence d'exception.
                try { dto = JsonUtility.FromJson<DealerListEnvelope>(req.downloadHandler.text)?.payload?.data?.dealers; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data.dealers`"); yield break; }
                onOk?.Invoke(dto);
            }
        }

        /// <summary>GET /v1/operational/dealer/:id — le détail d'un point de vente.</summary>
        public IEnumerator GetDealer(string dealerId, string bearer,
            Action<DealerDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url($"dealer/{dealerId}")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    onErr?.Invoke(req.responseCode, req.error ?? "network error");
                    yield break;
                }
                DealerDto dto = null;
                try { dto = JsonUtility.FromJson<DealerEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }

        /// <summary>POST /v1/operational/dealer/:id/collect — ramasser la caisse.
        ///
        /// Le corps contient obligatoirement la poignée de planque découverte par le client. La
        /// version précédente postait `{}` : le bouton existait, mais toute activation aurait
        /// produit un 422 avant même d'atteindre la mécanique de collecte.</summary>
        public IEnumerator Collect(string dealerId, string safehouseId, string bearer,
            Action<CollectData> onOk, Action<long, string> onErr)
        {
            string body = JsonUtility.ToJson(new CollectData { safehouse_id = safehouseId });
            using (var req = new UnityWebRequest(Url($"dealer/{dealerId}/collect"), UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    onErr?.Invoke(req.responseCode, req.error ?? "network error");
                    yield break;
                }
                CollectData dto = null;
                try { dto = JsonUtility.FromJson<CollectEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }
    }
}
