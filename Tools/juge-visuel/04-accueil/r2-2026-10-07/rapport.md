# Juge visuel ⊥ — ④ Accueil / « LA SUITE » — r2 — 2026-10-07

## Verdict : **NON APPROUVÉ**

**Le tour ne peut pas être tenu : il n'existe aucune capture de ④ postérieure au lot qu'il devait
juger.** Ce n'est pas un verdict sur l'écran — c'est le constat, mesuré, que les deux côtés de la
comparaison manquaient : la capture désignée par le mandat n'existe pas, la plus récente qui existe
est **antérieure de 47 minutes** au lot ④ groupe A, et la référence du r1 était elle aussi périmée.
Je n'ai donc **rien pu confirmer ni infirmer** des 19 écarts du r1. Je ne classe aucun écart visuel
neuf : je n'ai pas d'image à charger.

> ⚠️ À lire comme « non jugeable », pas comme « l'écran est faux ». Rien dans ce rapport ne dit que
> le lot ④ groupe A a échoué. Rien ne dit non plus qu'il a réussi. **Un juge qui rendrait un verdict
> sur la capture disponible re-mesurerait exactement le monde du r1** — ce que le protocole interdit
> (`SKILL.md` §0 : « Jamais deux juges d'affilée sans correctif entre les deux »).

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sans cette section le rapport n'est pas recevable. Chaque ligne est produite par un script de
`mesures/`, qui imprime la taille de chaque image qu'il ouvre.

| # | grandeur | valeur | script |
|---|---|---|---|
| 1 | largeur de la capture r1 1920 | 1080 px | `m1` |
| 2 | largeur de la capture r1 2400 | 1080 px | `m1` |
| 3 | largeur de la capture 072418 1920 | 1080 px | `m1` |
| 4 | largeur de la référence cadre 4 | 1080 px | `m1` |
| 5 | taille de la référence r1 et de la référence r2 | **1080×2102 = 1080×2102** | `m3` |
| 6 | les 5 cadres re-rendus aujourd'hui | tous **1080×2102**, « non rogné » | `sortie-rendre-reference.txt` |
| 7 | appariement index ↔ étiquette, cadres 0,1,2,3 | **4/4 OK** sur la page de l'atelier | `sortie-rendre-reference.txt` |
| 8 | bande sous le filet, réf r1 vs réf r2 (hors médaillon) | écart-type **5,78 = 5,78**, luminance **20,26 = 20,26** | `m2 / T2` |
| 9 | sonde cyan, captures 1920 et 2400 du même run | **425 = 425** (même scène aux deux résolutions) | `m2 / T1` |
| 10 | bande du cadre « art/diorama », réf r1 vs réf r2 | **2,1 %** de pixels différents — la bande la plus stable des 8 | `m3` |
| 11 | balayage exhaustif `p1_lancement*` sur `/home/erutheone` | contrôle positif **1**, contrôle négatif **0** | `sweep` (§1) |

---

## 1. Ce qui manque, mesuré

### 1a. La capture désignée par le mandat n'existe pas

Le mandat désigne
`/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/6d4cf56c-…/scratchpad/parcours-9/x/`.
Ce répertoire de session n'existe pas ; les deux seules sessions présentes sous ce préfixe sont
`146c6dd1-…` et `9aefe3f7-…`, et aucune ne contient de `parcours-9`.

### 1b. Balayage exhaustif — 12 fichiers, aucun postérieur au 26/09 10:09

Premier balayage lu **à 0** — et **je l'ai accusé à tort d'être cassé**, alors qu'il n'avait
simplement **pas fini de tourner** : lu après complétion, il rend **12 lignes**, contrôle positif
**1**, négatif **0**, identiques au balayage par `rtk proxy`. *Un zéro lu sur un instrument encore
en vol n'est pas un zéro mesuré* — la faute est à moi, pas à l'outil, et elle allait dans le sens
qui m'arrangeait (elle confortait « rien n'existe »). Deuxième essai écrit par redirection : le
fichier contenait la sortie **décorée** du proxy (en-tête `6F 3D:`, chemins élidés
`...s/juge-visuel/…`) — le piège de redirection du socle, celui-là bien réel. Troisième essai, via
`rtk proxy`, avec contrôles :

```
rtk proxy find /home/erutheone -name "p1_lancement*" -type f   → 12 lignes
contrôle POSITIF  grep -cF "20260926-072418/p1_lancement_1080x1920.png"  → 1
contrôle NÉGATIF  grep -cF "zzz-inexistant"                              → 0
```

Les 12 fichiers sont **6 images distinctes**, répliquées par git dans 3 worktrees :

