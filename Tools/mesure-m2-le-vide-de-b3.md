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
