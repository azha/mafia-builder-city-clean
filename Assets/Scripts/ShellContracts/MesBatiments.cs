using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Shell
{
    // GET /v1/me/buildings — LES BÂTIMENTS DU JOUEUR, EN UN APPEL.
    //
    // ⛔ LA ROUTE EXISTE ET LE CLIENT L'APPELAIT ZÉRO FOIS. Mesuré le 2026-09-22 (corps commité
    //    `Tools/juge-donnees/police/pont-district-2026-09-22/GET_me_buildings.json`, HTTP 200, 17 bâtiments
    //    sur 4 districts, back 03cf564c ; source `player-buildings.controller.ts:89`). Trois écrans
    //    affirmaient au joueur qu'aucune route ne liste ses bâtiments et bâtissaient leur état vide
    //    dessus — même famille que `safehouses` le 07/09 : le back a refermé, le client affirme
    //    encore l'inverse. Un état vide bâti sur une affirmation fausse n'est pas un état, c'est un trou.
    //
    // POURQUOI ICI : `ShellContracts` est la seule assembly référencée à la fois par `CitySim` (⑮) et
    //    `Operational` (㉝ ㉚ appro). Ajouter une référence d'asmdef serait invisible au typecheck hors
    //    porte (il lit les .csproj générés par Unity) : un CS0246 sur du code juste, déjà payé le 04/09.
    //
    // 7 clés servies par bâtiment, 7 déclarées — la forme G est tenue à la source.
    [Serializable] public class NomDeBatimentParamsDto { public string enseigne; public string district; public string block; }
    [Serializable] public class NomDeBatimentI18nDto { public string key; public NomDeBatimentParamsDto @params; }

    [Serializable]
    public class BatimentPossedeDto
    {
        public string building;              // uuid — l'identité que `POST city/inspection/report` accepte (bâtiment possédé)
        public int block_id;
        public int district_id;
        public string district_name;         // fiction française, servie (« La Lisière ») ; peut être vide sur un monde ancien
        public string operational_type;      // distribution_hub | specialized_lab | refinery | money_holding | … | null
        public NomDeBatimentI18nDto name_i18n;
        public string[] lieutenant_ids;
    }

    [Serializable] public class MesBatimentsData { public BatimentPossedeDto[] buildings; }
    [Serializable] public class MesBatimentsPayload { public MesBatimentsData data; }
    [Serializable] public class MesBatimentsEnvelope { public MesBatimentsPayload payload; }

    /// <summary>Un seul lecteur pour les quatre écrans qui ont besoin de « mes bâtiments ».</summary>
    public class MesBatimentsClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        public IEnumerator Lire(string bearer, Action<BatimentPossedeDto[]> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get($"{BaseUrl.TrimEnd('/')}/v1/me/buildings"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    onErr?.Invoke(req.responseCode, req.error ?? "network error");
                    yield break;
                }
                MesBatimentsData dto = null;
                try { dto = JsonUtility.FromJson<MesBatimentsEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto.buildings ?? new BatimentPossedeDto[0]);
            }
        }
    }
}
