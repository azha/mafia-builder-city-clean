# Journal de capture — ⑭ « La semaine », 2026-09-07

## Le régime, DÉCLARÉ — une planche voyage avec l'état des DEUX côtés

```
client        branche correcteur/ecrans, HEAD 30dfcaf (le plaque = 9a5ddc6)
image du back CONSTRUITE le 2026-09-07T04:04:54Z  ⇐ et c'est la moitié qu'on ne documentait pas
              le conteneur d'avant tournait sur une image du 04-09, « Up 2 days »
identité      régime MAFIA_CAPTURE_* — demo_capture@example.test
              imprimé par la sonde pour CHACUNE des 11 planches du run
garde         MAFIA_CAPTURE_EXPECT_PLAYER=01a074ce-60f3-7a91-8dbd-41d9be0bd2fc
catégorie      MAFIA_CI_CATEGORIES=PhotoPlanche · declares=1 comptes=1 · passed=1 failed=0
              catégories RÉELLEMENT exécutées = [PhotoPlanche]
```

⛔ **POURQUOI LA DATE DE L'IMAGE EST DANS CE JOURNAL.** Deux campagnes ont photographié un back du
**04-09** en croyant photographier le dépôt : les clés i18n ajoutées le 06-09 n'y étaient pas, et
les libellés bruts affichés au joueur passaient pour un trou de contenu. ⇒ *Une campagne de
captures photographie l'IMAGE, pas le dépôt.* **Contrôle positif du rebuild, mesuré sur le bundle
servi** :
```
avant   674 messages · 0 sous news_beat.* · 0 sous press.*
après   886 messages · 154 sous news_beat.* · 9 sous press.*
```

## L'empreinte du compte — AVANT, et ce qu'elle ne dit pas

```
player_id 01a074ce-60f3-7a91-8dbd-41d9be0bd2fc · prise 2026-09-07T04:04:19Z
horloge_game_minute 72155 · buildings 20 · lieutenant 3 · safehouses 2
highest_leverage_cards 8 · autonomy_reports 1 · cartes 4 non résolues / 6
```
⚠️ **Elle compte des lignes, elle ne les hache pas** : elle détecte une purge, pas une mutation à
compte constant. ⚠️ **Et il lui manque la seconde propriété du couple** : `demo_capture` **n'est
plus gelé** — 17 de ses 20 bâtiments sont postérieurs à son dernier tick de friction, donc l'état
DÉRIVÉ y est plus vieux que l'état STRUCTUREL. *« Gelé » n'est pas une propriété du compte, c'est
une propriété d'un COUPLE (structure, dernier tick dérivé)* — et cette empreinte n'en porte qu'un.

## Ce que la planche établit sur ⑭

```
CONTRÔLE 1  encre en colonne 0 et en colonne 1079 : 0 et 0
            (avant : 6 pixels de la couleur de CŒUR en colonne 0 — la ligne était COUPÉE)
CONTRÔLE 2  titre de plaque en jeu (242,201,106)   canon (242,201,107)   ⇒ 1/255
            titre d'écran      en jeu (242,201,106)   avant --or (217,171,78)
            corps de plaque    en jeu (185,173,146)   canon (185,173,146) ⇒ 0/255
CONTRÔLE 3  le corps revient à la ligne DANS la boîte, sur trois lignes
```

⚠️ **CE QUE LA PLANCHE NE MONTRE TOUJOURS PAS, et c'est déclaré, pas oublié** : le manomètre de
tension, les deux CTA (« ouvrir la semaine » / « reporter d'un cycle »), et « Calm · None » encore
énuméré brut. **Trois manques nommés valent mieux qu'une clôture.**

## Le piège vérifié plutôt que supposé

**11 planches déclarées écrites, 11 md5 changés sur le disque.** ⇒ Vérifié parce qu'un mécanisme
voisin (`ScreenCapture.CaptureScreenshot`) **n'écrit pas en batchmode** et ne le dit pas : un
`passed=1` ne prouve jamais qu'un fichier a bougé.
⚠️ Les **dix autres** planches ont changé elles aussi — l'image fraîche du back leur donne d'autres
données. **Elles ne sont PAS commitées** : elles appartiennent à des écrans que d'autres jugent, et
*changer leur rendu déplacerait la cible sous le juge qui les regarde.* Leurs propriétaires
décident ; elles se re-capturent en un run.
