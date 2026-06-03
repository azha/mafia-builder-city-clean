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
                Assert.Greater(d.block_count, 0,
                    $"district {d.name_canonical} should have block_count > 0");

                BankSide bank = CityMapEnums.ParseBankSide(d.bank_side);
                Assert.AreNotEqual(BankSide.Unknown, bank,
                    $"district {d.name_canonical} has unparsed bank_side '{d.bank_side}'");

                ControlState state = CityMapEnums.ParseControlState(d.control_state);
                Assert.AreNotEqual(ControlState.Unknown, state,
                    $"district {d.name_canonical} has unparsed control_state '{d.control_state}'");
            }
        }
    }
}
