
INSERT INTO boss_mirror_violation_ring (lieutenant_id,player_id,violation_slots,ring_head,violation_density,defection_tolerance)
 VALUES ('01a05428-3ba3-7f25-8b3f-174388e9f15a','01a05428-3b6e-7083-bd79-443653620c64','[{"rule_id":"no_sunday","severity":100}]'::jsonb,1,0.9,0.5)
 ON CONFLICT (lieutenant_id) DO UPDATE SET violation_density=0.9, violation_slots=EXCLUDED.violation_slots;
UPDATE boss_mirror_declaration_ledger SET consistency_index=0.3 WHERE player_id='01a05428-3b6e-7083-bd79-443653620c64';
INSERT INTO restraint_dispute_ring (player_id,counterparty_id,dispute_slots,ring_head,restraint_ratio,wary_active)
 VALUES ('01a05428-3b6e-7083-bd79-443653620c64','01a05428-3ba3-7f25-8b3f-174388e9f15a','[{"claimable_amount":10,"claimed_amount":10},{"claimable_amount":8,"claimed_amount":8},{"claimable_amount":6,"claimed_amount":6}]'::jsonb,3,0.0,true)
 ON CONFLICT (player_id,counterparty_id) DO UPDATE SET wary_active=true;
INSERT INTO hidden_curriculum_norms_vector (lieutenant_id,player_id,norms_flags,witnessed_event_ring,ring_head)
 VALUES ('01a05428-3ba3-7f25-8b3f-174388e9f15a','01a05428-3b6e-7083-bd79-443653620c64','{"punctuality":true,"silence_at_handoffs":false,"debt_handling":false,"escalation_reflex":false,"fairness_to_subordinates":true,"discretion_around_civilians":true,"restraint_with_force":false,"ledger_hygiene":true}'::jsonb,'[]'::jsonb,0)
 ON CONFLICT (lieutenant_id) DO UPDATE SET norms_flags=EXCLUDED.norms_flags;

