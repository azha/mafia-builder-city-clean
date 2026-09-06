-- migration 0118: liveops_targeting_filter (04e-C event targeting filter serialization)
ALTER TABLE "live_ops_event_active" ADD COLUMN "targeting_filter" jsonb;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "live_ops_event_active" TO app_rw;
