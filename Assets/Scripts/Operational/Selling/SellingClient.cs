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
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;

        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/operational/{leaf}";

        /// <summary>GET /v1/operational/dealers — la liste des points de vente.</summary>
        public IEnumerator ListDealers(string bearer, Action<DealerDto[]> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("dealers")))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
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
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
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

        /// <summary>Table 67 (26/09) — la phrase SERVIE du dernier refus de ramassage (clé + payload_vars résolues) ; null sans clé servie.</summary>
        public string DernierePhraseDeRefus { get; private set; }

        /// <summary>POST /v1/operational/dealer/:id/collect — ramasser la caisse.
        ///
        /// Le corps contient obligatoirement la poignée de planque découverte par le client. La
        /// version précédente postait `{}` : le bouton existait, mais toute activation aurait
        /// produit un 422 avant même d'atteindre la mécanique de collecte.</summary>
        public IEnumerator Collect(string dealerId, string safehouseId, string bearer,
            Action<CollectData> onOk, Action<long, string> onErr)
        {
            string body = JsonUtility.ToJson(new CollectRequestDto { safehouse_id = safehouseId });
            DernierCodeDeRefus = null;
            // Le 409 GÉNÉRIQUE (`RESOURCE_STATE_CONFLICT` : un changement concurrent pendant la collecte) se réessaie UNE fois, en
            // silence — décision du back, 26/09. Les deux 409 SPÉCIFIQUES (`SELLING_CASH_EMPTY`, `SELLING_SAFEHOUSE_FULL`) ne se
            // réessaient pas : rien n'a changé à attendre, c'est une phrase à dire.
            for (int tentative = 0; tentative < 2; tentative++)
            {
                using (var req = new UnityWebRequest(Url($"dealer/{dealerId}/collect"), UnityWebRequest.kHttpVerbPOST))
                {
                    req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                    req.downloadHandler = new DownloadHandlerBuffer();
                    MafiaCleanCity.ClientHttp.Json(req);
                    MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                    MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                    yield return req.SendWebRequest();
                    if (req.result != UnityWebRequest.Result.Success)
                    {
                        string corps = req.downloadHandler != null ? req.downloadHandler.text : null;
                        string codeServi = MafiaCleanCity.I18n.RefusServi.Code(corps);
                        if (tentative == 0 && MafiaCleanCity.I18n.CollecteMots.ReessayerEnSilence(req.responseCode, codeServi)) continue;
                        DernierCodeDeRefus = codeServi;
                        DernierePhraseDeRefus = MafiaCleanCity.I18n.RefusServi.Phrase(corps);
                        onErr?.Invoke(req.responseCode, req.error ?? "network error");
                        yield break;
                    }
                    CollectData dto = null;
                    try { dto = JsonUtility.FromJson<CollectEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                    DernierePhraseDeRefus = null;
                    onOk?.Invoke(dto);
                    yield break;
                }
            }
        }

        /// <summary>COLLECTE — le `code` du DERNIER refus de ramassage (`payload.error.code`), null sur un succès ou sans code servi. Le
        /// statut ne suffit pas : trois codes partagent le 409.</summary>
        public string DernierCodeDeRefus { get; private set; }
    }
}
