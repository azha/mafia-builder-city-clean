# ㉚ Les deux gestes — entretenir une liaison, reconstruire une route (CLIENT-1, 11/11)

Maquette RATIFIÉE : cadres 159-169, `atelier3d-mafia-C1/poser-chaine-gestes.py` (docstring + `ENTRETIEN`/`RECONSTRUCTION`/`ANNEXE`)
et `poser-chaine-routes.py` (`SINUOSITE`/`EFFONDREMENT`/`ETAT`/ordre). Juge ⊥ : `…/juge-donnees/chaine-appro-30/maquette-routes-2026-11-11/rapport.md`
(E1 `draft` sans écrivain · E2 bandes re-dérivées à CHAQUE lecture · E3 `maintaining` = `maintenance_completes_at_tick IS NOT NULL`).
Base : `lot/client1-gestes-30-2026-11-11` @d886738a. **Aucun lancement d'Unity ce soir** : typecheck hors porte + tests PlayMode écrits, joués demain.

## 1. Ce que le lot livre VRAIMENT ce soir (à lire avant tout le reste)
- **Les cinq modes (3 entretenir + 2 reconstruire) sont ÉTEINTS sur la pile d'aujourd'hui.** Règle (3) de f2 : coût absent ⇒ mode éteint ; aucun coût n'est servi avant le geste
  (juge, « Non servi »). Donc le lot câble la feuille, le POST et les gardes, et **le joueur ne peut déclencher ni `maintain` ni `rebuild`**
  tant que BACK-1 n'a pas servi les coûts. Les valeurs du poseur (50/300/50 €, 100/400/1 000 €) sont des **défauts de tunables, jamais recopiés** (V-fabrication).
  Le chemin actif est prouvé par un corps de test qui PORTE les coûts (garde G-D1), pas par l'écran monté sur la pile.
- **Prérequis dans le lot** : les lignes de ROUTES n'existent pas (`AppliquerChaine`, `ChaineDApproScreenController.cs:615-651` : maillons + liaisons seulement).
  Pas de ligne de route ⇒ pas de point d'entrée pour `rebuild`. Le lot rend donc d'abord la section « Les routes » (cadre 159) : titron + `ConstruireRoute`,
  ordre `state → effondrement → nom d'origine` recopié de `poser-chaine-routes.py:52-54`, `draft` jamais dessiné (E1).
- **La liaison ne s'éteint pas** : `legs[].maintaining` n'est pas servi ⇒ on ne dessine RIEN et on ne devine rien (règle 3). Le joueur apprend l'entretien
  en cours par le refus servi `error.supply_chain.maintenance_in_progress`. Seule la ROUTE s'éteint, sur `routes[].rebuilding` (servi, DTO :107).

## 2. Découpage (a)
| Fichier | Rôle |
|---|---|
| `ChaineDApproGestes.cs` **NEW** | Données pures, sans uGUI : `ModeDeGeste {id servi, clé+repli du libellé, clé+repli du sous-titre, Structurel}`, les deux `SpecDeGeste`, et **la seule règle d'extinction** `Actionnable(mode, coutServi, jetonDisponible)`. Testable sans rendu. |
| `ChaineDApproFeuille.cs` **NEW** | Montage uGUI de la feuille : voile + panneau, posés **hors** de la fenêtre `RectMask2D` (`:706-713`) et **en dernier enfant** de la racine d'écran, sinon la feuille est rognée. Expose `Ouvrir(spec, cible)` / `Fermer()` et `DernierePhraseMontree`. |
| `ChaineDApproScreenController.cs` | +`ConstruireRoute`, +le `Button` d'entrée sur les deux lignes, +les deux coroutines de geste, +la relecture. Rien d'autre ne bouge. |
| `ChaineDApproGraphe.cs` (`:1391+`) | +`Route` et `Routes(dto.routes, parId)`, patron exact de `Liaison`/`Liaisons(:1432)`. |
| `ChaineDApproDtos.cs` / `ChaineDApproClient.cs` | DTO + `PostOperationalRoutesRebuild` ; les stubs « MÉTIER ICI » (:129-142) se remplissent SUR MESURE, cf. §3. |

