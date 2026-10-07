# Juge visuel ⊥ — ㊳ Le journal (`screen_c1`) — r-groupe — 2026-10-07

## Verdict : **NON APPROUVÉ**

L'ossature, la gouttière, l'or et le geste éteint sont justes au pixel ; mais le **filet d'or
sous l'enseigne**, **tous les filets de plaque du canon** et **le traitement de la carte « à la
une »** manquent, et les noms de journaux sont **en anglais**.

Classement demandé (ruling user du 07/10) : **A** = le joueur le perçoit nettement · **B** = forme
visible mais secondaire · **C** = pixel/nuance (listé, sans peser sur le verdict).

---

## Écart ASSUMÉ, non classé

Le décor de scène (fond peint derrière le panneau, halos, cerne laiton `.jrn6 .cerne`) est un lot
en cours : le fond en aplat `#0d0d0d` et l'absence du cadre doré périphérique sont **connus** et ne
sont pas comptés ici. *(Mesuré pour mémoire : la référence porte de l'or à `y 452-454` et
`y 2076-2078` — c'est le cerne, pas un élément d'écran.)*

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence (cadre 125) | jeu (1080×1920) | écart |
|---|---|---|---|---|
| 1 | or du titre « Le journal » | `#f2c96b` | `#f2c96a` | **1/255** |
| 2 | or de la valeur ARGENT (bandeau) | `#f2c96b` | `#f2c96a` | **1/255** |
| 3 | fond d'écran | `#0d0f10` | `#0d1016` | 6/255 |
| 4 | gouttière latérale du contenu | x 50 → 1029 | x 46 → 1033 | **4 px (0,4 %)** |
| 5 | largeur de la rangée de compteurs | 980 px | 988 px | 8 px (0,8 %) |
| 6 | CTA — couleur du texte éteint | canon `.cta6.eteint` `#7a838d` | `#7a838d` | **0** |
| 7 | CTA — couleur du bord éteint | canon `#2a3648` | `#2a3549` | **1/255** |
| 8 | contraste titre/plaque | 11,92:1 | 11,44:1 | 4 % |
| 9 | ordre de lecture (titre → 3 compteurs → liste → geste → note) | identique | identique | — |
| 10 | note de pied, « assister » en or | présent, or | présent, or | — |
| 11 | les 3 compteurs, même largeur, même rang | oui | oui | — |
| 12 | famille de police du titre | DejaVu Serif | serif | — |

`fc-match` sur la machine de rendu : `DejaVu Serif → DejaVuSerif.ttf`, `DejaVu Sans → DejaVuSans.ttf`.
**Aucune substitution** : un écart de famille, ici, serait un vrai écart, pas un artefact de rendu.
Il n'y en a pas sur cet écran.

---

## 0. L'écran, tel que la maquette le dit

**But** : prendre la température de la ville au matin — ce qui s'est dit, ce qui se murmure, ce qui
est en cours — puis décider d'**y prêter attention**.

**Ordre de lecture** : (1) l'enseigne « Le journal » en or sérif, soulignée d'un **filet d'or** qui
ferme le bandeau ; (2) les trois **compteurs** (à la une / dans la rue / en cours), chiffres cyan
dans des fenêtres encadrées ; (3) la **une** — une carte distincte, en-tête « LE CLAIRON DE
BRENNAR » en capitales lettrées d'or, filet d'or dessous, horodatage à droite, titre sérif, clé
grise, **étiquette d'angle** ; (4) les **brèves**, compactes, à puce colorée et horodatage à
droite ; (5) le **geste** et sa note.

**Zones** : bandeau-enseigne · rangée de compteurs · conteneur de liste (une + brèves) · pied
(geste + note).

**Traits d'identité** : l'or sur bleu nuit ; le **filet d'or de l'enseigne** ; le **quadrillage de
filets `#2a3648`** qui encadre chaque bloc (fenêtres, conteneur, cartes) ; la **hiérarchie
une / brève** ; le vocabulaire de presse.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Oui pour le squelette : mêmes zones, même ordre, même or, mêmes gouttières, même geste. Le joueur
reconnaît l'écran. Luminance moyenne du contenu : réf 29,5 · jeu 25,2 (Δ −4,3).

