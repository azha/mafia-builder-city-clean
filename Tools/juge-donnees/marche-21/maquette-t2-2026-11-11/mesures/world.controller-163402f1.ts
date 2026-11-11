// IMPLEMENTS: docs/tech/02_fictional_world/brennar_city.md §API /world/districts (+ §Cross-cutting
//             fog-of-war P5) + 18 envelope/versioning (/v1, ResponseEnvelope)
//             -- session:2026-06-02 (Phase 1 Task 1) --
//
// `WorldController` — the `/v1/world/*` geography MAP API. The map (districts, crossings) is PUBLIC
// constant geography ("La géographie est connue" — brennar_city.md §Cross-cutting fog-of-war P5);
// only the dynamic territorial CONTROL state is P5-filtered, and day-1 that is a neutral qualitative
// default bucket (never a raw scalar — R2.2 inverted). Handlers return plain `data`; the global
// EnvelopeInterceptor wraps it in a ResponseEnvelope (handlers never build the envelope).

import { Controller, Get } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import {
  WorldGeographyRepository,
  type DistrictProjection,
  type ThrennyEdgeProjection,
} from './world-geography.repository';

/** The districts map response data (R2.2 inverted — a bounded list of qualitative projections). */
interface DistrictsResponse {
  districts: DistrictProjection[];
}

/** The Threnny crossings response data. */
interface ThrennyEdgesResponse {
  edges: ThrennyEdgeProjection[];
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class WorldController {
  constructor(private readonly geography: WorldGeographyRepository) {}

  /**
   * `GET /v1/world/districts` — the Brennar map: 18 districts with their static metadata + a qualitative
   * control bucket (brennar_city.md §API /world/districts payload `{id, profile, index, name_canonical,
   * block_count, bank_side, control_state}`). Pagination not needed (18 districts = light payload).
   */
  @Get('world/districts')
  async districts(): Promise<DistrictsResponse> {
    const districts = await this.geography.listDistricts();
    return { districts };
  }

  /**
   * `GET /v1/world/threnny-edges` — the Threnny crossings (bridges/ferries) the player navigates between
   * the two banks. `type` is mapped from the DB column `edge_type`. The geography is a public constant
   * (fog-of-war applies only to what HAPPENS in the city, not to the map itself — §Cross-cutting P5).
   */
  @Get('world/threnny-edges')
  async thrennyEdges(): Promise<ThrennyEdgesResponse> {
    const edges = await this.geography.listThrennyEdges();
    return { edges };
  }
}