## 3. Absent ≠ zéro, avec JsonUtility (b)
- Précédent REUSE : `DelegationClient.LireTaskCategories` (`Assets/Scripts/Operational/Delegation/DelegationClient.cs:88-100`) — JsonUtility ne distingue pas
  l'absent du défaut, donc **la présence se lit dans le CORPS BRUT, par le nom de la clé**, et se pose dans un champ non sérialisé `…Servi`.
- Même forme ici : `ChaineDApproClient.LireGraphe(string corps)` **static**, qui pose `SupplyChainLegDto.MaintainingServi` et, quand BACK-1 servira les coûts,
  `CoutServi` par mode. Static ⇒ un test PlayMode lui donne un corps brut sans réseau.
- `rebuild` est le SEUL geste mesuré (`mesures/08-rebuild-MINIMAL_REROUTE.json`) : réponse **camelCase** `{routeId, mode, version, rebuildCompletesAtTick}`.
  `rebuildCompletesAtTick` est un **tick brut : jamais affiché** (R2.2), gardé par G-D3. `maintain` n'a **jamais** été exercé (le juge n'appelle que
  `…/maintain` sur un legId inexistant, `mesures/00-commandes.sh:49-50`) ⇒ son DTO de réponse reste VIDE et déclaré tel : l'après-geste vient de la
  **relecture du graphe**, jamais du corps de réponse (vrai aussi pour `rebuild` — E2 : les deux bandes sont re-dérivées à chaque lecture).
- POST par le client existant + `ClientHttp.Idempotent` (patron `:69` et `:131`). Refus = `RefusServi.Phrase` via `DernierePhraseDeRefus` (`:22`) et **rien d'autre** ;
  `onErr` avec `responseCode == 0` (réseau) n'est PAS un refus : la feuille reste ouverte, sans phrase (G-D5).

## 4. Point d'entrée et après-geste (c)
Cible = `legs[].leg_id` / `routes[].route_id` (servis, jamais dessinés). Un `Button` sur la racine de ligne (`ConstruireLiaison:809`, `ConstruireRoute` neuf) ;
le fond `Image` est déjà le raycast target. Ligne de route **non interactable** quand `rebuilding` ; ligne de liaison toujours interactable (§1).
Après un 2xx : fermer la feuille, `RechargerChaine()` (`:305`) — « en entretien » (quand servi) ou « contournée », **jamais les deux** (E3, G-D6) ;
route « Ouverte » **+** « En reconstruction ». Jeton : `JetonDeStructure.PlafondAtteint` lu comme `DemolitionScreenController:1057` ; `!Connu` ⇒ **disponible**.

## 5. Gardes, chacune avec son contrôle positif (d)
| # | Garde | Contrôle positif (DOIT rougir) |
|---|---|---|
| G-S1 | Tout `Graphic` de la feuille porte son `CanvasRenderer` et est `MaskableGraphic` ; la feuille est **dernier enfant**, hors du `RectMask2D` | retirer le `CanvasRenderer` du voile ; reparenter la feuille sous la fenêtre |
| G-S2 | **Rendu + comptage de pixels** : le voile assombrit la bande de liste sous lui (pixels comptés avant/après ouverture) | alpha du voile à 0 — réglage valide, zéro pixel |
| G-D1 | Coût absent ⇒ mode éteint | le même corps AVEC le coût servi ⇒ mode actionnable |
| G-D2 | Jeton pris ⇒ mode structurel éteint, portant la phrase servie du cap | `JetonDeStructure.OublierPourTest()` ⇒ la marque « votre grande décision du jour » revient |
| G-D3 | Aucun texte de la feuille ne porte un tick ni un nombre de ticks (R2.2) | injecter « 12 ticks » dans un sous-titre |
| G-D4 | Zéro repli : clés neuves toutes en `DetteDatee` (`ZeroRepliDesLocatairesPlayModeTests.cs:43`) | la règle (2) du test rougit dès qu'une clé est servie |
| G-D5 | Échec réseau ⇒ aucune phrase de refus montrée | un 409 servi ⇒ la phrase servie apparaît |
| G-D6 | « en entretien » et « contournée » jamais ensemble sur une ligne | un leg portant les deux ⇒ rouge |

