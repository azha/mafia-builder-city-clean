-- C6 D1: equipment_tier upgrade window column — tracking the offline-during-upgrade period.
-- Authorized schema change (windowed upgrade, user-authorized C6).
-- R9.3: operational_chain.ts + schema_operational_chain.md backported in the SAME commit.
ALTER TABLE building_operational_state
  ADD COLUMN equipment_tier_upgrade_remaining_ticks integer NOT NULL DEFAULT 0
  CONSTRAINT bos_equipment_tier_upgrade_remaining_ticks_chk CHECK (equipment_tier_upgrade_remaining_ticks >= 0);
