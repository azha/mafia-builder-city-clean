# Dossier ④ (Accueil / « LA SUITE ») — r1 — 2026-09-26 — RECONSTITUÉ PAR LE JUGE

> ⚠️ Aucun `dossier.md` ne m'a été fourni. Le skill le fait remplir par l'orchestrateur ; ici je
> l'ai reconstitué moi-même, et **ce fichier dit exactement ce que j'ai établi et ce que j'ai dû
> supposer**. Chaque ligne « supposé » est reportée dans la section 6 du rapport.

## Comment j'ai identifié la référence (et ce que j'ai retenu)

L'`INDEX.md` du client (généré le 2026-09-22, SHA atelier `ec4c09a`) écrit pour ④ :
`Home Dashboard screen_1 | DashboardController | dossier accueil | **aucune maquette de série 4/6**
| référence — | confiance **aucune**`. Pris au mot, il n'y a pas de référence.

**C'est vrai de la série 4/6 et faux du corpus.** La maquette de ④ vit sur une page à part,
`~/project/atelier3d-mafia/ecrans-brennar-accueil.html`, postérieure à l'INDEX. Les commits de
l'atelier la nomment explicitement (`rtk proxy git log`, dépôt `~/project/atelier3d-mafia`) :

    0021d5a  2026-09-26  ④ cadre 4 PROPOSÉ : un joueur neuf sans carte de tête — « la suite »
                         (labo sans Pyralin → Commander ; personne ne vend → Voir la vente ;
                         aucune consigne → Écrire une règle) au-dessus de la file
    d4b0379  2026-09-26  ④ cadre 4 : une </div> de trop fermait l'écran et coupait les étiquettes
                         du dock — corrigée ; rendu relu 05:49:56
    d196e8a  2026-09-26  ④ cadre 1 : l'ÉTAT CIBLE de la branche A
    ac9b54a  2026-09-26  ④ cadres 1 et 2 : la conséquence de chaque option, PROPOSÉE

`git show --stat` sur `0021d5a` et `d4b0379` : **un seul fichier touché, `ecrans-brennar-accueil.html`.**
C'est donc bien la page de ④, désignée par les documents et pas par un nom deviné.

Les 5 étiquettes de la page (relevées par script, pas de mémoire) :

    0  ④ L'ouverture — rien à trancher
    1  ④ L'ouverture — une carte de tête · état cible, HL chunk 3 ; …
    2  ④ L'ouverture — des rapports à lire (l'entrée du rapport)
    3  ④ L'ouverture — la file sous pression
    4  ④ L'ouverture — un joueur neuf, sans carte de tête : la suite (PROPOSÉ)

⇒ **Référence nominale retenue : le cadre 4.** C'est le seul qui porte « LA SUITE », et c'est
l'homologue exact de la capture : compte NEUF (`journal.tsv` P0 : « compte neuf sha256:a9f313c3 »,
P1 : « jour=1 »), donc *un joueur neuf sans carte de tête*. Les cadres 0 et 3 servent de témoins
secondaires (chrome, dock, carte de file, vocabulaire de couleur des états).

Aucune référence n'existait dans `Tools/juge-visuel/accueil/` : **je les ai rendues moi-même**
(`mesures/rendre-reference-04.py`), avec la discipline de `rendre-references-dues.py` — index
APPARIÉ À SON ÉTIQUETTE avant tout rendu, machine vérifiée libre (0 conteneur `mcc-e2e-`, porte
Unity LIBRE, 0 Unity batchmode), taille relue sur le fichier écrit. Les 5 cadres sortent en
1080×2102, 37 à 48 % de pixels non noirs.

## Référence

| fichier | rôle | taille | facteur |
|---|---|---|---|
| `reference/cadre-4-la-suite.png` | **nominal** (cadre 4) | 1080×2102 | 300 px CSS × **3,6** |
| `reference/cadre-0-rien-a-trancher.png` | témoin chrome + dock | 1080×2102 | ×3,6 |
| `reference/cadre-1…`, `cadre-2…`, `cadre-3-file-sous-pression.png` | témoins d'état | 1080×2102 | ×3,6 |

