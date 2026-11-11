using System;
using System.Collections;
using System.Linq;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational.Lieutenant
{
    // TD-877 (client, 11/11) — `GET /v1/lieutenants/host-eligibility` : pour chaque archétype, les bâtiments qui PEUVENT l'héberger, ceux qui ne le peuvent pas
    // (et POURQUOI), et — pour les trois archétypes à cible — les cibles valides. Recopié au CODE de BACK-2 @30057240 (V15) :
    // `operational/lieutenant/host-eligibility.projection.ts` (la forme) et `host-eligibility-targets.ts` (LOGISTICS = bâtiments opérationnels, LAUNDERING et
    // DISTRIBUTION = planques, les six autres : `null`). Le corps est dans l'enveloppe habituelle `payload.data`.
    // ⚠️ `valid_target_building_ids: null` (l'archétype n'a pas de cible) et `[]` (il en a une et le joueur n'a aucun candidat) sont DEUX réponses : JsonUtility
    // ne les distingue pas ; `PrendUneCible` est donc lu dans le corps BRUT (forme G, comme `TypesOuvrablesServis` de `me/buildings`). Rien n'est deviné ici :
    // ni la table hôte → type de bâtiment, ni la table archétype → cible, que le client dupliquait dans `HoteDeRecrutement` (TD-750, retiré).

    /// <summary>Un bâtiment refusé : son id, le CODE (logique) et la CLÉ i18n de la phrase (affichage).</summary>
    [Serializable]
    public class HostBloqueDto
    {
        public string building_id;
        public string blocked_reason;
        public string blocked_reason_i18n;
    }

    /// <summary>La ligne d'un archétype. `eligible_host_building_ids` peut être `[]` (une valeur, jamais une clé absente).</summary>
    [Serializable]
    public class HostArchetypeDto
    {
        public string archetype;
        public string[] eligible_host_building_ids;
        public HostBloqueDto[] blocked;
        public string[] valid_target_building_ids;
        /// <summary>Vrai si le corps SERT un tableau (même vide) pour `valid_target_building_ids`, faux s'il sert `null` : cet archétype ne prend pas de cible.
        /// Pas un champ sérialisé : JsonUtility ne le touche pas.</summary>
        [NonSerialized] public bool PrendUneCible;
    }

    [Serializable] public class HostEligibiliteData { public HostArchetypeDto[] archetypes; }
    [Serializable] public class HostEligibilitePayload { public HostEligibiliteData data; }
    [Serializable] public class HostEligibiliteEnvelope { public HostEligibilitePayload payload; }

    public static class HostEligibilite
    {
        private const string CleArchetype = "\"archetype\"", CleCible = "\"valid_target_building_ids\"";

        /// <summary>Le corps brut → les données, `PrendUneCible` posé ligne par ligne d'après le corps BRUT. Pur. Rend null si le corps n'a pas de `payload.data`.</summary>
        public static HostEligibiliteData LireCorps(string corps)
        {
            HostEligibiliteData dto = JsonUtility.FromJson<HostEligibiliteEnvelope>(corps)?.payload?.data;
            if (dto?.archetypes == null || corps == null) return dto;
            // les lignes se suivent dans le même ordre que dans le tableau : le segment d'une ligne va de SON « archetype » au « archetype » suivant
            // (les entrées `blocked` portent `building_id`, jamais `archetype`)
            int debut = corps.IndexOf(CleArchetype, StringComparison.Ordinal);
            for (int i = 0; i < dto.archetypes.Length && debut >= 0; i++)
            {
                int suivant = corps.IndexOf(CleArchetype, debut + CleArchetype.Length, StringComparison.Ordinal);
                int fin = suivant >= 0 ? suivant : corps.Length;
                int c = corps.IndexOf(CleCible, debut, fin - debut, StringComparison.Ordinal);
                if (c >= 0 && dto.archetypes[i] != null)
                {
                    int p = corps.IndexOf(':', c + CleCible.Length);
                    while (p >= 0 && ++p < fin && char.IsWhiteSpace(corps[p])) { }
                    dto.archetypes[i].PrendUneCible = p >= 0 && p < fin && string.CompareOrdinal(corps, p, "null", 0, 4) != 0;
                }
                debut = suivant;
            }
            return dto;
        }

        /// <summary>(bâtiment affecté, cible) pour `archetype`, LUS de la réponse servie : le premier hôte éligible ; pour un archétype à cible, la première cible servie
        /// qui n'est pas l'hôte (le back refuse « cible = source », 409). Rien n'est deviné : sans réponse, sans ligne pour l'archétype ou sans hôte éligible,
        /// l'hôte est null (le recrutement n'est pas tenté) ; la cible est null pour un archétype sans cible ET quand aucune cible valide n'est servie.</summary>
        public static (string affecte, string cible) Choisir(string archetype, HostEligibiliteData donnees)
        {
            HostArchetypeDto ligne = donnees?.archetypes?.FirstOrDefault(a => a != null && a.archetype == archetype);
            if (ligne == null) return (null, null);
            string hote = ligne.eligible_host_building_ids?.FirstOrDefault(id => !string.IsNullOrEmpty(id));
            if (hote == null || !ligne.PrendUneCible) return (hote, null);
            string cible = ligne.valid_target_building_ids?.FirstOrDefault(id => !string.IsNullOrEmpty(id) && id != hote);
            return (hote, cible);
        }
    }

    public class HostEligibiliteClient
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;

        public IEnumerator Lire(string bearer, Action<HostEligibiliteData> onOk, Action<long, string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get($"{BaseUrl.TrimEnd('/')}/v1/lieutenants/host-eligibility"))
            {
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    onErr?.Invoke(req.responseCode, req.error ?? "network error");
                    yield break;
                }
                HostEligibiliteData dto = null;
                try { dto = HostEligibilite.LireCorps(req.downloadHandler.text); }
                catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                if (dto == null || dto.archetypes == null) { onErr?.Invoke(req.responseCode, "corps sans `payload.data.archetypes`"); yield break; }
                onOk?.Invoke(dto);
            }
        }
    }
}
