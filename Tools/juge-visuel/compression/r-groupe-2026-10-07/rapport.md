# Juge visuel ⊥ — ⑭ La semaine (`CompressionScreenController`, dossier `compression`) — tour « r-groupe » — 2026-10-07

Juge à contexte vierge : n'a construit ni jugé cet écran, n'a lu ni `Assets/Scripts`, ni les notes
d'implémentation, ni les rapports `r1-2026-09-07` / `r2-2026-09-22`.

**Barème appliqué** (ruling user du 2026-10-07, qui prime) : « les petits pixels de nuance, on ne
les traite pas, on fait le gros, mais il faut que ce soit fidèle ».
**A** = perçu nettement · **B** = forme visible mais secondaire · **C** = pixel ou nuance.

---

## Verdict : **NON APPROUVÉ**

Le texte est fidèle au mot près et la palette au bit près — mais **le manomètre de TENSION, qui est
l'écran**, n'existe pas en jeu : 0 pixel du secteur teal et 0 pixel du secteur rouge contre 8 378 et
8 448 dans la maquette, aux deux résolutions. Un objet de 705 × 509 px (65 % de la largeur, 24 % de
la hauteur) est remplacé par deux mots en gris. L'écran qui mesurait une pression affiche désormais
un paragraphe, et 61 % de sa hauteur est vide.

### Images comparées

| rôle | fichier | taille |
|---|---|---|
| référence d'ÉTAT | `ecrans-brennar-4.html` **cadre 29** « Compression — au calme » (re-rendu, atelier `d84c6eb`, ×3,6) — le cadre que `LISEZMOI.md` désigne pour l'état neuf | 1080×2102 |
| référence nominale (INDEX) | `compression/reference-1080x2102.png` = **cadre 25** « la semaine s'annonce » (identité **mesurée** : 0,316 contre 21,0 → 54,1) | 1080×2102 |
| capture | `E08_Lasemaine_1080x2400.png`, `_1080x1920` (pas de planche `_bas` : rien ne déborde) | 1080×2400 / 1080×1920 |

**Échelle** : 300 px CSS → 1080 px (×3,6) ; capture 1080 px. **Facteur 1,000 en X.**

**Témoin d'état** : compte neuf, tension calme, aucune semaine — exactement le cadre 29. Le cadre 25
(nominal) sert de second témoin : il porte **le même manomètre**, aiguille à une autre position.
L'absence mesurée n'est donc pas un artefact du choix de cadre.

**Mots « — » (TD-846)** : la consigne dit que certains mots attendus de l'atelier sont volontairement
rendus « — ». Je n'ai trouvé **aucun** « — » de ce type sur ⑭ : la capture écrit « TENSION CALME ·
AUCUNE SEMAINE », pas un tiret de repli. Rien à classer de ce côté.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sortie collée : `sortie.txt`.

| # | grandeur | référence (cadre 29) | jeu | verdict |
|---|---|---|---|---|
| 1 | largeur d'écran | 1080 | 1080 | facteur **1,000** |
| 2 | la plaque « OÙ EN EST LA TENSION » | présente | présente | même rôle, même rang |
| 3 | or du titre de plaque | `(242, 201, 107)` | `(242, 201, 106)` | **1/255** |
| 4 | gris du corps de plaque | `(185, 173, 146)` | `(185, 173, 146)` | **identique** |
| 5 | titre de plaque, texte | « Rien ne presse — aucune semaine en vue » | idem | **identique** |
| 6 | corps de plaque, texte | « La tension monte quand les problèmes s'accumulent sans réponse : montante, puis écrasante — et la semaine s'ouvre. » | idem, 3 lignes | **identique** |
| 7 | contraste titre de plaque | 11,31:1 | 12,34:1 | même ordre |
| 8 | chrome haut (argent · manomètre de chaleur · jour + moment) | présent | présent | même structure |
| 9 | tous les contrastes de texte | — | 8,75 → 12,34:1 | **aucun défaut de lisibilité** |
| 10 | aucune chaîne anglaise, aucun enum brut | — | aucun | conforme |

