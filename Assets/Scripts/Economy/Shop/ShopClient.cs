using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Economy.Shop
{
    // ㉓ LA VITRINE — les 4 routes joueur d'`iap.controller.ts` que cet écran tire, toutes sous
    // `JwtAuthGuard` (mesuré 2026-09-02). La cinquième, `POST /v1/iap/purchase/validate`, n'est
    // PAS ici : voir le commentaire de `Acheter` pour pourquoi elle ne peut aboutir nulle part.
    //
    // ⚠️ Deux préfixes DIFFÉRENTS dans le même contrôleur — `iap/catalogue` n'a pas de `me/`
    // (le catalogue ne porte aucune donnée par joueur), les trois autres l'ont. Recopiés du
    // fichier, jamais dérivés d'une règle : une convention supposée aurait produit 404 sur l'un.
    public class ShopClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/{leaf}";

        private static bool Recu(UnityWebRequest req, Action<long, string> onErr)
        {
            if (req.result == UnityWebRequest.Result.Success) return true;
            onErr?.Invoke(req.responseCode, req.error ?? "network error");
            return false;
        }

        /// <summary>GET /v1/iap/catalogue — tous les SKU ACTIVÉS.</summary>
        public IEnumerator ListerCatalogue(string bearer, Action<SkuDto[]> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("iap/catalogue")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (!Recu(req, onErr)) yield break;
                SkuDto[] dto = null;
                // ⚠️ `JsonUtility` ne lève PAS sur une forme qui ne correspond pas : il rend un
                // champ nul en silence. On teste le null, jamais l'absence d'exception.
                try { dto = JsonUtility.FromJson<CatalogueEnvelope>(req.downloadHandler.text)?.payload?.data?.skus; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data.skus`"); yield break; }
                onOk?.Invoke(dto);
            }
        }

        /// <summary>GET /v1/me/iap/balance — `{ marks_balance }`.
        ///
        /// ⚠️ 404 `RESOURCE_NOT_FOUND` si le joueur n'a pas de ligne `economy_states` — le
        /// contrôleur le documente comme « inatteignable via signup en pratique ». L'écran
        /// traite quand même ce cas : un solde qu'on ne peut pas lire n'est pas un solde nul.</summary>
        public IEnumerator LireSolde(string bearer, Action<int> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("me/iap/balance")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (!Recu(req, onErr)) yield break;
                BalanceData dto = null;
                try { dto = JsonUtility.FromJson<BalanceEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto.marks_balance);
            }
        }

        /// <summary>GET /v1/me/iap/entitlements — les SKU déjà possédés.</summary>
        public IEnumerator ListerPossessions(string bearer, Action<string[]> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("me/iap/entitlements")))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (!Recu(req, onErr)) yield break;
                string[] dto = null;
                try { dto = JsonUtility.FromJson<EntitlementsEnvelope>(req.downloadHandler.text)?.payload?.data?.skus; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data.skus`"); yield break; }
                onOk?.Invoke(dto);
            }
        }

        /// <summary>POST /v1/me/iap/items/purchase — corps `{ sku_id }` SEUL.
        ///
        /// ⛔ Le prix n'est PAS envoyé, et c'est une décision du back écrite dans son propre
        /// commentaire : « un prix fourni par le client sur une route d'argent est une
        /// vulnérabilité par construction ». Le serveur le résout depuis le catalogue. Ne jamais
        /// « aider » en ajoutant `cost_marks` au corps.
        ///
        /// ⚠️ La route exige un en-tête d'idempotence (`@Idempotent({ required: true })`) — sans
        /// lui elle refuse. On en pose donc un, dérivé du SKU et de l'horloge : deux clics sur le
        /// même article produisent deux clés distinctes (deux achats voulus), un re-envoi réseau
        /// de la MÊME requête rejoue la même clé (un seul débit).
        ///
        /// ⛔⛔ N'ACHÈTE QUE DU COSMETIC / SAVE_SLOT. Les MARKS_PACK et SUPPORT sont en argent
        /// réel et passent par `iap/purchase/validate` — que ce client n'appelle pas, parce
        /// qu'elle **ne peut créditer dans AUCUN environnement** : la production câble
        /// `NullIapReceiptVerifier` (rend toujours null) et l'allow-list du faux vérificateur est
        /// VIDE par défaut. Un bouton « acheter des jetons » serait un bouton qui ne peut pas
        /// aboutir ; la vitrine montre donc ces articles derrière la vitre, sans geste.</summary>
        public IEnumerator Acheter(string skuId, string bearer, Action<string> onOk, Action<long, string> onErr)
        {
            string corps = "{\"sku_id\":\"" + skuId + "\"}";
            using (UnityWebRequest req = UnityWebRequest.Post(Url("me/iap/items/purchase"), corps, "application/json"))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.SetRequestHeader("Idempotency-Key", $"vitrine-{skuId}-{DateTime.UtcNow.Ticks}");
                yield return req.SendWebRequest();
                if (!Recu(req, onErr)) yield break;
                PurchaseData dto = null;
                try { dto = JsonUtility.FromJson<PurchaseEnvelope>(req.downloadHandler.text)?.payload?.data; }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data`"); yield break; }
                onOk?.Invoke(dto.sku_id);
            }
        }
    }
}
