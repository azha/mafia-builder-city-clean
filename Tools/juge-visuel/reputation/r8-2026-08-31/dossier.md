# Dossier du juge visuel ⊥ — ㊲ LA RÉPUTATION (`screen_b3`) — tour r8 — 2026-08-31

> ⚠️ **Ce dossier est complet et instruisable.** Aucun champ « à remplir » ne subsiste : si tu en
> trouves un, c'est un défaut du dossier et il faut le dire dans ton rapport.

## L'écran, en une phrase de produit

« Le miroir ». On y vient lire ce que son lieutenant a **absorbé** des règles qu'on lui a données —
pas ce qu'on lui a dit, ce qu'il en a retenu. L'écran est un miroir au sens propre : il montre le
joueur à travers la tenue et la posture de quelqu'un d'autre.

## ⚠️ ÉCHELLE — à lire AVANT toute mesure de taille

| | largeur en px | largeur CSS déclarée | facteur |
|---|---|---|---|
| **référence** `m-119.png` … `m-124.png` | 900 | 300 | **×3,0** |
| **capture en jeu** `…_1080x1920.png` | 1080 | 300 | **×3,6** |

⇒ **La capture est 1,2× plus grande que la référence, et c'est NORMAL.** Un bloc de 13 px CSS
mesure 39 px dans la référence et 46,8 px dans la capture. Les deux sont justes.

⇒ **Ramène toute mesure en px CSS** (diviser par 3,0 sur la référence, par 3,6 sur la capture)
avant de conclure à un écart. Un rapport qui remonte « tout est 20 % trop grand » aura mesuré
l'instrument, pas un défaut.

⚠️ **Ce que la normalisation ne couvre PAS** : les rapports INTERNES (un bloc deux fois trop haut
par rapport à son voisin, une rangée dont les tuiles sont inégales) sont invariants d'échelle et
restent des défauts réels. Ce sont eux qui comptent.

## La référence

| fichier | ce que c'est |
|---|---|
| `reference/m-120.png` | ⇐ **TA RÉFÉRENCE PRINCIPALE** — l'état VIERGE (compte neuf, 0 règle donnée, 0 absorbée), le seul état que la capture montre |
| `reference/m-119.png` | l'état « canon » (3 règles, 2 absorbées) — utile pour comprendre l'écran plein, **ne compare pas la capture à celui-là** |
| `reference/m-121.png` … `m-124.png` | les autres états (dérive, liste de règles, gages, lots) — pour l'intention d'ensemble |

Source : `/home/erutheone/project/atelier3d-mafia/generateur-reputation.py`, et le châssis commun
`/home/erutheone/project/atelier3d-mafia/chassis6.py` (⚠️ **les deux** : plusieurs classes posées
par le générateur ne sont DÉFINIES que dans le châssis — `.elast`, `.enseigne`, `.fen`, `.pann`,
`.cta6`. Chercher une règle dans le seul générateur donne une absence trompeuse).

La CSS sert à NOMMER les valeurs voulues. **L'image ratifiée fait autorité** ; si les deux
divergent, c'est l'image qui gagne et l'écart est un arbitrage, pas un défaut du client.

## Les captures en jeu

Répertoire : `/home/erutheone/project/mafia-unity-B/Assets/Screenshots/`

| fichier | résolution | rect du canvas | scaleFactor |
|---|---|---|---|
| `screen_b3_reputation_1080x1920.png` | 1080×1920 (16:9) | 1280,0 × 2275,6 | 0,8438 |
| `screen_b3_reputation_1080x2400.png` | 1080×2400 (20:9, **cible téléphone**) | 1280,0 × 2844,4 | 0,8438 |
| `screen_b3_reputation_1080x1920_t1s.png` | 1080×1920 à T+1 s | idem 16:9 | idem |

La troisième est un **contrôle de stabilité** : elle doit être identique à la première. Toute
différence est un défaut (cet écran ne porte aucune animation).