**Contrôle négatif de l'instrument de teinte** : le détecteur « or » rend 25 930 px côté référence
**et 7 339 px côté capture** — il n'est donc pas aveugle à la capture. Seuls les détecteurs teal et
rouge y rendent 0. *C'est ce contrôle qui empêche de lire A1 comme un instrument cassé.*
⚠️ Il a aussi **réfuté le premier instrument** que j'avais écrit : compter « les px dorés de la bande
du cadran » rend 11 739 px sur la capture (le titre doré et le titre de plaque), ce qui aurait pu
passer pour « le cadran est là, un peu plus petit ». La grandeur qui discrimine n'est pas l'or,
c'est le **teal** et le **rouge**, qui n'existent nulle part ailleurs sur cet écran.

---

## 0. L'écran, tel que la maquette le dit

**But** : savoir si la pression monte, et décider d'ouvrir la semaine (ou de la reporter).
**Ordre de lecture** : ① le **manomètre de TENSION** — un demi-cadran cerclé de laiton, 705 px de
large, avec son onglet « TENSION » posé dessus, trois secteurs (teal → laiton → rouge) et une
aiguille blanche ; ② la ligne d'état en sérif doré qui *nomme* ce que l'aiguille montre
(« Calme — vos affaires respirent ») ; ③ la plaque qui explique la mécanique ; ④ (dans l'état
nominal) les deux gestes « OUVRIR LA SEMAINE » / « REPORTER D'UN CYCLE ».
**Zones** : chrome · cadran héros · ligne d'état · plaque d'explication · art peint plein cadre.
**Traits d'identité** : (a) **le cadran** — c'est le seul écran du corpus qui en porte un de cette
taille, et il occupe le premier tiers ; (b) l'aiguille, qui fait de la tension une *position* et non
un mot ; (c) la ligne d'état dorée en sérif, qui rime avec l'aiguille ; (d) l'absence de titre
d'écran : le cadran EST le titre.

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. La maquette fait regarder une **aiguille** ; le jeu fait lire un **paragraphe**. L'ordre de
lecture est renversé : là où l'œil tombait d'abord sur un demi-cercle de laiton de 705 × 509 px, il
tombe maintenant sur un titre doré « LA SEMAINE » que la maquette ne porte pas, puis directement sur
la plaque d'explication. Le trait d'identité n°1 de l'écran a disparu, et avec lui la seule
représentation **analogique** d'une grandeur dans tout le corpus.

Les conséquences se mesurent. Le contenu de la capture s'arrête à y = 720, soit 30 % de la hauteur à
2400 : **1 458 px (60,8 %) de noir** en dessous, et encore 978 px (50,9 %) à 1920 — contre 17 px
(0,8 %) dans la maquette, qui remplit tout. La ligne d'état perd sa couleur : sérif **doré**
`(229, 190, 101)` → sans-sérif **gris** `(185, 173, 146)` en capitales, 0 px doré.

Ce qui reste est juste et le prouve : le titre de plaque, son corps, leurs deux teintes et leur
contraste sont identiques à 1/255 près. Le défaut n'est pas dans la matière, il est dans **ce qui
manque**.

Le décor peint est absent (fond en aplat) : écart ASSUMÉ du lot décor en cours — il explique une
partie du vide, pas le cadran.

---

## 3. Écarts

