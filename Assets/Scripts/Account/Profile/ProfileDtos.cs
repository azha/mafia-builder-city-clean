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
    }
    [Serializable] public class ProfilEnvelope { public ProfilPayload payload; }
    [Serializable] public class ProfilPayload { public ProfilData data; }
}
