using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE WorldApiClient (heat) + CityProjectionsClient (cohesion) + their DTOs
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C6 (design §3 C6, D5) — `OrgVitalsPanel` : Heat / Friction / Stress rendus (3 barres),
    // Cohesion DÉCLARÉE explicitement indisponible (l'entité citywide des 4 vitaux n'existe pas
    // côté back pour la cohésion — D5). **Le seul chunk dont les 2 routes NE SONT PAS des clés de
    // `session/open`** : Heat + Cohesion sont sondées en propre ; Friction/Stress viennent du
    // payload que C3 fournit (`SetFrictionStress`).
    public class OrgVitalsPanelController : MonoBehaviour
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";
        [SerializeField] private int probeDistrictId = 16;

        // ---- test hooks ------------------------------------------------------
        public string HeatBucketRendered { get; private set; }
        public string FrictionBucketRendered { get; private set; }
        public string StressBucketRendered { get; private set; }
        public bool CohesionDeclaredUnavailable { get; private set; } = true; // named state, always true (D5) once rendered
        public DistrictHeatDto LastHeatFetch { get; private set; }
        public string LastHeatError { get; private set; }
        public CohesionDto LastCohesionFetch { get; private set; }
        public long LastCohesionErrorCode { get; private set; }
        public bool LastCohesionSucceeded { get; private set; }

        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        private TextMeshProUGUI heatText;
        private TextMeshProUGUI frictionText;
        private TextMeshProUGUI stressText;
        private TextMeshProUGUI cohesionText;

        private WorldApiClient world;
        private CityProjectionsClient projections;
        private string token;
        private bool initialized;

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            world = new WorldApiClient { BaseUrl = baseUrl };
            projections = new CityProjectionsClient { BaseUrl = baseUrl };
            BuildLayout();
            RenderCohesionDeclaredUnavailable();
        }

        /// <summary>Friction/Stress come from the `session/open` payload (C3 alimente C6) — never a
        /// separate route (design: "Friction et Stress viennent, eux, du payload que C3 fournit").</summary>
        public void SetFrictionStress(FrictionGlanceDto friction, CompressionGlanceDto compression)
        {
            EnsureInitialized();
            FrictionBucketRendered = friction != null ? friction.friction_bucket : null;
            StressBucketRendered = compression != null ? compression.stress_bucket : null;
            RenderFriction();
            RenderStress();
        }

        /// <summary>Heat — the ONE bar this chunk fetches itself, a REAL request (design C6-F3).</summary>
        public IEnumerator FetchHeat(string bearerToken)
        {
            EnsureInitialized();
            token = bearerToken;
            LastHeatError = null;
            yield return world.GetDistrictHeat(probeDistrictId, token,
                dto => LastHeatFetch = dto,
                err => LastHeatError = err);
            if (LastHeatFetch != null)
            {
                HeatBucketRendered = LastHeatFetch.citywide_bucket;
                RenderHeat();
            }
        }

        /// <summary>Cohesion — the sonde (design C6-F4): a REAL request, three pieces asserted by the
        /// CALLER (success-body requirement, tick-dimensioned scenario, capacity guard) — this method
        /// just performs the fetch honestly (success OR failure, never silently swallowed).</summary>
        public IEnumerator FetchCohesion(string bearerToken)
        {
            EnsureInitialized();
            token = bearerToken;
            LastCohesionSucceeded = false;
            LastCohesionErrorCode = 0;
            yield return projections.Cohesion(probeDistrictId, token,
                dto => { LastCohesionFetch = dto; LastCohesionSucceeded = true; },
                code => LastCohesionErrorCode = code);
        }

        // W3.U1 C6-F2 — the SAME reflection-based "citywide field" oracle applied to BOTH DTOs
        // (never two separate hand-written counters that could quietly diverge from each other).
        public static int CountCitywideFields(System.Type dtoType)
        {
            int count = 0;
            foreach (FieldInfo f in dtoType.GetFields(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            {
                if (f.Name.Contains("citywide")) count++;
            }
            return count;
        }

        // --------------------------------------------------------------- render

        private void RenderHeat()
        {
            RenderBar(heatText, "Heat", HeatBucketRendered, HeatLabel(HeatBucketRendered));
        }
        private void RenderFriction()
        {
            RenderBar(frictionText, "Friction", FrictionBucketRendered, FrictionLabel(FrictionBucketRendered));
        }
        private void RenderStress()
        {
            RenderBar(stressText, "Stress", StressBucketRendered, StressLabel(StressBucketRendered));
        }

        private void RenderBar(TextMeshProUGUI text, string name, string bucketValue, string label)
        {
            text.text = $"{name}: {label}";
            RebuildTrackedTexts();
        }

        // Cohesion (D5) — rendered ONCE, at build time: an EXPLICIT "indisponible" state, the SAME
        // precedent `DashboardController.cs:331` already established for a probe that can fail — a
        // VALUE, never the bar's absence (which a shell that never built a 4th bar would ALSO satisfy).
        // (Revue ⊥ IMPORTANT-4 : cette ancre était `:320` sur `main`, correcte à l'origine — c'est
        // C1 de CE lot, en insérant le bloc `mountParent`, qui l'a décalée sans que ce commentaire,
        // écrit APRÈS, ne re-dérive du fichier déjà modifié. Re-mesurée : `:331`.)
        private void RenderCohesionDeclaredUnavailable()
        {
            CohesionDeclaredUnavailable = true;
            cohesionText.text = "Cohesion: Unavailable (no citywide aggregate)";
            RebuildTrackedTexts();
        }

        private void RebuildTrackedTexts()
        {
            renderedTexts.Clear();
            if (!string.IsNullOrEmpty(heatText.text)) renderedTexts.Add(heatText.text);
            if (!string.IsNullOrEmpty(frictionText.text)) renderedTexts.Add(frictionText.text);
            if (!string.IsNullOrEmpty(stressText.text)) renderedTexts.Add(stressText.text);
            if (!string.IsNullOrEmpty(cohesionText.text)) renderedTexts.Add(cohesionText.text);
        }

        private static string HeatLabel(string b) =>
            b == "COLD" ? "Cold" : b == "WARM" ? "Warm" : b == "HOT" ? "Hot" : b == "BURNING" ? "Burning" : "Unknown";
        private static string FrictionLabel(string b) =>
            string.IsNullOrEmpty(b) ? "Unknown" : char.ToUpperInvariant(b[0]) + b.Substring(1);
        private static string StressLabel(string b) =>
            string.IsNullOrEmpty(b) ? "Unknown" : char.ToUpperInvariant(b[0]) + b.Substring(1);

        // --------------------------------------------------------------- UI build

        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();

            VerticalLayoutGroup vlg = gameObject.AddComponent<VerticalLayoutGroup>();
            vlg.spacing = 4;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            heatText = NewText();
            frictionText = NewText();
            stressText = NewText();
            cohesionText = NewText();
        }

        private TextMeshProUGUI NewText()
        {
            GameObject go = new GameObject("Bar", typeof(RectTransform));
            go.transform.SetParent(transform, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.fontSize = 14;
            t.color = DesignTokens.Current.onSurfacePrimary;
            t.raycastTarget = false;
            return t;
        }
    }
}
