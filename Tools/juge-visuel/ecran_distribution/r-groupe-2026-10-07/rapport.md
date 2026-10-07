# Juge visuel ⊥ — ㉘ La distribution (`ecran_distribution`) — r-groupe — 2026-10-07

## Verdict : **NON APPROUVÉ**

⚠️ **Avertissement de comparabilité, à lire avant le reste.** La planche montre un état
**« Pas encore de relais »** — un écran de blocage qui n'a **aucun cadre** dans la maquette
(cadres 54-58 = envoyer / en route / livré / route coupée / coursier pris). Le liège, les
étiquettes punaisées, la punaise, la ficelle, la bande de lecture et la fiche du lieutenant sont
donc **non comparables**, et je ne les compte pas comme des absences. Ne restent jugeables que le
**chrome**, la **typographie** et le **jeton d'action** — et c'est là que les écarts tombent.

Classement demandé (ruling user du 07/10) : **A** = le joueur le perçoit nettement · **B** = forme
visible mais secondaire · **C** = pixel/nuance.

---

## Écart ASSUMÉ, non classé

Le décor de scène est un lot en cours : le fond en aplat `#0d0d0d` est **connu** et n'est pas
compté. *(Pour mémoire : le canon `.lieg6 .entete` est `#20180f`, une plaque chaude.)*

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | référence (cadre 54) | jeu (1080×1920) | écart |
|---|---|---|---|---|
| 1 | or de la valeur ARGENT (bandeau haut) | `#f2c96b` | `#f2c96a` | **1/255** |
| 2 | gouttière latérale du contenu | 13 px CSS = 46,8 px | 48 px (titre, texte, bouton) | 1,2 px |
| 3 | titre en haut, sous-titre juste dessous, action plus bas | oui | oui | — |
| 4 | le corps de texte est gris sourd sur fond sombre, le titre est clair | oui | oui | — |
| 5 | aucune ligne de texte n'est coupée ni ne sort du cadre | oui | oui | — |
| 6 | barre d'onglets du shell (hors maquette) rendue identiquement aux 4 autres écrans | — | oui | — |
| 7 | aucune liste ne déborde (conforme au journal de capture) | — | vrai aux 2 résolutions | — |
| 8 | le même jeu sait rendre le geste canonique : ㉚ `#5a492a`/`#221c0d`, ㉛ idem | canon `#5a4a2a`/`#241c11` | 1 et 4 /255 | **contrôle interne** |

`fc-match` sur la machine de rendu : `DejaVu Serif → DejaVuSerif.ttf`, `DejaVu Sans →
DejaVuSans.ttf`. **Aucune substitution.**

---

## 0. L'écran, tel que la maquette le dit

**But** : décider d'où part la marchandise, où elle va, et par quel chemin — puis **l'envoyer ce
soir**.

**Ordre de lecture** : (1) le **bandeau de titre**, plaque chaude pleine largeur fermée par un
filet, titre **sérif** crème ; (2) la **planche de liège** — c'est l'élément héros, un panneau brun
texturé, encadré d'un bois de 5 px, qui occupe plus du tiers de l'écran : deux **étiquettes de
papier** punaisées et légèrement tournées, une **punaise rouge** au départ, une **punaise bleue** à
l'arrivée, et une **ficelle** dont la forme dit le chemin ; (3) la **bande de lecture**, trois
lignes clé→valeur séparées de pointillés, qui met en mots ce que la ficelle montre ; (4) la **bande
basse** bleu nuit à filet haut de 2 px, avec le **médaillon** du lieutenant, son nom, son rôle, sa
réplique, puis le **geste doré** et sa note.

**Traits d'identité** : la **matière liège** et sa ficelle ; les étiquettes de papier inclinées ; le
médaillon rond du lieutenant ; le geste doré en pied.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non, et c'est d'abord parce que **ce n'est pas le même état** : la planche montre un écran de
blocage (« Pas encore de relais. »), pas l'envoi du soir. Je m'interdis donc de compter le liège
absent. Luminance moyenne du contenu : réf 75,2 · jeu 21,4 — l'écart (−54) **mesure la disparition
du liège**, pas un défaut.

Ce qui reste comparable dit trois choses. **Le titre n'est plus dans la langue graphique de la
maison** : canon DejaVu **Serif** crème `#f0dfc4` à 33 px de capitale, jeu **sans-serif** blanc
`#eef1f2` à 45 px. **Il n'y a pas de bandeau de titre** : la plaque chaude `#20180f` et son filet
sont remplacés par `#0d0d0d` uniforme. Et surtout, **le jeton d'action n'est pas le geste de la
maison** : plaque gris-bleu `#2a2e38` sans bord, libellé **blanc**, en **casse de phrase**,
**aligné à gauche**, contre un geste encadré `#5a4a2a` sur `#241c11`, libellé **or** `#d9ab4e`, en
**capitales lettrées**, avec sa note à droite. Comme ㉚ et ㉛ rendent ce geste au pixel près dans le
même jeu, ce n'est pas un dispositif manquant — c'est le mauvais jeton posé ici. Sur un écran dont
le seul but est de pousser le joueur vers une action, c'est l'écart qui coûte le plus.

S'y ajoute une maladresse d'écriture : **la même information est donnée deux fois**, à quelques
mots près, à 300 px d'intervalle.

**Les 3 écarts de tête** : A2 le jeton d'action n'est pas le geste · A1 le titre en sans-serif ·
A3 pas de bandeau de titre.

---

## 3. Écarts

