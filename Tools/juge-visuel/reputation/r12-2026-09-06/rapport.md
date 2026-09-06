# Juge visuel ⊥ — ㊲ La réputation (« le miroir », `screen_b3`) — r12 — 2026-09-06

Planches : commit `fd0e21e`, cinq PNG, sha256 recomptés par `mesures/m00_empreintes.py` (identiques à `captures-provenance.md`).
Témoin de référence : **cadre #120 « Rien n'a encore déteint » (état VIERGE)** — choisi et **vérifié**
(4 pastilles éteintes des deux côtés, `00` / `00/4`, « Pas encore jugeable », « Rien n'a encore
déteint ») : `mesures/m33_pastilles_etat.py`.
Planche PRINCIPALE : `capture-1080x2400.png` (sous chrome).

## Verdict : **NON APPROUVÉ**

Le contenu de l'écran est, dans son détail, très proche de la maquette — couleurs identiques au
jeton près, capitales identiques, inventaire complet — mais **à 1080×1920 le seul bouton de
l'écran passe sous le dock et son libellé est amputé**, et deux effets (le halo des compteurs, la
coiffe du buste) ne sont toujours pas ceux du dessin.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

*(bords au cœur du trait, ≥ 3 px de toute frange ; toutes les valeurs produites par les scripts de
`mesures/`, chacun imprimant la taille des fichiers qu'il ouvre)*

| # | grandeur | référence | jeu (2400) | écart | script |
|---|---|---|---|---|---|
| 1 | hauteur du cadre, filet à filet | 1627 px | 1628 px | **+1 px** | `m01`,`m34` |
| 2 | carte portrait, filet or hors-tout | 82..505 = **424 px** | 78..502 = **425 px** | +1 px | `m38` |
| 3 | gouttière carte → tuiles | **36 px** | **36 px** | **0 px** | `m38` |
| 4 | marge tuile → bord droit du panneau élastique | **31 px** | **31 px** | **0 px** | `m38` |
| 5 | 10 aplats (cadre, élast, compteur, carte, panneau bas, CTA, enseigne, tuile, torse, peau) | — | — | **≤ 7/255, 8 sur 10 à ≤ 4** | `m27` |
| 6 | 6 jetons d'encre (or vif, or filet, cyan, crème, peau, vert) | — | — | **0 à 1/255** | `m27`,`m28` |
| 7 | couverture de 8 jetons sur toute la surface du cadre | — | — | **≤ 0,17 point** | `m28` |
| 8 | contraste WCAG de 10 textes sur 11 | — | — | **≤ 0,29** (titre 11,84 → 11,55) | `m28` |
| 9 | hauteurs de capitale : titre · paragraphe · « col ouvert » · CTA · « Il vous écoute » | 48 · 24 · 21 · 29 · 26 px | 48 · 24 · 21 · 29 · 26 px | **0 px** | `m23` |
| 10 | largeur d'encre du libellé CTA | 610 px | 607 px | −0,5 % | `m10` |
| 11 | axe du buste (peau · col · cou), relatif à la carte | 208,0 / 208,0 / 208,5 | 209,5 / 209,5 / 209,5 | **≤ 1,5 px** | `m19`,`m17` |
| 12 | yeux : écartement des centres · hauteur de la boîte | 49,5 px · 26 px | 50,5 px · 26 px | ≤ 1 px | `m20` |
| 13 | longueur de la bouche | 59 px | 59 px | **0 px** | `m20` |
| 14 | pastilles des 4 tuiles : diamètre · couleur | 25 px · (42,54,72) | 25 px · (42,53,73) | 0 px · 1/255 | `m33` |
| 15 | gouttières entre tuiles | 16 / 17 / 17 px | 17 / 17 / 18 px | ≤ 1 px | `m13b` |
| 16 | épaisseur de la ligne de balayage | 8 px | 8 px | **0 px** | `m14b` |
| 17 | rails **verticaux** du cadre | 3 px | 3 px | **0 px** | `m35a` |
| 18 | largeur max du torse · largeur du cou | 285 px · 54 px | 288 px · 56 px | +1,1 % · +3,7 % | `m21`,`m19` |
| 19 | couleur du cadran de la montre | (35,42,45) | (34,42,46) | **1/255** | `m22b` |
| 20 | luminance moyenne du cadre | 32,38 | 31,94 | **−1,4 %** | `m27` |
| 20b | densité d'encre (L>60) du cadre | 8,19 % | 9,17 % | +1,0 pt — *imputable au halo (`M1`)*, pas égal | `m27` |
| 21 | interligne du paragraphe du panneau bas | 33 / 33 px | 34 / 33 px | ≤ 1 px | `m12` |
| 22 | interligne des deux lignes d'une tuile | 35 px | 34 px | 1 px | `m29a` |
| 23 | hauteur du bandeau (filet bas) vs canon HUD | 141 px (canon ramené) | 141 px | **0 px** | `m32` |
| 24 | inventaire des parties | 1 enseigne · 1 filet or · 3 compteurs · 1 panneau élastique (carte + 4 tuiles + balayage + en-tête) · 1 panneau bas · 1 CTA | idem | **rien EN TROP, rien ABSENT** | `m05`,`m13b`,`m33` |

**Contrôle du contrôle** — l'instrument discrimine : les mêmes sondes rendent −22 % à −31 % sur le
gras sans-empattement (`m26`), +2,2× à +8,3× sur le halo (`m16`), 0/0 px de coiffe latérale
(`m18c`), 47 196 px mobiles sur la paire T/T+1 s (`m30`). Un instrument qui rendrait « tout égal »
serait suspect ; celui-ci sépare.

---

## 0. L'écran, tel que la maquette le dit

**But.** Le miroir. On ne vient pas y lire un score : on vient voir **ce que le lieutenant a absorbé
des règles qu'on lui a données**. Le portrait est l'objet ; tout le reste le commente.

**Ordre de lecture.** (1) « **Le miroir** » — or vif, 48 px de capitale, sérif, contraste 11,8:1,
seul texte doré de la moitié haute ; (2) les **trois compteurs cyan** (`00`, `00/4`, `00`) — la seule
couleur froide et la seule lueur de l'écran, alignés en rang ; (3) le **portrait**, encadré d'un filet
or qui en fait l'unique objet « précieux » de la page ; (4) les **quatre tuiles** d'indices, toutes
éteintes ; (5) le **verdict** en bas, sérif crème sur fond sombre ; (6) le **CTA** doré, dernier.

**Zones.** enseigne (titre + sous-titre) · filet or de séparation · rang de trois compteurs ·
panneau élastique (carte portrait à gauche + colonne de tuiles à droite, traversé par une ligne de
balayage teal) · panneau bas (kicker, verdict, paragraphe) · CTA.

**Traits d'identité.** ① un cadre or fin qui **enferme tout, CTA compris** ; ② le portrait à filet
or, buste plat au trait épais, coiffe qui **encadre** le visage ; ③ trois chiffres cyan à lueur
**serrée**, seule note froide ; ④ un balayage teal ténu qui traverse le tiers haut du panneau ;
⑤ une densité verticale forte — les blocs se touchent, rien ne flotte.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour l'essentiel, et à 1080×2400 il est franchement bon : le but est immédiat, l'ordre de
lecture est celui de la maquette, la palette est la même au jeton près, les textes sont en français
sans un seul repli anglais ni enum brut. Trois choses le trahissent.

**(1) La lueur des compteurs a changé de nature.** Ce n'était pas une lueur, c'était une ombre de
texte serrée autour des chiffres ; c'est devenu un **gros disque lumineux flou**, 2,2× plus fort au
contact et **8,3× plus fort à 20 px** (`m16`), qui déborde jusque dans le libellé en dessous. Sur
« ENFREINTES », où l'écran n'affiche qu'un tiret de 4 px, on voit une **boule** et non un trou. Le
trait ⓷ de l'identité est retourné : la note froide n'est plus fine, elle est baveuse — et le
contraste des chiffres tombe de **7,41:1 à 4,11:1**.

**(2) À 1080×1920, l'écran ne finit pas dans son cadre.** Le cadre se ferme **au-dessus** du CTA (il
l'enferme à 2400 et dans la maquette — trait ⓵ perdu), et surtout les quatre ronds du dock montent
**dans** le bouton : ils recouvrent **47 à 49 % de son filet bas** et rognent le bas des lettres —
« RÈGLE » finit amputé. Ce n'est pas un problème de place : le contenu mesure **1488 px pour
1539 px de zone libre**, il est simplement posé **107 px trop bas**. Un joueur en 16:9 voit son
unique action à moitié sous la barre d'onglets.

**(3) Le portrait n'est plus tout à fait le même homme.** La coiffe ne descend plus sur les tempes
(**19-20 px de cheveux en référence, 0 px en jeu** à 15 % de la hauteur du visage), son sommet est
plat au lieu d'être bombé, le visage est **8,7 % plus large** et **déborde** de la coiffe : sur
8 rangées le crâne touche le fond de la carte **sans aucun contour** — chose qui n'arrive jamais en
référence (`m37` : 0 rangée). Le col est **+28 %**, la montre **+11 %**, la bouche **−25 %** en
épaisseur. Aucun de ces écarts n'est énorme seul ; ensemble ils changent la lecture du visage.

Le reste tient : rythme vertical à quelques pixels près, tuiles au bon écart, aplats identiques,
balayage au bon tiers, contrastes conservés. Et deux dettes anciennes sont **refermées** : le
sous-titre affiché est bien la ligne canonique du cadre #120, et la mention « lieutenant.name — non
projeté (L0.4) » a disparu de la carte.

---

## 3. Écarts

Une ligne = un finding. `critère` : `DÉJÀ APPLIQUÉ` = la grandeur figure dans `grandeurs-r9-r11.md`
et l'écart revient ; `NOUVEAU` = grandeur ou instrument absent des tours précédents.
`données` : oui = l'écart dépendrait d'un autre compte ; non = géométrie / palette / typo / rythme.

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `B1` | **BLOQUANT** | NOUVEAU | non | **1080×1920 : le CTA passe sous le dock et son libellé est rogné.** Le contenu (cadre + CTA) va de y=250 à y=1737 ; la première encre du dock est à y=1684. | Zone libre 143..1681 = **1539 px** ; contenu **1488 px** ⇒ il TIENT, mais il est posé 107 px sous le bandeau ⇒ **débordement de 56 px**. Filet bas du CTA : **460/984, 464/982, 476/980 colonnes perdues (47 · 47 · 49 %)**. Encre du libellé : **7,2 %** des px repeints (>40/255), **27,3 %** modifiés (>25/255) ; 8 des 29 rangées de capitale dans les disques. (`m03`,`m07`,`m08b`,`m10`,`m35b`) | la zone TACTILE du dock (j'ai mesuré la première encre, pas le rect interactif) |
| `M1` | MAJEUR | NOUVEAU | non | **Le halo des compteurs est 2 à 8× trop fort et ~1,4 à 2,4× trop large** : ce n'est plus une ombre de texte serrée mais un disque flou, qui bave jusque dans le libellé. | Excès de luminance sur le fond, par distance de Chebyshev à l'encre — compteur 1, REF `d2:+29,7 d8:+15,0 d12:+10,2 d20:+2,7` ; JEU `d2:+66,6 d8:+40,8 d12:+31,6 d20:+22,8` (**×2,2 → ×8,3**). ENFREINTES (tiret de 4 px) : JEU `d2:+87,9 … d20:+41,8`. Décroissance à mi-hauteur : **d≈8 → d≈11,5** (compteur), **d≈8 → d≈19** (tiret). Contraste des chiffres **7,41:1 → 4,11:1** (fond local (33,54,62) → (57,95,100)). Nombres de px comparables à chaque distance (412/417, 400/405, 310/298…) ⇒ le détecteur n'est pas biaisé par la population. (`m16`,`m28`) | si l'excès vient d'un alpha trop haut ou d'un rayon trop grand — les deux bougent ensemble ici. La composition en LINÉAIRE côté client favorise le clair sur fond sombre : classe de cause plausible, non départageable sur ces images |
| `M2` | MAJEUR | NOUVEAU | non | **Le CTA sort du cadre en mode « élastique ».** À 2400 sous chrome il est DANS le cadre (comme la maquette) ; à 1920 et sur les DEUX planches « écran seul » le cadre se referme au-dessus de lui. | Filets or : REF cadre 452..2078, CTA 1952..2046 → **dedans**. C2400 cadre 482..2109, CTA 1989..2076 → **dedans**. C1920 cadre 250..1629, CTA 1650..1737 → **dehors**. S2400 cadre 730..2109, CTA 2130..2217 → **dehors**. Rail vertical or : 1620 px à 2400 contre **1372 px** partout ailleurs. (`m01`,`m03`) | pourquoi la même résolution (2400) donne deux structures selon la présence du shell |
| `M3` | MAJEUR | DÉJÀ APPLIQUÉ (r11 F22 : 339 px) | non | **1080×2400 (résolution cible) : 339 px de bande morte entre le bandeau et le cadre.** Le cadre plafonne à sa hauteur nominale et laisse le haut vide. | Bandeau bas 143 ; cadre 482..2109 (**1628 px**) ; première encre du dock 2179. Zone libre **2036 px** ⇒ le cadre occupe **80,0 %**, contre **97,5 %** dans la maquette (1627/1668). Gouttière haute **+339 px**, basse **+69 px**. (`m02`,`m35b`) | — |
| `M4` | MAJEUR | DÉJÀ APPLIQUÉ (r9 F8 · r11 F1) | non | **Le pied du panneau élastique reste vide à 2400** ; les deux colonnes ne finissent pas ensemble. **Fermé à 1920.** | Vide sous la 4ᵉ tuile : REF **167 px = 21,9 %** du panneau → JEU 2400 **246 px = 31,5 %** ; vide sous la carte **79 → 97 px**. Décomposition : panneau `.elast` 762 → **780 px (+18)**, pile de 4 tuiles 445 → **412 px (−33)**. À 1920 : panneau 673 px, vide sous les tuiles **140 px = 20,8 %**, vide sous la carte **1 px**. (`m13b`,`m36`) | — |
| `M5` | MAJEUR | DÉJÀ APPLIQUÉ (r11 F2) | non | **La coiffe n'encadre plus le visage** : elle ne descend pas sur les tempes, son sommet est plat, et le crâne sort du dessin sur 8 rangées **sans contour**. | Épaisseur latérale de sombre (cheveux + contour) accolée à la peau, par % de la hauteur du visage — REF `5 %:26/26 · 10 %:22/23 · **15 %:19/20** · 20 %:13/13 · 30 %:10/11 · 50 %:11/10` ; JEU `5 %:22/21 · 10 %:2/2 · **15 %:0/0** · 20 %:0/0 · 30 %:10/9 · 50 %:9/10`. Pincement du sommet (largeur / largeur max) : REF `4 px:38,5 % · 8:50,0 % · 16:63,5 % · 32:81,8 %` ; JEU `4:52,9 % · 8:64,5 % · 16:79,4 % · 32:95,5 %` (80 % du max atteint à **30 px** contre **17 px**). Rapport coiffe/visage **1,175 → 1,131**. **Rangées où la peau touche le fond sans contour : REF 0, JEU 8** (y 1136..1147 = 13 %..21 %). (`m18b`,`m18c`,`m37`) | — |
| `M6` | MAJEUR | DÉJÀ APPLIQUÉ (r11 F14 : −20 à −33 %) | non | **Le gras SANS-EMPATTEMENT reste 15 à 30 % plus maigre** ; le gras SÉRIF, lui, est refermé. La police est la **même des deux côtés** sur le sans (série 6 demande `'DejaVu Sans'`, le client embarque DejaVu Sans) ⇒ c'est un écart de graisse, pas une substitution. | Densité d'encre au cœur (seuil 75 %) / fût moyen — CTA caps **−20,6 / −22,6 %** · chiffres **−15,3 / −23,5 %** · sous-titre caps **−26,1 / −30,5 %** · libellé de compteur **−19,1 / −22,1 %** · « col ouvert » **−27,6 / −26,8 %**. **Témoins maigres** : paragraphe −10,9 / −8,7 %, sous-texte de tuile −5,3 / +12,7 %. **Sérif gras** : titre du panneau −2,5 / −1,9 %, « Le miroir » +5,1 / +1,9 %, « Il vous écoute » +3,0 / +3,6 %. (`m26`, corroboré par `m25`) | le sérif de la référence a été rendu par **Noto Serif** (`Georgia` → `fc-match`) et le client par DejaVu Serif ⇒ la comparaison de FÛT sur le sérif n'est pas opposable (voir ARBITRAGE R3) ; seul le sans est jugé ici |
| `M7` | MAJEUR | DÉJÀ APPLIQUÉ (r11 F4 : +28 %/+23 %) | non | **Le col (triangle) est +28 % / +23 %** et mord plus bas sur le cou. | Masque crème (234,224,200) ±6 : REF **61 × 61 px**, aire 1507 ; JEU **78 × 75 px**, aire 2303. Remplissage aire/boîte 0,405 → 0,394 (c'est toujours un triangle). Centre sur l'axe (208,0 → 209,5 rel carte). (`m17`,`m19`) | — |
| `M8` | MAJEUR | NOUVEAU (1ʳᵉ paire fournie) | **oui** | **L'écran n'est pas stable : entre T et T+1 s, le portrait descend de 24 px** parce que le nom du lieutenant arrive après coup. | 1080×1920 écran seul : **47 196 px** diffèrent (**2,276 %**) ; 43 870 à ≥ 8/255 ; 20 054 à ≥ 32/255 ; écart max **221/255** en (254,1057) (crème → fond de carte). Colonnes mobiles **x 147..433** — **0 colonne au-delà de x=530** (la colonne des tuiles, les compteurs, le panneau bas et le CTA ne bougent pas). Libellé de la carte : **1 ligne (703..718) → 2 lignes (703..719 + 727..741)**. Décalage du buste minimisant l'écart de profil : **+24 px** (résidu 1,59). (`m30`,`m31`) | avec **deux images à 1 s d'écart**, je ne peux pas distinguer un saut discret d'une interpolation ; ni savoir si le décalage se produit aussi sous chrome (la paire n'existe qu'en écran seul) |
| `m1` | MINEUR | DÉJÀ APPLIQUÉ (r11 F18 : +32,6 %) | non | **La ligne de balayage est ~34 % plus longue et atteint les deux bords du panneau.** | Excès de teal par rapport au fond local (y±25), au pic : REF 67,5 / JEU 55,0. Étendue à **25 % du pic** : REF x 240..857 = **618 px** → JEU x 137..967 = **831 px (+34,5 %)** ; à 10 % : 860 → 966 px. Épaisseur **8 px** des deux côtés. Position **31,4 % → 29,2 %** de la hauteur du panneau (tiers haut des deux côtés). (`m14b`,`m14c`) | — |
| `m2` | MINEUR | DÉJÀ APPLIQUÉ (r11 F17 : −8,9 %) | non | **Les tuiles sont 9 % plus courtes** ; le rembourrage interne a fondu, pas la typo. | Hauteur de tuile **99 / 99 / 98 / 99 → 90 / 89 / 90 / 90 px** ; pas haut-à-haut **115 / 116 / 115 → 107 / 107 / 108** ; gouttières **16/17/17 → 17/17/18** ; capitales 21 et 16-18 px des deux côtés. Largeur des tuiles **454 → 461 px (+1,5 %)**. (`m13b`,`m23`) | — |
| `m3` | MINEUR | DÉJÀ APPLIQUÉ (r9 F13 · r11 F7) | non | **La boîte du CTA est 7 px plus basse**, le texte identique. | REF **1952..2046 = 95 px** ; JEU **1989..2076 = 88 px** (**−7,4 %**). Libellé : largeur d'encre 610 → 607 px, capitale **29 px** des deux côtés. Filets 3 px des deux côtés. (`m10`) | — |
| `m4` | MINEUR | DÉJÀ APPLIQUÉ (r11 F6b : 42 → 35) | non | **L'interligne de l'en-tête de la colonne droite reste serré** (le paragraphe du panneau bas, lui, est conforme). | « Pas encore / jugeable » : lignes REF (891..917) et (933..967) → pas **42 px** ; JEU (910..937) et (946..981) → pas **36 px** (**−14,3 %**). Témoin : paragraphe du panneau bas 33/33 → 34/33. (`m29a`,`m12`) | l'interligne d'un texte sérif dépend de la police rendue (Noto Serif côté maquette) si la CSS ne le fixe pas — non départageable depuis l'image |
| `m5` | MINEUR | NOUVEAU | non | **L'aparté « ce qu'il a absorbé de vos règles » se replie sur 2 lignes au lieu de 3** (colonne droite plus large). | REF 3 lignes, pas **29 / 30 px** ; JEU **2 lignes**, pas 28 px. Tuiles 454 → 461 px, panneau élastique 978 → 986 px. (`m29a`,`m06`) | — |
| `m6` | MINEUR | DÉJÀ APPLIQUÉ (r11 F11 : −14 %) | non | **La bouche est plus fine** ; sa longueur est juste. | Trait interne au visage : REF x267..325 (**59 px**), y1196..1211 (**16 px**), encre **586 px** ; JEU x264..322 (**59 px**), y1228..1239 (**12 px, −25 %**), encre **403 px (−31 %)**. Épaisseur moyenne (aire/longueur) **9,9 → 6,8 px**. Centre identique à 1 px près. (`m20`) | — |
| `m7` | MINEUR | DÉJÀ APPLIQUÉ (r11 F12 : +11 %/+10 %) | non | **Le cadran de la montre est +11 % / +13 % et décalé de 8,5 px vers l'axe.** | Masque couleur exacte : REF **47 × 30 px**, aire 900 ; JEU **52 × 34 px**, aire 1230. Centre rel carte (104,0 ; 510,5) → (112,5 ; 509,5) ⇒ distance à l'axe du buste **104,5 → 97,0 px**. Couleur (35,42,45) → (34,42,46). (`m22b`) | — |
| `m8` | MINEUR | DÉJÀ APPLIQUÉ (r11 F19, partiellement refermé) | non | **Le cadre est 6 px plus large, colle 3 px plus près du bord, et son filet HORIZONTAL est 1 px plus épais** (les rails verticaux, eux, sont refermés à 3 px). | Hors-tout **1038 → 1044 px** ; marge écran **21 → 18 px** à gauche comme à droite ; rails verticaux **3 → 3 px** ; filets haut et bas **3 → 4 px**, mesuré à x = 200, 540 et 900. (`m34`,`m35a`) | — |
| `m9` | MINEUR | DÉJÀ APPLIQUÉ (r11 F13 : −6 px) | non | **Le bloc enseigne est ~7 px plus court** ; le filet or remonte d'autant, et toute la suite se décale. | Filet or sous l'enseigne, relatif au haut du cadre : **211..217 → 204..211**. Panneau de l'enseigne 29..211 → 31..204 (**182 → 173 px, −4,9 %**). Cascade : compteurs −4, `.elast` −4 en haut / +14 en bas, panneau bas +15, CTA +9. (`m05`) | — |
| `m10` | MINEUR | DÉJÀ APPLIQUÉ (r9 F9 : +9,5 %) | non | **Le visage est 8,7 % plus large** pour un dessin de hauteur voisine — la transformation n'est pas homothétique. | Largeur max de la peau **126 → 137 px (+8,7 %)** ; hauteur du visage **134 → 140 px (+4,5 %)** ; largeur du cou 54 → 56 px ; largeur max du torse 285 → 288 px (**+1,1 %**). (`m18a`,`m18b`,`m21`) | — |
| `m11` | MINEUR | NOUVEAU | non | **Chrome partagé** — le libellé « ARGENT » est plus haut et moins interlettré qu'au canon HUD, et la barre d'argent n'a plus de reliquat. | Canon ramené à l'échelle capture (×0,9184) : largeur **116 px**, capitale **17,4 px**, 6 groupes de lettres. Capture : largeur **107 px (−7,5 %)**, capitale **19 px (+8,9 %)**, 6 groupes. Barre : reliquat gris visible au canon, absent en jeu. (`m32`) | le rééchantillonnage du canon (1176 → 1080) introduit ±2 % ; **le chrome n'est pas propre à ㊲** |
| `m12` | MINEUR | NOUVEAU | oui | **Chrome partagé** — l'aile droite ne porte qu'UNE ligne de texte là où le canon en porte deux : **aucune heure n'est affichée**. | Canon : lignes d'encre à y 43..66 (« JOUR 12 · SOIRÉE ») et **77..107 (« 21:40 », capitale 31 px)**. Capture : **une seule** ligne à y 28..48 (« JOUR 50 ») ; la 2ᵉ ligne est un tiret de **3 px × 35 px** à y 87..89. Filet du bandeau au bon endroit (141 px des deux côtés). (`m32`) | si la 2ᵉ ligne du client est la PHASE (couverte par l'ASSUMÉ A7) ou l'HEURE — l'image ne le dit pas ; le canon met l'heure à cette place |

---

## Écarts ASSUMÉS — vérifiés « rendus proprement »

| # | l'assumé | ce que je mesure | dans le périmètre ? |
|---|---|---|---|
| `A1` | compteur ENFREINTES à « — » | tiret **48 × 4 px**, couleur **(127,212,217)** = le jeton cyan des chiffres à **0/255** ; centré à x=875,5 pour une boîte centrée à 875,0 ; centre vertical à **+4,5 px** de celui des chiffres (`m29b`) | **OUI** — même couleur, même position. ⚠️ mais le halo surdimensionné (`M1`) en fait une **boule lumineuse** : le trou se lit comme un voyant, pas comme un trou |
| `A2` | col rendu par un TRIANGLE plein, sans liseré | remplissage aire/boîte **0,394** (réf 0,405) — loin des ~0,9 d'une boîte pleine ; centré sur l'axe du cou (209,5 vs 209,5) ; recouvrement du cou 22 px contre 20 px en référence (`m17`,`m19`) | **OUI** — c'est bien un triangle, centré, et il ne recouvre pas le cou plus qu'en référence. *(sa TAILLE, elle, sort de l'assumé : `M7`)* |
| `A3` | le reflet du miroir est FIXE | ligne de balayage présente à **29,2 %** de la hauteur du panneau (tiers haut ✓) ; entre T et T+1 s, **0 colonne mobile au-delà de x=530** alors que la ligne s'étend de x=54 à x=1025 ⇒ **elle ne bouge pas** (`m14b`,`m31`) | **OUI** |
| `A4` | 4 couleurs hors `DesignTokens` | les couleurs RENDUES sont celles de la maquette : 10 aplats à **≤ 7/255**, 6 jetons d'encre à **0-1/255** (`m27`,`m28`) | **OUI** |
| `A5` | nom du lieutenant = celui du compte | la carte porte **« LT. TULL, VOTRE LIEUTENANT »** ; la mention « lieutenant.name — non projeté (L0.4) » de la référence est **ABSENTE** de la capture ; aucun « SALVATORE » en dur (`m12`) | **OUI** ⚠️ mais à l'instant T le nom n'est pas encore là (`M8`) |
| `A6` | pas de section « gages » | aucun bloc supplémentaire ; **aucun liseré** entre le bas de la 4ᵉ tuile (rel 927) et le bas du panneau (rel 1173) ⇒ pas de place réservée vide (`m13b`) | **OUI** |
| `A7` | tiret « — » à la place de la PHASE | ARGENT alimenté (« 9 627 820,00 € »), JOUR alimenté (« JOUR 50 »), médaillon alimenté (« Brûlant / CHALEUR » + aiguille) ⇒ aucun des cas de sortie (`m32`) | **OUI** |
| `A8` | ronds du dock sans icône | 4 anneaux vides, aucun coupé, aucun libellé de repli (EMPIRE · FAMILLE · FILIÈRE · PLUS) à 2400 ; **soulignement or de 38 px à x 802..839**, c.-à-d. sous le 4ᵉ onglet PLUS, aux DEUX résolutions (`m35b`, `m00`) | **OUI** à 2400. ⚠️ à 1920 ils recouvrent le CTA — c'est `B1`, pas l'arbitrage |
| `A9` | roster / règles / chiffres non comparables | aucun slug, aucune clé brute, aucun mot anglais, aucun nom vide sur l'écran ; tous les textes en français | **OUI** |

---

## ARBITRAGES

| # | objet | mesure / raison |
|---|---|---|
| `R1` | **résolutions cibles (16:9)** — le dossier demande de classer ARBITRAGE « si le cadre élastique ne ferme pas » le cas 1920 | **Il le ferme, et ce n'est donc pas un arbitrage.** Mesuré : le contenu à 1920 fait **1488 px** pour **1539 px** de zone libre — il TIENT ; le panneau élastique a bien rétréci (780 → 673 px) et le vide de pied y est même **correct** (20,8 % contre 21,9 % en référence). Ce qui échoue est le **placement vertical** (107 px de gouttière haute pour 51 px de marge). ⇒ remonté en `B1`, pas ici |
| `R2` | ronds du dock sans icône | arbitrage user connu (« j'aime pas les icônes ») — une ligne, jamais un écart d'écran |
| `R3` | **police sérif** | la série 6 demande `Georgia,serif` (69 règles) ⇒ `fc-match Georgia` → **Noto Serif** ; le client embarque **DejaVu Serif**. Toute différence de FAMILLE ou de chasse sur le sérif (« Le miroir », « Pas encore jugeable », « Rien n'a encore déteint », « Il vous écoute ») est un arbitrage. Les **hauteurs de capitale**, elles, sont comparées et **égales** (48/48, 39/38, 26/26). Le sans-empattement, lui, est `'DejaVu Sans'` des deux côtés (67 règles) ⇒ `M6` est opposable |
| `R4` | **libellés de la RÉFÉRENCE en retard** | la maquette affiche « $ 24 850 » et « HEAT » ; le client affiche « 9 627 820,00 € » et « CHALEUR ». Ruling « fr réel » 2026-09-02 : **le client a raison, la maquette est à mettre à jour**. Noté une fois, jamais compté en écart |
| `R5` | **couvre-chef** | ne s'applique PAS ici : la source du buste (`generateur-reputation.py:136`) dessine des **cheveux** (`M18 26 C19 14 25 10 31 10 C38 10 44 15 44 26 C40 20 36 21 31 21 C26 21 21 21 18 26 Z`), pas un `fedora` ni une `casquette` — `grep -i "fedora\|casquette\|capuche"` rend **0** dans le générateur et dans `chassis6.py`. ⇒ `M5` est un écart de dessin, pas un arbitrage de DA |
| `R6` | **anneau rouge du manomètre** | le canon HUD montre un anneau **or** à « 37 % / tiède » ; la capture montre un anneau **rouge** à « Brûlant ». Les deux planches ne sont pas dans le même état de chaleur ⇒ **non opposable** ; si la couleur encode le palier, c'est un choix de DA (voir aussi « non vérifié ») |

---

## Les grandeurs de r9 / r11, retrouvées ici — égales ou non

| grandeur (source) | r9 / r11 | r12 (2400) | statut |
|---|---|---|---|
| hauteur du cadre (r9 #1 · r11 P1) | 1626 / 1627 px | **1627 → 1628** | **ÉGAL** |
| carte portrait (r9 #2 · r11 P3) | 424 / 425 px | **424 → 425** | **ÉGAL** |
| gouttière carte → tuiles (r9 #3 · r11 P5) | 37 / 37 px | **36 → 36** | **ÉGAL** |
| axe du buste (r9 F2, −11,7 px → r11 P4, fermé) | ≤ 0,5 px | **≤ 1,5 px** | **RESTE FERMÉ** |
| aplats (r9 #14 · r11 P7) | ≤ 6/255 | **≤ 7/255**, 8/10 à ≤ 4 | **ÉGAL** |
| contrastes WCAG (r11 P8) | ≤ 0,38 | **≤ 0,29 sur 10 textes** ; chiffres cyan **−3,30** | **ÉGAL sauf les chiffres** (cause : `M1`) |
| couverture de palette (r9 #15 · r11 P9) | ≤ 0,4 pt / ≤ 0,15 pt | **≤ 0,17 pt (8 jetons)** | **ÉGAL** |
| sous-titre : couleur · capitale (r11 P10) | 0/255 · 0 px | **0/255 · 17 → 18 px** | **ÉGAL** |
| chiffres : capitale · couleur (r11 P11) | 37 px · 0/255 | **38 → 38 px · 0/255** | **ÉGAL** |
| interligne du paragraphe (r11 P12, fermé) | 1 px | **≤ 1 px** | **RESTE FERMÉ** |
| tuiles : largeur · gouttières (r11 P13) | +1,5 % · 17/14/15 | **+1,5 % · 17/17/18** | **ÉGAL** |
| longueur de la bouche (r11 P14, fermé) | 0,03 u | **59 → 59 px** | **RESTE FERMÉ** |
| torse : largeur max (r11 P15) | +0,26 % | **+1,1 %** | **ÉGAL** |
| position du balayage (r11 P16) | 30,8 → 28,6 % | **31,4 → 29,2 %** | **ÉGAL** |
| boîtes des compteurs (r11 P17) | 312 px · écarts 23/25 | REF 310 · 310 · 310 → JEU 313 · 312 · 313 px ; écarts 24 → 24 px | **ÉGAL** (+1,0 %) |
| titre « Le miroir » (r9 #6 · r11 P18) | +1,2 % · −4,2 % | **+1,0 % · 0,0 %** | **ÉGAL, amélioré** |
| inventaire (r9 #20 · r11 P19) | rien en trop / absent | **idem** | **ÉGAL** |
| capitales des tuiles (r11 P20) | 21 · 15 px | **21 · 16-18 px** | **ÉGAL** |
| gouttière basse cadre → dock (r11 P2 : 70 px) | 70 px | **2400 : 69-71 px** · **1920 : le CTA la traverse** | **RÉGRESSÉ à 1920** (`B1`) |
| **r9 F1** (le paragraphe nie les voyants : 2 tuiles allumées) | tuiles 1 et 3 `.on` | **les 4 tuiles ÉTEINTES**, pastille (42,53,73) = celle de la réf | **FERMÉ** |
| **r9 F12** (le sous-titre n'est aucune des 6 lignes) | 0/0/0 au grep | « UN LIEUTENANT NEUF N'A ENCORE RIEN ABSORBÉ » = la ligne de #120, `grep` **1 hit** dans `ecrans-brennar-6.html:6005` et `generateur-reputation.py:185` ; contrôle négatif « personne ne vous a encore » **0 hit** dans le HTML | **FERMÉ** |
| **r9 F11** (fond du cadre : dégradé monotone) | 22·21·20·19·18·16·15·15·17·18·18 vs 22·21·21·21·20·19·19·19·18·17·17 | non remesuré ce tour | **NON REJUGÉ** |
| **r9 F10 / r11 P6** (padding `.elast` asymétrique, 30 vs 23 px) | 30 → 23 px | **31 → 31 px des deux côtés** | **FERMÉ** |
| **r9 F5 / r11 F5** (halo de pastille / lueur des chiffres ABSENTE) | +0,00 à toute distance | **+66,6 à d2, +22,8 à d20** | **FERMÉ → SUR-CORRIGÉ** (`M1`) |
| **r11 F15** (1920 : le cadre déborde SOUS le bandeau, −141 px) | −141 px, rail invisible sur 140 px | **gouttière haute +107 px**, rail or intact | **FERMÉ** |
| **r11 F16** (1920 : le titre illisible, 41 % des colonnes recouvertes) | 0 % intact, contraste 2,45:1 | titre entier, capitale 48 px, contraste **11,55:1** | **FERMÉ** |
| **r11 F2** (calotte, 6 nombres) | ép. latérale 21 → 1 px | **19-20 → 0 px** | **OUVERT** (`M5`) |
| **r11 F14** (gras −20 à −33 %) | −12,5 à −33 % | sérif **−2,5 à +5 %** · sans **−15 à −30 %** | **MOITIÉ FERMÉ** (`M6`) |
| **r11 F1 / r9 F8** (vide du pied) | 167 → 245 px (31 %) | **167 → 246 px (31,5 %)** à 2400 ; **20,8 %** à 1920 | **OUVERT à 2400** (`M4`) |
| **r11 F4** (col +28 %/+23 %) | +28 % / +23 % | **+28 % / +23 %** | **OUVERT** (`M7`) |
| **r11 F11** (bouche −14 %) | −14 % | **−25 %** | **OUVERT** (`m6`) |
| **r11 F12** (gant +11 %/+10 %, +7,5 px) | +11 % / +10 % | **+11 % / +13 %, +8,5 px** | **OUVERT** (`m7`) |
| **r11 F7** (CTA −7,4 %) | 95 → 88 px | **95 → 88 px** | **OUVERT** (`m3`) |
| **r11 F13** (enseigne −6 px) | 189 → 183 px | **182 → 173 px** | **OUVERT** (`m9`) |
| **r11 F17** (tuiles −8,9 %) | 101 → 92 px | **99 → 90 px** | **OUVERT** (`m2`) |
| **r11 F18** (balayage +32,6 %) | 668 → 886 px | **618 → 831 px (+34,5 %)** | **OUVERT** (`m1`) |
| **r11 F19** (cadre +6 px, filet 3 → 4) | +6 px, filet 3 → 4 | **+6 px** ; rails verticaux **3 → 3**, filets horizontaux **3 → 4** | **PARTIELLEMENT FERMÉ** (`m8`) |
| **r11 F22** (2400 : 339 px de vide en haut, 80,0 %) | 339 px, 80,0 % | **339 px, 80,0 %** | **OUVERT** (`M3`) |
| **r11 F6b** (en-tête droit serré, 42 → 35) | −16,7 % | **42 → 36 px (−14,3 %)** | **OUVERT** (`m4`) |

---

## Animation — la paire T / T+1 s

Instrument : `mesures/m30_animation.py` puis `m31_animation_detail.py`, sur
`capture-ecran-seul-1080x1920-T.png` (sha256 `f1aaf047c6af8f3e…`) et `…-T+1s.png`
(sha256 `2d799d02efb46e65…`), même run, même résolution, **aucun chrome à exclure** (les deux
planches sont sans shell).

```
px dont un canal diffère de >=  1/255 :  47 196   (2,27604 %)
px dont un canal diffère de >=  8/255 :  43 870   (2,11564 %)
px dont un canal diffère de >= 32/255 :  20 054   (0,96711 %)
écart maximal : 221/255 en (254,1057)  (234,224,200) -> (13,22,34)
colonnes qui bougent : x 147..433   (0 au-delà de x=530)
```

**Ce que ça dit.** Le mouvement est entièrement dans la **carte portrait**. Ce n'est pas une
animation décorative : le libellé passe de **« VOTRE LIEUTENANT »** (1 ligne, y 703..718) à
**« LT. TULL, VOTRE LIEUTENANT »** (2 lignes, y 703..719 + 727..741) — le nom du lieutenant arrive
après la première frame — et la ligne supplémentaire pousse le buste de **+24 px** vers le bas.
Tout le reste de l'écran (compteurs, tuiles, balayage, panneau bas, CTA) est **identique à
l'octet**.

**Contrôle positif de l'instrument** : la même comparaison entre T et la planche SOUS CHROME rend
52 288 px différents sur un échantillon au 1/9 ⇒ l'instrument ne rend pas « zéro » par construction.

⇒ classé `M8`. Le ruling « aucune animation » n'est pas enfreint au sens d'un tween décoratif, mais
**l'écran n'est pas stable à l'affichage** et le joueur voit le portrait sauter d'un cran.

---

## 5. Autres résolutions

**`capture-1080x1920.png` (sous chrome).**
Ce qui TIENT : le cadre ne passe plus sous le bandeau (gouttière **+107 px** ; r11 F15 fermé), le
titre est entier et lisible (contraste **11,55:1** ; r11 F16 fermé), le panneau élastique rétrécit
correctement (673 px) et le **vide de pied redevient juste** (140 px = **20,8 %**, contre 21,9 % en
référence), les tuiles gardent exactement leurs proportions relatives (rel 515..926 contre 516..927
à 2400), la carte perd 11 px seulement.
Ce qui NE tient PAS : **`B1`** (le CTA sous le dock, 56 px de débordement, 47-49 % du filet bas
masqué, 7,2 % de l'encre du libellé repeinte) et **`M2`** (le CTA hors du cadre).

**`capture-ecran-seul-1080x2400.png`.** Sans shell : ni bandeau ni dock (vérifié — aucune ligne
pleine largeur à y=141, aucune encre sous le cadre hors CTA). Le cadre y fait **1380 px** (contre
1628 px à la même résolution SOUS chrome), il est posé à y=730 — **730 px de vide au-dessus** — et
le CTA est **hors du cadre** (2130..2217). Deux structures pour une même résolution : `M2`.

**`capture-ecran-seul-1080x1920-T.png` / `-T+1s.png`.** Sans shell ; même géométrie que la planche
sous chrome (cadre 250..1629, CTA 1650..1737) ⇒ **elles confirment que le CTA est bien à
1650..1737 et que c'est le dock qui vient dessus**. La planche T montre l'état **avant** l'arrivée
du nom (« VOTRE LIEUTENANT ») — à ne pas prendre pour témoin de l'état nominal.

---

## 6. Ce que je n'ai pas pu vérifier

1. **Les VALEURS** (roster, nom du lieutenant, compteurs, montant d'argent, jour). Base
   post-campagne (empreinte 72 155), aucun corps réel comparable, et **la ligne
   `[DemoIdentityResolver] régime=env identité=…` n'est pas jointe** au dossier ⇒ je ne peux pas
   certifier quel compte a été photographié. Seule la FORME est jugée. *Mesure qui trancherait :
   joindre la ligne du journal du run.*
2. **Couverture publiée par la ligne GO** — je recopie le dénominateur tel quel :
   `(c) onglet actif asserté 7/16` → **inconnu pour ㊲** (je MESURE un soulignement or de 38 px à x 802..839 sous « PLUS » dans les deux planches sous
   chrome — mais c'est une observation d'image, pas une assertion de test) ;
   `(d) [CHROME-ALIMENTE] par planche 3/16` → **inconnu pour ㊲** (le bandeau EST alimenté sur
   l'image) ; `(g) SHA de l'arbre imprimé au run 0/16` → **non imprimé** ; `(e)` (blob ≠ précédent,
   descendance de `89231b3`/`4f8e1ae`) → **vérifié par l'orchestrateur, pas par moi**.
3. **Le rect imprimé par le test** n'existe pas (log non préservé). J'ai vérifié la géométrie sur
   l'image (bandeau = 1080 px de large, filet bas à y=141 des deux côtés, identique au canon ramené
   à l'échelle) avant de m'en servir.
4. **Tween ou saut ?** Deux images à 1 s d'écart ne le disent pas (`M8`). *Mesure qui trancherait :
   trois captures à 0 / 100 / 300 ms.*
5. **La paire T/T+1 s n'existe qu'en écran SEUL** : je ne sais pas si le décalage de 24 px se
   produit aussi sous chrome.
6. **L'anneau rouge du manomètre** : le canon HUD est dans un autre état de chaleur (37 % « tiède »,
   anneau or) que la capture (« Brûlant », anneau rouge) — non homologue, donc non jugeable.
   *Mesure qui trancherait : un canon HUD au même palier, ou la table palier → couleur.*
7. **La 2ᵉ ligne de l'aile droite** : phase (couverte par `A7`) ou heure (`m12`) ? L'image ne le
   dit pas ; le canon met l'heure à cette place. *Mesure qui trancherait : le gabarit du bandeau.*
8. **La zone TACTILE du dock** : j'ai mesuré la première encre (y=1684 à 1920), pas le rectangle
   interactif — le recouvrement fonctionnel peut être plus grand encore.
9. **r9 F11 (fond du cadre : dégradé monotone vs taille sombre + pied qui remonte)** : non remesuré
   ce tour, faute de temps d'instrument ; reste **NON REJUGÉ**.
10. **La cause du halo** (`M1`) : alpha trop haut ou rayon trop grand — les deux varient ensemble
    sur ces images. La composition **linéaire** du client contre le sRGB du navigateur va dans le
    sens observé (le clair gagne sur fond sombre), mais je ne peux pas l'isoler ici.
    *Mesure qui trancherait : deux captures ne différant que par le rayon.*
11. **Le fût sérif** (`M6`) n'est pas opposable : la référence a été rendue par **Noto Serif**, le
    client embarque DejaVu Serif (`R3`). Seul le sans-empattement, identique des deux côtés, est
    jugé.
12. **Chrome** : `m11` et `m12` reposent sur un rééchantillonnage du canon (1176 → 1080, ×0,9184),
    qui vaut ±2 % ; et le chrome est **partagé**, pas propre à ㊲.
13. **Deux résolutions seulement** (1920 et 2400) ; rien n'est dit des autres formats.

---

## Annexes

### 1. Correspondance des repères

| | référence | capture 2400 | rapport |
|---|---|---|---|
| échelle du CONTENU | ×3,6 (300 CSS = 1080 px) | ×3,6 | **1,00** |
| vérifié indépendamment | carte 424 px · titre 48 px · paragraphe 24 px · pastille 25 px · peau (185,173,146) | 425 px · 48 px · 24 px · 25 px · (185,173,146) | ≤ 0,3 % |
| origine du cadre (coin extérieur du filet or) | (21, 452) | (18, 482) | **Δx = −3, Δy = +30** |
| dérive interne | le décalage reste à +2/−4 px jusqu'aux compteurs, puis **+14 à +15 px** à partir du bas du panneau élastique (cause : `m9` et `M4`) | | |
| chrome | **non** à cette échelle : ×2,755 px/CSS ; jugé contre `hud-canon-1176.png` (×3), facteur canon → capture **0,9184** | | |

### 2. Conventions déclarées

- **Bord** : mesuré au **cœur** du trait — pixel dont la couleur est celle du jeton à ±3/255, jamais
  la frange d'anti-crénelage. Les aplats sont pris en **médiane** d'une fenêtre ≥ 10×10 à ≥ 6 px de
  tout bord.
- **Boîtes de texte** : bbox de l'**encre**, seuil = fond (20ᵉ centile) + 45 % de l'amplitude ;
  « fût » et « densité au cœur » au seuil **75 %**.
- **Buste** — masques par couleur exacte : peau `(185,173,146)`, crème `(234,224,200)`, coiffe
  `(22,25,27)` / `(22,22,28)`, contour `(11,16,22)` / `(13,14,23)`, cadran `(35,42,45)` /
  `(34,42,46)`, tolérance 3 à 6/255. **Axe** = centre des bbox de la peau, du col et du cou (trois
  masques indépendants). **Calotte** = épaisseur du sombre **accolé** à la peau, mesurée séparément
  à gauche et à droite, à 5/10/15/20/30/50/70 % de la hauteur du visage ; **pincement** = largeur de
  la coiffe à n px sous son sommet ÷ sa largeur maximale. **Épaules** = largeur du masque « torse »
  par rangée. Les bornes du visage (REF 1099..1232, JEU 1118..1257) sont **lues sur le profil de
  largeur de la peau**, jamais déduites.
- **Halo** : excès de luminance sur le fond du bloc, par **distance de Chebyshev** à l'encre, avec
  le nombre de pixels de chaque anneau imprimé (populations comparables des deux côtés).

### 3. Inventaire de la référence (couche globale)

Palette du cadre (8 jetons balayés) : or vif 0,64 % · or filet 2,28 % · cyan 0,22 % · crème 0,44 % ·
peau 1,58 % · vert 0,08 % · crème texte 0,43 % · gris muet 0,54 %. Luminance moyenne **32,38**,
densité d'encre (L>60) **8,19 %**. Rythme vertical (relatif au haut du cadre, h=1626) : enseigne 29,
filet or 211..217, compteurs 251..361, panneau élastique 398..1159 (carte 425..1080, tuiles
548..992, balayage 637), panneau bas 1195..1466, CTA 1500..1592.

### 4. Inventaire de la capture (couche globale, 2400)

Mêmes jetons : 0,52 · 2,11 · 0,11 · 0,48 · 1,58 · 0,08 · 0,46 · 0,50 %. Luminance **31,94**, densité
**9,17 %** (l'excédent d'encre vient du halo, `M1`). Rythme (h=1627) : enseigne 31, filet or 204..211, compteurs 247..357, panneau élastique
394..1173 (carte 423..1076, tuiles 516..927, balayage 622), panneau bas 1210..1472, CTA 1507..1594.

### 5. Scripts

`mesures/lib.py` (bibliothèque) · `m00_empreintes.py` · `m01_cadre.py` · `m02_gouttieres.py` · `m03_cta_dock.py` ·
`m04_rythme.py` · `m05_blocs.py` · `m06_horizontal.py` · `m07_dock_recouvrement.py` ·
`m08_cta_libelle.py` · `m08b_cta_texte.py` · `m09_occlusion.py` · `m10_cta_detail.py` ·
`m11_gras.py` · `m12_lignes_texte.py` · `m13_elast.py` · `m13b_tuiles.py` · `m14_balayage.py` ·
`m14b_balayage.py` · `m14c_balayage.py` · `m15_lueur.py` · `m16_halo_compteurs.py` ·
`m17_buste_masques.py` · `m18_calotte.py` · `m18b_calotte.py` · `m18c_coiffe_laterale.py` ·
`m19_buste_pieces.py` · `m20_visage_traits.py` · `m21_torse_montre.py` · `m22_montre.py` ·
`m22b_montre.py` · `m23_typo.py` · `m24_profils_texte.py` · `m25_gras.py` · `m26_gras_coeur.py` ·
`m27_couleurs.py` · `m28_jetons_contraste.py` · `m29_entete_tiret.py` · `m30_animation.py` ·
`m31_animation_detail.py` · `m32_chrome.py` · `m33_pastilles_etat.py` · `m34_cadre_enseigne.py` ·
`m35_rails_dock.py` · `m36_elast_1920.py` · `m37_bande_nue.py` · `m38_controle_positif.py`.
Chacun imprime la taille des images qu'il ouvre. Recadrages de preuve :
`crop_cta_1920.png`, `zoom_cta_dock.png`, `zoom_compteurs.png`, `zoom_carte_cote.png`,
`zoom_montre.png`, `anim_T_vs_T1.png`, `chrome_canon_vs_jeu.png`, `pied_cadre.png`.

**Deux instruments ont été RÉFUTÉS en cours de route et sont conservés pour mémoire** :
`m15_lueur.py` a rendu « +0,00 à toute distance » — un résultat **uniforme**, donc suspect : ses
coordonnées visaient les compteurs à 1920 sur une planche à 2400 (`m16` le corrige) ;
`m11_gras.py` a rendu « +3650 % » sur une zone vide (`m25` puis `m26` le corrigent, avec témoins).
