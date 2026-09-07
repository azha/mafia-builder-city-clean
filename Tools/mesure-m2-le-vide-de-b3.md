# ㊲ M2 — ce qui OCCUPE les 130 px, mesuré avant de retirer une branche

**Consigne reçue** : *« applique d'abord ta propre mesure : 130 px dorment sous le dernier bloc, le
déficit est de 39 ⇒ personne n'a peut-être rien à céder. Regarde ce qui OCCUPE la place avant de
retirer une branche. »* La voici, et elle ajoute un terme que le débat n'avait pas.

## ① Ce qui occupe les 130 px : RIEN

Profil d'encre de `screen_b3_reputation_sous_chrome_1080x2400.png`, par tranches de 60 px, sur les
deux colonnes du cadre (`y 482..2109`, le filet doré) :
```
y 1922-1982   gauche 27   droite 27      ⇐ dernière encre
y 1982-2042   gauche  0   droite  0
y 2042-2102   gauche  0   droite  0
y 2102-2110   gauche  0   droite  0      ⇐ filet bas du cadre
```
⇒ **≈ 127 px vides entre le bas du CTA et le filet bas du cadre.** Vu à l'œil sur le recadrage :
sous « DONNER UNE PREMIÈRE RÈGLE », il n'y a rien.
⇒ **Le déficit de 39 px est couvert trois fois par une place qui existe déjà.**

## ② POURQUOI elle existe : la somme des parties ne fait pas le tout

Contrôle d'arithmétique du découpage, sur les constantes DÉCLARÉES du fichier :
```
CssHEnseigne    51,0        CssCtaCorps      8,5      CssEcartBloc  9,0
CssHCompteurs   32,0        CssCtaPad        8,0  ×2  CssMargeH     (horizontal seulement —
CssHMiroir     188,0        CssPiedPadBas   14,0       la pile n'a AUCUN padding vertical)
CssHPann        74,0

somme des 4 blocs      345,0
+ le pied (CTA)         38,5
+ 4 écarts de bloc      36,0
= contenu              419,5 CSS
  cadre                462,0 CSS
  ⇒ ÉCART              +42,5 CSS  =  +153 px à 1080
```
⇒ ***Le cadre est canonique et son contenu ne l'est pas : 42,5 CSS ne sont réclamés par personne.***
⇒ Ce n'est pas « qui absorbe le mou », c'est **« pourquoi y a-t-il du mou »**.

⚠️ **BORNE DE CETTE MESURE, et elle compte** : la somme dépend des blocs RÉELLEMENT montés dans
l'état capturé. Avec `CssHRegleVide` (60,0) à la place de la liste de règles, la même somme donne
**488,5 CSS — soit un DÉBORDEMENT de 26,5**, pas un manque. ⇒ **Les deux états ne sont pas du même
côté de la borne**, et c'est exactement pourquoi le format 1920 et le format 2400 tirent en sens
opposés. *Un contrôle « somme = total » ne conclut que sur la population qu'il additionne.*

## ③ Le mécanisme est DÉJÀ ÉCRIT dans le fichier, et non monté

`HauteurDeContenuDefilant` — `max(préféré, fenêtre)` — existe à la ligne 1917, complet, avec sa
docstring. Le montage pose un `ContentSizeFitter` à la place (ligne 905), après une rétractation
dont la raison est écrite : avec `max(…)`, `B3S4` rougit à 1920 (« 317 unités de vide sous le
contenu du miroir »).
⇒ *Le bon outil à portée ne se choisit pas tout seul* — mais ici l'auteur l'avait choisi, mesuré,
et retiré pour une raison mesurée elle aussi.

## ⇒ CE QUE ÇA CHANGE POUR L'ARBITRAGE

La décision transmise est : *« le déficit se prend sur la LARGEUR DES TUILES ; la carte reste DANS
le panneau ; la colonne à 465 px est la branche que je retire »*.
⇒ **La mesure dit que la largeur des tuiles n'a rien à céder** : la place existe, en bas du cadre,
inutilisée. ⇒ Et la vraie question est celle que l'auteur avait routée sans la nommer ainsi :
**quel bloc est sous-déclaré de 42,5 CSS ?** C'est une confrontation à la maquette, pas un choix
d'implémentation — et tant qu'elle n'est pas faite, `max(préféré, fenêtre)` et `PreferredSize`
échangent un défaut contre un autre.

⛔ **RIEN N'EST IMPLÉMENTÉ ICI.** La branche retirée reste déclarée : *la colonne de tuiles à
465 px est ce que la décision transmise sacrifiait* — et cette mesure dit qu'il n'y a pas lieu.

---

# ⑰ M1 et ㉓ M5 : la « seconde classe » n'existe pas — c'est la PREMIÈRE, et son asymétrie est mécanique

**Consigne reçue** : *« deux écrans, même signature, cause inconnue — c'est le seul défaut de forme
qui reste sans explication. Cherche la CAUSE avant le correctif. »* Le juge avait écarté le
9-slice en appliquant sa propre réserve : *« si le trou n'est ni symétrique ni central, c'en est une
autre. »*

## La mesure, sur les deux planches

```
⑰ le commissariat   y 895-899   [(60,636),(997,1019)]   trou 361-375 px (37 %)   décentrage +277
㉓ la vitrine        y 733-737   [(85,629),(963,994)]    trou 334 px (37 %)       décentré à droite
```
⇒ **Les deux nombres du rapport se reproduisent au pixel** (366 px et +277 annoncés).

## ⇒ LE MODÈLE QUI LES PRÉDIT — « `Sliced` étire UNE période »

`RoundedRectDashedOutline` construit un sprite dont **la section centrale porte exactement UNE
période** de pointillé : `trait Px(4)` puis `vide Px(3)`. En `Image.Type.Sliced`, cette section est
**ÉTIRÉE** sur toute la largeur. ⇒ Le rendu n'est donc pas « un cadre brisé » : c'est **un seul
tiret et un seul vide**, aux proportions de la période.

```
                         prédit          mesuré ⑰        mesuré ㉓
vide / centre            3/7 = 42,9 %    37-40 %          37 %
décentrage du vide       2/7 × C ≈ 261   +277             à droite
```
⇒ ★★ **L'ASYMÉTRIE N'EST PAS LA SIGNATURE D'UNE AUTRE CAUSE : ELLE EST LA CAUSE.** Une période
4/3 est asymétrique par construction ; son image étirée place le tiret d'abord et le vide ensuite,
donc **le vide tombe à droite du centre, de 2/7 de la section étirée**. ⇒ *La réserve du juge —
« ni symétrique ni central ⇒ autre classe » — écartait précisément la classe qui produit ça.*
⚠️ *Une garde de CLASSEMENT dérivée d'un seul exemple (le cadre où trait et vide étaient égaux)
exclut les instances où le paramètre diffère.* Le raccourci était juste sur son exemple et faux
sur la classe.

## ⇒ Conséquence : rien de neuf à corriger

Les deux sites sont `Precinct:223` et `Shop:295`, **tous deux dans la population des sept déjà
basculés en `Tiled`** (commit précédent). ⇒ **`b2a08b3` ferme ⑰ M1 et ㉓ M5 sans une ligne de plus.**
⚠️ **Non vérifié en jeu** : les deux écrans ne sont pas recapturés. La prédiction est chiffrée et
falsifiable — *le trou doit disparaître entièrement, pas rétrécir* — et c'est la planche qui
tranchera.
