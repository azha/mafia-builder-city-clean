# ⑤ Les 18 clés `autonomy.*` — libellés des deux options d'un rapport d'autonomie (écran ㉔)

Atelier / DA, 2026-09-22. Émises par le back (`operational/lieutenant/autonomy/option-pairs.ts:42-66`, `label_key`), absentes des deux bundles (TD-484). Le client les affiche brutes aujourd'hui (`AutonomyInboxController.cs:338`, `option.label_key` posé tel quel — c'est la classe B de TD-649 vue sur la planche ㉔). f7 les recopie dans `string_table.ts` ; ne pas modifier le back ici.

## La maquette qui commande

- **㉔ cadre 26 « Autonomie — un message : tapez 1 ou 2 »** : `1 | CUISINER MAINTENANT | consequence minime | 2 | AFFINER D ABORD | un compromis | TAPEZ 1 OU 2`. Deux options numérotées, chacune un **verbe à l'infinitif + un complément court** (2-3 mots), suivie de sa conséquence (`projected_outcome`, hors de ce lot).
- **㉔ cadre 25 / 27** : le message qui précède — `IL A REFUSE DE CUISINER.` / `IL A REFUSE D EXPEDIER.` — l'option 1 reprend le verbe refusé (« cuisiner » → « Cuisiner maintenant », « expédier » → « Expédier maintenant »).
- **㉔ cadre 30**, note d'atelier : « LCD vert monochrome, **capitales sans accents**, softkeys, clavier … le back sert deux options — sur un burner elles deviennent « 1 » et « 2 » ». ⇒ **Les capitales sans accents sont le RENDU du burner, pas la donnée** : le bundle porte la casse et les accents normaux (« Affiner d'abord »), le client applique la transformation LCD quand il montera le burner.
- Verbes de la maison déjà posés ailleurs : « Lancer une cuisson » (㉞·85), « Envoyer un coursier » (㉞·85), « Ramasser » (㉟·109, la caisse des dealers), « Injecter » (㊵·140), « Retenir », « Laisser courir ».

## Règles appliquées

- Option A = « agir maintenant » (le geste que la délégation aurait fait) ; option B = l'alternative prudente ou différée. A porte « maintenant » quand le message dit un refus d'agir ; B dit ce qu'on fait à la place, jamais « ne rien faire » sec quand il y a un geste (garder, retenir, laisser courir).
- Pas de mot de système (« rythme », « maximum », « programmer », « conservateur ») : le lieutenant parle, on lui répond dans ses mots.
- FR et EN de même longueur (LCD à largeur fixe) ; EN au même registre parlé.

## Les 18 clés

```
autonomy.cook.now
  fr: Cuisiner maintenant
  en: Cook now
autonomy.cook.refine
  fr: Affiner d'abord
  en: Refine it first
autonomy.launder.baseline
  fr: Injecter comme d'habitude
  en: Inject as usual
autonomy.launder.safe
  fr: Injecter prudemment
  en: Inject carefully
autonomy.book.max
  fr: Tout déposer
  en: Deposit everything
autonomy.book.reserve
  fr: Garder une réserve
  en: Keep a reserve
autonomy.sec.repair
  fr: Réparer maintenant
  en: Repair now
autonomy.sec.defer
  fr: Remettre à plus tard
  en: Put it off
autonomy.log.dispatch
  fr: Expédier maintenant
  en: Send it now
autonomy.log.hold
  fr: Retenir le chargement
  en: Hold the load
autonomy.dist.collect
  fr: Ramasser maintenant
  en: Collect now
autonomy.dist.letride
  fr: Laisser courir
  en: Let it ride
autonomy.muscle.assault
  fr: Leur tomber dessus
  en: Move on them
autonomy.muscle.wait
  fr: Attendre le bon moment
  en: Wait for the right moment
autonomy.intel.observe
  fr: Les observer de près
  en: Watch them up close
autonomy.intel.wait
  fr: Ne rien faire pour l'instant
  en: Hold off for now
autonomy.facility.schedule_now
  fr: Faire l'entretien maintenant
  en: Do the upkeep now
autonomy.facility.wait
  fr: Laisser pour l'instant
  en: Leave it for now
```

## Écarts avec `PROPOSITIONS-non-ratifiees.{fr,en}.json` (et pourquoi)

| clé | brouillon | ratifié | pourquoi |
|---|---|---|---|
| `cook.refine` | Affiner le lot / Refine the batch | Affiner d'abord / Refine it first | le cadre 26 dessine « AFFINER D ABORD » ; « lot » est un mot de dépôt |
| `launder.baseline` | Injecter au rythme habituel / at the usual rate | Injecter comme d'habitude / as usual | « rythme »/« rate » est le mot du système |
| `book.max` | Déposer le maximum / Deposit the maximum | Tout déposer / Deposit everything | « maximum » est une borne de système ; le comptable dit « tout » |
| `sec.defer` | Repousser / Put it off | Remettre à plus tard / Put it off | « repousser » seul se lit « repousser une attaque » sur une ligne LCD |
| `log.dispatch` | Expédier maintenant / Dispatch now | idem / Send it now | l'EN parlé ; « dispatch » est le mot du registre de police (㉔·32) |
| `dist.collect` | Collecter maintenant / Collect now | Ramasser maintenant / Collect now | « ramasser » est le verbe de la caisse des dealers (㉟·109) ; « collecter » est celui du bâtiment (HUD) |
| `muscle.assault` | Passer à l’action / Move on them | Leur tomber dessus / Move on them | le gros bras ne « passe pas à l'action », il leur tombe dessus |
| `muscle.wait` | Attendre un meilleur moment / a better moment | Attendre le bon moment / the right moment | idiomatique |
| `intel.observe` | Observer de près | Les observer de près | l'objet manquait |
| `facility.schedule_now` | Programmer maintenant / Schedule it now | Faire l'entretien maintenant / Do the upkeep now | « programmer » est le mot du système ; l'intendant fait l'entretien (fiche ② « Entretien ») |

Les 8 autres sont reprises telles quelles.

## Hors lot, vu en passant (pour ④)

Les conséquences que le client écrit lui-même (`AutonomyInboxController.cs:372-375` : « [~] Minimal · [<>] Arbitrage · [!] Exposition accrue · [$] Coût d'opportunité ») ne sont pas celles du cadre 26 (« consequence minime », « un compromis »). Proposé dans ④, écran ㉔.
