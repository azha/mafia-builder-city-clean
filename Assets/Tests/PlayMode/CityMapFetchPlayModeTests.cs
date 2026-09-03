using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.CityMap.Tests
{
    // E2E (charter 27: no mock). Hits the live game-back service through Traefik
    // at http://localhost/v1/world/districts. The editor runs on the same host as
    // the docker stack, so this is the real wire contract, parsed by the real client.
        // ⚠️ DEUX catégories, et c'est l'UNION du merge du 2026-09-03 : le chantier C a posé
        // `ScreenCarte` (ces suites ne tournaient sous AUCUN filtre — TD-490), le lot « ville
        // peinte » a posé `CarteVille` pour la même raison, chacun sans voir l'autre. NUnit accepte
        // les deux attributs ; en garder UNE SEULE rendrait la suite invisible au filtre de l'autre
        // lot — et un test qu'aucun filtre n'atteint ne rougit jamais.
        [Category("ScreenCarte")]
        [Category("CarteVille")]
    public class CityMapFetchPlayModeTests
    {
        [UnityTest]
        public IEnumerator GetDistricts_LiveBackend_Returns18ParsedDistricts()
        {
            var client = new WorldApiClient(); // BaseUrl defaults to http://localhost
            List<DistrictDto> result = null;
            string error = null;

            yield return client.GetDistricts(d => result = d, e => error = e);

            Assert.IsNull(error, $"Live fetch errored: {error}");
            Assert.IsNotNull(result, "No districts payload returned");
            Assert.AreEqual(18, result.Count, "Expected the 18 seeded districts from /v1/world/districts");

            foreach (DistrictDto d in result)
            {
                Assert.IsFalse(string.IsNullOrEmpty(d.name_canonical),
                    $"district id={d.id} missing name_canonical");
                // 2026-09-02 — `name` (fiction, français, ex. "La Lisière") est désormais servi à
                // côté de `name_canonical` (nom de code, ex. "Verge-A") : mesuré présent sur les
                // 18 districts seedés. WorldDtos.DistrictDto.name / CityMapEnums.DisplayName.
                Assert.IsFalse(string.IsNullOrEmpty(d.name),
                    $"district id={d.id} ({d.name_canonical}) missing name (fiction)");
                Assert.Greater(d.block_count, 0,
                    $"district {d.name_canonical} should have block_count > 0");

                BankSide bank = CityMapEnums.ParseBankSide(d.bank_side);
                Assert.AreNotEqual(BankSide.Unknown, bank,
                    $"district {d.name_canonical} has unparsed bank_side '{d.bank_side}'");

                ControlState state = CityMapEnums.ParseControlState(d.control_state);
                Assert.AreNotEqual(ControlState.Unknown, state,
                    $"district {d.name_canonical} has unparsed control_state '{d.control_state}'");

                // 2026-09-02 — `precinct_id` servi (1..6, "3 districts/precinct, capped at 6") —
                // CityProjectionsClient.PrecinctForDistrict n'est plus qu'un repli. Bande large
                // (1..6) plutôt qu'une égalité avec la formule client : le but de ce champ est
                // justement de cesser de dépendre de cette formule pour rester exacte.
                Assert.That(d.precinct_id, Is.InRange(1, 6),
                    $"district {d.name_canonical} precinct_id={d.precinct_id} outside the 1..6 band");
            }
        }

        // Pure logic, zero network/DB (charter 27 covers fonctionnel E2E, not a ban on testing a
        // pure C# helper): the live backend always serves a non-empty `name` (18/18, assertion
        // above), so the empty/missing-name fallback branch of CityMapEnums.DisplayName can only be
        // exercised with a synthetic DTO — never asserted against `dto.name_canonical` alone
        // implicitly, always through the shared helper both the tile and the detail panel call.
        [Test]
        public void DisplayName_FallsBackToNameCanonical_WhenNameMissing()
        {
            var withFiction = new DistrictDto { name = "La Lisière", name_canonical = "Verge-A" };
            Assert.AreEqual("La Lisière", CityMapEnums.DisplayName(withFiction),
                "fiction name preferred when present");

            var emptyName = new DistrictDto { name = "", name_canonical = "Verge-A" };
            Assert.AreEqual("Verge-A", CityMapEnums.DisplayName(emptyName),
                "empty string falls back to name_canonical");

            var nullName = new DistrictDto { name = null, name_canonical = "Verge-A" };
            Assert.AreEqual("Verge-A", CityMapEnums.DisplayName(nullName),
                "null (older env without the column) falls back to name_canonical");
        }
    }
}
