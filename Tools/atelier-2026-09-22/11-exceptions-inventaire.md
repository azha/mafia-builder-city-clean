# ⑨ Les exceptions et ⑩ Le détail d'une exception — inventaire de la maquette, l'art qui existe, les mots qui manquent

> Atelier / DA, 2026-09-23 (00:30). Côté atelier seulement : **CLIENT-2 fait l'écart avec le contrôleur.** Aucun rendu, aucune capture.
> **Cadres cités** : série 4, `ecrans-brennar-4.html` cadres **14** (la file), **15** (sa main de cartes = ⑩), **16** (personne ne fait
> la queue), **17** (après le tampon), **18** (avec les lots back) — atelier `18432fd`. Back `4841d7ad` : `string_table.ts` lu **registre
> par registre** (`EN_MESSAGES` l.53, `FR_MESSAGES` l.1683 — l'EN vient d'abord), `exceptions/exceptions.projection.service.ts`,
> `exceptions/raid-exception-producer.service.ts`. Client (pour les mots déjà écrits) : `gate/cumul-client-2026-09-22` (`443489ec`).

---

## 1. Les blocs de la maquette, cadre par cadre

| bloc | cadres | nature | source dans la maquette |
|---|---|---|---|
| **le décor** : la façade du Verge d'Or de nuit | 14-18 | **ART** (image) | `.scene.bar` (`:186`), JPEG embarqué 720×900 ; `background-position: center 20%` |
| le dégradé sur la scène | 14-18 | CSS | `.degrade.fort` (`:191`) |
| le zinc, l'étagère, le plateau | 14-18 | CSS | `.zinc.haut` 66 % (`:211`) sur ⑨ ; `.zinc.main-de-cartes` 15 % (`:210`) sur ⑩ ; `.zinc.haut.vide` 52 % (`:352`) sur l'état vide |
| la file : ceux qui attendent, gravité en rail, priorité en mot | 14, 17, 18 | CSS + bustes | `.attendant` (`:473`), `.rail.g` / `.rail.m` (`:479`) |
| **les bustes** des lieutenants | 14, 15, 17, 18 | **ART** (silhouette) | `<use href="#buste-lieutenant">` (depuis `18432fd`) |
| « La ville » quand la carte n'a pas de lieutenant | 14, 17, 18 | CSS (une lettre) | `.ville-b` (`:484`) : un « B » en Georgia, or vif |
| celui qui parle : bulle, nom, chips gravité · priorité (· confiance sur ⑩) | 14, 15, 17, 18 | CSS + mots | `.parle`, `.bulle`, `.chip.sev-g`, `.chip.pri-c`, `.chip.conf` |
| la main de cartes : 3 cartes (♠ ♦ ♣), le talon « +3 » | 15 | CSS + glyphes texte | `.main` (`:252`), `.carte` (`:253`), `.carte.sombre` (`:261`), `.talon` (`:265`) |
| le tampon (appui long) | 14, 15, 17, 18 | CSS | `.tampon` |
| le cachet « EN RÉPARATION » de la carte tranchée | 17 | CSS | `.tampon-diag` (`:401`) |
| les tabourets vides, la plaque | 16 | CSS | `.tabourets.grands.vides`, `.vide-siege`, `.plaque` |
| « Escalades archivées » | 14, 16 | CSS + mots | `.filet.lien` |

⇒ **Deux blocs d'art seulement : le décor et les bustes.** Tout le reste est du CSS, donc de l'UI procédurale côté client, sans asset
à produire. Couleurs CSS = **sRGB**.

---

## 2. L'art — ce qui existe, et la preuve

### 2.1 Le décor : `bar_FINAL2.png` — il EXISTE dans l'atelier, il n'est PAS dans le client

