using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Account.Profile
{
    // ㉒ — `GET /v1/me` (`auth.controller.ts`, `MeController`, sous `JwtAuthGuard`).
    //
    // ⛔ UNE SEULE ROUTE, EN LECTURE. Mesuré le 2026-09-02 : il n'existe AUCUNE mutation de
    // profil — ni changement d'email, ni de mot de passe, ni TOTP (S10-c), et **aucune route
    // n'écrit `locale`** alors que le champ existe en base et EST projeté ici (S10-b, forme B :
    // la donnée est lue, jamais écrite). La langue ne se change donc pas, depuis nulle part.
    //
    // ⛔ Et le masquage d'email que le canon demande n'existe pas côté serveur : la route rend
    // l'adresse EN CLAIR. Le masquer à l'affichage est donc une décision du CLIENT, et elle ne
    // protège rien sur le fil — c'est écrit à l'écran plutôt que laissé croire.
    public class ProfileClient
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;

        /// <summary>GET /v1/me — les 5 champs projetés.</summary>
        public IEnumerator LireProfil(string bearer, Action<ProfilData> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get($"{BaseUrl.TrimEnd('/')}/v1/me"))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                { onErr?.Invoke(req.responseCode, req.error ?? "network error"); yield break; }
                ProfilData dto = null;
                try { dto = JsonUtility.FromJson<ProfilEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto);
            }
        }
    }
}
