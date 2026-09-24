# Dette — littéraux HORS Libelle sur la fiche bâtiment ② (2026-09-24, CLIENT UNITY)

Ordre de l'orchestrateur (24/09) : « si une clé servie existe, passe par Libelle ; sinon, ouvre une entrée de dette avec la
preuve et laisse le code en l'état. N'invente pas de clé. »

Mesure : bundle fr servi par la pile de dev, build `e7f52351` (X-Server-Build, 1659 clés, `rtk proxy curl
…/v1/i18n/bundle?locale=fr`), cherché par VALEUR (insensible à la casse) et par clé `building.*`.

| littéral | site (`BuildingCardController.cs`, branche `restauration/conflit-2026-09-24`) | rendu par | clé `building.*` servie | preuve |
|---|---|---|---|---|
| « ACTIONS » | en-tête de la barre d'actions (hors pupitre focal) | `NewSectionLabel` → `NewText`, texte tel quel | **aucune** | la seule valeur « Actions » servie est `famille.ecran.actions` (domaine de la Famille, pas de la fiche) — non réutilisée : une clé d'un autre domaine n'est pas la clé de ce mot ici |
| « Honorer le rendez-vous » | bouton du rendez-vous Ash, **deux** sites (l'un antérieur au 23/09, l'autre ajouté par la mise en scène de l'écrin) | `AddActionButton` → `NewText`, label tel quel | **aucune** | aucune valeur « Honorer le rendez-vous » servie ; seules `building.bloc.le_rendez_vous_est_honore` et `building.appointment.honored` existent (l'état, pas le geste) |

À faire (hors client) : l'atelier écrit le mot de ces deux gestes/en-têtes (table de la fiche ②), le back sert la clé, puis le
client passe par `Libelle` avec la clé servie. D'ici là, le code reste en l'état — aucune clé inventée.

Dette liée, relevée au même correctif : le surtitre du billet de rendez-vous (table 37 : « la ligne servie `building.row.rendez_vous`
+ le nom de fiction servi du district ») ne peut PAS composer le nom du district : `GET /v1/operational/appointment/:id`
(`AppointmentDto`) ne sert que `appointment_id`, `status`, `payout_band`. Le client rend la ligne servie seule ; le back doit
servir le nom (i18n) du lieu de vente pour la composition complète.