| | |
|---|---|
| chemin | `~/project/atelier3d-mafia/bar_FINAL2.png` (suivi en git, pas en LFS) |
| taille | **1080 × 1350** px, RGBA **opaque** (alpha 255 partout), 1 606 824 octets, sRGB |
| sha256 | `8ad2255bb1481d79de68f4e93dcd2938c61438860e149b936d75d1c252028033` |
| commit | `a026f50`, 2026-08-20 — le « sauvetage » de l'atelier copié depuis le `/tmp` de session : **le script qui l'a rendu n'est pas nommé** (aucun `.py` de l'atelier ne cite `bar_FINAL2`) |
| ce qu'il montre | la façade du bar de nuit, fenêtres chaudes, vitrine, deux réverbères, trottoir mouillé — le « cœur d'or » de `BRENNAR-IDENTITE.md` |

**Preuve par les pixels** (`Tools/atelier-2026-09-22/apparier-fond-maquette.py`, rejouable, classe `bar`) :

```
fond `.scene.bar` de ecrans-brennar-4.html : 720x900, 46198 octets
contrôle POSITIF (le fond contre lui-même) : 0.00/255
  bar_FINAL.png                        1080x1350  écart gris  21.92/255
  bar_FINAL2.png                       1080x1350  écart gris   0.75/255  échelle 0.667  boîte source (0, 0, 1080, 1350)
  bar_v10_draft.png                    720x900    écart gris   2.91/255   (le brouillon du même rendu)
  bar_v3_d8.png … bar_v3_draft.png     720x900    26,20 à 46,76
  VERGE3_NUIT_FINAL.png, VERGE_NUIT_FINAL.png, p2_fonds/VERGE_D_NUIT_FINAL.png : 40,92 à 63,45
meilleur : bar_FINAL2.png, boîte (0, 0, 1080, 1350)
  vérification RVB de la boîte         : 1.22/255
  VOISIN décalé de (-4, -4)            : 6.24/255
  VOISIN décalé de (4, 0)              : 4.22/255
  contrôle NÉGATIF (VERGE3_JOUR_FINAL.png, même boîte) : 85.83/255
```

⇒ Le fond de ⑨/⑩ est **`bar_FINAL2.png` entier**, réduit à ×0,667 et ré-encodé en JPEG. Aucun fichier sous `Assets/` de l'arbre F ne
porte ce sha256 : le client a les sprites du bâtiment (`bar_hero_nuit_*`, pour la carte) et les fonds de district, pas ce décor.

