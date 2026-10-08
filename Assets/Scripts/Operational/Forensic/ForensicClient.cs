using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // screen_b7 « Forensic » — squelette généré par Tools/nouvel-ecran.py, MÉTIER ICI partout où
    // le corps RÉEL n'a pas encore été mesuré. Idiome enveloppe/payload/data + Idempotency-Key
    // sur les mutations, patron `DailyReviewClient`/`ReputationClient` (㊲, la référence à deux
    // juges). Routes couvertes :
    // GET /v1/me/forensic
    // GET /v1/me/internal-affairs/actors
    // GET /v1/me/legal            (les NOMS des avocats du roster : Q1)
    public class ForensicClient
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;

        /// <summary>Le nombre de requêtes ENVOYÉES par ce client (une par appel de route, succès ou non) : le compteur des gardes
        /// « un geste éteint n'émet AUCUNE requête » (㊴, DESIGN v5.2 §6) — il doit d'abord BOUGER au chargement.</summary>
        public int RequetesEmises { get; private set; }

        /// <summary>`GET /v1/me/forensic` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré —
        /// dériver `GetForensicResponseDto` du CORPS RÉEL (juge-données), jamais de l'interface
        /// TypeScript back lue seule.</summary>
        public IEnumerator GetForensic(string bearer,
                                     Action<GetForensicResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/me/forensic"))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                RequetesEmises++;
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetForensicResponseDto dto =
                        JsonUtility.FromJson<GetForensicEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetForensic)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/me/forensic a échoué ({req.responseCode}) {req.error}");
            }
        }

        /// <summary>`GET /v1/me/internal-affairs/actors` → `payload.data.actors[]` (le roster du joueur : `actorRef`, `actorType`, `status`).
        /// Une liste VIDE est un succès (aucun acteur), pas une erreur.</summary>
        public IEnumerator GetActeurs(string bearer, Action<ActeurDto[]> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/me/internal-affairs/actors"))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                RequetesEmises++;
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetActeursResponseDto dto = JsonUtility.FromJson<GetActeursEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null || dto.actors == null) { onErr?.Invoke(0, "corps sans `payload.data.actors` (GetActeurs)"); yield break; }
                    onOk?.Invoke(dto.actors);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/me/internal-affairs/actors a échoué ({req.responseCode}) {req.error}");
            }
        }

        /// <summary>`GET /v1/me/legal` → `{ lawyerId → nom de la personne }` (Q1 : la ligne d'un acteur `lawyer` porte son NOM, pas un
        /// identifiant). Le nom est `lawyerNameI18n.params.nom` ; vide ou sentinelle `unknown_lawyer` ⇒ l'avocat n'est PAS dans le
        /// dictionnaire (l'écran retombe sur la référence). Une erreur ne casse rien d'autre : l'appelant garde les références.</summary>
        public IEnumerator GetNomsAvocats(string bearer, Action<Dictionary<string, string>> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/me/legal"))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                RequetesEmises++;
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetLegalResponseDto dto = JsonUtility.FromJson<GetLegalEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetNomsAvocats)"); yield break; }
                    onOk?.Invoke(DossierCalculs.NomsDesAvocats(dto.lawyerRoster));
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/me/legal a échoué ({req.responseCode}) {req.error}");
            }
        }
    }
}
