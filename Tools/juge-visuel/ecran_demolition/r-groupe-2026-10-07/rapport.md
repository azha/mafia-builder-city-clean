# Juge visuel ⊥ — ㉝ Raser un site (`ecran_demolition`) — tour « r-groupe » — 2026-10-07

Juge à contexte vierge : n'a construit ni jugé cet écran, n'a lu ni `Assets/Scripts`, ni les notes
d'implémentation, ni les rapports `r1-2026-09-07` / `r2-2026-09-22`.

**Barème appliqué** (ruling user du 2026-10-07, qui prime) : « les petits pixels de nuance, on ne
les traite pas, on fait le gros, mais il faut que ce soit fidèle ».
**A** = perçu nettement (élément absent ou en trop, fond/décor, matière, texte faux ou anglais,
geste, lisibilité, contraste) · **B** = forme visible mais secondaire · **C** = pixel ou nuance.
Verdict APPROUVÉ seulement si **aucun A ni B**.

---

## Verdict : **NON APPROUVÉ**

Le gabarit, la palette et les contrastes sont justes au pixel près (jusqu'à l'encre du titre,
identique bit pour bit), mais la **bande basse a perdu la voix du lieutenant** — présente sur 4 des
6 cadres de la famille, mesurée à 0,00 % d'encre en jeu — et l'écran porte une **liste « VOS 4 SITES »
qu'aucun cadre de la maquette ne dessine**, qui occupe 26,6 % de la hauteur.

### Images comparées

| rôle | fichier | taille |
|---|---|---|
| référence d'ÉTAT | `ecrans-brennar-6.html` **cadre 79** « L'organisation frotte » (re-rendu, atelier `d84c6eb`, ×3,6) | 1080×2102 |
| référence nominale (INDEX) | `ecran_demolition/reference-1080x2102.png` = **cadre 80** « Ce bâtiment vous coûte » (identité **mesurée**, voir `mesures/m_identite_references.py` : 1,283 contre 52,8 / 53,3 / 54,2 pour les autres) | 1080×2102 |
| capture | `planches-par-ecran-2026-10-07/E06_Dmolition_1080x2400.png` (+ `_1080x1920`, + les deux `_bas`) | 1080×2400 / 1080×1920 |

**Échelle** : la référence rend 300 px CSS sur 1080 px (×3,6) ; la capture fait 1080 px de large.
**Facteur = 1,000 en X** ⇒ toute largeur se compare en px bruts. En Y, la référence est un gabarit de
2102 px pour un écran de 2400/1920 : les positions verticales se comparent **en % de la hauteur**.

**Témoin d'état** : le compte est NEUF (friction = 0) ; le cadre 79 montre friction = 7. Les deux
portent le **même gabarit** (compteur + titre + bande basse + CTA) : c'est le gabarit qui est jugé,
pas la valeur. Aucun cadre « état vide » n'existe pour ㉝ — c'est dit en §6.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sortie collée : `sortie.txt`, `sortie-cta.txt`.

| # | grandeur | référence | jeu | verdict |
|---|---|---|---|---|
| 1 | largeur de l'écran | 1080 px | 1080 px | facteur **1,000** |
| 2 | encre du grand titre (RGB) | `(238, 243, 249)` | `(238, 243, 249)` | **identique** |
| 3 | or du texte de CTA (RGB) | `(217, 171, 78)` | `(217, 171, 77)` | **1/255** |
| 4 | fond d'écran, médiane de fenêtre | `(25, 26, 23)` | `(24, 25, 22)` | ≤ 1/255 |
| 5 | contraste titre / fond | 14,86:1 | 15,28:1 | même ordre |
| 6 | bords du cadre de CTA (x min, x max) | 53 … 1026 (l = 974) | 50 … 1029 (l = 980) | **+6 px = 0,6 %** |
| 7 | carte-compteur (chiffre + titre + phrase) | présente, y 612..787 | présente, y 485..633 | même composition |
| 8 | CTA en bas d'écran, libellé + indice à droite | présent | présent | même rôle |
| 9 | titre + sous-titre gris en tête de contenu | présent | présent | même rôle |
| 10 | contraste du texte de CTA | 7,91:1 | 7,97:1 | même |
| 11 | tous les contrastes mesurés ≥ plancher | — | 4,84 → 15,28:1 | **aucun défaut de lisibilité** |

