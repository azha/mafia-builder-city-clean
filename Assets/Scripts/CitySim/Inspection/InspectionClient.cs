using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.CitySim.Inspection
{
    // Les 2 routes joueur d'`inspection.controller.ts` (sous `JwtAuthGuard`) + la route publique des
    // noms de districts. ⛔ LA LECTURE EST SCOPÉE DISTRICT : `GET /v1/city/district/:id/inspection` rend
    // UN district, et aucune route ne rend les 18 — le registre de la maquette #32 coûte 18 appels
    // (juge de données du 07/09, lot L2 côté back : « l'agrégat est à une projection de distance »).
    public class InspectionClient
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;

        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/{leaf}";

        /// <summary>⛔ RÉSERVÉ AUX TESTS hors réseau (TD-879, patron `HlCardClient.ReponsePourTest`) : (statut, corps) d'une file, par district, à
        /// la place du back. Le corps passe par le MÊME chemin de lecture que la réponse réseau (`FromJson<FileEnvelope>`, mêmes deux refus) —
        /// seul le transport est remplacé.</summary>
        public Func<int, (long statut, string corps)> ReponsePourTest;

        /// <summary>GET /v1/city/district/:id/inspection — la file d'UN district.
        /// Au 2026-11-11 (back servi `main` 2ed39589) : un compte qui n'a pas vécu le tick de dispatch (12 h) reçoit un 404 sur les 18
        /// districts — et un compte SANS profil reçoit un 404 indiscernable (même code, même clé servie : TD-1010). Le back de BACK-2
        /// (TD-879) sert à la place une file VIDE en 200 (`queue_load: EMPTY`) : le client la rend en 18 lignes « VIDE ».</summary>
        public IEnumerator LireFile(int districtId, string bearer,
            Action<FileData> onOk, Action<long, string> onErr)
        {
            if (ReponsePourTest != null)
            {
                (long statut, string texte) = ReponsePourTest(districtId);
                if (statut < 200 || statut >= 300) { onErr?.Invoke(statut, $"inspection {districtId} failed ({statut}) (réponse de test)"); yield break; }
                FileData dtoTest = null;
                try { dtoTest = JsonUtility.FromJson<FileEnvelope>(texte)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(statut, "parse error: " + ex.Message); yield break; }
                if (dtoTest == null) { onErr?.Invoke(statut, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dtoTest);
                yield break;
            }
            using (UnityWebRequest req = UnityWebRequest.Get(Url($"city/district/{districtId}/inspection")))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
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

        /// <summary>GET /v1/world/districts — les 18 noms de fiction (« Les Bassins » … « Pont-Gris »),
        /// route publique, servie 200 × 18 lignes × 9 clés (mesuré 2026-09-22). Le registre nomme les
        /// districts par ce nom, jamais par le slug `district-1` de la file (défaut D5 du juge).</summary>
        public IEnumerator LireDistricts(string bearer,
            Action<DistrictNomDto[]> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("world/districts")))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    onErr?.Invoke(req.responseCode, req.error ?? "network error");
                    yield break;
                }
                DistrictsNomsData dto = null;
                try { dto = JsonUtility.FromJson<DistrictsNomsEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null || dto.districts == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data.districts`"); yield break; }
                onOk?.Invoke(dto.districts);
            }
        }

        /// <summary>POST /v1/city/inspection/report — corps `{ building_id, entry_type }`.
        /// `building_id` est l'UUID d'un bâtiment POSSÉDÉ (contrôle d'appartenance côté back,
        /// `inspection.controller.ts:154-160`) — la forme entière est un proxy hérité. Réponse 201 :
        /// `{ report_id, entry_type, cost_resolved, backlash_triggered }`, 4 clés mesurées.
        /// ★ `backlash_triggered` est un FRONT : vrai une seule fois, au dépôt qui fait basculer la
        /// police, jamais relisible par une route. Le rater, c'est le perdre (S12-b).</summary>
        public IEnumerator Deposer(string buildingId, string typeEntree, string bearer,
            Action<RapportData> onOk, Action<long, string> onErr)
        {
            string corps = "{\"building_id\":\"" + Echapper(buildingId) + "\",\"entry_type\":\"" + Echapper(typeEntree) + "\"}";
            using (UnityWebRequest req = UnityWebRequest.Post(Url("city/inspection/report"), corps, MafiaCleanCity.ClientHttp.TypeJson))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
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

        private static string Echapper(string s) =>
            (s ?? string.Empty).Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}