**Montable tel quel : oui.** Le fichier entier, sans découpe (la maquette l'utilise entier).
- Cadrage : couvre tout l'écran, centré, à 20 % en hauteur, sous `.degrade.fort`. Sur 1080×2400, l'agrandissement est **×1,78**
  (2400 ÷ 1350) : la fenêtre visible est de 607 px de large dans la source. C'est plus net que la référence ratifiée, rendue depuis
  le JPEG de 900 px de haut (×2,67).
- ⚠️ **⑩ montre presque tout le décor** : son zinc ne couvre que 15 % du bas, contre 66 % sur ⑨. C'est sur ⑩ que la netteté se verra.
- Importer en sRGB, opaque (alpha plein : pas de transparence à gérer), sous `Assets/Art/<…>/Resources/<…>` avec son `.meta`, jamais
  sous `Assets/Resources/` (règles de montage de la mémoire « art orphelin »).
- Le même bar sert au Recrutement ⑳ (cadres 12-13, `.scene bar`) : un seul asset pour deux écrans.

### 2.2 Les bustes — existent, déjà montés

Tout lieutenant porte la capuche, `ui_element_buste_lieutenant` (256×256, `7bfd1968`, déjà lu par ⑥ et ①) — la règle par rôle du
02/09, ré-affirmée pour ⑯ le 22/09. La maquette avait le même artefact que ⑯ : Lt. Marr (cadres 14, 17) et Lt. Sallo (cadre 18)
portaient le buste de « l'homme » (casquette). **Corrigé dans l'atelier (`18432fd`)** : les neuf bustes de 14-18 passent à
`#buste-lieutenant`. Zéro art neuf.
⚠️ **Même arbitrage que ⑯, non touché** : le premier de la file porte l'anneau or vif `.medl.don` (cadres 14, 15, 17, 18) — l'anneau que
la décision du 02/09 réserve au Don.

### 2.3 Ce qui existe aussi, et qui n'est PAS la réponse

La campagne fal du 06/09 a livré pour ⑨ une matière `Tools/fal/generees/2026-09-06/matieres/ardoise.png` (« ⑨ Exceptions · encre
crème · tuilable ») et un état vide `aplat/vide-exceptions.png`. **La maquette ratifiée n'en dessine aucun** : ⑨ vit au comptoir, et son
état vide (cadre 16) est le bar, les tabourets vides et la plaque. Les monter serait changer la DA de l'écran contre la maquette.

---

## 3. Les mots — ce que le bundle sert, ce qu'il ne sert pas

Méthode : chaque texte visible des cadres 14-18 (hors chrome) comparé aux valeurs de `FR_MESSAGES`, exactes ou par gabarit (placeholder
= joker, branches ICU séparées), puis la même clé lue dans `EN_MESSAGES`.

### 3.1 Servis en fr, mais **l'en est le fr à l'octet** — 19 clés de ⑨/⑩

`exceptions.locuteur.la_ville` · `exceptions.bloc.escalades_archivees` · `exceptions.bloc.a_relire_a_tete_reposee` ·
`exceptions.bloc.il_attend_une_consigne` · `exceptions.bloc.ouvrir` · `exceptions.bloc.file_indisponible_verifier_la_pile` ·
`exceptions.categorie.{conflit,diplomatie,renseignement}` · `exceptions.nombre.{deux,trois,quatre,cinq,six,plusieurs}` ·
`exception_detail.bloc.{risque,suggere,lui_apprendre,resolu}`.

| clé | fr (servi) | en proposé |
|---|---|---|
| `exceptions.locuteur.la_ville` | La ville | The city |
| `exceptions.bloc.escalades_archivees` | Escalades archivées | Archived escalations |
| `exceptions.bloc.a_relire_a_tete_reposee` | à relire à tête reposée | to go over with a clear head |
| `exceptions.bloc.il_attend_une_consigne` | il attend une consigne | waiting for your orders |
| `exceptions.bloc.ouvrir` | Ouvrir | Open |
| `exceptions.bloc.file_indisponible_verifier_la_pile` | File indisponible — vérifier la pile | Queue unavailable — check the stack |
| `exceptions.categorie.conflit` | CONFLIT | CONFLICT |
| `exceptions.categorie.diplomatie` | DIPLOMATIE | DIPLOMACY |
| `exceptions.categorie.renseignement` | RENSEIGNEMENT | INTELLIGENCE |
| `exceptions.nombre.deux` / `trois` / `quatre` / `cinq` / `six` / `plusieurs` | Deux / Trois / Quatre / Cinq / Six / Plusieurs | Two / Three / Four / Five / Six / Several |
| `exception_detail.bloc.risque` | Risqué | Risky |
| `exception_detail.bloc.suggere` | Suggéré | Suggested |
| `exception_detail.bloc.lui_apprendre` | Lui apprendre | Teach them |
| `exception_detail.bloc.resolu` | Résolu ✓ | Resolved ✓ |

- « il attend une consigne » → « waiting for your orders » : sans pronom, parce que la carte peut être celle d'une lieutenante (et
  l'en du reste de ⑨ dit déjà « your orders », `exceptions.file.ambiance`).
- « Lui apprendre » → « Teach them » : même raison.

### 3.2 Les bandes — **aucune n'est servie** ; le client porte ses propres mots, dont 3 non ratifiés et 3 absents

Le back sert trois bandes par carte (`exceptions.projection.service.ts:12-14`, `:117-119`). Le client (`ExceptionBandes.cs:59-79`) a
choisi de ne PAS inventer de clé (« la clé se crée côté back, au lot i18n ») : ses mots sont des littéraux. Les voici, avec ce qui manque.

| bande | valeur | fr — maquette ou client | statut | fr proposé | en proposé |
|---|---|---|---|---|---|
| gravité | `SEVERE` | grave | ratifié (cadres 14, 15, 18) | grave | severe |
| gravité | `MODERATE` | modérée | ratifié (cadres 14, 17, 18) | modérée | moderate |
| gravité | `MILD` | « Légère » (client) | **non ratifié**, jamais dessiné | **légère** — la suite naturelle de « grave · modérée » | mild |
| priorité | `critical` | critique | ratifié (cadres 14, 15, 18) | critique | critical |
| priorité | `urgent` | urgente | ratifié (cadres 14, 17, 18) | urgente | urgent |
| priorité | `watching` | « À surveiller » (client) | **non ratifié** | **à surveiller** | to watch |
| priorité | `silent` | « Silencieuse » (client) | **non ratifié** | **sans urgence** — « silencieuse » décrit la carte, pas son rang ; la suite se lit « critique · urgente · à surveiller · sans urgence » | no rush |
| confiance | `confident` | il est sûr | ratifié (cadre 15, `.chip.conf.conf-h`) | il est sûr | they’re sure |
| confiance | `likely` | — (aucun mot, ni maquette ni client) | **absent** | **il le croit** | they think so |
| confiance | `tentative` | — | **absent** | **il hésite** | they’re unsure |

- La confiance dit **ce que le lieutenant pense de sa propre suggestion** (le flottant [0..1] de la carte). « il est sûr » est ratifié ;
  « il le croit » et « il hésite » en sont les deux crans du dessous, dans la même voix. En en, « they » : le lieutenant peut être une
  lieutenante.
- **Clés** : aucune n'existe. Le back les crée à son lot i18n (le client l'a écrit : pas de slug improvisé). Forme proposée, sur le
  modèle des bandes déjà servies : `exceptions.gravite.{severe,moderate,mild}`, `exceptions.priorite.{critical,urgent,watching,silent}`,
  `exception_detail.confiance.{confident,likely,tentative}`.