⚠️ **Les soulignés POINTILLÉS de la référence sont la marque « PROPOSÉ » de l'atelier** (signalé par
l'orchestrateur). Ils ne sont pas un élément à reproduire, et ils **gonflent toute bbox de texte**
de la référence : mes hauteurs de capitale sont mesurées par blocs d'encre CONTIGUS
(`m22`, `m23`) qui les séparent explicitement — la preuve est collée dans `sortie-m22.txt`.

## Polices (`fc-match` sur cette machine, la machine du rendu)

    pile CSS de la maquette                     fc-match
    "DejaVu Sans", sans-serif                → DejaVu Sans (Book)     ← PAS de substitution
    Georgia, "Times New Roman", serif        → Noto Serif (Regular)   ← SUBSTITUTION

⇒ La face **sans** de la référence est celle que le client embarque : les écarts de chasse sur les
textes sans-sérif ne sont **pas** un arbitrage de police. La face **sérif** de la référence est une
substitution (Georgia n'est pas installée) : l'écart de FAMILLE sérif est un arbitrage — mais après
normalisation par la hauteur de capitale la chasse du titre sérif tombe **exacte** (473 px contre
473, cf. contrôle positif #9), donc il n'y a rien à arbitrer en pratique.

## Captures en jeu

| fichier | résolution | md5 |
|---|---|---|
| `captures/p1_lancement_1080x1920.png` | 1080×1920 (9:16) | `c156517b6ce18244c1f53ab3ef3fd9e4` |
| `captures/p1_lancement_1080x2400.png` | 1080×2400 (9:20) | `0fb3113f44ec1509ded478a93d3ad2b9` |

Client `mafia-builder-city-clean` @ `b7fb8a8d`, pile dev back `1ffb08b4`, compte neuf
`sha256:a9f313c3`. Journal du parcours recopié en `captures/journal.tsv`.
État capturé : **un seul** — jour 1, Aube, COLD, 10 000 €, 1 carte dans la file.

## ÉCHELLE — les trois nombres

| | px de l'image | largeur CSS | facteur |
|---|---|---|---|
| RÉFÉRENCE | **1080** | 300 | ×3,6 |
| CAPTURES | **1080** | — (natif) | — |
| | | **rapport capture ÷ référence** | **1,000** |

⇒ **Les trois images font 1080 px de large.** Toute mesure HORIZONTALE et toute mesure de TAILLE
(hauteur de capitale, diamètre, largeur d'un objet) est donc **directement comparable en px**, sans
normalisation. C'est le cas le plus favorable, et je m'en sers partout.

⇒ **Ce que ça ne couvre PAS** : les rapports d'aspect diffèrent (réf 9:17,5 · jeu 9:16 et 9:20).
Les **positions verticales** ne sont donc jamais comparées en px bruts : je les donne soit en
distance depuis le HAUT (pour le chrome, ancré en haut — et le fait que les deux captures rendent
les mêmes y le confirme), soit en pourcentage du parent.

## Ce qui N'A PAS été fourni (et que je n'ai pas cherché)

Le code du client, les notes d'implémentation, tout rapport de juge antérieur, toute capture
« avant ». Aucun n'a été ouvert.

## Écarts ASSUMÉS

**Aucun n'a été déclaré** — il n'y a pas de dossier, donc pas de table d'écarts assumés, donc
pas de `juge-donnees` en mode maquette. Conséquence directe : **je ne peux classer AUCUN écart en
ASSUMÉ**, y compris ceux qui le sont peut-être (le fond, la 3ᵉ suggestion, l'état « LÉGÈRE »). Ils
partent en findings avec la mention explicite « non déclaré assumé » dans la dernière colonne.
