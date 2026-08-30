# Dossier du juge visuel — ㊲ La réputation (`screen_b3`) — r1 — 2026-08-30

> ⛔ **CE DOSSIER N'EST PAS COMPLET ET NE DOIT PAS ÊTRE LANCÉ EN L'ÉTAT.** Les captures en jeu
> n'existent pas encore : le PlayMode est gelé tant qu'un plancher E2E occupe la machine, et le
> test qui les produit n'a jamais tourné. Les lignes marquées **À REMPLIR** sont les seules qui
> manquent ; tout le reste est mesuré. Un juge lancé maintenant jugerait des images absentes.

## L'écran

- **Nom** : ㊲ La réputation — « le miroir »
- **Ce qu'on vient y faire** : voir un de vos lieutenants — son attitude envers vous, et ce qu'il
  a **absorbé** de vos propres règles de maison. Puis en déclarer une nouvelle.
- **Chemin joueur pour y arriver** : signup → `session/open` → l'écran est monté comme locataire
  avec un `lieutenant_id` du kit de départ (mesuré : un compte frais possède déjà 2 lieutenants,
  aucune route de recrutement n'est nécessaire).
- **États capturés** : **À REMPLIR** — prévu : l'état du compte frais (aucune règle déclarée,
  lieutenant vierge, `consistency_cue = indeterminate`). C'est l'état que TOUT joueur rencontre en
  premier, donc celui qui doit être juste avant les autres.

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `~/project/mafia-builder-city-clean/Tools/juge-visuel/v6/m-119.png` … `m-124.png` | rendus **v2**, ratifiables | 900×1752 | **×3,000** (mesuré, pas déclaré) | 300 px CSS = la largeur du téléphone |
| `~/project/atelier3d-mafia/ecrans-brennar-6.html` (section « LA RÉPUTATION », l. 5974) + `generateur-reputation.py` v2 | source HTML/CSS — aide de lecture, ne prime jamais sur l'image | — | — | — |

⛔⛔ **IDENTIFIER LES CADRES PAR LEUR ÉTIQUETTE, JAMAIS PAR LEUR NUMÉRO.** Les cadres ont été
**renumérotés** entre la v1 et la v2 : l'ancien `m-120` était « les règles données », le nouveau est
« un lieutenant neuf n'a encore rien absorbé ». Un juge qui se fierait au numéro comparerait deux
écrans différents. Les six étiquettes de la v2, dans l'ordre : `canon` (ce qu'il a pris de vous se
voit sur lui) · `vierge` · `derive` · `regles` · `gages` · `lots`.

⚠️ **Les PNG de CE worktree (`Tools/juge-visuel/v6/`) sont la v1 — périmée.** La v2 vit dans
l'arbre principal, chemin ci-dessus. Ne pas les confondre : les trois écarts structurels que la v1
portait ont justement été corrigés par la v2.

- **Échelle, mesurée et non recopiée** : `Tools/mesure-geometrie-reputation.py` — échelle 3,000×
  exactement, chrome du shell 120,3 px CSS, corps de l'écran 463,7 px CSS (le générateur déclare
  462), **6/6 cadres à ±6 px**, avec des comptes de frontières NON uniformes (99/74/53 · 106/114/48
  · …) qui prouvent que l'instrument discriminait au lieu de mesurer un artefact constant.
- **Polices — ce qui a RÉELLEMENT rendu** : **À REMPLIR** (`fc-match` sur la machine du rendu, pour
  chaque `font-family` de la CSS : `DejaVu Sans` et `DejaVu Serif` sont demandées nommément par le
  générateur). Le client embarque **DejaVu Sans SDF** et **DejaVu Serif SDF**
  (`DesignTokens.primaryFont` / `hudSerifFont`). ⇒ Un écart de FAMILLE de police est un
  **arbitrage**, jamais un défaut du client.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| `Assets/Screenshots/screen_b3_reputation_1080x1920.png` | 1080×1920 | **À REMPLIR** (ligne `[CAPTURE b3]` du log) | compte frais | `B3C1_CapturerPourLeJugeVisuel_DeuxResolutions` |
| `Assets/Screenshots/screen_b3_reputation_1080x2400.png` | 1080×2400 | **À REMPLIR** | compte frais | idem |
| `Assets/Screenshots/screen_b3_reputation_1080x1920_t1s.png` | 1080×1920, **T+1 s** | **À REMPLIR** | compte frais | idem |

