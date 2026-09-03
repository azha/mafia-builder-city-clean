using System;

namespace MafiaCleanCity.Operational
{
    // ecran_loi « La loi » (㉛) — « le parloir » — DTO dérivés du CORPS RÉEL mesuré en direct sur
    // la pile de dev le 2026-09-03 (compte `operational_demo@example.test` ET un compte FRAIS,
    // via `rtk proxy curl` — un `curl` nu sur cet arbre rend un SCHÉMA DE TYPES au lieu du corps
    // réel, voir Tools/loi-implementation-notes.md § Deviations).
    //
    // ⛔⛔ LES TROIS ROUTES `GET /v1/me/legal`, `POST /v1/me/legal/lawyers` (succès) ET
    // `PUT /v1/me/legal/lawyers/:id/retainer` (mesurée par ce lot, hors brief) RENDENT TOUTES LA
    // MÊME ENVELOPPE — `{activeCases: [...], lawyerRoster: [...]}`, l'ÉTAT COMPLET du parloir, pas
    // un accusé de réception. Chaque route garde son propre triplet Envelope/Payload/ResponseDto
    // (patron du dépôt — voir `DistributionDtos.cs` — même quand la charge utile est
    // structurellement identique) : les 2 champs sont donc DUPLIQUÉS trois fois plutôt que
    // portés par un type de base commun — `LawyerDto`/`LegalCaseDto` restent, eux, RÉUTILISÉS
    // comme types de CHAMP (composition), c'est la forme DRY déjà en usage ici (`CourierDto[]`).
    // ⚠️ Une hiérarchie `ResponseDto : Base` aurait été plus courte, mais AUCUN fichier de ce
    // dépôt ne fait désérialiser `JsonUtility` à travers une classe DÉRIVÉE (mesuré : 0 précédent)
    // — au moindre doute, la forme déjà vérifiée par ce dépôt gagne sur la forme plus courte.

    /// <summary>Un avocat du roster — 5 clés MESURÉES (2026-09-03, `GET /v1/me/legal` et
    /// `POST .../lawyers` en succès réel, compte de démo ET compte frais) :
    /// `{lawyerId, lawyerLabel, tier, retainer, activeCaseCount}`.
    /// ⚠️ `lawyerLabel` EST DE LA PROSE ANGLAISE SERVIE PAR LE BACK (mesuré : "Boutique Counsel"
    /// pour tier="boutique") — même famille que TD-452. Affiché TEL QUEL par ce lot (consigne du
    /// brief) : ne JAMAIS le traduire côté client, ce serait inventer une clé qui n'existe pas.
    /// `tier` mesuré UNIQUEMENT "boutique" en retour serveur (le domaine {boutique,
    /// corruption_pipeline} n'est confirmé fermé QUE sur le CORPS envoyé à la création, via le
    /// 422 "tier must be 'boutique' or 'corruption_pipeline'." — jamais observé sur la valeur
    /// SERVIE en retour) — `LoiResolvers.TierLabelCourt` garde donc un repli gracieux, patron
    /// `DistributionResolvers.TexteVehicule`.</summary>
    [Serializable]
    public class LawyerDto
    {
        public string lawyerId;
        public string lawyerLabel;
        public string tier;
        public bool retainer;
        public int activeCaseCount;
    }

    /// <summary>Une affaire — ⛔⛔ JAMAIS MESURÉ. `activeCases` est resté VIDE sur les DEUX comptes
    /// sondés (démo ET frais) : aucune affaire ne naît d'un geste de ce parloir, une affaire naît
    /// d'une descente (mécanisme hors des 4 routes données). N'INVENTE PAS `chargeSeverity` /
    /// `daysRemaining` / `leak` / `burn_risk_score` que la maquette (m-67..m-72) laisse deviner :
    /// aucun corps mesuré ne les confirme, voir Tools/loi-implementation-notes.md § Deviations.
    /// Ce type reste donc un placeholder DÉLIBÉRÉMENT vide — le contrôleur ne lit AUCUN champ
    /// dessus, seulement `activeCases.Length` (toujours 0 mesuré).</summary>
    [Serializable]
    public class LegalCaseDto
    {
        // MÉTIER ICI — jamais mesuré, voir le commentaire de classe. Ne pas remplir sans un corps
        // RÉEL observé (activeCases non vide) — juge-données ⊥ le jour où une affaire existe.
    }

    // ── `GET /v1/me/legal` ──────────────────────────────────────────────────────────────────────
    /// <summary>R2.2 : `activeCases`/`lawyerRoster` sont des PROJECTIONS P5 (listes), jamais
    /// réduites à un compte.</summary>
    [Serializable]
    public class GetLegalResponseDto
    {
        public LegalCaseDto[] activeCases;
        public LawyerDto[] lawyerRoster;
    }
    [Serializable] public class GetLegalPayload { public GetLegalResponseDto data; }
    [Serializable] public class GetLegalEnvelope { public GetLegalPayload payload; }

