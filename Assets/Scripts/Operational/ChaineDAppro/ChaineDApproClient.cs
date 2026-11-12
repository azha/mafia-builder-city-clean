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
    // GET /v1/supply-chain/upkeep-costs                   (㉚ V15 : coûts + bande de durée par mode — BACK-1 `lot/couts-30` @87820327, pas encore sur la pile)
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

        /// <summary>`GET /v1/supply-chain/upkeep-costs` (JwtAuthGuard, enveloppe `payload.data`) — `{maintenance[3], rebuild[3]}`, ligne `{mode, cost_cents, duration_band}` (contrat ㉚ §1.1, `upkeep-costs-view.ts` @87820327 :
        /// le coût ne dépend QUE du mode, aucune ligne joueur n'est lue). 2xx lisible ⇒ `onOk(CoutsServis)` ; tout le reste (404 sur la pile d'avant BACK-1, réseau, corps illisible) ⇒ `onErr` : l'APPELANT décide
        /// (`ChaineDApproScreenController.RelireLesCouts` : silencieux — une route absente n'est pas une panne de l'écran). Pas d'Idempotency-Key : un GET.</summary>
        public IEnumerator GetSupplyChainUpkeepCosts(string bearer,
                                     Action<CoutsServis> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl.TrimEnd('/') + "/v1/supply-chain/upkeep-costs"))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                DernierePhraseDeRefus = req.result == UnityWebRequest.Result.Success ? null : MafiaCleanCity.I18n.RefusServi.Phrase(req.downloadHandler != null ? req.downloadHandler.text : null);
                if (req.result == UnityWebRequest.Result.Success)
                {
                    CoutsServis couts = LireCouts(req.downloadHandler.text);
                    if (couts == null) { onErr?.Invoke(0, "corps illisible (GetSupplyChainUpkeepCosts)"); yield break; }
                    onOk?.Invoke(couts);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/supply-chain/upkeep-costs a échoué ({req.responseCode}) {req.error}");
            }
        }

        private static readonly Regex ValeurBooleenne = new Regex("\\G\\s*:\\s*(true|false)\\b");
        private static readonly Regex DeuxPoints = new Regex("\\G\\s*:\\s*");
        private static readonly Regex LitteralNu = new Regex("^(-?[0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?|true|false|null)$");
        private static readonly Regex EntierJson = new Regex("^(0|[1-9][0-9]*)$");
        private static readonly Regex PayloadData = new Regex("\"payload\"\\s*:\\s*\\{.*\"data\"\\s*:\\s*\\{", RegexOptions.Singleline);

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
        /// `legs[].maintaining` : nom et définition CONFIRMÉS par le code back (`legMaintaining`, `maintenance_completes_at_tick IS NOT NULL`, contrat ㉚ §1.3 @87820327). Les coûts par mode ne sont PAS sur le graphe
        /// (le coût ne dépend que du mode : `GET /v1/supply-chain/upkeep-costs`, `LireCouts`). Null si le corps n'a pas `payload.data`.</summary>
        public static GetSupplyChainGraphResponseDto LireGraphe(string corps)
        {
            // MESURÉ au créneau du 12/11 (GestesD6b) : `JsonUtility` INSTANCIE les objets imbriqués absents — `{"payload":{}}` rendait un graphe VIDE
            // (« rien à montrer ») au lieu de null (« corps illisible »). La présence de `payload.data` se lit donc dans le corps BRUT, comme `LireCouts`.
            if (string.IsNullOrEmpty(corps) || !PayloadData.IsMatch(corps)) return null;
            GetSupplyChainGraphResponseDto dto = null;
            try { dto = JsonUtility.FromJson<GetSupplyChainGraphEnvelope>(corps)?.payload?.data; }
            catch (Exception) { return null; }
            if (dto == null) return null;
            List<string> liaisons = ObjetsDuTableau(corps, "legs");
            // le N-ième objet brut est la N-ième liaison du DTO (JsonUtility garde l'ordre) ; un compte qui diverge ⇒ on ne devine rien
            if (dto.legs != null && liaisons != null && liaisons.Count == dto.legs.Length)
                for (int i = 0; i < dto.legs.Length; i++)
                    if (dto.legs[i] != null) dto.legs[i].MaintainingServi = CleBooleenneAuPremierNiveau(liaisons[i], "maintaining");
            return dto;
        }

        /// <summary>㉚ V15 — le corps de `GET /v1/supply-chain/upkeep-costs` → les coûts SERVIS. `JsonUtility` ne distingue pas l'absent de 0 : la PRÉSENCE se lit dans le corps BRUT, ligne par ligne (patron `LireGraphe`).
        /// · `cost_cents` absent, ou pas un ENTIER JSON non négatif (`5000.5`, `"5000"`, `1e3`, `null`) ⇒ ce mode n'a PAS de coût servi (et la feuille l'éteint) ;
        /// · un `mode` servi sur DEUX lignes (même tableau ou l'autre) ⇒ ce mode n'est PAS servi du tout : on ne choisit pas ; un champ répété dans une ligne ⇒ ce champ n'est pas servi ;
        /// · `duration_band` ∉ {immediate, brief, extended} (absent, autre mot) ⇒ pas de bande (`BandeServie` null) ; la bande ne se devine pas ;
        /// · une ligne illisible est ignorée — ANALYSE STRICTE : entre deux membres, exactement UNE virgule (blancs permis) ; virgule de tête, virgule finale, deux virgules de suite, membre sans virgule, littéral nu mal formé ⇒ illisible ; `MODERATE_RESTRUCTURE` est lue comme les autres et jamais demandée (la feuille n'a pas ce mode).
        /// Aucun montant, seuil ou bande n'est codé ici. Null si le corps n'a pas `payload.data` (ou est illisible). `static` : un test lui donne un corps brut, sans réseau.</summary>
        public static CoutsServis LireCouts(string corps)
        {
            // la présence de `payload.data` se lit dans le corps BRUT : `JsonUtility` instancie les objets imbriqués absents, et son indulgence envers un corps mal formé n'est pas mesurée — ce sont les analyseurs
            // stricts ci-dessous qui décident ligne par ligne
            if (string.IsNullOrEmpty(corps) || !PayloadData.IsMatch(corps)) return null;

            var lignes = new List<(string mode, string centimes, string bande)>();
            var parMode = new Dictionary<string, int>();
            foreach (string tableau in new[] { "maintenance", "rebuild" })
            {
                List<string> objets = ObjetsDuTableau(corps, tableau);
                if (objets == null) continue;
                foreach (string objet in objets)
                {
                    var doubles = new HashSet<string>();
                    Dictionary<string, string> champs = ChampsAuPremierNiveau(objet, doubles);
                    if (champs == null) continue;
                    string mode = doubles.Contains("mode") || !champs.TryGetValue("mode", out string brutMode) ? null : ChaineSimple(brutMode);
                    if (string.IsNullOrEmpty(mode)) continue;
                    string centimes = !doubles.Contains("cost_cents") && champs.TryGetValue("cost_cents", out string brutCout) && EntierJson.IsMatch(brutCout) ? brutCout : null;
                    string bande = !doubles.Contains("duration_band") && champs.TryGetValue("duration_band", out string brutBande) ? ChaineSimple(brutBande) : null;
                    if (bande != "immediate" && bande != "brief" && bande != "extended") bande = null;
                    lignes.Add((mode, centimes, bande));
                    parMode[mode] = parMode.TryGetValue(mode, out int n) ? n + 1 : 1;
                }
            }
            var centimesParMode = new Dictionary<string, string>();
            var bandesParMode = new Dictionary<string, string>();
            foreach (var l in lignes)
            {
                if (parMode[l.mode] != 1) continue;   // servi en double : on ne choisit pas
                if (l.centimes != null) centimesParMode[l.mode] = l.centimes;
                if (l.bande != null) bandesParMode[l.mode] = l.bande;
            }
            return new CoutsServis(centimesParMode, bandesParMode);
        }

        /// <summary>Les champs du PREMIER niveau de l'objet brut `objet` : nom → valeur brute (chaîne AVEC ses guillemets, nombre, littéral, sous-objet tel quel). `doubles` reçoit les noms vus deux fois (le premier est gardé).
        /// Null si l'objet est mal formé : STRICT — chaque membre est suivi d'UNE virgule (puis d'un autre membre) ou de `}` ; jamais de virgule de tête, finale ou double, jamais deux membres sans virgule.</summary>
        private static Dictionary<string, string> ChampsAuPremierNiveau(string objet, HashSet<string> doubles)
        {
            var champs = new Dictionary<string, string>();
            int i = objet.IndexOf('{');
            if (i < 0) return null;
            i++;
            while (i < objet.Length && char.IsWhiteSpace(objet[i])) i++;
            if (i < objet.Length && objet[i] == '}') return champs;   // `{}`
            while (true)
            {
                if (i >= objet.Length || objet[i] != '"') return null;   // aussi : virgule de tête, virgule finale (`,}`), deux virgules de suite
                int fin = FinDeChaine(objet, i);
                if (fin < 0) return null;
                string nom = objet.Substring(i + 1, fin - i - 1);
                Match m = DeuxPoints.Match(objet, fin + 1);
                if (!m.Success) return null;
                int debutValeur = fin + 1 + m.Length;
                int finValeur = FinDeValeur(objet, debutValeur);
                if (finValeur < 0) return null;
                string brut = objet.Substring(debutValeur, finValeur - debutValeur).Trim();
                if (brut.Length == 0) return null;
                if (brut[0] != '"' && brut[0] != '{' && brut[0] != '[' && !LitteralNu.IsMatch(brut)) return null;   // un littéral nu est un nombre, `true`, `false` ou `null`
                if (champs.ContainsKey(nom)) doubles.Add(nom); else champs[nom] = brut;
                i = finValeur;
                while (i < objet.Length && char.IsWhiteSpace(objet[i])) i++;
                if (i >= objet.Length) return null;
                if (objet[i] == '}') return champs;
                if (objet[i] != ',') return null;   // deux membres sans virgule
                i++;
                while (i < objet.Length && char.IsWhiteSpace(objet[i])) i++;
            }
        }

        /// <summary>L'indice qui suit la valeur JSON commençant en `debut` (chaîne, objet, tableau, ou littéral nu jusqu'à `,` / `}`), ou -1.</summary>
        private static int FinDeValeur(string s, int debut)
        {
            if (debut >= s.Length) return -1;
            char c = s[debut];
            if (c == '"')
            {
                int f = FinDeChaine(s, debut);
                return f < 0 ? -1 : f + 1;
            }
            if (c == '{' || c == '[')
            {
                int profondeur = 0;
                for (int k = debut; k < s.Length; k++)
                {
                    char d = s[k];
                    if (d == '"') { k = FinDeChaine(s, k); if (k < 0) return -1; continue; }
                    if (d == '{' || d == '[') profondeur++;
                    else if (d == '}' || d == ']') { profondeur--; if (profondeur == 0) return k + 1; }
                }
                return -1;
            }
            int j = debut;
            while (j < s.Length && s[j] != ',' && s[j] != '}') j++;
            return j;
        }

        /// <summary>Le contenu d'une valeur JSON qui est une chaîne SANS échappement ; null si ce n'est pas une chaîne (nombre, null…) ou si elle en porte un (un `mode` ou une bande servis n'en ont jamais).</summary>
        private static string ChaineSimple(string brut)
        {
            if (brut == null || brut.Length < 2 || brut[0] != '"' || brut[brut.Length - 1] != '"') return null;
            string interieur = brut.Substring(1, brut.Length - 2);
            return interieur.IndexOf('\\') >= 0 ? null : interieur;
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
        /// d'ici (BACK-1 y ajoute `maintenance_duration_band` à côté du tick — contrat ㉚ §1.2 — : NON lu, non déclaré). Un manque d'argent est un 409 `INSUFFICIENT_FUNDS`
        /// (`error.funds.insufficient`, @87820327, au lieu de `state_conflict`) : sa phrase vient de la clé du corps (`RefusServi`), rien à coder ici.
        /// Idempotency-Key posée (patron `PostOperationalPrecursorsOrder`).</summary>
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
        /// et ne sert à RIEN d'affiché (le tick est brut, R2.2) : l'après-geste vient de la relecture du graphe (juge ㉚ E2). Idempotency-Key posée.
        /// BACK-1 y ajoute `rebuildDurationBand` à côté du tick (contrat ㉚ §1.2) : NON lu, non déclaré. Manque d'argent : 409 `INSUFFICIENT_FUNDS`, phrase lue par `RefusServi` (comme `maintain`).</summary>
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
