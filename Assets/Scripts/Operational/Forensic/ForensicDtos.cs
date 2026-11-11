using System;

namespace MafiaCleanCity.Operational
{
    // screen_b7 « Forensic » — DTO générés par Tools/nouvel-ecran.py. Un warning de compilation
    // "field never assigned" est ATTENDU tant que les champs MÉTIER ICI ne sont pas remplis :
    // c'est le signal que ce fichier n'est pas encore fini, pas une erreur de l'outil.

    /// <summary>`GET /v1/me/forensic` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class GetForensicResponseDto
    {
        // Les TROIS clés du corps, mesurées sur le compte de démo le 2026-09-02 par la session
        // back : `audit_risk_bucket = watched`, `effluent_visibility_bucket = glaring`,
        // `lifestyle_alarm_bucket = quiet`. Trois bandes fermées, aucun scalaire — R2.2 tenu par
        // le serveur, rien à réduire ici.
        public string audit_risk_bucket;
        public string effluent_visibility_bucket;
        public string lifestyle_alarm_bucket;
        /// <summary>Q5 — le NOM du lieutenant visé par la piste du train de vie (`Lt. Nom`), ADDITIF, décision f2 08/10 (option B : servi seulement si UNE ligne
        /// porte les trois maxima, sinon null). ABSENT de la pile tant que le back ne l'a pas codé (dette de fin de tranche) : null ⇒ le libellé de la
        /// maquette, inchangé. Jamais un identifiant ni un scalaire (mur P5).</summary>
        public string lifestyle_lieutenant_name;
        /// <summary>Les trois CLÉS i18n du mot de chaque bande, SERVIES (`forensic.cran.*`, `forensic.gravite.*` ; mesuré @8d0184a4 sur un compte jetable). Lues quand elles sont là et connues du catalogue ; sinon le mot de la bande (repli). Jamais un scalaire.</summary>
        public string audit_risk_label_key;
        public string effluent_visibility_label_key;
        public string lifestyle_alarm_label_key;
    }

    /// <summary>Une ligne de `GET /v1/me/internal-affairs/actors` (`ActorSummary`, `ia-projection.service.ts`, mesuré @accc9605) : TROIS
    /// champs, jamais de niveau de soupçon (mur P5). `actorType` ∈ {lawyer, clerk} ; `status` ∈ {steady, nervous, unavailable, gone}.
    /// Le PRIX d'un renseignement : jusqu'au back `dette/b2-fin-tranche-2026-11-11` @36bd4b0e (TD-891, BACK-2), il n'était servi qu'au RÉSULTAT du
    /// POST d'achat ; depuis, `intelCostCents` est servi à la RACINE de cette réponse (voir `GetActeursResponseDto`). L'écran n'achète toujours rien
    /// (㊴, R2 du design ; le geste et l'affichage du montant attendent le lot « acheter du renseignement », TD-988).</summary>
    [Serializable]
    public class ActeurDto
    {
        public string actorRef;
        public string actorType;
        public string status;
    }

    /// <summary>`GET /v1/me/internal-affairs/actors` → `payload.data` : `{ actors, intelCostCents }` — RECOPIÉ (V15) de
    /// `internal-affairs.controller.ts:63-66` @36bd4b0e (`intelCostCents: number`, = `intelPurchaseCostCents`, 800000 par défaut). Déclarée ICI pour
    /// que `JsonUtility` ne la jette pas (forme G). Clé absente (back plus ancien) ⇒ 0 ⇒ « non servi » : le prix n'est JAMAIS 0.</summary>
    [Serializable] public class GetActeursResponseDto
    {
        public ActeurDto[] actors;
        public long intelCostCents;
        /// <summary>Le prix SERVI en cents, ou null (clé absente, ou ≤ 0 : jamais un prix nul).</summary>
        public long? PrixServiCents => intelCostCents > 0 ? intelCostCents : (long?)null;
    }
    [Serializable] public class GetActeursPayload { public GetActeursResponseDto data; }
    [Serializable] public class GetActeursEnvelope { public GetActeursPayload payload; }

    [Serializable] public class GetForensicPayload { public GetForensicResponseDto data; }
    [Serializable] public class GetForensicEnvelope { public GetForensicPayload payload; }
}
