using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using MafiaCleanCity.Account.Profile;

namespace MafiaCleanCity.Account.Settings
{
    // ⑲ LES RÉGLAGES — `PATCH /v1/me/settings` (auth.controller.ts, sous JwtAuthGuard).
    //
    // ⛔⛔ CET ÉCRAN ÉTAIT DÉCLARÉ BLOQUÉ CE MATIN, ET IL NE L'EST PLUS. Mesuré alors :
    // `player.locale` existait en base, était LU, était projeté par `GET /v1/me` — et **aucune
    // route ne l'écrivait**. C'était la forme B des chaînes mortes : la donnée vit, la transition
    // n'est jamais écrite. La session back a livré l'écrivain manquant dans la journée.
    // ⇒ *Un « bloqué » est une mesure DATÉE, pas une propriété de l'écran.* Re-mesuré avant
    // d'écrire une ligne : 1 route `me/settings`, verbe PATCH, garde JWT.
    //
    // ⚠️ CE QUI RESTE OUVERT, et le back le dit lui-même dans son commentaire : ce n'est PAS un
    // domaine de réglages. `player_settings` n'existe toujours pas comme table, et les autres
    // préférences vivent chacune sur SA route (`PATCH /v1/ui/tutorial-opt-out`,
    // `PUT /v1/me/meta-market/visibility`). S10-a reste ouvert : c'est l'écrivain d'UN champ.
    // L'écran ne montre donc qu'un réglage, et l'écrit — plutôt que de dessiner un panneau de
    // préférences dont une seule serait branchée.
    //
    // ⚠️ Il n'existe AUCUN `GET /v1/me/settings` : l'état courant se lit dans `GET /v1/me`, qui
    // projette `locale`. Deux routes pour un aller-retour, et c'est la surface réelle.
    public class SettingsClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>Les DEUX seules langues servies — `SUPPORTED_LOCALES` vaut `['en','fr']`
        /// (i18n/string_table.ts). Toute autre valeur rend 422, pas 400 : la convention du lot 0
        /// a remplacé le 400 du canon, et proposer une troisième langue serait un bouton qui
        /// échoue.</summary>
        public static readonly string[] Langues = { "fr", "en" };

        /// <summary>PATCH /v1/me/settings — corps `{ locale }`.
        /// ⚠️ Le joueur vient du JETON VÉRIFIÉ, jamais du corps : ne rien ajouter ici.
        /// ⚠️ `UnityWebRequest.Post` enverrait POST, que la route ne sert pas — on construit la
        /// requête avec son verbe, sinon le 404 ressemblerait à une route absente.</summary>
        public IEnumerator DefinirLangue(string locale, string bearer,
            Action<string> onOk, Action<long, string> onErr)
        {
            var req = new UnityWebRequest($"{BaseUrl.TrimEnd('/')}/v1/me/settings", "PATCH");
            req.uploadHandler = new UploadHandlerRaw(
                System.Text.Encoding.UTF8.GetBytes("{\"locale\":\"" + locale + "\"}"));
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");
            req.timeout = TimeoutSeconds;
            if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
            using (req)
            {
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                { onErr?.Invoke(req.responseCode, req.error ?? "network error"); yield break; }
                LangueData dto = null;
                try { dto = JsonUtility.FromJson<LangueEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto.locale);
            }
        }

        /// <summary>GET /v1/me — l'état courant, faute de `GET /v1/me/settings`.</summary>
        public IEnumerator LireProfil(string bearer, Action<ProfilData> onOk, Action<long, string> onErr)
        {
            return new ProfileClient { BaseUrl = BaseUrl, TimeoutSeconds = TimeoutSeconds }
                   .LireProfil(bearer, onOk, onErr);
        }
    }

    [Serializable] public class LangueData { public string locale; }
    [Serializable] public class LangueEnvelope { public LanguePayload payload; }
    [Serializable] public class LanguePayload { public LangueData data; }
}