### 3.3 La réplique du lieutenant — **pas de clé du tout** : le producteur envoie une phrase anglaise en dur

`raid-exception-producer.service.ts:50` : `event_descriptor: 'Your building was raided — the lieutenant needs orders.'` — un littéral,
pas une clé. La maquette le fait parler :

| où | fr (maquette) | en proposé |
|---|---|---|
| la réplique (cadres 14, 15) | Ils ont retourné le bâtiment cette nuit. J’ai pas de consigne pour ça. | They turned the building over last night. I’ve got no orders for this. |
| l'adresse, devant, sur ⑨ (cadre 14) | Patron — | Boss — |
| la question, après, sur ⑩ (cadre 15) | Je fais quoi ? | What do I do? |

- **Au back** : émettre `event_descriptor_i18n` (clé proposée `exception.raid.card.descriptor`, sur le modèle de
  `exception.heat_pressure.card.descriptor`). C'est la même forme que la carte de couplage de ③ ce matin
  (`03-carte-couplage-fr-en.md`, fait 1).
- **Au client** : « Patron — » et « Je fais quoi ? » sont le cadrage de l'écran, pas la réplique : ⑨ met l'adresse devant (et passe
  « Ils » en minuscule), ⑩ met la question derrière. Les guillemets aussi viennent du client (`ExceptionBandes.Replique`).
- Avec le lot back du cadre 18, le bâtiment a un nom : « Ils ont retourné **le Verge** cette nuit » ⇒ un paramètre `{building}` le
  jour où `buildingNameRef` est projeté sur la carte.

