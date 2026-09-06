# Juge visuel ⊥ — ㊵ Le blanchiment (« la filière ») — r1 — 2026-09-06

## Verdict : NON APPROUVÉ

La capture ne montre pas l'écran de la maquette : elle montre un **état d'erreur** dans lequel le
cœur de l'écran — la chaîne des quatre étapes — est remplacé par **1 165 px de noir strictement
uniforme** (48,6 % de la hauteur de l'écran, `min == max == #0d0d0d` sur 1 258 200 pixels), pendant
que la même route rendait **200 avec 4 nœuds** sur le même compte 1 h 07 plus tôt.

> ⚠️ **Bandeau partiellement alimenté** — la valeur JOUR affiche « — » (ARGENT, lui, est alimenté :
> `406 653,08 €`). Conformément au dossier, **je ne juge pas le chrome** (bandeau + dock) ; il est
> renvoyé au canon du HUD. Tout ce qui suit porte sur le CONTENU de l'écran.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence | jeu | verdict | script |
|---|---|---|---|---|---|
| 1 | bandeau de la capture | 143 px (valeur **dérivée du code** au dossier : 52 CSS-HUD × 2,755) | **143 px** mesurés (filet doré 138..142, fond noir dès 143) | exact | m05 |
| 2 | échelle de la référence : `.bln6` | `height:462px` (style inline, l. 6331) | cerne 452..2078 + 2×18 px d'inset ⇒ **1663 px = 462,0 CSS** | exact | m02/m03 |
| 3 | enseigne de la référence | 46,4 CSS par la somme CSS (7+17+5+6,4+8+3) | **167 px = 46,4 CSS** | exact | m10 |
| 4 | fenêtre de compteur de la référence | 31,9 CSS par la somme CSS | **114 px = 31,7 CSS** | exact | m10 |
| 5 | colonne de contenu | 980 px (x 50..1030) | 988 px (x 46..1033) | **+0,8 %** — dans la tolérance | m04 |
| 6 | écarts entre fenêtres de compteurs | 21 / 21 px | 21 / 22 px | ÉGAL | m04 |
| 7 | teal des chiffres de compteur | `#7fd4d9` | `#7fd4d9` | **exact** | m06 |
| 8 | hauteur du chiffre « 0 » | 39 px | 41 px | +5,1 % — tolérance | m12 |
| 9 | `#b9ad92` du sous-titre | `#b9ad92` | `#b9ad92` | **exact** | m06 |
| 10 | `#b9ad92` du corps de panneau | `#b9ad92` | `#b9ad92` | **exact** | m06 |
| 11 | hauteur du « a » du titre de panneau | 26 px | 26 px | **+0,0 %** | m13 |
| 12 | chasse du mot « ÉTAPES » (même mot) | 95 px | 103 px | +8,4 % — sous la tolérance d'espacement (10 %) | m13 |
| 13 | centrage vertical de l'enseigne | marges 30 / 31 px | marges 33 / 30 px | ÉGAL | m10 |
| 14 | gouttière | — | contenu 267..2115 ; bandeau finit à 142 ; encre du dock dès 2179 ⇒ **aucun chevauchement** | respectée | m03/m10 |
| 15 | contrastes (doctrine ≥ 3:1 / ≥ 4,5:1) | titre 11,92 · sous-titre 8,38 · libellé 6,39 · corps 8,10 | titre **12,48** · sous-titre **8,11** · libellé **8,11** · corps **8,11** | **tous au-dessus du seuil** | m07 |
| 16 | langue affichée | français | français partout — **aucun enum brut, aucun repli anglais, aucune clé i18n visible** | conforme | crops |

---

## 0. L'écran, tel que la maquette le dit

**But.** Voir où en est chaque étape de la filière de blanchiment — son rang, la propreté de ce qui
en sort — repérer où la chaîne casse, et injecter du liquide sale au premier maillon.

**Ordre de lecture.** (1) « La filière » — grand titre or sérif sur une plaque bordée, souligné d'un
filet doré épais ; (2) **la chaîne** : quatre rangées encadrées, chacune avec sa cuve remplie à
25 / 50 / 75 / 100 % dans une marche de couleur rouge → orange → or → vert, reliées par de courts
traits verticaux — c'est l'élément héros, il occupe 46 % de la hauteur du panneau ; (3) les trois
fenêtres de compteurs aux chiffres teal lumineux ; (4) le panneau éditorial du bas (chapeau minuscule
très espacé, titre os) puis le bouton d'action.

**Zones.** Cerne doré (cadre de la vitrine) · enseigne (titre + sous-titre) · trois compteurs ·
boîte de la chaîne (`.elast`) · panneau éditorial · pied (CTA + note).

**Traits d'identité** (les 5 choses qui font qu'on reconnaît *cet* écran) :
1. le **cerne doré** qui encadre tout le panneau, et le **filet doré** de 2 px sous le titre ;
2. l'**échelle des quatre cuves** — remplissage ordinal 25/50/75/100 %, marche rouge→vert ;
3. **trois fenêtres de compteur strictement égales**, chiffres teal `#7fd4d9` ;
4. un **fond bleu-encre en dégradé** avec un halo chaud dans le tiers supérieur ;
5. un **titre de panneau os `#eae0c8`**, éditorial, *subordonné* au titre or de l'écran.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. Le but n'est plus lisible : on ne voit **où en est aucune étape**, et on ne peut rien injecter.
Là où la maquette met une chaîne de quatre rangées colorées, le jeu met un **aplat noir parfait de
1 165 px** — vérifié pixel par pixel, `min = max = #0d0d0d` sur 1 258 200 px, 0,00 % d'encre. Sur
l'ensemble du contenu, l'encre réelle passe de **14,09 % à 1,58 %** (÷ 8,9), et **98,2 % de la zone
de contenu n'est plus que deux aplats** (`#0d0d0d` 70,45 % + `#16161c` 27,72 %). L'écran a pourtant
**+21 % de place verticale** (≈ 2 017 px utiles contre 1 663) : il en montre moins avec plus.