| # | partie | classe | réf | jeu | delta / mesure | script |
|---|---|---|---|---|---|---|
| **A1** | manomètre de TENSION (héros) | **A** (élément absent) | cadran cerclé : x 187..892 (**705 px = 65,3 %** de la largeur), y 250..759 (**509 px = 24,2 %** de la hauteur) ; secteur **teal 8 378 px**, secteur **rouge 8 448 px** ; même objet dans le cadre 25 (8 378 / 8 448) | **0 px teal, 0 px rouge**, aux deux résolutions. Aucun arc, aucun secteur, aucune aiguille. | −100 % de l'objet ; témoin « or » non nul des deux côtés (25 930 / 7 339) donc l'instrument n'est pas aveugle | `m_compression.py` |
| **B1** | ligne d'état sous le cadran | **B** | « Calme — vos affaires respirent » — **sérif doré** `(229, 190, 101)`, bbox x 205..874, y 744..789 | « TENSION CALME · AUCUNE SEMAINE » — **sans-sérif gris capitales** `(185, 173, 146)`, **0 px doré** | changement de famille de couleur et de casse sur la ligne qui nomme l'état | `m_compression.py` |
| **B2** | occupation de l'écran | **B** | plus longue bande sans encre : **17 px (0,8 %)** — cadres 25 et 29 | **1 458 px (60,8 %)** à 2400 · **978 px (50,9 %)** à 1920 ; dernière encre de contenu à y = 720 | conséquence de A1 **et** du décor assumé — comptée une fois, pas deux | `m_compression.py` |
| C1 | titre d'écran « LA SEMAINE » | C | aucun titre : le cadran tient lieu de tête d'écran | titre doré centré + sous-titre gris | EN TROP vs la maquette, mais conforme à la convention de chrome du client sur les 10 écrans de la série | lu sur les images |
| C2 | les deux gestes de l'état nominal | C | « OUVRIR LA SEMAINE » (plaque crème) et « REPORTER D'UN CYCLE » (cadre 25) | absents | **cohérent avec l'état** (aucune semaine en vue) ; non jugeable ici | — |
| — | décor de scène | **ASSUMÉ** (lot en cours, non classé) | art peint plein cadre (quai de nuit) sous tout l'écran | aplat noir | rendu proprement : aucun trou, aucun libellé de repli, le chrome reste lisible | `m_compression.py` |

---

## 5. Autres résolutions

- **1080×2400** : rien de coupé, rien hors cadre. Vide = 60,8 %.
- **1080×1920** : inventaire identique, mêmes bbox, mêmes comptes de teinte (0 teal / 0 rouge).
  Vide = 50,9 %. **Aucun écart propre à une résolution** : A1 et B1 valent aux deux.
- Pas de planche `_bas` — correct, rien ne déborde.

## 6. Ce que je n'ai pas pu vérifier

1. **Le cadran existe-t-il dans un AUTRE état de l'écran ?** Une planche d'un état « semaine
   montante » le dirait. Je mesure son absence dans l'état capturé, pas dans tous les états.
   *Mesure qui trancherait* : une capture avec `tension != calme`.
2. **Les deux gestes** (ouvrir / reporter) et leur appui long — hors de l'état capturé.
3. **La famille de police** : pas de `fc-match` dans le dossier (`mandat.md` non renseigné). Les
   encres étant identiques au bit près, rien ne suggère une substitution — mais ce n'est pas prouvé.
4. **Si le retrait du cadran est une DÉCISION** (coût de rendu, refonte) — hors de l'image.
5. **Le `dossier.md` de ⑭ n'existe pas** (seul un `mandat.md` est là) : pas d'échelle fournie, pas de
   table d'écarts assumés, pas de `juge-donnees` en mode maquette. L'échelle a été reconstruite par
   la mesure, et la table des ASSUMÉS vient de la consigne de l'orchestrateur.

## Annexes

- `mesures/outils.py` — boîte à outils (médiane de fenêtre, couleur d'encre par le cœur du glyphe,
  contraste WCAG, profil de lignes, compteur d'encre, compteur de teinte).
- `mesures/m_identite_references.py` + `sortie-identite.txt` — quel cadre est chaque PNG de
  référence commité, **re-mesuré** et non lu dans une table.
- `mesures/m_compression.py` + `sortie.txt` — contrôle positif, A1, B1, B2, contrastes.
  ⚠️ Le premier instrument d'A1 (« compter les px dorés de la bande du cadran ») a été **réfuté par
  son propre témoin** : il rend 11 739 px sur une capture qui n'a pas de cadran. L'instrument retenu
  compte les deux teintes qui n'existent nulle part ailleurs sur l'écran.
