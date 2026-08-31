# Dossier du juge visuel — ㊲ La réputation (`screen_b3`) — r1 — 2026-08-30

> ⛔ **CE DOSSIER N'EST PAS ENCORE PRÊT — mais pour une autre raison qu'au moment où ces lignes
> ont été écrites la première fois.** Les captures EXISTENT désormais (trois, produites par le
> run 13, avec leur rect imprimé) — mais elles sont **ANTÉRIEURES au correctif de mise en page**
> (commit `c4650b5`, 03:21:06) et montrent l'écran cassé : les blocs y sont empilés au centre,
> faute d'un layout sur le conteneur. **Lancer le juge dessus lui ferait remonter un défaut déjà
> corrigé** — et lui faire perdre un tour entier.
> ⇒ Il manque UNE chose : re-capturer après le correctif. Tout le reste est mesuré et à jour.

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
| `reference/m-119.png` … `m-124.png` (COPIÉES dans ce dossier) | rendus **v2**, ratifiables | 900×1752 | **×3,000** (mesuré, pas déclaré) | 300 px CSS = la largeur du téléphone |
| `~/project/atelier3d-mafia/ecrans-brennar-6.html` (section « LA RÉPUTATION », l. 5974) + `generateur-reputation.py` v2 | source HTML/CSS — aide de lecture, ne prime jamais sur l'image | — | — | — |

⛔⛔ **IDENTIFIER LES CADRES PAR LEUR ÉTIQUETTE, JAMAIS PAR LEUR NUMÉRO.** Les cadres ont été
**renumérotés** entre la v1 et la v2 : l'ancien `m-120` était « les règles données », le nouveau est
« un lieutenant neuf n'a encore rien absorbé ». Un juge qui se fierait au numéro comparerait deux
écrans différents. Les six étiquettes de la v2, dans l'ordre : `canon` (ce qu'il a pris de vous se
voit sur lui) · `vierge` · `derive` · `regles` · `gages` · `lots`.

⚠️ **Les PNG de `Tools/juge-visuel/v6/` (à la racine de ce worktree) sont la v1 — PÉRIMÉE.** Les
images de référence de ce dossier sont dans `reference/`, copiées depuis l'arbre principal et
vérifiées par empreinte : `m-119` copiée = `5d449be164e8` = la v2 source, ≠ `23831ab583c2` = la v1.
Ne pas les confondre : les trois écarts structurels que la v1 portait ont justement été corrigés
par la v2, et un juge qui lirait la v1 remonterait des défauts déjà réparés.

- **Échelle, mesurée et non recopiée** : `Tools/mesure-geometrie-reputation.py` — échelle 3,000×
  exactement, chrome du shell 120,3 px CSS, corps de l'écran 463,7 px CSS (le générateur déclare
  462), **6/6 cadres à ±6 px**, avec des comptes de frontières NON uniformes (99/74/53 · 106/114/48
  · …) qui prouvent que l'instrument discriminait au lieu de mesurer un artefact constant.