L'ordre de lecture est cassé au deuxième temps. On lit le titre, puis les compteurs — dont la
fenêtre du milieu est **57 % plus large** que ses voisines et rompt le rythme des trois égales —,
puis le vide, puis, en bas, un **« Pas de réponse » en or** qui devient le deuxième élément le plus
saillant de l'écran : la maquette y mettait un titre **os**, volontairement subordonné. Le message
d'erreur a pris la place hiérarchique du contenu.

Quatre des cinq traits d'identité ont disparu ou se sont inversés : plus de cerne doré (0 px sur
1 840 contre 1 610/1 610), plus de filet doré sous le titre (0 px sur toutes les lignes 418→440
contre 960 px), plus de liseré `#2a3648` sur aucune boîte (0 contre 936 px), plus d'échelle de
cuves, et le fond bleu-encre dégradé (`#1e2124` → `#2c2a25` → `#0b1016`) est devenu un noir neutre
plat et **identique à 6 hauteurs différentes**. Il reste les chiffres teal, exacts au token près.

**Et l'écran se contredit lui-même** : les trois compteurs affirment `00 / 00 / 00` — « zéro étape,
zéro propre au bout, zéro écart » — pendant que le panneau du bas écrit, dans le même cadre,
*« la route n'a rien rendu. Ce n'est pas « la filière est vide » : c'est « on ne sait pas où elle en
est » »*. La moitié haute affirme un savoir que la moitié basse déclare ne pas avoir.

**Les trois écarts de tête** : (1) la chaîne absente, sans même le conteneur bordé et le message
centré que les états vides de la maquette dessinent ; (2) aucun bouton d'action, alors que les six
cadres de la source en portent un ; (3) les compteurs à `00` qui contredisent le message d'erreur.

---

## 3. Écarts

`critère` = `NOUVEAU` partout : c'est le premier tour, aucun instrument ni aucune grandeur
n'existait avant. `données` = l'écart dépend-il de l'état du compte de démo au 2026-09-04 11:22 ?

### BLOQUANT

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | BLOQUANT | NOUVEAU | **non** | La zone de la chaîne n'a **aucun conteneur** : ni boîte, ni bordure, ni fond, ni message. Les deux états VIDES de la source (#140, #141) dessinent pourtant une boîte `.elast` bordée `#2a3648` sur fond `#0d0f10` contenant un message italique centré (`.rien`). Ici : rien du tout. | zone y 618..1783 × 1080 : **min = max = `#0d0d0d`** sur **1 258 200 px** (balayage absolu, sans échantillonnage) ; encre (L>40) = **0,00 %** (0/288 002). Contrôle négatif sur la zone homologue de la référence : min `#070809`, max `#ffe0c8`. | — |
| `F2` | BLOQUANT | NOUVEAU | **oui** | Les **4 étapes** de la filière sont absentes : pas de rangée, pas de cuve, pas de connecteur, pas de libellé de propreté. C'est l'élément héros de l'écran. | référence : 4 rangées de 142/143/143/142 px, 3 connecteurs de 40/39/40 px, cuves remplies à **21/42/63/84 px = 25/50/75/100 %**, couleurs `#da4f45` `#da8837` `#cfad5e` `#6b9a5d`. Jeu : 0. Perte verticale : **772 px** de contenu structuré. | Je n'ai pas pu rejouer la route (gate en cours). Seul fait disponible : `corps-reels/GET_operational_laundering.json` — **statut 200, 4 nœuds**, même compte `operational_demo@example.test`, 2026-09-04 **10:15:48**, soit **1 h 07 avant** la capture (11:22). Je ne peux pas exclure une purge du compte entre les deux — mais le client dit lui-même « la route n'a rien rendu », pas « la filière est vide ». |
| `F3` | BLOQUANT | NOUVEAU | non | **Aucun CTA, nulle part.** L'écran perd sa seule action (« injecter du liquide sale au premier maillon »). Les six cadres de la source portent un `.cta6` dans leur `.pied` — actif (#137 courant, #140) ou éteint (#137 tel que rendu en référence). | référence : bouton y 1902..1995 (**94 px**), bordé, + note de pied. Jeu : **0 ligne d'encre** entre le bas du panneau (2115) et l'encre du dock (2179) — sonde à seuil 10 sur 62 lignes × 1040 px. | La FORME du CTA **actif** n'a pas de témoin mesuré : la référence PNG le montre éteint, et je n'ai pas pu rendre la version actuelle de la source (aucun rendu Chrome autorisé). |
| `F4` | BLOQUANT | NOUVEAU | non | **L'écran se contredit** : les trois compteurs affirment `00 ÉTAPES / 00 PROPRE AU BOUT / 00 ÉCARTS` — trois affirmations de connaissance — pendant que le panneau du bas déclare que le serveur n'a rien rendu et que « on ne sait pas où elle en est ». Le sens de la moitié haute est inversé par la moitié basse. Sort explicitement du périmètre ASSUMÉ du dossier (« un badge ou un compteur AFFICHÉ — il serait sans source »). | 3 fenêtres, chiffres `#7fd4d9`, valeur `00` × 3, mesurées y 487..527 ; texte du panneau lu au crop `mesures/c_pann.png` (agrandi ×1,5). | — |

