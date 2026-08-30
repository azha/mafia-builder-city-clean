using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // ㊲ La réputation (screen_b3) — les 2 routes joueur de `reputation.controller.ts`.
    // Reprend l'idiome enveloppe/payload/data de tous les autres clients du dépôt, et
    // l'Idempotency-Key sur la mutation (l'`IdempotencyInterceptor` global l'honore, qu'un
    // marqueur `@Idempotent` soit présent ou non) — patron : `DailyReviewClient`.
    public class ReputationClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>`GET /v1/me/reputation?lieutenant_id=…[&counterparty_id=…]`
        /// (`reputation.controller.ts:126`).
        ///
        /// ⛔ `lieutenantId` est OBLIGATOIRE — la route rend 404 s'il manque, et 404 s'il n'est
        /// pas possédé par l'appelant. La propriété est validée DANS le contrôleur (`:137-148`),
        /// jamais déléguée à une lecture qui rendrait des valeurs neutres : c'est ce qui rend le
        /// sondage d'un joueur tiers indistinguable de « pas encore de données ». Un écran qui
        /// appelle sans lieutenant n'a donc pas un écran vide, il a une erreur.
        ///
        /// ⚠️ `counterpartyId` est optionnel, et sa mauvaise valeur ne se comporte PAS comme on
        /// l'attendrait — MESURÉ (juge-données ⊥ 2026-08-30, écart É5, consigné back S13-i) :
        /// une valeur qui n'est pas un UUID rend **500 INTERNAL_ERROR** (« invalid input syntax
        /// for type uuid »), pas 404 ; un UUID inexistant, lui, répond proprement
        /// (`offer_posture: "standard"`, `marginalia: []`). Le client ne passe donc ce paramètre
        /// que s'il tient un identifiant venant du serveur — jamais une saisie, jamais une
        /// chaîne fabriquée. Le correctif est back ; cette règle d'appel tient sans lui.</summary>
        public IEnumerator GetReputation(string bearer, string lieutenantId, string counterpartyId,
                                         Action<ReputationSurfaceDto> onOk, Action<long, string> onErr)
        {
            if (string.IsNullOrEmpty(lieutenantId))
            {
                onErr?.Invoke(0, "lieutenant_id requis — la route le refuse sans (404), " +
                                 "ce n'est pas un cas d'écran vide");
                yield break;
            }

            string url = BaseUrl.TrimEnd('/') + "/v1/me/reputation?lieutenant_id="
                       + UnityWebRequest.EscapeURL(lieutenantId);
            if (!string.IsNullOrEmpty(counterpartyId))
                url += "&counterparty_id=" + UnityWebRequest.EscapeURL(counterpartyId);

            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    ReputationSurfaceDto dto =
                        JsonUtility.FromJson<ReputationEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps de réputation vide"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"me/reputation a échoué ({req.responseCode}) {req.error}");
            }
        }

        /// <summary>`POST /v1/me/house-rules` → 201 `{ declared: true }`
        /// (`reputation.controller.ts:92`).
        ///
        /// ⚠️ Deux refus à traiter DIFFÉREMMENT, et l'écran doit les distinguer :
        ///   · **409 `RESOURCE_STATE_CONFLICT`** — le plafond de déclarations est atteint. Le
        ///     message porte `current`/`cap` (mesuré : « House-rule declaration cap reached
        ///     (4/4) — retract a rule before declaring another »). Ce n'est pas une panne :
        ///     c'est la règle du jeu qui parle, et elle mérite un état d'écran, pas un toast
        ///     d'erreur. ⛔ Le plafond est un TUNABLE (défaut 4, plage 2..8) : ne jamais écrire
        ///     « 4 » en dur côté client — il se lit dans le refus.
        ///   · **404** — `rule_id` vide ou non-textuel (`:102-104`).
        ///
        /// ⚠️ Et le geste est IDEMPOTENT côté métier : re-déclarer une règle déjà déclarée est un
        /// no-op qui réussit (`declareRule` s'en charge). Un double appui ne crée pas de doublon
        /// et ne consomme pas un cran du plafond.
        ///
        /// ⛔ Ce que cette route ne fait PAS, et c'est structurel : il n'existe AUCUNE route pour
        /// RETIRER une règle. `BossMirrorService.retractRule` existe mais n'a qu'un appelant, de
        /// test (`reputation-test.controller.ts:729`) — zéro en production. Or le canon dit
        /// qu'une règle tient « jusqu'à ce qu'elle soit publiquement retirée ». L'écran affiche
        /// donc un geste sans retour possible, et le dit — il ne dessine pas un bouton de
        /// retrait qui n'existe pas.</summary>
        public IEnumerator DeclareHouseRule(string bearer, string ruleId,
                                            Action<DeclareRuleResponseDto> onOk, Action<long, string> onErr)
        {
            string body = JsonUtility.ToJson(new DeclareHouseRuleBody { rule_id = ruleId });
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + "/v1/me/house-rules",
                                                 UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.timeout = TimeoutSeconds;
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    DeclareRuleResponseDto dto =
                        JsonUtility.FromJson<DeclareRuleEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps de house-rules vide"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    // Le corps d'erreur porte le motif ; on le remonte tel quel plutôt que de le
                    // reformuler — c'est là que vit le `current/cap` du plafond.
                    string corps = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"house-rules a échoué ({req.responseCode}) {req.error} {corps}");
                }
            }
        }

        [Serializable] private class DeclareHouseRuleBody { public string rule_id; }
    }
}