| # | partie | classe | réf | jeu | mesure | script |
|---|---|---|---|---|---|---|
| **A1** | titre d'écran (`.entete h3`) | **A** | **DejaVu Serif**, `#f0dfc4`, capitale **33 px** | **sans-serif**, `#eef1f2`, capitale **45 px** (+36 %) | famille + couleur (Δ 25/255 sur le bleu) + corps | `m04_distribution.py`, `m06_titres.py`, `mesures/titres_jeu.png` |
| **A2** | jeton d'action (`.geste`) | **A** | bord `#5a4a2a`, fond `#241c11`, texte **or `#d9ab4e`**, CAPITALES lettrées, note à droite | **aucun bord** (`#2a2e38` au bord comme au centre), fond `#2a2e38`, texte **blanc `#eef1f2`**, casse de phrase, aligné à gauche, pas de note | 4 propriétés sur 4 différentes ; le même jeu rend le bon jeton sur ㉚ et ㉛ | `m04_distribution.py`, `m00_controles.py` |
| **A3** | bandeau de titre (`.entete`) | **A** | plaque `#20180f` pleine largeur + filet bas `#3d3024` | `#0d0d0d` uniforme de `y 250` à `y 470` | plaque + filet → 0 | `m04_distribution.py` |
| **B1** | texte du corps | **B** | — | la même règle est écrite **deux fois** : « Un relais s'achète sur un bloc libre, puis s'ouvre depuis sa fiche, sur le port ou dans les cheminées seulement — de l'argent et deux décisions de structure, sur deux jours. » puis « Coûte de l'argent et votre décision de structure du jour ; il s'ouvre ensuite depuis sa fiche — sur le port ou dans les cheminées seulement — et en demandera une autre, demain. » | 2 énoncés, ~300 px d'écart | lecture des planches |
| **B2** | rythme vertical | **B** | la bande basse est **ancrée en pied** : pas de trou | tout se tasse en haut ; vide de **920 px** (1920) et **1 400 px** (2400) entre l'action et la barre d'onglets, soit **48 %** et **58 %** de la hauteur | — | `m07_palettes.py` (luminance) + lecture |

### C — listés, non traités (ruling du 07/10)

- l'échelle typographique des titres (+36 % ici, ~+35 % systématique sur les 5 écrans) — voir
  l'**arbitrage** consigné dans le rapport de ㉞ ;
- couleur du corps de texte : gris sourd dans les deux cas, non mesuré ligne à ligne faute de
  témoin d'état.

---

## 5. Autres résolutions

- **1080×1920** : rien n'est coupé, rien ne déborde, les gouttières tiennent (48 px). Le vide sous
  l'action fait ~920 px.
- **1080×2400** : même composition, même état, mêmes gouttières ; le vide sous l'action passe à
  ~1 400 px. Aucun reflux ne change l'ordre de lecture. L'écart B2 s'aggrave avec la hauteur, ce
  qui est le signe que le pied n'est pas ancré.

---

## 6. Ce que je n'ai pas pu vérifier — **la section la plus importante de ce rapport**

1. **Tout l'écran nominal.** Le liège, son cadre de bois, les deux étiquettes punaisées, les deux
   punaises, la ficelle, la bande de lecture à trois lignes, le médaillon du lieutenant : **aucun
   n'est jugeable** sur cette planche, parce que l'état capturé n'existe pas dans la maquette.
   *Ce qui trancherait : une planche prise sur un compte qui possède un relais (l'état des cadres
   54-56), ou un cadre « pas encore de relais » ajouté à la maquette.*
2. **Le geste de l'écran nominal.** A2 porte sur le bouton « Acheter un relais » de l'état bloqué.
   Je ne peux pas dire si « ENVOYER CE SOIR » serait, lui, rendu correctement — mais ㉚ et ㉛
   montrent que le jeton existe dans le client.
3. **La fiche du coursier pris** (`.cliche`, cadre 58) et les trois issues (`.iss`) : non capturées.
4. **Le drapeau de chargement.** Le journal de capture note que l'écran « n'expose aucun drapeau de
   chargement » et que la planche a été prise après une **attente fixe de 6 s**. Je ne peux donc pas
   exclure que « Pas encore de relais » soit un état **intermédiaire** et non l'état final.
   *Ce qui trancherait : une seconde planche prise plus tard, ou un drapeau de chargement exposé.*
5. **La face exacte du sans-serif du titre** : je lis « un sans-serif », je ne peux pas nommer la
   fonte depuis une image.
6. **Les animations** : la source de ㉘ ne déclare pas de `@keyframes` sur `.lieg6`.

---

## Annexes

1. **Références rendues** depuis `~/project/atelier3d-mafia` (master `d84c6eb`),
   `ecrans-brennar-6.html`, `Tools/rendre-tel.py … 3.6` → 1080×2102, **index apparié à son
   étiquette avant rendu** : `ref/cadre-54.png` … `cadre-58.png` ; étiquettes dans
   `ref/ETIQUETTES.txt` (54 = « Envoyer — la ficelle à tendre », le nominal).
2. **Planches jugées** :
   `Tools/juge-visuel/planches-par-ecran-2026-10-07/E04_Distribution_1080x1920.png` et
   `…_1080x2400.png`.
3. **Correspondance des repères** : les deux images font **1080 px de large** ; le téléphone de la
   maquette fait 300 px CSS rendus à ×3,6 ⇒ 1 px de référence = 1 px de planche **en largeur**.
   Les hauteurs diffèrent : aucune distance verticale n'est comparée en px bruts.
4. **Scripts** : `mesures/outils.py` · `m04_distribution.py` (jeton d'action, titre, bandeau,
   liège) · `m00_controles.py` (contrôle interne du geste sur ㉚ et ㉛), `m06_titres.py`,
   `m07_palettes.py` (communs aux 5 écrans) · `mesures/titres_jeu.png` (les 5 titres en jeu : ㊳ et
   ㉞ en sérif, ㉚ ㉘ ㉛ en sans-serif).