| image | mtime | taille |
|---|---|---|
| `cliche-parcours/20260926-030001/p1_…1920` | 2026-09-26 **05:00:05** | 188 194 |
| `cliche-parcours/20260926-044215/p1_…1920` | 2026-09-26 **06:42:19** | 189 370 |
| `cliche-parcours/20260926-072418/p1_…1920` | 2026-09-26 **09:24:20** | 855 244 |
| `r1-2026-09-26/captures/p1_…1920` | 2026-09-26 **10:09:11** | 796 124 |
| (+ les homologues 2400 des mêmes runs) | | |

Il n'existe **qu'un seul** arbre `cliche-parcours` sur la machine
(`/home/erutheone/project/mafia-unity-F/Logs/cliche-parcours`, balayage sans borne de profondeur),
et son dernier run est du **26/09**. Aucun PNG > 100 ko postérieur au 26/09 11:00 dans les 7
worktrees Unity ne ressemble à une capture de ④.

### 1c. La chronologie place toutes les captures AVANT le lot

Branche du client `gate/cumul-client-2026-09-22`, tip **`dea56042`** (07/10 19:14).

| commit | date | objet |
|---|---|---|
| capture la plus récente | 26/09 **10:09:11** | — |
| **`d91447bb`** | 26/09 **10:56:25** | ④ juge ⊥ r1, **groupe A** (ancêtre du tip : vérifié) |
| `1c9de9cb` | 26/09 10:58 | `LocatairesEtInsets` / `DashboardController` |
| **`c8468bca`** | 26/09 **11:01** | **④ le diorama de NUIT toujours** + garde « fond nu aux bords » |
| … ~25 commits | 07/10 18:33 → 19:14 | lot CLIENT-2 (canvas racine partagé, collecte, ⑥, horloge légère…) |

⇒ La capture la plus récente précède le lot ④ groupe A de **47 min**, le diorama de nuit de
**52 min**, et l'ensemble du lot du 07/10 de **11 jours**.

### 1d. Et ce n'est pas qu'une affaire d'horodatage — le contenu le dit

Deux sondes indépendantes, posées sur des propriétés que `dossier.md` déclare **corrigées** :

| sonde | ce qu'elle lit | capture r1 (10:09) | référence courante | lecture |
|---|---|---|---|---|
| **T2** bande sous le filet, hors médaillon (`x<300` ∪ `x>780`, `y150..230`) | un aplat rend un écart-type ~0 | **écart-type 0,00**, luminance **13,00** | écart-type 5,78 | la **bande plate** de `F1` est **encore là** |
| **S2** encre de « LÉGÈRE » | cyan ⇒ `R−B < 0` | RGB **(64,7 ; 219,0 ; 187,2)**, **R−B = −122,5** | RGB (138,8 ; 128,8 ; 112,6), **R−B = +26,2** | `F17` (gris chaud) **non appliqué** |

Et à l'œil, sur la même capture : fond = **carte vectorielle**, pas le diorama peint (`F3`) ;
pilule du CTA en **aplat**, pas en dégradé (`F9`) ; **aucune pastille or** sur FAMILLE (`F7`).

La capture `072418` (09:24) est un état **encore plus ancien** : « JOUR 48 / Plein jour » (compte
mûr, pas neuf) et 3ᵉ suggestion « **ÉCRIRE UNE RÈGLE** » — l'état d'avant la décision planque.

### 1e. La référence du r1 était périmée elle aussi

Les 5 PNG de `r1-2026-09-26/reference/` ont été rendus à **10:08:12 → 10:08:16**. Or la page de
l'atelier a changé **quatre fois après** :

| commit atelier | heure | ce qu'il pose |
|---|---|---|
| `23a9fb5` | 10:38 | cadre 4 : ordre réel A·B·**E planque**, gravité « légère » en **gris chaud** |
| `8c57aeb` | 10:38 | cadre 2 : « modérée » en gris chaud |
| `8992bdc` | 10:49 | **chrome commun aligné HUD v3.1** (filet pleine largeur, losange, dock 35 px) |
| `b7d8c1a` | 10:50 | **volutes** (.28) et médaillon au-dessus du filet |

⇒ Le cadre 4 du r1 montre « **ÉCRIRE UNE RÈGLE** », « **GRAVE** », et **ni filet pleine largeur, ni
losange, ni volutes** — c'est-à-dire exactement ce que `dossier.md` déclare être la référence qui
fait foi. Mesure : **11,3 %** des pixels diffèrent entre le cadre 4 du r1 et celui re-rendu
aujourd'hui (`m3`, seuil 16/255).