**SHA du client au moment des captures** : `35732ba` · suite PlayMode : **10/10** sur la catégorie
`ScreenB3` seule (`passed=10 failed=0 skipped=0`, filtre imprimé dans le log — un compte, pas une
absence d'échec).

⚠️ **Les captures ont été prises APRÈS ce commit et sous deux conditions vérifiées** : la pile
répondait `200` sur `/health`, et aucun autre batchmode ne tournait. C'est dit parce qu'un run
précédent, lancé pendant qu'une pile voisine redémarrait, a écrit trois captures parfaitement
valides d'apparence alors que l'écran affichait son état de repli. Une capture ne porte aucune
trace de la panne pendant laquelle elle a été prise.

⚠️ **LE CADRE A UNE HAUTEUR FIXE DE 462 px CSS, ET C'EST LA MAQUETTE QUI LE DIT** —
`reputation(cadre, H=462)`. Il ne remplit donc PAS la hauteur de l'écran : en dessous, il n'y a que
le fond. Sur la maquette, cet espace est occupé par le chrome (m-120 = 584 px CSS = 122 de chrome +
462 de cadre) ; sur la capture, il est vide parce que le chrome n'est pas monté. **Ne compte pas cet
espace sous le cadre comme un vide de mise en page** — c'est la place du dock. En revanche, tout
vide DANS le cadre est à juger normalement.

⚠️ **Les captures sont prises SANS le chrome du jeu** — le bandeau haut (ARGENT / HEAT / JOUR) que
tu vois sur la référence, et le dock du bas. C'est délibéré et documenté : monter le shell exigerait
de signer un compte partagé, ce que cette session n'a pas le droit de faire. Ne compte donc pas
l'absence du bandeau comme un écart — mais **dis explicitement ce que cette absence t'empêche de
vérifier** (par exemple : que rien ne passe sous le bandeau, que rien ne touche le dock).

## Écarts ASSUMÉS — à classer ASSUMÉ, pas à remonter comme défauts

Inventorie-les quand même et vérifie qu'ils sont rendus PROPREMENT ; ne les compte pas comme écarts.

⚠️ **Un écart assumé a un PÉRIMÈTRE, et un défaut peut en sortir.** La colonne de droite dit donc
ce qui ferait SORTIR chaque écart de l'assumé — auquel cas ce n'est plus un écart assumé, c'est un
défaut à remonter normalement. Sans cette colonne, l'assumé absorbe silencieusement des défauts
d'une autre classe : au tour précédent, « le col rendu par un triangle sommaire » avait couvert un
col qui n'était pas un triangle du tout.

| ce qu'on voit | pourquoi | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| « Salvatore » comme nom du lieutenant | le back ne projette pas `lieutenant.name` ; l'écran le DIT à l'écran (« lieutenant.name — non projeté (L0.4) ») | que la mention soit absente, illisible, ou placée ailleurs que sous le verdict |
| compteur ENFREINTES à « — » et non « 00 » | aucune clé du corps ne porte ce compte ; un « 00 » dirait « aucune enfreinte » là où la vérité est « le serveur ne le dit pas » | que le tiret n'ait pas la couleur ni la position des deux autres chiffres — le trou doit se lire comme un trou, pas comme une panne |
| le col rendu par un **triangle** plein, sans le liseré sombre du SVG | pas de primitive de chemin dans le client ; le triangle porte le signal ouvert/fermé par sa LARGEUR | **que ce ne soit pas un triangle** (un remplissage aire/boîte proche de 0,9 au lieu de ~0,43 est une autre forme, pas un triangle grossier) · qu'il ne soit pas centré sur l'axe du cou · qu'il recouvre le cou |
| 4 couleurs hors `DesignTokens` | `Encre`, `Panneau`, `Liseré`, `Vert` n'existent pas dans les tokens ; arbitrage DA escaladé à l'user, non tranché | que la couleur RENDUE s'écarte de la maquette : la dette est de code, elle ne doit avoir aucune conséquence visible |
| le reflet du miroir est FIXE, non animé | la maquette l'anime (7,5 s) mais son rendu ratifié est figé à 34,7 % de course ; cet écran est par ailleurs vérifié « aucune animation », 0 pixel différent entre T et T+1 s | qu'il soit absent, ou ailleurs que dans le tiers haut du panneau |

## Deux points où l'auteur déclare ses propres trous

Lis `angles-morts-declares.md` (même répertoire). Ce n'est **pas** un rapport de juge — il n'y en a
aucun dans ce dossier — c'est la déclaration de l'auteur sur ce que ses gardes automatiques ne
couvrent pas. Deux méritent ton attention en priorité :

1. **Les hauteurs, les vides et les rapports entre blocs.** C'est la famille de défauts que les
   gardes structurelles ne voient pas : elles vérifient que les éléments existent, dans le bon
   ordre, avec les bonnes valeurs — ce qui peut être vrai pendant que le rendu est faux.
2. **Le portrait du lieutenant.** Cinq traits (posture du buste, col, revers, montre, gants) sont
   censés correspondre à des clés de données. Leur ressemblance à la maquette n'est vérifiée par
   aucune garde.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- `Assets/Scripts` et tout le code du client : tu constates ce que tu VOIS ;
- les notes d'implémentation du chantier ;
- **les rapports de juges précédents** — il n'y en a aucun dans ce répertoire, et c'est délibéré :
  un juge qui hérite du contexte hérite des angles morts ;
- tout « choix » non écrit dans la table des écarts assumés : s'il n'y est pas, il n'existe pas.
