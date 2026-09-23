using System;

namespace MafiaCleanCity.Account.Profile
{
    // ㉒ LE COFFRE — la projection de `GET /v1/me`, recopiée d'`auth.service.ts#projectPlayer`.
    // CINQ champs, et c'est tout ce que le back sert d'un joueur.
    [Serializable] public class ProfilData
    {
        public string account_id;
        public string handle;
        public string email;
        public string lifecycle_state;
        public string locale;
        /// <summary>⑲ L1 (back, `auth.service.ts:557`) — la visibilité au méta-marché, TOUJOURS un booléen servi (`isMetaMarketVisible`
        /// résout le `null` du registre, « on » par défaut). ⚠️ Forme G : sans cette déclaration, JsonUtility JETTE le champ.</summary>
        public bool meta_market_visibility_enabled;
    }
    [Serializable] public class ProfilEnvelope { public ProfilPayload payload; }
    [Serializable] public class ProfilPayload { public ProfilData data; }
}
