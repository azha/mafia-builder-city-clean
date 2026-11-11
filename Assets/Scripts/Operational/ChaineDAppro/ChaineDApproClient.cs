using System;
using System.Collections;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // ecran_appro « La chaîne d'appro » — mesuré en direct sur la pile de dev le 2026-09-03 (compte
    // `operational_demo@example.test`) — voir ChaineDApproDtos.cs pour le détail des corps.
    // Idiome enveloppe/payload/data + Idempotency-Key sur les mutations, patron
    // `DailyReviewClient`/`ReputationClient` (㊲, la référence à deux juges). Routes couvertes :
    // GET /v1/operational/precursors?building_id=<uuid>   (⚠️ le paramètre est OBLIGATOIRE : sans
    //                                                       lui, 422 "building_id query param is required")
    // POST /v1/operational/precursors/order
    // GET /v1/supply-chain/graph                          (⚠️ SANS le préfixe operational/)
    // POST /v1/supply-chain/legs/:id/maintain {mode}       (㉚ gestes : « Entretenir la liaison » — réponse jamais mesurée, voir DTOs)
    // POST /v1/operational/routes/:id/rebuild {mode}       (㉚ gestes : « Reconstruire la route » — réponse MESURÉE camelCase)
    public class ChaineDApproClient
    {
        /// <summary>Garde de classe des refus (f2 2026-09-26) — la phrase SERVIE du DERNIER refus de ce client (clé + payload_vars
        /// résolues, `RefusServi`), posée après CHAQUE requête : null sur un 2xx, ou quand le corps ne porte pas de clé servie.
        /// ⛔ C'est la SEULE phrase de refus qu'un écran montre au joueur (sinon la sienne) ; le `message` d'onErr est TECHNIQUE.</summary>
        public string DernierePhraseDeRefus { get; private set; }

        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;

        /// <summary>`GET /v1/operational/precursors?building_id=<uuid>` — mesuré (2026-09-03) : 9
        /// clés (voir `GetOperationalPrecursorsResponseDto`). `buildingId` est OBLIGATOIRE — la
        /// route rend 422 « building_id query param is required » sans lui ; ce client ne devine
        /// jamais un identifiant, l'appelant doit l'avoir découvert (voir
        /// `ChaineDApproScreenController.DecouvrirBuildingId`).</summary>
        public IEnumerator GetOperationalPrecursors(string bearer, string buildingId,
                                     Action<GetOperationalPrecursorsResponseDto> onOk, Action<long, string> onErr)
        {
            string url = BaseUrl.TrimEnd('/') + "/v1/operational/precursors?building_id="
                         + UnityWebRequest.EscapeURL(buildingId ?? string.Empty);
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetOperationalPrecursorsResponseDto dto =
                        JsonUtility.FromJson<GetOperationalPrecursorsEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetOperationalPrecursors)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/operational/precursors?building_id={buildingId} a échoué " +
                                   $"({req.responseCode}) {req.error}");
            }
        }
        /// <summary>`POST /v1/operational/precursors/order` — corps `{building_id, precursor_type,
        /// quantity_units}`, réponse mesurée `{order_id}` (voir `PostOperationalPrecursorsOrderBody`/
        /// `ResponseDto`). Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du back l'honore,
        /// qu'un `@Idempotent` explicite soit présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator PostOperationalPrecursorsOrder(string bearer, PostOperationalPrecursorsOrderBody corps,
                                     Action<PostOperationalPrecursorsOrderResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/operational/precursors/order", "POST"))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(json));
                req.downloadHandler = new DownloadHandlerBuffer();
                MafiaCleanCity.ClientHttp.Json(req);
                MafiaCleanCity.ClientHttp.Idempotent(req);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);
                if (req.result == UnityWebRequest.Result.Success)
                {
                    PostOperationalPrecursorsOrderResponseDto dto =
                        JsonUtility.FromJson<PostOperationalPrecursorsOrderEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (PostOperationalPrecursorsOrder)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/operational/precursors/order a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
        /// <summary>`GET /v1/supply-chain/graph` — mesuré (2026-09-03) : `{nodes, legs, routes}`
        /// (voir `GetSupplyChainGraphResponseDto`). ⛔ `nodes` est VIDE sur le compte de démo —
        /// c'est le fait porteur de cet écran, voir `ChaineDApproScreenController.AppliquerChaine`.
        /// ⚠️ SANS le préfixe `operational/` dans l'URL (avec, 404 — mesuré).</summary>
        public IEnumerator GetSupplyChainGraph(string bearer,
                                     Action<GetSupplyChainGraphResponseDto> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/supply-chain/graph"))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);
                if (req.result == UnityWebRequest.Result.Success)
                {
                    GetSupplyChainGraphResponseDto dto = LireGraphe(req.downloadHandler.text);
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetSupplyChainGraph)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/supply-chain/graph a échoué ({req.responseCode}) {req.error}");
            }
        }

        private static readonly Regex ValeurBooleenne = new Regex("\\G\\s*:\\s*(true|false)\\b");

        /// <summary>La clé `nom` est-elle PRÉSENTE au PREMIER niveau de l'objet brut `objet`, avec une valeur booléenne ? (revue ⊥ m4 : un `maintaining` d'un sous-objet ne compte pas ; un mot dans une chaîne non plus.)</summary>
        private static bool CleBooleenneAuPremierNiveau(string objet, string nom)
        {
            int profondeur = 0;
            for (int i = 0; i < objet.Length; i++)
            {
                char c = objet[i];
                if (c == '"')
                {
                    int fin = FinDeChaine(objet, i);
                    if (fin < 0) return false;
                    if (profondeur == 1 && fin - i - 1 == nom.Length && string.CompareOrdinal(objet, i + 1, nom, 0, nom.Length) == 0
                        && ValeurBooleenne.Match(objet, fin + 1).Success) return true;
                    i = fin;
                    continue;
                }
                if (c == '{' || c == '[') profondeur++;
                else if (c == '}' || c == ']') profondeur--;
            }
            return false;
        }

        /// <summary>㉚ gestes — le corps du graphe → son DTO. `JsonUtility` ne distingue pas l'absent du faux : la PRÉSENCE de `legs[].maintaining` (ADDITIF,
        /// à servir par BACK-1, nom FIXÉ) se lit dans le corps BRUT, par son NOM, liaison par liaison (patron `DelegationClient.LireTaskCategories`), et se
        /// pose dans `SupplyChainLegDto.MaintainingServi`. Absent ⇒ faux : rien n'est dessiné. `static` : un test lui donne un corps brut, sans réseau.
        /// Quand BACK-1 servira les coûts par mode, leur lecture se posera ICI (TD-1046) — le nom de la clé n'étant pas connu, rien n'en est lu aujourd'hui.
        /// Null si le corps n'a pas `payload.data`.</summary>
        public static GetSupplyChainGraphResponseDto LireGraphe(string corps)
        {
            GetSupplyChainGraphResponseDto dto = null;
            try { dto = JsonUtility.FromJson<GetSupplyChainGraphEnvelope>(corps ?? "")?.payload?.data; }
            catch (Exception) { return null; }
            if (dto == null) return null;
            List<string> liaisons = ObjetsDuTableau(corps, "legs");
            // le N-ième objet brut est la N-ième liaison du DTO (JsonUtility garde l'ordre) ; un compte qui diverge ⇒ on ne devine rien
            if (dto.legs != null && liaisons != null && liaisons.Count == dto.legs.Length)
                for (int i = 0; i < dto.legs.Length; i++)
                    if (dto.legs[i] != null) dto.legs[i].MaintainingServi = CleBooleenneAuPremierNiveau(liaisons[i], "maintaining");
            return dto;
        }

        /// <summary>Les objets (texte brut) du tableau `nom` du corps, dans l'ordre ; null si le tableau est absent ou le corps mal formé.</summary>
        private static List<string> ObjetsDuTableau(string corps, string nom)
        {
            if (string.IsNullOrEmpty(corps)) return null;
            Match m = Regex.Match(corps, "\"" + nom + "\"\\s*:\\s*\\[");
            if (!m.Success) return null;
            var objets = new List<string>();
            int profondeur = 0, debut = -1;
            for (int i = m.Index + m.Length; i < corps.Length; i++)
            {
                char c = corps[i];
                if (c == '"')
                {
                    i = FinDeChaine(corps, i);
                    if (i < 0) return null;
                    continue;
                }
                if (c == '{') { if (profondeur == 0) debut = i; profondeur++; }
                else if (c == '}')
                {
                    profondeur--;
                    if (profondeur == 0 && debut >= 0) { objets.Add(corps.Substring(debut, i - debut + 1)); debut = -1; }
                }
                else if (c == ']' && profondeur == 0) return objets;
            }
            return null;
        }

        /// <summary>L'indice du guillemet fermant de la chaîne qui s'ouvre en `debut` (les échappements `\"` sont sautés), ou -1.</summary>
        private static int FinDeChaine(string s, int debut)
        {
            for (int i = debut + 1; i < s.Length; i++)
            {
                if (s[i] == '\\') { i++; continue; }
                if (s[i] == '"') return i;
            }
            return -1;
        }

        /// <summary>`POST /v1/supply-chain/legs/:id/maintain {mode}` — CÂBLÉE par ㉚ « les deux gestes » (`id` = `legs[].leg_id`, servi, jamais dessiné). ⚠️ Le corps de
        /// réponse n'a JAMAIS été mesuré (TD-1049) : un 2xx est un SUCCÈS quel que soit son corps — l'après-geste vient de la relecture du graphe, jamais
        /// d'ici. Idempotency-Key posée (patron `PostOperationalPrecursorsOrder`).</summary>
        public IEnumerator PostSupplyChainLegsMaintain(string bearer, string id, PostSupplyChainLegsMaintainBody corps,
                                     Action<PostSupplyChainLegsMaintainResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/supply-chain/legs/" + UnityWebRequest.EscapeURL(id) + "/maintain", "POST"))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(json));
                req.downloadHandler = new DownloadHandlerBuffer();
                MafiaCleanCity.ClientHttp.Json(req);
                MafiaCleanCity.ClientHttp.Idempotent(req);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);
                if (req.result == UnityWebRequest.Result.Success)
                    onOk?.Invoke(new PostSupplyChainLegsMaintainResponseDto());   // réponse jamais mesurée : on ne la lit pas (TD-1049)
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/supply-chain/legs/:id/maintain a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }

        /// <summary>`POST /v1/operational/routes/:id/rebuild {mode}` — ㉚ « Reconstruire la route » (`routeId` = `routes[].route_id`, servi, jamais dessiné). Réponse MESURÉE
        /// (`mesures/08-rebuild-MINIMAL_REROUTE.json`) : **camelCase** `{routeId, mode, version, rebuildCompletesAtTick}`. Un 2xx est un succès ; le corps est lu au mieux
        /// et ne sert à RIEN d'affiché (le tick est brut, R2.2) : l'après-geste vient de la relecture du graphe (juge ㉚ E2). Idempotency-Key posée.</summary>
        public IEnumerator PostOperationalRoutesRebuild(string bearer, string routeId, PostOperationalRoutesRebuildBody corps,
                                     Action<PostOperationalRoutesRebuildResponseDto> onOk, Action<long, string> onErr)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/operational/routes/" + UnityWebRequest.EscapeURL(routeId) + "/rebuild", "POST"))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(json));
                req.downloadHandler = new DownloadHandlerBuffer();
                MafiaCleanCity.ClientHttp.Json(req);
                MafiaCleanCity.ClientHttp.Idempotent(req);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);
                if (req.result == UnityWebRequest.Result.Success)
                {
                    PostOperationalRoutesRebuildResponseDto dto = null;
                    try { dto = JsonUtility.FromJson<PostOperationalRoutesRebuildEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception) { /* un 2xx reste un succès */ }
                    onOk?.Invoke(dto ?? new PostOperationalRoutesRebuildResponseDto());
                }
                else
                {
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"POST /v1/operational/routes/:id/rebuild a échoué ({req.responseCode}) {req.error} {corpsErr}");
                }
            }
        }
    }
}