Non pour la **matière**. Trois choses changent la lecture. D'abord, la maquette **encadre tout** :
chaque fenêtre, le conteneur de la liste et chaque carte portent un filet `#2a3648`, et l'enseigne
est fermée par un **filet d'or de 7 px**. En jeu, **aucun de ces filets n'existe** — le seul encore
dessiné est celui du CTA, ce qui prouve que le client sait les tracer. L'écran passe d'un objet
« quadrillé, imprimé » à des plaques flottantes, et la palette s'appauvrit (le jeu est à 41 %
de `#16161c`, la référence répartit son aire sur cinq valeurs).

Ensuite, la **une n'est plus une une** : la maquette hiérarchise fortement (en-tête de journal en
capitales d'or + filet + horodatage à droite + étiquette d'angle) ; en jeu les cinq entrées sont
rigoureusement identiques, et le nom du journal est une petite ligne or en casse courante. Le
joueur ne voit plus « ce qui fait la une », il voit une liste plate.

Enfin — et c'est ce qui se voit en une seconde — les journaux s'appellent **« Brennar Daily
Star », « The Free Weekly », « The Tilbey Weekly »**. De l'anglais dans un écran dont tout le reste
est écrit dans la langue de la maison.

**Les 3 écarts de tête** : A1 le filet d'or de l'enseigne · A3 la carte « à la une » dépouillée ·
A4 les noms de journaux en anglais.

---

## 3. Écarts

| # | partie | classe | réf | jeu | mesure | script |
|---|---|---|---|---|---|---|
| **A1** | `.enseigne` — filet d'or inférieur | **A** | bande `#b08d3e` de **7 px** (2 px CSS), `y 640-646`, sur 1038 px | **rien** : la plaque finit à `y 452`, puis `#0d0d0d` dès `y 452` | 7 px → 0 px | `m01b_journal_or.py`, `m01c_journal_bords.py` |
| **A2** | filets `#2a3648` des blocs (3 fenêtres, conteneur de liste, 5 cartes) | **A** | traversée du bord gauche du compteur 1 : `…#0f161f ❘ #2a3648 ×3 ❘ #101920…` | traversée au même endroit : `#0d0d0d ❘ #16161c` — **aucun pixel de bord** | 9 blocs sur 9 sans filet ; seul le CTA en porte un (`#2a3549`, Δ1) | `m01c_journal_bords.py` |
| **A3** | carte « à la une » (`.une`) | **A** | en-tête `LE CLAIRON DE BRENNAR` en capitales lettrées `#f2c96b` + **filet d'or 1 px** (`y 926-928`) + horodatage **à droite** + étiquette d'angle encadrée « FAIT DIVERS » | aucun des quatre : nom du journal en casse courante, pas de filet, horodatage fondu dans le sous-titre gris, pas d'étiquette | 4 éléments sur 4 absents | `m01b_journal_or.py` + `mesures/ref125_liste.png` vs `mesures/cap01_liste.png` |
| **A4** | nom de la source | **A** | « LE CLAIRON DE BRENNAR » | « Brennar Daily Star », « The Free Weekly », « The Tilbey Weekly » | **3 titres anglais sur 3 journaux distincts**, 5 cartes sur 5 | lecture des planches 1920 et bas-1920 |
| **B1** | conteneur de liste (`.elast`) | **B** | plaque `#0d0f10` + filet `#2a3648` + marge intérieure, ombre intérieure | inexistant : les cartes posées sur le fond | — | `m01c_journal_bords.py` |
| **B2** | horodatage de brève (`.qd`) | **B** | colonne de droite, capitales lettrées, couleur = celle de la puce | fondu dans le sous-titre gris, en bas de casse | — | planches |

### C — listés, non traités (ruling du 07/10)

- hauteur de capitale du titre : réf 47 px (ligne de base `y 559`) → jeu 51 px (**+8,5 %**) ;
- hauteur de capitale du sous-titre : 17 px → 20 px (**+18 %**) ;
- plaque d'enseigne : `#0c121c` → `#16161c` (Δ 10/255 — la teinte passe de bleu nuit à gris neutre) ;
- plaque de compteur : `#101921` → `#16161c` (Δ 6/255, même glissement de teinte) ;
- le dégradé d'ambiance de `.jrn6` (deux halos radiaux or et cyan) n'est pas rendu — couvert par
  l'écart assumé du décor.

