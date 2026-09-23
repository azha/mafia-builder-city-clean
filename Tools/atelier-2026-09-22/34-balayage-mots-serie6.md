# 34 — balayage complet des mots des maquettes de série 6 contre le catalogue servi

> Atelier / DA, 2026-09-23. Commande f2. Outil : `balayage-mots-serie6-2026-09-23.py` (statique, aucun rendu). Pages : la série 6 et les trois pages
> neuves à sa grammaire (⑦ ④ ㉕), atelier `5d7b6d9`. Table : `34-balayage-mots-serie6-2026-09-23.tsv` (page · cadre · écran · mot · classe · clé ou
> source), une ligne par nœud de texte visible dans le téléphone, hors chrome, hors dock et hors étiquette.

## Contrôles

```
catalogue FR : 1207 valeurs (back d8e41362) · noms de fiction : 338 · proposés connus : 180
contrôle positif (25 servis tirés du catalogue) : OK
contrôle négatif (5 chaînes inventées) : OK
contrôle réel (« écarts », cadre 137 → filiere.bloc.ecarts) : OK
```

Le contrôle négatif a servi. Au premier passage, cinq chaînes inventées sortaient « servi » : une valeur servie faite presque seulement de
`{param}` acceptait tout. Ces motifs sont exclus.

## Résultat

```
3448 mots (ponctuation exclue) — sans source 2065 · servi 620 · nombre 383 · nom de fiction 242 · fragment servi 58 · proposé 43 · identifiant brut 37
par écran (classé par « sans source » distincts) :
  ㊳              sans source   89 distincts ( 103) · servi   39 · fragment   4 · fiction   1 · proposé   0 · brut   3 · nombre   21
  ㊴              sans source   89 distincts ( 129) · servi   12 · fragment  13 · fiction   0 · proposé   0 · brut  11 · nombre   27
  ㉙              sans source   88 distincts ( 154) · servi   53 · fragment   1 · fiction  14 · proposé   0 · brut   0 · nombre    0
  ㊲              sans source   85 distincts ( 117) · servi   48 · fragment   0 · fiction   0 · proposé   0 · brut   3 · nombre   23
  ②              sans source   83 distincts ( 129) · servi   12 · fragment   3 · fiction   6 · proposé   0 · brut   0 · nombre    2
  ㉜              sans source   73 distincts ( 133) · servi    9 · fragment   4 · fiction   7 · proposé   0 · brut   0 · nombre    0
  ㉞              sans source   73 distincts ( 102) · servi   20 · fragment   4 · fiction   4 · proposé   0 · brut   0 · nombre   24
  ㊵              sans source   68 distincts (  82) · servi   26 · fragment   3 · fiction   0 · proposé   4 · brut   2 · nombre   23
  ⑮·⑰            sans source   64 distincts ( 100) · servi   20 · fragment   0 · fiction  18 · proposé   0 · brut   0 · nombre   21
  ㉛              sans source   56 distincts (  95) · servi   11 · fragment   2 · fiction  11 · proposé   0 · brut   0 · nombre    5
  ㉝              sans source   55 distincts (  82) · servi   16 · fragment   1 · fiction   4 · proposé   0 · brut   0 · nombre    8
  ㉟              sans source   54 distincts (  85) · servi   35 · fragment   0 · fiction  20 · proposé   0 · brut   0 · nombre   24
  ㉑              sans source   53 distincts (  88) · servi   45 · fragment   0 · fiction  66 · proposé   0 · brut   0 · nombre   14
  ㊱              sans source   52 distincts ( 101) · servi   42 · fragment   2 · fiction   0 · proposé   0 · brut  18 · nombre   39
  ㉔              sans source   49 distincts (  71) · servi    7 · fragment   0 · fiction   5 · proposé   0 · brut   0 · nombre   70
  ⑭              sans source   43 distincts (  79) · servi    0 · fragment   0 · fiction   0 · proposé   0 · brut   0 · nombre    8
  ㉒·⑲            sans source   41 distincts (  68) · servi    5 · fragment   0 · fiction   0 · proposé   0 · brut   0 · nombre   13
  ㉓              sans source   38 distincts (  68) · servi    0 · fragment   0 · fiction   0 · proposé   0 · brut   0 · nombre   17
  ㉚              sans source   36 distincts (  55) · servi   41 · fragment   8 · fiction   5 · proposé   0 · brut   0 · nombre   11
  ⑤              sans source   27 distincts (  47) · servi   14 · fragment   0 · fiction   0 · proposé   0 · brut   0 · nombre    4
  ⑱              sans source   26 distincts (  41) · servi    3 · fragment   0 · fiction   0 · proposé   0 · brut   0 · nombre    5
  ㉘              sans source   23 distincts (  23) · servi   50 · fragment   3 · fiction   6 · proposé   0 · brut   0 · nombre    0
  ⑯              sans source   21 distincts (  42) · servi   18 · fragment   4 · fiction   9 · proposé   0 · brut   0 · nombre    4
  ⑨              sans source   17 distincts (  20) · servi   10 · fragment   2 · fiction   6 · proposé   0 · brut   0 · nombre    0
  ⑩              sans source   12 distincts (  12) · servi    6 · fragment   0 · fiction   1 · proposé   0 · brut   0 · nombre    0
  ③              sans source   12 distincts (  30) · servi   10 · fragment   1 · fiction  55 · proposé   0 · brut   0 · nombre   18
  ㉕              sans source    3 distincts (   7) · servi    2 · fragment   1 · fiction   1 · proposé  10 · brut   0 · nombre    2
  ④              sans source    2 distincts (   2) · servi   22 · fragment   2 · fiction   0 · proposé   1 · brut   0 · nombre    0
  ⑦              sans source    0 distincts (   0) · servi   44 · fragment   0 · fiction   3 · proposé  28 · brut   0 · nombre    0
```

