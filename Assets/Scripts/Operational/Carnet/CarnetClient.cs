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
    ///   ⛔ PÉRIMÉ (C8, 2026-09-26) : `GET /v1/political-events/calendar` rend 200, route joueur publique depuis e40f4142
    ///   (2026-07-06) — aucun des quatre chemins essayés le 03/09 n'était celui-là. Branché ci-dessous.
    /// ★ Le 403 est une INFORMATION, pas un échec : c'est le
    ///   `NAMED_SEQUENCE_UNLOCK_REQUIRED` que la maquette m-89 demande de montrer VERROUILLÉ.
    ///   Le traiter comme une erreur cacherait la seule chose que ce cadre existe pour dire.
    /// ⚠️ ET J'AI D'ABORD SONDÉ LES PRÉFIXES : `/v1/cue-stack` nu rend 404, comme dix autres
    /// candidats devinés, et j'ai failli conclure que la route n'existait pas. *Un 404 sur un
    /// préfixe ne dit rien de ses enfants.* Les chemins ci-dessus sont lus, pas inventés.</summary>
    public class CarnetClient
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;

        private string Url(string suffixe) => BaseUrl.TrimEnd('/') + "/v1/" + suffixe;

        /// <summary>`GET /v1/cue-stack/current` — le carnet du soir en cours.
        /// ⚠️ Sur un compte frais : `slots: []` et `state: null`. Ce n'est PAS une panne, c'est
        /// un carnet vide — et les deux se dessinent différemment.</summary>
        public IEnumerator GetCarnetCourant(string bearer,
            Action<CarnetCourantDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("cue-stack/current")))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
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
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
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

        // ═══ ㉞ le composeur (26/09) — les sources de cibles et les deux envois ═══════════════════════════════════════════

        /// <summary>⛔ Réservé aux tests : (méthode, chemin, corps envoyé) → (code HTTP, corps rendu). Aucun réseau quand posé.</summary>
        public static Func<string, string, string, (long code, string corps)> SubstitutPourTest;

        private IEnumerator Echanger(string methode, string chemin, string corps, string bearer, Action<long, string> fin)
        {
            if (SubstitutPourTest != null)
            {
                (long code, string rendu) = SubstitutPourTest(methode, chemin, corps);
                fin(code, rendu);
                yield break;
            }
            using (var req = new UnityWebRequest(Url(chemin), methode))
            {
                req.downloadHandler = new DownloadHandlerBuffer();
                if (corps != null)
                {
                    req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(corps));
                    MafiaCleanCity.ClientHttp.Json(req);
                    MafiaCleanCity.ClientHttp.Idempotent(req);
                }
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                fin(req.responseCode, req.downloadHandler != null ? req.downloadHandler.text : null);
            }
        }

        /// <summary>`GET /v1/operational/routes` — les itinéraires SAUVÉS (le filtre exact de compose). Null sur échec.</summary>
        public IEnumerator GetRoutesSauvees(string bearer, Action<RouteSauveeDto[]> fin)
        {
            RouteSauveeDto[] r = null;
            yield return Echanger(UnityWebRequest.kHttpVerbGET, "operational/routes", null, bearer, (code, corps) =>
            {
                if (code < 200 || code >= 300) return;
                try { r = JsonUtility.FromJson<RoutesSauveesEnvelope>(corps)?.payload?.data?.routes; } catch { r = null; }
            });
            fin?.Invoke(r);
        }

        /// <summary>`GET /v1/recruitment/candidates` — les candidats `available`. Null sur échec.</summary>
        public IEnumerator GetCandidats(string bearer, Action<CandidatDto[]> fin)
        {
            CandidatDto[] r = null;
            yield return Echanger(UnityWebRequest.kHttpVerbGET, "recruitment/candidates", null, bearer, (code, corps) =>
            {
                if (code < 200 || code >= 300) return;
                try { r = JsonUtility.FromJson<CandidatsEnvelope>(corps)?.payload?.data?.candidates; } catch { r = null; }
            });
            fin?.Invoke(r);
        }

        /// <summary>Ce que rend un envoi du composeur : le carnet servi (CueStackView) si 2xx, sinon le corps BRUT du refus — l'écran
        /// le fait parler par `ComposeurDuCarnet.PhraseDuRefus` (jamais le `message` de développeur).</summary>
        public class Envoi { public bool Ok; public long Code; public string Corps; public CarnetCourantDto Carnet; }

        public IEnumerator Composer(CueStackComposeDto corps, string bearer, Action<Envoi> fin) =>
            Envoyer("cue-stack/compose", JsonUtility.ToJson(corps), bearer, fin);

        public IEnumerator Lancer(bool acquitter, string bearer, Action<Envoi> fin) =>
            Envoyer("cue-stack/commit", JsonUtility.ToJson(new CueStackCommitDto { acknowledge_compounding = acquitter }), bearer, fin);

        private IEnumerator Envoyer(string chemin, string corps, string bearer, Action<Envoi> fin)
        {
            var e = new Envoi();
            yield return Echanger(UnityWebRequest.kHttpVerbPOST, chemin, corps, bearer, (code, rendu) =>
            {
                e.Code = code; e.Corps = rendu; e.Ok = code >= 200 && code < 300;
                if (e.Ok) { try { e.Carnet = JsonUtility.FromJson<CarnetCourantEnvelope>(rendu)?.payload?.data; } catch { e.Carnet = null; } }
            });
            fin?.Invoke(e);
        }

        /// <summary>C8 — `GET /v1/political-events/calendar` : ce que la ville prépare (en cours, annoncé). Public côté back (la
        /// ville est une pour tous) ; le jeton est envoyé quand même, comme partout.</summary>
        public IEnumerator GetCalendrierPolitique(string bearer, Action<CalendrierPolitiqueDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("political-events/calendar")))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    CalendrierPolitiqueDto dto = null;
                    try { dto = JsonUtility.FromJson<CalendrierPolitiqueEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetCalendrierPolitique)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/political-events/calendar a échoué ({req.responseCode}) {req.error}");
            }
        }
    }
}