### 3.4 Servis, mais **pas avec les mots de la maquette** — à trancher

| clé | fr servi | fr de la maquette (cadre) | ce qui cloche |
|---|---|---|---|
| `exceptions.file.ambiance`, branche `=0` | Personne ne fait la queue — le comptoir est vide | Personne ne fait la queue — **la routine tient** (16) | le servi dit un vide, la maquette dit ce qui tient ; c'est le sens de l'état vide ratifié (« il n'y a rien encore », jamais une perte) |
| `exception.heat_pressure.card.descriptor` | La chaleur est élevée **dans toute la ville** — vos opérations sont sous pression. | La chaleur est haute — vos opérations sont sous pression. (17) | la maquette porte la portée dans l'en-tête (« La ville · toute la ville ») : le servi la dirait deux fois |
| `exception.raid.bribe.label` | Soudoyer un fonctionnaire **(risqué)** | Soudoyer un fonctionnaire (15) | la carte porte déjà l'en-tête « Risqué » |
| `exception.raid.bribe.projected_consequence` | Payer pour faire disparaître la descente — ça peut marcher, ou se retourner et faire monter la chaleur. | le raid disparaît… ou la chaleur monte (15) | une carte a une ligne, pas deux |
| `exception.raid.repair.projected_consequence` | Payer pour remettre le bâtiment en service progressivement. | payer pour le remettre en marche, avec le temps (15) | idem ; « avec le temps » revient au tampon et au cadre 17 |
| `exception.raid.add_rule.label` | **Lui apprendre :** gérer seul un bâtiment perquisitionné | Gérer seul un raid (15) | l'en-tête porte déjà « Lui apprendre » |
| `exception.raid.add_rule.projected_consequence` | Le lieutenant gère désormais seul un bâtiment perquisitionné. | désormais il s’en charge — une règle (15) | la maquette dit que c'est une RÈGLE, le servi ne le dit pas |

**Recommandation de l'atelier** : les valeurs servies prennent la face de carte de la maquette (courte, sans l'étiquette que l'en-tête
porte déjà), avec **un seul mot pour l'événement** : le servi dit « descente » (3 valeurs) et « perquisitionné » (2), la maquette dit
« raid » (2), et le fr servi ne dit « raid » nulle part (0). **« descente »** est le mot français de la chose et il est déjà servi : la
maquette s'y aligne (« la descente disparaît… », « Gérer seul une descente »), pas l'inverse.

| clé | fr proposé | en proposé |
|---|---|---|
| `exceptions.file.ambiance` (`=0`) | Personne ne fait la queue — la routine tient | Nobody’s waiting — the routine holds |
| `exception.heat_pressure.card.descriptor` | La chaleur est haute — vos opérations sont sous pression. | The heat is high — your operations are under pressure. |
| `exception.raid.bribe.label` | Soudoyer un fonctionnaire | Bribe an official |
| `exception.raid.bribe.projected_consequence` | la descente disparaît… ou la chaleur monte | the raid goes away… or the heat rises |
| `exception.raid.repair.projected_consequence` | payer pour le remettre en marche, avec le temps | pay to get it running again, in time |
| `exception.raid.add_rule.label` | Gérer seul une descente | Handle a raid on their own |
| `exception.raid.add_rule.projected_consequence` | désormais il s’en charge — une règle | from now on they handle it — a rule |

⚠️ Ces sept valeurs sont lues par d'autres écrans que ⑨/⑩ ? À mesurer par le back avant d'appliquer (la clé de `heat_pressure` sert
toute carte de chaleur). Le « (risqué) » retiré du libellé doit rester dit quelque part : il l'est par l'en-tête de carte « Risqué » —
un écran qui listerait les options sans en-tête perdrait l'avertissement.

### 3.5 Pas servis du tout — le texte d'écran de ⑨/⑩