## 6. Clés i18n dérivées (e) — toutes en `DetteDatee`, repli FR = le mot RATIFIÉ du poseur
`appro.geste.entretenir_la_liaison` · `appro.geste.reconstruire_la_route` · `appro.mode.rafistoler|renforcer|contourner|petit_detour|remise_a_plat`
· `appro.mode_sous.<même suffixe>` (durée en mots + conséquence, `poser-chaine-gestes.py:49-56`) · `appro.bloc.pendant_les_travaux_plus_rien_ne_passe_sur_cette_route`
· `appro.cout.on_ne_sait_pas_encore_combien` (le mode éteint de §1 — à faire ratifier par f2) · `appro.etiquette.en_entretien` · `appro.titre.les_routes`
· `appro.etat.active|saturated|severed` · `appro.etat.en_reconstruction`.
**REUSE, jamais réinventé** : `accueil.jeton.votre_grande_decision_du_jour` (le mot du jeton de ④) · `appro.bouton.ca_part_du_compte_tout_de_suite` ·
`game.ui_common.cancel_button` · `appro.sinuosite.*` / `appro.effondrement.*` (servis au cumul `74c5a0b0`, **pas sur la pile** — repli compté).
**Aucune clé de refus** : une phrase de refus vient de `RefusServi`, jamais d'un repli client.

## 7. Dettes (f) — numéros ARBITRÉS par CLIENT-1 (TD-1017..1019 sont PRIS par la branche marché C ; TD-980..989 et 1014..1016 aussi)
TD-1046 coûts par mode non servis ⇒ les cinq modes éteints, et refus « Pas assez d'argent pour ça. » non servi (le back dit `error.resource.state_conflict`) (BACK-1) ·
TD-1047 `legs[].maintaining` non servi ⇒ « en entretien » jamais dessiné · TD-1048 mots des feuilles en clés dérivées (DetteDatee) ·
TD-1049 corps/réponse de `maintain` jamais mesurés + `POST /v1/operational/routes/:id/replan` sans CTA (question produit, juge § Actions) ·
TD-1080 le jeton de structure n'est pas republié après un geste structurel de ㉚ (revue ⊥ M2) : `JetonDeStructure.DepenseLocalement()` n'incrémente que `Utilises` (aucun cap fabriqué), la marque « votre grande décision du jour » n'est dessinée que si `Utilises == 0`, le mode reste actionnable ; une 2ᵉ décision de la même session finit en 409 servi (`structural_cap_exhausted`). Le client ne peut pas calculer `cap_reached` (cap = tunable 1..2, 0 sous fenêtre T4, jamais servi ; `structural_budget` ne sort que de `session/open`) ⇒ BACK-1 : servir `cap`, ou une route de RELECTURE du budget hors `session/open`.
Plage TD-1040..1050 : 1040-1045 pris, 1046-1050 ici.

**Revue ⊥ du 11/11 (B1)** : la feuille « Reconstruire » ne propose que DEUX modes — `MINIMAL_REROUTE` (Petit détour) et `FULL_GEOMETRIC_RESET` (Remise à plat, structurel). `MODERATE_RESTRUCTURE` (« Remaniement ») est RETIRÉ (décision produit de f2 : même recalcul que Petit détour, seul le coût diffère) ; ses clés `appro.mode.remaniement` / `appro.mode_sous.remaniement` n'existent pas (20 clés neuves, pas 22) ; le back la sert encore dans `rebuild[]` : cette ligne est ignorée, jamais rendue.

## 8. Le gate ⊥ de §1 n'est PAS demandé : « coût absent ⇒ geste éteint » est la règle de f2 (11/11), le lot livre cette feuille câblée, éteinte jusqu'à BACK-1 ; f2 est prévenu.
