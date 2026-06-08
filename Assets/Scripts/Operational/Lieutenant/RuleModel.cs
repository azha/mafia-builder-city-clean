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
    /// A COOK signal the builder exposes — drives which trigger primitive (STATE/EVENT) a rule uses, what value-input the
    /// UI shows (a bool toggle vs a numeric input), and which comparators are offered. The whitelist below is the COOK
    /// executable subset; other archetypes' palettes are deferred (spec §9).
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

        // --- the COOK field whitelist (the executable subset) -------------------------------------------------------
        // cook_idle  → STATE(cook_idle, ==|!=, true|false)   — is the lab idle (no cook running)? bool.
        // heat       → EVENT(heat, >=|<=|>|<|==|!=, <number>) — the building heat level. numeric.
        private static readonly string[] BoolComparators = { "==", "!=" };
        private static readonly string[] NumberComparators = { ">=", "<=", ">", "<", "==", "!=" };

        public static readonly IReadOnlyList<FieldSpec> CookFields = new List<FieldSpec>
        {
            new FieldSpec("cook_idle", "Cook idle", "STATE", isBool: true, comparators: BoolComparators),
            new FieldSpec("heat", "Heat", "EVENT", isBool: false, comparators: NumberComparators),
        };

        /// <summary>The action atoms the COOK builder offers (no-arg Tier-1 actions in the executable subset).</summary>
        public static readonly IReadOnlyList<string> CookActions = new List<string> { "EXECUTE_DEFAULT", "PAUSE_OPS" };

        /// <summary>Look up a whitelisted COOK field by its canonical key; null if not in the whitelist.</summary>
        public static FieldSpec FieldByKey(string key)
        {
            foreach (FieldSpec f in CookFields)
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
        ///   EVENT number → "WHEN EVENT(heat,>=,5) THEN PAUSE_OPS @100;"
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

        /// <summary>Serialize a single rule to its DSL line (no trailing newline).</summary>
        public static string SerializeRule(RuleRow r)
        {
            string field = (r.field ?? string.Empty).Trim();
            string comparator = (r.comparator ?? string.Empty).Trim();
            string value = NormalizeValue(r);
            string trigger = (r.triggerKind ?? string.Empty).Trim();
            string action = (r.action ?? string.Empty).Trim();
            // WHEN <trigger>(<field>,<comparator>,<value>) THEN <action> @<priority>;
            return $"WHEN {trigger}({field},{comparator},{value}) THEN {action} @{r.priority};";
        }

        // Normalize the literal value: a bool field → lower-cased "true"/"false" (the parser reads `true`/`false` as
        // IDENT enum literals); a numeric field → the trimmed raw text (the parser reads it as a NUMBER literal). We do
        // NOT coerce/repair beyond casing/trim — a bad value still serializes and the backend reports the diagnostic.
        private static string NormalizeValue(RuleRow r)
        {
            string raw = (r.value ?? string.Empty).Trim();
            FieldSpec spec = FieldByKey((r.field ?? string.Empty).Trim());
            if (spec != null && spec.IsBool)
            {
                // Normalize common bool spellings to canonical lower-case; leave anything else as-typed (let the
                // backend reject it) so we never silently rewrite a value the player intended.
                if (raw.Equals("true", StringComparison.OrdinalIgnoreCase)) return "true";
                if (raw.Equals("false", StringComparison.OrdinalIgnoreCase)) return "false";
            }
            return raw;
        }

        // --- natural-language preview ------------------------------------------------------------------------------

        /// <summary>
        /// An EN natural-language preview of a rule (slice-1; i18n deferred — spec §9). Maps the comparator + action to
        /// words; bool values read as "is true" / "is false". Examples:
        ///   "When cook_idle is true, run the default behavior (priority 10)."
        ///   "When heat ≥ 5, pause operations (priority 100)."
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
            return $"When {condition}, {ActionWord(r.action)} (priority {r.priority.ToString(CultureInfo.InvariantCulture)}).";
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