### MAJEUR

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F5` | MAJEUR | NOUVEAU | non | Le **cerne doré** qui encadre tout le panneau est absent (trait d'identité n° 1). | colonne du bord gauche : référence **1610 / 1610** px dorés (y 460..2070) ; jeu **0 / 1840** en x=22 **et** 0/1840 en x=46. | — |
| `F6` | MAJEUR | NOUVEAU | non | Le **filet doré de 2 px sous le titre** (`border-bottom` de l'enseigne) est absent — c'est l'accent doré le plus fort du contenu. | référence y 640..646 : **960 px** dorés par ligne, sur 4 lignes. Jeu, y 418→440 (12 lignes) : **0 px doré partout**. Contrôle négatif (référence y=750) : 0. | — |
| `F7` | MAJEUR | NOUVEAU | non | **Aucun liseré `#2a3648`** sur aucune boîte : enseigne, compteurs et panneau sont tous sans bordure. | bord haut des compteurs : référence **936 px** de `#2a3648` ; jeu **0** en y=459, 460 et 461. | — |
| `F8` | MAJEUR | NOUVEAU | non | Le **fond de page** passe d'un dégradé bleu-encre à halo chaud à un **aplat neutre**. | référence à x=540 : `#1e2124` (y 445) → `#242625` (666) → `#2c2a25` (810) → `#0f1619` (1615) → `#0b1016` (2090). Jeu : `#0d0d0d` **identique** à y = 250, 440, 700, 1000, 1400, 1700, 2140. | — |
| `F9` | MAJEUR | NOUVEAU | non | Les **trois fonds de boîte distincts** de la maquette sont remplacés par **un seul neutre** : perte de la différenciation et virage bleu → gris. | référence : enseigne `#0c121c`, compteur `#0b1119`, panneau `#101722` (bleu : b−r = 16, 14, 18). Jeu : `#16161c` pour **les trois** (b−r = 6). | — |
| `F10` | MAJEUR | NOUVEAU | non | **Or du titre : le mauvais jeton.** Le titre est **plus jaune** — `accentGold #ffd23f` là où l'art veut `hudMoneyGold #f2c96b`. | référence `#f2c96b` (242,201,107) ; jeu `#ffd240` (255,210,64). Δ par canal : **R +13, G +9, B −43** (tolérance 6/255). | — |
| `F11` | MAJEUR | NOUVEAU | non | **Le titre du panneau change de famille de couleur** : os → or. Il cesse d'être subordonné au titre de l'écran et devient le second point d'accroche. | référence `#eae0c8` ; jeu `#ffd240`. Δ : **R +21, G +18, B −136**. | — |
| `F12` | MAJEUR | NOUVEAU | non | **Les runs déclarés `700` (gras) rendent en graisse normale.** Écart **systématique et de même signe sur 4 mesures indépendantes** ⇒ une erreur de modèle (la graisse n'est pas appliquée), pas quatre erreurs. | taux d'encre de la bbox du **même glyphe** : `a` du titre de panneau 61,1 % → 46,0 % (**−24,8 %**) · `L` du titre 41,0 % → 32,2 % (**−21,4 %**) · `E` d'ÉTAPES 66,7 % → 42,0 % (**−36,9 %**) · `C` du chapeau 50,9 % → 36,4 % (**−28,4 %**). Confirmé au fût : `L` 12 px→7 px (fût/H 0,267→0,137), `E` 5→3 (0,278→0,136). | La sonde du fût sur le titre de panneau (`P` contre `J`) est **rejetée** : à mi-hauteur elle croise la panse du `P`. Seul le taux de remplissage vaut là. |
| `F13` | MAJEUR | NOUVEAU | non | **Les trois fenêtres de compteurs ne sont plus égales** — le rythme des trois égales est un trait d'identité. La largeur suit les libellés (chaînes fixes), donc l'écart ne dépend pas des données. | référence **313 / 313 / 313** px ; jeu **264 / 414 / 267** px (−15,7 % / **+32,3 %** / −14,7 %). Largeur totale conservée (980 → 988) : c'est la **répartition** qui est fausse. | — |
| `F14` | MAJEUR | NOUVEAU | non | **Substitution `#8a979c` → `#b9ad92`** (gris-bleu → os chaud) sur les libellés de compteur **et** le chapeau du panneau : une cause, deux endroits. | référence `#8a979c` aux deux ; jeu `#b9ad92` aux deux. Δ : **R +47, G +22, B −10**. | — |
| `F15` | MAJEUR | NOUVEAU | non | **Le corps du panneau est nettement plus gros**, avec un interligne plus serré. | hauteur du `l` initial (même lettre, même mot « la ») : **18 px → 25 px (+38,9 %)**. Pas de ligne : **33 px → 38 px (+15,2 %)** ⇒ interligne 1,40 → ≈ 1,16. Effet lisible : la référence loge **152 signes** en 2 lignes, le jeu **92**. | — |

### MINEUR

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F16` | MINEUR | NOUVEAU | non | Le **chapeau du panneau** cesse de lire comme une rubrique : plus gros et beaucoup moins espacé. | hauteur du `C` (même lettre) **16 → 21 px (+31,2 %)** ; interlettre / hauteur **0,521 → 0,250 (−52 %)**. | — |
| `F17` | MINEUR | NOUVEAU | non | **Boîtes plus grandes que leur contenu**, avec l'encre calée en haut et du vide en bas — même signature sur deux conteneurs. | fenêtre de compteur : h **114 → 158 px (+38,6 %)**, marge basse **18 → 55 px**. Panneau : h **240 → 332 px (+38,3 %)**, marge basse **37 → 117 px** (≈ 2,1 lignes de corps réservées et non remplies). | — |
| `F18` | MINEUR | NOUVEAU | non | Titre de l'enseigne : **plus haut et moins espacé** (les deux se compensent, la largeur totale ne bouge presque pas). | hauteur du `L` **45 → 51 px (+13,3 %)** ; interlettre / hauteur **0,414 → 0,324 (−22 %)** ; span 415 → 392 px (−5,5 %). | — |
| `F19` | MINEUR | NOUVEAU | non | Sous-titre de l'enseigne : plus haut, moins espacé. | hauteur de capitale **18 → 20 px (+11,1 %)** ; avance par signe / hauteur **1,333 → 1,039 (−22 %)**. | Les deux chaînes diffèrent (« OÙ EN EST CHAQUE ÉTAPE » / « LA FILIÈRE NE RÉPOND PAS ») : le mélange de lettres n'est pas identique, la mesure d'avance porte donc une part de bruit. |
| `F20` | MINEUR | NOUVEAU | non | Libellé de compteur : hauteur de capitale trop grande. | `E` d'« ÉTAPES » (même mot) **18 → 22 px (+22,2 %)**. | — |
| `F21` | MINEUR | NOUVEAU | non | **Apostrophe droite** (`'`) au lieu de l'apostrophe typographique (`’`) dans une copie française — 3 occurrences visibles (« n'a », « n'est », « c'est »). | crops `mesures/z_apostrophe.png` (jeu, ×4) et `mesures/z_apo_ref.png` (référence, ×5, « qu’elle ») : marque verticale droite contre virgule haute courbe. | — |
| `F22` | MINEUR | NOUVEAU | non | Le **guillemet fermant `»` passe seul à la ligne** : la ligne 2 du corps commence par « » : c'est… ». Espace insécable manquante avant le chevron fermant. | crop `mesures/c_pann.png` : ligne 1 finit par « …est vide », ligne 2 commence par « » : c'est ». | — |
| `F23` | MINEUR | NOUVEAU | non | Enseigne légèrement plus basse et plus large. | hauteur **167 → 160 px (−4,2 %)** ; largeur **980 → 988 px (+0,8 %)**. | — |
| `F24` | MINEUR | NOUVEAU | **oui** | Le **dénominateur « /4 »** du compteur du milieu est absent (la référence affiche « 01/4 », dans une graisse et une couleur secondaires). | référence : `<b>01<span>/4</span></b>` rendu ; jeu : « 00 » seul. | Je ne peux pas distinguer « le dénominateur n'est pas implémenté » de « il est masqué quand le total est nul ». |

**Compte : 4 BLOQUANT · 11 MAJEUR · 9 MINEUR = 24 findings.**
*(Le compte se prend ici, pas dans la synthèse.)*

---

## Table à part — écarts ASSUMÉS par le dossier

| assumé du dossier | observable ? | constat |
|---|---|---|
| étapes nommées « ÉTAPE 01 » et non « Le comptoir »… | **non** | aucune étape n'est dessinée (F2) — ni l'assumé ni sa sortie ne sont observables |
| pas de badge « écart » sur une étape | **non** | aucune étape dessinée |
| pas de compteur « écarts 00/01 » | **oui — SORT DE L'ASSUMÉ** | un compteur « **ÉCARTS 00** » est **affiché**. Le dossier écrit que ce qui le ferait sortir de l'assumé est « un compteur AFFICHÉ — il serait sans source ». Remonté en `F4`. |
| propretés PARTIAL / MOSTLY_CLEAN / CLEAN / CLEAN | **non** | aucune étape dessinée |
| cuve remplie par paliers 25/50/75/100 % | **non** | aucune cuve dessinée |
| « À demi propre » et non « à moitié » | **non** | aucun libellé de propreté dessiné |
| libellé de propreté manquant sur PARTIAL (⇒ défaut si repli visible) | **non** | aucun libellé dessiné — mais **aucun repli anglais ni clé brute nulle part** sur l'écran |
| cadre 138 non capturable | n/a | — |
| cadres 139/142 périmés (⇒ défaut si « ≥ 2 maillons cassés » affiché) | **oui — non déclenché** | aucun compte de maillons n'est affiché |

## Table à part — ARBITRAGES

| id | objet | constat | pourquoi ce n'est pas un défaut d'écran |
|---|---|---|---|
| `A1` | Anglais / format US dans le **chrome de la référence** (« HEAT », « $ 24 850 ») | noté **une fois** | ruling user 2026-09-02 « fr réel » : le client a raison (`CHALEUR`, `406 653,08 €`), **la maquette est en retard** |
| `A2` | Le CTA de la référence est **éteint** (« INJECTER — IMPOSSIBLE », « rien n'en crée jamais ») | la source actuelle (atelier `70c8f23`, l. 6331) porte déjà `<span class="cta6">INJECTER</span>` **actif** avec la note « depuis votre comptoir, vers une planque à vous » | le PNG de référence a été rendu au SHA `3c02f72`, **antérieur à la correction** ⇒ **référence à re-rendre**. N'excuse pas `F3` : la capture n'a **aucun** CTA, ni actif ni éteint, et aucun état de la maquette n'en est dépourvu |
| `A3` | Le texte du panneau de la référence (« CE QUE LA FILIÈRE NE DIT PAS » / « Jamais combien il y a dedans ») ne correspond plus à la source actuelle (« et c'est voulu » / « La propreté, jamais le montant ») | j'ai jugé contre l'**IMAGE**, comme le dossier l'impose | même cause qu'`A2` : la référence est un rendu antérieur |

---

## 5. Autres résolutions

**Non applicable, et c'est un manque du tour.** Le dossier ne fournit qu'**une** capture
(1080×2400). Le projet vise le téléphone portrait à deux résolutions ; le reflux, les coupes et les
débordements à une autre résolution ne sont donc **pas vérifiés** (voir § 6).

Ce que la résolution unique permet quand même d'affirmer : à 1080×2400, **rien n'est coupé, rien ne
déborde de son parent, rien ne passe sous le bandeau ni sous le dock** — le contenu vit entre
y = 267 et y = 2115, le bandeau finit à 142, l'encre du dock commence à 2179.

---

## 6. Non vérifié

1. **Une seule résolution.** Aucune capture 1080×1920 (ou autre) ⇒ reflux, coupe, débordement et
   conservation des proportions à une autre résolution : non mesurés. *Ce qui trancherait : une
   seconde capture, même état, à la deuxième résolution cible.*
2. **Aucune paire T / T+1 s** ⇒ la règle « un écran neuf est SANS animation » n'est pas vérifiable.
   ⚠️ À noter pour qui fournira la paire : **la maquette, elle, anime** — `.elast::after` porte
   `animation: bln6-scan 7.5s linear infinite` et `.veille6` porte `bln6-veille` (l. 6277-6279,
   6324). Un client animé serait donc conforme à la maquette **et** contraire au ruling : c'est un
   arbitrage à poser, pas une mesure. *Ce qui trancherait : deux captures du même état à 1 s
   d'intervalle, différence de pixels, chrome exclu.*
3. **L'état capturé n'a aucun témoin.** C'est un état d'**erreur** (« LA FILIÈRE NE RÉPOND PAS » /
   « Pas de réponse ») qui n'existe dans **aucun** des six cadres de la source. Je ne peux donc pas
   juger sa forme contre un homologue ratifié — j'ai comparé au cadre nominal (#137) et signalé,
   quand c'était pertinent, ce que les deux cadres d'état VIDE (#140, #141) dessinent à cet endroit
   (une boîte bordée avec un message italique centré). *Ce qui trancherait : rendre et ratifier un
   cadre « la route ne répond pas ».*
4. **Je n'ai pas pu re-mesurer la route.** Le seul fait dont je dispose est celui du dossier :
   `GET /v1/operational/laundering` → **200, 4 nœuds**, même compte, 2026-09-04 10:15:48, soit
   1 h 07 avant la capture. *Ce qui trancherait : rejouer la route sur ce compte — interdit ici, un
   gate E2E occupe la machine.*
5. **Forme du CTA actif** : non mesurable (référence rendue avec le CTA éteint, et aucun rendu
   Chrome autorisé). *Ce qui trancherait : re-rendre le cadre #137 de la source actuelle.*
6. **Famille de police du sérif.** La table `fc-match` du dossier ne couvre pas `'DejaVu Serif'`,
   que la CSS déclare pour le titre et le titre de panneau. J'ai mesuré que l'écart de proportion
   des glyphes s'explique par la **graisse** (F12, même signe 4/4) ; je ne peux pas exclure depuis
   une image une composante de **famille** en plus. *Ce qui trancherait : `fc-match 'DejaVu Serif'`
   sur la machine qui a rendu le PNG.*
7. **Cinq des neuf écarts assumés du dossier ne sont pas observables** parce qu'ils portent tous sur
   les étapes, et qu'aucune n'est dessinée (voir la table des assumés).
8. **Le chrome n'est pas jugé** (renvoi au canon du HUD par le dossier, et bandeau partiellement
   alimenté : JOUR = « — »). Observations non jugées, laissées à qui juge le chrome : l'indicateur
   actif du dock est sous **PLUS** et non sous **FILIÈRE** alors que le dock porte un onglet
   FILIÈRE (l'écran a été atteint par PLUS) ; les quatre pastilles du dock sont vides.
9. **Le rect imprimé par le test n'est pas fourni** (log non préservé). J'ai vérifié sur l'image ce
   qui était vérifiable de la géométrie dérivée (largeur 1080 ✓, bandeau 143 px mesuré = valeur
   dérivée ✓) ; le `scaleFactor` 0,84375 reste non vérifié.
10. **Je ne peux pas trancher entre « la requête a échoué » et « le compte a été vidé entre 10:15 et
    11:22 ».** Dans le second cas le message affiché serait quand même faux — le client distingue
    lui-même les deux (« Ce n'est pas « la filière est vide » »). Mais la cause reste indéterminée.

---

## Annexe 1 — Inventaire de la référence

**Couche globale.** Palette de la zone de contenu (`.bln6`, y 434..2096) : `#111823` 31,70 % ·
`#0b0e13` 16,29 % · `#10151d` 13,95 % · `#1a1e22` 10,69 % · `#7c775d` 8,54 % (l'encre) · `#0d1116`
8,37 % · `#14181b` 5,24 % · `#0f181f` 3,28 % — **toute la famille est bleu-encre** (b > r partout
sauf l'encre). Encre réelle (L > 40) : **14,09 %**. Fond en dégradé vertical avec halo chaud au
tiers supérieur (`#1e2124` → `#242625` → `#2c2a25` → `#0f1619` → `#0b1016`).

| id | catégorie | bbox (px) | h | forme / remplissage | texte |
|---|---|---|---|---|---|
| `P0.panneau` | panneau | x 3..1077, y 434..2096 | 1663 (= 462,0 CSS) | dégradé bleu-encre + halo chaud | — |
| `P0.cerne` | cadre | x 21..1059, y 452..2078 | 1627 | bordure **1 px `#b08d3e`**, rayon 3 CSS ; 1610/1610 px dorés en colonne | — |
| `P1.enseigne` | plaque titre | x 50..1030, y 481..647 | 167 | fond `#0c121c`, liseré `#2a3648`, **filet bas 2 px `#b08d3e`** (y 640..646, 960 px) | — |
| `P1.titre` | titre | x 326..740, y 511..560 | H(L) **45** | or **`#f2c96b`**, sérif **gras** (encre bbox 41,0 %) | « La filière » |
| `P1.sous-titre` | sur-titre | x 284..787, y 584..609 | H **18** | `#b9ad92`, très espacé (avance/H 1,333) | « OÙ EN EST CHAQUE ÉTAPE » |
| `P2.fen1..3` | compteurs | x 50..362 / 384..696 / 718..1030, y 679..792 | 114 | fond `#0b1119`, liseré `#2a3648` ; **3 × 313 px**, écarts 21/21 | — |
| `P2.chiffres` | chiffre | y 701..739 | H(0) **39** | teal **`#7fd4d9`**, gras | « 04 » « 01/4 » « 00 » |
| `P2.libellés` | libellé | y 757..774 | H(E) **18** | **`#8a979c`**, gras (encre 66,7 %) | « ÉTAPES » « PROPRE AU BOUT » « ÉCARTS » |
| `P3.elast` | boîte chaîne | x 50..1029, y 825..1596 | **772** | fond `#0d0f10`, liseré `#2a3648` | — |
| `P3.et6 #1..#4` | rangées | y 854..995 / 1036..1178 / 1218..1360 / 1401..1542 | **142/143/143/142** | fond `#111823`, liseré `#2a3648` ; x 82..1029 | « Le comptoir » … « Le notaire » |
| `P3.lien #1..#3` | connecteur | entre les rangées | **40 / 39 / 40** | trait vertical `#2a3648` | — |
| `P3.cuve #1..#4` | cuve | à gauche de chaque rangée | remplissage **21 / 42 / 63 / 84 px** = **25/50/75/100 %** | `#da4f45` · `#da8837` · `#cfad5e` · `#6b9a5d` | — |
| `P4.pann` | panneau éditorial | x 50..1030, y 1630..1869 | 240 | fond `#101722`, liseré `#2a3648` ; marges internes 26 / 37 | — |
| `P4.kicker` | chapeau | y 1659..1680 | H(C) **16** | **`#8a979c`**, gras, très espacé (interlettre/H 0,521) | « CE QUE LA FILIÈRE NE DIT PAS » |
| `P4.titre` | titre | y 1706..1752 | H(a) **26** | **os `#eae0c8`**, sérif gras (encre 61,1 %) | « Jamais combien il y a dedans » |
| `P4.corps` | texte | y 1773..1829 | H(l) **18**, pas de ligne **33** | `#b9ad92`, un mot en or `#f2c96b` | 2 lignes, 152 signes |
| `P5.cta` | bouton | y 1902..1995 | 94 | éteint : liseré `#2a3648`, texte gris, très espacé | « INJECTER — IMPOSSIBLE » |
| `P5.note` | note | y ≈ 2020..2040 | ≈ 20 | `#8a979c` + fragment or | « il faut une planque, et rien n'en crée jamais » |

## Annexe 2 — Inventaire de la capture

**Couche globale.** Palette de la zone de contenu (y 143..2160) : `#0d0d0d` **70,45 %** · `#16161c`
**27,72 %** · `#c8bd7f` 1,11 % · `#75694f` 0,41 % · reste < 0,15 % ⇒ **98,2 % de deux aplats
neutres**. Encre réelle (L > 40) : **1,58 %** (référence : 14,09 %). Fond **plat**, `#0d0d0d`
identique à y = 250, 440, 700, 1000, 1400, 1700, 2140.

| id | catégorie | bbox (px) | h | forme / remplissage | texte | vs référence |
|---|---|---|---|---|---|---|
| `C0.panneau` | panneau | — | — | **aucun** conteneur, aucun cerne | — | **ABSENT** (F5) |
| `C1.enseigne` | plaque titre | x 46..1033, y 267..426 | 160 | fond `#16161c`, **aucune bordure, aucun filet doré** | — | F6, F7, F9, F23 |
| `C1.titre` | titre | x 344..735, y 300..356 | H(L) **51** | **`#ffd240`**, sérif **graisse normale** (encre 32,2 %) | « La filière » | F10, F12, F18 |
| `C1.sous-titre` | sur-titre | x 302..779, y 371..396 | H **20** | `#b9ad92` | « LA FILIÈRE NE RÉPOND PAS » | F19 · état sans témoin |
| `C2.fen1..3` | compteurs | x 46..309 / 331..744 / 767..1033, y 460..617 | 158 | fond `#16161c`, **sans liseré** ; **264 / 414 / 267 px**, écarts 21/22 ; encre calée en haut (27 / **55**) | — | F13, F17, F7 |
| `C2.chiffres` | chiffre | y 487..527 | H(0) **41** | teal **`#7fd4d9`** ✓ | « 00 » × 3 | ÉGAL · F4, F24 |
| `C2.libellés` | libellé | y 540..562 | H(E) **22** | **`#b9ad92`**, graisse normale (encre 42,0 %) | « ÉTAPES » « PROPRE AU BOUT » « ÉCARTS » | F14, F12, F20 |
| `C3.vide` | — | x 0..1079, y 618..1783 | **1166** | **aplat parfait `#0d0d0d`**, min = max sur 1 258 200 px | — | **ABSENT** (F1, F2) |
| `C4.pann` | panneau éditorial | x 46..1033, y 1784..2115 | 332 | fond `#16161c`, sans liseré ; encre 1821..1998, **117 px morts en bas** | — | F7, F9, F17 |
| `C4.kicker` | chapeau | x 83..617, y 1821..1844 | H(C) **21** | **`#b9ad92`**, graisse normale, peu espacé (interlettre/H 0,250) | « CE QUE LE SERVEUR ENVOIE VRAIMENT » | F14, F12, F16 |
| `C4.titre` | titre | x 85..437, y 1864..1911 | H(a) **26** | **or `#ffd240`**, graisse normale (encre 46,0 %) | « Pas de réponse » | F11, F12 |
| `C4.corps` | texte | x 85..970, y 1928..1998 | H(l) **25**, pas de ligne **38** | `#b9ad92` | 2 lignes, 92 signes ; apostrophes droites ; `»` orphelin | F15, F21, F22 |
| `C5.cta` | bouton | — | — | **aucun** : 0 ligne d'encre entre y 2116 et 2178 | — | **ABSENT** (F3) |
| `—` | chrome (non jugé) | bandeau 0..142 ; manomètre en débord jusqu'à 204 ; losange doré 215..232 ; dock dès 2179 | — | ARGENT alimenté, **JOUR = « — »** ; actif du dock sous PLUS | — | non jugé |

## Annexe 3 — Correspondance des repères

| | référence | capture | rapport |
|---|---|---|---|
| échelle du **contenu** (imposée par le dossier) | 1080 px = 300 CSS ⇒ **×3,6** | 1080 px = 300 CSS ⇒ **×3,6** | **1,00** — comparaison px à px licite |
| vérification de l'échelle côté référence | `.bln6` déclaré `height:462px` | mesuré **1663 px = 462,0 CSS** | exact |
| vérification côté capture | bandeau dérivé du code : 52 CSS-HUD × 2,755 = **143 px** | mesuré **143 px** | exact |
| origine verticale du contenu | bas de la « barre » évoquée ⇒ panneau à y = **434** | bas du bandeau réel ⇒ y = **143** ; 1ʳᵉ boîte à **267** | offset, pas d'échelle |
| budget vertical du contenu | 1663 px (434 → 2096) | ≈ 2017 px (143 → ≈ 2160) | **+21 %** de place en jeu |
| chrome | non comparable (évocation à 300 CSS) | ×2,755 (`hud-brennar.html`, 392 CSS) | **non jugé** |

Toute mesure du § 3 est exprimée dans ces repères : les hauteurs et largeurs du contenu se
comparent directement en px ; les positions absolues, jamais.

## Annexe 4 — Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre, porte un contrôle positif et,
là où l'enjeu le mérite, un contrôle négatif.

| script | grandeur | contrôle positif | contrôle négatif |
|---|---|---|---|
| `m01_geometrie.py` | profil de luminance ligne à ligne | largeur = 1080 des deux côtés | y=5 ≠ y=1200 |
| `m02_bandes.py` | bandes dorées, bandes vides | référence y=452 → 1022 px dorés | capture y=1500 → 0 doré |
| `m03_boites.py` | scanlines H et V, bords de boîtes | cerne 452..2078 ⇒ 462 CSS | capture x=540, y 700..1700 : **aucune transition** |
| `m04_inventaire.py` | bbox des conteneurs, largeurs des fenêtres | — | boîte dans le vide → `(None, None)` |
| `m05_chrome_et_textes.py` | bandeau, dock, 1res hauteurs | bandeau mesuré = 143 = valeur dérivée | bande vide → « AUCUNE ENCRE » |
| `m06_couleurs.py` | médianes d'aplats, couleurs de glyphes | liseré = `#2a3648` exact ; titre réf = `#f2c96b` exact | fond enseigne vs fond de page : Δ = 15 |
| `m07_global.py` | palette, densité, contrastes WCAG | recalcul WCAG = valeur du tableau (11,92) | ratio d'une couleur avec elle-même = 1,00 |
| `m08_details.py` | bordures, encre réelle | référence : 960 px dorés sous l'enseigne | référence y=750 → 0 doré |
| `m09_typo.py` | découpage en glyphes (**partiellement rejeté**) | 9 groupes pour « La filière » | bande vide → aucun groupe |
| `m10_pann_compteurs.py` | lignes d'encre, marges internes | référence : 7 runs dans le panneau | vide → 0 ligne ; entre panneau et dock → 0 ligne |
| `m11_capheight.py` | hauteurs, **avec garde de coupe** | garde qui **a refusé 5 mesures sur 10** | bande vide → AUCUNE ENCRE |
| `m12_capheight2.py` | hauteurs sur glyphes homologues | garde de coupe, 3 refus | bande vide |
| `m13_typo2.py` | reprise de m09 et des refus de m12 | largeur du `L` reproduite (40 / 41 px) | bande vide → aucun groupe |
| `m14_chaine_et_vide.py` | chaîne de la référence, vide de la capture | 4 cuves = 4 couleurs et 4 hauteurs croissantes | **référence : min ≠ max** sur la zone homologue |
| `m15_graisse.py` | fût vertical (**ligne 2 rejetée**) | fût dans la bbox connue | hors glyphe → 0 px |
| `m16_graisse2.py` | graisse par taux de remplissage | `a` à 26 px des deux côtés ⇒ comparaison licite | bbox dans le fond → 0,0 % |
| `m17_losange.py` | ornement entre bandeau et enseigne | trouvé dans la capture | référence : « RIEN » |

**Deux mesures ont été RÉTRACTÉES par mes propres gardes, et il faut le dire :**

1. `m05` a mesuré la hauteur de capitale du titre de la capture à **35 px** dans une fenêtre qui en
   **coupait le pied** (fenêtre 270..340, le `L` va jusqu'à 355). J'allais rapporter « titre −22 % ».
   La garde de coupe de `m11` a refusé la mesure ; en fenêtre correcte le titre fait **51 px, soit
   +13,3 %** — l'écart est **de signe opposé**. C'est `F18` qui fait foi, pas la valeur de `m05`.
2. `m15` a mesuré le fût du titre de panneau en croisant la **panse du `P`** à mi-hauteur (résultat
   absurde : +139 %). La mesure valide est le taux de remplissage du **même glyphe** `a`, à hauteur
   **identique** des deux côtés (`m16`) : −24,8 %.



---

## Addendum orchestrateur — 2026-09-06 — findings « À REMESURER après recapture » (menu Plus non démonté, `15a0da7`)

Fait rapporté par `mafia-clean-city-f2` : depuis le 02/09, une destination ouverte depuis le menu « Plus » se montait
PAR-DESSUS le menu sans le démonter (`MountTenant` direct, rien ne démontait). Cette planche a été prise par ce chemin.
**Les findings suivants portent sur ce que le fond COMPOSITE montre, et un menu resté sous le voile pourrait y entrer** :
`F1`, `F8`, `F9` — marqués **À REMESURER après recapture**, **sans être retirés** (un finding retiré sur une
hypothèse est aussi faux qu'un finding inventé). Mesure de l'orchestrateur (`Tools/juge-visuel/mesurer-fantome-menu-plus.py`,
sortie dans `Tools/juge-visuel/fantome-menu-plus-2026-09-06.txt`) : aucune bande périodique du menu (pas 123 px) n'est
visible dans la zone libre de cette planche (autocorrélation ≤ +0,25 contre +0,90 sur le menu lui-même) — un texte
fantôme isolé n'est pas testé par cet instrument. Les autres findings ne dépendent pas du fond.
