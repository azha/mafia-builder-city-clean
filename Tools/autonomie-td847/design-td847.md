# TD-847 — ㉔ la boîte d'autonomie : le nom du lieutenant, des mots français par le catalogue (CLIENT-2, 12/11/2026) — UNE page, RATIFIÉE par f2 le 12/11 (code fait)

**Base** : cumul `c98cef3d`. **Fichier** : `Assets/Scripts/Operational/Autonomy/AutonomyInboxController.cs` (+ tests `AutonomyInboxPlayModeTests`, `MotsDesEnumeresPlayModeTests` M4b). **Constat** (lu) : `:297` affiche `"Lt " + report.lieutenant_id + "  •  Oldest: " + n + " cycles"` (un UUID + de l'anglais, classe A) ; `:241` `"Issue : " + LastOutcome` où `LastOutcome` est le jeton BRUT de `resolve` (`NOOP`, `DEFERRED`…) ; `:378` `"Choose A/B"`. Le DTO déclare DÉJÀ `lieutenant { id, name }` (`AutonomyDtos.cs:22-25`, lot F `69b34a78`, **dans la pile 8d0184a4 et dans main**) : le contrôleur ne le lit pas.

## 1. Le nom servi
En-tête = `Libelle.Gabarit(clé, repli, {nom, âge})` avec `nom = report.lieutenant.name`. Nom absent ou vide (JsonUtility rend une instance VIDE, jamais null ; back d'avant le lot F) ⇒ « votre lieutenant » : **jamais l'UUID**. Le nom est une donnée servie, pas un mot à traduire.

## 2. Table des mots (rien n'est servi par le back pour ces lignes : tout est PROPOSÉ sauf mention « atelier »)
Servis aujourd'hui, déjà lus : les 18 `autonomy.*` (libellés d'option), `autonomie.etat.*` (4 conséquences + `inconnu`), `autonomie.vide.*`, `autonomie.refus.*`. **Les lignes ci-dessous n'ont aucune clé servie** ⇒ chacune devient DetteDatee (levée = servie sur la pile).

| où | fr | en | source |
|---|---|---|---|
| en-tête de rapport | De {nom} · {âge} | From {name} · {age} | atelier `13-autonomie-inventaire.md` §3.3 (« De {nom} », « l'âge d'un message ») |
| âge, 0 / 1 / n | Ce cycle · 1 cycle · {n} cycles | This cycle · 1 cycle · {n} cycles | atelier §3.3 (pluriel) ; `backlog_age_cycles` |
| nom absent | votre lieutenant | your lieutenant | PROPOSÉ |
| bouton A / B | Choisir A · Choisir B | Choose A · Choose B | PROPOSÉ (lettres : la garde « pas de scalaire brut » compte les chiffres, la légende est « digit-free » ; l'atelier du téléphone dit « 1 / 2 » — à trancher) |
| préfixe du résultat (`Issue :`) | Résultat : | Outcome: | PROPOSÉ. ⚠ pas « Problème » (contresens, voir ⑩-1 `ExceptionDetailController.cs:261`) |
| titre de l'écran | Rapports d'autonomie | Autonomy reports | PROPOSÉ (littéral français en dur aujourd'hui, `:462`) |
| déjà décidé | ✓ Décidé | ✓ Decided | PROPOSÉ (littéral français en dur, `:331`) |
| boîte muette | La boîte n'a pas répondu. | The inbox didn't answer. | PROPOSÉ (littéral en dur, `:276`) |

**Résultat de `resolve`** — jeton fermé servi par le back (`option-handlers/*.ts`), jamais montré brut ; jeton inconnu ⇒ « C'est fait. » :

| jeton | fr | en |
|---|---|---|
| NOOP | Rien n'a changé. | Nothing changed. |
| COOK_STARTED / COOK_REFINED | Cuisson lancée. / Cuisson affinée. | Cooking started. / Batch refined. |
| COLLECTED | Ramassage fait. | Collected. |
| DISPATCHED | Envoi parti. | Dispatched. |
| INJECTED / INJECTED_CONSERVATIVE | Argent injecté. / Argent injecté, prudemment. | Cash injected. / Cash injected, cautiously. |
| DEPOSITED / DEPOSITED_RESERVE | Déposé. / Déposé en réserve. | Deposited. / Put in reserve. |
| REPAIRED | Réparé. | Repaired. |
| HELD / DEFERRED / LEFT_TO_RIDE | Mis en attente. / Reporté. / Laissé tel quel. | Held. / Put off. / Left as it is. |

## 3. Code et preuves
- Un seul point d'entrée par mot (`Libelle.Gabarit(clé, repli)` ; clé neuve non servie ⇒ DetteDatee `ZeroRepli`). Clé = slug du français, domaine `autonomie` (comme `autonomie.vide.*`).
- Tests : en-tête = le NOM servi, jamais l'id (corps réel avec `lieutenant.name`, sans lui, vide) ; âge 0/1/n ; chaque jeton de résultat → sa phrase, jeton inconnu → « C'est fait. », jamais le jeton brut ; `M4b` (littéraux anglais déclarés) retiré avec les littéraux ; `Btn_A`/`Btn_B` gardent leurs noms (`RetourGpLotC` les cherche).
- Rouge démontré : en-tête relu sur `lieutenant_id` ⇒ test du nom rouge.

## 4. Tranché par f2 (12/11)
(1) LETTRES « Choisir A / Choisir B » (légende sans chiffre) ; (2) « Résultat : » / « Outcome: » ; (3) la table des 13 jetons telle quelle, jeton inconnu « C’est fait. » / « Done. » ; (4) OUI aux trois littéraux au passage. Typographie des replis : apostrophe ’ (U+2019), U+00A0 avant « : ».
Clés (extracteur `Tools/cles-i18n-du-client.py`, 23 neuves) : `autonomie.titre.rapports_d_autonomie`, `autonomie.entete.de_nom_age` (`{nom}` `{age}`), `autonomie.entete.votre_lieutenant`, `autonomie.age.cycles` (ICU plural `{n}`), `autonomie.bouton.choisir_a|b`, `autonomie.etat.decide` (valeur SANS glyphe : le client pose « ✓ »), `autonomie.refus.la_boite_n_a_pas_repondu`, `autonomie.resultat.prefixe` (`{phrase}`), `autonomie.resultat.{rien_n_a_change, cuisson_lancee, cuisson_affinee, ramassage_fait, envoi_parti, argent_injecte, argent_injecte_prudemment, depose, depose_en_reserve, repare, mis_en_attente, reporte, laisse_tel_quel, c_est_fait}`.
