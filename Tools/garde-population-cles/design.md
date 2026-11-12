# Garde STATIQUE de population des clés i18n — design (CLIENT-2, 12/11/2026)

**Classe visée.** ZeroRepli (PlayMode) ne voit que les états d'ARRIVÉE des écrans : une clé non servie, affichée dans un état non atteint, n'est ni en dette ni vue (« 17 clés invisibles »). **Invariant à tenir, sans rendu** : `K_client ⊆ SERVIE ∪ DetteDatee ∪ RepliVoulu`, avec `DetteDatee ∩ RepliVoulu = ∅`.

## 1. Où vit la garde — un script d'outil, pas un test
`Tools/garde-population-cles.py` (même famille que `chaines-joueur-classer.py --verifier`), **rc ≠ 0 = rouge**, ajouté à la liste « avant commit » (§5 du HANDOFF) et à celle de CLIENT-1. Raisons : (a) il n'existe aucun assembly EditMode (`Assets/Tests/` = PlayMode seul) et un PlayMode coûte la porte ; (b) `DetteDatee`/`RepliVoulu` sont `internal static` d'un assembly de test : un script les lit dans la source, la population de clés vient déjà d'un script (`cles-i18n-du-client.py`, importé comme module, jamais recopié : une seule `slug`). Le PlayMode garde son rôle (règle (2) : dette ⊆ non servie CONTRE LA PILE RÉELLE).

## 2. D'où vient « servie » sans pile
Un **instantané commité** `Tools/juge-donnees/i18n/cles-servies-<sha-back>.txt` : clés présentes dans `FR_MESSAGES` **et** `EN_MESSAGES`, ∪ `ERROR_TEXT_RATIFIED[locale]` (même définition que `sert()` de la spec §F-3 du back, 58434f68), produit par `garde-population-cles.py --instantane <string_table.ts>` à partir du `string_table.ts` du **cumul back** nommé en en-tête (SHA, date, compte déclaré). Le script relit le compte de l'en-tête et le rapproche du compte lu (un en-tête recopié faux rougit, comme la spec du back). Vieillissement assumé : une clé servie depuis l'instantané et encore en dette ne rougit pas ici (le PlayMode règle (2) la voit contre la pile) ; une clé servie, hors dette, absente de l'instantané rougit ici ⇒ on rafraîchit l'instantané. Rafraîchi à chaque gate back.