    // ── `POST /v1/me/legal/lawyers` ─────────────────────────────────────────────────────────────
    /// <summary>Même forme que `GetLegalResponseDto` — MESURÉ identique (2026-09-03).</summary>
    [Serializable]
    public class PostLegalLawyersResponseDto
    {
        public LegalCaseDto[] activeCases;
        public LawyerDto[] lawyerRoster;
    }
    [Serializable] public class PostLegalLawyersPayload { public PostLegalLawyersResponseDto data; }
    [Serializable] public class PostLegalLawyersEnvelope { public PostLegalLawyersPayload payload; }

    /// <summary>Corps envoyé à `POST /v1/me/legal/lawyers` — MESURÉ (422 puis succès réel,
    /// 2026-09-03) : un seul champ, `{tier}`, domaine FERMÉ ANNONCÉ par le message d'erreur —
    /// "tier must be 'boutique' or 'corruption_pipeline'." ⚠️ `corruption_pipeline` mesuré
    /// COÛTER 4 000 000 cents (402 PAYMENT_REQUIRED observé sur un compte frais) — le geste peut
    /// donc échouer par argent insuffisant, pas seulement par réseau ; `RecruterAvocat` le rend
    /// comme une erreur nommée, jamais un crash.</summary>
    [Serializable]
    public class PostLegalLawyersBody
    {
        public string tier;
    }

    // ── `PUT /v1/me/legal/lawyers/:id/retainer` — MESURÉE PAR CE LOT, absente du brief ─────────
    /// <summary>Même forme que `GetLegalResponseDto` — MESURÉ identique (2026-09-03, aller-retour
    /// true/false sur le compte de démo).</summary>
    [Serializable]
    public class PutLegalLawyersRetainerResponseDto
    {
        public LegalCaseDto[] activeCases;
        public LawyerDto[] lawyerRoster;
    }
    [Serializable] public class PutLegalLawyersRetainerPayload { public PutLegalLawyersRetainerResponseDto data; }
    [Serializable] public class PutLegalLawyersRetainerEnvelope { public PutLegalLawyersRetainerPayload payload; }

    /// <summary>Corps envoyé à `PUT /v1/me/legal/lawyers/:id/retainer` — MESURÉ EN DIRECT
    /// (2026-09-03, `rtk proxy curl`, énumération du 422) : un seul champ, `{active: bool}` —
    /// PAS `{retainer}`. Message 422 observé sur corps vide : "active must be a boolean."
    /// Succès mesuré ALLER-RETOUR sur le compte de démo (true PUIS false, pour ne pas laisser
    /// l'état modifié) : rend la MÊME enveloppe `{activeCases, lawyerRoster}` que les deux autres
    /// routes, avec `lawyerRoster[].retainer` mis à jour.</summary>
    [Serializable]
    public class PutLegalLawyersRetainerBody
    {
        public bool active;
    }

    // ── `POST /v1/me/legal/cases/:id/plea` — ⛔ JAMAIS MESURÉ, JAMAIS CÂBLÉ À L'UI ─────────────
    // Aucune affaire n'existe sur aucun compte sondé : cette route est STRUCTURELLEMENT
    // inatteignable aujourd'hui (elle exige un `:id` d'affaire). Le client la porte (le brief l'a
    // demandée au squelette) mais AUCUN geste de l'écran ne l'appelle — voir
    // LoiScreenController, section « affaires ». Corps/réponse laissés en placeholder, jamais
    // remplis sans un corps réel observé.
    [Serializable]
    public class PostLegalCasesPleaResponseDto
    {
        // MÉTIER ICI — jamais atteignable sur les comptes sondés (0 affaire active).
    }

    [Serializable] public class PostLegalCasesPleaPayload { public PostLegalCasesPleaResponseDto data; }
    [Serializable] public class PostLegalCasesPleaEnvelope { public PostLegalCasesPleaPayload payload; }

    [Serializable]
    public class PostLegalCasesPleaBody
    {
        // MÉTIER ICI — jamais mesuré, jamais câblé (voir commentaire au-dessus du groupe).
    }

    // ── `POST /v1/me/legal/cases/:id/payoff` — ⛔ JAMAIS MESURÉ, JAMAIS CÂBLÉ À L'UI ───────────
    [Serializable]
    public class PostLegalCasesPayoffResponseDto
    {
        // MÉTIER ICI — jamais atteignable sur les comptes sondés (0 affaire active).
    }

    [Serializable] public class PostLegalCasesPayoffPayload { public PostLegalCasesPayoffResponseDto data; }
    [Serializable] public class PostLegalCasesPayoffEnvelope { public PostLegalCasesPayoffPayload payload; }

    [Serializable]
    public class PostLegalCasesPayoffBody
    {
        // MÉTIER ICI — jamais mesuré, jamais câblé (voir commentaire au-dessus du groupe).
    }
}
