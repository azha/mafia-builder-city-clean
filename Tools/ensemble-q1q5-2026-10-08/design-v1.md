# ㊴ Q1 + Q5 — mini-design (CLIENT-2, 08/10/2026) — HEAD d5ff4a8b, cumul 39eae281

Source : `~/project/mafia-builder-city-clean/Tools/juge-donnees/ecran_dossier_39/cloture-2026-10-08/rapport.md` (Q1, Q5).
Sans mot inventé · ZeroRepli · N2/N3. Deux gestes DISTINCTS, indépendants à la livraison.

## Q1 — le NOM de l'avocat sur la ligne de l'acteur (CLIENT SEUL, aucun back)
Mesuré : `actors_plein.json` `actorRef` = `7abe1833-…` = `me_legal.json` `lawyerRoster[0].lawyerId` (back : `ia-projection.service.ts:274-276`,
`actorRef` d'un avocat EST son `lawyer_id`). `GET /v1/me/legal` sert `lawyerNameI18n:{key:"game.fiction.lawyer.name",params:{nom:"Maître Norwan"}}`
(+ `lawyerLabel:"Maître Norwan"`). `lawyerNameRef(null)` sert le param `nom:"unknown_lawyer"` (`fiction-names.ts:317-323`) = SENTINELLE, pas un nom.
- **Route** : `GET /v1/me/legal` ajoutée à `ForensicClient` (`GetNomsAvocats` → `Dictionary<lawyerId, nom>`), DTO LOCAL au domaine (pas de dépendance Forensic→Loi ; `RequetesEmises` compte la requête).
  Chargée dans `Charger()` APRÈS le roster, seulement si le roster contient ≥ 1 `lawyer` (sinon 0 requête de plus).
- **Nom** = `lawyerNameI18n.params.nom` (le NOM de la personne ; jamais `lawyerLabelI18n` = le TIER). Vide ou `"unknown_lawyer"` ⇒ pas de nom.
- **Rendu** (`ConstruireLigneActeur`, nœud `Reference`, `:330`) : `DossierCalculs.NomOuRef(a, noms)` = nom si `actorType=="lawyer"` ET id trouvé ET nom valide, sinon `RefAffichee` (inchangé). Même police/taille/encre (5,6 / `EncreEteinte`) : aucune géométrie touchée ; nom tronqué `…` en une ligne (`enableWordWrapping=false`, `overflowMode=Ellipsis`).
  Les `clerk` restent sur `RefAffichee` (aucune route ne les nomme : `recruitment_candidates` hors périmètre, D1).
- **Erreur** : la route des noms en erreur ⇒ replis sur les refs, SANS bandeau d'erreur ni code d'erreur écrasé (les deux erreurs existantes restent indépendantes) ; drapeau `NomsIndisponibles` pour les tests.
- **Garde** (catégorie `ScreenB7`, nom nu) : (a) rendu : l'acteur d'`actors_plein` + `me_legal` ⇒ le texte du nœud `Reference` = « Maître Norwan », ET ne contient pas « ia.actor. » ; (b) sentinelle `unknown_lawyer` ⇒ `ia.actor.7abe` ; (c) clerk ⇒ ref ; (d) route en erreur ⇒ ref ; (e) `RequetesEmises` : +1 seulement s'il y a un avocat. Contrôle négatif : mettre un id différent ⇒ ref (rougit si la jointure ignore l'id).
- **ZeroRepli** : aucune clé neuve (le nom est servi en clair, comme `lawyerLabel` dans ⑯ Loi). Rien dans `DetteDatee`.

## Q5 — nommer LE lieutenant visé par la piste du train de vie (BACK additif + CLIENT)
**État du client** : la piste `lifestyle_alarm_bucket` est une constante ÉTEINTE (`DossierCalculs.PistesConstantes`, TD-881/L1 : « pas encore sur la table », mot `—`). Un nom n'a de sens QUE sur une piste vivante ⇒ le client câble le nom sur la piste mais ne l'affiche que si la piste est vivante ET la bande ≠ `quiet`. Tant que L1 n'a pas servi la vivacité, le geste est visible seulement en test (corps imposé) : c'est dit, pas caché.
- **Back (à faire coder par f2)** : `GET /v1/me/forensic` gagne UNE clé additive `lifestyle_lieutenant_name: string | null` dans `ForensicClientProjection` (`forensic.projection.service.ts`, type du retour + `:295-349`).
  Sélection : dans l'étape 3, ajouter `lieutenant_id` au `select`, joindre `lieutenant.name` (varchar(64), `lieutenant.projection.service.ts:138-144`, « Lt. Nom ») ; la ligne retenue = ordre LEXICOGRAPHIQUE (stage `subpoena>tailing>passive>none`, puis `consecutive_flag_months`, puis `last_gap`), départage stable par `lieutenant_id`. Les bandes restent calculées comme aujourd'hui (maxima indépendants) : on n'y touche pas.
  `null` si bande `quiet`, aucune ligne, ou nom vide/`PLACEHOLDER_NOM_LIEUTENANT` (« Lieutenant » = pas un nom). Le NOM est servi, JAMAIS `lieutenant_id`, `last_gap`, `consecutive_flag_months`, `tail_ramp_stage` (mur P5 : `forensic.projection.service.ts:365-373`). Test back : type de retour (mur), les 4 cas `null`, ordre lexicographique à 2 lieutenants, un nom d'un AUTRE joueur jamais servi (scope `player_id`).
- **Client** : `GetForensicResponseDto.lifestyle_lieutenant_name` (absent ⇒ `null`, JsonUtility). Piste du train de vie, libellé `piLib` : `le train de vie d’un lieutenant` (maquette 150.88) ⇒ si nom : `le train de vie de {nom}`. Le gabarit « le train de vie de {nom} » n'existe pas en base : texte COMPOSÉ client avec `Lib("le train de vie de")` + nom servi — **clé neuve** `forensic.piste.train_de_vie_de` à lister en `DetteDatee` (ZeroRepli) + demandée à f2 pour la table (f2 la fait servir) ; repli = libellé de la maquette actuel (inchangé quand pas de nom).
- **Garde** (`ScreenB7`) : corps imposé `lifestyle_alarm_bucket:"watched"`, `lifestyle_lieutenant_name:"Lt. Marek"`, piste vivante (test) ⇒ libellé contient « Lt. Marek » ; sans nom ⇒ libellé maquette ; piste éteinte (constante) + nom servi ⇒ libellé maquette (le nom ne perce pas une piste éteinte) ; contrôle négatif : bande `quiet` + nom ⇒ maquette.
- **Mots** : un seul mot neuf, « le train de vie de » (la maquette écrit « d’un lieutenant » ; on remplace « un lieutenant » par le nom : la préposition « de » est celle de la maquette). Sans nom servi : libellé de la maquette inchangé. f2/atelier confirment la clé `forensic.piste.train_de_vie_de` (fr+en) ; tant qu'elle n'est pas servie, `DetteDatee`.

## Ordre de livraison
1. Q1 (client seul) — codable tout de suite. 2. Q5 : message à f2 (route/clé exacte ci-dessus), client câblé derrière l'absence de la clé (null ⇒ comportement actuel) : livrable AVANT le back sans régression.
Créneau unique pour les deux ; planches : ㊴ seulement (corps imposés).