## 3. Les trois ensembles, lus
- `DetteDatee` : littéraux de la initialisation du `HashSet` (commentaires retirés par `sans_commentaires`).
- `RepliVoulu` : première chaîne de chaque `{ "clé", "raison" }`. **Il vit sur `integration/client1-2026-11-12`, pas au cumul** ⇒ ma branche part de l'intégration (ou attend son entrée au cumul) : à régler avec CLIENT-1.
- Anti-zéro : si l'un des deux ensembles lu est vide, ou si l'ancre (`DetteDatee = new`) est introuvable ⇒ rc 2 (« je n'ai rien regardé »), jamais un vert.

## 4. Les appels à premier argument NON littéral (36 mesurés sur ma pile, 38 chez f2/au tsv)
Mesure du 12/11 (`Libelle.Gabarit`/`GabaritExigeant`, 238 à littéral, 36 sans) + 60 `ParValeur`. Chaque site est **classé à la main dans une table commitée** `Tools/garde-population-cles/sites-non-litteraux.tsv` (fichier · argument · classe) :
- **SERVI_PAR_LE_BACK** : la clé vient d'un champ servi (`*_i18n_key`, `cleServie`, `refus.cle`, `outcome_i18n_key`…) : ce n'est pas une clé du client, c'est la réponse du serveur ; hors population, mais **comptée**.
- **ENUMEREE** : la clé sort d'une énumération fermée écrite dans le client (`axe.key`, `Moment` préfixe+phase, `CleDEvenement`, `ExceptionBandes`, `DossierCalculs.CleDuTitreNomme`…) : la table **liste les clés produites** et elles entrent dans `K_client`.
- **PREFIXE** : préfixe composé avec un id servi (`decision.type.`, `ParValeur`) : déjà traité comme tel par le back.
Le script **cliquette** : le nombre de sites non littéraux par fichier est épinglé ; un site neuf non classé ⇒ rouge nommé. C'est ce qui ferme la classe (un site non lu ne devient pas un zéro).

## 5. Contrôle positif / négatif (obligatoires, exécutés à chaque lancement, sur sources fabriquées)
1. Clé inventée `Libelle.De("sonde","bloc","Inventée par le contrôle")` dans un arbre temporaire, ni servie, ni en dette ⇒ **DOIT rougir** en la nommant.
2. Même clé ajoutée à `DetteDatee` fabriquée ⇒ vert ; ajoutée aussi à l'instantané fabriqué ⇒ rouge « dette périmée ».
3. Clé en commentaire ⇒ ignorée (reprise du contrôle de l'extracteur) ; site non littéral neuf ⇒ rouge.
4. Rapport : `K_client`, `servies`, `dette`, `repli voulu`, `hors des trois : N` + les noms ; **« hors des trois : 0 » n'est lu qu'avec K_client > 0 et les trois ensembles non vides**.
Mesure d'entrée (avant le code) : lancer sur le tsv du 12/11 : le back y compte 37 clés non servies (31 dette, 3 repli voulu, 3 préfixes) ; attendu côté client : écart = (dette ∪ repli ∪ préfixes) ± dérive de pile, chiffre **à mesurer**, non relayé.

## 6. Ordre de travail et limites
Page → ton oui → code (script + instantané + table des 36 sites + tests Python du script) → revue ⊥ (agent neuf). Hors périmètre : états où le client **n'affiche pas** la clé (`CleesAttenduesNonBranchees`), valeurs `Gabarit` (paramètres), et justesse du mot servi (juge-données). Le script ne remplace aucun PlayMode.

---
## 7. Livré (12/11) — ce qui diffère de la page et les trois exigences de f2
- **Appelant réel** : `typecheck-hors-porte.py --tout` lance la garde (ligne `[garde-population-cles] rc=…`, rc combiné). Second guetteur : `GardePopulationAppeleePlayModeTests` (catégorie `GardePopulation`, inscrite MafiaCI/I1, PAS ENCORE JOUÉE : porte prise) rougit si l'appel disparaît ; la garde rougit si le test, son inscription ou l'appel disparaissent. Mesuré : appel renommé ⇒ « APPELANT DISPARU », restauré par `cmp`.
- **Instantané périmé** : l'en-tête porte `back-ref`, `back-sha`, `date`, compte ; chaque lancement imprime SHA + âge, et un AVERTISSEMENT nommé si le dernier `gate/cumul-*` du back est devant (ou illisible : « fraîcheur NON vérifiée », jamais un silence). `--strict-instantane` le rend rouge. **Rafraîchit : f2, à chaque gate back — `python3 Tools/garde-population-cles.py --rafraichir`** (lit `gate/cumul-*` le plus récent du back, écrit `cles-servies-<sha8>.txt`, retire l'ancien) puis `git add`.
- **« Hors des trois » NON versés en dette** : liste classée remise à f2 (rapport), pas de DetteDatee touchée.
- La table des 38 sites est classée (22 fichiers) ; les clés ENUMEREE sont collectées par FORME dans le fichier (littéraux `a.b.c…` au domaine connu), les 20 clés de `Moment` sont explicites. Limite connue : `Libelle.ParValeur` (60 appels) et les clés composées `a." + suffixe` hors table échappent.
- Extracteur : `population(racine)` importable (la sortie de `--liste` est inchangée) ; `sorted(trouves)` rend le littéral affiché déterministe (avant : `famille.ecran.etat` ÉTAT/État changeait d'un lancement à l'autre, 3/4).