- **Polices — MESURÉ, et il n'y a PAS de substitution ici** :

      DejaVu Sans   → DejaVuSans.ttf   "DejaVu Sans"  "Book"
      DejaVu Serif  → DejaVuSerif.ttf  "DejaVu Serif" "Book"

  La maquette les demande **nommément** (`font:… 'DejaVu Sans'`), pas via les génériques — et
  `fc-match` les résout exactement. Le client embarque les mêmes : `DejaVuSans SDF` et
  `DejaVuSerif SDF` (`DesignTokens.primaryFont` / `hudSerifFont`).
  ⇒ **Contrairement au cas historique de ce dépôt** (une maquette demandait `Georgia`, la machine
  rendait `Noto Serif`, et deux juges ont classé MAJEUR un écart typographique qui n'était qu'une
  substitution système), **il n'y a ici aucun arbitrage de police à faire** : les deux côtés
  emploient la même famille. Un écart de forme des glyphes serait donc un vrai défaut, pas une
  substitution — et c'est une information que le juge doit avoir AVANT de mesurer, sans quoi il
  passera du temps à chercher un mécanisme qui n'existe pas.
  ⚠️ Pour mémoire, les génériques résolvent ailleurs sur cette machine (`sans-serif` → Noto Sans,
  `serif` → Noto Serif) : si un futur cadre de la maquette employait un générique, la substitution
  reviendrait.

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
- **Gardes anti-mensonge du test**, trois, sur trois propriétés distinctes — et la première a été
  REFAITE parce qu'elle était décorative :
    · **variété** : > 1 % des pixels doivent DIFFÉRER de la couleur dominante, et l'image porter
      > 8 teintes. ⚠️ L'ancienne version comptait les pixels « non noirs » (somme RGB > 0,15) — or
      le fond de cet écran (#0b1016) vaut **0,192** et franchissait le seuil tout seul : une image
      ne contenant QUE le fond la satisfaisait à 100 %, ce qui est exactement le cas qu'elle devait
      attraper. Vérifiée depuis dans les deux sens (capture réelle : 109 979 px hors fond,
      445 teintes → passe ; image uniformément remplie du fond → rougit).
    · **contenu propre à CET écran** : au moins un voyant construit — de la variété prouve qu'on a
      rendu *quelque chose*, pas qu'on a rendu *cet* écran-ci.
    · **prémisse de taille** : le rect du canvas et son scaleFactor sont imprimés AVANT le rendu,
      pour qu'un canvas resté à la mauvaise taille ne produise pas une image « valide » et fausse.
- **Commit du client au moment des captures** : **À REMPLIR** — les prendre APRÈS le dernier
  correctif ; une capture est une mesure DATÉE, pas une propriété du commit.

## ⚠️ LES RÉSOLUTIONS — et le fait qui décide de la lecture de TOUT écart vertical

**Aucune des deux captures n'a le ratio de la maquette.** Mesuré :

    maquette v2   300 × 583,33 CSS   ratio 1,944  (9/17.5, lu à la source)
    capture A     1080 × 1920        ratio 1,778  ← plus LARGE que la maquette
    capture B     1080 × 2400        ratio 2,222  ← plus HAUTE que la maquette

⇒ **La maquette tombe pile ENTRE les deux**, et c'est délibéré : les deux captures l'ENCADRENT.
Le juge voit donc comment l'écran se comporte des deux côtés du ratio de référence, au lieu de le
voir à un seul point qui n'est de toute façon pas celui de la maquette.

⛔ **Conséquence pour le jugement, et elle est structurelle** : une comparaison pixel à pixel de la
hauteur des blocs est IMPOSSIBLE — la zone élastique (le miroir) absorbe la différence de ratio par
construction. Un bloc plus haut en 1080×2400 qu'en 1080×1920 n'est pas un défaut, c'est la
définition d'un élastique. **Ce qui se compare, ce sont les grandeurs invariantes** : les rapports
horizontaux, les corps de texte relatifs à la largeur, l'ordre de lecture, les couleurs, les
espacements des blocs à hauteur FIXE (enseigne, compteurs, panneau, pied).

⇒ Le pourquoi de ces deux valeurs plutôt que d'autres : ce sont les **seules** employées par les
captures existantes du dépôt (mesuré : 3 occurrences chacune, aucune autre), et le projet est
configuré **portrait** (`defaultScreenOrientation: 0`, `allowedAutorotateToPortrait: 1`). Le trou
historique de ce dépôt était d'avoir tout certifié en 1280×720 **paysage** ; y ajouter une
troisième résolution de confort n'aurait pas fermé ce trou mieux que l'encadrement ci-dessus.

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

---

# ⚠️ ÉCHELLE — à lire AVANT toute mesure de taille

Sur un écran précédent (Famille), l'échelle a été **la cause de presque tous les écarts remontés**.
Elle est donc donnée ici, mesurée, et non laissée à deviner.

| | largeur en px | largeur CSS déclarée | facteur |
|---|---|---|---|
| **référence** `m-119.png` … `m-124.png` | 900 | 300 | **×3,0** |
| **capture en jeu** `screen_b3_reputation_1080x1920.png` | 1080 | 300 | **×3,6** |

⇒ **La capture est 1,2× plus grande que la référence, et c'est NORMAL.** Un bloc de 13 px CSS
mesure 39 px dans la référence et 46,8 px dans la capture. Les deux sont justes.

⇒ **Comment comparer sans se tromper** : ramener toute mesure en **px CSS** (diviser par 3,0 sur la
référence, par 3,6 sur la capture) avant de conclure à un écart. Un écart n'est réel que s'il
subsiste APRÈS cette normalisation. Un rapport qui remonte « tout est 20 % trop grand » aura mesuré
l'échelle, pas un défaut.

⚠️ **Ce que cette normalisation ne couvre PAS** : les rapports INTERNES (un bloc deux fois trop haut
par rapport à son voisin) sont invariants d'échelle et restent des défauts réels. Ce sont eux qui
comptent, et cet écran en a déjà eu deux — voir `angles-morts-declares.md`, section A3.

# Résolutions capturées

| fichier | résolution | ce qu'il montre |
|---|---|---|
| `Assets/Screenshots/screen_b3_reputation_1080x1920.png` | 1080×1920 (16:9) | l'état d'un compte neuf |
| `Assets/Screenshots/screen_b3_reputation_1080x2400.png` | 1080×2400 (20:9, cible téléphone) | le même état, format allongé |
| `Assets/Screenshots/screen_b3_reputation_1080x1920_t1s.png` | 1080×1920 à T+1 s | contrôle de stabilité : doit être identique au premier |

**Un seul état est capturé** (compte neuf : 0 règle donnée, 0 absorbée, `indeterminate`) parce que
c'est le seul que le back sait produire aujourd'hui par un chemin joueur. Les états `drifting`,
`hostile` et `wary` existent dans le code et ne sont atteints par aucun test — dette déclarée,
pas couverture (angle mort A5).

# Écarts ASSUMÉS — à classer ASSUMÉ, pas à remonter comme défauts

Le juge les inventorie quand même et vérifie qu'ils sont rendus PROPREMENT ; il ne les compte pas
comme des écarts au dossier.

| ce qu'on voit | pourquoi | statut |
|---|---|---|
| « Salvatore » comme nom du lieutenant | le back ne projette pas `lieutenant.name` — l'écran le DIT à l'écran (« lieutenant.name — non projeté (L0.4) ») plutôt que de le masquer | mesuré, assumé |
| aucune contrepartie / bloc `restraint` absent | aucune route ne liste les contreparties : `counterparty_id` n'est pas obtenable par un chemin joueur | mesuré, assumé |
| compteur ENFREINTES affichant « — » et non « 00 » | le back ne renvoie pas ce compte ; un « 00 » serait un chiffre INVENTÉ. Un tiret dit « pas de source », un zéro dirait « mesuré à zéro » | choix délibéré |
| 4 couleurs hors `DesignTokens` | `Encre`, `Panneau`, `Liseré`, `Vert` n'existent pas dans les tokens ; arbitrage DA escaladé à l'user, non tranché à ce jour | dette ouverte |

# Ce qui N'EST PAS fourni — et ne doit pas être cherché

- `Assets/Scripts` et tout le code du client : le juge constate ce qu'il VOIT ;
- les notes d'implémentation du chantier ;
- les rapports de juges précédents (celui-ci est le premier tour sur cet écran) ;
- tout « choix » non écrit dans la table ci-dessus : s'il n'y est pas, il n'existe pas.