Contrôles de l'instrument : le compteur d'encre rend **22,87 %** sur le titre de la capture
(contrôle négatif : il n'est pas aveugle) et **None** sur une ligne de fond nu (contrôle du
détecteur d'or). Les deux grandeurs qui fondent les écarts A1 et A2 sont donc produites par un
instrument qui discrimine.

---

## 0. L'écran, tel que la maquette le dit

**But** : voir ce que l'accumulation de bâtiments coûte à l'organisation, et décider d'en raser un.
**Ordre de lecture** (cadre 79) : ① le bandeau haut (argent, manomètre de chaleur, jour) posé sur
l'art peint de la ville ; ② le grand titre sérif blanc « L'organisation frotte » et sa ligne grise ;
③ la carte-compteur (un chiffre rouge géant, un titre, une phrase) ; ④ l'encadré ambre qui dit la
conséquence ; ⑤ la **bande basse** : la voix du lieutenant en italique, puis le CTA doré.
**Zones** : chrome haut · scène peinte · colonne de contenu · bande basse (voix + geste).
**Traits d'identité** : (a) l'art peint qui respire derrière tout le haut ; (b) le chiffre géant
coloré de la carte-compteur ; (c) **la voix nommée du lieutenant juste au-dessus du geste** — elle
est sur 4 des 6 cadres (79, 80, 83, 84) et c'est elle qui fait de la bande basse une *conversation*
plutôt qu'une barre d'action ; (d) le CTA doré bordé, libellé à gauche, indice gris à droite.

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour l'essentiel, et de façon frappante sur la matière : la famille typographique, le blanc du
titre, l'or du CTA, le gris des lignes secondaires et la gouttière sont les mêmes à 1/255 et 6 px
près. Un joueur reconnaît l'écran. L'ordre de lecture ① → ② → ③ → CTA est conservé.

Trois choses changent ce qu'il voit. **(1)** La bande basse a perdu sa voix : là où la maquette pose
deux lignes italiques signées « Lt. Rin », le jeu ne pose rien — 0,00 % d'encre sur les 110 px
au-dessus du geste, aux deux résolutions, contre 8,43 % (cadre 79) et 10,79 % (cadre 80). La bande
basse cesse d'être une parole et devient un bouton. **(2)** Un bloc que la maquette ne dessine nulle
part — « VOS 4 SITES » et ses quatre rangées — occupe 639 px, soit 26,6 % de la hauteur à 2400 et
33,3 % à 1920 : c'est désormais le plus gros objet de l'écran, devant la carte-compteur. **(3)** Entre
cette liste et le CTA, 633 px de noir (26,4 %) à 2400 — le bas de l'écran se vide au lieu de se
poser.

Le décor peint est absent (46 % des lignes de la capture sont parfaitement plates contre 1 % de la
référence) : c'est l'écart ASSUMÉ du lot décor en cours, inventorié ci-dessous, non classé.

---

## 3. Écarts

| # | partie | classe | réf | jeu | delta / mesure | script |
|---|---|---|---|---|---|---|
| **A1** | bande basse · voix du lieutenant | **A** (élément absent) | 2 lignes italiques signées, y 1825..1893 (h 69 px = 3,3 % de l'écran) ; encre 8,43 % (cadre 79) et 10,79 % (cadre 80) sur les 110 px au-dessus du CTA | rien : **0,00 %** d'encre sur les 110 px au-dessus du CTA, à 2400 **et** à 1920 | −100 % de l'encre de la bande | `m_demolition.py` |
| **A2** | liste « VOS 4 SITES » | **A** (élément en trop) | aucun des 6 cadres 79-84 ne porte de liste de sites (texte des 6 cadres relu intégralement) | libellé y 681..699 + 4 rangées y 748..877 / 896..1024 / 1043..1172 / 1191..1320 | bloc de **639 px = 26,6 %** de la hauteur (33,3 % à 1920) | `m_demolition.py` |
| **B1** | bas de la colonne de contenu | **B** | la colonne se termine sur l'encadré ambre puis la bande basse ; pas de trou | **633 px** de noir continu entre la liste (fin 1320) et le CTA (début 1954) | 26,4 % de la hauteur à 2400 ; se résorbe à 153 px à 1920 | `m_demolition.py` |
| C1 | CTA · hauteur et retour à la ligne | C | 105 px, libellé sur **une** ligne | 144 px, libellé sur **deux** lignes (« VOIR CE QUI COÛTE LE / PLUS ») | +37 % de hauteur | `m_cta.py` |
| C2 | CTA · indice à droite | C | « site par site » | « le plus mauvais rapport » (sur deux lignes) | libellé différent, français correct des deux côtés | lu sur les images |
| C3 | encadré ambre « Tout produit moins en ce moment » | C | présent (friction = 7, `penalty_active`) | absent | **cohérent avec l'état** (friction = 0) — noté pour mémoire, pas un défaut | lu sur les images |
| — | décor de scène | **ASSUMÉ** (lot en cours, non classé) | art peint texturé : 0 ligne plate sur y 0..420, 17/2102 sur l'écran entier | aplat : 110 lignes plates sur y 0..420, **1105/2400 (46 %)** sur l'écran entier | rendu **proprement** : pas de trou, pas de libellé de repli, le bandeau et le médaillon restent lisibles | `m_demolition.py` |

**Note sur A1** — le `LISEZMOI.md` de la série décrit la bande basse de ㉛ comme « plaque, filet,
geste `.geste`, **sans voix** ». Si la suppression de la voix est une décision déjà prise pour toute
la famille d'écrans, A1 devient un **ARBITRAGE** et non un défaut — mais rien dans le dossier de ㉝
ne le dit, et la maquette de ㉝ la porte. Je le remonte donc mesuré, et je laisse l'arbitrage à qui
détient le registre des décisions.

**Note sur A2** — la maquette n'a **aucun** cadre d'état vide pour ㉝ : elle ne « montre pas » de
liste, mais elle ne l'interdit pas non plus. L'écart est réel et gros ; l'arbitrage est soit
d'ajouter un cadre « liste des sites » à l'atelier, soit de retirer le bloc. Je ne tranche pas.

## 5. Autres résolutions

- **1080×2400** : rien de coupé, rien hors cadre, rien qui déborde. Le vide B1 vaut 633 px.
- **1080×1920** : même inventaire, même ordre de lecture, mêmes bbox en X (CTA x 50..1029 aux deux
  résolutions). Le vide B1 tombe à ~153 px : **le défaut B1 est propre au 2400**. Rien de coupé.
- **`_bas` (liste défilée)** : les deux planches `_bas` sont **identiques au bit près** aux planches
  hautes (diff moyenne **0,000**, 0,00 % de px > 8, aux deux résolutions — `mesures/m_planches_bas.py`,
  sortie dans `sortie-planches-bas.txt`). Le contenu de ㉝ ne déborde donc pas sur un compte neuf,
  contrairement à ce qu'annonce `journal.tsv` (« le contenu DÉBORDE — planche _bas prise »). Ce n'est
  pas un défaut de l'écran : c'est **une ligne de journal à corriger**. Le même contrôle montre que
  ㉓ a bien défilé (9,26 % / 8,14 %) et ㊵ seulement à 1920 (3,42 %), donc l'instrument discrimine.

## 6. Ce que je n'ai pas pu vérifier

1. **L'état nominal de ㉝** (friction > 0, la fiche d'un site, la confirmation, la parcelle libérée)
   — le compte est neuf. *Mesure qui trancherait* : une capture sur un compte avec ≥ 2 sites en
   friction, et une capture après appui sur « VOIR CE QUI COÛTE LE PLUS » (cadre 80).
2. **La famille de police** : je n'ai pas lancé `fc-match` sur la machine qui a rendu le PNG, et le
   `dossier.md` de ㉝ ne la renseigne pas (gabarit non rempli). L'encre du titre étant identique au
   bit près, je n'ai aucune raison de soupçonner une substitution, mais je ne l'ai pas prouvé.
   *Mesure qui trancherait* : `fc-match` sur chaque `font-family` de la CSS du cadre 79.
3. **Si la voix du lieutenant est un retrait DÉCIDÉ** — hors de l'image (registre de décisions).
4. **Le geste** (appui long, retour haptique, animation d'entrée) — une planche fige un instant.
5. **Le `dossier.md` de cet écran est un gabarit non rempli** (chevrons partout, pas d'échelle, pas
   de `fc-match`, table des écarts assumés vide) : l'échelle a dû être **reconstruite** par la mesure
   (facteur 1,000 en X), et la table des ASSUMÉS vient de la consigne de l'orchestrateur, pas d'un
   `juge-donnees` en mode maquette.

## Annexes

- `mesures/outils.py` — boîte à outils (médiane de fenêtre, couleur d'encre par les 4 % les plus
  clairs, contraste WCAG, profil de lignes, compteur d'encre, palette quantifiée).
  ⚠️ `couleur_texte` prend le **cœur du glyphe** : une médiane de fenêtre sur un texte fin rend le
  **fond** — mode d'échec rencontré et corrigé pendant ce tour (toutes les premières mesures de
  contraste rendaient 1,00:1).
- `mesures/m_identite_references.py` + `sortie-identite.txt` — quel cadre est chaque PNG de
  référence commité, **re-mesuré** et non lu dans une table.
- `mesures/m_demolition.py` + `sortie.txt` — contrôle positif, décor, A1, A2, B1, contrastes.
- `mesures/m_cta.py` + `sortie-cta.txt` — géométrie du CTA. ⚠️ Le repérage « par écart au fond
  dominant » rend `(0, 1079)` sur la référence (l'art peint texture toute la largeur) : c'est le
  mode d'échec que ce script contourne par un test de teinte, avec son contrôle négatif.
