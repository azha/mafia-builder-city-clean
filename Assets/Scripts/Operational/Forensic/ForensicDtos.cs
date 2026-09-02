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
    }

    [Serializable] public class GetForensicPayload { public GetForensicResponseDto data; }
    [Serializable] public class GetForensicEnvelope { public GetForensicPayload payload; }
}
