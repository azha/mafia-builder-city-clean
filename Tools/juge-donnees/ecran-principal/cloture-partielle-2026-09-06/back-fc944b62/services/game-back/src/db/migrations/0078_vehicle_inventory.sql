CREATE TABLE "vehicle_inventory" (
	"player_id" uuid NOT NULL REFERENCES "player"("player_id") ON DELETE cascade,
	"vehicle_type" "vehicle_type" NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "vehicle_inventory_pk" PRIMARY KEY("player_id","vehicle_type")
);

GRANT SELECT, INSERT, UPDATE, DELETE ON "vehicle_inventory" TO app_rw;
