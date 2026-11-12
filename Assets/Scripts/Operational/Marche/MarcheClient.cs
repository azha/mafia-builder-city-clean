using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational.Marche
{
    /// <summary>㉑ — UNE lecture : `GET /v1/me/market/lanes` (JWT ; `market.controller.ts:104-106` @ef8be64e). La route par lane
    /// (`…/lanes/:districtId/:substanceType`, même type) n'est PAS appelée : la bande d'une case servie est déjà dans la liste, et une case
    /// sans ligne y rendrait 404 — ce que la liste dit par omission.</summary>
    public class MarcheClient
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;
        /// <summary>La phrase SERVIE du dernier refus (null : aucune, générique, ou succès).</summary>
        public string DernierePhraseDeRefus { get; private set; }

        /// <summary>⛔ RÉSERVÉ AUX TESTS hors réseau (patron `HlCardClient.ReponsePourTest`) : (statut, corps) à la place du back. Le corps passe
        /// par le MÊME chemin de lecture que la réponse réseau — seul le transport est remplacé.</summary>
        public Func<(long statut, string corps)> ReponsePourTest;

        public IEnumerator GetLanes(string bearer, Action<LaneConfidenceRowDto[]> onOk, Action<long, string> onErr)
        {
            long statut; string texte; bool succes;
            if (ReponsePourTest != null)
            {
                (statut, texte) = ReponsePourTest();
                succes = statut >= 200 && statut < 300;
            }
            else
            {
                using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/me/market/lanes"))
                {
                    MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                    MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                    yield return req.SendWebRequest();
                    statut = req.responseCode;
                    succes = req.result == UnityWebRequest.Result.Success;
                    texte = req.downloadHandler != null ? req.downloadHandler.text : null;
                }
            }
            DernierePhraseDeRefus = MafiaCleanCity.I18n.RefusServi.Phrase(succes ? null : texte);
            if (!succes) { onErr?.Invoke(statut, $"GET /v1/me/market/lanes a échoué ({statut})"); yield break; }
            LanesResponseDto dto = null;
            try { dto = JsonUtility.FromJson<LanesEnvelope>(texte)?.payload?.data; }
            catch (Exception ex) { onErr?.Invoke(statut, "parse error: " + ex.Message); yield break; }
            if (dto == null || dto.lanes == null) { onErr?.Invoke(statut, "corps sans `payload.data.lanes`"); yield break; }
            onOk?.Invoke(dto.lanes);
        }
    }
}