> ⚠️ Honnêteté sur ce 11,3 % : mon contrôle négatif attendait la bande « titre LA SUITE » proche —
> elle rend **22,9 %**. Le panneau a donc aussi **glissé verticalement** entre les deux rendus. Le
> 11,3 % mélange donc changement de contenu et décalage géométrique ; **il ne faut pas le lire comme
> « 11,3 % de contenu neuf »**. Ce qui est certain est qualitatif et visible : libellé du 3ᵉ CTA,
> mot de gravité, chrome.

---

## 2. Ce que j'ai produit (utilisable tel quel au r3)

`reference/` — les **5 cadres re-rendus aujourd'hui** depuis l'atelier `master @ b7d8c1a`, échelle
`3.6` (300 px CSS → 1080), **1080×2102**, tous « non rogné », pixels non noirs 37 à 48 %.

Le garde-fou du script a mordu, et c'est une information : l'étiquette attendue par le r1 pour le
cadre 4 (« …sans carte de tête : la suite (PROPOSÉ) ») **n'existe plus** dans la page ; elle est
devenue « ④ L'ouverture — un joueur neuf, **planque non vide** : la suite, ordre réel A · B|C · E ·
D pl… ». J'ai apparié par **préfixe** et consigné les deux libellés dans `mesures/`. ⇒ **Le cadre 4
de l'atelier est bien à l'état post-décision planque.**

---

## 3. Écarts

**Aucun écart visuel n'est rendu ce tour** — faute de capture jugeable. Les seuls constats sont des
écarts de **dispositif**, et ils sont bloquants pour la tenue du tour :

| # | partie | classe | réf | jeu | delta | script | note |
|---|---|---|---|---|---|---|---|
| D1 | capture du tour | **BLOQUANT** | une capture postérieure à `d91447bb` / `c8468bca` | la plus récente date du **26/09 10:09** | **−47 min** avant le lot ; **−11 j** avant le tip | §1b, §1c | le chemin du mandat n'existe pas ; 12 fichiers balayés, contrôles 1/0 |
| D2 | état de la capture | **BLOQUANT** | `F1` et `F17` fermés | bande plate **écart-type 0,00** ; « LÉGÈRE » **R−B = −122,5** | — | `m2 T2`, `m1 S2` | preuve **par le contenu**, indépendante de l'horodatage |
| D3 | référence du r1 | **MAJEUR** | cadre 4 post-`b7d8c1a` | rendu à **10:08**, avant les 4 commits | **11,3 %** de pixels | `m3` | **fermé par ce tour** : `reference/` re-rendu |
| D4 | sonde T1 (cyan global) | **MINEUR** | — | contrôle positif **KO sur 3/6** images ; **425 partout** ; réf > captures | — | `m2 T1` | **réfutée par ses propres contrôles, écartée** — conservée ici pour que personne ne la reprenne |

---

## 4. Lecture globale

Je n'ai pas pu la faire : elle exige une capture de l'écran tel qu'il est aujourd'hui.

Ce que je peux dire de la **référence** que j'ai rendue, et c'est la grille du prochain juge : ④ est
un écran de **reprise en main**. L'œil tombe d'abord sur le panneau sombre « LA SUITE » qui occupe
le tiers bas, puis sur l'unique pilule **or lustrée** (COMMANDER) — le seul objet saturé de l'image,
et le seul appel à l'action de rang 1 ; les deux autres CTA sont des contours sobres, hiérarchie
voulue. Au-dessus, le **diorama peint de nuit** monte **jusqu'au filet** sans bande morte. En bas, la
carte de file (« Lt. Ilm attend vos ordres / LÉGÈRE » en **gris chaud**, TRANCHER en or) puis le
dock à 4 pastilles. Traits d'identité : (1) le diorama peint de nuit plein cadre, (2) l'**or
unique** en une seule pilule lustrée, (3) le crème chaud de tous les textes secondaires, (4) le
chrome HUD v3.1 — filet laiton pleine largeur **derrière** le médaillon, losange, volutes.

---

## 5. Autres résolutions

