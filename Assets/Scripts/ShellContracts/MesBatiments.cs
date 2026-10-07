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
    [Serializable] public class NomDeBatimentParamsDto { public string enseigne; public string district; public string block; public string rang; }   // `rang` : servi avec la clé `game.fiction.building.name.rang` (1/17 sur la démo, corps du 22/09)
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
        /// <summary>Lot back « achat-ouvrable » (lot/achat-ouvrable 6b6d7a5a, additif ; f2 26/09) — le type M1 ACHETÉ (toujours
        /// présent, dérivé de buildings.building_type), et les types en lesquels le bâtiment peut ENCORE s'ouvrir (le MÊME prédicat
        /// que les gardes de convert : district pour distribution_hub, gate grow_house ; `[]` une fois converti).</summary>
        public string purchased_type;
        public string[] convertible_types;
        /// <summary>Forme G : `convertible_types` est-il dans le corps SERVI ? Lu dans le corps brut (un back antérieur ne le sert
        /// pas, et JsonUtility ne dit pas l'absence). Pas un champ : JsonUtility ne le touche pas.</summary>
        public bool TypesOuvrablesServis { get; set; }
    }

    [Serializable] public class MesBatimentsData { public BatimentPossedeDto[] buildings; }
    [Serializable] public class MesBatimentsPayload { public MesBatimentsData data; }
    [Serializable] public class MesBatimentsEnvelope { public MesBatimentsPayload payload; }

    /// <summary>Un seul lecteur pour les quatre écrans qui ont besoin de « mes bâtiments ».</summary>
    public class MesBatimentsClient
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;

        /// <summary>Le corps brut de `me/buildings` → les données ; `TypesOuvrablesServis` posé sur CHAQUE bâtiment si
        /// `convertible_types` est dans le corps (forme G, lot back achat-ouvrable). Pur.</summary>
        public static MesBatimentsData LireCorps(string corps)
        {
            MesBatimentsData dto = UnityEngine.JsonUtility.FromJson<MesBatimentsEnvelope>(corps)?.payload?.data;
            bool servis = corps != null && corps.Contains("\"convertible_types\"");
            if (dto != null && dto.buildings != null)
                foreach (BatimentPossedeDto b in dto.buildings) if (b != null) b.TypesOuvrablesServis = servis;
            return dto;
        }

        public IEnumerator Lire(string bearer, Action<BatimentPossedeDto[]> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get($"{BaseUrl.TrimEnd('/')}/v1/me/buildings"))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    onErr?.Invoke(req.responseCode, req.error ?? "network error");
                    yield break;
                }
                MesBatimentsData dto = null;
                try { dto = LireCorps(req.downloadHandler.text); }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto.buildings ?? new BatimentPossedeDto[0]);
            }
        }
    }
}
