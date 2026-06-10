using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace MafiaCleanCity.Operational.Lieutenant
{
    // Phase-9 vector #9 — the ONLY genuinely-novel client logic of the rule-editor: the rule-model → DSL-source
    // serializer + the natural-language preview + the COOK field whitelist that drives the builder's dropdowns.
    //
    // The backend is AUTHORITATIVE for DSL validity (services/game-back/src/dsl/parser.service.ts +
    // dsl-compiler.service.ts). This file NEVER re-implements parse/compile — it serializes a deterministic source
    // STRING in the exact form the parser accepts (07 §Grammar EBNF, slice executable subset), and the client POSTs
    // that to /validate + /behavior-script. The whitelist + the per-field value-typing just reduce malformed input
    // BEFORE the round-trip; the 422 diagnostics (rendered by the controller) are the source of truth.
    //
    // Slice executable subset (COOK loop): triggers STATE / EVENT ; actions EXECUTE_DEFAULT / PAUSE_OPS. No AND_IF,
    // no AND/OR/NOT, no SEQ/COHORT, no tiers 2-7 (deferred — spec §9). One trigger atom → one action atom per rule.
    // Phase-20: the AND_IF condition slot (MY_STATE / PEER_STATE, Tier ≥ 2) is now authorable — see RuleRow.cond*.

    /// <summary>
    /// A single authored rule row (the builder's rule-model unit; the PlayMode test populates these directly via the
    /// controller's Rules/SetRules/AddRule API). Serialized to one DSL line by <see cref="RuleModel.SerializeRules"/>.
    /// </summary>
    [Serializable]
    public class RuleRow
    {
        public string triggerKind; // "STATE" | "EVENT" — the trigger primitive (07 §GrammarPrimitiveEnum Tier 1).
        public string field;       // the trigger field/event-type — a COOK whitelist key ("cook_idle" | "heat").
        public string comparator;  // "==" | "!=" | ">=" | "<=" | ">" | "<" — a CompareOp the parser accepts.
        public string value;       // the comparison literal — "true"/"false" for a bool field, a number for a numeric one.
        public string action;      // "EXECUTE_DEFAULT" | "PAUSE_OPS" — the action atom (no-arg, Tier 1).
        public int priority;       // the @priority integer (within [PriorityMin, PriorityMax]).

        // ---- Phase-20 (Tier-2) — the OPTIONAL AND_IF condition slot. The grammar allows AT MOST ONE condition
        // per rule (RuleDecl ::= 'WHEN' TriggerExpr ['AND_IF' ConditionExpr] 'THEN' …) — one slot, no chaining.
        public string condKind = "NONE";      // "NONE" | "MY_STATE" | "PEER_STATE"
        public string condField = "";          // condition field — MY palette (MY_STATE) or the PEER role's (PEER_STATE)
        public string condComparator = "";     // a parser-accepted CompareOp
        public string condValue = "";          // literal ("true"/"false" for a bool field, a number otherwise)
        public string condPeerRole = "";       // PEER_STATE only — an archetype name (serialized lower-case: cook@…)
        public string condPeerZone = "";       // PEER_STATE only — "same_zone" (default; serialized BARE) | "same_building"

        public RuleRow() { }

        public RuleRow(string triggerKind, string field, string comparator, string value, string action, int priority)
        {
            this.triggerKind = triggerKind;
            this.field = field;
            this.comparator = comparator;
            this.value = value;
            this.action = action;
            this.priority = priority;
        }
    }

    /// <summary>
    /// An archetype signal the builder exposes — drives which trigger primitive (STATE/EVENT) a rule uses, what value-input
    /// the UI shows (a bool toggle vs a numeric input), and which comparators are offered. The per-archetype palettes
    /// (<see cref="RuleModel.PaletteByArchetype"/>) are grounded EXACTLY in the game-back archetype bindings
    /// ({cook,security,bookkeeper,logistics,laundering,distribution}-binding.ts buildSnapshot — the signal source of truth).
    /// </summary>
    public class FieldSpec
    {
        public readonly string Key;            // the canonical DSL field name (e.g. "cook_idle", "heat").
        public readonly string Label;          // a human label for the dropdown (e.g. "Cook idle", "Heat").
        public readonly string TriggerKind;    // the trigger primitive this field is read through — "STATE" | "EVENT".
        public readonly bool IsBool;           // true → a bool toggle (value "true"/"false"); false → a numeric input.
        public readonly string[] Comparators;  // the comparator set offered for this field (parser-accepted CompareOps).

        public FieldSpec(string key, string label, string triggerKind, bool isBool, string[] comparators)
        {
            Key = key;
            Label = label;
            TriggerKind = triggerKind;
            IsBool = isBool;
            Comparators = comparators;
        }
    }

    /// <summary>
    /// The rule-model → DSL-source serializer + NL preview + the COOK field whitelist. Static + pure (deterministic) —
    /// the one novel client logic, verified via the PlayMode attach round-trip (charte 27).
    /// </summary>
    public static class RuleModel
    {
        // --- priority slider bounds (a sane authoring range for the slice; the backend enforces the canonical -------
        // [T.dsl.priority_min, T.dsl.priority_max] and returns PRIORITY_OUT_OF_BOUNDS if exceeded). The 07 §Examples
        // canoniques use priorities 0..95, so 0..100 is a comfortable, in-bounds slider range for the COOK demo rules.
        public const int PriorityMin = 0;
        public const int PriorityMax = 100;

        // --- the comparator sets a field offers (parser-accepted CompareOps) ----------------------------------------
        // A bool field → {==,!=} only; a numeric field → the full ordered set.
        private static readonly string[] BoolComparators = { "==", "!=" };
        private static readonly string[] NumberComparators = { ">=", "<=", ">", "<", "==", "!=" };

        // --- the recruitable archetypes (the picker order = LieutenantArchetype + the recruit order) -----------------
        // The 6 supported archetypes (matches LieutenantProjectionService.ArchetypeBand / the 6 game-back bindings). The
        // archetype picker cycles this list; the recruit POSTs the picked one.
        public static readonly string[] Archetypes =
            { "COOK", "SECURITY", "BOOKKEEPER", "LOGISTICS", "LAUNDERING", "DISTRIBUTION" };

        // --- the per-archetype field palettes (the builder's dropdown source) ----------------------------------------
        // Each FieldSpec is grounded EXACTLY in the matching game-back binding's `buildSnapshot` (the signal name +
        // its trigger primitive STATE/EVENT + its value type bool/number). Confirmed against
        // services/game-back/src/operational/lieutenant/{cook,security,bookkeeper,logistics,laundering,distribution}-binding.ts:
        //   COOK         → state.cook_idle (STATE/bool) , events.heat (EVENT/number)
        //   SECURITY     → state.building_damaged (STATE/bool)
        //   BOOKKEEPER   → state.wallet_cents (STATE/number)
        //   LOGISTICS    → state.source_has_product (STATE/bool)
        //   LAUNDERING   → state.safehouse_filled (STATE/bool) , state.node_has_capacity (STATE/bool)
        //   DISTRIBUTION → state.dealer_float_cents (STATE/number) , state.safehouse_headroom_cents (STATE/number)
        // A bool field → {==,!=} ; a numeric field → {>=,<=,>,<,==,!=}.
        public static readonly IReadOnlyDictionary<string, FieldSpec[]> PaletteByArchetype =
            new Dictionary<string, FieldSpec[]>
            {
                ["COOK"] = new[]
                {
                    new FieldSpec("cook_idle", "Cook idle", "STATE", isBool: true, comparators: BoolComparators),
                    new FieldSpec("heat", "Heat", "EVENT", isBool: false, comparators: NumberComparators),
                },
                ["SECURITY"] = new[]
                {
                    new FieldSpec("building_damaged", "Building damaged", "STATE", isBool: true, comparators: BoolComparators),
                },
                ["BOOKKEEPER"] = new[]
                {
                    new FieldSpec("wallet_cents", "Wallet cents", "STATE", isBool: false, comparators: NumberComparators),
                },
                ["LOGISTICS"] = new[]
                {
                    new FieldSpec("source_has_product", "Source has product", "STATE", isBool: true, comparators: BoolComparators),
                },
                ["LAUNDERING"] = new[]
                {
                    new FieldSpec("safehouse_filled", "Safehouse filled", "STATE", isBool: true, comparators: BoolComparators),
                    new FieldSpec("node_has_capacity", "Node has capacity", "STATE", isBool: true, comparators: BoolComparators),
                },
                ["DISTRIBUTION"] = new[]
                {
                    new FieldSpec("dealer_float_cents", "Dealer float cents", "STATE", isBool: false, comparators: NumberComparators),
                    new FieldSpec("safehouse_headroom_cents", "Safehouse headroom cents", "STATE", isBool: false, comparators: NumberComparators),
                },
            };

        /// <summary>The archetypes that need a SECOND building (target_building_id) at recruit — the dispatch/inject/collect
        /// destination. Grounded in the bindings' validateAssignment: LOGISTICS (dispatch target), LAUNDERING (safehouse),
        /// DISTRIBUTION (safehouse) REQUIRE a target; COOK/SECURITY/BOOKKEEPER ignore it.</summary>
        public static bool NeedsTarget(string archetype) =>
            archetype == "LOGISTICS" || archetype == "LAUNDERING" || archetype == "DISTRIBUTION";

        /// <summary>The field palette for an archetype (drives the builder's field dropdown). Defaults to the COOK palette
        /// for an unknown/null archetype (so the builder always has a usable, in-bounds field set).</summary>
        public static FieldSpec[] FieldsFor(string archetype)
        {
            if (!string.IsNullOrEmpty(archetype) && PaletteByArchetype.TryGetValue(archetype, out FieldSpec[] fields))
                return fields;
            return PaletteByArchetype["COOK"];
        }

        /// <summary>The action atoms the builder offers (no-arg Tier-1 actions in the executable subset — archetype-agnostic
        /// in the slice; every archetype's EXECUTE_DEFAULT maps to its own real action, PAUSE_OPS halts ops).</summary>
        public static readonly IReadOnlyList<string> Actions = new List<string> { "EXECUTE_DEFAULT", "PAUSE_OPS" };

        /// <summary>The condition kinds the Tier-2 editor cycles. Only the EXECUTABLE conditions are offered
        /// (MY_STATE since P12, PEER_STATE since P18); EXCEPTION_FROM / CONVICTION_ABOVE stay locked teasers.</summary>
        public static readonly IReadOnlyList<string> ConditionKinds = new List<string> { "NONE", "MY_STATE", "PEER_STATE" };

        /// <summary>The peer-zone qualifiers (P18 hybrid addressing): same_zone is the grammar DEFAULT and is
        /// serialized BARE (no @qualifier); same_building serializes as role@same_building.</summary>
        public static readonly IReadOnlyList<string> PeerZones = new List<string> { "same_zone", "same_building" };

        // --- B3 locked-tier teaser (DISPLAY-ONLY — never selectable) -------------------------------------------------
        // The DSL grammar exposes far more than the slice executable subset (STATE/EVENT triggers + EXECUTE_DEFAULT/
        // PAUSE_OPS actions). The locked catalogues below mirror the rest of the backend grammar so the builder can
        // TEASE future progression — grayed, non-interactive hints. They are STRICTLY display-only: the executable
        // subset (Actions + FieldsFor(archetype)) stays the only selectable set; the cycle controls never reach a
        // locked token. The backend (services/game-back/src/dsl/parser.service.ts — TriggerExpr/ActionExpr grammar,
        // the TIER1_ACTIONS table, the per-node `tier:` tags + ir.ts/compiler.service.ts) is AUTHORITATIVE: it rejects
        // every locked primitive at /validate with one of two stable diagnostic kinds (see LieutenantDtos.cs):
        //   • tier == 1 → NOT_SUPPORTED_YET — a Tier-1 grammar primitive that THIS build does not yet implement.
        //   • tier >= 2 → TIER_NOT_UNLOCKED — a Tier ≥ 2 primitive gated behind tier progression.
        // The tokens + tiers are grounded VERBATIM in the grammar — do NOT invent or re-number them (the backend
        // would 422 any fabricated token/tier).

        /// <summary>A single locked DSL primitive shown in the teaser: a grayed, NON-selectable hint of future
        /// progression. DISPLAY-ONLY — it is never added to the executable cycle sets (Actions / FieldsFor). The
        /// <see cref="Label"/> is the precomputed grayed caption (token + a lock hint distinguishing the two backend
        /// rejection kinds — see <see cref="MakeLabel"/>).</summary>
        public class LockedPrimitive
        {
            public readonly string Token;  // the canonical DSL token, grounded VERBATIM in the backend grammar (never invented).
            public readonly int Tier;      // the grammar `tier:` tag: 1 → NOT_SUPPORTED_YET, ≥ 2 → TIER_NOT_UNLOCKED.
            public readonly string Label;  // the precomputed grayed caption shown in the teaser (token + 🔒 hint).

            public LockedPrimitive(string token, int tier)
            {
                Token = token;
                Tier = tier;
                Label = MakeLabel(token, tier);
            }
        }

        // Build the teaser caption + an honest lock hint distinguishing the two backend rejection kinds:
        //   tier == 1 (NOT_SUPPORTED_YET, a Tier-1 primitive not yet implemented in this build) → "{TOKEN}  🔒 soon".
        //   tier >= 2 (TIER_NOT_UNLOCKED, gated behind tier progression)                        → "{TOKEN}  🔒 Tier {tier}".
        private static string MakeLabel(string token, int tier) =>
            tier >= 2
                ? $"{token}  🔒 Tier {tier.ToString(CultureInfo.InvariantCulture)}"
                : $"{token}  🔒 soon";

        /// <summary>The locked TRIGGER primitives — every trigger atom BEYOND the executable STATE/EVENT subset.
        /// TIME/LIFECYCLE/ORDER_LIFECYCLE are Tier-1 grammar primitives not yet implemented (NOT_SUPPORTED_YET);
        /// PEER_EVENT is a Tier-2 primitive (TIER_NOT_UNLOCKED). DISPLAY-ONLY — never in any cycle set.</summary>
        public static readonly LockedPrimitive[] LockedTriggers =
        {
            new LockedPrimitive("TIME", 1),            // NOT_SUPPORTED_YET
            new LockedPrimitive("LIFECYCLE", 1),       // NOT_SUPPORTED_YET
            new LockedPrimitive("ORDER_LIFECYCLE", 1), // NOT_SUPPORTED_YET
            new LockedPrimitive("PEER_EVENT", 2),      // TIER_NOT_UNLOCKED
        };

        /// <summary>The locked ACTION atoms — every action BEYOND the executable EXECUTE_DEFAULT/PAUSE_OPS subset: the
        /// other 12 of the 14 Tier-1 atoms (NOT_SUPPORTED_YET), then SEQ (Tier 3, action chaining) + COHORT (Tier 6,
        /// COHORT(role): action) (both TIER_NOT_UNLOCKED). DISPLAY-ONLY — never added to <see cref="Actions"/>.</summary>
        public static readonly LockedPrimitive[] LockedActions =
        {
            new LockedPrimitive("REQUEST_PLAYER_INPUT", 1),  // NOT_SUPPORTED_YET — the other 12 Tier-1 atoms…
            new LockedPrimitive("REROUTE_TO", 1),
            new LockedPrimitive("ALERT_PEER", 1),
            new LockedPrimitive("ABORT_CURRENT_TASK", 1),
            new LockedPrimitive("LOG_EVENT_AS", 1),
            new LockedPrimitive("ASSIGN_SUBORDINATE", 1),
            new LockedPrimitive("INCREMENT_DECOY_AT", 1),
            new LockedPrimitive("FLAG_DISSENT", 1),
            new LockedPrimitive("REQUEST_VETO_CLEAR", 1),
            new LockedPrimitive("REVERT_DEFAULT_SCRIPT", 1),
            new LockedPrimitive("PROMOTE_UNDERSTUDY", 1),
            new LockedPrimitive("ESCALATE_TO_TIER", 1),
            new LockedPrimitive("SEQ", 3),                   // TIER_NOT_UNLOCKED — action chaining.
            new LockedPrimitive("COHORT", 6),                // TIER_NOT_UNLOCKED — COHORT(role): action.
        };

        /// <summary>The locked COMBINATOR marker — `WHEN trigger AND_IF condition THEN …`. Since P12 (Tier-2a) the
        /// backend EXECUTES AND_IF conditions and tier-gates them (TIER_NOT_UNLOCKED below Tier 2); the Phase-20
        /// editor reveals the condition slot at vocabulary_tier ≥ 2 and this teaser shows only below it.</summary>
        public static readonly LockedPrimitive LockedCombinator = new LockedPrimitive("AND_IF", 2); // TIER_NOT_UNLOCKED below Tier 2

        /// <summary>The grayed teaser labels (triggers, then actions, then the AND_IF combinator) — the precomputed
        /// captions the controller renders as dim, non-interactive lines + exposes via the LockedPrimitiveLabels test
        /// hook. Derived directly from the catalogues; DISPLAY-ONLY (intentional UI chrome, NOT band data, so the
        /// controller keeps these OUT of its no-raw-scalar scan corpus — they carry tier numbers by design).</summary>
        public static string[] LockedPrimitiveLabels()
        {
            var labels = new List<string>(LockedTriggers.Length + LockedActions.Length + 1);
            foreach (LockedPrimitive p in LockedTriggers) labels.Add(p.Label);
            foreach (LockedPrimitive p in LockedActions) labels.Add(p.Label);
            labels.Add(LockedCombinator.Label);
            return labels.ToArray();
        }

        /// <summary>Look up a field by its canonical key WITHIN an archetype's palette; null if not in that palette.</summary>
        public static FieldSpec FieldByKey(string archetype, string key)
        {
            foreach (FieldSpec f in FieldsFor(archetype))
                if (f.Key == key) return f;
            return null;
        }

        /// <summary>Look up a field by key across ALL archetype palettes (the first match wins). Used by the archetype-agnostic
        /// serializer/preview, which only need a field's value-type (bool vs numeric) and the field names are globally unique
        /// across the 6 bindings. Null if no palette contains the key.</summary>
        public static FieldSpec FieldByKey(string key)
        {
            foreach (KeyValuePair<string, FieldSpec[]> entry in PaletteByArchetype)
                foreach (FieldSpec f in entry.Value)
                    if (f.Key == key) return f;
            return null;
        }

        // --- serializer --------------------------------------------------------------------------------------------

        /// <summary>
        /// Serialize the rule rows to a DSL `source` string — one line per rule, newline-joined, in the exact form the
        /// backend parser accepts (07 §Grammar EBNF; whitespace-insensitive lexer, so the terse comma/`@`/`;` spacing
        /// below is tolerated). Deterministic: same rows → same string (replay-safe round-trip). The trigger field +
        /// comparator + value go inside the trigger atom; the action atom is no-arg; the priority follows `@`.
        ///   STATE bool  → "WHEN STATE(cook_idle,==,true) THEN EXECUTE_DEFAULT @10;"
        ///   EVENT number → "WHEN EVENT(heat,>=,0.5) THEN PAUSE_OPS @100;"
        /// The value is trimmed + normalized (a bool field → lower-cased "true"/"false"); the comparator is passed
        /// through verbatim (the parser accepts both "==" [normalized to "="] and the bare ops). The client does NOT
        /// validate — malformed rows still serialize; the backend's 422 diagnostics are authoritative.
        /// </summary>
        public static string SerializeRules(List<RuleRow> rules)
        {
            var sb = new StringBuilder();
            if (rules == null) return string.Empty;
            for (int i = 0; i < rules.Count; i++)
            {
                if (i > 0) sb.Append('\n');
                sb.Append(SerializeRule(rules[i]));
            }
            return sb.ToString();
        }

        /// <summary>Serialize a single rule to its DSL line (no trailing newline). Phase-20: when the rule carries a
        /// condition slot, the AND_IF clause serializes between the trigger atom and THEN —
        ///   "WHEN STATE(cook_idle,==,true) AND_IF PEER_STATE(cook@same_building,heat,>=,0.5) THEN PAUSE_OPS @90;"
        /// same_zone (the grammar default) serializes the BARE role: "AND_IF PEER_STATE(cook,heat,>=,0.5)".
        /// Without a condition the output is byte-identical to the original form:
        ///   STATE bool   → "WHEN STATE(cook_idle,==,true) THEN EXECUTE_DEFAULT @10;"
        ///   EVENT number → "WHEN EVENT(heat,>=,0.5) THEN PAUSE_OPS @100;"</summary>
        public static string SerializeRule(RuleRow r)
        {
            string field = (r.field ?? string.Empty).Trim();
            string comparator = (r.comparator ?? string.Empty).Trim();
            string value = NormalizeLiteral(field, r.value);
            string trigger = (r.triggerKind ?? string.Empty).Trim();
            string action = (r.action ?? string.Empty).Trim();
            string condition = SerializeCondition(r);
            string andIf = condition.Length == 0 ? string.Empty : $" AND_IF {condition}";
            // WHEN <trigger>(<field>,<comparator>,<value>)[ AND_IF <condition>] THEN <action> @<priority>;
            return $"WHEN {trigger}({field},{comparator},{value}){andIf} THEN {action} @{r.priority};";
        }

        // The AND_IF condition atom, or "" when the slot is empty. The client does NOT validate — a malformed
        // slot still serializes and the backend's 422 diagnostics stay authoritative.
        private static string SerializeCondition(RuleRow r)
        {
            string kind = (r.condKind ?? "NONE").Trim();
            if (kind == "MY_STATE")
            {
                string f = (r.condField ?? string.Empty).Trim();
                return $"MY_STATE({f},{(r.condComparator ?? string.Empty).Trim()},{NormalizeLiteral(f, r.condValue)})";
            }
            if (kind == "PEER_STATE")
            {
                string role = (r.condPeerRole ?? string.Empty).Trim().ToLowerInvariant();
                string zone = (r.condPeerZone ?? string.Empty).Trim();
                string peerRef = (zone.Length == 0 || zone == "same_zone") ? role : $"{role}@{zone}";
                string f = (r.condField ?? string.Empty).Trim();
                return $"PEER_STATE({peerRef},{f},{(r.condComparator ?? string.Empty).Trim()},{NormalizeLiteral(f, r.condValue)})";
            }
            return string.Empty;
        }

        // Normalize a literal for a (possibly cross-archetype) field key: a bool field → lower-cased "true"/"false";
        // anything else passes through trimmed (the backend rejects bad literals — we never silently rewrite).
        private static string NormalizeLiteral(string fieldKey, string rawValue)
        {
            string raw = (rawValue ?? string.Empty).Trim();
            FieldSpec spec = FieldByKey((fieldKey ?? string.Empty).Trim());
            if (spec != null && spec.IsBool)
            {
                if (raw.Equals("true", StringComparison.OrdinalIgnoreCase)) return "true";
                if (raw.Equals("false", StringComparison.OrdinalIgnoreCase)) return "false";
            }
            return raw;
        }

        private static string NormalizeValue(RuleRow r) => NormalizeLiteral((r.field ?? string.Empty).Trim(), r.value);

        // --- natural-language preview ------------------------------------------------------------------------------

        /// <summary>
        /// An EN natural-language preview of a rule (slice-1; i18n deferred — spec §9). Maps the comparator + action to
        /// words; bool values read as "is true" / "is false". Examples:
        ///   "When cook_idle is true, run the default behavior (priority 10)."
        ///   "When heat ≥ 0.5, pause operations (priority 100)."
        /// </summary>
        public static string PreviewRule(RuleRow r)
        {
            if (r == null) return string.Empty;
            string field = string.IsNullOrEmpty(r.field) ? "—" : r.field.Trim();
            FieldSpec spec = FieldByKey(field);
            string condition;
            if (spec != null && spec.IsBool)
            {
                // bool field reads naturally: "cook_idle is true" / "cook_idle is not true".
                string boolWord = NormalizeValue(r);
                condition = (r.comparator ?? string.Empty).Trim() == "!="
                    ? $"{field} is not {boolWord}"
                    : $"{field} is {boolWord}";
            }
            else
            {
                condition = $"{field} {ComparatorWord(r.comparator)} {NormalizeValue(r)}".TrimEnd();
            }
            return $"When {condition}{ConditionClause(r)}, {ActionWord(r.action)} (priority {r.priority.ToString(CultureInfo.InvariantCulture)}).";
        }

        // ", and only if …" — the NL preview of the AND_IF slot ("" when empty). EN slice-1; i18n deferred.
        private static string ConditionClause(RuleRow r)
        {
            string kind = (r.condKind ?? "NONE").Trim();
            if (kind == "MY_STATE")
                return $", and only if my {(r.condField ?? string.Empty).Trim()} {ComparatorWord(r.condComparator)} {NormalizeLiteral(r.condField, r.condValue)}";
            if (kind == "PEER_STATE")
            {
                string where = (r.condPeerZone ?? string.Empty).Trim() == "same_building" ? "in my building" : "in my zone";
                return $", and only if the {(r.condPeerRole ?? string.Empty).Trim().ToLowerInvariant()} {where} has " +
                       $"{(r.condField ?? string.Empty).Trim()} {ComparatorWord(r.condComparator)} {NormalizeLiteral(r.condField, r.condValue)}";
            }
            return string.Empty;
        }

        // Comparator → a readable symbol/word for the preview (the math symbols read clearer than "==").
        private static string ComparatorWord(string c)
        {
            switch ((c ?? string.Empty).Trim())
            {
                case ">=": return "≥";
                case "<=": return "≤";
                case ">": return ">";
                case "<": return "<";
                case "==": return "=";
                case "!=": return "≠";
                default: return string.IsNullOrEmpty(c) ? "?" : c.Trim();
            }
        }

        // Action atom → a readable verb phrase for the preview.
        private static string ActionWord(string a)
        {
            switch ((a ?? string.Empty).Trim())
            {
                case "EXECUTE_DEFAULT": return "run the default behavior";
                case "PAUSE_OPS": return "pause operations";
                default: return string.IsNullOrEmpty(a) ? "do nothing" : a.Trim();
            }
        }
    }
}