## Comment le lire

- **« sans source » veut dire « sans clé servie », pas « inventé ».**
  - La série 6 est ratifiée par délégation (`front.md` l.22).
  - Une bonne part de ces mots sont des mots RATIFIÉS que personne n'a encore servis : « Compris », « On vous explique encore »,
    « Portée », « Urgence »…
  - Le reste est de la prose de maquette : titres de cadre dans le téléphone, phrases de personnages, panneaux d'explication.
    Le balayage ne sait pas distinguer une note de DA posée DANS le téléphone d'un libellé.
- **Le classement** : le nombre de mots distincts sans clé servie, par écran (voir le tableau).
  - En tête : ㉙, ②, ㊲, ㉜, ㉞, ㊴, ㊵, ㊳, ⑮·⑰.
  - Ce sont les écrans neufs du 27/08, dessinés avant que le catalogue n'existe.
- **Les pages neuves** ont 0 à 3 mots sans clé : ⑦ 0 ; ④ 2, qui sont des mots ratifiés (« Portée », « Urgence ») ; ㉕ 3 distincts, tous ratifiés.
- **« proposé » est presque vide dans la série** (0 hors ⑦ ④ ㉕ ㊵) : la série 6 n'a aucun `class="prop"`, et les brouillons du back sont
  presque tous servis.
- **Les 18 cadres qui n'avaient pas d'écran à l'INDEX sont RATTACHÉS** (commande f2, `construire-dossiers.py`) :
  - 36-47 et 92-94 → ② : les matières par type, le fourneau et Ash, dont les routes sont dans `BuildingCardController` ;
  - 143 → ㊴, 144 → ㊲, 145 → ㊳ : les cadres de vocabulaire, déjà références « extras ».
  - « (aucun écran) » a disparu du tableau. ② passe à 83 mots distincts sans clé servie.
- **Retards connus retrouvés** :
  - ㉘ cadre 57 « trois ponts » (D15 : plusieurs ponts) ;
  - ㉟ « au travail » et les autres, servis depuis D14, sortent « servi ».

## Les 15 mots sans clé servie les plus répétés

| mot | occurrences |
|---|---|
| NOMINAL | 17 |
| jetons | 15 |
| CHASSE | 12 |
| vous | 12 |
| vous la faites | 12 |
| Passer | 11 |
| patrouilles | 9 |
| Régler | 8 |
| LEGERE | 8 |
| SORTI | 8 |
| vu | 8 |
| on est allés chez eux | 7 |
| rendre | 6 |
| garder · appui long | 6 |
| TENSION | 6 |
