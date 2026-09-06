-- migration 0153: cheat_flag — un seul flag EN FILE par (joueur, signal) (W1.2-a C4)
-- Périmètre: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §12
--
-- ⛔ POURQUOI CETTE GARDE EST UN INDEX ET PAS UN `IF` DANS LE SERVICE.
--    Le détecteur C1 s'évalue sur le chemin de `POST /v1/city/inspection/report`, donc à CHAQUE
--    rapport. Sans unicité, un joueur au-dessus du seuil produit un flag par rapport et noie la
--    file de revue humaine — le détecteur se rend lui-même inutilisable. Une garde écrite dans le
--    service ne tient que pour les appelants qui passent par le service ; W1.2-b et W1.2-d vont
--    ajouter d'autres écrivains de cette table, et ils n'ont aucune raison de connaître ce `if`.
--
-- ⛔ PARTIEL, ET C'EST LE POINT. L'unicité ne porte que sur `QUEUED`. Un flag `REVIEWED` ou
--    `RESOLVED` doit pouvoir coexister avec un flag neuf du même signal : sinon un joueur flaggé
--    puis blanchi ne pourrait plus JAMAIS être re-flaggé sur ce signal — la garde d'anti-doublon
--    deviendrait une immunité à vie, ce qui est le contraire de ce qu'on veut.
--
-- Pas de `NULLS NOT DISTINCT` ici : les deux colonnes de la clé sont `NOT NULL` (`0011`).
--    Ajouter la clause serait un ornement — elle ne peut pas mordre.
--
-- Additive : un index. Aucune colonne, aucun type, aucune contrainte de table. Aucun GRANT à poser
-- (mesuré : `cheat_flag` porte déjà SELECT,INSERT,UPDATE,DELETE pour `app_rw` via `0013:60-96`).

CREATE UNIQUE INDEX IF NOT EXISTS "cheat_flag_queued_signal_uq"
  ON "cheat_flag" ("target_player_id", "source_signal")
  WHERE "status" = 'QUEUED';
