namespace MafiaCleanCity.Shell
{
    // W3.U1 (design §1.2, canon global_conventions_core.md) — the shell's 4 UI timing tunables
    // (T.ui.*: cold-open, blocking-animation, long-press, badge-pulse).
    //
    // R2.3 (tunables jamais inline) honoured AT THE LEVEL THIS REPO ACTUALLY SUPPORTS: unlike the
    // back (`core-loops-tunables.ts`, a hot-reload store-backed registry), NO client-side tunable
    // registry exists anywhere in `mafia-builder-city-clean` (measured: zero `*Tunable*` files before
    // this lot) — building one is a whole new subsystem, out of scope for a shell/Home/Daily-Review
    // lot (DÉDUIT, implementation-notes.md § Deviations). The conservative floor: ONE centralized,
    // named class — every consumer references THESE constants, never a repeated inline literal — so
    // a future registry migration touches this file alone, not N call sites.
    // Noms recopiés VERBATIM de global_conventions_core.md:102,124,136,162 (jamais reformulés —
    // ce sont les 4 identifiants `T.ui.*` que le BO édite via `PUT /admin/tunables/T.ui.*`).
    public static class UiTimingTunables
    {
        public const int ColdOpenLeverageMs = 800;     // T.ui.cold_open_leverage_ms
        public const int AnimMaxBlockMs = 250;         // T.ui.anim_max_block_ms
        public const int DestructiveLongpressMs = 1000; // T.ui.destructive_longpress_ms
        public const int RefreshingPillDelayMs = 800;  // T.ui.refreshing_pill_delay_ms
    }
}