| cadre | fr (maquette) | en proposé | note |
|---|---|---|---|
| 16 | Ce soir, au Verge d’Or | Tonight, at the Verge d’Or | le jumeau de ⑯ « Ce matin, au Verge d’Or » (`revue.bloc.ce_matin_au_verge_d_or`) |
| 16 | rien à relire | nothing to go over | sous « Escalades archivées » quand il n'y en a pas |
| 17 | {Deux} attendent encore | {Two} still waiting | la file après le tampon ; le nombre en mot, comme `exceptions.nombre.*` |
| 17 | EN RÉPARATION | UNDER REPAIR | le cachet de la carte tranchée |
| 17 | Le cuisinier est reparti | *{name} is going back to work* | ⚠️ « Le {archétype} est reparti » ne marche que si l'archétype est une personne : « Cuisinier » oui, **« Logistique » non** (c'est le nom d'un domaine, `famille.archetype.logistique`). Proposé : **« {nom} retourne au travail »** — le nom servi du lieutenant, sans article ni participe à accorder |
| 17 | Le bâtiment se remet en marche, avec le temps | The building is coming back, in its own time | |
| 14, 17 | sa main : {n} autres issues › | their hand: {n} other options › | pluriel ICU (« 1 autre issue » au cadre 17) ; précédé de « suggéré · appui long — » |
| 14 | suggéré · appui long — | suggested · long press — | « suggéré » = `exception_detail.bloc.suggere`, en minuscule ici |
| 15 | appui long — la carte se ferme ; le bâtiment, lui, se répare avec le temps | long press — the card closes; the building mends in its own time | le sous-titre du tampon de la réparation |
| 14 | au bâtiment touché | at the building that was hit | la cible quand elle n'a pas de nom ; avec le lot back : « au Verge d’Or » |
| 17 | · toute la ville | · citywide | la portée de la carte de la ville |

### 3.6 Avec les lots back seulement (cadre 18) — les mots, pour le jour où

| fr (maquette) | en proposé | attend |
|---|---|---|
| il y a {n} h · il y a {n} min · hier | {n} h ago · {n} min ago · yesterday | l'âge de la carte (aucun gabarit « il y a » servi aujourd'hui) |
| RÉPARER {LE VERGE D’OR} | REPAIR {THE VERGE D’OR} | le nom du bâtiment sur la carte (`buildingNameRef`) |
| Prendre acte des {deux} modérées | Acknowledge the {two} moderate ones | la confirmation groupée |
| d’un seul geste — la grave reste à votre main | in one move — the severe one stays in your hands | idem |

---

## 4. Ce qui part d'ici

- **À CLIENT-2** : le décor `bar_FINAL2.png` (§2.1, un seul asset pour ⑨, ⑩ et ⑳) ; les bustes (§2.2, rien à produire) ; tout le reste en
  UI procédurale (§1) ; les mots du §3 pour son écart.