---

## 5. Autres résolutions

- **1080×2400** : la planche ne montre **pas le même état** que la 1080×1920 — compteurs `00/00/00`,
  sous-titre « EN ATTENTE DU MATIN », pavé « Le journal n'a pas encore été ouvert » posé au bas de
  la zone de liste, et un vide de ~750 px entre les compteurs et ce pavé. Rien n'est coupé, rien ne
  déborde, les gouttières tiennent. **Je ne peux pas juger la liste à cette résolution** : elle est
  vide. Les écarts A1/A2 s'y vérifient à l'identique (aucun filet, aucune règle d'or).
- **1080×1920 (haut et bas)** : la liste déborde ; l'ascenseur est une fine barre dorée à droite, le
  fondu de bas de liste coupe la 4ᵉ carte en milieu de ligne — c'est le dispositif attendu
  (cause 7), je ne le classe pas. Le bas de liste est atteint sans contenu hors cadre.

---

## 6. Ce que je n'ai pas pu vérifier

1. **L'étiquette d'angle** (« FAIT DIVERS ») : absente en jeu, mais je ne peux pas distinguer
   « le client ne la dessine pas » de « le back ne sert pas d'angle pour ces brèves ». *Mesure qui
   trancherait : le corps de `GET /v1/news/feed` sur ce compte (ressort du `juge-donnees`).*
2. **Les brèves « dans la rue » et « en cours »** (puce colorée + horodatage à droite) : les
   compteurs valent `00` et `00`, aucune ligne de ce type n'existe sur la planche. Non jugeable.
3. **L'état « journal ouvert » à 1080×2400** : la planche de cette résolution a été prise avant
   que les listes n'arrivent. *Mesure qui trancherait : recapturer la 2400 après `DernierChargement`.*
4. **La face exacte du sérif en jeu** : je lis « un sérif », je ne peux pas nommer la fonte depuis
   une image. (Sans conséquence : la famille est la bonne.)
5. **Les animations** : une planche est figée ; je ne juge pas ce qui bouge, et la source déclare
   `@keyframes jrn6-scan` sur `.elast::after` (balayage cyan) — je ne vois pas où l'image le fige.
6. **Le cadre 145** (« Les onze crans, tous ») est un témoin de vocabulaire, sans contrepartie dans
   la planche : non utilisé.

---

## Annexes

1. **Références rendues** depuis `~/project/atelier3d-mafia` (master `d84c6eb`), page
   `ecrans-brennar-6.html`, `Tools/rendre-tel.py … 3.6` → 1080×2102, index **apparié à son
   étiquette avant rendu** : `ref/cadre-125.png` … `cadre-130.png`, `cadre-145.png`, étiquettes
   dans `ref/ETIQUETTES.txt`.
2. **Planches jugées** :
   `Tools/juge-visuel/planches-par-ecran-2026-10-07/E01_Journal_1080x1920.png` (1080×1920),
   `…_bas_1080x1920.png`, `…_1080x2400.png`, `…_bas_1080x2400.png`.
3. **Correspondance des repères** : les deux images font **1080 px de large** ; le téléphone de la
   maquette fait 300 px CSS rendus à ×3,6. La gouttière canonique (13 px CSS = 46,8 px) se retrouve
   à `x = 46` en jeu ⇒ **échelle horizontale 1:1, aucune normalisation nécessaire**. En vertical les
   hauteurs diffèrent (2102 / 1920 / 2400) : aucune distance verticale n'est comparée en px bruts,
   seules des épaisseurs (filets) et des hauteurs de capitale le sont.
4. **Scripts** : `mesures/outils.py` (boîte à outils, chaque script imprime la taille des images
   lues) · `m01_journal.py` (aplats, or, CTA, contrastes) · `m01b_journal_or.py` (toutes les lignes
   dorées de l'écran) · `m01c_journal_bords.py` (filets `#2a3648`, **avec contrôle positif sur la
   référence et contrôle négatif sur le plein fond**) · `m01d_journal_typo.py` (hauteurs de
   capitale) · `m01e_journal_geo.py` (gouttières) · `m00_controles.py`, `m06_titres.py`,
   `m07_palettes.py` (communs aux 5 écrans).
