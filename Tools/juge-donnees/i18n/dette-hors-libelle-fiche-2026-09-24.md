# Dette — littéraux HORS Libelle sur la fiche bâtiment ② (2026-09-24, CLIENT UNITY)

Ordre de l'orchestrateur (24/09) : « si une clé servie existe, passe par Libelle ; sinon, ouvre une entrée de dette avec la
preuve et laisse le code en l'état. N'invente pas de clé. »

Mesure : bundle fr servi par la pile de dev, build `e7f52351` (X-Server-Build, 1659 clés, `rtk proxy curl
…/v1/i18n/bundle?locale=fr`), cherché par VALEUR (insensible à la casse) et par clé `building.*`.

| littéral | site (`BuildingCardController.cs`, branche `restauration/conflit-2026-09-24`) | rendu par | clé `building.*` servie | preuve |
|---|---|---|---|---|
| ~~« ACTIONS »~~ | ~~en-tête de la barre d'actions~~ | — | — | **RETIRÉ** (24/09) : l'atelier a vérifié les 146 cadres de la série 6, aucun ne porte ce mot — ordre de l'orchestrateur |
| « Honorer le rendez-vous » | bouton du rendez-vous Ash, **deux** sites (l'un antérieur au 23/09, l'autre ajouté par la mise en scène de l'écrin) | `AddActionButton` → `NewText`, label tel quel | **aucune** | aucune valeur « Honorer le rendez-vous » servie ; seules `building.bloc.le_rendez_vous_est_honore` et `building.appointment.honored` existent (l'état, pas le geste). **Clé DEMANDÉE** (24/09) : `building.action.honorer_le_rendez_vous`, ajoutée PROPOSÉE à la table 37 par l'atelier, à servir par le back ; le bouton reste (seule voie de vente de l'Ash, `POST …/appointment/:id/honor`) et passera par `Libelle` dès que la clé est au bundle |

À faire (hors client) : l'atelier écrit le mot de ces deux gestes/en-têtes (table de la fiche ②), le back sert la clé, puis le
client passe par `Libelle` avec la clé servie. D'ici là, le code reste en l'état — aucune clé inventée.

Dette liée, relevée au même correctif : le surtitre du billet de rendez-vous (table 37 : « la ligne servie `building.row.rendez_vous`
+ le nom de fiction servi du district ») ne peut PAS composer le nom du district : `GET /v1/operational/appointment/:id`
(`AppointmentDto`) ne sert que `appointment_id`, `status`, `payout_band`. Le client rend la ligne servie seule ; le back doit
servir le nom (i18n) du lieu de vente pour la composition complète.