- **Au back (f7)** : §3.1 (19 `en`) ; §3.2 (les clés de bande à créer, fr + en) ; §3.3 (`event_descriptor_i18n` pour le raid) ; §3.4 (sept
  valeurs à réaligner, après mesure de leurs autres lecteurs) ; §3.5 et §3.6 (les clés d'écran, au lot i18n de ⑨).
- **À l'user** : « légère », « à surveiller », « sans urgence », « il le croit », « il hésite », et le choix « descente » plutôt que « raid ».
  L'anneau `.medl.don` sur le premier de la file (même question que ⑯).
- ✅ **Références ⑨/⑩ re-rendues** au signal (atelier `0ccd8d5` : bustes à la capuche, anneau du Don retiré) : `reference-⑨`, `reference-⑩`,
  `v4-14`, `v4-15`, `v4-17`, `v4-18` (`v4-16` inchangé au pixel, non recommité). L'anneau n'est plus un arbitrage : c'est la marque du Don seul.

---

## 3.7 ⑩ — l'issue d'une carte : le libellé (« Problème : » est un contresens) et les 10 mots d'issue (2026-09-23)

Mesuré par CLIENT-2 (`5e57bc6d`, écart D10) : après résolution, ⑩ affiche « Résolu ✓ · Issue : REPAIRING » — l'enum **brut** — et le
libellé `exception_detail.bloc.issue` est servi en fr « **Problème :** ». C'est un faux ami : en français « l'issue » est le **résultat** ;
en anglais « issue » est un **problème**, et c'est ce sens qui a été traduit. La route rend `{resolved, outcome}`
(`exceptions.controller.ts:133`) ; `outcome` est le mot qu'un effet renvoie (`exceptions/effects/exception-effect.ts:19-24`).

**Le libellé** : le client écrit « Issue : » ⇒ il passe à **« Résultat : »** (clé dérivée `exception_detail.bloc.resultat`), et
`exception_detail.bloc.issue` devient orpheline, à retirer.

| clé | fr | en |
|---|---|---|
| `exception_detail.bloc.resultat` | Résultat : | Outcome: |

**Les 10 issues que ⑩ peut afficher** (lues dans les effets, back `4841d7ad`) — écrites comme un **cachet**, en capitales, sur le modèle du
seul que la maquette dessine (« EN RÉPARATION », cadre 17) :

| `outcome` | effet (fichier:ligne) | ce qui s'est passé | fr | en |
|---|---|---|---|---|
| `RESOLVED` | `one-time.handler.ts:18` | traitée une fois, sans effet | RÉGLÉ | HANDLED |
| `ESCALATED` | `escalate.handler.ts:18` | archivée pour relecture | ARCHIVÉ | ARCHIVED |
| `REPAIRING` | `repair.handler.ts:28`, `repair-immediate.handler.ts:58` | le bâtiment passe en réparation | EN RÉPARATION | UNDER REPAIR |
| `REPAIRING_SLOW` | `repair-slow.handler.ts:56` | réparation au rabais, plus longue (0,6 × le coût, 7 jours) | RÉPARATION LENTE | SLOW REPAIR |
| `BRIBE_SUCCEEDED` | `bribe.handler.ts:47` | le pot-de-vin a marché : le bâtiment repart, la chaleur baisse | ARRANGÉ | SQUARED AWAY |
| `BRIBE_FAILED` | `bribe.handler.ts:47` | l'argent est parti, le bâtiment reste touché, la chaleur monte | ÇA S'EST RETOURNÉ | IT BACKFIRED |
| `LAID_LOW` | `lay-low.handler.ts:34` | on se fait oublier ; le bâtiment reste touché | PROFIL BAS | LYING LOW |
| `TAUGHT` | `add-rule.handler.ts:39` | une règle est ajoutée au script du lieutenant | RÈGLE APPRISE | RULE LEARNED |
| `DEFERRED` | `defer-repair.handler.ts:38` | réparation remise : le bâtiment reste à l'arrêt | REMIS À PLUS TARD | PUT OFF |
| `DEMOLISHED` | `demolish-replace.handler.ts:48` | le bâtiment est rasé, l'îlot se libère | RASÉ | RAZED |

- Chaque mot reprend un mot déjà servi pour le même geste : « se retourner » (`exception.raid.bribe.projected_consequence`), « Se faire
  oublier » (`lay_low.label`), « une règle » (cadre 15), « Raser » (㉝ « Raser un site »), « Escalades archivées ». Aucun n'est accordé à
  une personne : ils disent ce qui arrive à la carte, pas au lieutenant.
- Clés proposées, sur le patron de `Libelle.ParValeur` (la clé se dérive de la VALEUR servie) : `exception_detail.outcome.<valeur en
  minuscules>` — `exception_detail.outcome.repairing`, `…bribe_succeeded`, etc. Une valeur inconnue garde le repli du client (`—`),
  jamais l'enum brut.
