using System;

namespace MafiaCleanCity.Operational.Marche
{
    /// <summary>㉑ — `GET /v1/me/market/lanes` → `payload.data.lanes[]`, RECOPIÉ (V15) du CODE de l'énumérateur (lot back `lot/marche-ardoise-enumerateur`
    /// @ef8be64e) : `market.controller.ts:104-113` et `market-projection.service.ts:46-50` (`LaneConfidenceRow`). TROIS clés, exactement : `JsonUtility`
    /// jette en silence toute clé non déclarée (forme G), et une 4ᵉ clé serait un bug de protocole — le mur R2.2 du contrôleur (`:16-17`) dit
    /// qu'aucun `p_cents`, `c`, `t_refractory`, `k_current`, `q_total` ne sort. La bijection corps ↔ DTO est gardée (`MarchePlayModeTests.G1`).
    /// Domaines fermés : `substance_type` ∈ brindle | crick | hush | ash (`lane-collapse-pricing.service.ts:59`) ; `lane_confidence_bucket` ∈
    /// LOW | MODERATE | HIGH (`market-projection.service.ts:38`). Ordre servi : `district_id ASC, substance_type ASC` ; liste vide ⇒ `{lanes: []}` en
    /// 200 ; une ligne jamais « ensured » est ABSENTE (omission), jamais un bucket neutre.</summary>
    [Serializable]
    public class LaneConfidenceRowDto
    {
        public int district_id;
        public string substance_type;
        public string lane_confidence_bucket;
    }

    [Serializable] public class LanesResponseDto { public LaneConfidenceRowDto[] lanes; }
    [Serializable] public class LanesPayload { public LanesResponseDto data; }
    [Serializable] public class LanesEnvelope { public LanesPayload payload; }
}