- **La paire T / T+1 s est là pour la règle « aucune animation »** : comparer les deux et exiger
  **0 pixel différent**. ⚠️ La maquette, elle, ANIME (`.veille6` pulse une luminosité,
  `.elast::after` fait descendre une ligne de scan toutes les 7,5 s) — ne pas les avoir portées est
  une **décision conforme au ruling du 2026-08-27**, pas un oubli. Vérifié côté code : zéro
  `Update`, `Time.time`, `Mathf.Sin`, `Animator` ou `InvokeRepeating` dans les 5 fichiers de
  l'écran (balayage avec contrôle positif — `void` sort 29, donc le motif mord).
- **Gardes anti-mensonge du test**, deux, sur deux propriétés distinctes : ≥ 2,5 % de pixels non
  noirs (une cible noire produit un PNG valide et vide) **et** au moins un voyant construit (des
  pixels clairs prouvent qu'on a rendu *quelque chose*, pas qu'on a rendu *cet* écran).
- **Commit du client au moment des captures** : **À REMPLIR** — les prendre APRÈS le dernier
  correctif ; une capture est une mesure DATÉE, pas une propriété du commit.

## Règles de doctrine applicables

- **portrait seul** — le projet est configuré portrait ; juger les deux résolutions, pas une.
- **aucune animation sur un écran neuf** (ruling 2026-08-27) — d'où la paire T / T+1 s.
- **langue affichée : français**, via résolveurs nommés — aucun enum brut à l'écran.
  ⚠️ **UNE EXCEPTION VOULUE, ET ELLE EST LE SUJET** : les `rule_id` sont affichés **en clair**
  (`rule.no_families`…). Aucun libellé n'existe — le bundle i18n mesuré rend 67 clés, 63 `error.*`
  et 4 `game.*`, zéro pour ce domaine — et l'identifiant est **écrit par le joueur lui-même**.
  Fabriquer un libellé côté client inventerait du contenu que le serveur ignore. **Le trou se
  montre, il ne se masque pas.**
- **contraste** : ≥ 3:1 grands textes, ≥ 4,5:1 petits, mesuré sur le fond RÉEL.
- **gouttière** : le contenu reste dans le rect du fond ; seul le chrome traverse.

## Écarts ASSUMÉS (à inventorier, classer ASSUMÉ, et vérifier « rendus proprement »)

| écart | raison mesurée | source |
|---|---|---|
| **ni bandeau haut ni dock** sur les captures | le locataire est capturé SEUL : monter `AppShell` ferait signer le compte de démo partagé avec les fixtures d'autres sessions (incident du 21 août — 59/59 → 0/59 sans changement de code) | contrat `IShellTenant` hors shell |
| le nom « Salvatore » absent — l'écran écrit `lieutenant.name — non projeté (L0.4)` | `lieutenant.name` existe en base (varchar 64 NOT NULL) et n'est dans AUCUNE des 2 projections joueur mesurées (5 clés et 17 clés) | juge-données ⊥ 2026-08-30, É7 |
| compteur **ENFREINTES à « — »** et non « 00 » | aucune clé du corps ne le porte ; la donnée est en base (`boss_mirror_violation_ring.violation_slots[]`), jamais projetée. Un « 00 » dirait « aucune enfreinte » là où la vérité est « le serveur ne le dit pas » | É6, forme F, lot back S13-k |
| liserés des règles **neutres** là où la maquette les colore vert/ambre | rien ne dit QUELLE règle est enfreinte ; colorer inventerait l'information la plus lourde de l'écran | É6 |
| **aucun bouton « retirer une règle »** | `retractRule` n'a qu'un appelant, de test — zéro en production | É9 |
| section `restraint` (gages, règlements) **absente** | omise du corps sans `counterparty_id`, et aucune route ne liste les contreparties | É4 / Q1, lot back L5 |
| **le col est un rectangle étroit** là où la maquette dessine un triangle | simplification volontaire : l'état ouvert/fermé se lit à la LARGEUR ; pas de primitive triangulaire disponible | décision de construction, consignée |
| 4 couleurs **locales** au lieu de jetons canon (`--encre`, `--panneau`, `--lisere`, `--vert`) | absentes de `DesignTokens.asset` ; les ajouter ferait rougir le pont de palette (bijection stricte 74=74) et exige un arbitrage DA remonté à l'user | mesuré sur l'asset sérialisé, 3 contrôles positifs |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier et les commits ;
- le rapport du **juge-données** ⊥ (`Tools/juge-donnees/reputation/maquette-2026-08-30/`) — il
  juge l'information, pas les pixels ; les écarts qu'il a trouvés sont déjà refondus dans la v2 de
  la maquette et dans la table ci-dessus ;
- toute capture « avant » — sauf la paire T / T+1 s listée plus haut, où **une seule variable
  change** (le temps).
