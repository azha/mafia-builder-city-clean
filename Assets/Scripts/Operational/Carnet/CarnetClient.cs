using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    /// <summary>㉞ « les ordres du soir » — le carnet. Routes MESURÉES le 2026-09-03, pas
    /// devinées : leurs chemins viennent de la documentation du back et leurs CODES d'une sonde.
    ///
    /// ⛔ CE QUE LA SONDE A TRANCHÉ, et qu'aucune lecture n'aurait donné :
    ///     GET /v1/cue-stack/current        -> 200  {"cue_stack_id":null,"state":null,
    ///                                               "committed_at":null,"slots":[]}
    ///     GET /v1/cue-stack/named-sequences-> 403  (existe, droit manquant)
    ///     …/political-events/*             -> 404  sur les quatre chemins joueur essayés
    /// ★ Le 403 est une INFORMATION, pas un échec : c'est le
    ///   `NAMED_SEQUENCE_UNLOCK_REQUIRED` que la maquette m-89 demande de montrer VERROUILLÉ.
    ///   Le traiter comme une erreur cacherait la seule chose que ce cadre existe pour dire.
    /// ⚠️ ET J'AI D'ABORD SONDÉ LES PRÉFIXES : `/v1/cue-stack` nu rend 404, comme dix autres
    /// candidats devinés, et j'ai failli conclure que la route n'existait pas. *Un 404 sur un
    /// préfixe ne dit rien de ses enfants.* Les chemins ci-dessus sont lus, pas inventés.</summary>
    public class CarnetClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        private string Url(string suffixe) => BaseUrl.TrimEnd('/') + "/v1/" + suffixe;

        /// <summary>`GET /v1/cue-stack/current` — le carnet du soir en cours.
        /// ⚠️ Sur un compte frais : `slots: []` et `state: null`. Ce n'est PAS une panne, c'est
        /// un carnet vide — et les deux se dessinent différemment.</summary>
        public IEnumerator GetCarnetCourant(string bearer,
            Action<CarnetCourantDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("cue-stack/current")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    CarnetCourantDto dto =
                        JsonUtility.FromJson<CarnetCourantEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetCarnetCourant)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/cue-stack/current a échoué ({req.responseCode}) {req.error}");
            }
        }

        /// <summary>`GET /v1/cue-stack/named-sequences` — les soirées mises de côté (m-89).
        /// ⛔ MESURÉ 403 sur un compte frais : la route EXISTE et le droit manque
        /// (`NAMED_SEQUENCE_UNLOCK_REQUIRED`, palier 2). L'appelant reçoit donc le CODE, à charge
        /// pour lui de montrer la fonction VERROUILLÉE — la cacher effacerait ce que le joueur
        /// doit apprendre à débloquer.</summary>
        public IEnumerator GetSuitesNommees(string bearer,
            Action<SuitesNommeesDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("cue-stack/named-sequences")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    SuitesNommeesDto dto =
                        JsonUtility.FromJson<SuitesNommeesEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetSuitesNommees)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/cue-stack/named-sequences a échoué ({req.responseCode})");
            }
        }
    }
}
