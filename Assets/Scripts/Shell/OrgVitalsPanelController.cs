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
        // B1 (revue ⊥ item05-C2, BLOQUANT-PRODUCTION) — miroir de `CohesionDeclaredUnavailable`,
        // avec une différence : Heat PEUT réussir, donc ce drapeau REDEVIENT faux une fois
        // `RenderHeat()` atteint (contrairement à Cohesion, toujours vraie par D5).
        public bool HeatDeclaredUnavailable { get; private set; } = true;
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
            // B1 (revue ⊥ item05-C2, BLOQUANT-PRODUCTION) — AVANT ce correctif, `heatText.text`
            // n'était JAMAIS assigné tant que `FetchHeat` n'avait pas résolu : sur la branche
            // d'échec de sign-in du shell (Token vide), `FetchHeatAndCohesion` n'est JAMAIS appelé
            // (AppShell.cs, gardé par `!string.IsNullOrEmpty(Token)`) et la barre restait une
            // CHAÎNE VIDE POUR TOUJOURS — exactement le mode d'échec "v1 : atteint et blanc" que le
            // design (Tools/charpente-item05-design.md §5) met en tête de ce que 4 versions ont
            // appris, et que son §2 (c) érige en premier travail : "un panneau sans donnée rend un
            // état vide NOMMÉ". Un commentaire de production affirmait le contraire
            // (`AppShell.cs`, branche d'échec : "chacun rend son état vide NOMMÉ… jamais atteint et
            // blanc") — vrai désormais pour les 4 panneaux, plus seulement 3.
            RenderHeatDeclaredUnavailable("not requested yet");
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
            else
            {
                // B1 — un échec de fetch doit AUSSI porter un état nommé, jamais laisser le
                // "pending" posé au build devenir un mensonge silencieux (une requête qui a déjà
                // échoué n'est plus "en attente").
                RenderHeatDeclaredUnavailable("no answer");
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

        /// <summary>Item 0.5 §2 (C2) — le mécanisme que l'Accueil déclenche : les DEUX requêtes que ce
        /// panneau fait en propre (Heat + Cohesion, design C6-F3/F4), pilotées PAR CE COMPOSANT (jamais
        /// par l'appelant qui le monte). Nécessaire précisément parce que ce panneau n'est PAS un
        /// `IShellTenant` — rien d'autre ne relance ces deux coroutines. Auto-pilotées ⇒ si ce panneau
        /// est détruit en vol (l'Accueil change d'onglet pendant la requête), Unity arrête ses
        /// coroutines AVEC lui — jamais l'exception `MissingReferenceException` d'un appelant externe
        /// qui continuerait d'écrire sur un `TextMeshProUGUI` déjà détruit (le mode d'échec réel d'un
        /// `StartCoroutine` piloté par le MONTEUR plutôt que par le composant qu'il monte).</summary>
        public void FetchHeatAndCohesion(string bearerToken)
        {
            EnsureInitialized();
            StartCoroutine(FetchHeat(bearerToken));
            StartCoroutine(FetchCohesion(bearerToken));
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
            HeatDeclaredUnavailable = false;
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
            cohesionText.text = Lib("vitals", "Cohésion : indisponible pour l'ensemble de la ville");
            RebuildTrackedTexts();
        }

        // B1 (revue ⊥ item05-C2) — le MODÈLE est `RenderCohesionDeclaredUnavailable` ci-dessus,
        // repris pour Heat : une VALEUR nommée, posée AU BUILD (jamais l'absence d'assignation).
        // La raison varie (au build : rien n'a encore été demandé ; sur échec réseau : pas de
        // réponse) — Heat, contrairement
        // à Cohesion, PEUT réussir, donc cet état n'est pas permanent (voir RenderHeat()).
        private void RenderHeatDeclaredUnavailable(string raison)
        {
            HeatDeclaredUnavailable = true;
            heatText.text = $"Heat: Unavailable ({raison})";
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

        // CORRIGÉ (hud-session-arbitrages-design.md §3, F1 IMPORTANT) — la prescription §2.4 visait
        // une SYNTAXE (« aucun `switch` de bucket ailleurs ») ; sa propre classe lui échappait ici :
        // une CHAÎNE DE TERNAIRES rendant les MÊMES labels que `HeatBucketResolver.Label`. Re-visé
        // sur la PROPRIÉTÉ (« aucune correspondance bucket→apparence hors du résolveur ») —
        // repointé, byte-identique.
        private static string HeatLabel(string b) => HeatBucketResolver.Label(b);
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

        /// <summary>Item 0.6 — le littéral d'écran passe par une CLÉ. Le repli passé à `Libelle`
        /// est FRANÇAIS : `Libelle.De` rend le littéral quand la clé manque au bundle, donc un
        /// repli anglais resterait anglais à l'écran À TRAVERS la conversion (mesuré par le
        /// chantier B : 81 replis sur 107 étaient anglais après une première passe — « converti
        /// sans traduire »). Convertir sans traduire ne change rien pour le joueur.</summary>
        private static string Lib(string role, string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("accueil", role, litteral);

    }
}
