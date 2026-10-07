# Juge visuel ⊥ — ㉓ La vitrine (`ShopScreenController`, dossier `compte`) — tour « r-groupe » — 2026-10-07

Juge à contexte vierge : n'a construit ni jugé cet écran, n'a lu ni `Assets/Scripts`, ni les notes
d'implémentation, ni les rapports `r1-㉓-2026-09-07` / `r2-㉓-2026-09-22`.

**Barème appliqué** (ruling user du 2026-10-07, qui prime) : « les petits pixels de nuance, on ne
les traite pas, on fait le gros, mais il faut que ce soit fidèle ».
**A** = perçu nettement (élément absent ou en trop, fond/décor, matière, texte faux ou anglais,
geste, lisibilité, contraste) · **B** = forme visible mais secondaire · **C** = pixel ou nuance.

---

## Verdict : **NON APPROUVÉ**

Le contenu est juste — les quatre liasses, leurs bonus, les cinq extras, les prix, l'or des jetons
au bit près — mais **la vitrine n'est plus une vitrine** : la grille 2 × 2 de cartes illustrées est
devenue une colonne de lignes sans fond ni dessin (carte : 44,8 % → 93,5 % de la largeur ; fill de
plaque `(28, 22, 28)` → `(13, 13, 13)`, c'est-à-dire exactement le fond de page), les quatre
pictogrammes de produit sont remplacés par **un même disque de 784 px pour les quatre**, et la bande
du personnage (Wexler, « DERRIÈRE LE COMPTOIR ») — 11,9 % de la hauteur de la maquette — a disparu.

### Images comparées

| rôle | fichier | taille |
|---|---|---|
| référence de la planche HAUTE | `ecrans-brennar-6.html` **cadre 99** « La caisse — les jetons » (re-rendu, atelier `d84c6eb`, ×3,6) | 1080×2102 |
| référence de la planche `_bas` | `compte/reference-㉓-1080x2102.png` = **cadre 98** « La vitrine — les extras » (identité **mesurée** : 0,627 contre 15,220 et 3,864 — `mesures/m_identite_references.py`) | 1080×2102 |
| capture | `E07_Boutique_1080x2400.png`, `_1080x1920`, `_bas_1080x2400`, `_bas_1080x1920` | 1080×2400 / 1080×1920 |

**Échelle** : 300 px CSS → 1080 px (×3,6) côté référence ; 1080 px côté capture. **Facteur 1,000 en
X** ⇒ les largeurs se comparent en px bruts ; les positions verticales en % de la hauteur.

**Témoin d'état** : la capture haute montre les **liasses** (cadre 99), la planche `_bas` montre les
**extras** (cadre 98). Les deux cadres sont donc dus et les deux sont comparés. Le journal désigne
seulement le cadre 98 : c'est une lacune de la table, pas de l'écran.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sortie collée : `sortie.txt`.

| # | grandeur | référence | jeu | verdict |
|---|---|---|---|---|
| 1 | largeur d'écran | 1080 | 1080 | facteur **1,000** |
| 2 | or du titre « LA VITRINE » | `(217, 171, 78)` | `(217, 171, 77)` | **1/255** |
| 3 | or de la pastille de solde | `(217, 171, 78)` | `(217, 171, 77)` | **1/255** |
| 4 | pastille de solde en tête | présente (y 452..535) | présente (y 352..464) | même rôle |
| 5 | les quatre liasses, dans l'ordre | 100 / 600 / 1400 / 3500 | 100 / 600 / 1400 / 3500 | **identique** |
| 6 | les trois bonus | +20 % / +40 % / +75 % | +20 % / +40 % / +75 % | **identique** |
| 7 | le catalogue d'extras | couleurs · thème nuit au sodium · 2ᵉ et 3ᵉ dossier (cadre 98) | couleurs d'indicatif · thème nuit au sodium · 2ᵉ et 3ᵉ partie (planche `_bas`) | même jeu |
| 8 | les prix des extras | 50 / 80 / 100 / 200 | 50 / 80 / 100 / 200 | **identique** |
| 9 | contraste titre / fond | 7,81:1 | 9,15:1 | même ordre |
| 10 | tous les contrastes de texte | — | 4,34 → 14,80:1 | **aucun défaut de lisibilité** |
| 11 | aucune chaîne anglaise à l'écran | la maquette en porte (« Callsign Color Pack », « Extra Save Slot ») | la capture n'en porte **aucune** | **le client fait mieux** |

Contrôles de l'instrument : le compteur d'encre rend **0,00 %** là où il n'y a rien et **8,30 %**
sur une carte (il discrimine) ; le compteur de teinte dorée rend 38,9 % sur le médaillon de bonus de
la référence et 12,6 % sur la ligne de texte équivalente en jeu.

---

## 0. L'écran, tel que la maquette le dit

**But** : acheter des jetons et des extras — c'est la seule surface où de l'argent réel entre.
**Ordre de lecture** : ① le bandeau **de comptoir** bronze, « LA VITRINE » à gauche, le solde en
pastille dorée à droite, séparés du reste par un filet d'or ; ② l'intitulé de section qui dit **par
quoi on paie** (« LES JETONS — PAYÉS AU MAGASIN » / « LES EXTRAS — PAYÉS EN JETONS ») ; ③ la
**grille 2 × 2** de quatre cartes-produit, chacune une plaque teintée portant **un dessin**, un
titre, un prix et son état ; ④ la bande basse où **Wexler**, derrière le comptoir, commente la vente.
**Traits d'identité** : (a) le bandeau de comptoir avec le solde opposé au titre sur une même ligne ;
(b) la grille de cartes *illustrées* — c'est elle qui fait « vitrine » et non « liste de prix » ;
(c) le **médaillon de bonus** collé dans l'angle de la carte, comme une étiquette promotionnelle ;
(d) Wexler et sa réplique, qui donnent une voix au commerce ; (e) la double lecture
*jetons* (ce qu'on obtient) / *Marks* (ce qu'on paie).

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le **contenu** est fidèle, et plus propre que la maquette sur un point (aucune chaîne anglaise ne
subsiste). Mais la **forme** a changé de genre : on ne regarde plus un étal, on fait défiler un
tarif. Trois mesures le disent. **(1)** La carte-produit passe de 484 px (44,8 %) à 1010 px (93,5 %)
et la grille à deux colonnes disparaît ; chaque produit occupe désormais une bande pleine largeur.
**(2)** La carte n'est plus une plaque : sa médiane intérieure vaut `(13, 13, 13)`, exactement le
fond de page, contre `(28, 22, 28)` dans la maquette — il ne reste qu'un filet. **(3)** Le dessin de
produit est parti : la maquette met entre 1 230 et 10 032 px dorés par carte (quatre piles de jetons
différentes) ; la capture met **784, 784, 779, 778** — le même disque quatre fois, qui ne distingue
aucun produit.

Deux absences achèvent le changement de registre : l'intitulé qui disait **par quoi on paie**
(0,00 % d'encre entre le solde et la première carte), et la **bande de Wexler** (11,9 % de la
hauteur, 7,03 % d'encre dans la référence) — le commerce perd sa voix exactement comme ㉝ perd celle
de son lieutenant.

Enfin, la fiction du paiement est **inversée** : la maquette dit « 100 jetons · Pack — 100 **Marks** »
(on paie en Marks, on reçoit des jetons) ; le jeu dit « Liasse de 100 **Marks** · donne 100 Marks ·
+20 % de Marks par euro », et le mot « jetons » a disparu de l'écran. Les deux monnaies de la
maquette n'en font plus qu'une, et le prix réel n'est plus montré.

Le décor peint est absent (fond en aplat) : écart ASSUMÉ du lot décor en cours, noté, non classé.

---

## 3. Écarts

| # | partie | classe | réf | jeu | delta / mesure | script |
|---|---|---|---|---|---|---|
| **A1** | grille des produits | **A** (forme / matière) | 2 colonnes, cartes x 40..524 et 555..1039, **484 px = 44,8 %** de la largeur, gouttière centrale 30 px | 1 colonne, carte x **35..1044 = 1010 px = 93,5 %**, aucune gouttière centrale | **×2,09** en largeur de carte ; la grille disparaît | `m_boutique.py` |
| **A2** | matière de la carte-produit | **A** (matière) | plaque teintée : médiane intérieure `(28, 22, 28)` contre `(22, 27, 33)` hors carte | **aucun fond** : médiane intérieure `(13, 13, 13)` = médiane hors carte `(13, 13, 13)` | la carte n'est plus qu'un filet | `m_boutique.py` |
| **A3** | pictogramme de produit | **A** (élément absent) | une pile de jetons dessinée, propre à chaque produit : **1230 / 4999 / 10032 / 9281** px dorés | un disque uni : **784 / 784 / 779 / 778** px dorés — identiques à 6 px près | le dessin ne distingue plus aucun produit | `m_boutique.py` |
| **A4** | bande du personnage (Wexler) | **A** (élément absent) | bande y 1834..2085, **h 251 px = 11,9 %** de l'écran, encre **7,03 %** : portrait rond, nom, « DERRIÈRE LE COMPTOIR », réplique italique | absente aux deux résolutions, planche haute **et** `_bas` ; le bas de l'écran est la barre d'onglets du shell | −100 % | `m_boutique.py` |
| **A5** | vocabulaire des deux monnaies | **A** (texte) | « 100 **jetons** » / « Pack — 100 **Marks** » / « + 100 jetons » / « 50 JETONS » — deux monnaies distinctes, le prix réel affiché | « Liasse de 100 **Marks** » / « donne 100 Marks » / « +20 % de **Marks** par euro » / « 50 Marks » — **le mot « jetons » n'apparaît nulle part**, le prix réel n'est pas affiché | **0** occurrence de « jeton » en jeu contre **16** dans le cadre 99 (et 2 dans le cadre 98), comptées sur la source des cadres | lu sur les images |
| **B1** | intitulé de section | **B** | « LES JETONS — PAYÉS AU MAGASIN » (ref 99) / « LES EXTRAS — PAYÉS EN JETONS » (ref 98), encre 25,16 % | aucun : encre **0,00 %** entre le solde et la 1ʳᵉ carte | la règle de paiement n'est plus écrite | `m_boutique.py` |
| **B2** | médaillon de bonus | **B** | plaque dorée pleine dans l'angle de la carte, 3 lignes : **38,9 %** de px dorés | ligne de texte dorée dans le flux : **12,6 %** | perd son statut d'étiquette | `m_boutique.py` |
| **B3** | bandeau de comptoir | **B** | bande bronze `(38, 32, 28)` + filet d'or, titre à **gauche**, solde à **droite** sur la même ligne (pastille x 697..1035 = 31,3 %) | fond nu `(13, 13, 13)`, titre **centré**, pastille **sous** le titre et pleine largeur (x 36..1044 = 93,3 %) | la ligne de comptoir est cassée en deux | `m_boutique.py` |
| C1 | bouton d'achat des liasses | C | « PRIX DU MAGASIN » actif | « DERRIÈRE LA VITRE / Bientôt », tiretés, désactivé | **cohérent avec l'état** (magasin non branché) ; rendu proprement, contraste 4,34:1 | `m_boutique.py` |
| C2 | libellés des extras | C | « Deuxième dossier », « Couleurs de nom » (+ sous-titres anglais) | « Une deuxième partie », « Couleurs d'indicatif » (sans anglais) | copie différente, français correct, pas de repli visible | lu sur les images |
| — | décor de scène | **ASSUMÉ** (lot en cours, non classé) | art peint derrière le haut d'écran | aplat | rendu proprement, bandeau et médaillon lisibles | — |

---

## 5. Autres résolutions

- **1080×2400** (haute et `_bas`) : rien de coupé, rien hors cadre. La liste **a réellement défilé** —
  diff planche haute / planche `_bas` : moyenne **9,837**, 9,26 % de px > 8
  (`mesures/m_planches_bas.py`, sortie `sortie-planches-bas.txt`) ; la planche `_bas` montre bien la
  fin du catalogue (« Soutien au studio »). *Le même instrument rend 0,000 sur ㉝ : il discrimine.*
- **1080×1920** (haute et `_bas`) : même inventaire, mêmes bbox en X. Rien de coupé.
- **Écart propre à aucune résolution** : les cinq A valent aux deux.
- **Ascenseur** : un balayage des colonnes x 1015..1079 rend un maximum à x 1040..1042, qui est le
  **filet droit des cartes** (bbox mesurée 35..1044) — je ne sais donc pas distinguer ici un
  indicateur de défilement du bord de carte. *Mesure qui trancherait* : une capture sans carte
  sous le curseur, ou une planche prise en cours de défilement.

## 6. Ce que je n'ai pas pu vérifier

1. **Si « Marks » remplace « jetons » par DÉCISION** (A5) — un renommage de monnaie se tranche dans
   le registre des décisions, pas dans une image. *Mesure qui trancherait* : chercher le ruling
   « jetons → Marks » dans les registres ; s'il existe, A5 devient un ARBITRAGE **déjà tranché** et
   c'est la maquette (cadres 98-99) qui est à re-rendre.
2. **Le prix en argent réel** : la maquette l'affiche (« Pack — 100 Marks »), le jeu ne l'affiche
   pas. Je ne sais pas si le back le sert. *Mesure qui trancherait* : un `juge-donnees` sur
   `GET /v1/iap/catalog`.
3. **L'état « acheté / possédé »** et l'état « zéro jeton » (cadre 100) — non capturés.
4. **La famille de police** : pas de `fc-match` dans le dossier (`mandat-㉓.md` non renseigné sur ce
   point). L'encre du titre étant identique au bit près, rien ne suggère une substitution.
5. **Le geste d'achat** (appui, confirmation, retour magasin) — une planche fige un instant.

## Annexes

- `mesures/outils.py` — boîte à outils. ⚠️ `couleur_texte` prend le cœur du glyphe (4 % les plus
  clairs) : une médiane de fenêtre sur un texte fin rend le **fond**, mode d'échec rencontré et
  corrigé pendant ce tour.
- `mesures/m_identite_references.py` + `sortie-identite.txt` — quel cadre est chaque PNG de
  référence commité, **re-mesuré**.
- `mesures/m_boutique.py` + `sortie.txt` — contrôle positif, A1 à A5, B1 à B3, contrastes.
  ⚠️ Deux instruments ont été **réfutés par leur propre contrôle** avant d'entrer au rapport : (a)
  un détecteur de colonnes « par gouttière de fond » rend du bruit sur la capture parce que le fond
  des cartes **est** le fond de page — c'est ce rejet qui a produit la mesure A2 ; (b) un relevé de
  largeur de carte par seuil > 17 rend `[]` pour la même raison, d'où le seuil > 22 sur le filet.