Les deux résolutions demandées (1080×1920 et 1080×2400) **existent** dans le jeu de captures
disponible — mais toutes deux dans l'état d'avant le lot (§1d ; la sonde cyan rend **425 = 425** aux
deux, c'est la même scène). **Aucune des deux n'est jugeable** ce tour. La référence, elle, est
rendue à une seule géométrie (1080×2102) — c'est le gabarit, pas une résolution cible.

---

## 6. Non vérifié

1. **Les 19 écarts du r1 — tous.** Je ne peux dire d'aucun s'il est fermé, s'il reste, ou s'il a
   régressé. Mesure qui trancherait : **une capture de `p1_lancement` sur le tip `dea56042`**, aux
   deux résolutions, compte neuf, après lecture de LA SUITE.
   - *Déclarés ASSUMÉS par arbitrage* (`dossier.md`) et donc hors correctif : `F2` filet, `F5` typo
     du bandeau, `F6` dock, `F11` losange, `F14` médaillon ; `F4` n'est **pas** un écart (volute) ;
     `F19` « le jeu a raison » (ligne planque).
   - *Déclarés corrigés par le lot CLIENT-1* et donc **à vérifier au r3** : `F1`, `F3`, `F7`, `F8`,
     `F9`, `F10`, `F12`, `F13`, `F15`, `F16`, `F17`, `F18` — **12 écarts**. Je n'en ai confirmé
     **aucun** ; j'ai au contraire mesuré `F1` et `F17` **encore ouverts dans la seule capture
     disponible**, ce qui est attendu puisqu'elle précède le correctif, et ne dit rien de l'état
     actuel.
2. **L'effet des ~25 commits du 07/10** sur ④ (canvas racine partagé, horloge légère, collecte).
   Plusieurs touchent le shell qui porte ④. Non mesuré, faute de capture.
3. **La bonne application des arbitrages de chrome** (filet, losange, médaillon, dock, volutes) dans
   le jeu : le mandat demandait de juger s'ils sont *bien appliqués*. Non mesurable sans capture.
4. **Les polices.** `fc-match` non lancé ce tour : sans capture à comparer, l'arbitrage
   Georgia→Noto / DejaVu n'a pas d'objet.
5. **Le 11,3 % de dérive de référence** mélange contenu et décalage vertical du panneau (§1e) —
   la mesure propre serait un appariement par ancre de panneau, non fait.
6. **Le cadre à retenir.** Je retiens le **cadre 4** (`reference/cadre-4-la-suite.png`) : son
   étiquette d'atelier dit « un joueur neuf, **planque non vide** », ce qui est exactement l'état
   décrit par le mandat (compte neuf, LA SUITE avec la ligne planque), et son contenu le confirme
   (labo · vente · **planque/BLANCHIR**, « LÉGÈRE » en gris chaud). Je n'ai **pas** pu confronter ce
   choix à l'état réel du jeu.

---

## Annexes

### A. Correspondance des repères
Référence **1080×2102** rendue à l'échelle **3.6** (300 px CSS → 1080 px, résolution de travail des
juges, DA-3). Captures **1080×1920** et **1080×2400**. Les trois partagent la largeur **1080** ⇒ x
se compare 1:1 ; y ne se compare pas en px bruts (aucune mesure de ce rapport ne le fait, hors les
bandes ancrées en haut, que le chrome ancre effectivement).

### B. Scripts (`mesures/`), avec leur sortie collée
- `rendre-reference-04.py` + `sortie-rendre-reference.txt` — re-rend les 5 cadres ; garde
  d'appariement index ↔ étiquette ; assertion de taille sur le fichier écrit.
- `m1_etat_des_captures.py` + `sortie-m1.txt` — S1/S2/S3. **S1 et S3 sont mal visées** (S3 rend
  `delta +0.00` sur deux images différentes : fenêtre posée sur un aplat). **Seule S2 est retenue.**
- `m2_signature_avant_apres.py` + `sortie-m2.txt` — T1 (réfutée par son contrôle positif, écartée)
  et **T2 (retenue)**.
- `m3_reference_r1_vs_r2.py` + `sortie-m3.txt` — dérive de la référence, par bande.

### C. Note de méthode
Deux instruments ont été **écartés par leurs propres contrôles** avant toute conclusion : la sonde
T1 (contrôle positif KO sur 3/6) et les fenêtres S1/S3 (`delta +0.00` sur deux images différentes).
Ils restent dans `mesures/` avec leur sortie, pour que personne ne les reprenne en croyant qu'ils
mesurent ce que leur nom annonce.

Un **troisième** a été accusé à tort : le premier balayage non borné, lu **à 0 pendant qu'il tournait
encore**, que j'ai classé « cassé ». Après complétion il rend **12 lignes**, contrôles **1/0**,
identiques au balayage `rtk proxy`. ⇒ **Quatre chemins de mesure indépendants** concordent sur
l'absence de capture postérieure au 26/09 10:09 (balayage borné, `rtk proxy` non borné, balayage du
client Unity seul, balayage non borné complété) — la conclusion est donc **plus** solide qu'au moment
où je l'ai écrite, mais la faute de lecture, elle, est à moi : *un zéro lu sur un instrument encore
en vol n'est pas un zéro mesuré*, et il allait dans le sens qui m'arrangeait.
